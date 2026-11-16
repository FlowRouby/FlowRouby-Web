import type { Diagnostic } from '../../../core/models/diagnostic';
import { bySeverity, markersFor } from './diagnostic-severity';

const make = (severity: Diagnostic['severity'], elementId: string | null): Diagnostic => ({
  severity,
  code: 'X',
  message: '',
  elementId,
  elementType: null,
  processId: null,
  blocksAnalysis: false,
  line: null,
});

describe('diagnostic severity', () => {
  it('sorts errors, then warnings, then info, keeping the original order within a severity', () => {
    const list = [make('info', 'a'), make('warning', 'b'), make('error', 'c'), make('warning', 'd')];
    expect(list.sort(bySeverity).map((d) => d.elementId)).toEqual(['c', 'b', 'd', 'a']);
  });

  it('maps each element to the marker of its worst severity and skips null ids', () => {
    const markers = markersFor([make('info', 'a'), make('error', 'a'), make('warning', 'b'), make('error', null)]);
    expect([...markers]).toEqual([
      ['a', 'fr-error'],
      ['b', 'fr-warning'],
    ]);
  });
});
