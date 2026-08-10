import type { AuthorCommandV5, CheckAuthorCommandsV5Options, EntityAddress } from './script-v5.js'
import { AUTHOR_COMMAND_V5_KINDS, checkAuthorCommandsV5, checkEntityAddress } from './script-v5.js'

export type LifecycleCommandV13 =
  | { kind: 'suspendEntity'; target: EntityAddress; ticks: number }
  | { kind: 'hideEntity'; target: EntityAddress; ticks: number }
  | { kind: 'restoreEntity'; target: EntityAddress }
  | { kind: 'removeEntity'; target: EntityAddress }

/** 顶层 v13 command vocabulary；旧 v5 的 vanishEntity 只存在于历史输入端。 */
export type AuthorCommandV13 =
  | Exclude<AuthorCommandV5, { kind: 'vanishEntity' }>
  | LifecycleCommandV13

export const AUTHOR_COMMAND_V13_KINDS: Readonly<Record<string, boolean>> = Object.freeze({
  // Keep the retained v5 leaf table as the compatibility baseline. Nested validation below
  // rewrites only the four new lifecycle leaves before delegating shape checks to v5.
  ...AUTHOR_COMMAND_V5_KINDS,
  suspendEntity: true,
  hideEntity: true,
  restoreEntity: true,
  removeEntity: true,
  vanishEntity: false,
})

function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${path}: 期望对象`)
  return value as Record<string, unknown>
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[], path: string): void {
  const allowedKeys = new Set(allowed)
  for (const key of Object.keys(value))
    if (!allowedKeys.has(key)) throw new Error(`${path}.${key}: 未知字段`)
}

function positiveSafeInt(value: unknown, path: string): void {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) throw new Error(`${path}: 期望正安全整数`)
}

function checkLifecycleCommand(value: Record<string, unknown>, path: string): void {
  const kind = value.kind
  if (kind === 'suspendEntity' || kind === 'hideEntity') {
    exactKeys(value, ['kind', 'target', 'ticks'], path)
    checkEntityAddress(value.target, `${path}.target`)
    positiveSafeInt(value.ticks, `${path}.ticks`)
    return
  }
  if (kind === 'restoreEntity' || kind === 'removeEntity') {
    exactKeys(value, ['kind', 'target'], path)
    checkEntityAddress(value.target, `${path}.target`)
    return
  }
  throw new Error(`${path}.kind: 未知生命周期命令 ${String(kind)}`)
}

/**
 * Replace lifecycle leaves with a harmless retained v5 leaf solely for legacy shape checking.
 * The returned tree is never exposed; this lets v5 validate every old field while this walker
 * enforces the new recursive command boundary and rejects vanishEntity at any nesting depth.
 */
function sanitizeForV5(value: unknown, path: string): unknown {
  if (Array.isArray(value))
    return value.map((entry, index) => sanitizeForV5(entry, `${path}[${index}]`))
  if (!value || typeof value !== 'object') return value
  const object = record(value, path)
  if (typeof object.kind === 'string') {
    if (object.kind === 'vanishEntity')
      throw new Error(`${path}.kind: v13 禁止 vanishEntity；请使用显式生命周期命令`)
    if (
      object.kind === 'suspendEntity' ||
      object.kind === 'hideEntity' ||
      object.kind === 'restoreEntity' ||
      object.kind === 'removeEntity'
    ) {
      checkLifecycleCommand(object, path)
      return { kind: 'wait', ms: 0 }
    }
  }
  return Object.fromEntries(
    Object.entries(object).map(([key, child]) => [key, sanitizeForV5(child, `${path}.${key}`)]),
  )
}

export function checkAuthorCommandsV13(
  value: unknown,
  path: string,
  options: CheckAuthorCommandsV5Options = {},
): asserts value is AuthorCommandV13[] {
  if (!Array.isArray(value)) throw new Error(`${path}: 期望 AuthorCommandV13[]`)
  const sanitized = sanitizeForV5(value, path)
  checkAuthorCommandsV5(sanitized, path, options)
}
