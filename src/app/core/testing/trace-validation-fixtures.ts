import type { TraceValidationResult } from '../models/trace-validation-result';

/** Real responses of `POST /api/v1/processes/validate-trace` for the XOR diagram (live backend, 2026-11-16). */

const NODE_IDS = {
  start_1: 'Start',
  task_1: 'Review',
  decision_1: 'Decide',
  task_2: 'Notify',
  task_3: 'Reject',
  end_1: 'EndOk',
  end_2: 'EndNo',
};

/** `trace=["start_1","task_1","task_2","end_1"]`; the gateway is crossed on the step of `task_2`. */
export const TRACE_ACCEPTED: TraceValidationResult = {
  process_id: 'Loan',
  bpmn_node_ids: NODE_IDS,
  validation: {
    accepted: true,
    trace: ['start_1', 'task_1', 'task_2', 'end_1'],
    steps: [
      { index: 0, symbol: 'start_1', from_state: 'D0', to_state: 'D1', via_gateways: [] },
      { index: 1, symbol: 'task_1', from_state: 'D1', to_state: 'D2', via_gateways: [] },
      { index: 2, symbol: 'task_2', from_state: 'D2', to_state: 'D3', via_gateways: ['decision_1'] },
      { index: 3, symbol: 'end_1', from_state: 'D3', to_state: 'D5', via_gateways: [] },
    ],
    consumed: 4,
    final_state: 'D5',
    rejected_at: null,
    rejection_reason: null,
    expected_symbols: [],
  },
};

/** `trace=["start_1","task_1","end_2"]`. */
export const TRACE_NO_TRANSITION: TraceValidationResult = {
  process_id: 'Loan',
  bpmn_node_ids: NODE_IDS,
  validation: {
    accepted: false,
    trace: ['start_1', 'task_1', 'end_2'],
    steps: [
      { index: 0, symbol: 'start_1', from_state: 'D0', to_state: 'D1', via_gateways: [] },
      { index: 1, symbol: 'task_1', from_state: 'D1', to_state: 'D2', via_gateways: [] },
    ],
    consumed: 2,
    final_state: 'D2',
    rejected_at: 2,
    rejection_reason: 'NO_TRANSITION',
    expected_symbols: ['task_2', 'task_3'],
  },
};

/** `trace=["start_1","nope"]`. */
export const TRACE_UNKNOWN_SYMBOL: TraceValidationResult = {
  process_id: 'Loan',
  bpmn_node_ids: NODE_IDS,
  validation: {
    accepted: false,
    trace: ['start_1', 'nope'],
    steps: [{ index: 0, symbol: 'start_1', from_state: 'D0', to_state: 'D1', via_gateways: [] }],
    consumed: 1,
    final_state: 'D1',
    rejected_at: 1,
    rejection_reason: 'UNKNOWN_SYMBOL',
    expected_symbols: ['task_1'],
  },
};

/** `trace=["start_1","task_1"]`: read completely, but not in an accepting state. */
export const TRACE_NOT_ACCEPTING: TraceValidationResult = {
  process_id: 'Loan',
  bpmn_node_ids: NODE_IDS,
  validation: {
    accepted: false,
    trace: ['start_1', 'task_1'],
    steps: [
      { index: 0, symbol: 'start_1', from_state: 'D0', to_state: 'D1', via_gateways: [] },
      { index: 1, symbol: 'task_1', from_state: 'D1', to_state: 'D2', via_gateways: [] },
    ],
    consumed: 2,
    final_state: 'D2',
    rejected_at: null,
    rejection_reason: 'NOT_ACCEPTING_STATE',
    expected_symbols: ['task_2', 'task_3'],
  },
};

/** 422 body for `trace=nope`. */
export const INVALID_TRACE_BODY = { detail: { message: 'Invalid trace JSON: Expecting value: line 1 column 1 (char 0)' } };
