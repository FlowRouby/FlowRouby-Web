# Trace validation ("Validar cadena")

## Objective

Let the user type a route (a string of node names) and see whether the automaton inferred from the
diagram accepts it, painting the consumed route on the canvas and marking where it is rejected.

## Why

Membership of a string in the language of the DFA is the core demo of the academic project.
`simulate` cannot do it: it takes variables and returns the route the engine chose.

## Backend contract (verified live on 2026-11-16, backend branch `feat/validate-trace-endpoint`)

`POST /api/v1/processes/validate-trace`, multipart: `file` plus exactly one of `trace` (JSON array
string of DFA symbols) or `bpmn_trace` (JSON array string of original BPMN ids).
Source of truth: `D:\Proyecto LP\FlowRouby-Backend\docs\api-contract-bpmn-import.md`, section 1.2.

- `200`: `{ process_id, bpmn_node_ids, validation }`, also for a rejected trace.
- `validation`: `accepted`, `trace` (always symbols), `steps[]` (`index`, `symbol`, `from_state`,
  `to_state`, `via_gateways`), `consumed`, `final_state`, `rejected_at` (index or null),
  `rejection_reason` (`UNKNOWN_SYMBOL` | `NO_TRANSITION` | `NOT_ACCEPTING_STATE` | null),
  `expected_symbols`.
- `422` `{ detail: { message } }` for a bad `trace` value; other 422 shapes as `compile`.
- Gateways are in `bpmn_node_ids` but are not symbols of the alphabet. `via_gateways` is a drawing
  aid: gateways crossed to reach the node of that step.
- Live responses matched the contract (accepted, the three rejection reasons, empty trace, invalid
  JSON, no trace field). No mismatch found.

## Constraints

- Backend is read-only from this repo. Report contract mismatches instead of adapting silently.
- Symbols are translated only with the `bpmn_node_ids` of the same response; never kept between
  requests. Logic by `rejection_reason` code, never by `message`.
- UI text in Spanish; code, tests, commits in English. No push or PR until the user asks.
- TDD mode: not configured; ordinary functional checks. Runner: `pnpm test --watch=false`; build:
  `pnpm build`.

## Design decisions

- New tab "Validar cadena" after "Simulación". Text input; tokens split by spaces, commas or
  arrows. A selector chooses what the user typed: symbols (`trace`) or diagram ids (`bpmn_trace`).
- Painting: for each step, mark its `via_gateways` and its node, plus the connections that enter
  them from already painted nodes. The rejected symbol, when it maps to an element, gets its own
  marker (`fr-rejected`).
- The simulation route and the validated route share the canvas: showing one replaces the other
  (single owner of the `path` marker group).
- Same discard rules as `SimulationAnalysis`: edit, load or new check drops result and markers;
  the typed text stays.

## Tasks

- [x] V1 Model, fixtures from real payloads, `ProcessApi.validateTrace`. Route: delegated writer
  (2+ files). Commit `24e90d6`.
- [x] V2 `traceMarkers`, shared path highlight owner, `TraceValidation` service. Route: delegated.
  Commit `5b6b4de`.
- [x] V3 `trace-validation-view`, tab wiring, Spanish messages, marker CSS. Route: delegated.
  Commit `0ac24fa`.
- [x] V4 Live check in the browser against the running backend. Route: inline.
- [x] V5 Fix from the independent verifier: connections that were not walked got painted. Route:
  inline (one file plus its spec). Commit: see `git log` ("paint only the connections a validated
  trace walked").

## Evidence (2026-11-16)

- `pnpm test --watch=false`: 32 files, 417 tests passed. `pnpm build`: complete.
- Review: RDD off; `gentle-ai review assess` failed (untracked file declaration), so the diff was
  treated as high risk and an independent verifier read `7ddf826..0ac24fa`. One real defect (V5),
  fixed. No findings on races, discard rules, symbol translation or API call.
- Live, `xor-di.bpmn`, backend at `localhost:6767`:
  - `start_1 task_1 task_2 end_1`: accepted, final `D5`; painted Start, Review, Decide, Notify,
    EndOk and flows f1, f2, f3, f5.
  - `start_1, task_1, end_2`: `NO_TRANSITION` at position 3; painted Start, Review, f1; EndNo
    marked rejected; expected `task_2`, `task_3`.
  - `start_1 -> task_1`: `NOT_ACCEPTING_STATE`; nothing marked rejected.
  - `start_1 decision_1`: `UNKNOWN_SYMBOL`; the gateway marked rejected.
  - Diagram ids `Start → Review → Reject → EndNo`: accepted, final `D6`.
  - Simulating afterwards replaced the validated route.
  - The live check ran before V5; V5 is covered by unit tests only.

## Painting rule (after V5)

A gateway takes every connection entering it from an element already on the route (parallel join).
A node takes the connections from the gateways of its step, or, with none, the one from the most
recent element that leads to it.

## Open

- `·` is an input separator (so a regex can be pasted); a BPMN id containing `·` would be split.
- `simulation-analysis.spec.ts` `lastPath()` now reads "never painted" as an empty route.
- A validation that paints nothing still removes a simulated route from the canvas.
- Not pushed; no PR. Next step: user decides push and PR to `develop`.
