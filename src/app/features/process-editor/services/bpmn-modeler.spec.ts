import { TestBed } from '@angular/core/testing';
import { BpmnModeler } from './bpmn-modeler';

type Handler = (event?: unknown) => void;

const fake = vi.hoisted(() => {
  const elements = new Map<string, { id: string; type: string; businessObject: object }>();
  const handlers = new Map<string, Handler[]>();
  const canvas = { addMarker: vi.fn(), removeMarker: vi.fn(), scrollToElement: vi.fn(), zoom: vi.fn() };
  const selection = { select: vi.fn(), get: vi.fn(() => []) };
  const services: Record<string, unknown> = {
    canvas,
    selection,
    elementRegistry: { get: (id: string) => elements.get(id) },
  };
  const emit = (name: string) => (handlers.get(name) ?? []).forEach((h) => h());
  return { elements, handlers, canvas, selection, services, emit };
});

vi.mock('bpmn-js/lib/Modeler', () => ({
  default: class {
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
  },
}));

describe('BpmnModeler', () => {
  let service: BpmnModeler;

  beforeEach(() => {
    vi.clearAllMocks();
    fake.elements.clear();
    fake.handlers.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(BpmnModeler);
  });

  const addElement = (id: string) => fake.elements.set(id, { id, type: 'bpmn:Task', businessObject: {} });

  it('should be created', () => {
    expect(service).toBeTruthy();
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
      expect(fake.canvas.addMarker).toHaveBeenCalledWith('Task_1', 'fr-error');
    });

    it('removes the previous markers before applying new ones', () => {
      service.applyMarkers(new Map([['Task_1', 'fr-error']]));
      service.applyMarkers(new Map([['Task_2', 'fr-info']]));

      expect(fake.canvas.removeMarker).toHaveBeenCalledWith('Task_1', 'fr-error');
      expect(fake.canvas.addMarker).toHaveBeenLastCalledWith('Task_2', 'fr-info');
    });

    it('never asks the canvas to remove a marker from an element that no longer exists', () => {
      service.applyMarkers(new Map([['Task_1', 'fr-error']]));
      fake.elements.delete('Task_1');
      service.applyMarkers(new Map());

      expect(fake.canvas.removeMarker).not.toHaveBeenCalled();
    });

    it('focuses an element by marking, selecting and scrolling to it', () => {
      expect(service.focusElement('Task_1')).toBe(true);

      expect(fake.canvas.addMarker).toHaveBeenCalledWith('Task_1', 'fr-focus');
      expect(fake.selection.select).toHaveBeenCalledWith(fake.elements.get('Task_1'));
      expect(fake.canvas.scrollToElement).toHaveBeenCalledWith(fake.elements.get('Task_1'));
    });

    it('moves the focus marker from the previous element to the new one', () => {
      service.focusElement('Task_1');
      service.focusElement('Task_2');

      expect(fake.canvas.removeMarker).toHaveBeenCalledWith('Task_1', 'fr-focus');
      expect(fake.canvas.addMarker).toHaveBeenLastCalledWith('Task_2', 'fr-focus');
    });

    it('does nothing and returns false for an id that is not on the canvas', () => {
      expect(service.focusElement('Nope')).toBe(false);

      expect(fake.canvas.addMarker).not.toHaveBeenCalled();
      expect(fake.selection.select).not.toHaveBeenCalled();
      expect(fake.canvas.scrollToElement).not.toHaveBeenCalled();
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
