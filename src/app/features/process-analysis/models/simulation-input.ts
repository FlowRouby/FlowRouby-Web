/**
 * Outcome of reading the `input_data` text before sending it: empty means "send none", otherwise it must be a JSON
 * object (not an array or a primitive). `json` is the exact text to send.
 */
export type InputData = { kind: 'none' } | { kind: 'data'; json: string } | { kind: 'invalid' };

export function parseInputData(text: string): InputData {
  const trimmed = text.trim();
  if (trimmed === '') return { kind: 'none' };
  try {
    const value: unknown = JSON.parse(trimmed);
    const isObject = typeof value === 'object' && value !== null && !Array.isArray(value);
    return isObject ? { kind: 'data', json: trimmed } : { kind: 'invalid' };
  } catch {
    return { kind: 'invalid' };
  }
}
