/* Murim Cultivator — actions and screen flow.
   Every handler writes S (never the DOM) and marks lists dirty when
   list data changed. Numbers and rules are untouched; only words,
   feedback (toasts, floats, chimes) and log kinds are new. */
var MC = window.MC || {};
window.MC = MC;
MC.act = {};

MC.act.gainCult = function (n) { S.cult += n; S.totalCult += n; };

MC.act.meditate = function () {
  const amt = MC.meditateAmt();
  MC.act.gainCult(amt);
  S.qi = Math.min(S.maxQi, S.qi + 2);
  S.hp = Math.min(S.maxHp, S.hp + 2);
  MC.log("Meditated: +" + MC.fmt(amt) + " cultivation.", "", "sys");
  MC.float("+" + MC.fmt(amt), "gain");
  MC.updateStatus(); MC.updateRates();
};

MC.act.tryBreak = function (manual) {
  const rm = MC.rMax();
  if (S.cult < rm) {
    if (manual) MC.log("The measure wants " + MC.fmt(rm - S.cult) + " more.", "bad", "sys");
    return;
  }
  if (Math.random() < MC.breakChance()) {
    S.cult = 0; S.stage++; S.pity = 0;
    S.breakthroughDone = true;
    if (S.stage >= 9) {
      S.stage = 0;
      S.realm = Math.min(MC.REALMS.length - 1, S.realm + 1);
      S.maxHp += 30; S.maxQi += 8; S.atk += 4; S.def += 2; S.spi += 1;
      MC.log("Breakthrough. Ascended to " + MC.rName() + ".", "ok", "sys");
      MC.toast("Ascended to " + MC.rName());
      MC.sfx("high");
    } else {
      MC.log("A stage falls away: " + MC.rName() + ".", "ok", "sys");
      MC.toast("Stage up: " + MC.rName());
      MC.sfx("win");
    }
    S.hp = S.maxHp; S.qi = S.maxQi;
  } else {
    S.pity = (S.pity || 0) + 1;
    S.cult = Math.floor(rm * 0.6);
    S.hp = Math.max(1, S.hp - 20);
    MC.log("The attempt fails. Twenty health lost; pity grows.", "bad", "sys");
  }
  MC.markListsDirty(); MC.renderAll(); MC.writeStore();
};

MC.act.closedDoor = function () {
  S.doorUntil = Date.now() + 30000;
  MC.log("Behind a closed door: triple gain for thirty breaths.", "", "sys");
  MC.updateStatus();
};

MC.act.echoRoll = function () {
  return MC.has("al2") && Math.random() < 0.2; // Cauldron Echo
};

MC.act.doGather = function (id) {
  const n = MC.NODES.find(x => x.id === id);
  if (!n) return;
  const m = MC.gatherMult();
  let amt = Math.max(1, Math.round((2 + Math.random() * 2) * m));
  if (id === "core" && MC.tAtk() < 8 && Math.random() < 0.3) {
    S.hp = Math.max(1, S.hp - 12);
    MC.log("A beast in the wastes takes twelve health from you.", "bad", "combat");
    MC.float("-12", "hurt");
  } else {
    if (MC.act.echoRoll()) { amt *= 2; MC.log("The cauldron echoes: a doubled yield.", "rich", "loot"); }
    S.inv[n.id] += amt;
    MC.act.gainCult(n.cult * 3);
    MC.log("Gathered " + amt + " " + n.t + ".", "", "loot");
  }
  MC.markListsDirty(); MC.renderAll(); MC.writeStore();
};

MC.act.doCraft = function (id) {
  const r = MC.RECIPES.find(x => x.id === id);
  if (!r) return;
  if (!Object.entries(r.c).every(([k, v]) => S.inv[k] >= v)) {
    MC.log("The price of " + r.t + " is not in hand.", "bad", "sys");
    return;
  }
  for (const k in r.c) S.inv[k] -= r.c[k];
  const echo = MC.act.echoRoll();
  if (r.pill) {
    const n = r.pill + (echo ? 1 : 0);
    S.inv.pill += n;
    MC.log("Refined " + r.t + ", " + n + " in hand." + (echo ? " The echo adds one." : ""), "rich", "loot");
  } else if (r.bigpill) {
    const n = r.bigpill + (echo ? 1 : 0);
    S.inv.bigpill += n;
    MC.log("Refined " + r.t + ", " + n + " in hand." + (echo ? " The echo adds one." : ""), "rich", "loot");
  } else {
    const g = { uid: "g" + Date.now() + Math.floor(Math.random() * 999), t: r.t,
      atk: r.atk || 0, def: r.def || 0, hp: r.hp || 0, spi: r.spi || 0,
      slot: r.slot, rar: MC.rollRarity(S.realm, Math.random()), lvl: echo ? 1 : 0 };
    S.gear.push(g);
    S.equip[r.slot] = g.uid;
    if (g.hp) { S.maxHp += g.hp; S.hp += g.hp; }
    const rn = MC.RARITIES.find(x => x.id === g.rar);
    MC.log("Forged a " + rn.t + " " + r.t + ", and took it up." +
      (echo ? " The echo grants a free reforge." : ""), "rich", "loot");
    MC.toast("Forged: " + rn.t + " " + r.t);
    MC.sfx("forge");
  }
  MC.act.gainCult(10);
  MC.markListsDirty(); MC.renderAll(); MC.writeStore();
};

MC.act.doEquip = function (uid) {
  const g = S.gear.find(x => x.uid === uid);
  if (!g) return;
  if (S.equip[g.slot] !== uid) {
    const old = S.gear.find(x => x.uid === S.equip[g.slot]);
    if (old && old.hp) S.maxHp -= old.hp;
    if (g.hp) S.maxHp += g.hp;
    S.hp = Math.min(S.hp, S.maxHp);
  }
  S.equip[g.slot] = uid;
  MC.log("Took up " + g.t + ".", "", "sys");
  MC.markListsDirty(); MC.renderAll(); MC.writeStore();
};

MC.act.upgradeGear = function (uid) {
  const g = S.gear.find(x => x.uid === uid);
  if (!g || (g.lvl || 0) >= MC.CONFIG.UPGRADE_MAX) return;
  const cost = MC.upgradeCost(g);
  if (S.inv.ore < cost.ore || S.inv.wood < cost.wood) {
    MC.log("No iron and timber enough to reforge " + g.t + ".", "bad", "sys");
    return;
  }
  S.inv.ore -= cost.ore; S.inv.wood -= cost.wood;
  g.lvl = (g.lvl || 0) + 1;
  MC.log("Reforged " + g.t + " to +" + g.lvl + ".", "rich", "loot");
  MC.markListsDirty(); MC.renderAll(); MC.writeStore();
};

MC.act.sellGear = function (uid) {
  const i = S.gear.findIndex(x => x.uid === uid);
  if (i < 0) return;
  const g = S.gear[i];
  if (S.equip[g.slot] === g.uid) { MC.log("Lay it down first.", "bad", "sys"); return; }
  S.gold += MC.sellPrice(g);
  S.gear.splice(i, 1);
  MC.log("Sold " + g.t + " for " + MC.fmt(MC.sellPrice(g)) + " gold.", "", "loot");
  MC.markListsDirty(); MC.renderAll(); MC.writeStore();
};

MC.act.buySkill = function (id) {
  const sk = MC.SKILLS.find(x => x.id === id);
  if (!sk || MC.has(id)) return;
  const chain = MC.SKILLS.filter(s => s.path === sk.path);
  const idx = chain.findIndex(s => s.id === id);
  if (idx > 0 && !MC.has(chain[idx - 1].id)) return;
  if (sk.cost.seeds) {
    if (S.seeds < sk.cost.seeds) return;
    S.seeds -= sk.cost.seeds;
  } else {
    if (S.stones < sk.cost.stones) return;
    S.stones -= sk.cost.stones;
  }
  S.skills[id] = true;
  if (id === "bo1") { S.maxHp += 30; S.hp += 30; }
  if (id === "bo4") { S.maxHp += 120; S.hp += 120; }
  MC.log("Learned: " + sk.t + ".", "rich", "sys");
  MC.toast("Technique learned: " + sk.t);
  MC.sfx("learn");
  MC.markListsDirty(); MC.renderAll(); MC.writeStore();
};

MC.act.askRebirth = function () {
  if (!MC.canRebirth()) return;
  const seeds = MC.seedsFor(S.totalCult);
  MC.showModal("Drink the soup?", [
    "Begin again as a child. This life's tally of " + MC.fmt(S.totalCult) +
    " cultivation is worth " + seeds + " Dao Seeds.",
    "Kept: techniques, seeds, stones. All else returns to dust."
  ], [{ t: "Keep cultivating" },
    { t: "Drink", primary: true, cb: () => {
      const got = MC.doRebirth();
      MC.log("You wake as a child again, " + got + " seeds burning in the soul.", "rich", "sys");
      MC.toast("Reborn with " + got + " Dao Seeds");
      MC.act.enterMain();
    } }]);
};

MC.act.doFight = function (i, boss) {
  const f = boss ? Object.assign({}, MC.BOSSES[i]) : Object.assign({}, MC.FOES[i]);
  if (!f.t) return;
  if (boss && S.realm < f.realm) {
    MC.log(f.t + " is sealed until " + MC.REALMS[f.realm].n + ".", "bad", "sys");
    return;
  }
  if (boss && S.bosses.includes(f.id)) { MC.log("Already fallen.", "", "sys"); return; }
  MC.battle = { f: f, hp: f.hp, max: f.hp, boss: boss, rounds: 0 };
  MC.log("Battle joined: " + f.t + " (" + MC.fmt(f.hp) + " health).", "", "combat");
  MC.updateStatus(); MC.updateScene();
};

MC.act.climbTower = function () {
  const f = MC.towerFoe(S.tower + 1);
  MC.battle = { f: f, hp: f.hp, max: f.hp, boss: false, tower: true, rounds: 0 };
  MC.log("Floor " + MC.fmt(S.tower + 1) + ": " + f.t + " (" + MC.fmt(f.hp) + " health).", "", "combat");
  MC.showMenu("fight");
  MC.updateStatus(); MC.updateScene();
};

MC.act.combatRound = function (burst) {
  if (!MC.battle || MC.paused) return;
  MC.battle.rounds = (MC.battle.rounds || 0) + 1;
  const spi = MC.tSpi();
  let atk = MC.fightAtk(burst);
  let tag = "";
  // Thunder Draw: opening strike +100%. Heart Sword: every 6th strike doubled.
  if (MC.has("sw4") && MC.battle.rounds === 1) { atk *= 2; tag = ", Thunder Draw"; }
  else if (MC.has("sw2") && MC.battle.rounds % 6 === 0) { atk *= 2; tag = ", Heart Sword"; }
  const crit = Math.random() < 0.1 + spi * 0.02;
  let dmg = Math.max(1, atk - MC.battle.f.def + Math.floor(Math.random() * 4));
  if (crit) dmg = Math.floor(dmg * 1.8);
  MC.battle.hp -= dmg;
  MC.log((burst ? "Burst for " : "Struck for ") + MC.fmt(dmg) +
    (crit ? ", a telling blow" : "") + tag + ".", crit ? "rich" : "", "combat");
  MC.float("-" + MC.fmt(dmg), "hit");
  if (MC.battle.hp <= 0) { MC.act.winFight(); return; }
  const ed = Math.max(1, MC.battle.f.atk - MC.tDef() + Math.floor(Math.random() * 4));
  S.hp -= ed;
  MC.log(MC.battle.f.t + " answers for " + ed + ".", "bad", "combat");
  MC.float("-" + ed, "hurt");
  if (MC.has("bo3")) { // Stone Skin: reflect 20%
    const th = Math.max(1, Math.floor(ed * 0.2));
    MC.battle.hp -= th;
    MC.log("Stone Skin returns " + th + ".", "", "combat");
    if (MC.battle.hp <= 0) { MC.act.winFight(); return; }
  }
  if (S.hp <= 0) {
    S.hp = Math.ceil(S.maxHp * 0.3);
    S.cult = Math.max(0, S.cult - 20);
    MC.log("You fall, and wake at a third health. Twenty cultivation gone.", "bad", "sys");
    MC.battle = null;
  }
  MC.updateStatus(); MC.updateScene();
};

MC.act.winFight = function () {
  const f = MC.battle.f;
  const isTower = !!MC.battle.tower;
  S.kills++;
  const cg = Math.floor(f.cult * MC.fightCultMult());
  MC.act.gainCult(cg);
  S.gold += f.gold;
  for (const k in (f.loot || {})) S.inv[k] += f.loot[k];
  if (Math.random() < MC.stoneChance()) { S.stones++; MC.log("A spirit stone among the spoils.", "rich", "loot"); }
  if (isTower) {
    S.tower = Math.max(S.tower, f.tower);
    MC.log("Floor " + MC.fmt(f.tower) + " cleared: +" + MC.fmt(cg) + " cultivation, +" + MC.fmt(f.gold) + " gold.", "ok", "loot");
  } else {
    MC.log("Slew " + f.t + ": +" + MC.fmt(cg) + " cultivation, +" + MC.fmt(f.gold) + " gold.", "ok", "loot");
  }
  if (MC.battle.boss && !S.bosses.includes(f.id)) {
    S.bosses.push(f.id); S.spi++; S.maxHp += 20; S.hp = S.maxHp;
    MC.log("The tyrant's core settles in you: +1 spirit, +20 health.", "rich", "loot");
    MC.toast("Tyrant fallen: " + f.t);
    MC.sfx("win");
  }
  const wasBoss = MC.battle.boss;
  const fidx = MC.FOES.findIndex(x => x.id === f.id);
  MC.battle = null;
  S.qi = Math.min(S.maxQi, S.qi + 3);
  MC.markListsDirty(); MC.renderAll(); MC.writeStore();
  const healthy = S.hp > S.maxHp * 0.35;
  if (isTower) {
    if (S.settings.autoTower && S.settings.autoFight && healthy) MC.act.climbTower();
  } else if (S.settings.autoFight && !wasBoss && healthy) {
    MC.act.doFight(fidx >= 0 ? fidx : 0, false);
  }
};

MC.act.eatHerb = function () {
  if (S.inv.herb > 0 && S.hp < S.maxHp) {
    S.inv.herb--; S.hp = Math.min(S.maxHp, S.hp + 25);
    MC.log("Chewed a herb: +25 health.", "ok", "sys");
    MC.markListsDirty(); MC.renderAll();
  }
};

MC.act.takePill = function () {
  const m = MC.pillMult();
  if (S.inv.pill > 0) {
    S.inv.pill--; S.qi = S.maxQi; MC.act.gainCult(50 * m);
    if (MC.has("al3")) S.hp = Math.min(S.maxHp, S.hp + 40); // Pill Veins
    MC.log("Swallowed a pill: +" + MC.fmt(50 * m) + " cultivation." + (MC.has("al3") ? " +40 health." : ""), "ok", "sys");
  } else if (S.inv.bigpill > 0) {
    S.inv.bigpill--; S.qi = S.maxQi; MC.act.gainCult(200 * m);
    if (MC.has("al3")) S.hp = Math.min(S.maxHp, S.hp + 40);
    MC.log("Swallowed a core pill: +" + MC.fmt(200 * m) + " cultivation." + (MC.has("al3") ? " +40 health." : ""), "rich", "sys");
  } else MC.log("No pills. The forge is waiting.", "bad", "sys");
  MC.markListsDirty(); MC.renderAll();
};

/* ---- screen flow ---- */
MC.act.applyPath = function (p) {
  if (p === "body") { S.maxHp += 40; S.hp = S.maxHp; S.def += 1; }
  if (p === "talisman") { S.maxQi += 10; S.qi = S.maxQi; }
};

MC.act.enterMain = function () {
  MC.applySettings();
  MC.syncSettingsUI();
  MC.show("screen-main");
  const last = S.settings.lastPanel;
  MC.showMenu(document.getElementById("m-" + last) ? last : "cult");
  MC.markListsDirty();
  MC.renderAll();
  if (MC.pendingOffline) {
    const sum = MC.pendingOffline;
    MC.pendingOffline = null;
    MC.showModal("While you were away", MC.offlineLines(sum), [{ t: "Begin", primary: true }]);
  }
};

MC.act.validName = function (v) {
  v = v.trim();
  if (v.length < 2) return "A name wants at least two letters.";
  if (v.length > 16) return "Sixteen letters at most; the seal is small.";
  return "";
};

MC.act.newGame = function (path) {
  S = Object.assign(MC.DEFAULT(), { name: S.name, path: path, settings: S.settings });
  MC.applySettings();
  MC.act.applyPath(path);
  S.started = true;
  MC.battle = null;
  MC.log("Welcome, " + S.name + ". The idle years begin.", "ok", "sys");
  MC.log("Cultivation fills on its own; breakthroughs carry you up.", "", "sys");
  MC.act.enterMain();
  MC.writeStore();
};

MC.act.beginFromPath = function () {
  if (!MC.selPath) { $("pathErr").textContent = "Choose a path first — keys 1–4, or a tap."; return; }
  const overwrites = S.started;
  const go = () => MC.act.newGame(MC.selPath);
  if (overwrites) {
    MC.showModal("Begin again?", ["A life named " + S.name + " already rests on the shelf.",
      "Begin as " + S.name + " on a new path? The old life is lost."],
      [{ t: "Keep the old life" }, { t: "Begin again", primary: true, cb: go }]);
  } else go();
};

/* ---- bindings ---- */
MC.bindAll = function () {
  document.querySelectorAll(".menurow button[data-m]").forEach(b => {
    if (!b.getAttribute("data-basetip")) b.setAttribute("data-basetip", b.getAttribute("data-tip") || "");
    b.addEventListener("click", () => MC.showMenu(b.dataset.m));
  });
  document.addEventListener("keydown", e => {
    if ($("modalOverlay").classList.contains("open")) {
      if (e.key === "Escape") MC.hideModal();
      return;
    }
    const typing = e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
    if ($("screen-path").classList.contains("active") && !typing) {
      const pick = { 1: 0, 2: 1, 3: 2, 4: 3 }[e.key];
      if (pick !== undefined && MC.PATHS[pick]) {
        MC.selPath = MC.PATHS[pick].id;
        $("btnToGame").disabled = false;
        $("pathErr").textContent = "";
        MC.drawPaths();
      } else if (e.key === "Enter" && MC.selPath) MC.act.beginFromPath();
      return;
    }
    if (!$("screen-main").classList.contains("active") || typing) return;
    const map = { 1: "cult", 2: "gather", 3: "forge", 4: "fight", 5: "boss", 6: "skills", 7: "char", 8: "settings" };
    if (map[e.key]) { MC.showMenu(map[e.key]); return; }
    const k = e.key.toLowerCase();
    if (k === "m") MC.act.meditate();
    else if (k === "b") MC.act.tryBreak(true);
    else if (k === "a") MC.act.combatRound(false);
    else if (k === "q") {
      if (S.qi < 10) { MC.log("Ten qi wanted; circulate first.", "bad", "sys"); return; }
      S.qi -= 10;
      MC.act.combatRound(true);
    } else if (k === "f" && MC.battle) {
      MC.log("Withdrew from " + MC.battle.f.t + ".", "", "combat");
      MC.battle = null;
      MC.updateStatus(); MC.updateScene();
    }
  });

  // First pages: inline validation, no surprises.
  $("inName").addEventListener("input", e => {
    $("userErr").textContent = MC.act.validName(e.target.value) && e.target.value.length ? MC.act.validName(e.target.value) : "";
  });
  $("nameForm").addEventListener("submit", e => {
    e.preventDefault();
    const err = MC.act.validName($("inName").value);
    if (err) { $("userErr").textContent = err; return; }
    $("userErr").textContent = "";
    S.name = $("inName").value.trim();
    if (!MC.selPath) MC.selPath = S.path || "";
    $("pathNameEcho").textContent = S.name;
    MC.drawPaths();
    $("btnToGame").disabled = !MC.selPath;
    if (!MC.selPath) $("pathErr").textContent = "Choose a path first — keys 1–4, or a tap.";
    MC.show("screen-path");
  });
  $("btnContinue").addEventListener("click", () => { MC.act.enterMain(); });
  $("btnBackUser").addEventListener("click", () => MC.show("screen-user"));
  $("btnToGame").addEventListener("click", MC.act.beginFromPath);
  $("btnHintOff").addEventListener("click", () => {
    S.hintsOff = true; MC.writeStore(); MC.updateHints();
  });

  // The idle's own toggles write S.
  $("focus").addEventListener("change", e => {
    S.settings.focus = e.target.value;
    MC.markListsDirty(); MC.renderAll(); MC.writeStore();
  });
  const bools = [["optCult", "autoCult"], ["optBreak", "autoBreak"], ["optGather", "autoGather"],
    ["optFight", "autoFight"], ["optHeal", "autoHeal"], ["optTower", "autoTower"]];
  for (const [id, key] of bools) {
    $(id).addEventListener("change", e => {
      S.settings[key] = e.target.checked;
      MC.markListsDirty(); MC.renderAll(); MC.writeStore();
    });
  }

  // Settings tab: applied at once, no reloading.
  $("setTheme").addEventListener("change", e => { S.settings.theme = e.target.value; MC.applySettings(); MC.writeStore(); });
  $("setText").addEventListener("change", e => { S.settings.textSize = e.target.value; MC.applySettings(); MC.writeStore(); });
  $("setNum").addEventListener("change", e => { S.settings.numFmt = e.target.value; MC.markListsDirty(); MC.renderAll(); MC.writeStore(); });
  $("setAutosave").addEventListener("change", e => { S.settings.autosaveSec = parseInt(e.target.value, 10) || 5; MC.writeStore(); });
  $("setSound").addEventListener("change", e => { S.settings.muted = !e.target.checked; MC.writeStore(); });
  $("setMotion").addEventListener("change", e => { S.settings.reduceMotion = e.target.checked; MC.applySettings(); MC.writeStore(); });

  // Chronicle filter.
  document.querySelectorAll(".filters button[data-f]").forEach(b => {
    b.addEventListener("click", () => {
      S.settings.logFilter = b.dataset.f;
      MC.writeStore();
      MC.applyFilter();
    });
  });

  $("btnMed").addEventListener("click", MC.act.meditate);
  $("btnBreak").addEventListener("click", () => MC.act.tryBreak(true));
  $("btnDoor").addEventListener("click", MC.act.closedDoor);
  $("btnHit").addEventListener("click", () => MC.act.combatRound(false));
  $("btnBurst").addEventListener("click", () => {
    if (S.qi < 10) { MC.log("Ten qi wanted; circulate first.", "bad", "sys"); return; }
    S.qi -= 10;
    MC.act.combatRound(true);
  });
  $("btnFlee").addEventListener("click", () => {
    if (MC.battle) {
      MC.log("Withdrew from " + MC.battle.f.t + ".", "", "combat");
      MC.battle = null;
      MC.updateStatus(); MC.updateScene();
    }
  });
  $("btnEat").addEventListener("click", MC.act.eatHerb);
  $("btnPill").addEventListener("click", MC.act.takePill);
  $("btnSave").addEventListener("click", () => {
    MC.writeStore();
    $("saveMsg").textContent = "Recorded " + new Date().toLocaleTimeString() + ".";
  });
  $("btnPause").addEventListener("click", () => {
    MC.paused = !MC.paused;
    $("btnPause").textContent = MC.paused ? "Resume" : "Pause";
    MC.log(MC.paused ? "The world holds its breath." : "The world breathes again.", "", "sys");
  });

  // Record carried elsewhere.
  $("btnExp").addEventListener("click", () => {
    const s = MC.exportSave();
    $("saveBox").value = s;
    $("saveBox").select();
    try { document.execCommand("copy"); } catch (e) {}
    if (navigator.clipboard) navigator.clipboard.writeText(s).catch(() => {});
    $("saveMsg").textContent = "Copied to the box and the clipboard.";
  });
  $("btnImp").addEventListener("click", () => {
    try {
      MC.importSave($("saveBox").value);
      MC.selPath = S.path;
      MC.battle = null;
      MC.applySettings();
      MC.act.enterMain();
      MC.log("The brought record is accepted.", "rich", "sys");
    } catch (e) { $("saveMsg").textContent = "Not a record; nothing changed."; }
  });

  // Danger, behind a written word.
  $("wipeWord").addEventListener("input", e => {
    $("btnWipe").disabled = e.target.value.trim().toLowerCase() !== "sever";
  });
  $("btnWipe").addEventListener("click", () => {
    if ($("wipeWord").value.trim().toLowerCase() !== "sever") return;
    try { localStorage.removeItem(MC.CONFIG.SAVE_KEY); } catch (e) {}
    location.reload();
  });
  $("btnClear").addEventListener("click", () => {
    $("log").textContent = "";
    MC._lastKey = null; MC._lastEl = null;
  });
};
