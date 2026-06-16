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
| `npm run dev` | Dev server at `http://localhost:4321/` (no base prefix in dev — see below) |
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

The site has two production deploys, each with a different URL shape:

- **GitHub Pages** at `https://ascariel.github.io/web-naty-abogada/` — needs `base: '/web-naty-abogada'` so asset URLs resolve.
- **Cloudflare Pages** at `https://web-naty-abogada.pages.dev/` — serves at the root, so `base: '/'`.

`astro.config.mjs` switches between them via the `GITHUB_ACTIONS` env var (set to `true` only on the GitHub Actions runner). Cloudflare Pages and local dev both use `base: '/'`. **Hardcoded `href="/foo"` links would break on the GitHub Pages build** — they resolve to `https://ascariel.github.io/foo` (404).

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

Two automatic deploys are wired up:

- **GitHub Pages** via `.github/workflows/deploy.yml` on every push to `main`. Uses `withastro/action@v3` + `actions/deploy-pages@v4`. ~30 s end-to-end. Repo has `build_type: workflow` configured.
- **Cloudflare Pages** auto-deploys from the same `main` branch (configured in the Cloudflare dashboard, not in this repo). Cloudflare runs `npm run build` without `GITHUB_ACTIONS` set, so it gets the root-base build.

Both deploys come from the same commit; the difference is which env var is present at build time.

## Analytics / visit tracking (Cloudflare only)

A small backend tracks **events** (page views + interactions) and powers a password-gated
dashboard at **`/admin`**. It runs only on Cloudflare Pages (the GitHub Pages mirror has no
Functions/D1; the beacon is guarded off there).

**Event model.** Everything is rows in a single `events` table with an `event_type` column
(`page_view`, `whatsapp_btn_click`, `contact_info_click`, …). Every event type is counted two
ways: **total** (every action, even repeated) and **unique** (one per IP per day). Add a new
event type by just sending it from the client — no schema change; the dashboard picks it up
automatically.

**How it works**
- `src/layouts/Base.astro` has a fire-and-forget beacon that POSTs to `/api/track`: a
  `page_view` on load, plus a delegated click listener that sends `whatsapp_btn_click` for
  `wa.me`/WhatsApp links and `contact_info_click` for `mailto:`/`tel:` links, site-wide.
  Skips localhost, `*.github.io`, and `/admin*`.
- `functions/api/track.ts` records the event in **D1**. `event_type` is validated against
  `^[a-z][a-z0-9_]{0,39}$`. Bots excluded by User-Agent. Stores the **raw client IP**
  (`CF-Connecting-IP`) for abuse/bot forensics; uniques are `COUNT(DISTINCT ip || day)`.
  **Enrichment columns** (no extra permissions): geo + ISP from Cloudflare's `request.cf`
  (`country`, `city`, `region`, `as_org`), `device`/`os`/`browser` parsed from the
  User-Agent, plus `lang`, `referrer`, and `utm_source`/`utm_medium`/`utm_campaign`
  (first-touch, sent by the beacon and/or parsed from the URL; an `fbclid` → `utm_source=facebook`).
  Note: `request.cf` is empty in `wrangler pages dev` — geo only fills at the edge (prod).
- `functions/api/stats.ts` returns, per event type, total + unique series aggregated by
  `day | week | month`, filterable by date.
- `functions/_middleware.ts` gates `/admin` and `/api/stats` with HTTP Basic Auth
  (`admin` / `ADMIN_PASSWORD`). It **fails closed** if the secret isn't set.
- `src/pages/admin.astro` is the dashboard (Chart.js via CDN): KPI cards, one line chart per
  event type (metric toggle), a "Páginas visitadas" pie, and an **Audiencia** section with
  bar-list breakdowns (país, ciudad, dispositivo, SO, navegador, fuente, campaña, idioma).
  Schema lives in `migrations/0001_init.sql` (the `events` table).

**One-time setup — all in the Cloudflare dashboard** (Workers & Pages → the Pages project).
The repo intentionally has **no `wrangler.toml`** (a committed one would override dashboard
bindings), so the dashboard is the single source of truth:
1. **D1 → Create database** named `naty-analytics`. Open its console and run the contents of
   `migrations/0001_init.sql`. If the `events` table already exists from an older version,
   run `migrations/0002_add_enrichment.sql` instead (adds the enrichment columns).
2. Project → **Settings → Functions → D1 database bindings** → add binding **`DB`** → `naty-analytics`
   (Production, and Preview if you want).
3. Project → **Settings → Environment variables** → add (type *Secret*):
   `ADMIN_PASSWORD` = `passpass` (change anytime). Set for Production.
4. **Redeploy** (push, or "Retry deployment") so the new bindings take effect. Then visit the site
   and open `https://tranquilidadlegal.cl/admin` (login `admin` / `passpass`).

**Local dev** (optional): create a local `wrangler.toml` (gitignored) with a `[[d1_databases]]`
binding `DB`→`naty-analytics`, put `ADMIN_PASSWORD` in `.dev.vars`, then
`wrangler d1 execute naty-analytics --local --file=migrations/0001_init.sql` and
`npm run build && npx wrangler pages dev dist`.

## Migrating to a custom domain (when registered)

1. In `astro.config.mjs`: drop the conditional and just set `site: '<domain>'` and `base: '/'`. Decommission whichever deploy you're abandoning (most likely GitHub Pages, since Cloudflare's free tier is more permissive and faster).
2. In `public/robots.txt`: update the sitemap URL.
3. Add `public/CNAME` containing the bare domain (e.g. `nataliavallejos.cl`) so Cloudflare/Pages picks it up.
4. At the registrar (NIC.cl), follow the chosen host's DNS instructions.
5. The `path()` helper becomes a no-op automatically (`BASE_URL` becomes `/`), so internal links keep working without further edits.

## Conventions worth knowing

- **Trailing slashes:** `astro.config.mjs` sets `trailingSlash: 'ignore'`, so both `/foo` and `/foo/` resolve to the same page in dev and prod. GitHub Pages still 301s inner routes to add a trailing slash; that chain works fine.
- **WhatsApp float stays green** (`#25d366`). It's a near-universal convention in Chilean lawyer sites — research confirmed this is what users recognize. The header CTA and inline buttons use the brand navy/gold; only the floating bubble is green.
- **Pricing** is published as "desde $X" ranges (validated against Chilean solo-practice market 2025–2026). The single source is `services.ts` — never duplicate price strings into Astro pages.
- **No emojis or rounded corners** in the visual language. The look is "premium clásico" — navy + gold + ivory cream, square corners, serif headlines (Cormorant Garamond) with italic-gold emphasis spans, sans body (Inter) with letter-spaced uppercase for nav and CTAs. Both fonts are self-hosted via `@fontsource` (no Google Fonts CDN).

## Where to find more context

The full research and roadmap that grounded this project lives at `~/.claude/plans/my-girlfriend-natalia-vallejos-valiant-sparrow.md` (Chilean lawyer-site benchmarks, pricing tables, hosting comparison). Per-project memories at `~/.claude/projects/-Users-pablocangas-ProyectosPersonales-WebNatyAbogada/memory/` capture user/feedback/project notes that don't belong in code.
