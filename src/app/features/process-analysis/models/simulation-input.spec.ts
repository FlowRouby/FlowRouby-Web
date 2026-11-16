import { parseInputData } from './simulation-input';

describe('parseInputData', () => {
  it.each(['', '   ', '\n\t'])('treats %j as no input', (text) => {
    expect(parseInputData(text)).toEqual({ kind: 'none' });
  });

  it('accepts a JSON object and keeps its text', () => {
    expect(parseInputData(' {"amount": 500, "ok": true} ')).toEqual({ kind: 'data', json: '{"amount": 500, "ok": true}' });
    expect(parseInputData('{}')).toEqual({ kind: 'data', json: '{}' });
  });

  it.each(['[1]', '[]', '5', '"x"', 'true', 'null', '{bad', "{'a': 1}", '{"a": }'])('rejects %s', (text) => {
    expect(parseInputData(text)).toEqual({ kind: 'invalid' });
  });
});
