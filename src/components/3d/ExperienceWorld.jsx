import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Environment, Lightformer, MeshReflectorMaterial, Sparkles, Float } from '@react-three/drei'
import { CanvasTexture, Color, MathUtils, Matrix4, Quaternion, SRGBColorSpace, TubeGeometry, Vector3 } from 'three'
import { PATH, STOPS, STOP_COLORS, stopCameraPose } from '../../lib/journeyConfig'
import { projectDialogStore } from '../../lib/projectDialogStore'
import { journey } from '../../lib/journeyStore'
import { avatarState } from './avatarState'

const UP = new Vector3(0, 1, 0)
const VOID = '#06070b'

/** Point + frame on the path for a given stop id, with local offsets (right, up, forward). */
function frameAt(stopId, { right = 0, up = 0, forward = 0, dt = 0 } = {}) {
  const stop = STOPS.find((s) => s.id === stopId)
  const t = MathUtils.clamp(stop.pathT + dt, 0, 1)
  const p = PATH.getPointAt(t)
  const tan = PATH.getTangentAt(t)
  const r = new Vector3().crossVectors(tan, UP).normalize()
  const pos = p.clone().addScaledVector(r, right).addScaledVector(UP, up).addScaledVector(tan, forward)
  return { pos, yaw: Math.atan2(tan.x, tan.z), tan, r }
}

/* ---------- Ground, route and lighting ---------- */

function Ground({ quality }) {
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0, -31]} receiveShadow>
      <planeGeometry args={[70, 110]} />
      {quality === 'high' ? (
        <MeshReflectorMaterial
          resolution={256}
          blur={[200, 60]}
          mixBlur={1.2}
          mixStrength={14}
          roughness={0.92}
          depthScale={0.6}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.2}
          color="#0a0b12"
          metalness={0.6}
          mirror={0.35}
        />
      ) : (
        <meshStandardMaterial color="#0b0c13" roughness={0.85} metalness={0.2} />
      )}
    </mesh>
  )
}

/** A faint line of light marking the route ahead — the "career path". */
function Route() {
  const geometry = useMemo(() => new TubeGeometry(PATH, 400, 0.018, 6, false), [])
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <mesh geometry={geometry} position-y={0.01}>
      <meshBasicMaterial color="#5fd6dd" transparent opacity={0.35} toneMapped={false} />
    </mesh>
  )
}

/**
 * Lighting rig that follows the camera, so the avatar is lit the same way in every chapter:
 *   key  – soft warm-neutral spot from the camera side, slightly above (face + white shirt)
 *   fill – dim neutral light from the other side to keep shadows from going black
 *   rim  – accent-coloured light from behind, separating his silhouette from the dark scene
 */
function Lights({ quality }) {
  const key = useRef()
  const fill = useRef()
  const rim = useRef()
  const target = useRef()
  const v = useMemo(() => ({ color: new Color(), dir: new Vector3(), side: new Vector3() }), [])

  useFrame((state) => {
    const i = MathUtils.clamp(journey.accent, 0, STOP_COLORS.length - 1)
    const a = Math.floor(i)
    const b = Math.min(a + 1, STOP_COLORS.length - 1)
    v.color.copy(STOP_COLORS[a]).lerp(STOP_COLORS[b], i - a)
    const p = avatarState.position
    // Horizontal direction from the avatar to the camera, and its perpendicular.
    v.dir.set(state.camera.position.x - p.x, 0, state.camera.position.z - p.z).normalize()
    v.side.crossVectors(v.dir, UP)
    if (target.current) target.current.position.set(p.x, 1.25, p.z)
    if (key.current) {
      key.current.position.set(p.x + v.dir.x * 3.4 + v.side.x * 2.2, 3.6, p.z + v.dir.z * 3.4 + v.side.z * 2.2)
      key.current.target = target.current
    }
    if (fill.current) fill.current.position.set(p.x + v.dir.x * 3 - v.side.x * 2.5, 1.5, p.z + v.dir.z * 3 - v.side.z * 2.5)
    if (rim.current) {
      rim.current.color.copy(v.color)
      rim.current.position.set(p.x - v.dir.x * 2.2 - v.side.x * 0.8, 2.5, p.z - v.dir.z * 2.2 - v.side.z * 0.8)
    }
  })

  return (
    <>
      <ambientLight intensity={0.22} />
      <hemisphereLight args={['#8f97b8', '#07080c', 0.4]} />
      <object3D ref={target} />
      <spotLight
        ref={key}
        angle={0.55}
        penumbra={1}
        intensity={95}
        distance={14}
        decay={2}
        color="#fff1e4"
        castShadow={quality === 'high'}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
      />
      <pointLight ref={fill} intensity={6} distance={8} decay={2} color="#dfe4f2" />
      <pointLight ref={rim} intensity={40} distance={7} decay={2} />
    </>
  )
}

/* ---------- Chapter structures ---------- */

/** One gate per job — the avatar walks through each milestone. */
function MilestoneGates() {
  const gates = useMemo(
    () =>
      STOPS.filter((s) => s.id.startsWith('exp-')).map((s, i) => ({ id: s.id, color: s.accent, ...frameAt(s.id, { forward: -1.6 }), i })),
    [],
  )
  return gates.map((g) => (
    <group key={g.id} position={g.pos} rotation-y={g.yaw}>
      {[-1.6, 1.6].map((x) => (
        <mesh key={x} position={[x, 1.8, 0]} castShadow>
          <boxGeometry args={[0.18, 3.6, 0.18]} />
          <meshStandardMaterial color="#151823" roughness={0.4} metalness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, 3.62, 0]}>
        <boxGeometry args={[3.38, 0.14, 0.18]} />
        <meshStandardMaterial color="#151823" roughness={0.4} metalness={0.8} />
      </mesh>
      {/* inner light edge */}
      <mesh position={[0, 3.52, 0.1]}>
        <boxGeometry args={[3.0, 0.025, 0.02]} />
        <meshBasicMaterial color={g.color} toneMapped={false} />
      </mesh>
      {[-1.48, 1.48].map((x) => (
        <mesh key={x} position={[x, 1.75, 0.1]}>
          <boxGeometry args={[0.025, 3.4, 0.02]} />
          <meshBasicMaterial color={g.color} toneMapped={false} />
        </mesh>
      ))}
    </group>
  ))
}

const SHAPES = ['icosahedronGeometry', 'octahedronGeometry', 'torusGeometry', 'dodecahedronGeometry']
const SKILL_COLORS = ['#5b8cff', '#9277ff', '#5fd6dd', '#c9cfe6']

/** Orbiting forms — one ring per skill category; the focused category grows brighter. */
function SkillConstellation({ categories }) {
  const base = useMemo(() => frameAt('skills', { right: 0.9, up: 1.7, forward: -2.2 }), [])
  const groups = useRef([])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 20)
    const t = state.clock.elapsedTime
    groups.current.forEach((g, i) => {
      if (!g) return
      const focused = journey.skillFocus === categories[i]?.id
      const dim = journey.skillFocus && !focused
      const s = MathUtils.damp(g.scale.x, focused ? 1.25 : dim ? 0.8 : 1, 5, dt)
      g.scale.setScalar(s)
      if (!journey.reducedMotion) g.rotation.y = t * (0.12 + i * 0.03) * (i % 2 ? -1 : 1)
    })
  })

  return (
    <group position={base.pos} rotation-y={base.yaw}>
      {categories.map((cat, ci) => {
        const radius = 1.0 + ci * 0.55
        const Shape = SHAPES[ci % SHAPES.length]
        return (
          <group key={cat.id} ref={(el) => (groups.current[ci] = el)} rotation-x={0.25 * (ci - 1.5)}>
            {cat.items.map((item, ii) => {
              const a = (ii / cat.items.length) * Math.PI * 2
              const size = item.primary ? 0.17 : 0.1
              return (
                <Float key={item.name} speed={1.4} rotationIntensity={0.6} floatIntensity={0.4}>
                  <mesh position={[Math.cos(a) * radius, Math.sin(a * 2) * 0.25, Math.sin(a) * radius]}>
                    {Shape === 'torusGeometry' ? <torusGeometry args={[size, size * 0.32, 12, 24]} /> : <Shape args={[size, 0]} />}
                    <meshStandardMaterial
                      color="#0f1220"
                      emissive={SKILL_COLORS[ci]}
                      emissiveIntensity={item.primary ? 2.2 : 0.9}
                      roughness={0.3}
                      metalness={0.6}
                    />
                  </mesh>
                </Float>
              )
            })}
          </group>
        )
      })}
    </group>
  )
}

/** Draws a project title onto a canvas so we need no 3D font download. */
function useScreenTexture(project) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 640
    const tex = new CanvasTexture(canvas)
    tex.colorSpace = SRGBColorSpace
    tex.anisotropy = 4
    return tex
  }, [])

  useEffect(() => {
    let disposed = false
    const ctx = texture.image.getContext('2d')
    const draw = () => {
      if (disposed) return
      const grad = ctx.createLinearGradient(0, 0, 1024, 640)
      grad.addColorStop(0, '#13214a')
      grad.addColorStop(1, '#22184a')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, 1024, 640)
      ctx.strokeStyle = 'rgba(95,214,221,0.28)'
      ctx.lineWidth = 3
      for (let y = 110; y < 360; y += 44) {
        ctx.beginPath()
        ctx.moveTo(72, y)
        ctx.lineTo(72 + 160 + ((y * 37) % 560), y)
        ctx.stroke()
      }
      ctx.fillStyle = '#e9ebf3'
      ctx.font = '700 92px "Bricolage Grotesque", system-ui, sans-serif'
      ctx.fillText(project.name, 72, 480, 880)
      ctx.fillStyle = '#aab1c8'
      ctx.font = '400 40px "Bricolage Grotesque", system-ui, sans-serif'
      ctx.fillText(project.subtitle, 72, 550, 880)
      texture.needsUpdate = true
    }
    draw() // draw now with a fallback font…
    document.fonts?.ready.then(draw) // …and again once the web font is ready
    return () => {
      disposed = true
    }
  }, [texture, project])

  useEffect(() => () => texture.dispose(), [texture])
  return texture
}

const SCREEN = { w: 1.5, h: 0.94, gap: 0.2 }

/** One project screen. Hover/focus enlarges it; clicking opens the same details window as the list. */
function ProjectScreen({ project, index, position }) {
  const ref = useRef()
  const glow = useRef()
  const texture = useScreenTexture(project)

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 20)
    const focused = journey.projectFocus === project.id
    if (ref.current) {
      const s = MathUtils.damp(ref.current.scale.x, focused ? 1.08 : 1, 6, dt)
      ref.current.scale.setScalar(s)
      if (!journey.reducedMotion) ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.8 + index) * 0.03
    }
    if (glow.current) glow.current.opacity = MathUtils.damp(glow.current.opacity, focused ? 0.95 : 0.3, 6, dt)
  })

  const setFocus = (id) => {
    journey.projectFocus = id
    document.body.style.cursor = id ? 'pointer' : ''
  }

  return (
    <group
      ref={ref}
      position={position}
      onClick={(e) => {
        e.stopPropagation()
        projectDialogStore.open(project.id)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setFocus(project.id)
      }}
      onPointerOut={() => setFocus(null)}
    >
      <mesh>
        <planeGeometry args={[SCREEN.w, SCREEN.h]} />
        <meshBasicMaterial map={texture} toneMapped={false} fog={false} />
      </mesh>
      <mesh position-z={-0.015}>
        <planeGeometry args={[SCREEN.w + 0.06, SCREEN.h + 0.06]} />
        <meshBasicMaterial ref={glow} color="#5b8cff" transparent opacity={0.3} toneMapped={false} fog={false} />
      </mesh>
    </group>
  )
}

/**
 * A 2-column wall of project screens, positioned from the camera pose of the `projects`
 * stop so every screen lands inside the shot: centre-left of frame, above the avatar's head,
 * clear of the Selected Work panel on the right. Works for any number of projects.
 */
function ProjectGallery({ projects }) {
  const layout = useMemo(() => {
    const cam = stopCameraPose('projects')
    // Just behind the avatar (who stands ~7 m from the camera), so the wall stays inside this
    // chapter and never intrudes on the Skills shot. Size and offsets scale with distance, so
    // the on-screen framing stays the same: centre-right of the avatar, upper half of the frame,
    // left of the Selected Work panel.
    const D = 7.8
    const k = D / 11
    const anchor = cam.position.clone().addScaledVector(cam.forward, D).addScaledVector(cam.right, -0.95 * k).addScaledVector(cam.up, 1.5 * k)
    // Face the camera: the wall's +Z points back at the lens.
    const m = new Matrix4().lookAt(cam.position, anchor, cam.up)
    const quaternion = new Quaternion().setFromRotationMatrix(m)
    const cols = 2
    const rows = Math.ceil(projects.length / cols)
    const positions = projects.map((_, i) => {
      const c = i % cols, r = Math.floor(i / cols)
      return [(c - (cols - 1) / 2) * (SCREEN.w + SCREEN.gap), ((rows - 1) / 2 - r) * (SCREEN.h + SCREEN.gap), 0]
    })
    return { anchor, quaternion, positions, scale: k }
  }, [projects])

  return (
    <group position={layout.anchor} quaternion={layout.quaternion} scale={layout.scale}>
      {projects.map((p, i) => (
        <ProjectScreen key={p.id} project={p} index={i} position={layout.positions[i]} />
      ))}
    </group>
  )
}

/** Final destination — a slow-turning ring of light behind the avatar. */
function Portal() {
  const base = useMemo(() => frameAt('contact', { forward: -3.2, up: 2.4 }), [])
  const ring = useRef()
  useFrame((state) => {
    if (ring.current && !journey.reducedMotion) ring.current.rotation.z = state.clock.elapsedTime * 0.08
  })
  return (
    <group position={base.pos} rotation-y={base.yaw}>
      <mesh ref={ring}>
        <torusGeometry args={[2.4, 0.03, 16, 160]} />
        <meshBasicMaterial color="#9277ff" toneMapped={false} />
      </mesh>
      <mesh>
        <torusGeometry args={[2.75, 0.008, 8, 160]} />
        <meshBasicMaterial color="#5fd6dd" transparent opacity={0.6} toneMapped={false} />
      </mesh>
      <pointLight color="#9277ff" intensity={30} distance={10} />
    </group>
  )
}

/* ---------- World ---------- */

export function ExperienceWorld({ quality, skills, projects }) {
  const particleCount = quality === 'high' ? 180 : 40
  return (
    <>
      <color attach="background" args={[VOID]} />
      <fog attach="fog" args={[VOID, 7, 30]} />
      <Lights quality={quality} />
      {/* Local light-formers give the model reflections without downloading an HDRI. */}
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2.2} color="#5b8cff" position={[-5, 3, 2]} scale={[2, 6, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#9277ff" position={[5, 2, -2]} scale={[2, 5, 1]} />
        <Lightformer form="ring" intensity={1.2} color="#ffffff" position={[0, 6, 0]} scale={3} />
      </Environment>
      <Ground quality={quality} />
      <Route />
      <MilestoneGates />
      <SkillConstellation categories={skills} />
      <ProjectGallery projects={projects} />
      <Portal />
      <Sparkles count={particleCount} scale={[22, 6, 70]} position={[0, 3, -31]} size={2.2} speed={journey.reducedMotion ? 0 : 0.25} opacity={0.5} color="#9fb6ff" />
    </>
  )
}
