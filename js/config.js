/* MURIM CULTIVATOR -- Phase 1: config + content data.
   All tunables live in CONFIG. Balance untouched in Phase 1. */
var MC = window.MC || {};
window.MC = MC;

MC.CONFIG = {
  SAVE_KEY: "murim_v2",
  SAVE_V: 4,
  OFFLINE_CAP_SEC: 8 * 3600,
  OFFLINE_MIN_SEC: 60,
  AUTOSAVE_SEC: 5,
  LOOP_MS: 250,          // accumulator granularity; progress applied in 1s steps
  MAX_CATCHUP_SEC: 3600, // cap per foreground interval; bigger gaps = offline summary
  BREAK_BASE: 0.75,      // base breakthrough chance
  BREAK_PER_REALM: 0.05, // chance lost per realm index
  PITY_STEP: 0.08,       // +8% per consecutive failure, reset on success
  QI_REGEN: 0.6,         // per second while auto-cultivating
  QI_REGEN_TALISMAN: 0.4,// extra for talisman path
  GOLD_OFFLINE: 0.15,    // per second while away (no live gold income exists yet)
  LOG_CAP: 150,
  // Phase 2 tunables
  CULT_BASE: 4.5,        // cult/s at realm 0 before mults (target ~4.5 -> ~108 at realm 5)
  CULT_PER_REALM: 1.9,   // multiplicative growth per realm
  CULT_PER_STAGE: 0.12,  // +12% per stage within a realm
  SEEDS_DIVISOR: 1e4,    // seeds = floor(sqrt(totalCult / SEEDS_DIVISOR))
  REBIRTH_MIN_REALM: 5,  // must reach Dao Ascension to reincarnate
  REBIRTH_STEP: 0.05,    // +5% cult+gather per past rebirth
  UPGRADE_MAX: 9,        // max reforge level per gear piece
  UPGRADE_STEP: 0.12,    // +12% stats per level (multiplicative)
  STONE_CHANCE: 0.25,    // base spirit-stone drop on kill
  TOWER_HP: 60, TOWER_HP_GROW: 1.16,
  TOWER_ATK: 4, TOWER_ATK_GROW: 1.13,
  TOWER_DEF_GROW: 1.10,
  TOWER_CULT: 20, TOWER_CULT_GROW: 1.15,
  TOWER_GOLD: 10, TOWER_GOLD_GROW: 1.13
};

MC.REALMS = [
  { n: "Qi Condensation", max: 100 },
  { n: "Foundation Establishment", max: 250 },
  { n: "Core Formation", max: 600 },
  { n: "Nascent Soul", max: 1200 },
  { n: "Spirit Severing", max: 2500 },
  { n: "Dao Ascension", max: 6000 }
];
MC.STAGES = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];

MC.PATHS = [
  { id: "sword", t: "SWORD PATH", d: "Wuxia blade. +30% ATK, +25% fight loot cult.", b: "+ATK / combat" },
  { id: "body", t: "BODY PATH", d: "+40 MaxHP, +3 DEF, faster HP regen.", b: "+HP / DEF" },
  { id: "alchemy", t: "ALCHEMY PATH", d: "+50% gather yield, pills 2x effect.", b: "+gather / pills" },
  { id: "talisman", t: "TALISMAN PATH", d: "+40% cultivation speed, +MaxQi.", b: "+cult / qi" }
];

MC.NODES = [
  { id: "herb", t: "Herb Garden", rate: 0.6, cult: 0.2, desc: "pick spirit herbs" },
  { id: "ore", t: "Iron Mine", rate: 0.5, cult: 0.2, desc: "dig black iron" },
  { id: "wood", t: "Thunder Forest", rate: 0.5, cult: 0.2, desc: "cut thunder wood" },
  { id: "core", t: "Beast Wastes", rate: 0.15, cult: 0.6, desc: "hunt cores (risky)" }
];

MC.RECIPES = [
  { id: "wsw", t: "Wooden Sword", c: { wood: 5 }, atk: 3, def: 0, slot: "weapon", d: "+3 ATK" },
  { id: "ibl", t: "Iron Qi Blade", c: { ore: 8, wood: 3 }, atk: 8, def: 1, slot: "weapon", d: "+8 ATK +1 DEF" },
  { id: "robe", t: "Herb Robe", c: { herb: 8, wood: 4 }, atk: 0, def: 6, hp: 20, slot: "armor", d: "+6 DEF +20 HP" },
  { id: "pill", t: "Qi Pill x2", c: { herb: 10 }, pill: 2, d: "restore qi +50 cult" },
  { id: "sarm", t: "Spirit Armor", c: { ore: 12, core: 1 }, atk: 2, def: 14, hp: 50, slot: "armor", d: "+14 DEF +50 HP" },
  { id: "fly", t: "Thunder Sword", c: { ore: 20, wood: 10, core: 3 }, atk: 25, def: 5, slot: "weapon", d: "+25 ATK" },
  { id: "bpill", t: "Core Pill x2", c: { core: 2, herb: 6 }, bigpill: 2, d: "+200 cult each" },
  { id: "halb", t: "Dragon Halberd", c: { ore: 40, wood: 20, core: 8 }, atk: 60, def: 15, slot: "weapon", d: "+60 ATK endgame" },
  { id: "jade", t: "Jade Charm", c: { herb: 12, ore: 6 }, spi: 1, slot: "charm", d: "+1 SPI" },
  { id: "bjade", t: "Blood Jade", c: { core: 3, ore: 10 }, spi: 2, hp: 30, slot: "charm", d: "+2 SPI +30 HP" },
  { id: "seal", t: "Heaven Seal", c: { core: 6, ore: 25, wood: 15 }, spi: 4, atk: 10, slot: "charm", d: "+4 SPI +10 ATK" }
];

MC.FOES = [
  { id: "boar", t: "Ironhide Boar", hp: 40, atk: 4, def: 1, cult: 15, gold: 8, loot: { herb: 2 } },
  { id: "bandit", t: "River Bandit", hp: 70, atk: 7, def: 2, cult: 30, gold: 18, loot: { wood: 3 } },
  { id: "toad", t: "Mire Toad", hp: 110, atk: 10, def: 3, cult: 55, gold: 25, loot: { herb: 4 } },
  { id: "wolf", t: "Demon Wolf", hp: 180, atk: 15, def: 5, cult: 100, gold: 45, loot: { core: 1 } },
  { id: "puppet", t: "Puppet Guardian", hp: 300, atk: 22, def: 9, cult: 180, gold: 80, loot: { ore: 5 } },
  { id: "traitor", t: "Sect Traitor", hp: 480, atk: 32, def: 12, cult: 300, gold: 150, loot: { core: 2, ore: 3 } }
];

// Phase 2: gear rarity. Weights shift toward better drops at higher realms.
MC.RARITIES = [
  { id: "common", t: "common", mult: 1.0, w: 60 },
  { id: "fine", t: "fine", mult: 1.3, w: 25 },
  { id: "superior", t: "superior", mult: 1.7, w: 11 },
  { id: "mythic", t: "mythic", mult: 2.2, w: 4 }
];

// Phase 2: skill tree. 16 nodes in 4 path chains; each chain must be
// learned in order. Cost is EITHER stones OR seeds. Starred nodes are the
// path-unique mechanics (see viability note in the Phase 2 changelog).
MC.SKILLS = [
  { id: "sw1", path: "sword", t: "Whetstone Sutra", d: "+20% ATK.", cost: { stones: 5 } },
  { id: "sw2", path: "sword", t: "Heart Sword", d: "UNIQUE: every 6th strike deals double damage.", cost: { stones: 20 } },
  { id: "sw3", path: "sword", t: "Sword Aura", d: "15% of ATK counts as DEF.", cost: { seeds: 1 } },
  { id: "sw4", path: "sword", t: "Thunder Draw", d: "UNIQUE: opening strike of each battle +100%.", cost: { seeds: 3 } },
  { id: "bo1", path: "body", t: "Iron Shirt", d: "+30 MaxHP, +2 DEF.", cost: { stones: 5 } },
  { id: "bo2", path: "body", t: "Blood Mill", d: "UNIQUE: regen +1 HP/s per 25% missing HP.", cost: { stones: 20 } },
  { id: "bo3", path: "body", t: "Stone Skin", d: "UNIQUE: reflect 20% of damage taken.", cost: { seeds: 1 } },
  { id: "bo4", path: "body", t: "Giant Frame", d: "+120 MaxHP.", cost: { seeds: 3 } },
  { id: "al1", path: "alchemy", t: "Herb Lore", d: "+25% gather yield.", cost: { stones: 5 } },
  { id: "al2", path: "alchemy", t: "Cauldron Echo", d: "UNIQUE: 20% chance to double gather and craft yields.", cost: { stones: 20 } },
  { id: "al3", path: "alchemy", t: "Pill Veins", d: "UNIQUE: pills also restore 40 HP.", cost: { seeds: 1 } },
  { id: "al4", path: "alchemy", t: "Stone Sight", d: "Spirit-stone drops doubled.", cost: { seeds: 3 } },
  { id: "ta1", path: "talisman", t: "Ink Sutra", d: "+20% cultivation.", cost: { stones: 5 } },
  { id: "ta2", path: "talisman", t: "Qi Tide", d: "UNIQUE: qi regen +1% of MaxQi per second.", cost: { stones: 20 } },
  { id: "ta3", path: "talisman", t: "Heaven Gaze", d: "UNIQUE: +10% breakthrough chance.", cost: { seeds: 1 } },
  { id: "ta4", path: "talisman", t: "Spirit Scribes", d: "+25% offline gains.", cost: { seeds: 3 } }
];
MC.BOSSES = [
  { id: "b0", t: "Young Master Feng", hp: 250, atk: 14, def: 4, cult: 200, gold: 120, loot: { core: 2 }, realm: 0 },
  { id: "b1", t: "Stone Golem King", hp: 650, atk: 28, def: 12, cult: 600, gold: 300, loot: { ore: 10 }, realm: 1 },
  { id: "b2", t: "Blood Patriarch", hp: 1400, atk: 45, def: 18, cult: 1300, gold: 700, loot: { core: 6 }, realm: 2 },
  { id: "b3", t: "Hollow Moon Warden", hp: 3000, atk: 70, def: 25, cult: 3000, gold: 1500, loot: { core: 12 }, realm: 3 },
  { id: "b4", t: "Pale Moon Matriarch", hp: 5200, atk: 95, def: 34, cult: 5200, gold: 2600, loot: { core: 8 }, realm: 4 },
  { id: "b5", t: "Nine Serpent Elder", hp: 9000, atk: 130, def: 44, cult: 9000, gold: 4200, loot: { core: 12 }, realm: 5 },
  { id: "trib", t: "Great Heavenly Tribulation", hp: 14000, atk: 170, def: 55, cult: 15000, gold: 8000, loot: { core: 16 }, realm: 5 }
];
