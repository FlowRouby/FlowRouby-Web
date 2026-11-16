/** What the user typed in the trace field: DFA symbols or original diagram ids. */
export type TraceInputKind = 'symbols' | 'bpmn-ids';

const SEPARATORS = /\s+|,|→|->|·/;

/** Splits the typed route into tokens. Empty tokens are dropped; an empty text is a valid empty trace. */
export function parseTrace(text: string): string[] {
  return text.split(SEPARATORS).filter((token) => token !== '');
}
