/**
 * POST /api/track — records a single event, enriched with what we can infer
 * about the visitor (no extra permissions needed):
 *   - geo + network from Cloudflare's request.cf (country, city, region, ISP)
 *   - device / OS / browser parsed from the User-Agent
 *   - language, referrer, and UTM / fbclid attribution sent by the beacon
 *
 * Public (no auth). Stores the raw CF-Connecting-IP for abuse forensics.
 */

interface Env {
  DB: D1Database;
}

const BOT_RE =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|slackbot|whatsapp|telegrambot|discordbot|embedly|skypeuripreview|headless|lighthouse|gpt|ccbot|claudebot|amazonbot|applebot|yandex|baidu|duckduckbot|petalbot|bytespider|ahrefs|semrush|mj12|dotbot|dataforseo|serpstat|screaming\s?frog|python-requests|axios|curl|wget|node-fetch|go-http|okhttp|java\/|libwww|lwp|winhttp|httpclient|scrapy|postman|insomnia|selenium|webdriver|phantom|puppeteer|playwright|preview|monitor|pingdom|uptime|statuscake|gtmetrix|chrome-lighthouse/i;

// Hosting / cloud networks — real Chilean visitors never browse from these, so
// traffic from them is almost certainly a scraper/monitor. Cloudflare, Akamai,
// Fastly and Apple are deliberately EXCLUDED to avoid flagging real users on
// Cloudflare WARP or Apple iCloud Private Relay.
const DATACENTER_RE =
  /amazon|aws\b|google cloud|google llc|googleuser|\bgcp\b|microsoft|\bazure\b|digitalocean|digital ocean|linode|hetzner|\bovh\b|leaseweb|contabo|vultr|scaleway|choopa|\bm247\b|datacamp|oracle|alibaba|aliyun|tencent|huawei|upcloud|kamatera|hostwinds|colocrossing|psychz|quadranet|ionos|namecheap|godaddy|bluehost|hostgator|hostinger|datacenter|data center|colocation|hosting|\bvps\b/i;

const EVENT_TYPE_RE = /^[a-z][a-z0-9_]{0,39}$/;

function detectBot(
  ua: string,
  asOrg: string | null,
  body: Record<string, unknown>
): { bot: boolean; reason: string | null } {
  if (!ua) return { bot: true, reason: 'no_ua' };
  if (BOT_RE.test(ua)) return { bot: true, reason: 'ua' };
  if (body.webdriver === true) return { bot: true, reason: 'webdriver' };
  if (asOrg && DATACENTER_RE.test(asOrg)) return { bot: true, reason: 'datacenter' };
  return { bot: false, reason: null };
}

function santiagoDay(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

// Compact UA parsing — analytics-grade, dependency-free.
function parseUA(ua: string): { device: string; os: string; browser: string } {
  const s = ua || '';
  let device = 'Escritorio';
  if (/ipad|tablet|playbook|silk|kindle|(android(?!.*mobile))/i.test(s)) device = 'Tablet';
  else if (/mobile|iphone|ipod|android.*mobile|windows phone|blackberry|iemobile|opera mini/i.test(s))
    device = 'Móvil';

  let os = 'Otro';
  if (/iphone|ipad|ipod/i.test(s)) os = 'iOS';
  else if (/android/i.test(s)) os = 'Android';
  else if (/windows nt/i.test(s)) os = 'Windows';
  else if (/mac os x|macintosh/i.test(s)) os = 'macOS';
  else if (/cros/i.test(s)) os = 'ChromeOS';
  else if (/linux/i.test(s)) os = 'Linux';

  let browser = 'Otro';
  if (/edg(a|ios|e)?\//i.test(s)) browser = 'Edge';
  else if (/opr\/|opera/i.test(s)) browser = 'Opera';
  else if (/samsungbrowser/i.test(s)) browser = 'Samsung Internet';
  else if (/firefox|fxios/i.test(s)) browser = 'Firefox';
  else if (/edg/i.test(s)) browser = 'Edge';
  else if (/chrome|crios|chromium/i.test(s)) browser = 'Chrome';
  else if (/safari/i.test(s)) browser = 'Safari';

  return { device, os, browser };
}

function str(v: unknown, max = 160): string | null {
  return typeof v === 'string' && v ? v.slice(0, max) : null;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const ua = request.headers.get('User-Agent') ?? '';

  let eventType = 'page_view';
  let currentUrl = '';
  let body: Record<string, unknown> = {};
  try {
    body = ((await request.json()) as Record<string, unknown>) ?? {};
    if (typeof body.type === 'string' && EVENT_TYPE_RE.test(body.type)) eventType = body.type;
    if (typeof body.current_url === 'string') currentUrl = body.current_url.slice(0, 512);
  } catch {
    // no/invalid body → defaults
  }

  const ip =
    request.headers.get('CF-Connecting-IP') ??
    request.headers.get('X-Forwarded-For') ??
    '0.0.0.0';

  const day = santiagoDay(new Date());
  const { device, os, browser } = parseUA(ua);

  // Geo + network from Cloudflare (populated only at the edge, not in local dev).
  const cf = ((request as unknown as { cf?: Record<string, unknown> }).cf) ?? {};
  const country = str(cf.country, 4);
  const city = str(cf.city, 80);
  const region = str(cf.region, 80);
  const asOrg = str(cf.asOrganization, 120);

  // Bot / crawler detection: UA list, automation flag, or hosting/datacenter ISP.
  const { bot, reason } = detectBot(ua, asOrg, body);

  // Language: prefer what the client sent, else Accept-Language.
  const lang =
    str(body.lang, 20) ??
    str((request.headers.get('Accept-Language') ?? '').split(',')[0].trim(), 20);

  const referrer = str(body.referrer, 200);
  // Prefer the beacon's first-touch fields; fall back to the current_url query.
  let urlParams: URLSearchParams | null = null;
  try {
    urlParams = new URL(currentUrl).searchParams;
  } catch {
    urlParams = null;
  }
  const pick = (k: string, max = 120) =>
    str(body[k], max) ?? (urlParams ? str(urlParams.get(k), max) : null);
  let utmSource = pick('utm_source', 80);
  let utmMedium = pick('utm_medium', 80);
  const utmCampaign = pick('utm_campaign', 120);
  // A Facebook click id implies paid Facebook traffic even without utm tags.
  if (!utmSource && pick('fbclid', 200)) {
    utmSource = 'facebook';
    utmMedium = utmMedium ?? 'paid';
  }

  try {
    await env.DB.prepare(
      `INSERT INTO events
       (day, event_type, ip, current_url, created_at,
        country, city, region, as_org, device, os, browser, lang, referrer,
        utm_source, utm_medium, utm_campaign, is_bot, bot_reason)
       VALUES (?,?,?,?,?, ?,?,?,?,?,?,?,?,?, ?,?,?,?,?)`
    )
      .bind(
        day, eventType, ip, currentUrl, Date.now(),
        country, city, region, asOrg, device, os, browser, lang, referrer,
        utmSource, utmMedium, utmCampaign, bot ? 1 : 0, reason
      )
      .run();
  } catch {
    return new Response(null, { status: 204 });
  }

  return new Response(null, { status: 204 });
};

export const onRequest: PagesFunction<Env> = async () =>
  new Response('Method Not Allowed', { status: 405 });
