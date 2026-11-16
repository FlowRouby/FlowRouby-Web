import { Component, computed, input } from '@angular/core';
import type { CompileResult } from '../../../../core/models/compile-result';
import { deadlockLabel } from '../../models/analysis-messages';
import { flowOrder } from '../../models/dfa-order';
import { DiagnosticList } from '../diagnostic-list/diagnostic-list';
import { NodeRef } from '../node-ref/node-ref';

@Component({
  imports: [NodeRef, DiagnosticList],
  selector: 'app-formal-analysis-view',
  templateUrl: './formal-analysis-view.html',
  host: { class: 'block space-y-4 text-sm' },
})
export class FormalAnalysisView {
  readonly result = input.required<CompileResult>();

  protected readonly analysis = computed(() => this.result().formal_analysis);
  protected readonly dfa = computed(() => this.analysis().dfa);
  /** States and symbols in the order the process flows; the backend sends them sorted by name. */
  protected readonly order = computed(() => flowOrder(this.dfa()));
  protected readonly diagnostics = computed(() => this.result().validation.diagnostics);
  /** Shapes the backend never returned non-empty are shown generically, only when present. */
  protected readonly unknownFindings = computed(() => {
    const { flag_regions, diagnostics } = this.analysis();
    return [
      { title: 'Regiones con banderas', items: flag_regions },
      { title: 'Ciclos infinitos', items: diagnostics.infinite_loops },
      { title: 'Ciclos válidos', items: diagnostics.valid_loops },
    ].filter((finding) => finding.items.length > 0);
  });

  protected readonly labelOf = deadlockLabel;

  protected target(state: string, symbol: string): string {
    return this.dfa().transitions[state]?.[symbol] ?? '';
  }

  protected isStart(state: string): boolean {
    return state === this.dfa().start_state;
  }

  protected isAccept(state: string): boolean {
    return this.dfa().accept_states.includes(state);
  }

  /** Set notation for a list of states or symbols: `{D0, D1}`, or `∅` when it is empty. */
  protected setOf(items: readonly string[]): string {
    return items.length === 0 ? '∅' : `{${items.join(', ')}}`;
  }

  protected json(value: unknown): string {
    return JSON.stringify(value);
  }
}
