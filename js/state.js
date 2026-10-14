/* Murim Cultivator — state, save v5, offline gains.
   S is the only game state. Runtime-only values (battle, pause, modal
   queue, offline summary) live on MC, never in S, so saves stay clean. */
var MC = window.MC || {};
window.MC = MC;

/* Display and onboarding preferences. Gameplay toggles stay in settings. */
MC.DEFAULT_UI = function () {
  var night = false;
  try {
    night = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch (e) {}
  return { panel: "cult", theme: night ? "night" : "day", textSize: "m",
    reduceMotion: false, hintsDone: false, logFilter: "all", sound: false };
};

MC.DEFAULT_SETTINGS = function () {
  return { focus: "cult", autoCult: true, autoBreak: true, autoGather: true,
    autoFight: false, autoHeal: true, autoTower: false,
    numFmt: "compact", autosaveSec: 5 };
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
    ui: MC.DEFAULT_UI(),
    breakthroughDone: false,
    doorUntil: 0, elapsed: 0,
    lastSeen: Date.now(), started: false
  };
};

/* v5: display prefs move from settings into S.ui. Old keys are dropped so
   the two copies can never disagree. Old saves load untouched otherwise. */
MC.migrate = function (raw) {
  var d = Object.assign(MC.DEFAULT(), raw || {});
  d.inv = Object.assign(MC.DEFAULT().inv, (raw && raw.inv) || {});
  d.frac = Object.assign(MC.DEFAULT().frac, (raw && raw.frac) || {});
  d.equip = Object.assign({ weapon: null, armor: null, charm: null }, (raw && raw.equip) || {});
  var oldS = (raw && raw.settings) || {};
  d.settings = Object.assign(MC.DEFAULT_SETTINGS(), oldS);
  delete d.settings.theme; delete d.settings.textSize; delete d.settings.reduceMotion;
  delete d.settings.logFilter; delete d.settings.lastPanel; delete d.settings.muted;
  var du = MC.DEFAULT_UI();
  if (raw && raw.ui && typeof raw.ui === "object") {
    d.ui = Object.assign(du, raw.ui);
  } else {
    d.ui = du;
    if (typeof oldS.theme === "string") d.ui.theme = oldS.theme;
    if (typeof oldS.textSize === "string") d.ui.textSize = oldS.textSize;
    if (typeof oldS.reduceMotion === "boolean") d.ui.reduceMotion = oldS.reduceMotion;
    if (typeof oldS.logFilter === "string") d.ui.logFilter = oldS.logFilter;
    if (typeof oldS.lastPanel === "string") d.ui.panel = oldS.lastPanel;
    if (typeof oldS.muted === "boolean") d.ui.sound = !oldS.muted;
    if (raw && (raw.hintsOff === true || raw.breakthroughDone === true)) d.ui.hintsDone = true;
  }
  if (["cult", "gather", "forge", "fight", "boss", "skills", "char", "settings"].indexOf(d.ui.panel) < 0) {
    d.ui.panel = "cult";
  }
  if (["day", "night"].indexOf(d.ui.theme) < 0) d.ui.theme = du.theme;
  if (["s", "m", "l"].indexOf(d.ui.textSize) < 0) d.ui.textSize = "m";
  if (!Array.isArray(d.gear)) d.gear = [];
  d.gear = d.gear.map(function (g) { return Object.assign({ rar: "common", lvl: 0 }, g); });
  if (!Array.isArray(d.bosses)) d.bosses = [];
  if (!d.skills || typeof d.skills !== "object") d.skills = {};
  var nums = ["realm", "stage", "cult", "totalCult", "lifetimeCult", "pity", "seeds",
    "rebirths", "tower", "hp", "maxHp", "qi", "maxQi", "atk", "def", "spi", "gold",
    "stones", "kills", "doorUntil", "elapsed"];
  for (var i = 0; i < nums.length; i++) {
    if (typeof d[nums[i]] !== "number" || isNaN(d[nums[i]])) d[nums[i]] = MC.DEFAULT()[nums[i]];
  }
  if (typeof d.name !== "string") d.name = "";
  if (typeof d.path !== "string") d.path = "";
  if (typeof d.breakthroughDone !== "boolean") {
    d.breakthroughDone = (d.stage > 0 || d.realm > 0 || (d.rebirths || 0) > 0);
  }
  delete d.hintsOff;
  d.v = MC.CONFIG.SAVE_V;
  return d;
};

MC.readStore = function () {
  try {
    var r = localStorage.getItem(MC.CONFIG.SAVE_KEY);
    if (!r) return MC.DEFAULT();
    return MC.migrate(JSON.parse(r));
  } catch (e) { return MC.DEFAULT(); }
};

MC.writeStore = function () {
  S.lastSeen = Date.now();
  try { localStorage.setItem(MC.CONFIG.SAVE_KEY, JSON.stringify(S)); } catch (e) {}
};

/* Offline gains use the same live formulas, gated by the player's own
   auto toggles, capped at 8h. Spirit Scribes (+25%) applies if learned. */
MC.computeOffline = function () {
  var c = MC.CONFIG;
  var away = Math.min((Date.now() - (S.lastSeen || Date.now())) / 1000, c.OFFLINE_CAP_SEC);
  if (!S.started || away < c.OFFLINE_MIN_SEC) return null;
  var scribes = (S.skills && S.skills.ta4) ? 1.25 : 1;
  var sum = { secs: Math.floor(away), cult: 0, gold: 0, mats: {} };
  if (S.settings.autoCult) {
    var wasDoor = S.doorUntil;
    S.doorUntil = 0; // any door active at save time expired while away
    var gain = Math.floor(MC.cultRate() * away * scribes);
    S.doorUntil = wasDoor > Date.now() ? wasDoor : 0;
    sum.cult = gain;
    S.cult += gain;
    S.totalCult += gain;
  }
  if (S.settings.autoGather) {
    for (var ni = 0; ni < MC.NODES.length; ni++) {
      var n = MC.NODES[ni];
      var amt = n.rate * MC.gatherMult() * away * scribes;
      var whole = Math.floor(amt);
      S.frac[n.id] = (S.frac[n.id] || 0) + (amt - whole);
      var extra = 0;
      while (S.frac[n.id] >= 1) { S.frac[n.id] -= 1; extra += 1; }
      var total = whole + extra;
      if (total > 0) {
        S.inv[n.id] = (S.inv[n.id] || 0) + total;
        var cc = Math.floor(n.cult * total * scribes);
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
  var clean = String(str || "").trim();
  if (!clean) throw new Error("empty");
  var obj = JSON.parse(decodeURIComponent(escape(atob(clean))));
  var m = MC.migrate(obj);
  if (!m.started && !m.name) throw new Error("not a game save");
  S = m;
  MC.writeStore();
  return true;
};

/* Reincarnation: bank this run's cult, pay out seeds, reset the run but
   keep name/path/skills/seeds/stones/ui. Skill-granted MaxHP is re-applied. */
MC.doRebirth = function () {
  var seeds = MC.seedsFor(S.totalCult);
  S.lifetimeCult += S.totalCult;
  S.seeds += seeds;
  S.rebirths += 1;
  var keep = { name: S.name, path: S.path, skills: S.skills, seeds: S.seeds,
    rebirths: S.rebirths, lifetimeCult: S.lifetimeCult, stones: S.stones,
    elapsed: S.elapsed, settings: S.settings, ui: S.ui };
  var fresh = MC.DEFAULT();
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
MC.offlineSummary = null;
MC.dirty = { lists: true };
MC.markListsDirty = function () { MC.dirty.lists = true; };

var S = MC.readStore();
if (S.started) {
  /* Read-only hook: capture what the existing calculation produced. */
  var rawAway = (Date.now() - (S.lastSeen || Date.now())) / 1000;
  var produced = MC.computeOffline();
  if (produced) {
    MC.offlineSummary = { secs: produced.secs,
      capped: rawAway > MC.CONFIG.OFFLINE_CAP_SEC,
      cult: produced.cult, gold: produced.gold, mats: produced.mats };
  }
  MC.pendingOffline = produced;
}

MC.saveQuiet = function () { MC.writeStore(); };
