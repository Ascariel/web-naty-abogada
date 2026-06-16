// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Where this build will live:
//   - Production is Cloudflare Pages, served at the custom domain
//     https://tranquilidadlegal.cl (root, so base "/"). Local dev/preview
//     use this branch too.
//   - GitHub Pages publishes under <user>.github.io/<repo>/, so that build
//     needs a base path. We detect it via GITHUB_ACTIONS, which the runner
//     sets to "true". It stays live as a secondary mirror for now; when it's
//     decommissioned, drop this conditional and keep only the custom domain.
const isDev = process.argv.includes('dev');
const isGitHubPages = !!process.env.GITHUB_ACTIONS;

const base = isGitHubPages && !isDev ? '/web-naty-abogada' : '/';
const site = isGitHubPages
  ? 'https://ascariel.github.io'
  : 'https://tranquilidadlegal.cl';

export default defineConfig({
  site,
  base,
  integrations: [sitemap()],
  trailingSlash: 'ignore',
  build: {
    inlineStylesheets: 'auto',
  },
});
