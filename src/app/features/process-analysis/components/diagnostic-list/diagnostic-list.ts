import { Component, input } from '@angular/core';
import type { Diagnostic } from '../../../../core/models/diagnostic';
import { diagnosticMessage } from '../../models/analysis-messages';
import { SEVERITY_LABELS } from '../../models/diagnostic-severity';

/** Read-only list of diagnostics, translated by `code`. */
@Component({
  selector: 'app-diagnostic-list',
  template: `
    <ul class="space-y-1">
      @for (item of diagnostics(); track $index) {
        <li class="rounded-control border border-border px-3 py-2">
          <span class="mr-2 inline-block rounded-control border border-border px-1.5 text-xs font-semibold">{{ labels[item.severity] }}</span>
          <span>{{ messageOf(item.code, item.elementType) }}</span>
          @if (item.elementId) {
            <span class="mt-1 block font-mono text-xs text-content-muted">{{ item.elementType ? item.elementType + ' · ' : '' }}{{ item.elementId }}</span>
          }
        </li>
      }
    </ul>
  `,
})
export class DiagnosticList {
  readonly diagnostics = input.required<readonly Diagnostic[]>();
  protected readonly labels = SEVERITY_LABELS;
  protected readonly messageOf = diagnosticMessage;
}
