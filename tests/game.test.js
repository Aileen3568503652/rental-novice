import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, reduce, restoreState, getDialog, getNotebook, getEnding, getTimeline, getCaseProgress } from '../src/game.js';

const act = (state, ...actions) => actions.reduce((s, action) => reduce(s, typeof action === 'string' ? { type: action } : action), state);
const move = (id, position = { x: 0.4, z: -1.2, rotation: Math.PI / 2 }) => ({ type: 'MOVE_FURNITURE', id, position });
const leak = s => act(s, 'OBSERVE_LEAK', 'REQUEST_REPAIR', 'VERIFY_REPAIR');
const damp = s => act(s, 'OPEN_CABINET', 'INSPECT_DAMP', 'REQUEST_DAMP_REPAIR', 'VERIFY_DAMP_REPAIR');
const fees = s => act(s, 'ASK_FEES', 'READ_BILL', 'WRITE_FEES');
const scratch = s => act(s, 'CHECK_SOFA_EDGE', 'INSPECT_SCRATCH', 'SAVE_INVENTORY');
const full = () => [leak, damp, fees, scratch].reduce((s, apply) => apply(s), createState());
const serialized = value => JSON.parse(JSON.stringify(value));
const dialogText = (id, state) => getDialog(id, state).body.join('');

test('a new whole-home case starts without evidence or performance statistics', () => {
  const s = createState();
  assert.equal(s.schemaVersion, 3);
  assert.equal(s.phase, 'viewing');
  assert.ok(Object.values(s.facts).every(value => value === false));
  assert.deepEqual(s.furniture, {});
  assert.deepEqual(getTimeline(s), []);
  assert.equal(getCaseProgress(s).chains.length, 4);
  assert.ok(getCaseProgress(s).chains.every(chain => chain.status === 'unknown'));
  assert.deepEqual(Object.keys(s).sort(), ['schemaVersion', 'phase', 'facts', 'furniture', 'pressure', 'lastAction', 'decision', 'outcome'].sort());
});

test('water leak requires observation, repair and a meaningful recheck, in that order', () => {
  const initial = createState();
  assert.strictEqual(act(initial, 'REQUEST_REPAIR', 'VERIFY_REPAIR'), initial);
  const noticed = act(initial, 'OBSERVE_LEAK');
  assert.strictEqual(act(noticed, 'VERIFY_REPAIR'), noticed);
  const requested = act(noticed, 'REQUEST_REPAIR');
  for (const s of [initial, noticed, requested]) assert.equal(getTimeline(act(s, 'SIGN'))[0].tone, 'warning');
  assert.match(getTimeline(act(requested, 'SIGN'))[0].body, /密封圈没有换/);
  const checked = act(requested, 'VERIFY_REPAIR');
  assert.equal(getTimeline(act(checked, 'SIGN'))[0].tone, 'success');
  assert.match(dialogText('sink', checked), /更换了老化密封圈/);
  assert.equal(initial.facts.leakObserved, false);
  assert.equal(requested.facts.repairVerified, false);
});

test('heavy furniture cannot move or rotate; all three light objects remain movable', () => {
  const s = createState();
  for (const id of ['cabinet', 'sofa', 'bed', 'desk', 'sink', 'bathroom']) {
    assert.strictEqual(act(s, move(id)), s, id);
    assert.strictEqual(act(s, move(id, { x: 5.25, z: 1.1, rotation: Math.PI })), s, id);
  }
  for (const id of ['chair', 'plant', 'coffee']) {
    const action = move(id), changed = act(s, action);
    assert.deepEqual(changed.furniture[id], action.position);
    assert.notStrictEqual(changed.furniture[id], action.position, 'the stored position must not alias the action');
    assert.deepEqual(restoreState(serialized(changed)), changed);
  }
  assert.deepEqual(s.furniture, {});
});

test('opening the cabinet and lighting the sofa are required before inspecting evidence', () => {
  for (const [id, prepare, inspect, fact] of [
    ['cabinet', 'OPEN_CABINET', 'INSPECT_DAMP', 'dampObserved'],
    ['sofa', 'CHECK_SOFA_EDGE', 'INSPECT_SCRATCH', 'scratchFound'],
  ]) {
    const initial = createState();
    assert.strictEqual(act(initial, inspect), initial);
    assert.equal(act(initial, move(id), inspect).facts[fact], false, 'dragging a heavy object cannot bypass the inspection');
    assert.equal(getDialog(id, initial).options.find(o => o.action === inspect).disabled, true);
    const prepared = act(initial, prepare);
    assert.equal(prepared.facts[fact], false, 'preparation does not grant evidence');
    assert.equal(getDialog(id, prepared).options.find(o => o.action === inspect).disabled, false);
    const seen = act(prepared, inspect, prepare);
    assert.equal(seen.facts[fact], true, 'repeating preparation does not erase evidence');
    assert.deepEqual(seen.furniture, {}, 'both evidence chains work without moving heavy furniture');
    assert.deepEqual(restoreState(serialized(seen)), seen);
  }
});

test('damp evidence comes from the opened backboard and landlord record, with root-cause repair', () => {
  const s = createState();
  assert.strictEqual(act(s, 'REQUEST_DAMP_REPAIR', 'VERIFY_DAMP_REPAIR'), s);
  const seen = act(s, 'OPEN_CABINET', 'INSPECT_DAMP');
  assert.strictEqual(act(seen, 'VERIFY_DAMP_REPAIR'), seen);
  assert.match(dialogText('cabinet', seen), /周女士.*旧报修记录/);
  assert.match(dialogText('cabinet', seen), /下层背板/);
  const pending = act(seen, 'REQUEST_DAMP_REPAIR');
  assert.match(getTimeline(act(pending, 'SIGN'))[1].items[0].body, /表面补过漆/);
  const fixed = act(pending, 'VERIFY_DAMP_REPAIR');
  assert.match(getTimeline(act(fixed, 'SIGN'))[1].items[0].title, /没有新的潮痕/);
  assert.match(dialogText('cabinet', fixed), /师傅.*拆下固定件/);
  assert.match(dialogText('cabinet', fixed), /衣柜重新固定/);
  assert.match(dialogText('cabinet', fixed), /打开柜门检查原位置/);
});

test('written fees require quote and bill in either order, and use this home’s own actual bills', () => {
  const s = createState();
  assert.strictEqual(act(s, 'WRITE_FEES'), s);
  for (const first of ['ASK_FEES', 'READ_BILL']) {
    const partial = act(s, first);
    assert.strictEqual(act(partial, 'WRITE_FEES'), partial);
  }
  for (const order of [['ASK_FEES', 'READ_BILL'], ['READ_BILL', 'ASK_FEES']]) {
    const unresolved = act(s, ...order);
    assert.equal(getCaseProgress(unresolved).chains.find(c => c.id === 'fees').status, 'pending');
    const fixed = act(unresolved, 'WRITE_FEES');
    assert.equal(fixed.facts.feesWritten, true);
    const bill = dialogText('bill', fixed);
    assert.match(bill, /4200/);
    assert.match(bill, /80/);
    assert.match(bill, /本户独立表按实际账单/);
    assert.match(bill, /双方各留一份/);
    assert.doesNotMatch(bill, /分摊|共用|公共服务费|2200|2280/);
    assert.match(getTimeline(act(fixed, 'SIGN'))[1].items[1].body, /本户独立表/);
    assert.doesNotMatch(dialogText('landlord', act(fixed, 'ASK_FEES')), /差不多全包/);
  }
});

test('scratch inspection alone does not create the jointly confirmed handover evidence', () => {
  const s = createState();
  assert.strictEqual(act(s, 'SAVE_INVENTORY'), s);
  const seen = act(s, 'CHECK_SOFA_EDGE', 'INSPECT_SCRATCH');
  assert.equal(getTimeline(act(seen, 'SIGN'))[2].tone, 'warning');
  assert.match(getTimeline(act(seen, 'SIGN'))[2].body, /争议还没有解决/);
  const saved = act(seen, 'SAVE_INVENTORY');
  assert.equal(getTimeline(act(saved, 'SIGN'))[2].tone, 'success');
  assert.match(getTimeline(act(saved, 'SIGN'))[2].body, /撤回了这一项维修扣款要求/);
  assert.match(dialogText('sofa', saved), /周女士核对后确认/);
});

test('all 16 combinations of the four chains produce independent, stable consequences', () => {
  const chains = [leak, damp, fees, scratch];
  for (let mask = 0; mask < 16; mask += 1) {
    let s = createState();
    chains.forEach((apply, i) => { if (mask & (1 << i)) s = apply(s); });
    s = act(s, 'SIGN');
    const timeline = getTimeline(s);
    assert.deepEqual(timeline.map(event => event.day), [7, 30, 365]);
    assert.equal(timeline[0].tone === 'success', Boolean(mask & 1));
    assert.equal(timeline[1].tone === 'success', Boolean((mask & 2) && (mask & 4)));
    assert.equal(timeline[2].tone === 'success', Boolean(mask & 8));
    assert.equal(s.outcome, mask === 15 ? 'settled' : 'unresolved');
    assert.deepEqual(getTimeline(restoreState(serialized(s))), timeline);
    assert.strictEqual(act(s, 'VERIFY_REPAIR', 'CHECK_BATHROOM', move('chair')), s, 'ending cannot retroactively change the signed case');
  }
});

test('the home is one-bedroom, one-living-room, one-bathroom and has private facilities', () => {
  const s = createState(), room = act(s, 'ASK_ROOM');
  assert.match(dialogText('landlord', room), /一室一厅一卫/);
  assert.match(dialogText('landlord', room), /厨房和卫生间都由你独用/);
  assert.match(dialogText('landlord', room), /钥匙和门卡/);
  assert.match(dialogText('desk', s), /押金 4200.*租期十二个月/);
  assert.match(dialogText('owner', act(s, 'ASK_TERM')), /付款是按月.*租期可是一年/);
  const checked = act(s, 'CHECK_BATHROOM');
  assert.equal(checked.facts.bathroom, true);
  assert.match(dialogText('bathroom', checked), /独用.*试了冲水、洗手盆排水和排风/);
  assert.equal(getCaseProgress(checked).chains.length, 4, 'bathroom inspection does not add a fifth failure chain');
  for (const id of ['landlord', 'owner', 'sink', 'cabinet', 'sofa', 'bill', 'bathroom', 'desk', 'door', 'window']) {
    for (const stage of [s, room, checked, full()]) assert.doesNotMatch(dialogText(id, stage), /室友|共用|合租|按人数|2200|2280/);
  }
});

test('pressure is story pacing, never an automatic signature or repeat-action counter', () => {
  let s = act(createState(), 'OPEN_CABINET', 'CHECK_SOFA_EDGE');
  assert.equal(s.pressure, 0, 'quiet preparation does not count as another round of negotiation');
  s = act(s, 'ASK_ROOM');
  for (let i = 0; i < 20; i += 1) s = act(s, 'ASK_ROOM');
  assert.equal(s.pressure, 1);
  s = act(s, 'ASK_FEES', 'READ_BILL', 'ASK_AUTHORITY');
  assert.equal(s.pressure, 3);
  assert.equal(s.phase, 'viewing');
  assert.equal(s.decision, null);
  s = act(s, 'RESIST_PRESSURE', 'ASK_ROOM', 'ASK_FEES');
  assert.equal(s.pressure, 0, 'previously asked questions do not recreate pressure');
  assert.ok(getDialog('owner', s).options.some(option => option.action === 'PAUSE' && !option.disabled));
});

test('pause and leave are neutral decisions; retry preserves evidence and light furniture', () => {
  const s = act(createState(), move('chair'), 'OPEN_CABINET', 'INSPECT_DAMP', 'ASK_FEES');
  for (const action of ['PAUSE', 'LEAVE']) {
    const ending = act(s, action);
    assert.equal(getEnding(ending).tone, 'neutral');
    assert.deepEqual(getTimeline(ending), []);
    assert.match(getEnding(ending).body, /没有签约或付款/);
    assert.deepEqual(restoreState(serialized(ending)), ending);
    const retry = act(ending, 'RETRY');
    assert.deepEqual(retry.facts, s.facts);
    assert.deepEqual(retry.furniture, s.furniture);
    assert.equal(retry.phase, 'viewing');
    assert.equal(retry.decision, null);
    assert.equal(retry.outcome, null);
    assert.deepEqual(act(retry, 'RESET'), createState());
  }
});

test('saves round-trip legal positions, without aliasing or arbitrary payloads', () => {
  const s = act(full(), move('chair'));
  const restored = restoreState({ ...serialized(s), extra: 'discard', facts: { ...s.facts, secret: true } });
  assert.deepEqual(restored, s);
  assert.notStrictEqual(restored.facts, s.facts);
  assert.notStrictEqual(restored.furniture.chair, s.furniture.chair);
  assert.strictEqual(act(s, 'MOVE_FURNITURE'), s);
  for (const bad of [NaN, Infinity, '1', 50]) {
    assert.strictEqual(act(s, move('chair', { x: bad, z: 0, rotation: 0 })), s);
  }
  assert.strictEqual(act(s, move('__proto__')), s);
  assert.strictEqual(act(s, { type: 'MOVE_FURNITURE', id: 'chair' }), s);
});

test('older, contradictory, or damaged saves safely restart', () => {
  const s = createState();
  const invalid = [
    null, {}, { ...s, schemaVersion: 1 }, { ...s, schemaVersion: 2 }, { ...s, pressure: 4 }, { ...s, pressure: 1.2 }, { ...s, lastAction: '<script>' },
    { ...s, facts: { ...s.facts, repairVerified: true } }, { ...s, facts: { ...s.facts, dampRequested: true } },
    { ...s, facts: { ...s.facts, inventorySaved: true } }, { ...s, facts: { ...s.facts, feesWritten: true } },
    { ...s, facts: { ...s.facts, dampObserved: true } }, { ...s, facts: { ...s.facts, scratchFound: true } },
    { ...s, lastAction: 'ASK_AUTHORITY' }, { ...s, facts: { ...s.facts, room: 'true' } }, { ...s, phase: 'ending', decision: 'sign', outcome: 'settled' },
    { ...s, furniture: [] }, { ...s, furniture: { chair: { x: NaN, z: 1, rotation: 0 } } },
    { ...s, furniture: { sofa: { x: -5, z: 1, rotation: 0 } } }, { ...s, furniture: { cabinet: { x: 5, z: 1, rotation: 0 } } },
    { ...s, furniture: { chair: { x: 0, z: 0, rotation: 99 } } }, { ...s, furniture: { unknown: { x: 0, z: 0, rotation: 0 } } },
  ];
  for (const bad of invalid) assert.deepEqual(restoreState(bad), createState());
});

test('fixed dialogue is stable; limits live in the review rather than every dialogue footer', () => {
  const fresh = createState();
  const before = getDialog('landlord', act(fresh, 'ASK_FEES'));
  getDialog('landlord', act(fees(fresh), 'ASK_FEES'));
  assert.deepEqual(getDialog('landlord', act(fresh, 'ASK_FEES')), before);
  for (const id of ['landlord', 'owner', 'sink', 'desk', 'window', 'cabinet', 'sofa', 'bill', 'door', 'bathroom']) {
    const dialog = getDialog(id, fresh);
    assert.ok(dialog.body.every(line => typeof line === 'string'));
    assert.ok(dialog.options.every(o => typeof o.label === 'string' && typeof o.action === 'string'));
  }
  const result = getEnding(act(full(), 'SIGN'));
  assert.match(result.items.at(-1).body, /提前退出条款仍需谈妥/);
  assert.match(result.items.at(-1).body, /人物表情不是真假判断依据/);
  assert.match(result.items.at(-1).body, /虚构/);
  assert.match(getNotebook(act(fresh, 'CHECK_NOISE')).find(n => n.title === '光线与声音').detail, /晚间邻户和楼道声音待确认/);
});
