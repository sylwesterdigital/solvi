/** All game logic sends semantic events here; modules never activate devices directly. */
export class FeedbackBus {
 constructor(settings,caption){this.settings=settings;this.caption=caption;this.audioCtx=null;this.lastInstruction='';this.lastSpoken='';this.warned=new Set();this.lastHover=0;}
 async unlockAudio(){if(this.audioCtx)try{await this.audioCtx.resume();}catch{}else{const C=window.AudioContext||window.webkitAudioContext;if(C)try{this.audioCtx=new C();}catch{}}}
 tone(freq=500,duration=.12,volume=.07){if(!this.settings.audio)return;this.unlockAudio();const ctx=this.audioCtx;if(!ctx)return;const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sine';osc.frequency.setValueAtTime(freq,ctx.currentTime);gain.gain.setValueAtTime(volume,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+duration);osc.connect(gain).connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+duration+.01);}
 async haptic(source,intensity=.5,ms=75){if(!source)return;const g=source.gamepad;if(!g)return;try{if(g.hapticActuators?.[0]?.pulse){await g.hapticActuators[0].pulse(intensity,ms);return;}if(g.vibrationActuator?.playEffect){await g.vibrationActuator.playEffect('dual-rumble',{duration:ms,strongMagnitude:intensity,weakMagnitude:intensity});}}catch{if(!this.warned.has('haptic')){console.warn('Haptics unavailable for this controller');this.warned.add('haptic');}}}
 speak(message){this.caption(message);if(!this.settings.audio)return;if(!('speechSynthesis' in window))return;try{speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(message);utterance.rate=.95;utterance.volume=.7;speechSynthesis.speak(utterance);}catch{}}
 emit(event,{handSource=null,message=null}={}){
  if(message)this.caption(message);
  if(event==='hover'){
   const now=performance.now();if(now-this.lastHover<110)return;
   this.lastHover=now;this.tone(680,.042,.023);return;
  }
  switch(event){
   case 'success':this.tone(660,.16,.065);this.haptic(handSource,.55,85);break;
   case 'timeout':this.tone(315,.16,.035);break;
   case 'wrongHand':this.tone(270,.10,.03);this.haptic(handSource,.13,40);break;
   case 'blockComplete':this.tone(740,.22,.06);break;
   case 'selection':this.tone(570,.09,.048);this.haptic(handSource,.22,40);break;
  }
 }
}
