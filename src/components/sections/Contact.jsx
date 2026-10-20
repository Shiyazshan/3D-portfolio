import { useState } from 'react'
import { Mail, Phone, RotateCcw, Send, Globe } from 'lucide-react'
import { LinkedInIcon, GitHubIcon } from '../ui/Icons'
import { Chapter, Reveal } from '../ui/Chapter'

const EMPTY = { name: '', subject: '', message: '' }

function validate(f) {
  const errors = {}
  if (f.name.trim().length < 2) errors.name = 'Enter your name.'
  if (f.message.trim().length < 10) errors.message = 'Write at least 10 characters.'
  return errors
}

/** Builds a mailto: link. No server involved — the visitor's own email app sends it. */
function buildMailto(to, { name, subject, message }) {
  const subjectLine = subject.trim() || `Hello from ${name.trim() || 'your portfolio'}`
  const body = name.trim() ? `${message.trim()}\n\n— ${name.trim()}` : message.trim()
  return `mailto:${to}?subject=${encodeURIComponent(subjectLine)}&body=${encodeURIComponent(body)}`
}

function Field({ id, label, error, as = 'input', ...props }) {
  const Tag = as
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm text-mute">
        {label}
      </label>
      <Tag
        id={id}
        name={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className="w-full rounded-xl border border-line bg-void px-4 py-3 text-ink placeholder:text-mute/60 focus:border-volt focus:outline-none"
        {...props}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-[#ff8f9c]">
          {error}
        </p>
      )}
    </div>
  )
}

export function Contact({ profile, onRestart }) {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [opened, setOpened] = useState(false)
  const { contact } = profile

  const update = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const submit = (e) => {
    e.preventDefault()
    const v = validate(form)
    setErrors(v)
    if (Object.keys(v).length) return
    window.location.href = buildMailto(contact.email, form)
    setOpened(true)
  }

  return (
    <Chapter id="contact" stop="contact" labelledBy="contact-title" height="h-[150vh]" align="left">
      <Reveal className="grid w-full gap-4 wide:w-[min(52rem,62vw)] wide:grid-cols-[1fr_1.1fr] short:w-full short:grid-cols-1">
        <div className="panel rounded-3xl p-6 md:p-9">
          <h2 id="contact-title" className="heading text-[clamp(2.2rem,4.4vw,3.6rem)] font-semibold">
            Let’s build something.
          </h2>
          <p className="mt-4 leading-relaxed text-mute">Thanks for walking the whole way. If you have a role or a project in mind, I’d like to hear about it.</p>
          <ul className="mt-7 space-y-3">
            <li>
              <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-3 text-ink hover:text-volt">
                <Mail size={18} aria-hidden="true" /> {contact.email}
              </a>
            </li>
            <li>
              <a href={contact.phoneHref} className="inline-flex items-center gap-3 text-ink hover:text-volt">
                <Phone size={18} aria-hidden="true" /> {contact.phone}
              </a>
            </li>
            <li>
              <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 text-ink hover:text-volt">
                <LinkedInIcon /> LinkedIn
              </a>
            </li>
            {contact.github && (
              <li>
                <a href={contact.github} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 text-ink hover:text-volt">
                  <GitHubIcon /> GitHub
                </a>
              </li>
            )}
            {contact.portfolio && (
              <li>
                <a href={contact.portfolio} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 text-ink hover:text-volt">
                  <Globe size={18} aria-hidden="true" /> Previous portfolio
                </a>
              </li>
            )}
          </ul>
          <button type="button" onClick={onRestart} className="mt-8 inline-flex items-center gap-2 text-sm text-mute hover:text-ink">
            <RotateCcw size={15} aria-hidden="true" /> Walk it again
          </button>
        </div>

        <form onSubmit={submit} noValidate className="panel space-y-4 rounded-3xl p-6 md:p-9" aria-describedby="form-status">
          <Field id="name" label="Your name" value={form.name} onChange={update} error={errors.name} autoComplete="name" />
          <Field id="subject" label="Subject (optional)" value={form.subject} onChange={update} />
          <Field id="message" label="Message" as="textarea" rows={4} value={form.message} onChange={update} error={errors.message} />
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-volt px-5 py-3 font-medium text-void transition-colors hover:bg-[#7aa2ff]"
          >
            <Send size={17} aria-hidden="true" />
            Write email
          </button>
          <div id="form-status" role="status" aria-live="polite" className="min-h-6 text-sm text-mute">
            {opened ? (
              <p>
                Your email app should open with the message ready to send. Nothing happened? Email{' '}
                <a className="text-volt underline" href={`mailto:${contact.email}`}>
                  {contact.email}
                </a>
                .
              </p>
            ) : (
              <p>Opens your email app with this message filled in.</p>
            )}
          </div>
        </form>
      </Reveal>
    </Chapter>
  )
}
