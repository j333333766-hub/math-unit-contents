/* ===========================================================
   학습 기록 보내기 (교사용 현황판과 짝을 이룸)

   각 콘텐츠 <head> 에 한 줄만 넣으면 된다.
     <script src="../assets/track.js?v=2" defer></script>
   목차(index.html)에서는 <script src="assets/track.js?v=2" defer></script>

   · 학생을 **번호**로만 구분한다. 이름·학년·반·계정은 받지 않는다.
     (한 태블릿을 여러 반이 돌려 쓰므로 학년·반은 오히려 걸림돌이었다.
      어느 반인지는 교사 현황판이 '수업 시간대'로 구분한다.)
   · 지난 시간 번호가 남아 있지 않도록 **일정 시간 뒤 자동으로 풀린다**.
     화면 오른쪽 위 '○번' 단추를 누르면 언제든 번호를 바꿀 수 있다.
   · 보내는 것 : 어떤 콘텐츠를 열었는지, 화면을 보고 있는지, 활동 전환,
                 정답·완료 표시가 떴는지, 그리고 **점수**(MKLOG.score). 답안 내용 자체는 보내지 않는다.
   · 기록 서버(Apps Script)가 꺼져 있어도 콘텐츠는 그대로 동작한다.
   =========================================================== */
(function(){
  "use strict";

  /* ---------- 설정 : 배포 주소가 바뀌면 이 줄만 고친다 ---------- */
  var ENDPOINT = "https://script.google.com/macros/s/AKfycbzSgerg_gkoiA3y98x_xp3CCIqyKZV0A3CVfrUCjG8wBdd4hT3N8VabA2v_tfUvX2hslw/exec";

  var BEAT_MS  = 25000;            /* 살아 있다는 신호 간격 */
  var HOLD_MS  = 50 * 60 * 1000;   /* 이만큼 안 쓰면 번호가 자동으로 풀린다(한 교시 + 쉬는 시간) */
  var NO_KEY   = "mk.no";          /* 번호 저장 (옛 mk.id 는 버린다) */
  var Q_KEY    = "mk.queue";
  var MAX_NO   = 45;

  if(!ENDPOINT || location.protocol === "file:") return;   /* 주소 미설정·로컬 파일이면 조용히 끔 */

  /* ---------- 페이지 이름 ---------- */
  var PAGE = (function(){
    var f = location.pathname.split("/").pop() || "index.html";
    return f.replace(/\.html?$/i, "") || "index";
  })();
  var SID = Math.random().toString(36).slice(2, 10);

  /* ---------- 학생 번호 ---------- */
  /* 저장 형태 : {n: 번호, t: 마지막으로 쓴 시각(ms)} */
  var NO = null;
  try{ localStorage.removeItem("mk.id"); }catch(e){}      /* 학년·반 쓰던 옛 기록은 지운다 */
  try{
    var saved = JSON.parse(localStorage.getItem(NO_KEY) || "null");
    if(saved && saved.n >= 1 && saved.n <= MAX_NO){
      /* 오래 묵은 번호는 지난 시간 학생 것이므로 쓰지 않는다 */
      if(Date.now() - (Number(saved.t) || 0) < HOLD_MS) NO = Number(saved.n);
      else localStorage.removeItem(NO_KEY);
    }
  }catch(e){}

  function keepNo(){
    if(!NO) return;
    try{ localStorage.setItem(NO_KEY, JSON.stringify({n:NO, t:Date.now()})); }catch(e){}
  }

  /* ---------- 보낼 것 모아 두기 ---------- */
  var Q = [];
  try{
    var q = JSON.parse(localStorage.getItem(Q_KEY) || "[]");
    if(q.length) Q = q.slice(-60);
    localStorage.removeItem(Q_KEY);
  }catch(e){}

  function visible(){ return document.visibilityState !== "hidden"; }
  function push(kind, detail, now, sc){
    var ev = {t:Date.now(), k:kind, p:PAGE, d:(detail || "").slice(0,150), v:visible() ? 1 : 0};
    if(typeof sc === "number" && isFinite(sc)) ev.sc = Math.round(sc);   /* 점수가 있는 콘텐츠용 */
    Q.push(ev);
    if(Q.length > 120) Q = Q.slice(-120);
    if(now) flush(false);
  }
  function flush(useBeacon){
    if(!NO || !Q.length) return;
    keepNo();                                  /* 쓰고 있는 동안에는 번호가 안 풀리게 */
    var batch = Q.splice(0, 60);
    var body = JSON.stringify({s:{n:NO, sid:SID}, e:batch});
    var sent = false;
    if(useBeacon && navigator.sendBeacon){
      try{
        sent = navigator.sendBeacon(ENDPOINT, new Blob([body], {type:"text/plain;charset=UTF-8"}));
      }catch(e){ sent = false; }
    }
    if(sent) return;
    if(!window.fetch){ Q = batch.concat(Q); return; }
    fetch(ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      cache: "no-store",
      headers: {"Content-Type": "text/plain;charset=utf-8"},
      body: body
    })["catch"](function(){
      Q = batch.concat(Q).slice(-120);          /* 실패하면 다음 기회에 다시 */
    });
  }

  /* ---------- 화면 구석의 번호 단추 ---------- */
  var badge;
  function paintBadge(){
    if(!badge) return;
    badge.innerHTML = NO
      ? '<b>' + NO + '번</b><span>바꾸기</span>'
      : '<b>번호 입력</b><span>눌러 주세요</span>';
    badge.className = "mk-track-badge" + (NO ? "" : " off");
    badge.title = NO ? "내 번호 바꾸기" : "번호를 입력해 주세요";
  }
  function makeBadge(){
    badge = document.createElement("button");
    badge.type = "button";
    badge.onclick = function(){ askNo(true); };
    document.body.appendChild(badge);
    paintBadge();
  }

  /* ---------- 번호 입력 ---------- */
  function askNo(manual){
    if(document.querySelector(".mk-track-back")) return;
    var back = document.createElement("div");
    back.className = "mk-track-back";
    back.innerHTML =
      '<div class="mk-track-box">' +
        '<h3>' + (manual ? "번호 바꾸기" : "내 번호를 눌러 주세요") + '</h3>' +
        '<p>학습 기록을 남기기 위해 <b>출석 번호</b>만 받습니다.<br>이름·반은 받지 않습니다.</p>' +
        '<div class="mk-track-pad" id="mkPad"></div>' +
        '<div class="mk-track-manual">' +
          '<label>직접 입력<input type="number" id="mkN" min="1" max="' + MAX_NO + '" inputmode="numeric"></label>' +
        '</div>' +
        '<div class="mk-track-err" id="mkErr"></div>' +
        '<div class="mk-track-btns">' +
          (manual ? '<button type="button" class="ghost" id="mkCancel">취소</button>' : "") +
          '<button type="button" class="go" id="mkOk">시작하기</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(back);

    var n = back.querySelector("#mkN");
    var pad = back.querySelector("#mkPad");

    /* 태블릿에서 키보드를 안 띄우고 바로 고르도록 1~35 번호판을 깐다 */
    var padHtml = "";
    for(var i=1;i<=35;i++) padHtml += '<button type="button" data-n="' + i + '">' + i + '</button>';
    pad.innerHTML = padHtml;
    function markPad(){
      var bs = pad.querySelectorAll("button");
      for(var k=0;k<bs.length;k++){
        bs[k].className = (Number(bs[k].getAttribute("data-n")) === Number(n.value)) ? "on" : "";
      }
    }
    pad.addEventListener("click", function(ev){
      var b = ev.target.closest("button[data-n]");
      if(!b) return;
      n.value = b.getAttribute("data-n");
      markPad();
      ok();                                    /* 한 번 누르면 바로 시작 */
    });

    if(NO) n.value = NO;
    markPad();
    n.oninput = markPad;

    function close(){ back.remove(); }
    function ok(){
      var v = Number(n.value);
      if(!(v >= 1 && v <= MAX_NO)){
        back.querySelector("#mkErr").textContent = "번호는 1~" + MAX_NO + " 사이로 입력해 주세요.";
        return;
      }
      var changed = (v !== NO);
      NO = v;
      keepNo();
      paintBadge();
      close();
      if(changed) SID = Math.random().toString(36).slice(2, 10);   /* 사람이 바뀌면 새 세션 */
      push("open", document.title, true);
    }
    back.querySelector("#mkOk").onclick = ok;
    if(manual) back.querySelector("#mkCancel").onclick = close;
    back.addEventListener("keydown", function(e){
      if(e.key === "Enter") ok();
      else if(e.key === "Escape" && manual) close();
    });
  }

  /* ---------- 진행 신호 자동 감지 ----------
     콘텐츠들이 공통으로 쓰는 표시를 읽는다.
       · 헤더의 활동 탭 버튼을 누르면 → 활동 전환
       · 정답·완성일 때 붙는 .ok 표시가 나타나면 → 잘함 신호            */
  var lastOk = 0, lastScoreFlush = 0;
  function watchProgress(){
    document.addEventListener("click", function(ev){
      var b = ev.target && ev.target.closest && ev.target.closest("header nav button");
      if(b) push("tab", (b.textContent || "").trim());
    }, true);

    if(!window.MutationObserver) return;
    var okNow = new WeakSet ? new WeakSet() : null;
    new MutationObserver(function(list){
      for(var i=0;i<list.length;i++){
        var el = list[i].target;
        if(!el || el.nodeType !== 1 || !el.matches) continue;
        if(!el.matches(".fb, .mk-fb, .vd, #banner")) continue;
        var isOk = el.classList.contains("ok");
        if(okNow){
          if(!isOk){ okNow["delete"](el); continue; }
          if(okNow.has(el)) continue;
          okNow.add(el);
        }else if(!isOk) continue;
        var now = Date.now();
        var text = (el.textContent || "").trim().slice(0,60);
        if(!text) continue;
        /* 한 번 잘했을 때 배너와 안내문이 함께 켜지므로 몇 초간 하나만 센다 */
        if(now - lastOk < 2500) continue;
        lastOk = now;
        push("ok", text);
      }
    }).observe(document.body, {subtree:true, attributes:true, attributeFilter:["class"]});
  }

  /* ---------- 스타일 ---------- */
  function styles(){
    var s = document.createElement("style");
    s.textContent =
      /* 번호 단추 : 오른쪽 위는 '← 목차'(.home-btn.float)가 쓰므로 왼쪽 아래에 둔다.
         지난 시간 번호를 못 보고 지나치던 문제 때문에 크고 진하게 만들었다. */
      ".mk-track-badge{position:fixed; left:12px; bottom:12px; z-index:99998; display:flex;" +
      "flex-direction:column; align-items:center; gap:1px; line-height:1.15;" +
      "font-family:'Pretendard','Malgun Gothic',sans-serif; padding:8px 15px; border-radius:12px;" +
      "border:1.5px solid #3e63dd; background:#eef2ffee; color:#3e63dd; cursor:pointer;" +
      "box-shadow:0 2px 10px rgba(29,36,51,.14);}" +
      ".mk-track-badge b{font-size:17px; font-weight:800;}" +
      ".mk-track-badge span{font-size:10.5px; font-weight:700; opacity:.8;}" +
      ".mk-track-badge:hover{background:#3e63dd; color:#fff;}" +
      ".mk-track-badge.off{background:#fdecec; border-color:#e5484d; color:#e5484d;}" +

      ".mk-track-back{position:fixed; inset:0; z-index:99999; background:#1d243399;" +
      "display:flex; align-items:center; justify-content:center; padding:16px;}" +
      ".mk-track-box{background:#fff; border-radius:16px; padding:22px 22px 18px; width:min(430px,94vw);" +
      "max-height:92vh; overflow:auto;" +
      "font-family:'Pretendard','Malgun Gothic',sans-serif; box-shadow:0 12px 40px rgba(0,0,0,.28);}" +
      ".mk-track-box h3{font-size:19px; font-weight:800; color:#1d2433; margin:0 0 8px;}" +
      ".mk-track-box p{font-size:13.5px; line-height:1.6; color:#68738a; margin:0 0 14px;}" +
      ".mk-track-box b{color:#1d2433;}" +

      ".mk-track-pad{display:grid; grid-template-columns:repeat(7,1fr); gap:6px;}" +
      ".mk-track-pad button{font:800 16px 'Pretendard','Malgun Gothic',sans-serif; padding:11px 0;" +
      "border:1px solid #e3e8f0; border-radius:10px; background:#f8fafd; color:#1d2433; cursor:pointer;}" +
      ".mk-track-pad button:hover{border-color:#3e63dd; color:#3e63dd;}" +
      ".mk-track-pad button.on{background:#3e63dd; border-color:#3e63dd; color:#fff;}" +

      ".mk-track-manual{margin-top:12px;}" +
      ".mk-track-manual label{font-size:12px; font-weight:700; color:#68738a; display:flex;" +
      "align-items:center; gap:9px;}" +
      ".mk-track-manual input{font:800 18px 'Pretendard','Malgun Gothic',sans-serif; text-align:center;" +
      "padding:8px 6px; border:1px solid #e3e8f0; border-radius:10px; width:90px;}" +
      ".mk-track-manual input:focus{outline:none; border-color:#3e63dd; box-shadow:0 0 0 3px #3e63dd22;}" +

      ".mk-track-err{min-height:18px; font-size:12.5px; font-weight:700; color:#e5484d; margin-top:8px;}" +
      ".mk-track-btns{display:flex; gap:8px; justify-content:flex-end; margin-top:6px;}" +
      ".mk-track-btns button{font:700 14px 'Pretendard','Malgun Gothic',sans-serif; padding:10px 18px;" +
      "border-radius:10px; border:1px solid #e3e8f0; background:#fff; color:#1d2433; cursor:pointer;}" +
      ".mk-track-btns .go{background:#3e63dd; border-color:#3e63dd; color:#fff;}" +
      "@media print{.mk-track-badge{display:none;}}";
    document.head.appendChild(s);
  }

  /* ---------- 시작 ---------- */
  function boot(){
    styles();
    makeBadge();
    watchProgress();
    if(NO) push("open", document.title, true);
    else askNo(false);

    setInterval(function(){
      if(!NO) return;
      push("beat", "");
      flush(false);
    }, BEAT_MS);

    document.addEventListener("visibilitychange", function(){
      if(!NO) return;
      /* 오래 덮어 두었다가 다시 켠 태블릿이면 지난 시간 번호이므로 다시 묻는다 */
      var saved = null;
      try{ saved = JSON.parse(localStorage.getItem(NO_KEY) || "null"); }catch(e){}
      if(visible() && saved && Date.now() - (Number(saved.t) || 0) > HOLD_MS){
        NO = null;
        try{ localStorage.removeItem(NO_KEY); }catch(e){}
        paintBadge();
        askNo(false);
        return;
      }
      push(visible() ? "show" : "hide", "", true);
    });

    window.addEventListener("pagehide", function(){
      push("bye", "");
      flush(true);
      if(Q.length){ try{ localStorage.setItem(Q_KEY, JSON.stringify(Q)); }catch(e){} }
    });
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  /* 콘텐츠에서 직접 신호를 보내고 싶을 때 : MKLOG.step("...") / MKLOG.done("...") */
  window.MKLOG = {
    step: function(d){ push("step", d); },
    done: function(d){ push("ok", d || "완료", true); },
    /* 점수가 나오는 콘텐츠는 끝났을 때 이걸 부른다 — 시트의 '점수' 탭에 쌓이고
       교사 현황판의 점수판·역대 최고에 그대로 나온다.
         MKLOG.score(120, "60초 두더지 잡기 · 정답 9개")                     */
    score: function(value, d){
      /* 누적 점수를 계속 보내므로 중간 것 몇 개는 늦게 가도 상관없다.
         6초에 한 번만 바로 보내고, 나머지는 25초 신호에 실어 보낸다(서버 부담 줄이기).
         페이지를 떠날 때 남은 것은 sendBeacon 이 마저 보낸다. */
      var t = Date.now(), now = (t - lastScoreFlush > 6000);
      if(now) lastScoreFlush = t;
      push("score", d || "", now, Number(value));
    },
    who:  function(){ return NO; },
    ask:  function(){ askNo(true); }        /* 콘텐츠 안에서 번호 바꾸기 창 띄우기 */
  };
})();
