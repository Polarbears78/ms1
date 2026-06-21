/* jsdom 시뮬레이션: 단원선택 → 풀이 → '확인' 채점 → 결과 흐름 검증 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const dataJs = fs.readFileSync(path.join(root, 'data.js'), 'utf8');
const appJs = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true });
const { window } = dom;
const { document } = window;

// 스크립트 주입: 브라우저처럼 같은 전역 렉시컬 스코프에서 함께 실행
window.eval(dataJs + '\n' + appJs +
  '\nwindow.UNITS=UNITS; window.ASSESSMENTS=ASSESSMENTS; window.QUESTIONS=QUESTIONS;');
window.__app.init();

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; } else { fail++; console.error('  ✗ ' + msg); } }
function click(elm) {
  const ev = new window.Event('click', { bubbles: true });
  elm.dispatchEvent(ev);
}
function setInput(elm, val) {
  elm.value = val;
  elm.dispatchEvent(new window.Event('input', { bubbles: true }));
}
function q(sel) { return document.querySelector(sel); }
function qa(sel) { return Array.from(document.querySelectorAll(sel)); }

console.log('1) 단원 선택 화면 (1학년 전용)');
ok(/단원 선택/.test(q('.screen-title').textContent), '단원 선택 타이틀');
const unitCards = qa('.unit-card');
ok(unitCards.length === 1, '단원 카드 1개 (힘의 작용만), got ' + unitCards.length);
const forceCard = unitCards.find(c => /힘의 작용/.test(c.textContent));
ok(!!forceCard && !forceCard.disabled, '힘의 작용 카드 활성');
ok(!qa('.unit-card').some(c => /빛과 파동/.test(c.textContent)), '빛과 파동 단원 제거됨');

console.log('2) 평가 목록 → 평가 시작');
click(forceCard);
ok(/힘의 작용/.test(q('.screen-title').textContent), '평가 목록 타이틀');
const assessCard = q('.assess-card');
ok(/20문항/.test(assessCard.textContent), '20문항 표기');
click(assessCard);
ok(/1 \/ 20/.test(q('.qcount').textContent), '진행 1/20');

console.log('3) 1번(객관식) 단일 선택 + 그림 렌더 없음, 확인 채점');
ok(q('.q-stem').textContent.length > 5, '문제 본문 렌더');
let confirm = q('#confirm-btn');
ok(confirm.disabled, '선택 전 확인 비활성');
let choices = qa('.choice');
ok(choices.length === 5, '보기 5개');
click(choices[2]); // ③ 선택
ok(choices[2].classList.contains('selected'), '탭 시 선택 표시');
ok(!q('#feedback').classList.contains('show'), '탭만으로는 채점 안 됨');
// 단일 선택: 다른 것 누르면 교체
click(choices[1]); // ② 선택 (정답)
ok(!choices[2].classList.contains('selected'), '단일 선택 교체(이전 해제)');
ok(choices[1].classList.contains('selected'), '새 선택 표시');
confirm = q('#confirm-btn');
ok(!confirm.disabled, '선택 후 확인 활성');
click(confirm); // 채점
ok(q('#feedback').classList.contains('show'), '확인 후 피드백 표시');
ok(q('.fb-tag').classList.contains('ok'), '1번 정답(②) 처리');

console.log('4) 결과까지 모두 풀이 (정답률 검증)');
const ANS = window.QUESTIONS['force-final-1-q'];
// 1번은 이미 정답 처리됨 → 다음
click(q('.footer .btn-primary')); // 다음
for (let i = 1; i < ANS.length; i++) {
  const qq = ANS[i];
  if (qq.type === 'mc' || qq.type === 'multi') {
    const cs = qa('.choice');
    const targets = Array.isArray(qq.answer) ? qq.answer : [qq.answer];
    targets.forEach(t => { const b = cs.find(c => c.dataset.label === t); click(b); });
    click(q('#confirm-btn'));
    ok(q('.fb-tag').classList.contains('ok'), '문항 ' + qq.id + ' 정답 채점');
  } else if (qq.type === 'short') {
    setInput(q('#short-input'), qq.answer);
    click(q('#confirm-btn'));
    ok(q('.fb-tag').classList.contains('ok'), '단답 ' + qq.id + ' 정답 채점');
  } else if (qq.type === 'essay') {
    click(q('#confirm-btn')); // 모범답안 보기
    ok(/모범답안/.test(q('#feedback').textContent), '서술 ' + qq.id + ' 모범답안 표시');
    click(q('.self-btn.o')); // 자기평가 맞음
    ok(q('.self-btn.o').classList.contains('on'), '서술 ' + qq.id + ' 자기평가 반영');
  }
  // 다음/결과
  const primary = q('.footer .btn-primary');
  click(primary);
}

console.log('5) 결과 화면');
ok(/결과/.test(q('.screen-title').textContent), '결과 타이틀');
ok(/16/.test(q('.score-num').textContent), '자동 채점 16/16 (객관식12+단답4), got ' + q('.score-num').textContent);
ok(/\/ 16/.test(q('.score-den').textContent), '자동 채점 분모 16');
ok(/4 \/ 4/.test(q('.score-sub').textContent), '서술형 자기평가 4/4');
ok(qa('.result-row').length === 20, '결과 행 20개');

console.log('6) 그림/보기그림 렌더 + 복수선택 + 재방문 복원');
// 5번 문항으로 직접 이동(결과행 클릭): index 4
const row5 = qa('.result-row')[4];
click(row5);
ok(/5 \/ 20/.test(q('.qcount').textContent), '5번 문항 이동');
ok(qa('.choice.img-choice img').length === 5, '5번 보기 그림 5개 렌더');
ok(!!q('.q-figure img'), '5번 문제 그림 렌더');
// 재방문 복원: 이미 채점됐으므로 정답 표시 + 비활성
ok(q('#feedback').classList.contains('show'), '재방문 시 피드백 복원');
ok(qa('.choice')[3].classList.contains('correct'), '재방문 시 정답(④) 강조 복원');
ok(qa('.choice')[0].disabled, '재방문 시 보기 비활성');

// 오답 시나리오: 다시 풀기 후 1번 오답 선택
console.log('7) 오답 채점 + 복수정답 다중 선택');
window.__app.startAssessment('force-final-1');
let cs1 = qa('.choice');
click(cs1[0]); // ① (오답)
click(q('#confirm-btn'));
const cs1after = qa('.choice'); // 채점 후 재렌더된 보기
ok(q('.fb-tag').classList.contains('no'), '오답 시 오답 처리');
ok(cs1after[0].classList.contains('wrong'), '선택한 오답 강조');
ok(cs1after[1].classList.contains('correct'), '정답 위치 강조');

console.log('\n결과: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
