import { STOPS } from './journeyConfig'

/**
 * A plain mutable object shared by GSAP (writer) and the 3D frame loop (reader).
 *
 * Why not React state? GSAP updates these values up to 120×/s while scrolling.
 * Putting them in state would re-render the React tree every frame. Instead
 * GSAP tweens this object directly and useFrame() reads it — the same idea as
 * keeping a value in useRef rather than useState.
 */
const first = STOPS[0]

export const journey = {
  pathT: first.pathT,
  angle: first.angle,
  distance: first.distance,
  height: first.height,
  lookSide: first.lookSide,
  lookHeight: first.lookHeight,
  facing: first.facing,
  wave: 0,
  greet: 0, // 0 → 1 hello wave on first load
  accent: 0, // fractional index into STOP_COLORS
  intro: 0, // 0 → 1 opening dolly
  progress: 0,
  skillFocus: null,
  projectFocus: null,
  reducedMotion: false,
}

/* Tiny external store for the few values React UI actually needs (active chapter). */
const listeners = new Set()
let activeIndex = 0

export const activeStopStore = {
  get: () => activeIndex,
  set(next) {
    if (next === activeIndex) return
    activeIndex = next
    listeners.forEach((l) => l())
  },
  subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}

// Handy when tuning camera framing: inspect `__journey` in the browser console (dev builds only).
if (import.meta.env.DEV && typeof window !== 'undefined') window.__journey = journey
