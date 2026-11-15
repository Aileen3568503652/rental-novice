import test from 'node:test';
import assert from 'node:assert/strict';
import { CASES } from '../src/cases.js';
import { createState, reduce, getDialog, restoreState } from '../src/campaign.js';

for (const id of ['keys', 'transfer', 'summer']) {
  test(`${id}: a friend's story supplies context without confirming rental authority`, () => {
    const config = CASES.find(c => c.id === id);
    assert.ok(config.friend);
    assert.notEqual(config.friend.name, config.host.name);
    assert.ok(config.spots.some(s => (s.id || s.target) === 'friend'));
    let state = createState(id);
    state = reduce(state, { type: 'c:referral:0' });
    assert.equal(state.facts.referral_0, true);
    assert.equal(getDialog('friend', state).speaker, 'friend');
    assert.match(getDialog('friend', state).speakerName, new RegExp(config.friend.name));
    state = reduce(state, { type: 'c:referral:1' });
    assert.equal(state.facts.referral_1, true);
    assert.equal(state.facts.authority_2, false);
    assert.strictEqual(reduce(state, { type: 'c:referral:2' }), state, 'must contact the owner before arranging joint follow-up');
    state = reduce(state, { type: 'ASK_OWNER' });
    state = reduce(state, { type: 'c:referral:2' });
    assert.equal(state.facts.referral_2, true);
    assert.equal(state.facts.authority_2, false, 'introductions never replace the separate authority evidence chain');
    assert.deepEqual(restoreState(JSON.parse(JSON.stringify(state))), state, 'the extra character conversation persists');
  });
}

test('a companion is present only in cases whose story calls for one', () => {
  assert.deepEqual(CASES.filter(c => c.friend).map(c => c.id).sort(), ['keys', 'summer', 'transfer']);
});
