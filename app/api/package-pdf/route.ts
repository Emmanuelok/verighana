import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createEstimatePdf} from '../../../lib/estimate-pdf';
import {packagePdfDocument, parsePackagePdfConfig} from '../../../lib/package-pdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const responseHeaders = {'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'};

export async function GET(request: Request): Promise<Response> {
  let config;
  try {
    if (request.body !== null || request.headers.has('transfer-encoding') ||
        (request.headers.has('content-length') && request.headers.get('content-length') !== '0')) {
      throw new Error('Request bodies are not accepted.');
    }
    config = parsePackagePdfConfig(new URL(request.url).searchParams);
  } catch {
    return Response.json({error: 'Choose a valid package, client level and listed add-ons. Private brief fields are not accepted.'},
      {status: 400, headers: responseHeaders});
  }
  try {
    const [regular, bold, serif, logo] = await Promise.all([
      readFile(join(process.cwd(), 'public/fonts/dm-sans-regular.ttf')),
      readFile(join(process.cwd(), 'public/fonts/dm-sans-semibold.ttf')),
      readFile(join(process.cwd(), 'public/fonts/instrument-serif-regular.ttf')),
      readFile(join(process.cwd(), 'public/brand/logo-dark.png')),
    ]);
    const bytes = await createEstimatePdf(packagePdfDocument(config), {regular, bold, serif, logo});
    return new Response(new Uint8Array(bytes), {headers: {
      ...responseHeaders, 'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Fullview-Signature-${config.bundleId}-package.pdf"`,
    }});
  } catch {
    return Response.json({error: 'The package PDF could not be prepared. Please return to the catalogue and try again.'},
      {status: 500, headers: responseHeaders});
  }
}

function methodNotAllowed(): Response {
  return Response.json({error: 'Use GET with public package choices only. Request bodies are not accepted.'},
    {status: 405, headers: {...responseHeaders, Allow: 'GET'}});
}

export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const HEAD = methodNotAllowed;
