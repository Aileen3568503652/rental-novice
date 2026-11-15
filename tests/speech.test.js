import test from 'node:test';
import assert from 'node:assert/strict';
import {splitSpeech,createSpeechSequence} from '../src/speech.js';

test('speech keeps Chinese quotes and decimal money intact, and respects paragraph boundaries',()=>{
  assert.deepEqual(splitSpeech(['小陈说：“月租2477.42元。别着急！”再看一眼？','材料还没给', '先等等……好的。']),['小陈说：“月租2477.42元。','别着急！”','再看一眼？','材料还没给','先等等……','好的。']);
  assert.deepEqual(splitSpeech(['','  ',null]),[]);
});
test('one advance fills the current sentence, the next starts only the following sentence',()=>{
  const speech=createSpeechSequence('你先看。再聊价格。');
  assert.equal(speech.snapshot().text,'');assert.equal(speech.snapshot().done,false);
  speech.reveal();assert.equal(speech.snapshot().text,'你');
  assert.equal(speech.advance().text,'你先看。');assert.equal(speech.snapshot().done,false);
  assert.equal(speech.advance().text,'');assert.equal(speech.snapshot().index,1);
  assert.equal(speech.advance().text,'再聊价格。');assert.equal(speech.snapshot().done,true);
  assert.equal(speech.advance().index,1);
});
test('reduced animation reveals one sentence at a time, never the whole conversation',()=>{
  const speech=createSpeechSequence(['先核对身份。','再核对收款。'],{instant:true});
  assert.equal(speech.snapshot().text,'先核对身份。');assert.equal(speech.snapshot().done,false);
  assert.equal(speech.advance().text,'再核对收款。');assert.equal(speech.snapshot().done,true);
});
test('Unicode characters are revealed whole and reading does not mutate the supplied dialogue',()=>{
  const body=['🏠您好。','请坐。'],speech=createSpeechSequence(body);
  assert.equal(speech.reveal().text,'🏠');speech.advance();speech.advance();speech.advance();
  assert.deepEqual(body,['🏠您好。','请坐。']);assert.equal(createSpeechSequence([]).snapshot().done,true);
});
