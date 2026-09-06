# 04 — Local Project persistence mechanism

Type: grilling
Status: claimed

## Question

Where do Projects live on disk or in the browser for V1 local save?

Options to decide among (or replace): Bun-managed folder under the repo or user home; browser IndexedDB / OPFS; downloadable project archive; hybrid. Constraint: regenerating Stills/Voiceover is expensive, so assets must round-trip with the Film Plan and Brief.

Resolution should name the store, the Project directory/object layout at a high level, and what is in/out of a saved Project.
