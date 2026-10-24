import test from 'node:test';import assert from 'node:assert/strict';
import {referenceSpaceOffset,withinPlatform,ballisticSamples,findFloorCrossing,clampMenuCenter,thumbstickIntent} from '../js/xr-navigation.js';
test('reference-space teleport moves viewer to target in XY-stable floor space',()=>{
 assert.deepEqual(referenceSpaceOffset({x:0,z:0},{x:2,z:-3}),{x:-2,y:0,z:3});
 assert.deepEqual(referenceSpaceOffset({x:1,z:2},{x:1,z:2}),{x:0,y:0,z:0});
});
test('valid platform landing uses the floor disk rather than free-floating spots',()=>{
 assert.equal(withinPlatform({x:3,z:3},{x:0,z:0}),true);
 assert.equal(withinPlatform({x:5,z:0},{x:0,z:0}),false);
});
test('ballistic curve crosses the floor and interpolates its landing point',()=>{
 const samples=ballisticSamples({x:0,y:1.1,z:0},{x:0,y:-.1,z:-1});
 const hit=findFloorCrossing(samples,0);assert.ok(hit);assert.equal(hit.point.y,0);
 assert.ok(hit.point.z<-.5);assert.ok(hit.point.z>-9);
});
test('menu drag is kept inside a readable height range',()=>{
 const p=clampMenuCenter({x:1,y:-3,z:2},{floorY:.2});
 assert.equal(p.y,1.28);assert.equal(p.x,1);
});
test('teleport can be armed with stick click or axis deflection and released',()=>{
 assert.equal(thumbstickIntent([0,0,0,-.9],[]).pressed,true);
 assert.equal(thumbstickIntent([0,0,0,0],[null,null,null,{pressed:true}]).pressed,true);
 assert.equal(thumbstickIntent([0,0,0,0],[]).pressed,false);
});
