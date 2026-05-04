// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// In dev we serve at the root ("/") so localhost:4321/ shows the home page.
// In prod we publish under /web-naty-abogada/ because GitHub Pages serves
// project sites at <user>.github.io/<repo>/.
//
// When a custom domain is connected later, drop the prod branch entirely:
// change `site` to the domain and remove this conditional.
const isDev = process.argv.includes('dev');

export default defineConfig({
  site: 'https://ascariel.github.io',
  base: isDev ? '/' : '/web-naty-abogada',
  integrations: [sitemap()],
  trailingSlash: 'ignore',
  build: {
    inlineStylesheets: 'auto',
  },
});
