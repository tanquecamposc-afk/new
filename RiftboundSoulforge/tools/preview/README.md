# Visual preview (no Roblox needed)

Approximate screenshots of the world without opening Studio:

1. `export_world.luau` runs the REAL world builders (`World/Nexus`, `Emberfall`, `Models`,
   `TerrainGen`) inside a stubbed Roblox API and prints every part + terrain fill as JSON:
   `tools/luau-check/target/release/luau-check test tools/preview/export_world.luau src > raw.txt`
   (copy the text between `JSONSTART` and `JSONEND` into `world.json` next to `index.html`).
2. `index.html` renders it with Three.js (bloom, shadows, fog, approximated materials, grass
   decoration, sample VFX and a HUD overlay). `npm i three@0.169.0 playwright@1.48.2`.
3. `node shoot.mjs nexus,plaza,frontier,combat,ravine,keep,arena` writes `shot_<view>.png`.

It is NOT a Roblox render: lighting/material look differ, players are stand-in mannequins and
the VFX/HUD are illustrative. Geometry, positions and colours are exactly what the game builds.
It already caught two real bugs (island underside wedges poking through the Nexus floor, and the
raised drawbridge sticking out of the ravine).
