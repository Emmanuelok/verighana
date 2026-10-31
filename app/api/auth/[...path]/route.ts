import {NextRequest} from 'next/server';
import {authenticationEmailAllowed, authenticationMode, authenticationOrigin, getFullviewAuth, normalizeAuthenticationEmail} from '../../../../lib/fullview-auth';
import {OperationError} from '../../../../lib/operations/core';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
type RouteContext = {params: Promise<{path: string[]}>};
const postPaths = new Set([
  'sign-up/email', 'sign-in/email', 'sign-out',
  'email-otp/send-verification-otp', 'email-otp/verify-email',
  'email-otp/request-password-reset', 'email-otp/reset-password',
  'request-password-reset', 'reset-password', 'send-verification-email',
]);
const linkPaths = new Set(['request-password-reset', 'reset-password', 'send-verification-email']);
const privateHeaders = {'Cache-Control': 'private, no-store'};
function validationUnavailable() {
  return Response.json({error: 'Online accounts are currently being validated. Please try again later.', code: 'auth_validation_only'}, {status: 403, headers: privateHeaders});
}

async function handle(request: NextRequest, context: RouteContext) {
  const {path} = await context.params;
  const endpoint = path.join('/');
  if ((request.method === 'GET' && endpoint !== 'get-session') ||
    (request.method === 'POST' && !postPaths.has(endpoint))) {
    return Response.json({error: 'Account action not available.'}, {status: 404, headers: {'Cache-Control': 'no-store'}});
  }
  const appOrigin = authenticationOrigin();
  if (!appOrigin) return Response.json({error: 'Online accounts are being connected.', code: 'auth_unavailable'}, {status: 503, headers: {'Cache-Control': 'private, no-store'}});
  const validating = authenticationMode() === 'validation';
  if (validating && linkPaths.has(endpoint)) {
    return Response.json({error: 'Account action not available.'}, {status: 404, headers: privateHeaders});
  }
  if (request.method !== 'GET') {
    const origin = request.headers.get('origin');
    if (!origin || origin !== appOrigin || new URL(request.url).origin !== appOrigin || request.headers.get('sec-fetch-site') === 'cross-site') {
      return Response.json({error: 'Open the Fullview website to use this account action.'}, {status: 403, headers: {'Cache-Control': 'no-store'}});
    }
    const size = Number(request.headers.get('content-length') || '0');
    if (!Number.isFinite(size) || size > 16_384) {
      return Response.json({error: 'Account request is too large.'}, {status: 413, headers: {'Cache-Control': 'no-store'}});
    }
    const reader = request.body?.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    if (reader) {
      while (true) {
        const next = await reader.read();
        if (next.done) break;
        length += next.value.length;
        if (length > 16_384) {
          await reader.cancel();
          return Response.json({error: 'Account request is too large.'}, {status: 413, headers: {'Cache-Control': 'no-store'}});
        }
        chunks.push(next.value);
      }
    }
    let body = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {body.set(chunk, offset); offset += chunk.length;}
    const headers = new Headers(request.headers);
    if (validating && endpoint !== 'sign-out') {
      if (headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return validationUnavailable();
      let input: unknown;
      try {input = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(body));}
      catch {return validationUnavailable();}
      if (!input || typeof input !== 'object' || Array.isArray(input)) return validationUnavailable();
      const payload = input as Record<string, unknown>;
      const email = normalizeAuthenticationEmail(payload.email);
      if (!email || !authenticationEmailAllowed(email)) return validationUnavailable();
      // Forward exactly the address checked above, without aliases or case differences.
      body = new TextEncoder().encode(JSON.stringify({...payload, email}));
      headers.delete('content-length');
    }
    request = new NextRequest(request.url, {method: request.method, headers, body});
  } else if (validating) {
    // Validate restored sessions with the provider, even when a caller requests the cookie cache.
    const url = new URL(request.url);
    url.searchParams.set('disableCookieCache', 'true');
    request = new NextRequest(url, {method: 'GET', headers: request.headers});
  }
  try {
    const handlers = getFullviewAuth().handler();
    const response = request.method === 'GET' ? await handlers.GET(request, context) : await handlers.POST(request, context);
    if (validating && request.method === 'GET') {
      if (!response.ok) throw new Error('Session provider unavailable');
      const data: unknown = await response.clone().json();
      if (data === null) return Response.json(null, {headers: privateHeaders});
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid managed session');
      const user = (data as {user?: unknown}).user;
      if (user === null) return Response.json(null, {headers: privateHeaders});
      if (!user || typeof user !== 'object' || Array.isArray(user)) throw new Error('Invalid managed session');
      const identity = user as {id?: unknown; email?: unknown};
      if (typeof identity.id !== 'string' || !identity.id || typeof identity.email !== 'string') throw new Error('Invalid managed session');
      // Do not forward another account's identity, session token, or newly issued cookies.
      if (!authenticationEmailAllowed(identity.email)) return Response.json(null, {headers: privateHeaders});
    }
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch (error) {
    const message = error instanceof OperationError ? error.message : 'Account services are temporarily unavailable. Please try again.';
    return Response.json({error: message, code: 'auth_unavailable'}, {status: 503, headers: {'Cache-Control': 'private, no-store'}});
  }
}

export const GET = handle;
export const POST = handle;
