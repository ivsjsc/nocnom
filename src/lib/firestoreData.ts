/**
 * Firestore rejects JavaScript `undefined` values by default.
 *
 * Application state intentionally uses optional TypeScript fields, so objects
 * may contain `undefined` while they are being edited in memory. This helper
 * removes those values recursively before persistence without mutating the
 * original state.
 */
export const stripUndefinedFields = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value
      .filter(item => item !== undefined)
      .map(item => stripUndefinedFields(item)) as T;
  }

  if (value && typeof value === 'object') {
    const prototype = Object.getPrototypeOf(value);
    const isPlainObject =
      prototype === Object.prototype || prototype === null;

    if (!isPlainObject) {
      return value;
    }

    const cleaned: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(
      value as Record<string, unknown>
    )) {
      if (nestedValue === undefined) continue;
      cleaned[key] = stripUndefinedFields(nestedValue);
    }
    return cleaned as T;
  }

  return value;
};
