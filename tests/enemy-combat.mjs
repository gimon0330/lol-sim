import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {EnemySystem} from '../src/enemies/enemies.js';
import {EnemyCombat,PlayerState,HOSTILE} from '../src/combat/enemy-combat.js';
const setup=(kind='lux',distance=10)=>{
 const scene=new THREE.Scene(),hero=new THREE.Group(),player=new PlayerState();player.invulnerable=0;
 const e={kind,position:new THREE.Vector3(distance,0,0),health:500,alive:true};const enemies=[e];
 const combat=new EnemyCombat({scene,hero,getEnemies:()=>enemies,player});
 const tick=seconds=>{for(let t=0;t<seconds-1e-8;t+=1/120){player.update(1/120);combat.update(1/120);}};
 const only=key=>{combat.step(0.001);const state=combat.states.get(e);for(const k in state.ready)state.ready[k]=100;state.ready[key]=0;state.gap=0;};
 return {scene,hero,player,e,enemies,combat,tick,only};
};
{
 const s=setup('minion',1.5);s.tick(0.2);assert.equal(s.player.health,600);s.tick(0.2);assert.equal(s.player.health,588);assert.equal(s.combat.effects.length,0);
 s.tick(1.4);assert(s.player.health<588);s.combat.reset();assert.equal(s.e.casting,null);
}
{
 const s=setup('minion',1.5);s.tick(0.2);s.hero.position.x=-10;s.tick(0.5);assert.equal(s.player.health,600,'melee misses when target leaves range');
}
{
 const s=setup();s.only('Q');s.tick(1.3);assert.equal(s.player.health,550);assert(s.player.rooted>0);s.tick(2);assert.equal(s.player.rooted,0);
}
{
 const s=setup();s.only('Q');s.tick(0.2);s.hero.position.z=8;s.tick(3);assert.equal(s.player.health,600,'Q does not home');assert.equal(s.combat.effects.length,0);
}
for(const key of ['E','R']){
 const s=setup();s.only(key);s.tick(0.5);assert.equal(s.player.health,600,'telegraph before damage');
 s.tick(1.5);assert.equal(s.player.health,600-HOSTILE[key].damage);s.tick(0.6);assert.equal(s.player.health,600-HOSTILE[key].damage,'one hit only');assert.equal(s.scene.children.length,0);
 const dodge=setup();dodge.only(key);dodge.tick(0.5);dodge.hero.position.z=10;dodge.tick(2);assert.equal(dodge.player.health,600,key+' can be dodged');
}
{
 const s=setup();s.only('E');s.tick(0.6);assert(s.player.slowed>0);s.hero.position.z=10;s.tick(0.3);assert.equal(s.player.slowed,0);
}
{
 const s=setup();s.only('R');s.tick(0.2);s.e.health=0;s.tick(2);assert.equal(s.player.health,600);assert.equal(s.scene.children.length,0,'dead Lux cancels windup');
}
{
 const s=setup();s.only('Q');s.tick(0.2);s.e.health=0;s.tick(2);assert.equal(s.player.health,600,'dead Lux cannot release pending Q');
}
{
 const s=setup();s.only('R');s.tick(0.2);let disposed=0;for(const f of s.combat.effects){f.mesh.geometry.addEventListener('dispose',()=>disposed++);f.mesh.material.addEventListener('dispose',()=>disposed++);}
 s.combat.reset();assert.equal(disposed,2);assert.equal(s.scene.children.length,0);assert.equal(s.combat.states.size,0);
 s.player.hit(999);assert(s.player.dead);s.player.update(3);assert(s.player.deadFor>=3);s.player.reset();assert.equal(s.player.health,600);assert.equal(s.player.rooted,0);
}
{
 const scene=new THREE.Scene(),hero=new THREE.Group(),system=new EnemySystem(scene,hero,{random:()=>0.5});
 assert.equal(system.enemies.filter(e=>e.kind==='minion').length,4);const lux=system.enemies.find(e=>e.kind==='lux');assert(lux);assert.equal(lux.health,500);assert.equal(lux.character.root.name,'Lux');
 lux.health=0;system.update(0.1);assert(!system.enemies.includes(lux));for(let i=0;i<130;i++)system.update(0.1);assert.equal(system.enemies.filter(e=>e.kind==='lux').length,1);
 system.reset();assert.equal(system.enemies.length,5);assert.equal(system.kills,0);
 scene.updateMatrixWorld(true);scene.traverse(o=>assert(o.matrixWorld.elements.every(Number.isFinite)));
}
console.log('PASS: melee windup/range/repeat, Q hit/root/dodge, E slow/explode/dodge, R warning/hit/dodge/death cancellation, single damage, cleanup, player reset, Lux spawn/respawn/model');

{
 const s=setup();s.hero.position.z=5;s.only('R');s.tick(0.1);
 const fx=s.combat.effects[0];fx.mesh.updateMatrixWorld(true);
 const a=new THREE.Vector3(0,-25,0).applyMatrix4(fx.mesh.matrixWorld);
 const b=new THREE.Vector3(0,25,0).applyMatrix4(fx.mesh.matrixWorld);
 assert(Math.abs(b.sub(a).normalize().dot(fx.direction))>0.999999,'beam telegraph aligns with damage segment');
}
