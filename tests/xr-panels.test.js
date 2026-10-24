import test from 'node:test';
import assert from 'node:assert/strict';
import {visiblePanelsForView,layoutForView} from '../js/xr-ui-policy.js';
test('Reach challenge uses HUD only — lobby entirely hidden',()=>{
 assert.deepEqual(visiblePanelsForView({mode:'challenge'}),{lobby:false,hud:true});
 assert.deepEqual(visiblePanelsForView({title:'Lobby'}),{lobby:true,hud:false});
});
test('challenge panel dimensions remain separate from full lobby',()=>{
 assert.equal(layoutForView({mode:'challenge'}).height,.32);
 assert.equal(layoutForView({mode:'lobby'}).height,2.18);
});
