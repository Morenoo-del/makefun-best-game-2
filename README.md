# makefun-best-game-2

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

[![rank](https://make.fun/badge/best-game-01/morenoo-del/makefun-best-game-2/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

[![reward](https://make.fun/badge/best-game-01/morenoo-del/makefun-best-game-2/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**Ember Grove — Warden of the Last Lantern.** A roguelite arena survivor: you are the last lantern-warden of a night grove, holding back waves of gloom until dawn breaks at 5:00. Your lantern fires on its own — you steer, gather embers, level up and choose blessings, and face the Gloom Herald before the sun returns. Six chapters of escalating foes (wisps, skitterers, spitters, brutes, wraiths), elites, a boss, and 12 stackable blessings to build around.

## Play it

Move with **WASD** or the **arrow keys**. The lantern auto-fires at the nearest foe. Gather embers to level up and pick 1 of 3 blessing cards (click, or press 1 / 2 / 3). **P** pauses, **M** mutes. Survive 5:00 to win; fall and the light goes out.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 — no build step, no network, plain static files under `game/`.

## How it is built

- `game/index.html` — the page, one canvas, no external requests
- `game/src/main.js` — boot, fixed 60 Hz loop, state machine
- `game/src/entities.js` — player, foes, bolts, embers, particles
- `game/src/world.js` — spawning, waves, chapters, the boss, the dawn timer
- `game/src/upgrades.js` — the 12 lantern blessings and level-up draws
- `game/src/render.js` — the grove, the lantern glow, HUD and all screens
- `game/src/shots.js` — deterministic `?shot=` scenes for the screenshots
- `game/src/rng.js` — seeded random numbers · `game/src/audio.js` — synth sound effects · `game/src/input.js` — keyboard and mouse

Screenshots in `screenshots/` are real renders of the game's own code: title, play, level-up and victory.

---

<sub>Entered on [make.fun](https://make.fun/?ref=w6xj1ecj&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
