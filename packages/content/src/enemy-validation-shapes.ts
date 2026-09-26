export function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${path}: 期望对象`)
  return value as Record<string, unknown>
}

export function exactKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
): void {
  const keys = new Set(allowed)
  for (const key of Object.keys(value))
    if (!keys.has(key)) throw new Error(`${path}.${key}: 未知字段`)
}

export function nonEmptyString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value !== value.trim())
    throw new Error(`${path}: 期望非空且无首尾空格的 string`)
  return value
}

export function finite(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${path}: 期望有限数`)
  return value
}

export function percent(value: unknown, path: string): number {
  const result = finite(value, path)
  if (result < 0 || result > 100) throw new Error(`${path}: 期望 0..100 有限数`)
  return result
}

export function positiveInteger(value: unknown, path: string): number {
  if (!Number.isInteger(value) || Number(value) <= 0) throw new Error(`${path}: 期望正整数`)
  return Number(value)
}
