// Everything personal lives here. Change it in chat and the site follows.
export const NAME = "harsh";
export const FULL_NAME = "harsh gupta";
export const SITE = "harshgupta.me";
export const OTHER_DOMAIN = "harshgupta.io";
export const EMAIL = "hello@harshgupta.me";
export const GITHUB_USER = "gupta-8";

export const HANDLES = {
  x: "harshguptame",
  instagram: "harsh.cat",
};

export const LINKS = {
  email: `mailto:${EMAIL}`,
  blog: "/blog",
  github: `https://github.com/${GITHUB_USER}`,
  twitter: `https://x.com/${HANDLES.x}`,
  instagram: `https://instagram.com/${HANDLES.instagram}`,
  other: `https://${OTHER_DOMAIN}`,
  rex: "https://rex.wf",
};

// Shown while the live list from GitHub loads, or if GitHub is unreachable.
// Descriptions here win over GitHub's: one short line each, like rex's card.
export const PROJECTS = [
  {
    name: "incredible-portfolio",
    description: "php portfolio, no framework",
    href: `${LINKS.github}/incredible-portfolio`,
  },
  {
    name: "nextjs-blog",
    description: "next.js + fastapi blog + cms",
    href: `${LINKS.github}/nextjs-blog`,
    spare: true,
  },
  {
    name: "wp-dark-mode",
    description: "dark mode for any wp theme",
    href: `${LINKS.github}/wp-dark-mode`,
  },
];
