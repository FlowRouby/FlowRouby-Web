import type { CompileResult } from '../models/compile-result';

/** Trimmed real responses of `POST /api/v1/processes/compile` (live backend, 2026-11-16). Ruby files and FlowSpec code are shortened. */

/** Valid XOR process. */
export const XOR_RESULT: CompileResult = {
  "metadata": {
    "process_id": "Loan",
    "process_name": "Loan approval",
    "participant_name": null,
    "is_executable": true,
    "lanes": [],
    "node_count": 7,
    "edge_count": 6
  },
  "validation": {
    "valid": true,
    "diagnostics": [],
    "semantic_errors": [],
    "semantic_warnings": []
  },
  "bpmn_node_ids": {
    "start_1": "Start",
    "task_1": "Review",
    "decision_1": "Decide",
    "task_2": "Notify",
    "task_3": "Reject",
    "end_1": "EndOk",
    "end_2": "EndNo"
  },
  "data_contract": {
    "required_inputs": [
      {
        "name": "amount",
        "type": "number",
        "origin": "external_input",
        "used_in": [
          "decision_1"
        ]
      }
    ],
    "produced_outputs": [],
    "sample_payload": {
      "amount": 100
    }
  },
  "formal_analysis": {
    "chomsky_classification": "Type-3",
    "is_valid_workflow": true,
    "regular_expression": "(start_1 · task_1 · task_2 · end_1 | start_1 · task_1 · task_3 · end_2)",
    "nfa_state_count": 15,
    "dfa": {
      "states": [
        "D0",
        "D1",
        "D2",
        "D3",
        "D4",
        "D5",
        "D6"
      ],
      "alphabet": [
        "end_1",
        "end_2",
        "start_1",
        "task_1",
        "task_2",
        "task_3"
      ],
      "start_state": "D0",
      "accept_states": [
        "D5",
        "D6"
      ],
      "transitions": {
        "D0": {
          "start_1": "D1"
        },
        "D1": {
          "task_1": "D2"
        },
        "D2": {
          "task_2": "D3",
          "task_3": "D4"
        },
        "D3": {
          "end_1": "D5"
        },
        "D4": {
          "end_2": "D6"
        },
        "D5": {},
        "D6": {}
      },
      "state_subsets": {
        "D0": [
          "in:start_1",
          "q_init"
        ],
        "D1": [
          "in:task_1",
          "out:start_1"
        ],
        "D2": [
          "in:decision_1",
          "in:task_2",
          "in:task_3",
          "out:decision_1",
          "out:task_1"
        ],
        "D3": [
          "in:end_1",
          "out:task_2"
        ],
        "D4": [
          "in:end_2",
          "out:task_3"
        ],
        "D5": [
          "out:end_1"
        ],
        "D6": [
          "out:end_2"
        ]
      }
    },
    "flag_regions": [],
    "acyclic_paths": [
      [
        "start_1",
        "task_1",
        "task_2",
        "end_1"
      ],
      [
        "start_1",
        "task_1",
        "task_3",
        "end_2"
      ]
    ],
    "diagnostics": {
      "unreachable_nodes": [],
      "deadlocks": [],
      "infinite_loops": [],
      "valid_loops": []
    }
  },
  "flowspec": {
    "chomsky_classification": "Type-2",
    "code": "process \"Loan approval\" as Loan\n  start \"Request received\" as start_1\n    next is task_1\n  user task \"Review request\" as task_1\n    next is decision_1\n  decision \"Approved?\" as decision_1\n    if amount < 1000 go to task_2\n    otherwise go to task_3\n  service task \"Notify approval\" as task_2",
    "symbol_table": {
      "nodes_count": 7,
      "variables": {
        "amount": {
          "name": "amount",
          "inferred_type": "number",
          "origin_kind": "external_input",
          "defined_in": [],
          "used_in": [
            "decision_1"
          ]
        }
      }
    }
  },
  "generated_ruby": {
    "framework": "Ruby on Rails + Sidekiq",
    "files": {
      "Gemfile": "# frozen_string_literal: true\n\nsource \"https://rubygems.org\"\n\ngem \"rails\", \"~> 7.1\"\ngem \"puma\", \">= 6.0\"\ngem \"sidekiq\", ",
      "log/.keep": "",
      "config/routes.rb": "# frozen_string_literal: true\n\nRails.application.routes.draw do\n  get \"health\", to: \"workflows#health\"\n  post \"workflows"
    }
  }
};

/** Invalid workflow: unreachable nodes, deadlocks, regex `∅`, no acyclic paths. */
export const LOOP_RESULT: CompileResult = {
  "metadata": {
    "process_id": "Fix",
    "process_name": "Fix loop",
    "participant_name": null,
    "is_executable": true,
    "lanes": [],
    "node_count": 8,
    "edge_count": 9
  },
  "validation": {
    "valid": false,
    "diagnostics": [],
    "semantic_errors": [],
    "semantic_warnings": []
  },
  "bpmn_node_ids": {
    "start_1": "Start",
    "parallel_1": "Fork",
    "task_1": "A",
    "task_2": "B",
    "parallel_2": "Join",
    "decision_1": "Ok",
    "end_1": "End",
    "task_3": "Orphan"
  },
  "data_contract": {
    "required_inputs": [
      {
        "name": "retries",
        "type": "number",
        "origin": "external_input",
        "used_in": [
          "decision_1"
        ]
      }
    ],
    "produced_outputs": [],
    "sample_payload": {
      "retries": 100
    }
  },
  "formal_analysis": {
    "chomsky_classification": "Type-3",
    "is_valid_workflow": false,
    "regular_expression": "∅",
    "nfa_state_count": 18,
    "dfa": {
      "states": [
        "D0",
        "D1",
        "D2",
        "D3"
      ],
      "alphabet": [
        "end_1",
        "start_1",
        "task_1",
        "task_2",
        "task_3"
      ],
      "start_state": "D0",
      "accept_states": [],
      "transitions": {
        "D0": {
          "start_1": "D1"
        },
        "D1": {
          "task_1": "D2",
          "task_2": "D3"
        },
        "D2": {},
        "D3": {}
      },
      "state_subsets": {
        "D0": [
          "in:start_1",
          "q_init"
        ],
        "D1": [
          "in:parallel_1",
          "in:task_1",
          "in:task_2",
          "out:parallel_1",
          "out:start_1"
        ],
        "D2": [
          "deadlock_wait:parallel_2",
          "in:parallel_2",
          "out:task_1"
        ],
        "D3": [
          "deadlock_wait:parallel_2",
          "in:parallel_2",
          "out:task_2"
        ]
      }
    },
    "flag_regions": [],
    "acyclic_paths": [],
    "diagnostics": {
      "unreachable_nodes": [
        "end_1",
        "task_3"
      ],
      "deadlocks": [
        {
          "type": "GATEWAY_DEADLOCK",
          "node_id": "parallel_2",
          "message": "Converging ParallelGateway 'parallel_2' (parallel_2) is not paired with a matching diverging ParallelGateway (possible XOR-split to AND-join synchronization deadlock)."
        },
        {
          "type": "DEADLOCK_STATE",
          "dfa_state": "D2",
          "message": "DFA state 'D2' (['deadlock_wait:parallel_2', 'in:parallel_2', 'out:task_1']) has no outgoing transitions and is not an EndEvent."
        },
        {
          "type": "DEADLOCK_STATE",
          "dfa_state": "D3",
          "message": "DFA state 'D3' (['deadlock_wait:parallel_2', 'in:parallel_2', 'out:task_2']) has no outgoing transitions and is not an EndEvent."
        }
      ],
      "infinite_loops": [],
      "valid_loops": []
    }
  },
  "flowspec": {
    "chomsky_classification": "Type-2",
    "code": "process \"Fix loop\" as Fix\n  start \"start_1\" as start_1\n    next is parallel_1\n  parallel split \"parallel_1\" as parallel_1\n    branch to task_1\n    branch to task_2\n  service task \"Work A\" as task_1\n    next is parallel_2\n  service task \"Work B\" as task_2",
    "symbol_table": {
      "nodes_count": 8,
      "variables": {
        "retries": {
          "name": "retries",
          "inferred_type": "number",
          "origin_kind": "external_input",
          "defined_in": [],
          "used_in": [
            "decision_1"
          ]
        }
      }
    }
  },
  "generated_ruby": {
    "framework": "Ruby on Rails + Sidekiq",
    "files": {
      "Gemfile": "# frozen_string_literal: true\n\nsource \"https://rubygems.org\"\n\ngem \"rails\", \"~> 7.1\"\ngem \"puma\", \">= 6.0\"\ngem \"sidekiq\", ",
      "log/.keep": "",
      "config/routes.rb": "# frozen_string_literal: true\n\nRails.application.routes.draw do\n  get \"health\", to: \"workflows#health\"\n  post \"workflows"
    }
  }
};

/** Valid process with a controlled loop (backend sample `03-bucle-correccion`): one `VALID_LOOP` finding. */
export const VALID_LOOP_RESULT: CompileResult = {
  "metadata": {
    "process_id": "Process_BucleCorreccion",
    "process_name": "Revisión con correcciones",
    "participant_name": null,
    "is_executable": true,
    "lanes": [],
    "node_count": 6,
    "edge_count": 6
  },
  "validation": {
    "valid": true,
    "diagnostics": [
      {
        "severity": "info",
        "code": "IGNORED_ELEMENT",
        "message": "<BPMNDiagram> is not imported: diagram layout is not part of the IR; keep the original XML to preserve it.",
        "elementId": "BPMNDiagram_Process_BucleCorreccion",
        "elementType": "BPMNDiagram",
        "processId": null,
        "blocksAnalysis": false,
        "line": 37
      }
    ],
    "semantic_errors": [],
    "semantic_warnings": []
  },
  "bpmn_node_ids": {
    "start_1": "Start_Documento",
    "decision_1": "Gateway_Entrada",
    "task_1": "Task_Revisar",
    "decision_2": "Gateway_Correcto",
    "end_1": "End_Documento",
    "task_2": "Task_Corregir"
  },
  "data_contract": {
    "required_inputs": [
      {
        "name": "requiere_correccion",
        "type": "boolean",
        "origin": "external_input",
        "used_in": [
          "decision_2"
        ]
      }
    ],
    "produced_outputs": [],
    "sample_payload": {
      "requiere_correccion": true
    }
  },
  "formal_analysis": {
    "chomsky_classification": "Type-3",
    "is_valid_workflow": true,
    "regular_expression": "(start_1 · task_1 · end_1 | start_1 · task_1 · task_2 · (task_1 · task_2)* · task_1 · end_1)",
    "nfa_state_count": 13,
    "dfa": {
      "states": [
        "D0",
        "D1",
        "D2",
        "D3",
        "D4"
      ],
      "alphabet": [
        "end_1",
        "start_1",
        "task_1",
        "task_2"
      ],
      "start_state": "D0",
      "accept_states": [
        "D3"
      ],
      "transitions": {
        "D0": {
          "start_1": "D1"
        },
        "D1": {
          "task_1": "D2"
        },
        "D2": {
          "end_1": "D3",
          "task_2": "D4"
        },
        "D3": {},
        "D4": {
          "task_1": "D2"
        }
      },
      "state_subsets": {
        "D0": [
          "in:start_1",
          "q_init"
        ],
        "D1": [
          "in:decision_1",
          "in:task_1",
          "out:decision_1",
          "out:start_1"
        ],
        "D2": [
          "in:decision_2",
          "in:end_1",
          "in:task_2",
          "out:decision_2",
          "out:task_1"
        ],
        "D3": [
          "out:end_1"
        ],
        "D4": [
          "in:decision_1",
          "in:task_1",
          "out:decision_1",
          "out:task_2"
        ]
      }
    },
    "flag_regions": [],
    "acyclic_paths": [
      [
        "start_1",
        "task_1",
        "end_1"
      ]
    ],
    "diagnostics": {
      "unreachable_nodes": [],
      "deadlocks": [],
      "infinite_loops": [],
      "valid_loops": [
        {
          "type": "VALID_LOOP",
          "dfa_states": [
            "D2",
            "D4"
          ],
          "activities": [
            "task_1",
            "task_2"
          ],
          "message": "Controlled loop with valid exit path towards an EndEvent."
        }
      ]
    }
  },
  "flowspec": {
    "chomsky_classification": "Type-2",
    "code": "process \"Revisión con correcciones\" as Process_BucleCorreccion\n  start \"Documento recibido\" as start_1\n    next is decision_1\n  decision \"decision_1\" as decision_1\n    branch to task_1\n  user task \"Revisar documento\" as task_1\n    next is decision_2\n  decision \"¿Requiere corrección?\" as decision_2\n    otherwise go to e",
    "symbol_table": {
      "nodes_count": 6,
      "variables": {
        "requiere_correccion": {
          "name": "requiere_correccion",
          "inferred_type": "boolean",
          "origin_kind": "external_input",
          "defined_in": [],
          "used_in": [
            "decision_2"
          ]
        }
      }
    }
  },
  "generated_ruby": {
    "framework": "Ruby on Rails + Sidekiq",
    "files": {
      "Gemfile": "# frozen_string_literal: true\n\nsource \"https://rubygems.org\"\n\ngem \"rails\", \"~> 7.1\"\ngem \"puma\", \">= 6.0\"\ngem \"sidekiq\", ",
      "log/.keep": "",
      "config/routes.rb": "# frozen_string_literal: true\n\nRails.application.routes.draw do\n  get \"health\", to: \"workflows#health\"\n  post \"workflows"
    }
  }
};
