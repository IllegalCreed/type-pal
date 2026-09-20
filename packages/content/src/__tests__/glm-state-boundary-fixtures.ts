/**
 * TEST-RUNTIME-STATE-BOUNDARIES-1 test-only fixture（content 包薄数据）。
 * 只放数据与保真深快照；受测值先过现行守卫再进断言；不被生产导入。
 */

/** 保真深拷贝（不经 JSON 往返；保留 undefined/typed array 语义）。 */
export function deepSnapshot<T>(value: T): T {
  return clone(value) as T
}

function clone(node: unknown): unknown {
  if (node === null || typeof node !== 'object') return node
  if (node instanceof Date) return new Date(node.getTime())
  if (Array.isArray(node)) return node.map(clone)
  if (node instanceof Uint8Array) return new Uint8Array(node)
  if (node instanceof Map) return new Map([...node].map(([k, v]) => [clone(k), clone(v)]))
  if (node instanceof Set) return new Set([...node].map(clone))
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(node)) out[key] = clone(value)
  return out
}

// ── A 组：world-variable / migration-diagnostic 合法基线 ────────────────

export const legalVariable = (): Record<string, unknown> => ({
  'flag.opened-chest:1': {
    kind: 'flag',
    name: '开箱标记',
    description: '',
    initial: false,
  },
  'num.counter_2': {
    kind: 'number',
    name: '计数器',
    description: '任意描述',
    initial: -3.5,
  },
})

export const legalDiagnostic = (): Record<string, unknown> => ({
  version: 1,
  diagnostics: [
    {
      id: 'diag-1',
      severity: 'warn',
      target: { domain: 'item', objectId: '151', capability: 'use', label: '引路蜂' },
      category: 'unsupported-command',
      reason: '原版脚本包含尚未迁移的命令',
      source: { kind: 'legacy-script', label: 'L_39805', address: 0 },
    },
  ],
})
