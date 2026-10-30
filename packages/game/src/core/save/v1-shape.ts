/** Pure guards for the existing V1 JSON representation. No coercion, defaults or IO. */
export type Guard<T> = (value: unknown) => value is T
export type Fields<T> = { [K in keyof T]-?: Guard<T[K]> }

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export const number: Guard<number> = (value): value is number =>
  typeof value === 'number' && Number.isFinite(value)
export const string: Guard<string> = (value): value is string => typeof value === 'string'
export const boolean: Guard<boolean> = (value): value is boolean => typeof value === 'boolean'
export const unknown: Guard<unknown> = (_value): _value is unknown => true

export function optional<T>(guard: Guard<T>): Guard<T | undefined> {
  return (value): value is T | undefined => value === undefined || guard(value)
}

export function nullable<T>(guard: Guard<T>): Guard<T | null> {
  return (value): value is T | null => value === null || guard(value)
}

export function oneOf<T extends string>(...values: T[]): Guard<T> {
  return (value): value is T => values.some((candidate) => candidate === value)
}

export function array<T>(guard: Guard<T>, length?: number): Guard<T[]> {
  return (value): value is T[] =>
    Array.isArray(value) && (length === undefined || value.length === length) && value.every(guard)
}

export function tuple<T extends readonly unknown[]>(
  ...guards: { [K in keyof T]: Guard<T[K]> }
): Guard<T> {
  return (value): value is T =>
    Array.isArray(value) &&
    value.length === guards.length &&
    guards.every((guard, i) => guard(value[i]))
}

export function record<T>(guard: Guard<T>): Guard<Record<string, T>> {
  return (value): value is Record<string, T> => isRecord(value) && Object.values(value).every(guard)
}

/** The mapped fields require a guard for every declared property, including optionals.
 * Extra data is retained; __proto__ cannot be handed to the loader's Object.assign.
 */
export function object<T extends object>(fields: Fields<T>): Guard<T> {
  return (value): value is T => {
    if (!isRecord(value) || Object.hasOwn(value, '__proto__')) return false
    for (const key in fields) if (!fields[key](value[key])) return false
    return true
  }
}

export function variant<K extends string, T extends Record<K, string>>(
  key: K,
  variants: { [V in T[K]]: Guard<Extract<T, Record<K, V>>> },
): Guard<T> {
  const byName: Record<string, (value: unknown) => boolean> = variants
  return (value): value is T => {
    if (!isRecord(value)) return false
    const name = value[key]
    return typeof name === 'string' && Object.hasOwn(byName, name) && !!byName[name]?.(value)
  }
}

/** Native JSON.stringify(Uint8Array) emits contiguous decimal keys, not an array. */
export const bytes: Guard<Record<string, number>> = (value): value is Record<string, number> =>
  isRecord(value) &&
  Object.entries(value).every(
    ([key, n], i) => key === String(i) && number(n) && Number.isInteger(n) && n >= 0 && n <= 255,
  )
