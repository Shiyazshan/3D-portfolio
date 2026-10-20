import { useEffect, useRef, useSyncExternalStore } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ExternalLink, X } from 'lucide-react'
import { GitHubIcon } from '../ui/Icons'
import { Chapter, Reveal } from '../ui/Chapter'
import { journey } from '../../lib/journeyStore'
import { projectDialogStore } from '../../lib/projectDialogStore'

function ProjectDialog({ project, onClose }) {
  const closeRef = useRef(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement
    closeRef.current?.focus({ preventScroll: true }) // the dialog is fixed; never scroll the page
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      previouslyFocused?.focus?.({ preventScroll: true })
    }
  }, [onClose])

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-void/70 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] wide:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-dialog-title"
        className="panel max-h-[85svh] w-full max-w-2xl overflow-y-auto rounded-3xl p-6 md:p-10"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        data-lenis-prevent
      >
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-mute">{project.subtitle}</p>
            <h3 id="project-dialog-title" className="heading mt-1 text-4xl font-semibold">
              {project.name}
            </h3>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} className="grid size-10 shrink-0 place-items-center rounded-full border border-line text-ink hover:bg-coal-2" aria-label="Close project details">
            <X size={18} />
          </button>
        </div>
        <p className="mt-5 text-[17px] leading-relaxed text-ink">{project.description}</p>
        <h4 className="mt-7 font-medium text-ink">What I did</h4>
        <ul className="mt-3 space-y-2.5 leading-[1.6] text-mute">
          {project.contributions.map((c) => (
            <li key={c} className="relative pl-5 before:absolute before:left-0 before:top-[0.7em] before:h-px before:w-2.5 before:bg-tide">
              {c}
            </li>
          ))}
        </ul>
        <ul className="mt-6 flex flex-wrap gap-2" aria-label="Technologies">
          {project.tech.map((t) => (
            <li key={t} className="rounded-md bg-coal-2 px-2.5 py-1 text-[13px] text-ink">
              {t}
            </li>
          ))}
        </ul>
        {(project.liveUrl || project.sourceUrl) && (
          <div className="mt-8 flex flex-wrap gap-3">
            {project.liveUrl && (
              <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-volt px-5 py-3 font-medium text-void">
                <ExternalLink size={16} aria-hidden="true" /> Visit site
              </a>
            )}
            {project.sourceUrl && (
              <a href={project.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-3 text-ink">
                <GitHubIcon size={16} /> Source code
              </a>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

export function Projects({ projects, onDialogChange }) {
  // Opened from either the list below or a click on a 3D screen.
  const openId = useSyncExternalStore(projectDialogStore.subscribe, projectDialogStore.get)
  const open = projects.find((p) => p.id === openId) ?? null

  useEffect(() => onDialogChange?.(Boolean(open)), [open, onDialogChange])

  return (
    <Chapter id="projects" stop="projects" labelledBy="projects-title" height="h-[200vh]" align="right">
      <Reveal className="panel w-full max-w-[30rem] rounded-3xl p-6 md:p-8">
        <h2 id="projects-title" className="heading text-[clamp(2rem,4vw,3.2rem)] font-semibold">
          Selected work
        </h2>
        <p className="mt-3 text-mute">Open a project — here or on a screen — for what I built and how.</p>
        <ul className="mt-6 divide-y divide-line border-y border-line">
          {projects.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => projectDialogStore.open(p.id)}
                onMouseEnter={() => (journey.projectFocus = p.id)}
                onMouseLeave={() => (journey.projectFocus = null)}
                onFocus={() => (journey.projectFocus = p.id)}
                onBlur={() => (journey.projectFocus = null)}
                className="group flex w-full items-center justify-between gap-4 py-4 text-left"
                aria-haspopup="dialog"
              >
                <span>
                  <span className="block text-xl font-semibold text-ink transition-colors group-hover:text-volt">{p.name}</span>
                  <span className="mt-0.5 block text-sm text-mute">{p.subtitle}</span>
                </span>
                <span className="text-sm text-mute transition-transform group-hover:translate-x-1" aria-hidden="true">
                  Details
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Reveal>
      <AnimatePresence>{open && <ProjectDialog project={open} onClose={projectDialogStore.close} />}</AnimatePresence>
    </Chapter>
  )
}
