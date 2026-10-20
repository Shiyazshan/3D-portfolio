import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useAnimations, useGLTF } from '@react-three/drei'
import gsap from 'gsap'
import { MathUtils, Quaternion, Vector3 } from 'three'
import { PATH, PATH_LENGTH, STRIDE_LENGTH, AVATAR_YAW_OFFSET, WAVE } from '../../lib/journeyConfig'
import { journey } from '../../lib/journeyStore'
import { avatarState } from './avatarState'
import { createGlasses, createHair, disposeAccessory } from './avatarAccessories'

// Relative to Vite's base URL, so the site also works from a sub-path (e.g. GitHub Pages).
export const AVATAR_URL = `${import.meta.env.BASE_URL}models/avatar.glb`

/** Clip names to look for (the build script names them Walk and Idle). */
const CLIP_MATCHERS = {
  walk: /walk/i,
  idle: /idle|breath|stand/i,
}

const findClip = (actions, regex) => Object.entries(actions).find(([name]) => regex.test(name))?.[1] ?? null

const tmpTangent = new Vector3()
const shortestAngle = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from))

/**
 * The rigged character. Position comes from journey.pathT (written by GSAP);
 * the walk clip is advanced by DISTANCE travelled, not by time, so feet stay
 * planted whatever the scroll speed — and reverse when scrolling up.
 */
export function Avatar({ castShadow = true, lite = false }) {
  const group = useRef()
  const { scene, animations } = useGLTF(AVATAR_URL)
  const { actions } = useAnimations(animations, group)

  const bones = useMemo(() => {
    const found = {}
    scene.traverse((o) => {
      if (o.isMesh || o.isSkinnedMesh) {
        o.castShadow = castShadow
        o.frustumCulled = false // skinned meshes can be culled wrongly when animated
        // Soft, non-plastic skin; clothes pick up less of the blue environment so the shirt stays white.
        const name = o.material?.name ?? ''
        if (/Skin|Body/.test(name)) Object.assign(o.material, { roughness: 0.62, metalness: 0, envMapIntensity: 0.55 })
        else if (/Outfit/.test(name)) Object.assign(o.material, { envMapIntensity: 0.45 })
      }
      if (o.isBone) {
        if (/RightArm$/.test(o.name)) found.rightArm = o
        if (/RightForeArm$/.test(o.name)) found.rightForeArm = o
        if (/RightHand$/.test(o.name)) found.rightHand = o
      }
    })
    return found
  }, [scene, castShadow])

  // Hair + spectacles, generated from the head mesh and parented to the Head bone.
  useEffect(() => {
    const head = scene.getObjectByName('Wolf3D_Head')
    if (!head?.isSkinnedMesh) return undefined
    const hair = createHair(head, { lite })
    const glasses = createGlasses(head, { lite })
    hair.castShadow = castShadow
    return () => {
      disposeAccessory(hair)
      disposeAccessory(glasses)
    }
  }, [scene, castShadow, lite])

  // Hello wave once the avatar has loaded (and the loading screen has faded), then back to idle.
  useEffect(() => {
    if (journey.reducedMotion) return undefined
    const tl = gsap
      .timeline({ delay: 1.5 })
      .to(journey, { greet: 1, duration: 0.8, ease: 'power2.out' })
      .to(journey, { greet: 0, duration: 1, ease: 'power2.inOut' }, '+=2.6')
    return () => {
      tl.kill()
      journey.greet = 0
    }
  }, [])

  const clips = useRef({ walk: null, idle: null })
  const state = useRef({ prevT: journey.pathT, walkW: 0, phase: 0, yaw: 0 })

  useEffect(() => {
    const walk = findClip(actions, CLIP_MATCHERS.walk)
    const idle = findClip(actions, CLIP_MATCHERS.idle)
    if (!walk || !idle) {
      console.warn(`[Avatar] ${AVATAR_URL} needs a walk and an idle clip. Found:`, Object.keys(actions))
    }
    // Walk is driven manually (timeScale 0 + explicit .time); idle plays normally.
    walk?.reset().setEffectiveWeight(0).play()
    if (walk) walk.timeScale = 0
    idle?.reset().setEffectiveWeight(1).play()
    clips.current = { walk, idle }
    return () => {
      walk?.stop()
      idle?.stop()
    }
  }, [actions])

  // Reusable math objects — allocated once, not every frame.
  const scratch = useMemo(
    () => ({ a: new Vector3(), b: new Vector3(), cur: new Vector3(), want: new Vector3(), qDelta: new Quaternion(), qWorld: new Quaternion(), qParent: new Quaternion(), qRoot: new Quaternion(), qRootInv: new Quaternion() }),
    [],
  )

  /**
   * Rotates `bone` so the segment bone → child points along `worldDir`, blended by `weight`.
   * Aiming in world space (instead of adding Euler angles) works for any rig orientation.
   */
  const aimBone = (bone, child, worldDir, weight) => {
    const { a, b, cur, qDelta, qWorld, qParent } = scratch
    bone.getWorldPosition(a)
    child.getWorldPosition(b)
    cur.subVectors(b, a).normalize()
    qDelta.setFromUnitVectors(cur, worldDir)
    bone.getWorldQuaternion(qWorld).premultiply(qDelta) // desired world rotation
    bone.parent.getWorldQuaternion(qParent).invert()
    bone.quaternion.slerp(qParent.multiply(qWorld), weight) // back to the bone's local space
    bone.updateMatrixWorld(true)
  }

  useFrame((frame, delta) => {
    const g = group.current
    if (!g) return
    const s = state.current
    const dt = Math.min(delta, 1 / 20)
    const t = MathUtils.clamp(journey.pathT, 0, 1)

    // 1. Position on the path
    PATH.getPointAt(t, g.position)
    avatarState.position.copy(g.position)

    // 2. Distance-driven walk cycle
    const distance = (t - s.prevT) * PATH_LENGTH
    s.prevT = t
    const speed = Math.abs(distance) / Math.max(dt, 1e-4)
    // Blend idle ⇄ walk by speed. Starting is quicker than stopping so a stop reads as a
    // natural deceleration (GSAP already eases the position into each stop).
    const targetWalk = MathUtils.clamp(speed / 0.7, 0, 1)
    s.walkW = MathUtils.damp(s.walkW, targetWalk, targetWalk > s.walkW ? 7 : 3.5, dt)
    const { walk, idle } = clips.current
    if (walk) {
      const dur = walk.getClip().duration
      // One clip loop = STRIDE_LENGTH metres (measured from the mocap), so feet never slide.
      s.phase = (((s.phase + distance / STRIDE_LENGTH) % 1) + 1) % 1
      walk.time = s.phase * dur
      walk.setEffectiveWeight(s.walkW)
    }
    idle?.setEffectiveWeight(1 - s.walkW)

    // 3. Heading: blend between "look down the path" and "look at the camera"
    PATH.getTangentAt(t, tmpTangent)
    const pathYaw = Math.atan2(tmpTangent.x, tmpTangent.z)
    const cam = frame.camera.position
    const camYaw = Math.atan2(cam.x - g.position.x, cam.z - g.position.z)
    const desired = pathYaw + shortestAngle(pathYaw, camYaw) * MathUtils.clamp(journey.facing, 0, 1)
    s.yaw += shortestAngle(s.yaw, desired) * (1 - Math.exp(-4 * dt))
    g.rotation.y = s.yaw + AVATAR_YAW_OFFSET
    avatarState.yaw = pathYaw

    // 4. "Hello" wave, layered on top of the Idle clip: upper arm out and up, forearm up,
    //    hand swinging side to side. journey.greet is animated by GSAP on first load.
    const weight = Math.max(journey.greet, journey.wave)
    if (weight > 0.01 && bones.rightArm && bones.rightForeArm && bones.rightHand) {
      const { want, qRoot, qRootInv } = scratch
      const time = frame.clock.elapsedTime
      g.updateMatrixWorld(true) // the mixer just changed the pose
      g.getWorldQuaternion(qRoot)
      qRootInv.copy(qRoot).invert()
      // Which side is "right" in the avatar's own space (works whichever way the rig is mirrored).
      const side = Math.sign(bones.rightArm.getWorldPosition(scratch.a).sub(g.position).applyQuaternion(qRootInv).x) || -1
      const eased = weight * weight * (3 - 2 * weight)
      aimBone(bones.rightArm, bones.rightForeArm, want.set(side * WAVE.upperArm[0], WAVE.upperArm[1], WAVE.upperArm[2]).applyQuaternion(qRoot).normalize(), eased)
      const swing = journey.reducedMotion ? 0 : Math.sin(time * WAVE.speed) * WAVE.swing
      aimBone(bones.rightForeArm, bones.rightHand, want.set(side * (WAVE.forearm[0] + swing), WAVE.forearm[1], WAVE.forearm[2]).applyQuaternion(qRoot).normalize(), eased)
    }
  })

  return (
    <group ref={group} dispose={null}>
      <primitive object={scene} />
    </group>
  )
}

useGLTF.preload(AVATAR_URL)
