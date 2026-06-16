/**
 * POST /api/track — records a single page view.
 *
 * Public (no auth). Called fire-and-forget by a beacon in Base.astro.
 * Privacy: we never store the raw IP — only SHA-256(IP_SALT | ip | day), which
 * still lets us count one unique visitor per IP per day.
 */

interface Env {
  DB: D1Database;
  IP_SALT?: string;
}

// JS-capable crawlers / link unfurlers we don't want to count. (Non-JS bots
// never run the beacon, so this only needs to catch the ones that do.)
const BOT_RE =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|slackbot|whatsapp|telegrambot|discordbot|embedly|skypeuripreview|headless|lighthouse|gpt|python-requests|axios|curl|wget|node-fetch|phantom|puppeteer|playwright|preview|monitor|pingdom|uptime/i;

function santiagoDay(now: Date): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const ua = request.headers.get('User-Agent') ?? '';
  // Drop bots and obviously empty UAs.
  if (!ua || BOT_RE.test(ua)) {
    return new Response(null, { status: 204 });
  }

  const ip =
    request.headers.get('CF-Connecting-IP') ??
    request.headers.get('X-Forwarded-For') ??
    '0.0.0.0';

  const day = santiagoDay(new Date());
  const salt = env.IP_SALT ?? 'no-salt';
  const ipHash = await sha256Hex(`${salt}|${ip}|${day}`);

  // Best-effort read of the path the beacon reported.
  let path = '/';
  try {
    const body = (await request.json()) as { path?: string } | null;
    if (body && typeof body.path === 'string') {
      path = body.path.slice(0, 256);
    }
  } catch {
    // sendBeacon may post text/plain; try that.
    // (Body already consumed on failure is fine — keep default path.)
  }

  try {
    await env.DB.prepare(
      'INSERT INTO page_views (day, ip_hash, path, created_at) VALUES (?, ?, ?, ?)'
    )
      .bind(day, ipHash, path, Date.now())
      .run();
  } catch {
    // Never let a tracking failure surface to the visitor.
    return new Response(null, { status: 204 });
  }

  return new Response(null, { status: 204 });
};

// Methods without a specific handler above (GET, etc.) land here.
export const onRequest: PagesFunction<Env> = async () =>
  new Response('Method Not Allowed', { status: 405 });
