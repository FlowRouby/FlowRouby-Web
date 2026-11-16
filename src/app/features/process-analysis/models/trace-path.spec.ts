import type { TraceValidationResult } from '../../../core/models/trace-validation-result';
import {
  TRACE_ACCEPTED,
  TRACE_NO_TRANSITION,
  TRACE_NOT_ACCEPTING,
  TRACE_UNKNOWN_SYMBOL,
} from '../../../core/testing/trace-validation-fixtures';
import type { PathCanvas } from './simulation-path';
import { REJECTED_MARKER, traceMarkers } from './trace-path';

describe('traceMarkers', () => {
  const flows: Record<string, string> = {
    'Start>Review': 'f1',
    'Review>Decide': 'f2',
    'Decide>Notify': 'f3',
    'Decide>Reject': 'f4',
    'Notify>EndOk': 'f5',
  };
  const everything = ['Start', 'Review', 'Decide', 'Notify', 'Reject', 'EndOk', 'EndNo', ...Object.values(flows)];
  const canvas = (present: string[] = everything, connections: Record<string, string> = flows): PathCanvas => ({
    hasElement: (id) => present.includes(id),
    connectionBetween: (a, b) => connections[`${a}>${b}`] ?? null,
  });
  const result = (
    nodeIds: Record<string, string>,
    steps: [string, string[]][],
    extra: Partial<TraceValidationResult['validation']> = {},
  ): TraceValidationResult => ({
    process_id: 'P',
    bpmn_node_ids: nodeIds,
    validation: {
      accepted: true,
      trace: steps.map(([symbol]) => symbol),
      steps: steps.map(([symbol, via], index) => ({ index, symbol, from_state: `D${index}`, to_state: `D${index + 1}`, via_gateways: via })),
      consumed: steps.length,
      final_state: 'D9',
      rejected_at: null,
      rejection_reason: null,
      expected_symbols: [],
      ...extra,
    },
  });

  it('paints the steps, the crossed gateway and the connections between them (XOR)', () => {
    const markers = traceMarkers(TRACE_ACCEPTED, canvas());

    expect([...markers.keys()].sort()).toEqual(['Start', 'Review', 'Decide', 'Notify', 'EndOk', 'f1', 'f2', 'f3', 'f5'].sort());
    expect(new Set(markers.values())).toEqual(new Set(['fr-path']));
    expect(markers.has('Reject')).toBe(false);
    expect(markers.has('f4')).toBe(false);
  });

  it('paints a step with two gateways in order and chains the connections', () => {
    const nodeIds = { a: 'A', g1: 'G1', g2: 'G2', b: 'B' };
    const connections = { 'A>G1': 'c1', 'G1>G2': 'c2', 'G2>B': 'c3' };
    const markers = traceMarkers(
      result(nodeIds, [['a', []], ['b', ['g1', 'g2']]]),
      canvas(['A', 'G1', 'G2', 'B', 'c1', 'c2', 'c3'], connections),
    );

    expect([...markers.keys()]).toEqual(['A', 'c1', 'G1', 'c2', 'G2', 'c3', 'B']);
  });

  it('marks both connections entering a parallel join reached from two branches', () => {
    const nodeIds = { s: 'S', t1: 'T1', t2: 'T2', e: 'E', join: 'J' };
    const connections = { 'T1>J': 'j1', 'T2>J': 'j2', 'J>E': 'j3' };
    const markers = traceMarkers(
      result(nodeIds, [['s', []], ['t1', []], ['t2', []], ['e', ['join']]]),
      canvas(['S', 'T1', 'T2', 'E', 'J', 'j1', 'j2', 'j3'], connections),
    );

    expect(markers.get('j1')).toBe('fr-path');
    expect(markers.get('j2')).toBe('fr-path');
    expect(markers.get('j3')).toBe('fr-path');
    expect(markers.get('J')).toBe('fr-path');
  });

  it('skips symbols without a mapping and elements that are not on the canvas', () => {
    const unmapped = result({ a: 'A' }, [['a', []], ['ghost', []]]);
    expect([...traceMarkers(unmapped, canvas(['A'])).keys()]).toEqual(['A']);

    const missing = traceMarkers(TRACE_ACCEPTED, canvas(everything.filter((id) => id !== 'Decide')));
    expect(missing.has('Decide')).toBe(false);
    expect(missing.has('f2')).toBe(false);
    expect(missing.has('f3')).toBe(false);
    expect(missing.has('Review')).toBe(true);
  });

  it('skips a connection that is missing from the canvas', () => {
    const markers = traceMarkers(TRACE_ACCEPTED, canvas(everything.filter((id) => id !== 'f1')));
    expect(markers.has('f1')).toBe(false);
    expect(markers.has('Start')).toBe(true);
  });

  it('marks the rejected element with its own marker, after the consumed route', () => {
    const markers = traceMarkers(TRACE_NO_TRANSITION, canvas());

    expect(markers.get('EndNo')).toBe(REJECTED_MARKER);
    expect(markers.get('Review')).toBe('fr-path');
    expect(markers.get('f1')).toBe('fr-path');
  });

  it('lets the rejected marker win over the path marker of the same element', () => {
    const looped = result({ a: 'A', b: 'B' }, [['a', []], ['b', []]], {
      accepted: false,
      trace: ['a', 'b', 'a'],
      rejected_at: 2,
      rejection_reason: 'NO_TRANSITION',
    });

    expect(traceMarkers(looped, canvas(['A', 'B'], {})).get('A')).toBe(REJECTED_MARKER);
  });

  it('marks nothing as rejected for an unknown symbol that is not on the canvas', () => {
    const markers = traceMarkers(TRACE_UNKNOWN_SYMBOL, canvas());

    expect([...markers.values()]).not.toContain(REJECTED_MARKER);
    expect([...markers.keys()]).toEqual(['Start']);
  });

  it('does not mark a rejected element that is not on the canvas', () => {
    const markers = traceMarkers(TRACE_NO_TRANSITION, canvas(everything.filter((id) => id !== 'EndNo')));
    expect([...markers.values()]).not.toContain(REJECTED_MARKER);
  });

  it('marks no rejected element for NOT_ACCEPTING_STATE', () => {
    const markers = traceMarkers(TRACE_NOT_ACCEPTING, canvas());

    expect([...markers.values()]).not.toContain(REJECTED_MARKER);
    expect([...markers.keys()].sort()).toEqual(['Start', 'Review', 'f1'].sort());
  });

  it('handles an empty trace', () => {
    expect(traceMarkers(result({}, []), canvas()).size).toBe(0);
  });

  it('never passes a raw symbol to the canvas', () => {
    const asked: string[] = [];
    traceMarkers(result({ a: 'A' }, [['a', []], ['ghost', ['g']]]), {
      hasElement: (id) => {
        asked.push(id);
        return true;
      },
      connectionBetween: () => null,
    });
    expect(asked).toEqual(['A']);
  });
});
