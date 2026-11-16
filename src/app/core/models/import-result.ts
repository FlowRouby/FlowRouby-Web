import type { Diagnostic } from './diagnostic';

/** Generic XML element for content FlowRouby does not interpret. */
export interface GenericElement {
  namespaceUri: string;
  localName: string;
  attributes: Record<string, string>;
  text: string | null;
  children: GenericElement[];
}

/** Foreign-namespace content. Attribute keys have the form `{namespaceUri}name`. */
export interface Extensions {
  attributes: Record<string, string>;
  elements: GenericElement[];
}

export type NodeSupport = 'analyzable' | 'preserved' | 'unsupported';

export interface ImportedNode {
  id: string;
  name: string | null;
  bpmnType: string;
  nodeType: string;
  support: NodeSupport;
  documentation: string | null;
  defaultFlowId: string | null;
  incoming: string[];
  outgoing: string[];
  sourceLine: number | null;
  extensions: Extensions;
  unrecognized: GenericElement[];
  scriptFormat?: string | null;
  script?: string | null;
  calledElement?: string | null;
  /** The original element, present on `unsupported` nodes. */
  source?: GenericElement;
}

export interface SequenceFlowCondition {
  text: string | null;
  language: string | null;
  xsiType: string | null;
}

export interface ImportedSequenceFlow {
  id: string;
  sourceRef: string;
  targetRef: string;
  name: string | null;
  condition: SequenceFlowCondition | null;
  isDefault: boolean;
  documentation: string | null;
  sourceLine: number | null;
  extensions: Extensions;
  unrecognized: GenericElement[];
}

export interface ImportedLane {
  id: string;
  name: string | null;
  flowNodeRefs: string[];
  /** Not detailed by the contract. */
  childLaneSet: unknown;
  sourceLine: number | null;
}

export interface ImportedLaneSet {
  lanes: ImportedLane[];
}

export interface ImportedProcess {
  id: string;
  name: string | null;
  isExecutable: boolean | null;
  documentation: string | null;
  sourceLine: number | null;
  /** Not detailed by the contract. */
  participant: unknown;
  laneSets: ImportedLaneSet[];
  nodes: ImportedNode[];
  sequenceFlows: ImportedSequenceFlow[];
  extensions: Extensions;
  unrecognized: GenericElement[];
}

export interface ImportedDocument {
  definitionsId: string | null;
  name: string | null;
  targetNamespace: string | null;
  sourceLine: number | null;
  /** Not detailed by the contract. */
  participants: unknown[];
  processes: ImportedProcess[];
  extensions: Extensions;
  unrecognized: GenericElement[];
}

/** Body of a 200 from `POST /api/v1/processes/import`. */
export interface ImportResult {
  /** True when the formal analysis can run; says nothing about BPMN validity. */
  supported: boolean;
  diagnostics: Diagnostic[];
  document: ImportedDocument;
}
