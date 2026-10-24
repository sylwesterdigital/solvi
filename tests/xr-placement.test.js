import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseFloorY,placementFromEye} from '../js/xr-placement.js';
const f={x:0,y:0,z:-1},r={x:1,y:0,z:0};
test('head tracked at seated height: menu stays at eye height and feet stay at floor',()=>{
 const eye={x:0,y:1.13,z:0};const p=placementFromEye(eye,f,r);
 assert.equal(p.floorY,0);assert.ok(p.menu.y>0.9);assert.equal(p.cat.y,0);
});
test('head tracked at standing height: menu remains in view',()=>{
 const p=placementFromEye({x:0,y:1.78,z:0},f,r);
 assert.ok(p.menu.y>1.5);assert.equal(p.cat.y,0);
});
test('local fallback uses estimated floor only when floor tracking is unavailable',()=>{
 const p=placementFromEye({x:0,y:0,z:0},f,r,{hasLocalFloor:false});
 assert.equal(p.floorY,-1.25);assert.equal(p.cat.y,p.floorY);
 assert.ok(p.menu.y>0);
});
test('rejects a missing or invalid headset pose rather than placing a menu in the floor',()=>{
 assert.throws(()=>placementFromEye(null,f,r));
 assert.throws(()=>chooseFloorY(NaN));
});

test('default wall menu is exactly in front of the user, and the companion stands beside it',()=>{
 const p=placementFromEye({x:0,y:1.3,z:0},f,r);
 assert.equal(p.menu.x,0);assert.equal(p.menu.z,-2.65);
 assert.ok(p.cat.x>1.6);
});

test('large 2.18m menu never sinks below tracked floor in seated play',()=>{
 const p=placementFromEye({x:0,y:.98,z:0},f,r);
 assert.ok(p.menu.y-2.18/2>=0);
});
