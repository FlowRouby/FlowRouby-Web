import { Component, computed, input } from '@angular/core';
import type { FlowSpec } from '../../../../core/models/compile-result';
import { type FlowspecTokenKind, highlightFlowspec } from '../../models/flowspec-highlight';
import { NodeRef } from '../node-ref/node-ref';

/** Theme classes of each token kind; identifiers and plain text keep the colour of the block. */
const TOKEN_CLASS: Record<FlowspecTokenKind, string> = {
  keyword: 'font-semibold text-primary',
  boolean: 'text-info',
  number: 'text-info',
  string: 'text-path',
  operator: 'text-warning',
  comment: 'italic text-content-muted',
  identifier: '',
  text: '',
};

@Component({
  imports: [NodeRef],
  selector: 'app-flowspec-view',
  templateUrl: './flowspec-view.html',
  host: { class: 'block space-y-3 text-sm' },
})
export class FlowspecView {
  readonly flowspec = input.required<FlowSpec>();
  protected readonly variables = computed(() => Object.values(this.flowspec().symbol_table.variables));
  protected readonly tokens = computed(() => highlightFlowspec(this.flowspec().code));

  protected classOf(kind: FlowspecTokenKind): string {
    return TOKEN_CLASS[kind];
  }
}
