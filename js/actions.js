/* MURIM CULTIVATOR -- Phase 2: actions + screen flow.
   Every handler writes S (never the DOM) and marks lists dirty when
   list data changed. Skill uniques plug in here: Heart Sword, Thunder
   Draw, Stone Skin, Cauldron Echo, Pill Veins. */
var MC = window.MC || {};
window.MC = MC;
MC.act = {};

MC.act.gainCult = function (n) { S.cult += n; S.totalCult += n; };

MC.act.meditate = function () {
  const amt = MC.meditateAmt();
  MC.act.gainCult(amt);
  S.qi = Math.min(S.maxQi, S.qi + 2);
  S.hp = Math.min(S.maxHp, S.hp + 2);
  MC.log("Meditate: +" + amt + " cult.");
  MC.updateStatus(); MC.updateRates();
};

MC.act.tryBreak = function (manual) {
  const rm = MC.rMax();
  if (S.cult < rm) {
    if (manual) MC.log("Need " + Math.ceil(rm - S.cult) + " more cult.", "b");
    return;
  }
  if (Math.random() < MC.breakChance()) {
    S.cult = 0; S.stage++; S.pity = 0;
    if (S.stage >= 9) {
      S.stage = 0;
      S.realm = Math.min(MC.REALMS.length - 1, S.realm + 1);
      S.maxHp += 30; S.maxQi += 8; S.atk += 4; S.def += 2; S.spi += 1;
      MC.log("BREAKTHROUGH! Ascended to " + MC.rName(), "y");
    } else MC.log("Stage up: " + MC.rName(), "g");
    S.hp = S.maxHp; S.qi = S.maxQi;
  } else {
    S.pity = (S.pity || 0) + 1;
    S.cult = Math.floor(rm * 0.6);
    S.hp = Math.max(1, S.hp - 20);
    MC.log("Breakthrough FAILED. -20 HP. Pity +" +
      Math.round(MC.CONFIG.PITY_STEP * 100) + "% next time.", "b");
  }
  MC.markListsDirty(); MC.renderAll();
};

MC.act.closedDoor = function () {
  S.doorUntil = Date.now() + 30000;
  MC.log("Closed-door: x3 cult 30s.");
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
    MC.log("Beast mauled you! -12 HP.", "b");
  } else {
    if (MC.act.echoRoll()) { amt *= 2; MC.log("The cauldron echoes: double yield.", "y"); }
    S.inv[n.id] += amt;
    MC.act.gainCult(n.cult * 3);
    MC.log("Gathered " + amt + "x " + n.t + ".", "g");
  }
  MC.markListsDirty(); MC.renderAll(); MC.writeStore();
};

MC.act.doCraft = function (id) {
  const r = MC.RECIPES.find(x => x.id === id);
  if (!r) return;
  if (!Object.entries(r.c).every(([k, v]) => S.inv[k] >= v)) {
    MC.log("Lack mats for " + r.t, "b");
    return;
  }
  for (const k in r.c) S.inv[k] -= r.c[k];
  const echo = MC.act.echoRoll();
  if (r.pill) {
    const n = r.pill + (echo ? 1 : 0);
    S.inv.pill += n;
    MC.log("Refined " + r.t + " x" + n + "." + (echo ? " Echo!" : ""), "y");
  } else if (r.bigpill) {
    const n = r.bigpill + (echo ? 1 : 0);
    S.inv.bigpill += n;
    MC.log("Refined " + r.t + " x" + n + "." + (echo ? " Echo!" : ""), "y");
  } else {
    const g = { uid: "g" + Date.now() + Math.floor(Math.random() * 999), t: r.t,
      atk: r.atk || 0, def: r.def || 0, hp: r.hp || 0, spi: r.spi || 0,
      slot: r.slot, rar: MC.rollRarity(S.realm, Math.random()), lvl: echo ? 1 : 0 };
    S.gear.push(g);
    S.equip[r.slot] = g.uid;
    if (g.hp) { S.maxHp += g.hp; S.hp += g.hp; }
    const rn = MC.RARITIES.find(x => x.id === g.rar);
    MC.log("Forged [" + rn.t.toUpperCase() + "] " + r.t + " and equipped it." +
      (echo ? " Echo: free +1 reforge." : ""), "y");
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
  MC.log("Equipped " + g.t + ".");
  MC.markListsDirty(); MC.renderAll(); MC.writeStore();
};

MC.act.upgradeGear = function (uid) {
  const g = S.gear.find(x => x.uid === uid);
  if (!g || (g.lvl || 0) >= MC.CONFIG.UPGRADE_MAX) return;
  const cost = MC.upgradeCost(g);
  if (S.inv.ore < cost.ore || S.inv.wood < cost.wood) {
    MC.log("Lack ore/wood to reforge " + g.t + ".", "b");
    return;
  }
  S.inv.ore -= cost.ore; S.inv.wood -= cost.wood;
  g.lvl = (g.lvl || 0) + 1;
  MC.log("Reforged " + g.t + " to +" + g.lvl + ".", "y");
  MC.markListsDirty(); MC.renderAll(); MC.writeStore();
};

MC.act.sellGear = function (uid) {
  const i = S.gear.findIndex(x => x.uid === uid);
  if (i < 0) return;
  const g = S.gear[i];
  if (S.equip[g.slot] === g.uid) { MC.log("Unequip it first.", "b"); return; }
  S.gold += MC.sellPrice(g);
  S.gear.splice(i, 1);
  MC.log("Sold " + g.t + " for " + MC.sellPrice(g) + " gold.", "g");
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
  MC.log("Technique learned: " + sk.t + ".", "y");
  MC.markListsDirty(); MC.renderAll(); MC.writeStore();
};

MC.act.askRebirth = function () {
  if (!MC.canRebirth()) return;
  const seeds = MC.seedsFor(S.totalCult);
  MC.showModal("Reincarnate?", [
    "Drink Meng Po's soup and begin again as a mortal.",
    "This run earned " + Math.floor(S.totalCult) + " cult -> +" + seeds + " Dao Seeds.",
    "Reset: realm, stats, gear, materials, bosses, tower. Kept: skills, seeds, stones."
  ], [{ t: "[ KEEP CULTIVATING ]" },
    { t: "[ REINCARNATE ]", cb: () => {
      const got = MC.doRebirth();
      MC.log("You open your eyes as a child again. +" + got + " Dao Seeds burn in your soul.", "y");
      MC.act.enterMain();
    } }]);
};

MC.act.doFight = function (i, boss) {
  const f = boss ? Object.assign({}, MC.BOSSES[i]) : Object.assign({}, MC.FOES[i]);
  if (!f.t) return;
  if (boss && S.realm < f.realm) {
    MC.log("Boss sealed. Reach " + MC.REALMS[f.realm].n + ".", "b");
    return;
  }
  if (boss && S.bosses.includes(f.id)) { MC.log("Already slain.", "d"); return; }
  MC.battle = { f: f, hp: f.hp, max: f.hp, boss: boss, rounds: 0 };
  MC.log("Battle: " + f.t + " (HP " + f.hp + ")", "b");
  MC.updateStatus(); MC.updateScene();
};

MC.act.climbTower = function () {
  const f = MC.towerFoe(S.tower + 1);
  MC.battle = { f: f, hp: f.hp, max: f.hp, boss: false, tower: true, rounds: 0 };
  MC.log("You climb to floor " + (S.tower + 1) + ": " + f.t + " (HP " + f.hp + ")", "b");
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
  if (MC.has("sw4") && MC.battle.rounds === 1) { atk *= 2; tag = " THUNDER DRAW"; }
  else if (MC.has("sw2") && MC.battle.rounds % 6 === 0) { atk *= 2; tag = " HEART SWORD"; }
  const crit = Math.random() < 0.1 + spi * 0.02;
  let dmg = Math.max(1, atk - MC.battle.f.def + Math.floor(Math.random() * 4));
  if (crit) dmg = Math.floor(dmg * 1.8);
  MC.battle.hp -= dmg;
  MC.log((burst ? "BURST " : "Hit ") + dmg + " to " + MC.battle.f.t +
    (crit ? " CRIT" : "") + tag + ".");
  if (MC.battle.hp <= 0) { MC.act.winFight(); return; }
  const ed = Math.max(1, MC.battle.f.atk - MC.tDef() + Math.floor(Math.random() * 4));
  S.hp -= ed;
  MC.log(MC.battle.f.t + " hits back " + ed + ". HP " + Math.max(0, Math.ceil(S.hp)) + ".", "b");
  if (MC.has("bo3")) { // Stone Skin: reflect 20%
    const th = Math.max(1, Math.floor(ed * 0.2));
    MC.battle.hp -= th;
    MC.log("Stone Skin reflects " + th + ".");
    if (MC.battle.hp <= 0) { MC.act.winFight(); return; }
  }
  if (S.hp <= 0) {
    S.hp = Math.ceil(S.maxHp * 0.3);
    S.cult = Math.max(0, S.cult - 20);
    MC.log("You fell... woke at 30% HP. -20 cult.", "b");
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
  if (Math.random() < MC.stoneChance()) { S.stones++; MC.log("Found 1 spirit stone.", "y"); }
  if (isTower) {
    S.tower = Math.max(S.tower, f.tower);
    MC.log("Floor " + f.tower + " cleared! +" + cg + " cult +" + f.gold + " gold.", "g");
  } else {
    MC.log("Slew " + f.t + "! +" + cg + " cult +" + f.gold + " gold.", "g");
  }
  if (MC.battle.boss && !S.bosses.includes(f.id)) {
    S.bosses.push(f.id); S.spi++; S.maxHp += 20; S.hp = S.maxHp;
    MC.log("BOSS core absorbed: +1 SPI +20 HP.", "y");
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
    MC.log("Ate herb. +25 HP.", "g");
    MC.markListsDirty(); MC.renderAll();
  }
};

MC.act.takePill = function () {
  const m = MC.pillMult();
  if (S.inv.pill > 0) {
    S.inv.pill--; S.qi = S.maxQi; MC.act.gainCult(50 * m);
    if (MC.has("al3")) S.hp = Math.min(S.maxHp, S.hp + 40); // Pill Veins
    MC.log("Took pill. +" + 50 * m + " cult." + (MC.has("al3") ? " +40 HP." : ""), "g");
  } else if (S.inv.bigpill > 0) {
    S.inv.bigpill--; S.qi = S.maxQi; MC.act.gainCult(200 * m);
    if (MC.has("al3")) S.hp = Math.min(S.maxHp, S.hp + 40);
    MC.log("Took core pill. +" + 200 * m + " cult." + (MC.has("al3") ? " +40 HP." : ""), "y");
  } else MC.log("No pills. Forge some.", "b");
  MC.markListsDirty(); MC.renderAll();
};

// ---- screen flow: explicit Continue vs New Game ----
MC.act.applyPath = function (p) {
  if (p === "body") { S.maxHp += 40; S.hp = S.maxHp; S.def += 1; }
  if (p === "talisman") { S.maxQi += 10; S.qi = S.maxQi; }
};

MC.act.enterMain = function () {
  MC.syncSettingsUI();
  MC.show("screen-main");
  MC.showMenu("cult");
  MC.markListsDirty();
  MC.renderAll();
  if (MC.pendingOffline) {
    const sum = MC.pendingOffline;
    MC.pendingOffline = null;
    MC.showModal("Offline summary", MC.offlineLines(sum), [{ t: "[ BEGIN ]" }]);
  }
};

MC.act.newGame = function (path) {
  S = Object.assign(MC.DEFAULT(), { name: S.name, path: path });
  MC.act.applyPath(path);
  S.started = true;
  MC.battle = null;
  MC.log("Welcome, " + S.name + " [" + path + "]. Your idle cultivation begins.", "g");
  MC.log("Loop: CULT per sec -> BREAKTHROUGH -> GATHER mats -> FORGE gear -> FIGHT/BOSS.", "d");
  MC.act.enterMain();
  MC.writeStore();
};

MC.act.beginFromPath = function () {
  if (!MC.selPath) return;
  const overwrites = S.started;
  const go = () => MC.act.newGame(MC.selPath);
  if (overwrites) {
    MC.showModal("Overwrite?", ["A save (" + S.name + ") already exists.",
      "Start over as " + S.name + " on " + MC.selPath + "? Old progress is lost."],
      [{ t: "[ KEEP OLD ]" }, { t: "[ OVERWRITE ]", cb: go }]);
  } else go();
};

// ---- bindings ----
MC.bindAll = function () {
  document.querySelectorAll(".menurow button[data-m]").forEach(b => {
    b.addEventListener("click", () => MC.showMenu(b.dataset.m));
  });
  document.addEventListener("keydown", e => {
    if ($("modalOverlay").classList.contains("open")) {
      if (e.key === "Escape") MC.hideModal();
      return;
    }
    if (!$("screen-main").classList.contains("active")) return;
    const map = { 1: "cult", 2: "gather", 3: "forge", 4: "fight", 5: "boss", 6: "char", 7: "skills" };
    if (map[e.key]) MC.showMenu(map[e.key]);
  });

  $("btnContinue").addEventListener("click", () => { MC.act.enterMain(); });
  $("btnToPath").addEventListener("click", () => {
    const v = $("inName").value.trim();
    if (v.length < 2) { $("userErr").textContent = "!! name needs 2+ chars"; return; }
    $("userErr").textContent = "";
    S.name = v;
    if (!MC.selPath) MC.selPath = S.path || "";
    $("pathNameEcho").textContent = v;
    MC.drawPaths();
    $("btnToGame").disabled = !MC.selPath;
    MC.show("screen-path");
  });
  $("btnBackUser").addEventListener("click", () => MC.show("screen-user"));
  $("btnToGame").addEventListener("click", MC.act.beginFromPath);

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

  $("btnMed").addEventListener("click", MC.act.meditate);
  $("btnBreak").addEventListener("click", () => MC.act.tryBreak(true));
  $("btnDoor").addEventListener("click", MC.act.closedDoor);
  $("btnHit").addEventListener("click", () => MC.act.combatRound(false));
  $("btnBurst").addEventListener("click", () => {
    if (S.qi < 10) { MC.log("Need 10 qi.", "b"); return; }
    S.qi -= 10;
    MC.act.combatRound(true);
  });
  $("btnFlee").addEventListener("click", () => {
    if (MC.battle) {
      MC.log("Fled from " + MC.battle.f.t + ".");
      MC.battle = null;
      MC.updateStatus(); MC.updateScene();
    }
  });
  $("btnEat").addEventListener("click", MC.act.eatHerb);
  $("btnPill").addEventListener("click", MC.act.takePill);
  $("btnSave").addEventListener("click", () => {
    MC.writeStore();
    $("saveMsg").textContent = "saved " + new Date().toLocaleTimeString();
  });
  $("btnWipe").addEventListener("click", () => {
    MC.showModal("Reset?", ["Shatter this cultivation and begin again as a mortal?"],
      [{ t: "[ KEEP ]" }, {
        t: "[ RESET ]", cb: () => {
          try { localStorage.removeItem(MC.CONFIG.SAVE_KEY); } catch (e) {}
          location.reload();
        }
      }]);
  });
  $("btnClear").addEventListener("click", () => { $("log").textContent = ""; });
  $("btnPause").addEventListener("click", () => {
    MC.paused = !MC.paused;
    $("btnPause").textContent = MC.paused ? "[RESUME]" : "[PAUSE]";
    MC.log(MC.paused ? "Paused." : "Resumed.");
  });

  $("btnExp").addEventListener("click", () => {
    const s = MC.exportSave();
    $("saveBox").value = s;
    $("saveBox").select();
    try { document.execCommand("copy"); } catch (e) {}
    if (navigator.clipboard) navigator.clipboard.writeText(s).catch(() => {});
    $("saveMsg").textContent = "save copied to box + clipboard.";
  });
  $("btnImp").addEventListener("click", () => {
    try {
      MC.importSave($("saveBox").value);
      MC.selPath = S.path;
      MC.battle = null;
      MC.act.enterMain();
      MC.log("Save imported. The heavens accept it.", "y");
    } catch (e) { $("saveMsg").textContent = "import failed: bad save string."; }
  });
};
