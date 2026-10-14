/* Murim Cultivator — view layer.
   Targeted updaters only; lists rebuild when MC.dirty.lists is set.
   Dynamic text travels via textContent, never innerHTML. The only inline
   style JS may touch is the --fill custom property of a stroke. */
var MC = window.MC || {};
window.MC = MC;

function $(id) { return document.getElementById(id); }

/* ---- numbers: shortened (1.2K, 3.4M, scientific past 1e15) or full ---- */
MC.fmt = function (n) {
  n = Math.floor(n);
  if (S.settings.numFmt === "full") {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  if (n < 1000) return String(n);
  const units = [[1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"]];
  for (const [v, u] of units) {
    if (n < v * 1000 || u === "T" && n < 1e15) {
      if (n >= v) return parseFloat((n / v).toFixed(1)) + u;
    }
  }
  return n.toExponential(2).replace("e+", "e");
};
MC.fmt1 = function (n) {
  if (S.settings.numFmt === "full") return (Math.floor(n * 10) / 10).toString();
  if (n < 1000) return (Math.floor(n * 10) / 10).toString();
  return MC.fmt(n);
};

/* ---- chronicle: typed, collapsed, filterable ---- */
MC._lastKey = null; MC._lastEl = null; MC._lastN = 0;
MC.log = function (m, tone, kind) {
  const b = $("log");
  if (!b) return;
  kind = kind || "sys";
  tone = tone || "";
  const key = kind + "|" + tone + "|" + m;
  if (key === MC._lastKey && MC._lastEl && MC._lastEl.isConnected) {
    MC._lastN += 1;
    const rep = MC._lastEl.querySelector(".rep");
    if (rep) rep.textContent = "×" + MC._lastN;
    return;
  }
  const d = document.createElement("div");
  d.dataset.kind = kind;
  if (tone) d.classList.add(tone);
  d.classList.add("k-" + kind);
  const s = document.createElement("span");
  s.textContent = m;
  d.appendChild(s);
  const rep = document.createElement("span");
  rep.className = "rep";
  d.appendChild(rep);
  if (S.settings.logFilter !== "all" && S.settings.logFilter !== kind) d.hidden = true;
  b.prepend(d);
  while (b.children.length > MC.CONFIG.LOG_CAP) b.lastChild.remove();
  MC._lastKey = key; MC._lastEl = d; MC._lastN = 1;
};
MC.applyFilter = function () {
  const f = S.settings.logFilter;
  document.querySelectorAll(".filters button[data-f]").forEach(b => {
    const on = b.dataset.f === f;
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", on ? "true" : "false");
  });
  const log = $("log");
  if (!log) return;
  for (const d of log.children) d.hidden = !(f === "all" || d.dataset.kind === f);
};

/* ---- toasts, floats, chimes ---- */
MC.toast = function (m) {
  const box = $("toasts");
  if (!box) return;
  const d = document.createElement("div");
  d.className = "toast";
  d.textContent = m;
  box.appendChild(d);
  while (box.children.length > 4) box.firstChild.remove();
  setTimeout(() => { if (d.isConnected) d.remove(); }, 3500);
};
MC.still = function () {
  return S.settings.reduceMotion ||
    (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
};
MC.float = function (txt, kind) {
  if (MC.still()) return;
  const box = $("floats");
  if (!box) return;
  const s = document.createElement("span");
  s.className = "float " + (kind || "hit");
  s.textContent = txt;
  s.style.left = (18 + Math.random() * 55) + "%";
  s.style.top = (30 + Math.random() * 35) + "%";
  box.appendChild(s);
  setTimeout(() => { if (s.isConnected) s.remove(); }, 1200);
  while (box.children.length > 12) box.firstChild.remove();
};
MC._ac = null;
MC.sfx = function (name) {
  if (S.settings.muted) return;
  try {
    if (!MC._ac) MC._ac = new (window.AudioContext || window.webkitAudioContext)();
    const notes = { forge: [392, 523], win: [440, 660], learn: [523, 784], high: [523, 659, 784] };
    const seq = notes[name] || [440];
    let t = MC._ac.currentTime;
    for (const f of seq) {
      const o = MC._ac.createOscillator(), g = MC._ac.createGain();
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.08, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      o.connect(g); g.connect(MC._ac.destination);
      o.start(t); o.stop(t + 0.25);
      t += 0.12;
    }
  } catch (e) {}
};

/* ---- navigation ---- */
MC.show = function (id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  $(id).classList.add("active");
};
MC.showMenu = function (m) {
  document.querySelectorAll(".menurow button[data-m]").forEach(b => {
    const on = b.dataset.m === m;
    b.classList.toggle("active", on);
    b.setAttribute("aria-selected", on ? "true" : "false");
  });
  document.querySelectorAll(".sub").forEach(s => s.classList.remove("active"));
  $("m-" + m).classList.add("active");
  if (S.settings.lastPanel !== m) { S.settings.lastPanel = m; MC.writeStore(); }
};

/* ---- settings -> document ---- */
MC.applySettings = function () {
  document.body.dataset.theme = S.settings.theme;
  document.body.dataset.textsize = S.settings.textSize;
  document.body.dataset.motion = S.settings.reduceMotion ? "reduce" : "full";
};
MC.syncSettingsUI = function () {
  $("focus").value = S.settings.focus;
  $("optCult").checked = S.settings.autoCult;
  $("optBreak").checked = S.settings.autoBreak;
  $("optGather").checked = S.settings.autoGather;
  $("optFight").checked = S.settings.autoFight;
  $("optHeal").checked = S.settings.autoHeal;
  $("optTower").checked = S.settings.autoTower;
  $("setTheme").value = S.settings.theme;
  $("setText").value = S.settings.textSize;
  $("setNum").value = S.settings.numFmt;
  $("setAutosave").value = String(S.settings.autosaveSec);
  $("setSound").checked = !S.settings.muted;
  $("setMotion").checked = S.settings.reduceMotion;
  MC.applyFilter();
};

/* ---- small builders ---- */
MC.setStroke = function (id, cur, max, mode) {
  const el = $(id);
  if (!el) return;
  const pct = Math.max(0, Math.min(100, cur / max * 100));
  el.style.setProperty("--fill", pct + "%");
  el.classList.toggle("low", mode === "hp" && pct < 25);
  el.classList.toggle("warn", mode === "hp" && pct >= 25 && pct < 50);
  el.setAttribute("aria-valuenow", Math.ceil(cur));
  el.setAttribute("aria-valuemin", "0");
  el.setAttribute("aria-valuemax", Math.ceil(max));
};
MC.record = function (el, rows) {
  el.textContent = "";
  for (const [dt, dd] of rows) {
    const w = document.createElement("div");
    const t = document.createElement("dt"); t.textContent = dt;
    const v = document.createElement("dd"); v.textContent = dd;
    w.appendChild(t); w.appendChild(v);
    el.appendChild(w);
  }
};
MC.costSpan = function (cost) {
  const sp = document.createElement("span");
  sp.className = "cost";
  const parts = Object.entries(cost).map(([k, v]) => {
    const have = S.inv[k] || 0;
    return { k: k, v: v, ok: have >= v, have: have };
  });
  parts.forEach((p, i) => {
    if (i) sp.appendChild(document.createTextNode(" · "));
    const b = document.createElement("b");
    b.className = p.ok ? "afford" : "lack";
    b.textContent = p.k + " " + MC.fmt(p.have) + "/" + MC.fmt(p.v);
    b.title = p.ok ? p.k + " price is in hand" : "wanting " + MC.fmt(p.v - p.have) + " " + p.k;
    sp.appendChild(b);
  });
  return sp;
};
MC.row = function (main, sub, btns) {
  const row = document.createElement("div");
  row.className = "rowline";
  const left = document.createElement("div");
  const t = document.createElement("div");
  t.textContent = main;
  left.appendChild(t);
  if (sub) {
    if (typeof sub === "string") {
      const s = document.createElement("div");
      s.className = "dim";
      s.textContent = sub;
      left.appendChild(s);
    } else left.appendChild(sub);
  }
  row.appendChild(left);
  const acts = document.createElement("div");
  acts.className = "acts";
  for (const o of btns) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "btn tiny" + (o.cls ? " " + o.cls : "");
    b.textContent = o.t;
    if (o.tip) b.setAttribute("data-tip", o.tip);
    if (o.disabled) {
      b.disabled = true;
      if (o.why) b.title = o.why;
    }
    b.addEventListener("click", o.cb);
    acts.appendChild(b);
    acts.appendChild(document.createTextNode(" "));
  }
  row.appendChild(acts);
  return row;
};

/* ---- the nearest sensible ambition, always visible ---- */
MC.nextGoal = function () {
  const rm = MC.rMax();
  if (S.cult >= rm) {
    const up = S.stage >= 8 ? MC.REALMS[Math.min(MC.REALMS.length - 1, S.realm + 1)].n : MC.rName();
    return "Break through — the measure is full. " + up + " waits, at " +
      Math.round(MC.breakChance() * 100) + " in a hundred.";
  }
  const boss = MC.BOSSES.find(b => !S.bosses.includes(b.id) && S.realm >= b.realm);
  if (boss) return "Slay " + boss.t + ", who outranks your present arms.";
  if (MC.canRebirth() && MC.seedsFor(S.totalCult) > 0) {
    return "Drink the soup: rebirth for " + MC.seedsFor(S.totalCult) + " Dao Seeds.";
  }
  const rec = MC.RECIPES.find(r => Object.entries(r.c).every(([k, v]) => (S.inv[k] || 0) >= v));
  if (rec) return "Forge " + rec.t + " — the price is in hand.";
  let want = null;
  for (const p of MC.PATHS) {
    const chain = MC.SKILLS.filter(s => s.path === p.id);
    for (let i = 0; i < chain.length; i++) {
      if (MC.has(chain[i].id)) continue;
      if (i > 0 && !MC.has(chain[i - 1].id)) break;
      const c = chain[i].cost;
      const key = c.seeds ? "seeds" : "stones";
      const have = c.seeds ? S.seeds : S.stones;
      const need = (c.seeds ? c.seeds : c.stones) - have;
      if (!want || need < want.need) want = { t: chain[i].t, need: need, key: key };
      break;
    }
  }
  if (want && want.need <= 20) return "Set by " + want.need + " " + want.key + " for " + want.t + ".";
  return "Fill the measure: " + MC.fmt(rm - S.cult) + " cultivation at " +
    MC.fmt1(MC.cultRate()) + " a second.";
};

/* ---- targeted updater: header, vitals, records (cheap, every step) ---- */
MC.updateStatus = function () {
  const rm = MC.rMax();
  $("whoName").textContent = S.name || "Nameless";
  $("whoPath").textContent = (S.path || "pathless").toUpperCase();
  $("whoRealm").textContent = MC.rName();
  $("hpNum").textContent = Math.ceil(S.hp) + " / " + MC.fmt(S.maxHp);
  $("qiNum").textContent = Math.floor(S.qi) + " / " + MC.fmt(S.maxQi);
  $("cultNum").textContent = MC.fmt(S.cult) + " / " + MC.fmt(rm);
  MC.setStroke("hpStroke", S.hp, S.maxHp, "hp");
  MC.setStroke("qiStroke", S.qi, S.maxQi);
  MC.setStroke("cultStroke", S.cult, rm);
  $("tickN").textContent = MC.fmtTime(S.elapsed);
  $("goalLine").textContent = MC.nextGoal();
  const skS = $("skStones"), skD = $("skSeeds");
  if (skS) skS.textContent = MC.fmt(S.stones);
  if (skD) skD.textContent = MC.fmt(S.seeds);
  $("towerNum").textContent = MC.fmt(S.tower);
  const pity = S.pity > 0 ? " Pity adds " + Math.round(S.pity * MC.CONFIG.PITY_STEP * 100) + " in a hundred." : "";
  $("cultInfo").textContent = S.cult >= rm
    ? "The measure is full. Breakthrough stands at " + Math.round(MC.breakChance() * 100) + " in a hundred." + pity
    : MC.fmt(Math.ceil(rm - S.cult)) + " cultivation short of the attempt." + pity;
  const bb = $("btnBreak");
  bb.classList.toggle("ready-mark", S.cult >= rm);
  $("doorT").textContent = Date.now() < S.doorUntil
    ? "Behind the door: " + Math.ceil((S.doorUntil - Date.now()) / 1000) + " breaths of triple gain."
    : "";
  $("battleLine").textContent = MC.battle
    ? "You, " + Math.ceil(S.hp) + " health, against " + MC.battle.f.t + ", " +
      Math.ceil(MC.battle.hp) + " of " + MC.fmt(MC.battle.max) + "."
    : "No battle. Choose a foe above, or climb the tower.";
  MC.record($("statBox"), [
    ["Attack", MC.fmt(MC.tAtk())], ["Defense", MC.fmt(MC.tDef())], ["Spirit", MC.fmt(MC.tSpi())],
    ["Gold", MC.fmt(S.gold)], ["Stones", MC.fmt(S.stones)], ["Seeds", MC.fmt(S.seeds)],
    ["Kills", MC.fmt(S.kills)], ["Rebirths", MC.fmt(S.rebirths)]
  ]);
  MC.record($("invBox"), [
    ["Herb", MC.fmt(S.inv.herb)], ["Iron", MC.fmt(S.inv.ore)], ["Timber", MC.fmt(S.inv.wood)],
    ["Cores", MC.fmt(S.inv.core)], ["Qi pills", MC.fmt(S.inv.pill)], ["Core pills", MC.fmt(S.inv.bigpill)]
  ]);
  const w = S.gear.find(x => x.uid === S.equip.weapon);
  const a = S.gear.find(x => x.uid === S.equip.armor);
  const ch = S.gear.find(x => x.uid === S.equip.charm);
  const skn = Object.keys(S.skills).length;
  MC.record($("charBox"), [
    ["Name", S.name], ["Path", S.path], ["Realm", MC.rName()],
    ["Weapon", w ? w.t : "bare hands"], ["Armor", a ? a.t : "rags"], ["Charm", ch ? ch.t : "none"],
    ["Techniques", skn ? String(skn) : "none"],
    ["Tyrants fallen", S.bosses.length ? S.bosses.join(", ") : "none"]
  ]);
  MC.updateBadges();
  MC.updateHints();
};

/* ---- targeted updater: rates line ---- */
MC.updateRates = function () {
  const el = $("rateLine");
  if (!el) return;
  const parts = MC.NODES.map(n => MC.fmt1(n.rate * MC.gatherMult()) + " " + n.id);
  el.textContent = "Unattended: " + MC.fmt1(MC.cultRate()) + " cultivation and " +
    parts.join(", ") + " a second.";
};

/* ---- badges: which pages need attention ---- */
MC.updateBadges = function () {
  const rm = MC.rMax();
  const afford = MC.RECIPES.some(r => Object.entries(r.c).every(([k, v]) => (S.inv[k] || 0) >= v));
  const foe = MC.BOSSES.some(b => !S.bosses.includes(b.id) && S.realm >= b.realm);
  let learn = false;
  for (const p of MC.PATHS) {
    const chain = MC.SKILLS.filter(s => s.path === p.id);
    for (let i = 0; i < chain.length; i++) {
      if (MC.has(chain[i].id)) continue;
      if (i > 0 && !MC.has(chain[i - 1].id)) break;
      const c = chain[i].cost;
      if ((c.seeds ? S.seeds >= c.seeds : S.stones >= c.stones)) learn = true;
      break;
    }
  }
  const marks = { cult: S.cult >= rm, forge: afford, boss: foe, skills: learn,
    char: MC.canRebirth() && MC.seedsFor(S.totalCult) > 0 };
  document.querySelectorAll(".menurow button[data-m]").forEach(b => {
    const on = !!marks[b.dataset.m];
    b.classList.toggle("has-news", on);
    const base = b.textContent.replace(/\s+/g, " ").trim();
    b.setAttribute("data-tip", (b.getAttribute("data-basetip") || "") + (on ? " — needs attention" : ""));
    b.setAttribute("aria-label", base + (on ? ", needs attention" : ""));
  });
};

/* ---- first-run hints: five minutes, or until the first breakthrough ---- */
MC.updateHints = function () {
  const bar = $("hintBar");
  if (!bar) return;
  const show = S.started && !S.hintsOff && !S.breakthroughDone && S.elapsed < 300;
  bar.hidden = !show;
  if (!show) return;
  let t = "New here? Press Meditate once, then let the seconds work. Breakthrough when the measure fills.";
  if (S.cult >= MC.rMax()) t = "The measure is full — press Break through, the ink-dark button.";
  else if (MC.battle) t = "Blows are exchanged above. Strike, or spend ten qi on a burst.";
  $("hintText").textContent = t;
};

/* ---- targeted updater: lists (only when dirty) ---- */
MC.updateLists = function () {
  if (!MC.dirty.lists) return;
  MC.dirty.lists = false;

  const nodes = $("nodes");
  nodes.textContent = "";
  for (const n of MC.NODES) {
    nodes.appendChild(MC.row(
      n.t + " — " + n.desc + ". Unattended tithe " + MC.fmt1(n.rate * MC.gatherMult()) + " a second; in hand " + MC.fmt(S.inv[n.id]) + ".",
      null,
      [{ t: "Gather", tip: "Gather by hand at once", cb: () => MC.act.doGather(n.id) }]
    ));
  }

  const rec = $("recipes");
  rec.textContent = "";
  for (const r of MC.RECIPES) {
    const can = Object.entries(r.c).every(([k, v]) => (S.inv[k] || 0) >= v);
    rec.appendChild(MC.row(
      r.t + " — " + r.d + ".",
      MC.costSpan(r.c),
      [{ t: can ? "Forge" : "Wanting", tip: can ? "The price is in hand" : "Gather more first",
        cls: can ? "primary ready-mark" : "", cb: () => MC.act.doCraft(r.id), disabled: !can,
        why: can ? "" : "price not in hand" }]
    ));
  }
  const gh = document.createElement("p");
  gh.className = "dim";
  gh.textContent = "Worn arms below. Reforge for a eighth-part more per level, to +9; sell only what is unworn.";
  rec.appendChild(gh);
  if (!S.gear.length) {
    const s = document.createElement("p");
    s.className = "dim";
    s.textContent = "Nothing forged yet.";
    rec.appendChild(s);
  }
  for (const g of S.gear) rec.appendChild(MC.gearRow(g));

  const foes = $("foes");
  foes.textContent = "";
  MC.FOES.forEach((f, i) => {
    foes.appendChild(MC.row(
      f.t + " — health " + MC.fmt(f.hp) + ", strike " + MC.fmt(f.atk) + ". Pays " +
      MC.fmt(f.cult) + " cultivation and " + MC.fmt(f.gold) + " gold.",
      null,
      [{ t: "Fight", tip: "Open battle", cb: () => MC.act.doFight(i, false) }]
    ));
  });

  const bosses = $("bosses");
  bosses.textContent = "";
  MC.BOSSES.forEach((b, i) => {
    const sl = S.bosses.includes(b.id), lk = S.realm < b.realm;
    bosses.appendChild(MC.row(
      b.t + (sl ? " — fallen" : lk ? " — sealed until " + MC.REALMS[b.realm].n : "") +
      ". Health " + MC.fmt(b.hp) + ", strike " + MC.fmt(b.atk) + ".",
      null,
      [{ t: sl ? "Fallen" : "Challenge", tip: sl ? "Already slain" : lk ? "Beyond your present realm" : "A hard fight, richly paid",
        cls: !sl && !lk ? "primary" : "", cb: () => MC.act.doFight(i, true), disabled: sl || lk,
        why: sl ? "already slain" : "sealed until " + MC.REALMS[b.realm].n }]
    ));
  });

  const tw = $("towerBox");
  tw.textContent = "";
  const next = MC.towerFoe(S.tower + 1);
  tw.appendChild(MC.row(
    "Floor " + MC.fmt(S.tower + 1) + ": " + next.t + ". Health " + MC.fmt(next.hp) +
    ", strike " + MC.fmt(next.atk) + ". Pays " + MC.fmt(next.cult) + " cultivation" +
    ((S.tower + 1) % 3 === 0 ? ", plus a core" : "") + ".",
    null,
    [{ t: "Climb", tip: "Face the next warden", cls: "primary", cb: () => MC.act.climbTower() }]
  ));

  const sk = $("skills");
  sk.textContent = "";
  for (const p of MC.PATHS) {
    const h = document.createElement("h3");
    h.textContent = p.t;
    sk.appendChild(h);
    const chain = MC.SKILLS.filter(s => s.path === p.id);
    chain.forEach((s, idx) => {
      const learned = MC.has(s.id);
      const locked = idx > 0 && !MC.has(chain[idx - 1].id);
      const afford = s.cost.seeds ? S.seeds >= s.cost.seeds : S.stones >= s.cost.stones;
      sk.appendChild(MC.row(
        s.t + " — " + s.d,
        MC.skillCostText(s),
        [{ t: learned ? "Known" : locked ? "Sealed" : "Learn",
          tip: learned ? "Already learned" : locked ? "Learn the step above first" : afford ? "The price is in hand" : "Price not in hand",
          cls: !learned && !locked && afford ? "primary ready-mark" : "",
          cb: () => MC.act.buySkill(s.id), disabled: learned || locked || !afford,
          why: learned ? "already learned" : locked ? "learn the step above first" : "price not in hand" }]
      ));
    });
  }

  const rb = $("rebirthBox");
  rb.textContent = "";
  const rh = document.createElement("h3");
  rh.textContent = "Rebirth";
  rb.appendChild(rh);
  const info = document.createElement("p");
  info.textContent = "Deaths so far: " + MC.fmt(S.rebirths) + ". Seeds in hand: " + MC.fmt(S.seeds) +
    ". This life's tally: " + MC.fmt(S.totalCult) + ", worth " + MC.seedsFor(S.totalCult) + " seeds. " +
    (MC.canRebirth() ? "The soup is ready." : "The soup waits until " + MC.REALMS[MC.CONFIG.REBIRTH_MIN_REALM].n + ".");
  rb.appendChild(info);
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn" + (MC.canRebirth() ? " primary" : "");
  btn.textContent = "Drink the soup, gain " + MC.seedsFor(S.totalCult) + " seeds";
  btn.setAttribute("data-tip", "Begin again as a child. Skills, seeds and stones are kept; all else returns to dust.");
  btn.disabled = !MC.canRebirth();
  if (!MC.canRebirth()) btn.title = "Requires " + MC.REALMS[MC.CONFIG.REBIRTH_MIN_REALM].n;
  btn.addEventListener("click", () => MC.act.askRebirth());
  rb.appendChild(btn);
};

MC.gearRow = function (g) {
  const worn = S.equip[g.slot] === g.uid;
  const rar = (MC.RARITIES.find(r => r.id === g.rar) || MC.RARITIES[0]).t;
  const bit = document.createElement("span");
  const tag = document.createElement("b");
  tag.className = "rar-" + (g.rar || "common");
  tag.textContent = rar + " +" + (g.lvl || 0);
  bit.appendChild(tag);
  bit.appendChild(document.createTextNode(
    " — now Attack " + MC.fmt(MC.gearStat(g, "atk")) + ", Guard " + MC.fmt(MC.gearStat(g, "def")) +
    (g.spi ? ", Spirit " + MC.fmt(MC.gearStat(g, "spi")) : "") + (worn ? " · worn" : "")));
  const cost = MC.upgradeCost(g);
  const maxed = (g.lvl || 0) >= MC.CONFIG.UPGRADE_MAX;
  const affordUp = S.inv.ore >= cost.ore && S.inv.wood >= cost.wood;
  return MC.row(g.t, bit, [
    { t: worn ? "Worn" : "Wear", tip: "Take this up", cb: () => MC.act.doEquip(g.uid), disabled: worn, why: "already worn" },
    { t: maxed ? "Perfected" : "Reforge", tip: maxed ? "No further" : "Iron " + cost.ore + ", timber " + cost.wood + " for an eighth-part more",
      cb: () => MC.act.upgradeGear(g.uid), disabled: maxed || !affordUp,
      why: maxed ? "perfected at +" + MC.CONFIG.UPGRADE_MAX : "wanting iron and timber" },
    { t: "Sell " + MC.fmt(MC.sellPrice(g)), tip: "For gold, unworn only", cb: () => MC.act.sellGear(g.uid),
      disabled: worn, why: "unwear it first" }
  ]);
};

MC.skillCostText = function (sk) {
  const c = sk.cost;
  const s = document.createElement("span");
  s.className = "cost";
  const b = document.createElement("b");
  if (c.seeds) {
    const ok = S.seeds >= c.seeds;
    b.className = ok ? "afford" : "lack";
    b.textContent = "seeds " + MC.fmt(S.seeds) + "/" + c.seeds + (ok ? " · in hand" : " · wanting " + (c.seeds - S.seeds));
  } else {
    const ok = S.stones >= c.stones;
    b.className = ok ? "afford" : "lack";
    b.textContent = "stones " + MC.fmt(S.stones) + "/" + c.stones + (ok ? " · in hand" : " · wanting " + (c.stones - S.stones));
  }
  s.appendChild(b);
  return s;
};

/* ---- the living page corner ---- */
MC.updateScene = function () {
  MC.posX = (MC.posX + 1) % 60;
  const sky = "  .    .   .    .    .     .   .";
  const mtn = " /\\    /\\      /\\    /\\      /\\";
  const mtn2 = "/  \\--/  \\----/  \\--/  \\----/";
  let gnd = "";
  for (let i = 0; i < 64; i++) {
    gnd += (i === MC.posX ? "X" : (i === (MC.posX + 18) % 64 ? (MC.battle ? "M" : ".") : "-"));
  }
  let roof = "";
  for (let i = 0; i < 64; i++) roof += (i >= 2 && i <= 8 ? (i === 5 ? "^" : "=") : " ");
  const act = MC.battle ? ("FIGHTING " + MC.battle.f.t)
    : (Date.now() < S.doorUntil ? "closed-door meditation..." : "idle... " + MC.rName());
  $("scene").textContent = sky + "\n" + mtn + "\n" + mtn2 + "\n |_|" + roof +
    "  [" + S.path + "] " + act + "\n=" + gnd + "=";
};

MC.renderAll = function () {
  MC.updateStatus();
  MC.updateRates();
  MC.updateLists();
  MC.updateScene();
};

/* ---- path cards: effect, standing, and manner of walking ---- */
MC.PLAYSTYLE = {
  sword: "Strike first; let the mountain answer.",
  body: "Outlast everything, including boredom.",
  alchemy: "A rich pouch buys sharp knives.",
  talisman: "Arrive early to every breakthrough."
};
MC.drawPaths = function () {
  const row = $("pathRow");
  row.textContent = "";
  MC.PATHS.forEach((p, i) => {
    const d = document.createElement("div");
    d.className = "path" + (MC.selPath === p.id ? " sel" : "");
    d.setAttribute("role", "radio");
    d.setAttribute("aria-checked", MC.selPath === p.id ? "true" : "false");
    d.setAttribute("tabindex", "0");
    const h = document.createElement("h3");
    h.textContent = (i + 1) + ". " + p.t;
    const d1 = document.createElement("p");
    d1.textContent = p.d;
    const d2 = document.createElement("p");
    d2.className = "dim";
    d2.textContent = "Standing: " + p.b;
    const d3 = document.createElement("p");
    d3.className = "playstyle";
    d3.textContent = MC.PLAYSTYLE[p.id] || "";
    d.appendChild(h); d.appendChild(d1); d.appendChild(d2); d.appendChild(d3);
    const pick = () => {
      MC.selPath = p.id;
      $("btnToGame").disabled = false;
      $("pathErr").textContent = "";
      MC.drawPaths();
    };
    d.addEventListener("click", pick);
    d.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
    row.appendChild(d);
  });
};

/* ---- modal ---- */
MC.showModal = function (title, lines, buttons) {
  const ov = $("modalOverlay"), bt = $("modalTitle"), bb = $("modalBody"), bf = $("modalBtns");
  bt.textContent = title;
  bb.textContent = "";
  for (const ln of lines) {
    const p = document.createElement("p");
    p.textContent = ln;
    bb.appendChild(p);
  }
  bf.textContent = "";
  for (const b of buttons) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn" + (b.primary ? " primary" : "");
    btn.textContent = b.t;
    btn.addEventListener("click", () => { MC.hideModal(); if (b.cb) b.cb(); });
    bf.appendChild(btn);
  }
  ov.classList.add("open");
  const first = bf.querySelector("button");
  if (first) first.focus();
};
MC.hideModal = function () { $("modalOverlay").classList.remove("open"); };

MC.offlineLines = function (sum) {
  const L = ["The sect kept your lamp lit while you were away (" + MC.fmtTime(sum.secs) + ")."];
  if (sum.cult) L.push("Cultivation +" + MC.fmt(sum.cult) + ".");
  const mats = Object.entries(sum.mats).map(([k, v]) => k + " +" + MC.fmt(v)).join(", ");
  if (mats) L.push("Gathered: " + mats + ".");
  if (sum.gold) L.push("Gold +" + MC.fmt(sum.gold) + ".");
  if (!sum.cult && !mats && !sum.gold) L.push("No gains: the unattended work was turned off.");
  return L;
};
