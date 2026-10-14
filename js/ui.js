/* Murim Cultivator v3-phase5 — view layer: lobby, drawer, cultivate.
   Targeted updaters only. Dynamic text travels via textContent, never
   innerHTML. Inline styles: --p widths and SVG geometry only. The
   Chronicle is gone; MC.log keeps a capped in-memory record so the
   simulation's voice is never lost. */
var MC = window.MC || {};
window.MC = MC;

function $(id) { return document.getElementById(id); }

/* ---- cached refs ---- */
var R = {};
MC.cacheDom = function () {
  var ids = ["lobbyName", "lobbySub", "barHpL", "barQiL", "barCultL",
    "btnCultivate", "cultReady", "goalLine", "goalTextL", "lobbyScene",
    "btnPauseL", "btnSettingsL", "pausedVeilL", "tipBubbleL", "tipTextL", "tipSkipL",
    "btnMenu", "btnMenuC", "drawer", "drawerBackdrop", "drawerNav",
    "btnLobby", "btnPauseC", "btnSettingsC", "rateChipsC",
    "btnMedC", "btnBreakC", "btnDoorC", "cultNeed", "optCultC", "optBreakC",
    "barHpC", "barQiC", "barCultC", "spriteBox", "floatsC", "banner", "pausedVeilC",
    "tipBubbleC", "tipTextC", "tipSkipC", "cultScene", "lobbyScene",
    "modalOverlay", "modalTitle", "modalBody", "modalBtns", "toasts", "stageTitle",
    "inName", "userErr", "btnContinue", "hasSave", "pathRow", "pathNameEcho",
    "pathErr", "btnToGame"];
  for (var i = 0; i < ids.length; i++) R[ids[i]] = $(ids[i]);
  R.focusRadios = document.querySelectorAll('#screen-cultivate input[name="focus"]');
};
MC.snap = {};
MC.setText = function (el, key, val) {
  if (!el) return;
  if (MC.snap[key] !== val) { MC.snap[key] = val; el.textContent = val; }
};

/* ---- numbers: 999, 1.2K, 3.4M, 5.6B, 7.8T, 1.23e15+ ---- */
MC.fmt = function (n) {
  n = Math.floor(n);
  if (S.settings.numFmt === "full") return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (n < 1000) return String(n);
  var units = [[1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"]];
  for (var i = 0; i < units.length; i++) {
    if (n >= units[i][0] && n < units[i][0] * 1000) {
      return parseFloat((n / units[i][0]).toFixed(1)) + units[i][1];
    }
  }
  return n.toExponential(2).replace("e+", "e");
};
MC.fmt1 = function (n) {
  if (S.settings.numFmt === "full") return (Math.floor(n * 10) / 10).toString();
  if (n < 1000) return (Math.floor(n * 10) / 10).toString();
  return MC.fmt(n);
};
MC.clock = function () {
  var d = new Date();
  function p(x) { return String(x).padStart(2, "0"); }
  return p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
};

/* ---- in-memory chronicle (no panel this phase; toasts carry the news) ---- */
MC._logStore = [];
MC._lastKey = null; MC._lastN = 0;
MC.log = function (m, tone, kind) {
  kind = kind || "sys";
  var key = kind + "|" + (tone || "") + "|" + m;
  if (key === MC._lastKey && MC._logStore.length) {
    MC._lastN += 1;
    MC._logStore[0].rep = MC._lastN;
    return;
  }
  MC._logStore.unshift({ t: MC.clock(), m: m, kind: kind, rep: 1 });
  while (MC._logStore.length > MC.CONFIG.LOG_CAP) MC._logStore.pop();
  MC._lastKey = key; MC._lastN = 1;
};
MC.applyFilter = function () {};

/* ---- toasts, floats, banners, chimes ---- */
MC.toast = function (m) {
  if (!R.toasts) return;
  var d = document.createElement("div");
  d.className = "toast";
  d.textContent = m;
  R.toasts.appendChild(d);
  while (R.toasts.children.length > 3) R.toasts.firstChild.remove();
  setTimeout(function () { if (d.isConnected) d.remove(); }, 3500);
};
MC.still = function () {
  return S.ui.reduceMotion ||
    (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
};
MC.float = function (txt, kind) {
  if (!R.floatsC) return;
  if (R.floatsC.children.length >= 10) R.floatsC.firstChild.remove();
  var s = document.createElement("span");
  s.className = "float " + (kind || "hit");
  s.textContent = txt;
  s.style.left = (15 + Math.random() * 60) + "%";
  s.style.top = (30 + Math.random() * 35) + "%";
  R.floatsC.appendChild(s);
  if (MC.still()) {
    setTimeout(function () { if (s.isConnected) s.remove(); }, 600);
  } else {
    s.addEventListener("animationend", function () { s.remove(); });
    setTimeout(function () { if (s.isConnected) s.remove(); }, 1200);
  }
};
MC.showBanner = function (txt, fail) {
  var b = R.banner;
  if (!b) return;
  b.textContent = txt;
  b.hidden = false;
  b.classList.remove("show", "hide");
  void b.offsetWidth;
  b.classList.add("show");
  setTimeout(function () {
    b.classList.add("hide");
    setTimeout(function () { b.hidden = true; b.classList.remove("show", "hide"); }, 450);
  }, 1600);
};
MC._ac = null;
MC.sfx = function (name) {
  if (!S.ui.sound) return;
  try {
    if (!MC._ac) MC._ac = new (window.AudioContext || window.webkitAudioContext)();
    if (MC._ac.state === "suspended") MC._ac.resume();
    var notes = { hit: [330], crit: [330, 495], forge: [392, 523], win: [440, 660],
      learn: [523, 784], high: [523, 659, 784], error: [220] };
    var seq = notes[name] || [440];
    var t = MC._ac.currentTime;
    for (var i = 0; i < seq.length; i++) {
      var o = MC._ac.createOscillator(), g = MC._ac.createGain();
      o.type = "sine"; o.frequency.value = seq[i];
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.15, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(0.3, 0.08 + i * 0.05));
      o.connect(g); g.connect(MC._ac.destination);
      o.start(t); o.stop(t + 0.32);
      t += 0.1;
    }
  } catch (e) {}
};

/* ---- settings reach the document ---- */
MC.applyUI = function () {
  document.body.dataset.theme = S.ui.theme === "night" ? "night" : "day";
  document.body.dataset.motion = S.ui.reduceMotion ? "reduce" : "full";
  var px = { s: "12px", m: "13px", l: "15px" }[S.ui.textSize] || "13px";
  document.documentElement.style.fontSize = px;
};
MC.syncSettingsUI = function () {
  for (var i = 0; i < R.focusRadios.length; i++) {
    R.focusRadios[i].checked = R.focusRadios[i].value === S.settings.focus;
  }
  MC.syncSwitch(R.optCultC, S.settings.autoCult);
  MC.syncSwitch(R.optBreakC, S.settings.autoBreak);
};
MC.syncSwitch = function (input, on) {
  if (!input) return;
  input.checked = on;
  var wrap = input.closest(".switch");
  if (wrap) {
    var b = wrap.querySelector("b");
    if (b) b.textContent = on ? "On" : "Off";
  }
};

/* ---- bars, chips ---- */
MC.setBar = function (id, key, cur, max, txt, cls) {
  var el = $(id);
  if (!el) return;
  var pct = Math.max(0, Math.min(100, cur / max * 100));
  var sig = pct.toFixed(1) + "|" + txt + "|" + (cls || "");
  if (MC.snap[key] === sig) return;
  MC.snap[key] = sig;
  el.querySelector("i").style.setProperty("--p", pct + "%");
  el.classList.toggle("warn", cls === "warn");
  el.classList.toggle("low", cls === "low");
  el.classList.toggle("ready", cls === "ready");
  el.setAttribute("aria-valuenow", Math.ceil(cur));
  el.setAttribute("aria-valuemax", Math.ceil(max));
  var b = el.querySelector("b");
  var mark = b.querySelector(".sealmark");
  if (!mark) {
    mark = document.createElement("span");
    mark.className = "sealmark";
    mark.setAttribute("aria-hidden", "true");
    b.insertBefore(mark, b.firstChild);
  }
  var tn = mark.nextSibling;
  if (!tn || tn.nodeType !== 3) { tn = document.createTextNode(""); b.appendChild(tn); }
  if (tn.textContent !== txt) tn.textContent = txt;
};
MC.chip = function (glyph, text, tip) {
  var c = document.createElement("span");
  c.className = "chip";
  if (tip) { c.setAttribute("data-tip", tip); c.setAttribute("tabindex", "0"); }
  c.appendChild(MC.glyph(glyph, 14));
  var t = document.createElement("span");
  t.textContent = text;
  c.appendChild(t);
  return c;
};

/* ---- the nearest sensible ambition. Pure: first match wins. ---- */
MC.nextGoal = function () {
  var rm = MC.rMax();
  if (S.hp < S.maxHp * 0.35 && S.inv.herb > 0)
    return { t: "Eat a herb. Vitality is low.", panel: "fight" };
  if (S.cult >= rm) {
    var to = S.stage >= 8
      ? MC.REALMS[Math.min(MC.REALMS.length - 1, S.realm + 1)].n
      : MC.REALMS[S.realm].n + " " + MC.STAGES[S.stage + 1];
    return { t: "Break through to " + to + ".", panel: "cult" };
  }
  for (var i = 0; i < MC.BOSSES.length; i++) {
    var b = MC.BOSSES[i];
    if (!S.bosses.includes(b.id) && S.realm >= b.realm && MC.tAtk() >= 0.7 * b.def * 2)
      return { t: "Challenge " + b.t + ".", panel: "boss" };
  }
  for (var j = 0; j < MC.RECIPES.length; j++) {
    var r = MC.RECIPES[j];
    if ((r.atk || r.def) && Object.entries(r.c).every(function (kv) { return (S.inv[kv[0]] || 0) >= kv[1]; }))
      return { t: "Forge " + r.t + ".", panel: "forge" };
  }
  var best = null;
  for (var k = 0; k < MC.RECIPES.length; k++) {
    var r2 = MC.RECIPES[k];
    if (!(r2.atk || r2.def)) continue;
    var miss = Object.entries(r2.c).filter(function (kv) { return (S.inv[kv[0]] || 0) < kv[1]; });
    if (!miss.length) continue;
    var tot = miss.reduce(function (a, kv) { return a + (kv[1] - (S.inv[kv[0]] || 0)); }, 0);
    if (!best || tot < best.tot) best = { tot: tot, k: miss[0][0], n: miss[0][1] - (S.inv[miss[0][0]] || 0) };
  }
  if (best) return { t: "Gather " + best.k + ": need " + best.n + " more.", panel: "gather" };
  if (!S.settings.autoCult) return { t: "Switch on auto-cultivate.", panel: "cult" };
  return { t: "Meditate. Cultivation accrues each second.", panel: "cult" };
};

/* ---- per-tick: lobby plate, both bar sets, goal, avatar, tips ---- */
MC.updateStatus = function () {
  var rm = MC.rMax();
  MC.setText(R.lobbyName, "hn", S.name || "Nameless");
  MC.setText(R.lobbySub, "hs", (S.path || "pathless").toUpperCase() + " · " + MC.rName());
  var hpCls = S.hp <= S.maxHp * 0.25 ? "low" : (S.hp <= S.maxHp * 0.5 ? "warn" : "");
  var hpTxt = Math.ceil(S.hp) + "/" + MC.fmt(S.maxHp) + (hpCls === "low" ? " critical" : hpCls ? " low" : "");
  MC.setBar("barHpL", "bhpl", S.hp, S.maxHp, hpTxt, hpCls);
  MC.setBar("barQiL", "bqil", S.qi, S.maxQi, Math.floor(S.qi) + "/" + MC.fmt(S.maxQi));
  var ready = S.cult >= rm;
  var cultTxt = ready ? "Ready " + MC.fmt(S.cult) + "/" + MC.fmt(rm) : MC.fmt(S.cult) + "/" + MC.fmt(rm);
  MC.setBar("barCultL", "bcul", S.cult, rm, cultTxt, ready ? "ready" : "");
  MC.setBar("barHpC", "bhpc", S.hp, S.maxHp, hpTxt, hpCls);
  MC.setBar("barQiC", "bqic", S.qi, S.maxQi, Math.floor(S.qi) + "/" + MC.fmt(S.maxQi));
  MC.setBar("barCultC", "bcuc", S.cult, rm, cultTxt, ready ? "ready" : "");
  if (R.btnCultivate) R.btnCultivate.disabled = MC.paused;
  if (R.cultReady) R.cultReady.hidden = !ready;
  var g = MC.nextGoal();
  if (MC.snap.goal !== g.t) {
    MC.snap.goal = g.t;
    MC._goalPanel = g.panel;
    R.goalTextL.textContent = g.t;
  }
  MC.setText(R.cultNeed, "cn", ready
    ? "The measure is full. Breakthrough stands at " + Math.round(MC.breakChance() * 100) +
      " in a hundred." + (S.pity > 0 ? " Pity adds " + Math.round(S.pity * MC.CONFIG.PITY_STEP * 100) + "." : "")
    : MC.fmt(Math.ceil(rm - S.cult)) + " cultivation short of the attempt." +
      (S.pity > 0 ? " Pity adds " + Math.round(S.pity * MC.CONFIG.PITY_STEP * 100) + "." : ""));
  var dbl = R.btnDoorC ? R.btnDoorC.querySelector("b") : null;
  var door = Date.now() < S.doorUntil;
  if (dbl) {
    var dlab = door ? "Door: " + Math.ceil((S.doorUntil - Date.now()) / 1000) + "s" : "Closed door x3";
    if (MC.snap.ad !== dlab) { MC.snap.ad = dlab; dbl.textContent = dlab; }
  }
  if (R.btnDoorC) R.btnDoorC.style.setProperty("--p", door ? ((S.doorUntil - Date.now()) / 300 + "%") : "0%");
  var bb = R.btnBreakC;
  if (bb) bb.classList.toggle("ready-mark", ready);
  MC.setText(R.btnPauseL, "pzl", MC.paused ? "Resume" : "Pause");
  MC.setText(R.stageTitle, "stt", MC.REALMS[S.realm].n);
  MC.setText(R.btnPauseC, "pzc", MC.paused ? "Resume" : "Pause");
  if (R.pausedVeilL) R.pausedVeilL.hidden = !MC.paused;
  if (R.pausedVeilC) R.pausedVeilC.hidden = !MC.paused;
  var mount = R.lobbyScene || R.cultScene;
  if (mount && MC.snap.srealm !== S.realm) {
    MC.snap.srealm = S.realm;
    var l = $("lobbyScene"), c = $("cultScene");
    if (l) l.setAttribute("data-realm", S.realm);
    if (c) c.setAttribute("data-realm", S.realm);
  }
  if (MC.avatar) {
    MC.renderAvatar({ pose: "meditate", door: door, realm: S.realm, path: S.path });
  }
  MC.tips();
  void mount;
};
/* rates chips beside the focus cards */
MC.updateRates = function () {
  var sig = [MC.cultRate(), MC.gatherMult(), S.settings.focus].join("|");
  if (MC.snap.rates === sig) return;
  MC.snap.rates = sig;
  var el = $("rateChipsC");
  if (!el) return;
  el.textContent = "";
  el.appendChild(MC.chip("flame", MC.fmt1(MC.cultRate()) + "/s", "Unattended cultivation, each second."));
  var ns = { herb: "herb", ore: "ore", wood: "wood", core: "core" };
  for (var i = 0; i < MC.NODES.length; i++) {
    var n = MC.NODES[i];
    el.appendChild(MC.chip(ns[n.id], MC.fmt1(n.rate * MC.gatherMult()) + "/s " + n.id, n.t + ": " + n.desc + "."));
  }
};
/* no lists remain this phase; the hook stays for the loop */
MC.updateLists = function () { MC.dirty.lists = false; };

/* ---- onboarding: two pointers, five minutes, then silence ---- */
MC._tipStep = 0;
MC._tipOrder = ["open", "med"];
MC.tipProgress = function (tag) {
  if (S.ui.hintsDone) return;
  if (MC._tipOrder[MC._tipStep] === tag) {
    MC._tipStep += 1;
    if (MC._tipStep >= MC._tipOrder.length) { S.ui.hintsDone = true; MC.writeStore(); }
  }
};
MC.tips = function () {
  var show = S.started && !S.ui.hintsDone && S.elapsed < 300 && !MC.paused;
  var onLobby = MC.screen === "lobby";
  var bar = onLobby ? R.tipBubbleL : R.tipBubbleC;
  var other = onLobby ? R.tipBubbleC : R.tipBubbleL;
  if (other) other.hidden = true;
  if (!bar) return;
  bar.hidden = !show;
  if (!show) return;
  var txt = MC._tipStep === 0
    ? "New here? Press Space — or the Cultivate button — to begin."
    : "Press Meditate — or Space — to breathe in power.";
  MC.setText(onLobby ? R.tipTextL : R.tipTextC, "tip", txt);
};

/* ---- III drawer ---- */
MC.DRAWER = [
  { id: "lobby", label: "Lobby", glyph: "seed" },
  { id: "cultivate", label: "Cultivate", glyph: "flame" },
  { id: "gather", label: "Gather", glyph: "herb", soon: true },
  { id: "forge", label: "Forge", glyph: "ore", soon: true },
  { id: "fight", label: "Fight", glyph: "sword", soon: true },
  { id: "tyrants", label: "Tyrants", glyph: "shield", soon: true },
  { id: "tower", label: "Tower", glyph: "stone", soon: true },
  { id: "character", label: "Character", glyph: "fist", soon: true },
  { id: "skills", label: "Skills", glyph: "core", soon: true },
  { id: "chronicle", label: "Chronicle", glyph: "wood", soon: true },
  { id: "settings", label: "Settings", glyph: "coin" },
  { id: "help", label: "Help", glyph: "seed" }
];
MC._drawerOpener = null;
MC.buildDrawer = function () {
  var nav = R.drawerNav;
  if (!nav || nav.children.length) return;
  MC.DRAWER.forEach(function (e) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "dentry";
    b.dataset.go = e.id;
    b.appendChild(MC.glyph(e.glyph, 18));
    var t = document.createElement("span");
    t.textContent = e.label;
    b.appendChild(t);
    var here = document.createElement("span");
    here.className = "here";
    here.textContent = "Here";
    here.hidden = true;
    b.appendChild(here);
    if (e.soon) {
      b.setAttribute("aria-disabled", "true");
      var soon = document.createElement("span");
      soon.className = "soon";
      var sid = "soon-" + e.id;
      soon.id = sid;
      soon.textContent = "Coming soon";
      b.appendChild(soon);
      b.setAttribute("aria-describedby", sid);
    }
    b.addEventListener("click", function () { MC.drawerGo(e.id); });
    nav.appendChild(b);
  });
};
MC.updateDrawer = function () {
  var btns = R.drawerNav ? R.drawerNav.querySelectorAll(".dentry") : [];
  for (var i = 0; i < btns.length; i++) {
    var here = btns[i].dataset.go === MC.screen;
    btns[i].classList.toggle("here", here);
    var h = btns[i].querySelector(".here");
    if (h) h.hidden = !here;
    if (here) btns[i].setAttribute("aria-current", "true");
    else btns[i].removeAttribute("aria-current");
  }
};
MC.setDrawer = function (open, opener) {
  var dr = R.drawer, bd = R.drawerBackdrop;
  if (!dr) return;
  if (open) {
    MC._drawerOpener = opener || document.activeElement;
    MC.buildDrawer();
    MC.updateDrawer();
    dr.hidden = false;
    bd.hidden = false;
    requestAnimationFrame(function () { dr.classList.add("open"); });
    var first = dr.querySelector(".dentry");
    if (first) first.focus();
    R.btnMenu.setAttribute("aria-expanded", "true");
    R.btnMenuC.setAttribute("aria-expanded", "true");
  } else {
    dr.classList.remove("open");
    dr.hidden = true;
    bd.hidden = true;
    R.btnMenu.setAttribute("aria-expanded", "false");
    R.btnMenuC.setAttribute("aria-expanded", "false");
    if (MC._drawerOpener && MC._drawerOpener.focus) MC._drawerOpener.focus();
    MC._drawerOpener = null;
  }
};
MC.drawerOpen = function () {
  return R.drawer && !R.drawer.hidden;
};
MC.drawerGo = function (id) {
  if (id === "lobby") { MC.openLobby(); MC.setDrawer(false); }
  else if (id === "cultivate") { MC.openCultivate(); MC.setDrawer(false); }
  else if (id === "settings") { MC.setDrawer(false); MC.openSettings(); }
  else if (id === "help") { MC.setDrawer(false); MC.openHelp(); }
  /* coming-soon entries: focusable, announced, never navigate */
};
MC.trapDrawer = function (e) {
  if (e.key !== "Tab" || !MC.drawerOpen()) return;
  var btns = R.drawerNav.querySelectorAll("button");
  if (!btns.length) return;
  var first = btns[0], last = btns[btns.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
};

/* ---- screen fns ---- */
MC.openLobby = function () {
  MC.showScreen("lobby");
  MC.updateDrawer();
};
MC.openCultivate = function () {
  if (MC.paused) return;
  MC.showScreen("cultivate");
  MC.renderAvatar({ pose: "meditate", door: Date.now() < S.doorUntil, realm: S.realm, path: S.path });
  MC.tipProgress("open");
  MC.updateDrawer();
  MC.renderAll();
};

/* ---- the living scene behind both screens ---- */
MC.updateScene = function () { MC.syncStage(); };
MC.renderAll = function () {
  MC.updateStatus();
  MC.updateRates();
  MC.updateLists();
  MC.updateScene();
};

/* ---- path cards ---- */
MC.PLAYSTYLE = {
  sword: "Strike first; let the mountain answer.",
  body: "Outlast everything, including boredom.",
  alchemy: "A rich pouch buys sharp knives.",
  talisman: "Arrive early to every breakthrough."
};
MC.drawPaths = function () {
  var row = R.pathRow;
  row.textContent = "";
  MC.PATHS.forEach(function (p, i) {
    var d = document.createElement("button");
    d.type = "button";
    d.className = "path" + (MC.selPath === p.id ? " sel" : "");
    d.setAttribute("role", "radio");
    d.setAttribute("aria-checked", MC.selPath === p.id ? "true" : "false");
    var art = document.createElement("span");
    art.setAttribute("aria-hidden", "true");
    (function () {
      var keep = S.path;
      S.path = p.id;
      art.appendChild(MC.portraitSVG(false));
      S.path = keep;
    })();
    var tx = document.createElement("span");
    var h = document.createElement("h3");
    h.textContent = (i + 1) + ". " + p.t;
    var d1 = document.createElement("p");
    d1.textContent = p.d;
    var d2 = document.createElement("p");
    d2.className = "dim";
    d2.textContent = "Standing: " + p.b;
    var d3 = document.createElement("p");
    d3.className = "playstyle";
    d3.textContent = MC.PLAYSTYLE[p.id] || "";
    var ch = document.createElement("p");
    ch.className = "chosen";
    ch.textContent = MC.selPath === p.id ? "Chosen" : "";
    tx.appendChild(h); tx.appendChild(d1); tx.appendChild(d2); tx.appendChild(d3); tx.appendChild(ch);
    d.appendChild(art); d.appendChild(tx);
    d.addEventListener("click", function () {
      MC.selPath = p.id;
      $("btnToGame").disabled = false;
      $("pathErr").textContent = "";
      MC.drawPaths();
    });
    row.appendChild(d);
  });
};
MC.portraitSVG = function (big) {
  var s = big ? 72 : 48;
  var svg = MC.svgEl("svg", { viewBox: "0 0 64 64", width: s, height: s, "aria-hidden": "true" });
  svg.appendChild(MC.svgEl("rect", { x: 0, y: 0, width: 64, height: 64, fill: "#3a322a" }));
  svg.appendChild(MC.svgEl("path", { d: "M32 58 L20 34 Q32 26 44 34 L32 58 Z", fill: "#efe7d3" }));
  svg.appendChild(MC.svgEl("circle", { cx: 32, cy: 20, r: 9, fill: "#efe7d3" }));
  if (S.path === "sword") svg.appendChild(MC.svgEl("line", { x1: 44, y1: 40, x2: 56, y2: 22, stroke: "#b08d4f", "stroke-width": 3 }));
  if (S.path === "body") svg.appendChild(MC.svgEl("path", { d: "M32 58 L14 36 Q32 24 50 36 L32 58 Z", fill: "none", stroke: "#b08d4f", "stroke-width": 2 }));
  if (S.path === "alchemy") svg.appendChild(MC.svgEl("circle", { cx: 46, cy: 44, r: 6, fill: "none", stroke: "#5fae86", "stroke-width": 2 }));
  if (S.path === "talisman") {
    svg.appendChild(MC.svgEl("rect", { x: 14, y: 34, width: 5, height: 12, fill: "#efe7d3" }));
    svg.appendChild(MC.svgEl("rect", { x: 45, y: 34, width: 5, height: 12, fill: "#efe7d3" }));
  }
  return svg;
};

/* ---- modal with focus trap, restore, scroll lock ---- */
MC._lastFocus = null;
MC.showModal = function (title, lines, buttons) {
  MC._lastFocus = document.activeElement;
  R.modalTitle.textContent = title;
  R.modalBody.textContent = "";
  for (var i = 0; i < lines.length; i++) {
    if (typeof lines[i] === "string") {
      var p = document.createElement("p");
      p.textContent = lines[i];
      R.modalBody.appendChild(p);
    } else R.modalBody.appendChild(lines[i]);
  }
  R.modalBtns.textContent = "";
  for (var j = 0; j < buttons.length; j++) (function (b) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn" + (b.primary ? " btn-primary" : "");
    btn.textContent = b.t;
    btn.addEventListener("click", function () { MC.hideModal(); if (b.cb) b.cb(); });
    R.modalBtns.appendChild(btn);
  })(buttons[j]);
  R.modalOverlay.classList.add("open");
  document.body.classList.add("locked");
  var first = R.modalBtns.querySelector("button");
  if (first) first.focus();
};
MC.hideModal = function () {
  R.modalOverlay.classList.remove("open");
  document.body.classList.remove("locked");
  if (MC._lastFocus && MC._lastFocus.focus) MC._lastFocus.focus();
  MC._lastFocus = null;
};
MC.trapTab = function (e) {
  if (e.key !== "Tab" || !R.modalOverlay.classList.contains("open")) return;
  var btns = R.modalBody.querySelectorAll("button, input, select, textarea");
  var foot = R.modalBtns.querySelectorAll("button");
  var all = [];
  for (var i = 0; i < btns.length; i++) all.push(btns[i]);
  for (var j = 0; j < foot.length; j++) all.push(foot[j]);
  if (!all.length) return;
  var first = all[0], last = all[all.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
};

/* ---- settings + help ---- */
MC.openSettings = function () {
  var wrap = document.createElement("div");
  function h(t) {
    var e = document.createElement("div");
    e.className = "psub";
    e.textContent = t;
    wrap.appendChild(e);
  }
  h("Dress");
  var grid = document.createElement("div");
  grid.className = "setgrid";
  function sel(label, opts, val, cb) {
    var l = document.createElement("label");
    var s = document.createElement("span");
    s.textContent = label;
    var e = document.createElement("select");
    for (var i = 0; i < opts.length; i++) {
      var o = document.createElement("option");
      o.value = opts[i][0]; o.textContent = opts[i][1];
      e.appendChild(o);
    }
    e.value = val;
    e.addEventListener("change", cb);
    l.appendChild(s); l.appendChild(e);
    grid.appendChild(l);
    return e;
  }
  sel("Theme", [["day", "Day wash"], ["night", "Night lacquer"]], S.ui.theme, function (e) {
    S.ui.theme = e.target.value; MC.applyUI(); MC.writeStore();
  });
  sel("Letter size", [["s", "Small 12"], ["m", "Medium 13"], ["l", "Large 15"]], S.ui.textSize, function (e) {
    S.ui.textSize = e.target.value; MC.applyUI(); MC.writeStore();
  });
  wrap.appendChild(grid);
  var row = document.createElement("div");
  row.className = "btnrow";
  function sw(label, on, cb, tip) {
    var l = document.createElement("label");
    l.className = "switch";
    if (tip) { l.setAttribute("data-tip", tip); }
    var i = document.createElement("input");
    i.type = "checkbox";
    i.checked = on;
    var s = document.createElement("span");
    s.textContent = label;
    var b = document.createElement("b");
    b.textContent = on ? "On" : "Off";
    i.addEventListener("change", function (e) { cb(e.target.checked); b.textContent = e.target.checked ? "On" : "Off"; });
    l.appendChild(i); l.appendChild(s); l.appendChild(b);
    row.appendChild(l);
  }
  sw("Reduce motion", S.ui.reduceMotion, function (v) { S.ui.reduceMotion = v; MC.applyUI(); MC.writeStore(); },
    "Still all drifting numbers and eased motion.");
  sw("Sound", S.ui.sound, function (v) { S.ui.sound = v; MC.writeStore(); },
    "Small chimes for forging, victories, ascensions.");
  wrap.appendChild(row);
  h("The record");
  var note = document.createElement("p");
  note.className = "dim";
  note.textContent = "The record writes itself every " + S.settings.autosaveSec + " breaths.";
  wrap.appendChild(note);
  var br = document.createElement("div");
  br.className = "btnrow";
  var msg = document.createElement("span");
  msg.className = "dim";
  msg.setAttribute("role", "status");
  function sb(t, cb) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "btn btn-small";
    b.textContent = t;
    b.addEventListener("click", cb);
    br.appendChild(b);
  }
  sb("Record now", function () { MC.writeStore(); msg.textContent = "Recorded."; });
  sb("Copy it out", function () {
    var s = MC.exportSave();
    box.value = s;
    box.select();
    try { document.execCommand("copy"); } catch (e) {}
    if (navigator.clipboard) navigator.clipboard.writeText(s).catch(function () {});
    msg.textContent = "Copied to the box and the clipboard.";
  });
  sb("Bring one in", function () {
    try {
      MC.importSave(box.value);
      MC.selPath = S.path;
      MC.battle = null;
      MC.applyUI();
      MC.act.enterMain();
      MC.hideModal();
      MC.log("The brought record is accepted.", "rich", "sys");
    } catch (e) { msg.textContent = "Not a record; nothing changed."; }
  });
  br.appendChild(msg);
  wrap.appendChild(br);
  var box = document.createElement("textarea");
  box.rows = 3;
  box.setAttribute("aria-label", "Save string");
  box.placeholder = "The exported record appears here.";
  wrap.appendChild(box);
  h("Danger");
  var dw = document.createElement("p");
  dw.className = "dim";
  dw.textContent = "Shattering ends this life entirely. Write RESET below.";
  wrap.appendChild(dw);
  var dr = document.createElement("div");
  dr.className = "btnrow";
  var wi = document.createElement("input");
  wi.maxLength = 16;
  wi.placeholder = "RESET";
  wi.setAttribute("aria-label", "Type RESET to confirm");
  var wb = document.createElement("button");
  wb.type = "button";
  wb.className = "btn btn-small btn-danger";
  wb.textContent = "Shatter this life";
  wb.disabled = true;
  wi.addEventListener("input", function (e) { wb.disabled = e.target.value.trim() !== "RESET"; });
  wb.addEventListener("click", function () {
    if (wi.value.trim() !== "RESET") return;
    MC._wiped = true;
    try { localStorage.removeItem(MC.CONFIG.SAVE_KEY); } catch (e) {}
    location.reload();
  });
  dr.appendChild(wi); dr.appendChild(wb);
  wrap.appendChild(dr);
  MC.showModal("Settings", [wrap], [{ t: "Done", primary: true }]);
};
MC.HELP = [
  "This is the lobby: one plate, three bars, one button.",
  "The III menu holds every section; most open in later tales.",
  "Cultivate fills the measure on its own; breakthroughs carry you up.",
  "Gathering, forging and fighting continue underneath, unattended.",
  "Space repeats the one action before you; Escape closes all doors.",
  "At Dao Ascension you may be reborn, and begin again further."
];
MC.openHelp = function () {
  MC.showModal("How the mountain works", MC.HELP, [{ t: "Return", primary: true }]);
};

/* ---- offline summary: framed chips of what the reckoning produced ---- */
MC.showOffline = function () {
  var sum = MC.offlineSummary;
  MC.pendingOffline = null;
  if (!sum) { MC.act.enterMain(); return; }
  MC.act.enterMain();
  var body = [];
  body.push("Away for " + MC.fmtTime(sum.secs) + "." +
    (sum.capped ? " The heavens reckon eight hours at most." : ""));
  var grid = document.createElement("div");
  grid.className = "rewardgrid";
  function reward(glyph, text) {
    grid.appendChild(MC.chip(glyph, text, null));
  }
  if (sum.cult) reward("flame", "+" + MC.fmt(sum.cult) + " cultivation");
  var mats = Object.keys(sum.mats || {});
  for (var i = 0; i < mats.length; i++) {
    if (sum.mats[mats[i]]) reward(mats[i], "+" + MC.fmt(sum.mats[mats[i]]) + " " + mats[i]);
  }
  if (sum.gold) reward("coin", "+" + MC.fmt(sum.gold) + " gold");
  body.push(grid);
  MC.showModal("You Return", body, [{ t: "Resume Cultivation", primary: true }]);
  MC.log("Returned after " + MC.fmtTime(sum.secs) + ": +" + MC.fmt(sum.cult) +
    " cultivation, +" + MC.fmt(sum.gold) + " gold.", "rich", "sys");
};
