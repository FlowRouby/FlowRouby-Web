import { TestBed } from '@angular/core/testing';
import { DIAGRAM_STORAGE_KEY, DiagramStorage } from './diagram-storage';

describe('DiagramStorage', () => {
  let storage: DiagramStorage;

  beforeEach(() => {
    localStorage.clear();
    storage = TestBed.inject(DiagramStorage);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('returns what was saved', () => {
    storage.save({ xml: '<definitions/>', filename: 'demo.bpmn' });

    expect(storage.load()).toEqual({ xml: '<definitions/>', filename: 'demo.bpmn' });
  });

  it('keeps only the XML and the file name', () => {
    storage.save({ xml: '<a/>', filename: 'a.bpmn', extra: 'x' } as never);

    expect(JSON.parse(localStorage.getItem(DIAGRAM_STORAGE_KEY)!)).toEqual({ xml: '<a/>', filename: 'a.bpmn' });
  });

  it('returns null when nothing is saved', () => {
    expect(storage.load()).toBeNull();
  });

  it('returns null for unparsable or wrongly shaped data', () => {
    for (const raw of ['not json', 'null', '"text"', '{}', '{"xml":1,"filename":"a"}', '{"xml":"<a/>"}']) {
      localStorage.setItem(DIAGRAM_STORAGE_KEY, raw);
      expect(storage.load()).toBeNull();
    }
  });

  it('forgets the diagram on clear', () => {
    storage.save({ xml: '<a/>', filename: 'a.bpmn' });
    storage.clear();

    expect(storage.load()).toBeNull();
    expect(localStorage.getItem(DIAGRAM_STORAGE_KEY)).toBeNull();
  });

  describe('when localStorage is unavailable', () => {
    beforeEach(() => {
      const blocked = () => {
        throw new DOMException('blocked', 'SecurityError');
      };
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(blocked);
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(blocked);
      vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(blocked);
    });

    it('never throws and loads nothing', () => {
      expect(() => storage.save({ xml: '<a/>', filename: 'a.bpmn' })).not.toThrow();
      expect(storage.load()).toBeNull();
      expect(() => storage.clear()).not.toThrow();
    });
  });
});
