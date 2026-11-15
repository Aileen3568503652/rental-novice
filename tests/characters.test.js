import test from 'node:test';
import assert from 'node:assert/strict';
import { CASES } from '../src/cases.js';
import { CHARACTERS, getCharacter, characterLabel } from '../src/characters.js';
import { portraitSvg } from '../src/art.js';

test('all authored people have explicit, consistent gender and portrait direction', () => {
  for (const home of CASES) for (const person of [home.host, home.owner, home.roommate, home.friend].filter(Boolean)) {
    assert.ok(CHARACTERS[person.name], `${person.name} needs an authored character, not a fallback`);
    const actor = getCharacter(person);
    assert.ok(['男', '女'].includes(actor.gender));
    assert.ok(characterLabel(person).includes(` · ${actor.gender}`));
    const svg = portraitSvg('neutral', 'agent', actor);
    assert.ok(svg.includes(`data-gender="${actor.gender}"`));
    assert.ok(svg.includes(`data-hair="${actor.hairStyle}"`));
    assert.ok(svg.includes(actor.shirt) && svg.includes(actor.hair));
  }
});

test('different actors have different silhouettes and their expressions preserve identity', () => {
  const profiles = ['小陈','秦姐','阿遥','小满','周女士'].map(name => getCharacter(name));
  assert.ok(new Set(profiles.map(x => x.hairStyle)).size >= 4);
  for (const actor of profiles) {
    const neutral=portraitSvg('neutral','agent',actor), tense=portraitSvg('tense','agent',actor);
    assert.notEqual(neutral,tense);
    assert.ok(tense.includes(`data-gender="${actor.gender}"`) && tense.includes(actor.hair));
  }
  assert.equal(getCharacter('小周').gender,'女');
  assert.equal(getCharacter('小满').gender,'男');
  assert.equal(getCharacter('小陈').gender,'男');
  assert.equal(getCharacter('秦姐').gender,'女');
});
