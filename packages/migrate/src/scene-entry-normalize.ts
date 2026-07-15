import type { Command, GridPos, SceneDef } from '@type-pal/content'
import { stableScriptHash } from '@type-pal/content'

/** 迁移器所有的命名落点 id 域；作者落点不得使用此前缀。 */
export const MIGRATED_SCENE_ENTRY_PREFIX = 'pal-entry-'

function positionKey(pos: GridPos): string {
  return `${pos.col},${pos.row},${pos.height}`
}

function samePosition(a: GridPos, b: GridPos): boolean {
  return a.col === b.col && a.row === b.row && a.height === b.height
}

/** id 只依赖目标场景与完整 GridPos，不依赖来源、遍历次序或显示名。 */
export function migratedSceneEntryId(sceneId: string, pos: GridPos): string {
  const tuple = JSON.stringify([sceneId, pos.col, pos.row, pos.height])
  return `${MIGRATED_SCENE_ENTRY_PREFIX}${stableScriptHash(tuple).toString(16).padStart(8, '0')}`
}

export interface SceneEntryNormalizationReport {
  /** 归一化前带静态 pos 的 loadScene 数。 */
  staticCommands: number
  /** 可解析目标的唯一 (scene,pos) 组数。 */
  uniqueTargets: number
  /** 等于目标默认落点的唯一组数。 */
  defaultTargets: number
  /** 生成命名落点的唯一组数。 */
  namedTargets: number
  /** 因窄切片缺目标场景而保留 pos 的命令数；正式迁移必须为 0。 */
  unresolvedCommands: number
}

interface PosCommand {
  command: Extract<Command, { kind: 'loadScene' }> & { pos: GridPos }
  target: SceneDef
}

/**
 * 在最终脚本树上把 loadScene.pos 归一化成默认/命名落点引用。
 * 函数原地改写 scenes 与 roots；调用方必须在 ScriptRegistry.build() 之前执行，
 * 让分片 bytes/hash 从最终命令派生。
 */
export function normalizeSceneEntryReferences(
  scenes: SceneDef[],
  roots: readonly Command[][],
  options: {
    strictMissingScene?: boolean
    idFor?: (sceneId: string, pos: GridPos) => string
  } = {},
): SceneEntryNormalizationReport {
  const byId = new Map(scenes.map((scene) => [scene.id, scene]))
  const commands: Array<Extract<Command, { kind: 'loadScene' }> & { pos: GridPos }> = []
  const seen = new WeakSet<object>()
  const collect = (node: unknown): void => {
    if (!node || typeof node !== 'object') return
    if (seen.has(node)) return
    seen.add(node)
    if (Array.isArray(node)) {
      for (const child of node) collect(child)
      return
    }
    const record = node as Record<string, unknown>
    if (record.kind === 'loadScene' && record.pos !== undefined) {
      if (record.entryId !== undefined)
        throw new Error(`loadScene ${String(record.scene)}: entryId 与 pos 同时存在`)
      const pos = record.pos as Partial<GridPos>
      if (
        typeof record.scene !== 'string' ||
        typeof pos.col !== 'number' ||
        typeof pos.row !== 'number' ||
        typeof pos.height !== 'number'
      )
        throw new Error(`loadScene 静态坐标形状非法: ${JSON.stringify(record)}`)
      commands.push(record as unknown as (typeof commands)[number])
    }
    for (const child of Object.values(record)) collect(child)
  }
  for (const root of roots) collect(root)
  collect(scenes)

  const resolved: PosCommand[] = []
  let unresolvedCommands = 0
  for (const command of commands) {
    const target = byId.get(command.scene)
    if (!target) {
      unresolvedCommands++
      if (options.strictMissingScene)
        throw new Error(`loadScene ${command.scene}: 目标场景不在迁移结果中`)
      continue
    }
    resolved.push({ command, target })
  }

  const groups = new Map<string, PosCommand[]>()
  for (const item of resolved) {
    const key = `${item.target.id}\0${positionKey(item.command.pos)}`
    const group = groups.get(key) ?? []
    group.push(item)
    groups.set(key, group)
  }

  const idFor = options.idFor ?? migratedSceneEntryId
  let defaultTargets = 0
  let namedTargets = 0
  for (const group of groups.values()) {
    const first = group[0]!
    const pos = first.command.pos
    if (samePosition(first.target.entry.pos, pos)) {
      defaultTargets++
      for (const { command } of group) delete (command as { pos?: GridPos }).pos
      continue
    }

    namedTargets++
    const entryId = idFor(first.target.id, pos)
    if (!entryId.startsWith(MIGRATED_SCENE_ENTRY_PREFIX))
      throw new Error(`迁移落点 id 未使用保留前缀: ${entryId}`)
    const existing = first.target.entries?.[entryId]
    if (existing && !samePosition(existing.pos, pos))
      throw new Error(
        `迁移落点散列碰撞 ${first.target.id}/${entryId}: ${positionKey(existing.pos)} != ${positionKey(pos)}`,
      )
    first.target.entries = {
      ...(first.target.entries ?? {}),
      [entryId]:
        existing ??
        ({
          label: `原版落点 (${pos.col}, ${pos.row}, ${pos.height})`,
          pos: { ...pos },
        } satisfies NonNullable<SceneDef['entries']>[string]),
    }
    for (const { command } of group) {
      delete (command as { pos?: GridPos }).pos
      ;(command as { entryId?: string }).entryId = entryId
    }
  }

  return {
    staticCommands: commands.length,
    uniqueTargets: groups.size,
    defaultTargets,
    namedTargets,
    unresolvedCommands,
  }
}
