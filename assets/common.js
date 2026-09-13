/* ===========================================================
   중학교 1학년 수학 Ⅳ. 도형의 기초 — 공통 스크립트
   각 콘텐츠 HTML의 <head> 에서 아래처럼 불러온다.
     <link rel="stylesheet" href="../assets/common.css">
     <script src="../assets/common.js" defer></script>
   목차 위치가 다르면 data-home 으로 지정한다.
     <script src="../assets/common.js" data-home="../index.html" defer></script>
   =========================================================== */
(function(){
  "use strict";

  var me   = document.currentScript ||
             document.querySelector('script[src*="common.js"]');

  /* 목차는 단원별로 나뉘어 있다. 파일 이름 앞에 ch5- 처럼 단원 표시가 있으면
     그 단원 목차(?unit=5)로 돌아간다. 표시가 없는 옛 파일은 4단원이다.
     (홈 단원은 index.html 이 알아서 고르므로 여기서는 항상 unit 을 붙인다.) */
  function unitOfThisPage(){
    var file = location.pathname.split("/").pop() || "";
    var m = file.match(/^ch(\d+)-/);
    return m ? Number(m[1]) : 4;
  }
  var HOME = (me && me.dataset.home) || ("../index.html?unit=" + unitOfThisPage());
  var KEY  = "ch4.visited";

  /* ---------- 1. 목차로 돌아가기 버튼 ---------- */
  function addHomeButton(){
    // 이미 콘텐츠가 직접 넣어 두었으면 링크만 채우고 끝낸다
    var made = document.querySelector(".home-btn");
    if(made){
      if(!made.getAttribute("href")) made.setAttribute("href", HOME);
      if(!made.textContent.trim()) made.textContent = "← 목차";
      return;
    }
    var a = document.createElement("a");
    a.className = "home-btn float";
    a.href = HOME;
    a.textContent = "← 목차";
    a.title = "목차로 돌아가기";
    document.body.appendChild(a);
  }

  /* ---------- 1-2. 글자 크기 조절 (교실 TV 대응) ----------
     · 머리글과 오른쪽 패널은 css 의 zoom 으로 통째로 키운다.
       (각 콘텐츠가 <style> 에 박아 둔 px 값을 하나하나 고치지 않아도 된다)
     · 오른쪽 패널의 폭도 같은 비율로 넓힌다. 폭은 콘텐츠마다 336~360px 로 다르므로
       **처음 한 번 읽어 둔 값**을 기준으로 곱한다.
     · 캔버스 글자는 css 가 닿지 않으므로 ctx.font 의 px 값을 가로채 곱한다.
     · 고른 값은 localStorage 에 남겨 다른 콘텐츠로 넘어가도 유지된다.
     ---------------------------------------------------------- */
  var FS_KEY  = "mk.fs";
  var FS_STEP = [1, 1.15, 1.3, 1.5, 1.75, 2];
  var fsBaseAside = null;                       /* zoom 을 걸기 전 패널 폭 */

  function fsRead(){
    try{
      var v = parseFloat(localStorage.getItem(FS_KEY));
      return FS_STEP.indexOf(v) >= 0 ? v : 1;
    }catch(e){ return 1; }
  }
  function fsSave(v){ try{ localStorage.setItem(FS_KEY, String(v)); }catch(e){} }

  /* 콘텐츠가 처음 그리기 전에 배수를 세워 둔다 (아래 boot 에서 폭까지 맞춘다) */
  window.MKFS = fsRead();
  document.documentElement.style.setProperty("--fs", window.MKFS);
  document.documentElement.classList.toggle("mk-fs-big", window.MKFS > 1);

  /* 캔버스 글자 — ctx.font 에 들어오는 px 값을 배수만큼 키운다 */
  (function patchCanvasFont(){
    if(!window.CanvasRenderingContext2D) return;
    var proto = CanvasRenderingContext2D.prototype;
    var d = Object.getOwnPropertyDescriptor(proto, "font");
    if(!d || !d.set || proto.__mkFontPatched) return;
    Object.defineProperty(proto, "font", {
      configurable: true,
      enumerable: d.enumerable,
      get: function(){ return d.get.call(this); },
      set: function(v){
        var f = window.MKFS || 1;
        if(f !== 1 && typeof v === "string"){
          v = v.replace(/(\d*\.?\d+)px/, function(_, num){
            return (Math.round(parseFloat(num)*f*100)/100) + "px";
          });
        }
        d.set.call(this, v);
      }
    });
    proto.__mkFontPatched = true;
  })();

  function fsApply(v, redraw){
    window.MKFS = v;
    document.documentElement.style.setProperty("--fs", v);
    document.documentElement.classList.toggle("mk-fs-big", v > 1);

    /* 오른쪽 패널 폭도 같이 넓힌다 (좁은 화면 1열 배치일 때는 그대로 둔다) */
    var mainEl = document.querySelector("#app main");
    if(mainEl){
      var narrow = window.matchMedia("(max-width:900px)").matches;
      if(narrow){
        mainEl.style.gridTemplateColumns = "";
      }else{
        if(fsBaseAside === null){
          var cols = getComputedStyle(mainEl).gridTemplateColumns.split(/\s+/);
          var last = parseFloat(cols[cols.length - 1]);
          fsBaseAside = (last > 120 && last < 600) ? last : 350;
        }
        mainEl.style.gridTemplateColumns = "1fr " + Math.round(fsBaseAside*v) + "px";
      }
    }

    var val = document.querySelector(".mk-fs .mk-fs-val");
    if(val) val.textContent = Math.round(v*100) + "%";
    var minus = document.querySelector(".mk-fs [data-fs='-']");
    var plus  = document.querySelector(".mk-fs [data-fs='+']");
    if(minus) minus.disabled = (v === FS_STEP[0]);
    if(plus)  plus.disabled  = (v === FS_STEP[FS_STEP.length - 1]);

    /* 캔버스는 스스로 다시 그려야 한다 — MK.fit 이 resize 를 듣고 있다 */
    if(redraw) window.dispatchEvent(new Event("resize"));
  }

  function fsStepBy(dir){
    var cur = window.MKFS || 1;
    var i = FS_STEP.indexOf(cur);
    if(i < 0) i = 0;
    i = Math.max(0, Math.min(FS_STEP.length - 1, i + dir));
    fsSave(FS_STEP[i]);
    fsApply(FS_STEP[i], true);
  }

  function addFontSizer(){
    if(document.querySelector(".mk-fs")) return;
    var box = document.createElement("div");
    box.className = "mk-fs";
    box.title = "글자 크기 (교실 TV 로 띄울 때 키우세요)";
    box.innerHTML =
      '<button type="button" data-fs="-" aria-label="글자 작게">가－</button>' +
      '<button type="button" data-fs="0" class="mk-fs-val" aria-label="글자 크기 원래대로">100%</button>' +
      '<button type="button" data-fs="+" aria-label="글자 크게">가＋</button>';

    var home = document.querySelector("#app > header .home-btn");
    if(home){
      home.parentNode.insertBefore(box, home);       /* 머리글의 '목차' 단추 왼쪽에 */
    }else{
      box.className = "mk-fs float";
      document.body.appendChild(box);
    }

    box.addEventListener("click", function(ev){
      var b = ev.target.closest("button");
      if(!b) return;
      var k = b.dataset.fs;
      if(k === "+") fsStepBy(1);
      else if(k === "-") fsStepBy(-1);
      else { fsSave(1); fsApply(1, true); }          /* 가운데를 누르면 원래대로 */
    });

    window.addEventListener("resize", function(){
      /* 좁은 화면 ↔ 넓은 화면을 오갈 때 패널 폭 처리를 다시 맞춘다 */
      fsApply(window.MKFS || 1, false);
    });
  }

  /* ---------- 2. 학습 기록(목차의 '학습함' 표시용) ---------- */
  function markVisited(){
    try{
      var file = location.pathname.split("/").pop();
      if(!file || file === "index.html") return;
      var list = JSON.parse(localStorage.getItem(KEY) || "[]");
      if(list.indexOf(file) === -1){
        list.push(file);
        localStorage.setItem(KEY, JSON.stringify(list));
      }
    }catch(e){ /* 시크릿 모드 등에서는 조용히 무시 */ }
  }

  /* ---------- 3. 콘텐츠에서 가져다 쓰는 도구들 ---------- */
  var MK = {
    /* 아이디로 요소 찾기 */
    $: function(id){ return document.getElementById(id); },

    /**
     * 캔버스를 부모 크기에 맞추고 고해상도(레티나)로 그린다.
     * 창 크기가 바뀌면 draw 를 다시 호출한다.
     *   MK.fit(canvas, draw)  →  draw 안에서는 CSS 픽셀 좌표를 그대로 쓰면 된다.
     */
    fit: function(canvas, draw){
      function resize(){
        var dpr = window.devicePixelRatio || 1;
        var w = canvas.clientWidth, h = canvas.clientHeight;
        if(!w || !h) return;
        canvas.width  = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        var ctx = canvas.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if(draw) draw();
      }
      if(window.ResizeObserver){
        new ResizeObserver(resize).observe(canvas);
      }
      window.addEventListener("resize", resize);
      resize();
      return resize;
    },

    /** 캔버스 위 마우스/터치 좌표를 CSS 픽셀 기준으로 얻는다 */
    pos: function(canvas, ev){
      var r = canvas.getBoundingClientRect();
      var p = (ev.touches && ev.touches[0]) || ev;
      return { x: p.clientX - r.left, y: p.clientY - r.top };
    },

    /** 두 점 사이 거리 */
    dist: function(x1,y1,x2,y2){ return Math.hypot(x2-x1, y2-y1); },

    /** 라디안 → 도 (0 이상 360 미만) */
    deg: function(rad){ var d = rad*180/Math.PI; return (d%360+360)%360; },

    /** 정수 난수 (min 이상 max 이하) */
    randInt: function(min,max){ return min + Math.floor(Math.random()*(max-min+1)); },

    /** 배열에서 무작위로 하나 뽑기 */
    pick: function(arr){ return arr[Math.floor(Math.random()*arr.length)]; },

    /** MathJax 수식 다시 조판 (없으면 조용히 통과) */
    tex: function(el){
      if(window.MathJax && MathJax.typesetPromise){
        MathJax.typesetPromise(el ? [el] : undefined).catch(function(){});
      }
    },

    /** 학습 기록 전체 지우기 (목차 페이지에서 사용) */
    resetProgress: function(){
      try{ localStorage.removeItem(KEY); }catch(e){}
    },

    /** 학습한 파일 목록 */
    visited: function(){
      try{ return JSON.parse(localStorage.getItem(KEY) || "[]"); }
      catch(e){ return []; }
    },

    HOME_KEY: KEY
  };
  window.MK = MK;

  /* -----------------------------------------------------------
     점수 (교사 현황판·스프레드시트로 보내는 공용 계산기)

       MKSCORE.quiz(맞았나, "설명")   문제 하나 채점 — 정답 +10
                                      (연속 3회 +5, 5회 이상 +10 보너스) / 오답 -5
       MKSCORE.add(점수, "설명")      그냥 더하기(미션 성공 등)
       MKSCORE.once(열쇠, 점수, "설명") 같은 열쇠로는 한 번만 더한다(완성 보상 등)

     한 페이지에서 여러 활동을 해도 **누적 한 값**으로 모인다.
     현황판은 학생별 최고 점수를 쓰므로, 새로 시작해 낮게 나와도 기록은 남는다.
     track.js 가 없으면(로컬에서 열었을 때) 조용히 계산만 한다.
     ----------------------------------------------------------- */
  var MKSCORE = (function(){
    var total = 0, streak = 0, got = {};
    function report(d){
      if(window.MKLOG && MKLOG.score) MKLOG.score(total, d || "");
    }
    return {
      quiz: function(ok, d){
        if(ok){
          streak++;
          total += 10 + (streak >= 5 ? 10 : (streak >= 3 ? 5 : 0));
        }else{
          streak = 0;
          total -= 5;
        }
        report(d);
        return total;
      },
      add:  function(p, d){ total += Number(p) || 0; report(d); return total; },
      once: function(key, p, d){
        if(got[key]) return total;
        got[key] = 1;
        total += Number(p) || 0;
        report(d);
        return total;
      },
      total:  function(){ return total; },
      streak: function(){ return streak; }
    };
  })();
  window.MKSCORE = MKSCORE;

  /* ---------- 실행 ---------- */
  function boot(){
    var onHub = /(^|\/)index\.html?$/.test(location.pathname) || /\/$/.test(location.pathname);
    if(onHub) document.body.classList.add("mk-zoom");   /* 허브는 통째로 확대 */
    else addHomeButton();
    markVisited();
    addFontSizer();
    fsApply(window.MKFS || 1, true);                    /* 패널 폭까지 맞추고 다시 그리기 */
  }
  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  }else{
    boot();
  }
})();
