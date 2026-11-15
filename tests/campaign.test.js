import test from 'node:test';
import assert from 'node:assert/strict';
import { CASES, CATEGORIES, getCase, SCENARIOS } from '../src/cases.js';
import { createState, reduce, restoreState, getDialog, getNotebook, getCaseProgress, getTimeline, getEnding, getLeaseTerms, getSceneState } from '../src/campaign.js';
import * as legacy from '../src/game.js';

const newHomes=CASES.filter(c=>c.id!=='sunny');
const act=(s,type)=>reduce(s,{type});
function complete(id,{chooseEight=true}={}) {
  let state=act(createState(id),'ASK_OWNER');
  // Follow the actual available choices, respecting cross-object prerequisites.
  for(let pass=0;pass<8;pass++){
    let changed=false;
    for(const chain of SCENARIOS[id].chains){
      const choices=getDialog(chain.target,state).options.filter(o=>o.action?.startsWith('c:')&&!o.disabled);
      for(const o of choices){const next=act(state,o.action);if(JSON.stringify(next.facts)!==JSON.stringify(state.facts))changed=true;state=next;}
    }
    if(!changed)break;
  }
  if(id==='keys'&&chooseEight)state=act(state,'MATCH_EIGHT');
  return state;
}

test('the catalogue contains nine main cases, two genuinely separate alternatives, and four rental types',()=>{
  assert.equal(CASES.length,11);assert.equal(CASES.filter(c=>!c.variantOf).length,9);
  assert.equal(new Set(CASES.map(c=>c.id)).size,11);
  assert.deepEqual(new Set(CASES.map(c=>c.categoryId)),new Set(CATEGORIES.map(c=>c.id)));
  for(const c of newHomes){assert.ok(c.chains.filter(x=>!x.optional).length>=3);assert.ok(c.spots.some(x=>(x.target||x.id)==='desk'));}
  assert.equal(getCase('internship').leaseMonths,12);assert.equal(getCase('internship').targetDays,90);
  assert.match(getCase('internship').contractWarning,/12/);
  assert.equal(getCase('internship-b').variantOf,'internship');assert.equal(getCase('transfer-b').variantOf,'transfer');
  assert.equal(getCase('sunny').housingType,'whole');assert.equal(getCase('shoes').housingType,'shared');
});

test('all advertised initial cash and route totals agree with the screenplay, including deposits kept separate',()=>{
  const costs={sunny:8480,cycle:15450,internship:13300,transfer:9000,shoes:4400,utilities:4800,keys:4600,summer:5300,choice:4800,'internship-b':7520,'transfer-b':7200};
  const routes={sunny:35,cycle:45,internship:40,transfer:32,shoes:40,utilities:40,keys:45,summer:35,choice:45,'internship-b':35,'transfer-b':45};
  for(const c of CASES){assert.equal(c.initialCash,costs[c.id],c.id);assert.equal(c.routeSegments.reduce((n,s)=>n+s.minutes,0),routes[c.id],c.id);assert.equal(c.commuteMinutes,routes[c.id]);}
  assert.equal(getCase('internship').budgetAvailable-getCase('internship').initialCash,700);
  assert.equal(getCase('cycle').budgetAvailable-getCase('cycle').initialCash,550);
  assert.equal(getCase('internship-b').budgetAvailable-getCase('internship-b').initialCash,6480);
  assert.equal(getCase('utilities').rent+getCase('utilities').utilityEstimate+getCase('utilities').transportEstimate,2716);
  assert.equal(getCase('summer').initialCash+getCase('summer').utilityEstimate+getCase('summer').transportEstimate,5700);
});

test('every new home rejects skipped evidence and verified signing, but allows a deliberate unverified decision',()=>{
  const expectedDays={cycle:[7,30,365],internship:[7,30,90],transfer:[7,45,60],shoes:[7,30,365],utilities:[7,30,365],keys:[30,180,240],summer:[7,30,60],choice:[7,30,90],'internship-b':[7,30,90],'transfer-b':[7,30,60]};
  for(const c of newHomes){
    const fresh=createState(c.id);
    for(const chain of c.chains){assert.equal(act(fresh,`c:${chain.id}:2`),fresh,`${c.id}/${chain.id} cannot skip`);}
    assert.equal(act(fresh,'SIGN_CONFIRMED'),fresh);
    const signed=act(fresh,'SIGN');assert.equal(signed.phase,'ending');assert.equal(signed.decision,'sign');
    const timeline=getTimeline(signed);assert.deepEqual(timeline.map(x=>x.day),expectedDays[c.id]);
    assert.ok(timeline.some(x=>x.tone==='warning'));assert.ok(timeline.every(x=>x.items.length&&x.view));
    assert.equal(act(signed,'c:handover:0'),signed,'ended stories reject further evidence');
  }
});

test('every complete investigation is reachable through available dialogue and produces a coherent signed save',()=>{
  for(const c of newHomes){
    const ready=complete(c.id);
    for(const chain of c.chains)assert.equal(ready.facts[`${chain.id}_2`],true,`${c.id}/${chain.id} unreachable`);
    assert.equal(getDialog('desk',ready).options.find(o=>o.action==='SIGN_CONFIRMED').disabled,false,c.id);
    const signed=act(ready,'SIGN_CONFIRMED');assert.equal(signed.phase,'ending',c.id);
    assert.deepEqual(restoreState(JSON.parse(JSON.stringify(signed)),c.id),signed,`${c.id} restores`);
    assert.ok(getTimeline(signed).every(e=>e.tone==='success'),`${c.id} has coherent outcomes`);
    assert.ok(getNotebook(signed).length>=c.chains.length);assert.ok(getEnding(signed).body.length);
  }
});

test('denied three-month conversion stays denied even after the player makes an informed annual choice',()=>{
  const ready=complete('internship'),progress=getCaseProgress(ready);
  assert.equal(progress.chains.find(c=>c.id==='exit').status,'pending');
  assert.equal(getLeaseTerms(ready).leaseMonths,12);assert.equal(getLeaseTerms(ready).initialCash,13300);
  assert.match(getLeaseTerms(ready).label,/未获同意/);
  const signed=act(ready,'SIGN_CONFIRMED');assert.equal(signed.outcome,'informed');
  const ninety=getTimeline(signed).find(x=>x.day===90);assert.match(ninety.items.map(x=>x.body).join(''),/3300/);
  assert.doesNotMatch(ninety.items.map(x=>x.body).join(''),/已经支付|已自动支付|自动扣款/);
  assert.equal(signed.contractChoice,'draft');
});

test('a sixty-day transfer needs both written consent and an actual extended contract before confirming payment',()=>{
  let state=createState('transfer');
  for(const action of ['c:term:0','c:term:1','c:payment:0','c:payment:1'])state=act(state,action);
  assert.equal(act(state,'c:term:2'),state);assert.equal(act(state,'c:payment:2'),state);
  for(const action of ['c:authority:0','c:authority:1','c:authority:2'])state=act(state,action);
  assert.equal(state.facts.term_2,false);assert.equal(state.facts.payment_2,false);
  state=act(state,'c:term:2');state=act(state,'c:payment:2');
  assert.equal(state.facts.term_2,true);assert.equal(state.facts.payment_2,true);
  assert.match(getLeaseTerms(state).label,/已覆盖/);assert.equal(getLeaseTerms(state).leaseMonths,2);
});

test('eight-month authority cannot silently turn the unapproved twelve-month draft into a valid extension',()=>{
  const fresh=createState('keys');assert.equal(act(fresh,'MATCH_EIGHT'),fresh);
  let ready=complete('keys',{chooseEight:false});assert.equal(getLeaseTerms(ready).leaseMonths,12);
  assert.equal(act(ready,'SIGN_CONFIRMED'),ready);
  const draft=act(ready,'SIGN');assert.equal(draft.outcome,'unresolved');
  const pending=getCaseProgress(draft).chains;assert.equal(pending.find(c=>c.id==='authority').status,'pending');assert.equal(pending.find(c=>c.id==='exit').status,'pending');
  assert.equal(getSceneState(draft,240).effects.authorityAlert,true);
  assert.match(getTimeline(act(ready,'SIGN')).find(x=>x.day===240).items.map(x=>x.body).join(''),/十二个月草稿/);
  ready=act(ready,'MATCH_EIGHT');assert.equal(getLeaseTerms(ready).leaseMonths,8);
  assert.equal(getCaseProgress(ready).chains.find(c=>c.id==='authority').status,'resolved');assert.equal(getCaseProgress(ready).chains.find(c=>c.id==='exit').status,'resolved');
  assert.equal(getLeaseTerms(ready).initialCash,4600);
  const signed=act(ready,'SIGN_CONFIRMED');assert.equal(signed.decision,'sign');
  assert.equal(getTimeline(signed).at(-1).day,240);
  assert.equal(act(ready,'APPROVE_TWELVE_MONTHS'),ready);
});

test('three- and six-month choices keep the same home and commute, and apply their own contract numbers',()=>{
  const ready=complete('choice'),six=act(ready,'CHOOSE_SIX');
  assert.equal(getLeaseTerms(ready).rent,2400);assert.equal(getLeaseTerms(ready).deposit,2400);assert.equal(getLeaseTerms(ready).initialCash,4800);assert.equal(getLeaseTerms(ready).leaseMonths,3);
  assert.equal(getLeaseTerms(six).rent,2100);assert.equal(getLeaseTerms(six).deposit,2100);assert.equal(getLeaseTerms(six).initialCash,4200);assert.equal(getLeaseTerms(six).leaseMonths,6);
  assert.equal(six.caseId,ready.caseId);assert.equal(getCase(six.caseId).commuteMinutes,45);
  assert.equal(act(six,'SIGN_CONFIRMED').outcome,'settled');
  const end=getTimeline(act(six,'SIGN_CONFIRMED')).at(-1);assert.match(end.items.map(i=>i.body).join(''),/2100/);
  assert.equal(end.tone,'success','an informed six-month choice is not a failed decision');
  assert.equal(act(createState('cycle'),'CHOOSE_SIX').caseId,'cycle');
});

test('shared bills, meter handover, and house rules are independent evidence',()=>{
  let state=createState('utilities');
  for(const a of ['c:fees:0','c:fees:1','c:fees:2'])state=act(state,a);
  assert.equal(state.facts.fees_2,true);assert.equal(state.facts.meter_2,false);assert.equal(state.facts.rules_2,false);
  const e=getTimeline(act(state,'SIGN')).find(x=>x.day===30);assert.equal(e.tone,'warning');
  assert.match(e.items[0].body,/费用附件/);assert.match(e.items[1].body,/缺少共同确认/);
  const fresh=createState('shoes');let observed=act(fresh,'c:occupancy:0');
  assert.equal(observed.facts.occupancy_2,false);assert.match(getDialog('shoes',observed).body.join(''),/待确认/);
});

test('roommate dialogue answers questions but cannot replace the initial physical observation',()=>{
  let state=createState('shoes'),d=getDialog('roommate',state);
  assert.equal(d.speaker,'roommate');assert.match(d.speakerName,/阿宁/);
  assert.equal(d.options.some(x=>x.action==='c:occupancy:0'),false);
  assert.equal(d.options.find(x=>x.action==='c:occupancy:1').disabled,true);
  state=act(state,'c:occupancy:0');d=getDialog('roommate',state);
  assert.equal(d.options.find(x=>x.action==='c:occupancy:1').disabled,false);
  state=act(state,'c:occupancy:1');assert.equal(getDialog('roommate',state).speaker,'roommate');
  assert.equal(state.facts.occupancy_2,false);
});

test('new rooms never inherit the first room’s leaks and their visible effects follow their own evidence',()=>{
  for(const c of newHomes){const scene=getSceneState(createState(c.id),30);assert.equal(scene.facts.repairVerified,true);assert.equal(scene.facts.dampVerified,true);}
  let u=createState('utilities');assert.equal(getSceneState(u,0).effects.billAlert,false);assert.equal(getSceneState(u,30).effects.billAlert,true);
  for(const a of ['c:fees:0','c:fees:1','c:fees:2'])u=act(u,a);
  assert.equal(getSceneState(u,30).effects.billAlert,true,'meter start still missing');
  for(const a of ['c:meter:0','c:meter:1','c:meter:2'])u=act(u,a);
  assert.equal(getSceneState(u,30).effects.billAlert,false);
  const shoes=createState('shoes');assert.equal(getSceneState(shoes,0).effects.sharedBusy,false);assert.equal(getSceneState(shoes,7).effects.sharedBusy,true);
  assert.equal(getSceneState(complete('shoes'),7).effects.sharedBusy,false);
  assert.equal(getSceneState(complete('shoes'),365).effects.packed,true);assert.equal(getSceneState(complete('shoes'),365).effects.keysReady,true);
});

test('fresh alternatives, cross-home imports, damaged saves and impossible facts cannot grant evidence',()=>{
  const a=complete('internship'),b=createState('internship-b');
  assert.deepEqual(restoreState(a,'internship-b'),b);
  assert.ok(Object.values(b.facts).every(v=>v===false));
  for(const c of newHomes){
    const fresh=createState(c.id),first=c.chains[0];
    const corrupt=JSON.parse(JSON.stringify(fresh));corrupt.facts[`${first.id}_2`]=true;
    assert.deepEqual(restoreState(corrupt,c.id),fresh);
    assert.deepEqual(restoreState({...fresh,pressure:99},c.id),fresh);
    assert.deepEqual(restoreState({...fresh,facts:{...fresh.facts,forged:true}},c.id),fresh);
    assert.deepEqual(restoreState({...fresh,lastAction:'ASK_OWNER'},c.id),fresh);
    assert.deepEqual(restoreState({...fresh,furniture:{sofa:{x:0,z:0,rotation:0}}},c.id),fresh);
  }
  const badChoice={...createState('choice'),lastAction:'CHOOSE_SIX'};assert.deepEqual(restoreState(badChoice),createState('choice'));
});

test('legacy progress migrates only into the original case and invalid actions remain true no-ops',()=>{
  const old=legacy.reduce(legacy.createState(),{type:'OBSERVE_LEAK'}),migrated=restoreState(old,'sunny');
  assert.equal(migrated.caseId,'sunny');assert.equal(migrated.facts.leakObserved,true);assert.equal(migrated.schemaVersion,4);
  assert.deepEqual(restoreState(old,'cycle'),createState('cycle'));
  for(const c of CASES){const s=createState(c.id);assert.equal(act(s,'BOGUS'),s);assert.equal(reduce(s,{type:'MOVE_FURNITURE',id:'sofa',position:{x:1,z:1,rotation:0}}),s);}
});

test('pause, leave and retry preserve only the selected home’s evidence without pretending anyone moved in',()=>{
  for(const decision of ['PAUSE','LEAVE']){
    const before=act(createState('utilities'),'c:fees:0'),ended=act(before,decision);
    assert.equal(ended.phase,'ending');assert.deepEqual(getTimeline(ended),[]);
    assert.match(getEnding(ended).body,/没有签约/);
    const retried=act(ended,'RETRY');assert.equal(retried.phase,'viewing');assert.deepEqual(retried.facts,before.facts);assert.equal(retried.decision,null);
    const reset=act(retried,'RESET');assert.deepEqual(reset,createState('utilities'));
  }
});
