// Public visitors save briefs in their own browser. Never expose private records
// or accept caller-supplied identity headers on the public Vercel origin.
export const dynamic = 'force-dynamic';
function hostedDesk() {
  return Response.json({
    error: 'Use the public research desk to save and download briefs on your device.',
    workspaceUrl: '/workspace',
  }, { status: 409, headers: { 'Cache-Control': 'private, no-store' } });
}
export const GET = hostedDesk;
export const POST = hostedDesk;
export const DELETE = hostedDesk;
