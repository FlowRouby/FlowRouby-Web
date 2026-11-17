import { highlightFlowspec } from './flowspec-highlight';

const kinds = (code: string) =>
  highlightFlowspec(code)
    .filter((token) => token.kind !== 'text')
    .map((token) => `${token.kind}:${token.text}`);

describe('highlightFlowspec', () => {
  it('gives the code back unchanged when the tokens are joined', () => {
    const code = 'process "Revisión" as Process_1\n  start "Inicio" as start_1\n    next task_1\n\n  # nota\n';
    expect(highlightFlowspec(code).map((token) => token.text).join('')).toBe(code);
    expect(highlightFlowspec('')).toEqual([]);
  });

  it('marks reserved words, strings and identifiers', () => {
    expect(kinds('process "Pedido" as Process_1')).toEqual(['keyword:process', 'string:"Pedido"', 'keyword:as', 'identifier:Process_1']);
    expect(kinds('user task "Revisar" as task_1')).toEqual(['keyword:user', 'keyword:task', 'string:"Revisar"', 'keyword:as', 'identifier:task_1']);
  });

  it('does not mark a reserved word inside an identifier or a string', () => {
    expect(kinds('next start_1')).toEqual(['keyword:next', 'identifier:start_1']);
    expect(kinds('"go to end"')).toEqual(['string:"go to end"']);
    expect(kinds('task_1 endpoint')).toEqual(['identifier:task_1', 'identifier:endpoint']);
  });

  it('treats reserved words as case-sensitive, like the lexer', () => {
    expect(kinds('Process START')).toEqual(['identifier:Process', 'identifier:START']);
  });

  it('marks booleans, numbers and operators in a condition', () => {
    expect(kinds('if monto >= 10.5 and not (aprobado is true)')).toEqual([
      'keyword:if',
      'identifier:monto',
      'operator:>=',
      'number:10.5',
      'keyword:and',
      'keyword:not',
      'operator:(',
      'identifier:aprobado',
      'keyword:is',
      'boolean:true',
      'operator:)',
    ]);
  });

  it('marks both comment styles to the end of the line', () => {
    expect(kinds('next task_1 // go on\n# process x\nend')).toEqual(['keyword:next', 'identifier:task_1', 'comment:// go on', 'comment:# process x', 'keyword:end']);
  });

  it('keeps an escaped quote inside its string', () => {
    expect(kinds('"a \\"b\\" c" as x')).toEqual(['string:"a \\"b\\" c"', 'keyword:as', 'identifier:x']);
  });
});
