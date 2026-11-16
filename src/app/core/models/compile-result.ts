import type { Diagnostic } from './diagnostic';

export interface CompileMetadata {
  process_id: string;
  process_name: string | null;
  participant_name: string | null;
  is_executable: boolean | null;
  lanes: unknown[];
  node_count: number;
  edge_count: number;
}

export interface CompileValidation {
  valid: boolean;
  diagnostics: Diagnostic[];
  semantic_errors: unknown[];
  semantic_warnings: unknown[];
}

export interface DataContractField {
  name: string;
  type: string;
  origin: string;
  /** Node symbols. */
  used_in: string[];
}

export interface DataContract {
  required_inputs: DataContractField[];
  produced_outputs: DataContractField[];
  sample_payload: Record<string, unknown>;
}

export interface Dfa {
  states: string[];
  alphabet: string[];
  start_state: string;
  accept_states: string[];
  /** `state -> symbol -> target state`; a missing symbol means no transition. */
  transitions: Record<string, Record<string, string>>;
  state_subsets: Record<string, string[]>;
}

/** Observed types are `GATEWAY_DEADLOCK` (with `node_id`) and `DEADLOCK_STATE` (with `dfa_state`). */
export interface Deadlock {
  type: string;
  node_id?: string;
  dfa_state?: string;
  message: string;
}

/**
 * One finding per strongly connected component of the DFA that has a cycle. Observed types are `VALID_LOOP` (some
 * state of the component reaches an accept state) and `INFINITE_LOOP_TRAP` (none does). `dfa_states` and
 * `activities` (node symbols) are sorted sets, not a walk order.
 */
export interface LoopFinding {
  type: string;
  dfa_states: string[];
  activities: string[];
  message: string;
}

export interface FormalDiagnostics {
  /** Node symbols. */
  unreachable_nodes: string[];
  deadlocks: Deadlock[];
  infinite_loops: LoopFinding[];
  valid_loops: LoopFinding[];
}

export interface FormalAnalysis {
  chomsky_classification: string;
  is_valid_workflow: boolean;
  /** Uses `·` and `|`; is `∅` when the workflow accepts nothing. */
  regular_expression: string;
  /** The backend returns the epsilon-NFA state count only, not its structure. */
  nfa_state_count: number;
  dfa: Dfa;
  /** Element shape never observed non-empty. */
  flag_regions: unknown[];
  /** Node symbols. */
  acyclic_paths: string[][];
  diagnostics: FormalDiagnostics;
}

export interface SymbolVariable {
  name: string;
  inferred_type: string;
  origin_kind: string;
  /** Node symbols. */
  defined_in: string[];
  /** Node symbols. */
  used_in: string[];
}

export interface FlowSpec {
  chomsky_classification: string;
  code: string;
  symbol_table: {
    nodes_count: number;
    variables: Record<string, SymbolVariable>;
  };
}

export interface GeneratedRuby {
  framework: string;
  /** `path -> content`; content may be empty (for example `log/.keep`). */
  files: Record<string, string>;
}

/** Body of a 200 from `POST /api/v1/processes/compile`. Node symbols are only meaningful with this response's `bpmn_node_ids`. */
export interface CompileResult {
  metadata: CompileMetadata;
  validation: CompileValidation;
  /** `symbol -> BPMN element id` of this very response. */
  bpmn_node_ids: Record<string, string>;
  data_contract: DataContract;
  formal_analysis: FormalAnalysis;
  flowspec: FlowSpec;
  generated_ruby: GeneratedRuby;
}

/** A downloaded project archive and the file name the server chose for it. */
export interface ProjectArchive {
  blob: Blob;
  fileName: string;
}
