import test from 'node:test';
import assert from 'node:assert/strict';
import { CASES, SCENARIOS } from '../src/cases.js';
import * as legacy from '../src/game.js';
import { createState, reduce, restoreState, getDialog, getNotebook, getTimeline, getLeaseTerms, getSceneState } from '../src/campaign.js';
import { INSPECTION_GROUPS, COMPARISON_LISTINGS, getInspectionProgress, getInspectionSpots, inspectionCoverage } from '../src/inspections.js';

const act = (state, type) => reduce(state, { type });
const copy = state => JSON.parse(JSON.stringify(state));
const groupsFor = id => INSPECTION_GROUPS.filter(group => group.cases.includes(id));
function readyCore(id) {
  let state = createState(id);
  if (id === 'sunny') return act(state, 'ASK_AUTHORITY');
  state = act(state, 'ASK_OWNER');
  for (let pass = 0; pass < 8; pass++) for (const chain of SCENARIOS[id].chains) {
    for (const choice of getDialog(chain.target, state).options.filter(option => option.action?.startsWith('c:') && !option.disabled)) state = act(state, choice.action);
  }
  if (id === 'keys') state = act(state, 'MATCH_EIGHT');
  return state;
}
function completeGroup(state, id) {
  const group = groupsFor(state.caseId).find(group => group.id === id);
  for (let i = 0; i < group.steps.length; i++) state = act(state, `i:${id}:${i}`);
  return state;
}

test('all fifty 1.1 source claims are traceable to real available interactions in the nine original cases', () => {
  const expected = [...Array.from({ length: 26 }, (_, i) => `A${String(i + 1).padStart(2, '0')}`), ...Array.from({ length: 24 }, (_, i) => `B${String(i + 1).padStart(2, '0')}`)];
  assert.deepEqual([...new Set(inspectionCoverage().map(row => row.code))].sort(), expected);
  assert.equal(INSPECTION_GROUPS.length, 20);
  assert.equal(new Set(INSPECTION_GROUPS.map(group => group.id)).size, 20);
  for (const row of inspectionCoverage()) for (const id of row.caseIds) {
    assert.ok(CASES.some(item => item.id === id && !item.variantOf));
    const options = getDialog(row.target, createState(id)).options;
    for (const action of row.actions) assert.ok(options.some(option => option.action === action), `${id}/${action} visible`);
    assert.ok(getInspectionSpots(id).some(spot => spot.id === row.target));
  }
  assert.deepEqual(getInspectionSpots('internship-b'), []);
});

test('every new inspection respects its sequence, stays separate from core facts, and survives saving', () => {
  for (const config of CASES.filter(item => !item.variantOf)) {
    let state = readyCore(config.id);
    const oldFacts = copy(state.facts), oldTerms = getLeaseTerms(state);
    for (const group of groupsFor(config.id)) {
      assert.strictEqual(act(state, `i:${group.id}:1`), state, `${config.id}/${group.id} cannot skip observation`);
      for (let i = 0; i < group.steps.length; i++) {
        const action = `i:${group.id}:${i}`;
        assert.equal(getDialog(group.target, state).options.find(option => option.action === action).disabled, false);
        state = act(state, action);
        assert.equal(state.inspections.facts[`${group.id}_${i}`], true);
        assert.deepEqual(state.facts, oldFacts, `${config.id}: inspection must not grant old evidence`);
      }
      assert.strictEqual(act(state, `i:${group.id}:${group.steps.length - 1}`), state, 'same step does not count again');
    }
    assert.deepEqual(getLeaseTerms(state), oldTerms, `${config.id}: inspection never silently changes contract money`);
    assert.deepEqual(restoreState(copy(state)), state);
    const signed = act(state, 'SIGN');
    assert.deepEqual(restoreState(copy(signed)), signed);
    assert.strictEqual(act(signed, `i:${groupsFor(config.id)[0].id}:0`), signed);
  }
});

test('v4 and legacy v3 migrations preserve original progress while all new checks start false', () => {
  for (const id of ['sunny','cycle','keys','summer']) {
    const prior = readyCore(id);
    delete prior.inspections;
    const restored = restoreState(copy(prior));
    assert.deepEqual(restored.facts, prior.facts);
    assert.equal(restored.contractChoice, prior.contractChoice);
    assert.ok(Object.values(restored.inspections.facts).every(value => value === false));
  }
  const original = legacy.reduce(legacy.createState(), { type: 'ASK_FEES' });
  const restored = restoreState(copy(original));
  assert.equal(restored.facts.fees, true);
  assert.ok(Object.values(restored.inspections.facts).every(value => value === false));
});

test('a damaged new group is reset without erasing the original case or unrelated valid checks', () => {
  let state = act(act(createState('sunny'), 'ASK_FEES'), 'i:appliances:0');
  const damaged = copy(state);
  damaged.inspections.facts.basin_4 = true;
  const restored = restoreState(damaged);
  assert.equal(restored.facts.fees, true);
  assert.equal(restored.inspections.facts.appliances_0, true);
  assert.equal(restored.inspections.facts.basin_4, false);
  const swapped = restoreState({ ...copy(state), inspections: copy(createState('summer').inspections) });
  assert.equal(swapped.facts.fees, true);
  assert.ok(Object.values(swapped.inspections.facts).every(value => !value));
  const corruptCore = restoreState({ ...copy(state), phase: 'invented' });
  assert.deepEqual(corruptCore, createState('sunny'));
});

test('opening and bending are preparations, and the existing kitchen shortcut remains equivalent', () => {
  let state = createState('sunny');
  for (const type of ['i:sinkcheck:0','i:sinkcheck:1','i:sinkcheck:2']) state = act(state, type);
  assert.equal(state.facts.leakObserved, false);
  assert.equal(state.facts.repairVerified, false);
  assert.equal(getInspectionProgress(state).chains.find(chain => chain.id === 'sinkcheck').status, 'pending');
  const shortcut = act(createState('sunny'), 'OBSERVE_LEAK');
  assert.equal(shortcut.facts.leakObserved, true);
  assert.equal(shortcut.inspections.facts.sinkcheck_0, true);
  assert.equal(shortcut.inspections.facts.sinkcheck_2, true);
});

test('washbasin observation, repair record and actual recheck do not substitute for kitchen repairs', () => {
  let state = createState('sunny');
  for (const type of ['OBSERVE_LEAK','REQUEST_REPAIR','VERIFY_REPAIR']) state = act(state, type);
  assert.equal(getSceneState(state, 7).facts.repairVerified, true);
  assert.equal(getSceneState(state, 7).effects.basinLeak, true);
  for (let i = 0; i <= 4; i++) state = act(state, `i:basin:${i}`);
  assert.equal(getSceneState(state, 7).effects.basinLeak, true, 'a repair report alone is not a recheck');
  state = act(state, 'i:basin:5');
  assert.equal(getSceneState(state, 7).effects.basinLeak, false);
  const onlyBasin = completeGroup(createState('sunny'), 'basin');
  assert.equal(getSceneState(onlyBasin, 7).facts.repairVerified, false);
  assert.equal(getSceneState(onlyBasin, 7).effects.basinRepaired, true);
  const feedback = getTimeline(act(onlyBasin, 'SIGN')).find(event => event.day === 7);
  assert.equal(feedback.tone, 'warning', 'old kitchen outcome remains independent');
  assert.equal(feedback.items.find(item => item.inspection && item.title.includes('洗手台')).tone, 'success');
});

test('personal photos cannot become joint handover until authority and the prior steps are checked', () => {
  let state = createState('summer');
  state = act(state, 'i:checkout:0');
  state = act(state, 'i:checkout:1');
  assert.strictEqual(act(state, 'i:checkout:2'), state);
  assert.equal(getDialog('door', state).options.find(option => option.action === 'i:checkout:2').disabled, true);
  const prepared = readyCore('summer');
  state = restoreState({ ...prepared, inspections: state.inspections });
  state = act(state, 'i:checkout:2');
  assert.equal(state.inspections.facts.checkout_2, true);
});

test('missing air reports, drawings, rejected free days and unsent revisions remain pending', () => {
  for (const [caseId, groupId] of [['transfer','air'],['shoes','structure'],['internship','concession'],['keys','disputes']]) {
    let state = readyCore(caseId);
    const terms = getLeaseTerms(state);
    state = completeGroup(state, groupId);
    assert.equal(getInspectionProgress(state).chains.find(chain => chain.id === groupId).status, 'pending');
    assert.deepEqual(getLeaseTerms(state), terms);
  }
  const air = completeGroup(createState('transfer'), 'air');
  assert.match(getInspectionProgress(air).chains.find(chain => chain.id === 'air').detail, /空气情况未核实/);
  const draft = completeGroup(createState('keys'), 'sublet');
  assert.equal(getInspectionProgress(draft).chains.find(chain => chain.id === 'sublet').status, 'pending');
});

test('layout preferences are an explicit reversible choice without a score or a contract decision', () => {
  const fresh = createState('sunny');
  assert.strictEqual(act(fresh, 'i:preference:unfit'), fresh);
  let state = completeGroup(fresh, 'sunlayout');
  assert.equal(state.inspections.preferences.layout, null);
  const facts = copy(state.facts);
  state = act(state, 'i:preference:unfit');
  assert.equal(state.inspections.preferences.layout, 'unfit');
  assert.equal(state.decision, null);
  assert.deepEqual(state.facts, facts);
  assert.deepEqual(restoreState(copy(state)), state);
  state = act(state, 'i:preference:like');
  assert.equal(state.inspections.preferences.layout, 'like');
  assert.ok(getNotebook(state).some(note => note.inspection && note.detail.includes('喜欢这个布局')));
});

test('the comparison listing remains unviewed, and an unsigned installment never changes the housing budget', () => {
  const listing = COMPARISON_LISTINGS.choice;
  assert.equal(listing.viewed, false);
  assert.equal(listing.rent, 2500);
  assert.equal(listing.transportEstimate, 220);
  const choice = completeGroup(createState('choice'), 'outside');
  assert.equal(choice.decision, null);
  assert.match(getDialog('door', choice).body.join(''), /还没有实地看过/);
  const original = createState('cycle'), proposed = act(original, 'i:installment:0');
  assert.match(getDialog('phone', proposed).body.join(''), /11550/);
  assert.match(getDialog('phone', proposed).body.join(''), /962.50/);
  assert.deepEqual(getLeaseTerms(completeGroup(proposed, 'installment')), getLeaseTerms(original));
  assert.strictEqual(act({ caseId: 'unknown' }, 'i:basin:0').caseId, 'sunny');
});
