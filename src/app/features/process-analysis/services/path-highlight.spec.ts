import { TestBed } from '@angular/core/testing';
import { BpmnModeler } from '../../process-editor/services/bpmn-modeler';
import { PathHighlight } from './path-highlight';

describe('PathHighlight', () => {
  const modeler = { applyMarkers: vi.fn() };
  let highlight: PathHighlight;
  const markers = new Map([['Start', 'fr-path']]);

  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({ providers: [{ provide: BpmnModeler, useValue: modeler }] });
    highlight = TestBed.inject(PathHighlight);
  });

  it('has no owner at first', () => {
    expect(highlight.owner()).toBeNull();
  });

  it('paints the markers in the path group and records the owner', () => {
    highlight.show('simulation', markers);

    expect(modeler.applyMarkers).toHaveBeenCalledWith(markers, 'path');
    expect(highlight.owner()).toBe('simulation');
  });

  it('replaces the route of another owner', () => {
    highlight.show('simulation', markers);
    const other = new Map([['Review', 'fr-path']]);

    highlight.show('trace', other);

    expect(modeler.applyMarkers).toHaveBeenLastCalledWith(other, 'path');
    expect(highlight.owner()).toBe('trace');
  });

  it('leaves no owner when shown an empty map, and still clears the previous route', () => {
    highlight.show('simulation', markers);

    highlight.show('trace', new Map());

    expect(modeler.applyMarkers).toHaveBeenLastCalledWith(new Map(), 'path');
    expect(highlight.owner()).toBeNull();
  });

  it('clears the route of the current owner', () => {
    highlight.show('trace', markers);

    highlight.clear('trace');

    expect(modeler.applyMarkers).toHaveBeenLastCalledWith(new Map(), 'path');
    expect(highlight.owner()).toBeNull();
  });

  it('does not clear a route painted by another owner', () => {
    highlight.show('trace', markers);
    modeler.applyMarkers.mockClear();

    highlight.clear('simulation');

    expect(modeler.applyMarkers).not.toHaveBeenCalled();
    expect(highlight.owner()).toBe('trace');
  });

  it('does nothing when there is no route to clear', () => {
    highlight.clear('simulation');
    expect(modeler.applyMarkers).not.toHaveBeenCalled();
  });
});
