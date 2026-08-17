# 📚 BookcaseThreeJS — 절차적 책장 스튜디오

**Three.js + cannon-es** 기반의 **절차적 책장 컨피규레이터** 입니다. 모든 판재가 파라미터로 생성되며, 스튜디오 조명 + 책 시뮬레이션 + 먼지 효과 + 시네마틱 카메라 샷까지 포함된 풀 스튜디오 환경입니다.

---

## 🔗 링크

| 항목 | URL |
|---|---|
| 🌐 **라이브 데모** | **<https://sigco3111.github.io/BookcaseThreeJS>** |
| ⭐ **원본 저장소 (출처)** | <https://github.com/achrefelouafi/BookcaseThreeJS> |

> 본 저장소는 [achrefelouafi/BookcaseThreeJS](https://github.com/achrefelouafi/BookcaseThreeJS) 의 **한국어 fork** 입니다. 원본의 모든 핵심 코드(절차적 책장 + 책 시뮬레이션 + 시네마틱 스튜디오)와 라이선스(MIT)를 그대로 보존하면서 사용자 인터페이스만 한글로 번역·개선했습니다.

---

## ✨ 라이브 데모 둘러보기

브라우저에서 **<https://sigco3111.github.io/BookcaseThreeJS>** 을 열면 즉시 절차적 책장 스튜디오를 만날 수 있습니다.

**조작 방법**

- 🖱️ **드래그** — 카메라 궤도 회전
- 🖲️ **스크롤** — 줌 인/아웃
- ✋ **책 잡고 던지기** — 책을 클릭 잡고 마우스 떼면 던져짐 (`throwPower` 로 강도 조절)
- 💥 **책 흔들기 (bookquake)** — 책장 전체가 흔들리며 책이 쏟아짐 + 먼지 폭발
- 🎬 **4가지 카메라 샷** — 영웅 샷 / 로우 앵글 / 클로즈업 / 정면 (부드러운 트윈)
- 🎛️ **우측 상단 GUI** — 책장 / 책 / 먼지 / 카메라 / 스튜디오 / 후처리 60+ 매개변수 실시간 조절

**6가지 핵심 기능**

| 기능 | 설명 |
|---|---|
| 🪵 **절차적 책장** | 너비/높이/깊이 + 선반/분할/판재/받침/크라운 + 뒷판 3종 + 결 방향/스케일 |
| 📚 **책 시뮬레이션** | 색상 램프 + 어두움/밀도/기울/납작/어지러움/크기 + 잡고 던지기 + bookquake |
| 🌫 **먼지 시스템** | 가라앉은 먼지 + 얼룩/패치 크기/위쪽 표면 편향 + 충돌 분진 폭발 |
| 🎬 **시네마틱 카메라** | 4가지 프리셋 샷 (부드러운 fly-to 트윈) + 회전판 |
| 💡 **3-무드 스튜디오** | 무드 선택 (Object.keys(MOODS)) + 키/필/림 라이트 + 안개 + 노출 + 배경 |
| 🎨 **풀 FX 스택** | Bloom + GTAO + Bokeh (DOF) + 색수차 + 채도/대비/색온도 + 비네트 + 필름 그레인 + 레터박스 |

---

## 📑 목차

1. [한국어판 추가 사항](#-한국어판-추가-사항)
2. [주요 기능 (Features)](#-주요-기능-features)
3. [빠른 시작 (Run)](#-빠른-시작-run)
4. [조작 방법 (Controls)](#-조작-방법-controls)
5. [프로젝트 구조 (Architecture)](#-프로젝트-구조-architecture)
6. [한국어화 작업 노트](#-한국어화-작업-노트)
7. [원본 저장소 및 크레딧](#-원본-저장소-및-크레딧)
8. [라이선스](#-라이선스)

---

## 🎌 한국어판 추가 사항

> sigco3111 본 fork에서만 제공하는 한국어 사용자를 위한 개선 사항입니다.

- **🈶 완전 한글 GUI** — 우측 상단 lil-gui 패널의 폴더 6개, 컨트롤 60+, 4가지 카메라 샷, 🎲 무작위 디자인 버튼 모두 자연스러운 한국어로 번역
- **🈶 한글 부트 화면** — `<html lang="ko">`, 한글 title, 좌하단 한글 캡션
- **🔄 이중 언어 지원** — `src/i18n.js` 모듈로 한국어 / 영어 토글 가능 (`setLanguage('en')` 호출)
- **🛡️ 식별자 침투 0건** — Three.js 객체 / cannon-es 시뮬레이션 / lil-gui 컨트롤 / 셰이더 유니폼 모두 원본 그대로 보존
- **✅ Vite 빌드 통과** — `pnpm build` exit 0, 972KB / 295KB gzip
- **🚀 Vercel 프로덕션 배포** — `<https://sigco3111.github.io/BookcaseThreeJS>`

### 한국어화 번역 매핑 예시

| 원본 (영문) | 한국어판 |
|---|---|
| Bookcase Studio | 책장 스튜디오 |
| Bookcase Settings | 책장 설정 |
| width / height / depth (m) | 너비 / 높이 / 깊이 (m) |
| board thickness | 판재 두께 |
| plinth height | 받침 높이 |
| crown molding | 크라운 몰딩 |
| face frame | 페이스 프레임 |
| side insets | 측면 인셋 |
| back style | 뒷판 스타일 |
| back: planks / flat / open | 뒷판: 널빤지 / 평면 / 열림 |
| grain scale / direction | 결 스케일 / 결 방향 |
| 🎲 randomize | 🎲 무작위 디자인 |
| Books / color ramp | 책 / 색상 램프 |
| leaning books | 기울어진 책 |
| flat stacks | 납작한 더미 |
| messiness / book size | 어지러움 / 책 크기 |
| 📖 open on fall | 📖 떨어질 때 펼침 |
| ✋ grab & throw | ✋ 잡고 던지기 |
| 💥 bookquake | 💥 책 흔들기 |
| Dust / settled dust | 먼지 / 가라앉은 먼지 |
| patchiness / patch size | 얼룩 정도 / 패치 크기 |
| top-surface bias | 위쪽 표면 편향 |
| ambient motes | 공중 부유 입자 |
| 💨 impact puffs / dust burst | 💨 충돌 분진 / 먼지 폭발 |
| Camera / hero shot / low angle | 카메라 / 영웅 샷 / 로우 앵글 |
| close-up / front | 클로즈업 / 정면 |
| fov / turntable | 시야각 / 회전판 |
| Studio / mood | 스튜디오 / 무드 |
| key/fill/rim light | 키/필/림 라이트 |
| haze / exposure / backdrop | 안개 / 노출 / 배경 |
| FX / bloom strength | 후처리 / 블룸 강도 |
| ambient occlusion / depth of field | 앰비언트 오클루전 / 피사계 심도 |
| chromatic aberration / saturation / contrast | 색수차 / 채도 / 대비 |
| vignette / grain / letterbox | 비네트 / 필름 그레인 / 레터박스 |

---

## 🏗️ 주요 기능 (Features)

### 🪵 절차적 책장 (Procedural Bookcase)

`src/bookcase.js` 의 파라메트릭 빌더가 만드는 모든 판재:

- **치수** — 너비 (0.7~3.2m), 높이 (1.2~3.0m), 깊이 (0.24~0.6m)
- **레이아웃** — 선반 수 (0~8), 수직 분할 수 (0~4)
- **구조** — 판재 두께 (0.018~0.045m), 받침 높이 (0.06~0.22m), 크라운 몰딩 토글, 페이스 프레임 토글, 측면 인셋 토글
- **뒷판 스타일** — `planks` (널빤지), `flat` (평면), `open` (열림) 3종
- **마감** — 결 스케일 (0.5~2.5), 결 방향 토글, 색상 틴트, 거칠기 (0.4~1.5)
- **월드 박스 UV 투영** — 어떤 크기에서도 결 밀도 일정 + 판재마다 고유한 결 오프셋
- **🎲 무작위 디자인** — 모든 파라미터 무작위 재생성

### 📚 책 시뮬레이션 (Books)

`src/books.js` 의 cannon-es 기반 물리 + 책 생성:

- **색상 램프** — 5-stop 색상 그라데이션 (책등 색상 결정) + 🎲 무작위
- **물리 파라미터** — 어두움 (0~1), 밀도 (0.1~1), 기울어진 책 (0~0.6), 납작한 더미 (0~0.6), 어지러움 (0~1), 책 크기 (0.7~1.4)
- **📖 떨어질 때 펼침** — `openChance` (0~1) 로 책을 떨어뜨릴 때 펼침 확률
- **시드** (0~9999) — 결정론적 책 배치
- **✋ 잡고 던지기** — grab 토글 + throwPower (0.5~3) 강도 조절
- **💥 책 흔들기 (bookquake)** — 책장 전체가 흔들리며 책이 쏟아지고 먼지 폭발 트리거
- **↩ 책 재설정** — 현재 책들 재배치

### 🌫 먼지 시스템 (Dust)

`src/dust.js` 의 두 단계 먼지 시뮬레이션:

- **가라앉은 먼지** — 표면에 누적되는 먼지 (0~1, 0.01 단위)
- **얼룩 정도 / 패치 크기** — 가라앉은 먼지의 분포 (0~1, 0.5~20)
- **위쪽 표면 편향** — 위쪽 면에 더 많이 쌓임 (0.5~6)
- **먼지 색상** — PBR 표면에 주입되는 먼지 톤
- **공중 부유 입자** — 스튜디오의 떠다니는 먼지 모트 (0~1)
- **💨 충돌 분진** — 책 던질 때 분진 발생 토글 + 밀도/크기/불투명도/수명 (0.5~4초)
- **💨 먼지 폭발** — 책 흔들기 / 수동 폭발 시 분진 방출

### 🎬 시네마틱 카메라 (Camera)

- **4가지 카메라 샷** — 영웅 샷 (az 33°, 고도 78%), 로우 앵글 (az 18°, 고도 10%), 클로즈업 (az 42°, 고도 66%), 정면 (az 0°, 고도 50%)
- **부드러운 fly-to 트윈** — 1300ms ease-in-out 보간
- **FOV 조절** (18~60°)
- **회전판 (turntable)** — 자동 회전 토글 + 속도 (0.2~5)

### 💡 3-무드 스튜디오 (Studio)

`src/studio.js` 의 RectAreaLight 소프트박스 + 그림자 캐스팅 태양:

- **무드 선택** — `Object.keys(MOODS)` 로 사용 가능한 무드 목록
- **키 라이트** (0~250) — 메인 조명 강도
- **필 라이트** (0~12) — 보조 조명 강도
- **림 라이트** (0~40) — 백 라이트 강도
- **안개 (haze)** (0~0.5) — 신의 광선 안개 농도
- **노출** (0.3~2) — 톤매핑 노출
- **배경 색상** — 무한 사이크라마 배경 색 (배경, 안개, 사이크라마 동기화)

### 🎨 풀 FX 스택 (Post-processing)

`src/main.js` 의 EffectComposer 체인:

1. **GTAO (Ground-Truth Ambient Occlusion)** — 책 / 모서리에 사실적인 AO (강도, 반경, 토글)
2. **Bokeh (Depth of Field)** — 피사계 심도 (조리개, 최대 블러, 토글)
3. **Bloom (UnrealBloom)** — 강한 강도, 반경, 임계값
4. **Grade Shader** — 색수차, 채도, 대비, 색온도, 비네트, 필름 그레인, 레터박스
5. **Output Pass** — 최종 sRGB 출력

### 🎬 4가지 카메라 샷 (Camera shots)

| 샷 | 방위각 | 고도 | 거리 | FOV |
|---|---|---|---|---|
| 🎬 **영웅 샷** (hero) | 33° | 78% | ×2.3 | 30° |
| 🎬 **로우 앵글** (low) | 18° | 10% | ×2.0 | 26° |
| 🎬 **클로즈업** (detail) | 42° | 66% | ×1.05 | 33° |
| 🎬 **정면** (front) | 0° | 50% | ×2.5 | 25° |

> 모든 거리 계수는 `Math.max(params.width, params.height * 0.85)` 로 스케일됨 — 책장 크기에 맞춰 자동으로 거리 조절.

---

## 🚀 빠른 시작 (Run)

### 필요 환경

- **Node.js** 18 이상
- **pnpm** (권장) 또는 npm

### 설치 + 개발 서버

```bash
# 의존성 설치
pnpm install

# 개발 서버 (http://localhost:5173)
pnpm dev
```

### 프로덕션 빌드

```bash
pnpm build      # vite build → dist/
pnpm preview    # dist/ 로컬 미리보기
```

### 빌드 결과

```
dist/index.html                  0.78 kB │ gzip:   0.55 kB
dist/assets/index-9YSIja_k.js  972.59 kB │ gzip: 294.90 kB
✓ built in 731ms
```

---

## 🎮 조작 방법 (Controls)

| 조작 | 동작 |
|---|---|
| 🖱️ **드래그** | 카메라 궤도 회전 |
| 🖲️ **스크롤** | 줌 인/아웃 |
| ✋ **책 잡고 던지기** (grab 토글) | 책을 마우스로 잡고 떼면 던져짐 |
| 💥 **책 흔들기 버튼** | 책장 전체가 흔들리며 책이 쏟아짐 |
| 🎬 **카메라 샷 버튼** | 부드러운 트윈으로 카메라 이동 |
| 🔄 **회전판** | 자동 회전 토글 + 속도 조절 |
| 🎛️ **우측 상단 GUI** | 60+ 매개변수 실시간 조절 |
| 🎲 **무작위 디자인** | 모든 책장 파라미터 무작위 재생성 |

---

## 🏛️ 프로젝트 구조 (Architecture)

```
index.html            부트 화면, 한글 캡션
public/
  Wood027_1K-JPG_*    PBR 우드 텍스처 (Color/Normal/Roughness)
  Leather025_1K-JPG_* PBR 가죽 텍스처 (책 표지용)
src/
  main.js             메인 진입점 + EffectComposer + GUI
  i18n.js             🆕 한국어 / 영어 이중 언어 모듈 (sigco3111 fork)
  bookcase.js         파라메트릭 책장 빌더 (233 라인)
  books.js            cannon-es 책 시뮬레이션 (536 라인)
  dust.js             먼지 시스템 (229 라인)
  studio.js           3-무드 스튜디오 + 카메라 샷 (282 라인)
  materials.js        우드 / 책 / 가죽 PBR 머티리얼 (149 라인)
package.json          의존성: three 0.170, lil-gui 0.19, cannon-es 0.20
vite.config.js        Vite 기본 설정
```

---

## 🈂️ 한국어화 작업 노트

> sigco3111 본 fork 에서 진행한 한국어화의 디자인 결정과 안전 검증.

### 1️⃣ 이중 언어 모듈 (`src/i18n.js`)

- **60+ 키** — GUI 폴더 6개 + 컨트롤 60+ + 무드 + 카메라 샷 + 📚 책 / 🌫 먼지
- `KO` 객체 (한국어) + `EN` 객체 (영어 미러) + `setLanguage()` 함수
- 기본값은 한국어 (`current = KO`) — 한국 사용자가 즉시 한글로 시작
- `t(key)` 가 안전한 폴백 제공 — 키가 없으면 EN → 마지막으로 키 자체 반환

### 2️⃣ 함수형 키 지원 (`colorStop`)

책 색상 램프가 동적으로 5개의 "스톱"을 만듭니다 (`stop 1`, `stop 2`, ...). i18n 키도 함수로 만들어 인덱스 인자 처리:

```javascript
// i18n.js
colorStop: (i) => `스톱 ${i}`,   // KO
colorStop: (i) => `stop ${i}`,  // EN

// main.js
fRamp.addColor(bookParams.ramp, k).name(t('colorStop', i + 1));
```

### 3️⃣ 식별자 침투 0건 — 안전 검증

자동 영→한 매핑이 식별자 내부에 침투하는 위험을 방지하기 위해:

- `i18n.js` 의 KO 값은 **문자열 리터럴 / 함수형 값에만** 위치
- Three.js 객체 (`MOODS`, `SHOTS`, `DEFAULT_PARAMS`, `BOOK_DEFAULTS`, `DUST_DEFAULTS`), cannon-es 시뮬레이션 파라미터, lil-gui 컨트롤 이름 모두 **원본 그대로 보존**
- 검증 방법: 빌드된 bundle 에서 `\b[a-zA-Z_$]+[가-힣]+...` 패턴 매치 → **0건**

### 4️⃣ 내부 키 보존 (MOODS / SHOTS / back 옵션)

영문 키는 lil-gui 드롭다운에서 직접 비교되므로 변경하면 안 됩니다:

```javascript
// ✅ 안전한 패턴 — 내부 키 + 표시 이름 분리
fStudio.add(studioParams, 'mood', Object.keys(MOODS))  // ← 'moonlight' 같은 영문 키
   .name(t('mood'));                                    // ← 표시 이름 "무드"
```

```javascript
fCase.add(params, 'back', ['planks', 'flat', 'open'])  // ← 영문 키 보존
   .name(t('backStyle'));                                // ← "뒷판 스타일"
```

### 5️⃣ 정적 HTML 한글로 선박힘

`<html lang="ko">`, `<title>`, 좌하단 캡션을 빌드 전 `index.html` 에 직접 한글 박음.

### 6️⃣ Vercel 자동 도메인 사용

CLI 가 준 첫 URL (`bookcasethreejs-ejggr1qbw-...`) 은 Production Deployment Protection SSO 가드가 걸려 302 → 로그인 리다이렉트. **자동 할당된 production 도메인** (`sigco3111.github.io/BookcaseThreeJS`) 은 보호 없음.

---

## 🙏 원본 저장소 및 크레딧

> 본 프로젝트는 다음 원본 저장소의 한국어 fork 입니다. 모든 핵심 코드와 알고리즘은 원작자의 업적입니다.

- **원본 저장소**: <https://github.com/achrefelouafi/BookcaseThreeJS>
- **원작자**: [@achrefelouafi](https://github.com/achrefelouafi)
- **원본 별점**: 12 ⭐
- **원본 라이선스**: MIT

### 원본의 기술적 핵심 (참고)

> The following technical achievements are entirely the original author's work. The Korean fork only translates the user interface and deploys it to Vercel — every parametric board, every shader, every preset is from the original codebase.

- **파라메트릭 책장 빌더** — 캐퍼스, 선반, 디바이더, 널빤지 뒷판, 페이스 프레임, 계단형 크라운 코니스, 받침 + 캡 몰딩, 측면 인셋 — 모든 판재가 둥근 박스 + 월드 박스 UV 투영으로 결 밀도 일정
- **3점 RectAreaLight 소프트박스** + 그림자 캐스팅 태양 + RoomEnvironment 반사 + 무한 사이크라마 배경 + 페이크 접지 그림자
- **cannon-es 책 물리** — 던지기 / 기울기 / 쌓임 / 펼침 시뮬레이션
- **표면 먼지 셰이더** — `addDustLayer` 로 PBR 머티리얼의 onBeforeCompile 에 먼지 주입
- **EffectComposer 풀 스택** — GTAO (Ground-Truth AO) + Bokeh DOF + UnrealBloom + 커스텀 GradeShader (색수차 / 채도 / 대비 / 색온도 / 비네트 / 그레인 / 레터박스)
- **부드러운 fly-to 카메라 샷** — 1300ms ease-in-out 트윈으로 4가지 프리셋
- **3-무드 스튜디오** — 키/필/림 라이트 + 사이크라마 + 안개 + 먼지 동기화
- **PBR 우드 / 가죽 텍스처** — `Wood027_1K-JPG_*`, `Leather025_1K-JPG_*`

---

## 📜 라이선스

본 저장소는 원본과 동일한 **MIT License** 하에 배포됩니다.

```
MIT License

Copyright (c) achrefelouafi (원본)
Copyright (c) sigco3111 (한국어 fork)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🌐 한국어 fork 정보

| 항목 | 값 |
|---|---|
| **포크 시작일** | 2026-08-12 |
| **원본 HEAD** | (원본 저장소 마지막 커밋) |
| **한국어 fork HEAD** | (feat: 한글화 + i18n.js) |
| **배포 플랫폼** | Vercel |
| **라이브 도메인** | <https://sigco3111.github.io/BookcaseThreeJS> |

📚 **즐거운 책장 디자인 되세요!**
