import { createSpeechPlayer } from './speech.js';
import './style.css';
import { createWorld } from './world.js';
import { CASES, getCase } from './cases.js';
import { createState, reduce, restoreState, getDialog, getTimeline, getSceneState, getLeaseTerms } from './campaign.js';
import { createLibrary, readLibrary, writeLibrary } from './storage.js';
import { renderHome, renderHousingDetail } from './menu.js';
import { pixelIcon as icon } from './art.js';
import { renderCityReference, CITY_REFERENCES } from './city-reference.js';
import { createPracticeController } from './practice-controller.js';
import { esc, shell, closeButton, furnitureNames, movableFurniture, renderDialog, renderNotebook, renderFurniture, renderEnding, renderHelp, renderCinematic, renderHUD } from './views.js';

const app=document.querySelector('#app'),announcer=document.querySelector('#announcer');
let canvas=document.querySelector('#world'),storage;
let library=createLibrary(),saveAvailable=true;
try { storage=window.localStorage; ({library,available:saveAvailable}=readLibrary(storage)); } catch { saveAvailable=false; }
let state=createState('sunny'),config=getCase('sunny');
let started=false,modal='home',selectedCaseId=null,dialogId=null,target=null,world=null,errorMessage='';
let furnitureId='chair',morePlaces=false,reviewDay=0,cinematic=false,cancelTimeLapse=null,pendingSignType='SIGN';
let muted=true,audioContext,toastTimer,homeScroll=0,homeOverlay=null,cityId='beijing',noteTab='all';
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const validCase=id=>CASES.some(c=>c.id===id);
const reduceCameraMotion=()=>library.preferences.reduceMotion==='reduce'||reducedMotion.matches;
let dialogueTurn=0;
const speech=createSpeechPlayer({reducedMotion:reduceCameraMotion});
const practice=createPracticeController({storage,onHome:()=>showHome(),onRender:()=>render(),notify:announce,reduceMotion:reduceCameraMotion,getCrouchKey:()=>library.preferences.crouchKey});

function tone(kind='tap') {
  if(muted)return;
  try {
    audioContext ||= new (window.AudioContext||window.webkitAudioContext)();void audioContext.resume();
    const osc=audioContext.createOscillator(),gain=audioContext.createGain();
    const f={tap:410,find:720,water:210,phone:560,time:290}[kind]||410;
    osc.type='triangle';osc.frequency.setValueAtTime(f,audioContext.currentTime);osc.frequency.exponentialRampToValueAtTime(f*.65,audioContext.currentTime+.19);
    gain.gain.setValueAtTime(.025,audioContext.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+.22);
    osc.connect(gain).connect(audioContext.destination);osc.start();osc.stop(audioContext.currentTime+.23);
  } catch { /* Sound is optional. */ }
}
function savePreferences(){saveAvailable=storage?writeLibrary(storage,library):false;}
function persist(){if(started){library.saves[state.caseId]=state;library.activeCaseId=state.caseId;}savePreferences();}
function announce(text){
  announcer.textContent=text;const el=document.querySelector('#toast');
  if(el){el.textContent=text;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),3000);}
}
function syncWorld(){
  if(practice.active){practice.sceneState();return;}
  if(!world)return;
  world.setReducedMotion?.(reduceCameraMotion());
  world.setStoryState(getSceneState(state,state.decision==='sign'?reviewDay:0));
  world.setEnabled(started&&!modal&&!cinematic&&state.phase==='viewing'&&!document.hidden);
}
function destroyWorld(){
  cancelTimeLapse?.();cancelTimeLapse=null;cinematic=false;
  world?.releaseLook();world?.dispose();world=null;target=null;
}
function createRoom(){
  destroyWorld();
  canvas=document.querySelector('#world');
  const nextCanvas=canvas.cloneNode(false);canvas.replaceWith(nextCanvas);canvas=nextCanvas;
  canvas.addEventListener('click',()=>{if(started&&!modal&&!cinematic)world?.requestLook();});
  try {
    world=createWorld({canvas,caseConfig:config,onTarget:value=>{target=value;updateTarget();},onPosture:updatePosture});
    const restoration=world.applyFurniture(state.furniture);
    if(restoration?.ignored?.length){
      const accepted={...state.furniture};
      for(const ignored of restoration.ignored)delete accepted[typeof ignored==='string'?ignored:ignored.id];
      state=restoreState({...state,furniture:accepted});
    }
    syncWorld();
    if(state.decision==='sign')viewEvent(reviewDay);else world.teleport('survey');
  } catch(error){console.error('Unable to create room',error);errorMessage='当前浏览器未能建立 3D 场景。可以返回选房，或启用图形加速后重新进入。';destroyWorld();}
}
function enterCase(id){
  if(!validCase(id)||cinematic)return;
  if(practice.active)practice.leave();
  if(started)persist();
  destroyWorld();
  config=getCase(id);state=library.saves[id]?restoreState(library.saves[id]):createState(id);
  started=true;selectedCaseId=null;homeOverlay=null;dialogId=null;morePlaces=false;furnitureId='chair';errorMessage='';
  library.activeCaseId=id;library.categoryId=config.categoryId||`${config.housingType}-${config.leaseType}`;
  reviewDay=state.decision==='sign'?(getTimeline(state).at(-1)?.day||0):0;
  modal=state.phase==='ending'?'ending':null;
  createRoom();persist();render();tone();
}
function showHome(id=null){
  if(practice.active)practice.leave();
  if(started)persist();destroyWorld();started=false;errorMessage='';modal='home';selectedCaseId=validCase(id)?id:null;
  homeOverlay=null;
  if(selectedCaseId){const c=getCase(id);library.categoryId=c.categoryId||`${c.housingType}-${c.leaseType}`;}
  savePreferences();render();
}
function closeModal(){
  if(modal==='home'){selectedCaseId=null;render();return;}
  if(state.phase==='viewing')world?.resetPosture?.();
  world?.setExpression('neutral',['roommate','friend'].includes(dialogId)?dialogId:'landlord');
  modal=state.phase==='ending'?'ending':started?null:'home';render();
}
function focusPanel(){queueMicrotask(()=>document.querySelector('[role="dialog"]')?.focus({preventScroll:true}));}

function confirmView(){
  const terms=getLeaseTerms(state);
  const initial=Number.isFinite(terms.initialCash)?terms.initialCash:terms.rent*terms.paymentMonths+terms.deposit+(terms.serviceFee||0);
  const days=config.timelineDays||[7,30,365];
  return shell(`${closeButton()}<div class="eyebrow">决定之前 · 虚构合同</div><h2 id="dialog-title">带着这些信息入住吗？</h2>
    <div class="contract-summary"><strong>${esc(terms.label||config.title)}</strong><p>月租 ¥${Number(terms.rent).toLocaleString('zh-CN')} · 合同 ${esc(terms.leaseMonths)} 个月 · 每次付 ${esc(terms.paymentMonths)} 个月</p><p>首期 ¥${initial.toLocaleString('zh-CN')}，其中押金 ¥${Number(terms.deposit).toLocaleString('zh-CN')} 暂占用；用量费另计。</p></div>
    <p class="event-body">日子会快速来到第 ${days.join('、')} 天。今天的选择，会留在后面的生活里。</p><p class="subtle">签约是剧情选择，不产生真实付款。尚未确认的事仍会留在手账中。</p>
    <div class="button-row"><button class="button primary" data-command="confirm-sign">确认签约并入住</button><button class="button secondary" data-command="close">继续调查</button></div>`,'confirm');
}

function render(){
  canvas=document.querySelector('#world');
  app.classList.toggle('practice-mode',practice.active);
  if(practice.active){
    app.classList.remove('is-menu','showing-ending','in-dialog');app.classList.toggle('cinematic',practice.cinematic);
    canvas.hidden=false;canvas.classList.remove('hidden');app.innerHTML=practice.render();speech.mount(app);practice.sceneState();focusPanel();return;
  }
  app.classList.toggle('is-menu',modal==='home');
  app.classList.toggle('showing-ending',started&&state.phase==='ending');
  app.classList.toggle('cinematic',cinematic);
  app.classList.toggle('in-dialog',Boolean(modal)&&modal!=='home');
  canvas.hidden=modal==='home';
  canvas.classList.toggle('hidden',modal==='home');
  if(modal==='home'){
    speech.dispose();
    app.innerHTML=renderHome({cases:CASES,categoryId:library.categoryId,selectedCaseId,saves:library.saves,activeCaseId:library.activeCaseId,practiceSaved:practice.saved,extraOverlay:homeOverlay==='cities'?renderCityReference(cityId):''});
    const screen=app.querySelector('.menu-screen');if(screen)screen.scrollTop=homeScroll;
    if(selectedCaseId||homeOverlay)focusPanel();return;
  }
  let overlay='';
  if(modal==='dialog')overlay=renderDialog(state,config,dialogId,dialogueTurn);
  if(modal==='notes')overlay=renderNotebook(state,config,noteTab==='inspections');
  if(modal==='furniture')overlay=renderFurniture(furnitureId);
  if(modal==='ending')overlay=renderEnding(state,config,reviewDay);
  if(modal==='help')overlay=renderHelp(config,library.preferences);
  if(modal==='housing-info')overlay=renderHousingDetail({caseConfig:config,save:state,inGame:true,leaseTerms:getLeaseTerms(state)});
  if(modal==='sign')overlay=confirmView();
  if(modal==='reset')overlay=shell(`<div class="eyebrow">重新打开这一页</div><h2 id="dialog-title">重新看这套房吗？</h2><p class="event-body">仅重置《${esc(config.title)}》的线索、决定和家具位置。其他房源的手账会保留。</p><div class="button-row"><button class="button primary" data-command="reset">重新开始</button><button class="button secondary" data-command="close">保留这次看房</button></div>`,'confirm');
  if(errorMessage)overlay=shell(`<div class="eyebrow">房间还没准备好</div><h2 id="dialog-title">场景暂未加载</h2><p>${esc(errorMessage)}</p><div class="button-row"><button class="button primary" data-command="reload-room">重试进入</button><button class="button secondary" data-command="home">返回选房</button></div>`,'confirm');
  app.innerHTML=renderHUD({state,config,modal,cinematic,morePlaces,furnitureId,reviewDay,saveAvailable,muted,posture:world?.getPosture?.()||'standing',crouchKey:library.preferences.crouchKey})+(cinematic?renderCinematic(state,config,reviewDay):overlay);
  speech.mount(app);updateTarget();syncWorld();if(modal)focusPanel();
}
function updatePosture(){
  const posture=world?.getPosture?.()||'standing';
  app.querySelectorAll('[data-posture]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.posture===posture)));
}
function setPosture(mode){
  const result=world?.setPosture?.(mode);updatePosture();
  if(result&&!result.ok)announce(result.reason||'移到开阔处再站起');
}
function updateTarget(){
  const el=document.querySelector('#interaction');if(!el)return;
  el.innerHTML=target?`<button data-command="interact"><kbd>E</kbd><span><small>靠近了，看看再说</small><strong>${esc(target.title)}</strong></span>${icon('arrow')}</button>${target.furnitureId?`<button class="furniture-shortcut" data-furniture="${esc(target.furnitureId)}"><kbd>F</kbd> ${movableFurniture[target.furnitureId]?'挪一挪':'仔细看看'}</button>`:''}`:'<span class="look-hint">点击场景探索 · 靠近人物或物件按 E</span>';
}
function interact(id=target?.id){
  if(!id||!started||cinematic||state.phase!=='viewing')return;
  dialogId=id;modal='dialog';dialogueTurn++;world?.releaseLook();
  if(id==='landlord')world?.teleport('interview');
  if(id==='bathroom')world?.teleport('bathroom-inspect');
  if(id==='cabinet'&&state.facts.cabinetOpened)world?.teleport('cabinet-inspect');
  if(id==='sofa'&&state.facts.sofaInspected)world?.teleport('sofa-inspect');
  if(['fridge','stove','basin','aircon','wall'].includes(id)||(config.id!=='sunny'&&['phone','folder','meter','calendar','notice','shoes','roommate','friend','desk','bill','door'].includes(id)))world?.inspect(id);
  world?.setExpression(getDialog(id,state)?.expression||'neutral',['roommate','friend'].includes(id)?id:'landlord');render();tone();
}
function openFurniture(id){
  if(!started||state.phase!=='viewing'||cinematic||!furnitureNames[id])return;
  if(!movableFurniture[id]){interact(id);return;}
  furnitureId=id;modal='furniture';world?.teleport(id);render();
}
function viewEvent(day){
  const event=getTimeline(state).find(e=>e.day===day);
  const fallback=state.caseId==='sunny'?(day===7?'aftermath':day===30?'damp':'handover'):'desk';
  const view=event?.view||fallback;
  if(state.caseId==='sunny')world?.teleport(view);else world?.inspect(view);
}
function finishTimeLapse(){
  cancelTimeLapse?.();cancelTimeLapse=null;cinematic=false;
  reviewDay=getTimeline(state).at(-1)?.day||0;modal='ending';render();viewEvent(reviewDay);
}
function startTimeLapse(){
  cinematic=true;modal=null;reviewDay=0;world?.teleport(config.id==='sunny'?'aftermath':'survey');render();tone('time');
  if(!world){finishTimeLapse();return;}
  const timeline=getTimeline(state);
  cancelTimeLapse=world.playTimeLapse({duration:reduceCameraMotion()?0:4200,days:timeline.map(e=>e.day),views:timeline.map(e=>e.view),onStage(day){reviewDay=day;render();tone('time');},onComplete:finishTimeLapse});
}
function act(type,confirmed=false){
  if(!started||cinematic)return;
  if((type==='SIGN'||type.startsWith('SIGN_'))&&!confirmed){pendingSignType=type;modal='sign';render();return;}
  const previous=state;state=reduce(state,{type});
  if(state===previous){if(confirmed){modal='dialog';render();announce('还有对应材料没确认，先看看手账里的待办。');}return;}
  dialogueTurn++;persist();
  if(state.decision==='sign'&&previous.decision!=='sign'){startTimeLapse();return;}
  if(state.phase==='ending'){modal='ending';reviewDay=0;}
  world?.setExpression(modal==='dialog'?getDialog(dialogId,state)?.expression||'neutral':'neutral',['roommate','friend'].includes(dialogId)?dialogId:'landlord');render();
  if(type==='OPEN_CABINET')world?.teleport('cabinet-inspect');
  if(type==='CHECK_SOFA_EDGE')world?.teleport('sofa-inspect');
  const d=modal==='dialog'?getDialog(dialogId,state):null;if(d?.view)world?.teleport(d.view);
  tone(type.startsWith('c:')||type.startsWith('INSPECT_')?'find':'tap');
  if(state.pressure>previous.pressure){tone('phone');announce('对方催你确认。仍然可以按自己的节奏看房。');}
  else if(state.phase==='viewing')announce('记下来了，随时可以翻看手账。');
}
function moveFurniture(direction){
  if(!world||!movableFurniture[furnitureId])return;
  const steps={north:{dz:-.45},south:{dz:.45},west:{dx:-.45},east:{dx:.45},rotate:{rotate:Math.PI/2},reset:{reset:true}};
  if(!steps[direction])return;
  const result=world.moveFurniture(furnitureId,steps[direction]);
  if(!result.ok){announce(result.reason||'这里空间不够，试试另一个方向。');return;}
  state=reduce(state,{type:'MOVE_FURNITURE',id:furnitureId,position:result.position});persist();render();tone();announce(direction==='reset'?'家具已放回原位':'小物件挪好了，继续看看周围。');
}

app.addEventListener('click',event=>{
  if(speech.click(event))return;
  const button=event.target.closest('button,a');if(!button||button.disabled)return;
  const d=button.dataset;
  if(practice.active){event.preventDefault();practice.click(button);return;}
  if(!['command','category','selectCase','enterCase','switchCase','action','furniture','move','day','place','posture','city'].some(key=>d[key]))return;
  event.preventDefault();
  if(cinematic&&d.command!=='skip-time')return;
  if(d.posture){if(!modal)setPosture(d.posture);return;}
  if(d.city&&CITY_REFERENCES.some(c=>c.id===d.city)){cityId=d.city;render();return;}
  if(d.category){library.categoryId=d.category;selectedCaseId=null;homeScroll=0;savePreferences();render();app.querySelector(`[data-category="${library.categoryId}"]`)?.focus({preventScroll:true});return;}
  if(d.selectCase){if(!validCase(d.selectCase))return;homeScroll=app.querySelector('.menu-screen')?.scrollTop||0;selectedCaseId=d.selectCase;render();return;}
  if(d.enterCase){if(started&&d.enterCase===state.caseId&&modal==='housing-info')closeModal();else enterCase(d.enterCase);return;}
  if(d.switchCase){showHome(d.switchCase);return;}
  if(d.action){act(d.action);return;}if(d.furniture){openFurniture(d.furniture);return;}if(d.move){moveFurniture(d.move);return;}
  if(d.day){const day=Number(d.day);if(!getTimeline(state).some(e=>e.day===day))return;reviewDay=day;render();viewEvent(day);return;}
  if(d.place){
    if(!started||state.phase!=='viewing')return;
    morePlaces=false;modal=null;render();
    const arrived=world?.teleport(d.place);if(!arrived){announce('先沿着房间走近这个位置。');return;}
    if(d.place==='owner')interact('owner');else announce('已到附近，按 E 看看。');return;
  }
  switch(d.command){
    case 'continue-last':if(library.activeCaseId)enterCase(library.activeCaseId);break;
    case 'home':showHome();break;
    case 'practice':if(started)persist();destroyWorld();started=false;homeOverlay=null;selectedCaseId=null;practice.enter();break;
    case 'cities':homeScroll=app.querySelector('.menu-screen')?.scrollTop||0;selectedCaseId=null;homeOverlay='cities';render();break;
    case 'close-cities':homeOverlay=null;render();break;
    case 'close-house':if(modal==='housing-info')closeModal();else{selectedCaseId=null;render();}break;
    case 'interact':if(!modal)interact();break;
    case 'close':closeModal();break;
    case 'notes':if(started){noteTab='all';modal='notes';render();}break;
    case 'inspection-notes':if(started){noteTab='inspections';modal='notes';render();}break;
    case 'help':if(started){modal='help';render();}break;
    case 'housing-info':modal='housing-info';render();break;
    case 'sound':muted=!muted;tone();render();break;
    case 'more':morePlaces=!morePlaces;render();break;
    case 'confirm-sign':act(pendingSignType,true);break;
    case 'retry':state=reduce(state,{type:'RETRY'});reviewDay=0;modal=null;persist();world?.applyFurniture(state.furniture);render();world?.teleport('survey');break;
    case 'reset-confirm':modal='reset';render();break;
    case 'reset':cancelTimeLapse?.();cancelTimeLapse=null;cinematic=false;state=createState(config.id);reviewDay=0;modal=null;persist();world?.applyFurniture({});render();world?.teleport('survey');break;
    case 'skip-time':finishTimeLapse();break;
    case 'reload-room':errorMessage='';createRoom();render();break;
  }
});
app.addEventListener('change',event=>{
  const setting=event.target.dataset.setting;if(!setting)return;
  if(setting==='crouch-key'&&['c','q','v'].includes(event.target.value))library.preferences.crouchKey=event.target.value;
  if(setting==='reduce-motion')library.preferences.reduceMotion=event.target.checked?'reduce':'system';
  savePreferences();world?.setReducedMotion?.(reduceCameraMotion());
});
document.addEventListener('keydown',event=>{
  if(speech.keydown(event))return;
  const dialog=document.querySelector('[role="dialog"]');
  if(event.key==='Tab'&&dialog){
    const buttons=[...dialog.querySelectorAll('button:not([disabled]),summary,a[href],input,select')].filter(el=>el.getClientRects().length),i=buttons.indexOf(document.activeElement);
    if(!buttons.length)return;
    if(event.shiftKey&&i<=0){event.preventDefault();buttons.at(-1).focus();}
    else if(!event.shiftKey&&(i<0||i===buttons.length-1)){event.preventDefault();buttons[0].focus();}return;
  }
  if(practice.active){practice.key(event);return;}
  if(event.repeat)return;
  if(/INPUT|SELECT|TEXTAREA/.test(event.target?.tagName))return;
  if(event.key==='Escape')world?.releaseLook();
  if(cinematic){if(event.key==='Escape'){event.preventDefault();finishTimeLapse();}return;}
  if(modal==='home'){if(event.key==='Escape'&&(selectedCaseId||homeOverlay)){selectedCaseId=null;homeOverlay=null;render();}return;}
  if(event.key==='Escape'&&modal&&modal!=='ending'){event.preventDefault();closeModal();return;}
  if(!started||errorMessage)return;const key=event.key.toLowerCase();
  if(key===library.preferences.crouchKey&&!modal){event.preventDefault();setPosture(world?.getPosture?.()==='standing'?'crouched':'standing');}
  if(key==='b'){event.preventDefault();if(modal==='notes')closeModal();else{modal='notes';render();}}
  if(key==='e'&&!modal)interact();
  if(key==='f'&&!modal&&target?.furnitureId){event.preventDefault();openFurniture(target.furnitureId);}
});
document.addEventListener('visibilitychange',()=>{speech.setPaused(document.hidden);if(practice.active){practice.sceneState();practice.persist();}else if(document.hidden){world?.setEnabled(false);persist();}else syncWorld();});
window.addEventListener('beforeunload',()=>{speech.dispose();persist();practice.persist();});
render();
