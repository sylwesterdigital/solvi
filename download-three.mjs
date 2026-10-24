/** Run once with internet: node download-three.mjs. No npm install needed. */
import {writeFile,readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const base='https://cdn.jsdelivr.net/npm/three@0.169.0/';
const paths=[
 ['build/three.module.js','vendor/three.module.js'],
 ['examples/jsm/loaders/GLTFLoader.js','vendor/addons/loaders/GLTFLoader.js'],
 ['examples/jsm/loaders/DRACOLoader.js','vendor/addons/loaders/DRACOLoader.js'],
 ['examples/jsm/utils/BufferGeometryUtils.js','vendor/addons/utils/BufferGeometryUtils.js'],
 ['examples/jsm/webxr/XRControllerModelFactory.js','vendor/addons/webxr/XRControllerModelFactory.js'],
 ['examples/jsm/webxr/XRHandModelFactory.js','vendor/addons/webxr/XRHandModelFactory.js'],
 ['examples/jsm/webxr/XRHandPrimitiveModel.js','vendor/addons/webxr/XRHandPrimitiveModel.js'],
 ['examples/jsm/webxr/XRHandMeshModel.js','vendor/addons/webxr/XRHandMeshModel.js'],
 ['examples/jsm/libs/motion-controllers.module.js','vendor/addons/libs/motion-controllers.module.js'],
 ['examples/jsm/libs/draco/draco_wasm_wrapper.js','vendor/draco/draco_wasm_wrapper.js'],
 ['examples/jsm/libs/draco/draco_decoder.wasm','vendor/draco/draco_decoder.wasm'],
 ['examples/jsm/libs/draco/draco_decoder.js','vendor/draco/draco_decoder.js']
];
try{
 for(const [url,dest] of paths){
  const res=await fetch(base+url,{signal:AbortSignal.timeout(60000)});
  if(!res.ok)throw Error(`${url}: HTTP ${res.status}`);
  const content=Buffer.from(await res.arrayBuffer());
  await mkdir(path.dirname(dest),{recursive:true});await writeFile(dest,content);
  console.log(`Saved ${dest} (${content.length} bytes)`);
 }
 const html=await readFile('index.html','utf8');
 await writeFile('index.html',html
  .replace('https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js','./vendor/three.module.js')
  .replace('https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/libs/draco/','./vendor/draco/')
  .replace('https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/','./vendor/addons/'));
 console.log('Three.js + GLTFLoader + DRACO are now local. Deploy vendor/ alongside other static folders.');
}catch(e){console.error('Vendor download failed:',e);process.exitCode=1;}
