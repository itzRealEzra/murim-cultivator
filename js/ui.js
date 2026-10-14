/* Murim Cultivator — view layer.
   Cached DOM refs, per-component snapshots, targeted updates only.
   Dynamic text travels via textContent, never innerHTML. The only inline
   styles JS touches are --p bar widths and SVG geometry attributes. */
var MC = window.MC || {};
window.MC = MC;

function $(id) { return document.getElementById(id); }

/* ---- cached refs ---- */
var R = {};
MC.cacheDom = function () {
  var ids = ["hudName", "hudSub", "portrait", "barHp", "barQi", "barCult", "hpIn", "qiIn", "cultIn",
    "curChips", "statChips", "btnPauseChip", "tickN", "goalStrip", "goalText", "stageMount",
    "floats", "banner", "pausedVeil", "tipBubble", "tipText", "tipSkip", "foePlate",
    "actPrimary", "actBurst", "actDoor", "actEat", "actPill", "actFlee",
    "optCult", "optBreak", "optGather", "optFight", "optHeal", "optTower",
    "cultInfo", "doorLine", "rateChips", "nodes", "recipes", "gearCards", "foes", "battleLine",
    "bosses", "towerBox", "towerNum", "skills", "skillDetail", "treeLines", "skStones", "skSeeds",
    "eqWeapon", "eqArmor", "eqCharm", "charSvg", "charStats", "pouchChips", "rebirthBox",
    "setTheme", "setText", "setSound", "setMotion", "autosaveNote", "btnSave", "btnExp", "btnImp",
    "saveMsg", "saveBox", "wipeWord", "btnWipe", "sideStatus", "sidePouch", "log",
    "modalOverlay", "modalTitle", "modalBody", "modalBtns", "toasts", "focus",
    "screen-main", "inName", "userErr", "btnContinue", "hasSave", "pathRow", "pathNameEcho",
    "pathErr", "btnToGame", "hintBar"];
  for (var i = 0; i < ids.length; i++) R[ids[i]] = $(ids[i]);
  R.focusRadios = document.querySelectorAll('input[name="focus"]');
  R.tabs = document.querySelectorAll(".tabs button[data-m]");
  for (var t = 0; t < R.tabs.length; t++) {
    if (!R.tabs[t].getAttribute("data-basetip")) {
      R.tabs[t].setAttribute("data-basetip", R.tabs[t].getAttribute("data-tip") || "");
    }
  }
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

/* ---- chronicle: typed, timestamped, collapsed, filterable ---- */
MC._lastKey = null; MC._lastEl = null; MC._lastN = 0;
MC.log = function (m, tone, kind) {
  var b = R.log;
  if (!b) return;
  kind = kind || "sys";
  tone = tone || "";
  var key = kind + "|" + tone + "|" + m;
  if (key === MC._lastKey && MC._lastEl && MC._lastEl.isConnected) {
    MC._lastN += 1;
    var rep = MC._lastEl.querySelector(".rep");
    if (rep) rep.textContent = " x" + MC._lastN;
    return;
  }
  var d = document.createElement("div");
  d.dataset.kind = kind;
  if (tone) d.classList.add(tone);
  d.classList.add("k-" + kind);
  var ts = document.createElement("span");
  ts.className = "ts";
  ts.textContent = MC.clock();
  d.appendChild(ts);
  var s = document.createElement("span");
  s.textContent = m;
  d.appendChild(s);
  var r2 = document.createElement("span");
  r2.className = "rep";
  d.appendChild(r2);
  if (S.ui.logFilter !== "all" && S.ui.logFilter !== kind) d.hidden = true;
  b.prepend(d);
  while (b.children.length > MC.CONFIG.LOG_CAP) b.lastChild.remove();
  MC._lastKey = key; MC._lastEl = d; MC._lastN = 1;
};
MC.applyFilter = function () {
  var f = S.ui.logFilter;
  var btns = document.querySelectorAll(".filters button[data-f]");
  for (var i = 0; i < btns.length; i++) {
    var on = btns[i].dataset.f === f;
    btns[i].classList.toggle("on", on);
    btns[i].setAttribute("aria-pressed", on ? "true" : "false");
  }
  if (!R.log) return;
  for (var j = 0; j < R.log.children.length; j++) {
    var d = R.log.children[j];
    d.hidden = !(f === "all" || d.dataset.kind === f);
  }
};

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
  if (!R.floats) return;
  if (R.floats.children.length >= 10) R.floats.firstChild.remove();
  var s = document.createElement("span");
  s.className = "float " + (kind || "hit");
  s.textContent = txt;
  s.style.left = (15 + Math.random() * 60) + "%";
  s.style.top = (30 + Math.random() * 35) + "%";
  R.floats.appendChild(s);
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
  if (!MC.still() && MC.stage) {
    MC.stage.svg.classList.remove("shake");
    if (fail) {
      void MC.stage.svg.getBoundingClientRect();
      MC.stage.svg.classList.add("shake");
    }
  }
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

/* ---- navigation ---- */
MC.show = function (id) {
  var ss = document.querySelectorAll(".screen");
  for (var i = 0; i < ss.length; i++) ss[i].classList.remove("active");
  $(id).classList.add("active");
};
MC.showMenu = function (m) {
  for (var i = 0; i < R.tabs.length; i++) {
    var on = R.tabs[i].dataset.m === m;
    R.tabs[i].classList.toggle("active", on);
    R.tabs[i].setAttribute("aria-selected", on ? "true" : "false");
  }
  var subs = document.querySelectorAll(".sub");
  for (var j = 0; j < subs.length; j++) subs[j].classList.remove("active");
  $("m-" + m).classList.add("active");
  if (m === "skills") MC.drawTree();
  MC.tipProgress(m);
  if (S.ui.panel !== m) { S.ui.panel = m; MC.writeStore(); }
};

/* ---- settings reach the document ---- */
MC.applyUI = function () {
  document.body.dataset.theme = S.ui.theme === "night" ? "night" : "day";
  document.body.dataset.motion = S.ui.reduceMotion ? "reduce" : "full";
  var px = { s: "14px", m: "16px", l: "18px" }[S.ui.textSize] || "16px";
  document.documentElement.style.fontSize = px;
};
MC.syncSettingsUI = function () {
  for (var i = 0; i < R.focusRadios.length; i++) {
    R.focusRadios[i].checked = R.focusRadios[i].value === S.settings.focus;
  }
  MC.syncSwitch(R.optCult, S.settings.autoCult);
  MC.syncSwitch(R.optBreak, S.settings.autoBreak);
  MC.syncSwitch(R.optGather, S.settings.autoGather);
  MC.syncSwitch(R.optFight, S.settings.autoFight);
  MC.syncSwitch(R.optHeal, S.settings.autoHeal);
  MC.syncSwitch(R.optTower, S.settings.autoTower);
  R.setTheme.value = S.ui.theme;
  R.setText.value = S.ui.textSize;
  MC.syncSwitch(R.setSound, S.ui.sound);
  MC.syncSwitch(R.setMotion, S.ui.reduceMotion);
  R.autosaveNote.textContent = "The record writes itself every " + S.settings.autosaveSec + " breaths.";
  MC.applyFilter();
};
MC.syncSettingsUI = function () {
  for (var i = 0; i < R.focusRadios.length; i++) {
    R.focusRadios[i].checked = R.focusRadios[i].value === S.settings.focus;
  }
  MC.syncSwitch(R.optCult, S.settings.autoCult);
  MC.syncSwitch(R.optBreak, S.settings.autoBreak);
  MC.syncSwitch(R.optGather, S.settings.autoGather);
  MC.syncSwitch(R.optFight, S.settings.autoFight);
  MC.syncSwitch(R.optHeal, S.settings.autoHeal);
  MC.syncSwitch(R.optTower, S.settings.autoTower);
  R.setTheme.value = S.ui.theme;
  R.setText.value = S.ui.textSize;
  R.setSound.checked = S.ui.sound;
  MC.syncSwitch(R.setSound, S.ui.sound);
  MC.syncSwitch(R.setMotion, S.ui.reduceMotion);
  R.autosaveNote.textContent = "The record writes itself every " + S.settings.autosaveSec + " breaths.";
  MC.applyFilter();
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

/* ---- bars, chips, records ---- */
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
  c.appendChild(MC.glyph(glyph, 16));
  var t = document.createElement("span");
  t.textContent = text;
  c.appendChild(t);
  return c;
};
MC.record = function (el, rows) {
  var sig = rows.map(function (r) { return r[0] + "=" + r[1]; }).join(";");
  if (MC.snap[el.id] === sig) return;
  MC.snap[el.id] = sig;
  el.textContent = "";
  for (var i = 0; i < rows.length; i++) {
    var w = document.createElement("div");
    var t = document.createElement("dt"); t.textContent = rows[i][0];
    var v = document.createElement("dd"); v.textContent = rows[i][1];
    w.appendChild(t); w.appendChild(v);
    el.appendChild(w);
  }
};
MC.costChip = function (k, have, need) {
  var c = document.createElement("span");
  var ok = have >= need;
  c.className = "costchip " + (ok ? "ok" : "no");
  c.setAttribute("data-tip", ok ? have + " " + k + " in hand" : "wanting " + (need - have) + " " + k);
  c.setAttribute("tabindex", "0");
  c.appendChild(MC.glyph(k === "gold" ? "coin" : k, 14));
  var t = document.createElement("span");
  t.textContent = have + "/" + need;
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
  if (!S.settings.autoCult) return { t: "Turn on auto-cultivate.", panel: "cult" };
  return { t: "Meditate. Cultivation accrues each second.", panel: "cult" };
};

/* ---- header, bars, currencies, records: only changed nodes ---- */
MC.updateStatus = function () {
  var rm = MC.rMax();
  MC.setText(R.hudName, "hn", S.name || "Nameless");
  MC.setText(R.hudSub, "hs", (S.path || "pathless").toUpperCase() + " · " + MC.rName());
  var hpCls = S.hp <= S.maxHp * 0.25 ? "low" : (S.hp <= S.maxHp * 0.5 ? "warn" : "");
  var hpTxt = Math.ceil(S.hp) + "/" + MC.fmt(S.maxHp) + (hpCls === "low" ? " critical" : hpCls ? " low" : "");
  MC.setBar("barHp", "bhp", S.hp, S.maxHp, hpTxt, hpCls);
  MC.setBar("barQi", "bqi", S.qi, S.maxQi, Math.floor(S.qi) + "/" + MC.fmt(S.maxQi));
  var ready = S.cult >= rm;
  MC.setBar("barCult", "bcu", S.cult, rm,
    ready ? "Ready " + MC.fmt(S.cult) + "/" + MC.fmt(rm) : MC.fmt(S.cult) + "/" + MC.fmt(rm),
    ready ? "ready" : "");
  MC.setText(R.tickN, "tk", MC.fmtTime(S.elapsed) + " gone");
  MC.currencies();
  MC.combatChips();
  MC.setText(R.cultInfo, "ci", ready
    ? "The measure is full. Breakthrough stands at " + Math.round(MC.breakChance() * 100) +
      " in a hundred." + (S.pity > 0 ? " Pity adds " + Math.round(S.pity * MC.CONFIG.PITY_STEP * 100) + "." : "")
    : MC.fmt(Math.ceil(rm - S.cult)) + " cultivation short of the attempt." +
      (S.pity > 0 ? " Pity adds " + Math.round(S.pity * MC.CONFIG.PITY_STEP * 100) + "." : ""));
  MC.setText(R.doorLine, "dl", Date.now() < S.doorUntil
    ? "Behind the door: " + Math.ceil((S.doorUntil - Date.now()) / 1000) + " breaths of triple gain." : "");
  R.doorLine.hidden = !(Date.now() < S.doorUntil);
  MC.setText(R.battleLine, "bl", MC.battle
    ? "You, " + Math.ceil(S.hp) + " health, against " + MC.battle.f.t + ", " +
      Math.ceil(MC.battle.hp) + " of " + MC.fmt(MC.battle.max) + "."
    : "No battle. Choose a foe above, or climb the tower.");
  MC.actionBar();
  MC.record(R.sideStatus, [
    ["Realm", MC.rName()], ["Kills", MC.fmt(S.kills)],
    ["Rebirths", MC.fmt(S.rebirths)], ["Seeds", MC.fmt(S.seeds)],
    ["Tower floor", MC.fmt(S.tower)], ["Tyrants", S.bosses.length + "/" + MC.BOSSES.length]
  ]);
  MC.pouch(R.sidePouch);
  MC.goal();
  MC.badges();
  MC.tips();
  MC.setText(R.skStones, "ss", MC.fmt(S.stones));
  MC.setText(R.skSeeds, "sd", MC.fmt(S.seeds));
  MC.setText(R.towerNum, "tw", MC.fmt(S.tower));
  R.pausedVeil.hidden = !MC.paused;
  MC.setText(R.btnPauseChip, "pz", MC.paused ? "Resume" : "Pause");
};
MC.currencies = function () {
  var sig = [S.gold, S.stones, S.seeds].join(",");
  if (MC.snap.cur === sig) return;
  MC.snap.cur = sig;
  R.curChips.textContent = "";
  R.curChips.appendChild(MC.chip("coin", MC.fmt(S.gold) + " gold", "Gold. Sells feed the forge; kills feed the purse."));
  R.curChips.appendChild(MC.chip("stone", MC.fmt(S.stones) + " stones", "Spirit stones. Kills and tower floors pay them; techniques spend them."));
  R.curChips.appendChild(MC.chip("seed", MC.fmt(S.seeds) + " seeds", "Dao seeds. Paid on rebirth; spent on deep techniques."));
};
MC.combatChips = function () {
  var sig = [MC.tAtk(), MC.tDef(), MC.tSpi()].join(",");
  if (MC.snap.sc === sig) return;
  MC.snap.sc = sig;
  R.statChips.textContent = "";
  R.statChips.appendChild(MC.chip("sword", "ATK " + MC.fmt(MC.tAtk()),
    "Strike strength: base " + S.atk + (S.path === "sword" ? ", +30% of the Sword path" : "") +
    ", techniques, and worn arms."));
  R.statChips.appendChild(MC.chip("shield", "DEF " + MC.fmt(MC.tDef()),
    "Guard: base " + S.def + (S.path === "body" ? ", +3 of the Body path" : "") +
    ", techniques, and worn armor."));
  R.statChips.appendChild(MC.chip("core", "SPI " + MC.fmt(MC.tSpi()),
    "Spirit: sharper crits, heavier bursts, steadier breakthroughs."));
};
/* action bar: one primary, honest secondaries, state-word toggles */
MC.actionBar = function () {
  var label = MC.battle ? "Strike" : (S.cult >= MC.rMax() ? "Breakthrough" : "Meditate");
  MC.setText(R.actPrimary, "ap", label);
  R.actPrimary.classList.toggle("ready", !MC.battle && S.cult >= MC.rMax());
  var canBurst = S.qi >= 10;
  if (R.actBurst.disabled === canBurst) {
    R.actBurst.disabled = !canBurst;
    R.actBurst.setAttribute("data-tip", canBurst ? "Ten qi for a heavy exchange. Key Q." : "Wanting 10 qi; circulate first.");
  }
  var door = Date.now() < S.doorUntil;
  var dbl = R.actDoor.querySelector("b");
  var dlab = door ? "Door: " + Math.ceil((S.doorUntil - Date.now()) / 1000) + "s" : "Closed door";
  if (MC.snap.ad !== dlab) { MC.snap.ad = dlab; dbl.textContent = dlab; }
  R.actDoor.style.setProperty("--p", door ? ((S.doorUntil - Date.now()) / 300 + "%") : "0%");
  var canEat = S.inv.herb > 0 && S.hp < S.maxHp;
  if (!!R.actEat.disabled === canEat) {
    R.actEat.disabled = !canEat;
    R.actEat.setAttribute("data-tip", S.inv.herb <= 0 ? "No herbs; gather first." : (S.hp >= S.maxHp ? "Already whole." : "Chew one herb for 25 health. Key E."));
  }
  var canPill = S.inv.pill > 0 || S.inv.bigpill > 0;
  if (!!R.actPill.disabled === canPill) {
    R.actPill.disabled = !canPill;
    R.actPill.setAttribute("data-tip", canPill ? "Swallow a pill: full qi and cultivation." : "No pills; the forge is waiting.");
  }
  R.actFlee.hidden = !MC.battle;
};
/* goal strip: text changes only */
MC.goal = function () {
  var g = MC.nextGoal();
  if (MC.snap.goal !== g.t) {
    MC.snap.goal = g.t;
    MC._goalPanel = g.panel;
    R.goalText.textContent = g.t;
  }
};
/* tab dots for actionable pages */
MC.badges = function () {
  var rm = MC.rMax();
  var afford = MC.RECIPES.some(function (r) {
    return Object.entries(r.c).every(function (kv) { return (S.inv[kv[0]] || 0) >= kv[1]; });
  });
  var foe = MC.BOSSES.some(function (b) { return !S.bosses.includes(b.id) && S.realm >= b.realm; });
  var learn = false;
  for (var pi = 0; pi < MC.PATHS.length && !learn; pi++) {
    var chain = MC.SKILLS.filter(function (s) { return s.path === MC.PATHS[pi].id; });
    for (var i = 0; i < chain.length; i++) {
      if (MC.has(chain[i].id)) continue;
      if (i > 0 && !MC.has(chain[i - 1].id)) break;
      var c = chain[i].cost;
      if (c.seeds ? S.seeds >= c.seeds : S.stones >= c.stones) learn = true;
      break;
    }
  }
  var marks = { cult: S.cult >= rm, forge: afford, boss: foe, skills: learn,
    char: MC.canRebirth() && MC.seedsFor(S.totalCult) > 0 };
  for (var t = 0; t < R.tabs.length; t++) {
    var b = R.tabs[t], on = !!marks[b.dataset.m];
    if ((b.classList.contains("has-news") || false) !== on) b.classList.toggle("has-news", on);
    var base = b.textContent.replace(/\s+/g, " ").trim();
    var lab = base + (on ? ", needs attention" : "");
    if (b.getAttribute("aria-label") !== lab) b.setAttribute("aria-label", lab);
  }
};
/* onboarding bubble: one pointer at a time, five minutes, then silence */
MC._tipStep = 0;
MC._tipOrder = ["med", "gather", "forge", "fight"];
MC.tipProgress = function (tag) {
  if (S.ui.hintsDone) return;
  if (MC._tipOrder[MC._tipStep] === tag) {
    MC._tipStep += 1;
    if (MC._tipStep >= MC._tipOrder.length) { S.ui.hintsDone = true; MC.writeStore(); }
  }
};
MC.tips = function () {
  var show = S.started && !S.ui.hintsDone && S.elapsed < 300 && !MC.paused;
  R.tipBubble.hidden = !show;
  if (!show) return;
  var texts = [
    "Press Meditate — or Space — then let the seconds work.",
    "Open Gather, page 2, and set a hand to each ground.",
    "Open Forge, page 3, when a price is in hand.",
    "Open Fight, page 4, and blood your blade."
  ];
  MC.setText(R.tipText, "tip", texts[Math.min(MC._tipStep, 3)]);
};
/* rates chips on the cultivate page */
MC.updateRates = function () {
  var sig = [MC.cultRate(), MC.gatherMult(), S.settings.focus].join("|");
  if (MC.snap.rates === sig) return;
  MC.snap.rates = sig;
  var el = $("rateChips");
  if (!el) return;
  el.textContent = "";
  el.appendChild(MC.chip("flame", MC.fmt1(MC.cultRate()) + "/s cultivation", "Unattended gain, each second."));
  var ns = { herb: "herb", ore: "ore", wood: "wood", core: "core" };
  for (var i = 0; i < MC.NODES.length; i++) {
    var n = MC.NODES[i];
    el.appendChild(MC.chip(ns[n.id], MC.fmt1(n.rate * MC.gatherMult()) + "/s " + n.id, n.t + ": " + n.desc + "."));
  }
};

/* ---- cards ---- */
MC.card = function (opts) {
  var d = document.createElement("div");
  d.className = "card" + (opts.cls ? " " + opts.cls : "");
  var h = document.createElement("h4");
  h.appendChild(MC.glyph(opts.glyph || "core", 18));
  var ht = document.createElement("span");
  ht.textContent = opts.title;
  h.appendChild(ht);
  d.appendChild(h);
  if (opts.stat) {
    var s = document.createElement("div");
    s.className = "stat";
    s.textContent = opts.stat;
    d.appendChild(s);
  }
  if (opts.costs) {
    var c = document.createElement("div");
    c.className = "costs";
    var keys = Object.keys(opts.costs);
    for (var i = 0; i < keys.length; i++) {
      c.appendChild(MC.costChip(keys[i], S.inv[keys[i]] || 0, opts.costs[keys[i]]));
    }
    d.appendChild(c);
  }
  if (opts.extra) d.appendChild(opts.extra);
  var b = document.createElement("button");
  b.type = "button";
  b.className = "btn" + (opts.primary ? " btn-primary" : "");
  b.textContent = opts.btn;
  if (opts.tip) b.setAttribute("data-tip", opts.tip);
  if (opts.disabled) {
    b.disabled = true;
    if (opts.why) b.setAttribute("data-tip", opts.why);
  }
  b.addEventListener("click", opts.cb);
  d.appendChild(b);
  return d;
};
MC.previewLine = function (g, after) {
  var p = document.createElement("div");
  p.className = "stat preview";
  var bits = [];
  if (g.atk || (after && after.atk)) bits.push("ATK " + MC.fmt(g.atk || 0) + " → " + MC.fmt((after && after.atk) || 0));
  if (g.def || (after && after.def)) bits.push("Guard " + MC.fmt(g.def || 0) + " → " + MC.fmt((after && after.def) || 0));
  p.textContent = bits.join(" · ") || "No strike nor guard in it.";
  return p;
};

/* ---- lists, rebuilt only when dirty ---- */
MC.updateLists = function () {
  if (!MC.dirty.lists) return;
  MC.dirty.lists = false;

  R.nodes.textContent = "";
  var gmap = { herb: "herb", ore: "ore", wood: "wood", core: "core" };
  for (var ni = 0; ni < MC.NODES.length; ni++) {
    (function (n) {
      R.nodes.appendChild(MC.card({ glyph: gmap[n.id], title: n.t,
        stat: n.desc + ". Tithe " + MC.fmt1(n.rate * MC.gatherMult()) + "/s · in hand " + MC.fmt(S.inv[n.id]),
        btn: "Gather", tip: "Gather by hand at once", cb: function () { MC.act.doGather(n.id); } }));
    })(MC.NODES[ni]);
  }

  R.recipes.textContent = "";
  for (var ri = 0; ri < MC.RECIPES.length; ri++) {
    (function (r) {
      var can = Object.entries(r.c).every(function (kv) { return (S.inv[kv[0]] || 0) >= kv[1]; });
      var slot = r.slot === "weapon" ? "sword" : r.slot === "armor" ? "shield" : (r.pill || r.bigpill ? "flame" : "seed");
      R.recipes.appendChild(MC.card({ glyph: slot, title: r.t, stat: r.d, costs: r.c,
        cls: can ? "can" : "", btn: can ? "Forge" : "Wanting",
        primary: can, tip: can ? "The price is in hand" : "Gather more first",
        disabled: !can, why: "Price not in hand",
        cb: function () { MC.act.doCraft(r.id); } }));
    })(MC.RECIPES[ri]);
  }

  R.gearCards.textContent = "";
  if (!S.gear.length) {
    var none = document.createElement("p");
    none.className = "dim";
    none.textContent = "Nothing forged yet.";
    R.gearCards.appendChild(none);
  }
  for (var gi = 0; gi < S.gear.length; gi++) (function (g) {
    var worn = S.equip[g.slot] === g.uid;
    var rar = (MC.RARITIES.find(function (r) { return r.id === g.rar; }) || MC.RARITIES[0]).t;
    var d = document.createElement("div");
    d.className = "card" + (worn ? " can" : "");
    var h = document.createElement("h4");
    h.appendChild(MC.glyph(g.slot === "weapon" ? "sword" : g.slot === "armor" ? "shield" : "seed", 18));
    var ht = document.createElement("span");
    ht.textContent = g.t + " · " + rar + " +" + (g.lvl || 0) + (worn ? " · worn" : "");
    h.appendChild(ht);
    d.appendChild(h);
    d.appendChild(MC.previewLine({ atk: 0, def: 0 }, null));
    d.lastChild.textContent = "Now: Attack " + MC.fmt(MC.gearStat(g, "atk")) +
      ", Guard " + MC.fmt(MC.gearStat(g, "def")) +
      (g.spi || MC.gearStat(g, "spi") ? ", Spirit " + MC.fmt(MC.gearStat(g, "spi")) : "");
    var cost = MC.upgradeCost(g);
    var maxed = (g.lvl || 0) >= MC.CONFIG.UPGRADE_MAX;
    var affordUp = S.inv.ore >= cost.ore && S.inv.wood >= cost.wood;
    var row = document.createElement("div");
    row.className = "btnrow";
    function ab(t, tip, cb, dis, primary) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "btn btn-small" + (primary ? " btn-primary" : "");
      b.textContent = t;
      b.setAttribute("data-tip", tip);
      b.disabled = !!dis;
      b.addEventListener("click", cb);
      row.appendChild(b);
    }
    ab(worn ? "Worn" : "Wear", "Take this up", function () { MC.act.doEquip(g.uid); }, worn);
    ab(maxed ? "Perfected" : "Reforge", maxed ? "No further" : "Iron " + cost.ore + ", timber " + cost.wood + " for an eighth-part more",
      function () { MC.act.upgradeGear(g.uid); }, maxed || !affordUp);
    ab("Sell " + MC.fmt(MC.sellPrice(g)), "For gold, unworn only",
      function () { MC.act.sellGear(g.uid); }, worn);
    d.appendChild(row);
    R.gearCards.appendChild(d);
  })(S.gear[gi]);

  R.foes.textContent = "";
  MC.FOES.forEach(function (f, i) {
    R.foes.appendChild(MC.card({ glyph: "fist", title: f.t,
      stat: "Health " + MC.fmt(f.hp) + " · strike " + MC.fmt(f.atk) + " · pays " + MC.fmt(f.cult) + " cultivation",
      btn: "Fight", tip: "Open battle", cb: function () { MC.act.doFight(i, false); } }));
  });

  R.bosses.textContent = "";
  MC.BOSSES.forEach(function (b, i) {
    var sl = S.bosses.includes(b.id), lk = S.realm < b.realm;
    R.bosses.appendChild(MC.card({ glyph: "flame", title: b.t,
      stat: (sl ? "Fallen. " : lk ? "Sealed until " + MC.REALMS[b.realm].n + ". " : "") +
        "Health " + MC.fmt(b.hp) + " · strike " + MC.fmt(b.atk),
      cls: sl ? "" : (lk ? "locked" : "can"), btn: sl ? "Fallen" : "Challenge",
      primary: !sl && !lk, tip: sl ? "Already slain" : lk ? "Beyond your present realm" : "A hard fight, richly paid",
      disabled: sl || lk, why: sl ? "Already slain" : "Sealed until " + MC.REALMS[b.realm].n,
      cb: function () { MC.act.doFight(i, true); } }));
  });

  R.towerBox.textContent = "";
  var next = MC.towerFoe(S.tower + 1);
  R.towerBox.appendChild(MC.card({ glyph: "shield", title: "Floor " + MC.fmt(S.tower + 1) + ": " + next.t,
    stat: "Health " + MC.fmt(next.hp) + " · strike " + MC.fmt(next.atk) + " · pays " +
      MC.fmt(next.cult) + " cultivation" + ((S.tower + 1) % 3 === 0 ? ", plus a core" : ""),
    btn: "Climb", primary: true, tip: "Face the next warden",
    cb: function () { MC.act.climbTower(); } }));

  MC.skills();
  MC.character();
};

MC.skills = function () {
  var sk = R.skills;
  sk.textContent = "";
  for (var pi = 0; pi < MC.PATHS.length; pi++) {
    (function (p) {
      var col = document.createElement("div");
      col.className = "skillcol";
      col.dataset.path = p.id;
      var chain = MC.SKILLS.filter(function (s) { return s.path === p.id; });
      for (var i = 0; i < chain.length; i++) (function (s, idx) {
        var learned = MC.has(s.id);
        var locked = idx > 0 && !MC.has(chain[idx - 1].id);
        var afford = s.cost.seeds ? S.seeds >= s.cost.seeds : S.stones >= s.cost.stones;
        var b = document.createElement("button");
        b.type = "button";
        b.className = "node" + (learned ? " learned" : locked ? " locked" : (afford ? " avail" : ""));
        b.dataset.skill = s.id;
        var dot = document.createElement("span");
        dot.className = "dot";
        dot.setAttribute("aria-hidden", "true");
        var nm = document.createElement("span");
        nm.textContent = s.t;
        b.appendChild(dot); b.appendChild(nm);
        b.setAttribute("aria-label", s.t + (learned ? ", learned" : locked ? ", sealed: learn the step above first" : ", " + s.d));
        b.addEventListener("click", function () { MC.selSkill = s.id; MC.skillDetail(); });
        col.appendChild(b);
      })(chain[i], i);
      sk.appendChild(col);
    })(MC.PATHS[pi]);
  }
  MC.skillDetail();
  MC.drawTree();
};
MC.selSkill = null;
MC.skillDetail = function () {
  var box = R.skillDetail;
  var s = MC.SKILLS.find(function (x) { return x.id === MC.selSkill; });
  if (!s) { box.hidden = true; box.textContent = ""; return; }
  var chain = MC.SKILLS.filter(function (x) { return x.path === s.path; });
  var idx = chain.findIndex(function (x) { return x.id === s.id; });
  var learned = MC.has(s.id);
  var locked = idx > 0 && !MC.has(chain[idx - 1].id);
  var afford = s.cost.seeds ? S.seeds >= s.cost.seeds : S.stones >= s.cost.stones;
  box.hidden = false;
  box.textContent = "";
  var h = document.createElement("b");
  h.textContent = s.t + " — " + s.d + " ";
  box.appendChild(h);
  var c = document.createElement("span");
  c.textContent = s.cost.seeds ? "Price: " + s.cost.seeds + " seeds (in hand " + S.seeds + ")."
    : "Price: " + s.cost.stones + " stones (in hand " + S.stones + ").";
  box.appendChild(c);
  box.appendChild(document.createTextNode(" "));
  var b = document.createElement("button");
  b.type = "button";
  b.className = "btn btn-small" + ((!learned && !locked && afford) ? " btn-primary" : "");
  b.textContent = learned ? "Known" : "Learn";
  b.disabled = learned || locked || !afford;
  if (b.disabled) b.title = learned ? "Already learned" : locked ? "Learn the step above first" : "Price not in hand";
  b.addEventListener("click", function () { MC.act.buySkill(s.id); });
  box.appendChild(b);
};
MC.drawTree = function () {
  var svg = R.treeLines;
  if (!svg || !$("m-skills").classList.contains("active")) return;
  var host = R.skills;
  var W = host.scrollWidth, H = host.scrollHeight;
  if (!W || !H) return;
  svg.setAttribute("width", W);
  svg.setAttribute("height", H);
  svg.setAttribute("viewBox", "0 0 " + W + " " + H);
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  var hr = host.getBoundingClientRect();
  var cols = host.querySelectorAll(".skillcol");
  for (var i = 0; i < cols.length; i++) {
    var nodes = cols[i].querySelectorAll(".node");
    for (var j = 0; j + 1 < nodes.length; j++) {
      var a = nodes[j].getBoundingClientRect(), b = nodes[j + 1].getBoundingClientRect();
      var x = a.left - hr.left + 25;
      var ln = MC.svgEl("line", { x1: x, y1: a.bottom - hr.top, x2: x, y2: b.top - hr.top,
        stroke: "#b08d4f", "stroke-width": 2 });
      svg.appendChild(ln);
    }
  }
};
MC.portraitSVG = function (big) {
  var s = big ? 120 : 64;
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
MC.character = function () {
  function slot(id, g, bare) {
    var el = $(id);
    el.textContent = "";
    var n = document.createElement("span");
    n.className = "slotname";
    n.textContent = el.getAttribute("data-slotname") || bare;
    var b = document.createElement("b");
    b.textContent = g ? g.t + " · " + ((MC.RARITIES.find(function (r) { return r.id === g.rar; }) || {}).t || "common") + " +" + (g.lvl || 0) : bare;
    el.appendChild(n); el.appendChild(b);
  }
  var w = S.gear.find(function (x) { return x.uid === S.equip.weapon; });
  var a = S.gear.find(function (x) { return x.uid === S.equip.armor; });
  var ch = S.gear.find(function (x) { return x.uid === S.equip.charm; });
  slot("eqWeapon", w, "bare hands"); slot("eqArmor", a, "rags"); slot("eqCharm", ch, "none");
  if (MC.snap.cpath !== S.path) {
    MC.snap.cpath = S.path;
    R.charSvg.textContent = "";
    R.charSvg.appendChild(MC.portraitSVG(true));
  }
  MC.record(R.charStats, [
    ["Name", S.name], ["Path", S.path], ["Realm", MC.rName()],
    ["Attack", MC.fmt(MC.tAtk())], ["Defense", MC.fmt(MC.tDef())], ["Spirit", MC.fmt(MC.tSpi())],
    ["Techniques", String(Object.keys(S.skills).length)],
    ["Tyrants fallen", S.bosses.length + "/" + MC.BOSSES.length]
  ]);
  MC.pouch(R.pouchChips);
  var rb = R.rebirthBox;
  rb.textContent = "";
  var h = document.createElement("h3");
  h.textContent = "Rebirth";
  rb.appendChild(h);
  var info = document.createElement("p");
  info.textContent = "Deaths so far: " + MC.fmt(S.rebirths) + ". Seeds in hand: " + MC.fmt(S.seeds) +
    ". This life's tally: " + MC.fmt(S.totalCult) + ", worth " + MC.seedsFor(S.totalCult) + " seeds. " +
    (MC.canRebirth() ? "The soup is ready." : "The soup waits until " + MC.REALMS[MC.CONFIG.REBIRTH_MIN_REALM].n + ".");
  rb.appendChild(info);
  var btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn" + (MC.canRebirth() ? " btn-primary" : "");
  btn.textContent = "Drink the soup, gain " + MC.seedsFor(S.totalCult) + " seeds";
  btn.setAttribute("data-tip", "Begin again as a child. Skills, seeds and stones are kept; all else returns to dust.");
  btn.disabled = !MC.canRebirth();
  if (!MC.canRebirth()) btn.title = "Requires " + MC.REALMS[MC.CONFIG.REBIRTH_MIN_REALM].n;
  btn.addEventListener("click", function () { MC.act.askRebirth(); });
  rb.appendChild(btn);
};
MC.pouch = function (el) {
  var sig = ["herb", "ore", "wood", "core", "pill", "bigpill", "gold"].map(function (k) { return S.inv[k]; }).join(",");
  if (MC.snap[el.id + "p"] === sig) return;
  MC.snap[el.id + "p"] = sig;
  el.textContent = "";
  var items = [["herb", "Herb "], ["ore", "Iron "], ["wood", "Timber "], ["core", "Cores "],
    ["pill", "Qi pills "], ["bigpill", "Core pills "]];
  for (var i = 0; i < items.length; i++) {
    el.appendChild(MC.chip(items[i][0] === "pill" || items[i][0] === "bigpill" ? "flame" : items[i][0],
      items[i][1] + MC.fmt(S.inv[items[i][0]]), null));
  }
};

/* ---- scene text removed; the SVG stage lives in stage.js ---- */
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
  var btns = R.modalBtns.querySelectorAll("button");
  if (!btns.length) return;
  var first = btns[0], last = btns[btns.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
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
