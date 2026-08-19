/* ===========================================================
   학습 기록 보내기 (교사용 현황판과 짝을 이룸)

   각 콘텐츠 <head> 에 한 줄만 넣으면 된다.
     <script src="../assets/track.js" defer></script>
   목차(index.html)에서는 <script src="assets/track.js" defer></script>

   · 학생을 학년·반·번호로만 구분한다. 이름·계정은 받지 않는다.
   · 보내는 것 : 어떤 콘텐츠를 열었는지, 화면을 보고 있는지, 활동 전환,
                 정답·완료 표시가 떴는지. 답안 내용 자체는 보내지 않는다.
   · 기록 서버(Apps Script)가 꺼져 있어도 콘텐츠는 그대로 동작한다.
   =========================================================== */
(function(){
  "use strict";

  /* ---------- 설정 : 배포 주소가 바뀌면 이 줄만 고친다 ---------- */
  var ENDPOINT = "https://script.google.com/macros/s/AKfycbzSgerg_gkoiA3y98x_xp3CCIqyKZV0A3CVfrUCjG8wBdd4hT3N8VabA2v_tfUvX2hslw/exec";

  var BEAT_MS  = 25000;    /* 살아 있다는 신호 간격 */
  var ID_KEY   = "mk.id";
  var Q_KEY    = "mk.queue";

  if(!ENDPOINT || location.protocol === "file:") return;   /* 주소 미설정·로컬 파일이면 조용히 끔 */

  /* ---------- 페이지 이름 ---------- */
  var PAGE = (function(){
    var f = location.pathname.split("/").pop() || "index.html";
    return f.replace(/\.html?$/i, "") || "index";
  })();
  var SID = Math.random().toString(36).slice(2, 10);

  /* ---------- 학생 정보 ---------- */
  var ID = null;
  try{ ID = JSON.parse(localStorage.getItem(ID_KEY) || "null"); }catch(e){}
  function validId(o){
    return o && o.g >= 1 && o.g <= 3 && o.c >= 1 && o.c <= 20 && o.n >= 1 && o.n <= 45;
  }
  if(!validId(ID)) ID = null;

  /* ---------- 보낼 것 모아 두기 ---------- */
  var Q = [];
  try{
    var saved = JSON.parse(localStorage.getItem(Q_KEY) || "[]");
    if(saved.length) Q = saved.slice(-60);
    localStorage.removeItem(Q_KEY);
  }catch(e){}

  function visible(){ return document.visibilityState !== "hidden"; }
  function push(kind, detail, now){
    Q.push({t:Date.now(), k:kind, p:PAGE, d:(detail || "").slice(0,150), v:visible() ? 1 : 0});
    if(Q.length > 120) Q = Q.slice(-120);
    if(now) flush(false);
  }
  function flush(useBeacon){
    if(!ID || !Q.length) return;
    var batch = Q.splice(0, 60);
    var body = JSON.stringify({s:{g:ID.g, c:ID.c, n:ID.n, sid:SID}, e:batch});
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

  /* ---------- 화면 아래의 작은 표시 ---------- */
  var badge;
  function paintBadge(){
    if(!badge) return;
    badge.textContent = ID ? (ID.g + "-" + ID.c + "-" + ID.n + " · 기록 중") : "번호 입력";
    badge.className = "mk-track-badge" + (ID ? "" : " off");
  }
  function makeBadge(){
    badge = document.createElement("button");
    badge.type = "button";
    badge.title = "학년·반·번호 바꾸기";
    badge.onclick = function(){ askId(true); };
    document.body.appendChild(badge);
    paintBadge();
  }

  /* ---------- 학년·반·번호 입력 ---------- */
  function askId(manual){
    var back = document.createElement("div");
    back.className = "mk-track-back";
    back.innerHTML =
      '<div class="mk-track-box">' +
        '<h3>누구인가요?</h3>' +
        '<p>학습 기록을 남기기 위해 <b>학년·반·번호</b>를 입력해 주세요.<br>이름은 받지 않습니다.</p>' +
        '<div class="mk-track-row">' +
          '<label>학년<input type="number" id="mkG" min="1" max="3" inputmode="numeric"></label>' +
          '<label>반<input type="number" id="mkC" min="1" max="20" inputmode="numeric"></label>' +
          '<label>번호<input type="number" id="mkN" min="1" max="45" inputmode="numeric"></label>' +
        '</div>' +
        '<div class="mk-track-err" id="mkErr"></div>' +
        '<div class="mk-track-btns">' +
          (manual ? '<button type="button" class="ghost" id="mkCancel">취소</button>' : "") +
          '<button type="button" class="go" id="mkOk">시작하기</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(back);

    var g = back.querySelector("#mkG"), c = back.querySelector("#mkC"), n = back.querySelector("#mkN");
    if(ID){ g.value = ID.g; c.value = ID.c; n.value = ID.n; }
    setTimeout(function(){ (ID ? n : g).focus(); }, 30);

    function close(){ back.remove(); }
    function ok(){
      var v = {g:Number(g.value), c:Number(c.value), n:Number(n.value)};
      if(!validId(v)){
        back.querySelector("#mkErr").textContent = "학년 1~3, 반 1~20, 번호 1~45 로 입력해 주세요.";
        return;
      }
      ID = v;
      try{ localStorage.setItem(ID_KEY, JSON.stringify(ID)); }catch(e){}
      paintBadge();
      close();
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
  var lastOk = 0, lastOkText = "";
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
        lastOk = now; lastOkText = text;
        push("ok", text);
      }
    }).observe(document.body, {subtree:true, attributes:true, attributeFilter:["class"]});
  }

  /* ---------- 스타일 ---------- */
  function styles(){
    var s = document.createElement("style");
    s.textContent =
      ".mk-track-badge{position:fixed; left:10px; bottom:10px; z-index:99998;" +
      "font:700 12px/1 'Pretendard','Malgun Gothic',sans-serif; padding:7px 11px; border-radius:999px;" +
      "border:1px solid #d7deea; background:#ffffffdd; color:#68738a; cursor:pointer;" +
      "box-shadow:0 2px 8px rgba(29,36,51,.10);}" +
      ".mk-track-badge:hover{border-color:#3e63dd; color:#3e63dd;}" +
      ".mk-track-badge.off{background:#fdecec; border-color:#e5484d; color:#e5484d;}" +
      ".mk-track-back{position:fixed; inset:0; z-index:99999; background:#1d243399;" +
      "display:flex; align-items:center; justify-content:center; padding:16px;}" +
      ".mk-track-box{background:#fff; border-radius:16px; padding:22px 22px 18px; width:min(360px,94vw);" +
      "font-family:'Pretendard','Malgun Gothic',sans-serif; box-shadow:0 12px 40px rgba(0,0,0,.28);}" +
      ".mk-track-box h3{font-size:19px; font-weight:800; color:#1d2433; margin:0 0 8px;}" +
      ".mk-track-box p{font-size:13.5px; line-height:1.6; color:#68738a; margin:0 0 14px;}" +
      ".mk-track-box b{color:#1d2433;}" +
      ".mk-track-row{display:grid; grid-template-columns:1fr 1fr 1fr; gap:9px;}" +
      ".mk-track-row label{font-size:12px; font-weight:700; color:#68738a; display:flex; flex-direction:column; gap:5px;}" +
      ".mk-track-row input{font:800 20px 'Pretendard','Malgun Gothic',sans-serif; text-align:center;" +
      "padding:10px 6px; border:1px solid #e3e8f0; border-radius:10px; width:100%;}" +
      ".mk-track-row input:focus{outline:none; border-color:#3e63dd; box-shadow:0 0 0 3px #3e63dd22;}" +
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
    if(ID) push("open", document.title, true);
    else askId(false);

    setInterval(function(){
      if(!ID) return;
      push("beat", "");
      flush(false);
    }, BEAT_MS);

    document.addEventListener("visibilitychange", function(){
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
    who:  function(){ return ID; }
  };
})();
