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
 *   totals: { [type]: { total: number, unique: number } }
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

  return Response.json(
    { granularity, from, to, periods, eventTypes, series, totals },
    { headers: { 'Cache-Control': 'no-store' } }
  );
};
