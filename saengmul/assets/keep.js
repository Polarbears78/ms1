/* 임시 저장 · 제출 내용 보관 (quiz.js는 수정하지 않습니다)
   - 학생이 입력하는 즉시 이 기기의 브라우저에 임시 저장합니다.
   - 실수로 창을 닫거나 새로고침해도 다시 열면 그대로 남아 있습니다.
   - 제출을 누르면 그 시점의 내용을 따로 보관하여 view.html에서 다시 볼 수 있습니다.
   - 저장 위치는 학생 기기이며 서버로 전송되지 않습니다.
   sus*.html에서 quiz.js 다음에 불러오세요. */
(function () {
  "use strict";
  if (typeof QUIZ_ID === "undefined" || typeof QUIZZES === "undefined") return;

  var quiz = QUIZZES[QUIZ_ID];
  if (!quiz) return;

  var DRAFT = "ms1:draft:" + QUIZ_ID;
  var SENT = "ms1:sent:" + QUIZ_ID;
  var timer = null;

  function readAll() {
    return quiz.items.map(function (it, i) {
      if (it.type === "choice") {
        var sel = document.querySelector('input[name="a' + i + '"]:checked');
        return sel ? Number(sel.value) : null;
      }
      var el = document.getElementById("a" + i);
      return el ? el.value : "";
    });
  }

  function writeAll(answers) {
    if (!answers) return;
    quiz.items.forEach(function (it, i) {
      var v = answers[i];
      if (it.type === "choice") {
        if (v === null || v === undefined) return;
        var r = document.querySelector('input[name="a' + i + '"][value="' + v + '"]');
        if (r) r.checked = true;
      } else {
        var el = document.getElementById("a" + i);
        if (el && v) { el.value = v; autosize(el); }
      }
    });
  }

  function autosize(el) {
    if (el.tagName !== "TEXTAREA") return;
    el.style.height = "auto";
    el.style.height = Math.max(el.scrollHeight, 96) + "px";
  }

  function snapshot(kind) {
    var payload = {
      ws: QUIZ_ID,
      title: quiz.title,
      sid: (document.getElementById("sid") || {}).value || "",
      name: (document.getElementById("sname") || {}).value || "",
      answers: readAll(),
      at: new Date().toISOString(),
      submitted: kind === "sent"
    };
    try {
      localStorage.setItem(kind === "sent" ? SENT : DRAFT, JSON.stringify(payload));
    } catch (e) { /* 저장 공간 부족 시 조용히 넘어갑니다 */ }
    return payload;
  }

  function setBadge(text, tone) {
    var el = document.getElementById("keepState");
    if (!el) return;
    el.textContent = text;
    el.style.color = tone === "ok" ? "#0a6363" : "#7f8d89";
  }

  /* 복원 — 제출본이 있으면 제출본, 없으면 임시 저장분 */
  try {
    var sent = JSON.parse(localStorage.getItem(SENT) || "null");
    var draft = JSON.parse(localStorage.getItem(DRAFT) || "null");
    var src = sent || draft;
    if (src) {
      writeAll(src.answers);
      var sidEl = document.getElementById("sid");
      var nmEl = document.getElementById("sname");
      if (sidEl && !sidEl.value) sidEl.value = src.sid || "";
      if (nmEl && !nmEl.value) nmEl.value = src.name || "";
      setBadge(sent ? "제출한 내용을 불러왔습니다" : "임시 저장된 내용을 불러왔습니다", "ok");
    }
  } catch (e) { /* 무시 */ }

  document.querySelectorAll("#questions textarea").forEach(autosize);

  /* 입력 즉시 임시 저장 */
  ["input", "change"].forEach(function (ev) {
    document.addEventListener(ev, function (e) {
      if (!e.target.closest || !e.target.closest("#questions")) return;
      if (e.target.tagName === "TEXTAREA") autosize(e.target);
      clearTimeout(timer);
      timer = setTimeout(function () {
        snapshot("draft");
        setBadge("임시 저장됨 " + new Date().toTimeString().slice(0, 5));
      }, 500);
    }, true);
  });
  window.addEventListener("beforeunload", function () { snapshot("draft"); });

  /* 제출 버튼을 누른 시점의 내용을 캡처 단계에서 미리 보관 */
  var btn = document.getElementById("submitBtn");
  if (btn) btn.addEventListener("click", function () { snapshot("draft"); }, true);

  /* 제출 성공(결과창이 ok가 되는 순간)에만 제출본으로 확정 */
  var box = document.getElementById("resultBox");
  if (box && window.MutationObserver) {
    new MutationObserver(function () {
      if (box.classList.contains("ok")) {
        snapshot("sent");
        setBadge("제출 완료 — [내가 쓴 것 보기]에서 다시 볼 수 있습니다", "ok");
      }
    }).observe(box, { attributes: true, attributeFilter: ["class"] });
  }
})();
