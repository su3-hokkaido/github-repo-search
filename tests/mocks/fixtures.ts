// Sample GitHub API payloads used by the MSW handlers.

export const rawSearchResponse = {
  total_count: 4521,
  incomplete_results: false,
  items: [
    {
      id: 10270250,
      name: "react",
      full_name: "facebook/react",
      owner: { login: "facebook", avatar_url: "https://avatars.example/fb.png" },
      description: "The library for web and native user interfaces.",
      language: "JavaScript",
      stargazers_count: 230000,
      forks_count: 47000,
      open_issues_count: 900,
      html_url: "https://github.com/facebook/react",
    },
    {
      id: 70107786,
      name: "next.js",
      full_name: "vercel/next.js",
      owner: { login: "vercel", avatar_url: "https://avatars.example/vercel.png" },
      description: "The React Framework.",
      language: "TypeScript",
      stargazers_count: 125000,
      forks_count: 26000,
      open_issues_count: 2700,
      html_url: "https://github.com/vercel/next.js",
    },
  ],
};

// Single-repo endpoint includes subscribers_count (the real watcher count).
export const rawRepoDetail = {
  id: 10270250,
  name: "react",
  full_name: "facebook/react",
  owner: { login: "facebook", avatar_url: "https://avatars.example/fb.png" },
  description: "The library for web and native user interfaces.",
  language: "JavaScript",
  stargazers_count: 230000,
  watchers_count: 230000, // intentionally equal to stars (GitHub quirk)
  subscribers_count: 6600, // the value we should display as "Watchers"
  forks_count: 47000,
  open_issues_count: 900,
  html_url: "https://github.com/facebook/react",
};
