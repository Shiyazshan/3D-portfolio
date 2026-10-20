import { motion, useReducedMotion } from 'motion/react'

/**
 * A scroll chapter. The outer <section> is tall (it is the scroll distance the
 * avatar walks); the inner block sticks to the viewport while the 3D scene
 * plays behind it. `align` puts the reading panel opposite the avatar.
 */
export function Chapter({ id, stop, labelledBy, height = 'h-[190vh]', align = 'left', mobileMaxHeight = 'max-h-[56svh]', children, className = '' }) {
  const justify = align === 'right' ? 'wide:justify-end' : align === 'center' ? 'wide:justify-center' : 'wide:justify-start'
  return (
    // The section and its sticky layer let clicks pass through to the 3D scene behind them
    // (e.g. the project screens); only the panels themselves take pointer input.
    <section id={id} data-stop={stop} aria-labelledby={labelledBy} className={`pointer-events-none relative ${height}`}>
      <div className={`sticky top-0 flex h-svh items-end justify-center px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-24 wide:items-center wide:px-12 wide:pb-0 short:pt-20 lg:px-20 ${justify} ${className}`}>
        {/*
          Portrait (phones, upright tablets): the panel sits under the avatar, centred, and scrolls
          inside itself if it is long. Side-by-side: it sits opposite the avatar and only scrolls
          when the screen is too short to show it whole (e.g. a phone held sideways).
        */}
        <div
          className={`pointer-events-auto w-full max-w-2xl overflow-y-auto overscroll-contain rounded-3xl wide:w-auto wide:max-w-[min(100%,56vw)] wide:max-h-[calc(100svh-7rem)] short:max-h-[calc(100svh-6rem)] [&>*]:pointer-events-auto [&>*]:mx-auto wide:[&>*]:mx-0 ${mobileMaxHeight}`}
        >
          {children}
        </div>
      </div>
    </section>
  )
}

/** A single orchestrated reveal for a panel when its chapter arrives. */
export function Reveal({ children, className = '', delay = 0 }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      // A small threshold: on phones a long panel can be taller than the area it scrolls in,
      // so a large share of it is never on screen at once.
      viewport={{ amount: 0.08, once: true }}
      transition={{ duration: 1.1, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}
