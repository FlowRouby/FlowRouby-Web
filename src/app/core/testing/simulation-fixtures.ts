import type { SimulationResult } from '../models/simulation-result';

/** Real responses of `POST /api/v1/processes/simulate` for the XOR diagram (live backend, 2026-11-16). */

/** Simulated with `input_data={"amount": 500}`. */
export const SIMULATION_WITH_INPUT: SimulationResult = {
  process_id: 'Loan',
  bpmn_node_ids: {
    start_1: 'Start',
    task_1: 'Review',
    decision_1: 'Decide',
    task_2: 'Notify',
    task_3: 'Reject',
    end_1: 'EndOk',
    end_2: 'EndNo',
  },
  simulation: {
    completed: true,
    terminated_reason: 'END_EVENT_REACHED',
    accepted_by_dfa: true,
    visited_nodes: ['start_1', 'task_1', 'decision_1', 'task_2', 'end_1'],
    step_logs: [
      { step: 1, node_id: 'start_1', name: 'Request received', kind: 'start', context_updates: {} },
      { step: 2, node_id: 'task_1', name: 'Review request', kind: 'user_task', context_updates: {} },
      { step: 3, node_id: 'decision_1', name: 'Approved?', kind: 'exclusive_gateway', selected_targets: ['task_2'] },
      { step: 4, node_id: 'task_2', name: 'Notify approval', kind: 'service_task', context_updates: {} },
      { step: 5, node_id: 'end_1', name: 'Approved', kind: 'end', action: 'Reached EndEvent' },
    ],
    http_requests_simulated: [],
    final_context: { amount: 500 },
  },
};

/** Simulated without `input_data`: same route, empty `final_context`. */
export const SIMULATION_WITHOUT_INPUT: SimulationResult = {
  ...SIMULATION_WITH_INPUT,
  simulation: { ...SIMULATION_WITH_INPUT.simulation, final_context: {} },
};

/** 422 body for `input_data=[1]`. */
export const INVALID_INPUT_DATA_BODY = { detail: { message: 'Invalid input_data JSON: input_data must be a JSON object' } };
