/**
 * 地图与场景目录共用的物理路径规则；label 只决定诊断前缀，不改变校验策略。
 * 资产 catalog 的路径合同禁止规范化，不使用这个入口。
 */
export function normalizeProjectJsonPath(value: string, label: 'map' | 'scene'): string {
  const input = value.trim()
  if (!input || input.startsWith('/') || input.includes('\\') || /^[a-zA-Z]+:/.test(input))
    throw new Error(`${label} path: 期望工程相对路径，收到 "${value}"`)
  const parts: string[] = []
  for (const part of input.split('/')) {
    if (!part || part === '.') continue
    if (part === '..') throw new Error(`${label} path: 禁止 ".."（${value}）`)
    parts.push(part)
  }
  const normalized = parts.join('/')
  if (!normalized.endsWith('.json')) throw new Error(`${label} path: 必须指向 .json（${value}）`)
  return normalized
}
