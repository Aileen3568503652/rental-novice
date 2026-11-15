// Friends offer leads and personal experience; they cannot verify somebody else's lease.
const stories = {
  keys: {
    friend: { name: '小满', role: '朋友 · 房源介绍人' },
    title: '朋友替谁打了包票',
    hint: '小满陪你来看房，刚说完“阿林我熟”，又低头翻起聊天记录。',
    steps: [
      {
        label: '你和阿林怎么认识？你见过房东吗？', expression: 'smile',
        body: ['小满：以前一起做过项目，他人挺热心。我只来吃过两次饭，房东倒没见过。', '你：所以你了解的是阿林这个人，租赁关系还没核实过？', '小满挠挠头：对，这个我不能替他保证。'],
        summary: '介绍人是阿林的旧同事，没有见过房东，也没有核对出租权限。',
      },
      {
        label: '看看你们最初聊房子的完整消息', expression: 'avoid',
        body: ['小满把手机往上翻。前一句是“我准备续一年”，下一句才是“可以介绍朋友来住”。', '小满：我把“准备续”记成“已经续好了”。你看，原话还在这儿。', '阿林从餐桌旁接了一句：我觉得应该没问题。但我们得再问林女士。'],
        summary: '完整消息写的是“准备续一年”，不是续租已经获准；需对照原约和房东答复。',
      },
      {
        label: '请你帮忙约齐双方，我自己核对材料', expression: 'relieved',
        body: ['小满：可以，我负责把人约到一起。钱和合同你直接跟有权处理的人确认。', '你把问题写下：阿林原约到哪天？林女士同意的范围是什么？一年草稿多出来的时间怎么办？', '朋友的聊天记录被夹在手账后页。它解释了误会，却不能替代授权和签约材料。'],
        summary: '已厘清熟人介绍的来由；八个月授权、一年草稿和实际选择仍须在原约与合同处分别核对。',
      },
    ],
  },
  transfer: {
    friend: { name: '小周', role: '学姐 · 房源介绍人' },
    title: '被转发了两次的房源',
    hint: '学姐小周也来陪看。你们手机里的同一条房源，发布日期却不一样。',
    steps: [
      {
        label: '这条房源最初是谁发的？', expression: 'smile',
        body: ['小周：阿遥发在校友群，我转给了你。我和她同一届，不过她的合同我没看过。', '你：转发信息的人、现在承租的人、房东是三个身份，我分别问清楚。', '小周点点头：对，我是来陪看的，不收钱，也不替房东答应什么。'],
        summary: '小周是转发房源的学姐；阿遥是现承租人，赵先生是待联系的房东。',
      },
      {
        label: '对照原消息的日期，看看“两个月”从哪来', expression: 'tense',
        body: ['小周打开原消息：那条“还剩两个月”的帖子，已经是十五天前发的。', '阿遥：我后来确实没改文案……按现在的合同，只剩四十五天。', '你在两条消息旁标上各自日期。“能住多久”要从实际入住日重新算。'],
        summary: '旧帖已过十五天；“剩两个月”不能直接当作今天仍可住六十天的承诺。',
      },
      {
        label: '把时间差列出来，约房东确认新的起止日', expression: 'relieved',
        body: ['小周：我帮你们约个都有空的时间，延期还是要房东本人确认。', '你把计划入住日、旧约截止日和拟住六十天分别写在日历上。', '原消息只说明文案为什么过期。继续去问赵先生、查看新租约，才能知道后十五天是否落实。'],
        summary: '已还原转发与旧文案的时间差；新六十天租约、收款和交接仍未因朋友解释自动完成。',
      },
    ],
  },
  summer: {
    friend: { name: '小晴', role: '朋友 · 陪看介绍人' },
    title: '说好的暑假搭子',
    hint: '朋友小晴兴冲冲地说“可以一起过暑假”，室友小禾却看了一眼公共日历。',
    steps: [
      {
        label: '你说的一起过暑假，具体是怎么安排？', expression: 'smile',
        body: ['小晴：你住进来以后，我想周末来做饭、偶尔借宿。我和小夏提了一嘴。', '小禾：来做饭当然可以商量。但借宿、钥匙和公共区使用，我们还没一起说过。', '你：我先确认自己能否承租，再单独和室友谈来访安排。'],
        summary: '朋友期待周末来访或借宿，但现住室友尚未共同确认来访规则。',
      },
      {
        label: '原来的聊天里，到底答应了什么？', expression: 'avoid',
        body: ['小晴翻到聊天：“等新室友来了，我们一起商量。”', '小晴：我只记住了前面那句“有空来玩”，后半句看快了。', '小夏：我可以介绍你认识房东和室友，不能替他们把所有事都答应下来。'],
        summary: '“有空来玩”不是所有住户同意长期来访、借宿或配钥匙的约定。',
      },
      {
        label: '先约一次共同沟通，把友情和租约分开', expression: 'relieved',
        body: ['小晴：那我先不买折叠床了。等你们把规则谈好，我按约定来。', '小禾笑了：可以先约一顿饭，大家把清洁、作息和访客规则说清楚。', '你记下需要找陈先生核实转租许可，再到公共告示处协商共同生活规则。两件事不能相互替代。'],
        summary: '朋友接受先协商再来访；出租许可、费用和现住室友共同规则仍须分别落实。',
      },
    ],
  },
};

export function enrichReferrals(cases, scenarios) {
  for (const [id, story] of Object.entries(stories)) {
    const config = cases.find(c => c.id === id), scenario = scenarios[id];
    if (!config || !scenario) continue;
    config.friend = { ...story.friend };
    const chain = {
      id: 'referral', title: story.title, target: 'friend', optional: true, hint: story.hint,
      steps: story.steps.map((step, i) => ({
        ...step, speaker: 'friend', speakerName: `${story.friend.name} · ${story.friend.role}`,
        ...(i === 2 ? { requires: ['ownerAsked'], waitHint: '先联系房东，问清要向谁索取材料，再约共同沟通。' } : {}),
      })),
      good: '你问清了介绍人的信息来源，也保留了原始上下文；朋友的经验没有被当作出租授权。',
      bad: '介绍人的说法还没有问清。继续找真正的当事人和原始材料对照。',
    };
    scenario.chains = [...scenario.chains.filter(c => c.id !== 'referral'), chain];
    config.chains = scenario.chains;
    config.spots = [...config.spots.filter(s => (s.id || s.target) !== 'friend')];
    config.spots.splice(Math.min(2, config.spots.length), 0, { id: 'friend', label: story.friend.name, icon: 'person' });
  }
}
