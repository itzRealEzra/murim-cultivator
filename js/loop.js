/* Murim Cultivator — fixed-timestep idle loop + boot.
   Progress integrates real elapsed time in 1s steps, so a throttled
   background tab catches up instead of stalling. */
var MC = window.MC || {};
window.MC = MC;

// One simulation second. Order and math unchanged.
MC.step = function () {
  S.elapsed += 1;
  if (S.settings.autoCult) {
    MC.act.gainCult(MC.cultRate());
    S.qi = Math.min(S.maxQi, S.qi + MC.qiRegen());
  }
  if (S.elapsed % 2 === 0) S.hp = Math.min(S.maxHp, S.hp + MC.hpRegen());
  if (S.settings.autoGather) {
    for (var i = 0; i < MC.NODES.length; i++) {
      var n = MC.NODES[i];
      S.frac[n.id] += n.rate * MC.gatherMult();
      if (n.id === "core" && S.frac[n.id] >= 1 && MC.tAtk() < 8 && Math.random() < 0.2) {
        S.frac[n.id] = 0;
        S.hp = Math.max(1, S.hp - 8);
        MC.log("Idle hunt wound. Eight health lost.", "bad", "combat");
      } else {
        while (S.frac[n.id] >= 1) {
          S.frac[n.id] -= 1;
          S.inv[n.id] += 1;
          if (MC.has("al2") && Math.random() < 0.2) S.inv[n.id] += 1; // Cauldron Echo
          MC.act.gainCult(n.cult);
        }
      }
    }
  }
  if (MC.battle && S.settings.autoFight && S.elapsed % 2 === 0) {
    if (S.qi >= 10 && Math.random() < 0.3) { S.qi -= 10; MC.act.combatRound(true); }
    else MC.act.combatRound(false);
  }
  if (S.settings.autoHeal && S.hp < S.maxHp * 0.4 && S.inv.herb > 0) {
    S.inv.herb--;
    S.hp = Math.min(S.maxHp, S.hp + 25);
    MC.log("Ate a herb unattended. +25 health.", "", "sys");
    MC.markListsDirty();
  }
  if (S.settings.autoBreak && S.cult >= MC.rMax()) MC.act.tryBreak(false);
};

MC.startLoop = function () {
  var last = performance.now(), acc = 0, saveAcc = 0;
  setInterval(function () {
    if (!S.started || MC.paused) { last = performance.now(); acc = 0; return; }
    var now = performance.now();
    var dt = (now - last) / 1000;
    last = now;
    if (dt < 0) dt = 0;
    if (dt > MC.CONFIG.MAX_CATCHUP_SEC) dt = MC.CONFIG.MAX_CATCHUP_SEC;
    acc += dt;
    var n = 0;
    while (acc >= 1 && n < MC.CONFIG.MAX_CATCHUP_SEC) {
      MC.step();
      acc -= 1; n++;
      if (!S.started) break;
    }
    if (acc >= 1) acc = 0; // shed absurd backlog; the offline reckoning covers real absence
    saveAcc += dt;
    if (saveAcc >= (S.settings.autosaveSec || MC.CONFIG.AUTOSAVE_SEC)) { saveAcc = 0; MC.writeStore(); }
    MC.updateStatus();
    MC.updateRates();
    MC.updateLists();
    MC.updateScene();
  }, MC.CONFIG.LOOP_MS);
  window.addEventListener("beforeunload", function () { if (S.started) MC.writeStore(); });
};

// ---- boot ----
MC.cacheDom();
MC.bindAll();
MC.applyUI();
MC.buildStage($("stageMount"));
if (S.started) {
  $("inName").value = S.name || "";
  var c = $("btnContinue");
  c.hidden = false;
  c.textContent = "Continue as " + S.name;
  $("hasSave").textContent = "On the shelf: " + S.name + ", " + S.path + ", " +
    MC.REALMS[S.realm].n + ". Continue, or write a name for a new life.";
  MC.selPath = S.path;
  $("pathNameEcho").textContent = S.name;
  MC.drawPaths();
  /* Returning to earned gains skips the title page: the reckoning is
     shown once, on load, as specified. */
  if (MC.pendingOffline) MC.act.enterMain();
} else {
  $("btnContinue").hidden = true;
  MC.drawPaths();
}
MC.startLoop();
