import test from 'node:test';import assert from 'node:assert/strict';
import {Staircase,scoreReach,toCSV,participantValid} from '../js/core.js';
test('3 successes increase difficulty, one failure reduces it',()=>{const s=new Staircase({levels:10,level:3});assert.equal(s.update(true),3);assert.equal(s.update(true),3);assert.equal(s.update(true),4);assert.equal(s.update(false),3);});
test('level saturates at boundaries',()=>{const s=new Staircase({levels:2,level:1});for(let i=0;i<15;i++)s.update(true);assert.equal(s.level,1);for(let i=0;i<15;i++)s.update(false);assert.equal(s.level,0);});
test('score rewards precision, not speed',()=>{assert.equal(scoreReach({hit:false}),0);assert.equal(scoreReach({hit:true,endpointErrorMm:0}),15);assert.equal(scoreReach({hit:true,endpointErrorMm:80}),10);});
test('CSV quotes commas, double quotes and newlines',()=>{const csv=toCSV([{name:'X,"Y"',value:'one\ntwo'}],['name','value']);assert.match(csv,/"X,""Y"""/);assert.match(csv,/"one\ntwo"/);});
test('participant codes are pseudonymous',()=>{assert.ok(participantValid('P001'));assert.ok(!participantValid('Alice'));});
