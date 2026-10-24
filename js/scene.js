import * as THREE from 'three';
import {layoutForView,isChallengeView,nearestActionHit,visiblePanelsForView,shouldShowMenuPointer,safeChallengePanelCenter} from './xr-ui-policy.js?v=0100';
import {XRControllerModelFactory} from 'three/addons/webxr/XRControllerModelFactory.js';
import {XRHandModelFactory} from 'three/addons/webxr/XRHandModelFactory.js';
import {placementFromEye} from './xr-placement.js';
import {referenceSpaceOffset,withinPlatform,ballisticSamples,findFloorCrossing,clampMenuCenter,thumbstickIntent} from './xr-navigation.js';

const PINK=0xff62c4, CYAN=0x73dcff, NAVY=0x0a132c;
const BACKGROUND_LOBBY=new THREE.Color(0x0a132e);
const BACKGROUND_CHALLENGE=new THREE.Color(0x060a15);
const CAT_YAW_RADIANS=0; // Change to Math.PI only if this specific GLB faces away.
const MODEL_URL=new URL('../assets/anthropomorphiccat3dmodel.glb', import.meta.url).href;
const vec=new THREE.Vector3(),quat=new THREE.Quaternion(),forward=new THREE.Vector3(),right=new THREE.Vector3();
function material(color,roughness=.72){return new THREE.MeshStandardMaterial({color,roughness,metalness:.14});}
function addMesh(parent,geometry,mat,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);parent.add(m);return m;}
function roundedText(text,{fg='#ffffff',bg='rgba(12,18,39,.9)',width=512,height=110}={}){
 const cvs=document.createElement('canvas');cvs.width=width;cvs.height=height;const ctx=cvs.getContext('2d');ctx.fillStyle=bg;ctx.beginPath();ctx.roundRect(0,0,width,height,18);ctx.fill();ctx.font='bold 43px Arial, sans-serif';ctx.fillStyle=fg;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,width/2,height/2,width-25);const texture=new THREE.CanvasTexture(cvs);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
function makeWorld(scene){
 const lobbyRoot=new THREE.Group();lobbyRoot.name="Classic Solvi lobby — original scene";scene.add(lobbyRoot);
 const decor=new THREE.Group();decor.name="Classic floating islands and skyline";lobbyRoot.add(decor);
 scene.background=new THREE.Color(0x0a132e);scene.fog=new THREE.FogExp2(0x13203c,.033);
 const ambient=new THREE.HemisphereLight(0xa2d5ff,0x17203a,2.2);scene.add(ambient);const p=new THREE.DirectionalLight(0xffb8e4,2.4);p.position.set(-3,8,2);scene.add(p);const b=new THREE.PointLight(CYAN,35,12);b.position.set(2,2,-2);scene.add(b);
 const floor=addMesh(lobbyRoot,new THREE.CircleGeometry(5,64),new THREE.MeshStandardMaterial({color:0x172743,metalness:.46,roughness:.36}),0,-.075,-1.5);floor.rotation.x=-Math.PI/2;
 const inner=addMesh(decor,new THREE.TorusGeometry(1.7,.016,5,74),new THREE.MeshBasicMaterial({color:PINK}),0,-.065,-1.45);inner.rotation.x=Math.PI/2;
 const outer=addMesh(decor,new THREE.TorusGeometry(2.18,.009,5,80),new THREE.MeshBasicMaterial({color:CYAN,transparent:true,opacity:.7}),0,-.062,-1.45);outer.rotation.x=Math.PI/2;
 addMesh(decor,new THREE.CylinderGeometry(.45,.58,.12,32),material(0x26365d),0,-.025,-2.1);
 const platformGlow=addMesh(decor,new THREE.CylinderGeometry(.48,.48,.02,32),new THREE.MeshBasicMaterial({color:0x55b1e0}),0,.04,-2.1);
 for(let i=0;i<8;i++){const a=i/8*Math.PI*2,dist=4.8+i%3*.55;const g=new THREE.Group();g.position.set(Math.cos(a)*dist,2.0+(i%4)*.5,-4+Math.sin(a)*1.1);const rock=addMesh(g,new THREE.ConeGeometry(.4+(i%3)*.12,.9,7),material(0x364869));rock.rotation.z=Math.PI;addMesh(g,new THREE.CylinderGeometry(.43,.36,.14,7),material(0x406c6e),0,.48,0);const tower=addMesh(g,new THREE.CylinderGeometry(.10,.18,.5,6),material(0x84b1c6),0,.79,0);decor.add(g);}
 // The far sky arch and vertical columns establish an orientation landmark without locomotion.
 const arch=addMesh(decor,new THREE.TorusGeometry(3.2,.038,8,80,Math.PI),new THREE.MeshBasicMaterial({color:0x8959aa,transparent:true,opacity:.58}),0,2.1,-8);arch.rotation.z=Math.PI;
 for(let i=0;i<8;i++){const x=-6+i*1.8,h=1.8+(i*7%5)*.55;addMesh(decor,new THREE.CylinderGeometry(.11,.17,h,6),material(0x34446c),x,h/2,-9-((i*13)%3));}
 return {floor,platformGlow,decor,lobbyRoot,ambient,keyLight:p,accentLight:b};
}

// Model and input code is purposely framework-free. XR index is only an implementation
// slot; never infer left/right or controller/hand from its numeric value.
export class XRWorld {
 constructor(el,{onAction,onTarget,makeView,onDevice,onHover,getSettings}={}) {
  this.el=el;this.onAction=onAction;this.onTarget=onTarget;
  this.makeView=makeView;this.onDevice=onDevice;this.onHover=onHover;this.getSettings=getSettings||(()=>({}));
  this.scene=new THREE.Scene();this.worldProps=makeWorld(this.scene);
  this.camera=new THREE.PerspectiveCamera(64,1,.05,60);
  this.camera.position.set(0,1.47,2.65);this.camera.lookAt(.15,1.35,-1.8);
  this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  this.renderer.outputColorSpace=THREE.SRGBColorSpace;
  this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
  this.renderer.toneMappingExposure=1.25;
  this.renderer.xr.enabled=true;this.renderer.xr.setReferenceSpaceType('local-floor');
  this.el.append(this.renderer.domElement);
  this.xr=false;this.isPaused=false;this.task=null;this.trackedPose=null;this.hasFloorReference=true;
  this.raycaster=new THREE.Raycaster();this.mouse=new THREE.Vector2();this.lastHead=null;
  this.cat=new THREE.Group();this.cat.position.set(1.12,0,-1.5);this.scene.add(this.cat);
  this.catHome=this.cat.position.clone();this.catFrontYaw=0;
  this.walk=null;this.nextCatBeat=performance.now()+4200;
  this.lastCatGestureAt=0;this.walkCycle=0;this.gameActive=false;
  this.catTravelRight=new THREE.Vector3(1,0,0);
  this.mixer=null;this.clips=new Map();this.activeAction=null;
  this.temporaryAnimationEnd=0;this.catLoaded=false;
  this.loadCat();
  this.panelCanvas=document.createElement('canvas');
  this.panelCanvas.width=1440;this.panelCanvas.height=1320;
  this.panelCtx=this.panelCanvas.getContext('2d');
  this.panelTexture=new THREE.CanvasTexture(this.panelCanvas);
  this.panelTexture.colorSpace=THREE.SRGBColorSpace;
  // Two separate GPU textures / planes. Never resize a live lobby canvas to
  // transform it into a challenge HUD; Quest's render pipeline can show both
  // old and new contents briefly when the underlying texture storage changes.
  this.panelWidth=2.38;this.panelHeight=2.18;this.panelMode='lobby';
  this.lobbyPanel=new THREE.Mesh(new THREE.PlaneGeometry(this.panelWidth,this.panelHeight),
   new THREE.MeshBasicMaterial({map:this.panelTexture,side:THREE.DoubleSide,depthTest:true,depthWrite:false,toneMapped:false}));
  this.lobbyPanel.name='Solvi Lobby — not displayed during challenge';
  this.lobbyPanel.renderOrder=12;this.lobbyPanel.visible=false;
  this.hudCanvas=document.createElement('canvas');
  this.hudCanvas.width=1440;this.hudCanvas.height=576;
  this.hudCtx=this.hudCanvas.getContext('2d');
  this.hudTexture=new THREE.CanvasTexture(this.hudCanvas);this.hudTexture.colorSpace=THREE.SRGBColorSpace;
  this.hudPanel=new THREE.Mesh(new THREE.PlaneGeometry(1.48,.59),
   new THREE.MeshBasicMaterial({map:this.hudTexture,side:THREE.DoubleSide,transparent:true,opacity:.58,
    depthTest:true,depthWrite:false,toneMapped:false}));
  this.hudPanel.name='Solvi Challenge HUD — separate from lobby';
  this.hudPanel.renderOrder=12;this.hudPanel.visible=false;
  this.scene.add(this.lobbyPanel,this.hudPanel);
  // Wall-mounted spatial menu. Both backing and draggable surface move as a unit.
  this.lobbyWall=new THREE.Mesh(new THREE.BoxGeometry(2.51,2.32,.055),
   new THREE.MeshBasicMaterial({color:0x203458,depthTest:true}));
  this.lobbyWall.name='Movable lobby wall panel';this.lobbyWall.visible=false;
  this.scene.add(this.lobbyWall);
  this.teleportState=null;this.menuDrag=null;this.teleportInput=null;
  this.teleportArcGeometry=new THREE.BufferGeometry();
  this.teleportArcPositions=new Float32Array(91*3);
  this.teleportArcGeometry.setAttribute('position',new THREE.BufferAttribute(this.teleportArcPositions,3).setUsage(THREE.DynamicDrawUsage));
  this.teleportArcGeometry.setDrawRange(0,0);
  this.teleportArc=new THREE.Line(this.teleportArcGeometry,new THREE.LineBasicMaterial({color:CYAN,depthTest:false,depthWrite:false}));
  this.teleportArc.renderOrder=1150;this.teleportArc.visible=false;this.teleportArc.frustumCulled=false;this.scene.add(this.teleportArc);
  this.teleportDisc=new THREE.Mesh(new THREE.RingGeometry(.14,.225,48),
   new THREE.MeshBasicMaterial({color:0x80ffd3,side:THREE.DoubleSide,depthTest:false,depthWrite:false,toneMapped:false}));
  this.teleportDisc.rotation.x=-Math.PI/2;this.teleportDisc.renderOrder=1151;
  this.teleportDisc.visible=false;this.scene.add(this.teleportDisc);
  this.teleportCore=new THREE.Mesh(new THREE.CircleGeometry(.065,32),
   new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide,depthTest:false,depthWrite:false}));
  this.teleportCore.rotation.x=-Math.PI/2;this.teleportCore.renderOrder=1152;
  this.teleportCore.visible=false;this.scene.add(this.teleportCore);

  // Drawing and hit tests use the active panel only, never the inactive plane.
  this.panel=this.lobbyPanel;this.panelRegions=[];this.lastPanelKey='';
  this.hoverAction=null;this.pressedAction=null;this.pressedUntil=0;
  this.targetGroup=new THREE.Group();this.scene.add(this.targetGroup);this.targetMesh=null;
  this.controllerObjs=[];this.handObjs=[];this.pointerRecords=[];
  this.tempPosition=new THREE.Vector3();this.tempQuat=new THREE.Quaternion();
  this.tempPosition2=new THREE.Vector3();this.tempDir=new THREE.Vector3();
  this.lastSelection=new WeakMap();
  this.menuPositionKey="solvi-v08-menu-pose";
  this.challengeMenuPositionKey="solvi-v010-challenge-menu-pose";
  this.cursor=new THREE.Mesh(new THREE.SphereGeometry(.014,10,8),
   new THREE.MeshBasicMaterial({color:0xffdc48,depthTest:false,depthWrite:false}));
  this.cursor.visible=false;this.cursor.renderOrder=1200;this.scene.add(this.cursor);
  for(let i=0;i<2;i++) this.addInputSlot(i);
  this.setupTrackedInputModels();
  window.addEventListener('resize',()=>this.resize());
  this.renderer.domElement.addEventListener('click',e=>this.onClick(e));
  this.resize();this.lastAnimationTime=0;
  this.renderer.setAnimationLoop((t,frame)=>this.animate(t,frame));
 }
 async loadCat(){
  try {
   const [{GLTFLoader},{DRACOLoader}]=await Promise.all([
    import('three/addons/loaders/GLTFLoader.js'),
    import('three/addons/loaders/DRACOLoader.js')
   ]);
   const loader=new GLTFLoader(),draco=new DRACOLoader();
   const decoder=document.querySelector('meta[name="solvi-draco-path"]')?.content ||
    'https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/libs/draco/';
   draco.setDecoderPath(new URL(decoder,document.baseURI).href);
   loader.setDRACOLoader(draco);
   const gltf=await loader.loadAsync(MODEL_URL);
   gltf.scene.updateMatrixWorld(true);
   const bounds=new THREE.Box3().setFromObject(gltf.scene);
   const size=bounds.getSize(new THREE.Vector3());
   if(size.y>0.001){gltf.scene.scale.setScalar(1.58/size.y);}
   // Bring the imported mesh's feet to the anchor origin; avoid changing its rig.
   gltf.scene.updateMatrixWorld(true);
   const scaledBounds=new THREE.Box3().setFromObject(gltf.scene);
   gltf.scene.position.y-=scaledBounds.min.y;
   gltf.scene.rotation.y=CAT_YAW_RADIANS;
   this.cat.add(gltf.scene);
   gltf.scene.traverse(obj=>{
    if(obj.isMesh||obj.isSkinnedMesh){
     obj.frustumCulled=false;
     const mats=Array.isArray(obj.material)?obj.material:[obj.material];
     for(const mat of mats){
      if(!mat)continue;
      for(const key of ['map','normalMap','roughnessMap','metalnessMap','emissiveMap']){
       if(mat[key]){mat[key].anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());mat[key].needsUpdate=true;}
      }
      mat.side=THREE.FrontSide;
      mat.needsUpdate=true;
     }
    }
   });
   this.mixer=new THREE.AnimationMixer(gltf.scene);
   gltf.animations.forEach(clip=>this.clips.set(clip.name.split('__')[0].toLowerCase(),clip));
   this.playSolvi('idle');this.catLoaded=true;this.nextCatBeat=performance.now()+3600;
   this.onDevice?.(`Solvi 3D loaded · ${gltf.animations.length} animations`);
  } catch(error) {
   console.error('Solvi GLB loading error (check Draco files and import map):',error);
   this.onDevice?.('Solvi model could not load. Verify GLTFLoader, Draco and GLB URLs.');
  }
 }
 playSolvi(name='idle'){
  if(!this.mixer)return false;
  const key=String(name).toLowerCase();
  if(key!=='idle'&&this.getSettings().reducedMotion)return false;
  const clip=this.clips.get(key);if(!clip)return false;
  const next=this.mixer.clipAction(clip);next.reset();next.enabled=true;
  next.setLoop(['idle','walking'].includes(key)?THREE.LoopRepeat:THREE.LoopOnce,['idle','walking'].includes(key)?Infinity:1);
  next.clampWhenFinished=!['idle','walking'].includes(key);next.play();
  if(this.activeAction&&this.activeAction!==next)next.crossFadeFrom(this.activeAction,.25,false);
  this.activeAction=next;
  this.temporaryAnimationEnd=['idle','walking'].includes(key)?0:performance.now()+clip.duration*1000;
  return true;
 }
 beginWalk(time=performance.now(),force=false){
  if(!this.catLoaded||this.isPaused||(!force&&this.walk))return false;
  if(this.getSettings().reducedMotion)return false;
  // The companion moves across a small stage to the player's RIGHT and BEHIND
  // the task interaction volume. It never walks into the reachable targets.
  const side=this.catTravelRight;
  const sideOffset=this.walkCycle++%2===0?.58:-.40;
  const dest=this.catHome.clone().addScaledVector(side,sideOffset);
  const dist=dest.distanceTo(this.cat.position);
  if(dist<.17){this.walkCycle++;return false;}
  const duration=Math.max(1.45,Math.min(3.6,dist/.43));
  const direction=dest.clone().sub(this.cat.position).normalize();
  this.walk={from:this.cat.position.clone(),to:dest,start:time,duration};
  this.cat.rotation.y=Math.atan2(direction.x,direction.z);
  if(!this.playSolvi('walking')){
   // Still move when the walk clip is unavailable (diagnostic WIP fallback).
   this.playSolvi('idle');
  }
  return true;
 }
 setGameActive(active){
  this.gameActive=Boolean(active);
  if(this.gameActive&&!this.getSettings().reducedMotion&&!this.isPaused){
   // A Reach session starts with a short companion walk; no need to wait idle.
   if(!this.beginWalk(performance.now()))this.nextCatBeat=performance.now()+1200;
  }
 }
 celebrateGameMoment(){
  if(!this.catLoaded||this.getSettings().reducedMotion||this.isPaused)return;
  if(this.walk)return; // do not interrupt a walking animation
  this.playSolvi(Math.random()<.65?'happy':'waving');
  this.nextCatBeat=performance.now()+4000;
 }
 updateCatBehavior(now,dt){
  if(!this.isPaused&&this.mixer)this.mixer.update(dt);
  // High-contrast colors DO NOT force the cat to stop. Reduced Motion does.
  // Honour explicit reduced motion throughout the app, including challenges.
  const reduced=Boolean(this.getSettings().reducedMotion);
  if(this.isPaused||reduced){
   if(this.walk){this.walk=null;this.cat.position.copy(this.catHome);this.cat.rotation.y=this.catFrontYaw;}
   if(this.activeAction&&this.activeAction.getClip()?.name?.toLowerCase().indexOf('idle')<0)this.playSolvi('idle');
   return;
  }
  if(this.walk){
   const t=Math.min(1,(now-this.walk.start)/(1000*this.walk.duration));
   const eased=t*t*(3-2*t);
   this.cat.position.copy(this.walk.from).lerp(this.walk.to,eased);
   if(t>=1){
    this.walk=null;this.cat.rotation.y=this.catFrontYaw;
    this.playSolvi('idle');
    this.nextCatBeat=now+(this.gameActive?2300:4400)+Math.random()*(this.gameActive?2500:4500);
   }
   return;
  }
  if(this.temporaryAnimationEnd&&now>=this.temporaryAnimationEnd){
   this.temporaryAnimationEnd=0;this.playSolvi('idle');
   this.nextCatBeat=now+(this.gameActive?2000:3800)+Math.random()*2500;
  }
  if(this.temporaryAnimationEnd||now<this.nextCatBeat||!this.catLoaded)return;
  // Game: prefer walking frequently; lobby: walk/gesture with a slower rhythm.
  const walkChance=this.gameActive?.75:.55;
  if(Math.random()<walkChance&&this.beginWalk(now))return;
  const actions=this.gameActive?['happy','waving','walking','happy','mma kick','cross punch']:
   ['happy','waving','happy','cross punch','mma kick','belly dance'];
  const name=actions[Math.floor(Math.random()*actions.length)];
  if(name==='walking'&&this.beginWalk(now))return;
  if(!this.playSolvi(name))this.nextCatBeat=now+3000;
 }
 showPress(action){
  this.pressedAction=action;this.pressedUntil=performance.now()+240;
  this.lastPanelKey='';this.refreshPanel(true);
 }
 setHover(action,source){
  if(this.hoverAction===action)return;
  this.hoverAction=action;
  if(action)this.onHover?.({action,source});
  this.lastPanelKey='';this.refreshPanel(true);
 }
 updateBeam(beam,origin,dir,length){
  beam.visible=true;
  beam.position.copy(origin).addScaledVector(dir,length*.5);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.clone().negate());
  beam.scale.set(1,length,1);
 }
 addInputSlot(i){
  const controller=this.renderer.xr.getController(i),hand=this.renderer.xr.getHand(i);
  const grip=this.renderer.xr.getControllerGrip(i);
  // Fallback controllers are always present if WebXR profile assets cannot be
  // downloaded. Device-matched factory models replace them when available.
  const fallbackController=this.makeFallbackController();
  fallbackController.visible=false;grip.add(fallbackController);
  const palmMarker=new THREE.Mesh(new THREE.SphereGeometry(.036,12,10),
   new THREE.MeshStandardMaterial({color:i===0?CYAN:PINK,roughness:.57}));
  palmMarker.visible=false;this.scene.add(palmMarker);
  const color=i===0?CYAN:PINK;
  const pointerMaterial=new THREE.MeshBasicMaterial({color,depthTest:false,depthWrite:false,transparent:true,opacity:1,toneMapped:false});
  const ray=new THREE.Mesh(new THREE.CylinderGeometry(.0028,.005,1,8),pointerMaterial);
  ray.renderOrder=1100;ray.visible=false;this.scene.add(ray);
  const tip=new THREE.Mesh(new THREE.SphereGeometry(.012,12,8),pointerMaterial.clone());
  tip.renderOrder=1110;tip.visible=false;this.scene.add(tip);
  const handTip=new THREE.Mesh(new THREE.SphereGeometry(.018,12,8),pointerMaterial.clone());
  handTip.renderOrder=1110;handTip.visible=false;this.scene.add(handTip);
  const handBeam=new THREE.Mesh(new THREE.CylinderGeometry(.002,.004,1,8),pointerMaterial.clone());
  handBeam.renderOrder=1100;handBeam.visible=false;this.scene.add(handBeam);
  const record={slot:i,controller,hand,grip,fallbackController,palmMarker,
   nativeControllerModel:null,nativeHandModel:null,nativeModelLoaded:false,
   ray,tip,handTip,handBeam,source:null,kind:null,wasPinching:false,wasTouchingMenu:false,
   teleInputDown:false,wasHomeDown:false};
  controller.addEventListener('connected',e=>this.connectInput(record,e.data,'controller'));
  controller.addEventListener('disconnected',()=>this.disconnectInput(record,'controller'));
  hand.addEventListener('connected',e=>this.connectInput(record,e.data,'hand'));
  hand.addEventListener('disconnected',()=>this.disconnectInput(record,'hand'));
  controller.addEventListener('selectstart',()=>{
   if(record.source&&!record.source.hand){
    if(this.tryStartMenuDrag(record,'trigger'))return;
    if(!this.teleportState)this.selectSource(record);
   }
  });
  controller.addEventListener('selectend',()=>this.finishMenuDrag(record,'trigger'));
  controller.addEventListener('squeezestart',()=>this.tryStartMenuDrag(record,'grip'));
  controller.addEventListener('squeezeend',()=>this.finishMenuDrag(record,'grip'));
  hand.addEventListener('selectstart',()=>{
   if(record.source?.hand)this.selectSource(record);
  });
  this.scene.add(controller,hand,grip);
  this.controllerObjs.push(controller);this.handObjs.push(hand);this.pointerRecords.push(record);
 }
 makeFallbackController(){
  const holder=new THREE.Group();holder.name='Visible controller (fallback)';
  const gripMat=new THREE.MeshStandardMaterial({color:0x526b8a,metalness:.27,roughness:.36});
  const surface=new THREE.Mesh(new THREE.BoxGeometry(.069,.105,.145),gripMat);
  surface.position.set(0,-.018,-.018);holder.add(surface);
  const handle=new THREE.Mesh(new THREE.CylinderGeometry(.026,.029,.12,12),gripMat);
  handle.rotation.x=-.30;handle.position.set(0,-.11,.025);holder.add(handle);
  const button=new THREE.Mesh(new THREE.SphereGeometry(.012,12,8),
   new THREE.MeshBasicMaterial({color:CYAN}));
  button.position.set(.017,.039,-.047);holder.add(button);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(.038,.005,8,24),
   new THREE.MeshBasicMaterial({color:0xc4e6ff}));
  rim.rotation.x=-.25;rim.position.set(0,.025,-.034);holder.add(rim);
  return holder;
 }
 async setupTrackedInputModels(){
  // WebXR supplies input poses, not 3D controller meshes. Use the matching
  // profile if it can be resolved locally; otherwise the official CDN.
  // The app always has immediately available controller and joint fallbacks.
  const config=document.querySelector('meta[name="solvi-xr-profile-path"]')?.content;
  let profilePath=null;
  if(config){
   const root=new URL(config,document.baseURI);
   try{
    const response=await fetch(new URL('profilesList.json',root),{cache:'no-store'});
    if(response.ok)profilePath=root.href;
   }catch{ /* Static hosting may not have the optional cached models. */ }
  }
  for(const record of this.pointerRecords){
   const factory=new XRControllerModelFactory(null,()=>{
    record.nativeModelLoaded=true;
    record.fallbackController.visible=false;
    this.onDevice?.(`Native ${record.source?.handedness||'XR'} controller model ready`);
   });
   if(profilePath)factory.setPath(profilePath.replace(/\/$/,''));
   const model=factory.createControllerModel(record.grip);
   record.nativeControllerModel=model;
   record.grip.add(model);
   const handFactory=new XRHandModelFactory();
   const spheres=handFactory.createHandModel(record.hand,'spheres');
   record.nativeHandModel=spheres;
   record.hand.add(spheres);
   const skinFactory=new XRHandModelFactory(null,()=>{
    spheres.visible=false;record.handMeshLoaded=true;
   });
   if(profilePath)skinFactory.setPath(`${profilePath}generic-hand/`);
   const skinnedHand=skinFactory.createHandModel(record.hand,'mesh');
   record.hand.add(skinnedHand);
   record.nativeHandSkin=skinnedHand;
  }
 }
 connectInput(record,source,kind){
  record.source=source;record.kind=source.hand?'hand':'controller';
  record.controller.userData.source=source;
  record.fallbackController.visible=record.kind==='controller'&&!record.nativeModelLoaded;
  record.palmMarker.visible=false;
  const color=source.handedness==='right'?PINK:CYAN;
  for(const obj of [record.ray,record.tip,record.handTip,record.handBeam])obj.material.color.setHex(color);
  this.onDevice?.(`${record.kind==='hand'?'Hand tracking':'Controller'} connected (${source.handedness||'unknown'})`);
 }
 disconnectInput(record,kind){
  if(kind&&record.kind&&record.kind!==kind)return;
  record.source=null;record.kind=null;record.controller.userData.source=null;
  record.fallbackController.visible=false;record.palmMarker.visible=false;
  record.nativeModelLoaded=false;
  for(const obj of [record.ray,record.tip,record.handTip,record.handBeam])obj.visible=false;
  if(this.teleportState?.record===record)this.cancelTeleport();
  if(this.menuDrag?.record===record)this.endMenuDrag();
  record.teleInputDown=false;record.wasHomeDown=false;record.wasPinching=false;record.wasTouchingMenu=false;
 }
 resize(){const w=this.el.clientWidth||window.innerWidth,h=this.el.clientHeight||window.innerHeight;
  this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h,false);}
 async supported(){return Boolean(navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr').catch(()=>false));}
 async enterVR(){
  if(!navigator.xr)throw new Error('WebXR is unavailable in this browser.');
  let session;
  this.hasFloorReference=true;
  try {
   // local-floor guarantees 0m is floor level: do not silently assume it exists.
   this.renderer.xr.setReferenceSpaceType('local-floor');
   session=await navigator.xr.requestSession('immersive-vr',{
    requiredFeatures:['local-floor'],optionalFeatures:['hand-tracking','bounded-floor']});
  }catch(error){
   // Fallback for runtimes without local-floor; infer a floor from the first eye pose.
   console.warn('XR local-floor unavailable; using local reference space',error);
   this.hasFloorReference=false;
   this.renderer.xr.setReferenceSpaceType('local');
   session=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['hand-tracking']});
  }
  this.xr=true;this.lastHead=null;this.trackedPose=null;this.teleportState=null;this.menuDrag=null;
  this.lobbyPanel.visible=false;this.lobbyWall.visible=false;this.hudPanel.visible=false;this.targetGroup.visible=false;
  try {this.renderer.xr.setFoveation(1);await this.renderer.xr.setSession(session);}
  catch(error){this.xr=false;await session.end().catch(()=>{});throw error;}
  document.body.classList.add('in-xr');
  // IMPORTANT: Do not call placeUI() here. renderer.xr.getCamera() can still
  // have its initial (untracked) pose; waiting for XRFrame prevents buried UI.
  session.addEventListener('end',()=>{
   this.xr=false;this.lobbyPanel.visible=false;this.lobbyWall.visible=false;this.hudPanel.visible=false;
   this.cancelTeleport();this.endMenuDrag();document.body.classList.remove('in-xr');
   this.worldProps.lobbyRoot.position.set(0,0,0);this.worldProps.lobbyRoot.rotation.y=0;
   this.catHome.set(1.12,0,-1.5);this.cat.position.copy(this.catHome);this.setGameActive(false);
   this.cat.rotation.y=0;this.catFrontYaw=0;this.catTravelRight.set(1,0,0);
   this.cat.scale.setScalar(1);this.walk=null;this.playSolvi('idle');
   this.clearTarget();this.lastHead=null;this.trackedPose=null;
   this.renderer.xr.setReferenceSpaceType('local-floor');
   for(const record of this.pointerRecords)this.disconnectInput(record);
   this.onDevice?.('VR session ended');
  });
  this.onDevice?.('XR session started. Placing lobby after first tracked headset frame.');
 }
 async exitVR(){const s=this.renderer.xr.getSession();if(s)await s.end();}
  syncMenuWall(){
   if(!this.lobbyWall)return;
   this.lobbyWall.position.copy(this.lobbyPanel.position);
   // Move the backing a little behind the interactive front surface.
   const backward=new THREE.Vector3(0,0,-.045).applyQuaternion(this.lobbyPanel.quaternion);
   this.lobbyWall.position.add(backward);
   this.lobbyWall.quaternion.copy(this.lobbyPanel.quaternion);
  }
  bringMenuInFront({clearSaved=false}={}){
   const pose=this.getHeadPose();if(!pose||!this.xr)return false;
   this.lobbyPanel.position.copy(pose.position).addScaledVector(pose.forward,2.55)
    .add(new THREE.Vector3(0,-.03,0));
   this.lobbyPanel.rotation.set(0,Math.atan2(-pose.forward.x,-pose.forward.z),0);
   if(clearSaved){try{localStorage.removeItem(this.menuPositionKey);}catch{}}
   this.syncMenuWall();this.refreshPanel(true);return true;
  }
  saveMenuPlacement(panel=this.lobbyPanel){
   if(!this.xr)return;
   this.worldProps.lobbyRoot.updateMatrixWorld(true);
   const p=this.worldProps.lobbyRoot.worldToLocal(panel.position.clone());
   const yaw=panel.rotation.y-this.worldProps.lobbyRoot.rotation.y;
   const key=panel===this.hudPanel?this.challengeMenuPositionKey:this.menuPositionKey;
   try{localStorage.setItem(key,JSON.stringify({x:p.x,y:p.y,z:p.z,yaw}));}catch{}
  }
  pointerPose(record){
   if(record.source?.hand){
    const tip=record.hand.joints?.['index-finger-tip'],wrist=record.hand.joints?.['wrist'];
    if(!tip?.visible)return null;
    const pos=tip.getWorldPosition(new THREE.Vector3());
    const from=wrist?.visible?wrist.getWorldPosition(new THREE.Vector3()):pos.clone().add(new THREE.Vector3(0,0,.23));
    const direction=pos.clone().sub(from).normalize();
    if(direction.lengthSq()<.01)return null;
    return {origin:pos,direction};
   }
   if(!record.source)return null;
   return {origin:record.controller.getWorldPosition(new THREE.Vector3()),
    direction:new THREE.Vector3(0,0,-1).applyQuaternion(record.controller.getWorldQuaternion(new THREE.Quaternion())).normalize()};
  }
  tryStartMenuDrag(record,method='grip'){
   if(!this.xr||this.menuDrag||this.teleportState||!this.panel.visible||!record.source)return false;
   const pose=this.pointerPose(record);if(!pose)return false;
   const hit=this.hitPanel(pose.origin,pose.direction);
   if(hit?.region?.action!=='move-menu')return false;
   this.menuDrag={record,method,panel:this.panel,distance:Math.max(.5,hit.distance),
    offset:hit.point.clone().sub(this.panel.position)};
   this.setHover('move-menu',record.source);this.refreshPanel(true);
   return true;
  }
  updateMenuDrag(){
   const drag=this.menuDrag;if(!drag)return;
   const p=this.pointerPose(drag.record);if(!p){this.endMenuDrag();return;}
   const center=p.origin.clone().addScaledVector(p.direction,drag.distance).sub(drag.offset);
   const floor=this.worldProps.lobbyRoot.position.y;
   const isChallenge=drag.panel===this.hudPanel;
   const clamped=clampMenuCenter(center,{floorY:floor,minY:isChallenge ? .72 : 1.13,maxY:2.9});
   const head=this.getHeadPose();
   const placed=isChallenge&&head?safeChallengePanelCenter(clamped,head.position,head.forward,head.right):clamped;
   drag.panel.position.set(placed.x,placed.y,placed.z);
   if(head){const toward=head.position.clone().sub(drag.panel.position);toward.y=0;
    if(toward.lengthSq()>.02)drag.panel.rotation.y=Math.atan2(toward.x,toward.z);}
   if(!isChallenge)this.syncMenuWall();
   drag.panel.updateMatrixWorld(true);this.refreshPanel(true);
  }
  finishMenuDrag(record,method){
   if(this.menuDrag?.record!==record||this.menuDrag?.method!==method)return;
   this.endMenuDrag();
  }
  endMenuDrag(){
   if(!this.menuDrag)return;
   const panel=this.menuDrag.panel;
   this.menuDrag=null;
   this.saveMenuPlacement(panel);
   this.refreshPanel(true);
  }
  cancelTeleport(){
   this.teleportState=null;this.teleportArc.visible=false;
   this.teleportDisc.visible=false;this.teleportCore.visible=false;
  }
  updateTeleportAim(record){
   const pose=this.pointerPose(record);if(!pose){this.cancelTeleport();return;}
   const floor=this.worldProps.lobbyRoot.position.y+.02;
   const samples=ballisticSamples(pose.origin,pose.direction);
   const hit=findFloorCrossing(samples,floor);
   const limit=hit?hit.index:samples.length-1;
   for(let i=0;i<=limit;i++){
    const s=samples[i],t=i===limit&&hit?hit.point:s;
    this.teleportArcPositions.set([t.x,t.y,t.z],i*3);
   }
   this.teleportArcGeometry.attributes.position.needsUpdate=true;
   this.teleportArcGeometry.setDrawRange(0,limit+1);
   // Geometry is dynamic and the line is never frustum-culled.
   this.teleportArc.visible=true;
   // The actual walkable disc is offset 1.5m ahead of the lobby origin.
   this.worldProps.lobbyRoot.updateMatrixWorld(true);
   const center=this.worldProps.lobbyRoot.localToWorld(new THREE.Vector3(0,0,-1.5));
   const valid=!!hit&&withinPlatform(hit.point,center,4.15)&&
    pose.origin.distanceTo(new THREE.Vector3(hit.point.x,pose.origin.y,hit.point.z))>.5;
   this.teleportArc.material.color.setHex(valid?CYAN:0xff8c9d);
   this.teleportDisc.visible=!!hit;this.teleportCore.visible=!!hit;
   if(hit){
    this.teleportDisc.position.set(hit.point.x,floor+.015,hit.point.z);
    this.teleportCore.position.set(hit.point.x,floor+.018,hit.point.z);
    this.teleportDisc.material.color.setHex(valid?0x8dffce:0xff7599);
   }
   this.teleportState={record,landing:valid?hit.point:null};
  }
  finishTeleport(record){
   if(this.teleportState?.record!==record)return;
   const landing=this.teleportState.landing;
   this.cancelTeleport();if(!landing)return;
   const eye=this.getHeadPose();const ref=this.renderer.xr.getReferenceSpace();
   if(!eye||!ref||typeof XRRigidTransform==='undefined')return;
   const offset=referenceSpaceOffset(eye.position,landing);
   try{
    const next=ref.getOffsetReferenceSpace(new XRRigidTransform(offset));
    this.renderer.xr.setReferenceSpace(next);
    this.trackedPose=null; // the next animation frame reads the NEW reference-space pose
    // Keep the wall and Solvi fixed in their original world coordinates.
    // Retarget challenge and tiny HUD when the next valid XR frame arrives.
    this.needsTeleportRetarget=true;
    this.onDevice?.('Teleported. Press A / X to bring the menu in front.');
   }catch(error){console.warn('Teleport reference-space change failed:',error);}
  }
  updateThumbstick(record){
   if(!record.source||record.source.hand||!record.source.gamepad)return;
   const gp=record.source.gamepad;
   const down=thumbstickIntent(gp.axes,gp.buttons).pressed;
   // Quest A/X (usually index 4) recentres ONLY the menu, never the entire stage.
   const home=Boolean(gp.buttons?.[4]?.pressed);
   if(home&&!record.wasHomeDown)this.bringMenuInFront();
   record.wasHomeDown=home;
   if(down&&!record.teleInputDown&&!this.menuDrag&&!this.isPaused){
    if(!this.teleportState)this.teleportState={record,landing:null};
   }
   if(!down&&record.teleInputDown)this.finishTeleport(record);
   record.teleInputDown=down;
   if(down&&this.teleportState?.record===record)this.updateTeleportAim(record);
  }
 getHeadPose(frame){
  if(this.xr){
   if(frame){
    const refSpace=this.renderer.xr.getReferenceSpace();
    const pose=refSpace?frame.getViewerPose(refSpace):null;
    if(pose){
     const p=pose.transform.position,o=pose.transform.orientation;
     const position=new THREE.Vector3(p.x,p.y,p.z);
     const q=new THREE.Quaternion(o.x,o.y,o.z,o.w);
     const f=new THREE.Vector3(0,0,-1).applyQuaternion(q);f.y=0;
     if(f.lengthSq()<.001)f.set(0,0,-1);f.normalize();
     const r=new THREE.Vector3(-f.z,0,f.x);
     this.trackedPose={position,forward:f,right:r};
    }
   }
   // No tracked pose? Return null, not an uninitialised XR/desktop camera.
   return this.trackedPose?{
    position:this.trackedPose.position.clone(),forward:this.trackedPose.forward.clone(),
    right:this.trackedPose.right.clone()}:null;
  }
  this.camera.updateMatrixWorld(true);
  const position=this.camera.getWorldPosition(new THREE.Vector3());
  const q=this.camera.getWorldQuaternion(new THREE.Quaternion());
  const f=new THREE.Vector3(0,0,-1).applyQuaternion(q);f.y=0;
  if(f.lengthSq()<.001)f.set(0,0,-1);f.normalize();
  const r=new THREE.Vector3(-f.z,0,f.x);return {position,forward:f,right:r};
 }
 placeUI(pose=this.getHeadPose()){
  if(!this.xr||!pose)return false;
  const {position,forward:f,right:r}=pose;
  const placement=placementFromEye(position,f,r,{hasLocalFloor:this.hasFloorReference});
  this.lastHead={position:position.clone(),forward:f.clone(),right:r.clone()};
  // Align the CLASSIC scenic lobby with the actual XR starting direction.
  // The floor is 0 in local-floor reference space, never a value derived from
  // an untracked desktop camera. For local fallback, use estimated floor.
  this.worldProps.lobbyRoot.position.set(position.x,placement.floorY,position.z);
  this.worldProps.lobbyRoot.rotation.y=Math.atan2(-f.x,-f.z);
  // First launch: wall menu DIRECTLY ahead of the wearer, not off to the side.
  // The optional saved placement is relative to the original lobby anchor.
  this.lobbyPanel.position.set(placement.menu.x,placement.menu.y,placement.menu.z);
  this.lobbyPanel.rotation.set(0,Math.atan2(-f.x,-f.z),0);
  try{
   const saved=JSON.parse(localStorage.getItem(this.menuPositionKey)||'null');
   if(saved&&[saved.x,saved.y,saved.z,saved.yaw].every(Number.isFinite)){
    this.worldProps.lobbyRoot.updateMatrixWorld(true);
    this.lobbyPanel.position.copy(this.worldProps.lobbyRoot.localToWorld(new THREE.Vector3(saved.x,saved.y,saved.z)));
    this.lobbyPanel.rotation.y=this.worldProps.lobbyRoot.rotation.y+saved.yaw;
   }
  }catch{}
  this.syncMenuWall();
  this.positionChallengeHUD(pose);
  this.panel=this.lobbyPanel; // refreshPanel selects the right panel for the current view.
  this.catHome.set(placement.cat.x,placement.cat.y,placement.cat.z);
  this.cat.position.copy(this.catHome);this.walk=null;this.nextCatBeat=performance.now()+2100;
  this.catTravelRight.copy(r);
  this.catFrontYaw=Math.atan2(-f.x,-f.z);
  this.cat.rotation.y=this.catFrontYaw;
  this.cat.scale.setScalar(1);
  this.hoverAction=null;
  this.refreshPanel(true);
  // A challenge may have been started from the 2D landing page before entering XR.
  // Relocate any existing target only after a real tracked headset pose exists.
  if(this.task)this.positionTarget(this.task);
  this.onDevice?.(`XR lobby placed at eye height ${position.y.toFixed(2)} m, floor ${placement.floorY.toFixed(2)} m`);
  return true;
 }
 positionChallengeHUD(pose=this.lastHead){
  if(!pose)return;
  const {position,forward:f,right:r}=pose;
  // A genuinely SIDE-mounted control station, outside the near-reach corridor.
  // At ~1.95m forward / 1.55m left, the panel is clear of targets within 0.5m.
  this.hudPanel.position.copy(position).addScaledVector(f,1.95)
   .addScaledVector(r,-1.55).add(new THREE.Vector3(0,-.08,0));
  const look=position.clone().sub(this.hudPanel.position);look.y=0;
  this.hudPanel.rotation.set(0,Math.atan2(look.x,look.z),0);
  // A custom placement is relative to the original room anchor, not the camera.
  try{
   const saved=JSON.parse(localStorage.getItem(this.challengeMenuPositionKey)||'null');
   if(saved&&[saved.x,saved.y,saved.z,saved.yaw].every(Number.isFinite)){
    this.worldProps.lobbyRoot.updateMatrixWorld(true);
    const candidate=this.worldProps.lobbyRoot.localToWorld(new THREE.Vector3(saved.x,saved.y,saved.z));
    const safe=safeChallengePanelCenter(candidate,position,f,r);
    this.hudPanel.position.set(safe.x,safe.y,safe.z);
    this.hudPanel.rotation.y=this.worldProps.lobbyRoot.rotation.y+saved.yaw;
   }
  }catch{}
 }
 updatePanelLayout(view){
  const challenge=isChallengeView(view);
  const nextMode=challenge?'challenge':'lobby';
  const oldMode=this.panelMode;
  this.panelMode=nextMode;
  const visible=visiblePanelsForView(view);
  this.lobbyPanel.visible=this.xr&&!!this.lastHead&&visible.lobby;
  this.lobbyWall.visible=this.lobbyPanel.visible;
  this.syncMenuWall();
  this.hudPanel.visible=this.xr&&!!this.lastHead&&visible.hud;
  this.panel=challenge?this.hudPanel:this.lobbyPanel;
  const layout=layoutForView(view);
  this.panelWidth=layout.width;this.panelHeight=layout.height;
  this.panelCanvas=challenge?this.hudCanvas:this.lobbyPanel.material.map.image;
  this.panelCtx=challenge?this.hudCtx:this.lobbyPanel.material.map.image.getContext('2d');
  this.panelTexture=challenge?this.hudTexture:this.lobbyPanel.material.map;
  if(oldMode!==nextMode){
   this.panelRegions=[];
   this.hoverAction=null;
   this.lastPanelKey='';
  }
  // Do not reposition a user-dragged side panel on every frame.
  if(challenge&&oldMode!==nextMode)this.positionChallengeHUD();
 }
 drawChallengeHUD(view,accent,fg,sub){
  const ctx=this.panelCtx,W=this.panelCanvas.width,H=this.panelCanvas.height;
  const hot=this.hoverAction,pressed=performance.now()<this.pressedUntil?this.pressedAction:null;
  const accessible=this.getSettings().lobbyVariant==='accessible';
  ctx.fillStyle=accessible?'#030303':'#081628';
  ctx.beginPath();ctx.roundRect(8,8,W-16,H-16,32);ctx.fill();
  ctx.strokeStyle=accent;ctx.lineWidth=accessible?13:6;ctx.stroke();
  ctx.textAlign='left';ctx.font='bold 43px Arial';ctx.fillStyle=accent;
  ctx.fillText('REACH  /  CONTROLS',48,75);
  ctx.textAlign='right';ctx.fillStyle=fg;ctx.font='bold 69px Arial';
  ctx.fillText(view.time||'00:00',W-53,94);
  // Always show the grab handle in both lobby and challenge mode.
  const dragging=this.menuDrag?.panel===this.hudPanel;
  ctx.fillStyle=dragging?'#ffffff':hot==='move-menu'?'#a0ecff':accessible?'#fff063':'#235a7b';
  ctx.beginPath();ctx.roundRect(1020,121,369,85,17);ctx.fill();
  ctx.fillStyle=dragging||hot==='move-menu'||accessible?'#081426':'#ffffff';
  ctx.textAlign='center';ctx.font='bold 35px Arial';
  ctx.fillText('⠿ MOVE PANEL',1204,177,345);
  this.panelRegions=[{x:1020,y:121,w:369,h:85,action:'move-menu'}];
  ctx.textAlign='left';ctx.fillStyle=fg;ctx.font='bold 47px Arial';
  ctx.fillText(view.instruction||'Touch the next target',50,199,930);
  ctx.fillStyle=sub;ctx.font='bold 39px Arial';
  ctx.fillText(`HITS  ${view.hits||0}     ·     POINTS  ${view.score||0}`,50,279);
  const buttons=[{action:'pause',label:'PAUSE'},{action:'safe',label:'SAFE PLACE'},{action:'end',label:'END'}];
  const gap=22,x0=48,y=338,h=162,w=(W-96-gap*2)/3;
  buttons.forEach((btn,i)=>{
   const x=x0+i*(w+gap),active=hot===btn.action,down=pressed===btn.action;
   ctx.fillStyle=down?'#ffffff':active?'#79ddff':accessible?'#ffea38':i===0?'#fa76c3':'#24445b';
   ctx.beginPath();ctx.roundRect(x,y,w,h,23);ctx.fill();
   ctx.strokeStyle=active?'#ffffff':accessible?'#ffffff':'#8bbdcc';ctx.lineWidth=active?9:4;ctx.stroke();
   ctx.fillStyle=active||down||accessible||i===0?'#0b182b':'#ffffff';
   ctx.font='bold 41px Arial';ctx.textAlign='center';ctx.fillText(btn.label,x+w/2,y+97,w-25);
   this.panelRegions.push({x,y,w,h,action:btn.action});
  });
  ctx.fillStyle=sub;ctx.textAlign='left';ctx.font='27px Arial';
  ctx.fillText('Rays only when aiming at this panel  ·  Grip / pinch MOVE PANEL',50,550,W-100);
 }

 refreshPanel(force=false){
  if(!this.xr)return;
  const view=this.makeView?.()||{},theme=this.getSettings().lobbyVariant||'standard';
  this.updatePanelLayout(view);
  this.worldProps.decor.visible=theme!=='accessible';
  // The challenge HUD has no background rectangle overlapping the reach targets.
  this.targetGroup.visible=Boolean(this.task)&&isChallengeView(view)&&!this.isPaused;
  const now=performance.now(),pressed=now<this.pressedUntil?this.pressedAction:null;
  const key=JSON.stringify([view,theme,this.hoverAction,pressed]);
  if(!force&&key===this.lastPanelKey)return;
  this.lastPanelKey=key;
  const accessible=theme==='accessible',calm=theme==='calm';
  const ctx=this.panelCtx,W=this.panelCanvas.width,H=this.panelCanvas.height;
  ctx.clearRect(0,0,W,H);
  const bg=accessible?'#050505':calm?'#0a212a':'#101c30';
  const fg='#ffffff',sub=accessible?'#ffffff':'#cde6ed';
  const accent=accessible?'#ffea38':calm?'#86f3ce':'#ff71c9';
  if(isChallengeView(view)){
   this.panelRegions=[];
   this.drawChallengeHUD(view,accent,fg,sub);
   this.panelTexture.needsUpdate=true;
   return;
  }
  ctx.fillStyle=bg;ctx.beginPath();ctx.roundRect(10,10,W-20,H-20,44);ctx.fill();
  ctx.strokeStyle=accent;ctx.lineWidth=accessible?12:6;ctx.stroke();
  ctx.textAlign='left';ctx.fillStyle=accent;ctx.font='bold 33px Arial';
  ctx.fillText(`RANTLIST.ME   /   SOLVI XR   /   ${theme.toUpperCase()}`,62,93);
  ctx.fillStyle=fg;ctx.font='bold 66px Arial';
  ctx.fillText(view.title||'Solvi XR',62,173,W-130);
  ctx.font='33px Arial';ctx.fillStyle=sub;
  this.wrap(view.message||'Choose a path.',56).slice(0,2)
   .forEach((line,i)=>ctx.fillText(line,65,242+i*49,W-130));
  this.panelRegions=[];
  // Grab the header with a controller grip/trigger or with a hand pinch.
  ctx.fillStyle=this.menuDrag?'#ffffff':accessible?'#fff063':'#28698a';
  ctx.beginPath();ctx.roundRect(1025,27,357,117,20);ctx.fill();
  ctx.fillStyle=this.menuDrag?'#091229':accessible?'#090909':'#ffffff';
  ctx.textAlign='center';ctx.font='bold 35px Arial';
  ctx.fillText('⠿ MOVE PANEL',1203,99,324);
  this.panelRegions.push({x:1025,y:27,w:357,h:117,action:'move-menu'});
  // Big-number progress billboard, followed by action buttons.
  if(view.stats||view.statTiles){
   const values=view.statTiles||[['SESSIONS',view.stats?.sessions],['PERSONAL BEST',view.stats?.best],['TOTAL HITS',view.stats?.hits]];
   values.forEach(([label,value],i)=>{
    const x=65+i*440;
    ctx.fillStyle=accessible?'#141414':'#1d3349';
    ctx.beginPath();ctx.roundRect(x,340,412,340,30);ctx.fill();
    ctx.strokeStyle=i===1?accent:'#7aaab9';ctx.lineWidth=5;ctx.stroke();
    ctx.textAlign='center';ctx.fillStyle=accent;ctx.font='bold 118px Arial';
    ctx.fillText(String(value??0),x+206,516,385);
    ctx.fillStyle=fg;ctx.font='bold 31px Arial';ctx.fillText(label,x+206,610,385);
   });
  }
  const buttons=(view.buttons||[]).slice(0,8);
  const cols=buttons.length<=3?1:2,cellW=cols===1?1304:635;
  const rows=Math.ceil(buttons.length/cols);
  const cellH=(view.stats||view.statTiles)?140:(rows>3?174:rows>2?198:208);
  const startY=(view.stats||view.statTiles)?775:(rows>3?370:413),gap=20;
  for(let i=0;i<buttons.length;i++){
   const row=Math.floor(i/cols),col=i%cols,x=65+col*(cellW+34),y=startY+row*(cellH+gap);
   const btn=buttons[i],hot=this.hoverAction===btn.action,down=pressed===btn.action;
   const selected=btn.primary;
   ctx.fillStyle=accessible?(down?'#ffffff':hot?'#fff4a7':selected?'#ffea38':'#212121'):
    down?'#ffffff':hot?'#63d9ff':selected?(calm?'#80eccc':'#fd76cd'):'#28435d';
   ctx.beginPath();ctx.roundRect(x,y,cellW,cellH,27);ctx.fill();
   ctx.strokeStyle=hot?'#ffffff':accessible?'#ffffff':selected?'#ffffff':'#8fb9dc';
   ctx.lineWidth=hot?9:4;ctx.stroke();
   ctx.textAlign='center';ctx.fillStyle=(hot||selected||down)?'#081525':fg;
   ctx.font=`bold ${accessible?48:43}px Arial`;
   ctx.fillText(btn.label,x+cellW/2,y+cellH/2+14,cellW-32);
   if(hot){ctx.strokeStyle=accent;ctx.lineWidth=6;ctx.strokeRect(x+11,y+10,cellW-22,cellH-20);}
   this.panelRegions.push({x,y,w:cellW,h:cellH,action:btn.action});
  }
  ctx.fillStyle=sub;ctx.textAlign='left';ctx.font='30px Arial';
  ctx.fillText('TRIGGER / PINCH: SELECT    ·    GRIP / PINCH MOVE PANEL    ·    STICK: TELEPORT',65,H-50,W-110);
  this.panelTexture.needsUpdate=true;
 }
 wrap(str,max){const words=String(str).split(/\s+/),lines=[];let line='';
  for(const word of words){if((line+' '+word).length>max){if(line)lines.push(line);line=word;}
   else line+=(line?' ':'')+word;}if(line)lines.push(line);return lines;}
 hitPanel(origin,direction){
  this.raycaster.set(origin,direction);
  const hit=this.panel.visible?this.raycaster.intersectObject(this.panel,false)[0]:null;
  if(!hit||!hit.uv)return null;
  const x=hit.uv.x*this.panelCanvas.width,y=(1-hit.uv.y)*this.panelCanvas.height;
  const region=this.panelRegions.find(r=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h);
  return {point:hit.point,distance:hit.distance,region};
 }
 getTargetRayHit(origin,direction){
  if(!this.targetMesh||!this.targetGroup.visible||this.isPaused)return null;
  this.raycaster.set(origin,direction);
  return this.raycaster.intersectObject(this.targetMesh,false)[0]||null;
 }
 selectPointer(source,origin,direction,input){
  if(!source)return;
  const previous=this.lastSelection.get(source)||0,now=performance.now();
  if(now-previous<400)return;
  const panelHit=this.hitPanel(origin,direction);
  const targetHit=this.getTargetRayHit(origin,direction);
  const choice=nearestActionHit(panelHit,targetHit);
  if(choice==='menu'&&panelHit?.region?.action==='move-menu')return;
  if(choice==='target'){
   this.lastSelection.set(source,now);
   this.onTarget?.({source,hand:source.handedness||'unknown',
    endpointErrorMm:targetHit.point.distanceTo(this.targetMesh.position)*1000,
    via:source.hand?'hand-pinch-ray':'controller-ray'});
  }else if(choice==='menu'){
   this.lastSelection.set(source,now);
   this.showPress(panelHit.region.action);
   this.onAction?.(panelHit.region.action,input,source);
  }
 }
 selectSource(record){
  if(!record.source||this.menuDrag?.record===record||this.teleportState)return;
  if(record.source.hand){
   const finger=record.hand.joints?.['index-finger-tip'];
   const wrist=record.hand.joints?.['wrist'];
   if(!finger?.visible)return;
   const pos=finger.getWorldPosition(new THREE.Vector3());
   const reference=wrist?.visible?wrist.getWorldPosition(new THREE.Vector3()):
    pos.clone().add(new THREE.Vector3(0,0,.2));
   const dir=pos.clone().sub(reference).normalize();
   this.selectPointer(record.source,pos,dir,finger);
   return;
  }
  const pos=record.controller.getWorldPosition(new THREE.Vector3());
  const dir=new THREE.Vector3(0,0,-1).applyQuaternion(record.controller.getWorldQuaternion(new THREE.Quaternion()));
  this.selectPointer(record.source,pos,dir,record.controller);
 }
 // Finger touch is an alternative to ray/pinch navigation. Uses the same actions.
 onClick(e){
  if(this.xr||!this.targetMesh)return;
  const rect=this.renderer.domElement.getBoundingClientRect();
  this.mouse.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
  this.raycaster.setFromCamera(this.mouse,this.camera);
  if(this.raycaster.intersectObject(this.targetMesh)[0])
   this.onTarget?.({hand:'desktop',source:null,endpointErrorMm:10,via:'mouse'});
 }
 clearTarget(){
  this.targetGroup.traverse(obj=>{if(obj.isMesh){obj.geometry?.dispose();
   const mats=Array.isArray(obj.material)?obj.material:[obj.material];
   for(const m of mats){m?.map?.dispose();m?.dispose();}}});
  this.targetGroup.clear();this.targetMesh=null;this.task=null;
 }
 positionTarget(spec){
  if(!spec||!this.targetMesh||!this.lastHead)return;
  const {position,forward:f,right:r}=this.lastHead;
  this.targetMesh.position.copy(position).addScaledVector(f,spec.distance||.53)
   .addScaledVector(r,spec.x||0).add(new THREE.Vector3(0,(spec.y||0)-.1,0));
  const radius=spec.radius||.09;
  for(const child of this.targetGroup.children){
   if(child===this.targetMesh)continue;
   child.position.copy(this.targetMesh.position);
   if(child.geometry?.type==='PlaneGeometry')child.position.y+=radius+.105;
   child.rotation.y=this.panel.rotation.y;
  }
  this.targetGroup.visible=true;
 }
 setTarget(spec){
  this.clearTarget();this.task=spec;if(!spec)return;
  const hand=spec.hand||'either',radius=spec.radius||.09;
  const geo=hand==='right'?new THREE.OctahedronGeometry(radius,0):
   new THREE.BoxGeometry(radius*1.7,radius*1.7,radius*1.7);
  // Bright task targets stay visible even against busy scenes or menu geometry.
  const mat=new THREE.MeshBasicMaterial({color:hand==='right'?0xffb566:0x68ccff,
   depthTest:false,depthWrite:false,toneMapped:false});
  const target=addMesh(this.targetGroup,geo,mat);target.userData.radius=radius;
  target.renderOrder=80;this.targetMesh=target;this.targetGroup.visible=true;
  if(this.xr){
   // Wait for a real XR pose. Avoid dereferencing an untracked camera on first entry.
   if(this.lastHead)this.positionTarget(spec);
   else this.targetGroup.visible=false;
  } else target.position.set((spec.x||0)*1.8,1.45+(spec.y||0)*1.5,.4);
  // Non-flashing high-contrast target outline. Active 3D targets and their cues
  // intentionally draw in FRONT of scenery and menu panels during practice.
  const ring=new THREE.Mesh(new THREE.RingGeometry(radius*1.65,radius*1.85,40),
   new THREE.MeshBasicMaterial({color:hand==='right'?0xffe0a0:0xc7f7ff,
    side:THREE.DoubleSide,transparent:true,opacity:.94,depthTest:false,
    depthWrite:false,toneMapped:false}));
  ring.position.copy(target.position);ring.renderOrder=79;
  this.targetGroup.add(ring);
  const label=new THREE.Mesh(new THREE.PlaneGeometry(.18,.053),new THREE.MeshBasicMaterial({
   map:roundedText(hand==='right'?'R ◆':'L ■',{width:350,height:100,bg:'rgba(9,23,50,.96)'}),
   transparent:true,depthTest:false,depthWrite:false,toneMapped:false}));
  label.position.copy(target.position);label.position.y+=radius+.105;
  label.renderOrder=81;this.targetGroup.add(label);
 }
 animate(t,frame){
  const dt=this.lastAnimationTime?Math.min((t-this.lastAnimationTime)/1000,.075):0;
  this.lastAnimationTime=t;
  this.updateCatBehavior(t,dt);
  const challenge=isChallengeView(this.makeView?.()||{});
  // Gentle scene focus: target materials are unlit and remain bright.
  // Do not suppress scenery or Solvi, simply lower ambient distractions.
  const smoothing=Math.min(1,dt*4);
  const {ambient,keyLight,accentLight}=this.worldProps;
  ambient.intensity=THREE.MathUtils.lerp(ambient.intensity,challenge? .60:2.2,smoothing);
  keyLight.intensity=THREE.MathUtils.lerp(keyLight.intensity,challenge? .85:2.4,smoothing);
  accentLight.intensity=THREE.MathUtils.lerp(accentLight.intensity,challenge? 7:35,smoothing);
  this.renderer.toneMappingExposure=THREE.MathUtils.lerp(this.renderer.toneMappingExposure,challenge? .83:1.25,smoothing);
  this.scene.background.lerp(challenge?BACKGROUND_CHALLENGE:BACKGROUND_LOBBY,smoothing);
  this.worldProps.decor.visible=this.getSettings().lobbyVariant!=='accessible';
  if(this.xr){
   const tracked=this.getHeadPose(frame);
   if(!this.lastHead && tracked)this.placeUI(tracked);
   if(this.needsTeleportRetarget&&tracked){
    this.needsTeleportRetarget=false;
    this.lastHead={position:tracked.position.clone(),forward:tracked.forward.clone(),right:tracked.right.clone()};
    this.positionChallengeHUD(tracked);
    if(this.task)this.positionTarget(this.task);
   }
   // A controller cannot select anything until the headset origin is established.
   if(!this.lastHead){this.renderer.render(this.scene,this.camera);return;}
   this.refreshPanel();
   this.cursor.visible=false;
   let nearestHover=null,nearestHoverSource=null,nearestDistance=Infinity;
   for(const record of this.pointerRecords){
    const src=record.source;
    record.ray.visible=false;record.tip.visible=false;
    record.handTip.visible=false;record.handBeam.visible=false;
    record.palmMarker.visible=false;
    if(!src)continue;
    this.updateThumbstick(record);
    let point,dir,active=false;
    if(src.hand){
     const index=record.hand.joints?.['index-finger-tip'];
     const thumb=record.hand.joints?.['thumb-tip'];
     const wrist=record.hand.joints?.['wrist'];
     if(!index||!thumb||!index.visible||!thumb.visible)continue;
     point=index.getWorldPosition(this.tempPosition.clone());
     const thumbPos=thumb.getWorldPosition(this.tempPosition2.clone());
     const wristPos=wrist?.visible?wrist.getWorldPosition(new THREE.Vector3()):point.clone().add(new THREE.Vector3(0,0,.2));
     dir=point.clone().sub(wristPos).normalize();
     if(dir.lengthSq()<.01)dir.set(0,0,-1);
     record.handTip.position.copy(point);record.handTip.visible=!isChallengeView(this.makeView?.()||{});
     if(wrist?.visible){record.palmMarker.position.copy(wristPos);record.palmMarker.visible=true;}
     const pinchDistance=point.distanceTo(thumbPos);
     if(pinchDistance<.032&&!record.wasPinching){
      record.wasPinching=true;
      if(!this.tryStartMenuDrag(record,'pinch'))this.selectPointer(src,point,dir,index);
     }else if(pinchDistance>.052){
      if(record.wasPinching)this.finishMenuDrag(record,'pinch');
      record.wasPinching=false;
     }
     const local=this.panel.worldToLocal(point.clone());
     const px=(local.x/this.panelWidth+.5)*this.panelCanvas.width;
     const py=(.5-local.y/this.panelHeight)*this.panelCanvas.height;
     const region=this.panelRegions.find(r=>px>=r.x&&px<=r.x+r.w&&py>=r.y&&py<=r.y+r.h);
     const touching=this.panel.visible&&Math.abs(local.z)<.065&&!!region;
     if(touching&&!record.wasTouchingMenu&&!record.wasPinching&&!this.menuDrag&&region?.action!=='move-menu'){
      const prev=this.lastSelection.get(src)||0;
      if(performance.now()-prev>500){
       this.lastSelection.set(src,performance.now());
       this.showPress(region.action);this.onAction?.(region.action,index,src);
      }
     }
     record.wasTouchingMenu=touching;
     active=true;
    }else{
     point=record.controller.getWorldPosition(this.tempPosition.clone());
     dir=new THREE.Vector3(0,0,-1).applyQuaternion(record.controller.getWorldQuaternion(this.tempQuat.clone())).normalize();
     active=true;
    }
    if(!active)continue;
    const panelHit=this.hitPanel(point,dir);
    const targetHit=this.getTargetRayHit(point,dir);
    const choice=nearestActionHit(panelHit,targetHit);
    const hover=choice==='menu'?panelHit:null;
    // No distracting rays during catch/reach exercises. Only point at menu UI.
    // Tracked fingers and controllers use the same policy and keep their models visible.
    const showRay=shouldShowMenuPointer({panelVisible:this.panel.visible,
      panelHit,targetHit,teleporting:!!this.teleportState});
    if(showRay){
     const length=Math.max(.12,panelHit.distance);
     if(src.hand)this.updateBeam(record.handBeam,point,dir,length);
     else{
      this.updateBeam(record.ray,point,dir,length);
      record.tip.position.copy(point).addScaledVector(dir,length);
      record.tip.visible=true;
     }
    }
    if(hover){
     const distance=point.distanceTo(hover.point);
     if(distance<nearestDistance){nearestDistance=distance;nearestHover=hover.region?.action||null;nearestHoverSource=src;this.cursor.position.copy(hover.point);this.cursor.visible=true;}
    }
    if(this.targetMesh&&!this.isPaused){
     const end=point.clone().addScaledVector(dir,src.hand?0:.04);
     if(end.distanceTo(this.targetMesh.position)<this.targetMesh.userData.radius*1.2){
      this.onTarget?.({hand:src.handedness||'unknown',source:src,
       endpointErrorMm:end.distanceTo(this.targetMesh.position)*1000,
       via:src.hand?'hand-touch':'controller-touch'});
     }
    }
   }
   if(this.menuDrag){this.updateMenuDrag();this.setHover('move-menu',this.menuDrag?.record?.source);}
   else if(this.teleportState)this.setHover(null,null);
   else this.setHover(nearestHover,nearestHoverSource);
   // Side panel is quiet while the participant focuses on moving objects.
   const hudEngaged=Boolean(this.menuDrag?.panel===this.hudPanel||
    (nearestHover&&this.panel===this.hudPanel)||this.isPaused);
   this.hudPanel.material.opacity=THREE.MathUtils.lerp(this.hudPanel.material.opacity,
    hudEngaged?1:.53,.22);
  }
  this.renderer.render(this.scene,this.camera);
 }
}
