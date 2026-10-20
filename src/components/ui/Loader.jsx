import { useEffect, useState } from 'react'
import { useProgress } from '@react-three/drei'
import { AnimatePresence, motion } from 'motion/react'

/** Full-screen loader driven by three.js' loading manager (real byte/asset progress). */
export function Loader({ name, enabled }) {
  const { progress, active, total } = useProgress()
  const [done, setDone] = useState(!enabled)

  useEffect(() => {
    if (!enabled) return
    // Done when every queued asset has loaded; fail-safe so a stalled asset never traps the visitor.
    if (!active && (total > 0 || progress === 100)) {
      const t = setTimeout(() => setDone(true), 450)
      return () => clearTimeout(t)
    }
    const failSafe = setTimeout(() => setDone(true), 12000)
    return () => clearTimeout(failSafe)
  }, [active, progress, total, enabled])

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          key="loader"
          className="fixed inset-0 z-50 flex flex-col items-start justify-end bg-void px-6 pb-10 md:px-20 md:pb-16"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          role="status"
          aria-live="polite"
        >
          <p className="display text-[clamp(3rem,10vw,8rem)] font-semibold tabular-nums text-ink">{Math.round(progress)}%</p>
          <p className="mt-3 text-mute">Loading {name}’s world</p>
          <div className="mt-6 h-px w-full max-w-md bg-line">
            <div className="h-px bg-volt transition-[width] duration-300" style={{ width: `${progress}%` }} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
