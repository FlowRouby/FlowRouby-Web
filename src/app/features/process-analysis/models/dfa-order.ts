import type { Dfa } from '../../../core/models/compile-result';

export interface DfaOrder {
  states: string[];
  alphabet: string[];
}

/**
 * Orders the states and symbols of a DFA as the process flows: breadth-first from the start state.
 * The backend sorts both alphabetically, which puts end events before start events.
 * Anything not reachable from the start state keeps the backend order, after the rest.
 */
export function flowOrder(dfa: Dfa): DfaOrder {
  const states = new Set<string>();
  const alphabet = new Set<string>();
  const queue = dfa.states.includes(dfa.start_state) ? [dfa.start_state] : [];

  for (let state = queue.shift(); state !== undefined; state = queue.shift()) {
    if (states.has(state)) continue;
    states.add(state);
    const outgoing = dfa.transitions[state] ?? {};
    for (const symbol of dfa.alphabet) {
      const target = outgoing[symbol];
      if (target === undefined) continue;
      alphabet.add(symbol);
      queue.push(target);
    }
  }

  dfa.states.forEach((state) => states.add(state));
  dfa.alphabet.forEach((symbol) => alphabet.add(symbol));
  return { states: [...states], alphabet: [...alphabet] };
}
