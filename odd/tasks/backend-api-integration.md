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

- [ ] T1 — API foundation: environment base URL, `provideHttpClient`, diagnostic and `/import`
  models, API service with `importProcess`, normalization of both 422 shapes. Remove the stale
  proxy (pointed at port 8085). Route: delegated direct (writer trigger: 2+ non-trivial files).
- [ ] T2 — Load file → canvas + `/import`; diagnostics panel with canvas highlight by `elementId`
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

## Progress and next step

Next: T1.
