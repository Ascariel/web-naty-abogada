/**
 * POST /api/track — records a single event.
 *
 * Public (no auth). Called fire-and-forget by beacons in Base.astro.
 * Body: { type?: string, current_url?: string }. `type` defaults to "page_view".
 *
 * Stores the raw client IP (for abuse/bot forensics). Unique counts are derived
 * downstream as one per IP per day.
 */

interface Env {
  DB: D1Database;
}

// JS-capable crawlers / link unfurlers we don't want to count. (Non-JS bots
// never run the beacon, so this only needs to catch the ones that do.)
const BOT_RE =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|slackbot|whatsapp|telegrambot|discordbot|embedly|skypeuripreview|headless|lighthouse|gpt|python-requests|axios|curl|wget|node-fetch|phantom|puppeteer|playwright|preview|monitor|pingdom|uptime/i;

// Event types we accept. Keep it a simple validated slug to avoid junk/abuse.
const EVENT_TYPE_RE = /^[a-z][a-z0-9_]{0,39}$/;

function santiagoDay(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const ua = request.headers.get('User-Agent') ?? '';
  if (!ua || BOT_RE.test(ua)) {
    return new Response(null, { status: 204 });
  }

  let eventType = 'page_view';
  let currentUrl = '';
  try {
    const body = (await request.json()) as { type?: string; current_url?: string } | null;
    if (body) {
      if (typeof body.type === 'string' && EVENT_TYPE_RE.test(body.type)) {
        eventType = body.type;
      }
      if (typeof body.current_url === 'string') {
        currentUrl = body.current_url.slice(0, 512);
      }
    }
  } catch {
    // No/invalid body → default page_view with empty current_url.
  }

  const ip =
    request.headers.get('CF-Connecting-IP') ??
    request.headers.get('X-Forwarded-For') ??
    '0.0.0.0';

  const day = santiagoDay(new Date());

  try {
    await env.DB.prepare(
      'INSERT INTO events (day, event_type, ip, current_url, created_at) VALUES (?, ?, ?, ?, ?)'
    )
      .bind(day, eventType, ip, currentUrl, Date.now())
      .run();
  } catch {
    return new Response(null, { status: 204 });
  }

  return new Response(null, { status: 204 });
};

// Methods without a specific handler above (GET, etc.) land here.
export const onRequest: PagesFunction<Env> = async () =>
  new Response('Method Not Allowed', { status: 405 });
