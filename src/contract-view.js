import './contract.css';
import { renderSpeech } from './speech.js';
import { pixelIcon, portraitSvg } from './art.js';
import { getCharacter } from './characters.js';
import { PRACTICE_DOCUMENTS, PRACTICE_TOPICS, getPracticeBudget, getPracticeStatus, getPracticeFeedback, getPracticeTimeline, canComparePractice, canSignPractice } from './contract-practice.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=value=>Number(value).toLocaleString('zh-CN',{minimumFractionDigits:Number.isInteger(value)?0:2,maximumFractionDigits:2});
const action=(type,label,{disabled=false,primary=false,extra=''}={})=>`<button class="cp-button ${primary?'cp-primary':''}" data-practice-action="${esc(type)}" ${disabled?'disabled':''} ${extra}>${label}</button>`;
const body=lines=>lines.map(line=>`<p>${esc(line)}</p>`).join('');
const doc=id=>PRACTICE_DOCUMENTS.find(d=>d.id===id);

function speaker(state,speechTurn) {
  const feedback=getPracticeFeedback(state),who=feedback.speaker==='owner'?{name:'周女士',gender:'女',role:'房东'}:feedback.speaker==='self'?null:{name:'小陈',gender:'男',role:'带看中介'};
  return `<aside class="cp-speaker"><div class="cp-face">${portraitSvg(feedback.speaker==='owner'?'neutral':'smile',feedback.speaker,who?getCharacter(who.name,who.role):undefined)}</div><div><strong>${who?`${who.name} · ${who.gender} · ${who.role}`:'你的核对手记'}</strong>${who?renderSpeech(feedback.body,{key:`contract:${speechTurn}`}):`<p>${esc(feedback.body)}</p>`}</div></aside>`;
}

function budget(state) {
  const b=getPracticeBudget(state);
  return `<aside class="cp-budget" aria-label="当前版本的费用"><div><small>签约初付 · 含押金</small><strong>¥${money(b.initialCash)}</strong></div><div><small>再留用量与交通后</small><strong>¥${money(b.reserveCash)}</strong></div><div><small>正常月份住房与通勤参考</small><strong>¥${money(b.monthlyEstimate)}</strong></div><p>押金 ¥3,200 暂占用；用量按实际账单，餐饮等另计。${b.freeDays?'首月七天仅免租金，包含在原租期内。':'免租尚未落实时，首期按草稿全额列示。'}</p></aside>`;
}

function documentView(state,speechTurn) {
  const selected=doc(state.documentId),reading=state.phase==='reading';
  const group=(kind,label)=>`<h3>${label}</h3>${PRACTICE_DOCUMENTS.filter(d=>d.kind===kind).map(d=>`<button class="cp-doc-link ${d.id===selected.id?'selected':''}" data-practice-action="open:${d.id}" aria-current="${d.id===selected.id?'page':'false'}"><span>${esc(d.title)}</span><small>${state.marks[d.id]?'待核对':state.read[d.id]?'已读':'未读'}</small></button>`).join('')}`;
  const revisions=PRACTICE_TOPICS.filter(t=>state.issues[t.id].signed&&t.docs.includes(selected.id));
  return `<div class="cp-reading"><nav class="cp-document-nav" aria-label="合同与材料目录">${group('contract','租赁协议 · 原始草稿')}${group('material','合同以外的六份材料')}</nav><article class="cp-paper" aria-labelledby="cp-document-title"><div class="cp-paper-kicker">${selected.kind==='contract'?'宁桥市住房租赁协议 · 虚构练习件':'材料袋 · 本局原始版本'}</div><h2 id="cp-document-title">${esc(selected.title)}${state.marks[selected.id]?'<span class="cp-sticky">待核对</span>':''}</h2>${selected.kind==='contract'?'<p class="cp-small">出租人：周女士（女） · 联系人：小陈（男） · 承租人：玩家<br>身份及送达信息见双方各持的签约信息附件。</p>':''}<div class="cp-document-text">${body(selected.body)}</div><div class="cp-document-actions">${action(`read:${selected.id}`,state.read[selected.id]?'已读 · 再确认一次':['clause8','clause11'].includes(selected.id)&&!state.marks[selected.id]?'确认已读，暂不标风险':'记下这页已读',{disabled:!reading,primary:!state.read[selected.id]})}${state.marks[selected.id]?action(`unflag:${selected.id}`,'取下待核对标签',{disabled:!reading}):action(`flag:${selected.id}`,'贴上待核对标签',{disabled:!reading})}</div><p class="cp-small">打开页面和记录已读是两步。标签由你添加，不会自动变成已经确认的结论。</p>${revisions.length?`<section class="cp-revisions"><h3>与这页有关的已签修订</h3>${revisions.map(t=>`<article><strong>${esc(t.title)} · 双方已签署</strong><p>${esc(t.revision)}</p></article>`).join('')}</section>`:''}${speaker(state,speechTurn)}<div class="cp-bottom-links">${action('tab:questions','拿材料去追问 →')}${action('tab:decision','到决定这一页 →')}</div></article></div>`;
}

function questionView(state,speechTurn) {
  const topic=PRACTICE_TOPICS.find(t=>t.id===state.topicId),issue=state.issues[topic.id],reading=state.phase==='reading',available=canComparePractice(state,topic.id);
  const speaking=getPracticeFeedback(state).speaker!=='self';
  const stages=[['compared','对照材料'],['requested','提出要求'],['confirmed','有权方确认'],['signed','双方签署']];
  return `<div class="cp-reading"><nav class="cp-topic-nav" aria-label="想核对的事项"><h3>从一个问题开始</h3>${PRACTICE_TOPICS.map(t=>`<button class="cp-doc-link ${t.id===topic.id?'selected':''}" data-practice-action="topic:${t.id}"><span>${esc(t.title)}</span><small>${esc(getPracticeStatus(state,t.id))}</small></button>`).join('')}${action('GENERAL_ASK','先问：能核实签约和收款人吗？',{disabled:!reading})}</nav><article class="cp-paper"><div class="cp-paper-kicker">材料摊开 · 一项一项问</div><h2>${esc(topic.title)}</h2><div class="cp-stages">${stages.map(([key,label])=>`<span class="${issue[key]?'done':''}">${issue[key]?pixelIcon('check'):'<i></i>'}${label}</span>`).join('')}</div><div class="cp-evidence-links"><h3>先把这些页放在一起</h3>${topic.docs.map(id=>action(`open:${id}`,`${esc(doc(id).title)} <small>${state.read[id]?'已读':'待读'}</small>`)).join('')}</div><div class="cp-question">${available?esc(topic.question):'读过相关材料后，再提出具体追问。'}</div><div class="cp-step-actions" ${speaking?'data-speech-choices hidden':''}>${action(`compare:${topic.id}`,'① 对照已经读过的材料',{disabled:!reading||!available,primary:available&&!issue.compared})}${action(`request:${topic.id}`,'② 请求说明、修改或补充材料',{disabled:!reading||!issue.compared,primary:issue.compared&&!issue.requested})}${action(`confirm:${topic.id}`,'③ 核对有权方的回复与修订稿',{disabled:!reading||!issue.requested||topic.refused,primary:issue.requested&&!issue.confirmed&&!topic.refused})}${action(`sign:${topic.id}`,'④ 双方签署修订及附件，各留一份',{disabled:!reading||!issue.confirmed||topic.refused,primary:issue.confirmed&&!issue.signed})}</div>${issue.refused?'<p class="cp-refusal">这项修改未获同意，原条款保留。你仍可暂缓、离开或作出知情选择。</p>':''}${issue.confirmed?`<section class="cp-revisions"><h3>${issue.signed?'已签署的修订页':'双方核对的修订稿 · 尚待签署'}</h3><p>${esc(topic.revision)}</p></section>`:''}${speaker(state,speechTurn)}${action('tab:decision','看看当前版本，再作决定 →')}</article></div>`;
}

function decisionView(state) {
  const b=getPracticeBudget(state);
  if(state.phase==='ending'){
    const events=getPracticeTimeline(state),current=events.find(e=>e.day===state.viewDay)||events[0];
    return `<article class="cp-paper cp-decision-paper"><div class="cp-paper-kicker">这一页，由你决定</div><h2>${state.decision==='sign'?'签约之后，看看留下的版本':state.decision==='pause'?'先把材料留在桌上':'这一套，可以先放下'}</h2>${current?`<div class="cp-time-tabs">${events.map(e=>action(`day:${e.day}`,esc(e.title),{primary:e.day===current.day,extra:`aria-pressed="${e.day===current.day}"`})).join('')}</div><p>${esc(current.body)}</p><div class="cp-outcomes">${current.items.map(i=>`<article><h3>${esc(i.title)}</h3><p>${esc(i.body)}</p></article>`).join('')}</div>`:`<p>${state.decision==='pause'?'你没有签约或付款。已读的材料、标记和未确认的问题会保留，下次可以接着核对。':'你决定不签约，没有发生付款。这份练习手记会留下来，也可以返回选房。'}</p>`}<div class="cp-bottom-links">${action('REVIEW','主动打开逐项复盘',{primary:true})}${action('RETRY','带着手记继续核对')}<button class="cp-button" data-command="practice-home">返回选房</button></div></article>`;
  }
  return `<article class="cp-paper cp-decision-paper"><div class="cp-paper-kicker">签字前 · 请看当前版本</div><h2>材料齐到哪里，决定就带到哪里。</h2><p>租期仍为2027-03-01至2028-02-29，十二个月，按月支付。下列金额依据本局已经由双方签署的修订，不把口头答应计入。</p>${budget(state)}<dl class="cp-term-list"><div><dt>首月租金</dt><dd>¥${money(b.firstRent)} ${b.freeDays?'（七天免租已落实）':'（尚按原草稿）'}</dd></div><div><dt>协调服务费</dt><dd>${b.serviceFee?`¥${b.serviceFee}/月，现有附件仍保留`:'已包含在月租，无额外协调费'}</dd></div><div><dt>提前解除</dt><dd>原第十条仍保留：租客两月租金6400元、房东一月3200元及通知要求；到期交接不自动收此项费用。</dd></div></dl><div class="cp-status-list">${PRACTICE_TOPICS.map(t=>`<div><strong>${esc(t.title)}</strong><span>${esc(getPracticeStatus(state,t.id))}</span></div>`).join('')}</div><p class="cp-small">“书面版本”按钮需逐项完成可落实的修订，并问清被拒绝的提前解除调整。你也可以带着未落实事项直接作决定。</p><div class="cp-decision-actions">${action('SIGN_WRITTEN','接受已签修订及未改条款，确认模拟签约',{disabled:!canSignPractice(state),primary:canSignPractice(state)})}${action('SIGN_DIRECT','按当前版本直接模拟签约')}${action('PAUSE','今天暂缓，继续等材料')}${action('LEAVE','决定放弃这套房')}</div><p class="cp-small">这是虚构剧情选择，不会发起真实付款。复盘只说明本次材料与决定，没有分数。</p></article>`;
}

function reviewView(state) {
  if(!state.reviewOpen)return `<article class="cp-paper"><h2>先自己读一读</h2>${action('REVIEW','我想查看逐项解析')}</article>`;
  return `<article class="cp-paper cp-review-paper"><div class="cp-paper-kicker">你主动打开的复盘 · 不计分</div><h2>把条款和证据，再摆一次。</h2><p>这是一份故意设置不同说法的虚构练习。标记数量不代表能力，也不以是否签约判输赢。</p><div class="cp-review-items">${PRACTICE_TOPICS.map((t,i)=>`<article><span>${String(i+1).padStart(2,'0')}</span><div><h3>${esc(t.title)}<small>${esc(getPracticeStatus(state,t.id))}</small></h3><p>${esc(t.comparison)}</p><p>${esc(t.review)}</p>${state.issues[t.id].signed?`<p class="cp-review-record">本局已签署：${esc(t.revision)}</p>`:t.refused&&state.issues[t.id].refused?'<p class="cp-review-record">本局已提出调整，对方明确拒绝；原条件仍在。</p>':'<p class="cp-review-record">本局没有这项双方签署的修订。已读或口头答复均不能自动替代。</p>'}</div></article>`).join('')}</div><section class="cp-quiet-note"><h3>另外两处，不必凭空标风险</h3><p>第八条写提前联系并经同意后入室，不因允许经同意进入就自动判定有问题。第十一条只是约定续租协商时间，不是自动续租承诺。具体执行仍需结合事实和适用规则。</p><p>现实的法律效力和争议处理需要具体资料与当地适用规则；本练习不提供真实签约模板。</p></section><div class="cp-bottom-links">${action('RETRY','带着手记回到合同')}${action('RESET_REQUEST','重新开始这份独立练习')}<button class="cp-button" data-command="practice-home">返回选房</button></div></article>`;
}

function resetView() {
  return `<article class="cp-paper cp-decision-paper"><div class="cp-paper-kicker">重新开始 · 只清空这份练习</div><h2>翻开一份空白的合同练习吗？</h2><p>本练习的已读、标签、协商和决定将重新开始。其他房源的看房手账会保留。</p><div class="cp-bottom-links">${action('RESET','确认重新开始',{primary:true})}${action('tab:review','保留当前练习')}</div></article>`;
}

export function renderPractice(state,{speechTurn=0}={}) {
  const tabs=[['documents','合同与材料'],['questions','对照与追问'],['decision',state.phase==='ending'?'这次的决定':'签字前的决定'],['review','主动复盘']];
  const topic=PRACTICE_TOPICS.find(t=>t.id===state.topicId);
  return `<main class="practice-shell" role="dialog" aria-modal="true" aria-labelledby="practice-title" tabindex="-1"><header class="cp-header"><div><div class="cp-kicker">独立合同练习 · 宁桥市 · 虚构教学道具</div><h1 id="practice-title">${pixelIcon('note')} 签字前的最后一页</h1></div><div class="cp-header-actions"><button class="cp-button" data-command="practice-room">${pixelIcon('home')} 回房间看看</button><button class="cp-button" data-command="practice-home">返回选房</button></div></header><nav class="cp-tabs" aria-label="合同练习页面">${tabs.map(([id,label])=>action(`tab:${id}`,label,{primary:state.tab===id,extra:`aria-current="${state.tab===id?'page':'false'}"`})).join('')}${action('HINT',state.hintLevel?'再给一点方向':'需要一点提示')}</nav>${state.hintLevel?`<aside class="cp-hint" role="status">${pixelIcon('note')}<p>${state.hintLevel===1?'核对租期、费用、责任和材料之间是否一致。可以先从一页读起，把有疑问的地方留下标签。':`先看「${topic.docs.map(id=>doc(id).title).join('」和「')}」，分清原话、草稿与已经签署的改动。`}</p></aside>`:''}<div class="cp-main">${state.tab==='documents'?documentView(state,speechTurn):state.tab==='questions'?questionView(state,speechTurn):state.tab==='review'?reviewView(state):state.tab==='reset'?resetView():decisionView(state)}</div><footer class="cp-footer"><span>合同练习单独保存，不借用任何房源的核实记录。</span><span>角色：小陈 · 男 ｜ 周女士 · 女</span></footer></main>`;
}


