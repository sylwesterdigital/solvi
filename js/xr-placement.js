/** Pure WebXR placement policy (metres, reference-space coordinates).
 * Never position the lobby before a valid headset pose exists.
 */
export function chooseFloorY(eyeY,hasLocalFloor=true,estimatedSeatedEyeHeight=1.25){
 if(!Number.isFinite(eyeY))throw new RangeError('Headset eye height is not available');
 return hasLocalFloor ? 0 : eyeY-estimatedSeatedEyeHeight;
}
export function placementFromEye(eye,forward,right,{hasLocalFloor=true}={}){
 for(const v of [eye,forward,right])if(!v || ![v.x,v.y,v.z].every(Number.isFinite))throw new TypeError('A valid tracked headset pose is required');
 const floorY=chooseFloorY(eye.y,hasLocalFloor);
 const point=(distance,lateral,vertical)=>({
  x:eye.x+forward.x*distance+right.x*lateral,
  y:eye.y+vertical,
  z:eye.z+forward.z*distance+right.z*lateral
 });
 const cat=point(2.55,1.88,0);cat.y=floorY;
 const menu=point(2.65,0,.04);
 menu.y=Math.max(menu.y,floorY+1.18); // keep the entire 2.18 m board above the floor
 return {floorY,menu,cat};
}
