/** XML NCName: starts with a letter or underscore, then letters, digits, ".", "-", "_" or combining marks. */
const NC_NAME = /^[\p{L}_][\p{L}\p{Nd}._\-\u00B7\p{M}]*$/u;

/** Returns why `id` cannot be used, or `null` when it is valid. */
export function validateElementId(id: string, isTaken: (id: string) => boolean): string | null {
  if (!id) return 'ID is required.';
  if (!NC_NAME.test(id)) {
    return 'ID must start with a letter or underscore and contain only letters, digits, hyphens, underscores and periods.';
  }
  if (isTaken(id)) return 'ID is already in use.';
  return null;
}
