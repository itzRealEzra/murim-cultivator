# Murim Cultivator — Changelog

## v3-phase5 — lobby, III sidebar, cultivate panel with centered sprite
### Added
- `js/avatar.js`: layered inline SVG avatar (feet-anchored origin, named
  groups), `renderAvatar({pose, door, realm, path})`, mote rAF loop paused
  when hidden, burst/shake answers, realm aura (extra ring at Core
  Formation, halo at Dao Ascension), path props (blade, shoulders/wraps,
  gourd, orbiting slips), live `aria-label`.
- `js/router.js`: `showScreen("user" | "path" | "lobby" | "cultivate")`.
- Lobby: full-bleed dimmed scene, plate, 360px bars, one 280x72 Cultivate
  button with ready mark, next-goal line, footer.
- III drawer (260px, backdrop, focus trap + restore, Here labels,
  focusable Coming-soon entries), Settings/Help modals from the HUD.
- Cultivate panel: centered 300px sprite, focus cards, rate chips,
  Meditate/Breakthrough/Closed-door, two switches, need line, 520px bars.
- `CHANGELOG.md` (this file).
### Changed
- Space/Enter open Cultivate on the lobby, act in the panel; Escape
  closes drawer then modals; all number-key handlers removed.
- Help text describes the lobby and the III menu. Tips retargeted to the
  two visible controls. Goal line opens Cultivate or does nothing.
- Chronicle panel removed; `MC.log` keeps a capped in-memory record.
### Fixed
- Boot no longer touches the removed `#stageMount` node.
- Rebirth keeps working underneath (logic kept, UI returns later).
### Deleted
- Dashboard UI: HUD/currency/stat chips, Next strip markup, tab strip and
  tablist roles, all panels (Cultivate/Gather/Forge/Fight/Boss/Character/
  Skills/Settings/Chronicle) and their CSS, action/autobars, journal
  drawer, portrait builder, skill tree, gear/skill/record builders,
  tab badges. Save schema untouched (S.ui.panel stays in saves, ignored).

## v3-phase4 — one-screen compact dashboard (1920x1080)
- HUD with in-bar numbers, Next strip, card panels, offline modal,
  Settings tab with typed RESET, onboarding hints, toasts, floats.
- Save guards: dirty-checked autosave, yield-to-external-edit, wipe flag.

## v3-phase3 — game HUD, animated stage, action bar, card panels
- Animated SVG ink-wash stage with event bus, foe plates, slash/burst/
  crit effects; S.ui preferences with v5 migration; offline summary.

## v3-phase2 — prestige, skill tree, gear rarity, charms, endless tower
- Reincarnation with Dao Seeds, 16-node technique tree, rarity + reforge,
  charm slot, tower; multiplicative cultivation curve (save v3).

## v3-phase1 — fixes + architecture split
- Targeted updaters, S.settings as source of truth, textContent-only
  rendering, Continue/New Game, versioned saves, live-formula offline
  gains, fixed-timestep loop, boss per realm (save v2).
