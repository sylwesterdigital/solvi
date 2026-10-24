/** Pure, dependency-free logic usable from Node tests and the browser. */
export class Staircase {
  constructor({levels=10, level=2, upAfter=3}={}) {this.levels=levels;this.level=Math.max(0,Math.min(levels-1,level));this.upAfter=upAfter;this.streak=0;}
  update(success){ if(success){this.streak++; if(this.streak>=this.upAfter){this.level=Math.min(this.levels-1,this.level+1);this.streak=0;}}else{this.level=Math.max(0,this.level-1);this.streak=0;}return this.level;}
}
export function scoreReach({hit,endpointErrorMm=0,radiusMm=80}) {if(!hit)return 0;return 10+Math.max(0,Math.min(5,Math.round(5*(1-endpointErrorMm/Math.max(1,radiusMm)))));}
export function csvEscape(x) {const val = x===null||x===undefined?'':typeof x==='object'?JSON.stringify(x):String(x);return /[",\r\n]/.test(val)?`"${val.replaceAll('"','""')}"`:val;}
export function toCSV(records,fields){const cols=fields||[...new Set(records.flatMap(item=>Object.keys(item)))];return [cols.map(csvEscape).join(','),...records.map(item=>cols.map(field=>csvEscape(item[field])).join(','))].join('\r\n')+'\r\n';}
export function participantValid(value){return /^P\d{3}$/.test(value);}
export function clamp(n,min,max){return Math.min(max,Math.max(min,n));}
export function nowISO(){return new Date().toISOString();}
