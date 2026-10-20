/**
 * Projects from the resume (Node.js is kept only where the CV describes the API work, not in badges). Only links that appear on the resume are set;
 * everything else is null so the UI never shows a fabricated demo/source link.
 * Add screenshots by placing files in /public/projects and setting `image`.
 */
export const projects = [
  {
    id: 'e-niyamasabha',
    name: 'e-Niyamasabha',
    subtitle: 'Kerala Legislative Assembly',
    description: 'A production-grade platform for the digital management of legislative assembly sessions.',
    contributions: [
      'Developed the platform in React.js.',
      'Built a scalable, responsive UI with ShadCN UI for document, discussion and voting management.',
      'Implemented real-time data handling for assembly discussions and decisions.',
      'Set up a component-driven workflow in Storybook for reusability and maintainability.',
      'Integrated Husky pre-commit hooks for linting, formatting and automated checks.',
    ],
    tech: ['React.js', 'ShadCN UI', 'Storybook', 'Husky', 'Real-time data'],
    liveUrl: null,
    sourceUrl: null,
    image: null,
  },
  {
    id: 'stikcon',
    name: 'Stikcon',
    subtitle: 'CRM for Construction & Consulting',
    description: 'A CRM to manage customer enquiries and admin workflows.',
    contributions: [
      'Built the CRM end to end: a React.js interface backed by a REST API.',
      'Developed RESTful APIs in Node.js and Express.js for enquiries, chat and user management.',
      'Implemented JWT authentication and role-based access control.',
      'Integrated real-time chat between the React frontend and Node.js backend.',
      'Integrated Google Maps Platform APIs for location selection during enquiry submission.',
      'Worked with cross-functional teams on requirement analysis and solution planning.',
    ],
    tech: ['React.js', 'REST API', 'JWT / RBAC', 'Real-time chat', 'Google Maps Platform'],
    liveUrl: 'https://www.stikcon.com/',
    sourceUrl: null,
    image: null,
  },
  {
    id: 'english-cafe',
    name: 'English Cafe',
    subtitle: 'Online Learning Platform',
    description: 'A responsive learning platform for structured, day-by-day English courses.',
    contributions: [
      'Built the platform end to end: a React.js dashboard backed by a REST API.',
      'Built a dashboard UI for course browsing, enrolment and progress tracking.',
      'Developed RESTful APIs in Node.js and Express.js for courses, scheduling and student progress.',
      'Implemented JWT authentication and role-based access control.',
    ],
    tech: ['React.js', 'REST API', 'JWT / RBAC'],
    liveUrl: null,
    sourceUrl: null,
    image: null,
  },
  {
    id: 'ladder-kerala',
    name: 'Ladder Kerala',
    subtitle: 'Corporate Website',
    description: 'A responsive corporate website showcasing company projects and services.',
    contributions: [
      'Built the site with React.js and a REST API for enquiries.',
      'Implemented an accessible, responsive UI across desktop and mobile.',
      'Built backend APIs in Node.js and Express.js for enquiry submissions and client follow-ups.',
    ],
    tech: ['React.js', 'REST API', 'Responsive UI'],
    liveUrl: null,
    sourceUrl: null,
    image: null,
  },
]
