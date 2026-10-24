import test from 'node:test';
import assert from 'node:assert/strict';
import {shouldShowMenuPointer,safeChallengePanelCenter,layoutForView} from '../js/xr-ui-policy.js';

test('no controller/hand ray while reaching without pointing at menu',()=>{
 assert.equal(shouldShowMenuPointer({panelVisible:true,panelHit:null}),false);
 assert.equal(shouldShowMenuPointer({panelVisible:false,panelHit:{distance:1.7}}),false);
 assert.equal(shouldShowMenuPointer({panelVisible:true,panelHit:{distance:1.7}}),true);
 assert.equal(shouldShowMenuPointer({panelVisible:true,panelHit:{distance:1.7},teleporting:true}),false);
 assert.equal(shouldShowMenuPointer({panelVisible:true,panelHit:{distance:1.7},targetHit:{distance:.5}}),false);
});
test('challenge HUD is readable yet smaller than main lobby',()=>{
 const c=layoutForView({mode:'challenge'});
 const lobby=layoutForView({mode:'lobby'});
 assert.equal(c.width,1.48);
 assert.equal(c.height,.59);
 assert.ok(c.width<lobby.width);
 assert.ok(c.height<lobby.height/2);
});
test('dragged challenge panel cannot cross central reaching zone',()=>{
 const eye={x:0,y:1.5,z:0},forward={x:0,y:0,z:-1},right={x:1,y:0,z:0};
 const centered=safeChallengePanelCenter({x:0,y:1.4,z:-2},eye,forward,right);
 assert.equal(centered.x,1.42);
 assert.equal(centered.z,-2);
 assert.equal(safeChallengePanelCenter({x:-2.2,y:1,z:-1.8},eye,forward,right).x,-2.2);
 assert.equal(safeChallengePanelCenter({x:-.3,y:1,z:-2},eye,forward,right).x,-1.42);
});
