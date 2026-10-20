import { lazy, Suspense, useCallback, useRef, useState } from 'react'
import { Nav } from './components/ui/Nav'
import { Loader } from './components/ui/Loader'
import { Hero } from './components/sections/Hero'
import { About } from './components/sections/About'
import { Experience } from './components/sections/Experience'
import { Skills } from './components/sections/Skills'
import { Projects } from './components/sections/Projects'
import { Contact } from './components/sections/Contact'
import { useScrollJourney } from './hooks/useScrollJourney'
import { detectWebGL, useMediaQuery } from './hooks/useEnvironment'
// All content is hardcoded from the résumé in src/data — no backend, no API calls.
import { profile } from './data/profile'
import { experience } from './data/experience'
import { skills } from './data/skills'
import { projects } from './data/projects'

// three.js + the scene are code-split so text content paints before the 3D stack downloads.
const Scene = lazy(() => import('./components/3d/Scene'))

export default function App() {
  const progressBarRef = useRef(null)
  const { scrollToStop, setScrollLocked } = useScrollJourney({ progressBarRef })
  const isMobile = useMediaQuery('(max-width: 767px), (pointer: coarse)')
  const [webgl] = useState(detectWebGL)
  const [avatarFailed, setAvatarFailed] = useState(false)

  const onDialogChange = useCallback((open) => setScrollLocked(open), [setScrollLocked])

  return (
    <>
      <a href="#about" className="sr-only z-50 rounded-full bg-ink px-4 py-2 text-void focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>

      {/* The persistent 3D world. One canvas for the whole page — the avatar is never re-created. */}
      <div className="fixed inset-0 -z-0" aria-hidden="true">
        {webgl ? (
          <Suspense fallback={null}>
            <Scene isMobile={isMobile} skills={skills} projects={projects} onAvatarError={() => setAvatarFailed(true)} />
          </Suspense>
        ) : (
          <div className="h-full w-full bg-[radial-gradient(ellipse_at_70%_30%,#1a2250_0%,#06070b_60%)]" />
        )}
        {/* Bottom scrim keeps mobile panels legible over the scene */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-void/90 to-transparent wide:hidden" />
      </div>

      <Loader name={profile.name.split(' ')[0]} enabled={webgl} />
      <Nav monogram={profile.monogram} name={profile.name} onNavigate={scrollToStop} progressBarRef={progressBarRef} />

      {(!webgl || avatarFailed) && (
        <p role="note" className="fixed bottom-4 right-4 z-30 max-w-xs rounded-xl border border-line bg-coal px-4 py-3 text-sm text-mute">
          {webgl ? 'The 3D avatar could not be loaded, so you’re seeing the world without it.' : 'Your browser has 3D graphics turned off, so you’re seeing the text-only version.'}
        </p>
      )}

      {/* Click-through: only panels/buttons take input, so the 3D project screens behind stay clickable. */}
      <main className="pointer-events-none relative z-10">
        <Hero profile={profile} onExplore={() => scrollToStop('about')} />
        <About profile={profile} />
        <Experience experience={experience} />
        <Skills skills={skills} />
        <Projects projects={projects} onDialogChange={onDialogChange} />
        <Contact profile={profile} onRestart={() => scrollToStop('hero')} />
      </main>
    </>
  )
}
