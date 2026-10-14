/* Murim Cultivator — event bus, inline glyphs, and the living stage.
   The stage only reads S and listens to events; it never touches rules. */
var MC = window.MC || {};
window.MC = MC;

/* ---- tiny event bus: logic emits one-liners, the stage listens ---- */
MC._bus = {};
MC.on = function (ev, fn) {
  if (!MC._bus[ev]) MC._bus[ev] = [];
  MC._bus[ev].push(fn);
};
MC.emit = function (ev, data) {
  var fns = MC._bus[ev] || [];
  for (var i = 0; i < fns.length; i++) {
    try { fns[i](data); } catch (e) {}
  }
};

MC.NS = "http://www.w3.org/2000/svg";
MC.svgEl = function (tag, attrs) {
  var el = document.createElementNS(MC.NS, tag);
  if (attrs) for (var k in attrs) el.setAttribute(k, attrs[k]);
  return el;
};

/* ---- small inline glyphs: 24-grid, 1.5 stroke, currentColor, no fill ---- */
MC.GLYPHS = {
  sword: ["M6 18 L18 6", "M13.5 4.5 l6 6", "M4 20 l2 -2"],
  shield: ["M12 3 l7 3 v6 c0 5 -3.5 8 -7 9 c-3.5 -1 -7 -4 -7 -9 V6 z"],
  herb: ["M12 21 V9", "M12 9 C12 5 9 3 5 3 c0 4 3 6 7 6", "M12 13 c0 -4 3 -6 7 -6 0 4 -3 6 -7 6"],
  ore: ["M4 14 L8 7 h8 l4 7 l-5 7 H9 z", "M8 14 h8"],
  wood: ["M3 10 h18 v7 H3 z", "M7 10 v7", "M3 13.5 h4"],
  core: ["M12 5 a7 7 0 1 0 0.1 0", "M12 9 a3 3 0 1 0 0.1 0"],
  coin: ["M12 4 a8 8 0 1 0 0.1 0", "M9 12 h6"],
  stone: ["M12 3 l6 9 -6 9 -6 -9 z", "M12 3 v18"],
  seed: ["M12 3 C7 10 7 15 12 21 C17 15 17 10 12 3 z"],
  flame: ["M12 3 C8 8 6 11 6 15 a6 6 0 0 0 12 0 c0 -4 -2 -7 -6 -12 z", "M12 12 c-2 2 -3 3.5 -3 5.5 a3 3 0 0 0 6 0 c0 -2 -1 -3.5 -3 -5.5 z"],
  fist: ["M6 11 a6 6 0 0 1 12 0 v6 a4 4 0 0 1 -4 4 h-4 a4 4 0 0 1 -4 -4 z", "M9.5 11 V8", "M12 11 V7", "M14.5 11 V8"]
};
MC.glyph = function (name, size) {
  var svg = MC.svgEl("svg", { viewBox: "0 0 24 24", width: size || 18, height: size || 18,
    fill: "none", stroke: "currentColor", "stroke-width": "1.5",
    "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" });
  var paths = MC.GLYPHS[name] || MC.GLYPHS.core;
  for (var i = 0; i < paths.length; i++) svg.appendChild(MC.svgEl("path", { d: paths[i] }));
  return svg;
};

/* ---- the stage: layered ink-wash scene, hero, foe, effects ---- */
MC.stage = null;
MC.buildStage = function (mount) {
  var svg = MC.svgEl("svg", { viewBox: "0 0 960 420", class: "stage", preserveAspectRatio: "xMidYMid slice" });
  svg.setAttribute("data-state", "idle");
  svg.setAttribute("data-path", S.path || "sword");

  svg.appendChild(MC.svgEl("rect", { class: "sky", x: 0, y: 0, width: 960, height: 420 }));
  var far = MC.svgEl("g", { class: "farwrap" });
  far.appendChild(MC.svgEl("path", { class: "far",
    d: "M-40 300 L80 170 L200 300 Z M160 300 L300 140 L440 300 Z M400 300 L540 160 L680 300 Z M640 300 L780 150 L920 300 Z M880 300 L1000 180 L1100 300 Z" }));
  svg.appendChild(far);
  svg.appendChild(MC.svgEl("path", { class: "mid",
    d: "M-40 330 L120 220 L280 330 Z M240 330 L420 200 L600 330 Z M560 330 L740 210 L920 330 Z M880 330 L1020 230 L1120 330 Z" }));
  svg.appendChild(MC.svgEl("rect", { class: "mist", x: -140, y: 238, width: 320, height: 44, rx: 22 }));
  svg.appendChild(MC.svgEl("rect", { class: "ground", x: 0, y: 330, width: 960, height: 90 }));
  var grass = MC.svgEl("g", {});
  var tufts = [60, 150, 250, 430, 520, 700, 800, 900];
  for (var gi = 0; gi < tufts.length; gi++) {
    var x = tufts[gi];
    grass.appendChild(MC.svgEl("path", { class: "grass", fill: "none",
      d: "M" + x + " 348 l-5 -14 M" + x + " 348 l1 -17 M" + x + " 348 l7 -12" }));
  }
  svg.appendChild(grass);
  svg.appendChild(MC.svgEl("circle", { class: "halo", cx: 330, cy: 210, r: 74, fill: "none", stroke: "#b08d4f", "stroke-width": 3 }));
  svg.appendChild(MC.svgEl("polyline", { class: "bolt", points: "700,40 670,130 695,130 660,230", fill: "none", stroke: "#efe7d3", "stroke-width": 5 }));

  /* hero: robed silhouette with path props */
  var hero = MC.svgEl("g", { class: "hero-all" });
  var breathe = MC.svgEl("g", { class: "hero-breathe" });
  breathe.appendChild(MC.svgEl("path", { fill: "#1d1a16",
    d: "M330 336 L306 252 Q330 238 354 252 L330 336 Z" }));
  breathe.appendChild(MC.svgEl("path", { class: "prop-body", fill: "#1d1a16",
    d: "M330 336 L296 256 Q330 236 364 256 L330 336 Z" }));
  breathe.appendChild(MC.svgEl("circle", { cx: 330, cy: 222, r: 15, fill: "#1d1a16" }));
  breathe.appendChild(MC.svgEl("line", { class: "hero-arm", x1: 330, y1: 262, x2: 362, y2: 288, stroke: "#1d1a16", "stroke-width": 9, "stroke-linecap": "round" }));
  breathe.appendChild(MC.svgEl("line", { class: "prop-sword", x1: 312, y1: 296, x2: 288, y2: 330, stroke: "#b08d4f", "stroke-width": 5, "stroke-linecap": "round" }));
  breathe.appendChild(MC.svgEl("ellipse", { class: "prop-flask", cx: 356, cy: 296, rx: 9, ry: 12, fill: "none", stroke: "#5fae86", "stroke-width": 3 }));
  var papers = MC.svgEl("g", { class: "prop-papers", stroke: "#efe7d3", "stroke-width": 2 });
  papers.appendChild(MC.svgEl("rect", { x: 300, y: 250, width: 8, height: 20 }));
  papers.appendChild(MC.svgEl("rect", { x: 312, y: 246, width: 8, height: 20 }));
  papers.appendChild(MC.svgEl("rect", { x: 348, y: 248, width: 8, height: 20 }));
  breathe.appendChild(papers);
  hero.appendChild(breathe);
  var legs = MC.svgEl("g", { class: "hero-legs", stroke: "#1d1a16", "stroke-width": 9, "stroke-linecap": "round" });
  legs.appendChild(MC.svgEl("line", { x1: 322, y1: 334, x2: 318, y2: 366 }));
  legs.appendChild(MC.svgEl("line", { x1: 338, y1: 334, x2: 344, y2: 366 }));
  hero.appendChild(legs);
  svg.appendChild(hero);
  svg.appendChild(MC.svgEl("circle", { class: "qiring r1", cx: 330, cy: 280, r: 60 }));
  svg.appendChild(MC.svgEl("circle", { class: "qiring r2", cx: 330, cy: 280, r: 60 }));

  /* foe silhouette */
  var foe = MC.svgEl("g", { class: "foeG" });
  foe.appendChild(MC.svgEl("path", { fill: "#1d1a16",
    d: "M640 340 L620 260 Q640 244 660 260 L640 340 Z M618 280 L596 300 M662 280 L684 300" }));
  foe.appendChild(MC.svgEl("circle", { cx: 640, cy: 246, r: 14, fill: "#1d1a16" }));
  var eyes = MC.svgEl("g", { fill: "#b3392f" });
  eyes.appendChild(MC.svgEl("circle", { cx: 634, cy: 244, r: 3 }));
  eyes.appendChild(MC.svgEl("circle", { cx: 646, cy: 244, r: 3 }));
  foe.appendChild(eyes);
  svg.appendChild(foe);

  svg.appendChild(MC.svgEl("path", { class: "slash", d: "M560 200 Q640 240 700 300" }));
  svg.appendChild(MC.svgEl("circle", { class: "bring", cx: 640, cy: 270, r: 70 }));

  mount.textContent = "";
  mount.appendChild(svg);
  mount.setAttribute("data-realm", S.realm);

  var st = { svg: svg, foe: foe, boltTimer: 0, raf: 0, lastBolt: 0 };
  MC.stage = st;

  /* realm lightning, 9-14s, hushed by stillness or hidden tabs */
  var tick = function (t) {
    st.raf = 0;
    if (!document.hidden && S.realm === 4 && !MC.still()) {
      if (t - st.lastBolt > 9000 + (st.boltSeed || 0)) {
        st.boltSeed = Math.random() * 5000;
        st.lastBolt = t;
        var bolt = svg.querySelector(".bolt");
        if (bolt) {
          bolt.classList.add("go");
          setTimeout(function () { bolt.classList.remove("go"); }, 160);
        }
      }
    }
    if (!document.hidden) st.raf = requestAnimationFrame(tick);
  };
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && !st.raf) { st.lastBolt = performance.now(); st.raf = requestAnimationFrame(tick); }
  });
  st.raf = requestAnimationFrame(tick);
  return st;
};

/* ---- stage API: state, foe, effects (SVG transforms/classes only) ---- */
MC.stageState = function () {
  if (MC.battle) return "fight";
  if (MC.stageAct && Date.now() < MC.stageAct.until) return MC.stageAct.name;
  return "idle";
};
MC.stageAct = null;
MC.markStageAct = function (name, ms) { MC.stageAct = { name: name, until: Date.now() + ms }; };
MC.syncStage = function () {
  if (!MC.stage) return;
  MC.stage.svg.setAttribute("data-state", MC.stageState());
  MC.stage.svg.setAttribute("data-path", S.path || "sword");
  var mount = document.getElementById("stageMount");
  if (mount) {
    mount.setAttribute("data-realm", S.realm);
    var label = MC.stageState() + " in " + MC.REALMS[S.realm].n;
    mount.setAttribute("aria-label", label.charAt(0).toUpperCase() + label.slice(1));
  }
};
MC.foeShow = function (foe, boss) {
  if (!MC.stage) return;
  MC.stage.foe.classList.remove("dying");
  MC.stage.foe.classList.toggle("boss", !!boss);
  void MC.stage.foe.getBoundingClientRect();
  MC.stage.foe.classList.add("in");
  var plate = document.getElementById("foePlate");
  if (plate) {
    plate.hidden = false;
    plate.classList.toggle("bossplate", !!boss);
    plate.querySelector("b").textContent = foe.t;
    var bar = plate.querySelector(".foehp");
    bar.setAttribute("aria-valuemax", foe.hp);
    bar.setAttribute("aria-valuenow", foe.hp);
    plate.querySelector("i").style.setProperty("--p", "100%");
  }
};
MC.foeHp = function (hp, max) {
  var plate = document.getElementById("foePlate");
  if (!plate || plate.hidden) return;
  plate.querySelector("i").style.setProperty("--p", Math.max(0, hp / max * 100) + "%");
  plate.querySelector(".foehp").setAttribute("aria-valuenow", Math.max(0, Math.ceil(hp)));
};
MC.foeHide = function () {
  if (!MC.stage) return;
  MC.stage.foe.classList.add("dying");
  MC.stage.foe.classList.remove("in");
  var plate = document.getElementById("foePlate");
  if (plate) plate.hidden = true;
};
MC.stageHit = function (burst) {
  if (!MC.stage || MC.still()) return;
  var svg = MC.stage.svg;
  svg.classList.remove("lunge", "slashgo", "burstgo");
  void svg.getBoundingClientRect();
  svg.classList.add("lunge", burst ? "burstgo" : "slashgo");
  setTimeout(function () { svg.classList.remove("lunge", "slashgo", "burstgo"); }, 500);
  if (burst) return;
};
MC.stageHurt = function () {
  if (!MC.stage || MC.still()) return;
  var svg = MC.stage.svg;
  svg.classList.remove("recoil", "shake");
  void svg.getBoundingClientRect();
  svg.classList.add("recoil", "shake");
  setTimeout(function () { svg.classList.remove("recoil", "shake"); }, 300);
};
MC.stageFlash = function () {
  if (MC.still()) return;
  var f = document.querySelector(".stageflash");
  if (!f) return;
  f.classList.add("go");
  setTimeout(function () { f.classList.remove("go"); }, 130);
};

/* stage subscribes; logic only emits one-liners */
MC.on("foe", function (d) { MC.foeShow(d.foe, d.boss); });
MC.on("hit", function (d) {
  MC.stageHit(d.burst);
  MC.foeHp(d.foeHp, d.foeMax);
  if (d.crit) MC.stageFlash();
});
MC.on("hurt", function () { MC.stageHurt(); });
MC.on("foeDown", function () { MC.foeHide(); });
MC.on("flee", function () { MC.foeHide(); });
