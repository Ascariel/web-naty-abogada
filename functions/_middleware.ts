/**
 * Runs on every request to the Pages project. Gates the analytics dashboard and
 * its data API behind HTTP Basic Auth (user `admin`, password = ADMIN_PASSWORD
 * secret). Everything else — the public site and the /api/track beacon — passes
 * straight through.
 */

interface Env {
  ADMIN_PASSWORD?: string;
}

const REALM = 'tranquilidadlegal — admin';

function needsAuth(pathname: string): boolean {
  return (
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname === '/api/stats'
  );
}

// Length-safe constant-time string compare.
function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

function unauthorized(): Response {
  return new Response('Authentication required.', {
    status: 401,
    headers: {
      'WWW-Authenticate': `Basic realm="${REALM}", charset="UTF-8"`,
    },
  });
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, next } = context;
  const url = new URL(request.url);

  if (!needsAuth(url.pathname)) return next();

  const expectedPassword = env.ADMIN_PASSWORD;
  // Fail closed if the secret isn't configured.
  if (!expectedPassword) return unauthorized();

  const header = request.headers.get('Authorization') ?? '';
  const [scheme, encoded] = header.split(' ');
  if (scheme !== 'Basic' || !encoded) return unauthorized();

  let decoded = '';
  try {
    decoded = atob(encoded);
  } catch {
    return unauthorized();
  }

  const sep = decoded.indexOf(':');
  const user = sep >= 0 ? decoded.slice(0, sep) : '';
  const pass = sep >= 0 ? decoded.slice(sep + 1) : '';

  const ok =
    timingSafeEqual(user, 'admin') &&
    timingSafeEqual(pass, expectedPassword);

  return ok ? next() : unauthorized();
};
