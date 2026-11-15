import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CASES } from '../src/cases.js';

// Run actual Three geometry, projection and collision with only GPU/browser surfaces stubbed.
const listeners=new Map();
const events=()=>({addEventListener(type,fn){listeners.set(type,fn);},removeEventListener(type,fn){if(listeners.get(type)===fn)listeners.delete(type);}});
const drawing={fillRect(){},strokeRect(){},fillText(){}};
const canvas={...events(),getContext(){return drawing;},getBoundingClientRect(){return {width:1440,height:900};}};
globalThis.window={...events(),devicePixelRatio:1};
globalThis.document={...events(),hidden:false,activeElement:null,createElement(){return {getContext(){return drawing;}};}};
globalThis.ResizeObserver=class {observe(){}disconnect(){}};
let frame;
globalThis.requestAnimationFrame=fn=>{frame=fn;return 1;};globalThis.cancelAnimationFrame=()=>{};
globalThis.V11TestRenderer=class {constructor(){this.shadowMap={};}setPixelRatio(){}setSize(){}render(){}dispose(){}forceContextLoss(){}};
let source=await readFile(new URL('../src/world.js',import.meta.url),'utf8');
source=source.replace("import * as THREE from 'three';",`import * as RealThree from '${new URL('../node_modules/three/build/three.module.js',import.meta.url).href}';const THREE={...RealThree,WebGLRenderer:globalThis.V11TestRenderer};`);
source=source.replace("from './characters.js'",`from '${new URL('../src/characters.js',import.meta.url).href}'`);
source=source.replace('requestLook, releaseLook, teleport, getFurniture,','__test(){return {camera,scene,isFree,actors,basinWater,basinDrops,basinDoor,sinkDoor,water};},requestLook, releaseLook, teleport, getFurniture,');
const { createWorld }=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));

test('all five new inspection objects can be reached and targeted in every home',()=>{
  for(const config of CASES){
    let target;const world=createWorld({canvas,caseConfig:config,onTarget:value=>{target=value;}}),d=world.__test();
    for(const id of ['basin','fridge','stove','aircon','wall']){
      assert.equal(world.teleport(id),true,`${config.id}: ${id} destination`);
      assert.equal(target?.id,id,`${config.id}: ${id} center ray`);
      assert.equal(d.isFree(d.camera.position.x,d.camera.position.z),true);
      assert.equal(world.inspect(id),true);
    }
    for(const [id, person]of [['landlord',config.host],['roommate',config.housingType==='shared'?config.roommate:null],['friend',config.friend]])if(person){
      const actor=d.actors.get(id);assert.equal(actor.profile.name,person.name);assert.ok(['男','女'].includes(actor.profile.gender));
    }
    world.dispose();
  }
});

test('crouching and bending keep real clearance, deny standing under the low shelf, and reset safely',()=>{
  const changes=[],world=createWorld({canvas,onPosture:value=>changes.push(value)}),d=world.__test();
  world.setEnabled(true);world.setReducedMotion(true);
  assert.equal(world.setPosture('crouched').ok,true);assert.equal(d.camera.position.y,.75);
  d.camera.position.set(1.02,.75,4.62);
  assert.equal(d.isFree(1.02,4.62,.75),true,'open space below the shelf');
  assert.equal(d.isFree(1.02,4.62,1.65),false,'the board blocks a standing head');
  const denied=world.setPosture('standing');assert.equal(denied.ok,false);assert.match(denied.reason,/开阔处/);assert.equal(world.getPosture(),'crouched');
  assert.equal(world.setPosture('bent').ok,true);assert.equal(d.camera.position.y,1.15);
  world.setEnabled(true);assert.equal(world.getPosture(),'bent','HUD redraw cannot force the camera upright');
  world.setStoryState({facts:{},day:0});assert.equal(world.getPosture(),'bent','syncing evidence cannot eject a safe low posture');
  assert.equal(world.resetPosture().ok,true);assert.equal(world.getPosture(),'standing');assert.equal(d.camera.position.y,1.65);assert.equal(d.isFree(d.camera.position.x,d.camera.position.z),true);
  assert.equal(world.setPosture('flying').ok,false);
  assert.ok(changes.includes('bent')&&changes.includes('crouched'));world.dispose();
});

test('low movement is slower, solid furniture and closed doors remain blocking',()=>{
  const world=createWorld({canvas}),d=world.__test();world.setReducedMotion(true);world.setEnabled(true);
  function walk(mode){world.teleport('survey');world.setPosture(mode);d.camera.rotation.set(0,0,0);const z=d.camera.position.z;listeners.get('keydown')({code:'KeyW',preventDefault(){}});let now=performance.now();for(let i=1;i<=5;i++)frame(now+i*50);listeners.get('keyup')({code:'KeyW'});return z-d.camera.position.z;}
  const standing=walk('standing'),crouched=walk('crouched');assert.ok(standing>crouched*1.6&&crouched>0);
  for(const [x,z]of [[4.4,3.8],[-3.65,-4.77],[-.4,5.6]])assert.equal(d.isFree(x,z,.75),false);
  world.dispose();
});

test('basin preparation, observed drips and later leak stay independent of kitchen repairs',()=>{
  const world=createWorld({canvas}),d=world.__test();
  world.setStoryState({facts:{repairVerified:true},day:7,effects:{basinPrepared:true,basinObserved:true,basinLeak:true}});
  assert.equal(d.water.visible,false);assert.equal(d.basinWater.visible,true);assert.ok(d.basinDoor.rotation.y>0);assert.ok(d.basinDrops.every(drop=>drop.visible));
  world.setStoryState({facts:{repairVerified:false},day:7,effects:{basinPrepared:true,basinRepaired:true}});
  assert.equal(d.water.visible,true);assert.equal(d.basinWater.visible,false);assert.ok(d.basinDrops.every(drop=>!drop.visible));
  world.setStoryState({facts:{},day:0,effects:{}});assert.equal(d.basinWater.visible,false);assert.equal(d.basinDoor.rotation.y,0);world.dispose();
});
