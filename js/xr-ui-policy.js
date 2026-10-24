/** Pure XR UI helpers: usable without Three.js or a headset. */
export const CHALLENGE_HUD={width:1.48,height:.59,canvasWidth:1440,canvasHeight:576};
export const LOBBY_PANEL={width:2.38,height:2.18,canvasWidth:1440,canvasHeight:1320};

export function isChallengeView(view){return view?.mode==='challenge';}
export function layoutForView(view){return isChallengeView(view)?CHALLENGE_HUD:LOBBY_PANEL;}

/** First visible, actionable object on a ray wins. A non-button panel hit must
 * never steal a target click; moving a menu behind a target must not either. */
export function nearestActionHit(panelHit,targetHit){
 const menu=panelHit?.region?panelHit:null;
 if(targetHit&&(!menu||targetHit.distance<menu.distance))return 'target';
 return menu?'menu':targetHit?'target':null;
}

/** Each mode owns exactly ONE independent panel; never draw a lobby over a task. */
export function visiblePanelsForView(view){
 return isChallengeView(view)?{lobby:false,hud:true}:{lobby:true,hud:false};
}

/** During Reach, ray beams indicate actionable spatial UI, NOT exercise targets.
 * Source type does not matter (tracked hands and controllers have parity). */
export function shouldShowMenuPointer({panelVisible=false,panelHit=null,targetHit=null,teleporting=false}={}){
 return Boolean(panelVisible && panelHit && !teleporting && (!targetHit || panelHit.distance<=targetHit.distance));
}

/** A challenge panel must stay outside the central reaching corridor.
 * Work in headset-local horizontal coordinates, with arbitrary forward/right axes. */
export function safeChallengePanelCenter(center,eye,forward,right,minSide=1.42){
 const dx=center.x-eye.x,dz=center.z-eye.z;
 const lateral=dx*right.x+dz*right.z;
 if(Math.abs(lateral)>=minSide)return {...center};
 const shift=(lateral<0?-minSide:minSide)-lateral;
 return {x:center.x+right.x*shift,y:center.y,z:center.z+right.z*shift};
}
