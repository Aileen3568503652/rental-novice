// A fictional reading exercise. Its state never shares evidence with a housing case.
export const PRACTICE_ID = 'contract_practice_01';
export const PRACTICE_STORAGE_KEY = 'rental-contract-practice-v1';

const clause = (n, title, ...body) => ({ id: `clause${n}`, kind: 'contract', number: n, title: `第${['','一','二','三','四','五','六','七','八','九','十','十一','十二','十三','十四'][n]}条 · ${title}`, body });
const material = (id, title, ...body) => ({ id, kind: 'material', title, body });

export const PRACTICE_DOCUMENTS = [
  clause(1, '住房及用途', '宁桥市云桥路18号2栋3单元402室，一室一厅一厨一卫，供承租人一人整套居住。交付清单中列明家具、家电、钥匙和门卡。'),
  clause(2, '租赁期限', '自2027年3月1日起至2028年2月29日止。实际交房以双方签署的交接单为准。'),
  clause(3, '租金', '月租金为人民币3200元，按月支付。首月租金于签约时支付；此后每月20日前支付下一个自然月的租金。其他由承租人承担的相关费用见本协议及附件。'),
  clause(4, '押金', '承租人签约时支付押金3200元。退房结算后，出租人于45日内退还押金余额；出租人可从押金中扣除未结费用及其综合修复评估费用，结算时提供项目说明。'),
  clause(5, '支付与凭证', '租金和押金支付至签约信息附件注明的账户，支付后由收款方出具收据。附件所列账户名为“陈某”，账号尾号1836。'),
  clause(6, '附加费用', '物业费由出租人承担；网络由出租人提供。水、电、燃气按照各自计量及费用附件结算。服务项目及费用以附件为准。'),
  clause(7, '使用与维护', '承租人应合理使用住房及设备。如灯具、椅子、水龙头、空调等设施在租期内发生任何故障，维修与更换费用均由承租人承担。承租人应及时联系约定的报修人。'),
  clause(8, '房屋检查', '出租人需要查看室内设备时，应至少提前24小时联系承租人，取得同意后进入；法律规定或紧急情况另有要求时依法处理。'),
  clause(9, '改动与转租', '承租人需要打孔、装修、拆改或转租时，应事先与出租人协商并取得书面同意；审批、复原和费用由双方另行约定。'),
  clause(10, '提前解除', '承租人因个人原因提前解除的，应至少提前30日书面通知，并按两个月租金支付违约金。出租人因个人原因提前收回的，应提前30日书面通知，并按一个月租金支付违约金。未发生的租金在双方结清后退还。'),
  clause(11, '续租', '双方可在租期届满前30日协商是否续租；续租应另行确认期限、租金和其他条件。'),
  clause(12, '交接', '入住与退房时双方核对设施状态、表数、钥匙和门卡，填写交接清单；清单与经双方确认的照片作为协议附件。'),
  clause(13, '争议解决', '双方协商不成的，可依法向有管辖权的人民法院处理。通知与送达方式以双方填写的信息附件为准。'),
  clause(14, '附件与签署', '《费用清单》《设施及交接清单》《签约信息表》为本协议附件，与正文一同提供。双方确认附件内容后各执一份。'),
  material('listing', '出发前的挂牌卡', '发布于2027年2月18日。宁桥市云桥路18号402室，一人整租，一室一厅一厨一卫。月租3200元，押一付一，签12个月。', '宣传文字：无中介费、七天免租、日常报修协调包含在租金内。', '虚构路线：房门步行至地铁入口8分钟＋候车4分钟＋乘车20分钟＋出站到办公楼8分钟＝单程40分钟。单程票价4元，22个工作日往返交通费176元/月。房号、范围和宣传内容还需对照现场与文件。'),
  material('chat', '与周女士、小陈的原始聊天', '2027年2月20日，周女士：交完钥匙后尽快把押金退给你，正常情况三个工作日左右。', '同日，小陈：前三个月水电燃气合计约480元，只是参考。你自己的用量还要看账单。', '消息保留原始日期与上下文。聊天尚未写入双方签署的合同或修订页。'),
  material('authority', '产权、身份与委托材料夹', '周女士的产权证明、身份证明与402室对应；姓名和联络方式采用练习化展示，不收集真实个人信息。', '委托人：周女士。受托人：小陈。委托事项：联系带看、收集租客信息。有效期至2027年10月31日。', '材料中未写代签合同或代收款权限。周女士尚未确认是否有其他授权，也尚未确认本次由谁完成签署。'),
  material('fees', '费用附件 · 原始版本', '每月报修协调服务费80元，于每月租金支付时一并缴纳。水、电、燃气按本户原始账单及表数结算。历史参考合计约160元/月，不是包干价。', '网络与物业由出租方承担，无中介费。租金、押金和首月服务费共6480元；另预留用量160元和交通176元，初期现金参考6816元。', '每月住房及通勤参考3200＋80＋160＋176＝3616元，不含餐饮等；押金是暂占用资金。'),
  material('payment', '签约信息附件 · 收款栏', '出租人：周女士。代理联系人：小陈。账户名：陈某；尾号1836。收款人与签约双方的联系方式、送达地址另列在双方各持的信息附件中。', '现有材料未解释陈某与小陈是否同一人，也没有显示可核对的代收款授权。收据由谁开具仍待确认。', '本练习不提供可实际转账的号码，也不会发起付款。'),
  material('handover', '设施与交接清单 · 待签', '空调外壳有一处旧划痕；厨房水槽下接口在本练习的现场短暂试水中没有新水珠；钥匙2把、门卡1张。', '电、水、燃气表号和起始读数栏尚未填写。设施、照片及钥匙仍待双方现场逐项核对与签字。', '看到清单或拍下照片，不等于对方已经确认旧损和交接内容。'),
];

export const PRACTICE_TOPICS = [
  {
    id: 'authority', title: '签约安排', docs: ['clause2','authority'], question: '授权期限、权限与这次签约怎样对应？',
    comparison: '现有委托只涉及带看和资料收集，到2027年10月31日；租约到2028年2月29日。需要问清由周女士本人签署，还是另有对应签约行为的授权，不能只看两个日期就下结论。',
    request: '你请周女士核对产权、身份及签约安排，并要求明确谁有权签署正文和附件。小陈把问题转给她，尚未收到确认。',
    confirmation: '周女士到场核对原件及402室信息，确认这次由她本人签署，租期仍到2028年2月29日。小陈只联系带看和收集材料，不代签。双方核对了修订页，尚未签字。',
    revision: '本次由产权人周女士本人签署正文与附件。小陈仅为带看和联络人，不代签或因此自动获得代收款权限。双方留存相同版本。',
    review: '期限与权限要结合具体行为看。委托只到10月并不自动证明租约不能到次年2月；先确认本人签署或对应签约授权，不能把未见材料直接说成诈骗。',
  },
  {
    id: 'payment', title: '支付路径', docs: ['clause5','authority','payment'], question: '陈某是谁？收款权限和收据怎样核实？',
    comparison: '账户名与产权人不同，现有材料没有解释身份和代收范围。先核实，而不是直接推定账户有问题。',
    request: '你请周女士确认收款路径、收据出具人和各方身份，并提出由本人确认后再决定付款。现在仍是已提出要求。',
    confirmation: '周女士确认本次改为她本人经当面核验的同名账户收款并出具收据。双方将原陈某账户栏划销，签约信息附件改好，等待双方签署。',
    revision: '本次款项支付至经双方核验的周女士本人同名账户，由周女士出具对应收据。旧“陈某”账户栏作废。练习不展示可付款的真实账号。',
    review: '主体、身份、权限和收据分别核对；他人账户不必然有问题，但不能把带看授权当作代收授权。适用监管时还需查具体要求。',
  },
  {
    id: 'free', title: '交房与首月租金', docs: ['listing','clause3'], question: '七天免租的日期、涵盖费用和首期金额怎么写？',
    comparison: '挂牌卡写七天免租，第三条却要求首月3200元且没写免租。起止、交房日和免哪些费用都尚未一致。',
    request: '你要求写清具体日期、是否包含在租期内、免租项目及首月计算。小陈只回复“会去问”，金额尚未改变。',
    confirmation: '周女士同意2027年3月1日交房，3月1日至7日（含首尾）七天只免租金，包含在原十二个月租期内。三月按31天计算，首月租金为3200×24÷31，四舍五入至2477.42元。服务及用量另按各自约定。修订页尚待双方签署。',
    revision: '交房日为2027-03-01；2027-03-01至03-07七个自然日只免租金，计入原租期。首月按31天计算：3200×24÷31＝2477.42元；之后月租3200元，其他费用分别按附件处理。',
    review: '免租并不自动缩短或延长租期，也不一定免服务费和用量费。本局经双方确认后采用七日只免租金、包含在租期内的明确方案；签署前仍按原草稿计算。',
  },
  {
    id: 'service', title: '租金与服务项目', docs: ['listing','fees','clause6'], question: '报修协调是否已包含在3200元里？',
    comparison: '费用附件与正文都可以要求另付80元，却与挂牌卡“协调包含在租金内”的说法不一致。仅读合同无法完成这项对照。',
    request: '你要求明确是否另收80元、服务范围和结算。周女士表示会重新看挂牌和附件，尚未承诺更改。',
    confirmation: '周女士同意按宣传执行：3200元月租包含报修联络协调，不另收80元服务费。协调服务不等于所有维修免费；维修责任另谈。双方把费用附件改好，待签署。',
    revision: '月租3200元已包含日常报修联络协调，无额外报修协调服务费，无中介费。维修费用仍按独立的维修责任条款确定。',
    review: '宣传、正文和附件需要交叉核对。这里的80元只有在双方确认并签署修订后才取消；取消协调费不能替代维修责任约定。',
  },
  {
    id: 'utilities', title: '计量与交接起点', docs: ['clause6','fees','handover','chat'], question: '原始账单、表号和起止读数能一起核对吗？',
    comparison: '160元来自前三月480元的历史参考；交接表数仍空白。预计用量不是包干价，也没有自动确定自己的计费起点。',
    request: '你请周女士带来本户原始账单，预约一起核对表号、读数及交接日。现在只是已索取资料和预约。',
    confirmation: '双方到现场核对：电表E402起始18326.5千瓦时，水表W402起始84.2立方米，燃气表G402起始398.0立方米；日期2027-03-01。原始账单户号对应本户，费用按实际账单及本次起止记录结算。钥匙和旧痕也在同一交接表上核对，待签字。',
    revision: '按本户原始账单、对应表号和交接日签认读数结算实际用量，物业与网络由出租方承担；160元/月仅为历史参考。2027-03-01的表数、旧损、钥匙2把与门卡1张已在双方交接清单中签认。',
    review: '预测费用、收费规则与计量起点是三件事。表数不能推断装修时间或空气安全；照片也不能自动成为双方确认的交接。',
  },
  {
    id: 'maintenance', title: '设备维护', docs: ['clause7','handover'], question: '老化、既有损坏和使用不当分别怎么处理？',
    comparison: '原文把任何故障的费用都交给租客，没区分交房前损伤、自然老化和使用不当。交接旧痕还没有签认。',
    request: '你要求按原因区分责任，列明已有状况、报修联系人及响应方式。提出要求本身不修改原条款。',
    confirmation: '周女士同意本局约定：已有损伤和正常老化由她安排处理并承担相应费用；使用不当造成的损坏先核对原因和依据，再按约协商。她在接到报修后72小时内回应安排；紧急情况另行及时处理。相关条款和旧痕附件待签字。',
    revision: '本局双方同意区分原有损伤、正常老化与使用不当，按已确认原因处理费用；房东负责既有损伤及正常老化的相应维修，并在报修后72小时内回应安排。空调外壳旧痕已共同确认；其他未知原因仍需查明。',
    review: '先区分原因、证据、联系人和处理安排，再谈费用。这里是虚构双方协商结果，不以一条文字直接宣告现实合同无效。',
  },
  {
    id: 'exit', title: '双方提前解除', docs: ['clause10'], question: '通知、双方费用与未发生租金，是否愿意调整？',
    comparison: '租客提前解除为两个月租金6400元，出租人提前收回为一个月3200元，均提前30日书面通知。数字不同值得询问，但不自动证明违法；对称也不自动公平。',
    request: '周女士看过你的修改请求后明确表示：这次不接受调整，仍提供原第十条。你可以继续咨询、暂缓、离开，或者在了解现有条件后作决定。',
    confirmation: '', revision: '', refused: true,
    review: '这次调整被明确拒绝。租客6400元、出租人3200元及通知要求没有变化；游戏不判断现实适用性。读过或提出过修改，不能被写成已经改好。',
  },
  {
    id: 'deposit', title: '退房后的结清', docs: ['clause4','chat','handover'], question: '押金按哪个期限退？扣款依据和明细能否写清？',
    comparison: '合同为结算后45日内，聊天说正常情况约3个工作日；“综合修复评估费用”的条件和依据也没有明确。',
    request: '你要求把返还时间、扣费条件、依据和争议处理写成双方一致的文字，并留下入住记录。聊天承诺暂时不改写合同。',
    confirmation: '周女士同意：完成交接并结清已确认款项后3个工作日内返还应退余额；扣款列具体项目、原因、凭证和金额，争议项另行沟通，不把单方评估直接视为双方已认可。双方检查修订文本，尚未签署。',
    revision: '交接并结清已确认款项后3个工作日内返还应退押金余额；扣款须提供具体项目、原因、凭证和金额，争议项继续沟通。并非保证任何情况下全额退还。',
    review: '返还时间、扣款条件、证据和争议事项应分别写清。共同记录提供核对依据，不保证押金自动全退，也不能将口头“三个工作日”当作已改合同。',
  },
];

const docIds = new Set(PRACTICE_DOCUMENTS.map(d => d.id));
const topicIds = new Set(PRACTICE_TOPICS.map(t => t.id));
const topicById = id => PRACTICE_TOPICS.find(t => t.id === id);
const blankIssue = () => ({ compared:false, requested:false, confirmed:false, signed:false, refused:false });
const tabs = ['documents','questions','decision','review','reset'];
const signed = (state,id) => Boolean(state.issues[id]?.signed);
export const canComparePractice = (state,id) => Boolean(topicById(id)?.docs.every(d => state.read[d]));
export const canSignPractice = state => PRACTICE_TOPICS.every(t => t.refused ? state.issues[t.id].refused : state.issues[t.id].signed);

export function createPracticeState() {
  return { schemaVersion:1, caseId:PRACTICE_ID, phase:'reading', tab:'documents', documentId:'clause1', topicId:'authority',
    read:{}, marks:{}, issues:Object.fromEntries(PRACTICE_TOPICS.map(t => [t.id,blankIssue()])), generalAsked:false,
    hintLevel:0, reviewOpen:false, decision:null, viewDay:30, lastAction:null };
}

const uiTypes = new Set(['GENERAL_ASK','HINT','REVIEW','SIGN_DIRECT','SIGN_WRITTEN','PAUSE','LEAVE','RETRY','RESET','RESET_REQUEST']);
function isKnownAction(type) {
  if(type===null || uiTypes.has(type))return true;
  if(typeof type!=='string')return false;
  const [verb,id,...extra]=type.split(':');if(extra.length)return false;
  return ['open','read','flag','unflag'].includes(verb)?docIds.has(id):['topic','compare','request','confirm','sign'].includes(verb)?topicIds.has(id):verb==='tab'?tabs.includes(id):verb==='day'?['30','365'].includes(id):false;
}

export function reducePractice(state,action) {
  const type=typeof action==='string'?action:action?.type;
  if(!state||state.caseId!==PRACTICE_ID)return createPracticeState();
  if(!isKnownAction(type)||!type)return state;
  if(type==='RESET')return createPracticeState();
  if(type==='RESET_REQUEST')return {...state,tab:'reset',lastAction:type};
  if(type==='RETRY')return {...state,phase:'reading',tab:'documents',decision:null,lastAction:type};
  if(type==='REVIEW')return {...state,reviewOpen:true,tab:'review',lastAction:type};
  if(type==='HINT')return {...state,hintLevel:Math.min(2,state.hintLevel+1),lastAction:type};
  const [verb,id]=type.split(':');
  if(verb==='tab')return {...state,tab:id,reviewOpen:state.reviewOpen||id==='review',lastAction:type};
  if(verb==='open')return {...state,documentId:id,tab:'documents',lastAction:type};
  if(verb==='topic')return {...state,topicId:id,tab:'questions',lastAction:type};
  if(verb==='day')return state.phase==='ending'&&state.decision==='sign'?{...state,viewDay:Number(id),lastAction:type}:state;
  // A signed result is immutable until the player explicitly returns to the investigation.
  if(state.phase!=='reading')return state;
  if(type==='GENERAL_ASK')return {...state,generalAsked:true,lastAction:type};
  if(verb==='read')return {...state,read:{...state.read,[id]:true},lastAction:type};
  if(verb==='flag')return {...state,marks:{...state.marks,[id]:true},lastAction:type};
  if(verb==='unflag'){const marks={...state.marks};delete marks[id];return {...state,marks,lastAction:type};}
  if(['SIGN_DIRECT','SIGN_WRITTEN','PAUSE','LEAVE'].includes(type)){
    if(type==='SIGN_WRITTEN'&&!canSignPractice(state))return state;
    return {...state,phase:'ending',tab:'decision',decision:type.startsWith('SIGN')?'sign':type==='PAUSE'?'pause':'leave',viewDay:30,lastAction:type};
  }
  if(['compare','request','confirm','sign'].includes(verb)){
    const topic=topicById(id),issue=state.issues[id],next={...issue};
    if(verb==='compare'){if(!canComparePractice(state,id))return state;next.compared=true;}
    if(verb==='request'){if(!issue.compared)return state;next.requested=true;next.refused=Boolean(topic.refused);}
    if(verb==='confirm'){if(!issue.requested||topic.refused)return state;next.confirmed=true;}
    if(verb==='sign'){if(!issue.confirmed||topic.refused)return state;next.signed=true;}
    return {...state,topicId:id,tab:'questions',issues:{...state.issues,[id]:next},lastAction:type};
  }
  return state;
}

export function restorePracticeState(input) {
  const fresh=createPracticeState();
  if(!input||input.schemaVersion!==1||input.caseId!==PRACTICE_ID||!['reading','ending'].includes(input.phase)||!tabs.includes(input.tab)||!docIds.has(input.documentId)||!topicIds.has(input.topicId))return fresh;
  if(!input.read||!input.marks||typeof input.read!=='object'||typeof input.marks!=='object'||Array.isArray(input.read)||Array.isArray(input.marks))return fresh;
  if([input.read,input.marks].some(map=>Object.entries(map).some(([key,value])=>!docIds.has(key)||value!==true)))return fresh;
  if(!input.issues||Object.keys(input.issues).length!==PRACTICE_TOPICS.length)return fresh;
  const issues={};
  for(const topic of PRACTICE_TOPICS){
    const issue=input.issues[topic.id];
    if(!issue||Object.keys(issue).length!==5||Object.keys(blankIssue()).some(k=>typeof issue[k]!=='boolean'))return fresh;
    if((issue.compared&&!topic.docs.every(d=>input.read[d]))||(issue.requested&&!issue.compared)||(issue.confirmed&&!issue.requested)||(issue.signed&&!issue.confirmed)||issue.refused!==(Boolean(topic.refused)&&issue.requested)||(topic.refused&&(issue.confirmed||issue.signed)))return fresh;
    issues[topic.id]={...issue};
  }
  if(typeof input.generalAsked!=='boolean'||typeof input.reviewOpen!=='boolean'||![0,1,2].includes(input.hintLevel)||![30,365].includes(input.viewDay)||!isKnownAction(input.lastAction))return fresh;
  if((input.phase==='reading'&&input.decision!==null)||(input.phase==='ending'&&!['sign','pause','leave'].includes(input.decision)))return fresh;
  if(input.tab==='review'&&!input.reviewOpen)return fresh;
  const restored={...fresh,phase:input.phase,tab:input.tab,documentId:input.documentId,topicId:input.topicId,read:{...input.read},marks:{...input.marks},issues,
    generalAsked:input.generalAsked,hintLevel:input.hintLevel,reviewOpen:input.reviewOpen,decision:input.decision,viewDay:input.viewDay,lastAction:input.lastAction};
  const [verb,id]=(input.lastAction||'').split(':');
  if((verb==='read'&&!restored.read[id])||(verb==='flag'&&!restored.marks[id])||(verb==='unflag'&&restored.marks[id]))return fresh;
  const issueFlag={compare:'compared',request:'requested',confirm:'confirmed',sign:'signed'}[verb];
  if(issueFlag&&!restored.issues[id][issueFlag])return fresh;
  if((input.lastAction?.startsWith('SIGN_')&&(input.phase!=='ending'||input.decision!=='sign'))||
    (input.lastAction==='PAUSE'&&(input.phase!=='ending'||input.decision!=='pause'))||
    (input.lastAction==='LEAVE'&&(input.phase!=='ending'||input.decision!=='leave'))||
    (input.lastAction==='GENERAL_ASK'&&!input.generalAsked)||(input.lastAction==='HINT'&&input.hintLevel===0))return fresh;
  if(input.lastAction==='SIGN_WRITTEN'&&!canSignPractice(restored))return fresh;
  return restored;
}

export function getPracticeBudget(state) {
  const rent=3200,deposit=3200,serviceFee=signed(state,'service')?0:80;
  const firstRent=signed(state,'free')?Math.round(320000*24/31)/100:rent;
  const initialCash=Math.round((firstRent+deposit+serviceFee)*100)/100;
  return {rent,deposit,serviceFee,firstRent,initialCash,utilitiesEstimate:160,transport:176,
    monthlyEstimate:rent+serviceFee+160+176,firstMonthEstimate:Math.round((firstRent+serviceFee+160+176)*100)/100,
    reserveCash:Math.round((initialCash+160+176)*100)/100,freeDays:signed(state,'free')?7:0};
}

export function getPracticeStatus(state,id) {
  const issue=state.issues[id];
  return issue.signed?'书面落实':issue.refused?'修改未获同意':issue.confirmed?'已确认修订 · 待双方签署':issue.requested?'已请求 · 待对方确认':issue.compared?'已对照 · 待追问':'尚未对照';
}

export function getPracticeFeedback(state) {
  const [verb,id]=(state.lastAction||'').split(':'),topic=topicById(id);
  if(topic&&['compare','request','confirm','sign'].includes(verb))return { speaker:verb==='compare'?'self':verb==='request'&&!topic.refused?'agent':'owner',
    body:verb==='compare'?topic.comparison:verb==='request'?topic.request:verb==='confirm'?topic.confirmation:`双方核对、签署并各自保留修订页与对应附件。${topic.revision}` };
  if(state.lastAction==='GENERAL_ASK')return {speaker:'agent',body:'小陈：可以，我先把现有材料给你。谁签、谁收，以及有没有对应授权，还需要把文件和周女士的答复对起来。'};
  if(state.lastAction?.startsWith('read:'))return {speaker:'self',body:'记下已读。是否一致、是否需要追问，由你结合其他材料判断。'};
  if(state.lastAction?.startsWith('flag:'))return {speaker:'self',body:'你给这页贴了“待核对”标签。标签不是已证实的结论，也不会替对方修改条款。'};
  if(state.lastAction?.startsWith('unflag:'))return {speaker:'self',body:'你取下了这页的标签。已经看过的内容仍留在手记里。'};
  return {speaker:'agent',body:'小陈：不用着急，合同和附件都可以看。房子你也可以再走一圈。'};
}

export function getPracticeTimeline(state) {
  if(state.decision!=='sign')return [];
  const b=getPracticeBudget(state);
  return [
    {day:30,title:'第30天 · 第一张账单',body:'把现在收到的账目，和签约时真正留下的版本对一对。',items:[
      {title:'首月租金与服务',body:`本局首期约定为${b.initialCash.toFixed(2)}元，含押金3200元。${signed(state,'free')?'七天免租已写明起止，首月租金2477.42元。':'七天免租尚未形成双方签署的修订，原草稿仍列首月3200元，需要继续沟通。'}${signed(state,'service')?'报修协调已包含在月租内，没有另收80元。':'费用附件仍列每月80元协调费；宣传与附件的差异尚未书面解决。'}`},
      {title:'用量从哪里开始',body:signed(state,'utilities')?'原始账单、交接表号与起始数都能对照。160元仅是历史估算，结算要看实际用量。':'缺少共同签认的计量与交接起点。先补齐表号、日期、原始账单，再讨论应付部分；历史160元不能当作上限。'},
      {title:'由谁签、付给谁',body:signed(state,'authority')&&signed(state,'payment')?'周女士本人签署，收款与收据安排留在双方版本中。':'签署或收款关系仍有材料未落实，需要联系权利人继续核实；游戏不把资料缺失直接判成诈骗。'},
    ]},
    {day:365,title:'2028-02-29 · 到期交接后',body:'住满这段租期。交还钥匙之后，押金和设备记录还有最后一次核对。',items:[
      {title:'押金沟通',body:signed(state,'deposit')?'双方版本写明交接并结清后3个工作日内返还应退余额，扣款须逐项提供原因和凭证。争议项继续沟通，不代表押金必定全退。':'聊天提过3个工作日，合同却仍为结算后45日及“综合修复评估费用”。没有双方签署的一致修改，先要求项目、依据和沟通记录。'},
      {title:'设备与旧损',body:signed(state,'maintenance')?'空调外壳旧痕与分类维修责任已共同记录，可据此逐项核对；新增损坏仍须查清原因。':'原有痕迹和故障责任没有完整书面落实。准备照片、交接清单与报修记录，再逐项沟通费用归属。'},
      {title:'如果当时提前离开',body:'第十条没有被修改：示例中租客提前解除为6400元、出租人提前收回为3200元，均须按原条款通知。本局按到期交接展示，不会在到期时自动收这笔提前解除费用。'},
    ]},
  ];
}
