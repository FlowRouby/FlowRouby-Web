import { diagnosticMessage, failureMessage, KNOWN_DIAGNOSTIC_CODES } from './analysis-messages';

// Every code in section 4 of the backend contract.
const CONTRACT_CODES = [
  'INVALID_UPLOAD',
  'XML_MALFORMED',
  'NOT_BPMN',
  'NO_PROCESS',
  'MISSING_ID',
  'DUPLICATE_ID',
  'MISSING_REF_ATTRIBUTE',
  'INVALID_REFERENCE',
  'NO_START_EVENT',
  'NO_END_EVENT',
  'UNSUPPORTED_ELEMENT',
  'MULTIPLE_START_EVENTS',
  'MULTIPLE_PROCESSES',
  'PRESERVED_NOT_ANALYZABLE',
  'DISCONNECTED_NODE',
  'GATEWAY_WITHOUT_OUTGOING',
  'XOR_FLOW_WITHOUT_CONDITION_OR_DEFAULT',
  'IGNORED_ELEMENT',
];

const FALLBACK = 'Se detectó una incidencia en el diagrama.';

describe('analysis messages', () => {
  it('covers every code of the contract', () => {
    expect([...KNOWN_DIAGNOSTIC_CODES].sort()).toEqual([...CONTRACT_CODES].sort());
  });

  it.each(CONTRACT_CODES)('has a specific Spanish message for %s', (code) => {
    expect(diagnosticMessage(code)).not.toBe(FALLBACK);
    expect(diagnosticMessage(code).length).toBeGreaterThan(10);
  });

  it('falls back to a generic Spanish message for unknown codes, including inherited object keys', () => {
    expect(diagnosticMessage('SOMETHING_NEW')).toBe(FALLBACK);
    expect(diagnosticMessage('constructor')).toBe(FALLBACK);
  });

  it('describes each failure without diagnostics by kind, never with the raw backend text', () => {
    expect(failureMessage({ kind: 'network', status: 0 })).toContain('conectar');
    expect(failureMessage({ kind: 'validation', status: 422, issues: [] })).toContain('archivo');
    expect(failureMessage({ kind: 'message', status: 422, detail: { message: 'raw backend text' } })).not.toContain(
      'raw',
    );
    expect(failureMessage({ kind: 'unknown', status: 500 })).toContain('inesperado');
  });
});
