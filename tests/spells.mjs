import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {SpellSystem,SPELLS,segmentHit} from '../src/combat/spells.js';
const near=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const point=(x=0,z=0)=>new THREE.Vector3(x,0,z);
const enemy=(x,z)=>({position:point(x,z),radius:0.5,health:1000,alive:true});
function setup(enemies=[],bounds=100){const hero=new THREE.Group(),events=[];return{hero,events,system:new SpellSystem({hero,getEnemies:()=>enemies,bounds,onEvent:e=>events.push(e)})};}
{
  const target=enemy(0,5),{system:s,events}=setup([target]);
  assert(s.cast('W',point(0,10)));s.update(0.4);
  assert(s.hasMark(target));assert.equal(target.health,1000);
  s.readyAt.E=s.time+10;s.readyAt.R=s.time+20;
  assert(s.cast('Q',point(0,10)));assert(!s.cast('Q',point(0,10)));
  s.update(0.3);assert.equal(target.health,850);assert(!s.hasMark(target));
  near(s.cooldown('Q'),1.7);near(s.cooldown('W'),4.3);near(s.cooldown('E'),8.7);near(s.cooldown('R'),18.7);
  assert.equal(events.filter(e=>e.type==='damage')[0].bonus,100);
}
{
  const target=enemy(0,5),{system:s}=setup([target]);
  s.applyHit('W',target);s.update(4);s.applyHit('W',target);s.update(4.99);
  assert(s.hasMark(target));assert.equal(target.health,1000);
  s.update(0.02);assert(!s.hasMark(target));s.applyHit('Q',target);assert.equal(target.health,950);
}
{
  const a=enemy(0,5),b=enemy(0,10),{system:s}=setup([b,a]);
  s.cast('Q',point(0,20));s.update(1);
  assert.equal(a.health,950);assert.equal(b.health,1000);assert.equal(s.projectiles.length,0);
}
{
  const a=enemy(0,5),b=enemy(0,12),{system:s}=setup([a,b]);
  s.applyHit('W',a);assert(s.cast('R',point(0,100)));
  assert(!s.cast('E',point(5,0)));s.update(0.9);assert.equal(s.projectiles.length,0);
  s.update(0.2);assert.equal(s.projectiles.length,1);
  s.update(2);assert.equal(a.health,700);assert.equal(b.health,800);
  s.update(3);assert.equal(a.health,700);assert.equal(s.projectiles.length,0);
}
{
  const a=enemy(30,0),b=enemy(45,0),{system:s,hero,events}=setup([a,b]);
  s.applyHit('W',b);assert(s.cast('E',point(100,0)));near(hero.position.x,25);
  assert.equal(events.find(e=>e.type==='projectile').projectile.target,b);
  s.update(0.7);assert.equal(a.health,1000);assert.equal(b.health,850);
}
{
  const a=enemy(40,0),b=enemy(30,0),{system:s,events}=setup([a,b]);
  s.cast('E',point(25,0));assert.equal(events.find(e=>e.type==='projectile').projectile.target,b);
}
{
  const a=enemy(51,0),{system:s}=setup([a]);s.cast('E',point(25,0));assert.equal(s.projectiles.length,0);
}
{
  const {system:s,hero}=setup([],18.5);s.cast('E',point(100,100));
  near(hero.position.length(),25);assert(hero.position.x<=18.5&&hero.position.z<=18.5);
  s.reset();s.cast('E',point(-100,0));assert(hero.position.x>=-18.5);
}
{
  const {system:s}=setup();assert(!s.cast('Q',{x:NaN,z:0}));near(s.cooldown('Q'),0);
  s.cast('Q',point(0,100));s.update(2.9);assert(s.cooldown('Q')>0);s.update(0.1);near(s.cooldown('Q'),0);
  for(const key of Object.keys(SPELLS)){s.cast(key,point(0,10));s.update(1.2);}
  s.reset();assert.equal(s.projectiles.length,0);assert.equal(s.pending,null);assert(!s.busy);
  for(const key of Object.keys(SPELLS))near(s.cooldown(key),0);
}
{
  const a=enemy(10,0),{system:s}=setup([a]);s.cast('E',point(5,0));a.alive=false;s.update(0.1);assert.equal(s.projectiles.length,0);
  assert.equal(segmentHit(point(0,0),point(0,100),point(0,50),1),0.49);
  assert.equal(segmentHit(point(),point(),point(),1),0);
}
console.log('PASS: W→Q=150, Q all-cooldown reduction, W refresh/expiry, first-hit ordering, R charge/piercing/one-hit, E range/marked priority/nearest/no target/dead target, cooldown/reset, swept collision.');
