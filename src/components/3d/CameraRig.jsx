import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils, Vector3 } from 'three'
import { PATH } from '../../lib/journeyConfig'
import { journey } from '../../lib/journeyStore'

const UP = new Vector3(0, 1, 0)

/**
 * Places the camera in the avatar's local frame (right / up / forward along the
 * path) using the framing values GSAP tweens on `journey`, then eases toward
 * it so camera motion stays cinematic even on fast scroll jumps.
 */
export function CameraRig() {
  const { camera, size } = useThree()
  const v = useMemo(
    () => ({ p: new Vector3(), t: new Vector3(), r: new Vector3(), goal: new Vector3(), look: new Vector3(), lookSmooth: new Vector3(0, 1.2, 0), init: false }),
    [],
  )

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 20)
    const pt = MathUtils.clamp(journey.pathT, 0, 1)
    PATH.getPointAt(pt, v.p)
    PATH.getTangentAt(pt, v.t)
    v.r.crossVectors(v.t, UP).normalize()

    // Narrow screens: pull back and centre the subject (text panels sit below it).
    const portrait = size.width < size.height
    // Wider lens in portrait so the full avatar fits above the text panel; updated live on rotation.
    const fov = portrait ? 50 : 38
    if (camera.fov !== fov) {
      camera.fov = fov
      camera.updateProjectionMatrix()
    }
    // Portrait uses a wider lens (50°), so only a slight pull-back is needed.
    const distScale = portrait ? 1.12 : 1
    const sideScale = portrait ? 0.15 : 1

    // Opening dolly: start further out and higher, glide in.
    const introOut = (1 - journey.intro) * 7
    const introUp = (1 - journey.intro) * 1.8

    // Orbit position around the avatar in its path frame (cos → ahead, sin → right).
    const dist = journey.distance * distScale + introOut
    v.goal
      .copy(v.p)
      .addScaledVector(v.t, Math.cos(journey.angle) * dist)
      .addScaledVector(v.r, Math.sin(journey.angle) * dist * (portrait ? 0.6 : 1))
      .addScaledVector(UP, journey.height + introUp)

    // On portrait screens aim below the avatar so it sits in the top half, above the text panel.
    const lookDrop = portrait ? 1.55 : 0
    v.look.copy(v.p).addScaledVector(v.r, journey.lookSide * sideScale).addScaledVector(UP, journey.lookHeight - lookDrop)

    // Subtle hand-held drift
    if (!journey.reducedMotion) {
      const time = state.clock.elapsedTime
      v.goal.x += Math.sin(time * 0.35) * 0.06
      v.goal.y += Math.sin(time * 0.5) * 0.04
    }

    // Lower = softer camera follow (smooths fast scroll flicks without feeling laggy).
    const lambda = journey.reducedMotion ? 30 : 2.4
    if (!v.init) {
      camera.position.copy(v.goal)
      v.lookSmooth.copy(v.look)
      v.init = true
    }
    camera.position.x = MathUtils.damp(camera.position.x, v.goal.x, lambda, dt)
    camera.position.y = MathUtils.damp(camera.position.y, v.goal.y, lambda, dt)
    camera.position.z = MathUtils.damp(camera.position.z, v.goal.z, lambda, dt)
    v.lookSmooth.lerp(v.look, 1 - Math.exp(-lambda * 1.3 * dt))
    camera.lookAt(v.lookSmooth)
  })

  return null
}
