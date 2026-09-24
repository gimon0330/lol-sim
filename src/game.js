import * as THREE from '../vendor/three.module.js';
import { createEzreal } from './characters/ezreal.js';

const canvas = document.querySelector('#world');
const status = document.querySelector('#status');
const coords = document.querySelector('#coords');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (error) {
  document.querySelector('#error').hidden = false;
  throw error;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
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
function updateCamera() {
  camera.position.copy(focus).add(new THREE.Vector3(24, 31, 24).multiplyScalar(zoom));
  camera.lookAt(focus);
  camera.updateMatrixWorld();
}
scene.add(new THREE.HemisphereLight(0xcceeff, 0x293923, 2.1));
const sun = new THREE.DirectionalLight(0xffe5b5, 3.3);
sun.position.set(-15, 30, 8); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
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
  m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
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
for(let x=-18;x<=18;x+=3) for(let z=-18;z<=18;z+=3) {
  const onLane=Math.abs(x-z)<5;
  const palette=onLane?['#858b76','#919780','#777f6b']:['#506647','#566d4a','#5d7250'];
  box(2.94,0.07,2.94,palette[Math.floor(random()*3)],x,-0.005,z);
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
let moving=false, walk=0, blend=0, markerAge=10;
function command(event) {
  if(event.button!==0&&event.button!==2) return;
  event.preventDefault();canvas.focus({preventScroll:true});
  const r=canvas.getBoundingClientRect();
  pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);
  raycaster.setFromCamera(pointer,camera);
  if(!raycaster.ray.intersectPlane(ground,hit)) return;
  target.set(THREE.MathUtils.clamp(hit.x,-18.5,18.5),0,THREE.MathUtils.clamp(hit.z,-18.5,18.5));
  targetMarker.position.copy(target);targetMarker.visible=true;markerAge=0;moving=true;
}
canvas.addEventListener('pointerdown',command);
canvas.addEventListener('contextmenu',event=>event.preventDefault());
canvas.addEventListener('wheel',event=>{event.preventDefault();zoom=THREE.MathUtils.clamp(zoom+event.deltaY*0.0004,0.6,1.4);updateCamera();},{passive:false});
function stop(){moving=false;target.copy(hero.position);targetMarker.visible=false;}
function reset(){hero.position.set(-5,0,5);stop();focus.set(0,0,0);zoom=0.8;updateCamera();}
document.querySelector('#reset').addEventListener('click',reset);
window.addEventListener('keydown',event=>{
  if(event.code==='KeyS'||event.code==='Escape') stop();
  if(event.code==='Space'){event.preventDefault();focus.copy(hero.position);updateCamera();}
});
function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();updateCamera();}
window.addEventListener('resize',resize);resize();
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();document.querySelector('#error').hidden=false;});
const clock=new THREE.Clock();
const diff=new THREE.Vector3();
function frame(){
  requestAnimationFrame(frame);
  const dt=Math.min(clock.getDelta(),0.05), t=clock.elapsedTime;
  if(document.hidden) return;
  diff.subVectors(target,hero.position);diff.y=0;
  const distance=diff.length();
  if(moving&&distance>0.025){
    const step=Math.min(speed*dt,distance);
    hero.position.addScaledVector(diff,step/distance);
    const angle=Math.atan2(diff.x,diff.z);
    hero.rotation.y+=Math.atan2(Math.sin(angle-hero.rotation.y),Math.cos(angle-hero.rotation.y))*Math.min(1,dt*14);
    walk+=step*2.4;
  } else moving=false;
  blend=THREE.MathUtils.damp(blend,moving?1:0,12,dt);
  character.animate({time:t,phase:walk,weight:blend,dt});
  markerAge+=dt;targetRing.scale.setScalar(1+0.15*Math.sin(markerAge*10));
  if(markerAge>1.2&&!moving)targetMarker.visible=false;
  crystals.forEach((c,i)=>{c.rotation.y=t*0.45+i;c.position.y=3.2+Math.sin(t*1.5+i)*0.12;});
  status.textContent=moving?'이동 중':'대기 중';
  coords.textContent=`X ${hero.position.x.toFixed(1)} · Z ${hero.position.z.toFixed(1)}`;
  renderer.render(scene,camera);
  const p=hero.position.clone();p.y=3.2;p.project(camera);
  const health=document.querySelector('#hero-label');
  health.style.transform=`translate(${(p.x*0.5+0.5)*innerWidth}px,${(-p.y*0.5+0.5)*innerHeight}px) translate(-50%,-100%)`;
  health.hidden=p.z>1||p.x<-1||p.x>1||p.y<-1||p.y>1;
}
document.querySelector('#loading').hidden=true;
frame();
