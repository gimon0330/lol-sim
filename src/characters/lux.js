import * as THREE from '../../vendor/three.module.js';
// Original low-poly interpretation of Lux's default skin, using shared resources.
const materials=Object.fromEntries(Object.entries({blue:0x294f9c,white:0xe6edf3,gold:0xd8b356,hair:0xf3ce70,skin:0xf3c5a1,dark:0x253248,light:0x99f3ff}).map(([k,color])=>[k,new THREE.MeshStandardMaterial({color,roughness:0.55,metalness:k==='gold'?0.65:0,emissive:k==='light'?0x42baca:0,emissiveIntensity:1.5})]));
const box=new THREE.BoxGeometry(1,1,1),sphere=new THREE.SphereGeometry(1,12,8),rod=new THREE.CylinderGeometry(1,1,1,8),skirt=new THREE.CylinderGeometry(0.33,0.65,0.7,8);
export function createLux(){
 const root=new THREE.Group();root.name='Lux';
 const add=(geo,color,x,y,z,sx,sy,sz,parent=root)=>{const m=new THREE.Mesh(geo,materials[color]);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;parent.add(m);return m;};
 add(skirt,'blue',0,0.92,0,1,1,1);
 add(box,'blue',0,1.53,0,0.65,0.65,0.35);
 add(box,'white',0,1.6,0.17,0.57,0.48,0.13);
 add(box,'gold',0,1.22,0,0.72,0.1,0.4);
 add(sphere,'skin',0,2.14,0,0.29,0.34,0.28);
 add(sphere,'hair',0,2.32,-0.06,0.32,0.21,0.3);
 for(const side of [-1,1]){
  add(box,'hair',side*0.28,1.96,-0.12,0.15,0.62,0.3);
  add(sphere,'white',side*0.43,1.78,0,0.27,0.16,0.25);
  add(box,'gold',side*0.43,1.76,0.15,0.28,0.05,0.18);
  add(box,'dark',side*0.18,0.33,0,0.22,0.6,0.26);
 }
 add(box,'gold',0,2.24,0.27,0.48,0.06,0.06);
 const arms=[];
 for(const side of [-1,1]){const pivot=new THREE.Group();pivot.position.set(side*0.47,1.73,0);root.add(pivot);add(box,'blue',0,-0.27,0,0.16,0.52,0.18,pivot);add(sphere,'skin',0,-0.56,0,0.12,0.14,0.12,pivot);arms.push(pivot);}
 const staff=new THREE.Group();staff.position.set(0,-0.5,0.13);arms[1].add(staff);
 add(rod,'gold',0,0,0,0.055,2.5,0.055,staff);
 for(const side of [-1,1]){const wing=add(box,'gold',side*0.22,1.15,0,0.1,0.58,0.12,staff);wing.rotation.z=-side*0.6;}
 add(sphere,'light',0,1.4,0,0.15,0.21,0.15,staff);
 const cape=add(box,'blue',0,1.12,-0.3,0.65,1.05,0.06);cape.rotation.x=-0.15;
 return {root,arms,animate(phase,casting){arms[0].rotation.x=casting?-0.9:Math.sin(phase)*0.2;arms[1].rotation.x=casting?-1.35:-0.2;cape.rotation.x=-0.15+Math.sin(phase)*0.08;}};
}
