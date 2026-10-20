import { useEffect, useRef, useCallback } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { STOPS, WALK_CAMERA } from '../lib/journeyConfig'
import { journey, activeStopStore } from '../lib/journeyStore'

gsap.registerPlugin(ScrollTrigger)

const CAMERA_KEYS = ['angle', 'distance', 'height', 'lookSide', 'lookHeight']
const shortest = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from))
const pick = (src) => Object.fromEntries(CAMERA_KEYS.map((k) => [k, src[k]]))

/**
 * Where in its section (0–1) the avatar arrives, and when it leaves again.
 * Between ARRIVE_AT and DEPART_AT he stands still (idle) while the visitor reads;
 * from DEPART_AT of one section to ARRIVE_AT of the next he walks.
 */
const ARRIVE_AT = 0.18
const DEPART_AT = 0.62

/**
 * Scroll feel. Lenis interpolates wheel/trackpad input; touch and keyboard stay native.
 *   WHEEL_MULTIPLIER < 1 → each wheel notch moves the page less (slower, more controlled)
 *   LERP              → how quickly the page catches up with the input (lower = smoother)
 *   SCRUB             → seconds the 3D timeline takes to catch up with the page
 * Balanced so one section ≈ 1.5–2 screens of scroll: roughly 10 wheel notches (or 2–3
 * trackpad swipes) to walk to the next chapter, with time to read once he stops.
 * These work together with the section heights (h-[150–200vh] in the section components).
 */
const SCROLL = { WHEEL_MULTIPLIER: 0.85, LERP: 0.085, SCRUB: 1.1 }

/**
 * Measures every [data-stop] element and returns its scroll range as a
 * fraction (0–1) of the total scrollable distance.
 */
function measureStops() {
  const max = ScrollTrigger.maxScroll(window) || 1
  return STOPS.map((stop) => {
    const el = document.querySelector(`[data-stop="${stop.id}"]`)
    if (!el) throw new Error(`Missing DOM element for journey stop "${stop.id}"`)
    const top = el.getBoundingClientRect().top + window.scrollY
    return { stop, el, start: top / max, length: el.offsetHeight / max, top }
  })
}

/**
 * Builds ONE GSAP timeline for the whole page and scrubs it with the scroll bar.
 * Timeline time 0 → 1 maps to scroll 0 → max, so scrolling backwards simply
 * plays the timeline backwards — the avatar walks back on its own.
 */
function buildTimeline(ranges) {
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } })
  const clamp = gsap.utils.clamp(0, 1)

  // Angles are unwrapped as we go so each orbit takes the short way round.
  let angle = ranges[0].stop.angle

  for (let i = 1; i < ranges.length; i++) {
    const prev = ranges[i - 1]
    const curr = ranges[i]
    const depart = clamp(i === 1 ? prev.start + prev.length * 0.2 : prev.start + prev.length * DEPART_AT)
    const arrive = clamp(Math.min(curr.start + curr.length * ARRIVE_AT, 0.995))
    const span = Math.max(arrive - depart, 0.001)
    const { stop } = curr

    const walkAngle = angle + shortest(angle, Math.sign(stop.angle || 1) * WALK_CAMERA.angle)
    const stopAngle = walkAngle + shortest(walkAngle, stop.angle)
    angle = stopAngle

    // Walk along the path for the whole span.
    tl.to(journey, { pathT: stop.pathT, accent: i, duration: span, ease: 'sine.inOut' }, depart)
    // Camera orbits to a follow shot, then settles into the chapter framing.
    tl.to(journey, { ...WALK_CAMERA, angle: walkAngle, duration: span * 0.45, ease: 'power2.inOut' }, depart)
    tl.to(journey, { ...pick(stop), angle: stopAngle, duration: span * 0.55, ease: 'power2.inOut' }, depart + span * 0.45)
    // Turn away from the camera to walk, turn back to introduce the chapter.
    tl.to(journey, { facing: 0, wave: 0, duration: span * 0.18, ease: 'power1.out' }, depart)
    tl.to(journey, { facing: stop.facing, duration: span * 0.28, ease: 'power2.out' }, arrive - span * 0.28)
    if (stop.wave) tl.to(journey, { wave: stop.wave, duration: span * 0.2, ease: 'power2.out' }, arrive)
  }
  tl.set({}, {}, 1) // pin total duration to exactly 1
  return tl
}

/**
 * Owns smooth scrolling (Lenis), the master ScrollTrigger and section navigation.
 * Returns scrollToStop(id) for the nav and buttons.
 */
export function useScrollJourney({ progressBarRef } = {}) {
  const lenisRef = useRef(null)
  const rangesRef = useRef([])

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    journey.reducedMotion = reduced

    let lenis = null
    let tickerFn = null
    if (!reduced) {
      lenis = new Lenis({
        lerp: SCROLL.LERP,
        wheelMultiplier: SCROLL.WHEEL_MULTIPLIER,
        smoothWheel: true,
        syncTouch: false, // keep native momentum scrolling on phones and tablets
        allowNestedScroll: true, // panels that scroll inside themselves (short screens) keep working
      })
      lenis.on('scroll', ScrollTrigger.update)
      tickerFn = (time) => lenis.raf(time * 1000)
      gsap.ticker.add(tickerFn)
      gsap.ticker.lagSmoothing(0)
      lenisRef.current = lenis
    }

    // Opening camera dolly — independent of scroll.
    const intro = gsap.to(journey, { intro: 1, duration: reduced ? 0 : 3.2, ease: 'power3.out', delay: 0.3 })

    let trigger = null
    let tl = null
    const build = () => {
      trigger?.kill()
      tl?.kill()
      // Reset to the opening state so the new timeline records correct start values.
      Object.assign(journey, pick(STOPS[0]), { pathT: STOPS[0].pathT, facing: STOPS[0].facing, wave: 0, accent: 0 })
      const ranges = measureStops()
      rangesRef.current = ranges
      tl = buildTimeline(ranges)
      trigger = ScrollTrigger.create({
        animation: tl,
        start: 0,
        end: 'max',
        scrub: reduced ? true : SCROLL.SCRUB,
        onUpdate(self) {
          journey.progress = self.progress
          if (progressBarRef?.current) progressBarRef.current.style.transform = `scaleX(${self.progress})`
          let idx = 0
          ranges.forEach((r, i) => {
            if (self.progress >= r.start - 0.002) idx = i
          })
          activeStopStore.set(idx)
        },
      })
    }

    build()
    // Section heights depend on viewport size and late-loading fonts — rebuild when they change.
    let resizeTimer
    const onResize = () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        ScrollTrigger.refresh()
        build()
      }, 200)
    }
    window.addEventListener('resize', onResize)
    document.fonts?.ready.then(onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      clearTimeout(resizeTimer)
      intro.kill()
      trigger?.kill()
      tl?.kill()
      if (tickerFn) gsap.ticker.remove(tickerFn)
      lenis?.destroy()
      lenisRef.current = null
    }
  }, [progressBarRef])

  /** Scroll so the avatar has just arrived at the chapter. */
  const scrollToStop = useCallback((id) => {
    const range = rangesRef.current.find((r) => r.stop.id === id)
    if (!range) return
    const target = id === 'hero' ? 0 : range.top + range.el.offsetHeight * (ARRIVE_AT + 0.06)
    if (lenisRef.current) {
      // Longer jumps glide for longer (1.8–4 s) so the walk and camera stay readable.
      const distance = Math.abs(target - window.scrollY)
      const duration = Math.min(4, Math.max(1.8, 1.4 + distance / 3500))
      const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
      lenisRef.current.scrollTo(target, { duration, easing: easeInOutCubic })
    } else window.scrollTo({ top: target, behavior: 'auto' })
  }, [])

  const setScrollLocked = useCallback((locked) => {
    if (!lenisRef.current) return
    if (locked) lenisRef.current.stop()
    else lenisRef.current.start()
  }, [])

  return { scrollToStop, setScrollLocked }
}
