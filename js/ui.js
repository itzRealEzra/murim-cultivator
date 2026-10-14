/* MURIM CULTIVATOR -- Phase 2: view layer.
   Targeted updaters; lists rebuild only when MC.dirty.lists is set.
   No innerHTML with data; user name only ever via textContent. */
var MC = window.MC || {};
window.MC = MC;

function $(id) { return document.getElementById(id); }

MC.log = function (m, c) {
  const b = $("log");
  if (!b) return;
  const d = document.createElement("div");
  if (c) d.className = c;
  d.textContent = m;
  b.prepend(d);
  while (b.children.length > MC.CONFIG.LOG_CAP) b.lastChild.remove();
};

MC.show = function (id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  $(id).classList.add("active");
};

MC.showMenu = function (m) {
  document.querySelectorAll(".menurow button[data-m]").forEach(b => {
    if (b.dataset.m === m) b.classList.add("active");
    else b.classList.remove("active");
  });
  document.querySelectorAll(".sub").forEach(s => s.classList.remove("active"));
  $("m-" + m).classList.add("active");
};

MC.syncSettingsUI = function () {
  $("focus").value = S.settings.focus;
  $("optCult").checked = S.settings.autoCult;
  $("optBreak").checked = S.settings.autoBreak;
  $("optGather").checked = S.settings.autoGather;
  $("optFight").checked = S.settings.autoFight;
  $("optHeal").checked = S.settings.autoHeal;
  $("optTower").checked = S.settings.autoTower;
};

MC.updateStatus = function () {
  const rm = MC.rMax();
  $("statusBar").textContent = S.name + " | " + S.path.toUpperCase() + " | " + MC.rName() +
    " | HP " + Math.ceil(S.hp) + "/" + S.maxHp +
    " | QI " + Math.floor(S.qi) + "/" + S.maxQi +
    " | CULT " + Math.floor(S.cult) + "/" + rm +
    " | ATK " + MC.tAtk() + " DEF " + MC.tDef() + " SPI " + MC.tSpi() +
    " | GOLD " + S.gold + " STONE " + S.stones + " SEED " + S.seeds;
  $("tickN").textContent = MC.fmtTime(S.elapsed);
  const skS = $("skStones"), skD = $("skSeeds");
  if (skS) skS.textContent = S.stones;
  if (skD) skD.textContent = S.seeds;
  const pityTxt = S.pity > 0 ? " pity +" + Math.round(S.pity * MC.CONFIG.PITY_STEP * 100) + "%" : "";
  $("cultInfo").textContent = S.cult >= rm
    ? "READY: breakthrough available. chance " + Math.round(MC.breakChance() * 100) + "%." + pityTxt
    : "need " + Math.ceil(rm - S.cult) + " cult for breakthrough. auto:" +
      (S.settings.autoBreak ? "ON" : "OFF") + "." + pityTxt;
  $("doorT").textContent = Date.now() < S.doorUntil
    ? "door: " + Math.ceil((S.doorUntil - Date.now()) / 1000) + "s" : "";
  $("battleLine").textContent = MC.battle
    ? "YOU " + Math.ceil(S.hp) + "hp VS " + MC.battle.f.t + " " +
      Math.ceil(MC.battle.hp) + "/" + MC.battle.max + "hp " + MC.bar(MC.battle.hp, MC.battle.max, 20)
    : "No battle. Pick a foe above, or climb the tower.";
  $("statBox").textContent = "HP  " + MC.bar(S.hp, S.maxHp, 18) + " " + Math.ceil(S.hp) + "/" + S.maxHp +
    "\nQI  " + MC.bar(S.qi, S.maxQi, 18) + " " + Math.floor(S.qi) + "/" + S.maxQi +
    "\nCULT" + MC.bar(S.cult, rm, 18) + " " + Math.floor(S.cult) + "/" + rm +
    "\nATK " + MC.tAtk() + "  DEF " + MC.tDef() + "  SPI " + MC.tSpi() +
    "\nrealm: " + MC.rName() + "\nkills: " + S.kills +
    "\nrebirths: " + S.rebirths + "  seeds: " + S.seeds + "  tower: " + S.tower;
  $("invBox").textContent = "herb " + S.inv.herb + " | ore " + S.inv.ore +
    "\nwood " + S.inv.wood + " | core " + S.inv.core +
    "\npill " + S.inv.pill + " | bigpill " + S.inv.bigpill +
    "\ngold " + S.gold + " | stone " + S.stones;
  const w = S.gear.find(x => x.uid === S.equip.weapon);
  const a = S.gear.find(x => x.uid === S.equip.armor);
  const ch = S.gear.find(x => x.uid === S.equip.charm);
  $("charBox").textContent = "name : " + S.name + "\npath : " + S.path +
    "\nrealm: " + MC.rName() + "\nweapon: " + (w ? w.t : "fists") +
    "\narmor : " + (a ? a.t : "rags") + "\ncharm : " + (ch ? ch.t : "none") +
    "\nskills: " + (Object.keys(S.skills).length || "none") +
    "\nbosses: " + (S.bosses.join(",") || "none");
};

MC.updateRates = function () {
  const parts = MC.NODES.map(n => (n.rate * MC.gatherMult()).toFixed(2) + " " + n.id + "/s");
  $("rateBar").textContent = "rates: +" + MC.cultRate().toFixed(1) + " cult/s | +" +
    parts.join(" | ") + " | kills " + S.kills + " bosses " + S.bosses.length;
};

MC.rowLine = function (label, btnText, onClick, disabled) {
  const row = document.createElement("div");
  row.className = "rowline";
  const sp = document.createElement("span");
  sp.textContent = label;
  const b = document.createElement("button");
  b.textContent = btnText;
  if (disabled) b.disabled = true;
  b.addEventListener("click", onClick);
  row.appendChild(sp);
  row.appendChild(b);
  return row;
};

MC.gearRow = function (g) {
  const row = document.createElement("div");
  row.className = "rowline";
  const sp = document.createElement("span");
  const tag = document.createElement("b");
  tag.className = "rar-" + (g.rar || "common");
  tag.textContent = "[" + (g.rar || "common").toUpperCase() + "+" + (g.lvl || 0) + "]";
  sp.appendChild(tag);
  sp.appendChild(document.createTextNode(" " + g.t +
    " ATK+" + MC.gearStat(g, "atk") + " DEF+" + MC.gearStat(g, "def") +
    " SPI+" + MC.gearStat(g, "spi") +
    (S.equip[g.slot] === g.uid ? " [EQUIPPED]" : "")));
  const btns = document.createElement("span");
  const mk = (t, cb, dis, title) => {
    const b = document.createElement("button");
    b.textContent = t;
    b.title = title || "";
    if (dis) b.disabled = true;
    b.addEventListener("click", cb);
    btns.appendChild(b);
    btns.appendChild(document.createTextNode(" "));
  };
  mk("[EQUIP]", () => MC.act.doEquip(g.uid), false, "Wear this piece");
  const cost = MC.upgradeCost(g);
  const canUp = (g.lvl || 0) < MC.CONFIG.UPGRADE_MAX &&
    S.inv.ore >= cost.ore && S.inv.wood >= cost.wood;
  mk("[UP ore" + cost.ore + "/wd" + cost.wood + "]", () => MC.act.upgradeGear(g.uid),
    !canUp, "Reforge: +12% stats per level, max +" + MC.CONFIG.UPGRADE_MAX);
  mk("[SELL " + MC.sellPrice(g) + "g]", () => MC.act.sellGear(g.uid),
    S.equip[g.slot] === g.uid, "Sell for gold (unequipped only)");
  row.appendChild(sp);
  row.appendChild(btns);
  return row;
};

MC.skillCostText = function (sk) {
  const c = sk.cost;
  if (c.seeds) return "cost " + c.seeds + " seeds (have " + S.seeds + ")";
  return "cost " + c.stones + " stones (have " + S.stones + ")";
};

MC.updateLists = function () {
  if (!MC.dirty.lists) return;
  MC.dirty.lists = false;

  const nodes = $("nodes");
  nodes.textContent = "";
  for (const n of MC.NODES) {
    nodes.appendChild(MC.rowLine(
      n.t + " -- " + n.desc + " (" + (n.rate * MC.gatherMult()).toFixed(2) + "/s idle) have " +
      Math.floor(S.inv[n.id]),
      "[GATHER]",
      () => MC.act.doGather(n.id)
    ));
  }

  const rec = $("recipes");
  rec.textContent = "";
  for (const r of MC.RECIPES) {
    const c = Object.entries(r.c).map(([k, v]) => k + " " + (S.inv[k] || 0) + "/" + v).join(" ");
    const can = Object.entries(r.c).every(([k, v]) => S.inv[k] >= v);
    rec.appendChild(MC.rowLine(
      r.t + " (" + r.d + ") [" + c + "]",
      can ? "[FORGE]" : "[LACK]",
      () => MC.act.doCraft(r.id),
      !can
    ));
  }
  const gh = document.createElement("p");
  gh.className = "hd";
  gh.textContent = "-- GEAR (rarity x reforge; sell unequipped) --";
  rec.appendChild(gh);
  if (!S.gear.length) {
    const s = document.createElement("span");
    s.className = "dim";
    s.textContent = "none -- forge above";
    rec.appendChild(s);
  }
  for (const g of S.gear) rec.appendChild(MC.gearRow(g));

  const foes = $("foes");
  foes.textContent = "";
  MC.FOES.forEach((f, i) => {
    foes.appendChild(MC.rowLine(
      f.t + " HP" + f.hp + " ATK" + f.atk + " DEF" + f.def + " -> " + f.cult + "cult " + f.gold + "g",
      "[FIGHT]",
      () => MC.act.doFight(i, false)
    ));
  });

  const bosses = $("bosses");
  bosses.textContent = "";
  MC.BOSSES.forEach((b, i) => {
    const sl = S.bosses.includes(b.id), lk = S.realm < b.realm;
    bosses.appendChild(MC.rowLine(
      b.t + (sl ? " [SLAIN]" : lk ? " [SEALED:" + MC.REALMS[b.realm].n + "]" : "") +
      " HP" + b.hp + " ATK" + b.atk,
      "[CHALLENGE]",
      () => MC.act.doFight(i, true),
      sl || lk
    ));
  });

  // Endless tower (post-tribulation endless mode).
  const tw = $("towerBox");
  tw.textContent = "";
  const hd = document.createElement("p");
  hd.className = "hd";
  hd.textContent = "-- ENDLESS TOWER (floor " + S.tower + " cleared) --";
  tw.appendChild(hd);
  const next = MC.towerFoe(S.tower + 1);
  tw.appendChild(MC.rowLine(
    "Floor " + (S.tower + 1) + ": " + next.t + " HP" + next.hp + " ATK" + next.atk +
    " -> " + next.cult + "cult " + next.gold + "g" +
    ((S.tower + 1) % 3 === 0 ? " +core" : ""),
    "[CLIMB]",
    () => MC.act.climbTower()
  ));

  // Skill tree, grouped by path chain.
  const sk = $("skills");
  sk.textContent = "";
  for (const p of MC.PATHS) {
    const h = document.createElement("p");
    h.className = "hd";
    h.textContent = "-- " + p.t + " --";
    sk.appendChild(h);
    const chain = MC.SKILLS.filter(s => s.path === p.id);
    chain.forEach((s, idx) => {
      const learned = MC.has(s.id);
      const locked = idx > 0 && !MC.has(chain[idx - 1].id);
      const afford = s.cost.seeds ? S.seeds >= s.cost.seeds : S.stones >= s.cost.stones;
      sk.appendChild(MC.rowLine(
        s.t + " -- " + s.d + " [" + MC.skillCostText(s) + "]" +
        (learned ? " [LEARNED]" : locked ? " [LEARN PREVIOUS FIRST]" : ""),
        learned ? "[KNOWN]" : "[LEARN]",
        () => MC.act.buySkill(s.id),
        learned || locked || !afford
      ));
    });
  }

  // Reincarnation box.
  const rb = $("rebirthBox");
  rb.textContent = "";
  const rh = document.createElement("p");
  rh.className = "hd";
  rh.textContent = "-- REINCARNATION --";
  rb.appendChild(rh);
  const info = document.createElement("p");
  info.textContent = "rebirths " + S.rebirths + " | seeds " + S.seeds +
    " | this run cult " + Math.floor(S.totalCult) +
    " | seeds on return: " + MC.seedsFor(S.totalCult) +
    (MC.canRebirth() ? "" : " | requires " + MC.REALMS[MC.CONFIG.REBIRTH_MIN_REALM].n);
  rb.appendChild(info);
  const btn = document.createElement("button");
  btn.textContent = "[ REINCARNATE +" + MC.seedsFor(S.totalCult) + " SEEDS ]";
  btn.title = "Reset realm, stats, gear and bosses. Keep skills, seeds, stones.";
  btn.disabled = !MC.canRebirth();
  btn.addEventListener("click", () => MC.act.askRebirth());
  rb.appendChild(btn);
};

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

MC.drawPaths = function () {
  const row = $("pathRow");
  row.textContent = "";
  for (const p of MC.PATHS) {
    const d = document.createElement("div");
    d.className = "path" + (MC.selPath === p.id ? " sel" : "");
    d.setAttribute("role", "button");
    d.setAttribute("tabindex", "0");
    const h = document.createElement("h3");
    h.textContent = p.t;
    const d1 = document.createElement("p");
    d1.textContent = p.d;
    const d2 = document.createElement("p");
    d2.className = "dim";
    d2.textContent = p.b;
    d.appendChild(h); d.appendChild(d1); d.appendChild(d2);
    const pick = () => { MC.selPath = p.id; $("btnToGame").disabled = false; MC.drawPaths(); };
    d.addEventListener("click", pick);
    d.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") pick(); });
    row.appendChild(d);
  }
};

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
  if (sum.cult) L.push("cultivation +" + sum.cult);
  const mats = Object.entries(sum.mats).map(([k, v]) => k + " +" + v).join(", ");
  if (mats) L.push("gathered: " + mats);
  if (sum.gold) L.push("gold +" + sum.gold);
  if (!sum.cult && !mats && !sum.gold) L.push("No gains: automation was turned off.");
  return L;
};
