# 과학 단원 평가 (ms1)

중학교 과학 단원 평가용 정적 웹앱입니다.

- 화면 흐름: 단원 선택 → 평가 목록 → 한 문제씩 풀이(+정답 피드백) → 결과
- 보기 탭 = 선택만, **확인** 버튼 = 채점 (터치 오선택 방지)
- 단답형 정규화 채점, 서술형 모범답안 비교(자기평가)

## 구조
- `index.html` / `styles.css` / `app.js` / `data.js`
- `assets/figures/` : 문항 그림
- `test/sim.js` : jsdom 흐름 검증 (`npm test`)

## 배포
GitHub Pages (`.github/workflows/deploy-pages.yml`).
