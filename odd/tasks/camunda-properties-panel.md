# Full properties panel with Camunda extensions

## Objective

Replace the ID/name panel with the official bpmn.io properties panel and its Camunda 7 provider, so every property the backend reads can be edited in the editor: conditions, default flows, generated task forms (form fields), input/output parameters, decision references, delegate classes, connectors and call activity mappings.

## Problem and why

The current panel edits only the id and the name. Conditions and variables that decide the simulation can only be changed by editing the XML by hand. The user wants to be able to add a new variable live (for example a form field or an output parameter) while presenting the project.

## Decision (user, 2026-11-16)

Import the complete official panel instead of extending our own. Accepted tradeoff: the panel content is in English and uses the bpmn.io look, which the standing rule already allows ("whole app UI in Spanish, except what bpmn-js ships in English").

## What the backend reads (read-only evidence)

`FlowRouby-Backend/backend/app/features/flowspec/ast/camunda_extensions.py`, namespace `http://camunda.org/schema/1.0/bpmn`: `formRef`/`formKey`, `formData/formField` (id, type, label, defaultValue), `class`, `decisionRef`, `resultVariable`, `inputOutput` (`inputParameter`/`outputParameter`), `connector` (`connectorId`, `inputOutput` with method, url, headers, payload), call activity `in`/`out`. Standard BPMN: `conditionExpression`, gateway `default`, `documentation`, script format and script.

## Scope

- In: `bpmn-js-properties-panel`, `@bpmn-io/properties-panel` and `camunda-bpmn-moddle` as dependencies; the modeler created with the panel modules and the Camunda moddle extension; the panel mounted in the existing "Propiedades" aside; its stylesheet; removal of the code the old panel needed and nothing else uses.
- Out: backend changes; translating the panel; custom property groups.

## Constraints

- The aside is rendered conditionally, so the panel must attach when it appears and detach when it goes, without recreating the modeler.
- Edits made in the panel go through the command stack, so the existing edit listeners (stale analysis, autosave) keep working with no extra wiring.
- The `BPMN_MODELER_FACTORY` token stays the single place that constructs bpmn-js, so tests keep replacing it.
- No CDN; installed with pnpm. Build without new warnings.
- Code, tests and commits in English.

## Tasks

- [x] C1 (delegated): dependencies, modeler modules and moddle extension, panel host component, stylesheet, cleanup of the old panel code, tests.
- [x] C2 (parent): live browser check against the backend: edit a condition; add a form field and see it in the compile data contract; add an output parameter to "Corregir documento" in sample 03 and see the loop end; reload keeps the Camunda properties.

Route: one delegated writer (2+ non-trivial files, new dependency). TDD: off, ordinary checks. Runner: `pnpm test --watch=false`, `pnpm build`.

## Acceptance criteria

- Selecting an element shows the official panel with the Camunda 7 groups (for a user task: Forms, Inputs, Outputs…).
- A property edited in the panel is in the exported XML, marks the analysis stale and is saved for the next reload.
- Hiding and showing the aside keeps the panel working.
- Nothing of the old id/name panel remains unused in the code.

## Evidence

- C1: commits e3b776a (dependencies, tsconfig `resolveJsonModule`, `classnames` allowed as CommonJS, type declarations) and 466d7cc (modeler modules and Camunda moddle extension, `mountPropertiesPanel`/`unmountPropertiesPanel`, thin host component, stylesheet, removal of the old id/name panel code and its tests).
- `pnpm test --watch=false`: 38 files, 491 tests passed.
- `pnpm build`: no warnings. Initial total 381.86 kB -> 426.04 kB raw (117.33 kB -> 122.35 kB transfer); lazy `process-editor-routes` chunk 748.83 kB -> 1.92 MB raw (181.89 kB -> 415.85 kB transfer).
- C2 (parent, real backend, sample `03-bucle-correccion`): the panel fills the aside and shows the Camunda 7 groups for a user task (General, Documentation, User assignment, Forms, Form fields, Task listeners, Asynchronous continuations, Inputs, Outputs, Execution listeners, Extension properties).
  - Output parameter `requiere_correccion = false` on "Corregir documento": written as `camunda:outputParameter`, marks the analysis stale, is autosaved; after re-verifying, simulating with `{"requiere_correccion": true}` now ends (9 steps, end event reached, accepted by the automaton) instead of stopping at 100 steps.
  - Generated task form field `prioridad` (boolean) on "Revisar documento": written as `camunda:formField`; after compiling, the data contract lists `prioridad (boolean)`.
  - A reload keeps both Camunda properties; hiding and showing the aside keeps the panel working.
  - Not checked live: editing a sequence flow condition through the panel.
- How it was checked: the dev server already running on port 4200 kept serving the previous code after the dependency install, so a second dev server on 4201 was used, with a local proxy adding the CORS header the backend only grants to port 4200. Both were stopped afterwards.
- Review: RDD off; writer self-verification plus parent spot check (491 tests passed).
