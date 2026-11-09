/* 왼쪽 도형 영역(.board-wrap) 위에 필기하는 도구.
 * 콘텐츠 html 에 <script src="../assets/ink.js?v=1" defer></script> 한 줄만 넣으면 된다.
 * - 오른쪽 위 [✏️ 필기] 단추로 켜고 끈다. 켜져 있는 동안에만 도형 대신 필기가 된다.
 * - 펜 색 4가지, 굵기 2가지, 지우개(획 단위), 되돌리기, 모두 지우기.
 * - 필기를 꺼도 쓴 내용은 남아 있다(모두 지우기로 지움).
 */
(function(){
  "use strict";
  var CSS = [
    ".mk-ink-cv{position:absolute;left:0;top:0;width:100%;height:100%;z-index:4;pointer-events:none;touch-action:none;}",
    ".mk-ink-cv.on{pointer-events:auto;cursor:crosshair;}",
    ".mk-ink-cv.on.er{cursor:cell;}",
    ".mk-ink{position:absolute;right:10px;top:10px;z-index:6;display:flex;flex-direction:column;align-items:stretch;gap:2px;",
    "  background:#ffffffeb;border:1px solid var(--line,#e3e8f0);border-radius:18px;padding:2px;box-shadow:0 1px 6px rgba(29,36,51,.10);max-height:calc(100% - 20px);overflow-y:auto;}",
    ".mk-ink button{font:800 13px/1 var(--font,system-ui);color:var(--sub,#5b6577);background:none;border:0;padding:7px 10px;border-radius:999px;cursor:pointer;-webkit-tap-highlight-color:transparent;white-space:nowrap;}",
    ".mk-ink button:hover{background:var(--accent-soft,#eef2ff);color:var(--accent,#3e63dd);}",
    ".mk-ink button.sel{background:var(--accent,#3e63dd);color:#fff;}",
    ".mk-ink .main.on{background:var(--accent,#3e63dd);color:#fff;}",
    ".mk-ink .tools{display:none;flex-direction:column;align-items:stretch;gap:1px;}",
    ".mk-ink.open .tools{display:flex;}",
    ".mk-ink .row{display:flex;justify-content:center;gap:1px;}",
    ".mk-ink .dot{width:26px;height:26px;padding:0;display:inline-flex;align-items:center;justify-content:center;}",
    ".mk-ink .dot i{display:block;width:14px;height:14px;border-radius:50%;}",
    ".mk-ink .dot.sel{background:var(--accent-soft,#eef2ff);box-shadow:inset 0 0 0 2px var(--accent,#3e63dd);}",
    ".mk-ink .sep{height:1px;background:var(--line,#e3e8f0);margin:2px 6px;}",
    ".mk-ink button:disabled{opacity:.35;cursor:default;}"
  ].join("\n");

  var COLORS = ["#1d2433", "#e03131", "#1c7ed6", "#2f9e44"];
  var WIDTHS = {thin: 3, thick: 7};

  function init(){
    var wrap = document.querySelector(".board-wrap");
    if(!wrap || wrap.querySelector(".mk-ink")) return;
    var st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);

    var cv = document.createElement("canvas"); cv.className = "mk-ink-cv";
    wrap.appendChild(cv);
    var ctx = cv.getContext("2d");

    var bar = document.createElement("div"); bar.className = "mk-ink";
    bar.innerHTML =
      '<button type="button" class="main" data-a="toggle" title="도형 위에 필기하기">✏️ 필기</button>' +
      '<span class="tools">' +
        '<span class="sep"></span>' +
        '<span class="row">' + COLORS.map(function(c, i){ return '<button type="button" class="dot' + (i === 0 ? ' sel' : '') + '" data-c="' + c + '" aria-label="펜 색"><i style="background:' + c + '"></i></button>'; }).join("") + '</span>' +
        '<span class="row"><button type="button" data-w="thin" class="sel" title="가는 펜">가늘게</button>' +
        '<button type="button" data-w="thick" title="굵은 펜">굵게</button></span>' +
        '<span class="sep"></span>' +
        '<button type="button" data-a="eraser" title="획을 문질러 지우기">지우개</button>' +
        '<button type="button" data-a="undo" title="방금 쓴 획 지우기">↶ 되돌리기</button>' +
        '<button type="button" data-a="clear" title="필기 모두 지우기">모두 지우기</button>' +
      '</span>';
    wrap.appendChild(bar);

    var on = false, color = COLORS[0], width = WIDTHS.thin, eraser = false;
    var strokes = [], cur = null, dpr = 1;

    function size(){
      dpr = window.devicePixelRatio || 1;
      var w = wrap.clientWidth, h = wrap.clientHeight;
      cv.width = Math.max(1, Math.round(w * dpr)); cv.height = Math.max(1, Math.round(h * dpr));
      redraw();
    }
    function drawStroke(s){
      var p = s.pts; if(!p.length) return;
      ctx.strokeStyle = s.c; ctx.fillStyle = s.c; ctx.lineWidth = s.w;
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      if(p.length === 1){ ctx.beginPath(); ctx.arc(p[0][0], p[0][1], s.w / 2, 0, Math.PI * 2); ctx.fill(); return; }
      ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]);
      for(var i = 1; i < p.length - 1; i++){
        var mx = (p[i][0] + p[i+1][0]) / 2, my = (p[i][1] + p[i+1][1]) / 2;
        ctx.quadraticCurveTo(p[i][0], p[i][1], mx, my);
      }
      var l = p[p.length - 1]; ctx.lineTo(l[0], l[1]); ctx.stroke();
    }
    function redraw(){
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      strokes.forEach(drawStroke);
      if(cur) drawStroke(cur);
      paint();
    }
    function pos(e){ var r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    /* 점 q 와 선분 ab 사이 거리 */
    function segDist(q, a, b){
      var vx = b[0] - a[0], vy = b[1] - a[1], L = vx * vx + vy * vy;
      var k = L ? Math.max(0, Math.min(1, ((q[0] - a[0]) * vx + (q[1] - a[1]) * vy) / L)) : 0;
      var dx = a[0] + k * vx - q[0], dy = a[1] + k * vy - q[1];
      return Math.sqrt(dx * dx + dy * dy);
    }
    var lastEr = null;
    function eraseAt(q){
      /* 지우개를 빨리 움직여도 지나간 자리를 모두 훑도록 사이를 채운다 */
      var pts = [q];
      if(lastEr){
        var d = Math.hypot(q[0] - lastEr[0], q[1] - lastEr[1]), n = Math.ceil(d / 6);
        for(var j = 1; j < n; j++) pts.push([lastEr[0] + (q[0] - lastEr[0]) * j / n, lastEr[1] + (q[1] - lastEr[1]) * j / n]);
      }
      lastEr = q;
      var R = 12, before = strokes.length;
      strokes = strokes.filter(function(s){
        var r = R + s.w / 2;
        for(var m = 0; m < pts.length; m++){
          var e = pts[m];
          if(s.pts.length === 1){ if(Math.hypot(s.pts[0][0] - e[0], s.pts[0][1] - e[1]) < r) return false; continue; }
          for(var i = 1; i < s.pts.length; i++) if(segDist(e, s.pts[i-1], s.pts[i]) < r) return false;
        }
        return true;
      });
      if(strokes.length !== before) redraw();
    }

    var pid = null;
    cv.addEventListener("pointerdown", function(e){
      if(!on || pid !== null) return;
      e.preventDefault(); e.stopPropagation();
      pid = e.pointerId; try{ cv.setPointerCapture(pid); }catch(_){}
      var q = pos(e);
      if(eraser){ lastEr = null; eraseAt(q); return; }
      cur = {c: color, w: width, pts: [q]}; redraw();
    });
    cv.addEventListener("pointermove", function(e){
      if(e.pointerId !== pid) return;
      e.preventDefault();
      var q = pos(e);
      if(eraser){ eraseAt(q); return; }
      if(!cur) return;
      var l = cur.pts[cur.pts.length - 1];
      if(Math.abs(q[0] - l[0]) + Math.abs(q[1] - l[1]) < 1.5) return;
      cur.pts.push(q); redraw();
    });
    function end(e){
      if(e.pointerId !== pid) return;
      pid = null;
      if(cur){ strokes.push(cur); cur = null; redraw(); }
    }
    cv.addEventListener("pointerup", end);
    cv.addEventListener("pointercancel", end);
    /* 필기 중에는 아래 도형으로 휠·터치가 넘어가지 않게 */
    ["wheel", "touchstart", "touchmove", "mousedown"].forEach(function(t){
      cv.addEventListener(t, function(e){ if(on){ e.stopPropagation(); if(t !== "wheel") e.preventDefault(); } }, {passive:false});
    });
    ["pointerdown", "mousedown", "touchstart", "wheel"].forEach(function(t){
      bar.addEventListener(t, function(e){ e.stopPropagation(); }, {passive:true});
    });

    function paint(){
      bar.classList.toggle("open", on);
      bar.querySelector(".main").classList.toggle("on", on);
      bar.querySelector(".main").textContent = on ? "✏️ 필기 끄기" : "✏️ 필기";
      cv.classList.toggle("on", on); cv.classList.toggle("er", eraser);
      bar.querySelectorAll("[data-c]").forEach(function(b){ b.classList.toggle("sel", !eraser && b.dataset.c === color); });
      bar.querySelectorAll("[data-w]").forEach(function(b){ b.classList.toggle("sel", WIDTHS[b.dataset.w] === width); });
      bar.querySelector("[data-a=eraser]").classList.toggle("sel", eraser);
      bar.querySelector("[data-a=undo]").disabled = !strokes.length;
      bar.querySelector("[data-a=clear]").disabled = !strokes.length;
    }

    bar.addEventListener("click", function(e){
      var b = e.target.closest("button"); if(!b) return;
      if(b.dataset.c){ color = b.dataset.c; eraser = false; }
      else if(b.dataset.w){ width = WIDTHS[b.dataset.w]; eraser = false; }
      else if(b.dataset.a === "toggle"){ on = !on; if(!on) eraser = false; }
      else if(b.dataset.a === "eraser"){ eraser = !eraser; }
      else if(b.dataset.a === "undo"){ strokes.pop(); }
      else if(b.dataset.a === "clear"){ strokes = []; }
      redraw();
    });

    if(window.ResizeObserver) new ResizeObserver(size).observe(wrap);
    else window.addEventListener("resize", size);
    size();
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
