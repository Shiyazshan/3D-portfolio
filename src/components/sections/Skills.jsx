import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { CodeXml, Server, Wrench, Palette } from 'lucide-react'
import { Chapter, Reveal } from '../ui/Chapter'
import { journey } from '../../lib/journeyStore'

const ICONS = { code: CodeXml, server: Server, wrench: Wrench, palette: Palette }

/** Category tabs drive both the list and which orbit glows in the 3D scene. */
export function Skills({ skills }) {
  const [activeId, setActiveId] = useState(skills[0]?.id)
  const active = skills.find((s) => s.id === activeId) ?? skills[0]

  const select = (id) => {
    setActiveId(id)
    journey.skillFocus = id
  }

  return (
    <Chapter id="skills" stop="skills" labelledBy="skills-title" height="h-[190vh]" align="right">
      <Reveal className="panel w-full max-w-[34rem] rounded-3xl p-6 md:p-9">
        <h2 id="skills-title" className="heading text-[clamp(2rem,4vw,3.2rem)] font-semibold">
          The toolkit
        </h2>
        <p className="mt-3 text-[16px] leading-relaxed text-mute">Brighter means it’s what I reach for first.</p>

        <div role="tablist" aria-label="Skill categories" className="mt-6 flex flex-wrap gap-2">
          {skills.map((cat) => {
            const Icon = ICONS[cat.icon] ?? CodeXml
            const selected = cat.id === active.id
            return (
              <button
                key={cat.id}
                role="tab"
                id={`tab-${cat.id}`}
                aria-selected={selected}
                aria-controls="skills-panel"
                onClick={() => select(cat.id)}
                onMouseEnter={() => (journey.skillFocus = cat.id)}
                onMouseLeave={() => (journey.skillFocus = activeId)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors ${
                  selected ? 'bg-ink text-void' : 'border border-line text-mute hover:text-ink'
                }`}
              >
                <Icon size={15} aria-hidden="true" />
                {cat.label}
              </button>
            )
          })}
        </div>

        <div id="skills-panel" role="tabpanel" aria-labelledby={`tab-${active.id}`} className="mt-6 min-h-[9rem]">
          <AnimatePresence mode="wait">
            <motion.ul
              key={active.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="flex flex-wrap items-baseline gap-x-5 gap-y-3"
            >
              {active.items.map((item) => (
                <li key={item.name} className={item.primary ? 'text-2xl font-semibold text-ink' : 'text-lg text-mute'}>
                  {item.name}
                  {item.note && <span className="ml-1.5 text-sm text-mute">({item.note})</span>}
                </li>
              ))}
            </motion.ul>
          </AnimatePresence>
        </div>
      </Reveal>
    </Chapter>
  )
}
