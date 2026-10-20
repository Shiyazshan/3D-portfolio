import { useState, useSyncExternalStore, useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Menu, X } from 'lucide-react'
import { activeStopStore } from '../../lib/journeyStore'
import { STOPS } from '../../lib/journeyConfig'

const LINKS = [
  { id: 'about', label: 'About', stops: ['about'] },
  { id: 'exp-0', label: 'Experience', stops: ['exp-0', 'exp-1', 'exp-2'] },
  { id: 'skills', label: 'Skills', stops: ['skills'] },
  { id: 'projects', label: 'Projects', stops: ['projects'] },
  { id: 'contact', label: 'Contact', stops: ['contact'] },
]

export function Nav({ monogram, name, onNavigate, progressBarRef }) {
  const active = useSyncExternalStore(activeStopStore.subscribe, activeStopStore.get)
  const activeId = STOPS[active]?.id
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const go = (id) => {
    setOpen(false)
    onNavigate(id)
  }

  return (
    <header className="fixed inset-x-0 top-0 z-40">
      <nav aria-label="Sections" className="flex items-center justify-between px-4 py-4 md:px-12 lg:px-20">
        <button type="button" onClick={() => go('hero')} className="flex items-center gap-3 text-ink" aria-label={`${name} — back to start`}>
          <span className="grid size-10 place-items-center rounded-full border border-line bg-void text-sm font-semibold tracking-tight">{monogram}</span>
          <span className="hidden text-[15px] font-medium sm:block">{name}</span>
        </button>

        <ul className="hidden items-center gap-1 rounded-full border border-line bg-void/80 p-1 md:flex">
          {LINKS.map((l) => {
            const isActive = l.stops.includes(activeId)
            return (
              <li key={l.id}>
                <button
                  type="button"
                  onClick={() => go(l.id)}
                  aria-current={isActive ? 'step' : undefined}
                  className={`rounded-full px-4 py-2 text-sm transition-colors ${isActive ? 'bg-coal-2 text-ink' : 'text-mute hover:text-ink'}`}
                >
                  {l.label}
                </button>
              </li>
            )
          })}
        </ul>

        <button
          type="button"
          className="grid size-10 place-items-center rounded-full border border-line bg-void text-ink md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </nav>

      {/* Journey progress */}
      <div className="h-px w-full bg-line/60" aria-hidden="true">
        <div ref={progressBarRef} className="h-px origin-left scale-x-0 bg-gradient-to-r from-volt via-iris to-tide" />
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="mx-4 mt-2 rounded-2xl border border-line bg-coal p-2 md:hidden"
          >
            <ul>
              {LINKS.map((l) => (
                <li key={l.id}>
                  <button type="button" onClick={() => go(l.id)} className="w-full rounded-xl px-4 py-3 text-left text-lg text-ink hover:bg-coal-2">
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
