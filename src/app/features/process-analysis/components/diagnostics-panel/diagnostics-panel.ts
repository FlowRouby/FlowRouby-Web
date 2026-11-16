import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import type { Diagnostic, DiagnosticSeverity } from '../../../../core/models/diagnostic';
import { BpmnModeler } from '../../../process-editor/services/bpmn-modeler';
import { diagnosticMessage, failureMessage } from '../../models/analysis-messages';
import { bySeverity, SEVERITY_LABELS } from '../../models/diagnostic-severity';
import { ImportAnalysis } from '../../services/import-analysis';

@Component({
  imports: [NgTemplateOutlet],
  selector: 'app-diagnostics-panel',
  templateUrl: './diagnostics-panel.html',
  host: { class: 'block h-full overflow-y-auto' },
})
export class DiagnosticsPanel {
  readonly #analysis = inject(ImportAnalysis);
  readonly #modeler = inject(BpmnModeler);

  protected readonly status = this.#analysis.status;
  protected readonly stale = this.#analysis.stale;
  protected readonly rejected = this.#analysis.rejected;
  protected readonly infoOpen = signal(false);

  protected readonly notice = computed(() => {
    const failure = this.#analysis.failure();
    return failure ? failureMessage(failure) : null;
  });

  /** Diagnostics that need attention: errors first, then warnings. */
  protected readonly attention = computed(() =>
    this.#analysis
      .diagnostics()
      .filter((d) => d.severity !== 'info')
      .sort(bySeverity),
  );
  protected readonly info = computed(() => this.#analysis.diagnostics().filter((d) => d.severity === 'info'));
  protected readonly errorCount = computed(() => this.attention().filter((d) => d.severity === 'error').length);
  protected readonly warningCount = computed(() => this.attention().length - this.errorCount());
  protected readonly unsupported = computed(
    () => this.status() === 'loaded' && !this.rejected() && !this.#analysis.supported() && !this.stale(),
  );

  protected readonly messageOf = diagnosticMessage;
  protected labelOf(severity: DiagnosticSeverity): string {
    return SEVERITY_LABELS[severity];
  }

  protected canFocus(diagnostic: Diagnostic): boolean {
    return diagnostic.elementId !== null && this.#modeler.hasElement(diagnostic.elementId);
  }

  protected focus(diagnostic: Diagnostic): void {
    if (diagnostic.elementId !== null) this.#modeler.focusElement(diagnostic.elementId);
  }

  protected recheck(): void {
    void this.#analysis.recheck();
  }
}
