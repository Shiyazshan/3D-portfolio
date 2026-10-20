/**
 * Skill categories. `.NET & Backend` leads. `primary` marks what I reach for first and is used
 * for visual hierarchy only — there are deliberately no proficiency percentages.
 * Node.js / Express.js remain listed (they are on the résumé) but are no longer featured.
 */
export const skills = [
  {
    id: 'dotnet',
    label: '.NET & Backend',
    icon: 'server',
    items: [
      { name: 'C#', primary: true },
      { name: 'ASP.NET Core Web API', primary: true },
      { name: 'Entity Framework Core', primary: true },
      { name: 'Blazor WebAssembly', primary: true },
      { name: 'RESTful APIs' },
      { name: 'JWT Authentication' },
      { name: 'SQL' },
      { name: 'PostgreSQL' },
      { name: 'MySQL' },
      { name: 'MongoDB' },
      { name: 'WebSocket' },
      { name: 'Node.js' },
      { name: 'Express.js' },
    ],
  },
  {
    id: 'frontend',
    label: 'Frontend',
    icon: 'code',
    items: [
      { name: 'React.js', primary: true },
      { name: 'Next.js', primary: true },
      { name: 'JavaScript (ES6+)', primary: true },
      { name: 'TypeScript' },
      { name: 'Tailwind CSS' },
      { name: 'Redux' },
      { name: 'HTML5' },
      { name: 'CSS3' },
      { name: 'React Native', note: 'basic / supporting' },
    ],
  },
  {
    id: 'tooling',
    label: 'Tooling & Testing',
    icon: 'wrench',
    items: [{ name: 'Visual Studio' }, { name: 'Vite', primary: true }, { name: 'Storybook', primary: true }, { name: 'Vitest' }, { name: 'Jest' }, { name: 'Git' }],
  },
  {
    id: 'workflow',
    label: 'Design & Workflow',
    icon: 'palette',
    items: [{ name: 'Figma' }, { name: 'Agile Methodology' }, { name: 'CI/CD Pipelines' }],
  },
]
