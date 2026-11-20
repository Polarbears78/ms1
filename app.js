/* =========================================================================
 * 과학 단원 평가 - 앱 로직
 * 화면 흐름: 단원 선택 → 평가 목록 → 한 문제씩 풀이(+피드백) → 결과
 * 채점 UX: 보기 탭 = 선택만, '확인' 버튼 = 채점 (터치 오선택 방지)
 *   - toggleSelect(): 선택 표시만
 *   - submitChoice() → finalizeChoice(): '확인'을 눌러야 채점
 * ========================================================================= */
(function () {
  'use strict';

  // ---- 상태 ----
  var state = {
    unitId: null,
    assessmentKey: null,
    questions: [],
    index: 0,
    // 문항별 진행 상태: { sel:[label], value:'', submitted:bool, correct:bool|null, selfEval:'o'|'x'|null }
    progress: {},
  };

  var appEl;

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function nl2br(s) { return esc(s).replace(/\n/g, '<br>'); }

  function normalize(s) {
    return String(s == null ? '' : s)
      .trim().toLowerCase().replace(/\s+/g, '');
  }

  // ====================== 화면: 단원 선택 ======================
  function renderUnits() {
    state.unitId = null; state.assessmentKey = null;
    appEl.innerHTML = '';
    appEl.appendChild(el('h2', 'screen-title', '단원 선택'));
    var list = el('div', 'card-list');
    UNITS.forEach(function (u) {
      var available = !!u.available && (u.assessments || []).some(function (k) {
        return ASSESSMENTS[k] && (QUESTIONS[ASSESSMENTS[k].questions] || []).length > 0;
      });
      var card = el('button', 'card unit-card' + (available ? '' : ' disabled'));
      var grade = u.grade ? '<span class="badge">' + u.grade + '학년</span>' : '';
      card.innerHTML =
        '<div class="card-head"><span class="roman">' + esc(u.roman || '') + '</span>' + grade + '</div>' +
        '<div class="card-title">' + esc(u.title) + '</div>' +
        (u.pages ? '<div class="card-sub">교과서 ' + esc(u.pages) + '쪽</div>' : '') +
        (available ? '' : '<div class="card-sub muted">준비 중</div>');
      if (available) {
        card.addEventListener('click', function () { renderAssessments(u.id); });
      } else {
        card.disabled = true;
      }
      list.appendChild(card);
    });
    appEl.appendChild(list);
  }

  // ====================== 화면: 평가 목록 ======================
  function renderAssessments(unitId) {
    state.unitId = unitId;
    var unit = UNITS.filter(function (u) { return u.id === unitId; })[0];
    appEl.innerHTML = '';
    appEl.appendChild(navBar('단원 선택', renderUnits));
    appEl.appendChild(el('h2', 'screen-title', (unit.roman ? unit.roman + '. ' : '') + unit.title));
    var list = el('div', 'card-list');
    (unit.assessments || []).forEach(function (key) {
      var a = ASSESSMENTS[key];
      if (!a) return;
      var qs = QUESTIONS[a.questions] || [];
      var card = el('button', 'card assess-card' + (qs.length ? '' : ' disabled'));
      card.innerHTML =
        '<div class="card-title">' + esc(a.title) + '</div>' +
        '<div class="card-sub">' + esc(a.subtitle || '') + '</div>' +
        '<div class="card-sub muted">' + (qs.length ? qs.length + '문항' : '준비 중') + '</div>';
      if (qs.length) {
        card.addEventListener('click', function () { startAssessment(key); });
      } else { card.disabled = true; }
      list.appendChild(card);
    });
    appEl.appendChild(list);
  }

  function navBar(label, onBack) {
    var bar = el('div', 'navbar');
    var back = el('button', 'btn-back', '‹ ' + esc(label));
    back.addEventListener('click', onBack);
    bar.appendChild(back);
    return bar;
  }

  // ====================== 평가 시작 ======================
  function startAssessment(key) {
    state.assessmentKey = key;
    var a = ASSESSMENTS[key];
    state.questions = QUESTIONS[a.questions] || [];
    state.index = 0;
    state.progress = {};
    state.questions.forEach(function (q) {
      state.progress[q.id] = { sel: [], value: '', submitted: false, correct: null, selfEval: null };
    });
    renderQuestion(0);
  }

  // ====================== 화면: 문제 풀이 ======================
  function renderQuestion(i) {
    state.index = i;
    var q = state.questions[i];
    var p = state.progress[q.id];
    var a = ASSESSMENTS[state.assessmentKey];

    appEl.innerHTML = '';
    appEl.appendChild(navBar(a.title, function () { renderAssessments(state.unitId); }));

    // 진행 표시
    var prog = el('div', 'progress');
    prog.innerHTML = '<span class="qcount">' + (i + 1) + ' / ' + state.questions.length + '</span>' +
      '<div class="progress-bar"><div class="progress-fill" style="width:' +
      ((i + 1) / state.questions.length * 100) + '%"></div></div>';
    appEl.appendChild(prog);

    var card = el('div', 'question');

    // 문제 머리(번호/소단원/유형)
    var head = el('div', 'q-head');
    head.innerHTML = '<span class="q-no">' + q.id + '</span>' +
      (q.topic ? '<span class="q-topic">' + esc(q.topic) + '</span>' : '') +
      '<span class="q-type ' + q.type + '">' + typeLabel(q.type) + '</span>';
    card.appendChild(head);

    // 문제 본문
    card.appendChild(el('div', 'q-stem', nl2br(q.stem)));

    // 문제 그림
    if (q.image) {
      var fig = el('figure', 'q-figure');
      var img = el('img');
      img.src = q.image; img.alt = '문제 ' + q.id + ' 그림';
      fig.appendChild(img);
      if (q.figureNote) fig.appendChild(el('figcaption', null, esc(q.figureNote)));
      card.appendChild(fig);
    }

    // 유형별 입력 영역
    if (q.type === 'mc' || q.type === 'multi') {
      card.appendChild(buildChoices(q, p));
    } else if (q.type === 'short') {
      card.appendChild(buildShort(q, p));
    } else if (q.type === 'essay') {
      card.appendChild(buildEssay(q, p));
    }

    // 피드백 영역
    var fb = el('div', 'feedback');
    fb.id = 'feedback';
    card.appendChild(fb);

    appEl.appendChild(card);

    // 하단 버튼
    appEl.appendChild(buildFooter(q, p));

    // 이미 채점한 문항이면 피드백 복원
    if (p.submitted) showFeedback(q, p);
  }

  function typeLabel(t) {
    return { mc: '객관식', multi: '복수정답', short: '단답형', essay: '서술형' }[t] || t;
  }

  // ---- 객관식 / 복수정답 ----
  function buildChoices(q, p) {
    var wrap = el('div', 'choices' + (q.type === 'multi' ? ' multi' : ''));
    q.options.forEach(function (opt) {
      var b = el('button', 'choice');
      b.dataset.label = opt.label;
      if (opt.image) {
        b.classList.add('img-choice');
        b.innerHTML = '<span class="opt-label">' + esc(opt.label) + '</span>' +
          '<img src="' + esc(opt.image) + '" alt="보기 ' + esc(opt.label) + '">';
      } else {
        b.innerHTML = '<span class="opt-label">' + esc(opt.label) + '</span>' +
          '<span class="opt-text">' + esc(opt.text) + '</span>';
      }
      if (p.sel.indexOf(opt.label) !== -1) b.classList.add('selected');
      if (p.submitted) {
        b.disabled = true;
        markChoiceResult(b, q, opt.label, p);
      } else {
        b.addEventListener('click', function () { toggleSelect(q, opt.label); });
      }
      wrap.appendChild(b);
    });
    return wrap;
  }

  // 보기 탭 = 선택만 (채점 X)
  function toggleSelect(q, label) {
    var p = state.progress[q.id];
    if (p.submitted) return;
    if (q.type === 'multi') {
      var k = p.sel.indexOf(label);
      if (k === -1) p.sel.push(label); else p.sel.splice(k, 1);
    } else {
      p.sel = (p.sel[0] === label) ? [] : [label];
    }
    // 선택 표시만 갱신
    var btns = appEl.querySelectorAll('.choice');
    for (var j = 0; j < btns.length; j++) {
      var lbl = btns[j].dataset.label;
      btns[j].classList.toggle('selected', p.sel.indexOf(lbl) !== -1);
    }
    updateConfirmEnabled(q);
  }

  function answerSet(q) {
    return Array.isArray(q.answer) ? q.answer.slice() : [q.answer];
  }

  // '확인' 버튼 → 채점
  function submitChoice(q) {
    var p = state.progress[q.id];
    if (p.submitted || p.sel.length === 0) return;
    finalizeChoice(q);
  }
  function finalizeChoice(q) {
    var p = state.progress[q.id];
    var ans = answerSet(q).slice().sort();
    var sel = p.sel.slice().sort();
    p.correct = (ans.length === sel.length) && ans.every(function (v, k) { return v === sel[k]; });
    p.submitted = true;
    renderQuestion(state.index); // 채점 상태로 다시 그림(복원 로직 재사용)
  }

  function markChoiceResult(btn, q, label, p) {
    var ans = answerSet(q);
    if (ans.indexOf(label) !== -1) btn.classList.add('correct');
    if (p.sel.indexOf(label) !== -1 && ans.indexOf(label) === -1) btn.classList.add('wrong');
  }

  // ---- 단답형 ----
  function buildShort(q, p) {
    var wrap = el('div', 'short');
    var input = el('input', 'short-input');
    input.type = 'text';
    input.id = 'short-input';
    input.placeholder = '답을 입력하세요';
    input.value = p.value || '';
    if (p.submitted) input.disabled = true;
    input.addEventListener('input', function () {
      p.value = input.value;
      updateConfirmEnabled(q);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !p.submitted && normalize(input.value)) submitShort(q);
    });
    wrap.appendChild(input);
    return wrap;
  }
  function submitShort(q) {
    var p = state.progress[q.id];
    if (p.submitted) return;
    var inp = document.getElementById('short-input');
    p.value = inp ? inp.value : p.value;
    if (!normalize(p.value)) return;
    var candidates = [q.answer].concat(q.acceptable || []).map(normalize);
    p.correct = candidates.indexOf(normalize(p.value)) !== -1;
    p.submitted = true;
    renderQuestion(state.index);
  }

  // ---- 서술형 (모범답안 비교 · 자기평가) ----
  function buildEssay(q, p) {
    var wrap = el('div', 'essay');
    var ta = el('textarea', 'essay-input');
    ta.id = 'essay-input';
    ta.placeholder = '자신의 답안을 작성해 보세요 (선택)';
    ta.value = p.value || '';
    if (p.submitted) ta.disabled = true;
    ta.addEventListener('input', function () { p.value = ta.value; });
    wrap.appendChild(ta);
    return wrap;
  }
  function revealModel(q) {
    var p = state.progress[q.id];
    if (p.submitted) return;
    var ta = document.getElementById('essay-input');
    p.value = ta ? ta.value : p.value;
    p.submitted = true;
    renderQuestion(state.index);
  }
  function setSelfEval(q, v) {
    var p = state.progress[q.id];
    p.selfEval = v;
    p.correct = (v === 'o');
    renderQuestion(state.index);
  }

  // ---- 피드백 표시 ----
  function showFeedback(q, p) {
    var fb = document.getElementById('feedback');
    if (!fb) return;
    var html = '';
    if (q.type === 'essay') {
      html += '<div class="fb-tag model">모범답안</div>';
      html += '<div class="fb-body">' + nl2br(q.modelAnswer) + '</div>';
      html += '<div class="self-eval"><span>스스로 평가해 보세요:</span>' +
        '<button class="self-btn o' + (p.selfEval === 'o' ? ' on' : '') + '" data-ev="o">맞음</button>' +
        '<button class="self-btn x' + (p.selfEval === 'x' ? ' on' : '') + '" data-ev="x">틀림</button></div>';
      fb.className = 'feedback show ' + (p.selfEval === 'o' ? 'ok' : (p.selfEval === 'x' ? 'no' : 'neutral'));
      fb.innerHTML = html;
      var ob = fb.querySelector('.self-btn.o'), xb = fb.querySelector('.self-btn.x');
      if (ob) ob.addEventListener('click', function () { setSelfEval(q, 'o'); });
      if (xb) xb.addEventListener('click', function () { setSelfEval(q, 'x'); });
      return;
    }
    var ansText = answerSet(q).join(', ');
    if (q.type === 'short') ansText = q.answer;
    html += '<div class="fb-tag ' + (p.correct ? 'ok' : 'no') + '">' +
      (p.correct ? '정답입니다' : '오답입니다') + '</div>';
    html += '<div class="fb-answer">정답: <b>' + esc(ansText) + '</b></div>';
    if (q.explanation) html += '<div class="fb-body">' + nl2br(q.explanation) + '</div>';
    fb.className = 'feedback show ' + (p.correct ? 'ok' : 'no');
    fb.innerHTML = html;
  }

  // ---- 하단 버튼 ----
  function buildFooter(q, p) {
    var foot = el('div', 'footer');
    var prev = el('button', 'btn btn-ghost', '이전');
    prev.disabled = state.index === 0;
    prev.addEventListener('click', function () { if (state.index > 0) renderQuestion(state.index - 1); });
    foot.appendChild(prev);

    if (!p.submitted) {
      var confirm = el('button', 'btn btn-primary', q.type === 'essay' ? '모범답안 보기' : '확인');
      confirm.id = 'confirm-btn';
      confirm.disabled = !canConfirm(q, p);
      confirm.addEventListener('click', function () {
        if (q.type === 'mc' || q.type === 'multi') submitChoice(q);
        else if (q.type === 'short') submitShort(q);
        else if (q.type === 'essay') revealModel(q);
      });
      foot.appendChild(confirm);
    } else {
      var isLast = state.index === state.questions.length - 1;
      var next = el('button', 'btn btn-primary', isLast ? '결과 보기' : '다음');
      next.addEventListener('click', function () {
        if (isLast) renderResult(); else renderQuestion(state.index + 1);
      });
      foot.appendChild(next);
    }
    return foot;
  }

  function canConfirm(q, p) {
    if (q.type === 'essay') return true;
    if (q.type === 'short') return !!normalize(p.value);
    return p.sel.length > 0;
  }
  function updateConfirmEnabled(q) {
    var btn = document.getElementById('confirm-btn');
    if (btn) btn.disabled = !canConfirm(q, state.progress[q.id]);
  }

  // ====================== 화면: 결과 ======================
  function renderResult() {
    var a = ASSESSMENTS[state.assessmentKey];
    var auto = 0, autoTotal = 0, essay = 0, essayTotal = 0;
    state.questions.forEach(function (q) {
      var p = state.progress[q.id];
      if (q.type === 'essay') {
        essayTotal++;
        if (p.selfEval === 'o') essay++;
      } else {
        autoTotal++;
        if (p.correct) auto++;
      }
    });

    appEl.innerHTML = '';
    appEl.appendChild(navBar('평가 목록', function () { renderAssessments(state.unitId); }));
    appEl.appendChild(el('h2', 'screen-title', '결과'));

    var summary = el('div', 'result-summary');
    summary.innerHTML =
      '<div class="score-main"><span class="score-num">' + auto + '</span>' +
      '<span class="score-den"> / ' + autoTotal + '</span></div>' +
      '<div class="score-label">자동 채점 (객관식·복수정답·단답형)</div>' +
      (essayTotal ? '<div class="score-sub">서술형 자기평가: ' + essay + ' / ' + essayTotal + '</div>' : '');
    appEl.appendChild(summary);

    var list = el('div', 'result-list');
    state.questions.forEach(function (q, idx) {
      var p = state.progress[q.id];
      var stat, cls;
      if (q.type === 'essay') {
        stat = p.selfEval === 'o' ? '맞음' : (p.selfEval === 'x' ? '틀림' : '미평가');
        cls = p.selfEval === 'o' ? 'ok' : (p.selfEval === 'x' ? 'no' : 'neutral');
      } else {
        stat = p.correct ? '정답' : '오답';
        cls = p.correct ? 'ok' : 'no';
      }
      var row = el('button', 'result-row ' + cls);
      row.innerHTML = '<span class="r-no">' + q.id + '</span>' +
        '<span class="r-topic">' + esc(q.topic || '') + '</span>' +
        '<span class="r-stat ' + cls + '">' + stat + '</span>';
      row.addEventListener('click', function () { renderQuestion(idx); });
      list.appendChild(row);
    });
    appEl.appendChild(list);

    var foot = el('div', 'footer');
    var retry = el('button', 'btn btn-ghost', '다시 풀기');
    retry.addEventListener('click', function () { startAssessment(state.assessmentKey); });
    var home = el('button', 'btn btn-primary', '단원 선택으로');
    home.addEventListener('click', renderUnits);
    foot.appendChild(retry); foot.appendChild(home);
    appEl.appendChild(foot);
  }

  // ====================== 초기화 ======================
  function init() {
    appEl = document.getElementById('app');
    if (!appEl) return;
    renderUnits();
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else { init(); }
  }

  // 테스트(jsdom)용 노출
  if (typeof window !== 'undefined') {
    window.__app = {
      state: state, init: init,
      renderUnits: renderUnits, renderAssessments: renderAssessments,
      startAssessment: startAssessment, renderQuestion: renderQuestion,
      toggleSelect: toggleSelect, submitChoice: submitChoice,
      finalizeChoice: finalizeChoice, submitShort: submitShort,
      revealModel: revealModel, setSelfEval: setSelfEval, renderResult: renderResult,
      normalize: normalize,
    };
  }
})();
