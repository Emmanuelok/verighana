import assert from 'node:assert/strict';
import {build} from 'esbuild';

// Test the application boundary with a managed-provider fixture. This does not claim live authentication works.
const mock = {session: {data: null, error: null}, calls: [], proxyCalls: 0};
globalThis.__fullviewAuthFixture = mock;
const plugin = {
  name: 'managed-auth-fixture',
  setup(builder) {
    builder.onResolve({filter: /^@neondatabase\/auth\/next\/server$/}, () => ({path:'auth', namespace:'fixture'}));
    builder.onResolve({filter: /^next\/server$/}, () => ({path:'next', namespace:'fixture'}));
    builder.onLoad({filter: /.*/, namespace:'fixture'}, args => ({loader:'js', contents: args.path === 'next' ? 'export class NextRequest extends Request {}' : `
      export function createNeonAuth(config) {
        const fixture = globalThis.__fullviewAuthFixture;
        fixture.config = config;
        return {
          async getSession(options) {fixture.calls.push(options); if(fixture.throw) throw Error('provider detail'); return fixture.session;},
          handler() {return {
            async GET() {fixture.proxyCalls++;return Response.json({ok:true});},
            async POST(request) {fixture.proxyCalls++;fixture.body=await request.text();return Response.json({ok:true});}
          };}
        };
      }`
    }));
  }
};
async function load(entry) {
  const result=await build({entryPoints:[entry],bundle:true,write:false,format:'esm',platform:'node',plugins:[plugin],logLevel:'silent'});
  return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
}
const keys=['FULLVIEW_AUTH_ENABLED','FULLVIEW_NEON_AUTH_BASE_URL','FULLVIEW_AUTH_COOKIE_SECRET','FULLVIEW_APP_ORIGIN'];
const prior=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
try {
  keys.forEach(key=>delete process.env[key]);
  const auth=await load('lib/fullview-auth.ts');
  assert.equal(auth.authenticationConfigured(),false);
  await assert.rejects(auth.getPrincipal(),error=>error.status===503);
  process.env.FULLVIEW_AUTH_ENABLED='true';
  process.env.FULLVIEW_NEON_AUTH_BASE_URL='https://example.neonauth.neon.tech/project/auth';
  process.env.FULLVIEW_AUTH_COOKIE_SECRET='test-fixture-only-never-a-live-secret';
  process.env.FULLVIEW_APP_ORIGIN='https://fvsignature.com';
  assert.equal(auth.authenticationConfigured(),true);
  const goodUrl=process.env.FULLVIEW_NEON_AUTH_BASE_URL;
  for(const url of ['http://example.neon.tech/project/auth','https://evil.example/auth','https://example.neon.tech/auth?redirect=evil','https://user:pass@example.neon.tech/auth']) {
    process.env.FULLVIEW_NEON_AUTH_BASE_URL=url; assert.equal(auth.authenticationConfigured(),false);
  }
  process.env.FULLVIEW_NEON_AUTH_BASE_URL=goodUrl;
  mock.session={data:{user:{id:'verified-user',email:'synthetic@example.org',emailVerified:false}},error:null};
  assert.deepEqual(await auth.getPrincipal(),{id:'verified-user',email:'synthetic@example.org',emailVerified:false});
  assert.deepEqual(mock.calls.at(-1),{query:{disableCookieCache:'true'}});
  assert.equal(mock.config.cookies.sameSite,'strict');
  mock.session.data.user.emailVerified=true;
  assert.equal((await auth.getPrincipal()).emailVerified,true);
  mock.session={data:null,error:null}; assert.equal(await auth.getPrincipal(),null);
  mock.session={data:null,error:{message:'provider secret detail'}};
  await assert.rejects(auth.getPrincipal(),error=>error.status===503&&!error.message.includes('secret'));
  mock.throw=true; await assert.rejects(auth.getPrincipal(),error=>error.status===503); mock.throw=false;
  mock.session={data:{user:{id:'',email:'invalid'}},error:null};
  await assert.rejects(auth.getPrincipal(),error=>error.status===503);
  const route=await load('app/api/auth/[...path]/route.ts');
  const invoke=(method,path,{body,origin='https://fvsignature.com',headers={}}={})=>route[method](new Request('https://fvsignature.com/api/auth/'+path,{method,headers:{...(origin?{origin}:{}),...headers},...(body===undefined?{}:{body})}),{params:Promise.resolve({path:path.split('/')})});
  assert.equal((await invoke('GET','admin/list-users')).status,404);
  assert.equal((await invoke('POST','update-user',{body:'{}'})).status,404);
  assert.equal((await invoke('POST','sign-in/email',{body:'{}',origin:'https://evil.example'})).status,403);
  assert.equal((await invoke('POST','sign-in/email',{body:'{}',origin:null})).status,403);
  assert.equal((await invoke('POST','sign-in/email',{body:'x'.repeat(16385)})).status,413);
  assert.equal((await invoke('POST','sign-in/email',{body:'{}'})).status,200);
  assert.equal(mock.body,'{}');
  process.env.FULLVIEW_AUTH_ENABLED='false';
  const priorCalls=mock.proxyCalls;
  assert.equal((await invoke('GET','get-session',{headers:{'oai-authenticated-user-id':'forged','oai-authenticated-user-email':'fvsignature@veridanth.com'}})).status,503);
  assert.equal(mock.proxyCalls,priorCalls);
  assert.equal(auth.authenticationConfigured(),false);
  await assert.rejects(auth.getPrincipal(),error=>error.status===503);
  console.log('PASS: managed-session boundary, no-cache validation, unverified email preserved, unavailable provider fails closed, disabled auth ignores forged identity headers, narrow proxy actions, same-origin and real body-size bounds. No live account or email tested.');
} finally {
  for(const key of keys) {if(prior[key]===undefined)delete process.env[key];else process.env[key]=prior[key];}
  delete globalThis.__fullviewAuthFixture;
}
