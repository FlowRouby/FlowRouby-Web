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
- [ ] T3 — `supported` gates compile/simulate; compile view (FlowSpec, formal analysis, Ruby files)
  and ZIP download.
- [ ] T4 — Simulate with `input_data` and highlight the traversed path through `bpmn_node_ids`.

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

Next: T3 in progress on `feature/compile-analysis`. Route: delegated direct.
