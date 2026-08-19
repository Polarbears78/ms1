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

## 태양계 온라인 활동지 (`/taeyang/`)

Ⅶ. 태양계 1~5차시 온라인 활동지. 제출 수집·1회 제한·정답 공개는 Google Apps Script 연동(`taeyang/assets/config.js`에 웹 앱 URL 설정).
- 학생용: `taeyang/index.html` · 정답: `taeyang/answers.html` (교사가 공개 시)
- 교사용 정답 공개 관리: `taeyang/teacher.html` (주소 비공유)

## Ⅰ. 과학과 인류의 지속가능한 삶 온라인 활동지 (`/jisok/`)

Ⅰ단원 1~7차시 + 대단원 마무리 온라인 활동지. 제출 수집·1회 제한·정답 공개는 `taeyang/`과 **같은 Apps Script**를 사용하며, 활동지 ID는 충돌 방지를 위해 `sus1`~`sus8`을 씁니다.
- 학생용: `jisok/index.html` · 요약: `jisok/summary.html` · 정답: `jisok/answers.html`
- 교사용 정답 공개 관리: `jisok/teacher.html` (주소 비공유)
