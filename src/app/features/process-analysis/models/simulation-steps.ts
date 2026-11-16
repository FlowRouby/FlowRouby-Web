import type { StepLog } from '../../../core/models/simulation-result';

/** A block of steps that ran again, identically, right after the block shown just before it. */
export interface StepRepeat {
  /** How many more times the block ran. */
  times: number;
  /** How many steps the block has. */
  length: number;
  /** Step numbers of the first and last step left out. */
  from: number;
  to: number;
}

export type StepItem = { step: StepLog; repeat?: undefined } | { repeat: StepRepeat; step?: undefined };

/** A block must run at least this many times in a row to be collapsed. */
const MIN_RUNS = 3;

/** Two steps are the same when they ran the same node with the same outcome; the step number is ignored. */
function signature(step: StepLog): string {
  return JSON.stringify([step.node_id, step.kind, step.selected_targets ?? null, step.context_updates ?? null, step.action ?? null]);
}

/**
 * Collapses a loop that ran several times with the same outcome: its first run is kept step by step and the
 * following identical runs become one `repeat` item. A loop whose data changes on each run is not collapsed.
 */
export function collapseRepeats(steps: readonly StepLog[]): StepItem[] {
  const signatures = steps.map(signature);
  const items: StepItem[] = [];
  let index = 0;
  while (index < steps.length) {
    const block = repeatedBlockAt(signatures, index);
    if (!block) {
      items.push({ step: steps[index] });
      index++;
      continue;
    }
    for (let offset = 0; offset < block.length; offset++) items.push({ step: steps[index + offset] });
    const end = index + block.length * block.runs;
    items.push({
      repeat: { times: block.runs - 1, length: block.length, from: steps[index + block.length].step, to: steps[end - 1].step },
    });
    index = end;
  }
  return items;
}

/** The shortest block starting at `start` that runs at least `MIN_RUNS` times in a row, or null. */
function repeatedBlockAt(signatures: readonly string[], start: number): { length: number; runs: number } | null {
  const longest = Math.floor((signatures.length - start) / MIN_RUNS);
  for (let length = 1; length <= longest; length++) {
    let runs = 1;
    while (sameBlock(signatures, start, start + runs * length, length)) runs++;
    if (runs >= MIN_RUNS) return { length, runs };
  }
  return null;
}

function sameBlock(signatures: readonly string[], first: number, second: number, length: number): boolean {
  if (second + length > signatures.length) return false;
  for (let offset = 0; offset < length; offset++) {
    if (signatures[first + offset] !== signatures[second + offset]) return false;
  }
  return true;
}
