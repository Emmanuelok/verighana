import assert from 'node:assert/strict';
import {readFile, readdir, writeFile} from 'node:fs/promises';
import {build} from 'esbuild';

const {outputFiles}=await build({entryPoints:['lib/catalog.ts'],bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const {services}=await import('data:text/javascript;base64,'+Buffer.from(outputFiles[0].text).toString('base64'));
const files=(await readdir('design')).filter(name=>/^photo-batch-.*\.json$/.test(name)).sort();
const batches=await Promise.all(files.map(async file=>JSON.parse(await readFile('design/'+file,'utf8'))));
const assets=batches.flatMap(batch=>Array.isArray(batch)?batch:batch.assets);
const records=assets.filter(asset=>asset.id!=='gallery-hero');
assert.equal(records.length,100,'All 100 photographs must be finished before assembling the collection');
assert.equal(new Set(records.map(asset=>asset.id)).size,100,'Duplicate photograph IDs');
const byId=new Map(records.map(asset=>[asset.id,asset]));
const photographyMap={};
for(const service of services){
  const asset=byId.get(service.id);
  assert.ok(asset,'Missing photograph for '+service.id);
  assert.equal(asset.src,'/services/photography/'+service.id+'.webp');
  assert.ok(asset.visualReview && asset.sha256 && asset.prompt && asset.source);
  photographyMap[service.id]={src:asset.src,alt:asset.alt};
}
await writeFile('lib/service-photography.ts','// Generated from reviewed photo-batch manifests; each service owns one realistic photographic illustration.\nexport const servicePhotography: Record<string, {src:string; alt:string}> = '+JSON.stringify(photographyMap,null,2)+';\n');
await writeFile('design/photography-register.json',JSON.stringify({version:5,title:'Veridanth — Research in focus',generationTool:'Built-in image_gen',purpose:'100 separately generated realistic people-free service photographs, plus one dedicated gallery hero.',sourceManifests:files,assets:assets.sort((a,b)=>a.index-b.index)},null,2)+'\n');
console.log('Assembled 100 original service photographs and their generation record.');
