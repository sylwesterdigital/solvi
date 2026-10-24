/** Optional one-time cache of public WebXR controller/hand assets for static hosting.
 * npm packages / build steps NOT required. Node 18+ fetch only.
 * If offline, deployment still works with stylised controller meshes and joint hands.
 */
import {mkdir,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';

const BASE='https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/';
const OUT='vendor/xr-profiles';
const ids=['meta-quest-touch-plus','oculus-touch-v3','oculus-touch-v2','oculus-touch','meta-quest-touch-pro','generic-trigger'];
const safePart = name=>!name.includes('..')&&!name.startsWith('/')&&!name.includes('\\');
async function get(relative){
 if(!safePart(relative))throw Error(`Unsafe asset path: ${relative}`);
 const response=await fetch(new URL(relative,BASE),{signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error(`${relative}: HTTP ${response.status}`);
 const bytes=Buffer.from(await response.arrayBuffer());
 const file=path.join(OUT,relative);
 await mkdir(path.dirname(file),{recursive:true});await writeFile(file,bytes);
 return bytes;
}
try {
 const list=JSON.parse((await get('profilesList.json')).toString('utf8'));
 const selected={};let cached=0;
 for(const id of ids){
  if(!list[id])continue;
  const rel=list[id].path;
  try{
   const profile=JSON.parse((await get(rel)).toString('utf8'));
   const directory=path.posix.dirname(rel);
   for(const config of Object.values(profile.layouts||{})){
    if(!config.assetPath)continue;
    const model=path.posix.join(directory,config.assetPath);
    const bytes=await get(model);cached++;
    if(model.endsWith('.gltf')){
     const gltf=JSON.parse(bytes.toString('utf8'));
     const resources=[...(gltf.images||[]),...(gltf.buffers||[])];
     for(const resource of resources){
      if(!resource.uri||resource.uri.startsWith('data:')||/^(https?:)?\/\//.test(resource.uri))continue;
      await get(path.posix.join(path.posix.dirname(model),resource.uri));
     }
    }
   }
   selected[id]=list[id];
   console.log(`Cached controller profile ${id}`);
  }catch(error){console.warn(`Skipping incomplete profile ${id}: ${error.message}`);}
 }
 if(!selected['generic-trigger'])throw Error('Generic controller profile unavailable. Falling back to online profile lookup.');
 await writeFile(path.join(OUT,'profilesList.json'),JSON.stringify(selected));
 // Generic skinned hand meshes are optional. Joint-sphere hands always work.
 for(const hand of ['left','right'])try{await get(`generic-hand/${hand}.glb`);}catch(e){console.warn(`No optional ${hand} hand mesh: ${e.message}`);}
 console.log(`Controller profiles cached locally: ${Object.keys(selected).length} (${cached} models)`);
}catch(error){
 console.warn(`Controller asset cache unavailable: ${error.message}`);
 console.warn('WebXR will use factory online profiles, with visible controller fallback and hand joints.');
 // Do not leave an incomplete profilesList.json: a later deploy must retry.
 await rm(path.join(OUT,'profilesList.json'),{force:true}).catch(()=>{});
 // Not fatal: no client dependency on this optional cache.
}
