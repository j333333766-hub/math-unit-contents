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
  var HOME = (me && me.dataset.home) || "../index.html";
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
    a.title = "4단원 목차로 돌아가기";
    document.body.appendChild(a);
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
  function boot(){ addHomeButton(); markVisited(); }
  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  }else{
    boot();
  }
})();
