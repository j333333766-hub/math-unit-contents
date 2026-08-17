# math-unit-contents

수학 단원의 다양한 체험형 콘텐츠(html)를 모아두고, `index.html`을 통해 한눈에 접근할 수 있게 구성한 저장소입니다.

## 폴더 구조

```
math-unit-contents/
├── index.html            # 콘텐츠 목록(메인 허브) 페이지
├── contents/              # 실제 콘텐츠 html 파일들을 넣는 폴더
│   └── sample-content.html
└── assets/
    └── style.css          # 모든 페이지가 공유하는 스타일시트
```

## 새 콘텐츠 추가하는 방법

1. `contents/` 폴더 안에 새 html 파일을 추가합니다. (`contents/sample-content.html` 파일을 복사해서 시작하면 편합니다.)
2. `index.html` 안의 `contentsList` 배열에 새 항목을 한 줄 추가합니다.

```js
const contentsList = [
  {
    title: "카드에 보일 제목",
    desc: "카드에 보일 한 줄 설명",
    badge: "개념 / 예제 / 연습문제 등",
    href: "contents/새파일이름.html"
  },
];
```

3. 커밋 후 GitHub Pages를 통해 배포하면 바로 웹에서 확인할 수 있습니다.

## GitHub Pages로 배포하기

1. 저장소의 **Settings > Pages**로 이동합니다.
2. **Source**를 `Deploy from a branch`로 설정합니다.
3. Branch를 `main`, 폴더를 `/(root)`로 선택하고 저장합니다.
4. 잠시 후 `https://<사용자아이디>.github.io/math-unit-contents/` 주소로 접속하면 됩니다.
