/* MURIM CULTIVATOR -- Phase 1: fixed-timestep idle loop + boot.
   Fix 8: progress integrates real elapsed dt in 1s steps, so a throttled
   background tab catches up instead of stalling. TICK shows S.elapsed. */
var MC = window.MC || {};
window.MC = MC;

// One simulation second. Same order and math as the prototype loop.
MC.step = function () {
  S.elapsed += 1;
  if (S.settings.autoCult) {
    MC.act.gainCult(MC.cultRate());
    S.qi = Math.min(S.maxQi, S.qi + MC.qiRegen());
  }
  if (S.elapsed % 2 === 0) S.hp = Math.min(S.maxHp, S.hp + MC.hpRegen());
  if (S.settings.autoGather) {
    for (const n of MC.NODES) {
      S.frac[n.id] += n.rate * MC.gatherMult();
      if (n.id === "core" && S.frac[n.id] >= 1 && MC.tAtk() < 8 && Math.random() < 0.2) {
        S.frac[n.id] = 0;
        S.hp = Math.max(1, S.hp - 8);
        MC.log("Idle hunt wound. -8 HP.", "b");
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
    MC.log("Auto-ate herb. +25 HP.");
    MC.markListsDirty();
  }
  if (S.settings.autoBreak && S.cult >= MC.rMax()) MC.act.tryBreak(false);
};

MC.startLoop = function () {
  let last = performance.now(), acc = 0, saveAcc = 0;
  setInterval(() => {
    if (!S.started || MC.paused) { last = performance.now(); acc = 0; return; }
    const now = performance.now();
    let dt = (now - last) / 1000;
    last = now;
    if (dt < 0) dt = 0;
    if (dt > MC.CONFIG.MAX_CATCHUP_SEC) dt = MC.CONFIG.MAX_CATCHUP_SEC;
    acc += dt;
    let n = 0;
    while (acc >= 1 && n < MC.CONFIG.MAX_CATCHUP_SEC) {
      MC.step();
      acc -= 1; n++;
      if (!S.started) break;
    }
    if (acc >= 1) acc = 0; // shed absurd backlog; offline summary covers real absence
    saveAcc += dt;
    if (saveAcc >= MC.CONFIG.AUTOSAVE_SEC) { saveAcc = 0; MC.writeStore(); }
    MC.updateStatus();
    MC.updateRates();
    MC.updateLists();
    MC.updateScene();
  }, MC.CONFIG.LOOP_MS);
  window.addEventListener("beforeunload", () => { if (S.started) MC.writeStore(); });
};

// ---- boot ----
MC.bindAll();
if (S.started) {
  $("inName").value = S.name || "";
  const c = $("btnContinue");
  c.style.display = "";
  c.textContent = "[ CONTINUE AS " + S.name + " ]";
  $("hasSave").textContent = "save found: " + S.name + " [" + S.path + "] realm " +
    MC.REALMS[S.realm].n + " -- continue, or enter a name for a new game.";
  MC.selPath = S.path;
  $("pathNameEcho").textContent = S.name;
  MC.drawPaths();
} else {
  $("btnContinue").style.display = "none";
  MC.drawPaths();
}
MC.startLoop();
