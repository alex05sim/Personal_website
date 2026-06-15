# 3D source assets — PCB teardown

Drop your raw hardware files in this folder. I'll mine them for the part list and
plan the web model. The final web-ready, optimized models will live in
`/public/models/` (this folder is the *source*, not what ships to the browser).

## What to drop (best → still useful)

1. **BEST — web-ready mesh**
   - `board.glb` / `.gltf`  → from KiCad: *3D Viewer ▸ File ▸ Export ▸ GLTF*
     (keeps components as named parts)
   - `enclosure.glb` / `.gltf`

2. **GOOD — source CAD** (these are text; I can read them to plan, even though
   final conversion to GLB needs a DCC tool)
   - `*.step` / `*.stp`   → the enclosure incl. the hinge
   - `*.kicad_pcb`        → the board (I'll extract the full component list from it)
   - `*.kicad_pro`, `*.kicad_sch` → optional extra context

## A few notes that help a lot (drop a `notes.txt` or just tell me in chat)

- **Units** (mm? in?) and rough overall dimensions
- Which way is **"up"**
- Which part(s) are the **hinge**, and roughly where the **hinge axis** runs
- The **key components** you want labeled in the cutaway
  (or I'll pull them straight from `.kicad_pcb`)
- A **reference photo or render**, if you have one
