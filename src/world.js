import * as THREE from 'three';
import { getCharacter, characterLabel } from './characters.js';

/** Original block apartment; UI, narrative decisions, and saving live outside this module. */
export function createWorld({ canvas, onTarget = () => {}, onMove = () => {}, onPosture = () => {}, caseConfig = {} }) {
  const caseId = caseConfig.id || 'sunny', originalCase = caseId === 'sunny';
  const shared = caseConfig.housingType === 'shared' || caseConfig.layout === 'shared';
  const themeIndex = ({sage:0,blue:1,peach:2,amber:3})[caseConfig.palette] ?? [...caseId].reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % 4;
  const themes = [
    { wall: '#f3dfc3', wood: '#c99043', accent: '#6b955c', fabric: '#a2bd78', tile: '#bedbc8', sky: '#8fd9e8' },
    { wall: '#e3e9d0', wood: '#ad7950', accent: '#5b8d8f', fabric: '#9fc6b0', tile: '#c6d4dc', sky: '#9cd5e5' },
    { wall: '#ead8d0', wood: '#bd8e61', accent: '#b16b60', fabric: '#e2b47e', tile: '#e1d4bb', sky: '#a3cde0' },
    { wall: '#ede1c1', wood: '#b58a4b', accent: '#ab883f', fabric: '#dfc48b', tile: '#d4dbc4', sky: '#9dcad8' },
  ];
  const palette = { ...themes[originalCase ? 0 : themeIndex], ...(typeof caseConfig.palette === 'object' ? caseConfig.palette : {}) };
  const loungeShift = originalCase ? 0 : themeIndex % 2 ? -0.85 : 0.3;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.24;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  const dayColor = new THREE.Color(palette.sky);
  const nightColor = new THREE.Color('#26394f');
  scene.background = dayColor.clone();
  scene.fog = new THREE.Fog(dayColor, 26, 56);
  const camera = new THREE.PerspectiveCamera(67, 1, 0.08, 75);
  camera.rotation.order = 'YXZ';
  camera.position.set(0, 1.65, 4.3);
  camera.rotation.set(-0.035, 0.03, 0);
  const materials = new Set(), textures = new Set();
  const staticColliders = [], furniture = new Map(), pickables = [], listeners = [];
  const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
  const raycaster = new THREE.Raycaster(), center = new THREE.Vector2(), keys = new Set();
  const playerRadius = 0.26;
  let enabled = false, dragging = false, activeTarget = null, leaking = false, repaired = false, disposed = false;
  let expression = 'neutral', storyDay = 0, storyFacts = {}, storyEffects = {}, timeLapse = null;
  let animationId, previousTime = performance.now(), lastMoveNotification = 0;
  let cabinetOpenAmount = 0, currentView = 'survey';
  const postureHeights = { standing: 1.65, bent: 1.15, crouched: .75 };
  let posture = 'standing', desiredEyeHeight = postureHeights.standing, reducedMotion = false;
  const actors = new Map();
  const movableFurniture = new Set(['chair', 'plant', 'coffee']);
  const cabinetDoors = [];

  function listen(object, type, callback, options) {
    object.addEventListener(type, callback, options);
    listeners.push(() => object.removeEventListener(type, callback, options));
  }
  function material(color, extra = {}) {
    const value = new THREE.MeshStandardMaterial({ color, roughness: 0.88, ...extra });
    materials.add(value);
    return value;
  }
  function canvasTexture(image) {
    const texture = new THREE.CanvasTexture(image);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    textures.add(texture);
    return texture;
  }
  function pixelTexture(palette, seed = 1) {
    const image = document.createElement('canvas');
    image.width = image.height = 16;
    const context = image.getContext('2d');
    let random = seed;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      random = (random * 16807) % 2147483647;
      context.fillStyle = palette[random % palette.length];
      context.fillRect(x, y, 1, 1);
    }
    const texture = canvasTexture(image);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }
  function signMaterial(line, subtitle = '') {
    const image = document.createElement('canvas');
    image.width = 512; image.height = 160;
    const context = image.getContext('2d');
    context.fillStyle = '#ffe4aa'; context.fillRect(0, 0, 512, 160);
    context.strokeStyle = '#976034'; context.lineWidth = 8; context.strokeRect(8, 8, 496, 144);
    context.fillStyle = '#694427'; context.textAlign = 'center';
    context.font = `${Math.min(46,Math.floor(460/Math.max(1,[...String(line)].length)))}px "Fusion Pixel", "Microsoft YaHei", sans-serif`;
    context.fillText(line, 256, subtitle ? 75 : 100);
    if (subtitle) { context.font = `${Math.min(26,Math.floor(460/Math.max(1,[...String(subtitle)].length)))}px "Fusion Pixel", "Microsoft YaHei", sans-serif`; context.fillText(subtitle, 256, 125); }
    return material('#ffffff', { map: canvasTexture(image) });
  }
  const colors = {
    plaster: material(palette.wall, { map: pixelTexture(['#ffffff', '#fff7e7', '#f6ebda'], 12) }),
    white: material('#fff3dc'), wood: material(palette.wood, { map: pixelTexture(['#f3dcba', '#fff1d5', '#edd2a8'], 19) }),
    darkWood: material('#8c542d'), teal: material(palette.accent), paleTeal: material(palette.fabric), darkTeal: material('#467748'),
    metal: material('#a9b9b2', { metalness: 0.38, roughness: 0.4 }), black: material('#363e2f'), tile: material(palette.tile),
    terracotta: material('#d89155'), fabric: material('#e9c98f'), leaf: material('#538b43'), lightLeaf: material('#a5c85f'),
    skin: material('#d8ad85'), paper: material('#fff7dc'), blue: material('#b7ccd0'),
  };
  const targets = Object.fromEntries([
    ['landlord', '带看人'], ['sink', '厨房水槽'], ['window', '窗户与采光'],
    ['owner', '房东电话'], ['bill', '费用清单'], ['door', '入户门与钥匙'], ['bathroom', '卫生间洗手台'],
    ['phone', '房源与路线手机'], ['folder', '授权与租约资料夹'], ['meter', '本户表计'],
    ['calendar', '入住计划与日历'], ['notice', '公共约定留言板'], ['roommate', '和室友聊聊'], ['shoes', '玄关鞋架'],
    ['friend', '和介绍房子的朋友聊聊'],
    ['basin', '洗手台管道与柜底'], ['fridge', '冰箱与清洁记录'], ['stove', '灶具与油烟机'],
    ['aircon', '空调与能效标识'], ['wall', '墙面与户型资料'],
  ].map(([id, title]) => [id, { id, title }]));
  targets.landlord.title=characterLabel(caseConfig.host||{name:'小陈',role:'带看人'});
  if(caseConfig.roommate?.name)targets.roommate.title=characterLabel({...caseConfig.roommate,role:'室友'});
  if(caseConfig.friend?.name)targets.friend.title=characterLabel(caseConfig.friend);
  const furnitureTitles = { cabinet: '卧室衣柜', sofa: '客厅沙发', bed: '卧室床铺', coffee: '小边几', desk: '租房合同', chair: '餐椅', plant: '盆栽' };
  for (const [id, title] of Object.entries(furnitureTitles)) targets[id] = { id, title, furnitureId: id };
  targets.owner.furnitureId = 'desk'; targets.bill.furnitureId = 'desk';
  function box(parent, w, h, d, x, y, z, mat, { target, pick = true, shadow = true } = {}) {
    const mesh = new THREE.Mesh(cubeGeometry, mat);
    mesh.scale.set(w, h, d); mesh.position.set(x, y, z);
    mesh.castShadow = shadow; mesh.receiveShadow = true;
    if (target) mesh.userData.interaction = target;
    parent.add(mesh);
    if (pick) pickables.push(mesh);
    return mesh;
  }
  const block = (w, h, d, x, y, z, mat, options) => box(scene, w, h, d, x, y, z, mat, options);
  function collision(x, z, width, depth, owner = null) { staticColliders.push({ x, z, width, depth, rotation: 0, owner }); }
  function addFurniture(id, x, z, width, depth, focusY, build) {
    const group = new THREE.Group(); group.position.set(x, 0, z); scene.add(group);
    const entry = { id, title: furnitureTitles[id], group, width, depth, focusY, movable: movableFurniture.has(id), origin: { x, z, rotation: 0 } };
    furniture.set(id, entry);
    build((w, h, d, px, py, pz, mat, options = {}) => box(group, w, h, d, px, py, pz, mat, { target: targets[id], ...options }), group);
    return entry;
  }
  const hemisphere = new THREE.HemisphereLight('#f9f5e6', '#9a8770', 2.15); scene.add(hemisphere);
  const daylight = new THREE.DirectionalLight('#fff0cd', 2.6);
  daylight.position.set(4.5, 7.5, -5.5); daylight.target.position.set(-2, 0, 1); daylight.castShadow = true;
  daylight.shadow.mapSize.set(1024, 1024);
  Object.assign(daylight.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 0.5, far: 30 });
  daylight.shadow.bias = -0.0005; daylight.shadow.normalBias = 0.035; scene.add(daylight, daylight.target);
  const fill = new THREE.PointLight('#ffdfad', 13, 13, 2); fill.position.set(-1, 2.6, 2.7); scene.add(fill);

  block(12, 0.12, 11.2, 0, -0.07, 0, colors.darkWood);
  const floorColors = ['#dbb176', '#e5c38b', '#d6a568', '#edca92'].map(c => material(c));
  for (let row = 0; row < 14; row++) for (let col = 0; col < 6; col++) {
    block(1.985, 0.035, 0.775, -4.99 + col * 2, 0.003, -5.16 + row * 0.79, floorColors[(row * 3 + col) % 4], { shadow: false });
  }
  block(0.18, 3.5, 11.2, -6, 1.7, 0, colors.plaster);
  // The bedroom has its own real opening in the east exterior wall.
  if (!shared) block(0.18, 3.5, 7.9, 6, 1.7, -1.65, colors.plaster);
  else {
    block(0.18, 3.5, 1, 6, 1.7, -5.1, colors.plaster);
    block(0.18, 3.5, 4.9, 6, 1.7, -0.15, colors.plaster);
    block(0.18, 0.8, 2, 6, 0.35, -3.6, colors.plaster);
    block(0.18, 0.55, 2, 6, 3.2, -3.6, colors.plaster);
  }
  block(0.18, 3.5, 0.7, 6, 1.7, 5.25, colors.plaster);
  block(0.18, 0.85, 2.6, 6, 0.375, 3.6, colors.plaster);
  block(0.18, 0.6, 2.6, 6, 3.2, 3.6, colors.plaster);
  block(12, 3.5, 0.18, 0, 1.7, 5.6, colors.plaster);
  block(6.2, 3.5, 0.18, -2.9, 1.7, -5.6, colors.plaster);
  if (!shared) {
    block(1.8, 3.5, 0.18, 5.1, 1.7, -5.6, colors.plaster);
    block(4, 0.82, 0.18, 2.2, 0.36, -5.6, colors.plaster); block(4, 0.55, 0.18, 2.2, 3.21, -5.6, colors.plaster);
  } else {
    block(4, 3.5, 0.18, 2.2, 1.7, -5.6, colors.plaster);
    block(1.8, 0.8, 0.18, 5.1, 3.05, -5.6, colors.wood);
  }
  block(12, 0.13, 11.2, 0, 3.5, 0, colors.white, { shadow: false });
  block(0.08, 0.16, 11.1, -5.87, 0.08, 0, colors.fabric); block(0.08, 0.16, 11.1, 5.87, 0.08, 0, colors.fabric);
  block(11.8, 0.16, 0.08, 0, 0.08, -5.47, colors.fabric);
  collision(-6, 0, 0.24, 11.4); collision(6, 0, 0.24, 11.4);
  collision(shared ? -0.9 : 0, -5.6, shared ? 10.2 : 12.2, 0.24); collision(0, 5.6, 12.2, 0.24);
  // One entire home: a closed bedroom, one living/dining room with an open kitchen,
  // and one enclosed bathroom. A person can walk through each actual doorway.
  function partition(w, d, x, z) { block(w, 3.35, d, x, 1.65, z, colors.plaster); collision(x, z, w, d); }
  partition(0.14, 2.85, 1.5, 4.175); partition(0.14, 1.4, 1.5, 0.85);
  partition(4.5, 0.14, 3.75, 0.15);
  block(0.18, 0.8, 1.2, 1.5, 3.0, 2.15, colors.wood);
  for (const z of [1.53, 2.77]) block(0.2, 2.55, 0.08, 1.5, 1.275, z, colors.wood);
  // Both interior doors are already open for the viewing, folded against walls.
  block(0.065, 2.45, 1.1, 1.625, 1.23, 0.99, colors.wood);
  block(0.025, 1.94, 0.78, 1.675, 1.28, 0.99, colors.fabric);
  block(0.065, 0.07, 0.17, 1.716, 1.15, 0.57, colors.darkWood);
  collision(1.625, 0.99, 0.15, 1.1);
  block(0.035, 0.37, 0.9, 1.385, 2.95, 2.15, signMaterial(shared ? '你的卧室' : '卧室'));
  block(1.15, 0.37, 0.035, 3.3, 2.45, 0.045, signMaterial('客厅', shared ? '厨房与卫浴共同使用' : '整套房屋独用'));
  if (shared) {
    // Two actual roommate bedrooms extend north of the common-room corridor.
    // Their doors remain closed: a viewing does not grant entry into private rooms.
    block(12, 0.12, 6.4, 0, -0.07, -8.8, colors.darkWood);
    block(11.8, 0.035, 6.2, 0, 0.005, -8.8, colors.fabric);
    block(12, 0.13, 6.4, 0, 3.5, -8.8, colors.white, { shadow: false });
    partition(0.18, 6.4, -6, -8.8); partition(0.18, 6.4, 6, -8.8);
    partition(12, 0.18, 0, -12); partition(0.14, 4.7, 0, -9.65);
    for (const [w, x] of [[3.45, -4.275], [1.45, -0.725], [1.65, 0.825], [3.25, 4.375]]) partition(w, 0.14, x, -7.3);
    for (const [index, x] of [-2, 2.2].entries()) {
      block(1.1, 0.8, 0.18, x, 3.0, -7.3, colors.wood);
      block(1.04, 2.5, 0.07, x, 1.25, -7.3, colors.wood);
      block(0.82, 1.8, 0.025, x, 1.3, -7.245, colors.fabric);
      block(0.13, 0.06, 0.06, x + 0.35, 1.15, -7.19, colors.darkWood);
      collision(x, -7.3, 1.1, 0.14);
      block(1.0, 0.35, 0.04, x, 2.87, -7.18, signMaterial(index ? '室友房 B' : '室友房 A', '私人空间 · 请先敲门'));
      const bx = index ? 3.9 : -3.9;
      block(1.8, 0.25, 2.7, bx, 0.2, -10.2, colors.wood);
      block(1.7, 0.22, 2.6, bx, 0.43, -10.2, colors.white);
      block(1.72, 0.1, 1.7, bx, 0.59, -9.8, colors.paleTeal);
      block(0.62, 0.14, 0.38, bx - 0.4, 0.62, -11.15, colors.paper);
      if (caseId === 'shoes' && index) block(0.62, 0.14, 0.38, bx + 0.4, 0.62, -11.15, colors.paper);
      block(1.1, 2.2, 0.6, index ? 1.0 : -1.0, 1.1, -11.4, colors.wood);
      block(1.9, 1.5, 0.025, bx, 2, -11.89, colors.blue);
      for (const dx of [-0.95, 0, 0.95]) block(0.065, 1.6, 0.06, bx + dx, 2, -11.85, colors.white);
    }
    block(1.4, 0.32, 0.04, 5.1, 2.92, -5.43, signMaterial('室友房间 →', '公共走廊'));
    block(5.6, 0.035, 0.65, -0.1, 0.05, -6.45, colors.paleTeal, { shadow: false });
  }
  partition(0.14, 2.25, -3.65, 4.475); partition(1.1, 0.14, -5.45, 3.35);
  block(1.25, 0.8, 0.14, -4.275, 3.0, 3.35, colors.wood);
  for (const x of [-4.9, -3.65]) block(0.08, 2.55, 0.18, x, 1.275, 3.35, colors.wood);
  block(1.08, 2.45, 0.065, -5.45, 1.23, 3.465, colors.wood);
  block(0.8, 1.92, 0.025, -5.45, 1.28, 3.51, colors.fabric);
  block(0.15, 0.065, 0.065, -5.83, 1.15, 3.55, colors.darkWood);
  collision(-5.45, 3.465, 1.08, 0.15);
  block(1.05, 0.32, 0.035, -4.275, 2.94, 3.24, signMaterial('卫生间'));
  block(2.1, 0.025, 2.05, -4.83, 0.042, 4.47, colors.tile);
  for(const x of [-5.68,-5.08])block(.05,.76,.49,x,.4,5.12,colors.white,{target:targets.basin});
  block(.65,.06,.49,-5.38,.08,5.12,colors.white,{target:targets.basin});
  block(.65,.06,.49,-5.38,.77,5.12,colors.white,{target:targets.basin});
  block(.65,.7,.04,-5.38,.4,5.35,colors.white,{target:targets.basin});
  block(.075,.47,.075,-5.38,.5,5.11,colors.metal,{target:targets.basin});
  block(.23,.075,.075,-5.46,.27,5.11,colors.metal,{target:targets.basin});
  const basinDoor=new THREE.Group();basinDoor.position.set(-5.7,0,4.855);scene.add(basinDoor);
  box(basinDoor,.64,.66,.035,.32,.42,0,colors.paleTeal,{target:targets.basin});
  box(basinDoor,.035,.16,.055,.53,.47,-.04,colors.metal,{target:targets.basin});
  block(0.5, 0.04, 0.32, -5.38, 0.81, 5.12, colors.blue, { target: targets.basin });
  block(0.08, 0.25, 0.08, -5.38, 0.95, 5.29, colors.metal, { target: targets.basin });
  block(0.65, 0.85, 0.04, -5.38, 1.75, 5.43, colors.blue, { target: targets.bathroom });
  block(0.58, 0.48, 0.72, -5.25, 0.27, 3.91, colors.white); block(0.58, 0.6, 0.22, -5.25, 0.65, 3.63, colors.white);
  collision(-5.38, 5.12, 0.7, 0.55); collision(-5.25, 3.91, 0.65, 0.85);
  // Walk-in shower, tray, wall controls, and a small vent make the bathroom tangible.
  block(0.9, 0.08, 0.9, -4.19, 0.085, 4.99, colors.white, { target: targets.bathroom });
  block(0.12, 0.012, 0.12, -4.19, 0.135, 4.99, colors.metal, { target: targets.bathroom });
  block(0.055, 1.38, 0.055, -4.18, 1.5, 5.4, colors.metal, { target: targets.bathroom });
  block(0.3, 0.07, 0.28, -4.18, 2.21, 5.27, colors.metal, { target: targets.bathroom });
  block(0.38, 0.25, 0.06, -4.18, 1.18, 5.4, colors.metal, { target: targets.bathroom });
  block(0.42, 0.36, 0.08, -4.2, 2.93, 5.42, colors.white, { target: targets.bathroom });
  for (let i = 0; i < 4; i++) block(0.3, 0.02, 0.02, -4.2, 2.82 + i * 0.07, 5.367, colors.darkTeal, { target: targets.bathroom });
  block(1.35, 2.5, 0.07, -0.4, 1.27, 5.47, colors.darkTeal, { target: targets.door });
  block(0.85, 0.34, 0.04, -0.4, 1.95, 5.41, signMaterial('到家了', shared ? '三间卧室 · 公共客厅' : '一室一厅一卫'), { target: targets.door });
  block(0.06, 0.22, 0.06, 0.1, 1.2, 5.39, colors.metal, { target: targets.door });
  block(1.06, 0.13, 0.48, -1.65, 0.22, 5.13, colors.wood, { target: targets.door });
  for (let i = 0; i < 2; i++) block(0.15, 0.15, 0.3, -1.78 + i * 0.23, 0.36, 5.13, colors.terracotta, { target: targets.door });
  collision(-1.65, 5.13, 1.08, 0.5); block(0.48, 0.16, 0.18, -0.4, 2.87, 5.39, colors.paper);

  const glass = material('#bedde0', { transparent: true, opacity: 0.18, roughness: 0.2, metalness: 0.1 });
  if (!shared) {
  block(3.75, 2.08, 0.035, 2.2, 1.86, -5.56, glass, { target: targets.window, shadow: false });
  for (const x of [0.25, 2.2, 4.15]) block(0.075, 2.23, 0.13, x, 1.86, -5.46, colors.white, { target: targets.window });
  for (const y of [0.75, 1.86, 2.97]) block(4, 0.075, 0.13, 2.2, y, -5.46, colors.white, { target: targets.window });
  block(4.15, 0.12, 0.44, 2.2, 0.75, -5.28, colors.wood, { target: targets.window });
  } else {
    block(0.035, 2.1, 1.85, 5.99, 1.85, -3.6, glass, { target: targets.window, shadow: false });
    for (const z of [-4.6, -3.6, -2.6]) block(0.13, 2.23, 0.075, 5.88, 1.85, z, colors.white, { target: targets.window });
    for (const y of [0.75, 2.97]) block(0.13, 0.075, 2.15, 5.88, y, -3.6, colors.white, { target: targets.window });
    block(0.44, 0.12, 2.2, 5.78, 0.75, -3.6, colors.wood, { target: targets.window });
  }
  const cityMats = ['#a1b4b6', '#c2c9c1', '#9bb1b1'].map(c => material(c));
  const cityWindow = material('#ffe8b6', { emissive: '#ffd78a', emissiveIntensity: 0.1 });
  const bedroomGlass = material('#b8e5e4', { transparent: true, opacity: 0.18, roughness: 0.2 });
  block(0.035, 2.1, 2.48, 5.99, 1.85, 3.6, bedroomGlass, { target: targets.window, shadow: false });
  for (const z of [2.3, 3.6, 4.9]) block(0.12, 2.25, 0.08, 5.88, 1.86, z, colors.wood, { target: targets.window });
  for (const y of [0.77, 2.95]) block(0.12, 0.1, 2.74, 5.88, y, 3.6, colors.wood, { target: targets.window });
  block(0.4, 0.12, 2.85, 5.78, 0.76, 3.6, colors.wood, { target: targets.window });
  for (const z of [2.1, 5.1]) block(0.2, 2.3, 0.25, 5.72, 1.85, z, colors.paleTeal, { target: targets.window });
  block(2, 7, 4.5, 15, 1.2, 2.8, cityMats[1], { pick: false });
  for (let j = 0; j < 5; j++) for (const z of [1.4, 2.8, 4.2]) block(0.02, 0.46, 0.46, 13.98, j * 1.1 - 1.0, z, cityWindow, { pick: false, shadow: false });
  for (let i = 0; i < 7; i++) {
    const x = -8 + i * 3, h = 3 + ((i * 7) % 5);
    block(2.2, h, 2, x, h / 2 - 2.5, -15 - i % 2 * 3, cityMats[i % 3], { pick: false });
    for (let j = 0; j < 4; j++) for (const dx of [-0.6, 0.6]) block(0.38, 0.45, 0.02, x + dx, j * 1.1 - 1.5, -13.98 - i % 2 * 3, cityWindow, { pick: false, shadow: false });
  }
  const sunMaterial = material('#ffe6a0', { emissive: '#ffc75e', emissiveIntensity: 1.2, transparent: true });
  const moonMaterial = material('#d8e7ed', { emissive: '#d8e7ed', emissiveIntensity: 0.7, transparent: true, opacity: 0 });
  const sun = block(1.1, 1.1, 0.12, 5.5, 6.5, -20, sunMaterial, { pick: false, shadow: false });
  const moon = block(0.8, 0.8, 0.12, -2, 4, -20, moonMaterial, { pick: false, shadow: false });

  // Kitchen is fixed architecture. Damp pipes are a clue before the later leak.
  block(4.4, 0.04, 2.3, -3.6, 0.04, -4.4, colors.tile);
  for (const x of [-5.05, -3.65, -2.25]) {
    if(x===-3.65){
      for(const side of [-1,1])block(.06,.91,1.08,x+side*.63,.48,-4.8,colors.teal,{target:targets.sink});
      block(1.32,.07,1.08,x,.07,-4.8,colors.teal,{target:targets.sink});
      block(1.32,.91,.06,x,.48,-5.32,colors.teal,{target:targets.sink});
    }else{
      block(1.32, 0.91, 1.08, x, 0.48, -4.8, colors.teal, { target: targets.sink });
      block(1.2, 0.66, 0.055, x, 0.55, -4.23, colors.paleTeal, { target: targets.sink });
      block(0.29, 0.045, 0.065, x + 0.28, 0.76, -4.18, colors.metal, { target: targets.sink });
    }
  }
  const sinkDoor=new THREE.Group();sinkDoor.position.set(-4.25,0,-4.19);scene.add(sinkDoor);
  box(sinkDoor,1.2,.74,.045,.6,.52,0,colors.paleTeal,{target:targets.sink});
  box(sinkDoor,.22,.045,.055,.96,.76,.045,colors.metal,{target:targets.sink});
  block(4.25, 0.13, 1.23, -3.65, 1.0, -4.77, colors.white, { target: targets.sink });
  block(1.05, 0.07, 0.72, -3.65, 1.075, -4.7, colors.metal, { target: targets.sink });
  block(0.85, 0.025, 0.5, -3.65, 1.118, -4.7, colors.black, { target: targets.sink });
  block(0.11, 0.38, 0.11, -3.65, 1.25, -5.13, colors.metal, { target: targets.sink });
  block(0.11, 0.08, 0.29, -3.65, 1.46, -5.01, colors.metal, { target: targets.sink });
  block(0.1, 0.67, 0.1, -3.65, 0.54, -4.55, colors.metal, { target: targets.sink });
  block(0.32, 0.1, 0.1, -3.54, 0.21, -4.55, colors.metal, { target: targets.sink });
  collision(-3.65, -4.77, 4.25, 1.23);
  block(0.7, 0.045, 0.64, -5, 1.09, -4.75, colors.black,{target:targets.stove});
  block(0.32, 0.29, 0.3, -4.98, 1.25, -4.75, colors.terracotta,{target:targets.stove}); block(0.24, 0.055, 0.26, -4.98, 1.42, -4.75, colors.black,{target:targets.stove});
  for (const x of [-5, -3.65, -2.3]) {
    block(1.24, 0.68, 0.43, x, 2.4, -5.25, colors.white); block(0.045, 0.24, 0.065, x + 0.42, 2.32, -5.0, colors.metal);
  }
  block(1.02,.17,.65,-5,1.96,-5.06,colors.metal,{target:targets.stove});
  for(let i=0;i<6;i++)block(.045,.02,.38,-5.35+i*.14,1.86,-5.02,colors.black,{target:targets.stove});
  block(1.2, 0.36, 0.04, -3.65, 1.83, -5.44, signMaterial('厨房', '试一次水，再安心做饭'));
  const damp = block(0.64, 0.018, 0.55, -3.6, 0.07, -3.98, material('#648f8d', { transparent: true, opacity: 0.52 }), { pick: false, shadow: false });
  const waterMat = material('#69b7c6', { transparent: true, opacity: 0.64, roughness: 0.15 });
  const water = block(1.9, 0.025, 1.65, -3.57, 0.075, -3.47, waterMat, { pick: false, shadow: false }); water.visible = false;
  const drops = Array.from({ length: 7 }, (_, i) => {
    const drop = block(0.055, 0.09, 0.055, -3.47 + (i % 3) * 0.08, 0.3, -4.05, waterMat, { pick: false, shadow: false }); drop.visible = false; return drop;
  });
  const basinWater=block(.65,.018,.67,-5.35,.072,4.77,waterMat,{pick:false,shadow:false});basinWater.visible=false;
  const basinDrops=Array.from({length:3},(_,i)=>{const drop=block(.04,.07,.04,-5.4+i*.04,.4,5.06,waterMat,{pick:false,shadow:false});drop.visible=false;return drop;});
  // Shared cast direction drives both 3D silhouettes and the dialogue portraits.
  function buildActor(x,z,target,profile,{register=true}={}) {
    const actor=getCharacter(profile),group=new THREE.Group();group.position.set(x,0,z);scene.add(group);
    const shirt=material(actor.shirt),hair=material(actor.hair),skin=material(actor.skin),trousers=material(actor.trousers);
    const p=(w,h,d,px,py,pz,mat)=>box(group,w,h,d,px,py,pz,mat,{target});
    const female=actor.gender==='女',shoulder=female?.51:.58,arm=female?.35:.39;
    p(shoulder,.7,.32,0,1.05,0,shirt);
    if(actor.outfit==='jacket'){
      p(.13,.43,.023,0,1.15,.17,colors.paper);
      for(const side of [-1,1]){const lapel=p(.09,.29,.025,side*.12,1.24,.185,shirt);lapel.rotation.z=side*.22;}
      p(.08,.12,.026,.17,1.13,.18,colors.terracotta);
    }else p(.21,.07,.023,0,1.37,.175,colors.fabric);
    for(const side of [-1,1]){
      p(.19,.54,.25,side*arm,1.06,0,shirt);p(.17,.19,.23,side*arm,.72,.02,skin);
      p(.21,.55,.26,side*.16,.4,0,trousers);p(.24,.14,.36,side*.16,.09,.045,colors.darkWood);
    }
    const head=new THREE.Group();head.position.y=1.64;group.add(head);
    const face=(w,h,d,px,py,pz,mat)=>box(head,w,h,d,px,py,pz,mat,{target});
    face(female?.38:.42,.4,.37,0,.02,0,skin);face(female?.3:.36,.08,.32,0,-.19,.01,skin);
    face(.44,.13,.42,0,.26,-.015,hair);
    if(['bob','shortbob','long'].includes(actor.hairStyle)){
      const length=actor.hairStyle==='long'?.66:actor.hairStyle==='bob'?.4:.29;
      for(const side of [-1,1])face(.09,length,.34,side*.22,.2-length/2,-.035,hair);
      face(.43,length,.1,0,.2-length/2,-.21,hair);
    }else if(actor.hairStyle==='ponytail'){
      face(.43,.29,.12,0,.13,-.2,hair);face(.22,.48,.2,.12,-.08,-.3,hair);face(.24,.065,.21,.12,.1,-.3,shirt);
    }else if(actor.hairStyle==='bun'){
      face(.43,.28,.11,0,.13,-.2,hair);face(.25,.2,.22,0,.39,-.13,hair);
    }else face(.43,.18,.1,0,.14,-.2,hair);
    if(actor.hairStyle==='sidepart'){
      face(.27,.14,.055,-.075,.18,.2,hair);face(.12,.07,.055,.14,.22,.2,hair);
    }else{
      face(.23,.1,.055,-.08,.2,.2,hair);face(.09,.14,.06,-.17,.15,.19,hair);
    }
    const eyes=[-1,1].map(side=>face(.048,.055,.018,side*.09,.06,.197,colors.black));
    const brows=[-1,1].map(side=>face(.075,.021,.02,side*.09,.13,.204,hair));
    const mouth=face(.11,.025,.022,0,-.1,.2,colors.darkWood);
    const smileCorners=[-1,1].map(side=>face(.025,.035,.024,side*.063,-.085,.204,colors.darkWood));
    const sweat=face(.032,.065,.02,.17,.02,.208,colors.blue);sweat.visible=false;
    smileCorners.forEach(corner=>{corner.visible=false;});
    if(actor.accessory==='cap'){face(.55,.055,.48,0,.31,.03,colors.fabric);face(.4,.14,.36,0,.4,-.01,colors.fabric);face(.41,.03,.37,0,.34,-.01,shirt);}
    if(actor.accessory==='earrings')for(const side of [-1,1])face(.035,.075,.035,side*.22,-.09,.03,colors.fabric);
    if(actor.accessory==='glasses'){
      for(const side of [-1,1]){face(.12,.015,.023,side*.09,.095,.218,colors.darkWood);face(.12,.015,.023,side*.09,.025,.218,colors.darkWood);for(const edge of [-1,1])face(.015,.08,.023,side*.09+edge*.055,.06,.218,colors.darkWood);}
      face(.065,.015,.023,0,.075,.218,colors.darkWood);
    }
    const result={group,head,eyes,brows,mouth,smileCorners,sweat,profile:actor,expression:'neutral'};
    if(register)actors.set(target.id,result);
    collision(x,z,.92,.48,group);return result;
  }
  const hostActor=buildActor(-.15,-1.1,targets.landlord,caseConfig.host||{name:'小陈',role:'带看中介'});
  const {group:person,head,eyes,brows,mouth,smileCorners,sweat}=hostActor;
  addFurniture('desk', 3.25, -0.75, 1.8, 1.05, 0.9, part => {
    part(1.8, 0.13, 1.05, 0, 0.81, 0, colors.wood);
    for (const x of [-0.73, 0.73]) for (const z of [-0.37, 0.37]) part(0.11, 0.75, 0.11, x, 0.38, z, colors.darkWood);
    part(0.45, 0.025, 0.72, 0, 0.9, 0, colors.paper);
    for (let i = 0; i < 5; i++) part(0.31 - (i % 2) * 0.07, 0.008, 0.018, 0, 0.917, -0.19 + i * 0.09, colors.teal, { shadow: false });
    part(0.025, 0.025, 0.34, 0.34, 0.91, -0.01, colors.terracotta);
    part(0.42, 0.027, 0.66, -0.59, 0.91, 0.04, colors.paper, { target: targets.bill });
    for (let i = 0; i < 4; i++) part(0.27, 0.008, 0.021, -0.59, 0.929, -0.13 + i * 0.11, i === 3 ? colors.terracotta : colors.darkTeal, { target: targets.bill, shadow: false });
    part(0.25, 0.05, 0.43, 0.62, 0.92, -0.01, colors.black, { target: targets.owner });
    part(0.21, 0.012, 0.35, 0.62, 0.953, -0.01, colors.paleTeal, { target: targets.owner, shadow: false });
    part(0.09, 0.008, 0.09, 0.62, 0.962, 0.045, colors.darkTeal, { target: targets.owner, shadow: false });
  });
  addFurniture('chair', 3.25, -1.8, 0.6, 0.62, 0.7, part => {
    part(0.55, 0.08, 0.55, 0, 0.48, 0, colors.teal); part(0.55, 0.58, 0.08, 0, 0.8, -0.25, colors.teal);
    for (const x of [-0.22, 0.22]) for (const z of [-0.22, 0.22]) part(0.07, 0.47, 0.07, x, 0.23, z, colors.darkWood);
  });
  addFurniture('bed', 4.4, 3.8, 2.4, 2.96, 0.65, part => {
    part(2.35, 0.3, 2.8, 0, 0.22, 0, colors.wood); part(2.2, 0.25, 2.65, 0, 0.49, 0, colors.white);
    part(2.22, 0.13, 1.7, 0, 0.65, -0.47, colors.paleTeal); part(0.8, 0.18, 0.43, 0, 0.67, 0.92, colors.paper);
    part(2.4, 1.05, 0.15, 0, 0.56, 1.4, colors.darkTeal);
  });
  block(0.55, 0.65, 0.62, 2.7, 0.33, 4.7, colors.wood); block(0.18, 0.4, 0.18, 2.7, 0.84, 4.7, colors.metal);
  block(0.42, 0.25, 0.4, 2.7, 1.13, 4.7, colors.paper); collision(2.7, 4.7, 0.55, 0.62);
  const wardrobe = addFurniture('cabinet', 5.25, 1.1, 1.2, 1.16, 1.25, part => {
    // A real hollow wardrobe with anchored back, shelves, and hinged doors.
    part(0.07, 2.35, 1.12, 0.51, 1.18, 0, colors.wood);
    for (const z of [-0.55, 0.55]) part(1.14, 2.35, 0.07, 0, 1.18, z, colors.wood);
    for (const y of [0.16, 0.88, 1.55, 2.39]) part(1.14, 0.08, 1.14, 0, y, 0, colors.wood);
    part(0.14, 0.07, 0.22, 0.6, 2.29, 0, colors.metal);
    part(0.48, 0.11, 0.6, -0.03, 1.65, 0, colors.paleTeal);
    part(0.42, 0.1, 0.53, -0.02, 1.75, 0, colors.fabric);
  });
  for (const side of [-1, 1]) {
    const hinge = new THREE.Group(); hinge.position.set(-0.59, 0, side * 0.55); wardrobe.group.add(hinge);
    box(hinge, 0.06, 2.15, 0.54, 0, 1.22, -side * 0.27, colors.fabric, { target: targets.cabinet });
    box(hinge, 0.035, 1.82, 0.42, -0.045, 1.22, -side * 0.27, colors.wood, { target: targets.cabinet });
    box(hinge, 0.09, 0.32, 0.035, -0.08, 1.22, -side * 0.45, colors.darkWood, { target: targets.cabinet });
    cabinetDoors.push({ hinge, side });
  }
  addFurniture('sofa', -5.1, 1.3 + loungeShift, 1.28, 2.77, 0.68, part => {
    for (const x of [-0.4, 0.45]) for (const z of [-1.1, 1.1]) part(0.11, 0.24, 0.11, x, 0.13, z, colors.darkWood);
    part(1.05, 0.38, 2.55, 0.03, 0.43, 0, colors.paleTeal); part(0.25, 1.0, 2.72, -0.5, 0.8, 0, colors.teal);
    for (const z of [-1.22, 1.22]) part(1.12, 0.7, 0.22, 0.03, 0.6, z, colors.teal);
    part(0.28, 0.48, 0.55, -0.22, 0.9, -0.8, colors.terracotta); part(0.7, 0.09, 1.03, 0.14, 0.66, 0.55, colors.paper);
  });
  block(2.8, 0.02, 3.3, -2.8, 0.044, 1.55 + loungeShift, colors.terracotta, { shadow: false });
  for (const x of [-4.06, -1.54]) block(0.045, 0.006, 3.05, x, 0.058, 1.55 + loungeShift, colors.paper, { shadow: false });
  addFurniture('coffee', -2.95, 1.45 + loungeShift, 0.68, 0.62, 0.58, part => {
    part(0.68, 0.09, 0.62, 0, 0.57, 0, colors.wood);
    for (const x of [-0.25, 0.25]) for (const z of [-0.22, 0.22]) part(0.06, 0.53, 0.06, x, 0.28, z, colors.darkWood);
    part(0.28, 0.04, 0.22, -0.01, 0.64, 0.01, colors.teal);
  });
  function plantParts(part) {
    part(0.42, 0.42, 0.42, 0, 0.21, 0, colors.terracotta); part(0.08, 0.9, 0.08, 0, 0.72, 0, colors.darkWood);
    part(0.6, 0.43, 0.53, 0.12, 1.02, 0, colors.leaf); part(0.45, 0.4, 0.48, -0.15, 1.32, -0.04, colors.lightLeaf);
  }
  addFurniture('plant', shared ? 0.8 : 5.2, shared ? -3.4 : -4.6, 0.48, 0.36, 0.55, part => plantParts((w, h, d, x, y, z, mat) => part(w * 0.6, h * 0.6, d * 0.6, x * 0.6, y * 0.6, z * 0.6, mat)));
  const sillPlant = new THREE.Group(); sillPlant.position.set(0.75, 0.82, -5.23); sillPlant.scale.setScalar(0.34); scene.add(sillPlant);
  plantParts((w, h, d, x, y, z, mat) => box(sillPlant, w, h, d, x, y, z, mat, { target: targets.window }));
  if (shared) sillPlant.position.set(5.72, 0.82, -4.37);
  // Moisture was already present on the lower back panel. Opening the doors
  // reveals it; the heavy, wall-anchored wardrobe never has to be pushed aside.
  const wallDamp = new THREE.Group(); wallDamp.position.set(5.715, 0, 1.1); scene.add(wallDamp);
  const wallDampMaterial = material('#718057', { transparent: true, opacity: 0.83 });
  for (const [y, z, h, d] of [[0.35, 0.02, 0.31, 0.7], [0.52, -0.16, 0.28, 0.27], [0.6, 0.13, 0.19, 0.23]]) box(wallDamp, 0.012, h, d, 0, y, z, wallDampMaterial, { pick: false, shadow: false });
  box(wallDamp, 0.32, 0.012, 0.28, -0.14, 0.205, 0.15, wallDampMaterial, { pick: false, shadow: false });
  const dampSpread = new THREE.Group(); scene.add(dampSpread);
  for (const [y, z, h, d] of [[0.55, 1.76, 0.82, 0.18], [0.27, 1.95, 0.34, 0.27], [1.04, 1.72, 0.3, 0.16]]) box(dampSpread, 0.018, h, d, 5.884, y, z, wallDampMaterial, { pick: false, shadow: false });
  box(dampSpread, 0.56, 0.011, 0.025, 5.48, 0.28, 1.691, wallDampMaterial, { pick: false, shadow: false });
  dampSpread.visible = false;
  const oldScratches = new THREE.Group(); scene.add(oldScratches);
  const scratchMaterial = material('#926335');
  for (let i = 0; i < 5; i++) {
    const mark = box(oldScratches, 0.011, 0.005, 0.17 + i % 3 * 0.035, -4.6 + i * 0.033, 0.027, 0.38 + i % 2 * 0.09, scratchMaterial, { pick: false, shadow: false });
    mark.rotation.y = -0.3 + i * 0.1;
  }
  const inspectionLamp = new THREE.PointLight('#ffdf9b', 3, 2.8, 2); inspectionLamp.position.set(-3.92, 0.76, 0.15); inspectionLamp.visible = false; scene.add(inspectionLamp);
  const inspectionPhone = new THREE.Group(); camera.add(inspectionPhone); scene.add(camera);
  inspectionPhone.position.set(-0.35, -0.31, -0.69); inspectionPhone.rotation.set(-0.2, 0.3, 0.12); inspectionPhone.visible = false;
  box(inspectionPhone, 0.16, 0.27, 0.025, 0, 0, 0, colors.black, { pick: false, shadow: false });
  box(inspectionPhone, 0.13, 0.21, 0.008, 0, 0.005, 0.018, colors.paper, { pick: false, shadow: false });
  box(inspectionPhone, 0.07, 0.09, 0.01, 0, 0.01, 0.026, colors.terracotta, { pick: false, shadow: false });
  box(inspectionPhone, 0.18, 0.09, 0.1, 0, -0.13, -0.01, colors.skin, { pick: false, shadow: false });
  block(0.07, 1.05, 1.65, -5.85, 2.17, 1.3, colors.darkWood); block(0.03, 0.88, 1.48, -5.8, 2.17, 1.3, colors.paper);
  block(0.035, 0.5, 0.55, -5.77, 2.05, 1.0, colors.teal); block(0.035, 0.32, 0.38, -5.77, 2.4, 1.55, colors.terracotta);
  block(0.48, 0.1, 0.48, 0, 3.38, 1.5, colors.paper); block(0.055, 0.6, 0.055, 3.25, 3.05, -0.75, colors.black);
  block(0.7, 0.2, 0.55, 3.25, 2.7, -0.75, colors.terracotta);

  // Each investigation has physical materials of its own. They are deliberately
  // separate from the signing table so their raycasts cannot hide one another.
  const propViews = {}, campaignVisuals = {}, extraResidents = [];
  const alertMat = signMaterial('待核对', '请对照原始材料');
  const confirmedMat = signMaterial('有记录', '按双方确认的内容核对');
  const quietMat = signMaterial('看房手记', '尚未签署的资料');
  const calendarMaterials = new Map();
  function prop(id, position, from, draw) {
    const group = new THREE.Group(); group.position.set(...position); scene.add(group);
    const part = (w, h, d, x, y, z, mat, options = {}) => box(group, w, h, d, x, y, z, mat, { target: targets[id], ...options });
    draw(part, group); propViews[id] = { from, to: position }; return group;
  }
  function resident(x,z,color,target=targets.roommate,profile=null,register=true) {
    return buildActor(x,z,target,profile||caseConfig.roommate||{name:'阿宁',role:'室友'},{register}).group;
  }
  prop('fridge',[-.82,.95,-4.85],[.05,1.65,-3.15],p=>{
    p(.8,1.86,.73,0,0,0,colors.white);p(.73,.54,.04,0,.57,.39,colors.blue);p(.73,1.12,.04,0,-.32,.39,colors.white);
    p(.055,.3,.08,.26,.5,.44,colors.metal);p(.055,.35,.08,.26,-.14,.44,colors.metal);
    p(.29,.31,.02,-.15,.55,.42,signMaterial('能效','查看标签与年限'));
    p(.33,.2,.02,-.12,-.12,.42,signMaterial('清洁记录','先征得同意'));
  });
  collision(-.82,-4.85,.82,.78);
  prop('aircon',[3.15,2.88,.32],[2.5,1.65,1.6],p=>{
    p(1.25,.42,.34,0,0,0,colors.white);p(1.11,.06,.025,0,-.12,.19,colors.black);
    for(let i=0;i<6;i++)p(.025,.045,.025,-.45+i*.18,-.1,.21,colors.metal);
    p(.21,.22,.02,.44,.035,.19,signMaterial('能效','年限待核对'));
  });
  prop('wall',[1.365,1.64,4.68],[.1,1.65,4.3],p=>{
    p(.03,.75,.49,0,0,0,colors.wood);p(.025,.64,.4,-.03,0,0,colors.paper);
    p(.025,.15,.35,-.05,.2,0,signMaterial('户型核对'));
    for(const z of [-.1,.1])p(.025,.26,.025,-.05,-.08,z,colors.teal);
    p(.025,.025,.25,-.05,-.08,0,colors.teal);
  });
  // A real low shelf gives posture a spatial purpose. It is open underneath,
  // but standing up there would intersect its board; the headroom test prevents it.
  block(.68,.08,.52,1.08,1.46,4.63,colors.wood,{target:targets.wall});
  block(.12,.07,.46,1.35,1.38,4.63,colors.darkWood,{target:targets.wall});
  propViews.stove={from:[-4.8,1.65,-2.8],to:[-5,1.25,-4.75]};
  propViews.basin={from:[-4.4,1.65,4.25],to:[-5.38,.61,4.86]};
  if (!originalCase) {
    block(1.0,.1,.55,-1.65,.75,3.65,colors.wood);
    for(const x of [-2.05,-1.25])block(.08,.74,.42,x,.37,3.65,colors.darkWood);
    collision(-1.65,3.65,1.0,.55);
    prop('phone',[-1.65,.83,3.65],[.1,1.65,3.4],p=>{
      p(.32,.035,.55,0,0,0,colors.black);p(.27,.012,.45,0,.025,0,colors.blue);
      p(.18,.008,.04,0,.035,-.13,colors.paper);p(.055,.008,.18,-.06,.035,.02,colors.teal);p(.14,.008,.045,.02,.035,.09,colors.terracotta);
    });
    block(.8,.25,.035,-1.65,.57,3.35,signMaterial('房源 · 路线'),{target:targets.phone});
    block(1.4,.12,.82,2.65,.79,-3.8,colors.wood);collision(2.65,-3.8,1.4,.82);
    for(const x of [2.1,3.2])for(const z of [-4.08,-3.52])block(.08,.75,.08,x,.38,z,colors.darkWood);
    prop('folder',[2.65,.91,-3.8],[2.55,1.65,-2.35],p=>{
      p(.82,.08,.6,0,0,0,colors.teal);p(.7,.015,.52,.03,.05,.01,colors.paper);
      for(let i=0;i<4;i++)p(.45,.008,.02,.03,.063,-.12+i*.08,colors.darkWood);
      campaignVisuals.authority=p(.48,.02,.22,.1,.075,.15,quietMat);
    });
    prop('meter',[5.79,1.64,-1.75],[4.65,1.65,-2.65],p=>{
      p(.18,.75,.73,0,0,0,colors.metal);p(.025,.46,.55,-.105,.05,0,colors.white);
      p(.025,.16,.42,-.125,.16,0,signMaterial('00182','本户表计'));
      for(const z of [-.16,0,.16])p(.03,.05,.05,-.125,-.12,z,colors.teal);
      p(.09,.45,.09,0,-.58,0,colors.metal);
    });
    prop('calendar',[1.36,1.85,4.05],[.05,1.65,3.45],p=>{
      p(.1,1.03,.82,0,0,0,colors.wood);p(.025,.9,.7,-.065,0,0,colors.paper);
      campaignVisuals.calendar=p(.025,.31,.62,-.087,.22,0,signMaterial('入住计划',caseConfig.leaseType==='short'?'先对照实习日期':'先对照合同日期'));
      campaignVisuals.calendarInitial=campaignVisuals.calendar.material;
      for(let y=0;y<3;y++)for(let z=0;z<5;z++)p(.025,.09,.08,-.087,-.08-y*.14,-.24+z*.12,(y+z)%3?colors.fabric:colors.teal);
      campaignVisuals.calendarFlag=p(.035,.12,.16,-.11,-.08,.12,colors.terracotta);campaignVisuals.calendarFlag.visible=false;
    });
    prop('notice',[-5.82,1.85,-2.25],[-3.8,1.65,-2.1],p=>{
      p(.1,1.18,1.35,0,0,0,colors.wood);p(.025,1.03,1.2,.065,0,0,colors.fabric);
      p(.025,.3,1.1,.085,.31,0,signMaterial(shared?'共同生活留言板':'房屋交接备忘'));
      campaignVisuals.rules=p(.025,.52,1.05,.086,-.19,0,quietMat);
    });
    prop('shoes',[-1.65,.44,5.12],[-2.9,1.65,4.3],p=>{
      p(1.08,.08,.5,0,.07,0,colors.wood);p(1.08,.08,.5,0,.45,0,colors.wood);
      for(const x of [-.48,.48])p(.07,.68,.45,x,.18,0,colors.darkWood);
      const pairs=shared?(caseId==='shoes'?4:3):1;
      for(let i=0;i<pairs;i++)for(const dx of [-.07,.07])p(.12,.1,.28,-.34+(i%3)*.34+dx,i<3?.16:.54,-.02,i%2?colors.teal:colors.terracotta);
    });
    campaignVisuals.bill=new THREE.Group();scene.add(campaignVisuals.bill);
    box(campaignVisuals.bill,1.2,.66,.07,2.65,1.55,-4.05,colors.wood,{target:targets.bill});
    campaignVisuals.billFace=box(campaignVisuals.bill,1.07,.53,.025,2.65,1.55,-4.0,alertMat,{target:targets.bill});campaignVisuals.bill.visible=false;
    const packed=new THREE.Group();scene.add(packed);campaignVisuals.packed=packed;
    box(packed,.72,.55,.65,.75,.3,4.9,colors.wood,{target:targets.door});box(packed,.12,.018,.65,.75,.587,4.9,colors.paper,{target:targets.door});
    box(packed,.52,.38,.5,.78,.79,4.9,colors.fabric,{target:targets.door});box(packed,.28,.16,.02,.78,.8,4.635,signMaterial('行李'),{target:targets.door});collision(.75,4.9,.75,.7,packed);packed.visible=false;
    const keyTray=new THREE.Group();scene.add(keyTray);campaignVisuals.keys=keyTray;
    box(keyTray,.48,.04,.3,-1.32,.83,3.65,colors.terracotta,{target:targets.door});
    for(const z of [3.6,3.7]){box(keyTray,.16,.02,.055,-1.32,.87,z,colors.metal,{target:targets.door});box(keyTray,.06,.02,.08,-1.24,.87,z,colors.metal,{target:targets.door});}keyTray.visible=false;
    if(shared){
      const roomie=resident(-1.25,-3.0,colors.terracotta);campaignVisuals.roommate=roomie;
      propViews.roommate={from:[-1.3,1.65,-1.35],to:[-1.25,1.5,-3]};
      for(const [i,x]of (caseId==='shoes'?[-2.2,-.2]:[-2.2]).entries()){const extra=resident(x,-3.0, i?colors.teal:colors.paleTeal,targets.roommate,{name:i?'邻居阿玉':'邻居小林',role:'现住室友'},false);extra.visible=false;extraResidents.push(extra);}
      for(let i=0;i<3;i++){block(.28,.18,.3,-5.0+i*.4,1.15,-4.4,i%2?colors.paper:colors.terracotta,{target:targets.sink});block(.18,.018,.12,-5.0+i*.4,1.25,-4.4,colors.paleTeal,{target:targets.sink});}
      block(.75,.3,.035,-3.65,1.82,-5.39,signMaterial('公共厨房','冰箱分层 · 用后清理'),{target:targets.sink});
    }
    if(['keys','transfer','summer'].includes(caseId)){
      const friend=resident(-1.5,1.35,material('#a7799d'),targets.friend,caseConfig.friend||{name:({keys:'小满',transfer:'小周',summer:'小晴'}[caseId]),role:'介绍人'});campaignVisuals.friend=friend;
      box(friend,.27,.34,.18,.4,.72,.05,colors.paper,{target:targets.friend});
      box(friend,.04,.38,.05,.4,1.03,.05,colors.darkWood,{target:targets.friend});
      box(friend,.3,.16,.025,0,1.15,.17,signMaterial(caseConfig.friend?.name||({keys:'小满',transfer:'小周',summer:'小晴'}[caseId])),{target:targets.friend});
      propViews.friend={from:[-.8,1.65,2.9],to:[-1.5,1.55,1.35]};
    }
    // Case-specific details make the home recognisable before any dialogue opens.
    const accent=themeIndex%2?colors.paleTeal:colors.terracotta;
    for(let i=0;i<2+themeIndex;i++)block(.18,.24+(i%2)*.08,.3,2.0+i*.2,.96,-4.02,accent,{target:targets.folder});
    block(1.6,.42,.035,-.65,2.55,-5.43,signMaterial('房源资料',caseConfig.rent?`${shared?'卧室':'整套'} ${caseConfig.rent} 元 / 月`:shared?'独用卧室 · 共用厨卫':'一人整租 · 整套独用'));
  }
  function updateCampaignEffects() {
    if(originalCase)return;
    campaignVisuals.authority.material=storyEffects.authorityAlert?alertMat:storyDay?confirmedMat:quietMat;
    campaignVisuals.bill.visible=storyDay>0;
    campaignVisuals.billFace.material=storyEffects.billAlert?alertMat:confirmedMat;
    campaignVisuals.rules.material=storyEffects.rulesVisible?confirmedMat:quietMat;
    campaignVisuals.calendarFlag.visible=Boolean(storyEffects.calendarAlert);
    if(storyDay){
      const key=`${storyDay}:${Boolean(storyEffects.calendarAlert)}`;
      if(!calendarMaterials.has(key))calendarMaterials.set(key,signMaterial(`第 ${storyDay} 天`,storyEffects.calendarAlert?'日期还需核对':'翻到入住后的这一页'));
      campaignVisuals.calendar.material=calendarMaterials.get(key);
    }else campaignVisuals.calendar.material=campaignVisuals.calendarInitial;
    campaignVisuals.packed.visible=Boolean(storyEffects.packed);
    campaignVisuals.keys.visible=Boolean(storyEffects.keysReady);
    extraResidents.forEach(person=>{person.visible=Boolean(storyEffects.sharedBusy);});
  }

  function positionOf(entry) { return { x: entry.group.position.x, z: entry.group.position.z, rotation: entry.group.rotation.y }; }
  function footprint(entry, position = positionOf(entry)) {
    // The opened wardrobe doors occupy space in front of the cabinet too.
    const doorReach = entry.id === 'cabinet' ? Math.sin(cabinetOpenAmount * Math.PI / 2) * 0.54 : 0;
    return { ...position, x: position.x - doorReach / 2, width: entry.width + doorReach, depth: entry.depth };
  }
  function axes(rect) { const c = Math.cos(rect.rotation), s = Math.sin(rect.rotation); return [[c, -s], [s, c]]; }
  function rectanglesOverlap(a, b) {
    const aa = axes(a), bb = axes(b);
    return [...aa, ...bb].every(([x, z]) => {
      const radius = rect => {
        const local = axes(rect);
        return Math.abs(local[0][0] * x + local[0][1] * z) * rect.width / 2 + Math.abs(local[1][0] * x + local[1][1] * z) * rect.depth / 2;
      };
      return Math.abs((a.x - b.x) * x + (a.z - b.z) * z) < radius(a) + radius(b) - 0.001;
    });
  }
  function circleOverlaps(x, z, radius, rect) {
    const c = Math.cos(rect.rotation), s = Math.sin(rect.rotation);
    const localX = (x - rect.x) * c - (z - rect.z) * s, localZ = (x - rect.x) * s + (z - rect.z) * c;
    const dx = Math.max(Math.abs(localX) - rect.width / 2, 0), dz = Math.max(Math.abs(localZ) - rect.depth / 2, 0);
    return dx * dx + dz * dz < radius * radius;
  }
  const headroomBox=new THREE.Box3(),headroomSize=new THREE.Vector3(),headroomCenter=new THREE.Vector3();
  function hasHeadroom(x,z,eyeHeight=1.65) {
    scene.updateMatrixWorld(true);
    const top=eyeHeight+.17;
    for(const mesh of pickables){
      let visible=true;for(let parent=mesh;parent;parent=parent.parent)if(!parent.visible){visible=false;break;}
      if(!visible)continue;
      headroomBox.setFromObject(mesh);
      if(headroomBox.min.y>=top||headroomBox.max.y<=.22)continue;
      headroomBox.getSize(headroomSize);headroomBox.getCenter(headroomCenter);
      if(circleOverlaps(x,z,playerRadius,{x:headroomCenter.x,z:headroomCenter.z,width:headroomSize.x,depth:headroomSize.z,rotation:0}))return false;
    }
    return true;
  }
  function isFree(x, z, eyeHeight=1.65) {
    if (Math.abs(x) > 5.6 || z > 5.2 || z < (shared ? -11.6 : -5.2)) return false;
    if(shared && z < -6.97)return false; // The two occupied rooms require permission; their doors stay closed.
    if (staticColliders.some(rect => (!rect.owner || rect.owner.visible) && circleOverlaps(x, z, playerRadius, rect))) return false;
    return ![...furniture.values()].some(entry => entry.group.visible && circleOverlaps(x, z, playerRadius, footprint(entry)))&&hasHeadroom(x,z,eyeHeight);
  }
  function setPosture(mode,{safeReset=false}={}) {
    if(!Object.hasOwn(postureHeights,mode))return {ok:false,posture,reason:'这个姿态不可用。'};
    const height=postureHeights[mode];
    if(!isFree(camera.position.x,camera.position.z,height)){
      if(!safeReset)return {ok:false,posture,reason:'头顶或身边空间不足，移到开阔处再站起。'};
      const spot=findSafeSpot([camera.position.x,camera.position.z],height)||findSafeSpot([0,4.3],height);
      if(!spot)return {ok:false,posture,reason:'先回到开阔处再调整姿态。'};
      camera.position.x=spot[0];camera.position.z=spot[1];onMove({x:spot[0],z:spot[1]});
    }
    posture=mode;desiredEyeHeight=height;currentView='walk';keys.clear();
    if(reducedMotion||safeReset)camera.position.y=height;
    updateProjection();updateEvidence();updateTarget();onPosture(posture);
    return {ok:true,posture};
  }
  function resetPosture(){return setPosture('standing',{safeReset:true});}
  function setReducedMotion(value){reducedMotion=Boolean(value);if(reducedMotion&&currentView==='walk')camera.position.y=desiredEyeHeight;}
  function staticConflict(entry, position) {
    const rect = footprint(entry, position), c = Math.abs(Math.cos(position.rotation)), s = Math.abs(Math.sin(position.rotation));
    if (Math.abs(position.x) + (entry.width * c + entry.depth * s) / 2 > 5.87 || Math.abs(position.z) + (entry.width * s + entry.depth * c) / 2 > 5.47) return '会碰到墙壁，请换个方向。';
    if (staticColliders.some(other => (!other.owner || other.owner.visible) && rectanglesOverlap(rect, other))) return '这里有墙、固定设施或带看人，暂时挪不过去。';
    return null;
  }
  function movementConflict(entry, position) {
    const reason = staticConflict(entry, position); if (reason) return reason;
    const rect = footprint(entry, position);
    if ([...furniture.values()].some(other => other.id !== entry.id && other.group.visible && rectanglesOverlap(rect, footprint(other)))) return '会碰到旁边的家具，换个方向试试。';
    if (circleOverlaps(camera.position.x, camera.position.z, playerRadius, rect)) return '这个位置被你挡住了，先退开一点再移动。';
    return null;
  }
  function normalizeRotation(value) { return ((value % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2); }
  function setFurniturePosition(entry, position) { entry.group.position.set(position.x, 0, position.z); entry.group.rotation.y = normalizeRotation(position.rotation); }
  function getFurniture(id) {
    const entry = furniture.get(id);
    return entry ? { id, title: entry.title, movable: entry.movable, ...(entry.movable ? {} : { reason: '家具较重，先检查边角和原有记录。' }), ...positionOf(entry) } : null;
  }
  function moveFurniture(id, { dx = 0, dz = 0, rotate = 0, reset = false } = {}) {
    const entry = furniture.get(id);
    if (!entry) return { ok: false, reason: '这件物品不能移动。', position: null };
    const current = positionOf(entry);
    if (!entry.movable) return { ok: false, reason: '家具较重，先检查边角和原有记录。', position: current };
    if (disposed || ![dx, dz, rotate].every(Number.isFinite)) return { ok: false, reason: '移动参数无效。', position: current };
    const destination = reset ? { ...entry.origin } : { x: current.x + dx, z: current.z + dz, rotation: current.rotation + rotate };
    const turn = reset ? Math.atan2(Math.sin(destination.rotation - current.rotation), Math.cos(destination.rotation - current.rotation)) : rotate;
    const distance = Math.hypot(destination.x - current.x, destination.z - current.z);
    // Swept intermediate positions prevent translation or rotation through an obstacle.
    if (distance > 24 || Math.abs(turn) > Math.PI * 4) return { ok: false, reason: '请分几次小幅移动家具。', position: current };
    const steps = Math.max(1, Math.ceil(distance / 0.055), Math.ceil(Math.abs(turn) / 0.06));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const candidate = { x: current.x + (destination.x - current.x) * t, z: current.z + (destination.z - current.z) * t, rotation: current.rotation + turn * t };
      const reason = movementConflict(entry, candidate);
      if (reason) return { ok: false, reason, position: current };
    }
    setFurniturePosition(entry, destination); updateEvidence(); updateTarget();
    return { ok: true, position: positionOf(entry) };
  }
  function applyFurniture(savedMap = {}) {
    cancelTimeLapse();
    const desired = new Map(), rejected = new Map();
    const saved = savedMap && typeof savedMap === 'object' ? savedMap : {};
    for (const entry of furniture.values()) {
      const value = saved[entry.id]; let position = { ...entry.origin };
      if (value !== undefined) {
        if (!entry.movable) rejected.set(entry.id, '大件家具保持原位，已忽略旧位置。');
        else if (!value || ![value.x, value.z, value.rotation].every(Number.isFinite)) rejected.set(entry.id, '存档位置格式无效，已恢复原位。');
        else {
          const candidate = { x: value.x, z: value.z, rotation: normalizeRotation(value.rotation) };
          const reason = staticConflict(entry, candidate);
          if (reason) rejected.set(entry.id, reason); else position = candidate;
        }
      }
      desired.set(entry.id, position);
    }
    // Validate the final layout together, so saved swaps do not depend on loading order.
    for (let pass = 0; pass < furniture.size; pass++) {
      let changed = false; const entries = [...furniture.values()];
      for (let i = 0; i < entries.length; i++) for (let j = i + 1; j < entries.length; j++) {
        const a = entries[i], b = entries[j];
        if (!rectanglesOverlap(footprint(a, desired.get(a.id)), footprint(b, desired.get(b.id)))) continue;
        for (const entry of [a, b]) {
          const pos = desired.get(entry.id);
          if (pos.x !== entry.origin.x || pos.z !== entry.origin.z || pos.rotation !== entry.origin.rotation) {
            desired.set(entry.id, { ...entry.origin }); rejected.set(entry.id, '存档中的家具相互重叠，已恢复原位。'); changed = true;
          }
        }
      }
      if (!changed) break;
    }
    for (const entry of furniture.values()) setFurniturePosition(entry, desired.get(entry.id));
    if (!isFree(camera.position.x, camera.position.z,postureHeights[posture])) {
      const spot = findSafeSpot([0, 4.3]); if (spot) {camera.position.set(spot[0], 1.65, spot[1]);posture='standing';desiredEyeHeight=1.65;onPosture(posture);}
      onMove({ x: camera.position.x, z: camera.position.z });
    }
    updateEvidence(); updateTarget();
    return { applied: Object.keys(saved).filter(id => furniture.has(id) && !rejected.has(id)), ignored: [...rejected].map(([id, reason]) => ({ id, reason })) };
  }
  function setExpression(value,actorId='landlord') {
    const actor=actors.get(actorId);if(!actor)return;
    const mood=['neutral','smile','avoid','tense','relieved'].includes(value)?value:'neutral';
    actor.expression=mood;if(actorId==='landlord')expression=mood;
    const smiling=['smile','relieved'].includes(mood);
    actor.eyes.forEach((eye,i)=>{eye.scale.y=smiling?.025:mood==='tense'?.075:.055;eye.position.x=(i?.09:-.09)+(mood==='avoid'?.018:0);});
    actor.brows.forEach((brow,i)=>{brow.rotation.z=mood==='tense'?(i?.3:-.3):smiling?(i?-.12:.12):0;brow.position.y=mood==='tense'?.145:smiling?.15:.13;});
    actor.mouth.scale.x=smiling?.15:mood==='tense'?.08:.11;actor.mouth.scale.y=mood==='tense'?.045:.025;
    actor.smileCorners.forEach(corner=>{corner.visible=smiling;});actor.sweat.visible=mood==='tense';
  }
  setExpression('neutral');
  function updateWater() {
    damp.visible = originalCase && !repaired;
    water.visible = originalCase && leaking && !repaired;
    // A brief pre-signing test shows a few droplets, while the puddle belongs
    // to the later move-in consequence and must not appear during the viewing.
    drops.forEach((drop, index) => { drop.visible = originalCase && !repaired && (leaking || Boolean(storyFacts.leakObserved) && index < 2); });
    basinDoor.rotation.y=storyEffects.basinPrepared?1.35:0;
    sinkDoor.rotation.y=storyEffects.sinkPrepared||storyFacts.leakObserved?-1.35:0;
    basinWater.visible=Boolean(storyEffects.basinLeak&&!storyEffects.basinRepaired);
    basinDrops.forEach(drop=>{drop.visible=Boolean(!storyEffects.basinRepaired&&(storyEffects.basinLeak||storyEffects.basinObserved));});
  }
  function updateEvidence() {
    // The same furniture stays in place at every date. Inspection and comparison
    // reveal evidence, rather than removing the object that used to cover it.
    furniture.get('cabinet').group.visible = true;
    furniture.get('sofa').group.visible = true;
    wallDamp.visible = originalCase && !storyFacts.dampVerified;
    dampSpread.visible = originalCase && storyDay >= 30 && !storyFacts.dampVerified;
    oldScratches.visible = originalCase || caseId === 'summer';
    const checkingSofa = ['sofa-inspect', 'handover'].includes(currentView);
    inspectionLamp.visible = checkingSofa && (Boolean(storyFacts.sofaInspected) || storyDay === 365);
    inspectionPhone.visible = inspectionLamp.visible;
  }
  function setStoryState({ facts = {}, day = 0, effects = {} } = {}) {
    storyFacts = facts && typeof facts === 'object' ? facts : {};
    storyEffects = effects && typeof effects === 'object' ? effects : {};
    storyDay = Number.isSafeInteger(day) && day >= 0 && day <= 36500 ? day : 0;
    repaired = !originalCase || Boolean(storyFacts.repairVerified); leaking = originalCase && storyDay >= 7 && !repaired;
    updateWater(); updateEvidence(); updateCampaignEffects();
    if (!isFree(camera.position.x, camera.position.z,postureHeights[posture])) {
      const spot = findSafeSpot([0, 4.3]);
      if (spot) { camera.position.set(spot[0], 1.65, spot[1]);posture='standing';desiredEyeHeight=1.65;onPosture(posture);onMove({ x: spot[0], z: spot[1] }); }
    }
  }
  function releaseLook() { dragging = false; if (document.pointerLockElement === canvas) document.exitPointerLock?.(); }
  function requestLook() {
    if (!enabled || disposed) return;
    try { const result = canvas.requestPointerLock?.(); if (result?.catch) result.catch(() => {}); } catch { /* Drag-to-look remains available. */ }
  }
  function firstVisibleHit() {
    return raycaster.intersectObjects(pickables, false).find(item => {
      let object = item.object;
      while (object) { if (!object.visible) return false; object = object.parent; }
      return true;
    });
  }
  function updateTarget() {
    camera.updateMatrixWorld(); scene.updateMatrixWorld(); raycaster.setFromCamera(center, camera); raycaster.far = 3.2;
    const next = firstVisibleHit()?.object.userData.interaction || null;
    if (next?.id !== activeTarget?.id || next?.furnitureId !== activeTarget?.furnitureId) { activeTarget = next; onTarget(next); }
  }
  function findSafeSpot(preferred,eyeHeight=1.65) {
    if (isFree(...preferred,eyeHeight)) return preferred;
    for (let radius = 0.4; radius <= 8; radius += 0.4) for (let i = 0; i < 24; i++) {
      const angle = i / 24 * Math.PI * 2, point = [preferred[0] + Math.cos(angle) * radius, preferred[1] + Math.sin(angle) * radius];
      if (isFree(...point,eyeHeight)) return point;
    }
    return null;
  }
  const fixedViews = {
    survey: { from: [-0.5, 1.65, 3.7], to: [-0.3, 1.1, -1.9] },
    aftermath: { from: [-1.1, 1.65, -0.7], to: [-3.15, 0.8, -4.1] },
    landlord: { from: [0, 1.65, 1.25], to: [-0.15, 1.55, -1.1] },
    interview: { from: [0.35, 1.6, 0.55], to: [0.8, 1.5, -1.1] },
    sink: { from: [-3.6, 1.65, -1.7], to: [-3.6, 0.74, -4.23] },
    window: shared ? { from: [4.3, 1.65, -3.6], to: [5.99, 1.85, -3.6] } : { from: [1.6, 1.65, -2.8], to: [2.2, 1.85, -5.5] },
    door: { from: [-0.3, 1.65, 3.35], to: [-0.4, 1.4, 5.45] },
    bathroom: { from: [-4.2, 1.65, 3.94], to: [-4.18, 1.18, 5.4] },
    'bathroom-inspect': { from: [-3.8, 1.65, 2.45], to: [-4.8, 1.1, 4.7] },
    ...(shared ? { corridor: { from:[4.9,1.65,-6.45],to:[-1.8,1.35,-7.25] } } : {}),
    'furniture-cabinet': { from: [2.65, 1.65, 2.05], to: [5.7, 1.2, 2.1] },
    'furniture-sofa': { from: [-3.75, 1.65, -1.1], to: [-4.45, 0.7, 1.6] },
    damp: { from: [3.25, 1.65, 1.95], to: [6.2, 1.3, 2.15] },
    handover: { from: [-3.55, 1.65, -0.55], to: [-5.85, 0.035, 0.7] },
  };
  function clueView(id) {
    if (!['damp', 'handover', 'cabinet-inspect', 'sofa-inspect'].includes(id)) return null;
    const cabinet = id === 'damp' || id === 'cabinet-inspect';
    const exteriorDamp = id === 'damp' && !storyFacts.cabinetOpened;
    const point = cabinet ? new THREE.Vector3(exteriorDamp ? 5.884 : 5.715, 0.45, exteriorDamp ? 1.95 : 1.1) : new THREE.Vector3(-4.51, 0.035, 0.43);
    const candidates = cabinet ? exteriorDamp ? [[3.35, 2.05], [3.1, 2.0]] : [[3.35, 1.0], [3.45, 1.15], [3.2, 0.8]] : [[-3.6, 0.15], [-3.6, -0.05], [-3.85, -0.1]];
    scene.updateMatrixWorld(true);
    for (const [x, z] of candidates) {
      if (!isFree(x, z)) continue;
      const from = new THREE.Vector3(x, cabinet ? 1.1 : 0.86, z), direction = point.clone().sub(from);
      // An opening door may still cross this ray during its short animation.
      // Fixed inspection positions are safe and the final view is tested open.
      // Look slightly to the right of the subject: the right side is reserved for dialogue.
      const right = new THREE.Vector3(-direction.z, 0, direction.x).normalize();
      const to = point.clone().addScaledVector(right, direction.length() * 0.36);
      return { from: from.toArray(), to: to.toArray() };
    }
    return null;
  }
  function furnitureFocus(id) {
    const entry = id === 'owner' || id === 'bill' ? furniture.get('desk') : furniture.get(id); if (!entry) return null;
    const local = id === 'owner' ? new THREE.Vector3(0.62, 0.96, -0.01) : id === 'bill' ? new THREE.Vector3(-0.59, 0.93, 0.04) : new THREE.Vector3(0, entry.focusY, 0);
    entry.group.updateMatrixWorld(true); return { entry, point: entry.group.localToWorld(local) };
  }
  function findFurnitureView(id) {
    const focus = furnitureFocus(id); if (!focus) return null;
    const { entry, point } = focus;
    const baseAngle = entry.id === 'cabinet' ? Math.PI : entry.id === 'sofa' ? -Math.PI / 2 : Math.PI / 2;
    const distances = entry.id === 'bed' ? [2.1, 2.5, 1.7] : [1.8, 2.2, 1.35, 2.6];
    scene.updateMatrixWorld(true);
    // Target the specific bill/phone, not just the table underneath it.
    for (const distance of distances) for (let i = 0; i < 24; i++) {
      const offset = i === 0 ? 0 : Math.ceil(i / 2) * Math.PI / 12 * (i % 2 ? 1 : -1);
      const angle = baseAngle - entry.group.rotation.y + offset;
      const from = new THREE.Vector3(point.x + Math.cos(angle) * distance, 1.65, point.z + Math.sin(angle) * distance);
      if (!isFree(from.x, from.z)) continue;
      raycaster.set(from, point.clone().sub(from).normalize()); raycaster.far = 3.2;
      if (firstVisibleHit()?.object.userData.interaction?.id === id) return { from: from.toArray(), to: point.toArray() };
    }
    return null;
  }
  function teleport(id) {
    let baseId=id.startsWith('inspect:')?id.slice(8):id;
    baseId=({entry:'door',hood:'stove'})[baseId]||baseId;
    if(baseId==='roommate'&&!shared)return false;
    const view = propViews[baseId] || clueView(baseId) || findFurnitureView(baseId) || fixedViews[baseId]; if (!view) return false;
    const low=id.startsWith('inspect:')&&['basin','sink','fridge'].includes(baseId);
    const height=low?.85:view.from[1];
    const spot = findSafeSpot([view.from[0], view.from[2]],height); if (!spot) return false;
    currentView = id;
    updateProjection();
    camera.position.set(spot[0],height,spot[1]);
    const look=low&&baseId==='basin'?[-5.38,.38,5.11]:low&&baseId==='sink'?[-3.65,.4,-4.55]:view.to;
    camera.lookAt(...look);camera.rotation.order='YXZ';keys.clear();
    posture=height<1?'crouched':height<1.5?'bent':'standing';desiredEyeHeight=height;onPosture(posture);
    updateEvidence(); updateTarget(); onMove({ x: camera.position.x, z: camera.position.z }); return true;
  }
  function updateProjection() {
    // Off-axis framing keeps all bathroom fixtures in the available left side
    // without moving the observer through a wall or widening the room itself.
    const offset=currentView==='bathroom-inspect'?.29:currentView.startsWith('inspect:')?.23:0;
    camera.filmOffset = camera.getFilmWidth() * 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect * offset;
    camera.updateProjectionMatrix();
  }
  function stableDaylight() {
    scene.background.copy(dayColor); scene.fog.color.copy(dayColor); hemisphere.intensity = 2.15; daylight.intensity = 2.6;
    daylight.color.set('#fff0cd'); daylight.position.set(4.5, 7.5, -5.5); fill.intensity = 13; cityWindow.emissiveIntensity = 0.1;
    sun.position.set(5.5, 6.5, -20); sunMaterial.opacity = 1; moonMaterial.opacity = 0;
  }
  function animateDaylight(progress) {
    const light = (1 + Math.cos(progress * Math.PI * 2)) / 2;
    scene.background.copy(nightColor).lerp(dayColor, light); scene.fog.color.copy(scene.background);
    hemisphere.intensity = 0.7 + light * 1.45; daylight.intensity = 0.18 + light * 2.42;
    fill.intensity = 13 + (1 - light) * 3; cityWindow.emissiveIntensity = 0.1 + (1 - light) * 0.85;
    daylight.position.set(-6 + progress * 12, 3 + light * 4.5, -5.5);
    sun.position.set(-3 + progress * 12, 1 + Math.sin((progress + 0.15) * Math.PI * 2) * 5, -20);
    moon.position.set(8 - progress * 10, 1 + Math.sin(progress * Math.PI) * 5, -20); sunMaterial.opacity = light; moonMaterial.opacity = 1 - light;
  }
  function cancelTimeLapse() {
    if (!timeLapse) return;
    clearTimeout(timeLapse.timer); timeLapse.cancelled = true; timeLapse = null; stableDaylight();
  }
  function advanceTimeLapse(now, forceFinish = false) {
    const run = timeLapse; if (!run || run.cancelled) return;
    const progress = forceFinish || run.duration === 0 ? 1 : Math.min(1, (now - run.start) / run.duration);
    animateDaylight(progress);
    const stages = run.days.map((day,index)=>[(index+1)/(run.days.length+0.32),day]);
    while (run.stage < stages.length && progress >= stages[run.stage][0]) {
      const day = stages[run.stage++][1];
      run.onStage(day);
      if (timeLapse !== run || run.cancelled) return;
      const view=run.views[run.stage-1];
      if(view)teleport(originalCase?view:`inspect:${view}`);
      else if(originalCase){if (day === 7) teleport('aftermath'); if (day === 30) teleport('damp'); if (day === 365) teleport('handover');}
      else teleport(`inspect:${run.stage===run.days.length?'calendar':shared?'notice':'folder'}`);
    }
    if (progress >= 1) { clearTimeout(run.timer); timeLapse = null; stableDaylight(); run.onComplete(); }
  }
  function playTimeLapse({ duration = 4200, days = [7,30,365], views = [], onStage = () => {}, onComplete = () => {} } = {}) {
    cancelTimeLapse();
    const milliseconds = Number.isFinite(duration) ? THREE.MathUtils.clamp(duration, 0, 5000) : 4200;
    const stageDays = [...new Set((Array.isArray(days)?days:[]).filter(day=>Number.isSafeInteger(day)&&day>0&&day<=36500))].sort((a,b)=>a-b);
    const run = { start: performance.now(), duration: milliseconds, days:stageDays.length?stageDays:[7,30,365], views:Array.isArray(views)?views:[], onStage, onComplete, stage: 0, cancelled: false, timer: null }; timeLapse = run;
    keys.clear(); releaseLook(); teleport(originalCase?'aftermath':'survey');
    if (milliseconds === 0 || document.hidden) advanceTimeLapse(performance.now(), true);
    else run.timer = setTimeout(() => { if (timeLapse === run) advanceTimeLapse(performance.now(), true); }, milliseconds);
    return () => { if (timeLapse === run) cancelTimeLapse(); };
  }
  function resize() {
    const rect = canvas.getBoundingClientRect(), width = Math.max(1, Math.round(rect.width)), height = Math.max(1, Math.round(rect.height));
    renderer.setSize(width, height, false); camera.aspect = width / height; updateProjection();
  }
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(canvas); resize();
  listen(window, 'keydown', event => {
    if (!enabled || timeLapse || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '')) return;
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) { event.preventDefault(); keys.add(event.code); }
  });
  listen(window, 'keyup', event => keys.delete(event.code)); listen(window, 'blur', () => { keys.clear(); dragging = false; });
  listen(document, 'visibilitychange', () => { if (document.hidden) { keys.clear(); releaseLook(); advanceTimeLapse(performance.now(), true); } });
  listen(document, 'pointerlockchange', () => { if (document.pointerLockElement !== canvas) keys.clear(); });
  listen(canvas, 'pointerdown', event => { if (!enabled || timeLapse || event.button !== 0) return; dragging = true; canvas.setPointerCapture?.(event.pointerId); });
  listen(window, 'pointerup', () => { dragging = false; });
  listen(document, 'mousemove', event => {
    if (!enabled || timeLapse || (document.pointerLockElement !== canvas && !dragging)) return;
    camera.rotation.y -= event.movementX * 0.0024; camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x - event.movementY * 0.0024, -1.15, 1.15);
  });
  function frame(now) {
    if (disposed) return;
    const delta = Math.min((now - previousTime) / 1000, 0.05); previousTime = now;
    if (enabled && !document.hidden && !timeLapse) {
      let forward = Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown'));
      let right = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'));
      const length = Math.hypot(forward, right);
      if (length) {
        forward /= length; right /= length;
        const speed=posture==='standing'?2.5:posture==='bent'?1.55:1.1;
        const yaw = camera.rotation.y, dx = (-Math.sin(yaw) * forward + Math.cos(yaw) * right) * delta * speed, dz = (-Math.cos(yaw) * forward - Math.sin(yaw) * right) * delta * speed;
        const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.08));
        const movingHeight=Math.max(camera.position.y,postureHeights[posture]);
        for (let i = 0; i < steps; i++) { if (isFree(camera.position.x + dx / steps, camera.position.z,movingHeight)) camera.position.x += dx / steps; if (isFree(camera.position.x, camera.position.z + dz / steps,movingHeight)) camera.position.z += dz / steps; }
        if (now - lastMoveNotification > 250) { onMove({ x: camera.position.x, z: camera.position.z }); lastMoveNotification = now; }
      }
    }
    const targetOpening = storyFacts.cabinetOpened ? 1 : 0;
    const openingStep = delta / 0.35;
    cabinetOpenAmount += Math.max(-openingStep, Math.min(openingStep, targetOpening - cabinetOpenAmount));
    for (const { hinge, side } of cabinetDoors) hinge.rotation.y = side * cabinetOpenAmount * Math.PI / 2;
    if(currentView==='walk')camera.position.y=reducedMotion?desiredEyeHeight:THREE.MathUtils.damp(camera.position.y,desiredEyeHeight,18,delta);
    for(const actor of actors.values()){
      const mood=actor.expression;actor.group.rotation.y=reducedMotion?0:Math.sin(now*.00035)*.025;
      actor.head.rotation.y=mood==='avoid'?-.24:reducedMotion?0:Math.sin(now*.0009)*.015;
      actor.head.rotation.z=mood==='tense'&&!reducedMotion?Math.sin(now*.004)*.02:mood==='relieved'?.035:0;
      actor.head.rotation.x=mood==='smile'&&!reducedMotion?Math.sin(now*.002)*.02:mood==='relieved'?-.03:0;
    }
    if (leaking && !repaired) { water.scale.x = 1.9 + Math.sin(now * 0.002) * 0.05; water.scale.z = 1.65 + Math.cos(now * 0.0015) * 0.04; }
    if (!repaired && (leaking || storyFacts.leakObserved)) drops.forEach((drop, index) => { drop.position.y = 0.72 - ((now * 0.0008 + index * 0.17) % 0.55); });
    basinDrops.forEach((drop,index)=>{if(drop.visible)drop.position.y=.58-((now*.00065+index*.17)%.43);});
    advanceTimeLapse(now); updateTarget(); renderer.render(scene, camera); animationId = requestAnimationFrame(frame);
  }
  animationId = requestAnimationFrame(frame);
  return {
    setEnabled(value) {
      const previous=enabled;enabled = Boolean(value); keys.clear();
      if (!enabled) releaseLook();
      else if(!previous) {
        // Stand up and put away the inspection phone when returning to walking.
        resetPosture();
      }
    },
    requestLook, releaseLook, teleport, getFurniture, moveFurniture, applyFurniture, setExpression, setStoryState, playTimeLapse,
    setPosture,resetPosture,setReducedMotion,getPosture:()=>posture,
    inspect(id) { return teleport(`inspect:${id}`); },
    setLeak(value) { leaking = Boolean(value); updateWater(); }, setRepaired(value) { repaired = Boolean(value); updateWater(); },
    dispose() {
      disposed = true; cancelTimeLapse(); cancelAnimationFrame(animationId); releaseLook(); resizeObserver.disconnect(); listeners.forEach(remove => remove());
      cubeGeometry.dispose(); textures.forEach(texture => texture.dispose()); materials.forEach(mat => mat.dispose()); renderer.dispose(); renderer.forceContextLoss?.();
    },
  };
}
