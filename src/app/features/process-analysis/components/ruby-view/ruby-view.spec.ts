import { TestBed } from '@angular/core/testing';
import type { GeneratedRuby } from '../../../../core/models/compile-result';
import { XOR_RESULT } from '../../../../core/testing/compile-fixtures';
import { RubyView } from './ruby-view';

describe('RubyView', () => {
  const render = async (ruby: GeneratedRuby = XOR_RESULT.generated_ruby) => {
    const fixture = TestBed.createComponent(RubyView);
    fixture.componentRef.setInput('ruby', ruby);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const pick = async (path: string) => {
      [...root.querySelectorAll('li button')].find((b) => b.textContent?.trim() === path)?.dispatchEvent(new Event('click'));
      await fixture.whenStable();
    };
    return { fixture, root, pick };
  };

  it('shows the framework, the file list and the first file', async () => {
    const { root } = await render();
    expect(root.textContent).toContain('Ruby on Rails + Sidekiq');
    expect([...root.querySelectorAll('li button')].map((b) => b.textContent?.trim())).toEqual(Object.keys(XOR_RESULT.generated_ruby.files));
    expect(root.querySelector('pre')?.textContent).toBe(XOR_RESULT.generated_ruby.files['Gemfile']);
  });

  it('shows the content of the selected file in a whitespace-preserving block', async () => {
    const { root, pick } = await render();
    await pick('config/routes.rb');
    const block = root.querySelector('pre');
    expect(block?.textContent).toBe(XOR_RESULT.generated_ruby.files['config/routes.rb']);
    expect(block?.className).toContain('whitespace-pre');
    expect(root.querySelector('[aria-current="true"]')?.textContent?.trim()).toBe('config/routes.rb');
  });

  it('handles an empty file such as log/.keep', async () => {
    const { root, pick } = await render();
    await pick('log/.keep');
    expect(root.querySelector('pre')).toBeNull();
    expect(root.textContent).toContain('Archivo vacío.');
  });

  it('falls back to the first file when the chosen one is gone from a new result', async () => {
    const { fixture, root, pick } = await render();
    await pick('log/.keep');
    fixture.componentRef.setInput('ruby', { framework: 'x', files: { 'a.rb': 'puts 1' } });
    await fixture.whenStable();
    expect(root.querySelector('pre')?.textContent).toBe('puts 1');
  });

  it('says so when there are no files', async () => {
    const { root } = await render({ framework: 'x', files: {} });
    expect(root.textContent).toContain('No se generó ningún archivo.');
  });
});
