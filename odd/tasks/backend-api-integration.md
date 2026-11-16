# Backend API integration

## Objective

Connect the Angular + bpmn-js editor to the FlowRouby backend (FastAPI, `http://localhost:6767`) so a
loaded diagram can be imported, diagnosed, compiled and simulated.

## Problem and why

The frontend is only a BPMN editor today: no `HttpClient`, no API models, no service. The backend
already exposes `/import`, `/compile` and `/simulate`.

## Sources of truth

- Contract: `D:\Proyecto LP\FlowRouby-Backend\docs\api-contract-bpmn-import.md`
- Live OpenAPI: `http://localhost:6767/openapi.json` (declares no response schemas)
- Blocks the contract does not detail (`formal_analysis`, `flowspec`, `generated_ruby`, simulation)
  are typed from real responses, never assumed.

## Constraints

- The backend is not modified from this repository.
- Backend base URL lives in the environment configuration, never in services.
- Logic is decided by `code`, `severity` and `blocksAnalysis`, never by `message`. Messages are
  translated by `code`.
- A 422 `detail` may be an object `{message, diagnostics}` or a FastAPI validation list; both are handled.
- A backend 422 never prevents showing the diagram on the canvas.
- `compile`/`simulate` name nodes with symbols; they are translated with `bpmn_node_ids` from that
  same response and never stored across requests. `bpmn_node_ids` is null when simulating from
  `flowspec_code`.
- Code, commits and PRs in English. No push and no PR without an explicit request.
- Any mismatch between contract and live backend is reported to the user, not silently adapted.

## Configuration

- TDD mode: not configured (no project or session setting found); ordinary functional checks with
  tests written alongside the behavior.
- Test runner: `pnpm test --watch=false` (Angular `ng test`, Vitest). Build: `pnpm build`.
- Receipt-driven development: off (decided by global).
- Delivery strategy: `ask-on-risk`. Forecast: above 400 authored lines across the four tasks, to be
  resolved before any pull request is planned.

## Tasks

- [x] T1 — API foundation: environment base URL, `provideHttpClient`, diagnostic and `/import`
  models, API service with `importProcess`, normalization of both 422 shapes. Remove the stale
  proxy (pointed at port 8085). Route: delegated direct (writer trigger: 2+ non-trivial files).
- [x] T2 — Load file → canvas + `/import`; diagnostics panel with canvas highlight by `elementId`
  and `line`.
- [x] T3 — `supported` gates compile/simulate; compile view (FlowSpec, formal analysis, Ruby files)
  and ZIP download.
- [x] T4 — Simulate with `input_data` and highlight the traversed path through `bpmn_node_ids`.

## Acceptance criteria

- T1: `importProcess(file)` posts multipart `file` to `{apiUrl}/api/v1/processes/import`; a 200 is
  returned typed; a 422 with object `detail` yields its diagnostics; a 422 with list `detail` and a
  network failure yield a distinguishable error without diagnostics. Tests and build pass.

## Evidence

- Live check (2026-11-15): `/import` 200 keys, 422 `NO_END_EVENT` object detail and 422 missing-file
  list detail match the contract. CORS allows `http://localhost:4200` and exposes
  `Content-Disposition`.

- T1 (commit `3c0f89c`): `pnpm test --watch=false` 9 files / 37 tests passed (writer run and parent
  re-run); `pnpm build` succeeded. Risk assessment: medium (`configuration_change` in
  `angular.json`), 412 changed lines; review not run because receipt-driven development is off.
  Exports: `Diagnostic`, `ImportResult` and document types (`core/models`), `ApiError` and
  `toApiError` (`core/models/api-error.ts`), `ProcessApi.importProcess` (`core/services/process-api.ts`).

## Progress and next step

Delivery: stacked PRs to `develop`, one per task (user asked for PR 1 right after T1).

- PR 1 = T1, branch `feature/backend-api-integration`, commits `3c0f89c` + `b5c8b27`:
  https://github.com/FlowRouby/FlowRouby-Web/pull/5 (419 changed lines, `size:exception` noted).
- PR 2 = T2, branch `feature/import-diagnostics-panel`, stacked on PR 1.

T2 decisions (user, 2026-11-15): diagnostic messages and diagnostics panel copy in Spanish
(neutral), translated by `code`; the rest of the UI stays in English. Route: delegated direct.

T2 evidence (2026-11-16), commits `ae9f500` (modeler markers, 220 lines), `9e4fc68` (import state
and message catalog, 441), `ae5fbaf` (panel and wiring, 404):

- `pnpm test --watch=false`: 13 files / 96 tests passed; `pnpm build` succeeded.
- Browser check against the live backend: diagram with a `subProcess` and a disconnected task shows
  two warnings (one blocking) and one info, `supported: false` notice, markers on `Sub` and `Lonely`,
  focus on click, stale notice after a rename and re-check; a file without `endEvent` shows the 422
  error with `line` and no interactive item; with the backend down the diagram still renders and the
  panel shows the connection notice.
- Fix found in the browser check: bpmn-js paints shapes with inline styles, so the marker rules need
  `!important`.
- Risk assessment: high (`process_boundary` heuristic on `import-analysis.spec.ts`), 1065 changed
  lines; receipt-driven development is off, so an independent verifier ran instead of a review.
- T2 is three work units; planned as PR 2a/2b/2c stacked on PR 1 (not pushed yet).

Review findings on T2 (independent verifier): re-check race fixed in `27a4a68`. Left open: the
import state is not reset when the canvas is destroyed and re-attached (single route today), the
focus marker stays until the next focus or load, and the backend English `message` is a tooltip.

Pull requests (2026-11-16, user asked for them): #6 (2a, `feature/modeler-diagnostic-markers`),
#7 (2b, `feature/import-analysis-state`), #8 (2c, `feature/import-diagnostics-panel`), each based
on the previous one, #6 based on #5.

User decision (2026-11-16): the application's own UI copy is Spanish (neutral); bpmn-js keeps its
English strings. Done on branch `feature/spanish-ui-copy` (stacked on #8, not pushed): 64 changed
lines, 97 tests pass.

## Live shapes captured for T3 and T4 (2026-11-16)

- `compile` 200: `metadata`, `validation`, `bpmn_node_ids` (`{ symbol: bpmnId }`), `data_contract`
  (`required_inputs[]`, `produced_outputs[]`, `sample_payload`), `formal_analysis`
  (`chomsky_classification`, `is_valid_workflow`, `regular_expression`, `nfa_state_count`, `dfa`
  with `states`, `alphabet`, `start_state`, `accept_states`, `transitions`, `state_subsets`;
  `flag_regions[]`, `acyclic_paths[][]`, `diagnostics` with `unreachable_nodes[]`, `deadlocks[]`,
  `infinite_loops[]`, `valid_loops[]`), `flowspec` (`chomsky_classification`, `code`,
  `symbol_table`), `generated_ruby` (`framework`, `files` as `{ path: content }`).
- `compile?format=zip`: `application/zip`, `Content-Disposition: attachment; filename="loan_rails.zip"`.
- `simulate` 200: `process_id`, `bpmn_node_ids`, `simulation` (`completed`, `terminated_reason`,
  `accepted_by_dfa`, `visited_nodes[]`, `step_logs[]`, `http_requests_simulated[]`, `final_context`).
- Mismatches reported to the user: `formal_analysis` has no ε-NFA structure, only
  `nfa_state_count`; `bpmn_node_ids` is not in the contract; `simulate` without `input_data` took
  the `amount < 1000` branch with an empty `final_context`.
- Element shapes of `flag_regions`, `infinite_loops` and `valid_loops` were never observed
  non-empty: keep them `unknown`.

T3 evidence (2026-11-16), branch `feature/compile-analysis` (stacked on `feature/spanish-ui-copy`,
not pushed), route delegated direct:

- `d683cdb` API compile + ZIP, `b9151da` compile state + symbol helper, `c37bb8a` views,
  `40633fa` analysis tabs, plus a fix commit for the review findings.
- `pnpm test --watch=false`: 20 files / 199 tests passed; `pnpm build` succeeded.
- Browser check with the real captured responses replayed (the backend process was down): the
  three views render the real payload, the ZIP downloads as `loan_rails.zip`, a node symbol focuses
  its BPMN element through `bpmn_node_ids`, an edit or a new load discards the result and disables
  compile. Pending: one end-to-end pass against the live backend.
- Independent verifier: types match the real payloads. Fixed: results and diagnostics are now
  discarded synchronously when a diagram load starts (`BpmnModeler.onLoad`), late download failures
  are dropped, `filename*` is parsed, tab `aria-controls` is valid. This also closes the T2 open
  item about state surviving a canvas re-attach.
- Reusable for T4: `toCanvasId`/`toCanvasIds` (`process-analysis/models/symbol-nodes.ts`),
  `app-node-ref`, `CompileAnalysis`, `ProcessApi`.

Delivery change (2026-11-16): #6, #7 and #8 were merged into their stacked base branches, so only
T1 reached `develop`. From now on every pull request targets `develop` directly, opened in merge
order: #9 (`feature/spanish-ui-copy`: T2 content again plus the Spanish copy) and #10
(`feature/compile-analysis`: T3, built on #9).

Pending decision (user, 2026-11-16: "note it, we look tomorrow at whether to expand it"): the
ε-NFA. `compile` returns only `nfa_state_count`; showing its states and transitions needs the
backend to add that structure to `formal_analysis`. Nothing to do in the frontend until decided.

Requested by the user for the project, not possible today (2026-11-16): type a route (a string of
nodes) and validate it against the automaton inferred from the model, painting it on the diagram.
The backend has no endpoint for it; the user will add it to the backend. `simulate` only reports
`accepted_by_dfa` for the route the engine itself took.

T4 evidence (2026-11-16), branch `feature/simulate-path` (built on `feature/compile-analysis`),
route delegated direct:

- `4491f85` simulate API, `b74e204` modeler marker groups, `e16878e` simulation state and path,
  `8a0cde3` simulation tab.
- `pnpm test --watch=false`: 25 files / 299 tests passed, six consecutive runs; `pnpm build` succeeded.
- Flaky suite found and fixed: `bpmn-modeler.spec.ts` mocked `bpmn-js/lib/Modeler` with `vi.mock`,
  which does not apply when another spec already loaded the module in the same worker. bpmn-js is
  now created through the `BPMN_MODELER_FACTORY` token and the spec provides a fake.
- Live end-to-end browser check against the backend (this also closes the T3 pending item):
  import 200, compile 200, ZIP saved as `loan_rails.zip`, simulate 200 twice. `{"amount": 500}`
  marks Start, Review, Decide, Notify, EndOk and flows f1, f2, f3, f5; `{"amount": 5000}` marks the
  Reject branch (f4, f6, EndNo); `[1]` is rejected on the client without a request; "Limpiar ruta"
  removes every path marker.
- Independent verifier: nothing blocking. Fixed: markers are now tracked by element reference, so
  renaming the id of a marked element no longer leaves a stale marker (checked live: path cleared
  after renaming `Review`). 300 tests pass, three consecutive runs.
- Pull request: `feature/simulate-path` → `develop`, built on #10.

## Merge order for the open pull requests

1. #9 — import diagnostics and Spanish copy.
2. #10 — compile view, formal analysis and ZIP.
3. The simulation PR (`feature/simulate-path`).

All three target `develop`. Each later one shows the commits of the earlier ones until those are
merged; merging in this order needs no retargeting.

## Follow-ups (not started)

- Backend: return the ε-NFA structure in `formal_analysis` (user decides whether to expand it).
- Backend: endpoint to validate a typed route against the inferred automaton; then a frontend
  input to type the route and paint it.
- Frontend, minor: focus marker stays until the next focus or load; backend English `message` is
  shown as a tooltip on diagnostics.

- Known cosmetic limits: the arrowhead of a traversed flow keeps its color (shared SVG marker), and
  the collapsed analysis panel is tight for the simulation tab.
