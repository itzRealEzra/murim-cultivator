/* Murim Cultivator v3-phase5 — actions and screen flow.
   Every handler writes S (never the DOM). Rules and numbers are
   untouched. One-line event emits let the scenery answer; behavior
   never branches on them. Space/Enter/Escape never fire while typing
   or when a modal blocks them. No number keys anywhere. */
var MC = window.MC || {};
window.MC = MC;
MC.act = {};

MC.act.gainCult = function (n) { S.cult += n; S.totalCult += n; };

/* Space: Cultivate on the lobby, Meditate-or-Breakthrough in the panel. */
MC.act.primary = function () {
  if (MC.paused) return;
  if (MC.screen === "lobby") { MC.openCultivate(); return; }
  if (MC.screen !== "cultivate") return;
  if (MC.battle) MC.act.combatRound(false);
  else if (S.cult >= MC.rMax()) MC.act.tryBreak(true);
  else MC.act.meditate();
};

MC.act.meditate = function () {
  var amt = MC.meditateAmt();
  MC.act.gainCult(amt);
  S.qi = Math.min(S.maxQi, S.qi + 2);
  S.hp = Math.min(S.maxHp, S.hp + 2);
  MC.markStageAct("meditate", 3000);
  MC.log("Meditated: +" + MC.fmt(amt) + " cultivation.", "", "sys");
  MC.float("+" + MC.fmt(amt), "gain");
  MC.tipProgress("med");
  MC.updateStatus(); MC.updateRates();
};

MC.act.tryBreak = function (manual) {
  var rm = MC.rMax();
  if (S.cult < rm) {
    if (manual) {
      MC.log("The measure wants " + MC.fmt(rm - S.cult) + " more.", "bad", "sys");
      MC.sfx("error");
    }
    return;
  }
  if (Math.random() < MC.breakChance()) {
    S.cult = 0; S.stage++; S.pity = 0;
    S.breakthroughDone = true;
    S.ui.hintsDone = true;
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
    MC.avatarBurst(true);
    MC.showBanner(MC.rName(), false);
  } else {
    S.pity = (S.pity || 0) + 1;
    S.cult = Math.floor(rm * 0.6);
    S.hp = Math.max(1, S.hp - 20);
    MC.log("The attempt fails. Twenty health lost; pity grows.", "bad", "sys");
    MC.avatarBurst(false);
    MC.showBanner("The qi scatters.", true);
    MC.sfx("error");
  }
  MC.tipProgress("med");
  MC.markListsDirty(); MC.renderAll(); MC.writeStore();
};

MC.act.closedDoor = function () {
  S.doorUntil = Date.now() + 30000;
  MC.markStageAct("meditate", 30000);
  MC.log("Behind a closed door: triple gain for thirty breaths.", "", "sys");
  MC.updateStatus();
};

MC.act.echoRoll = function () {
  return MC.has("al2") && Math.random() < 0.2; // Cauldron Echo
};

MC.act.doGather = function (id) {
  var n = null;
  for (var i = 0; i < MC.NODES.length; i++) if (MC.NODES[i].id === id) n = MC.NODES[i];
  if (!n) return;
  var m = MC.gatherMult();
  var amt = Math.max(1, Math.round((2 + Math.random() * 2) * m));
  if (id === "core" && MC.tAtk() < 8 && Math.random() < 0.3) {
    S.hp = Math.max(1, S.hp - 12);
    MC.log("A beast in the wastes takes twelve health from you.", "bad", "combat");
    MC.float("-12", "hurt");
  } else {
    if (MC.act.echoRoll()) { amt *= 2; MC.log("The cauldron echoes: a doubled yield.", "rich", "loot"); }
    S.inv[n.id] += amt;
    MC.act.gainCult(n.cult * 3);
    MC.log("Gathered " + amt + " " + n.t + ".", "", "loot");
    MC.float("+" + amt, "gain");
  }
  MC.markStageAct("gather", 3000);
  MC.markListsDirty(); MC.renderAll(); MC.writeStore();
};

MC.act.doCraft = function (id) {
  var r = null;
  for (var i = 0; i < MC.RECIPES.length; i++) if (MC.RECIPES[i].id === id) r = MC.RECIPES[i];
  if (!r) return;
  if (!Object.entries(r.c).every(function (kv) { return S.inv[kv[0]] >= kv[1]; })) {
    MC.log("The price of " + r.t + " is not in hand.", "bad", "sys");
    MC.sfx("error");
    return;
  }
  for (var k in r.c) S.inv[k] -= r.c[k];
  var echo = MC.act.echoRoll();
  if (r.pill) {
    var n = r.pill + (echo ? 1 : 0);
    S.inv.pill += n;
    MC.log("Refined " + r.t + ", " + n + " in hand." + (echo ? " The echo adds one." : ""), "rich", "loot");
  } else if (r.bigpill) {
    var n2 = r.bigpill + (echo ? 1 : 0);
    S.inv.bigpill += n2;
    MC.log("Refined " + r.t + ", " + n2 + " in hand." + (echo ? " The echo adds one." : ""), "rich", "loot");
  } else {
    var g = { uid: "g" + Date.now() + Math.floor(Math.random() * 999), t: r.t,
      atk: r.atk || 0, def: r.def || 0, hp: r.hp || 0, spi: r.spi || 0,
      slot: r.slot, rar: MC.rollRarity(S.realm, Math.random()), lvl: echo ? 1 : 0 };
    S.gear.push(g);
    S.equip[r.slot] = g.uid;
    if (g.hp) { S.maxHp += g.hp; S.hp += g.hp; }
    var rn = MC.RARITIES.find(function (x) { return x.id === g.rar; });
    MC.log("Forged a " + rn.t + " " + r.t + ", and took it up." +
      (echo ? " The echo grants a free reforge." : ""), "rich", "loot");
    MC.toast("Forged: " + rn.t + " " + r.t);
    MC.sfx("forge");
  }
  MC.act.gainCult(10);
  MC.markListsDirty(); MC.renderAll(); MC.writeStore();
};

MC.act.doEquip = function (uid) {
  var g = null;
  for (var i = 0; i < S.gear.length; i++) if (S.gear[i].uid === uid) g = S.gear[i];
  if (!g) return;
  if (S.equip[g.slot] !== uid) {
    var old = null;
    for (var j = 0; j < S.gear.length; j++) if (S.gear[j].uid === S.equip[g.slot]) old = S.gear[j];
    if (old && old.hp) S.maxHp -= old.hp;
    if (g.hp) S.maxHp += g.hp;
    S.hp = Math.min(S.hp, S.maxHp);
  }
  S.equip[g.slot] = uid;
  MC.log("Took up " + g.t + ".", "", "sys");
  MC.toast("Equipped: " + g.t);
  MC.markListsDirty(); MC.renderAll(); MC.writeStore();
};

MC.act.upgradeGear = function (uid) {
  var g = null;
  for (var i = 0; i < S.gear.length; i++) if (S.gear[i].uid === uid) g = S.gear[i];
  if (!g || (g.lvl || 0) >= MC.CONFIG.UPGRADE_MAX) return;
  var cost = MC.upgradeCost(g);
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
  var i = -1;
  for (var k = 0; k < S.gear.length; k++) if (S.gear[k].uid === uid) i = k;
  if (i < 0) return;
  var g = S.gear[i];
  if (S.equip[g.slot] === g.uid) { MC.log("Lay it down first.", "bad", "sys"); return; }
  S.gold += MC.sellPrice(g);
  S.gear.splice(i, 1);
  MC.log("Sold " + g.t + " for " + MC.fmt(MC.sellPrice(g)) + " gold.", "", "loot");
  MC.markListsDirty(); MC.renderAll(); MC.writeStore();
};

MC.act.buySkill = function (id) {
  var sk = null;
  for (var i = 0; i < MC.SKILLS.length; i++) if (MC.SKILLS[i].id === id) sk = MC.SKILLS[i];
  if (!sk || MC.has(id)) return;
  var chain = MC.SKILLS.filter(function (s) { return s.path === sk.path; });
  var idx = chain.findIndex(function (s) { return s.id === id; });
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
  var seeds = MC.seedsFor(S.totalCult);
  MC.showModal("Drink the soup?", [
    "Begin again as a child. This life's tally of " + MC.fmt(S.totalCult) +
    " cultivation is worth " + seeds + " Dao Seeds.",
    "Kept: techniques, seeds, stones. All else returns to dust."
  ], [{ t: "Keep cultivating" },
    { t: "Drink", primary: true, cb: function () {
      var got = MC.doRebirth();
      MC.log("You wake as a child again, " + got + " seeds burning in the soul.", "rich", "sys");
      MC.toast("Reborn with " + got + " Dao Seeds");
      MC.act.enterMain();
    } }]);
};

MC.act.doFight = function (i, boss) {
  var src = boss ? MC.BOSSES : MC.FOES;
  var f = Object.assign({}, src[i]);
  if (!f.t) return;
  if (boss && S.realm < f.realm) {
    MC.log(f.t + " is sealed until " + MC.REALMS[f.realm].n + ".", "bad", "sys");
    return;
  }
  if (boss && S.bosses.includes(f.id)) { MC.log("Already fallen.", "", "sys"); return; }
  MC.battle = { f: f, hp: f.hp, max: f.hp, boss: boss, rounds: 0 };
  MC.log("Battle joined: " + f.t + " (" + MC.fmt(f.hp) + " health).", "", "combat");
  MC.emit("foe", { foe: f, boss: boss });
  MC.updateStatus(); MC.updateScene();
};

MC.act.climbTower = function () {
  var f = MC.towerFoe(S.tower + 1);
  MC.battle = { f: f, hp: f.hp, max: f.hp, boss: false, tower: true, rounds: 0 };
  MC.log("Floor " + MC.fmt(S.tower + 1) + ": " + f.t + " (" + MC.fmt(f.hp) + " health).", "", "combat");
  MC.emit("foe", { foe: f, boss: false });
  MC.updateStatus(); MC.updateScene();
};

MC.act.flee = function () {
  if (!MC.battle) return;
  MC.log("Withdrew from " + MC.battle.f.t + ".", "", "combat");
  MC.battle = null;
  MC.emit("flee", {});
  MC.updateStatus(); MC.updateScene();
};

MC.act.combatRound = function (burst) {
  if (!MC.battle || MC.paused) return;
  MC.battle.rounds = (MC.battle.rounds || 0) + 1;
  var spi = MC.tSpi();
  var atk = MC.fightAtk(burst);
  var tag = "";
  // Thunder Draw: opening strike +100%. Heart Sword: every 6th strike doubled.
  if (MC.has("sw4") && MC.battle.rounds === 1) { atk *= 2; tag = ", Thunder Draw"; }
  else if (MC.has("sw2") && MC.battle.rounds % 6 === 0) { atk *= 2; tag = ", Heart Sword"; }
  var crit = Math.random() < 0.1 + spi * 0.02;
  var dmg = Math.max(1, atk - MC.battle.f.def + Math.floor(Math.random() * 4));
  if (crit) dmg = Math.floor(dmg * 1.8);
  MC.battle.hp -= dmg;
  MC.log((burst ? "Burst for " : "Struck for ") + MC.fmt(dmg) +
    (crit ? ", a telling blow" : "") + tag + ".", crit ? "rich" : "", "combat");
  MC.float("-" + MC.fmt(dmg) + (crit ? "!" : ""), crit ? "crit" : "hit");
  MC.emit("hit", { dmg: dmg, crit: crit, burst: burst, foeHp: MC.battle.hp, foeMax: MC.battle.max });
  MC.sfx(crit ? "crit" : "hit");
  if (MC.battle.hp <= 0) { MC.act.winFight(); return; }
  var ed = Math.max(1, MC.battle.f.atk - MC.tDef() + Math.floor(Math.random() * 4));
  S.hp -= ed;
  MC.log(MC.battle.f.t + " answers for " + ed + ".", "bad", "combat");
  MC.float("-" + ed, "hurt");
  MC.emit("hurt", { dmg: ed });
  if (MC.has("bo3")) { // Stone Skin: reflect 20%
    var th = Math.max(1, Math.floor(ed * 0.2));
    MC.battle.hp -= th;
    MC.log("Stone Skin returns " + th + ".", "", "combat");
    MC.emit("hit", { dmg: th, crit: false, burst: false, foeHp: MC.battle.hp, foeMax: MC.battle.max });
    if (MC.battle.hp <= 0) { MC.act.winFight(); return; }
  }
  if (S.hp <= 0) {
    S.hp = Math.ceil(S.maxHp * 0.3);
    S.cult = Math.max(0, S.cult - 20);
    MC.log("You fall, and wake at a third health. Twenty cultivation gone.", "bad", "sys");
    MC.battle = null;
    MC.emit("foeDown", {});
  }
  MC.updateStatus(); MC.updateScene();
};

MC.act.winFight = function () {
  var f = MC.battle.f;
  var isTower = !!MC.battle.tower;
  S.kills++;
  var cg = Math.floor(f.cult * MC.fightCultMult());
  MC.act.gainCult(cg);
  S.gold += f.gold;
  for (var k in (f.loot || {})) S.inv[k] += f.loot[k];
  if (Math.random() < MC.stoneChance()) { S.stones++; MC.log("A spirit stone among the spoils.", "rich", "loot"); }
  if (isTower) {
    S.tower = Math.max(S.tower, f.tower);
    MC.log("Floor " + MC.fmt(f.tower) + " cleared: +" + MC.fmt(cg) + " cultivation, +" + MC.fmt(f.gold) + " gold.", "ok", "loot");
  } else {
    MC.log("Slew " + f.t + ": +" + MC.fmt(cg) + " cultivation, +" + MC.fmt(f.gold) + " gold.", "ok", "loot");
  }
  MC.float("+" + MC.fmt(cg), "gain");
  if (MC.battle.boss && !S.bosses.includes(f.id)) {
    S.bosses.push(f.id); S.spi++; S.maxHp += 20; S.hp = S.maxHp;
    MC.log("The tyrant's core settles in you: +1 spirit, +20 health.", "rich", "loot");
    MC.toast("Tyrant fallen: " + f.t);
    MC.sfx("win");
  }
  var wasBoss = MC.battle.boss;
  var fidx = -1;
  for (var i = 0; i < MC.FOES.length; i++) if (MC.FOES[i].id === f.id) fidx = i;
  MC.battle = null;
  MC.emit("foeDown", {});
  S.qi = Math.min(S.maxQi, S.qi + 3);
  MC.markListsDirty(); MC.renderAll(); MC.writeStore();
  var healthy = S.hp > S.maxHp * 0.35;
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
    MC.float("+25", "gain");
    MC.markListsDirty(); MC.renderAll();
  }
};

MC.act.takePill = function () {
  var m = MC.pillMult();
  if (S.inv.pill > 0) {
    S.inv.pill--; S.qi = S.maxQi; MC.act.gainCult(50 * m);
    if (MC.has("al3")) S.hp = Math.min(S.maxHp, S.hp + 40); // Pill Veins
    MC.log("Swallowed a pill: +" + MC.fmt(50 * m) + " cultivation." + (MC.has("al3") ? " +40 health." : ""), "ok", "sys");
  } else if (S.inv.bigpill > 0) {
    S.inv.bigpill--; S.qi = S.maxQi; MC.act.gainCult(200 * m);
    if (MC.has("al3")) S.hp = Math.min(S.maxHp, S.hp + 40);
    MC.log("Swallowed a core pill: +" + MC.fmt(200 * m) + " cultivation." + (MC.has("al3") ? " +40 health." : ""), "rich", "sys");
  } else {
    MC.log("No pills. The forge is waiting.", "bad", "sys");
    MC.sfx("error");
  }
  MC.markListsDirty(); MC.renderAll();
};

/* ---- screen flow ---- */
MC.act.applyPath = function (p) {
  if (p === "body") { S.maxHp += 40; S.hp = S.maxHp; S.def += 1; }
  if (p === "talisman") { S.maxQi += 10; S.qi = S.maxQi; }
};

MC._scenesBuilt = false;
MC.act.enterMain = function () {
  MC.applyUI();
  MC.syncSettingsUI();
  if (!MC._scenesBuilt) {
    MC._scenesBuilt = true;
    MC.buildStage($("lobbyScene"));
    MC.buildStage($("cultScene"));
    MC.buildAvatar($("spriteBox"));
  }
  MC.showScreen("lobby");
  MC.buildDrawer();
  MC.markListsDirty();
  MC.renderAll();
  if (MC.pendingOffline) MC.showOffline();
};

MC.act.validName = function (v) {
  v = v.trim();
  if (v.length < 2) return "A name wants at least two letters.";
  if (v.length > 16) return "Sixteen letters at most; the seal is small.";
  if (/[<>]/.test(v)) return "No angle brackets; the scribes refuse them.";
  return "";
};

MC.act.newGame = function (path) {
  var ui = S.ui;
  S = Object.assign(MC.DEFAULT(), { name: S.name, path: path, ui: ui });
  MC.applyUI();
  MC.act.applyPath(path);
  S.started = true;
  MC.battle = null;
  MC._tipStep = 0;
  MC.log("Welcome, " + S.name + ". The idle years begin.", "ok", "sys");
  MC.log("Cultivation fills on its own; breakthroughs carry you up.", "", "sys");
  MC.act.enterMain();
  MC.writeStore();
};

MC.act.beginFromPath = function () {
  if (!MC.selPath) { $("pathErr").textContent = "Choose a path first — Tab to one, Enter begins."; return; }
  var go = function () { MC.act.newGame(MC.selPath); };
  if (S.started) {
    MC.showModal("Begin again?", ["A life named " + S.name + " already rests on the shelf.",
      "Begin as " + S.name + " on a new path? The old life is lost."],
      [{ t: "Keep the old life" }, { t: "Begin again", primary: true, cb: go }]);
  } else go();
};

MC.act.pause = function () {
  MC.paused = !MC.paused;
  MC.log(MC.paused ? "The world holds its breath." : "The world breathes again.", "", "sys");
  MC.updateStatus();
};

MC.HELP = [
  "This is the lobby: one plate, three bars, one button.",
  "The III menu holds every section; most open in later tales.",
  "Cultivate fills the measure on its own; breakthroughs carry you up.",
  "Gathering, arms and battles continue underneath, unattended.",
  "Space repeats the one action before you; Escape closes all doors.",
  "At Dao Ascension you may be reborn, and begin again further."
];

/* ---- bindings ---- */
MC.bindAll = function () {
  document.addEventListener("keydown", function (e) {
    MC.trapTab(e);
    if (R.modalOverlay.classList.contains("open")) {
      if (e.key === "Escape") MC.hideModal();
      return;
    }
    if (MC.drawerOpen()) {
      if (e.key === "Escape") MC.setDrawer(false);
      else MC.trapDrawer(e);
      return;
    }
    var typing = e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
    if ($("screen-path").classList.contains("active") && !typing) {
      if (e.key === "Enter" && MC.selPath) MC.act.beginFromPath();
      return;
    }
    if (typing) return;
    var onLobby = $("screen-lobby").classList.contains("active");
    var onCult = $("screen-cultivate").classList.contains("active");
    if (!onLobby && !onCult) return;
    var k = e.key.toLowerCase();
    if (k === " ") { e.preventDefault(); MC.act.primary(); }
    else if (k === "enter" && onLobby) MC.openCultivate();
    else if (k === "escape" && onCult) MC.openLobby();
  });
  /* tap-to-toggle tooltips on touch */
  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest("[data-tip]") : null;
    var olds = document.querySelectorAll("[data-tip].tip-on");
    for (var i = 0; i < olds.length; i++) if (olds[i] !== t) olds[i].classList.remove("tip-on");
    if (t) t.classList.toggle("tip-on");
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      var olds = document.querySelectorAll("[data-tip].tip-on");
      for (var i = 0; i < olds.length; i++) olds[i].classList.remove("tip-on");
    }
  });

  $("nameForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var err = MC.act.validName($("inName").value);
    if (err) { $("userErr").textContent = err; return; }
    $("userErr").textContent = "";
    S.name = $("inName").value.trim();
    if (!MC.selPath) MC.selPath = S.path || "";
    $("pathNameEcho").textContent = S.name;
    MC.drawPaths();
    $("btnToGame").disabled = !MC.selPath;
    if (!MC.selPath) $("pathErr").textContent = "Choose a path first — Tab to one, Enter begins.";
    MC.showScreen("path");
  });
  $("inName").addEventListener("input", function (e) {
    $("userErr").textContent = e.target.value.length ? MC.act.validName(e.target.value) : "";
  });
  $("btnContinue").addEventListener("click", function () { MC.act.enterMain(); });
  $("btnBackUser").addEventListener("click", function () { MC.showScreen("user"); });
  $("btnToGame").addEventListener("click", MC.act.beginFromPath);
  $("tipSkipL").addEventListener("click", MC.skipTips);
  $("tipSkipC").addEventListener("click", MC.skipTips);

  /* lobby */
  R.btnCultivate.addEventListener("click", function () { MC.openCultivate(); });
  R.goalLine.addEventListener("click", function () {
    if ((MC._goalPanel || "cult") === "cult") MC.openCultivate();
    /* any other destination is Coming soon: the line does nothing */
  });
  R.btnPauseL.addEventListener("click", MC.act.pause);
  R.btnSettingsL.addEventListener("click", function () { MC.openSettings(); });
  R.btnMenu.addEventListener("click", function () {
    if (MC.drawerOpen()) MC.setDrawer(false);
    else MC.setDrawer(true, R.btnMenu);
  });

  /* cultivate */
  R.btnLobby.addEventListener("click", function () { MC.openLobby(); });
  R.btnPauseC.addEventListener("click", MC.act.pause);
  R.btnSettingsC.addEventListener("click", function () { MC.openSettings(); });
  R.btnMenuC.addEventListener("click", function () {
    if (MC.drawerOpen()) MC.setDrawer(false);
    else MC.setDrawer(true, R.btnMenuC);
  });
  R.btnMedC.addEventListener("click", MC.act.meditate);
  R.btnBreakC.addEventListener("click", function () { MC.act.tryBreak(true); });
  R.btnDoorC.addEventListener("click", MC.act.closedDoor);
  R.drawerBackdrop.addEventListener("click", function () { MC.setDrawer(false); });

  /* unattended-work switches */
  var bools = [["optCultC", "autoCult"], ["optBreakC", "autoBreak"]];
  for (var b = 0; b < bools.length; b++) (function (id, key) {
    $(id).addEventListener("change", function (e) {
      S.settings[key] = e.target.checked;
      MC.syncSwitch(e.target, e.target.checked);
      MC.markListsDirty(); MC.renderAll(); MC.writeStore();
    });
  })(bools[b][0], bools[b][1]);
  var fr = document.querySelectorAll('#screen-cultivate input[name="focus"]');
  for (var f = 0; f < fr.length; f++) {
    fr[f].addEventListener("change", function (e) {
      S.settings.focus = e.target.value;
      MC.markListsDirty(); MC.renderAll(); MC.writeStore();
    });
  }

  /* chronicle panel is gone with its sweep button; the log keeps listening */
};
MC.skipTips = function () {
  S.ui.hintsDone = true; MC.writeStore(); MC.tips();
};
