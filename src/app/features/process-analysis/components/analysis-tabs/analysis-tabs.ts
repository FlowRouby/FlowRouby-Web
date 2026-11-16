import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { blockedReason } from '../../models/action-reason';
import { downloadFailureMessage } from '../../models/analysis-messages';
import { compileFailureView } from '../../models/compile-failure';
import { CompileAnalysis } from '../../services/compile-analysis';
import { ImportAnalysis } from '../../services/import-analysis';
import { DiagnosticList } from '../diagnostic-list/diagnostic-list';
import { DiagnosticsPanel } from '../diagnostics-panel/diagnostics-panel';
import { FlowspecView } from '../flowspec-view/flowspec-view';
import { FormalAnalysisView } from '../formal-analysis-view/formal-analysis-view';
import { RubyView } from '../ruby-view/ruby-view';
import { SimulationView } from '../simulation-view/simulation-view';

export type AnalysisTab = 'diagnostics' | 'flowspec' | 'formal' | 'ruby' | 'simulation';

const TABS: readonly { id: AnalysisTab; label: string }[] = [
  { id: 'diagnostics', label: 'Diagnósticos' },
  { id: 'flowspec', label: 'FlowSpec' },
  { id: 'formal', label: 'Análisis formal' },
  { id: 'ruby', label: 'Ruby' },
  { id: 'simulation', label: 'Simulación' },
];

@Component({
  imports: [NgTemplateOutlet, DiagnosticsPanel, DiagnosticList, FlowspecView, FormalAnalysisView, RubyView, SimulationView],
  selector: 'app-analysis-tabs',
  templateUrl: './analysis-tabs.html',
  host: { class: 'flex min-h-0 flex-col gap-2' },
})
export class AnalysisTabs {
  readonly #analysis = inject(ImportAnalysis);
  readonly #compile = inject(CompileAnalysis);

  protected readonly tabs = TABS;
  protected readonly active = signal<AnalysisTab>('diagnostics');

  protected readonly compileStatus = this.#compile.status;
  protected readonly result = this.#compile.result;
  protected readonly canCompile = this.#compile.canCompile;
  protected readonly canDownload = this.#compile.canDownload;
  protected readonly downloading = this.#compile.downloading;

  protected readonly failureView = computed(() => {
    const failure = this.#compile.failure();
    return failure ? compileFailureView(failure) : null;
  });
  protected readonly downloadNotice = computed(() => {
    const failure = this.#compile.downloadFailure();
    return failure ? downloadFailureMessage(failure) : null;
  });

  /** Why the actions are disabled, decided from the analysis state (never from message text). */
  protected readonly reason = computed(() => blockedReason(this.#analysis, 'compilar'));

  protected select(tab: AnalysisTab): void {
    this.active.set(tab);
  }

  protected onKey(event: KeyboardEvent): void {
    const index = TABS.findIndex((tab) => tab.id === this.active());
    const last = TABS.length - 1;
    const next = { ArrowRight: index === last ? 0 : index + 1, ArrowLeft: index === 0 ? last : index - 1, Home: 0, End: last }[
      event.key
    ];
    if (next === undefined) return;
    event.preventDefault();
    this.select(TABS[next].id);
    const buttons = (event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[role="tab"]');
    buttons[next]?.focus();
  }

  protected compile(): void {
    this.select('flowspec');
    void this.#compile.compile();
  }

  protected download(): void {
    void this.#compile.download();
  }
}
