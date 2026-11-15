import { pixelIcon as icon } from './art.js';
import { characterLabel } from './characters.js';
import { COMPARISON_LISTINGS } from './inspections.js';

const neighborhoodImage = `${import.meta.env.BASE_URL}ui/neighborhood.svg`;

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = value => Number.isFinite(Number(value)) ? `¥${Number(value).toLocaleString('zh-CN')}` : '待确认';
const categories = [
  {id:'whole-long',title:'单租 · 长租',note:'一个人的家，慢慢安顿',icon:'home'},
  {id:'whole-short',title:'单租 · 短租',note:'带着行李，住一小段日子',icon:'calendar'},
  {id:'shared-long',title:'合租 · 长租',note:'一间卧室，也有共同生活',icon:'roommate'},
  {id:'shared-short',title:'合租 · 短租',note:'短暂同行，把约定说清',icon:'note'},
];
const themes={sunny:['设施检查','入住交接'],cycle:['付款安排','出租关系'],internship:['租期比较','入住预算'],transfer:['原租约','三方交接'],shoes:['共同生活','共用空间'],utilities:['实际账单','费用约定'],keys:['转租材料','居住期限'],summer:['短期交接','室友约定'],choice:['两份报价','自己的计划'],'internship-b':['另一套房','三个月安排'],'transfer-b':['另一套房','两个月安排']};
const palettes=[['#d9e7c4','#69905b','#a86c42'],['#dae5e1','#6b9292','#a36d49'],['#efe0bb','#b98751','#8b6146'],['#e8d7cb','#ac795c','#817251'],['#d8dfc0','#7a8d50','#ab7644']];
const categoryOf = c => c.categoryId || `${c.housingType}-${c.leaseType}`;
const roomType = c => c.housingType === 'shared' ? '独用卧室 · 厨卫共用' : '一室一厅一卫 · 整套独用';
const saveStatus = save => !save ? '还没去看' : save.decision === 'sign' ? '已有入住手记' : save.decision === 'pause' ? '等资料齐一些' : save.decision === 'leave' ? '曾经看过' : '看房进行中';
function leaseLabel(c){
  if(c._selectedLease) return c._selectedLease;
  if(c.id==='transfer') return '拟签 60 天 · 原约余 45 天';
  if(c.id==='keys') return '草稿 12 个月 · 授权余 8 个月';
  if(c.id==='choice') return '可选 3 / 6 个月合同';
  const days=Number(c.goalDays || c.targetDays);
  if(days>0 && Number(c.leaseMonths)*30 > days) return `目标 ${days} 天 · 草稿 ${c.leaseMonths} 个月`;
  return `合同 ${c.leaseMonths || '待定'} 个月`;
}
function paymentLabel(c){return c.paymentLabel || `押一付${({1:'一',2:'二',3:'三',6:'六',12:'十二'})[c.paymentMonths] || c.paymentMonths || '一'}`;}

/** Original cutaway drawings: a room plan, not a photograph of a real listing. */
export function houseIllustration(c, large=false){
  const hash=[...String(c.id)].reduce((a,ch)=>a+ch.charCodeAt(0),0), [bg,green,wood]=palettes[({sage:0,blue:1,amber:2,peach:3})[c.palette] ?? hash%palettes.length];
  const shared=c.housingType==='shared';
  const r=(x,y,w,h,fill)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
  let drawing=r(0,0,192,136,bg)+r(8,111,176,8,'#a7bc80')+r(22,117,149,7,'#d2c59a');
  drawing+=`<path d="M20 47h6V32h6V24h128v8h6v15h6v62H20z" fill="#6f5135"/>`;
  drawing+=r(25,48,142,57,'#f6e8bd')+r(32,32,128,6,wood)+r(26,38,140,6,wood)+r(20,44,152,6,wood);
  drawing+=r(31,55,51,45,'#d7bb86')+r(86,55,4,49,'#a17d4e')+r(94,55,65,45,'#e8d8ac');
  drawing+=r(33,54,29,13,'#83b7c0')+r(46,54,2,13,'#f9ebbd')+r(33,60,29,2,'#f9ebbd');
  drawing+=r(33,82,30,16,wood)+r(33,79,30,15,green)+r(34,73,28,10,green)+r(36,77,24,2,'#bfd3a3');
  drawing+=r(68,77,12,16,wood)+r(67,75,14,4,'#eab66c')+r(71,71,6,4,'#fff0cd');
  if(shared){
    drawing+=r(94,55,65,3,'#cbb183')+r(114,58,3,38,'#b39260')+r(136,58,3,38,'#b39260');
    for(const x of [96,119,141])drawing+=r(x,65,15,29,wood)+r(x+2,67,11,24,'#d3b579')+r(x+9,80,2,2,'#6a4c2e');
  } else {
    drawing+=r(98,71,32,26,wood)+r(99,71,30,21,green)+r(100,70,28,7,'#fff0cb')+r(100,81,28,10,'#a9bc80');
    drawing+=r(137,58,19,39,wood)+r(139,61,15,32,'#d8ae66')+r(146,61,2,32,wood)+r(143,74,2,5,'#fff2bb');
  }
  drawing+=r(70,54,10,16,'#cfad78')+r(73,55,4,10,'#e7d7ae')+r(27,99,138,5,'#a58153');
  drawing+=r(6,91,12,20,'#9a774a')+r(1,85,20,9,green)+r(5,78,13,9,green)+r(171,101,12,10,'#bd824a')+r(169,93,16,10,green)+r(175,87,9,8,green);
  drawing+=r(11,114,3,3,'#e8ac50')+r(181,111,3,3,'#dd845e')+r(176,115,3,3,'#f7dfa6');
  return `<svg class="housing-illustration ${large?'large':''}" viewBox="0 0 192 136" shape-rendering="crispEdges" role="img" aria-label="${shared?'三间卧室与共用客厅':'一室一厅'}的像素示意图">${drawing}</svg>`;
}

function houseCard(c, save){
  const mismatch=Boolean(c.contractWarning)||(Number(c.goalDays || c.targetDays)>0 && Number(c.leaseMonths)*30>Number(c.goalDays || c.targetDays));
  return `<article class="housing-card" data-house-id="${esc(c.id)}">
    <div class="housing-card-art">${houseIllustration(c)}<span class="housing-chapter">${c.id.endsWith('-b')?'备选房':`第 ${String(c.chapter||1).padStart(2,'0')} 章`}</span></div>
    <div class="housing-card-copy"><div class="housing-card-top"><span>${esc(c.address || '虚构小区 · 待预约')}</span><span class="housing-save ${save?'has-save':''}">${esc(saveStatus(save))}</span></div>
      <h3>${esc(c.title)}</h3><p class="housing-scope">${esc(roomType(c))}</p>
      <div class="housing-price"><strong>${money(c.rent)}</strong><span>/ 月</span><small>押金 ${money(c.deposit)}</small></div>
      <p class="housing-lease ${mismatch?'mismatch':''}">${esc(leaseLabel(c))}<span>·</span>${esc(paymentLabel(c))}</p>
      ${c.contractWarning?`<p class="housing-card-warning">${esc(c.contractWarning)}</p>`:''}
      <div class="housing-card-bottom"><div class="housing-themes">${(c.themes||themes[c.id]||['现场看房','留下记录']).slice(0,2).map(t=>`<span>${esc(t)}</span>`).join('')}</div><button class="housing-select" data-select-case="${esc(c.id)}" aria-label="查看房源：${esc(c.title)}">看看这套 ${icon('arrow')}</button></div>
    </div></article>`;
}

export function renderHome({cases=[],categoryId='whole-long',selectedCaseId=null,saves={},activeCaseId=null,extraOverlay='',practiceSaved=false}={}){
  const category=categories.find(c=>c.id===categoryId)||categories[0],visible=cases.filter(c=>categoryOf(c)===category.id);
  const active=cases.find(c=>c.id===activeCaseId),selected=cases.find(c=>c.id===selectedCaseId);
  return `<main class="menu-screen" aria-label="租房新手村主界面"><div class="menu-inner" ${selected||extraOverlay?'inert':''}>
    <header class="menu-top"><span class="menu-brand">${icon('home')} 租房新手村</span><span class="menu-edition">1.1 · 把每一页看清楚</span><button class="text-button menu-study-link" data-command="practice">${icon('note')} 合同练习</button><span class="menu-weather">${icon('sun')} 今日宜 · 慢慢看房</span></header>
    <section class="menu-hero" aria-labelledby="menu-title"><img src="${neighborhoodImage}" class="menu-neighborhood" alt="树荫、小路和待你探索的像素街区" width="1056" height="312"><div class="menu-hero-copy"><span class="menu-kicker">欢迎来到你的租房故事</span><h1 id="menu-title">给生活，<br><em>找个落脚处。</em></h1><p>看一看房子，聊一聊约定。<br>每扇门后，都有一段不同的故事。</p>${active&&saves[active.id]?`<button class="menu-continue" data-command="continue-last">${icon('note')} 接着看「${esc(active.title)}」 ${icon('arrow')}</button>`:'<span class="menu-start-note">从下面选一种租法，出发看房吧 ↓</span>'}</div></section>
    <section class="menu-selector" aria-labelledby="menu-rental-title"><div class="menu-section-title"><span class="menu-section-number">01</span><h2 id="menu-rental-title">这次，想怎么住？</h2><p>按自己的居住计划选，不必按顺序玩。</p></div>
      <nav class="menu-categories" aria-label="租房类型">${categories.map(cat=>`<button class="menu-category ${category.id===cat.id?'active':''}" data-category="${cat.id}" aria-pressed="${category.id===cat.id}"><span class="menu-category-icon">${icon(cat.icon)}</span><span><strong>${cat.title}</strong><small>${cat.note}</small></span><i>${cases.filter(c=>categoryOf(c)===cat.id).length} 处</i></button>`).join('')}</nav>
      <p class="menu-category-note">${category.id.startsWith('whole')?'单租：一个人租下完整的一室一厅一卫，厨房和卫生间由你独用。':'合租：租下一间独用卧室，与其他住户共用厨房、卫生间等区域。'}<span>${category.id.endsWith('short')?'按短住目标筛选；实际合同期限仍要逐套核对。':'按长期居住目标筛选；付款周期与合同期限分开看。'}</span></p>
    </section>
    <section class="menu-houses" aria-labelledby="menu-houses-title"><div class="menu-section-title"><span class="menu-section-number">02</span><h2 id="menu-houses-title">${category.title} · 可以去看的房子</h2><p>先翻翻资料，再亲自推开门。</p></div><div class="housing-grid">${visible.map(c=>houseCard(c,saves[c.id])).join('')||'<p class="menu-empty">这个分类还没有房源，试试旁边的类型。</p>'}</div></section>
    <section class="study-grid" aria-label="看房之外的小功课"><article><span class="menu-kicker">独立练习 · 不计分</span><h2>签字前的最后一页</h2><p>翻阅合同、聊天和附件。把读过、问过和双方写下的约定分清楚。</p><button class="button primary" data-command="practice">${practiceSaved?'继续合同练习':'打开合同练习'} ${icon('arrow')}</button></article><article><span class="menu-kicker">六城资料 · 选址参考</span><h2>先认认路，再看房</h2><p>查看城市线网入口和脚本收集的挂牌样本；真实城市资料与虚构房源分开看。</p><button class="button secondary" data-command="cities">翻开城市参考册 ${icon('arrow')}</button></article></section>
    <footer class="menu-footer"><span>${icon('note')} 每套房的看房手账单独保存。</span><p>房源、人物、路线与报价均为虚构故事 · 电脑单机试玩</p></footer>
  </div>${selected?renderHousingDetail({caseConfig:selected,save:saves[selected.id]}):extraOverlay}</main>`;
}

export function renderHousingDetail({caseConfig,save,inGame=false,leaseTerms=null}){
  if(!caseConfig)return '';
  const c=leaseTerms?{...caseConfig,...leaseTerms,_selectedLease:`本次所选：${leaseTerms.label||`${leaseTerms.leaseMonths||caseConfig.leaseMonths} 个月合同`}`} : caseConfig;
  const initial = Number(c.initialCash ?? Number(c.rent)*Number(c.paymentMonths||1)+Number(c.deposit)+Number(c.serviceFee||0));
  const recurring = Number(c.rent)+Number(c.serviceFee||0)+Number(c.utilityEstimate||0);
  const segments=Array.isArray(c.routeSegments)?c.routeSegments:[];
  const days=Number(c.goalDays||c.targetDays),mismatch=days>0&&Number(c.leaseMonths)*30>days;
  return `<div class="housing-overlay"><section class="housing-detail" role="dialog" aria-modal="true" aria-labelledby="housing-detail-title" tabindex="-1">
    <button class="icon-button close" data-command="close-house" aria-label="${inGame?'返回看房':'关闭房源资料'}">${icon('close')}</button>
    <div class="housing-detail-header"><div>${houseIllustration(c,true)}</div><div class="housing-detail-title"><span class="menu-kicker">${c.id.endsWith('-b')?'另一套候选房':`第 ${String(c.chapter||1).padStart(2,'0')} 章`} · 房源资料</span><h2 id="housing-detail-title">${esc(c.title)}</h2><p>${esc(c.address||'虚构房源')}</p><span class="housing-scope-label">${esc(roomType(c))}</span><p class="housing-detail-lease ${mismatch?'mismatch':''}">${icon('calendar')}${esc(leaseLabel(c))} · ${esc(paymentLabel(c))}</p>${c.contractWarning?`<p class="housing-contract-warning">${leaseTerms?'看房前的提示：':''}${esc(c.contractWarning)}</p>`:''}</div></div>
    <div class="housing-detail-body"><div class="housing-story"><h3>${icon('note')} 这次看房的小故事</h3><p>${esc(c.description||c.subtitle||'你已经选中了这套房，现在想亲自看看它真实的样子。')}</p><div class="housing-goal"><span>你的打算</span><p>${esc(c.goal || (days?`这次计划住 ${days} 天。先核对房屋和合同，再作决定。`:'先把现场和材料看清，再决定是否住下来。'))}</p></div><p class="housing-host">${icon('person')} 带你看房：${esc(characterLabel(c.host||{name:'小陈',role:'带看人'}))}</p>${c.friend?`<p class="housing-host">${icon('roommate')} 同行介绍人：${esc(characterLabel(c.friend))}</p>`:''}${c.id==='choice'?`<aside class="comparison-home"><span>另一个可预约的报价 · 尚未看过</span><h3>${esc(COMPARISON_LISTINGS.choice.title)}</h3><p>合租卧室 ${money(COMPARISON_LISTINGS.choice.rent)}/月 · 押一付一 · 拟住${COMPARISON_LISTINGS.choice.leaseMonths}个月<br>虚构路线单程${COMPARISON_LISTINGS.choice.commuteMinutes}分钟 · 交通预算${COMPARISON_LISTINGS.choice.transportEstimate}元/月</p><p>这只是待比较的资料。进入本关后，可在门口资料处约看；现场与出租关系尚未核实。</p></aside>`:''}<div class="housing-detail-note">资料是出发前的一页介绍。实际使用范围、设备状态与书面约定，还要在房子里逐项确认。</div></div>
      <div class="housing-budget"><h3>${icon('folder')} 先算一算手边的钱</h3><dl><div><dt>月租</dt><dd>${money(c.rent)}</dd></div><div><dt>押金 <small>暂时占用</small></dt><dd>${money(c.deposit)}</dd></div><div><dt>每月服务费</dt><dd>${money(c.serviceFee||0)}</dd></div><div><dt>用量费参考 <small>按实际账单</small></dt><dd>${money(c.utilityEstimate||0)} / 月</dd></div></dl><div class="housing-cash"><span>首期需要准备</span><strong>${money(initial)}</strong><small>${c.paymentMonths||1} 个月房租 + 押金 + 首月服务费<br>不含用量费、交通和搬家费用</small></div><p class="housing-monthly">住房每月参考：${money(recurring)}<br><small>押金不计入月消费；实际以本局确认后的约定为准。</small></p>${Number.isFinite(Number(c.budgetAvailable))&&c.budgetAvailable!==undefined?`<p class="housing-remaining">你目前可用 ${money(c.budgetAvailable)}；支付首期后还剩 ${money(Number(c.budgetAvailable)-initial)}。未来收入尚未计入。</p>`:''}</div></div>
    <section class="housing-route"><div><h3>${icon('phone')} 房门到工作地点</h3><span>剧情路线参考 · 单程约 ${esc(c.commuteMinutes||'待确认')} 分钟</span></div><ol>${segments.map((s,i)=>`<li><span class="route-dot">${i+1}</span><span>${esc(typeof s==='string'?s:s.label||s.mode||s.name||'路段')}<strong>${typeof s==='object'?esc(s.minutes??'—')+' 分钟':''}</strong></span></li>`).join('')}</ol><p>工作日与晚归的出入口、候车和通行条件，还可以到现场继续询问。</p></section>
    <footer class="housing-detail-footer"><span>${esc(saveStatus(save))} · 手账独立保存</span><button class="button secondary" data-command="close-house">${inGame?'返回场景':'再看看其他房'}</button><button class="button primary" data-enter-case="${esc(c.id)}">${inGame?'接着看这套房':save?'继续这套房的故事':'出发，去看房'} ${icon('arrow')}</button></footer>
  </section></div>`;
}
