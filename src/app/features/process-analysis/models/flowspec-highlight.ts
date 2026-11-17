export type FlowspecTokenKind = 'keyword' | 'boolean' | 'string' | 'number' | 'comment' | 'operator' | 'identifier' | 'text';

export interface FlowspecToken {
  kind: FlowspecTokenKind;
  text: string;
}

/**
 * Reserved words of FlowSpec, copied from `KEYWORDS` in the backend lexer
 * (`flowspec/lexer/lexer.py`). They are case-sensitive, and `true`/`false` are boolean literals, not keywords.
 */
const KEYWORDS: ReadonlySet<string> = new Set([
  'process', 'lane', 'as', 'start', 'end', 'user', 'service', 'script', 'manual', 'business', 'rule', 'call',
  'activity', 'task', 'decision', 'parallel', 'inclusive', 'split', 'ask', 'labeled', 'use', 'form', 'delegate',
  'decide', 'into', 'set', 'input', 'output', 'run', 'http', 'method', 'url', 'headers', 'payload', 'with', 'save',
  'from', 'next', 'if', 'otherwise', 'go', 'to', 'branch', 'is', 'and', 'or', 'not',
]);
const BOOLEANS: ReadonlySet<string> = new Set(['true', 'false']);

/** Same lexemes as `TOKEN_SPECIFICATION` in the backend lexer: comment, string, number, identifier, operator. */
const LEXEME = /(\/\/[^\n]*|#[^\n]*)|("(?:\\.|[^"\\])*")|(\d+(?:\.\d+)?)|([A-Za-z_][A-Za-z0-9_]*)|(<=|>=|[<>+\-*/()])/g;

/**
 * Splits FlowSpec code into tokens for display. Joining the `text` of every token gives the code back unchanged;
 * whitespace and anything the lexer would not recognise come out as `text`.
 */
export function highlightFlowspec(code: string): FlowspecToken[] {
  const tokens: FlowspecToken[] = [];
  let last = 0;
  for (const match of code.matchAll(LEXEME)) {
    if (match.index > last) tokens.push({ kind: 'text', text: code.slice(last, match.index) });
    tokens.push({ kind: kindOf(match), text: match[0] });
    last = match.index + match[0].length;
  }
  if (last < code.length) tokens.push({ kind: 'text', text: code.slice(last) });
  return tokens;
}

function kindOf(match: RegExpMatchArray): FlowspecTokenKind {
  if (match[1] !== undefined) return 'comment';
  if (match[2] !== undefined) return 'string';
  if (match[3] !== undefined) return 'number';
  if (match[5] !== undefined) return 'operator';
  if (KEYWORDS.has(match[0])) return 'keyword';
  return BOOLEANS.has(match[0]) ? 'boolean' : 'identifier';
}
