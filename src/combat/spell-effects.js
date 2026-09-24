import * as THREE from '../../vendor/three.module.js';
import { SPELLS } from './spells.js';

export class SpellEffects {
  constructor(scene,hero){this.scene=scene;this.hero=hero;this.shots=new Map();this.marks=new Map();this.bursts=[];this.pose=null;}
  material(color,opacity=1){return new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});}
  add(parent,geometry,color,opacity=1){const m=new THREE.Mesh(geometry,this.material(color,opacity));parent.add(m);return m;}
  dispose(group){this.scene.remove(group);group.traverse(o=>{o.geometry?.dispose();if(o.material)o.material.dispose();});}
  burst(position,color,size=1){
    const g=new THREE.Group();g.position.copy(position);g.position.y=0.15;
    const circle=this.add(g,new THREE.TorusGeometry(size,0.08,6,32),color);circle.rotation.x=Math.PI/2;
    for(let i=0;i<8;i++){
      const m=this.add(g,new THREE.OctahedronGeometry(0.10),color);const a=i*Math.PI/4;
      m.position.set(Math.cos(a)*size,0.2,Math.sin(a)*size);
    }
    this.scene.add(g);this.bursts.push({group:g,age:0,life:0.5});
  }
  handle(event){
    const {type,key,projectile:p,enemy}=event;
    if(type==='cast')this.pose={key,age:0,duration:SPELLS[key].recovery+0.18};
    if(type==='projectile'){
      const group=new THREE.Group(),color=SPELLS[p.key].color;
      if(p.key==='W'){
        this.add(group,new THREE.TorusGeometry(0.48,0.09,8,32),color);
        const inner=this.add(group,new THREE.TorusGeometry(0.25,0.03,6,24),0xfff2b0);inner.rotation.y=Math.PI/3;
      }else if(p.key==='R'){
        const arc=this.add(group,new THREE.TorusGeometry(2.1,0.17,8,40,Math.PI),color);arc.rotation.x=Math.PI/2;
        const second=this.add(group,new THREE.TorusGeometry(1.8,0.08,6,40,Math.PI),0x71ddff);second.rotation.x=Math.PI/2;
        const glow=this.add(group,new THREE.SphereGeometry(1,12,8),0x79dcff,0.25);glow.scale.set(2.1,0.25,0.35);
      }else{
        const head=this.add(group,new THREE.OctahedronGeometry(0.29),color);head.scale.set(0.7,0.7,2.4);
        const tail=this.add(group,new THREE.ConeGeometry(0.16,1.7,8),color,0.55);tail.rotation.x=-Math.PI/2;tail.position.z=-0.85;
      }
      group.position.copy(p.position);this.scene.add(group);this.shots.set(p.id,{group,p});
    }
    if(type==='removeProjectile'){const shot=this.shots.get(p.id);if(shot){this.dispose(shot.group);this.shots.delete(p.id);}}
    if(type==='blink'){this.burst(event.from,0x65ceff,0.9);this.burst(event.to,0xffdd8a,1.1);}
    if(type==='impact')this.burst(event.position,SPELLS[key].color,0.45);
    if(type==='mark'){
      if(this.marks.has(enemy))return;
      const group=new THREE.Group();
      for(let i=0;i<2;i++){
        const ring=this.add(group,new THREE.TorusGeometry((enemy.radius??0.65)+0.35,0.07,6,32),0xffcd54);
        ring.rotation.set(Math.PI/2,i*0.45,0);ring.position.y=0.65+i*0.55;
      }
      this.scene.add(group);this.marks.set(enemy,group);
    }
    if(type==='detonate'){this.burst(enemy.position,0xffd256,1.2);this.removeMark(enemy);}
    if(type==='unmark')this.removeMark(enemy);
    if(type==='reset'){
      for(const burst of this.bursts)this.dispose(burst.group);
      this.bursts=[];this.pose=null;
    }
  }
  removeMark(enemy){const g=this.marks.get(enemy);if(g){this.dispose(g);this.marks.delete(enemy);}}
  update(dt,character){
    for(const {group,p} of this.shots.values()){
      group.position.copy(p.position);group.rotation.y=Math.atan2(p.direction.x,p.direction.z);
      if(p.key==='W')group.rotation.z=p.age*7;
    }
    for(const [enemy,group] of this.marks){group.position.copy(enemy.position);group.rotation.y+=dt*2;}
    for(let i=this.bursts.length-1;i>=0;i--){
      const b=this.bursts[i];b.age+=dt;
      if(b.age>=b.life){this.dispose(b.group);this.bursts.splice(i,1);continue;}
      b.group.scale.setScalar(1+b.age*3);
      b.group.traverse(o=>{if(o.material)o.material.opacity=1-b.age/b.life;});
    }
    if(this.pose){
      const pose=this.pose;pose.age+=dt;
      const weight=Math.min(1,pose.age/0.06)*Math.min(1,(pose.duration-pose.age)/0.14);
      if(weight<=0){this.pose=null;return;}
      const left=character.arms.find(a=>a.side===1);
      left.shoulder.rotation.x=THREE.MathUtils.lerp(left.shoulder.rotation.x,-Math.PI/2,weight);
      left.elbow.rotation.x=THREE.MathUtils.lerp(left.elbow.rotation.x,-0.12,weight);
      if(pose.key==='R'){
        const right=character.arms.find(a=>a.side===-1);
        right.shoulder.rotation.x=THREE.MathUtils.lerp(right.shoulder.rotation.x,-1.1,weight);
        right.elbow.rotation.x=-0.8*weight;
      }
    }
  }
}
