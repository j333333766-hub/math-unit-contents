# math-unit-contents

수학 단원의 다양한 체험형 콘텐츠(html)를 모아두고, `index.html`을 통해 한눈에 접근할 수 있게 구성한 저장소입니다.
노트북·태블릿에서 학생이 직접 조작하며 교과서 활동을 체험하는 것을 목표로 합니다.

**학생 접속 주소** → <https://j333333766-hub.github.io/math-unit-contents/>

## 폴더 구조

```
math-unit-contents/
├── index.html                       # 콘텐츠 목록(메인 허브) 페이지
├── contents/                        # 실제 콘텐츠 html 파일들을 넣는 폴더
│   ├── sample-content.html          #  └ 새 콘텐츠를 만들 때 복사해서 쓰는 예시
│   ├── 01-pixel-zoom.html           # 픽셀 돋보기          (중1 Ⅳ단원 137쪽)
│   ├── 02-point-line-plane.html     # 점·선·면 탐구실      (137~139쪽)
│   ├── 03-angle-lab.html            # 각도 실험실          (141~143쪽)
│   ├── 04-perp-foot.html            # 수선의 발과 거리      (144쪽)
│   ├── 05-space-3d.html             # 3D 위치 관계 탐험     (146~151쪽)
│   ├── 06-mole-game.html            # 두더지 잡기          (152쪽)
│   ├── 07-parallel-angles.html      # 평행선 각 탐구실      (153~155쪽)
│   ├── 08-aux-line.html             # 보조선 도전          (154~155쪽)
│   ├── 09-illusion.html             # 착시 실험실          (156쪽)
│   ├── 11-triangle-condition.html   # 삼각형 결정 조건      (159·163쪽)
│   └── 12-congruence.html           # 합동 포개기          (165~167쪽)
└── assets/
    ├── style.css                    # 허브 페이지와 간단한 콘텐츠가 쓰는 스타일시트
    ├── common.css                   # 색·글꼴 토큰, '목차로' 버튼, 기본 부품
    ├── common.js                    # 목차 버튼 자동 삽입, 학습 기록, 캔버스 도우미(MK)
    └── vendor/
        ├── tex-svg.js               # MathJax (수식 표시)
        └── three.min.js             # Three.js (3차원 도형)
```

`assets/vendor/`의 라이브러리는 각 html에 붙여 넣지 않고 **한 벌만** 두고 함께 씁니다.
덕분에 콘텐츠 한 개가 30~60KB로 가벼워지고, 한 반 전체가 동시에 열어도 학교 무선망에 부담이 적습니다.

## 새 콘텐츠 추가하는 방법

1. `contents/` 폴더 안에 새 html 파일을 추가합니다.
   - 간단한 설명형 페이지 → `contents/sample-content.html`을 복사해서 시작
   - 조작·게임형 페이지 → `contents/06-mole-game.html`을 참고 (아래 공용 자산 사용)
2. `index.html` 안의 `contentsList` 배열에 새 항목을 한 줄 추가합니다.

```js
const contentsList = [
  {
    title: "카드에 보일 제목",
    desc: "카드에 보일 한 줄 설명",
    badge: "중1 Ⅳ단원 · 평행선의 성질",   // 학년·단원·소단원을 적어두면 늘어나도 구분이 쉽습니다
    href: "contents/새파일이름.html"
  },
];
```

3. 커밋 후 push 하면 GitHub Pages에 30초~1분 뒤 자동 반영됩니다.

```bash
git add -A
git commit -m "합동 포개기 콘텐츠 추가"
git push
```

### 조작형 콘텐츠에서 쓰는 공용 자산

`<head>` 에 아래 두 줄을 넣습니다.

```html
<link rel="stylesheet" href="../assets/common.css">
<script src="../assets/common.js" data-home="../index.html" defer></script>
```

수식이나 3차원 도형이 필요하면 필요한 것만 더 넣습니다.

```html
<script src="../assets/vendor/tex-svg.js"></script>    <!-- 수식 -->
<script src="../assets/vendor/three.min.js"></script>  <!-- 3차원 -->
```

`<header>` 안 맨 끝에 목차 버튼을 넣습니다. (안 넣으면 화면 오른쪽 위에 자동으로 뜹니다.)

```html
<a class="home-btn" href="../index.html">← 목차</a>
```

> `common.js`는 `defer`로 실행되므로, 콘텐츠의 인라인 스크립트에서 `MK`를 쓸 때는
> `DOMContentLoaded` 이후에 시작해야 합니다. (`06-mole-game.html`의 `boot()` 참고)

### `common.js` 가 제공하는 도구 (`MK`)

| 함수 | 하는 일 |
|---|---|
| `MK.$(id)` | 아이디로 요소 찾기 |
| `MK.fit(canvas, draw)` | 캔버스를 부모 크기에 맞추고 고해상도로 그리기 (창 크기 변경 자동 대응) |
| `MK.pos(canvas, ev)` | 마우스·터치 좌표를 캔버스 기준으로 변환 |
| `MK.dist / MK.deg` | 두 점 사이 거리 / 라디안→도 |
| `MK.randInt / MK.pick` | 문제 무작위 생성용 |
| `MK.tex(el)` | MathJax 수식 다시 조판 |
| `MK.visited()` | 학생이 학습한 콘텐츠 목록 (localStorage `ch4.visited`) |

## GitHub Pages로 배포하기

1. 저장소의 **Settings > Pages**로 이동합니다.
2. **Source**를 `Deploy from a branch`로 설정합니다.
3. Branch를 `main`, 폴더를 `/(root)`로 선택하고 저장합니다.
4. 잠시 후 `https://<사용자아이디>.github.io/math-unit-contents/` 주소로 접속하면 됩니다.

## 중1 Ⅳ. 도형의 기초 — 개발 예정 목록

교과서(김화경 외) 136~175쪽 분석에 따른 콘텐츠 계획입니다.

| 소단원 | 콘텐츠 | 교과서 |
|---|---|---|
| 1. 점, 선, 면 | ✅ 픽셀 돋보기 · ✅ 점·선·면 탐구실 | 137~140 |
| 2. 각 | ✅ 각도 실험실 · ✅ 수선의 발과 거리 | 141~145 |
| 3. 위치 관계 | ✅ 3D 위치 관계 탐험(꼬인 위치) | 146~151 |
| 4. 평행선의 성질 | ✅ 두더지 잡기 · ✅ 평행선 각 탐구실 · ✅ 보조선 도전 · ✅ 착시 실험실 | 152~156 |
| 5. 삼각형의 작도 | ⬜ 가상 작도판(자·컴퍼스) · ✅ 삼각형 결정 조건 | 157~164 |
| 6. 삼각형의 합동 | ✅ 합동 포개기(SSS·SAS·ASA) | 165~169 |
| 더 해 보기 | ⬜ 에그 퍼즐 · ⬜ 흔들리지 않는 삼각형(트러스) | 174~175 |

남은 것은 **가상 작도판**(눈금 없는 자·컴퍼스로 직접 작도, 교과서 QR 5개가 몰려 있는 핵심),
**에그 퍼즐**, **트러스 구조** 세 가지입니다.

> 교과서 원본 PDF 등 저작권 자료는 `.gitignore`로 제외되어 있습니다. 공개 저장소이므로 올리지 않습니다.

---

인천구월중학교 수학과 · 2026학년도
