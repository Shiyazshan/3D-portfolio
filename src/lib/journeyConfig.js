import { CatmullRomCurve3, Color, Vector3 } from 'three'

/**
 * The route the avatar walks. Points run away from the start along -Z with
 * gentle bends so the camera has something to "turn" with.
 */
export const PATH = new CatmullRomCurve3(
  [
    new Vector3(0, 0, 0),
    new Vector3(1.5, 0, -9),
    new Vector3(-1.5, 0, -18),
    new Vector3(1, 0, -26),
    new Vector3(-1, 0, -34),
    new Vector3(2, 0, -43),
    new Vector3(-1, 0, -53),
    new Vector3(0, 0, -62),
  ],
  false,
  'centripetal',
)

export const PATH_LENGTH = PATH.getLength()

/**
 * One entry per scroll chapter. `id` must match a DOM element's data-stop.
 *
 * Camera framing orbits the avatar (so the camera never cuts through it):
 *   angle    – radians around the avatar; 0 = in front, ±π = behind, + = avatar's right
 *   distance – metres from the avatar
 *   height   – camera height above the floor
 *   lookSide / lookHeight – aim point relative to the avatar (moves it left/right on screen)
 * facing: 0 = avatar faces along the path, 1 = avatar turns to the camera.
 */
export const STOPS = [
  // Hero: full body, framed in the right half (text column is on the left).
  { id: 'hero', pathT: 0.0, angle: 0.12, distance: 6.2, height: 1.35, lookSide: 1.55, lookHeight: 1.0, facing: 1, accent: '#5b8cff' },
  { id: 'about', pathT: 0.11, angle: -0.55, distance: 5.4, height: 1.55, lookSide: -1.25, lookHeight: 1.1, facing: 1, accent: '#9277ff' },
  { id: 'exp-0', pathT: 0.22, angle: 0.9, distance: 5.6, height: 1.8, lookSide: 1.45, lookHeight: 1.2, facing: 1, accent: '#5b8cff' },
  { id: 'exp-1', pathT: 0.32, angle: 0.9, distance: 5.6, height: 1.8, lookSide: 1.45, lookHeight: 1.2, facing: 1, accent: '#6f84ff' },
  { id: 'exp-2', pathT: 0.42, angle: 0.9, distance: 5.6, height: 1.8, lookSide: 1.45, lookHeight: 1.2, facing: 1, accent: '#837cff' },
  { id: 'exp-3', pathT: 0.52, angle: 0.9, distance: 5.6, height: 1.8, lookSide: 1.45, lookHeight: 1.2, facing: 1, accent: '#9277ff' },
  { id: 'skills', pathT: 0.66, angle: -0.6, distance: 6.4, height: 2.3, lookSide: -1.3, lookHeight: 1.4, facing: 1, accent: '#5fd6dd' },
  // Projects: avatar on the left, the 2×2 screen wall centre-left, the Selected Work panel on the right.
  { id: 'projects', pathT: 0.82, angle: -0.35, distance: 7.0, height: 1.9, lookSide: -1.25, lookHeight: 1.45, facing: 1, accent: '#5b8cff' },
  // Contact: full body on the right; contact panels on the left.
  { id: 'contact', pathT: 1.0, angle: 0.12, distance: 6.4, height: 1.4, lookSide: 1.75, lookHeight: 1.0, facing: 1, accent: '#9277ff' },
]

/** Follow-shot framing while walking: behind the avatar, on the side of the next chapter's camera. */
export const WALK_CAMERA = { angle: 2.55, distance: 4.6, height: 2.1, lookSide: 0, lookHeight: 1.3 }

export const STOP_COLORS = STOPS.map((s) => new Color(s.accent))

/**
 * Distance (metres) covered in one full Walk clip loop. Measured from the mocap's root motion
 * by scripts/build-avatar.mjs ("walk root travel per loop: 3.210 m"). Driving the clip at exactly
 * this ratio keeps the feet planted. If you replace the avatar, use the value the script prints.
 */
export const STRIDE_LENGTH = 3.21

/** Model-specific yaw correction (radians). The Ready Player Me avatar already faces +Z. */
export const AVATAR_YAW_OFFSET = 0

/**
 * "Hello" wave, as target directions in the avatar's own space (x = out to his right side,
 * y = up, z = forward). The Avatar aims the bones along these, so no rig-specific angles.
 */
export const WAVE = { upperArm: [0.85, 0.42, 0.18], forearm: [0.12, 1, 0.16], swing: 0.38, speed: 7 }

/**
 * Camera pose at a stop on a landscape screen — the same maths CameraRig uses, so scene
 * objects (like the project screens) can be placed exactly where that shot will see them.
 */
export function stopCameraPose(stopId) {
  const stop = STOPS.find((s) => s.id === stopId)
  const p = PATH.getPointAt(stop.pathT)
  const t = PATH.getTangentAt(stop.pathT)
  const up = new Vector3(0, 1, 0)
  const r = new Vector3().crossVectors(t, up).normalize()
  const position = p.clone().addScaledVector(t, Math.cos(stop.angle) * stop.distance).addScaledVector(r, Math.sin(stop.angle) * stop.distance).addScaledVector(up, stop.height)
  const target = p.clone().addScaledVector(r, stop.lookSide).addScaledVector(up, stop.lookHeight)
  const forward = target.clone().sub(position).normalize()
  const right = new Vector3().crossVectors(forward, up).normalize()
  const camUp = new Vector3().crossVectors(right, forward).normalize()
  return { position, target, forward, right, up: camUp }
}
