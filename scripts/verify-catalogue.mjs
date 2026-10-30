import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {existsSync,statSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {z} from 'zod';
const {outputFiles}=await build({entryPoints:['lib/catalog.ts'],bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const catalog=await import('data:text/javascript;base64,'+Buffer.from(outputFiles[0].text).toString('base64'));
const {services,categories,audiences,audienceIds,clientGroups,rate,estimateTotal,serviceImage}=catalog;
assert.equal(services.length,100,'Catalogue must contain the agreed 100 services');
assert.equal(new Set(services.map(s=>s.id)).size,services.length,'Service identifiers must be unique');
assert.equal(new Set(services.map(s=>serviceImage(s).src)).size,services.length,'Every service must have its own photograph: no shared image paths');
assert.ok(services.every(s=>serviceImage(s).src===`/services/photography/${s.id}.webp`),'Photograph paths must belong to the exact service, without thematic fallbacks');
if(!process.argv.includes('--skip-images')){
 const hashes=services.map(s=>createHash('sha256').update(readFileSync('public'+serviceImage(s).src)).digest('hex'));
 assert.equal(new Set(hashes).size,services.length,'Every photograph must contain distinct image bytes');
}
assert.equal(clientGroups.length,9,'All nine client pathways must be present');
const supported=new Set(audienceIds);const categoryIds=new Set(categories.map(c=>c.id));
for(const s of services){assert.ok(s.title.length>6,s.id+' title');assert.ok(categoryIds.has(s.category),s.id+' category');assert.ok(s.price>0&&Number.isInteger(s.price),s.id+' price');assert.ok(s.deliverables.length>=3,s.id+' deliverables');assert.ok(s.audiences.length>0,s.id+' audiences');assert.ok(s.audiences.every(a=>supported.has(a)),s.id+' invalid audience');const image=serviceImage(s);assert.ok(image.src.startsWith('/services/'),s.id+' photo');assert.ok(image.alt.length>20,s.id+' alt');if(!process.argv.includes('--skip-images')){assert.ok(existsSync('public'+image.src),'Missing image: '+image.src);assert.ok(statSync('public'+image.src).size>10000,'Image unexpectedly small: '+image.src)}}
for(const group of clientGroups){assert.ok(services.some(s=>s.audiences.includes(group.defaultAudience)),group.id+' has no services')}
for(const a of audiences){assert.ok(z.enum(audienceIds).safeParse(a.id).success);assert.ok(services.some(s=>s.audiences.includes(a.id)),a.id+' is empty')}
assert.ok(!z.enum(audienceIds).safeParse('administrator').success,'Unsupported client type must be rejected');
const gov=services.find(s=>s.id==='government-procurement');assert.ok(gov.audiences.includes('government'));assert.ok(!gov.audiences.includes('undergraduate'));assert.ok(!gov.audiences.includes('public'),'Government-specific procurement must remain distinct from public institution services');assert.equal(rate(gov,'government'),16000);assert.equal(estimateTotal([{id:gov.id,quantity:2}],'government'),32000);
const academic=services.find(s=>s.id==='quantitative');assert.equal(estimateTotal([{id:academic.id,quantity:2}],'phd'),5040,'Existing academic pricing must remain unchanged');
const school=services.find(s=>s.id==='school-curriculum');assert.ok(school.audiences.includes('schools'));assert.ok(!school.audiences.includes('government'),'School-specific scope must stay distinct');
const publicService=services.find(s=>s.id==='public-service-quality');assert.ok(publicService.audiences.includes('public'));assert.ok(!publicService.audiences.includes('government'));
const route=readFileSync('sites-runtime/app/api/briefs/route.ts','utf8');assert.ok(route.includes('z.enum(audienceIds)'),'Server must share the client audience IDs');assert.ok(route.includes('s.audiences.includes(data.audience)'),'Server must validate service eligibility');
console.log(JSON.stringify({result:'PASS',services:services.length,expertiseAreas:categories.length,researchPathways:audiences.length,clientGroups:clientGroups.map(g=>({name:g.label,services:services.filter(s=>s.audiences.includes(g.defaultAudience)).length})),uniquePhotos:new Set(services.map(s=>serviceImage(s).src)).size,imageFilesChecked:!process.argv.includes('--skip-images')},null,2));
