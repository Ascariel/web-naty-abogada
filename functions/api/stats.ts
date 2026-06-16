/**
 * GET /api/stats?from=YYYY-MM-DD&to=YYYY-MM-DD&granularity=day|week|month
 *
 * Returns visit counts aggregated by the chosen period. Auth is enforced by
 * functions/_middleware.ts (this path is gated), so no auth check is needed here.
 */

interface Env {
  DB: D1Database;
}

type Granularity = 'day' | 'week' | 'month';

// SQLite expression that maps a `day` (YYYY-MM-DD) to a period label.
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
           COUNT(*) AS views,
           COUNT(DISTINCT ip_hash) AS uniques
    FROM page_views
    WHERE day BETWEEN ?1 AND ?2
    GROUP BY period
    ORDER BY period`;

  let rows: Array<{ period: string; views: number; uniques: number }> = [];
  try {
    const result = await env.DB.prepare(sql).bind(from, to).all();
    rows = (result.results ?? []) as typeof rows;
  } catch (err) {
    return Response.json(
      { error: 'query_failed', detail: String(err) },
      { status: 500 }
    );
  }

  const totals = rows.reduce(
    (acc, r) => {
      acc.views += r.views;
      acc.uniques += r.uniques;
      return acc;
    },
    { views: 0, uniques: 0 }
  );

  return Response.json(
    { granularity, from, to, rows, totals },
    { headers: { 'Cache-Control': 'no-store' } }
  );
};
