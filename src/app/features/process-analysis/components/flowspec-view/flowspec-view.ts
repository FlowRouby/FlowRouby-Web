import { Component, computed, input } from '@angular/core';
import type { FlowSpec } from '../../../../core/models/compile-result';
import { NodeRef } from '../node-ref/node-ref';

@Component({
  imports: [NodeRef],
  selector: 'app-flowspec-view',
  templateUrl: './flowspec-view.html',
  host: { class: 'block space-y-3 text-sm' },
})
export class FlowspecView {
  readonly flowspec = input.required<FlowSpec>();
  protected readonly variables = computed(() => Object.values(this.flowspec().symbol_table.variables));
}
