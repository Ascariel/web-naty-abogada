# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Static marketing site for **Natalia Vallejos Gutiérrez**, an abogada in Santiago, Chile, focused on Derecho de Familia plus two niches (recurso de protección Ley 21.331 contra Isapres por topes en salud mental, e inscripción de marcas en INAPI). Spanish-only. Built with Astro v6, deployed to GitHub Pages at `https://ascariel.github.io/web-naty-abogada/`. The site converts visitors to WhatsApp conversations — there is no contact form backend.

## Toolchain

Astro 6 requires Node ≥ 22. The system Node on this machine is 18.20.4, which **will fail**. Use the nvm-installed Node 22:

```sh
export PATH="/Users/pablocangas/.nvm/versions/node/v22.21.1/bin:$PATH"
```

Prefix every `npm` / `npx` invocation with that, including in subshells.

## Commands

| Command | Use |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Dev server at `http://localhost:4321/web-naty-abogada/` (note the base path) |
| `npm run build` | Build static site into `dist/` |
| `npm run preview` | Serve the built `dist/` locally |

There is no test suite, no linter, and no formatter configured. `npm run build` is the smoke test — it fails loudly on broken Astro syntax or missing imports.

## Architecture

**Data-driven, not file-driven.** Most page content comes from two TypeScript modules — editing them changes the site:

- `src/data/site.ts` — global site config (name, WhatsApp number, email, university, credentials, social links). Also exports the `path()` helper and `whatsappLink()` helper.
- `src/data/services.ts` — the full catalog of legal services. Each `Service` has a `slug`, `group` (`pareja` / `hijos` / `proteccion` / `otros`), description, price range, etc. The dynamic route `src/pages/areas-de-practica/[slug].astro` builds a page per service via `getStaticPaths()`. The home and the index of `/areas-de-practica` both render from the same array.

**One layout for everything.** `src/layouts/Base.astro` is the only layout — it sets the `<head>`, JSON-LD `LegalService` schema, header, footer, and the floating WhatsApp button. Every page imports it.

**Components are presentation only.** The few components in `src/components/` (`Header`, `Footer`, `WhatsAppFloat`) read from `src/data/site.ts`. There is no client-side state.

## The `path()` helper — do not skip

The site is hosted under a base path (`/web-naty-abogada` in production, `/web-naty-abogada` in dev too because of the Astro config). **Hardcoded `href="/foo"` links break in production** — they resolve to `https://ascariel.github.io/foo` (404) instead of the project URL.

Every internal link must flow through `path()` from `src/data/site.ts`:

```astro
---
import { path } from '../data/site';
---
<a href={path('/sobre-mi')}>Sobre mí</a>
<a href={path(`/areas-de-practica/${slug}`)}>{title}</a>
```

`path()` is a no-op for `http(s)://` and `mailto:` URLs, so it's safe to wrap everything. Asset URLs in `<head>` (favicon, OG image) need it too — see `Base.astro`.

## Deploy

`.github/workflows/deploy.yml` runs on every push to `main`. It uses `withastro/action@v3` (Node 22) to build, then `actions/deploy-pages@v4` to publish. End-to-end takes ~30 seconds.

Repo settings have `build_type: workflow` (configured once via `gh api -X POST /repos/.../pages -f build_type=workflow`). HTTPS is enforced. Don't push directly to `gh-pages` — the workflow manages the artifact.

## Migrating to a custom domain (when registered)

1. In `astro.config.mjs`: change `site` to the domain and **remove** `base`.
2. In `public/robots.txt`: update the sitemap URL.
3. Add `public/CNAME` containing the bare domain (e.g. `nataliavallejos.cl`).
4. At the registrar (NIC.cl), point `A` records for the apex to `185.199.108.153`/`.109`/`.110`/`.111`, and a `CNAME` for `www` to `ascariel.github.io`.
5. The `path()` helper becomes a no-op automatically (`BASE_URL` becomes `/`), so internal links keep working without further edits.

## Conventions worth knowing

- **Trailing slashes:** `astro.config.mjs` sets `trailingSlash: 'never'`, but GitHub Pages adds them on inner routes anyway. The 301 → 200 chain works; the canonical URL in `<head>` matches the no-trailing-slash version.
- **WhatsApp float stays green** (`#25d366`). It's a near-universal convention in Chilean lawyer sites — research confirmed this is what users recognize. The header CTA and inline buttons use the brand navy/gold; only the floating bubble is green.
- **Pricing** is published as "desde $X" ranges (validated against Chilean solo-practice market 2025–2026). The single source is `services.ts` — never duplicate price strings into Astro pages.
- **No emojis or rounded corners** in the visual language. The look is "premium clásico" — navy + gold + ivory cream, square corners, serif headlines (Cormorant Garamond) with italic-gold emphasis spans, sans body (Inter) with letter-spaced uppercase for nav and CTAs. Both fonts are self-hosted via `@fontsource` (no Google Fonts CDN).

## Where to find more context

The full research and roadmap that grounded this project lives at `~/.claude/plans/my-girlfriend-natalia-vallejos-valiant-sparrow.md` (Chilean lawyer-site benchmarks, pricing tables, hosting comparison). Per-project memories at `~/.claude/projects/-Users-pablocangas-ProyectosPersonales-WebNatyAbogada/memory/` capture user/feedback/project notes that don't belong in code.
