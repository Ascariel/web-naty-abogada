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
 *   pages: { path: string, uniques: number }[]   // page_view unique visits per path
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
    WHERE day BETWEEN ?1 AND ?2
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

  // Per-page unique visits (page_view only) for the pie chart. We pull the raw
  // page_view rows and count distinct (path, ip, day) per normalized path —
  // URL normalization is easier here than in SQL. Volume is tiny for this site.
  let pages: Array<{ path: string; uniques: number }> = [];
  try {
    const pv = await env.DB.prepare(
      "SELECT current_url, ip, day FROM events WHERE event_type = 'page_view' AND day BETWEEN ?1 AND ?2"
    )
      .bind(from, to)
      .all();
    const rows = (pv.results ?? []) as Array<{ current_url: string; ip: string; day: string }>;
    const seen = new Set<string>();
    const counts = new Map<string, number>();
    for (const r of rows) {
      const path = normalizePath(r.current_url);
      if (path === '/admin' || path.startsWith('/admin/')) continue;
      const key = `${path}|${r.ip}|${r.day}`;
      if (seen.has(key)) continue;
      seen.add(key);
      counts.set(path, (counts.get(path) ?? 0) + 1);
    }
    pages = [...counts.entries()]
      .map(([path, uniques]) => ({ path, uniques }))
      .sort((a, b) => b.uniques - a.uniques);
  } catch {
    pages = [];
  }

  return Response.json(
    { granularity, from, to, periods, eventTypes, series, totals, pages },
    { headers: { 'Cache-Control': 'no-store' } }
  );
};
