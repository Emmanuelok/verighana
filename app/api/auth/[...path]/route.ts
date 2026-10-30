import {NextRequest} from 'next/server';
import {authenticationOrigin, getFullviewAuth} from '../../../../lib/fullview-auth';
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

async function handle(request: NextRequest, context: RouteContext) {
  const {path} = await context.params;
  const endpoint = path.join('/');
  if ((request.method === 'GET' && endpoint !== 'get-session') ||
    (request.method === 'POST' && !postPaths.has(endpoint))) {
    return Response.json({error: 'Account action not available.'}, {status: 404, headers: {'Cache-Control': 'no-store'}});
  }
  const appOrigin = authenticationOrigin();
  if (!appOrigin) return Response.json({error: 'Online accounts are being connected.', code: 'auth_unavailable'}, {status: 503, headers: {'Cache-Control': 'private, no-store'}});
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
    const body = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {body.set(chunk, offset); offset += chunk.length;}
    request = new NextRequest(request.url, {method: request.method, headers: request.headers, body});
  }
  try {
    const handlers = getFullviewAuth().handler();
    const response = request.method === 'GET' ? await handlers.GET(request, context) : await handlers.POST(request, context);
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch (error) {
    const message = error instanceof OperationError ? error.message : 'Account services are temporarily unavailable. Please try again.';
    return Response.json({error: message, code: 'auth_unavailable'}, {status: 503, headers: {'Cache-Control': 'private, no-store'}});
  }
}

export const GET = handle;
export const POST = handle;
