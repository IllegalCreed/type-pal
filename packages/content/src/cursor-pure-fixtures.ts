/** TEST-CURSOR-PURE-WAVE-1 A 包共用合法输入快照。不发明非法 catalog。 */

export function inputSnap<T>(value: T): T {
  if (value instanceof Uint8Array) return value.slice() as T
  return JSON.parse(JSON.stringify(value)) as T
}
