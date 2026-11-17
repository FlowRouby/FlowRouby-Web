import { TestBed } from '@angular/core/testing';
import type Modeler from 'bpmn-js/lib/Modeler';
import { BPMN_MODELER_FACTORY, BpmnModeler } from './bpmn-modeler';

type Handler = (event?: unknown) => void;

const fake = (() => {
  const elements = new Map<string, { id: string; type: string; businessObject: object; outgoing?: { id: string; target?: { id: string } }[] }>();
  const handlers = new Map<string, Handler[]>();
  const canvas = { addMarker: vi.fn(), removeMarker: vi.fn(), scrollToElement: vi.fn(), zoom: vi.fn() };
  const selection = { select: vi.fn() };
  const propertiesPanel = { attachTo: vi.fn(), detach: vi.fn() };
  const services: Record<string, unknown> = {
    canvas,
    selection,
    propertiesPanel,
    elementRegistry: { get: (id: string) => elements.get(id) },
  };
  const emit = (name: string) => (handlers.get(name) ?? []).forEach((h) => h());
  return { elements, handlers, canvas, selection, propertiesPanel, services, emit };
})();

/** Stands in for bpmn-js. Provided through the factory token, so it does not depend on module mocking. */
class FakeModeler {
  on(names: string | string[], handler: Handler) {
    for (const name of [names].flat()) fake.handlers.set(name, [...(fake.handlers.get(name) ?? []), handler]);
  }
  get(name: string) {
    return fake.services[name];
  }
  async createDiagram() {
    fake.emit('commandStack.changed');
  }
  async importXML() {
    fake.emit('commandStack.changed');
  }
  destroy() {}
}

describe('BpmnModeler', () => {
  let service: BpmnModeler;

  beforeEach(() => {
    vi.clearAllMocks();
    fake.elements.clear();
    fake.handlers.clear();
    TestBed.configureTestingModule({
      providers: [{ provide: BPMN_MODELER_FACTORY, useValue: () => new FakeModeler() as unknown as Modeler }],
    });
    service = TestBed.inject(BpmnModeler);
  });

  const addElement = (id: string) => fake.elements.set(id, { id, type: 'bpmn:Task', businessObject: {} });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('notifies load listeners synchronously when an attach starts, before the diagram exists', () => {
    const listener = vi.fn();
    service.onLoad(listener);

    const attaching = service.attach(document.createElement('div'));

    expect(listener).toHaveBeenCalledTimes(1);
    return attaching;
  });

  describe('properties panel', () => {
    it('mounts into the host when the modeler already exists', async () => {
      const host = document.createElement('div');
      await service.attach(document.createElement('div'));

      service.mountPropertiesPanel(host);

      expect(fake.propertiesPanel.attachTo).toHaveBeenCalledWith(host);
    });

    it('mounts as soon as the modeler is attached when asked before it exists', async () => {
      const host = document.createElement('div');

      service.mountPropertiesPanel(host);
      expect(fake.propertiesPanel.attachTo).not.toHaveBeenCalled();
      await service.attach(document.createElement('div'));

      expect(fake.propertiesPanel.attachTo).toHaveBeenCalledWith(host);
    });

    it('does not mount into a host that was unmounted before the modeler existed', async () => {
      service.mountPropertiesPanel(document.createElement('div'));
      service.unmountPropertiesPanel();
      await service.attach(document.createElement('div'));

      expect(fake.propertiesPanel.attachTo).not.toHaveBeenCalled();
    });

    it('detaches the panel from the page', async () => {
      await service.attach(document.createElement('div'));

      service.unmountPropertiesPanel();

      expect(fake.propertiesPanel.detach).toHaveBeenCalledTimes(1);
    });

    it('does nothing after the modeler is destroyed', async () => {
      await service.attach(document.createElement('div'));
      service.destroy();

      expect(() => {
        service.mountPropertiesPanel(document.createElement('div'));
        service.unmountPropertiesPanel();
      }).not.toThrow();
      expect(fake.propertiesPanel.attachTo).not.toHaveBeenCalled();
      expect(fake.propertiesPanel.detach).not.toHaveBeenCalled();
    });
  });

  describe('with an attached diagram', () => {
    beforeEach(async () => {
      addElement('Task_1');
      addElement('Task_2');
      await service.attach(document.createElement('div'));
    });

    it('reports whether an id exists on the canvas', () => {
      expect(service.hasElement('Task_1')).toBe(true);
      expect(service.hasElement('Nope')).toBe(false);
    });

    it('adds the given markers and skips ids that are not on the canvas', () => {
      service.applyMarkers(
        new Map([
          ['Task_1', 'fr-error'],
          ['Nope', 'fr-warning'],
        ]),
      );

      expect(fake.canvas.addMarker).toHaveBeenCalledTimes(1);
      expect(fake.canvas.addMarker).toHaveBeenCalledWith(expect.objectContaining({ id: 'Task_1' }), 'fr-error');
    });

    it('removes a marker from an element whose id changed after it was marked', () => {
      service.applyMarkers(new Map([['Task_1', 'fr-path']]));
      const element = fake.elements.get('Task_1')!;
      fake.elements.delete('Task_1');
      element.id = 'Renamed';
      fake.elements.set('Renamed', element);

      service.applyMarkers(new Map());

      expect(fake.canvas.removeMarker).toHaveBeenCalledWith(element, 'fr-path');
    });

    it('removes the previous markers before applying new ones', () => {
      service.applyMarkers(new Map([['Task_1', 'fr-error']]));
      service.applyMarkers(new Map([['Task_2', 'fr-info']]));

      expect(fake.canvas.removeMarker).toHaveBeenCalledWith(expect.objectContaining({ id: 'Task_1' }), 'fr-error');
      expect(fake.canvas.addMarker).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'Task_2' }), 'fr-info');
    });

    it('removes the marker of a deleted element by reference, never by an id the registry no longer knows', () => {
      service.applyMarkers(new Map([['Task_1', 'fr-error']]));
      const element = fake.elements.get('Task_1');
      fake.elements.delete('Task_1');
      service.applyMarkers(new Map());

      // bpmn-js ignores an element object that left the registry, but throws on an unknown id string.
      expect(fake.canvas.removeMarker).toHaveBeenCalledTimes(1);
      expect(fake.canvas.removeMarker).toHaveBeenCalledWith(element, 'fr-error');
    });

    describe('marker groups', () => {
      beforeEach(() => {
        addElement('Flow_1');
      });

      it('keeps the markers of other groups when one group is replaced or cleared', () => {
        service.applyMarkers(new Map([['Task_1', 'fr-error']]));
        service.applyMarkers(new Map([['Task_1', 'fr-path'], ['Flow_1', 'fr-path']]), 'path');
        fake.canvas.removeMarker.mockClear();

        service.applyMarkers(new Map(), 'path');

        expect(fake.canvas.removeMarker).toHaveBeenCalledTimes(2);
        expect(fake.canvas.removeMarker).toHaveBeenCalledWith(expect.objectContaining({ id: 'Task_1' }), 'fr-path');
        expect(fake.canvas.removeMarker).toHaveBeenCalledWith(expect.objectContaining({ id: 'Flow_1' }), 'fr-path');
        expect(fake.canvas.removeMarker).not.toHaveBeenCalledWith(expect.objectContaining({ id: 'Task_1' }), 'fr-error');
      });

      it('replacing the diagnostics does not remove the path', () => {
        service.applyMarkers(new Map([['Task_1', 'fr-path']]), 'path');
        service.applyMarkers(new Map([['Task_1', 'fr-error']]));
        service.applyMarkers(new Map([['Task_2', 'fr-warning']]));

        expect(fake.canvas.removeMarker).toHaveBeenCalledTimes(1);
        expect(fake.canvas.removeMarker).toHaveBeenCalledWith(expect.objectContaining({ id: 'Task_1' }), 'fr-error');
      });

      it('skips unknown ids in a named group', () => {
        service.applyMarkers(new Map([['Nope', 'fr-path'], ['Task_2', 'fr-path']]), 'path');

        expect(fake.canvas.addMarker).toHaveBeenCalledTimes(1);
        expect(fake.canvas.addMarker).toHaveBeenCalledWith(expect.objectContaining({ id: 'Task_2' }), 'fr-path');
      });

      it('forgets every group when a diagram load starts', async () => {
        service.applyMarkers(new Map([['Task_1', 'fr-path']]), 'path');
        await service.importXml('<definitions/>');
        fake.canvas.removeMarker.mockClear();

        service.applyMarkers(new Map(), 'path');

        expect(fake.canvas.removeMarker).not.toHaveBeenCalled();
      });
    });

    describe('connectionBetween', () => {
      it('finds the connection that goes from the first element to the second', () => {
        fake.elements.get('Task_1')!.outgoing = [
          { id: 'Flow_a', target: { id: 'Task_2' } },
          { id: 'Flow_b', target: { id: 'Task_3' } },
        ];

        expect(service.connectionBetween('Task_1', 'Task_3')).toBe('Flow_b');
      });

      it('returns null when there is no such connection, in the opposite direction, or for unknown ids', () => {
        fake.elements.get('Task_1')!.outgoing = [{ id: 'Flow_a', target: { id: 'Task_2' } }];

        expect(service.connectionBetween('Task_2', 'Task_1')).toBeNull();
        expect(service.connectionBetween('Task_1', 'Task_9')).toBeNull();
        expect(service.connectionBetween('Nope', 'Task_2')).toBeNull();
        expect(service.connectionBetween('Task_2', 'Task_1')).toBeNull();
      });
    });

    it('focuses an element by marking and selecting it, without moving the viewport', () => {
      expect(service.focusElement('Task_1')).toBe(true);

      expect(fake.canvas.addMarker).toHaveBeenCalledWith(expect.objectContaining({ id: 'Task_1' }), 'fr-focus');
      expect(fake.selection.select).toHaveBeenCalledWith(fake.elements.get('Task_1'));
      expect(fake.canvas.scrollToElement).not.toHaveBeenCalled();
    });

    it('moves the focus marker from the previous element to the new one', () => {
      service.focusElement('Task_1');
      service.focusElement('Task_2');

      expect(fake.canvas.removeMarker).toHaveBeenCalledWith(expect.objectContaining({ id: 'Task_1' }), 'fr-focus');
      expect(fake.canvas.addMarker).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'Task_2' }), 'fr-focus');
    });

    it('does nothing and returns false for an id that is not on the canvas', () => {
      expect(service.focusElement('Nope')).toBe(false);

      expect(fake.canvas.addMarker).not.toHaveBeenCalled();
      expect(fake.selection.select).not.toHaveBeenCalled();
      expect(fake.canvas.scrollToElement).not.toHaveBeenCalled();
    });

    it('notifies load listeners synchronously when an import starts', async () => {
      const listener = vi.fn();
      service.onLoad(listener);

      const importing = service.importXml('<definitions/>');

      expect(listener).toHaveBeenCalledTimes(1);
      await importing;
      expect(listener).toHaveBeenCalledTimes(1);
    });

    describe('clear', () => {
      it('notifies load listeners synchronously and loads the empty diagram without reporting an edit', async () => {
        const loaded = vi.fn();
        const edited = vi.fn();
        service.onLoad(loaded);
        service.onEdited(edited);

        const clearing = service.clear();

        expect(loaded).toHaveBeenCalledTimes(1);
        await clearing;
        expect(edited).not.toHaveBeenCalled();
      });

      it('forgets the markers and fits the zoom', async () => {
        service.applyMarkers(new Map([['Task_1', 'fr-path']]), 'path');
        fake.canvas.zoom.mockClear();
        fake.canvas.removeMarker.mockClear();

        await service.clear();
        service.applyMarkers(new Map(), 'path');

        expect(fake.canvas.removeMarker).not.toHaveBeenCalled();
        expect(fake.canvas.zoom).toHaveBeenCalledWith('fit-viewport', 'auto');
      });
    });

    it('notifies edit listeners on a command stack change, but not while a diagram loads', async () => {
      const listener = vi.fn();
      service.onEdited(listener);

      await service.importXml('<definitions/>');
      expect(listener).not.toHaveBeenCalled();

      fake.emit('commandStack.changed');
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});
