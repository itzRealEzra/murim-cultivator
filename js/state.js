/* MURIM CULTIVATOR -- Phase 2: state, save v3, offline gains.
   S is the only game state. Runtime-only values (battle, pause, modal
   queue) live on MC, never in S, so saves stay serializable. */
var MC = window.MC || {};
window.MC = MC;

MC.DEFAULT_SETTINGS = function () {
  return { focus: "cult", autoCult: true, autoBreak: true, autoGather: true,
    autoFight: false, autoHeal: true, autoTower: false };
};

MC.DEFAULT = function () {
  return {
    v: MC.CONFIG.SAVE_V,
    name: "", path: "",
    realm: 0, stage: 0, cult: 0,
    totalCult: 0,    // this run's gross cult (seeds preview + rebirth payout)
    lifetimeCult: 0, // banked across rebirths
    pity: 0,
    seeds: 0,        // permanent prestige currency
    rebirths: 0,
    skills: {},      // id -> true, permanent across rebirths
    tower: 0,        // highest endless-tower floor cleared (this run)
    hp: 100, maxHp: 100, qi: 20, maxQi: 20,
    atk: 5, def: 2, spi: 1, gold: 20, stones: 0,
    kills: 0, bosses: [],
    inv: { herb: 3, ore: 2, wood: 3, core: 0, pill: 1, bigpill: 0 },
    frac: { herb: 0, ore: 0, wood: 0, core: 0 },
    gear: [], equip: { weapon: null, armor: null, charm: null },
    settings: MC.DEFAULT_SETTINGS(),
    doorUntil: 0, elapsed: 0,
    lastSeen: Date.now(), started: false
  };
};

// v2 -> v3: seeds/skills/tower/charm-slot/gear-rarity. Old gear had no
// rar/lvl and no charm slot; default them so old saves keep their stats.
MC.migrate = function (raw) {
  const d = Object.assign(MC.DEFAULT(), raw || {});
  d.inv = Object.assign(MC.DEFAULT().inv, (raw && raw.inv) || {});
  d.frac = Object.assign(MC.DEFAULT().frac, (raw && raw.frac) || {});
  d.equip = Object.assign({ weapon: null, armor: null, charm: null }, (raw && raw.equip) || {});
  d.settings = Object.assign(MC.DEFAULT_SETTINGS(), (raw && raw.settings) || {});
  if (!Array.isArray(d.gear)) d.gear = [];
  d.gear = d.gear.map(g => Object.assign({ rar: "common", lvl: 0 }, g));
  if (!Array.isArray(d.bosses)) d.bosses = [];
  if (!d.skills || typeof d.skills !== "object") d.skills = {};
  for (const k of ["realm", "stage", "cult", "totalCult", "lifetimeCult", "pity", "seeds",
    "rebirths", "tower", "hp", "maxHp", "qi", "maxQi", "atk", "def", "spi", "gold",
    "stones", "kills", "doorUntil", "elapsed"]) {
    if (typeof d[k] !== "number" || isNaN(d[k])) d[k] = MC.DEFAULT()[k];
  }
  if (typeof d.name !== "string") d.name = "";
  if (typeof d.path !== "string") d.path = "";
  d.v = MC.CONFIG.SAVE_V;
  return d;
};

MC.readStore = function () {
  try {
    const r = localStorage.getItem(MC.CONFIG.SAVE_KEY);
    if (!r) return MC.DEFAULT();
    return MC.migrate(JSON.parse(r));
  } catch (e) { return MC.DEFAULT(); }
};

MC.writeStore = function () {
  S.lastSeen = Date.now();
  try { localStorage.setItem(MC.CONFIG.SAVE_KEY, JSON.stringify(S)); } catch (e) {}
};

// Offline gains use the same live formulas, gated by the player's own
// auto toggles, capped at 8h. Spirit Scribes (+25%) applies if learned.
MC.computeOffline = function () {
  const c = MC.CONFIG;
  const away = Math.min((Date.now() - (S.lastSeen || Date.now())) / 1000, c.OFFLINE_CAP_SEC);
  if (!S.started || away < c.OFFLINE_MIN_SEC) return null;
  const scribes = (S.skills && S.skills.ta4) ? 1.25 : 1;
  const sum = { secs: Math.floor(away), cult: 0, gold: 0, mats: {} };
  if (S.settings.autoCult) {
    const wasDoor = S.doorUntil;
    S.doorUntil = 0; // any door active at save time expired while away
    const gain = Math.floor(MC.cultRate() * away * scribes);
    S.doorUntil = wasDoor > Date.now() ? wasDoor : 0;
    sum.cult = gain;
    S.cult += gain;
    S.totalCult += gain;
  }
  if (S.settings.autoGather) {
    for (const n of MC.NODES) {
      const amt = n.rate * MC.gatherMult() * away * scribes;
      const whole = Math.floor(amt);
      S.frac[n.id] = (S.frac[n.id] || 0) + (amt - whole);
      let extra = 0;
      while (S.frac[n.id] >= 1) { S.frac[n.id] -= 1; extra += 1; }
      const total = whole + extra;
      if (total > 0) {
        S.inv[n.id] = (S.inv[n.id] || 0) + total;
        const cc = Math.floor(n.cult * total * scribes);
        S.cult += cc; S.totalCult += cc;
        sum.mats[n.id] = total;
      }
    }
  }
  sum.gold = Math.floor(away * c.GOLD_OFFLINE);
  S.gold += sum.gold;
  return sum;
};

MC.exportSave = function () {
  MC.writeStore();
  return btoa(unescape(encodeURIComponent(JSON.stringify(S))));
};

MC.importSave = function (str) {
  const clean = String(str || "").trim();
  if (!clean) throw new Error("empty");
  const obj = JSON.parse(decodeURIComponent(escape(atob(clean))));
  const m = MC.migrate(obj);
  if (!m.started && !m.name) throw new Error("not a game save");
  S = m;
  MC.writeStore();
  return true;
};

// Reincarnation: bank this run's cult, pay out seeds, reset the run but
// keep name/path/skills/seeds/stones. Skill-granted MaxHP is re-applied.
MC.doRebirth = function () {
  const seeds = MC.seedsFor(S.totalCult);
  S.lifetimeCult += S.totalCult;
  S.seeds += seeds;
  S.rebirths += 1;
  const keep = { name: S.name, path: S.path, skills: S.skills, seeds: S.seeds,
    rebirths: S.rebirths, lifetimeCult: S.lifetimeCult, stones: S.stones,
    elapsed: S.elapsed, settings: S.settings };
  const fresh = MC.DEFAULT();
  S = Object.assign(fresh, keep);
  S.v = MC.CONFIG.SAVE_V;
  S.started = true;
  MC.act.applyPath(S.path);
  if (S.skills.bo1) { S.maxHp += 30; S.hp = S.maxHp; }
  if (S.skills.bo4) { S.maxHp += 120; S.hp = S.maxHp; }
  MC.battle = null;
  MC.markListsDirty();
  MC.writeStore();
  return seeds;
};

// Runtime-only (never saved): battle, pause, selection, scene pos, dirty flags.
MC.battle = null;
MC.paused = false;
MC.selPath = "";
MC.posX = 4;
MC.pendingOffline = null;
MC.dirty = { lists: true };
MC.markListsDirty = function () { MC.dirty.lists = true; };

let S = MC.readStore();
if (S.started) MC.pendingOffline = MC.computeOffline();

MC.saveQuiet = function () { MC.writeStore(); };
