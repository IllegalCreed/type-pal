/** 把 noUncheckedIndexedAccess 的边界假设变成可诊断的运行时失败。 */
export function expectDefined<T>(value: T | null | undefined): T {
  if (value === undefined || value === null) throw new Error('Expected value to be defined')
  return value
}
