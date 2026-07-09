# Procedural Bookcase — Three.js

A fully procedural, studio-lit bookcase configurator. Every board is generated
from parameters — drag the sliders and the piece rebuilds instantly.

## Run

```bash
npm install
npm run dev
```

## Controls (lil-gui panel)

- **Dimensions** — width, height, depth (meters)
- **Layout** — number of shelves per column, number of vertical separations
- **Construction** — board thickness, plinth height, crown molding, face frame,
  recessed side panels, back style (planks / flat / open)
- **Finish** — wood tint, roughness, grain scale, grain direction
- **Studio** — key/fill/rim softbox intensities, exposure, backdrop color, turntable
- **🎲 randomize** — rolls a new design

## How it works

- `src/bookcase.js` — parametric builder: carcass, shelves, dividers, plank back,
  face frame, stepped crown cornice, plinth + cap molding, recessed side panels.
  All boards are rounded boxes with world-space box-projected UVs so the wood
  grain density is consistent at any size, with a unique grain offset per board.
- `src/studio.js` — three-point RectAreaLight softbox rig, shadow-casting sun,
  RoomEnvironment reflections, seamless cyclorama backdrop, fake contact shadow.
- `public/Wood027_1K-JPG_*` — PBR wood set (color / normal / roughness).
