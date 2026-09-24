import * as THREE from '../../vendor/three.module.js';

// User-defined Q/W rules; all other numbers are explicitly provisional.
export const SPELLS = Object.freeze({
  Q: {name:'신비한 화살', damage:50, cooldown:3, range:45, speed:40, radius:0.40, windup:0.15, recovery:0.15, color:0x67eaff},
  W: {name:'정수의 흐름', damage:0, cooldown:6, range:45, speed:30, radius:0.65, windup:0.15, recovery:0.15, color:0xffd46b, markDuration:5, markDamage:100},
  E: {name:'비전 이동', damage:50, cooldown:10, range:25, attackRange:25, speed:45, radius:0.3, windup:0, recovery:0.25, color:0x85eaff},
  R: {name:'정조준 일격', damage:200, cooldown:20, range:120, speed:35, radius:2.4, windup:1, recovery:1, color:0xffe49c},
});
const alive = enemy => enemy && enemy.alive !== false && enemy.health > 0;
const flatDistance = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);

// First intersection along a swept XZ segment, including starting inside a collider.
export function segmentHit(a,b,center,radius) {
  const dx=b.x-a.x,dz=b.z-a.z,ox=a.x-center.x,oz=a.z-center.z;
  const c=ox*ox+oz*oz-radius*radius;
  if(c<=0)return 0;
  const aa=dx*dx+dz*dz;if(aa<1e-12)return null;
  const bb=2*(ox*dx+oz*dz),discriminant=bb*bb-4*aa*c;
  if(discriminant<0)return null;
  const t=(-bb-Math.sqrt(discriminant))/(2*aa);
  return t>=0&&t<=1?t:null;
}

/** Enemies are injected by the next game feature; this module never spawns them.
 * Enemy: {position: Vector3, radius: number, health: number, alive?: boolean}.
 * Events keep rendering separate from the combat rules.
 */
export class SpellSystem {
  constructor({hero,getEnemies=()=>[],bounds=18.5,onEvent=()=>{}}) {
    this.hero=hero;this.getEnemies=getEnemies;this.bounds=bounds;this.onEvent=onEvent;
    this.time=0;this.readyAt={Q:0,W:0,E:0,R:0};this.lockUntil=0;
    this.pending=null;this.projectiles=[];this.marks=new Map();this.nextId=0;
  }
  cooldown(key){return Math.max(0,this.readyAt[key]-this.time);}
  get busy(){return this.time<this.lockUntil-1e-9;}
  get casting(){return this.pending?.key||null;}
  emit(type,data={}){this.onEvent({type,...data});}
  destination(aim){
    const delta=new THREE.Vector3(aim.x-this.hero.position.x,0,aim.z-this.hero.position.z);
    if(delta.length()>SPELLS.E.range)delta.setLength(SPELLS.E.range);
    const result=this.hero.position.clone().add(delta);result.y=0;
    result.x=THREE.MathUtils.clamp(result.x,-this.bounds,this.bounds);
    result.z=THREE.MathUtils.clamp(result.z,-this.bounds,this.bounds);
    return result;
  }
  cast(key,aim){
    if(!SPELLS[key]||this.busy||this.cooldown(key)>1e-8||!Number.isFinite(aim?.x)||!Number.isFinite(aim?.z))return false;
    const cfg=SPELLS[key];
    const direction=new THREE.Vector3(aim.x-this.hero.position.x,0,aim.z-this.hero.position.z);
    if(direction.lengthSq()<1e-8)direction.set(Math.sin(this.hero.rotation.y),0,Math.cos(this.hero.rotation.y));
    direction.normalize();
    this.hero.rotation.y=Math.atan2(direction.x,direction.z);
    this.readyAt[key]=this.time+cfg.cooldown;this.lockUntil=this.time+cfg.recovery;
    this.emit('cast',{key,direction:direction.clone()});
    if(key==='E'){
      const from=this.hero.position.clone();this.hero.position.copy(this.destination(aim));
      this.emit('blink',{from,to:this.hero.position.clone()});
      const enemies=this.getEnemies().filter(e=>alive(e)&&flatDistance(e.position,this.hero.position)<=cfg.attackRange);
      enemies.sort((a,b)=>Number(this.hasMark(b))-Number(this.hasMark(a))||flatDistance(a.position,this.hero.position)-flatDistance(b.position,this.hero.position));
      if(enemies[0])this.launch(key,direction,enemies[0]);
    }else this.pending={key,direction,releaseAt:this.time+cfg.windup};
    return true;
  }
  hasMark(enemy){return (this.marks.get(enemy)||0)>this.time;}
  launch(key,direction,target=null){
    const p={id:++this.nextId,key,position:this.hero.position.clone(),direction:direction.clone(),target,traveled:0,age:0,hit:new Set()};
    p.position.y=1.45;this.projectiles.push(p);this.emit('projectile',{projectile:p});
  }
  applyHit(key,enemy){
    if(!alive(enemy))return;
    if(key==='W'){
      this.marks.set(enemy,this.time+SPELLS.W.markDuration);
      this.emit('mark',{enemy,expiresAt:this.marks.get(enemy)});return;
    }
    const bonus=this.hasMark(enemy)?SPELLS.W.markDamage:0;
    if(bonus){this.marks.delete(enemy);this.emit('detonate',{enemy});}
    const damage=SPELLS[key].damage+bonus;
    enemy.health=Math.max(0,enemy.health-damage);
    if(enemy.health===0)enemy.alive=false;
    this.emit('damage',{key,enemy,damage,baseDamage:SPELLS[key].damage,bonus});
    if(key==='Q'){
      for(const spell of Object.keys(SPELLS))this.readyAt[spell]=Math.max(this.time,this.readyAt[spell]-1);
      this.emit('cooldownReduction',{seconds:1});
    }
  }
  update(dt){
    if(!Number.isFinite(dt)||dt<=0)return;
    // Swept tests prevent tunneling; small time steps make homing and expiry stable.
    let remaining=dt;
    while(remaining>1e-9){const step=Math.min(remaining,1/120);this.step(step);remaining-=step;}
  }
  step(dt){
    this.time+=dt;
    for(const [enemy,expiry] of this.marks)if(expiry<=this.time||!alive(enemy)||!this.getEnemies().includes(enemy)){
      this.marks.delete(enemy);this.emit('unmark',{enemy});
    }
    // Advance already-flying shots before releasing a newly finished cast.
    for(let i=this.projectiles.length-1;i>=0;i--){
      const p=this.projectiles[i],cfg=SPELLS[p.key];p.age+=dt;
      if(p.target){
        if(!alive(p.target)||!this.getEnemies().includes(p.target)){this.removeProjectile(i);continue;}
        p.direction.set(p.target.position.x-p.position.x,0,p.target.position.z-p.position.z).normalize();
      }
      const from=p.position.clone(),distance=Math.min(cfg.speed*dt,cfg.range-p.traveled);
      const to=from.clone().addScaledVector(p.direction,distance);
      const candidates=p.target?[p.target]:this.getEnemies();
      const hits=[];
      for(const enemy of candidates){
        if(!alive(enemy)||p.hit.has(enemy))continue;
        const t=segmentHit(from,to,enemy.position,(enemy.radius??0.65)+cfg.radius);
        if(t!==null)hits.push({enemy,t});
      }
      hits.sort((a,b)=>a.t-b.t);
      let consumed=false;
      for(const {enemy,t} of hits){
        p.hit.add(enemy);this.applyHit(p.key,enemy);
        this.emit('impact',{key:p.key,position:from.clone().lerp(to,t)});
        if(p.key!=='R'){consumed=true;break;}
      }
      p.position.copy(to);p.traveled+=distance;
      if(consumed||p.traveled>=cfg.range-1e-8||p.age>8)this.removeProjectile(i);
    }
    if(this.pending&&this.pending.releaseAt<=this.time+1e-9){
      const {key,direction}=this.pending;this.pending=null;this.launch(key,direction);
    }
  }
  removeProjectile(index){const [projectile]=this.projectiles.splice(index,1);this.emit('removeProjectile',{projectile});}
  reset(){
    while(this.projectiles.length)this.removeProjectile(this.projectiles.length-1);
    for(const enemy of this.marks.keys())this.emit('unmark',{enemy});
    this.marks.clear();this.pending=null;this.lockUntil=this.time;
    for(const key of Object.keys(SPELLS))this.readyAt[key]=this.time;
    this.emit('reset');
  }
}
