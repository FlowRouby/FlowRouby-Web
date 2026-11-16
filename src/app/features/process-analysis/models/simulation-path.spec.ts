import { SIMULATION_WITH_INPUT } from '../../../core/testing/simulation-fixtures';
import { pathMarkers, type PathCanvas } from './simulation-path';

describe('pathMarkers', () => {
  const ids = SIMULATION_WITH_INPUT.bpmn_node_ids;
  const visited = SIMULATION_WITH_INPUT.simulation.visited_nodes;
  const flows: Record<string, string> = { 'Start>Review': 'f1', 'Review>Decide': 'f2', 'Decide>Notify': 'f3', 'Notify>EndOk': 'f5' };
  const canvas = (present: string[]): PathCanvas => ({
    hasElement: (id) => present.includes(id),
    connectionBetween: (a, b) => flows[`${a}>${b}`] ?? null,
  });
  const everything = ['Start', 'Review', 'Decide', 'Notify', 'EndOk', 'f1', 'f2', 'f3', 'f5'];

  it('marks the visited nodes and the connection of each consecutive pair', () => {
    const markers = pathMarkers(visited, ids, canvas(everything));
    expect([...markers.keys()]).toEqual(['Start', 'Review', 'f1', 'Decide', 'f2', 'Notify', 'f3', 'EndOk', 'f5']);
    expect(new Set(markers.values())).toEqual(new Set(['fr-path']));
  });

  it('does not mark the branch that was not taken', () => {
    expect(pathMarkers(visited, ids, canvas(everything)).has('Reject')).toBe(false);
  });

  it('skips a symbol without a mapping and does not bridge the gap', () => {
    const markers = pathMarkers(['start_1', 'ghost_9', 'task_1'], ids, canvas(everything));
    expect([...markers.keys()]).toEqual(['Start', 'Review']);
  });

  it('skips a mapped element that is not on the canvas', () => {
    const markers = pathMarkers(visited, ids, canvas(everything.filter((id) => id !== 'Decide')));
    expect(markers.has('Decide')).toBe(false);
    expect(markers.has('f2')).toBe(false);
    expect(markers.has('f3')).toBe(false);
    expect(markers.has('Review')).toBe(true);
  });

  it('skips a connection that is missing from the canvas', () => {
    const markers = pathMarkers(visited, ids, canvas(everything.filter((id) => id !== 'f1')));
    expect(markers.has('f1')).toBe(false);
    expect(markers.has('Start')).toBe(true);
  });

  it('never marks anything for a null map', () => {
    expect(pathMarkers(visited, null, canvas(everything)).size).toBe(0);
  });

  it('never passes a raw symbol to the canvas', () => {
    const asked: string[] = [];
    pathMarkers(['task_1', 'ghost'], ids, {
      hasElement: (id) => {
        asked.push(id);
        return true;
      },
      connectionBetween: () => null,
    });
    expect(asked).toEqual(['Review']);
  });

  it('handles an empty route', () => {
    expect(pathMarkers([], ids, canvas(everything)).size).toBe(0);
  });
});
