import { isDeepStrictEqual } from 'node:util'
import {
  type HostileBehaviorV13,
  type HostilePlayerFleePolicyV13,
  type HostileVictoryPolicyV13,
  upgradeHostileBehaviorV12ToV13,
  validateScenesV13,
} from '@type-pal/content'
import type { MigrationJson } from './pal-migration.js'
import type {
  W9LifecycleSourceLedgerEntry,
  W9LifecycleSourceLedgerV1,
} from './pal-w9-lifecycle-source-ledger.js'
import type { MigrationSnapshot } from './migration-baseline.js'
import { translatePalW9LifecycleLanding } from './translate-events.js'

export interface PalW9LifecycleProjection {
  files: Map<string, MigrationJson>
  changedScenePaths: string[]
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${path}: 期望对象`)
  return value as Record<string, unknown>
}

function targetKey(target: { sceneId: string; entityId: string }): string {
  return `${target.sceneId}\u0000${target.entityId}`
}

function sceneIds(parent: MigrationSnapshot): string[] {
  const value = parent.files.get('content/scenes/index.json')
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string' || !entry))
    throw new Error('W9 projector: content/scenes/index.json 不是非空 string[]')
  const ids = value as string[]
  if (new Set(ids).size !== ids.length)
    throw new Error('W9 projector: content/scenes/index.json scene id 重复')
  return ids
}

function residualCommand(entry: W9LifecycleSourceLedgerEntry): {
  kind: 'suspendEntity' | 'hideEntity'
  ticks: number
  legacySeconds: number
} {
  if (entry.disposition.kind === 'lifecycle-suspend') {
    if (entry.opcode !== 0x4b || entry.disposition.command !== 'suspendEntity')
      throw new Error(`W9 projector: ${entry.id} suspend disposition/opcode 不闭合`)
    return { kind: 'suspendEntity', ticks: entry.disposition.ticks, legacySeconds: 2 }
  }
  if (entry.disposition.kind === 'lifecycle-hide') {
    if (entry.opcode !== 0x52 || entry.disposition.command !== 'hideEntity')
      throw new Error(`W9 projector: ${entry.id} hide disposition/opcode 不闭合`)
    if (entry.disposition.ticks % 10 !== 0)
      throw new Error(`W9 projector: ${entry.id} 无法与已发布 v12 seconds 精确对账`)
    return {
      kind: 'hideEntity',
      ticks: entry.disposition.ticks,
      legacySeconds: entry.disposition.ticks / 10,
    }
  }
  throw new Error(`W9 projector: ${entry.id} 不是 residual lifecycle landing`)
}

function rewriteResidualCommands(args: {
  value: unknown
  path: string
  sceneId: string
  entityId: string
  entries: readonly W9LifecycleSourceLedgerEntry[]
}): unknown {
  const expected = args.entries.map((entry) => ({ entry, ...residualCommand(entry), used: false }))
  const walk = (value: unknown, path: string): unknown => {
    if (Array.isArray(value)) return value.map((child, index) => walk(child, `${path}[${index}]`))
    if (!value || typeof value !== 'object') return value
    const source = value as Record<string, unknown>
    if (source.kind === 'vanishEntity') {
      const allowed = new Set(['kind', 'target', 'seconds'])
      for (const key of Object.keys(source))
        if (!allowed.has(key)) throw new Error(`${path}.${key}: W9 legacy vanish 未知字段`)
      if (source.target !== undefined) {
        const target = record(source.target, `${path}.target`)
        if (target.scene !== args.sceneId || target.entity !== args.entityId)
          throw new Error(`${path}.target: W9 ledger self 与已发布 v12 target 不符`)
      }
      const matches = expected.filter(
        (candidate) => !candidate.used && source.seconds === candidate.legacySeconds,
      )
      if (matches.length !== 1)
        throw new Error(
          `${path}: W9 ledger 无法唯一对账 legacy vanish seconds=${String(source.seconds)}`,
        )
      const match = matches[0]!
      match.used = true
      return translatePalW9LifecycleLanding({
        opcode: match.entry.opcode,
        ticks: match.ticks,
        target: { scene: args.sceneId, entity: args.entityId },
      })
    }
    return Object.fromEntries(
      Object.entries(source).map(([key, child]) => [key, walk(child, `${path}.${key}`)]),
    )
  }
  const rewritten = walk(args.value, args.path)
  const missing = expected.filter((candidate) => !candidate.used)
  if (missing.length)
    throw new Error(
      `${args.path}: W9 ledger landing 未消费 ${missing.map(({ entry }) => entry.id).join(',')}`,
    )
  return rewritten
}

function hostilePolicies(entries: readonly W9LifecycleSourceLedgerEntry[]): {
  onVictory: HostileVictoryPolicyV13
  onPlayerFlee: HostilePlayerFleePolicyV13
} {
  const victory = entries.filter(
    (
      entry,
    ): entry is W9LifecycleSourceLedgerEntry & {
      disposition: Extract<
        W9LifecycleSourceLedgerEntry['disposition'],
        { kind: 'folded-hostile-on-victory' }
      >
    } => entry.disposition.kind === 'folded-hostile-on-victory',
  )
  const flee = entries.filter(
    (
      entry,
    ): entry is W9LifecycleSourceLedgerEntry & {
      disposition: Extract<
        W9LifecycleSourceLedgerEntry['disposition'],
        { kind: 'folded-hostile-on-player-flee' }
      >
    } => entry.disposition.kind === 'folded-hostile-on-player-flee',
  )
  if (entries.length !== 2 || victory.length !== 1 || flee.length !== 1)
    throw new Error('W9 projector: folded hostile 必须恰有一条 victory 与一条 player-flee proof')
  if (victory[0]!.opcode !== 0x52 || flee[0]!.opcode !== 0x4b)
    throw new Error('W9 projector: folded hostile opcode/disposition 不闭合')
  return {
    onVictory: cloneJson(victory[0]!.disposition.policy),
    onPlayerFlee: cloneJson(flee[0]!.disposition.policy),
  }
}

function upgradeHostile(
  value: unknown,
  entries: readonly W9LifecycleSourceLedgerEntry[],
  path: string,
): HostileBehaviorV13 {
  const policies = hostilePolicies(entries)
  const authored = upgradeHostileBehaviorV12ToV13(value, path)
  if (!isDeepStrictEqual(authored.onVictory, policies.onVictory))
    throw new Error(`${path}: published v12 respawn 与 W9 source-ledger victory policy 不符`)
  return { ...authored, ...policies }
}

/**
 * B10/content12 → W9/content13 的 PAL 专属纯投影。
 *
 * 父层场景已经是已发布 canonical v5；这里不重跑 raw translator，也不覆盖历史 overlay。每个
 * hostile policy / lifecycle command 都必须消费正式逐 execution-site ledger，且 v12 legacy
 * vanish 只作为字节对账输入，不能自行决定 v13 语义。
 */
export function projectPalW9LifecycleSuccessor(
  parent: MigrationSnapshot,
  ledger: W9LifecycleSourceLedgerV1,
): PalW9LifecycleProjection {
  const ids = sceneIds(parent)
  const knownScenes = new Set(ids)
  const entriesByTarget = new Map<string, W9LifecycleSourceLedgerEntry[]>()
  for (const entry of ledger.entries) {
    if (!knownScenes.has(entry.target.sceneId))
      throw new Error(`W9 projector: ledger 指向未知 scene ${entry.target.sceneId}`)
    if (entry.self !== entry.target.entityId)
      throw new Error(`W9 projector: ${entry.id} self/target entity 不符`)
    const key = targetKey(entry.target)
    const entries = entriesByTarget.get(key) ?? []
    if (entries.some((candidate) => candidate.contextId !== entry.contextId))
      throw new Error(`W9 projector: target ${key} 被多个 execution context 占用`)
    entries.push(entry)
    entriesByTarget.set(key, entries)
  }

  const files = new Map(parent.files)
  const changedScenePaths: string[] = []
  const consumedTargets = new Set<string>()
  for (const sceneId of ids) {
    const path = `content/scenes/${sceneId}.json`
    const original = parent.files.get(path)
    if (original === undefined) throw new Error(`W9 projector: parent 缺 ${path}`)
    const rawScene = record(cloneJson(original), path)
    if (!Array.isArray(rawScene.entities)) throw new Error(`${path}.entities: 期望数组`)
    let changed = false
    rawScene.entities = rawScene.entities.map((rawEntity, entityIndex) => {
      const entityPath = `${path}.entities[${entityIndex}]`
      const entity = record(rawEntity, entityPath)
      if (typeof entity.id !== 'string' || !entity.id)
        throw new Error(`${entityPath}.id: 期望非空 string`)
      const key = targetKey({ sceneId, entityId: entity.id })
      const entries = entriesByTarget.get(key)
      if (!entries) return entity
      consumedTargets.add(key)
      changed = true
      if (entity.hostile !== undefined) {
        if (entries.some((entry) => !entry.disposition.kind.startsWith('folded-hostile-')))
          throw new Error(`${entityPath}: hostile target 收到 residual lifecycle disposition`)
        return {
          ...entity,
          hostile: upgradeHostile(entity.hostile, entries, `${entityPath}.hostile`),
        }
      }
      if (entries.some((entry) => entry.disposition.kind.startsWith('folded-hostile-')))
        throw new Error(`${entityPath}: folded-hostile ledger target 缺 published hostile`)
      return rewriteResidualCommands({
        value: entity,
        path: entityPath,
        sceneId,
        entityId: entity.id,
        entries,
      }) as Record<string, unknown>
    })
    const [validated] = validateScenesV13([rawScene])
    if (!validated || validated.id !== sceneId)
      throw new Error(`${path}: W9 v13 scene id 不符`)
    if (changed) {
      if (isDeepStrictEqual(original, rawScene))
        throw new Error(`${path}: W9 ledger target 未形成 successor 变化`)
      files.set(path, rawScene as MigrationJson)
      changedScenePaths.push(path)
    }
  }
  const missingTargets = [...entriesByTarget.keys()].filter((key) => !consumedTargets.has(key))
  if (missingTargets.length)
    throw new Error(`W9 projector: ledger target 未落盘 ${missingTargets.slice(0, 5).join(',')}`)
  changedScenePaths.sort()
  return { files, changedScenePaths }
}
