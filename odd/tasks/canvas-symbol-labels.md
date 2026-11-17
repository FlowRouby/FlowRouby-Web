# Automaton symbol labels on the canvas

## Objective

Show, on each BPMN element of the canvas, a small coloured label with its automaton symbol (`start_1`, `task_1`, `decision_1`…), so the symbols used by the formal analysis, the DFA diagram, the simulation and the trace validation can be traced back to the drawing.

## Problem and why

The analysis panels name nodes with symbols, the canvas shows BPMN names and ids. To follow a DFA transition or a simulation step the user has to click each node reference. A label on the element makes the mapping visible at a glance while presenting the project.

## Scope

- In: a bpmn-js overlay per mapped element with the symbol text; shown from the `bpmn_node_ids` of the current compile response; removed when that response stops describing the canvas.
- Out: backend changes; labels on sequence flows (they have no symbol); a toggle to hide the labels (add later only if asked).

## Constraints (standing project rules)

- Symbols are never stored between requests: the labels are derived from the `bpmn_node_ids` of the compile response currently shown, and are removed when the analysis becomes stale (diagram edited), when a new diagram loads and when the canvas is cleared.
- Ids missing from the canvas are skipped silently.
- `BPMN_MODELER_FACTORY` stays the only place that constructs bpmn-js; canvas access goes through the `BpmnModeler` service.
- Labels must not intercept pointer events (the element under them stays clickable and draggable).
- Code, tests and commits in English. No AI attribution in commits.

## Tasks

- [x] L1 (delegated): overlay support in `BpmnModeler` (set/replace/clear a group of text labels), a pure model that turns `bpmn_node_ids` into labels, wiring to the compile result lifecycle, styles, tests.
- [x] L2 (parent): live browser check: compile a sample, labels appear on every node with the right symbol; edit the diagram, labels go away; recompile, they come back; load another sample, old labels are gone.

Route: one delegated writer (2+ non-trivial files). TDD: off, ordinary checks. Runner: `pnpm test --watch=false`, `pnpm build`.

## Acceptance criteria

- After a successful compile every element in `bpmn_node_ids` that is on the canvas shows its symbol in a small coloured label.
- No label remains after an edit, a new load or a clear.
- Existing path and diagnostic markers keep working.

## Evidence

- L1: commit 9eca3d0. `BpmnModeler.applyLabels(labels, group)` (bpmn-js overlays, grouped and replaced like markers), pure `symbolLabels(bpmnNodeIds, hasElement)`, wiring in `CompileAnalysis` (set after a successful compile; cleared in `#begin()`, which runs on a new compile, a diagram edit, a diagram load and the import analysis starting), global `.fr-symbol-label` style.
- `pnpm test --watch=false`: 40 files, 509 tests passed (writer and parent spot check). `pnpm build`: no warnings.
- L2 (parent, local backend, Playwright):
  - Sample 04: no labels before compiling; after compiling 7 labels, each on its own element (`Start_Pedido=start_1`, `Gateway_Dividir=parallel_1`, `Task_Facturar=task_1`, `Task_Empacar=task_2`, `Gateway_Unir=parallel_2`, `Task_Despachar=task_3`, `End_Pedido=end_1`); `pointer-events: none`.
  - Loading sample 03 removed them; compiling it showed its 6 labels above the top-left corner of each element without covering names.
  - Dragging "Corregir documento" removed every label; re-verifying and compiling brought them back; "Limpiar" removed them.
  - Not checked: zoom and pan following (bpmn-js default overlay behaviour).
- Review: RDD off; writer self-verification plus parent spot check.
