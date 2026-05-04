// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// While hosted on GitHub Pages: project URL is https://ascariel.github.io/web-naty-abogada/
// When a custom domain is connected later, change `site` to the domain and remove `base`.
export default defineConfig({
  site: 'https://ascariel.github.io',
  base: '/web-naty-abogada',
  integrations: [sitemap()],
  trailingSlash: 'never',
  build: {
    inlineStylesheets: 'auto',
  },
});
