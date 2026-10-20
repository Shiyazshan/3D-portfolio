import { MapPin } from 'lucide-react'
import { Chapter, Reveal } from '../ui/Chapter'

export function About({ profile }) {
  return (
    <Chapter id="about" stop="about" labelledBy="about-title" align="right">
      <Reveal className="panel w-full max-w-[34rem] rounded-3xl p-6 md:p-9">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm text-ink">
          <MapPin size={15} className="text-tide" aria-hidden="true" />
          Based in {profile.location}
        </p>
        <h2 id="about-title" className="heading text-[clamp(2rem,4vw,3.2rem)] font-semibold">
          {profile.yearsOfExperience} years of building for the web.
        </h2>
        <div className="mt-5 space-y-4 text-[16.5px] leading-[1.65] text-mute">
          {profile.about.map((p) => (
            <p key={p.slice(0, 24)}>{p}</p>
          ))}
        </div>
        <ul className="mt-6 flex flex-wrap gap-2" aria-label="Core strengths">
          {profile.strengths.map((s) => (
            <li key={s} className="rounded-full border border-line px-3 py-1.5 text-sm text-ink">
              {s}
            </li>
          ))}
        </ul>
        <p className="mt-6 border-t border-line pt-4 text-sm text-mute">
          {profile.education.degree}, {profile.education.institution} ({profile.education.year})
        </p>
      </Reveal>
    </Chapter>
  )
}
