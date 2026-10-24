/** Pure helpers for seated WebXR teleportation and movable UI (no Three.js). */
export function referenceSpaceOffset(current, destination) {
 for(const p of [current,destination]) if(!p||![p.x,p.z].every(Number.isFinite)) throw new TypeError('Valid 2D positions required');
 // The new local reference-space origin is moved opposite the apparent viewer jump.
 return {x:current.x-destination.x,y:0,z:current.z-destination.z};
}
export function withinPlatform(point,center,radius=4.25) {
 if(!point||!center||![point.x,point.z,center.x,center.z,radius].every(Number.isFinite))return false;
 return (point.x-center.x)**2+(point.z-center.z)**2 <= radius*radius;
}
export function ballisticSamples(origin,direction,{speed=5.5,upward=1.2,gravity=9.8,step=.045,count=90}={}) {
 const v={x:direction.x*speed,y:direction.y*speed+upward,z:direction.z*speed};
 const samples=[];
 for(let i=0;i<=count;i++){
  const t=i*step;samples.push({x:origin.x+v.x*t,y:origin.y+v.y*t-gravity*t*t/2,z:origin.z+v.z*t});
 }
 return samples;
}
export function findFloorCrossing(samples,floorY) {
 for(let i=1;i<samples.length;i++){
  const a=samples[i-1],b=samples[i];
  if(a.y>=floorY&&b.y<=floorY){const den=a.y-b.y,t=den>0?(a.y-floorY)/den:0;
   return {point:{x:a.x+(b.x-a.x)*t,y:floorY,z:a.z+(b.z-a.z)*t},index:i,t};}
 }
 return null;
}
export function clampMenuCenter(point,{floorY=0,minY=1.08,maxY=2.7}={}) {
 if(!point)throw new TypeError('Missing target');
 return {x:point.x,y:Math.max(floorY+minY,Math.min(floorY+maxY,point.y)),z:point.z};
}
export function thumbstickIntent(axes,buttons) {
 // Quest Touch Plus typically exposes thumbstick in axes[2]/[3] (sometimes [0]/[1]).
 const pairs=[[2,3],[0,1]];
 let max=0;
 for(const [a,b] of pairs){const x=Number(axes?.[a]||0),y=Number(axes?.[b]||0);max=Math.max(max,Math.hypot(x,y));}
 const click=Boolean(buttons?.[3]?.pressed);
 return {pressed:click||max>.70,click,magnitude:max};
}
