/**
 * 迁移期尚未现代化的能力 sidecar。
 *
 * 它不是运行时玩法数据，也不能从“字段缺席”反推；迁移器必须显式写出，编辑器据此展示
 * 来源和待处理原因。作者完成对应能力后可删除该条诊断，不污染 ItemData 的长期 schema。
 */
export const MIGRATION_DIAGNOSTIC_CATEGORIES = [
  'unsupported-command',
  'missing-source-data',
  'story-script',
  'empty-script',
  'manual-review',
] as const

export type MigrationDiagnosticCategory = (typeof MIGRATION_DIAGNOSTIC_CATEGORIES)[number]

export interface MigrationDiagnostic {
  /** 稳定身份，便于三方合并和作者消解单条诊断。 */
  id: string
  severity: 'warn'
  target: {
    domain: 'item'
    objectId: string
    capability: 'equip' | 'use' | 'throw'
    label: string
  }
  category: MigrationDiagnosticCategory
  reason: string
  source: {
    kind: 'legacy-script'
    /** 例如 L_39805；即使编辑器不能打开旧脚本，也必须明确告诉作者证据来自哪里。 */
    label: string
    address: number
  }
}

export interface MigrationDiagnosticsV1 {
  version: 1
  diagnostics: MigrationDiagnostic[]
}

const categorySet = new Set<string>(MIGRATION_DIAGNOSTIC_CATEGORIES)

export function validateMigrationDiagnostics(json: unknown): MigrationDiagnosticsV1 {
  if (!json || typeof json !== 'object' || Array.isArray(json))
    throw new Error('migrationDiagnostics: 期望对象')
  const root = json as Record<string, unknown>
  if (root.version !== 1) throw new Error('migrationDiagnostics.version: 期望 1')
  if (!Array.isArray(root.diagnostics))
    throw new Error('migrationDiagnostics.diagnostics: 期望数组')
  const ids = new Set<string>()
  root.diagnostics.forEach((value, index) => {
    const at = `migrationDiagnostics.diagnostics[${index}]`
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error(`${at}: 期望对象`)
    const diagnostic = value as Record<string, unknown>
    if (typeof diagnostic.id !== 'string' || diagnostic.id.length === 0)
      throw new Error(`${at}.id: 期望非空 string`)
    if (ids.has(diagnostic.id)) throw new Error(`${at}.id: 重复 ${diagnostic.id}`)
    ids.add(diagnostic.id)
    if (diagnostic.severity !== 'warn') throw new Error(`${at}.severity: 期望 warn`)
    if (typeof diagnostic.reason !== 'string' || diagnostic.reason.length === 0)
      throw new Error(`${at}.reason: 期望非空 string`)
    if (typeof diagnostic.category !== 'string' || !categorySet.has(diagnostic.category))
      throw new Error(`${at}.category: 未知类别 ${String(diagnostic.category)}`)

    if (
      !diagnostic.target ||
      typeof diagnostic.target !== 'object' ||
      Array.isArray(diagnostic.target)
    )
      throw new Error(`${at}.target: 期望对象`)
    const target = diagnostic.target as Record<string, unknown>
    if (target.domain !== 'item') throw new Error(`${at}.target.domain: 期望 item`)
    if (typeof target.objectId !== 'string' || target.objectId.length === 0)
      throw new Error(`${at}.target.objectId: 期望非空 string`)
    if (!['equip', 'use', 'throw'].includes(String(target.capability)))
      throw new Error(`${at}.target.capability: 期望 equip/use/throw`)
    if (typeof target.label !== 'string' || target.label.length === 0)
      throw new Error(`${at}.target.label: 期望非空 string`)

    if (
      !diagnostic.source ||
      typeof diagnostic.source !== 'object' ||
      Array.isArray(diagnostic.source)
    )
      throw new Error(`${at}.source: 期望对象`)
    const source = diagnostic.source as Record<string, unknown>
    if (source.kind !== 'legacy-script') throw new Error(`${at}.source.kind: 期望 legacy-script`)
    if (typeof source.label !== 'string' || source.label.length === 0)
      throw new Error(`${at}.source.label: 期望非空 string`)
    if (!Number.isInteger(source.address) || (source.address as number) < 0)
      throw new Error(`${at}.source.address: 期望非负整数`)
  })
  return json as MigrationDiagnosticsV1
}
