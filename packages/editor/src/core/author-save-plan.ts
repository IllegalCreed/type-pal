/** Immutable current-only save plan. This module validates data; it grants no IO capability. */
import { CONTENT_VERSION, validateProjectRelativePath } from '@type-pal/content'
import type { WorkspaceMode, WorkspaceSource } from './workspace-context.js'
import { isWorkspaceId, isWorkspaceIdentityPath } from './workspace-context.js'

export interface SaveIdentity {
  workspaceId: string
  projectId: string
  mode: WorkspaceMode
  source: WorkspaceSource
}
export type SaveSignature = `bin:${number}:${string}` | null
export type SaveStep =
  | { kind: 'write'; path: string; signature: Exclude<SaveSignature, null> }
  | { kind: 'remove'; path: string }
  | { kind: 'mkdir'; path: string }
export interface AuthorSavePlan {
  kind: 'type-pal-author-save-plan'
  version: 1
  contentVersion: typeof CONTENT_VERSION
  operationId: string
  identity: SaveIdentity
  /** Full observed author set plus every prospective write/remove destination. */
  before: Record<string, SaveSignature>
  directories: Record<string, boolean>
  steps: SaveStep[]
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
export function assertSaveOperationId(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !UUID.test(value)) throw new Error('恢复操作标识无效')
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('恢复计划结构无效')
  return value as Record<string, unknown>
}
function keys(value: Record<string, unknown>, names: string[]) {
  if (Object.keys(value).sort().join(',') !== names.sort().join(','))
    throw new Error('恢复计划含缺失或未知字段')
}
export function assertSavePath(path: string): void {
  validateProjectRelativePath(path, '恢复计划路径')
  if (isWorkspaceIdentityPath(path)) throw new Error(`恢复计划不能修改工作区元数据：${path}`)
}
export function parseSaveSignature(value: unknown): SaveSignature {
  if (value === null) return null
  if (typeof value !== 'string') throw new Error('恢复文件签名无效')
  const match = /^bin:(0|[1-9]\d*):([0-9a-f]{64})$/.exec(value)
  if (!match || !Number.isSafeInteger(Number(match[1]))) throw new Error('恢复文件签名无效')
  return value as Exclude<SaveSignature, null>
}
export function savePayloadHash(signature: Exclude<SaveSignature, null>): string {
  parseSaveSignature(signature)
  return signature.split(':')[2]!
}
export function parseSaveIdentity(value: unknown): SaveIdentity {
  const r = object(value)
  keys(r, ['workspaceId', 'projectId', 'mode', 'source'])
  if (!isWorkspaceId(r.workspaceId)) throw new Error('恢复工作区标识无效')
  if (typeof r.projectId !== 'string' || !r.projectId.trim()) throw new Error('恢复项目标识无效')
  const sources = {
    'local-project': [
      'blank-project',
      'pal-development-snapshot-clone',
      'save-as',
      'local-directory',
    ],
    sandbox: ['ui-samples', 'sandbox-copy', 'review-copy'],
    'pal-development': ['dev-http'],
  } as const
  if (
    typeof r.mode !== 'string' ||
    !Object.hasOwn(sources, r.mode) ||
    typeof r.source !== 'string' ||
    !(sources[r.mode as WorkspaceMode] as readonly string[]).includes(r.source)
  )
    throw new Error('恢复工作区身份无效')
  return {
    workspaceId: r.workspaceId,
    projectId: r.projectId,
    mode: r.mode as WorkspaceMode,
    source: r.source as WorkspaceSource,
  }
}

export function parseAuthorSavePlan(value: unknown, identity: SaveIdentity): AuthorSavePlan {
  const r = object(value)
  keys(r, [
    'kind',
    'version',
    'contentVersion',
    'operationId',
    'identity',
    'before',
    'directories',
    'steps',
  ])
  if (
    r.kind !== 'type-pal-author-save-plan' ||
    r.version !== 1 ||
    r.contentVersion !== CONTENT_VERSION
  )
    throw new Error('恢复计划版本不符；请保留目录，在对应版本完成未结束的保存')
  assertSaveOperationId(r.operationId)
  const parsedIdentity = parseSaveIdentity(r.identity)
  if (JSON.stringify(parsedIdentity) !== JSON.stringify(parseSaveIdentity(identity)))
    throw new Error('恢复计划与原授权工作区不一致')
  const before: Record<string, SaveSignature> = Object.create(null)
  const directories: Record<string, boolean> = Object.create(null)
  const aliases = new Map<string, string>()
  const path = (name: string) => {
    assertSavePath(name)
    const normalized = name
      .split('/')
      .map((segment) =>
        segment
          .normalize('NFC')
          .toLowerCase()
          .replace(/[ .]+$/u, ''),
      )
      .join('/')
    if (normalized.split('/').some((segment) => segment === ''))
      throw new Error(`恢复路径别名无效：${name}`)
    const previous = aliases.get(normalized)
    if (previous && previous !== name) throw new Error(`恢复路径别名冲突：${previous} / ${name}`)
    aliases.set(normalized, name)
    return name
  }
  for (const [name, signature] of Object.entries(object(r.before)))
    before[path(name)] = parseSaveSignature(signature)
  for (const [name, exists] of Object.entries(object(r.directories))) {
    if (typeof exists !== 'boolean' || Object.hasOwn(before, name))
      throw new Error('恢复目录状态无效')
    directories[path(name)] = exists
  }
  if (!Array.isArray(r.steps)) throw new Error('恢复步骤缺失')
  const steps: SaveStep[] = []
  for (let i = 0; i < r.steps.length; i++) {
    const step = object(r.steps[i])
    if (typeof step.path !== 'string') throw new Error('恢复步骤路径无效')
    path(step.path)
    if (step.kind === 'write') {
      keys(step, ['kind', 'path', 'signature'])
      const signature = parseSaveSignature(step.signature)
      if (!signature || !Object.hasOwn(before, step.path))
        throw new Error('恢复写入缺少完整前态/后态')
      steps.push({ kind: 'write', path: step.path, signature })
    } else if (step.kind === 'remove') {
      keys(step, ['kind', 'path'])
      if (!Object.hasOwn(before, step.path)) throw new Error('恢复删除缺少前态')
      steps.push({ kind: 'remove', path: step.path })
    } else if (step.kind === 'mkdir') {
      keys(step, ['kind', 'path'])
      if (!Object.hasOwn(directories, step.path)) throw new Error('恢复建目录缺少前态')
      steps.push({ kind: 'mkdir', path: step.path })
    } else throw new Error('未知恢复步骤')
  }
  // Explicit mkdir steps prevent a crash during parent creation from looking like an alien directory.
  for (const name of [...Object.keys(before), ...Object.keys(directories)]) {
    const parts = name.split('/')
    parts.pop()
    while (parts.length) {
      const parent = parts.join('/')
      if (Object.hasOwn(before, parent)) throw new Error(`恢复路径文件/目录冲突：${parent}`)
      if (!Object.hasOwn(directories, parent)) throw new Error(`恢复计划缺少父目录：${parent}`)
      parts.pop()
    }
  }
  const knownDirectories = new Set(Object.keys(directories).filter((name) => directories[name]))
  for (const step of steps) {
    const parent = step.path.split('/').slice(0, -1).join('/')
    if (parent && !knownDirectories.has(parent))
      throw new Error(`恢复步骤父目录尚未创建：${step.path}`)
    if (step.kind === 'mkdir') knownDirectories.add(step.path)
  }
  return {
    kind: r.kind,
    version: r.version,
    contentVersion: CONTENT_VERSION,
    operationId: r.operationId,
    identity: parsedIdentity,
    before,
    directories,
    steps,
  }
}

/** Derive the only acceptable committed prefix; never accept arbitrary per-file old/new mixes. */
export function savePrefix(plan: AuthorSavePlan, completed: number) {
  if (!Number.isSafeInteger(completed) || completed < 0 || completed > plan.steps.length)
    throw new Error('恢复游标越界')
  const files = new Map(Object.entries(plan.before))
  const directories = new Map(Object.entries(plan.directories))
  for (let i = 0; i < completed; i++) {
    const step = plan.steps[i]!
    if (step.kind === 'mkdir') directories.set(step.path, true)
    else files.set(step.path, step.kind === 'remove' ? null : step.signature)
  }
  return { files, directories }
}
