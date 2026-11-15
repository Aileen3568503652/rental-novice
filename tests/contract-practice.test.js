import test from 'node:test';
import assert from 'node:assert/strict';
import { PRACTICE_ID, PRACTICE_DOCUMENTS, PRACTICE_TOPICS, createPracticeState, restorePracticeState, reducePractice, getPracticeBudget, getPracticeTimeline, canSignPractice } from '../src/contract-practice.js';

const act=(state,type)=>reducePractice(state,{type});
function readFor(state,id) {
  return PRACTICE_TOPICS.find(t=>t.id===id).docs.reduce((s,d)=>act(s,`read:${d}`),state);
}
function complete(state,id) {
  let next=readFor(state,id);
  for(const verb of ['compare','request','confirm','sign'])next=act(next,`${verb}:${id}`);
  return next;
}

test('the contract exercise has its own identity, complete fourteen clauses, six materials, and no automatic flags',()=>{
  const state=createPracticeState();
  assert.equal(state.caseId,PRACTICE_ID);
  assert.equal(PRACTICE_DOCUMENTS.filter(d=>d.kind==='contract').length,14);
  assert.equal(PRACTICE_DOCUMENTS.filter(d=>d.kind==='material').length,6);
  assert.equal(PRACTICE_TOPICS.length,8);
  assert.deepEqual(state.read,{});assert.deepEqual(state.marks,{});assert.equal(state.reviewOpen,false);
  assert.equal('score' in state,false);
  for(const d of PRACTICE_DOCUMENTS)assert.ok(d.body.every(p=>typeof p==='string'&&p.length>10));
});

test('opening, reading and flagging a document are independent, and flags can be removed without granting evidence',()=>{
  const initial=createPracticeState(),opened=act(initial,'open:fees');
  assert.equal(opened.documentId,'fees');assert.equal(opened.read.fees,undefined);
  let state=act(opened,'flag:fees');assert.equal(state.marks.fees,true);assert.equal(state.read.fees,undefined);
  state=act(state,'read:fees');assert.equal(state.read.fees,true);assert.equal(state.issues.service.compared,false);
  state=act(state,'unflag:fees');assert.equal(state.marks.fees,undefined);assert.equal(state.read.fees,true);
  state=act(state,'read:clause8');state=act(state,'read:clause11');
  assert.equal(state.read.clause8,true);assert.equal(state.read.clause11,true);assert.deepEqual(state.marks,{});
});

test('specific cross-checks cannot skip any required external evidence or negotiation stage',()=>{
  for(const topic of PRACTICE_TOPICS){
    for(const missing of topic.docs){
      let state=topic.docs.filter(d=>d!==missing).reduce((s,d)=>act(s,`read:${d}`),createPracticeState());
      state=act(state,`flag:${topic.docs[0]}`);
      assert.strictEqual(act(state,`compare:${topic.id}`),state,`${topic.id} needs ${missing}`);
    }
    let state=readFor(createPracticeState(),topic.id);
    for(const verb of ['request','confirm','sign'])assert.strictEqual(act(state,`${verb}:${topic.id}`),state);
    state=act(state,`compare:${topic.id}`);assert.equal(state.issues[topic.id].requested,false);
    assert.strictEqual(act(state,`confirm:${topic.id}`),state);assert.strictEqual(act(state,`sign:${topic.id}`),state);
    state=act(state,`request:${topic.id}`);assert.equal(state.issues[topic.id].signed,false);
    assert.strictEqual(act(state,`sign:${topic.id}`),state);
    if(!topic.refused){state=act(state,`confirm:${topic.id}`);assert.equal(state.issues[topic.id].signed,false);state=act(state,`sign:${topic.id}`);assert.equal(state.issues[topic.id].signed,true);}
  }
});

test('rent-free and coordination changes affect money only after signatures, using the agreed calendar calculation',()=>{
  const original={initialCash:6480,reserveCash:6816,monthlyEstimate:3616};
  let state=createPracticeState();let budget=getPracticeBudget(state);
  for(const [key,value] of Object.entries(original))assert.equal(budget[key],value);
  state=readFor(state,'free');for(const verb of ['compare','request','confirm'])state=act(state,`${verb}:free`);
  assert.equal(getPracticeBudget(state).initialCash,6480);
  state=act(state,'sign:free');budget=getPracticeBudget(state);
  assert.equal(budget.freeDays,7);assert.equal(budget.firstRent,2477.42);assert.equal(budget.initialCash,5757.42);
  assert.equal(budget.monthlyEstimate,3616,'the first month concession does not reduce every following month');
  state=complete(state,'service');budget=getPracticeBudget(state);
  assert.equal(budget.serviceFee,0);assert.equal(budget.initialCash,5677.42);assert.equal(budget.reserveCash,6013.42);assert.equal(budget.monthlyEstimate,3536);
  assert.equal(budget.deposit,3200);assert.equal(budget.firstMonthEstimate,2813.42);
});

test('negotiation can be refused, and an informed signed version never pretends the refusal was accepted',()=>{
  let state=createPracticeState();assert.strictEqual(act(state,'SIGN_WRITTEN'),state);
  state=complete(state,'exit');assert.equal(state.issues.exit.refused,true);assert.equal(state.issues.exit.confirmed,false);assert.equal(state.issues.exit.signed,false);
  assert.strictEqual(act(state,'confirm:exit'),state);assert.strictEqual(act(state,'sign:exit'),state);
  for(const t of PRACTICE_TOPICS.filter(t=>!t.refused))state=complete(state,t.id);
  assert.equal(canSignPractice(state),true);
  const end=act(state,'SIGN_WRITTEN');assert.equal(end.phase,'ending');assert.equal(end.decision,'sign');
  assert.equal(end.issues.exit.refused,true);assert.equal(end.issues.exit.signed,false);
  const closing=getPracticeTimeline(end).at(-1);
  assert.match(closing.items.at(-1).body,/6400/);assert.match(closing.items.at(-1).body,/不会.*自动收/);
});

test('each written agreement affects only its own consequence rather than clearing unrelated matters',()=>{
  const base=act(createPracticeState(),'SIGN_DIRECT');
  assert.equal(base.issues.deposit.signed,false);
  const paid=act(complete(createPracticeState(),'service'),'SIGN_DIRECT');
  assert.equal(paid.issues.maintenance.signed,false);assert.equal(paid.issues.utilities.signed,false);assert.equal(paid.issues.deposit.signed,false);
  assert.match(getPracticeTimeline(paid)[0].items[0].body,/没有另收80/);
  assert.match(getPracticeTimeline(paid)[0].items[1].body,/缺少共同签认/);
  assert.match(getPracticeTimeline(paid)[1].items[0].body,/45日/);
  const deposit=act(complete(createPracticeState(),'deposit'),'SIGN_DIRECT');
  assert.match(getPracticeTimeline(deposit)[1].items[0].body,/3个工作日/);
  assert.match(getPracticeTimeline(deposit)[0].items[0].body,/仍列每月80元/);
});

test('pause and leave have no simulated bill, and review answers require an explicit action',()=>{
  let state=act(createPracticeState(),'HINT');assert.equal(state.hintLevel,1);assert.equal(state.reviewOpen,false);
  state=act(state,'HINT');state=act(state,'HINT');assert.equal(state.hintLevel,2);assert.equal(state.reviewOpen,false);
  for(const choice of ['PAUSE','LEAVE']){const end=act(state,choice);assert.deepEqual(getPracticeTimeline(end),[]);assert.equal(end.reviewOpen,false);assert.equal(act(end,'REVIEW').reviewOpen,true);}
  const reviewed=act(state,'tab:review');assert.equal(reviewed.reviewOpen,true);
  const resetRequest=act(reviewed,'RESET_REQUEST');assert.equal(resetRequest.tab,'reset');assert.equal(resetRequest.hintLevel,2);
  assert.deepEqual(act(resetRequest,'RESET'),createPracticeState());
});

test('signed outcomes are stable until retry and the saved exercise cannot import housing evidence or skip proof',()=>{
  let state=complete(createPracticeState(),'free');state=act(state,'SIGN_DIRECT');
  assert.strictEqual(act(state,'sign:service'),state);assert.strictEqual(act(state,'read:fees'),state);
  assert.deepEqual(restorePracticeState(JSON.parse(JSON.stringify(state))),state);
  const restored=restorePracticeState(state);restored.issues.free.signed=false;assert.equal(state.issues.free.signed,true);
  assert.deepEqual(restorePracticeState({...state,caseId:'sunny'}),createPracticeState());
  assert.deepEqual(restorePracticeState({...state,read:{}}),createPracticeState());
  const forged=createPracticeState();forged.issues.authority.signed=true;
  assert.deepEqual(restorePracticeState(forged),createPracticeState());
  assert.deepEqual(restorePracticeState({...createPracticeState(),lastAction:'sign:payment'}),createPracticeState(),'a forged last message cannot claim that an unsigned topic was signed');
  const retry=act(state,'RETRY');assert.equal(retry.phase,'reading');assert.equal(retry.issues.free.signed,true);assert.equal(retry.decision,null);
});
