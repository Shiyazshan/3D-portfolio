import { Chapter, Reveal } from '../ui/Chapter'

/** One chapter per role — the avatar walks through a gate for each. Newest first. */
export function Experience({ experience }) {
  return (
    <div id="experience">
      {experience.map((job, i) => (
        <Chapter key={job.id} stop={`exp-${i}`} labelledBy={`job-${job.id}`} height="h-[175vh]" align="left">
          <Reveal className="panel w-full max-w-[36rem] rounded-3xl p-6 md:p-9">
            <div className="flex items-baseline justify-between gap-4 text-sm text-mute">
              <span>{job.period}</span>
              <span aria-label={`Role ${i + 1} of ${experience.length}`} className="tabular-nums">
                {i + 1}/{experience.length}
              </span>
            </div>
            <h2 id={`job-${job.id}`} className="heading mt-3 text-[clamp(1.9rem,3.6vw,2.9rem)] font-semibold">
              {job.company}
            </h2>
            <p className="mt-1 text-lg text-volt">{job.role}</p>
            <ul className="mt-5 space-y-2.5 text-[16px] leading-[1.6] text-mute">
              {job.highlights.map((h) => (
                <li key={h} className="relative pl-5 before:absolute before:left-0 before:top-[0.7em] before:h-px before:w-2.5 before:bg-tide">
                  {h}
                </li>
              ))}
            </ul>
            <ul className="mt-6 flex flex-wrap gap-2" aria-label="Technologies">
              {job.tech.map((t) => (
                <li key={t} className="rounded-md bg-coal-2 px-2.5 py-1 text-[13px] text-ink">
                  {t}
                </li>
              ))}
            </ul>
          </Reveal>
        </Chapter>
      ))}
    </div>
  )
}
