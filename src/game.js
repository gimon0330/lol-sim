import * as THREE from '../vendor/three.module.js';
import { createEzreal } from './characters/ezreal.js';
import { SPELLS, SpellSystem } from './combat/spells.js';
import { SpellEffects } from './combat/spell-effects.js';
import { AttackSystem, BASIC_ATTACK, isAlive } from './combat/attacks.js';
import { EnemySystem } from './enemies/enemies.js';
import { HoldCamera, smoothAngle } from './motion.js';

const canvas = document.querySelector('#world');
const enemyStats = document.querySelector('#enemy-stats');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (error) {
  document.querySelector('#error').hidden = false;
  throw error;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#101f26');
scene.fog = new THREE.Fog('#101f26', 48, 95);
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 140);
const focus = new THREE.Vector3(0, 0, 0);
let zoom = 0.8;
let cameraDirty = true;
const cameraHold=new HoldCamera();
const cameraOffset = new THREE.Vector3(24, 31, 24);
function updateCamera() {
  if (!cameraDirty) return;
  camera.position.copy(focus).addScaledVector(cameraOffset, zoom);
  camera.lookAt(focus);
  camera.updateMatrixWorld();
  cameraDirty = false;
}
scene.add(new THREE.HemisphereLight(0xcceeff, 0x293923, 2.1));
const sun = new THREE.DirectionalLight(0xffe5b5, 3.3);
sun.position.set(-15, 30, 8); sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 85 });
sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.035;
scene.add(sun);
const mats = {};
function mat(color, metalness = 0, roughness = 0.8) {
  const key = `${color}-${metalness}-${roughness}`;
  return mats[key] ||= new THREE.MeshStandardMaterial({ color, metalness, roughness });
}
function mesh(geo, material, x, y, z, parent = scene) {
  const m = new THREE.Mesh(geo, material); m.position.set(x, y, z);
  // Static scenery does not cast a dynamic shadow. Characters and enemies opt in
  // explicitly, which keeps the shadow pass small as the scene grows.
  m.castShadow = false; m.receiveShadow = true; parent.add(m); return m;
}
function box(w, h, d, color, x, y, z, parent) {
  return mesh(new THREE.BoxGeometry(w, h, d), mat(color), x, y, z, parent);
}
function cylinder(rt, rb, h, color, x, y, z, parent, sides=12) {
  return mesh(new THREE.CylinderGeometry(rt, rb, h, sides), mat(color), x, y, z, parent);
}
function ring(radius, thickness, color, parent=scene) {
  const r = mesh(new THREE.RingGeometry(radius-thickness, radius, 64), new THREE.MeshBasicMaterial({color, side:THREE.DoubleSide, transparent:true, opacity:0.85, depthWrite:false}), 0, 0.035, 0, parent);
  r.rotation.x = -Math.PI/2; r.castShadow=false; return r;
}
let seed=1337;
function random() { seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; }
// A bounded, obstacle-free training floor. Scenery stays outside the navigation square.
box(48, 1.2, 48, '#273b32', 0, -0.7, 0);
box(38.8, 0.15, 38.8, '#52634f', 0, -0.1, 0);
// Draw the 169 ground tiles in six instanced batches instead of 169 draw calls.
const tiles=new Map();
for(let x=-18;x<=18;x+=3) for(let z=-18;z<=18;z+=3) {
  const palette=Math.abs(x-z)<5?['#858b76','#919780','#777f6b']:['#506647','#566d4a','#5d7250'];
  const color=palette[Math.floor(random()*3)];if(!tiles.has(color))tiles.set(color,[]);tiles.get(color).push([x,z]);
}
const tileGeometry=new THREE.BoxGeometry(2.94,0.07,2.94),tileMatrix=new THREE.Matrix4();
for(const [color,positions] of tiles){
  const batch=new THREE.InstancedMesh(tileGeometry,mat(color),positions.length);batch.receiveShadow=true;
  positions.forEach(([x,z],i)=>batch.setMatrixAt(i,tileMatrix.makeTranslation(x,-0.005,z)));
  batch.instanceMatrix.needsUpdate=true;scene.add(batch);
}
for(const axis of [-1,1]) {
  box(39,0.22,0.35,'#a6986a',0,0.03,axis*19.5);
  box(0.35,0.22,39,'#a6986a',axis*19.5,0.03,0);
}
// Spawn medallion is flush with the walkable floor.
cylinder(3.5,3.5,0.08,'#64766b',-11,0.04,11,scene,48);
const spawnRing=ring(3.15,0.06,'#67dcd3');spawnRing.position.set(-11,0.1,11);
const inner=ring(2.6,0.025,'#a4dacf');inner.position.set(-11,0.11,11);
for(let i=0;i<8;i++) {
  const a=i*Math.PI/4;
  const rune=box(0.12,0.035,0.55,'#9cdfcc',-11+Math.sin(a)*2.85,0.13,11+Math.cos(a)*2.85);rune.rotation.y=a;
}
function tree(x,z,scale) {
  cylinder(0.2*scale,0.35*scale,2.4*scale,'#4a4030',x,1.2*scale,z,scene,6);
  for(let i=0;i<3;i++) mesh(new THREE.ConeGeometry((1.5-i*0.3)*scale,2.8*scale,7),mat(['#254c40','#32604a','#3b7051'][i]),x,(2.4+i*0.9)*scale,z);
}
for(let i=0;i<44;i++) {
  const edge=i%4, a=(random()-0.5)*46, b=(21+random()*3)*(edge<2?1:-1);
  tree(edge%2?a:b,edge%2?b:a,0.7+random()*0.5);
}
for(let i=0;i<25;i++) {
  const a=random()*Math.PI*2, radius=29+random()*4;
  const rock=mesh(new THREE.DodecahedronGeometry(1+random()*1.5,0),mat('#536566'),Math.cos(a)*radius,0.4,Math.sin(a)*radius);
  rock.scale.set(1,0.7,1);rock.rotation.set(random(),random(),random());
}
const crystals=[];
for(const [x,z] of [[-20,-16],[20,16],[-16,20],[16,-20]]) {
  cylinder(1.1,1.4,0.6,'#555f59',x,0.3,z);
  cylinder(0.7,0.9,1.8,'#747c6b',x,1.4,z);
  cylinder(1,0.7,0.22,'#b6a16e',x,2.4,z);
  const crystal=mesh(new THREE.OctahedronGeometry(0.7),new THREE.MeshStandardMaterial({color:0x6df2ec,emissive:0x1db8c9,emissiveIntensity:1.6,roughness:0.2}),x,3.2,z);
  crystal.scale.y=1.8; crystals.push(crystal);
}
const character = createEzreal();
const hero = character.root; scene.add(hero); hero.position.set(-5,0,5);
const selection=ring(0.9,0.065,'#6ee9c0',hero);
const targetMarker=new THREE.Group();scene.add(targetMarker);targetMarker.visible=false;
const targetRing=ring(0.72,0.065,'#a6ffac',targetMarker);
for(let i=0;i<4;i++) {
  const a=i*Math.PI/2;
  const m=mesh(new THREE.ConeGeometry(0.15,0.34,3),new THREE.MeshBasicMaterial({color:'#b5ffc6'}),Math.sin(a)*0.9,0.07,Math.cos(a)*0.9,targetMarker);m.rotation.set(Math.PI/2,0,-a);
}
const raycaster=new THREE.Raycaster();
const ground=new THREE.Plane(new THREE.Vector3(0,1,0),0);
const target=hero.position.clone();
const pointer=new THREE.Vector2(); const hit=new THREE.Vector3();
const speed=5.5;
let moving=false, walk=0, blend=0, markerAge=10, resumeMovement=false;
const enemySystem=new EnemySystem(scene,hero);
const enemies=enemySystem.enemies;
let desiredYaw=hero.rotation.y;
const attackSelection=ring(1.0,0.08,'#ff8064');attackSelection.visible=false;
function combatEvent(event){
  effects.handle(event);
  if(event.type==='cast')desiredYaw=Math.atan2(event.direction.x,event.direction.z);
}

const effects=new SpellEffects(scene,hero);
const spells=new SpellSystem({hero,getEnemies:()=>enemies,onEvent:combatEvent});
const attacks=new AttackSystem({hero,getEnemies:()=>enemies,onEvent:combatEvent});
const aim=hero.position.clone().add(new THREE.Vector3(0,0,15));
let aimScreen=null,selectedSpell=null,messageLife=0;
const spellMessage=document.querySelector('#spell-message');
const spellButtons=Object.fromEntries(Object.keys(SPELLS).map(key=>[key,document.querySelector('#spell-'+key)]));
const cooldownLabels=Object.fromEntries(Object.keys(SPELLS).map(key=>[key,document.querySelector('#cooldown-'+key)]));
const lastCooldownText=Object.fromEntries(Object.keys(SPELLS).map(key=>[key,'']));
const lastPressed=Object.fromEntries(Object.keys(SPELLS).map(key=>[key,false]));
const aimRing=ring(SPELLS.E.range,0.055,'#69d9ff');aimRing.visible=false;
const aimDot=ring(0.55,0.09,'#ffe49c');aimDot.visible=false;
let lastEnemyStats='';
function message(text){spellMessage.textContent=text;spellMessage.style.opacity='1';messageLife=2.5;}
function updateAim(event){
  if(event)aimScreen={x:event.clientX,y:event.clientY};
  if(!aimScreen)return;
  const r=canvas.getBoundingClientRect();
  pointer.set((aimScreen.x-r.left)/r.width*2-1,-(aimScreen.y-r.top)/r.height*2+1);
  raycaster.setFromCamera(pointer,camera);
  if(raycaster.ray.intersectPlane(ground,hit))aim.set(hit.x,0,hit.z);
}
function castSpell(key){
  updateAim();
  if(!spells.cast(key,aim)){
    message(spells.busy?'시전 중입니다':`${key} 재사용까지 ${spells.cooldown(key).toFixed(1)}초`);return;
  }
  // Preserve a normal right-click destination. The cast locks the body briefly;
  // once the lock ends the same destination is resumed automatically.
  resumeMovement = moving && !attacks.target && target.distanceToSquared(hero.position) > 0.025 ** 2;
  attacks.cancelWindup();
  moving=false;
  targetMarker.visible=false;
  selectedSpell=null;
  if(key==='E'){focus.copy(hero.position);cameraDirty=true;updateCamera();}
  message(`${key} · ${SPELLS[key].name}`);
}
for(const [key,button] of Object.entries(spellButtons))button.addEventListener('click',()=>{
  if(spells.busy||spells.cooldown(key)>0)return;
  selectedSpell=selectedSpell===key?null:key;
  message(selectedSpell?`${key} · 바닥을 클릭하거나 터치해 조준`:'스킬 선택 취소');
});
canvas.addEventListener('pointermove',event=>updateAim(event));
function command(event) {
  if(event.button!==0&&event.button!==2) return;
  event.preventDefault();canvas.focus({preventScroll:true});
  updateAim(event);
  if(event.button===0&&selectedSpell){castSpell(selectedSpell);return;}
  selectedSpell=null;
  if(spells.busy)return;
  if(event.button===2){
    let enemy=null;
    if(event.shiftKey){attacks.attackMove(aim);enemy=attacks.target;}
    else {scene.updateMatrixWorld(true);enemy=enemySystem.pick(raycaster);if(enemy)attacks.select(enemy);}
    if(enemy||event.shiftKey){stopMovement();message(enemy?'자동 공격 · 사거리 밖이면 추적':'공격 대기 · 지정 위치 가까운 적 탐색');return;}
  }
  attacks.cancel();
  resumeMovement=false;
  target.set(THREE.MathUtils.clamp(aim.x,-18.5,18.5),0,THREE.MathUtils.clamp(aim.z,-18.5,18.5));
  targetMarker.position.copy(target);targetMarker.visible=true;markerAge=0;moving=true;
}
canvas.addEventListener('pointerdown',command);
canvas.addEventListener('contextmenu',event=>event.preventDefault());
canvas.addEventListener('wheel',event=>{event.preventDefault();zoom=THREE.MathUtils.clamp(zoom+event.deltaY*0.0004,0.6,1.4);cameraDirty=true;updateCamera();},{passive:false});
function stopMovement(){moving=false;target.copy(hero.position);targetMarker.visible=false;resumeMovement=false;}
function stop(){stopMovement();attacks.cancel();}
function reset(){
  hero.position.set(-5,0,5);stop();attacks.reset();spells.reset();enemySystem.reset();
  focus.set(0,0,0);zoom=0.8;cameraHold.release();selectedSpell=null;aimScreen=null;
  aim.copy(hero.position).add(new THREE.Vector3(0,0,15));message('연습 초기화');cameraDirty=true;updateCamera();
}
document.querySelector('#reset').addEventListener('click',reset);
window.addEventListener('keydown',event=>{
  if(['INPUT','TEXTAREA','SELECT'].includes(event.target?.tagName)||event.target?.isContentEditable)return;
  if(event.code==='Space'){event.preventDefault();cameraHold.press();return;}
  if(event.repeat||event.ctrlKey||event.metaKey||event.altKey)return;
  const spellKey=event.code?.replace('Key','');
  if(SPELLS[spellKey]){event.preventDefault();castSpell(spellKey);return;}
  if(event.code==='Escape')selectedSpell=null;
  if(event.code==='KeyS'||event.code==='Escape') stop();

});
window.addEventListener('keyup',event=>{if(event.code==='Space'){event.preventDefault();cameraHold.release();}});
window.addEventListener('blur',()=>cameraHold.release());
document.addEventListener('visibilitychange',()=>{if(document.hidden)cameraHold.release();});
function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();cameraDirty=true;updateCamera();}
window.addEventListener('resize',resize);resize();
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();document.querySelector('#error').hidden=false;});
const clock=new THREE.Clock();
const diff=new THREE.Vector3();
function frame(){
  requestAnimationFrame(frame);
  const dt=Math.min(clock.getDelta(),0.05), t=clock.elapsedTime;
  if(document.hidden) return;
  enemySystem.update(dt,camera);
  spells.update(dt);
  attacks.update(dt,!spells.busy);
  const attackTarget=attacks.refreshTarget();
  if(attackTarget&&!spells.busy){
    const attackDistance=Math.hypot(attackTarget.position.x-hero.position.x,attackTarget.position.z-hero.position.z);
    desiredYaw=Math.atan2(attackTarget.position.x-hero.position.x,attackTarget.position.z-hero.position.z);
    if(attackDistance>BASIC_ATTACK.range&&!attacks.winding){target.copy(attackTarget.position);moving=true;}
    else stopMovement();
  }
  if(spells.busy||attacks.winding)moving=false;
  if(!spells.busy&&!attacks.winding&&!attackTarget&&resumeMovement){
    const remaining=target.distanceToSquared(hero.position);
    if(remaining>0.025 ** 2){
      moving=true;targetMarker.position.copy(target);targetMarker.visible=true;markerAge=0;
    }
    resumeMovement=false;
  }
  attackSelection.visible=isAlive(attackTarget);
  if(attackSelection.visible){attackSelection.position.copy(attackTarget.position);attackSelection.position.y=0.1;}
  updateAim();
  if(messageLife>0){messageLife-=dt;if(messageLife<=0){spellMessage.textContent=selectedSpell?`${selectedSpell} · 바닥을 클릭해 시전`:'우클릭: 적 공격 · Shift+우클릭: 바닥 기준 자동 공격';spellMessage.style.opacity='0';}}
  for(const key of Object.keys(SPELLS)){
    const cd=spells.cooldown(key),button=spellButtons[key];
    const cooldownText=cd>1e-8?Math.max(0.1,cd).toFixed(1)+'초':'준비';
    if(lastCooldownText[key]!==cooldownText){cooldownLabels[key].textContent=cooldownText;lastCooldownText[key]=cooldownText;}
    const pressed=selectedSpell===key;
    if(lastPressed[key]!==pressed){button.setAttribute('aria-pressed',String(pressed));lastPressed[key]=pressed;}
    const disabled=cd>1e-8||spells.busy;if(button.disabled!==disabled)button.disabled=disabled;
  }
  aimRing.visible=selectedSpell==='E';aimRing.position.copy(hero.position);aimRing.position.y=0.1;
  aimDot.visible=selectedSpell!==null;
  if(selectedSpell){aimDot.position.copy(selectedSpell==='E'?spells.destination(aim):aim);aimDot.position.y=0.12;}
  diff.subVectors(target,hero.position);diff.y=0;
  const distance=diff.length();
  if(moving&&distance>0.025){
    const step=Math.min(speed*dt,distance);
    hero.position.addScaledVector(diff,step/distance);
    const angle=Math.atan2(diff.x,diff.z);
    desiredYaw=angle;
  } else moving=false;
  blend=THREE.MathUtils.damp(blend,moving?1:0,12,dt);
  hero.rotation.y=smoothAngle(hero.rotation.y,desiredYaw,dt);
  // Continue the stride clock while fading out, instead of freezing a raised leg.
  walk+=speed*2.4*dt*blend;
  character.animate({time:t,phase:walk,weight:blend,dt});
  effects.update(dt,character);
  markerAge+=dt;targetRing.scale.setScalar(1+0.15*Math.sin(markerAge*10));
  if(markerAge>1.2&&!moving)targetMarker.visible=false;
  crystals.forEach((c,i)=>{c.rotation.y=t*0.45+i;c.position.y=3.2+Math.sin(t*1.5+i)*0.12;});
  let livingEnemies=0;for(const enemy of enemies)if(isAlive(enemy))livingEnemies++;
  const nextEnemyStats=`적 ${livingEnemies} · 처치 ${enemySystem.kills}`;
  if(nextEnemyStats!==lastEnemyStats){enemyStats.textContent=nextEnemyStats;lastEnemyStats=nextEnemyStats;}
  if(cameraHold.update(focus,hero.position,dt))cameraDirty=true;
  updateCamera();
  renderer.render(scene,camera);
}
document.querySelector('#loading').hidden=true;
frame();
