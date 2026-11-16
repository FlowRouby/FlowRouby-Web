import { Component, computed, signal } from '@angular/core';
import { AnalysisTabs } from '../../process-analysis/components/analysis-tabs/analysis-tabs';
import { BpmnCanvas } from '../components/bpmn-canvas/bpmn-canvas';
import { EditorToolbar } from '../components/editor-toolbar/editor-toolbar';
import { PropertiesPanel } from '../components/properties-panel/properties-panel';

const DEFAULT_ANALYSIS_HEIGHT = 224;
const MIN_ANALYSIS_HEIGHT = 120;
/** Share of the window height the panel takes when enlarged with the button, and the most it can be dragged to. */
const EXPANDED_RATIO = 0.6;
const MAX_RATIO = 0.8;
const KEYBOARD_STEP = 24;

@Component({
  imports: [EditorToolbar, BpmnCanvas, PropertiesPanel, AnalysisTabs],
  selector: 'app-process-editor-page',
  styleUrl: './process-editor-page.css',
  templateUrl: './process-editor-page.html',
  host: { class: 'block h-dvh' },
})
export class ProcessEditorPage {
  protected readonly propertiesOpen = signal(true);
  protected readonly analysisOpen = signal(true);
  /** Height of the analysis section in pixels; set by dragging its top edge, by keyboard, or by the toggle. */
  protected readonly analysisHeight = signal(DEFAULT_ANALYSIS_HEIGHT);
  protected readonly analysisExpanded = computed(() => this.analysisHeight() > DEFAULT_ANALYSIS_HEIGHT);
  protected readonly minAnalysisHeight = MIN_ANALYSIS_HEIGHT;
  #drag?: { startY: number; startHeight: number };

  protected get maxAnalysisHeight(): number {
    return Math.round(window.innerHeight * MAX_RATIO);
  }

  protected toggleAnalysisSize(): void {
    this.#resize(this.analysisExpanded() ? DEFAULT_ANALYSIS_HEIGHT : window.innerHeight * EXPANDED_RATIO);
  }

  protected startResize(event: PointerEvent): void {
    // Capturing keeps the drag alive while the pointer passes over the canvas.
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    this.#drag = { startY: event.clientY, startHeight: this.analysisHeight() };
    event.preventDefault();
  }

  protected dragResize(event: PointerEvent): void {
    if (this.#drag) this.#resize(this.#drag.startHeight + this.#drag.startY - event.clientY);
  }

  protected endResize(): void {
    this.#drag = undefined;
  }

  protected resizeWithKey(event: KeyboardEvent): void {
    const height = this.analysisHeight();
    const targets: Record<string, number> = {
      ArrowUp: height + KEYBOARD_STEP,
      ArrowDown: height - KEYBOARD_STEP,
      Home: MIN_ANALYSIS_HEIGHT,
      End: this.maxAnalysisHeight,
    };
    const target = targets[event.key];
    if (target === undefined) return;
    event.preventDefault();
    this.#resize(target);
  }

  #resize(height: number): void {
    this.analysisHeight.set(Math.round(Math.min(Math.max(height, MIN_ANALYSIS_HEIGHT), this.maxAnalysisHeight)));
  }
}
