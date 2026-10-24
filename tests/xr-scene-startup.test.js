import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// This test catches unresolved variables in the real Three.js scene setup,
// even when Node --check passes (as it did with `ambient` in v0.10.0).
test('lobby construction returns the ambient and other active lights', () => {
 const code=readFileSync(new URL('../js/scene.js',import.meta.url),'utf8');
 const start=code.indexOf('function makeWorld(scene){');
 const end=code.indexOf('\n// Model and input',start);
 assert.ok(start>0&&end>start,'Could not locate makeWorld');
 const objects=[];
 class Vec {set(){return this;}}
 class Obj { constructor(){this.position=new Vec();this.rotation={};} add(...children){objects.push(...children);} }
 class World extends Obj {}
 class Mesh extends Obj {constructor(g,m){super();this.geometry=g;this.material=m;}}
 class Light extends Obj {constructor(...a){super();this.args=a;}}
 class Any {}
 const THREE={
  Group:World,Mesh,Color:Any,FogExp2:Any,HemisphereLight:Light,
  DirectionalLight:Light,PointLight:Light,CircleGeometry:Any,
  MeshStandardMaterial:Any,MeshBasicMaterial:Any,TorusGeometry:Any,
  CylinderGeometry:Any,ConeGeometry:Any,
 };
 const ctx={THREE,PINK:0xff62c4,CYAN:0x73dcff,material:(color)=>new Any(),addMesh:null};
 // Include the real addMesh helper; test uses its production body too.
 const addStart=code.indexOf('function addMesh(');
 const addEnd=code.indexOf('\nfunction roundedText',addStart);
 assert.ok(addStart>0&&addEnd>addStart);
 const source=code.slice(addStart,addEnd)+'\n'+code.slice(start,end)+'\nresult=makeWorld(scene);';
 ctx.scene=new World();
 const result=vm.runInNewContext(source,ctx,{timeout:1000});
 assert.ok(ctx.result.ambient instanceof Light);
 assert.ok(ctx.result.keyLight instanceof Light);
 assert.ok(ctx.result.accentLight instanceof Light);
 assert.ok(objects.includes(ctx.result.ambient),'Ambient light must be attached to the scene');
});
