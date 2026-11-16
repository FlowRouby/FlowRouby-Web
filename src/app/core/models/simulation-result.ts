/** One executed node. Optional fields are present only for some node kinds (observed on the live backend). */
export interface StepLog {
  step: number;
  /** Node symbol (`task_1`), not a BPMN id. */
  node_id: string;
  name: string;
  /** Backend node kind code (`start`, `user_task`, `exclusive_gateway`, `service_task`, `end`...). */
  kind: string;
  context_updates?: Record<string, unknown>;
  /** Node symbols chosen by a gateway. */
  selected_targets?: string[];
  action?: string;
}

export interface Simulation {
  completed: boolean;
  /** Backend termination code (`END_EVENT_REACHED` observed; others are possible). */
  terminated_reason: string;
  /** Null when the backend did not evaluate the route against the DFA (possible per the simulator source, never observed). */
  accepted_by_dfa: boolean | null;
  /** Node symbols in execution order. */
  visited_nodes: string[];
  step_logs: StepLog[];
  /** Element shape never observed non-empty. */
  http_requests_simulated: unknown[];
  final_context: Record<string, unknown>;
}

/** `POST /api/v1/processes/simulate` 200 (typed from live responses). */
export interface SimulationResult {
  process_id: string;
  /** `{ symbol: bpmnId }` of this same response; null when the backend simulated from `flowspec_code`. */
  bpmn_node_ids: Record<string, string> | null;
  simulation: Simulation;
}
