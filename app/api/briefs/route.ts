// Private records and authentication remain in the original Sites service.
// Never accept caller-supplied identity headers on the public Vercel origin.
export const dynamic = 'force-dynamic';
function hostedDesk() {
  return Response.json({
    error: 'Open the secure research desk to manage your briefs.',
    workspaceUrl: 'https://veridanth-research-ghana.elkings.chatgpt.site/workspace',
  }, { status: 409, headers: { 'Cache-Control': 'private, no-store' } });
}
export const GET = hostedDesk;
export const POST = hostedDesk;
export const DELETE = hostedDesk;
