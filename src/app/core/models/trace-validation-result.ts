/** Rejection codes known today (`rejection_reason`). */
export type RejectionReason = 'UNKNOWN_SYMBOL' | 'NO_TRANSITION' | 'NOT_ACCEPTING_STATE';

/** One consumed symbol of the trace. */
export interface TraceStep {
  index: number;
  /** DFA symbol (`task_1`), not a BPMN id. */
  symbol: string;
  from_state: string;
  to_state: string;
  /** Gateway symbols crossed to reach this node; a drawing aid, not part of the automaton. */
  via_gateways: string[];
}

export interface TraceValidation {
  accepted: boolean;
  /** The evaluated trace, always in symbols. */
  trace: string[];
  /** Only the symbols consumed before the first failure. */
  steps: TraceStep[];
  consumed: number;
  final_state: string;
  /** Index of the failing symbol; null when accepted or when the reason is `NOT_ACCEPTING_STATE`. */
  rejected_at: number | null;
  /** A code the frontend does not know yet is still representable. */
  rejection_reason: RejectionReason | (string & {}) | null;
  expected_symbols: string[];
}

/** `POST /api/v1/processes/validate-trace` 200 (typed from live responses); a rejected trace is also a 200. */
export interface TraceValidationResult {
  process_id: string;
  /** `{ symbol: bpmnId }` of this same response; gateways are included. */
  bpmn_node_ids: Record<string, string>;
  validation: TraceValidation;
}
