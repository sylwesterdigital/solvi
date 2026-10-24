/** Pure XR UI helpers: usable without Three.js or a headset. */
export const CHALLENGE_HUD={width:1.08,height:.32,canvasWidth:1440,canvasHeight:426};
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
