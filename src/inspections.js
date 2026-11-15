import { getCase } from './cases.js';

// These records describe this fictional viewing. They are not legal or safety diagnoses.
const step = (label, body, extra = {}) => ({ label, body, ...extra });
const group = (id, cases, target, title, codes, hint, steps, extra = {}) => ({ id, cases, target, title, codes, hint, steps, day: 30, ...extra });
const owner = state => getCase(state.caseId)?.owner?.name || '房东';
const host = state => getCase(state.caseId)?.host?.name || '带看人';
const handoverReady = state => state.caseId === 'sunny' ? state.facts.authority : Boolean(state.facts.authority_2);

export const COMPARISON_LISTINGS = {
  choice: { id: 'choice-reference', title: '青禾小院 B', rent: 2500, deposit: 2500, leaseMonths: 3, paymentMonths: 1, commuteMinutes: 30, transportEstimate: 220, viewed: false, target: 'door', description: '另一处虚构合租卧室，仅有待比较的报价和路线卡；还没有实地看过。' },
};

export const INSPECTION_GROUPS = [
  group('sunlayout', ['sunny'], 'window', '这扇窗，和自己的生活', ['A06','A07','A08'], '阳光照到窗边，房间深处的自然光、遮挡和家具通道还没有记录。', [
    step('打开指南针，关灯看自然光', ['你在手机指南针上记录采光面的朝向，并把对面楼体、窗外遮挡和此刻时间一起记下。', '关掉室内灯后，窗边明亮，床和衣柜之间的过道较暗。一次观察不能代表全天或全年。']),
    step('询问其他时段，比较床柜与门的位置', ['你和小陈约好另一个白天时段复看，并沿可通行的过道看了衣柜、床、入户门和卫生间的位置。', '小陈说下午也不错。你把这句记作对方的体验，没有直接记成第二次已经看过。']),
    step('完成约好的复看，记录观察结果', ['约好的复看中，窗边的光线位置改变了，床柜之间仍然略紧。你把两次时间、自然光和遮挡分别记下。', '把观察与个人偏好分开记录，可在下方选择喜欢或不适合自己的布局；偏好不代表房屋合规或空气安全已经核实。']),
  ], { day: 7 }),
  group('basin', ['sunny','summer'], 'basin', '洗手台下，另一颗水珠', ['A09','A10','A11','A12','A13'], '卫生间有淡淡香气，洗手台柜底有一圈旧痕。这和厨房水槽是两处独立设施。', [
    step('先询问气味并获准开柜', ['你没有凑近深吸，先通风，再请对方说明香气来源和近期清洁情况。', '征得同意后打开洗手台小柜门，柜底旧水痕仍需试用对照；开门本身没有确认漏水。'], { kind: 'prepare', view: 'inspect:basin' }),
    step('弯腰擦干，再正常试用供排水', ['你使用低视角查看可见接头与柜底，擦干原水痕后正常放水。也在经同意后试了花洒、冲水、水箱回水和排风。', '短暂试用只说明这一次的状态；热水持续供应还需另约合适时间。没有把香气当作确定臭源。'], { kind: 'prepare', view: 'inspect:basin' }),
    step('再次观察干湿变化', ['擦干的位置重新出现新水珠，柜底对应区域又湿了一小块。', '你记录“本次放水后再次出现水珠”，同时请对方排查地漏和排水口。还不能仅凭这一处判断漏源。'], { view: 'inspect:basin' }),
    step('提出报修，写下待排查部位', ['你请房东安排人员检查洗手台接口、柜底和排水，说明维修联系人和复查时间。', '对方答应联系师傅。手账仍记“已要求处理”，不是“已修好”。']),
    step('收到实际维修记录，约好复查', ['维修人员已到场处理洗手台接口，记录写明检查位置、更换部件和处理时间。', '你收到记录并约好再来；照片和施工记录还不能代替你的正常放水复查。']),
    step('复查正常放水，双方留下记录', ['复查时再次擦干、正常放水并观察，同一位置没有新水珠，双方在对应维修记录上记下结果。', '洗手台这一项已留下复查记录。厨房渗漏、空气和旧损交接仍按各自线索处理。'], { view: 'inspect:basin' }),
  ], { day: 7 }),
  group('sinkcheck', ['sunny'], 'sink', '厨房检查，先准备再观察', ['A14'], '水槽下方柜门需要先获准打开，接头的位置较低。', [
    step('征得同意，打开水槽小柜门', ['小陈同意你正常检查。你打开水槽下的小柜门，先把通道留出来。', '这只是准备动作，没有因此获得渗漏或维修证据。'], { kind: 'prepare', view: 'inspect:sink' }),
    step('弯腰查看可见接头', ['你弯腰，或使用等效的固定低视角，看到接头与柜底原有水痕。', '旧痕不能单独证明此刻仍在漏，先记下待试用的位置。'], { kind: 'prepare', view: 'inspect:sink' }),
    step('擦干后正常放水，回到原渗漏检查', ['你准备好正常试用并观察同一位置。请继续选择原来的“打开小柜门，放水看看”，完整对照新水珠。', '准备、发现、请求维修和复查分别记录；单纯蹲下不会让水槽自动修好。'], { kind: 'prepare', view: 'inspect:sink' }),
  ], { day: 7, preparationOnly: true }),
  group('kitchen', ['sunny'], 'stove', '灶具和油烟机，也要试用', ['A15','A16'], '灶具与油烟机看着整洁，但外观不能替代经许可的正常试用。', [
    step('问清设备使用情况，先确认可安全试用', ['你先问设备情况和能否试用。本次场景没有发现燃气异常，熟悉设备的人同意示范。', '如果有疑似燃气泄漏，应停止试用、离开并联系专业人员，不点火也不操作电器。']),
    step('由熟悉设备的人演示正常使用', ['经允许，由熟悉设备的人正常试灶并展示火力调节；你在安全距离观察。', '随后正常开启油烟机，观察吸风和声音，不触碰运动部件。']),
    step('记录试用结果和报修联系人', ['本次正常试用有回应，没有出现新增异常；你与房东记下设备状况和报修联系人。', '短时试用不保证以后永不故障，后续异常仍需按具体情况报修。']),
  ], { day: 7 }),
  group('appliances', ['sunny','utilities'], 'fridge', '标签、年限与冰箱里的一角', ['A17','A18','B11'], '冰箱里留着旧食物盒，空调和冰箱的标签还没有对照。', [
    step('看冰箱和空调标签，询问使用年限', ['你对照冰箱、空调的型号和能效标签，询问安装、使用及最近维修时间。', '能效等级只是设备信息，不能直接算出你未来的账单。'], { targets: ['fridge','aircon'] }),
    step('征得同意，检查清洁与可见异味线索', ['你获得允许后检查冰箱可见角落、旧食物盒和密封处；室友物品不擅自翻动。', '对方说明哪些需要清理。你只记录气味和污迹，没有据此判断空气安全。'], { view: 'inspect:fridge' }),
    step('约定清洁、灯椅家电的报修安排', ['你询问灯具、椅子和家电出现原有损坏、正常老化或使用问题时，分别如何联系处理。', '对方同意把联系人、处理流程和需区分原因的责任写清，尚待双方核对文字。']),
    step('复看清洁结果，双方确认设备清单', ['清理完成后你复看可见部位。房东与你对照型号、现状和报修文字，确认并各留设备清单。', '这份记录只适用于列明的设备与已观察情况，不代表未来用量固定。']),
  ], { targets: ['fridge','aircon'] }),
  group('alterations', ['sunny','keys'], 'bed', '想装一块层板之前', ['A08','B11','B14'], '床边能放下常用物品，但你还想装层板、贴壁纸或调整灯具。', [
    step('量一量可见布局，列出想改的地方', ['你沿床边通道观察衣柜、门和卫生间之间的空间，把贴壁纸、钻孔装层板及灯具需求分开写下。', '床和柜子保持原位，固定件不自行拆卸。']),
    step('询问允许范围、恢复和费用', ['你问清哪些改动需要审批或其他许可、房东是否同意，以及退房如何恢复、费用由谁承担。', '对方口头表示可商量。你没有立即动手，也没有把“可商量”记成批准。']),
    step('对照书面范围，只记录已经确认的部分', ['房东在具体附件中同意使用可移除、不伤墙的收纳方式，并确认灯具报修流程；钻孔和结构改动仍未同意。', '你收好双方确认的范围。未获得许可的部分继续保留待办，不由转租人或介绍人代替房东决定。']),
  ], { day: 7 }),
  group('noises', ['cycle','shoes'], 'window', '门窗两边，不同时段', ['A19','A22','A23'], '窗外和门外的声音不同。几双鞋、一次安静，都不足以说明长期居住情况。', [
    step('分别开关门窗，记下此刻的声音', ['你在不妨碍他人的情况下比较门窗开、关状态，记录声源、时段和位置。', '鞋子和声音只是提问线索，不能数出常住人数，也不是隔音或噪声法规鉴定。']),
    step('礼貌问住户，另约晚间再听', ['你礼貌询问附近住户“通常什么时候更吵”。对方讲了晚间关门和早晨出门的个人体验。', '你记录信息来源，并约晚间复看。对方的体验不是对所有时段的保证。']),
    step('完成复看，把体验和需求分开记录', ['晚间复看时，走廊关门声更明显。你将两次记录并列，考虑自己的作息是否适合。', '这项是生活取舍；实际住户名单仍需在原关卡的入住清单处核实。']),
  ], { day: 7 }),
  group('outside', ['cycle','choice'], 'door', '从楼门到工作地点', ['A20','A21','A23','A26'], '房门外的候梯、餐饮营业和晚归入口，需要放进同一张通勤手记。', [
    step('查看楼门外的配套与路线记录', ['你查看带看时记录的楼下餐饮、排风、临路及垃圾点照片，标出仍需到现场核实的位置。', '照片中的污迹或垃圾点不能证明一定有虫害，也不能替代不同时间的观察。']),
    step('约高峰复访，记录楼层、电梯和等待', ['在约好的复访中，你从楼门查看公开可达区域，记录楼层、电梯数量、这一趟候梯及晚归出入口。', '这些是本次行程记录，不承诺每天候梯一样；路线卡原有虚构时间另列，不偷偷改成实时导航。']),
    step('询问住户，留下另一套房的预约', state => ['附近住户说夜间餐饮营业时会有声音，你记下来源和待复看的时段。', state.caseId === 'choice' ? '你另约了虚构的“青禾小院 B”：合租卧室2500元/月，押一付一、拟住三个月；路线卡单程30分钟，交通预算220元/月。它还没有实地看过，不能标成已核验，也不改变当前两份合同。' : '你获得另一套预约房的照片与报价，先标为“未看过”。比较房号、费用和路线后，约定双方都方便的带看时间。'], { summary: '已记录本次楼外体验；另一处只是未看过的报价，现场、主体和费用仍需重新核实。' }),
  ], { day: 7 }),
  group('papers', ['cycle'], 'folder', '材料晚点发，先记待办', ['B01','B03','B04','B10','B22','B23','B24'], '秦姐说可以发电子合同。出租、收款、平台与中介费需要有对应材料。', [
    step('索取电子合同、授权和费用单', ['你：这笔款支付给谁？请把房号、授权、合同主体、联系方式和中介费承担列出来，我带回去看。', '秦姐：我去联系房主，材料晚点发。你只记“已索取／待核实”。']),
    step('收到完整材料，逐项对照来源', ['稍后你收到带日期和房号的完整电子合同、授权和费用单，并对照产权、代理、签约与收款的对应关系。', '联系方式和身份资料只按必要范围核对，不转发给无关的人；独立借款协议另看，不当作普通租金支付页。']),
    step('提出含糊条款，等有权方确认版本', ['你把含糊的费用承担、收款凭证与附件缺页逐项列给秦姐，要求有权方确认。', '她表示已转交。此刻还没有共同签署的新版本。']),
    step('核对共同确认的完整副本', ['有权方回复并共同确认完整版本，你核对附件页码、联系人和付款凭证安排，各自保存同一份。', '这条记录说明副本已收齐；出租权限、正式收款账户仍按原关卡各自证据核实。本关没有暗加新的中介费。']),
  ]),
  group('installment', ['cycle'], 'phone', '“按月付”旁边还有一份协议', ['B03','B07','A26'], '手机上的付款介绍出现“分期服务”，旁边有一份单独协议。', [
    step('打开独立协议，找主体和义务', ['示例《分期协议》拟列玩家为借款人，“云桥分期服务方”为借款相对方（虚构名称，身份与资质尚待核实）。拟借款本金11550元，对应三个月3850元房租。', '草稿列12期，每期本金962.50元，利息及服务费用栏却空着；还款义务写在独立协议中。完整成本、付款对象和退出后义务仍待核对。', '这不是简单把租金按月划分。你尚未签字，也没有发生借款。']),
    step('分别问租金、借款和中介费用', ['你要求对方分别说明房租收款、借款还款义务、中介费由谁承担，以及退出租约是否也结束借款。', '秦姐说需要另行解释，不能只用“每月压力小”概括。']),
    step('暂不接受分期，比较现有付款安排', ['你选择暂不接受这份独立分期协议，保留材料继续比较。房源首期费用和付款周期仍按原报价列明。', '你没有在分期协议上签字，当前只考虑房源原来的付款安排。']),
  ]),
  group('video', ['cycle','summer'], 'phone', '拍下来，再慢慢看', ['A24','A25','B20','B21','B22'], '对方催你快定下来。你可以先获准拍摄、索要电子合同，再决定是否复看。', [
    step('征得同意，避开他人物品拍视频', ['你先取得允许，避开证件、室友私人用品和未经同意的房间，记录可见墙地、家具、家电和已有损坏。', '视频带上房号、位置和日期，先进入自己的手记，不冒充双方交接确认。']),
    step('回看视频，对照电子合同和另一套照片', ['你在手机上回看细节，将房号、原有损坏与完整电子合同对照；另一套照片只用于比较，尚未实地核实。', '对方说有人等着接。你表示还需要时间，提出第二次预约，或今天暂缓。']),
    step('保留复看安排，分开列出待确认项', ['你把第二次看房、材料核查和需要共同确认的旧损逐项列出，保存原始视频和约定。', '拍摄和预约已经完成，授权、交接对象及双方签字仍在原来的独立流程里，不会因此跳过。']),
  ], { day: 7 }),
  group('concession', ['internship','choice'], 'calendar', '免租几天，具体怎么写', ['B05','B06','B07','B09','B15','B17','B18'], '自己的实习日历与实际合同期限不同，免租、押付和提前退出也不能只靠一句话。', [
    step('对照期限、付款日和双方退出责任', state => [state.caseId === 'internship' ? '你把三个月实习计划与十二个月合同、押一付三、原有退出费用逐项并列。' : '你并列三个月2400元与六个月2100元两份合同，付款按月不改变实际租期。', '你读双方迟延交房、提前解除、通知、剩余租金和押金的处理。数字相同或不同都不能单独判断条款公平、有效。']),
    step('提出搬家免租期和明确的费用问题', ['你提出七天搬家免租，询问具体起止日、是否包含在租期内、免哪些费用及首期金额怎么调整。', '你同时要求把解除通知、约定费用、剩余租金和押金处理写清。聊天保留为协商过程，不自动更新合同。']),
    step('记录对方明确拒绝，保留原版本', ['对方这次不同意新增免租期，也没有签署新的无责退出条款。你保留完整答复和原文件。', '提出要求没有让条件生效。可以按原有已确认条件知情选择、暂缓或换房；当前租金、首期和实际租期均不偷偷改变。']),
  ], { pending: true, day: 90 }),
  group('air', ['transfer'], 'meter', '水表和空气，是两份待核实资料', ['A01','A02','B02','B12','B20','B21'], '阿遥说“表才走了几十吨，应该没住多久”。表计和装修资料需要分别核对。', [
    step('记录本户表号和交接起始读数', ['你对照本户表号，拍下交接日期和当前读数，只把它用于账单与交接。', '你：表可能更换过。读数高低不能证明装修时间，更不能证明空气安全。']),
    step('另问装修日期，索取对应检测资料', ['你索取装修日期、内容，以及与房间和检测日期对应的报告。房东答应去找资料。', '原租约、转租同意、责任终止和新六十天安排仍需各自核实，朋友介绍不能替代。']),
    step('记录尚未收到报告，保留空气待办', ['房东暂时没有找到对应资料。手记写“资料未取得，空气情况未核实”，没有捏造检测结果。', '已拍的表数只是个人交接资料；还要在交接处由有权方共同核对。'], { summary: '检测报告尚未取得，空气情况未核实；表号与读数仅用于账单和交接。' }),
  ], { pending: true, day: 7 }),
  group('structure', ['shoes'], 'wall', '一声空响，不能当作结论', ['A03','A04','A05','A19'], '墙面轻敲声不同，房间上方也有声音。原始户型、用途与通道情况尚未对照。', [
    step('轻敲可见墙面，观察高度与上下层', ['经允许你轻敲可见墙面，记录空响、可用高度和上下层声音，但不拆墙、不登高。', '空心声音不等于已经鉴定是违规隔断；低于三米也不是本局自动判违规的标准。']),
    step('核对户型、原用途、门窗和通道', ['你请房东提供与本户对应的原始户型及用途资料，并观察可见门窗、通道是否通畅。', '没有进入室友私密房间；结构、消防或建筑性质需要适当资料和专业核实，不能凭观感盖章。']),
    step('约分时段复看，保留缺失资料', ['你完成白天和晚间声音记录，但尚未收到完整对应的原始图纸和用途材料。', '结构情况继续待核实。房间高度、声音和自己是否喜欢分开记录，不把放弃合租判为失败。']),
  ], { pending: true, day: 7 }),
  group('visitors', ['shoes'], 'notice', '正常来访，不是一句“不许”', ['B16','B17'], '共同规则旁写着“不得不当使用”。具体范围、通知及正常访客安排还不够清楚。', [
    step('读访客、用途和解除通知的原文字句', ['你分别标出正常访客、留宿和“违法使用”所涉及的条款。', '不能把正常来访与违法使用混为一谈，也不能只听一人说“都不允许”。']),
    step('问清具体情形和核实、通知流程', ['你请房东说明含糊措辞指什么、如何核实事实、怎样通知，并请相关住户共同讨论访客和留宿。', '原有入住人数核对、厨房清洁轮值仍是独立事项。']),
    step('保存各方确认的具体生活规则', ['各方对正常访客、留宿沟通和公共区使用形成具体书面安排，各留一份；用途及解除部分保留按事实核实和约定通知的表述。', '本次没有发生违法使用事件，也没有据此宣布任何一方可随时解除合同。']),
  ], { day: 7 }),
  group('utilities', ['utilities'], 'meter', '把收费项目摊开看', ['B07','B08','B09','B10'], '原始账单和起始表数之外，缴费日、承担者和费用项目也需要逐项说明。', [
    step('列出水电气、物业网络和付款日期', ['你把水、电、燃气、物业、网络的计量、单价来源、付款方式、缴费日期及承担者分开列。', '本关原有2400元租金、押金与历史分摊样本不变；历史水电气120元加网络20元，合计每人140元，只是参考，不是固定包干或最高收费承诺。']),
    step('对照聊天与合同，问中介费和共享结算', ['你：之前说全包，合同却写另摊。中介服务费谁付？网费怎么结？', '对方说明本关没有新增必付中介费，愿意把现有项目和分摊口径写入附件；聊天本身还没有修改协议。']),
    step('由实际承担费用的人共同确认附件', ['房东与你及需要共同承担费用的住户核对并确认本次费用附件，包括账期、原始账单、人员变化和结算方法。', '这份项目记录不替代原关卡的起始表数和原始账单证据；没有隐藏新增费用。']),
  ]),
  group('sublet', ['keys'], 'folder', '有人接手，责任何时结束', ['B01','B02','B03','B04','B12'], '朋友说“找到接租人就好了”。原租客的责任、交接与授权期限并不会因此自动改变。', [
    step('重读身份、原约、联系和收款关系', ['你对照房号、权利人、原承租人、联系方式及收款安排，保留必要范围的资料。', '现有授权是八个月，十二个月草稿仍需另行处理，平台或介绍人并不能代替有权方。']),
    step('询问接租同意和责任终止的具体条件', ['你：找到接租人后，原租客的责任何时终止？需要哪些人书面确认，旧押金和表数怎样交接？', '阿林与林女士表示要把接租人、起止、交接和结清明确下来，不能只转发一条消息。']),
    step('共同留下接租流程，期限仍回原约核对', ['相关有权各方确认本局八个月安排下的接租审批、交接和责任终止流程，并各留记录。', '这没有批准十二个月，也没有替未来尚未出现的接租人完成手续；最终采用哪份合同仍在合同桌选择。']),
  ], { day: 240, applicable: state => state.contractChoice === 'eight' }),
  group('disputes', ['keys'], 'desk', '“相关机构”，到底是谁', ['B13','B15','B16','B17','B18','B19','B23','B24'], '草稿写“其他不符合管理要求的情形，出租人可解除”，争议条款则写“出租人所在地相关机构”。', [
    step('读双方交付、解除、通知与争议文字', ['你对照双方迟延交房、提前退出、违法使用与通知条款，标出含糊触发条件及费用处理。', '争议解决没有写清法院还是仲裁、机构与地点；不能因为没有勾选仲裁，就认为任何法院都能受理。']),
    step('追问具体情形、争议渠道与售房安排', ['你：哪些情形算不符合？相关机构具体是法院还是哪家仲裁机构？能否把通知和费用写清？', '你另外询问房东出售时，同等条件优先购买如何按当地规则和具体事实核实。这个问题只形成待核实知识记录，不要求你买房。']),
    step('记录待补充，等待完整签署版本', ['林女士答应请经办人补充明确，但这次尚未提供各方共同确认并签署的完整新版本。', '法律适用、条款效力和优先购买的具体条件仍待适当核实；原有退出和授权分支不被这次提问自动改写。']),
  ], { pending: true, day: 180 }),
  group('checkout', ['sunny','transfer','summer'], 'door', '交接，不只是一张照片', ['B02','B08','B20','B21'], '钥匙、门卡、表数和原有损伤，仍需要同有权交接的人逐项核对。', [
    step('经允许，分别记录物品、表数和旧损', ['你获准记录墙地、家具家电的可见状况，逐项写下钥匙、门卡和本户表数，照片标明日期与位置。', '不进入未经允许的私人区域；这一步只是自己的记录，还没有双方确认。']),
    step('请明确有权交接的人和清洁收费范围', state => [`你请${owner(state)}说明本次交接对象、清洁要求、计费周期和已有损坏的处理，并与原约或委托材料对照。`, '介绍人或拍视频的人不因此自动成为交接和收款的有权方；先完成原有出租授权核验。']),
    step('与有权方共同核对并留同一份清单', state => [`出租关系已经核对，你与${owner(state)}或明确的有权交接人现场逐项确认物品、表数、钥匙和旧损，各留同一份带日期的清单与照片。`, '租金、实际用量、清洁和押金仍按各自记录结清。这份清单不承诺全部押金一定退或一定扣。'], { coreRequires: handoverReady, waitHint: '先在原有主线核对房东与本次出租授权，再共同确认交接。' }),
  ], { day: 'last' }),
  group('bedside', ['sunny','summer'], 'bed', '床脚的旧痕，单独记一笔', ['A08','B11','B20','B21'], '床很沉。床脚和踢脚线的可见边沿，可以不用搬床就检查。', [
    step('蹲下照床脚和可见踢脚线', ['你使用低视角与手机灯，查看床脚、脚垫和可见地面，不移动床架，也不穿过家具看隐藏部位。', '一处旧磨损进入观察记录；还没有拍照或由对方确认。'], { view: 'inspect:bed' }),
    step('拍下日期、位置和现有磨损', ['经允许，你将床脚磨损、对应脚垫和地面位置拍清，标注日期后列入个人旧损清单。', '照片只是你手里的材料；尚未和有权交接的人共同确认。']),
    step('请房东对照照片确认原有状况', state => [`${owner(state)}与你对照现场和同一组照片，确认该处在入住前已有，双方在对应记录上留存。`, '维修仍按原因和约定分别沟通。床脚记录不替代沙发旧痕、其他家电或表数。'], { coreRequires: handoverReady, waitHint: '先核对本次出租关系与有权方，再确认旧损记录。' }),
  ], { day: 'last' }),
];

const groupsFor = caseId => INSPECTION_GROUPS.filter(group => group.cases.includes(caseId));
const key = (group, index) => `${group.id}_${index}`;
const bodyFor = (step, state) => typeof step.body === 'function' ? step.body(state) : [...step.body];
const atTarget = (group, id) => (group.targets || [group.target]).includes(id);
function available(state, group, index) {
  const facts = state.inspections?.facts || {};
  return (index === 0 || facts[key(group, index - 1)]) && (!group.steps[index].coreRequires || group.steps[index].coreRequires(state));
}

export function createInspectionState(caseId) {
  return { schemaVersion: 1, caseId, facts: Object.fromEntries(groupsFor(caseId).flatMap(group => group.steps.map((_, i) => [key(group, i), false]))), preferences: { layout: null }, lastAction: null };
}

export function parseInspectionAction(caseId, type) {
  const match = typeof type === 'string' && /^i:([a-z]+):(\d+)$/.exec(type);
  if (!match) return null;
  const group = groupsFor(caseId).find(item => item.id === match[1]), index = Number(match[2]);
  return group && index < group.steps.length ? { group, index } : null;
}

export function restoreInspectionState(input, state) {
  const fresh = createInspectionState(state.caseId);
  if (!input || input.schemaVersion !== 1 || input.caseId !== state.caseId || !input.facts || typeof input.facts !== 'object' || Array.isArray(input.facts)) return fresh;
  // New check groups are added false; a damaged group never wipes the original story.
  for (const group of groupsFor(state.caseId)) {
    let valid = true;
    for (let i = 0; i < group.steps.length; i++) {
      const value = input.facts[key(group, i)];
      if (value !== undefined && typeof value !== 'boolean') { valid = false; break; }
      if (value && !available({ ...state, inspections: fresh }, group, i)) { valid = false; break; }
      fresh.facts[key(group, i)] = value === true;
    }
    if (!valid) for (let i = 0; i < group.steps.length; i++) fresh.facts[key(group, i)] = false;
  }
  const parsed = parseInspectionAction(state.caseId, input.lastAction);
  if (parsed && fresh.facts[key(parsed.group, parsed.index)]) fresh.lastAction = input.lastAction;
  if (state.caseId === 'sunny' && fresh.facts.sunlayout_2 && ['like','unfit'].includes(input.preferences?.layout)) {
    fresh.preferences.layout = input.preferences.layout;
    if (input.lastAction === `i:preference:${input.preferences.layout}`) fresh.lastAction = input.lastAction;
  }
  return fresh;
}

export function reduceInspection(state, type) {
  if (state.caseId === 'sunny' && state.phase === 'viewing' && ['i:preference:like','i:preference:unfit'].includes(type) && state.inspections?.facts.sunlayout_2) {
    const layout = type.split(':')[2];
    return state.inspections.lastAction === type ? state : { ...state, inspections: { ...state.inspections, preferences: { layout }, lastAction: type } };
  }
  const parsed = parseInspectionAction(state.caseId, type);
  if (!parsed || state.phase !== 'viewing' || !available(state, parsed.group, parsed.index)) return state;
  const current = state.inspections || createInspectionState(state.caseId);
  if (current.lastAction === type && current.facts[key(parsed.group, parsed.index)]) return state;
  return { ...state, inspections: { ...current, facts: { ...current.facts, [key(parsed.group, parsed.index)]: true }, lastAction: type } };
}

export function getInspectionSpots(caseId) {
  const labels = { window: ['窗边检查','sun'], basin: ['洗手台','sink'], sink: ['水槽检查','sink'], stove: ['灶具与烟机','note'], fridge: ['冰箱','cabinet'], aircon: ['空调','note'], bed: ['床边检查','bed'], door: ['门外交接','home'], folder: ['材料复核','folder'], phone: ['手机资料','phone'], calendar: ['日历协商','calendar'], meter: ['表计核对','meter'], wall: ['墙面与户型','home'], notice: ['共同规则','notice'], desk: ['条款追问','note'] };
  const ids = [...new Set(groupsFor(caseId).flatMap(group => group.targets || [group.target]))];
  return ids.map(id => ({ id, label: labels[id]?.[0] || id, icon: labels[id]?.[1] || 'note' }));
}

export function getInspectionProgress(state) {
  const facts = state.inspections?.facts || {};
  const chains = groupsFor(state.caseId).map(group => {
    let index = -1;
    group.steps.forEach((_, i) => { if (facts[key(group, i)]) index = i; });
    const complete = index === group.steps.length - 1;
    const status = index < 0 ? 'unknown' : complete && !group.pending && !group.preparationOnly && (!group.applicable || group.applicable(state)) ? 'resolved' : group.steps[index].kind === 'prepare' || group.pending || index > 0 ? 'pending' : 'found';
    let detail = index < 0 ? group.hint : group.steps[index].summary || bodyFor(group.steps[index], state).at(-1);
    if (group.id === 'sunlayout' && state.inspections?.preferences?.layout) detail += state.inspections.preferences.layout === 'like' ? ' 你的偏好：喜欢这个布局。' : ' 你的偏好：这个布局不太适合自己。';
    return { id: group.id, title: group.title, target: group.target, codes: [...group.codes], status, detail };
  });
  return { chains, nextHint: chains.find(chain => chain.status !== 'resolved')?.detail || '本轮新增检查已分别留档；未包含的时段和情况仍可继续核实。' };
}

export function getInspectionNotes(state) {
  const labels = { unknown: '尚未检查', found: '已见线索', pending: '继续核对', resolved: '本项已记录' };
  return getInspectionProgress(state).chains.map(chain => ({ title: chain.title, status: labels[chain.status], detail: chain.detail, inspection: true }));
}

export function decorateInspectionDialog(id, state, original) {
  const groups = groupsFor(state.caseId).filter(group => atTarget(group, id));
  if (!groups.length) return original;
  const dialog = { ...original, body: [...original.body], options: [...original.options] };
  if (['basin','fridge','aircon','stove','wall'].includes(id)) {
    dialog.title = groups.length === 1 ? groups[0].title : '看看这个位置';
    dialog.body = groups.map(group => group.hint);
  }
  const parsed = parseInspectionAction(state.caseId, state.inspections?.lastAction);
  if (parsed && groups.includes(parsed.group)) {
    const step = parsed.group.steps[parsed.index];
    dialog.title = parsed.group.title;
    dialog.body = bodyFor(step, state);
    dialog.speaker = 'self';
    delete dialog.speakerName;
    dialog.expression = 'neutral';
    if (step.view) dialog.view = step.view;
  }
  const choices = groups.flatMap(group => group.steps.map((step, index) => ({
    label: step.label, action: `i:${group.id}:${index}`,
    disabled: !available(state, group, index), primary: Boolean(state.inspections?.facts[key(group, index)]),
    detail: !available(state, group, index) ? step.waitHint || '先完成上一步观察或核对。' : state.inspections?.facts[key(group, index)] ? '已记录，可再读一次' : group.title,
  })));
  // Keep the established plot controls at the top; new facilities have only their own checks.
  dialog.options.push(...choices);
  if (state.caseId === 'sunny' && id === 'window') {
    for (const [value, label] of [['like','记下偏好：我喜欢这个布局'],['unfit','记下偏好：不太适合我的生活']]) dialog.options.push({ label, action: `i:preference:${value}`, disabled: !state.inspections?.facts.sunlayout_2, primary: state.inspections?.preferences?.layout === value, detail: '先完成观察和复看；偏好不会改变证据或合同。' });
    if (state.inspections?.lastAction?.startsWith('i:preference:')) {
      dialog.body = [state.inspections.preferences.layout === 'like' ? '你在手账里记下：喜欢这个布局，可以继续核对其他条件。' : '你在手账里记下：这个布局不太适合自己，可以再比较别的房子。', '偏好没有正确答案，不改变采光记录，也不会替你作签约决定。'];
      dialog.speaker = 'self';
    }
  }
  return dialog;
}

export function getInspectionTimelineItems(state, day) {
  const config = getCase(state.caseId), progress = getInspectionProgress(state).chains, facts = state.inspections?.facts || {};
  const items = groupsFor(state.caseId).filter(group => !group.preparationOnly && (group.id === 'basin' || group.steps.some((_, index) => facts[key(group,index)])) && (group.day === 'last' ? config.timelineDays.at(-1) : config.timelineDays.find(d => d >= group.day) || config.timelineDays.at(-1)) === day).map(group => {
    const record = progress.find(chain => chain.id === group.id);
    let body = record.status === 'unknown' ? `看房时没有留下这项检查记录。${group.hint}` : record.detail;
    let tone = record.status === 'resolved' ? 'success' : record.status === 'unknown' ? 'neutral' : 'warning';
    if (group.id === 'basin') {
      body = facts.basin_5 ? '洗手台已有独立的维修和正常放水复查记录，这次没有新水珠。厨房及其他设施仍按各自事实回看。' : '洗手台接头开始重新滴水，柜底出现湿痕。厨房水槽的处理没有修好这一处；先按本处记录联系报修、安排正常复查。';
      tone = facts.basin_5 ? 'success' : 'warning';
    }
    return { title: `${group.title} · ${record.status === 'resolved' ? '有对应记录' : '另项回看'}`, body, tone, inspection: true };
  });
  return items;
}

export function getInspectionEffects(state, day) {
  const facts = state.inspections?.facts || {}, hasBasin = ['sunny','summer'].includes(state.caseId);
  return { basinPrepared: hasBasin && Boolean(facts.basin_0), basinObserved: hasBasin && Boolean(facts.basin_2), basinRepaired: hasBasin && Boolean(facts.basin_5), basinLeak: hasBasin && day >= 7 && !facts.basin_5, sinkPrepared: state.caseId === 'sunny' && Boolean(facts.sinkcheck_0) };
}

export function inspectionCoverage() {
  return INSPECTION_GROUPS.flatMap(group => group.codes.map(code => ({ code, groupId: group.id, caseIds: [...group.cases], target: group.target, actions: group.steps.map((_, i) => `i:${group.id}:${i}`) })));
}
