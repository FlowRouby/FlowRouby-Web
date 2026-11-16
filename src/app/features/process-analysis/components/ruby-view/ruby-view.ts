import { Component, computed, input, signal } from '@angular/core';
import type { GeneratedRuby } from '../../../../core/models/compile-result';

@Component({
  selector: 'app-ruby-view',
  templateUrl: './ruby-view.html',
  host: { class: 'block text-sm' },
})
export class RubyView {
  readonly ruby = input.required<GeneratedRuby>();

  readonly #chosen = signal<string | null>(null);

  protected readonly paths = computed(() => Object.keys(this.ruby().files));
  /** The chosen file while it exists in the current result, otherwise the first one. */
  protected readonly selected = computed(() => {
    const chosen = this.#chosen();
    return chosen !== null && this.paths().includes(chosen) ? chosen : (this.paths()[0] ?? null);
  });
  protected readonly content = computed(() => {
    const path = this.selected();
    return path === null ? '' : this.ruby().files[path];
  });

  protected choose(path: string): void {
    this.#chosen.set(path);
  }
}
