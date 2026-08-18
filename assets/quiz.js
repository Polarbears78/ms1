/* 활동지 렌더링 + 제출 (QUIZ_ID는 각 wsN.html에서 정의) */
(function () {
  const quiz = QUIZZES[QUIZ_ID];
  document.getElementById("qz-title").textContent = quiz.title;
  document.getElementById("qz-pages").textContent = quiz.pages;

  const box = document.getElementById("questions");
  quiz.items.forEach((it, i) => {
    const div = document.createElement("div");
    div.className = "q";
    const badge = it.type === "long" ? '<span class="badge">서술형</span>' : `<span class="badge">${i + 1}번</span>`;
    let inner = `<div class="qtext">${badge}${esc(it.q)}</div>`;
    if (it.type === "text") {
      inner += `<input type="text" id="a${i}" autocomplete="off" placeholder="답 입력">`;
    } else if (it.type === "choice") {
      it.choices.forEach((c, j) => {
        inner += `<label class="choice"><input type="radio" name="a${i}" value="${j}">${esc(c)}</label>`;
      });
    } else {
      inner += `<textarea id="a${i}" placeholder="문장으로 서술하세요"></textarea>`;
    }
    div.innerHTML = inner;
    box.appendChild(div);
  });

  document.getElementById("submitBtn").addEventListener("click", async () => {
    const sid = document.getElementById("sid").value.trim();
    const name = document.getElementById("sname").value.trim();
    const resBox = document.getElementById("resultBox");
    if (!/^\d{4,5}$/.test(sid)) return showErr("학번을 정확히 입력하세요. (예: 1반 3번 → 10103)");
    if (name.length < 2) return showErr("이름을 입력하세요.");

    const answers = quiz.items.map((it, i) => {
      if (it.type === "choice") {
        const sel = document.querySelector(`input[name="a${i}"]:checked`);
        return sel ? Number(sel.value) : null;
      }
      return document.getElementById("a" + i).value.trim();
    });
    if (answers.some(a => a === null || a === "")) {
      if (!confirm("아직 답하지 않은 문항이 있습니다. 제출은 1회만 가능합니다. 그래도 제출할까요?")) return;
    }

    const btn = document.getElementById("submitBtn");
    btn.disabled = true; btn.textContent = "제출 중...";
    try {
      const r = await fetch(SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "submit", ws: QUIZ_ID, sid, name, answers })
      });
      const d = await r.json();
      if (d.error === "duplicate") {
        showErr("이미 제출한 기록이 있습니다. 제출은 학생당 1회만 가능합니다.");
      } else if (d.ok) {
        let html = `<b>제출 완료!</b> 자동 채점 점수: <b>${d.score} / ${d.total}</b> (서술형 제외)<br>`;
        html += d.marks.map((m, i) => m === null ? "" :
          `<div>${i + 1}번: ${m ? '<span class="mark-ok">정답</span>' : '<span class="mark-no">오답</span>'}</div>`).join("");
        html += `<p class="note">서술형은 선생님이 확인합니다. 정답과 해설은 수업 후 [정답 보기] 페이지에서 공개됩니다.</p>`;
        resBox.className = "result ok"; resBox.innerHTML = html;
        document.querySelectorAll("input,textarea,button").forEach(el => el.disabled = true);
      } else {
        showErr(d.message || "제출에 실패했습니다. 다시 시도하세요.");
        btn.disabled = false; btn.textContent = "제출하기 (1회만 가능)";
      }
    } catch (e) {
      showErr("서버에 연결할 수 없습니다. 와이파이 연결을 확인하고 다시 시도하세요.");
      btn.disabled = false; btn.textContent = "제출하기 (1회만 가능)";
    }
    resBox.scrollIntoView({ behavior: "smooth" });

    function showErr(msg) {
      resBox.className = "result err"; resBox.textContent = msg;
    }
  });

  function esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }
})();
