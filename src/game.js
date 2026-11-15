/** A fictional, fixed-choice whole-home viewing. No score or player analytics. */
export const MOVABLE_FURNITURE_IDS = Object.freeze(['chair', 'plant', 'coffee']);
const FACT_KEYS = ['room', 'authority', 'fees', 'leakObserved', 'repairRequested', 'repairVerified',
  'cabinetOpened', 'dampObserved', 'dampRequested', 'dampVerified', 'billFound', 'feesWritten',
  'sofaInspected', 'scratchFound', 'inventorySaved', 'light', 'noise', 'term', 'bathroom'];
const FACT_ACTIONS = {
  ASK_ROOM: 'room', ASK_AUTHORITY: 'authority', ASK_FEES: 'fees', OBSERVE_LEAK: 'leakObserved',
  REQUEST_REPAIR: 'repairRequested', VERIFY_REPAIR: 'repairVerified', OPEN_CABINET: 'cabinetOpened',
  INSPECT_DAMP: 'dampObserved', REQUEST_DAMP_REPAIR: 'dampRequested', VERIFY_DAMP_REPAIR: 'dampVerified',
  READ_BILL: 'billFound', WRITE_FEES: 'feesWritten', CHECK_SOFA_EDGE: 'sofaInspected',
  INSPECT_SCRATCH: 'scratchFound', SAVE_INVENTORY: 'inventorySaved', CHECK_LIGHT: 'light',
  CHECK_NOISE: 'noise', ASK_TERM: 'term', CHECK_BATHROOM: 'bathroom',
};
const ACTIONS = [...Object.keys(FACT_ACTIONS), 'MOVE_FURNITURE', 'RESIST_PRESSURE', 'SIGN', 'PAUSE', 'LEAVE', 'RETRY', 'RESET'];
const handled = f => f.repairVerified && f.dampVerified && f.feesWritten && f.inventorySaved;

export function createState() {
  return { schemaVersion: 3, phase: 'viewing', facts: Object.fromEntries(FACT_KEYS.map(key => [key, false])),
    furniture: {}, pressure: 0, lastAction: null, decision: null, outcome: null };
}
function validPosition(p) {
  return p && typeof p === 'object' && ['x', 'z', 'rotation'].every(k => typeof p[k] === 'number' && Number.isFinite(p[k])) &&
    Math.abs(p.x) <= 8 && Math.abs(p.z) <= 8 && Math.abs(p.rotation) <= Math.PI * 2;
}
function expectedOutcome(decision, facts) {
  return decision === 'sign' ? (handled(facts) ? 'settled' : 'unresolved')
    : decision === 'pause' ? 'pending' : decision === 'leave' ? 'left' : null;
}
/** Incompatible cases restart; they must not grant evidence in the new home. */
export function restoreState(input) {
  const fresh = createState();
  if (!input || typeof input !== 'object' || input.schemaVersion !== 3) return fresh;
  if (!['viewing', 'ending'].includes(input.phase) || !input.facts || typeof input.facts !== 'object') return fresh;
  const facts = {};
  for (const key of FACT_KEYS) {
    if (typeof input.facts[key] !== 'boolean') return fresh;
    facts[key] = input.facts[key];
  }
  if ((facts.repairRequested && !facts.leakObserved) || (facts.repairVerified && !facts.repairRequested) ||
    (facts.dampObserved && !facts.cabinetOpened) || (facts.dampRequested && !facts.dampObserved) ||
    (facts.dampVerified && !facts.dampRequested) || (facts.feesWritten && (!facts.fees || !facts.billFound)) ||
    (facts.scratchFound && !facts.sofaInspected) || (facts.inventorySaved && !facts.scratchFound)) return fresh;
  if (!input.furniture || typeof input.furniture !== 'object' || Array.isArray(input.furniture)) return fresh;
  const furniture = {};
  for (const [id, position] of Object.entries(input.furniture)) {
    if (!MOVABLE_FURNITURE_IDS.includes(id) || !validPosition(position)) return fresh;
    furniture[id] = { x: position.x, z: position.z, rotation: position.rotation };
  }
  if (!Number.isInteger(input.pressure) || input.pressure < 0 || input.pressure > 3) return fresh;
  if (input.lastAction !== null && !ACTIONS.includes(input.lastAction)) return fresh;
  if (FACT_ACTIONS[input.lastAction] && !facts[FACT_ACTIONS[input.lastAction]]) return fresh;
  const { phase, decision, outcome } = input;
  if (phase === 'viewing' && (decision !== null || outcome !== null)) return fresh;
  if (phase === 'ending' && (!['sign', 'pause', 'leave'].includes(decision) || outcome !== expectedOutcome(decision, facts))) return fresh;
  return { schemaVersion: 3, phase, facts, furniture, pressure: input.pressure, lastAction: input.lastAction, decision, outcome };
}
export function reduce(state, action) {
  const type = typeof action === 'string' ? action : action?.type;
  if (type === 'RESET') return createState();
  if (type === 'RETRY') return { ...state, phase: 'viewing', decision: null, outcome: null, lastAction: 'RETRY' };
  if (state.phase !== 'viewing') return state;
  if (['SIGN', 'PAUSE', 'LEAVE'].includes(type)) {
    const decision = { SIGN: 'sign', PAUSE: 'pause', LEAVE: 'leave' }[type];
    return { ...state, phase: 'ending', decision, outcome: expectedOutcome(decision, state.facts), lastAction: type };
  }
  if (type === 'MOVE_FURNITURE') {
    if (!MOVABLE_FURNITURE_IDS.includes(action.id) || !validPosition(action.position)) return state;
    const { x, z, rotation } = action.position;
    return { ...state, furniture: { ...state.furniture, [action.id]: { x, z, rotation } }, lastAction: type };
  }
  if (type === 'RESIST_PRESSURE') return { ...state, pressure: 0, lastAction: type };
  const fact = FACT_ACTIONS[type], f = state.facts;
  if (!fact) return state;
  if ((type === 'REQUEST_REPAIR' && !f.leakObserved) || (type === 'VERIFY_REPAIR' && !f.repairRequested) ||
    (type === 'INSPECT_DAMP' && !f.cabinetOpened) || (type === 'REQUEST_DAMP_REPAIR' && !f.dampObserved) ||
    (type === 'VERIFY_DAMP_REPAIR' && !f.dampRequested) || (type === 'WRITE_FEES' && (!f.billFound || !f.fees)) ||
    (type === 'INSPECT_SCRATCH' && !f.sofaInspected) || (type === 'SAVE_INVENTORY' && !f.scratchFound)) return state;
  if (f[fact]) return state.lastAction === type ? state : { ...state, lastAction: type };
  const preparation = ['OPEN_CABINET', 'CHECK_SOFA_EDGE'].includes(type);
  return { ...state, facts: { ...f, [fact]: true }, pressure: preparation ? state.pressure : Math.min(3, state.pressure + 1), lastAction: type };
}

const option = (label, action, detail = '', primary = false, disabled = false) => ({ label, action, detail, primary, disabled });
const base = (title, body, options = [], extras = {}) => ({
  eyebrow: '看房手记 · 借来的晴天', title, body, options, speaker: 'self', expression: 'neutral',
  footer: '慢慢看。想问清楚的事，值得多留一会儿。', ...extras,
});
const responses = {
  ASK_ROOM: ['你：这笔租金，是我一个人租下整套吗？', '小陈：对，一室一厅一卫。卧室、客厅、厨房和卫生间都由你独用。', '户型和合同范围对得上。交房时，周女士会与你清点整套房的钥匙和门卡。'],
  ASK_AUTHORITY: ['你：谁和我签约？租金交给谁？', '小陈把资料摊开：我是带看中介。房子是周女士的，这是她的委托。', '你对照了身份、产权与委托资料，地址一致。周女士也确认：由她签约，款项付到合同所列的她本人账户。'],
  ASK_FEES: ['你：每月 4200 元，还有别的钱吗？', '小陈笑着说：差不多全包了，住进来不用操太多心。押一付一，押金也是 4200。', '“差不多”让你停了一下。桌上的费用单，还没看过。'],
  ASK_TERM: ['你：按月付钱，能住一个月就退吗？', '周女士：付款是按月，草稿租期可是一年。提前搬走的安排，我们还没谈。', '你把这页折了个角：起止日期、提前通知和退出费用，都得先写清。'],
  RESIST_PRESSURE: ['你：房子我挺喜欢，但这些事问清楚了，我才住得安心。今天先不付留房款。', '电话那头静了一会儿。周女士：好，你继续看吧。', '你把手机放回口袋。先按自己的节奏来。'],
  OBSERVE_LEAK: ['你打开水槽下方的小柜门，放了一会儿水。接头又挂出一颗水珠。', '小陈：刚打扫过，留点水正常。', '你擦干后再放水。水珠重新出现，柜底那圈旧水印也还在。'],
  REQUEST_REPAIR: ['你：这里一直在滴。请先查清漏点，修好后我想再试一次。', '小陈联系师傅。不久，发来一张“接头已紧固”的照片。', '接头紧过了，老化的密封圈是否处理，照片看不出来。你约好交房前再来。'],
  VERIFY_REPAIR: ['交房前，你再次放水，接头仍有一点渗漏。师傅继续排查，更换了老化密封圈。', '这次连续放水、排空，再擦干观察，接头没有新的水珠。', '你收好维修记录，也记下了日后的报修联系人。'],
  OPEN_CABINET: ['衣柜有防倾倒固定件，搬动它得请人处理。你先征得同意，轻轻打开柜门。', '下层背板有些起翘，靠墙侧缝的颜色也比别处深。这里值得细看。'],
  INSPECT_DAMP: ['你蹲下照了照下层背板，板边有潮痕，侧缝里能看见墙脚发暗。', '小陈：上次刷过了，应该就是旧印子。', '你请周女士找来旧报修记录。上面写着“先补漆，渗水来源待查”，时间就在前不久。'],
  REQUEST_DAMP_REPAIR: ['你：记录里写着漏源待查，背板现在又潮了。只刷漆，怕是不够。', '周女士：我先让人把表面收拾一下，别影响你搬家。', '你请她先查漏源，并约好维修、干燥和复查的时间。此刻，问题还没处理完。'],
  VERIFY_DAMP_REPAIR: ['维修师傅在房东同意后拆下固定件，安全移开衣柜，找到了墙内渗漏的接头。', '漏源修复后，墙面充分干燥，受潮背板更换，衣柜重新固定。你收到过程照片和记录。', '再来时，你打开柜门检查原位置。背板干燥，侧缝没有新的潮痕。'],
  READ_BILL: ['费用单写着：整套租金 4200 元/月，押金 4200 元；另有设备报修协调服务费 80 元/月。', '本户水、电、燃气有独立表，按本户原始账单和实际用量结算；网费、供暖由出租人承担。', '这张单子还没有双方签字。“全包”的说法，似乎漏掉了几行。'],
  WRITE_FEES: ['你把费用单递给小陈：这 80 元，还有水电燃气，不在“全包”里吧？', '小陈笑得有点勉强：是我刚才没说清。咱们一项项写明白。', '周女士与你确认并签署附件：租金 4200，设备报修协调服务费 80；本户独立表按实际账单结算水电燃气，网费与供暖由她承担。押一付一、押金 4200，无其他必付中介费或服务费。双方各留一份。'],
  CHECK_SOFA_EDGE: ['沙发很沉。你没有推它，而是蹲下来，用手机灯照向前脚和边沿。', '光线扫过地板，前脚旁有几道细长的痕迹。再靠近一点，能看得更清楚。'],
  INSPECT_SCRATCH: ['几道划痕从沙发前脚旁延伸出来，边缘已经积灰，脚垫也有磨损。', '小陈：平常也看不见，这点小事，退房时再说。', '可这是你搬进来之前就有的痕迹。你想趁现在把它记下来。'],
  SAVE_INVENTORY: ['你拍下沙发、前脚和划痕的近照，带上拍摄日期，在交接清单标出位置。', '周女士核对后确认：“沙发前脚旁几道旧划痕，交房前已有。”', '双方收好同一份照片和清单。还有电表读数、钥匙数量，也要逐项核对。'],
  CHECK_LIGHT: ['你关掉灯，在窗边站了一会儿。阳光照进客厅，房间深处稍暗些。', '今天这一刻的光线，你已经亲眼看见。其他时段的样子，还可以再来看看。'],
  CHECK_NOISE: ['你关窗听了一会儿。窗外安静了些，走廊偶尔传来关门声。', '你在手记上留了一行：下次晚上再来，听听邻户和楼道的声音。'],
  CHECK_BATHROOM: ['这是整套房里由你独用的卫生间。你征得同意，试了冲水、洗手盆排水和排风。', '这次短暂试用，排水顺畅，排风有回应。热水的持续供应和其他时段，还要继续确认。'],
};

export function getDialog(id, state) {
  const f = state.facts, last = state.lastAction;
  const response = (types, fallback) => [...(types.includes(last) ? responses[last] : fallback)];
  if (id === 'landlord') {
    const body = last === 'ASK_FEES' && f.feesWritten
      ? ['小陈：刚才说的费用，都按附件来。4200 元租金，加 80 元服务费；水电燃气看你这一户的实际账单。', '你摸了摸文件袋，双方签过的那一份已经收好了。']
      : response(['ASK_ROOM', 'ASK_FEES', 'ASK_AUTHORITY', 'RESIST_PRESSURE'], [
        '小陈把窗帘拉开：你看，阳光正好。一个人住，有客厅也有厨房，日子能慢慢安顿下来。',
        f.billFound ? '他瞥了一眼你手里的费用单：细节嘛，咱们坐下聊。' : '他又指向桌边：喜欢的话，今天就能定。',
      ]);
    return base('和小陈聊聊', body, [
      option('确认整套房的使用范围', 'ASK_ROOM'), option('问清 4200 元之外的费用', 'ASK_FEES'),
      option('核对房东、授权和收款人', 'ASK_AUTHORITY'), option('我想再仔细看看', 'RESIST_PRESSURE'),
    ], { speaker: 'agent', expression: last === 'ASK_AUTHORITY' ? 'tense' : f.feesWritten ? 'relieved' : f.billFound ? 'avoid' : last === 'RESIST_PRESSURE' ? 'neutral' : 'smile',
      footer: '把说法和现场对照，再作决定。' });
  }
  if (id === 'owner') return base('周女士的电话', response(['ASK_TERM', 'RESIST_PRESSURE'], [
    ['周女士：小陈说你到了。慢慢看，合适了跟我说。', '周女士：后面还有人问呢，你今天能给个准话吗？',
      '周女士：小问题住进去再修也行，先把合同定下来？', '周女士：房子不能一直留着，你再考虑一下吧。'][state.pressure],
    '你还握着笔。想先把空着的几项问明白。',
  ]), [option('按月付，能随时退吗？', 'ASK_TERM'), option('问清楚后，我再决定', 'RESIST_PRESSURE', '', true), option('今天先不签', 'PAUSE')],
  { speaker: 'owner', expression: state.pressure > 1 ? 'tense' : 'neutral', footer: '喜欢一套房，也可以留一点考虑的时间。' });
  if (id === 'sink') return base('水槽下的水印', f.repairVerified ? [...responses.VERIFY_REPAIR] :
    response(['OBSERVE_LEAK', 'REQUEST_REPAIR'], ['厨房台面擦得很亮，水槽下却有一圈旧水印。', '小陈：打扫时沾的水，没什么。']), [
      option('打开小柜门，放水看看', 'OBSERVE_LEAK'), option('请先查漏点，再安排维修', 'REQUEST_REPAIR', '', false, !f.leakObserved),
      option('维修后，再来放水复查', 'VERIFY_REPAIR', '', true, !f.repairRequested),
    ]);
  if (id === 'cabinet') return base('衣柜里的潮痕', f.dampVerified ? [...responses.VERIFY_DAMP_REPAIR] :
    response(['OPEN_CABINET', 'INSPECT_DAMP', 'REQUEST_DAMP_REPAIR'], f.cabinetOpened
      ? ['柜门开着，下层背板和靠墙侧缝已经能看见。灯光照过去，颜色有一点不一样。']
      : ['衣柜靠墙固定着，不能随手搬动。柜门倒是可以正常打开。', '先看看里面，再决定要问些什么。']), [
      option(f.cabinetOpened ? '再看看打开的柜门' : '征得同意，打开柜门', 'OPEN_CABINET'),
      option('检查背板，询问旧报修记录', 'INSPECT_DAMP', f.cabinetOpened ? '' : '先打开柜门', false, !f.cabinetOpened),
      option('对照潮痕和记录，要求查漏源', 'REQUEST_DAMP_REPAIR', '', false, !f.dampObserved),
      option('等师傅处理好，再来复查', 'VERIFY_DAMP_REPAIR', '', true, !f.dampRequested),
    ], { footer: '衣柜固定件由维修人员处理。看房时，先观察能正常打开和看见的部位。' });
  if (id === 'sofa') return base('沙发脚旁的小痕迹', f.inventorySaved ? [...responses.SAVE_INVENTORY] :
    response(['CHECK_SOFA_EDGE', 'INSPECT_SCRATCH'], f.sofaInspected
      ? ['手机灯照着沙发前脚，地板纹理间有几道不一样的线。']
      : ['这张沙发很沉。你绕到侧面，发现前脚附近有一点灰。', '不用搬它，蹲下来照一照，也能看看边沿的地板。']), [
      option('蹲下，用手机灯照向边沿', 'CHECK_SOFA_EDGE'),
      option('仔细查看前脚旁的划痕', 'INSPECT_SCRATCH', f.sofaInspected ? '' : '先照亮边沿', false, !f.sofaInspected),
      option('拍照标注，请房东确认', 'SAVE_INVENTORY', '', true, !f.scratchFound),
    ], { footer: '看清楚，再留下双方能对照的交接记录。' });
  if (id === 'bill') return base('“全包”的小字', f.feesWritten ? [...responses.WRITE_FEES] :
    response(['READ_BILL'], ['桌上的费用单压着一个小杯垫。租金下面，还有几行字。', f.fees ? '刚才那句“差不多全包”，现在可以对照着看看了。' : '先看看纸上怎么写，再问问小陈。']), [
      option('读一读费用单', 'READ_BILL'), option('把各项费用写进附件', 'WRITE_FEES', f.billFound && f.fees ? '' : '先读费用单，也听听小陈的报价', true, !f.billFound || !f.fees),
    ]);
  if (id === 'window') return base('窗边的下午', response(['CHECK_LIGHT', 'CHECK_NOISE'], ['风拂过窗边，阳光落在地板上。', '这里会不会成为你下班后喜欢坐一会儿的地方？']), [
    option('关灯看看自然光', 'CHECK_LIGHT'), option('关窗，安静听一会儿', 'CHECK_NOISE'),
  ]);
  if (id === 'bathroom') return base('卫生间里转一圈', response(['CHECK_BATHROOM'], ['洗手盆、马桶和排风都在这里，整间卫生间由你独用。', '东西看着整齐，也可以试试是否好用。']), [
    option('试试排水、冲水和排风', 'CHECK_BATHROOM', '', true),
  ]);
  if (id === 'desk' || id === 'door') return base(id === 'desk' ? '坐下来，作个决定' : '门口，再想一想',
    response(['ASK_TERM', 'READ_BILL', 'WRITE_FEES', 'RESIST_PRESSURE'], [
      '草稿写着：一人整租，一室一厅一卫；厨房、卫浴均独用。月租 4200 元，押金 4200 元，押一付一，租期十二个月。',
      handled(f) ? '几处疑点都已有记录。手记里还留着租期、退出安排等待办。' : '有些问题已经问过，有些还等着处理。你翻了翻手记。',
      '签下这份剧情合同后，日子就会向前走。你也可以再看一会儿。',
    ]), [
      option('看看费用单', 'READ_BILL'), option('把费用写清楚，双方留一份', 'WRITE_FEES', '', false, !f.billFound || !f.fees),
      option('再问问租期和提前搬走的安排', 'ASK_TERM'), option('按现在的信息，签约入住', 'SIGN', '看看一周、一个月和一年后的生活', true),
      option('先等材料和维修结果', 'PAUSE'), option('这套先不选，继续找找', 'LEAVE'),
    ]);
  const small = { chair: '一把轻便的椅子', plant: '窗边的小盆栽', coffee: '沙发旁的小边几' };
  if (small[id]) return base(small[id], ['这件物品比较轻。征得同意后，可以稍挪一下，看看周围的空间。', '看完记得放回原位。']);
  if (id === 'bed') return base('卧室里的床', ['床架又大又重，你没有推它。', '可以绕着床检查可见的床脚、床沿和过道。需要搬动时，先和房东约好人员与保护措施。']);
  return base('再看看这套小屋', ['客厅、卧室、厨房和卫生间，都值得慢慢走一遍。']);
}

export function getCaseProgress(state) {
  const f = state.facts;
  const chains = [
    { id: 'leak', title: '水槽的旧水印', status: f.repairVerified ? 'resolved' : f.repairRequested ? 'pending' : f.leakObserved ? 'found' : 'unknown',
      detail: f.repairVerified ? '漏点修好了，放水复查也通过了。' : f.repairRequested ? '收到紧固接头的照片，还要再试一次。' : f.leakObserved ? '擦干后又有新水珠，值得追问。' : '水槽下面，似乎有一圈旧水印。' },
    { id: 'damp', title: '衣柜里的潮痕', status: f.dampVerified ? 'resolved' : f.dampRequested ? 'pending' : f.dampObserved ? 'found' : 'unknown',
      detail: f.dampVerified ? '师傅处理了漏源，背板和侧缝也已复查。' : f.dampRequested ? '补漆还不够，等漏源处理后再来看看。' : f.dampObserved ? '潮痕和旧报修记录，对上了一件事。' : f.cabinetOpened ? '柜门开了，可以照照下层背板。' : '衣柜不能随手挪，先打开门看看。' },
    { id: 'fees', title: '“全包”的范围', status: f.feesWritten ? 'resolved' : f.billFound && f.fees ? 'pending' : f.billFound || f.fees ? 'found' : 'unknown',
      detail: f.feesWritten ? '费用逐项写清，双方各留了一份。' : f.billFound && f.fees ? '纸上和口头的说法不同，再问具体些。' : f.billFound ? '费用单读过了，还要听听小陈怎么说。' : f.fees ? '他说差不多全包，桌上还有一张单子。' : '每月要花多少，最好一项项算。' },
    { id: 'scratch', title: '沙发脚旁的旧划痕', status: f.inventorySaved ? 'resolved' : f.scratchFound ? 'found' : 'unknown',
      detail: f.inventorySaved ? '照片与交接清单，双方都收好了。' : f.scratchFound ? '这是搬进来前的痕迹，还需一起留档。' : f.sofaInspected ? '手机灯照到了边沿，再仔细看看。' : '沙发很沉，先蹲下照照前脚和边沿。' },
  ];
  const next = chains.find(chain => chain.status !== 'resolved');
  return { chapter: '第一章', title: '借来的晴天', stage: state.phase === 'viewing' ? '看房的下午' : '后来的小日子',
    pressure: state.pressure, pressureLabel: ['慢慢看，不着急', '房东在等你回复', '手机又亮了一下', '先问清楚，再作决定'][state.pressure],
    nextHint: next ? next.detail : '手记收好了。还有租期和退出安排，再确认一下。', chains };
}
export function getNotebook(state) {
  const f = state.facts;
  return [
    { title: '这一套，都由谁使用', status: f.room ? '已确认范围' : '还想问问', detail: f.room ? '一人整租一室一厅一卫，卧室、客厅、厨房和卫生间均独用。交房时一起清点钥匙与门卡。' : '确认整套房都在租赁范围内，把地址、空间和交付项目写清。' },
    { title: '与谁签约、向谁付款', status: f.authority ? '资料已对照' : '待看资料', detail: f.authority ? '周女士是出租人，小陈负责带看；身份、产权、授权、签约和收款信息已对照。' : '先看对应的资料，再确认签约人和收款账户。' },
    ...getCaseProgress(state).chains.map(c => ({ title: c.title, status: { unknown: '还没看完', found: '发现线索', pending: '等着落实', resolved: '本项已记录' }[c.status], detail: c.detail })),
    { title: '什么时候住，何时能搬走', status: f.term ? '问过，待写清' : '还想问问', detail: f.term ? '草稿租期十二个月。按月付款不等于随时退租，提前退出条款还需要谈妥。' : '先对照自己的计划，再看起止日期和提前退出安排。' },
    { title: '光线与声音', status: f.light || f.noise ? '看过一部分' : '找个时段看看', detail: [f.light ? '已经看过今天下午的自然光。' : '还没关灯看看自然光。', f.noise ? '白天试听过了，晚间邻户和楼道声音待确认。' : '还可以关窗听一会儿，再约晚间复看。'].join('') },
    { title: '独用卫生间', status: f.bathroom ? '短暂试用过' : '还没试用', detail: f.bathroom ? '排水、冲水和排风这次有正常回应。热水持续供应和其他设施仍要继续检查。' : '征得同意后，试试正常使用时的排水、冲水和排风。' },
  ];
}
export function getTimeline(state) {
  if (state.decision !== 'sign') return [];
  const f = state.facts;
  return [
    { day: 7, label: '住进来一周了', title: f.repairVerified ? '洗完碗，安心关灯' : '第一只接水盆', tone: f.repairVerified ? 'success' : 'warning',
      body: f.repairVerified ? '晚饭后，你把最后一个碗收好。水槽下面干干的。交房前换掉的密封圈，解决了那个漏点。' :
        f.repairRequested ? '接头紧过，水却又滴起来。老化密封圈没有换，你只好先拿来一只盆。' : '晚饭后，柜底积起一摊水。看房时那圈旧水印，原来还没有成为过去。',
      items: [{ title: '那天下午的线索', body: f.repairVerified ? '你没有止步于维修照片，而是再次放水，直到漏点真正处理完。' : '擦干后重新出现的水珠，已经提示接头在漏水。口头保证和部分维修，都没有解决漏源。' },
      { title: '下次带走的小习惯', body: '亲自试用，记下位置；修完再试，也收好维修和报修记录。' }] },
    { day: 30, label: '第一个月的账单', title: f.dampVerified && f.feesWritten ? '墙面和账单，都对得上' : '晴天之后，还有两件事',
      tone: f.dampVerified && f.feesWritten ? 'success' : 'warning', body: '月末，你打开账单，也再次打开卧室里的衣柜。',
      items: [{ title: f.dampVerified ? '衣柜 · 没有新的潮痕' : '衣柜 · 潮痕又扩大了',
        body: f.dampVerified ? '下层背板保持干燥。漏源维修、背板更换和固定件复装都有记录，原位置也已经复查。' :
          f.dampRequested ? '表面补过漆，背板边缘还是重新发潮。你问过这件事，但根源维修尚未完成。' : '背板的潮痕更深了。打开柜门本能看见早期痕迹，房东的旧报修记录也写着漏源待查。' },
      { title: f.feesWritten ? '账单 · 按留下的附件核对' : '账单 · “全包”没那么全',
        body: f.feesWritten ? '4200 元租金、80 元设备报修协调服务费，再加本户独立表的水电燃气实际账单。每项与你留存的附件相符。' :
          '4200 元之外，还有 80 元服务费和本户水电燃气费用。你原先按“全包”做的预算不够，收费说法也没有落实为双方确认的附件，仍需核对协商。' }] },
    { day: 365, label: '一年后，交还钥匙', title: f.inventorySaved ? '旧划痕，也有旧照片' : '“这几道划痕呢？”',
      tone: f.inventorySaved ? 'success' : 'warning', body: f.inventorySaved ? '周女士俯身看到沙发脚旁的划痕。你拿出交接照片，她对照后点点头：这几道，确实是之前的。她撤回了这一项维修扣款要求。' :
        '交接时，周女士对沙发脚旁的旧划痕提出维修扣款要求。没有双方确认的入住记录可以直接对照，这项争议还没有解决。',
      items: [{ title: '那天下午的记录', body: f.inventorySaved ? '照片有时间、位置，清单有双方确认。你没搬动沉重的沙发，也把能看见的旧损伤留下了证据。' :
        f.scratchFound ? '你看见过旧划痕，但没有留下双方确认的记录。一年后，仅靠回忆很难直接对照。' : '划痕一直就在沙发前脚旁。蹲下照一照，签约前就能看见。' },
      { title: '交还钥匙时', body: '逐项对照入住记录，核清费用和钥匙。有争议就请对方列明项目与依据，再整理资料继续沟通。没有记录，不代表全部押金就能被扣掉。' }] },
  ];
}
export function getEnding(state) {
  if (state.decision === 'pause') return { eyebrow: '今天先到这里', title: '等答案齐一些，再决定', tone: 'neutral',
    body: '你还没有签约或付款。手记收进包里，等材料和维修安排到齐，可以再来看一次。',
    items: [{ title: '下次来之前', body: '请对方补齐资料、维修和复查安排，也把费用、租期与退出条件写明白。' }, { title: '手记留着', body: '返回看房会保留线索与轻便物品的位置。重新开始，则从第一次进门开始。' }] };
  if (state.decision === 'leave') return { eyebrow: '离开这间小屋', title: '下一扇门，也许更合适', tone: 'neutral',
    body: '你决定继续找找，没有签约或付款。今天问清楚的那些事，会陪你去下一次看房。',
    items: [{ title: '带走的小清单', body: '使用范围、全部费用、出租权限、设施维修、交接留证，以及适合自己的租期。' }] };
  if (state.decision !== 'sign') return { eyebrow: '看房的下午', title: '再看看，再聊聊', body: '把看见的和听到的放在一起，决定会更清楚。', items: [], tone: 'neutral' };
  const all = handled(state.facts), items = getCaseProgress(state).chains.map(c => ({ title: c.title, body: c.detail }));
  items.push({ title: '这份手记没有包办的事', body: [!state.facts.room ? '整套使用范围还没确认。' : '', !state.facts.authority ? '出租和收款资料还没核对。' : '',
    '提前退出条款仍需谈妥；夜间声音、通勤、其他设施和空气状况没有在这次故事里全面验证。房源、金额和材料均为虚构，人物表情不是真假判断依据。费用与押金剧情也不代表真实裁决。'].join('') });
  return { eyebrow: '一年后的手记', title: all ? '小屋里的疑点，各有了答案' : '有些问题，也跟着搬了进来',
    body: all ? '你用现场和材料对照，把维修、费用和旧损伤一件件写清。日子没有因为一句“放心”变好，而是因为事情得到了处理。' :
      '有些说法没有问到底，有些处理还没完成。后来，这些事走进了日常。你可以带着手记回到看房那天，再试一次。', tone: all ? 'success' : 'warning', items };
}
