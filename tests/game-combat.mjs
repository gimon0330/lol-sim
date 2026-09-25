// Deterministic integration checks. Only the WebGL renderer and browser shell are mocked.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as real from '../vendor/three.module.js';
import {createEzreal} from '../src/characters/ezreal.js';
import {SPELLS,SpellSystem} from '../src/combat/spells.js';
import {SpellEffects} from '../src/combat/spell-effects.js';
import {AttackSystem,BASIC_ATTACK,isAlive} from '../src/combat/attacks.js';
import {EnemySystem as RealEnemySystem} from '../src/enemies/enemies.js';
import {PlayerState} from '../src/combat/enemy-combat.js';
import {EnemyCombat} from '../src/combat/enemy-combat.js';
import {HoldCamera,EdgeCamera,smoothAngle} from '../src/motion.js';
class EnemySystem extends RealEnemySystem {constructor(scene,hero){super(scene,hero,{random:()=>0.5,includeLux:true});}}
const root=new URL('../',import.meta.url);
const character=createEzreal();
assert.equal(character.root.name,'Ezreal');
assert.equal(character.arms.length,2);assert.equal(character.legs.length,2);
assert.equal(character.muzzle.parent,character.gauntlet);
character.animate({time:1,phase:1,weight:1,dt:1/60});
assert.notEqual(character.legs[0].hip.rotation.x,0);
assert.notEqual(character.arms[0].shoulder.rotation.x,0);
character.animate({time:2,phase:1,weight:0,dt:1/60});
assert.equal(Math.abs(character.legs[0].hip.rotation.x),0);
character.root.updateMatrixWorld(true);
character.root.traverse(o=>assert(o.matrixWorld.elements.every(Number.isFinite)));
let now=0;
class Clock{getDelta(){now+=1/60;return 1/60}get elapsedTime(){return now}}
let renderedScene,renderedCamera;
class Renderer{constructor(){this.shadowMap={}}setPixelRatio(){}setSize(){}render(scene,camera){renderedScene=scene;renderedCamera=camera;scene.updateMatrixWorld(true)}}
const THREE={...real,WebGLRenderer:Renderer,Clock};
const elements={};
for(const id of ['#world','#reset','#loading','#error','#enemy-stats','#spell-message',...['Q','W','E','R'].flatMap(k=>['#spell-'+k,'#cooldown-'+k])])elements[id]={style:{},hidden:false,textContent:'',listeners:{},setAttribute(){},addEventListener(k,fn){this.listeners[k]=fn},focus(){},getBoundingClientRect(){return{left:0,top:0,width:1280,height:800}}};
const docEvents={};globalThis.document={querySelector:id=>elements[id],hidden:false,addEventListener(k,fn){docEvents[k]=fn}};
const keys={};globalThis.window={addEventListener(k,fn){keys[k]=fn}};
globalThis.innerWidth=1280;globalThis.innerHeight=800;globalThis.devicePixelRatio=1;
let frame;globalThis.requestAnimationFrame=fn=>{frame=fn};
let game=fs.readFileSync(new URL('src/game.js',root),'utf8').replace(/^import .*;\n/gm,'');
const state=new Function('THREE','createEzreal','SPELLS','SpellSystem','SpellEffects','AttackSystem','BASIC_ATTACK','isAlive','EnemySystem','HoldCamera','EdgeCamera','smoothAngle','EnemyCombat','PlayerState',game+'\nreturn {player,spells};')(THREE,createEzreal,SPELLS,SpellSystem,SpellEffects,AttackSystem,BASIC_ATTACK,isAlive,EnemySystem,HoldCamera,EdgeCamera,smoothAngle,EnemyCombat,PlayerState);
const tick=(n=1)=>{for(let i=0;i<n;i++)frame()};
const click=(button,x,y,shiftKey=false)=>elements['#world'].listeners.pointerdown({button,clientX:x,clientY:y,shiftKey,preventDefault(){}});
const key=code=>keys.keydown({code,preventDefault(){}});
const heroRoot=renderedScene.children.find(object=>object.name==='Ezreal');
assert(heroRoot);

const initial=heroRoot.position.clone();
// Stay still: incoming attacks must eventually cause death and a fresh encounter.
let sawDeath=false,sawRespawn=false;
for(let i=0;i<7200;i++){
 tick();
 if(!heroRoot.visible)sawDeath=true;
 else if(sawDeath){sawRespawn=true;break;}
}
assert(sawDeath,'incoming damage must kill a stationary player');
assert(sawRespawn,'player must respawn after delay');
assert(heroRoot.position.distanceTo(initial)<1e-8);
assert.equal(renderedScene.children.filter(o=>o.userData.enemy).length,5);
key('KeyQ');tick(10);assert.match(elements['#cooldown-Q'].textContent,/초/);
elements['#reset'].listeners.click();tick();assert.equal(elements['#cooldown-Q'].textContent,'준비');
console.log('PASS: full game with real enemy AI, damage, death, automatic respawn, clean five-enemy reset, Q after respawn');

// Root blocks movement and E, but preserves the move order for recovery.
click(2,850,400);tick(10);state.player.rooted=1;const rootedAt=heroRoot.position.clone();
key('KeyE');assert.equal(state.spells.cooldown('E'),0);tick(20);assert(heroRoot.position.distanceTo(rootedAt)<1e-8);
state.player.rooted=0;tick(10);assert(heroRoot.position.distanceTo(rootedAt)>0.1);
console.log('PASS: rooted movement and blink blocked, destination resumes after root');
