# Clear canvas and keep the last diagram across reloads

## Objective

Add a toolbar button that clears the canvas, and keep the last open diagram in `localStorage` so a page reload does not lose it.

## Problem and why

Reloading the page always starts from the empty diagram, so an imported, sample or edited diagram is lost. There is also no way to go back to an empty canvas.

## Scope

- In: "Limpiar" button in the editor toolbar; saving the diagram on import, on sample load and on every edit; restoring and re-analysing it on page load.
- Out: backend changes; several saved diagrams; saving analysis results (compile, simulation) between reloads.

## Constraints

- Node symbols and analysis results are never stored between requests: only the BPMN XML and its file name are saved. After a restore the diagram is analysed again through the backend, like an imported file.
- `localStorage` can be missing, full or blocked: every access is guarded and the app works without it.
- A failed backend call never prevents showing the diagram.
- UI copy in Spanish; code, tests and commits in English.
- Branch `feature/canvas-persistence` sits on `feature/sample-diagrams` (both edit the toolbar); it must reach `develop` after that one.

## Design

- `BpmnModeler.clear()`: loads the empty diagram through the existing load path, so load listeners (`ImportAnalysis` reset, marker cleanup) run.
- `DiagramStorage` (process-editor service): `save({ xml, filename })`, `load()`, `clear()`, guarded, one versioned key.
- A single owner of "load this XML and analyse it", used by the file import, the sample selector and the restore, which also saves it.
- Edits save the exported XML, debounced. Loading is not an edit.
- Restore runs once after the modeler is attached; a stored diagram the canvas cannot render is dropped from storage.
- "Limpiar" asks for confirmation, then clears the canvas, the analysis and the stored diagram.

## Tasks

- [x] P1 (delegated): `BpmnModeler.clear()` and `DiagramStorage`, with tests.
- [x] P2 (delegated): save on load and on edit, restore on start, with tests.
- [x] P3 (delegated): "Limpiar" button with confirmation, with tests.
- [ ] P4 (parent): live browser check (reload keeps the diagram and its analysis; clear empties canvas, analysis and storage).

Route: one delegated writer (2+ non-trivial files). TDD: off, ordinary checks. Runner: `pnpm test --watch=false`, `pnpm build`.

## Acceptance criteria

- After importing a file, loading a sample or editing, a reload shows the same diagram and its diagnostics.
- "Limpiar", once confirmed, leaves the initial empty diagram, no analysis, and nothing to restore on reload; cancelling changes nothing.
- With `localStorage` unavailable the editor behaves as it does today.

## Evidence

- P1 `0076095`: `BpmnModeler.clear()` and `DiagramStorage`. `pnpm test --watch=false`: 34 files, 448 tests passed.
- P2 `fe15fa8`: `DiagramLoader` (load, debounced save on edit, restore, clear) used by the toolbar. Restore is triggered from `BpmnCanvas` right after `attach`. 35 files, 461 tests passed.
- P3 `5e49c56`: "Limpiar" button with confirmation. 35 files, 465 tests passed.
- `pnpm build` succeeded after each task.
- P4 (live browser check): pending.
