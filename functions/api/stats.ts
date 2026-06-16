/**
 * GET /api/stats?from=YYYY-MM-DD&to=YYYY-MM-DD&granularity=day|week|month
 *
 * Returns event counts aggregated by period AND event type, both total
 * (non-unique) and unique (distinct IP per day). Auth is enforced by
 * functions/_middleware.ts, so no auth check is needed here.
 *
 * Response:
 * {
 *   granularity, from, to,
 *   periods: string[],                    // sorted period labels in range
 *   eventTypes: string[],                 // event types seen, page_view first
 *   series: { [type]: { total: number[], unique: number[] } },  // aligned to periods
 *   totals: { [type]: { total: number, unique: number } },
 *   pages: { path: string, uniques: number, total: number }[]   // page_view visits per path
 * }
 */

interface Env {
  DB: D1Database;
}

type Granularity = 'day' | 'week' | 'month';

const PERIOD_SQL: Record<Granularity, string> = {
  day: 'day',
  week: "strftime('%Y-W%W', day)",
  month: 'substr(day, 1, 7)',
};

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function clampDate(value: string | null, fallback: string): string {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
}

// Reduce a stored current_url (full URL or path) to a clean pathname, dropping
// the origin, query string and hash, and the trailing slash.
function normalizePath(url: unknown): string {
  if (typeof url !== 'string' || !url) return '/';
  let p: string;
  try {
    p = new URL(url).pathname;
  } catch {
    p = url.split('?')[0].split('#')[0];
  }
  if (p.length > 1) p = p.replace(/\/+$/, '');
  return p || '/';
}

interface Row {
  period: string;
  event_type: string;
  total: number;
  uniques: number;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);

  const today = new Date();
  const monthAgo = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);

  const from = clampDate(url.searchParams.get('from'), isoDay(monthAgo));
  const to = clampDate(url.searchParams.get('to'), isoDay(today));

  const gParam = url.searchParams.get('granularity');
  const granularity: Granularity =
    gParam === 'week' || gParam === 'month' ? gParam : 'day';

  const period = PERIOD_SQL[granularity];

  const sql = `
    SELECT ${period} AS period,
           event_type,
           COUNT(*) AS total,
           COUNT(DISTINCT ip || '|' || day) AS uniques
    FROM events
    WHERE day BETWEEN ?1 AND ?2 AND COALESCE(is_bot, 0) = 0
    GROUP BY period, event_type
    ORDER BY period`;

  let rows: Row[] = [];
  try {
    const result = await env.DB.prepare(sql).bind(from, to).all();
    rows = (result.results ?? []) as unknown as Row[];
  } catch (err) {
    return Response.json(
      { error: 'query_failed', detail: String(err) },
      { status: 500 }
    );
  }

  // Distinct, sorted periods.
  const periods = [...new Set(rows.map((r) => r.period))].sort();
  const periodIndex = new Map(periods.map((p, i) => [p, i]));

  // Event types: keep page_view first, then the rest alphabetically.
  const typeSet = new Set(rows.map((r) => r.event_type));
  const eventTypes = [...typeSet].sort((a, b) => {
    if (a === 'page_view') return -1;
    if (b === 'page_view') return 1;
    return a.localeCompare(b);
  });

  const series: Record<string, { total: number[]; unique: number[] }> = {};
  const totals: Record<string, { total: number; unique: number }> = {};
  for (const t of eventTypes) {
    series[t] = {
      total: new Array(periods.length).fill(0),
      unique: new Array(periods.length).fill(0),
    };
    totals[t] = { total: 0, unique: 0 };
  }

  for (const r of rows) {
    const i = periodIndex.get(r.period)!;
    series[r.event_type].total[i] = r.total;
    series[r.event_type].unique[i] = r.uniques;
    totals[r.event_type].total += r.total;
    totals[r.event_type].unique += r.uniques;
  }

  // Pull page_view rows once and derive both the per-page pie and the audience
  // breakdowns (geo, device, etc.) in a single pass. Volume is tiny for this site.
  let pages: Array<{ path: string; uniques: number; total: number }> = [];
  const breakdowns: Record<string, Array<{ value: string; total: number; unique: number }>> = {};
  try {
    const pv = await env.DB.prepare(
      `SELECT current_url, ip, day, country, city, region, as_org, device, os, browser,
              lang, referrer, utm_source, utm_medium, utm_campaign
       FROM events WHERE event_type = 'page_view' AND day BETWEEN ?1 AND ?2
              AND COALESCE(is_bot, 0) = 0`
    )
      .bind(from, to)
      .all();
    const pvRows = (pv.results ?? []) as Array<Record<string, string | null>>;

    // Per-page (pie)
    const seen = new Set<string>();
    const uniqueCounts = new Map<string, number>();
    const totalCounts = new Map<string, number>();
    for (const r of pvRows) {
      const path = normalizePath(r.current_url);
      if (path === '/admin' || path.startsWith('/admin/')) continue;
      totalCounts.set(path, (totalCounts.get(path) ?? 0) + 1);
      const key = `${path}|${r.ip}|${r.day}`;
      if (seen.has(key)) continue;
      seen.add(key);
      uniqueCounts.set(path, (uniqueCounts.get(path) ?? 0) + 1);
    }
    pages = [...totalCounts.entries()]
      .map(([path, total]) => ({ path, total, uniques: uniqueCounts.get(path) ?? 0 }))
      .sort((a, b) => b.uniques - a.uniques);

    // Audience breakdowns. Each dimension maps a row to a label.
    const dims: Record<string, (r: Record<string, string | null>) => string | null> = {
      country: (r) => r.country || '—',
      city: (r) => r.city || '—',
      cityCl: (r) => (r.country === 'CL' ? r.city || '—' : null), // Chile only
      device: (r) => r.device || '—',
      os: (r) => r.os || '—',
      browser: (r) => r.browser || '—',
      lang: (r) => (r.lang || '—').split('-')[0],
      source: (r) => sourceLabel(r),
      campaign: (r) => r.utm_campaign || '(directo)',
    };
    const tot: Record<string, Map<string, number>> = {};
    const uniqSeen: Record<string, Set<string>> = {};
    const uniq: Record<string, Map<string, number>> = {};
    for (const k of Object.keys(dims)) {
      tot[k] = new Map();
      uniq[k] = new Map();
      uniqSeen[k] = new Set();
    }
    for (const r of pvRows) {
      for (const k of Object.keys(dims)) {
        const v = dims[k](r);
        if (!v) continue; // dimension not applicable to this row (e.g. cityCl for non-CL)
        tot[k].set(v, (tot[k].get(v) ?? 0) + 1);
        const ukey = `${v}|${r.ip}|${r.day}`;
        if (!uniqSeen[k].has(ukey)) {
          uniqSeen[k].add(ukey);
          uniq[k].set(v, (uniq[k].get(v) ?? 0) + 1);
        }
      }
    }
    for (const k of Object.keys(dims)) {
      breakdowns[k] = [...tot[k].entries()]
        .map(([value, total]) => ({ value, total, unique: uniq[k].get(value) ?? 0 }))
        .sort((a, b) => b.unique - a.unique || b.total - a.total)
        .slice(0, 12);
    }
  } catch {
    pages = [];
  }

  // Filtered traffic (bots/crawlers): how much we excluded, and why/where from.
  let botsFiltered: {
    total: number;
    pct: number;
    byReason: Array<{ value: string; count: number }>;
    byOrg: Array<{ value: string; count: number }>;
  } = { total: 0, pct: 0, byReason: [], byOrg: [] };
  try {
    const allRow = (await env.DB.prepare(
      'SELECT COUNT(*) AS c FROM events WHERE day BETWEEN ?1 AND ?2'
    )
      .bind(from, to)
      .first()) as { c: number } | null;
    const totalAll = allRow?.c ?? 0;

    const br = await env.DB.prepare(
      'SELECT bot_reason, as_org FROM events WHERE COALESCE(is_bot,0)=1 AND day BETWEEN ?1 AND ?2'
    )
      .bind(from, to)
      .all();
    const botRows = (br.results ?? []) as Array<{ bot_reason: string | null; as_org: string | null }>;
    const reason = new Map<string, number>();
    const org = new Map<string, number>();
    for (const r of botRows) {
      const rs = r.bot_reason || 'otro';
      reason.set(rs, (reason.get(rs) ?? 0) + 1);
      const o = r.as_org || '—';
      org.set(o, (org.get(o) ?? 0) + 1);
    }
    botsFiltered = {
      total: botRows.length,
      pct: totalAll ? Math.round((botRows.length / totalAll) * 100) : 0,
      byReason: [...reason.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count),
      byOrg: [...org.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count).slice(0, 8),
    };
  } catch {
    // leave defaults
  }

  return Response.json(
    { granularity, from, to, periods, eventTypes, series, totals, pages, breakdowns, botsFiltered },
    { headers: { 'Cache-Control': 'no-store' } }
  );
};

// Normalize the traffic source from utm_source / fbclid-derived value or referrer host.
function sourceLabel(r: Record<string, string | null>): string {
  const us = (r.utm_source || '').toLowerCase();
  if (us) {
    if (/facebook|fb|meta/.test(us)) return 'Facebook';
    if (/insta|ig/.test(us)) return 'Instagram';
    if (/google/.test(us)) return 'Google';
    return r.utm_source as string;
  }
  let host = '';
  try {
    host = new URL(r.referrer || '').hostname.replace(/^www\./, '');
  } catch {
    host = '';
  }
  if (!host) return 'Directo';
  if (/facebook\.com|fb\.com|fb\.me/.test(host)) return 'Facebook';
  if (/instagram\.com/.test(host)) return 'Instagram';
  if (/google\./.test(host)) return 'Google';
  if (/t\.co|twitter\.com|x\.com/.test(host)) return 'Twitter/X';
  if (/bing\./.test(host)) return 'Bing';
  return host;
}
