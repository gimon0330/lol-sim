import * as THREE from '../../vendor/three.module.js';
import {segmentHit} from './spells.js';
import {isAlive} from './attacks.js';
export const HOSTILE=Object.freeze({melee:{damage:12,range:2,windup:0.35,cooldown:1.3},Q:{damage:50,range:36,speed:15,radius:0.45,windup:0.45,cooldown:6},E:{damage:70,radius:3.5,windup:0.4,fuse:1.4,cooldown:9},R:{damage:120,range:50,radius:1.2,windup:1.2,cooldown:15}});
export class PlayerState {
 constructor(){this.reset();}
 reset(){this.health=this.maxHealth=600;this.rooted=0;this.slowed=0;this.flash=0;this.deadFor=0;this.invulnerable=1;}
 get dead(){return this.health<=0;}
 update(dt){for(const key of ['rooted','slowed','flash','invulnerable'])this[key]=Math.max(0,this[key]-dt);if(this.dead)this.deadFor+=dt;}
 hit(damage,root=0){if(this.dead||this.invulnerable>0)return;this.health=Math.max(0,this.health-damage);this.rooted=Math.max(this.rooted,root);this.flash=0.25;}
}
export class EnemyCombat {
 constructor({scene,hero,getEnemies,player}){Object.assign(this,{scene,hero,getEnemies,player});this.states=new Map();this.effects=[];}
 visual(type,position,direction){
  const material=new THREE.MeshBasicMaterial({color:type==='Q'?0xb7edff:type==='E'?0xd4a4ff:0xffce86,transparent:true,opacity:0.45,depthWrite:false,side:THREE.DoubleSide});
  const geometry=type==='Q'?new THREE.SphereGeometry(0.45,10,8):type==='E'?new THREE.RingGeometry(3.25,3.5,48):new THREE.PlaneGeometry(2.4,50);
  const mesh=new THREE.Mesh(geometry,material);mesh.position.copy(position);mesh.position.y=type==='Q'?1.2:0.12;
  if(type!=='Q')mesh.rotation.x=-Math.PI/2;
  if(type==='R'){mesh.position.addScaledVector(direction,25);mesh.rotation.z=Math.atan2(direction.x,direction.z);}
  this.scene.add(mesh);return mesh;
 }
 remove(i){const [fx]=this.effects.splice(i,1);this.scene.remove(fx.mesh);fx.mesh.geometry.dispose();fx.mesh.material.dispose();}
 reset(){while(this.effects.length)this.remove(this.effects.length-1);for(const e of this.states.keys())e.casting=null;this.states.clear();}
 start(enemy,key,state){
  const position=enemy.position.clone(),target=this.hero.position.clone();
  const direction=target.clone().sub(position).setY(0).normalize();if(!direction.lengthSq())direction.z=1;
  const cast={key,left:HOSTILE[key].windup,position,target,direction};enemy.casting=cast;
  state.ready[key]=HOSTILE[key].cooldown;state.gap=2;
  if(key==='R'){const fx={key:'R',left:cast.left,position,direction,source:enemy,mesh:this.visual('R',position,direction),fired:false};cast.fx=fx;this.effects.push(fx);}
 }
 update(dt){let remaining=dt;while(remaining>1e-9){const step=Math.min(remaining,1/60);this.step(step);remaining-=step;}}
 step(dt){
  const enemies=this.getEnemies();
  for(const e of this.states.keys())if(!enemies.includes(e)||!isAlive(e)){e.casting=null;this.states.delete(e);}
  for(const enemy of enemies){
   if(!isAlive(enemy))continue;
   let state=this.states.get(enemy);if(!state){state={ready:{melee:0,Q:1,E:3,R:7},gap:0,next:0};this.states.set(enemy,state);}
   for(const key in state.ready)state.ready[key]=Math.max(0,state.ready[key]-dt);state.gap=Math.max(0,state.gap-dt);
   const distance=enemy.position.distanceTo(this.hero.position);
   if(this.player.dead){enemy.casting=null;continue;}
   if(enemy.casting){
    const cast=enemy.casting;cast.left-=dt;
    if(cast.left<=1e-9){
     enemy.casting=null;
     if(cast.key==='melee'){if(distance<=HOSTILE.melee.range)this.player.hit(HOSTILE.melee.damage);}
     else if(cast.key==='Q')this.effects.push({key:'Q',position:cast.position.clone(),direction:cast.direction,traveled:0,mesh:this.visual('Q',cast.position,cast.direction)});
     else if(cast.key==='E')this.effects.push({key:'E',position:cast.target,left:HOSTILE.E.fuse,fired:false,mesh:this.visual('E',cast.target)});
    }
    continue;
   }
   if(enemy.kind==='lux'){
    if(distance<=28&&state.gap<=0){const order=['Q','E','R'];for(let i=0;i<3;i++){const n=(state.next+i)%3,key=order[n];if(state.ready[key]<=0){this.start(enemy,key,state);state.next=(n+1)%3;break;}}}
   }else if(distance<=HOSTILE.melee.range&&state.ready.melee<=0)this.start(enemy,'melee',state);
  }
  for(let i=this.effects.length-1;i>=0;i--){
   const fx=this.effects[i],cfg=HOSTILE[fx.key];
   if(fx.key==='Q'){
    const from=fx.position.clone();const travel=Math.min(cfg.speed*dt,cfg.range-fx.traveled);fx.position.addScaledVector(fx.direction,travel);fx.traveled+=travel;fx.mesh.position.set(fx.position.x,1.2,fx.position.z);
    if(!this.player.dead&&segmentHit(from,fx.position,this.hero.position,cfg.radius+0.65)!==null){this.player.hit(cfg.damage,1.3);this.remove(i);}else if(fx.traveled>=cfg.range)this.remove(i);
   }else{
    if(fx.key==='R'&&!fx.fired&&(!isAlive(fx.source)||!enemies.includes(fx.source)||this.player.dead)){this.remove(i);continue;}
    fx.left-=dt;
    if(fx.key==='E'&&!fx.fired&&fx.position.distanceTo(this.hero.position)<cfg.radius+0.65)this.player.slowed=0.1;
    if(!fx.fired&&fx.left<=1e-9){
     const hit=fx.key==='E'?fx.position.distanceTo(this.hero.position)<=cfg.radius+0.65:segmentHit(fx.position,fx.position.clone().addScaledVector(fx.direction,cfg.range),this.hero.position,cfg.radius+0.65)!==null;
     if(hit)this.player.hit(cfg.damage);
     fx.fired=true;fx.left=0.3;fx.mesh.material.opacity=0.95;
     if(fx.key==='R'){fx.mesh.position.y=1.1;fx.mesh.material.color.set(0xfff4d1);}else fx.mesh.scale.setScalar(1.08);
    }else if(fx.fired){fx.mesh.material.opacity=Math.max(0,fx.left/0.3);if(fx.left<=0)this.remove(i);}
   }
  }
 }
}
