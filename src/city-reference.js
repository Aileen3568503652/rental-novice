// A dated reading index from the supplied 1.1 screenplay, not live listing data.
export const CITY_REFERENCES = [
  {id:'beijing',name:'北京',areas:'望京、回龙观、亦庄',stations:'望京、回龙观、经海路',map:'https://www.mtr.bj.cn/article/line',mapTitle:'京港地铁线网图',samples:[
    {area:'望京',type:'合租卧室',low:2390,high:2630,n:2,source:'https://m.lianjia.com/chuzu/bj/brand/200302002000/wangjing/ct1rt200600000002/'},
    {area:'亦庄',type:'整套一居',low:3400,high:4700,n:3,source:'https://m.lianjia.com/chuzu/bj/brand/200301001000/yizhuang1/vr1ct1rt200600000001l0/'},
  ]},
  {id:'shanghai',name:'上海',areas:'张江',stations:'张江路、张江高科、广兰路',map:'https://service.shmetro.com/awltcz/index.htm',mapTitle:'上海地铁线网查询',samples:[
    {area:'张江',type:'合租卧室',low:1930,high:3490,n:2,source:'https://m.lianjia.com/chuzu/sh/brand/200302002000/zhangjiang/bc1ht1rpw1rt200600000002/'},
    {area:'张江',type:'整套一居',low:4830,high:5090,n:2,source:'https://m.lianjia.com/chuzu/sh/brand/200302002000/zhangjiang/su1rt200600000001/'},
  ]},
  {id:'guangzhou',name:'广州',areas:'天河、车陂',stations:'车陂、车陂南',map:'https://cs.gzmtr.com/ckfw/',mapTitle:'广州地铁乘客查询',samples:[
    {area:'天河',type:'合租卧室',low:2000,high:2500,n:3,source:'https://m.lianjia.com/chuzu/gz/brand/200301001000/hk1rt200600000002rp2rp8rp3/'},
    {area:'车陂',type:'整套一居',low:2500,high:3300,n:3,source:'https://m.lianjia.com/chuzu/gz/brand/200301001000/chebei/l0/'},
  ]},
  {id:'shenzhen',name:'深圳',areas:'坂田、龙华、蛇口、南山',stations:'岗头、龙华、东角头、荔林',map:'https://www.szmc.net/shentieyunying/yunyingfuwu/szsgdjtyyxlwlt/',mapTitle:'深圳地铁线网图',samples:[
    {area:'坂田／龙华／蛇口',type:'合租卧室',low:1700,high:2300,n:3,source:'https://m.lianjia.com/chuzu/sz/brand/200301001000/vr1rt200600000002/'},
    {area:'南山',type:'整套一居',low:3500,high:4900,n:3,source:'https://m.lianjia.com/chuzu/sz/brand/200301001000/nanshanqu/vr1/'},
  ]},
  {id:'hangzhou',name:'杭州',areas:'未来科技城、滨江',stations:'创景路、良睦路、聚才路、长河',map:'https://www.hzmetro.com/',mapTitle:'杭州地铁官方入口',samples:[
    {area:'未来科技城／滨江',type:'合租卧室',low:1660,high:2360,n:4,extraSource:'https://m.lianjia.com/chuzu/hz/brand/200302002000/bc1de1ht1ib1rpw1su1rt200600000002/',source:'https://m.lianjia.com/chuzu/hz/brand/200302002000/binjiangqu/bc1de1ht1ib1rpw1su1rt200600000002/'},
    {area:'未来科技城',type:'整套一居',low:2600,high:3300,n:2,source:'https://m.lianjia.com/chuzu/hz/brand/200301001000/weilaikejicheng/rt200600000001rp5rp0/'},
  ]},
  {id:'chengdu',name:'成都',areas:'高新、中和',stations:'天府三街、天府五街、张家寺、中和',map:'https://www.chengdurail.com/index/jtxwt.htm',mapTitle:'成都轨道线网入口',samples:[
    {area:'高新',type:'合租卧室',low:900,high:1150,n:3,source:'https://m.lianjia.com/chuzu/cd/brand/200301001000/gaoxin7/su1rt200600000002rp0/'},
    {area:'中和',type:'整套一居',low:2000,high:2300,n:2,source:'https://m.lianjia.com/chuzu/cd/brand/200301001000/zhonghezhangjiasixi/vr1hk1su1rt200600000001/'},
  ]},
].map(city=>({...city,sourceRecordedAt:'2026-10-29',listingVerifiedAt:null}));

const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderCityReference(id='beijing') {
  const city=CITY_REFERENCES.find(c=>c.id===id)||CITY_REFERENCES[0];
  return `<div class="housing-overlay"><section class="housing-detail city-reference" role="dialog" aria-modal="true" aria-labelledby="city-title" tabindex="-1"><button class="icon-button close" data-command="close-cities" aria-label="关闭城市参考册">×</button><div class="eyebrow">一页城市资料 · 不影响本局报价</div><h2 id="city-title">先认认路，再看房</h2><nav class="city-tabs" aria-label="选择参考城市">${CITY_REFERENCES.map(c=>`<button data-city="${c.id}" aria-pressed="${c.id===city.id}">${c.name}</button>`).join('')}</nav><h3>${city.name} · ${city.areas}</h3><p>脚本参考站点：${city.stations}。最新线路、运营时间和换乘以官方查询为准。</p><a class="button secondary external-source" href="${escape(city.map)}" target="_blank" rel="noopener noreferrer">打开${city.mapTitle} ↗</a><div class="city-samples">${city.samples.map(s=>`<article><span>${s.area} · ${s.type}</span><strong>¥${s.low.toLocaleString('zh-CN')}—${s.high.toLocaleString('zh-CN')} / 月</strong><p>${s.n} 条挂牌样本的最低与最高值</p><a href="${escape(s.source)}" target="_blank" rel="noopener noreferrer">查看原挂牌列表 ↗</a>${s.extraSource?`<br><a href="${escape(s.extraSource)}" target="_blank" rel="noopener noreferrer">另一组挂牌来源 ↗</a>`:''}</article>`).join('')}</div><p class="source-note">资料记录于 ${city.sourceRecordedAt}，来自 1.1 脚本；本版未重新核验挂牌价格及可租状态。小样本不是区域均价或完整市场区间；合租报价按卧室，整租报价按整套。杭州合租汇总含两个区域的列表。</p><div class="route-reading"><h3>从门口到工位，逐段看</h3><p>住宅楼门 → 小区出口 → 车站入口 → 候车／换乘 → 出站 → 办公楼入口</p><p>把高峰候梯、晚归路线和交通费用另记下来。游戏里的路线仍是虚构的，不会把这些站点距离套到游戏房源上。</p></div><footer class="housing-detail-footer"><button class="button primary" data-command="close-cities">回到选房</button></footer></section></div>`;
}
