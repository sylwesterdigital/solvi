import test from 'node:test';
import assert from 'node:assert/strict';
import {layoutForView,isChallengeView,nearestActionHit} from '../js/xr-ui-policy.js';

test('exercise collapses the large lobby menu into a compact HUD',()=>{
 const challenge=layoutForView({mode:'challenge'});
 const lobby=layoutForView({title:'Solvi XR lobby'});
 assert.ok(challenge.height<lobby.height/2);
 assert.ok(challenge.width<lobby.width);
 assert.ok(isChallengeView({mode:'challenge'}));
 assert.ok(!isChallengeView({mode:'pause'}));
});
test('near foreground target wins over a menu button hit',()=>{
 assert.equal(nearestActionHit({distance:1.6,region:{action:'pause'}},{distance:.5}),'target');
 assert.equal(nearestActionHit({distance:.6,region:{action:'pause'}},{distance:1.2}),'menu');
});
test('unselectable menu surface cannot swallow an exercise target',()=>{
 assert.equal(nearestActionHit({distance:.4,region:undefined},{distance:.5}),'target');
 assert.equal(nearestActionHit(null,{distance:.7}),'target');
 assert.equal(nearestActionHit({distance:.7,region:{action:'pause'}},null),'menu');
 assert.equal(nearestActionHit(null,null),null);
});
