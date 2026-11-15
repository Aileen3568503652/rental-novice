import { renderSpeech } from './speech.js';
import { pixelIcon as icon, portraitSvg } from './art.js';
import { getCharacter, characterLabel } from './characters.js';
import { getInspectionSpots, getInspectionProgress } from './inspections.js';
import { getDialog, getNotebook, getEnding, getTimeline, getCaseProgress } from './campaign.js';

export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const furnitureNames = {cabinet:'衣柜',sofa:'沙发',bed:'床',coffee:'小边几',desk:'餐桌',chair:'椅子',plant:'盆栽'};
export const movableFurniture = {chair:'椅子',coffee:'小边几',plant:'盆栽'};
export const closeButton = () => `<button class="icon-button close" data-command="close" aria-label="返回场景">${icon('close')}</button>`;
export function shell(content, className='', wide=false) {
  const layout=['furniture','ending'].includes(className)?`${className}-overlay`:'';
  return `<div class="overlay ${layout}"><section class="panel ${className} ${wide?'wide':''}" role="dialog" aria-modal="true" aria-labelledby="dialog-title" tabindex="-1">${content}</section></div>`;
}

function portrait(dialog, config) {
  const {expression='neutral',speaker='self'}=dialog;
  const who=speaker==='owner'?config.owner:speaker==='roommate'?(config.roommate||{name:'室友',role:'现有住户'}):speaker==='friend'?config.friend:config.host;
  const parts=dialog.speakerName?.split('·').map(s=>s.trim());
  const actor=getCharacter(parts?{name:parts[0],role:parts.slice(1).filter(s=>!['男','女'].includes(s)).join(' · ')}:who);
  const label=speaker==='self'?'你的看房手账':characterLabel(actor);
  const mood={neutral:'对方等着你开口。',smile:'对方露出了熟悉的笑容。',avoid:'目光朝门口转了一下。',tense:'手里的文件被捏紧了一点。',relieved:'肩膀放松了下来。'};
  return `<div class="speaker"><div class="pixel-portrait ${esc(expression)} ${speaker==='owner'?'owner':''}">${portraitSvg(expression,speaker,actor)}</div><div><strong>${esc(label)}</strong><small>${speaker==='self'?'小小的发现，也值得记下来。':speaker==='owner'?'电话另一端传来了回应。':mood[expression]||mood.neutral}</small></div><span class="speech-tag">${speaker==='self'?'观察':speaker==='owner'?'电话':'交谈'}</span></div>`;
}

export function renderDialog(state, config, dialogId, turn=0) {
  const d=getDialog(dialogId,state);
  const option=(o,i)=>`<button class="choice ${o.primary?'choice-primary':''}" ${o.caseId?`data-switch-case="${esc(o.caseId)}"`:o.command?`data-command="${esc(o.command)}"`:`data-action="${esc(o.action)}"`} ${o.disabled?'disabled':''}><span class="choice-number">${String(i+1).padStart(2,'0')}</span><span><strong>${esc(o.label)}</strong>${o.detail?`<small>${esc(o.detail)}</small>`:''}</span>${icon('arrow')}</button>`;
  return shell(`${closeButton()}<div class="eyebrow">${esc(d.eyebrow||config.title)}</div><h2 id="dialog-title">${esc(d.title)}</h2>${portrait(d,config)}<div class="dialog-body">${renderSpeech(d.body,{key:`${state.caseId}:${dialogId}:${turn}`})}</div><div class="choices" data-speech-choices hidden>${d.options.map(option).join('')}</div>
    ${movableFurniture[dialogId]?`<button class="button furniture-link" data-furniture="${esc(dialogId)}">${icon('move')} 给${furnitureNames[dialogId]}挪个位置</button>`:''}<p class="panel-footer">${esc(d.footer||'把听到的话，和眼前的细节对一对。')}</p>`,'conversation');
}

export function renderNotebook(state,config,openInspections=false) {
  const p=getCaseProgress(state),notes=getNotebook(state).filter(n=>!n.inspection),names={unknown:'尚未核实',found:'发现线索',pending:'继续追问',resolved:'本项已处理'};
  const extra=getInspectionProgress(state);
  return shell(`${closeButton()}<div class="eyebrow">看房手账 · ${esc(config.title)}</div><h2 id="dialog-title">把小发现记下来</h2><p class="subtle">这一页只记录这套房。换一扇门，就翻开另一页。</p>
    <div class="chain-grid">${p.chains.map(c=>`<article class="chain ${esc(c.status)}"><span>${esc(names[c.status]||c.status)}</span><h3>${esc(c.title)}</h3><p>${esc(c.detail)}</p></article>`).join('')}</div>
    ${extra.chains.length?`<details class="inspection-book" ${openInspections?'open':''}><summary>1.1 · 现场检查与补充约定</summary><p>原主线与这些新增事项分别记录。读过、追问和落实，也各有一页。</p><div class="chain-grid">${extra.chains.map(c=>`<article class="inspection-chain ${esc(c.status)}"><span>${esc(names[c.status]||c.status)}</span><h3>${esc(c.title)}</h3><p>${esc(c.detail)}</p>${state.phase==='viewing'?`<button class="text-button" data-place="${esc(c.target)}">去这里检查 ${icon('arrow')}</button>`:''}</article>`).join('')}</div></details>`:''}
    <div class="notes">${notes.map(n=>`<article class="note"><div><h3>${esc(n.title)}</h3><span class="status">${esc(n.status)}</span></div><p>${esc(n.detail)}</p></article>`).join('')}</div><p class="panel-footer">房源、金额与材料均为虚构。没有查清的事，继续留在清单里。</p>`,'notebook',true);
}

export function renderPostureControls(posture='standing',key='c') {
  return `<div class="posture-controls" aria-label="检查姿态"><span>检查姿态 <kbd>${esc(key.toUpperCase())}</kbd></span><div>${[['standing','站立'],['bent','弯腰'],['crouched','蹲下']].map(([id,label])=>`<button data-posture="${id}" aria-pressed="${posture===id}">${label}</button>`).join('')}</div></div>`;
}

export function renderFurniture(id) {
  return shell(`${closeButton()}<div class="eyebrow">轻轻挪一挪</div><h2 id="dialog-title">给${furnitureNames[id]}挪个位置</h2><p class="subtle">小物件可以挪动。检查完，记得放回原位。</p>
    <div class="furniture-picker" aria-label="选择轻便家具">${Object.entries(movableFurniture).map(([key,name])=>`<button class="${key===id?'active':''}" data-furniture="${key}" aria-pressed="${key===id}">${name}</button>`).join('')}</div>
    <div class="move-pad"><button data-move="north" aria-label="向窗边挪动">↑<small>窗边</small></button><button data-move="west" aria-label="向西挪动">←<small>西侧</small></button><span>${icon('move')}</span><button data-move="east" aria-label="向东挪动">→<small>东侧</small></button><button data-move="south" aria-label="向门口挪动">↓<small>门口</small></button></div>
    <div class="button-row"><button class="button secondary" data-move="rotate">旋转 90°</button><button class="button secondary" data-move="reset">放回原位</button></div><p class="movement-note">遇到墙、人或其他家具会停下。</p><button class="button primary full" data-command="close">放好了，继续看房 ${icon('arrow')}</button><p class="panel-footer">大件家具保持原位，可以查看边角和对应记录。</p>`,'furniture');
}

export function renderEnding(state,config,reviewDay) {
  const end=getEnding(state),signed=state.decision==='sign',timeline=signed?getTimeline(state):[],event=timeline.find(e=>e.day===reviewDay)||timeline.at(-1);
  return shell(`<div class="eyebrow">${esc(signed?`${config.title} · 入住手记`:end.eyebrow)}</div><h2 id="dialog-title">${esc(signed?'房子，把答案留下了。':end.title)}</h2>
    ${signed&&event?`<div class="timeline-tabs" aria-label="查看居住时间线">${timeline.map(e=>`<button data-day="${e.day}" aria-pressed="${reviewDay===e.day}" class="${reviewDay===e.day?'active':''}"><small>${esc(e.shortLabel||e.label||'入住记录')}</small>第 ${e.day} 天</button>`).join('')}</div>
      <div class="event-heading ${esc(event.tone)}"><span>${icon(event.tone==='warning'?'note':'check')}</span><h3>${esc(event.title)}</h3></div><p class="event-body">${esc(event.body)}</p>
      <div class="ending-items">${event.items.map(i=>`<article class="event-item ${esc(i.tone||'')}"><h4>${esc(i.title)}</h4><p>${esc(i.body)}</p></article>`).join('')}</div>
      <details class="whole-review"><summary>翻开这次看房的复盘</summary><p>${esc(end.body)}</p>${end.items.map(i=>`<p><strong>${esc(i.title)}</strong><br>${esc(i.body)}</p>`).join('')}</details>`:`<p class="event-body">${esc(end.body)}</p><div class="ending-items">${end.items.map(i=>`<article><h4>${esc(i.title)}</h4><p>${esc(i.body)}</p></article>`).join('')}</div>`}
    <div class="button-row"><button class="button primary" data-command="retry">带着线索回到看房 ${icon('arrow')}</button><button class="button secondary" data-command="home">换一套看看</button></div><div class="button-row"><button class="text-button" data-command="notes">翻看手账</button><button class="text-button" data-command="reset-confirm">重新开始这次看房</button></div>`,'ending');
}

export function renderHelp(config,preferences={crouchKey:'c',reduceMotion:'system'}) {
  return shell(`${closeButton()}<div class="eyebrow">初来乍到 · 操作小贴士</div><h2 id="dialog-title">慢慢看，不着急。</h2><div class="help-list"><p><kbd>W A S D</kbd> / 方向键：走动；点击场景后用鼠标转向。</p><p><kbd>E</kbd>：和近处的人说话，或检查准星指向的物件。</p><p>对话逐句出现。点击对白或按空格、Enter、E，先补全当前句，再继续下一句；听完后显示提问选项。前文可展开回看。</p><p><kbd>F</kbd>：挪动椅子、小边几和盆栽；面对大件时打开检查选项。</p><p><kbd>${esc(preferences.crouchKey.toUpperCase())}</kbd>：站立／蹲下切换；场景左下角也能选择站立、弯腰、蹲下。姿态本身不会自动取得线索。</p><p><kbd>B</kbd>：翻开看房手账；<kbd>Esc</kbd>：释放鼠标或关上面板。</p><p>柜子、床和沙发很沉，先用开门、照明和材料对照检查。需要拆装时请房东安排师傅。</p><p>${config.housingType==='shared'?'这套房只出租其中一间卧室。公共区与室友共用，先询问再确认人数、使用安排和费用分担。':'这套房由你一个人整租。客厅、卧室和厨卫都要看看。'}</p><p>不同的房子有不同的故事。桌上能作签约决定，也可以暂缓，或者返回选房。</p><p>入住过场共约 4.2 秒，节点依本次租期变化。按 Esc 可跳过；减少动态效果时直接显示记录。</p></div><div class="control-settings"><label>蹲下快捷键 <select data-setting="crouch-key">${['c','q','v'].map(k=>`<option value="${k}" ${k===preferences.crouchKey?'selected':''}>${k.toUpperCase()}</option>`).join('')}</select></label><label><input type="checkbox" data-setting="reduce-motion" ${preferences.reduceMotion==='reduce'?'checked':''}> 减少镜头运动（也遵循系统设置）</label></div><button class="button primary" data-command="close">回到房间 ${icon('arrow')}</button><p class="panel-footer">也可按住鼠标拖动转向。右上角可开启音效。</p>`,'help');
}

export function renderCinematic(state,config,reviewDay) {
  const event=getTimeline(state).find(e=>e.day===reviewDay);
  return `<div class="cinema-bars" aria-hidden="true"></div><section class="time-lapse" role="status"><div class="eyebrow">${esc(config.title)} · 日子向前走</div><strong>${reviewDay?`第 ${reviewDay} 天`:'入住当天'}</strong><p>${esc(event?.label||'钥匙交到你手里。新的生活开始了。')}</p><div class="time-track"><i></i></div><button class="text-button" data-command="skip-time">跳过时间过场</button></section>`;
}

export function renderHUD({state,config,modal,cinematic,morePlaces,furnitureId,reviewDay,saveAvailable,muted,posture='standing',crouchKey='c'}) {
  const hud=state.phase==='viewing'&&!cinematic,p=getCaseProgress(state),owner=getCharacter(config.owner||{name:'周女士',role:'房东'});
  const fallback=[{id:'landlord',label:'带看人',icon:'person'},{id:'sink',label:'水槽',icon:'sink'},{id:'cabinet',label:'衣柜',icon:'cabinet'},{id:'sofa',label:'沙发',icon:'sofa'},{id:'bathroom',label:'卫生间',icon:'bathroom'},{id:'desk',label:'合同',icon:'note'}];
  const baseSpots=config.spots?.length?config.spots:fallback;
  const spots=[...baseSpots,...getInspectionSpots(state.caseId).filter(s=>!baseSpots.some(b=>(b.id||b.target)===(s.id||s.target)))];
  const primary=spots.slice(0,7),secondary=spots.slice(7);
  const allIds=spots.map(s=>s.target||s.id);
  for(const [id,label,ic]of [['bill','费用单','note'],['window','窗边','sun'],['door','房门','home'],['owner','房东电话','phone']])if(!allIds.includes(id))secondary.push({id,label,icon:ic});
  const navButton=s=>`<button data-place="${esc(s.target||s.id)}">${icon(s.icon||'note')} ${esc(s.label||s.title||s.id)}</button>`;
  return `<header class="topbar"><a href="#" class="brand" data-command="home" aria-label="返回选房"><span class="brand-icon">${icon('home')}</span><span><strong>租房新手村</strong><small>第 ${esc(config.chapter||1)} 章 · ${config.housingType==='shared'?'合租一间':'一人整租'}</small></span></a><div class="top-actions"><button class="note-button home-link" data-command="home">${icon('home')} 返回选房</button><span class="weather-chip">${icon('sun')} ${state.decision==='sign'?`入住第 ${reviewDay} 天`:'看房日 · 晴'}</span><span class="save-indicator"><i class="${saveAvailable?'':'unsaved'}"></i>${saveAvailable?'手账已保存':'暂未保存'}</span><button class="icon-button" data-command="sound" aria-label="${muted?'开启音效':'关闭音效'}">${icon(muted?'mute':'sound')}</button><button class="icon-button" data-command="help" aria-label="操作说明">${icon('help')}</button><button class="note-button" data-command="notes">${icon('note')} 看房手账 <kbd>B</kbd></button></div></header>
    ${hud?`<aside class="mission"><div class="eyebrow">第 ${esc(config.chapter||1)} 章 · 看房日</div><h2>${esc(config.title)}</h2><p>${esc(p.nextHint)}</p><div class="mission-divider"></div><div class="case-lines">${p.chains.map(c=>`<div class="case-line ${esc(c.status)}"><i></i><span>${esc(c.title)}</span>${c.status==='resolved'?icon('check'):''}</div>`).join('')}</div><button class="phone-call ${state.pressure>0?'ringing':''}" data-place="owner">${icon('phone')}<span>${esc(owner.name)} · ${esc(owner.gender)}<small>${esc(owner.role)} · ${state.pressure>0?'有话想催你确认':'电话联系'}</small></span>${icon('arrow')}</button><div class="mission-links"><button class="text-button" data-command="housing-info">房源资料</button><button class="text-button" data-command="inspection-notes">现场检查清单</button></div><p class="pressure-note">${esc(p.pressureLabel)}</p></aside>`:''}
    ${hud&&!modal?renderPostureControls(posture,crouchKey):''}<div class="crosshair ${modal||!hud?'hidden':''}" aria-hidden="true"></div><div id="interaction" class="interaction ${modal||!hud?'hidden':''}"></div>
    ${hud?`<nav class="quick-nav" aria-label="场景导航"><span>走到</span>${primary.map(navButton).join('')}<button data-command="more" aria-label="更多地点" aria-expanded="${morePlaces}">•••</button>${morePlaces?`<div class="more-places">${secondary.map(navButton).join('')}<button data-furniture="${furnitureId}">挪动小物</button></div>`:''}</nav><div class="movement-hint"><kbd>W A S D</kbd> 移动 <span>·</span> <kbd>E</kbd> 调查 <span>·</span> <kbd>F</kbd> 查看家具 <span>·</span> <kbd>Esc</kbd> 释放鼠标</div>`:''}<div id="toast" class="toast" role="status"></div>`;
}
