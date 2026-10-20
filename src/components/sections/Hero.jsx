import { motion, useReducedMotion } from 'motion/react'
import { ChevronDown, FileText } from 'lucide-react'
import { Button } from '../ui/Button'

/**
 * Opening screen. Text sits in the left column; the right half is kept clear for the 3D
 * avatar (framed there by the `hero` stop in journeyConfig.js). On phones the avatar is
 * framed in the top half and the text sits below it.
 */
export function Hero({ profile, onExplore }) {
  const reduce = useReducedMotion()
  const [first, ...rest] = profile.name.split(' ')
  const enter = (delay) =>
    reduce ? {} : { initial: { opacity: 0, y: 32 }, animate: { opacity: 1, y: 0 }, transition: { duration: 1.1, delay, ease: [0.22, 1, 0.36, 1] } }

  return (
    <section id="hero" data-stop="hero" aria-labelledby="hero-title" className="pointer-events-none relative h-[160vh]">
      <div className="sticky top-0 flex h-svh flex-col justify-end px-4 pb-[max(2rem,env(safe-area-inset-bottom))] wide:justify-center wide:px-12 wide:pb-0 short:pt-16 lg:px-20">
        <div className="pointer-events-auto mx-auto w-full max-w-2xl wide:mx-0 wide:max-w-[min(46rem,52vw)]">
          <motion.p {...enter(0.35)} className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-void/70 px-3.5 py-1.5 text-sm text-mute short:mb-3 compact:mb-3 compact:px-3 compact:py-1 compact:text-xs">
            <span className="size-1.5 rounded-full bg-tide" aria-hidden="true" />
            {profile.locationShort}
          </motion.p>

          <h1 id="hero-title" className="name-display pointer-events-none text-[clamp(2.7rem,min(12vw,7.4vw+2vh),7.6rem)] short:text-[clamp(2.2rem,11vh,3.6rem)]">
            <motion.span {...enter(0.5)} className="block">
              <span className={reduce ? 'name-fill' : 'name-fill name-sheen'}>{first}</span>
            </motion.span>
            <motion.span {...enter(0.62)} className="block">
              <span className={reduce ? 'name-fill' : 'name-fill name-sheen name-sheen-late'}>{rest.join(' ')}</span>
            </motion.span>
          </h1>

          <motion.div {...enter(0.85)} className="mt-6 max-w-xl short:mt-3 compact:mt-3">
            <p className="text-[17px] font-medium text-ink sm:text-lg wide:text-xl short:text-base">{profile.title}</p>
            <p className="mt-2 text-[16px] leading-relaxed text-mute sm:text-[17px] short:hidden compact:hidden">{profile.tagline}</p>
          </motion.div>

          <motion.div {...enter(1)} className="mt-7 flex flex-wrap gap-3 short:mt-4 compact:mt-5 max-sm:[&>*]:px-4 max-sm:[&>*]:py-2.5 max-sm:[&>*]:text-sm">
            <Button onClick={onExplore}>Start the journey</Button>
            <Button variant="ghost" href={profile.resumeUrl} target="_blank" rel="noopener" icon={FileText}>
              View résumé
            </Button>
          </motion.div>
        </div>

        <div className="pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1 text-xs text-mute wide:flex short:hidden" aria-hidden="true">
          <span>Scroll to walk</span>
          <ChevronDown size={16} className={reduce ? '' : 'animate-bounce'} />
        </div>
      </div>
    </section>
  )
}
