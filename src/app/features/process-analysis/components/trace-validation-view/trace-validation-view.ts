import { Component, computed, inject } from '@angular/core';
import { blockedReason } from '../../models/action-reason';
import type { TraceInputKind } from '../../models/trace-input';
import { rejectionMessage, traceFailureView } from '../../models/trace-messages';
import { ImportAnalysis } from '../../services/import-analysis';
import { TraceValidation } from '../../services/trace-validation';
import { DiagnosticList } from '../diagnostic-list/diagnostic-list';
import { NodeRef } from '../node-ref/node-ref';

/** "Validar cadena" tab: route input, validate action and the result of the last validation. */
@Component({
  imports: [DiagnosticList, NodeRef],
  selector: 'app-trace-validation-view',
  templateUrl: './trace-validation-view.html',
  host: { class: 'block space-y-3 text-sm' },
})
export class TraceValidationView {
  readonly #validation = inject(TraceValidation);
  readonly #analysis = inject(ImportAnalysis);

  protected readonly status = this.#validation.status;
  protected readonly result = this.#validation.result;
  protected readonly inputText = this.#validation.inputText;
  protected readonly inputKind = this.#validation.inputKind;
  protected readonly canValidate = this.#validation.canValidate;
  protected readonly pathShown = this.#validation.pathShown;

  protected readonly reason = computed(() => blockedReason(this.#analysis, 'validar'));
  protected readonly failureView = computed(() => {
    const failure = this.#validation.failure();
    return failure ? traceFailureView(failure) : null;
  });

  protected readonly kinds: readonly { id: TraceInputKind; label: string }[] = [
    { id: 'symbols', label: 'Símbolos del autómata' },
    { id: 'bpmn-ids', label: 'IDs del diagrama' },
  ];
  protected readonly rejectionMessage = rejectionMessage;

  protected onInput(event: Event): void {
    this.#validation.setInput((event.target as HTMLInputElement).value);
  }

  protected onKind(event: Event): void {
    this.#validation.setInputKind((event.target as HTMLSelectElement).value as TraceInputKind);
  }

  protected validate(): void {
    void this.#validation.validate();
  }

  protected clearPath(): void {
    this.#validation.clearPath();
  }
}
