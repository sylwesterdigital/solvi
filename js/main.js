import {Staircase,scoreReach,toCSV,participantValid,clamp,nowISO} from './core.js';
import {put,getAll,bundle,clearAll,saveFile} from './storage.js';
import {FeedbackBus} from './feedback.js';

const $=(id)=>document.getElementById(id);
const settings={captions:true,audio:true,reducedMotion:window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches||false,mono:true,reach:.48,lobbyVariant:'standard'};
try{Object.assign(settings,JSON.parse(localStorage.getItem('solvi-settings')||'{}'));}catch{}
const lobbyVariants=['standard','calm','accessible'];
const state={screen:'hub',paused:false,wasSafe:false,session:null,trial:null,staircase:new Staircase({level:2}),score:0,hits:0,misses:0,practice:0,streak:0,trialIndex:0,clock:0,timeLimitMs:new URLSearchParams(location.search).has('demo')?30000:180000,pausedTotal:0,pausedAt:null,nextTrialAt:0,lastWrongAt:0,handIndex:0,calibrating:false,calibration:{left:null,right:null},lastMotionAt:0,kinematics:[],message:"Hello, I'm Solvi. How are you feeling today?",toastUntil:0,progressStats:{sessions:0,best:0,hits:0}};
let world=null;
const feedback=new FeedbackBus(settings,message=>{if(settings.captions)showCaption(message);});

function showCaption(text){$('solviMessage').textContent=text;state.message=text;world?.refreshPanel(true);}
function say(text,{spoken=false}={}){state.message=text;$('solviMessage').textContent=text;if(spoken)feedback.speak(text);else world?.refreshPanel(true);}
function toast(msg){$('toast').textContent=msg;$('toast').classList.add('visible');clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3000);}
function persistSettings(){try{localStorage.setItem('solvi-settings',JSON.stringify(settings));}catch{}}
function renderSettings(){
 const current=lobbyVariants.includes(settings.lobbyVariant)?settings.lobbyVariant:'standard';
 document.documentElement.dataset.lobby=current;
 const styleBtn=$('lobbyStyleBtn');if(styleBtn){styleBtn.querySelector('span').textContent=`Lobby: ${current==='accessible'?'High Contrast':current==='calm'?'Calm':'Standard'}`;styleBtn.setAttribute('aria-label',`Lobby style ${current}. Switch to next style`);}
 const currentLabel=$('lobbyStyleLabel');if(currentLabel)currentLabel.textContent=current==='accessible'?'High-contrast accessible concept':`${current[0].toUpperCase()+current.slice(1)} lobby`;
 const motionStatus=$('motionStatus');if(motionStatus)motionStatus.textContent=settings.reducedMotion?'Reduced Motion ON — Solvi stays in Idle':'Solvi moves, walks and reacts spontaneously';
 world?.refreshPanel(true);for(const [id,key,a,b] of [['captionsBtn','captions','Captions on','Captions off'],['audioBtn','audio','Sound on','Sound off'],['motionBtn','reducedMotion','Reduced motion','Motion allowed'],['monoBtn','mono','Mono audio','Spatial audio']]){const node=$(id);node.setAttribute('aria-pressed',String(settings[key]));node.querySelector('span').textContent=settings[key]?a:b;}}
function showModal(title,body,buttons,kicker='SOLVI XR'){$('modalTitle').textContent=title;$('modalBody').textContent=body;$('modalKicker').textContent=kicker;$('modalActions').replaceChildren();buttons.forEach(({label,action,primary})=>{const btn=document.createElement('button');btn.textContent=label;btn.className=primary?'primary':'';btn.addEventListener('click',()=>{hideModal();action&&dispatch(action);});$('modalActions').append(btn);});$('modal').classList.remove('hidden');}
function hideModal(){$('modal').classList.add('hidden');}
function formatTime(ms){const s=Math.max(0,Math.ceil(ms/1000));return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}
function activeElapsed(){if(!state.session)return 0;const end=state.paused?state.pausedAt:performance.now();return Math.max(0,end-state.clock-state.pausedTotal);}
function remaining(){return Math.max(0,state.timeLimitMs-activeElapsed());}
function setScreen(screen){state.screen=screen;$('activityHUD').classList.toggle('hidden',screen!=='reach'&&screen!=='pause');$('progressStage').classList.toggle('hidden',screen!=='progress');$('xrLaunch').classList.toggle('hidden',screen==='progress'||screen==='reach'||screen==='pause'||screen==='summary');$('sceneHeading').innerHTML=({hub:'A little progress,<br><span>every day.</span>',reach:'Reach, breathe,<br><span>and practice.</span>',pause:'Take your time.<br><span>Rest is progress.</span>',summary:'Session complete.<br><span>Well done.</span>',info:'Learn at<br><span>your pace.</span>',plan:'Your next<br><span>small step.</span>',games:'Playful practice.<br><span>Coming soon.</span>',progress:'Your journey.<br><span>Your progress.</span>',calibrate:'Find your<br><span>comfortable reach.</span>'})[screen]||'Explore your space.';
 $('sceneDescription').textContent=({hub:'Select a path or begin a gentle reach session.',reach:'Touch the floating target or use desktop test input.',pause:'The session timer and targets are paused.',summary:'Compare only with your own history.',info:'Short, plain-language explanations of cognitive tasks.',plan:'Start small: try Reach, then take a break.',games:'Attention, memory and drawing are on the roadmap.',progress:'Only your anonymous pilot data is stored locally.',calibrate:'Extend either hand comfortably, then select Record.'})[screen]||'';
 world?.refreshPanel(true);
}
function updateHUD(){if(!state.session)return;$('hits').textContent=state.hits;$('level').textContent=state.staircase.level+1;$('score').textContent=state.score;$('timeLeft').textContent=formatTime(remaining());$('activityInstruction').textContent=state.paused?'Paused. Resume when ready.':state.trial?`Touch the ${state.trial.hand==='left'?'blue square with your LEFT hand':'orange diamond with your RIGHT hand'}.`:'Get ready for the next target.';}
function participant(){const code=$('participant').value.trim().toUpperCase();if(!participantValid(code)){toast('Enter an anonymous participant code like P001.');$('participant').focus();return null;}return code;}
function startReach(){const code=participant();if(!code)return;hideModal();state.score=0;state.hits=0;state.misses=0;state.practice=0;state.streak=0;state.trialIndex=0;state.handIndex=0;state.paused=false;state.pausedTotal=0;state.nextTrialAt=0;state.clock=performance.now();state.session={sessionId:crypto.randomUUID?.()||`s-${Date.now()}`,participantCode:code,startISO:nowISO(),endISO:null,module:'reach',settingsSnapshot:{...settings},durationSec:Math.round(state.timeLimitMs/1000),status:'active',score:0,hits:0,misses:0};state.staircase=new Staircase({level:2});world&&(world.isPaused=false);world?.setGameActive(true);setScreen('reach');say('Touch the blue left or orange right target. Practice comes first.',{spoken:true});spawnTrial();updateHUD();}
const positions=[[-.14,.07],[.14,.09],[-.18,-.13],[.2,-.1],[-.05,.15],[.06,-.18],[.0,.04]];
function spawnTrial(){if(!state.session||state.paused)return;if(remaining()<=0){finishReach();return;}const level=state.staircase.level,hand=state.handIndex++%2?'right':'left';const [x,y]=positions[(state.trialIndex*5+2)%positions.length],radius=.095-level*.005;state.trialIndex++;state.trial={trialIndex:state.trialIndex,hand,radius,started:performance.now(),timeout:6200-level*260,x,y,practice:state.practice<3,level};world?.setTarget({hand,radius,x,y,distance:settings.reach+.035});updateHUD();}
function targetTouched({hand='desktop',source=null,endpointErrorMm=14,via='desktop'}={}){if(!state.session||!state.trial||state.paused)return;const trial=state.trial;if(hand!=='desktop'&&hand!=='unknown'&&hand!==trial.hand){if(performance.now()-state.lastWrongAt>800){state.lastWrongAt=performance.now();feedback.emit('wrongHand',{handSource:source,message:'Try the indicated hand.'});recordTrial('wrongHand',hand,0,endpointErrorMm,via,false);}return;}
 const rt=performance.now()-trial.started,points=trial.practice?0:scoreReach({hit:true,endpointErrorMm,radiusMm:trial.radius*1000});if(!trial.practice){state.score+=points;state.hits++;state.streak++;state.staircase.update(true);}else state.practice++;
 recordTrial('hit',hand,points,endpointErrorMm,via,true,rt);feedback.emit('success',{handSource:source,message:trial.practice?`Nice work. ${state.practice} of 3 practice targets done.`:'Great reach. Keep going.'});state.trial=null;world?.setTarget(null);state.nextTrialAt=performance.now()+470;if(state.hits>0&&state.hits%5===0)world?.celebrateGameMoment();updateHUD();}
function recordTrial(response,usedHand,points,endpointErrorMm,via,success,rt){const t=state.trial;if(!t||!state.session)return;const row={sessionId:state.session.sessionId,participantCode:state.session.participantCode,module:'reach',trialIndex:t.trialIndex,timestampISO:nowISO(),cuedHand:t.hand,usedHand,level:t.level+1,practice:t.practice,stimulus:{x:t.x,y:t.y,radius:t.radius},response,reactionTimeMs:rt??null,endpointErrorMm:Math.round(endpointErrorMm||0),points,streak:state.streak,via,feedbackConfig:{audio:settings.audio,captions:settings.captions}};put('trials',row).catch(storageError);}
function expireTrial(){if(!state.trial)return;const t=state.trial;if(t.practice){state.practice++;}else{state.misses++;state.streak=0;state.staircase.update(false);}recordTrial('timeout','none',0,null,'timer',false,performance.now()-t.started);feedback.emit('timeout',{message:'No problem. Try the next target.'});state.trial=null;world?.setTarget(null);state.nextTrialAt=performance.now()+520;updateHUD();}
async function finishReach(){if(!state.session)return;const result=state.session;state.session=null;world?.setTarget(null);state.trial=null;state.paused=false;world&&(world.isPaused=false);world?.setGameActive(false);result.endISO=nowISO();result.status='completed';result.score=state.score;result.hits=state.hits;result.misses=state.misses;await put('sessions',result).catch(storageError);setScreen('summary');feedback.emit('blockComplete',{message:'Session complete. Your progress belongs to you.'});showModal('Reach session complete',`You hit ${state.hits} targets and earned ${state.score} points.\n\nHow comfortable did you feel?`,[{label:'Comfortable (8/10)',action:'comfort-good',primary:true},{label:'Dizzy / uncomfortable',action:'comfort-bad'},{label:'Back to lobby',action:'hub'}],'YOUR SESSION');}
function pause(){if(!state.session){showModal('Safe place','You can pause any exercise at any time. Take a break whenever you need.',[{label:'Close',action:'hub',primary:true}]);return;}if(state.paused){hideModal();state.paused=false;state.pausedTotal+=performance.now()-state.pausedAt;state.pausedAt=null;world&&(world.isPaused=false);world?.setGameActive(true);setScreen('reach');say('Welcome back. Continue when ready.');}else{state.paused=true;state.pausedAt=performance.now();world&&(world.isPaused=true);setScreen('pause');say('Everything is paused. You are in control.');showModal('Paused / safe place','The task is frozen. You may resume, recenter, or end the session.',[{label:'Resume',action:'pause',primary:true},{label:'Recenter',action:'recenter'},{label:'End session',action:'end'}],'COMFORT FIRST');}}
async function comfort(good){const sessions=await getAll('sessions');const last=sessions.filter(s=>s.participantCode===participant()).at(-1);if(last){await put('comfort',{sessionId:last.sessionId,participantCode:last.participantCode,timestampISO:nowISO(),comfort0to10:good?8:3,dizzyOrNauseous:!good});}toast('Comfort response saved locally.');setScreen('hub');}
async function progress(){
 const code=participant();if(!code)return;
 const all=(await getAll('sessions')).filter(s=>s.participantCode===code&&s.status==='completed');
 const best=Math.max(0,...all.map(s=>s.score||0));
 const hits=all.reduce((sum,item)=>sum+(item.hits||0),0);
 state.progressStats={sessions:all.length,best,hits};
 $('progressSessions').textContent=String(all.length);
 $('progressBest').textContent=String(best);
 $('progressHits').textContent=String(hits);
 setScreen('progress');
 say(all.length?'Your own milestones, one step at a time.':'No recorded sessions yet. Start a gentle Reach activity.');
}
function viewForXR(){const screen=state.screen,stat=state.session?`Hits ${state.hits} | Points ${state.score} | Time ${formatTime(remaining())}`:'Choose one gentle next step.';
 if(screen==='reach')return{mode:'challenge',title:'Reach activity',time:formatTime(remaining()),
  hits:state.hits,score:state.score,instruction:state.trial?
  (state.trial.hand==='left'?'BLUE SQUARE  ·  LEFT HAND':'ORANGE DIAMOND  ·  RIGHT HAND'):
  'GET READY FOR NEXT TARGET',buttons:[{label:'Pause',action:'pause',primary:true},{label:'Safe place',action:'safe'},{label:'End session',action:'end'}]};
 if(screen==='pause')return{title:'Safe place',message:'Nothing moves until you resume.',buttons:[{label:'Resume',action:'pause',primary:true},{label:'Recenter',action:'recenter'},{label:'End session',action:'end'}]};
 if(screen==='summary')return{title:'Well done',message:'Your session is complete. Take a moment to rest.',statTiles:[['HITS',state.hits],['POINTS',state.score],['MISSES',state.misses]],buttons:[{label:'Comfortable',action:'comfort-good',primary:true},{label:'Felt dizzy',action:'comfort-bad'},{label:'Return to lobby',action:'hub'}]};
 if(screen==='progress')return{title:'Your progress',message:'Only your own results. Every step counts.',stats:state.progressStats,buttons:[{label:'Back to lobby',action:'hub',primary:true},{label:'Start Reach',action:'reach'}]};
 return{title:'Solvi XR lobby',message:state.message,buttons:[{label:'Start Reach',action:'reach',primary:true},{label:'Information',action:'info'},{label:'Progress',action:'progress'},{label:'Set my reach',action:'calibrate'},{label:'Safe place',action:'safe'},{label:'Recenter',action:'recenter'},{label:'Lobby style',action:'lobby-style'},{label:'Solvi strolls',action:'solvi-walk'}]};}
function storageError(err){console.warn('Local storage failed:',err);toast('Local storage could not save data; check browser settings.');}
async function exportData(kind){try{const code=participant();if(!code)return;const data=await bundle(),filtered=Object.fromEntries(Object.entries(data).map(([key,rows])=>[key,rows.filter(item=>item.participantCode===code)]));const date=new Date().toISOString().slice(0,10);if(kind==='json')saveFile(`${code}_${date}_solvi.json`,JSON.stringify({appVersion:'0.1.0',...filtered},null,2),'application/json');if(kind==='csv')saveFile(`${code}_${date}_trials.csv`,toCSV(filtered.trials),'text/csv;charset=utf-8');if(kind==='motion')saveFile(`${code}_${date}_motion.csv`,toCSV(filtered.kinematics),'text/csv;charset=utf-8');toast('Export prepared.');}catch(err){console.error(err);toast(`Export failed: ${err.message}`);}}
function dispatch(action,controller=null,source=null){feedback.unlockAudio();feedback.emit('selection',{handSource:source});if(world?.xr)world.showPress(action);switch(action){
 case 'reach':startReach();break;
 case 'lobby-style':settings.lobbyVariant=lobbyVariants[(lobbyVariants.indexOf(settings.lobbyVariant)+1)%lobbyVariants.length];persistSettings();renderSettings();toast(`Lobby: ${settings.lobbyVariant}`);break;
 case 'solvi-walk':if(!world?.beginWalk(performance.now(),true))toast('Movement unavailable; check Solvi model or reduced motion settings.');break;
 case 'solvi-wave':if(!world?.playSolvi('waving'))toast('Waving unavailable; disable reduced motion if needed.');break;
 case 'solvi-dance':if(!world?.playSolvi('belly dance'))toast('Dance unavailable; disable reduced motion if needed.');break;
 case 'solvi-happy':if(!world?.playSolvi('happy'))toast('Happy action unavailable; disable reduced motion if needed.');break;
 case 'solvi-kick':if(!world?.playSolvi('mma kick'))toast('Kick unavailable; disable reduced motion if needed.');break;
 case 'hub':if(state.session){pause();break;}hideModal();setScreen('hub');say("Hello, I'm Solvi. How are you feeling today?");break;
 case 'pause':hideModal();pause();break;case 'safe':if(state.session&&!state.paused)pause();else showModal('Your safe place','Take a break, recenter, or explore at your own pace.',[{label:'Recenter',action:'recenter'},{label:'Close',action:'hub',primary:true}]);break;
 case 'end':hideModal();finishReach();break;case 'recenter':world?.bringMenuInFront();toast('Menu placed directly in front of you.');break;
 case 'reset-menu':world?.bringMenuInFront({clearSaved:true});toast('Saved panel layout reset.');break;
 case 'simulate':targetTouched({hand:'desktop',endpointErrorMm:12});break;
 case 'feel-good':say('That is good to hear. Would you like to try a short Reach activity?',{spoken:true});break;
 case 'feel-overwhelmed':say('We can slow down. Use Safe Place or stop whenever you wish.',{spoken:true});break;
 case 'repeat':feedback.speak(state.message);break;
 case 'talk':say('This is a scripted demonstration. No remote AI is connected.',{spoken:true});break;
 case 'info':setScreen('info');showModal('Cognitive & movement practice','Reaching combines spatial attention with upper-limb movement. This pilot focuses on usability and comfort, not treatment or diagnosis.',[{label:'Try Reach',action:'reach',primary:true},{label:'Back',action:'hub'}]);break;
 case 'plan':setScreen('plan');showModal('Your simple activation plan','1. Sit comfortably and set a stationary boundary.\n2. Choose a short Reach session.\n3. Pause whenever you need.\n4. End with a comfort check.',[{label:'Begin Reach',action:'reach',primary:true},{label:'Back',action:'hub'}]);break;
 case 'games':setScreen('games');showModal('Games roadmap','Attention, memory, drawing and calculation are planned, but they are not implemented in this starter build.',[{label:'Try Reach instead',action:'reach',primary:true},{label:'Back',action:'hub'}]);break;
 case 'progress':progress().catch(storageError);break;
 case 'captions':settings.captions=!settings.captions;persistSettings();renderSettings();toast(`Captions ${settings.captions?'on':'off'}`);break;
 case 'audio':settings.audio=!settings.audio;persistSettings();renderSettings();break;
 case 'motion':settings.reducedMotion=!settings.reducedMotion;persistSettings();renderSettings();break;
 case 'mono':settings.mono=!settings.mono;persistSettings();renderSettings();break;
 case 'comfort-good':comfort(true).catch(storageError);break;case 'comfort-bad':comfort(false).catch(storageError);break;
 case 'calibrate':if(controller&&world){const pos=controller.getWorldPosition(new world.threeVector());const head=world.getHeadPose().position;settings.reach=clamp(pos.distanceTo(head),.28,.68);persistSettings();toast(`Comfort reach set to ${Math.round(settings.reach*100)} cm.`);say('Comfortable reach stored. You can change it any time.');}else showModal('Comfortable reach','Choose a conservative distance. During VR, extend a hand comfortably and select “Set my reach” to measure it.',[{label:'Short · 35 cm',action:'reach-short'},{label:'Standard · 48 cm',action:'reach-normal',primary:true},{label:'Close',action:'hub'}]);break;
 case 'reach-short':settings.reach=.35;persistSettings();toast('Reach set to 35 cm.');setScreen('hub');break;
 case 'reach-normal':settings.reach=.48;persistSettings();toast('Reach set to 48 cm.');setScreen('hub');break;
 case 'xr':world?.enterVR().catch(err=>showModal('Cannot enter XR',`${err.message}\nQuest Browser needs a secure HTTPS origin (or localhost via a supported tunnel).`,[{label:'Back',action:'hub',primary:true}]));break;
 case 'export-json':exportData('json');break;case 'export-csv':exportData('csv');break;case 'export-motion':exportData('motion');break;
 case 'delete':showModal('Delete local pilot data?','This permanently clears all session and motion records saved by this prototype in this browser.',[{label:'Delete everything',action:'confirm-delete'},{label:'Cancel',action:'hub',primary:true}]);break;
 case 'confirm-delete':clearAll().then(()=>{toast('All local records deleted.');setScreen('hub');}).catch(storageError);break;
 default:console.warn('Unrecognized action',action);
 }}
// Native pointer / mouse / keyboard work without WebXR.
document.addEventListener('click',e=>{
 const node=e.target.closest('[data-action]');if(!node||node.disabled)return;
 node.classList.add('clicked');setTimeout(()=>node.classList.remove('clicked'),240);
 dispatch(node.dataset.action);
});
let lastDesktopHover=0,lastDesktopTarget=null;
document.addEventListener('pointerover',e=>{
 const node=e.target.closest('[data-action]');
 if(!node||node.disabled||node===lastDesktopTarget)return;
 lastDesktopTarget=node;
 const now=performance.now();
 if(now-lastDesktopHover>95){feedback.emit('hover');lastDesktopHover=now;}
});
document.addEventListener('pointerout',e=>{
 if(lastDesktopTarget===e.target.closest('[data-action]'))lastDesktopTarget=null;
});
document.addEventListener('keydown',e=>{if(e.target instanceof HTMLInputElement)return;if(e.key==='p'||e.key==='P')dispatch('pause');if(e.key==='r'||e.key==='R')dispatch('recenter');if(e.key===' '&&state.screen==='reach'){e.preventDefault();dispatch('simulate');}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.session&&!state.paused&&!world?.xr)pause();});
$('participant').addEventListener('blur',()=>{$('participant').value=$('participant').value.toUpperCase();});
renderSettings();
// THREE is loaded dynamically so the native DOM prototype still works if CDN is unreachable.
try{const {XRWorld}=await import('./scene.js?v=0100');world=new XRWorld($('three-root'),{onAction:dispatch,onTarget:targetTouched,makeView:viewForXR,onDevice:toast,onHover:({source})=>feedback.emit('hover',{handSource:source}),getSettings:()=>settings});world.threeVector=world.camera.position.constructor;world.supported().then(ok=>{const button=$('enterXR');button.disabled=!ok;button.textContent=ok?'Enter immersive VR':'WebXR unavailable here';$('xrHint').textContent=ok?'In VR: use thumbstick for curved teleport, hold GRIP on MOVE PANEL to drag, A/X to summon the menu.':'Use Desktop Preview now. For Quest, serve from HTTPS or device localhost.';}).catch(()=>{});}catch(error){console.warn('The Three.js scene could not load:',error);$('fallback').classList.remove('hidden');$('enterXR').textContent='3D unavailable';$('xrHint').textContent='Check the Three.js import map, GLB and Draco URLs, then reload.';}
let motionFlush=[];
async function sampleMotion(){if(!world?.xr||!state.session||state.paused)return;const elapsed=activeElapsed(),id=state.session.sessionId,code=state.session.participantCode;const nodes=[['head',world.renderer.xr.getCamera(world.camera)],...world.pointerRecords.filter(r=>r.source).map(r=>[`${r.source.handedness||'unknown'}-${r.source.hand?'hand':'controller'}`,r.source.hand?(r.hand.joints?.['index-finger-tip']||r.hand):r.controller])];for(const [hand,obj] of nodes){const pos=obj.getWorldPosition(new world.threeVector()),q=obj.getWorldQuaternion(new (world.camera.quaternion.constructor)());motionFlush.push({sessionId:id,participantCode:code,timestampMs:Math.round(elapsed),hand,px:+pos.x.toFixed(4),py:+pos.y.toFixed(4),pz:+pos.z.toFixed(4),qx:+q.x.toFixed(5),qy:+q.y.toFixed(5),qz:+q.z.toFixed(5),qw:+q.w.toFixed(5)});}if(motionFlush.length>=24){const batch=motionFlush.splice(0);await Promise.all(batch.map(r=>put('kinematics',r).catch(storageError)));}}
setInterval(()=>{if(!state.session||state.paused)return;const now=performance.now();if(remaining()<=0){finishReach().catch(storageError);return;}if(state.trial&&now-state.trial.started>state.trial.timeout)expireTrial();if(!state.trial&&state.nextTrialAt&&now>=state.nextTrialAt){state.nextTrialAt=0;spawnTrial();}updateHUD();world?.refreshPanel();},120);
setInterval(()=>{sampleMotion().catch(storageError);},100);
