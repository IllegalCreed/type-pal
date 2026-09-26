/** Current JSON inputs only; snapshots are independent of the exact argument under test. */
export function resourceSnapshot<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
