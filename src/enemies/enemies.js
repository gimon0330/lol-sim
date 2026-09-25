import * as THREE from '../../vendor/three.module.js';
import {createLux} from '../characters/lux.js';
import {isAlive} from '../combat/attacks.js';
export const ENEMY_CONFIG=Object.freeze({health:200,speed:1.65,spawnInterval:2.5,maxAlive:24,edge:18.2});
export class EnemySystem {
  constructor(scene,hero,{random=Math.random,includeLux=true}={}){
    this.includeLux=includeLux;this.luxTimer=0;this.scene=scene;this.hero=hero;this.random=random;this.enemies=[];this.elapsed=0;this.side=0;this.kills=0;
    this.geometries={body:new THREE.ConeGeometry(0.55,1.3,6),head:new THREE.IcosahedronGeometry(0.34,0),leg:new THREE.BoxGeometry(0.19,0.48,0.22),blade:new THREE.BoxGeometry(0.13,0.8,0.12),shield:new THREE.BoxGeometry(0.4,0.58,0.12),eye:new THREE.BoxGeometry(0.13,0.05,0.07),bar:new THREE.PlaneGeometry(1.05,0.09)};
    this.materials={steel:new THREE.MeshStandardMaterial({color:0xa8a5b4,metalness:0.7,roughness:0.4}),body:new THREE.MeshStandardMaterial({color:0x643854,roughness:0.85}),head:new THREE.MeshStandardMaterial({color:0xb18494}),leg:new THREE.MeshStandardMaterial({color:0x302b43}),eye:new THREE.MeshBasicMaterial({color:0xff8064}),bar:new THREE.MeshBasicMaterial({color:0xe36e77,depthTest:false}),back:new THREE.MeshBasicMaterial({color:0x201d2e,depthTest:false})};
    this.reset();
  }
  spawn(kind='minion'){
    if(this.enemies.length>=ENEMY_CONFIG.maxAlive)return null;
    const side=this.side++%4,along=(this.random()*2-1)*16,e=ENEMY_CONFIG.edge;
    const root=new THREE.Group();root.position.set(side===0?e:side===1?-e:along,0,side===2?e:side===3?-e:along);
    const model=new THREE.Group();root.add(model);
    const add=(geo,material,pos,parent=model)=>{const m=new THREE.Mesh(this.geometries[geo],this.materials[material]);m.position.set(...pos);m.castShadow=true;parent.add(m);return m;};
    add('blade','steel',[0.65,1.1,0.3]);add('shield','body',[-0.55,1,0.3]);
    add('body','body',[0,1,0]);add('head','head',[0,1.72,0]);
    for(const s of [-1,1])add('eye','eye',[s*0.14,1.75,0.28]);
    const legs=[];
    for(const side of [-1,1]){const joint=new THREE.Group();joint.position.set(side*0.23,0.52,0);model.add(joint);add('leg','leg',[0,-0.2,0],joint);legs.push({joint,side});}
    const bars=new THREE.Group();bars.position.y=2.35;root.add(bars);
    const back=add('bar','back',[0,0,0],bars),bar=add('bar','bar',[0,0,0.005],bars);back.renderOrder=4;bar.renderOrder=5;bar.castShadow=back.castShadow=false;
    let character=null;
    if(kind==='lux'){model.clear();character=createLux();model.add(character.root);legs.length=0;bars.position.y=3.1;}
    const enemy={kind,character,root,model,position:root.position,legs,bars,bar,radius:0.65,health:ENEMY_CONFIG.health,maxHealth:ENEMY_CONFIG.health,alive:true,phase:this.random()*6,hitTime:0};
    if(kind==='lux'){enemy.health=enemy.maxHealth=500;enemy.radius=0.75;}
    root.traverse(o=>{o.userData.enemy=enemy;});
    this.enemies.push(enemy);this.scene.add(root);return enemy;
  }
  removeDead(){
    for(let i=this.enemies.length-1;i>=0;i--)if(!isAlive(this.enemies[i])){this.scene.remove(this.enemies[i].root);this.enemies.splice(i,1);this.kills++;}
  }
  update(dt,camera){
    this.removeDead();this.elapsed+=dt;
    if(this.includeLux&&!this.enemies.some(e=>e.kind==='lux')){this.luxTimer+=dt;if(this.luxTimer>=12){if(this.spawn('lux'))this.luxTimer=0;}}else this.luxTimer=0;
    if(this.elapsed>=ENEMY_CONFIG.spawnInterval){this.elapsed%=ENEMY_CONFIG.spawnInterval;this.spawn();}
    const positions=this.enemies.map(e=>e.position.clone());
    for(let i=0;i<this.enemies.length;i++){
      const enemy=this.enemies[i],delta=new THREE.Vector3().subVectors(this.hero.position,enemy.position).setY(0),distance=delta.length();
      const velocity=new THREE.Vector3();
      if(!enemy.casting){
        if(enemy.kind==='lux'){if(distance>16)velocity.copy(delta).normalize().multiplyScalar(2.2);else if(distance<9)velocity.copy(delta).normalize().multiplyScalar(-2.2);}
        else if(distance>1.5)velocity.copy(delta).normalize().multiplyScalar(ENEMY_CONFIG.speed);
      }
      for(let j=0;j<positions.length;j++)if(i!==j&&!enemy.casting){
        const separation=new THREE.Vector3().subVectors(positions[i],positions[j]);const d=separation.length();
        if(d>0.001&&d<1.25)velocity.addScaledVector(separation,(1.25-d)/d*2);
      }
      const previous=enemy.position.clone();
      enemy.position.addScaledVector(velocity,dt);
      enemy.position.x=THREE.MathUtils.clamp(enemy.position.x,-18.5,18.5);enemy.position.z=THREE.MathUtils.clamp(enemy.position.z,-18.5,18.5);
      const walked=enemy.position.distanceTo(previous);enemy.phase+=walked*4;
      if(distance>0.01){const facing=enemy.casting?.direction||delta;const angle=Math.atan2(facing.x,facing.z);enemy.model.rotation.y+=Math.atan2(Math.sin(angle-enemy.model.rotation.y),Math.cos(angle-enemy.model.rotation.y))*(1-Math.exp(-12*dt));}
      for(const {joint,side} of enemy.legs)joint.rotation.x=Math.sin(enemy.phase)*0.5*side*Math.min(1,walked/(dt||1));
      enemy.model.position.y=(1-Math.cos(enemy.phase*2))*0.025;
      enemy.character?.animate(enemy.phase,!!enemy.casting);
      if(enemy.kind==='minion'&&enemy.casting)enemy.model.rotation.x=-0.3;else enemy.model.rotation.x=0;
      const fraction=enemy.health/enemy.maxHealth;enemy.bar.scale.x=fraction;enemy.bar.position.x=-(1-fraction)*0.525;
      if(camera)enemy.bars.quaternion.copy(camera.quaternion);
    }
  }
  pick(raycaster){
    const hits=raycaster.intersectObjects(this.enemies.map(e=>e.model),true);
    return hits.find(h=>isAlive(h.object.userData.enemy))?.object.userData.enemy||null;
  }
  reset(){for(const e of this.enemies)this.scene.remove(e.root);this.enemies.length=0;this.elapsed=0;this.side=0;this.kills=0;this.luxTimer=0;for(let i=0;i<4;i++)this.spawn();if(this.includeLux)this.spawn('lux');}
}
