import assert from 'node:assert/strict';
import {EdgeCamera} from '../src/motion.js';
const focus=()=>({x:0,z:0});
for(const [x,y,sx,sz] of [[999,400,1,-1],[0,400,-1,1],[500,0,-1,-1],[500,799,1,1]]){
 const c=new EdgeCamera(),f=focus();c.move(x,y);assert(c.update(f,1,1000,800));assert.equal(Math.sign(f.x),sx);assert.equal(Math.sign(f.z),sz);
}
const c=new EdgeCamera(),f=focus();c.move(999,0);c.update(f,1,1000,800);assert(Math.hypot(f.x,f.z)<=18+1e-8);
const simulate=n=>{const c=new EdgeCamera(),f=focus();c.move(999,400);for(let i=0;i<n;i++)c.update(f,1/n,1000,800);return f;};
assert(Math.abs(simulate(30).x-simulate(144).x)<1e-8);
c.move(500,400);assert(!c.update(f,1,1000,800));c.move(999,400);assert(!c.update(f,1,1000,800,true));
c.clear();assert(!c.update(f,1,1000,800));c.move(1001,400);assert(!c.update(f,1,1000,800));
c.move(999,400);for(let i=0;i<100;i++)c.update(f,1,1000,800);assert(f.x<=20&&f.z>=-20);
console.log('PASS: four edges, diagonal speed, frame independence, Space override, leave/blur clearing, bounds');
