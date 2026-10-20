/**
 * Profile content — from Mohammed_Shiyas_Resume.pdf, plus the .NET work and Daman role Mohammed
 * confirmed directly. Edit here to update the site.
 */
export const profile = {
  name: "Mohammed Shiyas",
  monogram: "MS",
  title: "Senior Software Engineer — C#, ASP.NET Core & React",
  location: "Abu Dhabi, United Arab Emirates",
  locationShort: "Abu Dhabi, UAE",
  tagline:
    "I build fast, secure web applications — from .NET APIs to the interfaces people use.",
  summary:
    ".NET and React developer with 4+ years of experience building scalable, high-performance web applications — C#, ASP.NET Core Web API, Entity Framework Core and Blazor on the back end, React and Next.js on the front.",
  about: [
    "I started building for the web after completing my B.E. in Computer Science in 2021, and have shipped production applications across four companies — today as a Senior .NET Developer at Daman.",
    "My focus is the full path of a feature: a clean, reusable UI in React or Blazor, and a secure, well-structured ASP.NET Core Web API behind it.",
    "I care about performance and maintainability — lazy loading, code splitting and caching on the client; efficient Entity Framework Core queries, JWT auth and tested endpoints on the server — delivered in agile teams.",
  ],
  strengths: [
    "C# & ASP.NET Core Web API",
    "Entity Framework Core & SQL",
    "Blazor WebAssembly",
    "React.js & Next.js",
    "JWT authentication",
    "Performance optimisation",
  ],
  yearsOfExperience: "4+",
  education: {
    degree: "B.E. Computer Science",
    institution: "Dhanalakshmi Srinivasan College",
    year: "2021",
  },
  contact: {
    email: "shiyazshan555@gmail.com",
    phone: "+971 50 840 8565",
    phoneHref: "tel:+971508408565",
    linkedin: "https://www.linkedin.com/in/mohammed-shiyas/",
    // Not listed on the resume — add your GitHub URL here to show it.
    github: null,
    portfolio: "https://portfolio-self-psi-95.vercel.app/",
  },
  // Local PDF in /public; BASE_URL keeps it working when the site is served from a sub-path.
  resumeUrl: `${import.meta.env.BASE_URL}Mohammed_Shiyas_Resume.pdf`,
};
