import * as THREE from '../../vendor/three.module.js';

/** Stylized fan model based on Ezreal's default appearance.
 * +Z is forward; +X is the character's anatomical left.
 * Gauntlet muzzle and joint references are exposed for future spell animation.
 */
export function createEzreal() {
  const root = new THREE.Group();
  root.name = 'Ezreal';
  const body = new THREE.Group(); root.add(body);
  const materials = {
    leather: new THREE.MeshStandardMaterial({color:'#75472e',roughness:0.87}),
    seams: new THREE.MeshStandardMaterial({color:'#bd8b50',roughness:0.7}),
    shirt: new THREE.MeshStandardMaterial({color:'#e2dbbf',roughness:1}),
    pants: new THREE.MeshStandardMaterial({color:'#26364c',roughness:0.95}),
    boots: new THREE.MeshStandardMaterial({color:'#443227',roughness:0.9}),
    skin: new THREE.MeshStandardMaterial({color:'#e5af85',roughness:0.9}),
    hair: new THREE.MeshStandardMaterial({color:'#e6bb58',roughness:0.9}),
    hairLight: new THREE.MeshStandardMaterial({color:'#f5d779',roughness:0.85}),
    blue: new THREE.MeshStandardMaterial({color:'#3f7a91',roughness:0.9}),
    gold: new THREE.MeshStandardMaterial({color:'#c69a49',metalness:0.72,roughness:0.36}),
    goldLight: new THREE.MeshStandardMaterial({color:'#f0ce7b',metalness:0.6,roughness:0.34}),
    dark: new THREE.MeshStandardMaterial({color:'#17212c',roughness:0.8}),
    energy: new THREE.MeshStandardMaterial({color:'#99f9ff',emissive:'#1aaeea',emissiveIntensity:2.4,roughness:0.15}),
    eyes: new THREE.MeshStandardMaterial({color:'#45c7ed',emissive:'#075576',emissiveIntensity:0.3}),
  };
  function part(parent,geometry,material,pos,scale) {
    const m=new THREE.Mesh(geometry,materials[material]);
    m.position.set(...pos);if(scale)m.scale.set(...scale);
    m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
  }
  const box=(p,size,m,pos)=>part(p,new THREE.BoxGeometry(...size),m,pos);
  const ellipsoid=(p,r,m,pos,scale)=>part(p,new THREE.SphereGeometry(r,12,8),m,pos,scale);
  const taper=(p,top,bottom,h,m,pos,sides=8)=>part(p,new THREE.CylinderGeometry(top,bottom,h,sides),m,pos);
  function joint(parent,name,pos) {const g=new THREE.Group();g.name=name;g.position.set(...pos);parent.add(g);return g;}

  // Cream undershirt, open cropped leather jacket, crossed explorer straps.
  taper(body,0.43,0.3,0.84,'shirt',[0,1.74,0],8).scale.z=0.62;
  box(body,[0.66,0.68,0.15],'leather',[0,1.76,-0.21]);
  for(const s of [-1,1]) {
    const panel=box(body,[0.22,0.73,0.36],'leather',[s*0.30,1.76,0]);panel.rotation.z=s*-0.08;
    const lapel=box(body,[0.12,0.54,0.09],'seams',[s*0.22,1.87,0.24]);lapel.rotation.z=s*0.19;
    const collar=ellipsoid(body,0.19,'blue',[s*0.26,2.12,-0.015],[1.1,0.8,1.2]);collar.rotation.z=s*0.4;
  }
  ellipsoid(body,0.23,'blue',[0,2.12,-0.17],[1.7,0.7,0.7]);
  const strap=box(body,[0.095,0.96,0.07],'boots',[-0.03,1.74,0.30]);strap.rotation.z=-0.55;
  box(body,[0.68,0.13,0.48],'boots',[0,1.29,0]);
  box(body,[0.18,0.16,0.07],'gold',[0,1.29,0.28]);
  box(body,[0.09,0.08,0.035],'dark',[0,1.29,0.325]);
  box(body,[0.24,0.27,0.23],'leather',[-0.43,1.29,-0.02]);
  box(body,[0.27,0.07,0.25],'seams',[-0.43,1.39,-0.02]);
  box(body,[0.49,0.32,0.36],'pants',[0,1.14,0]);
  taper(body,0.12,0.13,0.23,'skin',[0,2.22,0]);

  const head=joint(body,'head',[0,2.48,0.035]);
  ellipsoid(head,0.28,'skin',[0,0,0],[0.87,1.12,0.83]);
  ellipsoid(head,0.19,'skin',[0,-0.16,0.025],[0.93,0.65,0.92]);
  for(const s of [-1,1]) {
    ellipsoid(head,0.067,'skin',[s*0.24,-0.025,0],[0.55,1,0.75]);
    box(head,[0.084,0.038,0.025],'shirt',[s*0.104,0.025,0.225]);
    box(head,[0.034,0.042,0.029],'eyes',[s*0.093,0.024,0.241]);
    const brow=box(head,[0.104,0.025,0.027],'leather',[s*0.10,0.084,0.228]);brow.rotation.z=s*-0.14;
    const mark=box(head,[0.064,0.018,0.023],'blue',[s*0.155,-0.07,0.20]);mark.rotation.z=s*0.42;
  }
  ellipsoid(head,0.055,'skin',[0,-0.018,0.239],[0.6,0.9,0.8]);
  box(head,[0.088,0.012,0.02],'leather',[0,-0.142,0.207]);
  // Swept blond hair: a fitted cap plus tapered, directional locks.
  ellipsoid(head,0.292,'hair',[0,0.145,-0.025],[1.01,0.72,0.96]);
  for(let i=0;i<11;i++) {
    const a=i/11*Math.PI*2;
    const lock=taper(head,0.015,0.095,0.31+(i%3)*0.05,i%3?'hair':'hairLight',[Math.sin(a)*0.18,0.24,Math.cos(a)*0.17],5);
    lock.rotation.z=-0.45+Math.sin(a)*0.4;lock.rotation.x=Math.cos(a)*0.6;
  }
  for(let i=0;i<5;i++) {
    const fringe=taper(head,0.09,0.008,0.27,'hairLight',[-0.18+i*0.08,0.13-i*0.012,0.215],5);
    fringe.rotation.z=-0.6;fringe.rotation.x=-0.2;
  }
  // Goggles rest on the top of the head, leaving the face unobscured.
  const band=part(head,new THREE.TorusGeometry(0.267,0.018,5,20),'boots',[0,0.19,0]);band.rotation.x=Math.PI/2;
  for(const s of [-1,1]) {
    const rim=part(head,new THREE.TorusGeometry(0.068,0.019,5,12),'gold',[s*0.095,0.235,0.223]);rim.rotation.x=-0.3;
    ellipsoid(head,0.058,'blue',[s*0.095,0.235,0.219],[1,0.85,0.25]);
  }

  const legs=[];const arms=[];
  for(const side of [-1,1]) {
    const hip=joint(body,side===1?'leftHip':'rightHip',[side*0.205,1.17,0]);
    taper(hip,0.17,0.135,0.51,'pants',[0,-0.23,0]);
    const knee=joint(hip,'knee',[0,-0.49,0]);
    taper(knee,0.125,0.10,0.46,'pants',[0,-0.20,0]);
    taper(knee,0.15,0.14,0.27,'boots',[0,-0.37,0]);
    box(knee,[0.28,0.19,0.46],'boots',[0,-0.51,0.075]);
    box(knee,[0.29,0.055,0.47],'dark',[0,-0.59,0.075]);
    box(knee,[0.29,0.055,0.30],'seams',[0,-0.31,0.015]);
    box(knee,[0.30,0.048,0.33],'seams',[0,-0.45,0.03]);
    legs.push({hip,knee,side});
    const shoulder=joint(body,side===1?'leftShoulder':'rightShoulder',[side*0.49,2.03,0]);
    ellipsoid(shoulder,0.20,'leather',[0,-0.10,0],[1,1.1,0.94]);
    taper(shoulder,0.165,0.135,0.39,'leather',[0,-0.24,0]);
    taper(shoulder,0.15,0.15,0.085,'seams',[0,-0.41,0]);
    const elbow=joint(shoulder,'elbow',[0,-0.43,0]);
    taper(elbow,0.12,0.095,0.32,'skin',[0,-0.16,0]);
    ellipsoid(elbow,0.11,'skin',[0,-0.39,0.01],[0.8,1.15,0.9]);
    arms.push({shoulder,elbow,side});
  }
  const leftArm=arms.find(a=>a.side===1);
  const gauntlet=joint(leftArm.elbow,'arcaneGauntlet',[0,-0.19,0]);
  taper(gauntlet,0.20,0.165,0.36,'gold',[0,0,0],6);
  taper(gauntlet,0.235,0.215,0.07,'goldLight',[0,0.16,0],6);
  taper(gauntlet,0.185,0.185,0.065,'goldLight',[0,-0.18,0],6);
  for(const s of [-1,1]) {
    const fin=box(gauntlet,[0.055,0.35,0.19],'goldLight',[s*0.18,0.065,0]);fin.rotation.z=s*-0.18;
  }
  const gem=part(gauntlet,new THREE.OctahedronGeometry(0.13),'energy',[0,0,0.19],[0.8,1.2,0.45]);
  box(gauntlet,[0.065,0.12,0.04],'energy',[0,-0.19,0.168]);
  const muzzle=joint(gauntlet,'spellMuzzle',[0,-0.29,0.24]);
  const scarf=joint(body,'scarf',[0,2.08,-0.28]);
  const scarfTail=box(scarf,[0.20,0.60,0.055],'blue',[0,-0.26,-0.05]);scarfTail.rotation.z=-0.15;

  function animate({time,phase,weight,dt}) {
    for(const {hip,knee,side} of legs) {
      const swing=Math.sin(phase)*side;
      hip.rotation.x=swing*0.66*weight;
      knee.rotation.x=-Math.max(0,swing)*0.8*weight;
    }
    for(const {shoulder,elbow,side} of arms) {
      shoulder.rotation.x=-Math.sin(phase)*side*0.53*weight-0.08;
      shoulder.rotation.z=side*(0.09+0.04*weight);
      elbow.rotation.x=-0.22-Math.max(0,Math.sin(phase)*side)*0.45*weight;
    }
    body.position.y=(1-Math.cos(phase*2))*0.0325*weight+Math.sin(time*2.2)*0.018*(1-weight);
    body.rotation.x=0.07*weight;
    body.rotation.z=Math.sin(phase)*0.035*weight;
    head.rotation.y=Math.sin(time*0.7)*0.055*(1-weight);
    scarf.rotation.x=-0.12-weight*0.55+Math.sin(phase+0.6)*0.15*weight;
    gem.material.emissiveIntensity=2.1+Math.sin(time*3)*0.35;
  }
  return {root,body,head,arms,legs,gauntlet,muzzle,animate};
}
