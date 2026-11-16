/** XML NCName: starts with a letter or underscore, then letters, digits, ".", "-", "_" or combining marks. */
const NC_NAME = /^[\p{L}_][\p{L}\p{Nd}._\-\u00B7\p{M}]*$/u;

/** Returns why `id` cannot be used, or `null` when it is valid. */
export function validateElementId(id: string, isTaken: (id: string) => boolean): string | null {
  if (!id) return 'El ID es obligatorio.';
  if (!NC_NAME.test(id)) {
    return 'El ID debe comenzar con una letra o un guion bajo y contener solo letras, dígitos, guiones, guiones bajos y puntos.';
  }
  if (isTaken(id)) return 'El ID ya está en uso.';
  return null;
}
