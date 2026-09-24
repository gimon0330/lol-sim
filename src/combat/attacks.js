import * as THREE from '../../vendor/three.module.js';
export const BASIC_ATTACK = Object.freeze({damage:30,range:25,interval:0.8,windup:0.18,speed:38,color:0x9deeff});
export const isAlive = e => !!e && e.alive!==false && e.health>0;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function nearestEnemy(enemies,point){
  let best=null,minimum=Infinity;
  for(const e of enemies)if(isAlive(e)){const d=distance(e.position,point);if(d<minimum){best=e;minimum=d;}}
  return best;
}
export class AttackSystem {
  constructor({hero,getEnemies,onEvent=()=>{}}){
    this.hero=hero;this.getEnemies=getEnemies;this.onEvent=onEvent;
    this.time=0;this.readyAt=0;this.target=null;this.anchor=null;this.pending=null;this.projectiles=[];this.nextId=0;
  }
  emit(type,data={}){this.onEvent({type,...data});}
  get winding(){return !!this.pending;}
  valid(e){return isAlive(e)&&this.getEnemies().includes(e);}
  select(enemy){
    if(enemy!==this.target)this.cancelWindup();
    this.anchor=null;this.target=this.valid(enemy)?enemy:null;
  }
  attackMove(point){this.cancelWindup();this.anchor=point.clone();this.target=nearestEnemy(this.getEnemies(),point);}
  cancelWindup(){if(this.pending){this.pending=null;this.readyAt=this.time;this.emit('cancelAttack');}}
  cancel(){this.cancelWindup();this.target=null;this.anchor=null;}
  refreshTarget(){
    if(!this.valid(this.target)){
      this.cancelWindup();this.target=this.anchor?nearestEnemy(this.getEnemies(),this.anchor):null;
    }
    return this.target;
  }
  update(dt,canAttack=true){
    let left=dt;
    while(left>1e-9){const step=Math.min(left,1/120);this.step(step,canAttack);left-=step;}
  }
  step(dt,canAttack){
    this.time+=dt;this.refreshTarget();
    // Already launched homing bolts survive movement/casting orders.
    for(let i=this.projectiles.length-1;i>=0;i--){
      const p=this.projectiles[i];p.age+=dt;
      if(!this.valid(p.target)||p.age>5){this.remove(i);continue;}
      const delta=new THREE.Vector3(p.target.position.x-p.position.x,0,p.target.position.z-p.position.z);
      const d=delta.length(),step=BASIC_ATTACK.speed*dt;
      p.direction.copy(delta).normalize();
      if(d<=step+(p.target.radius??0.65)){
        p.target.health=Math.max(0,p.target.health-BASIC_ATTACK.damage);
        if(p.target.health===0)p.target.alive=false;
        this.emit('damage',{key:'A',enemy:p.target,damage:BASIC_ATTACK.damage});
        this.emit('impact',{key:'A',position:p.target.position.clone()});this.remove(i);
      }else p.position.addScaledVector(p.direction,step);
    }
    if(!canAttack){this.cancelWindup();return;}
    if(this.pending){
      if(!this.valid(this.pending.target)||distance(this.hero.position,this.pending.target.position)>BASIC_ATTACK.range){this.cancelWindup();return;}
      if(this.time>=this.pending.releaseAt-1e-9){
        const target=this.pending.target;this.pending=null;
        const p={id:'attack-'+(++this.nextId),key:'A',target,position:this.hero.position.clone(),direction:new THREE.Vector3(),age:0};
        p.position.y=1.45;p.direction.subVectors(target.position,p.position);p.direction.y=0;p.direction.normalize();
        this.projectiles.push(p);this.emit('projectile',{projectile:p});
      }
    }
    if(!this.pending&&this.valid(this.target)&&this.time>=this.readyAt-1e-9&&distance(this.hero.position,this.target.position)<=BASIC_ATTACK.range){
      this.pending={target:this.target,releaseAt:this.time+BASIC_ATTACK.windup};
      this.readyAt=this.time+BASIC_ATTACK.interval;
      this.emit('cast',{key:'A',direction:new THREE.Vector3().subVectors(this.target.position,this.hero.position).setY(0).normalize()});
    }
  }
  remove(index){const [projectile]=this.projectiles.splice(index,1);this.emit('removeProjectile',{projectile});}
  reset(){this.cancel();this.readyAt=this.time;while(this.projectiles.length)this.remove(this.projectiles.length-1);}
}
