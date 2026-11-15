import * as legacy from './game.js';
import { createInspectionState, restoreInspectionState, parseInspectionAction, reduceInspection, decorateInspectionDialog, getInspectionNotes, getInspectionProgress, getInspectionTimelineItems, getInspectionEffects } from './inspections.js';
export { getInspectionProgress, getInspectionSpots } from './inspections.js';
import { CASES, getCase, SCENARIOS } from './cases.js';
export { CASES, getCase } from './cases.js';
const COMMON = ['intro','ownerAsked','route','basic'];
const movable = ['chair','coffee','plant'];
const base = (state) => ({...state,schemaVersion:3});
const wrap = (state) => ({...state,schemaVersion:4,caseId:'sunny',contractChoice:'draft'});
const scenario = state => SCENARIOS[state.caseId] || {chains:[],events:[]};
const factKey = (chain,index) => `${chain}_${index}`;
const finished = (state,chain) => Boolean(state.facts[factKey(chain.id,chain.steps.length-1)]);
const fulfilled = (state,chain) => !chain.blocked && finished(state,chain) && (!chain.outcomeWhen || chain.outcomeWhen(state));
const allowedChoices = id => id==='choice'?['three','six']:id==='keys'?['draft','eight']:['draft'];
const available = (state,chain,index) => (index===0||state.facts[factKey(chain.id,index-1)]) && (chain.steps[index].requires||[]).every(k=>state.facts[k]);
function canConfirm(state) {
  if(state.caseId==='sunny')return ['repairVerified','dampVerified','feesWritten','inventorySaved'].every(k=>state.facts[k]);
  const s=scenario(state);
  return s.chains.length>0 && (s.confirmFacts||s.chains.filter(c=>!c.optional&&!c.blocked).map(c=>factKey(c.id,c.steps.length-1))).every(k=>state.facts[k]) && (state.caseId!=='keys'||state.contractChoice==='eight');
}
function expectedOutcome(state,decision) {
  if(decision==='pause')return 'pending';if(decision==='leave')return 'left';
  if(decision!=='sign')return null;
  if(scenario(state).chains.every(c=>fulfilled(state,c)))return 'settled';
  return canConfirm(state)?'informed':'unresolved';
}
function createStateCore(caseId='sunny') {
  if(!getCase(caseId))caseId='sunny';
  if(caseId==='sunny')return wrap(legacy.createState());
  const keys=[...COMMON,...(SCENARIOS[caseId]?.chains||[]).flatMap(c=>c.steps.map((_,i)=>factKey(c.id,i)))];
  return {schemaVersion:4,caseId,phase:'viewing',facts:Object.fromEntries(keys.map(k=>[k,false])),furniture:{},pressure:0,lastAction:null,decision:null,outcome:null,contractChoice:caseId==='choice'?'three':'draft'};
}
function validPosition(p){return p&&typeof p==='object'&&['x','z','rotation'].every(k=>typeof p[k]==='number'&&Number.isFinite(p[k]))&&Math.abs(p.x)<=8&&Math.abs(p.z)<=8&&Math.abs(p.rotation)<=Math.PI*2;}
function parsedAction(state,type) {
  if(typeof type!=='string')return null;const m=/^c:([a-z]+):(\d+)$/.exec(type);if(!m)return null;
  const chain=scenario(state).chains.find(c=>c.id===m[1]),index=Number(m[2]);
  return chain&&index<chain.steps.length?{chain,index}:null;
}
function reduceCore(state,action) {
  const type=typeof action==='string'?action:action?.type;
  if(!state||!getCase(state.caseId))return createState();
  if(state.caseId==='sunny'){
    if(type==='SIGN_CONFIRMED'&&!canConfirm(state))return state;
    const previous=base(state),next=legacy.reduce(previous,type==='SIGN_CONFIRMED'?{type:'SIGN'}:action);
    return next===previous?state:wrap(next);
  }
  if(type==='RESET')return createState(state.caseId);
  if(type==='RETRY')return {...state,phase:'viewing',decision:null,outcome:null,lastAction:'RETRY'};
  if(state.phase!=='viewing')return state;
  if(['SIGN','SIGN_CONFIRMED','PAUSE','LEAVE'].includes(type)){
    if(type==='SIGN_CONFIRMED'&&!canConfirm(state))return state;
    const decision=type.startsWith('SIGN')?'sign':type==='PAUSE'?'pause':'leave';
    return {...state,phase:'ending',decision,outcome:expectedOutcome(state,decision),lastAction:type};
  }
  if(type==='MOVE_FURNITURE'){
    if(!movable.includes(action?.id)||!validPosition(action.position))return state;
    const {x,z,rotation}=action.position;return {...state,furniture:{...state.furniture,[action.id]:{x,z,rotation}},lastAction:type};
  }
  if(type==='RESIST_PRESSURE')return {...state,pressure:0,lastAction:type};
  if(type==='CHOOSE_THREE'||type==='CHOOSE_SIX')return state.caseId==='choice'?{...state,contractChoice:type==='CHOOSE_THREE'?'three':'six',lastAction:type}:state;
  if(type==='MATCH_EIGHT')return state.caseId==='keys'&&state.facts.authority_2?{...state,contractChoice:'eight',lastAction:type}:state;
  const basics={ASK_INTRO:'intro',ASK_OWNER:'ownerAsked',READ_ROUTE:'route',CHECK_BASIC:'basic'};
  let key=basics[type];const parsed=parsedAction(state,type);
  if(parsed){if(!available(state,parsed.chain,parsed.index))return state;key=factKey(parsed.chain.id,parsed.index);}
  if(!key)return state;
  return {...state,facts:{...state.facts,[key]:true},pressure:state.facts[key]?state.pressure:Math.min(3,state.pressure+1),lastAction:type};
}
/** A save may only be restored into the home it belongs to. */
function restoreStateCore(input,expectedCaseId) {
  if(input?.schemaVersion===3&&(!expectedCaseId||expectedCaseId==='sunny'))return wrap(legacy.restoreState(input));
  const id=expectedCaseId||input?.caseId||'sunny',fresh=createState(id);
  if(!getCase(id)||!input||input.schemaVersion!==4||input.caseId!==id)return null;
  if(id==='sunny'){
    const accepted=wrap(legacy.restoreState(base(input)));
    const unchanged=['phase','pressure','lastAction','decision','outcome'].every(key=>accepted[key]===input[key]) && Object.keys(accepted.facts).every(key=>accepted.facts[key]===input.facts?.[key]) && JSON.stringify(accepted.furniture)===JSON.stringify(input.furniture);
    return unchanged?accepted:null;
  }
  if(!['viewing','ending'].includes(input.phase)||!input.facts||typeof input.facts!=='object'||Array.isArray(input.facts))return null;
  const keys=Object.keys(fresh.facts);if(Object.keys(input.facts).length!==keys.length||keys.some(k=>typeof input.facts[k]!=='boolean'))return null;
  const facts=Object.fromEntries(keys.map(k=>[k,input.facts[k]]));
  for(const c of scenario(fresh).chains)for(let i=0;i<c.steps.length;i++)if(facts[factKey(c.id,i)]&&!available({...fresh,facts},c,i))return null;
  if(!input.furniture||typeof input.furniture!=='object'||Array.isArray(input.furniture))return null;
  const furniture={};for(const [k,v]of Object.entries(input.furniture)){if(!movable.includes(k)||!validPosition(v))return null;furniture[k]={x:v.x,z:v.z,rotation:v.rotation};}
  if(!Number.isInteger(input.pressure)||input.pressure<0||input.pressure>3||!allowedChoices(id).includes(input.contractChoice))return null;
  if(id==='keys'&&input.contractChoice==='eight'&&!facts.authority_2)return null;
  const candidate={...fresh,facts,furniture,phase:input.phase,pressure:input.pressure,contractChoice:input.contractChoice,decision:input.decision,outcome:input.outcome,lastAction:input.lastAction};
  const actions=['ASK_INTRO','ASK_OWNER','READ_ROUTE','CHECK_BASIC','RESIST_PRESSURE','MOVE_FURNITURE','SIGN','SIGN_CONFIRMED','PAUSE','LEAVE','RESET','RETRY','CHOOSE_THREE','CHOOSE_SIX','MATCH_EIGHT'];
  const p=parsedAction(candidate,input.lastAction);
  if(input.lastAction!==null&&!actions.includes(input.lastAction)&&!p)return null;
  if(p&&!facts[factKey(p.chain.id,p.index)])return null;
  const basicFact={ASK_INTRO:'intro',ASK_OWNER:'ownerAsked',READ_ROUTE:'route',CHECK_BASIC:'basic'}[input.lastAction];
  if(basicFact&&!facts[basicFact])return null;
  if((input.lastAction==='MATCH_EIGHT'&&(id!=='keys'||input.contractChoice!=='eight'))||(['CHOOSE_THREE','CHOOSE_SIX'].includes(input.lastAction)&&id!=='choice'))return null;
  if(input.lastAction==='CHOOSE_THREE'&&input.contractChoice!=='three'||input.lastAction==='CHOOSE_SIX'&&input.contractChoice!=='six')return null;
  if(candidate.phase==='viewing'&&(candidate.decision!==null||candidate.outcome!==null))return null;
  if(candidate.phase==='ending'&&(!['sign','pause','leave'].includes(candidate.decision)||candidate.outcome!==expectedOutcome(candidate,candidate.decision)))return null;
  if(candidate.lastAction==='SIGN_CONFIRMED'&&!canConfirm(candidate))return null;
  return candidate;
}
export function getLeaseTerms(state){
  const c=getCase(state.caseId)||getCase('sunny');let {rent,deposit,leaseMonths,paymentMonths,serviceFee}=c;
  let label=state.decision==='sign'?'本局选择的合同':'当前合同草稿';
  if(c.id==='choice'){const six=state.contractChoice==='six';rent=deposit=six?2100:2400;leaseMonths=six?6:3;label=six?'六个月方案：提前30天通知，示例提前退出费用2100元':'三个月方案：按约到期交接';}
  if(c.id==='keys'){leaseMonths=state.contractChoice==='eight'?8:12;label=leaseMonths===8?'已确认的八个月方案（本局按每月30天简化）':'十二个月草稿：已证实授权仅覆盖八个月';}
  if(c.id==='internship')label='十二个月合同：三个月后退出按本局条款另计3300元；无责短租未获同意';
  if(c.id==='transfer')label=state.facts.term_2?'新签六十天租约，已覆盖计划入住时间':'拟住六十天；原约剩四十五天，延长尚需书面落实';
  return {rent,deposit,leaseMonths,paymentMonths,serviceFee,initialCash:rent*paymentMonths+deposit+serviceFee,label};
}
const chainStatus=(state,c)=>fulfilled(state,c)?'resolved':finished(state,c)||state.facts[factKey(c.id,1)]?'pending':state.facts[factKey(c.id,0)]?'found':'unknown';
export function getCaseProgress(state){
  if(state.caseId==='sunny')return legacy.getCaseProgress(base(state));
  const chains=scenario(state).chains.map(c=>{const status=chainStatus(state,c);let index=-1;c.steps.forEach((_,i)=>{if(state.facts[factKey(c.id,i)])index=i;});return {id:c.id,title:c.title,status,detail:index<0?c.hint:c.steps[index].summary||c.steps[index].body.at(-1),target:c.target};});
  return {chains,nextHint:chains.find(c=>c.status!=='resolved')?.detail||'这些已知事项已逐项核对。到合同桌前，按自己的需要决定。',pressureLabel:['慢慢看，不着急。','对方问你是否可以定下来。','手机又亮了一下，你仍可以继续检查。','今天先不答应，也完全可以。'][state.pressure]};
}
function getNotebookCore(state){
  if(state.caseId==='sunny')return legacy.getNotebook(base(state));
  const c=getCase(state.caseId),terms=getLeaseTerms(state),status={unknown:'还没核实',found:'发现线索',pending:'还需落实',resolved:'本项已记录'};
  return [{title:'本次租赁范围',status:c.housingType==='whole'?'一人整租':'合租卧室',detail:`${c.floorPlan}。${terms.label}。月租${terms.rent}元，押金${terms.deposit}元。`},...getCaseProgress(state).chains.map(x=>({title:x.title,status:status[x.status],detail:x.detail})),
    {title:'首期付款与日常支出',status:'预算参考',detail:`首期${terms.initialCash}元 = 房租${terms.rent}×${terms.paymentMonths}个月 + 押金${terms.deposit} + 当月服务费${terms.serviceFee}。用量、交通和生活费另计；押金是待结算的占用资金。`},
    {title:'从房门到办公入口',status:state.facts.route?'已读路线卡':'路线卡待读',detail:`${c.routeSegments.map(s=>`${s.label}${s.minutes}分钟`).join(' + ')}，合计${c.commuteMinutes}分钟。${c.nightExtraMinutes?`晚归另绕行${c.nightExtraMinutes}分钟。`:''}这些是虚构场景资料，不是实时地图。`}];
}
const option=(label,action,extra={})=>({label,action,...extra});
function introDialog(id,state){
  const c=getCase(state.caseId),s=scenario(state),terms=getLeaseTerms(state);
  const d={title:'房间里的一角',eyebrow:`租房手记 · ${c.title}`,speaker:'self',expression:'neutral',body:['先看眼前的细节，再找对应的材料。'],options:[],footer:'每一项确认，都留在这套房自己的手账里。'};
  if(id==='landlord')Object.assign(d,{title:`和${c.host.name}聊聊`,speaker:'agent',speakerName:`${c.host.name} · ${c.host.role}`,expression:state.pressure>1?'avoid':'smile',body:state.lastAction==='RESIST_PRESSURE'?['你：我会把这些事情问清楚，再作决定。','对方收起催促，给你留出继续检查的时间。']:s.intro||[`${c.host.name}：先进来看看，喜欢的话今天就能定。`,c.goal],options:[option('问问这套房的基本情况','ASK_INTRO'),option('我想按自己的节奏再看看','RESIST_PRESSURE')]});
  if(id==='owner')Object.assign(d,{title:`给${c.owner.name}打个电话`,speaker:'owner',speakerName:`${c.owner.name} · ${c.owner.role}`,body:s.ownerIntro||[`${c.owner.name}：有什么想确认的，可以把材料拿出来，我们一件一件看。`,'口头回答先记下来。书面授权、合同和交接仍需要分别核对。'],options:[option('确认要向谁索取材料','ASK_OWNER'),option('先不催签，等我核实完','RESIST_PRESSURE')]});
  if(id==='roommate')Object.assign(d,{title:`和${c.roommate.name}聊聊`,speaker:'roommate',speakerName:`${c.roommate.name} · 现住室友`,expression:'smile',body:[`${c.roommate.name}：你先把看见的地方记下来，我们一起把实际居住和公共区安排问清。`,'其他住户的情况与共同规则，也需要他们本人参与确认。']});
  if(id==='friend'&&c.friend)Object.assign(d,{title:`和${c.friend.name}聊聊`,speaker:'friend',speakerName:`${c.friend.name} · ${c.friend.role}`,expression:'smile'});
  if(id==='phone')Object.assign(d,{title:'手机里的路线与房源',body:[`${c.address}。${c.description}`,`${c.routeSegments.map(s=>`${s.label}${s.minutes}分钟`).join(' + ')} = 单程${c.commuteMinutes}分钟。${c.nightExtraMinutes?`晚归侧门绕行另加${c.nightExtraMinutes}分钟。`:''}`,'路线卡为本关虚构资料，现场与资格仍须按相应步骤核对。'],options:[option('把路线卡记进手账','READ_ROUTE')]});
  if(id==='desk')Object.assign(d,{title:'把合同摊在桌上',body:[terms.label,`月租 ${terms.rent} 元，押金 ${terms.deposit} 元；每次支付 ${terms.paymentMonths} 个月租金，租期 ${terms.leaseMonths} 个月。首期 ${terms.initialCash} 元，用量费用另计。`,c.budgetAvailable?`本局入住预算 ${c.budgetAvailable} 元；按此首期付款还余 ${c.budgetAvailable-terms.initialCash} 元。未来收入尚未确定，还要预留通勤和日常生活费用。`:'签约是一项剧情选择。仍未落实的事项，会保留在手账中。'],options:[option('按已核实的条款签约','SIGN_CONFIRMED',{primary:true,disabled:!canConfirm(state),detail:canConfirm(state)?'知情选择，仍可保留未解决的限制':'先完成必要材料与约定核对'}),option('按当前草稿直接签约','SIGN'),option('今天暂缓，继续等材料','PAUSE'),option('这套不适合，先离开','LEAVE')]});
  if(id==='bathroom'||id==='sink'||id==='window'||id==='bed')Object.assign(d,{title:{bathroom:'看看卫生间',sink:'试试厨房设施',window:'站到窗边',bed:'卧室里的床'}[id],body:[c.housingType==='shared'?'这里的厨房与卫生间由住户共同使用，卧室使用范围要与合同对应。':'这是整套房由你独用的设施。',state.facts.basic?'已经短暂试用可见设施，眼前没有发现新增异常；其他时段和不可见部位仍需继续确认。':'征得同意后，试用正常开关、排水和通风；沉重家具保持原位，检查边角即可。'],options:[option('正常试用，记下可见情况','CHECK_BASIC')]});
  if(id==='chair'||id==='plant'||id==='coffee')Object.assign(d,{title:'轻轻挪一挪',body:['这件小物可以挪动。留出走路和检查的位置，看完再放回原处。']});
  if(state.lastAction==='ASK_INTRO'&&id==='landlord')d.body=[c.goal,`${c.floorPlan}。${terms.label}`,`首期${terms.initialCash}元，押金${terms.deposit}元单列；先去看看${s.chains[0]?.title||'材料'}。`];
  if(c.alternatives?.length&&['phone','landlord','desk'].includes(id))d.options.push(...c.alternatives.map(caseId=>({label:`看看备选：${getCase(caseId).title}`,caseId})));
  return d;
}
function getDialogCore(id,state){
  if(state.caseId==='sunny')return legacy.getDialog(id,base(state));
  const d=introDialog(id,state),chains=scenario(state).chains.filter(c=>c.target===id||(id==='roommate'&&['rules','occupancy'].includes(c.id)));
  if(chains.length){d.title=chains.length===1?chains[0].title:'对照眼前的材料';d.body=chains.map(c=>c.hint);
    const p=parsedAction(state,state.lastAction);
    if(p&&chains.includes(p.chain)){const step=p.chain.steps[p.index];d.body=[...step.body];d.speaker=step.speaker||(['roommate','friend'].includes(id)?id:'self');if(step.speakerName)d.speakerName=step.speakerName;d.expression=step.expression||'neutral';}
    const actions=chains.flatMap(c=>c.steps.map((step,i)=>({step,i})).filter(({i})=>id!=='roommate'||i>0).map(({step,i})=>option(step.label,`c:${c.id}:${i}`,{disabled:!available(state,c,i),primary:Boolean(state.facts[factKey(c.id,i)]),detail:!available(state,c,i)?step.waitHint||'先到对应物件处发现线索，再把前面的资料核对清楚':state.facts[factKey(c.id,i)]?'已记录，可再读一次':''})));
    d.options=[...actions,...d.options];
  }
  if(state.caseId==='choice'&&['desk','calendar'].includes(id))d.options.unshift(option('选择三个月 · 每月2400元','CHOOSE_THREE',{primary:state.contractChoice==='three'}),option('选择六个月 · 每月2100元','CHOOSE_SIX',{primary:state.contractChoice==='six',detail:'本局提前退出条款仍然适用'}));
  if(state.caseId==='keys'&&['desk','folder'].includes(id))d.options.push(option('采用书面确认的八个月方案','MATCH_EIGHT',{disabled:!state.facts.authority_2,primary:state.contractChoice==='eight',detail:'不自动获得后续四个月的住处'}));
  return d;
}
function getTimelineCore(state){
  if(state.decision!=='sign')return [];
  if(state.caseId==='sunny')return legacy.getTimeline(base(state)).map((e,i)=>({...e,shortLabel:['一周后','一个月后','一年后'][i],view:['aftermath','damp','handover'][i]}));
  const c=getCase(state.caseId),s=scenario(state),days=c.timelineDays;
  return days.map((day,index)=>{
    const ev=s.events.find(e=>e.day===day)||{day,title:`入住第${day}天`,view:'desk',chainIds:s.chains.map(x=>x.id)};
    const selected=s.chains.filter(x=>(ev.chainIds||[]).includes(x.id));
    const items=selected.map(chain=>{const ok=chain.outcomeWhen?chain.outcomeWhen(state):fulfilled(state,chain);return {title:`${chain.title} · ${ok?'可以对照':'还需核对'}`,body:typeof (ok?chain.good:chain.bad)==='function'?(ok?chain.good:chain.bad)(state):(ok?chain.good:chain.bad)||'把原始资料保留好，再继续沟通。'};});
    const good=selected.every(chain=>chain.outcomeWhen?chain.outcomeWhen(state):fulfilled(state,chain));
    if(index===days.length-1)items.push({title:'回到真实的约定',body:`${getLeaseTerms(state).label}。押金${getLeaseTerms(state).deposit}元仍需逐项结清，不能仅凭有无某条记录推定全退或全扣。`});
    return {day,label:ev.title,shortLabel:day===7?'一周后':day===30?'一个月后':day===365?'一年后':`第${day}天`,title:ev.title,body:typeof ev.body==='function'?ev.body(state):ev.body||'时间走到这里，看看当时留下的材料能否对上。',tone:good?'success':'warning',items,view:ev.view||'desk'};
  });
}
function getEndingCore(state){
  if(state.caseId==='sunny')return legacy.getEnding(base(state));
  if(state.decision==='pause')return {eyebrow:'把决定留给下一次',title:'材料齐一些，再决定',tone:'neutral',body:'你还没有签约。当前房源的手账会留下来，可以继续调查，也可以回到街区看看别的房子。',items:[{title:'下次再来',body:'带着尚未落实的事项，约好看房、材料核对或共同协商的时间。'}]};
  if(state.decision==='leave')return {eyebrow:'回到街区',title:'下一扇门，也可以看看',tone:'neutral',body:'你选择了离开，没有签约或付款。房子是否适合，本来就由你决定。',items:[{title:'带走手账',body:'这套房的记录独立保存。进入另一套房，要重新看现场和材料。'}]};
  const c=getCase(state.caseId),chains=getCaseProgress(state).chains;
  return {eyebrow:'这一段租住时光',title:canConfirm(state)?'作出知情的选择':'有些事，还需要继续核对',tone:canConfirm(state)?'success':'neutral',body:`${c.title}的经历留在手账里。复盘逐项对照已知事实，租期或生活偏好没有统一答案。`,items:[...chains.map(x=>({title:x.title,body:x.detail})),{title:'手账之外',body:'房源、人物、费用和路线均为虚构。表情不能测谎，费用和押金反馈不是现实裁决。尚未检查的设施、空气、时段与个人需求，仍需另行核实。'}]};
}
function getSceneStateCore(state,day=0){
  if(state.caseId==='sunny')return {facts:state.facts,day,effects:{}};
  const f=state.facts,c=getCase(state.caseId),s=scenario(state);
  const done=id=>{const chain=s.chains.find(x=>x.id===id);return chain?fulfilled(state,chain):true;};
  return {facts:{repairVerified:true,dampVerified:true,cabinetOpened:false,sofaInspected:false,inventorySaved:done('handover')},day,
    effects:{billAlert:day>=30&&(!done('fees')||!done('cash')||!done('cost')||!done('meter')),authorityAlert:day>0&&(!done('authority')||!done('payment')||!done('identity')),calendarAlert:day>0&&(!done('term')||state.caseId==='keys'&&state.contractChoice!=='eight'),
      sharedBusy:c.housingType==='shared'&&day>=7&&!done('rules'),packed:day>=c.timelineDays.at(-1),keysReady:day>=c.timelineDays.at(-1)&&done('handover'),rulesVisible:done('rules')&&c.housingType==='shared'}};
}

/** 1.1 adds separate inspection facts without changing the original evidence keys. */
export function createState(caseId='sunny') {
  const state=createStateCore(caseId);
  return {...state,inspections:createInspectionState(state.caseId)};
}
export function restoreState(input,expectedCaseId) {
  const core=restoreStateCore(input,expectedCaseId);
  if(!core)return createState(expectedCaseId||input?.caseId||'sunny');
  const eligible=input?.schemaVersion===4&&input.caseId===core.caseId;
  return {...core,inspections:restoreInspectionState(eligible?input.inspections:null,core)};
}
export function reduce(state,action) {
  const type=typeof action==='string'?action:action?.type;
  if(!state||!getCase(state.caseId))return createState();
  if(typeof type==='string'&&type.startsWith('i:'))return state?.caseId?reduceInspection(state,type):createState();
  const next=reduceCore(state,action);
  if(next===state)return state;
  if(type==='RESET')return {...next,inspections:createInspectionState(next.caseId)};
  let inspections=next.inspections||state?.inspections||createInspectionState(next.caseId);
  if(inspections.lastAction)inspections={...inspections,lastAction:null};
  // This established menu action performs the whole preparation-and-observation sequence.
  if(next.caseId==='sunny'&&type==='OBSERVE_LEAK'&&next.facts.leakObserved)inspections={...inspections,facts:{...inspections.facts,sinkcheck_0:true,sinkcheck_1:true,sinkcheck_2:true}};
  return {...next,inspections};
}
export function getDialog(id,state) {
  return decorateInspectionDialog(id,state,getDialogCore(id,state));
}
export function getTimeline(state) {
  return getTimelineCore(state).map(event=>({...event,items:[...event.items,...getInspectionTimelineItems(state,event.day)]}));
}
export function getNotebook(state) {
  return [...getNotebookCore(state),...getInspectionNotes(state)];
}
export function getEnding(state) {
  const ending=getEndingCore(state);
  if(state.decision!=='sign')return ending;
  const openChecks=getInspectionProgress(state).chains.some(chain=>chain.status!=='resolved');
  const scope=ending.tone==='success'&&openChecks?{
    title:'主线有了记录，别遗漏其他事项',tone:'neutral',
    body:ending.body+' 补充检查仍有尚未核实或复查的事项，已完成的主线不能替代这些记录。',
  }:{};
  return {...ending,...scope,items:[...ending.items,...getInspectionNotes(state).map(note=>({title:note.title+' · '+note.status,body:note.detail}))]};
}
export function getSceneState(state,day=0) {
  const scene=getSceneStateCore(state,day);
  return {...scene,effects:{...scene.effects,...getInspectionEffects(state,day)}};
}
