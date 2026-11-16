import { Component, computed, inject } from '@angular/core';
import { blockedReason } from '../../models/action-reason';
import { kindLabel, simulationFailureView, terminationLabel } from '../../models/simulation-messages';
import { CompileAnalysis } from '../../services/compile-analysis';
import { ImportAnalysis } from '../../services/import-analysis';
import { SimulationAnalysis } from '../../services/simulation-analysis';
import { DiagnosticList } from '../diagnostic-list/diagnostic-list';
import { NodeRef } from '../node-ref/node-ref';

/** "Simulación" tab: `input_data` form, simulate action and the result of the last simulation. */
@Component({
  imports: [DiagnosticList, NodeRef],
  selector: 'app-simulation-view',
  templateUrl: './simulation-view.html',
  host: { class: 'block space-y-3 text-sm' },
})
export class SimulationView {
  readonly #simulation = inject(SimulationAnalysis);
  readonly #compile = inject(CompileAnalysis);
  readonly #analysis = inject(ImportAnalysis);

  protected readonly status = this.#simulation.status;
  protected readonly result = this.#simulation.result;
  protected readonly inputText = this.#simulation.inputText;
  protected readonly inputInvalid = this.#simulation.inputInvalid;
  protected readonly canSimulate = this.#simulation.canSimulate;
  protected readonly pathShown = this.#simulation.pathShown;

  protected readonly reason = computed(() => blockedReason(this.#analysis, 'simular'));
  protected readonly failureView = computed(() => {
    const failure = this.#simulation.failure();
    return failure ? simulationFailureView(failure) : null;
  });
  /** The data contract of the current compile result, offered as a hint and as a sample payload. */
  protected readonly contract = computed(() => this.#compile.result()?.data_contract ?? null);
  protected readonly describedBy = computed(() => {
    const ids = ['simulation-input-hint'];
    if (this.contract()) ids.push('simulation-input-required');
    if (this.inputInvalid()) ids.push('simulation-input-error');
    return ids.join(' ');
  });

  protected readonly terminationLabel = terminationLabel;
  protected readonly kindLabel = kindLabel;

  protected json(value: unknown): string {
    return JSON.stringify(value, null, 2);
  }

  protected hasEntries(value: object | undefined): value is object {
    return value !== undefined && Object.keys(value).length > 0;
  }

  protected onInput(event: Event): void {
    this.#simulation.setInput((event.target as HTMLTextAreaElement).value);
  }

  protected useSample(): void {
    const sample = this.contract()?.sample_payload;
    if (sample) this.#simulation.setInput(this.json(sample));
  }

  protected simulate(): void {
    void this.#simulation.simulate();
  }

  protected clearPath(): void {
    this.#simulation.clearPath();
  }
}
