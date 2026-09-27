/** TEST-CURSOR-PURE-WAVE-1 B 包共用合法输入快照。 */

export function inputSnap<T>(value: T): T {
  return structuredClone(value)
}
