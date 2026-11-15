import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, reduce } from '../src/campaign.js';
import * as legacy from '../src/game.js';
import { LIBRARY_KEY, createLibrary, readLibrary, writeLibrary, restoreLibrary } from '../src/storage.js';

function memoryStorage(values={}) {
  const map=new Map(Object.entries(values));
  return { getItem:key=>map.get(key)??null, setItem:(key,value)=>map.set(key,value), map };
}

test('one room never borrows another room’s evidence, including mismatched save keys',()=>{
  const sunny=reduce(createState('sunny'),{type:'ASK_FEES'});
  const input={...createLibrary(),activeCaseId:'sunny',saves:{sunny,cycle:createState('cycle')}};
  const loaded=restoreLibrary(JSON.parse(JSON.stringify(input)));
  assert.equal(loaded.saves.sunny.facts.fees,true);
  assert.deepEqual(loaded.saves.cycle,createState('cycle'));
  const corrupted=restoreLibrary({...input,saves:{cycle:sunny}});
  assert.equal(corrupted.saves.cycle,undefined);
  assert.equal(corrupted.activeCaseId,null);
});

test('migrates the existing v3 first room without deleting its original save',()=>{
  const original=legacy.reduce(legacy.createState(),{type:'ASK_FEES'});
  const raw=JSON.stringify(original),store=memoryStorage({'rental-novice-case-v3':raw});
  const {library,available}=readLibrary(store);
  assert.equal(available,true);assert.equal(library.activeCaseId,'sunny');
  assert.equal(library.saves.sunny.caseId,'sunny');assert.equal(library.saves.sunny.facts.fees,true);
  assert.deepEqual(Object.keys(library.saves),['sunny']);
  assert.equal(store.getItem('rental-novice-case-v3'),raw);
});

test('persists multiple rooms and filters, while replacing one room leaves the others intact',()=>{
  const store=memoryStorage(),library=createLibrary();
  library.saves.sunny=reduce(createState('sunny'),{type:'ASK_FEES'});
  library.saves.shoes=createState('shoes');library.activeCaseId='shoes';library.categoryId='shared-long';
  assert.equal(writeLibrary(store,library),true);
  const restored=readLibrary(store).library;
  restored.saves.shoes=createState('shoes');assert.equal(writeLibrary(store,restored),true);
  const final=readLibrary(store).library;
  assert.equal(final.categoryId,'shared-long');assert.equal(final.activeCaseId,'shoes');
  assert.equal(final.saves.sunny.facts.fees,true);assert.equal(final.saves.shoes.caseId,'shoes');
  assert.ok(store.getItem(LIBRARY_KEY));
});

test('denied or broken browser storage does not prevent a new game',()=>{
  const denied={getItem(){throw new Error('denied');},setItem(){throw new Error('denied');}};
  assert.deepEqual(readLibrary(denied),{library:createLibrary(),available:false});
  assert.equal(writeLibrary(denied,createLibrary()),false);
  assert.equal(readLibrary(memoryStorage({[LIBRARY_KEY]:'broken json'})).available,false);
  assert.deepEqual(restoreLibrary({schemaVersion:1,saves:[],categoryId:'evil'}),createLibrary());
});
