import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {AttackSystem,BASIC_ATTACK,nearestEnemy} from '../src/combat/attacks.js';
import {EnemySystem,ENEMY_CONFIG} from '../src/enemies/enemies.js';
import {HoldCamera,smoothAngle} from '../src/motion.js';
const point=(x=0,z=0)=>new THREE.Vector3(x,0,z);
const enemy=(x,z=0)=>({position:point(x,z),health:200,alive:true,radius:0.65});
const setup=(enemies)=>{const hero=new THREE.Group(),events=[];return {hero,events,a:new AttackSystem({hero,getEnemies:()=>enemies,onEvent:e=>events.push(e)})};};
{
  const nearHero=enemy(1),nearClick=enemy(20);
  assert.equal(nearestEnemy([nearHero,nearClick],point(19)),nearClick);
  const {a}=setup([nearHero,nearClick]);a.attackMove(point(19));assert.equal(a.target,nearClick);
  a.update(0.8);assert.equal(nearClick.health,170);assert.equal(nearHero.health,200);
  a.update(0.8);assert.equal(nearClick.health,140);
  nearClick.alive=false;a.update(0.01);assert.equal(a.target,nearHero);
  a.cancel();assert.equal(a.target,null);assert.equal(a.anchor,null);
}
{
  const e=enemy(10),{a}=setup([e]);a.select(e);a.update(0.1);assert(a.winding);
  a.cancel();a.update(1);assert.equal(e.health,200);assert.equal(a.projectiles.length,0);
  a.select(e);a.update(0.2);assert.equal(a.projectiles.length,1);
  a.cancel();a.update(0.5);assert.equal(e.health,170); // Released bolt persists.
}
{
  const e=enemy(30),{a,hero}=setup([e]);a.select(e);a.update(1);assert(!a.winding);assert.equal(e.health,200);
  hero.position.x=6;a.update(0.2);assert.equal(a.projectiles.length,1);
  a.update(1);assert(e.health<200);
}
{
  const e=enemy(5),{a}=setup([e]);a.select(e);a.update(0.1);a.update(1,false);assert.equal(e.health,200);
  a.update(0.2);e.alive=false;a.update(0.5);assert.equal(a.projectiles.length,0);assert.equal(a.target,null);
  a.reset();assert(!a.winding);assert.equal(a.anchor,null);
}
{
  const enemies=[],{a}=setup(enemies);a.attackMove(point(5));a.update(1);assert.equal(a.target,null);
  const e=enemy(6);enemies.push(e);a.update(0.5);assert.equal(e.health,170);
}
{
  const scene=new THREE.Scene(),hero=new THREE.Group(),system=new EnemySystem(scene,hero,{random:()=>0.5});
  assert.equal(system.enemies.length,4);
  assert.deepEqual(system.enemies.map(e=>[e.position.x,e.position.z]),[[18.2,0],[-18.2,0],[0,18.2],[0,-18.2]]);
  const before=system.enemies.map(e=>e.position.length());system.update(1,new THREE.PerspectiveCamera());
  system.enemies.forEach((e,i)=>assert(e.position.length()<before[i]));
  system.enemies[0].health=0;system.update(0.01);assert.equal(system.kills,1);assert.equal(system.enemies.length,3);
  for(let i=0;i<100;i++)system.update(0.1);
  assert(system.enemies.length<=ENEMY_CONFIG.maxAlive);
  while(system.enemies.length<ENEMY_CONFIG.maxAlive)system.spawn();assert.equal(system.spawn(),null);
  const live=system.enemies[0];scene.updateMatrixWorld(true);
  const ray=new THREE.Raycaster(live.position.clone().add(new THREE.Vector3(0,5,0)),new THREE.Vector3(0,-1,0));
  assert.equal(system.pick(ray),live);
  system.reset();assert.equal(system.kills,0);assert.equal(system.enemies.length,4);
}
{
  const follow=new HoldCamera(),focus=point(),hero=point(10);
  follow.update(focus,hero,1);assert.equal(focus.x,0);
  follow.press();for(let i=0;i<60;i++)follow.update(focus,hero,1/60);assert(Math.abs(focus.x-10)<1e-7);
  hero.x=20;follow.update(focus,hero,1/60);assert(focus.x>10);
  follow.release();const frozen=focus.x;hero.x=30;follow.update(focus,hero,1);assert.equal(focus.x,frozen);
  const a=smoothAngle(0,2,1/30),b=smoothAngle(smoothAngle(0,2,1/60),2,1/60);assert(Math.abs(a-b)<1e-10);
  assert(smoothAngle(Math.PI-0.1,-Math.PI+0.1,0.1)>Math.PI-0.1);
}
console.log('PASS: click-point targeting, repeat attacks, retarget, range, windup cancellation, released shots, spell lock, empty attack move, four-side spawning, pursuit, death/cap/reset/picking, held/released camera, framerate-independent turning.');
