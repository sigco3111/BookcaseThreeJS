// ============================================================================
//  한국어 / English i18n — UI 문자열만 노출, 식별자는 절대 건드리지 않음
// ============================================================================

const KO = {
  // ---- 앱 / 캡션 ----
  appTitle: '절차적 책장 — Three.js (한글판)',
  appCaption: '절차적 책장 · three.js',

  // ---- GUI 최상위 ----
  guiTitle: '책장 스튜디오',

  // ---- GUI 폴더 ----
  folderCase: '책장 설정',
  folderBooks: '책',
  folderColorRamp: '색상 램프',
  folderDust: '먼지',
  folderCamera: '카메라',
  folderStudio: '스튜디오',
  folderFX: '후처리',

  // ---- 책장 설정 ----
  width: '너비 (m)',
  height: '높이 (m)',
  depth: '깊이 (m)',
  shelves: '선반 수',
  separations: '수직 분할 수',
  boardThickness: '판재 두께',
  plinthHeight: '받침 높이',
  crownMolding: '크라운 몰딩',
  faceFrame: '페이스 프레임',
  sideInsets: '측면 인셋',
  backStyle: '뒷판 스타일',
  grainScale: '결 스케일',
  grainDirection: '결 방향',
  randomize: '🎲 무작위 디자인',
  randomizeBooks: '🎲 책 무작위',
  randomizeColors: '🎲 색상 무작위',

  // ---- 책 ----
  books: '📚 책',
  darkness: '어두움',
  density: '밀도',
  leaningBooks: '기울어진 책',
  flatStacks: '납작한 더미',
  messiness: '어지러움',
  bookSize: '책 크기',
  openOnFall: '📖 떨어질 때 펼침',
  seed: '시드',
  grabThrow: '✋ 잡고 던지기',
  throwPower: '던지기 강도',
  bookquake: '💥 책 흔들기',
  resetBooks: '↩ 책 재설정',

  // ---- 책 색상 ----
  colorStop: (i) => `스톱 ${i}`,

  // ---- 먼지 ----
  dust: '🌫 먼지',
  settledDust: '가라앉은 먼지',
  patchiness: '얼룩 정도',
  patchSize: '패치 크기',
  topSurfaceBias: '위쪽 표면 편향',
  dustColor: '먼지 색상',
  ambientMotes: '공중 부유 입자',
  impactPuffs: '💨 충돌 분진',
  puffDensity: '분진 밀도',
  puffSize: '분진 크기',
  puffOpacity: '분진 불투명도',
  puffLifetime: '분진 수명',
  dustBurst: '💨 먼지 폭발',

  // ---- 카메라 ----
  heroShot: '🎬 영웅 샷',
  lowAngle: '🎬 로우 앵글',
  closeUp: '🎬 클로즈업',
  front: '🎬 정면',
  fov: '시야각',
  turntable: '회전판',
  turntableSpeed: '회전 속도',

  // ---- 스튜디오 ----
  mood: '무드',
  keyLight: '키 라이트',
  fillLight: '필 라이트',
  rimLight: '림 라이트',
  haze: '안개',
  exposure: '노출',
  backdrop: '배경',

  // ---- 후처리 ----
  bloomStrength: '블룸 강도',
  bloomRadius: '블룸 반경',
  bloomThreshold: '블룸 임계값',
  ambientOcclusion: '앰비언트 오클루전',
  aoIntensity: 'AO 강도',
  aoRadius: 'AO 반경',
  depthOfField: '피사계 심도',
  aperture: '조리개',
  maxBlur: '최대 블러',
  chromaticAberration: '색수차',
  saturation: '채도',
  contrast: '대비',
  temperature: '색온도',
  vignette: '비네트',
  grain: '필름 그레인',
  letterbox: '레터박스',

  // ---- 뒷판 스타일 옵션 ----
  backPlanks: '널빤지',
  backFlat: '평면',
  backOpen: '열림',
};

const EN = {
  appTitle: 'Procedural Bookcase — Three.js',
  appCaption: 'procedural bookcase · three.js',

  guiTitle: 'Bookcase Studio',

  folderCase: 'Bookcase Settings',
  folderBooks: 'Books',
  folderColorRamp: 'color ramp',
  folderDust: 'Dust',
  folderCamera: 'Camera',
  folderStudio: 'Studio',
  folderFX: 'FX',

  width: 'width (m)',
  height: 'height (m)',
  depth: 'depth (m)',
  shelves: 'shelves',
  separations: 'separations',
  boardThickness: 'board thickness',
  plinthHeight: 'plinth height',
  crownMolding: 'crown molding',
  faceFrame: 'face frame',
  sideInsets: 'side insets',
  backStyle: 'back style',
  grainScale: 'grain scale',
  grainDirection: 'grain direction',
  randomize: '🎲 randomize',
  randomizeBooks: '🎲 randomize books',
  randomizeColors: '🎲 randomize colors',

  books: '📚 books',
  darkness: 'darkness',
  density: 'density',
  leaningBooks: 'leaning books',
  flatStacks: 'flat stacks',
  messiness: 'messiness',
  bookSize: 'book size',
  openOnFall: '📖 open on fall',
  seed: 'seed',
  grabThrow: '✋ grab & throw',
  throwPower: 'throw power',
  bookquake: '💥 bookquake',
  resetBooks: '↩ reset books',

  colorStop: (i) => `stop ${i}`,

  dust: '🌫 dust',
  settledDust: 'settled dust',
  patchiness: 'patchiness',
  patchSize: 'patch size',
  topSurfaceBias: 'top-surface bias',
  dustColor: 'dust color',
  ambientMotes: 'ambient motes',
  impactPuffs: '💨 impact puffs',
  puffDensity: 'puff density',
  puffSize: 'puff size',
  puffOpacity: 'puff opacity',
  puffLifetime: 'puff lifetime',
  dustBurst: '💨 dust burst',

  heroShot: '🎬 hero shot',
  lowAngle: '🎬 low angle',
  closeUp: '🎬 close-up',
  front: '🎬 front',
  fov: 'fov',
  turntable: 'turntable',
  turntableSpeed: 'turntable speed',

  mood: 'mood',
  keyLight: 'key light',
  fillLight: 'fill light',
  rimLight: 'rim light',
  haze: 'haze',
  exposure: 'exposure',
  backdrop: 'backdrop',

  bloomStrength: 'bloom strength',
  bloomRadius: 'bloom radius',
  bloomThreshold: 'bloom threshold',
  ambientOcclusion: 'ambient occlusion',
  aoIntensity: 'ao intensity',
  aoRadius: 'ao radius',
  depthOfField: 'depth of field',
  aperture: 'aperture',
  maxBlur: 'max blur',
  chromaticAberration: 'chromatic aberration',
  saturation: 'saturation',
  contrast: 'contrast',
  temperature: 'temperature',
  vignette: 'vignette',
  grain: 'grain',
  letterbox: 'letterbox',

  backPlanks: 'planks',
  backFlat: 'flat',
  backOpen: 'open',
};

let current = KO;

export function setLanguage(lang) {
  current = lang === 'en' ? EN : KO;
}

export function t(key, ...args) {
  const v = current[key];
  if (typeof v === 'function') return v(...args);
  if (v !== undefined) return v;
  const e = EN[key];
  if (typeof e === 'function') return e(...args);
  if (e !== undefined) return e;
  return key;
}

export const L = {
  KO,
  EN,
  current: () => current,
};
