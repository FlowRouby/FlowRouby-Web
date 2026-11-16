# DFA state diagram and loop findings

## Objective

Show the loop findings of `/compile` in a readable form, and draw the DFA as a state diagram in the analysis tab.

## Problem and why

- `formal_analysis.diagnostics.valid_loops` and `infinite_loops` were typed `unknown[]` and rendered as raw JSON, because the backend had never returned them non-empty. The shape is now known.
- The DFA is shown only as a formal definition and a transition table. The state diagram is the standard representation and is easier to read when presenting the project.

## Contract evidence (backend, read-only)

`backend/app/features/formal_analysis/services/analysis_service.py:176-212`: one finding per strongly connected component of the DFA that has a cycle.

```json
{ "type": "VALID_LOOP" | "INFINITE_LOOP_TRAP", "dfa_states": ["D2", "D4"], "activities": ["task_1", "task_2"], "message": "..." }
```

- `dfa_states` and `activities` are **sorted sets**, not a walk order. Never render them with arrows.
- `activities` are node symbols of that same response (translate only with its `bpmn_node_ids`).
- `VALID_LOOP`: some state of the component reaches an accept state. `INFINITE_LOOP_TRAP`: none does.

## Scope

- In: typed loop findings and their rendering; SVG state diagram of the DFA inside the "DFA" section of `formal-analysis-view`, above the table.
- Out: backend changes; drawing the ε-NFA (the backend returns only its state count); new dependencies.

## Constraints

- Logic by `type`, never by `message`. Unknown `type` gets a generic label.
- UI copy in Spanish; code, tests and commits in English.
- No layout library: layered layout computed in a pure function.
- The table stays as the text equivalent of the diagram.

## Design

- `core/models/compile-result.ts`: `LoopFinding { type; dfa_states; activities; message }` for both arrays.
- `process-analysis/models/analysis-messages.ts`: `loopLabel(type)`.
- `process-analysis/models/dfa-diagram.ts`: `dfaDiagram(dfa, loops)` returns sizes, nodes and edges ready to draw. Layer = breadth-first depth from the start state; unreachable states in a final layer. Transitions sharing source and target merge into one edge with a joined label. Adjacent forward edges are straight; self-loops, backward edges and edges skipping layers are curved.
- `process-analysis/components/dfa-diagram/`: SVG with the standard notation (entry arrow on the start state, double circle on accept states, labelled arrows), loop states and edges highlighted.

## Tasks

- [x] L1 (delegated, on `develop`): typed loop findings rendered like deadlocks, with a real fixture.
- [x] D1 (delegated, `feature/dfa-diagram`): `dfaDiagram` layout model with tests.
- [x] D2 (delegated, `feature/dfa-diagram`): `DfaDiagram` component, wired into `formal-analysis-view`, with tests.
- [x] D3 (parent): live browser check with samples 01 to 05.

Route: one delegated writer (2+ non-trivial files). TDD: off, ordinary checks. Runner: `pnpm test --watch=false`, `pnpm build`.

## Acceptance criteria

- A valid loop shows a Spanish label, its states as a set, its activities as node references and the backend message as detail; no raw JSON for loops.
- The diagram shows every state and every transition of the DFA; start and accept states are distinguishable without colour.
- No label or node overlaps in the five backend samples.

## Evidence

- L1, on `develop`: `5c103ab` feat(process-analysis): show loop findings in a readable form. Real payload of sample `03-bucle-correccion` matched the typed shape; fixture `VALID_LOOP_RESULT`.
- D1, on `feature/dfa-diagram`: `101ce3f` feat(process-analysis): compute the DFA state diagram layout.
- D2, on `feature/dfa-diagram`: `0e1b9b3` feat(process-analysis): draw the DFA as a state diagram.
- `pnpm test --watch=false` after L1: 26 files, 316 tests passed. After D2: 28 files, 336 tests passed.
- `pnpm build`: succeeded after L1 and after D2.
- Note: by construction of the breadth-first layering no edge skips a layer forward, so the layout code for downward lanes is defensive and untested.
- D3 (live browser check, parent): the five backend samples drawn and inspected. Three defects found and fixed in the follow-up `fix` commit on this branch: labels of crossing arrows collided at the midpoint (labels now sit at 30% of the arrow); a valid loop used the primary colour, which is crimson and read as an error (now the info colour); an upward arrow in the last column bowed into the incoming arrows (now bows right). After the fix: 338 tests passed, build succeeded.
- Known limit: a backward curve can pass behind a node of the same column as its source (sample 03, behind D3); readable, not fixed.
- Review: RDD off; assessed `medium` (735 changed lines), writer self-verification plus parent spot check.
