// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Where this build will live:
//   - GitHub Pages publishes under <user>.github.io/<repo>/, so the build
//     needs a base path. We detect that via GITHUB_ACTIONS, which the
//     runner sets to "true".
//   - Cloudflare Pages, custom domains, and local dev all serve at the
//     root, so base stays "/".
//
// When a custom domain is connected later (and GitHub Pages is decommissioned),
// drop this conditional and just set base: '/' and site: '<your domain>'.
const isDev = process.argv.includes('dev');
const isGitHubPages = !!process.env.GITHUB_ACTIONS;

const base = isGitHubPages && !isDev ? '/web-naty-abogada' : '/';
const site = isGitHubPages
  ? 'https://ascariel.github.io'
  : 'https://web-naty-abogada.pages.dev';

export default defineConfig({
  site,
  base,
  integrations: [sitemap()],
  trailingSlash: 'ignore',
  build: {
    inlineStylesheets: 'auto',
  },
});
