/* MURIM CULTIVATOR -- Phase 2: pure formulas.
   Phase 2 balance change (approved): cultRate is now multiplicative
   (~x1.9/realm) instead of additive. Everything else keeps Phase 1 math.
   Skill/rarity/rebirth/tower helpers are pure functions of (S, CONFIG). */
var MC = window.MC || {};
window.MC = MC;

MC.has = function (id) { return !!(S.skills && S.skills[id]); };

MC.rName = function () {
  return MC.REALMS[S.realm].n + " " + MC.STAGES[S.stage];
};

MC.rMax = function () {
  return Math.floor(MC.REALMS[S.realm].max * (1 + S.stage * 0.35));
};

// Effective stat of one gear piece: base x rarity x reforge levels.
MC.gearStat = function (g, k) {
  const rar = MC.RARITIES.find(r => r.id === g.rar) || MC.RARITIES[0];
  const lvl = Math.pow(1 + MC.CONFIG.UPGRADE_STEP, g.lvl || 0);
  return Math.floor((g[k] || 0) * rar.mult * lvl);
};

MC.eBonus = function (k) {
  let v = 0;
  for (const s of ["weapon", "armor", "charm"]) {
    const g = S.gear.find(x => x.uid === S.equip[s]);
    if (g) v += MC.gearStat(g, k);
  }
  return v;
};

MC.atkMult = function () {
  let m = 1;
  if (MC.has("sw1")) m *= 1.2;
  return m;
};

MC.tAtk = function () {
  const base = S.atk + (S.path === "sword" ? Math.ceil(S.atk * 0.3) : 0);
  return Math.floor(base * MC.atkMult()) + MC.eBonus("atk");
};

MC.tDef = function () {
  let d = S.def + MC.eBonus("def") + (S.path === "body" ? 3 : 0);
  if (MC.has("sw3")) d += Math.floor(MC.tAtk() * 0.15); // Sword Aura
  return d;
};

MC.tSpi = function () { return S.spi + MC.eBonus("spi"); };

// Approved curve: ~4.5/s at realm 0, ~108/s at realm 5 (before focus/door).
MC.cultRate = function () {
  const c = MC.CONFIG;
  let r = c.CULT_BASE * Math.pow(c.CULT_PER_REALM, S.realm) * (1 + S.stage * c.CULT_PER_STAGE);
  r *= (1 + S.spi * 0.02);
  if (S.path === "talisman") r *= 1.4;
  if (MC.has("ta1")) r *= 1.2;
  r *= (1 + (S.rebirths || 0) * c.REBIRTH_STEP);
  if (S.settings.focus === "cult") r *= 1.25;
  if (Date.now() < S.doorUntil) r *= 3;
  return r;
};

MC.gatherMult = function () {
  let m = 1;
  if (S.path === "alchemy") m *= 1.5;
  if (MC.has("al1")) m *= 1.25;
  m *= (1 + (S.rebirths || 0) * MC.CONFIG.REBIRTH_STEP);
  if (S.settings.focus === "gather") m *= 1.3;
  return m;
};

MC.qiRegen = function () {
  let q = MC.CONFIG.QI_REGEN + (S.path === "talisman" ? MC.CONFIG.QI_REGEN_TALISMAN : 0);
  if (MC.has("ta2")) q += S.maxQi * 0.01; // Qi Tide
  return q;
};

MC.hpRegen = function () {
  let h = S.path === "body" ? 2 : 1;
  if (MC.has("bo2")) h += Math.floor((1 - S.hp / S.maxHp) * 4); // Blood Mill
  return h;
};

MC.pillMult = function () {
  return S.path === "alchemy" ? 2 : 1;
};

MC.fightCultMult = function () {
  let m = 1;
  if (S.path === "sword") m *= 1.25;
  if (S.settings.focus === "fight") m *= 1.15;
  return m;
};

MC.fightAtk = function (burst) {
  let atk = MC.tAtk() + (burst ? 8 + S.spi * 2 : 0);
  if (S.settings.focus === "fight") atk = Math.floor(atk * 1.15);
  return atk;
};

MC.stoneChance = function () {
  return MC.CONFIG.STONE_CHANCE * (MC.has("al4") ? 2 : 1);
};

// Amendment (Phase 1): pity bonus per failure, reset on success.
MC.breakChance = function () {
  const c = MC.CONFIG;
  let ch = c.BREAK_BASE - S.realm * c.BREAK_PER_REALM + (S.pity || 0) * c.PITY_STEP;
  if (MC.has("ta3")) ch += 0.10; // Heaven Gaze
  return Math.min(1, ch);
};

MC.meditateAmt = function () { return Math.ceil(MC.cultRate() * 3); };

// Approved: seeds = floor(sqrt(totalCult / 1e4)).
MC.seedsFor = function (totalCult) {
  return Math.floor(Math.sqrt(Math.max(0, totalCult) / MC.CONFIG.SEEDS_DIVISOR));
};

MC.canRebirth = function () { return S.realm >= MC.CONFIG.REBIRTH_MIN_REALM; };

// Rarity roll: weights shift one step better per 2 realms. Pure + testable.
MC.rollRarity = function (realm, roll) {
  const shift = Math.min(3, Math.floor(realm / 2));
  const ws = MC.RARITIES.map((r, i) => {
    const from = Math.max(0, i - shift);
    return MC.RARITIES[from].w;
  });
  const tot = ws.reduce((a, b) => a + b, 0);
  let x = roll * tot;
  for (let i = 0; i < MC.RARITIES.length; i++) {
    x -= ws[i];
    if (x <= 0) return MC.RARITIES[i].id;
  }
  return "common";
};

MC.upgradeCost = function (g) {
  const l = (g.lvl || 0) + 1;
  return { ore: 3 * l, wood: 2 * l };
};

MC.sellPrice = function (g) {
  const rar = MC.RARITIES.find(r => r.id === g.rar) || MC.RARITIES[0];
  return Math.floor(10 * rar.mult * Math.pow((g.lvl || 0) + 1, 2));
};

// Endless tower: floor n foe + rewards. Exponential costs, sub-exponential
// player income via upgrades — climbing always stalls until you reforge.
MC.towerFoe = function (floor) {
  const c = MC.CONFIG;
  return {
    id: "tw" + floor, t: "Tower Warden " + floor,
    hp: Math.floor(c.TOWER_HP * Math.pow(c.TOWER_HP_GROW, floor)),
    atk: Math.floor(c.TOWER_ATK * Math.pow(c.TOWER_ATK_GROW, floor)),
    def: Math.floor(Math.pow(c.TOWER_DEF_GROW, floor)),
    cult: Math.floor(c.TOWER_CULT * Math.pow(c.TOWER_CULT_GROW, floor)),
    gold: Math.floor(c.TOWER_GOLD * Math.pow(c.TOWER_GOLD_GROW, floor)),
    loot: floor % 3 === 0 ? { core: 1 } : { ore: 2 },
    tower: floor
  };
};

MC.bar = function (cur, max, w) {
  cur = Math.max(0, cur);
  const f = Math.max(0, Math.min(w, Math.floor(cur / max * w)));
  return "[" + "#".repeat(f) + "-".repeat(w - f) + "]";
};

MC.fmtTime = function (sec) {
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
  const p = n => String(n).padStart(2, "0");
  return h > 0 ? h + "h" + p(m) + "m" + p(s) + "s" : m + "m" + p(s) + "s";
};
