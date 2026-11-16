import { Service } from '@angular/core';

export interface StoredDiagram {
  xml: string;
  filename: string;
}

/** One versioned key: a future shape change bumps the suffix instead of misreading old data. */
export const DIAGRAM_STORAGE_KEY = 'flowrouby.diagram.v1';

function isStoredDiagram(value: unknown): value is StoredDiagram {
  if (typeof value !== 'object' || value === null) return false;
  const { xml, filename } = value as Record<string, unknown>;
  return typeof xml === 'string' && typeof filename === 'string';
}

/**
 * Keeps the last open diagram (only its XML and file name) in `localStorage`. The storage can be missing, full
 * or blocked, so every access is guarded and a failure just means nothing is kept.
 */
@Service()
export class DiagramStorage {
  save(diagram: StoredDiagram): void {
    try {
      localStorage.setItem(DIAGRAM_STORAGE_KEY, JSON.stringify({ xml: diagram.xml, filename: diagram.filename }));
    } catch {
      // Unavailable or full: the editor works the same, it just cannot restore the diagram later.
    }
  }

  /** The saved diagram, or null when there is none or what is stored is unreadable or has the wrong shape. */
  load(): StoredDiagram | null {
    try {
      const raw = localStorage.getItem(DIAGRAM_STORAGE_KEY);
      if (raw === null) return null;
      const parsed: unknown = JSON.parse(raw);
      return isStoredDiagram(parsed) ? { xml: parsed.xml, filename: parsed.filename } : null;
    } catch {
      return null;
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(DIAGRAM_STORAGE_KEY);
    } catch {
      // Nothing to clear when the storage is unavailable.
    }
  }
}
