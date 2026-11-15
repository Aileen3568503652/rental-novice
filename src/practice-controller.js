import {createWorld} from './world.js';
import {PRACTICE_ID,PRACTICE_STORAGE_KEY,createPracticeState,restorePracticeState,reducePractice} from './contract-practice.js';
import {renderPractice} from './contract-view.js';
import {renderPostureControls,esc} from './views.js';

export const PRACTICE_HOME = {
  id:PRACTICE_ID,title:'签字前的最后一页',chapter:'独立练习',housingType:'whole',layout:'whole',palette:'sage',
  rent:3200,deposit:3200,leaseMonths:12,paymentMonths:1,serviceFee:80,
  address:'宁桥市云桥路18号402室（虚构）',host:{name:'小陈',role:'带看联系人'},owner:{name:'周女士',role:'房东'},timelineDays:[30,365],
};

export function createPracticeController({storage,onHome,onRender,notify,reduceMotion,getCrouchKey}) {
  let state=createPracticeState(),active=false,world=null,view='desk',target=null,cancelLapse=null,day=0,error='',saved=false,speechTurn=0;
  try {const raw=storage?.getItem(PRACTICE_STORAGE_KEY);if(raw){state=restorePracticeState(JSON.parse(raw));saved=true;}} catch { /* A denied save does not prevent practice. */ }
  function persist(){if(!active&&!saved)return false;try{storage?.setItem(PRACTICE_STORAGE_KEY,JSON.stringify(state));saved=Boolean(storage);return saved;}catch{return false;}}
  function sceneState(){
    world?.setStoryState({facts:{repairVerified:true,dampVerified:true,inventorySaved:state.issues.maintenance.signed},day,
      effects:{basinLeak:false,billAlert:day>=30&&(!state.issues.service.signed||!state.issues.utilities.signed),authorityAlert:day>0&&(!state.issues.authority.signed||!state.issues.payment.signed),packed:day>=365,keysReady:day>=365}});
    world?.setReducedMotion?.(reduceMotion());
    world?.setEnabled(active&&view==='room'&&!document.hidden);
  }
  function syncTarget(){
    const button=document.querySelector('.practice-scene-interact');if(!button)return;
    button.textContent=target?`E · ${target.title}`:'靠近人物或材料，按 E 查看';
    button.disabled=!target;
  }
  function finishLapse(){cancelLapse?.();cancelLapse=null;day=365;state=reducePractice(state,'day:365');view='desk';sceneState();world?.inspect('calendar');persist();onRender();}
  function enter(){
    active=true;speechTurn++;error='';view='desk';day=state.decision==='sign'?state.viewDay:0;
    const previous=document.querySelector('#world'),canvas=previous.cloneNode(false);previous.replaceWith(canvas);canvas.hidden=false;canvas.classList.remove('hidden');
    try{
      world=createWorld({canvas,caseConfig:PRACTICE_HOME,onTarget(value){target=value;syncTarget();},onPosture(){if(active&&view==='room')updatePosture();}});
      canvas.addEventListener('click',()=>{if(view==='room')world?.requestLook();});
      sceneState();world.inspect(state.decision==='sign'?(day===30?'bill':'calendar'):'desk');
    }catch(e){console.error('Practice room failed',e);error='3D 房间暂未加载，合同与材料仍可以阅读。';world?.dispose();world=null;}
    persist();onRender();
  }
  function leave(){persist();cancelLapse?.();cancelLapse=null;world?.releaseLook();world?.dispose();world=null;active=false;target=null;}
  function act(type){
    if(view==='cinematic')return;
    const previousPage=`${state.tab}:${state.documentId}:${state.topicId}`;
    const scrolls=Object.fromEntries(['.cp-document-nav','.cp-topic-nav','.cp-paper','.cp-main'].map(selector=>[selector,document.querySelector(selector)?.scrollTop||0]));
    const previous=state;state=reducePractice(state,type);if(state===previous)return;
    if(type==='GENERAL_ASK'||/^(request|confirm|sign):/.test(type))speechTurn++;
    persist();view='desk';world?.releaseLook();
    if(state.decision==='sign'&&previous.decision!=='sign'){
      day=0;view='cinematic';sceneState();onRender();
      if(!world){finishLapse();return;}
      cancelLapse=world.playTimeLapse({duration:reduceMotion()?0:4200,days:[30,365],views:['bill','calendar'],onStage(value){day=value;sceneState();onRender();},onComplete:finishLapse});
      return;
    }
    day=state.decision==='sign'?state.viewDay:0;sceneState();
    if(type.startsWith('day:'))world?.inspect(day===30?'bill':'calendar');
    onRender();
    const samePage=previousPage===`${state.tab}:${state.documentId}:${state.topicId}`;
    for(const [selector,scroll]of Object.entries(scrolls)){
      const element=document.querySelector(selector);
      if(element&&(samePage||selector.endsWith('-nav')))element.scrollTop=scroll;
    }
  }
  function inspect(id=target?.id){
    if(!id)return;
    const doc={desk:'clause1',folder:'authority',bill:'fees',phone:'chat',landlord:'listing',owner:'authority',door:'handover',meter:'handover',calendar:'clause2',sink:'handover',basin:'handover',aircon:'handover',fridge:'handover',stove:'handover'}[id]||'handover';
    world?.releaseLook();world?.resetPosture?.();world?.inspect(id);act(`open:${doc}`);
  }
  function updatePosture(){document.querySelectorAll('[data-posture]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.posture===world?.getPosture?.())));}
  function posture(mode){const result=world?.setPosture?.(mode);updatePosture();if(result&&!result.ok)notify(result.reason||'移到开阔处再站起');}
  function click(button){
    const data=button.dataset;
    if(view==='cinematic'){if(data.command==='practice-skip')finishLapse();return;}
    if(data.practiceAction){act(data.practiceAction);return;}
    if(data.posture){posture(data.posture);return;}
    if(data.practicePlace){world?.teleport(data.practicePlace);return;}
    switch(data.command){
      case 'practice-home':onHome();break;
      case 'practice-room':view='room';world?.resetPosture?.();sceneState();world?.teleport('survey');onRender();break;
      case 'practice-desk':speechTurn++;view='desk';world?.releaseLook();world?.resetPosture?.();sceneState();onRender();break;
      case 'practice-interact':inspect();break;
    }
  }
  function key(event){
    if(event.repeat)return;
    if(event.key==='Escape'){
      world?.releaseLook();if(view==='cinematic')finishLapse();else if(view==='room'){view='desk';world?.resetPosture?.();sceneState();onRender();}return;
    }
    if(view!=='room'||/INPUT|SELECT|TEXTAREA/.test(event.target?.tagName))return;
    if(event.key.toLowerCase()===getCrouchKey()){event.preventDefault();posture(world?.getPosture?.()==='standing'?'crouched':'standing');}
    if(event.key.toLowerCase()==='e')inspect();
  }
  function render(){
    if(view==='cinematic')return `<div class="cinema-bars"></div><section class="time-lapse" role="status"><div class="eyebrow">签字之后 · 日子向前走</div><strong>${day===365?'2028 年 2 月 29 日':day?`入住第 ${day} 天`:'2027 年 3 月 1 日'}</strong><p>把留下的约定，和后来的生活对一对。</p><div class="time-track"><i></i></div><button class="text-button" data-command="practice-skip">跳过时间过场</button></section>`;
    if(view==='desk')return renderPractice(state,{speechTurn})+(error?`<p class="practice-load-note">${esc(error)}</p>`:'');
    return `<header class="practice-scene-header"><div><strong>签字前的最后一页</strong><small>宁桥市 · 一人整租 · 小陈（男，联系人）／周女士（女，房东）</small></div><div><button class="button secondary" data-command="practice-home">返回选房</button><button class="button primary" data-command="practice-desk">回到合同桌</button></div></header><aside class="practice-scene-instructions">房源、人物和合同都是虚构的。可以先走一圈，再对照文件；打开材料不会自动确认内容。<br>W A S D 移动 · 鼠标转向 · E 查看<br>家具保持原位，检查可见边角。</aside><div class="crosshair"></div>${renderPostureControls(world?.getPosture?.(),getCrouchKey())}<nav class="practice-scene-nav" aria-label="练习房间导航">${[['landlord','小陈'],['folder','授权'],['phone','聊天'],['bill','费用单'],['door','交接'],['desk','合同桌']].map(([id,label])=>`<button data-practice-place="${id}">${label}</button>`).join('')}</nav><button class="practice-scene-interact" data-command="practice-interact" ${target?'':'disabled'}>${target?`E · ${esc(target.title)}`:'靠近人物或材料，按 E 查看'}</button><div id="toast" class="toast" role="status"></div>`;
  }
  return {enter,leave,click,key,render,persist,sceneState,get active(){return active;},get saved(){return saved;},get cinematic(){return view==='cinematic';}};
}
