import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { CompileResult } from '../../../../core/models/compile-result';
import { XOR_RESULT } from '../../../../core/testing/compile-fixtures';
import { BpmnModeler } from '../../../process-editor/services/bpmn-modeler';
import { CompileAnalysis } from '../../services/compile-analysis';
import { FlowspecView } from './flowspec-view';

describe('FlowspecView', () => {
  const current = signal<CompileResult | null>(XOR_RESULT);

  const render = async (flowspec = XOR_RESULT.flowspec) => {
    const fixture = TestBed.createComponent(FlowspecView);
    fixture.componentRef.setInput('flowspec', flowspec);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FlowspecView],
      providers: [
        { provide: CompileAnalysis, useValue: { result: current, bpmnIdOf: (s: string) => XOR_RESULT.bpmn_node_ids[s] ?? null } },
        { provide: BpmnModeler, useValue: { hasElement: () => true, focusElement: vi.fn() } },
      ],
    }).compileComponents();
  });

  it('shows the FlowSpec code verbatim with its classification', async () => {
    const root = await render();
    const code = root.querySelector('pre[aria-label="Código FlowSpec"]');
    expect(code?.textContent).toBe(XOR_RESULT.flowspec.code);
    expect(code?.className).toContain('whitespace-pre');
    expect(root.textContent).toContain('Type-2');
  });

  it('lists the inferred variables with their usage', async () => {
    const root = await render();
    const row = root.querySelector('tbody tr');
    expect([...row!.children].slice(0, 3).map((c) => c.textContent?.trim())).toEqual(['amount', 'number', 'external_input']);
    expect(row?.textContent).toContain('decision_1 · Decide');
    expect(row?.textContent).toContain('—');
  });

  it('says so when there are no variables', async () => {
    const root = await render({ ...XOR_RESULT.flowspec, symbol_table: { nodes_count: 7, variables: {} } });
    expect(root.querySelector('table')).toBeNull();
    expect(root.textContent).toContain('no usa variables');
  });
});
