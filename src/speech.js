const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Keep decimal amounts and trailing quotation marks attached to their sentence.
export function splitSpeech(body) {
  return (Array.isArray(body)?body:[body]).flatMap(paragraph=>{
    const text=String(paragraph??'').trim(),lines=[];let start=0;
    for(let i=0;i<text.length;i++){
      const terminal=/[。！？!?]/.test(text[i])||text[i]==='…'&&text[i+1]==='…'||text[i]==='.'&&!/\d/.test(text[i+1]||'');
      if(!terminal)continue;
      while(i+1<text.length&&/[。！？!?….”’」』）)】\]]/.test(text[i+1]))i++;
      const line=text.slice(start,i+1).trim();if(line)lines.push(line);start=i+1;
    }
    const rest=text.slice(start).trim();if(rest)lines.push(rest);return lines;
  });
}

export function createSpeechSequence(body,{instant=false}={}) {
  const lines=splitSpeech(body),letters=lines.map(line=>Array.from(line));
  let index=0,count=instant?(letters[0]?.length||0):0;
  const snapshot=()=>({lines,index,text:(letters[index]||[]).slice(0,count).join(''),complete:count>=(letters[index]?.length||0),done:!lines.length||index===lines.length-1&&count>=letters[index].length});
  return {
    snapshot,
    reveal(){count=Math.min(count+1,letters[index]?.length||0);return snapshot();},
    advance(){
      const current=snapshot();if(current.done)return current;
      if(!current.complete)count=letters[index].length;
      else {index++;count=instant?letters[index].length:0;}
      return snapshot();
    },
  };
}

export function renderSpeech(body,{key=''}={}) {
  const lines=splitSpeech(body);
  return `<section class="speech-playback" data-speech data-speech-key="${escape(key)}" data-speech-lines="${escape(JSON.stringify(lines))}" aria-label="逐句对话"><div class="speech-surface" data-speech-surface title="点击补全当前句，或继续下一句"><p data-speech-text aria-hidden="true"></p><span class="speech-caret" aria-hidden="true">▾</span></div><p class="sr-only" data-speech-announcement role="status" aria-live="polite" aria-atomic="true"></p><div class="speech-controls"><span data-speech-counter></span><span class="speech-key-hint">空格 / Enter / E 继续</span><button type="button" class="button secondary speech-next" data-speech-next>显示本句</button></div><details class="speech-history" hidden><summary>回看前面的对话</summary><div data-speech-history></div></details></section>`;
}

// Playback is transient UI state. It never writes evidence, choices or save data.
export function createSpeechPlayer({reducedMotion=()=>false}={}) {
  let element=null,scope=null,sequence=null,key=null,timer=null,paused=false,historyIndex=-1;
  const cancel=()=>{clearTimeout(timer);timer=null;};
  function dispose(){cancel();element=scope=sequence=null;key=null;historyIndex=-1;}
  function paint(){
    if(!element?.isConnected||!sequence)return;
    const frame=sequence.snapshot();
    element.querySelector('[data-speech-text]').textContent=frame.text;
    element.classList.toggle('is-typing',!frame.complete);
    element.classList.toggle('is-finished',frame.done);
    element.querySelector('[data-speech-counter]').textContent=frame.lines.length?`第 ${frame.index+1} / ${frame.lines.length} 句`:'';
    const next=element.querySelector('[data-speech-next]');
    next.textContent=frame.done?'说完了':frame.complete?'下一句':'显示本句';next.disabled=frame.done;
    const live=element.querySelector('[data-speech-announcement]');
    const announcement=frame.complete?frame.text:'';if(live.textContent!==announcement)live.textContent=announcement;
    for(const choices of scope.querySelectorAll('[data-speech-choices]')){choices.hidden=!frame.done;choices.inert=!frame.done;}
    if(historyIndex!==frame.index){
      historyIndex=frame.index;const history=element.querySelector('.speech-history');history.hidden=frame.index===0;
      element.querySelector('[data-speech-history]').innerHTML=frame.lines.slice(0,frame.index).map(line=>`<p>${escape(line)}</p>`).join('');
    }
  }
  function schedule(){
    cancel();if(paused||!element?.isConnected||!sequence||sequence.snapshot().complete)return;
    const last=sequence.snapshot().text.slice(-1),delay=/[，、；：,:;]/.test(last)?140:32;
    timer=setTimeout(()=>{sequence.reveal();paint();schedule();},delay);
  }
  function mount(root){
    cancel();const next=root.querySelector('[data-speech]');if(!next){dispose();return;}
    const nextKey=next.dataset.speechKey+'|'+next.dataset.speechLines;
    if(key!==nextKey||!sequence){sequence=createSpeechSequence(JSON.parse(next.dataset.speechLines),{instant:reducedMotion()});key=nextKey;}
    element=next;scope=next.closest('.conversation,.cp-paper')||next.parentElement;historyIndex=-1;paint();schedule();
  }
  function advance(){if(!sequence)return;cancel();sequence.advance();paint();schedule();}
  function click(event){
    const control=event.target.closest('[data-speech-next],[data-speech-surface]');
    if(!control||!element?.contains(control))return false;
    event.preventDefault();if(!sequence.snapshot().done)advance();return true;
  }
  function keydown(event){
    if(!element?.isConnected||![' ','Enter','e','E'].includes(event.key))return false;
    const target=event.target;
    if(target.closest('input,select,textarea,[contenteditable="true"],summary,a,button:not([data-speech-next])'))return false;
    // Only act while focus belongs to the current reading panel.
    const readingPanel=scope.closest('[role="dialog"]')||scope;
    if(!readingPanel.contains(target)&&target!==readingPanel)return false;
    if(sequence.snapshot().done)return false;
    event.preventDefault();if(!event.repeat)advance();return true;
  }
  function setPaused(value){paused=value;cancel();if(!paused)schedule();}
  return {mount,click,keydown,dispose,setPaused};
}
