import { SIMULATION_WITH_INPUT } from '../../../core/testing/simulation-fixtures';
import { pathMarkers, type PathCanvas } from './simulation-path';

/** A canvas made of `source>target: connectionId` pairs; every node and connection named in them exists. */
const canvasOf = (flows: Record<string, string>, missing: string[] = []): PathCanvas => {
  const present = new Set([...Object.keys(flows).flatMap((pair) => pair.split('>')), ...Object.values(flows)]);
  missing.forEach((id) => present.delete(id));
  return { hasElement: (id) => present.has(id), connectionBetween: (a, b) => flows[`${a}>${b}`] ?? null };
};
const sorted = (markers: Map<string, string>) => [...markers.keys()].sort();

describe('pathMarkers', () => {
  const ids = SIMULATION_WITH_INPUT.bpmn_node_ids;
  const steps = SIMULATION_WITH_INPUT.simulation.step_logs;
  const flows = { 'Start>Review': 'f1', 'Review>Decide': 'f2', 'Decide>Notify': 'f3', 'Decide>Reject': 'f4', 'Notify>EndOk': 'f5', 'Reject>EndNo': 'f6' };

  it('marks the executed nodes and the connections the run followed', () => {
    const markers = pathMarkers(steps, ids, canvasOf(flows));
    expect(sorted(markers)).toEqual(['Decide', 'EndOk', 'Notify', 'Review', 'Start', 'f1', 'f2', 'f3', 'f5']);
    expect(new Set(markers.values())).toEqual(new Set(['fr-path']));
  });

  it('does not mark the branch an exclusive gateway did not take', () => {
    const markers = pathMarkers(steps, ids, canvasOf(flows));
    expect(markers.has('Reject')).toBe(false);
    expect(markers.has('f4')).toBe(false);
  });

  describe('a parallel split and join (real payload of sample 04-paralelo-and)', () => {
    const parallelIds = {
      start_1: 'Start_Pedido',
      parallel_1: 'Gateway_Dividir',
      task_1: 'Task_Facturar',
      task_2: 'Task_Empacar',
      parallel_2: 'Gateway_Unir',
      task_3: 'Task_Despachar',
      end_1: 'End_Pedido',
    };
    const parallelSteps = [
      { node_id: 'start_1' },
      { node_id: 'parallel_1', selected_targets: ['task_1', 'task_2'] },
      { node_id: 'task_1' },
      { node_id: 'task_2' },
      { node_id: 'parallel_2', selected_targets: [] },
      { node_id: 'parallel_2', selected_targets: ['task_3'] },
      { node_id: 'task_3' },
      { node_id: 'end_1' },
    ];
    const parallelFlows = {
      'Start_Pedido>Gateway_Dividir': 'Flow_P1',
      'Gateway_Dividir>Task_Facturar': 'Flow_P2',
      'Gateway_Dividir>Task_Empacar': 'Flow_P3',
      'Task_Facturar>Gateway_Unir': 'Flow_P4',
      'Task_Empacar>Gateway_Unir': 'Flow_P5',
      'Gateway_Unir>Task_Despachar': 'Flow_P6',
      'Task_Despachar>End_Pedido': 'Flow_P7',
    };

    it('marks both branches out of the split and both into the join', () => {
      const markers = pathMarkers(parallelSteps, parallelIds, canvasOf(parallelFlows));
      for (const flow of Object.values(parallelFlows)) expect(markers.has(flow)).toBe(true);
      expect(markers.size).toBe(14);
    });

    it('does not invent a connection between branches that ran one after the other', () => {
      const asked: string[] = [];
      const base = canvasOf(parallelFlows);
      const markers = pathMarkers(parallelSteps, parallelIds, {
        hasElement: base.hasElement,
        connectionBetween: (a, b) => {
          asked.push(`${a}>${b}`);
          return a === 'Task_Facturar' && b === 'Task_Empacar' ? 'Ghost' : base.connectionBetween(a, b);
        },
      });
      // The canvas is asked, but a connection that does not exist on it is never marked.
      expect(asked).toContain('Task_Facturar>Task_Empacar');
      expect(markers.has('Ghost')).toBe(false);
    });
  });

  it('marks only the connections a gateway selected, even when its other target ran on another branch', () => {
    const markers = pathMarkers(
      [{ node_id: 'a' }, { node_id: 'g', selected_targets: ['b'] }, { node_id: 'b' }, { node_id: 'c' }],
      { a: 'A', g: 'G', b: 'B', c: 'C' },
      canvasOf({ 'A>G': 'ag', 'G>B': 'gb', 'G>C': 'gc', 'A>C': 'ac' }),
    );
    expect(markers.has('gb')).toBe(true);
    expect(markers.has('gc')).toBe(false);
    expect(markers.has('ac')).toBe(true);
  });

  it('does not mark the connection to a selected target that never ran', () => {
    const markers = pathMarkers(
      [{ node_id: 'a' }, { node_id: 'g', selected_targets: ['b'] }],
      { a: 'A', g: 'G', b: 'B' },
      canvasOf({ 'A>G': 'ag', 'G>B': 'gb' }),
    );
    expect(sorted(markers)).toEqual(['A', 'G', 'ag']);
  });

  it('marks the connection that closes a loop', () => {
    const markers = pathMarkers(
      [{ node_id: 'g', selected_targets: ['a'] }, { node_id: 'a' }, { node_id: 'g', selected_targets: ['a'] }, { node_id: 'a' }],
      { g: 'G', a: 'A' },
      canvasOf({ 'G>A': 'ga', 'A>G': 'back' }),
    );
    expect(sorted(markers)).toEqual(['A', 'G', 'back', 'ga']);
  });

  it('skips a symbol without a mapping and does not bridge the gap', () => {
    const markers = pathMarkers([{ node_id: 'start_1' }, { node_id: 'ghost_9' }, { node_id: 'decision_1', selected_targets: [] }], ids, canvasOf(flows));
    expect(sorted(markers)).toEqual(['Decide', 'Start']);
  });

  it('skips a mapped element that is not on the canvas, with the connections around it', () => {
    const markers = pathMarkers(steps, ids, canvasOf(flows, ['Decide']));
    expect(markers.has('Decide')).toBe(false);
    expect(markers.has('f2')).toBe(false);
    expect(markers.has('f3')).toBe(false);
    expect(markers.has('Review')).toBe(true);
  });

  it('skips a connection that is missing from the canvas', () => {
    const markers = pathMarkers(steps, ids, canvasOf(flows, ['f1']));
    expect(markers.has('f1')).toBe(false);
    expect(markers.has('Start')).toBe(true);
  });

  it('never marks anything for a null map', () => {
    expect(pathMarkers(steps, null, canvasOf(flows)).size).toBe(0);
  });

  it('never passes a raw symbol to the canvas', () => {
    const asked: string[] = [];
    pathMarkers([{ node_id: 'task_1' }, { node_id: 'ghost' }, { node_id: 'decision_1', selected_targets: ['task_2', 'nope'] }], ids, {
      hasElement: (id) => {
        asked.push(id);
        return true;
      },
      connectionBetween: (a, b) => {
        asked.push(a, b);
        return null;
      },
    });
    expect(asked.every((id) => !/^(task|ghost|decision|nope)/.test(id))).toBe(true);
    expect(asked).toContain('Review');
  });

  it('handles an empty route', () => {
    expect(pathMarkers([], ids, canvasOf(flows)).size).toBe(0);
  });
});
