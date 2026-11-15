// Fictional cast direction. These are authored character identities, never guesses about players.
const cast = {
  '小陈': ['男','sidepart','#355246','#493927','jacket'],
  '秦姐': ['女','bob','#875d48','#40332b','jacket'],
  '阿森': ['男','short','#596977','#3c342d','sweater'],
  '阿遥': ['女','ponytail','#507c79','#543829','sweater'],
  '小顾': ['女','bob','#6a748c','#3d3430','jacket'],
  '阿林': ['男','sidepart','#68835b','#2f3028','jacket'],
  '小夏': ['女','shortbob','#ad784f','#583b2d','sweater'],
  '刘先生': ['男','short','#897058','#4c4135','jacket'],
  '小乔': ['女','ponytail','#657e55','#352e27','sweater'],
  '小言': ['男','sidepart','#778f98','#44362c','sweater'],
  '阿宁': ['女','ponytail','#be8653','#49332a','sweater'],
  '阿岚': ['男','short','#5e8292','#40352d','sweater'],
  '小孟': ['女','bob','#7b8c65','#352e28','jacket'],
  '小禾': ['男','short','#b28857','#47362c','sweater'],
  '小朵': ['女','long','#738a92','#4e352b','sweater'],
  '小满': ['男','sidepart','#8b7298','#5d3c29','sweater'],
  '小周': ['女','ponytail','#967899','#4d352a','jacket'],
  '小晴': ['女','shortbob','#b08467','#533c2f','sweater'],
  '周女士': ['女','bun','#7a8360','#483a30','jacket'],
  '李女士': ['女','bob','#947654','#4d4035','jacket'],
  '许女士': ['女','bun','#7f7990','#49392f','jacket'],
  '赵先生': ['男','sidepart','#7c8c72','#5b4b3b','jacket'],
  '唐女士': ['女','shortbob','#b0805c','#49382c','jacket'],
  '韩女士': ['女','bun','#617b84','#3d342d','jacket'],
  '林女士': ['女','bob','#918361','#423930','jacket'],
  '陈先生': ['男','short','#6d7e73','#4a3c2e','jacket'],
  '方女士': ['女','ponytail','#8b7966','#41382e','jacket'],
  '郑女士': ['女','shortbob','#8a7657','#4c3c30','jacket'],
  '邻居小林': ['男','short','#73866e','#48382f','sweater'],
  '邻居阿玉': ['女','bob','#a17c58','#4f3b2c','sweater'],
};

export const CHARACTERS = Object.freeze(Object.fromEntries(Object.entries(cast).map(([name, [gender, hairStyle, shirt, hair, outfit]]) => [name, Object.freeze({
  name, gender, hairStyle, shirt, hair, outfit, skin: '#e9b98a', trousers: '#495344',
  accessory: name === '小满' ? 'cap' : ['周女士','许女士','林女士','韩女士'].includes(name) ? 'earrings' : name === '阿岚' ? 'glasses' : 'none',
})])));

export function getCharacter(name, role = '') {
  const supplied = name && typeof name === 'object' ? name : { name, role };
  const actorName = String(supplied.name || '小陈');
  const gender = supplied.gender === '女' || supplied.gender === '男' ? supplied.gender : /女士|姐姐|姐|阿姨/.test(actorName) ? '女' : '男';
  const actor = CHARACTERS[actorName] || { name: actorName, gender, hairStyle: gender === '女' ? 'bob' : 'short', shirt: '#698474', hair: '#49382c', outfit: 'jacket', skin: '#e9b98a', trousers: '#495344', accessory: 'none' };
  return { ...actor, role: supplied.role || role || '', ...(supplied.gender === '女' || supplied.gender === '男' ? { gender: supplied.gender } : {}) };
}

export function characterLabel(person, role = '') {
  const actor = getCharacter(person, role);
  return [actor.name, actor.gender, actor.role].filter(Boolean).join(' · ');
}
