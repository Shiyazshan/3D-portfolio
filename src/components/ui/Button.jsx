const VARIANTS = {
  primary: 'bg-volt text-void hover:bg-[#7aa2ff]',
  ghost: 'border border-line text-ink hover:border-mute hover:bg-coal-2',
}

/** Renders an <a> when given href, otherwise a <button>. */
export function Button({ variant = 'primary', href, icon: Icon, children, className = '', ...props }) {
  const cls = `inline-flex items-center gap-2 rounded-full px-5 py-3 text-[15px] font-medium transition-colors duration-200 ${VARIANTS[variant]} ${className}`
  const content = (
    <>
      {Icon && <Icon size={17} aria-hidden="true" />}
      <span>{children}</span>
    </>
  )
  if (href) {
    return (
      <a href={href} className={cls} {...props}>
        {content}
      </a>
    )
  }
  return (
    <button type="button" className={cls} {...props}>
      {content}
    </button>
  )
}
