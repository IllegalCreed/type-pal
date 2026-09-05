/**
 * Canonical/legacy command trees里的持久对象引用叶。
 *
 * 本文件只识别有明确 command/condition kind 的字段与精确 EntityAddress 形状；不会把普通同名
 * `scene`/`mapId`/`shop` 字段猜成引用。编辑器的 owner、locator 与删除策略属于 editor 层。
 */

export type CommandTargetReference =
  | {
      target: { kind: 'scene'; id: string }
      relation:
        | 'condition-current-scene'
        | 'load-scene'
        | 'select-scene-hooks'
        | 'scene-map-override'
        | 'legacy-scene-script-binding'
      where: string
    }
  | {
      target: { kind: 'scene-entry'; sceneId: string; entryId: string }
      relation: 'load-scene-entry'
      where: string
    }
  | {
      target: {
        kind: 'scene-hook'
        sceneId: string
        slot: 'onEnter' | 'onTeleport'
        hookId: string
      }
      relation: 'select-scene-hook'
      where: string
    }
  | {
      target: { kind: 'entity'; sceneId: string; entityId: string }
      relation: 'entity-address'
      where: string
    }
  | {
      target: { kind: 'map'; id: string }
      relation: 'scene-map-override'
      where: string
    }
  | {
      target: { kind: 'shop'; id: number }
      relation: 'open-shop-buy'
      where: string
    }
  | {
      target: { kind: 'enemy-team'; id: string }
      relation: 'start-battle'
      where: string
    }
  | {
      target: { kind: 'battle-field'; id: number }
      relation: 'start-battle'
      where: string
    }
  | {
      target: { kind: 'ambience'; id: string }
      relation: 'set-ambience' | 'toggle-day-night'
      where: string
    }
  | {
      target: { kind: 'skill'; id: string }
      relation: 'learn-skill'
      where: string
    }

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function nonNegativeSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0
}

function isExactEntityAddress(record: Record<string, unknown>): boolean {
  const keys = Object.keys(record)
  return (
    keys.length === 2 &&
    keys.includes('scene') &&
    keys.includes('entity') &&
    nonEmptyString(record.scene) &&
    nonEmptyString(record.entity)
  )
}

/** 与 collector 共用的显式 SceneId 识别口；复制场景不得另写一套字段名扫描。 */
function explicitSceneIdAtNode(record: Record<string, unknown>): string | undefined {
  if (isExactEntityAddress(record)) return record.scene as string
  switch (record.kind) {
    case 'currentScene':
    case 'loadScene':
    case 'selectSceneHooks':
    case 'setSceneMapOverride':
    case 'setSceneOnEnter':
    case 'setSceneOnTeleport':
    case 'clearSceneScripts':
      return nonEmptyString(record.scene) ? record.scene : undefined
    default:
      return undefined
  }
}

/** Inspect one tagged node only; nested values are not traversed. */
export function commandTargetReferencesAtNode(
  value: unknown,
  where: string,
  references: CommandTargetReference[] = [],
): CommandTargetReference[] {
  if (!isRecord(value)) return []
  if (isExactEntityAddress(value)) {
    const sceneId = explicitSceneIdAtNode(value)
    if (!sceneId) return references
    references.push({
      target: {
        kind: 'entity',
        sceneId,
        entityId: value.entity as string,
      },
      relation: 'entity-address',
      where,
    })
    return references
  }
  const sceneId = explicitSceneIdAtNode(value)
  switch (value.kind) {
    case 'currentScene':
      if (sceneId)
        references.push({
          target: { kind: 'scene', id: sceneId },
          relation: 'condition-current-scene',
          where: `${where}.scene`,
        })
      break
    case 'loadScene':
      if (sceneId) {
        references.push({
          target: { kind: 'scene', id: sceneId },
          relation: 'load-scene',
          where: `${where}.scene`,
        })
        if (nonEmptyString(value.entryId))
          references.push({
            target: { kind: 'scene-entry', sceneId, entryId: value.entryId },
            relation: 'load-scene-entry',
            where: `${where}.entryId`,
          })
      }
      break
    case 'selectSceneHooks':
      if (sceneId) {
        references.push({
          target: { kind: 'scene', id: sceneId },
          relation: 'select-scene-hooks',
          where: `${where}.scene`,
        })
        if (isRecord(value.selection))
          for (const slot of ['onEnter', 'onTeleport'] as const) {
            const selection = value.selection[slot]
            if (isRecord(selection) && selection.kind === 'use' && nonEmptyString(selection.value))
              references.push({
                target: {
                  kind: 'scene-hook',
                  sceneId,
                  slot,
                  hookId: selection.value,
                },
                relation: 'select-scene-hook',
                where: `${where}.selection.${slot}.value`,
              })
          }
      }
      break
    case 'setSceneMapOverride':
      if (sceneId)
        references.push({
          target: { kind: 'scene', id: sceneId },
          relation: 'scene-map-override',
          where: `${where}.scene`,
        })
      if (nonEmptyString(value.mapId))
        references.push({
          target: { kind: 'map', id: value.mapId },
          relation: 'scene-map-override',
          where: `${where}.mapId`,
        })
      break
    case 'setSceneOnEnter':
    case 'setSceneOnTeleport':
    case 'clearSceneScripts':
      // 这三种只允许出现在只读 ScriptChunk；current author guard 已明确退役。
      if (sceneId)
        references.push({
          target: { kind: 'scene', id: sceneId },
          relation: 'legacy-scene-script-binding',
          where: `${where}.scene`,
        })
      break
    case 'openShop':
      // runtime 的 sell 分支完全不读取 shops；历史 shop 字段无论 0/非零都不是引用。
      if (value.mode === 'buy' && nonNegativeSafeInteger(value.shop))
        references.push({
          target: { kind: 'shop', id: value.shop },
          relation: 'open-shop-buy',
          where: `${where}.shop`,
        })
      break
    case 'startBattle':
      if (nonEmptyString(value.enemyTeamId))
        references.push({
          target: { kind: 'enemy-team', id: value.enemyTeamId },
          relation: 'start-battle',
          where: `${where}.enemyTeamId`,
        })
      if (nonNegativeSafeInteger(value.fieldId))
        references.push({
          target: { kind: 'battle-field', id: value.fieldId },
          relation: 'start-battle',
          where: `${where}.fieldId`,
        })
      break
    case 'setAmbience':
      if (nonEmptyString(value.ambience))
        references.push({
          target: { kind: 'ambience', id: value.ambience },
          relation: 'set-ambience',
          where: `${where}.ambience`,
        })
      break
    case 'toggleDayNight':
      for (const id of ['day', 'night'])
        references.push({
          target: { kind: 'ambience', id },
          relation: 'toggle-day-night',
          where,
        })
      break
    case 'learnSkill':
      if (nonEmptyString(value.skill))
        references.push({
          target: { kind: 'skill', id: value.skill },
          relation: 'learn-skill',
          where: `${where}.skill`,
        })
      break
  }
  return references
}

/**
 * 复制场景专用：只重写 collector 能识别的显式 source SceneId，保留外部目标与所有局部 id。
 * 返回完整深拷，绝不 mutate 输入；隐式“当前场景”字段没有持久 SceneId，天然随复制体生效。
 */
export function rewriteExplicitSceneReferences<T>(
  value: T,
  sourceSceneId: string,
  targetSceneId: string,
): T {
  if (!nonEmptyString(sourceSceneId) || !nonEmptyString(targetSceneId))
    throw new Error('rewriteExplicitSceneReferences: source/target SceneId 必须非空')
  const visit = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(visit)
    if (!isRecord(node)) return node
    const next = Object.fromEntries(Object.entries(node).map(([key, child]) => [key, visit(child)]))
    if (explicitSceneIdAtNode(node) === sourceSceneId) next.scene = targetSceneId
    return next
  }
  return visit(value) as T
}

/** Full recursive content/legacy walker used by validation and read-only chunk adapters. */
export function collectCommandTargetReferences(
  value: unknown,
  where: string,
): CommandTargetReference[] {
  const references: CommandTargetReference[] = []
  visitCommandTargetReferences(value, where, (reference) => references.push(reference))
  return references
}

export function visitCommandTargetReferences(
  value: unknown,
  where: string,
  visitReference: (reference: CommandTargetReference) => void,
): void {
  const nodeReferences: CommandTargetReference[] = []
  const visit = (node: unknown, path: string): void => {
    if (Array.isArray(node)) {
      node.forEach((entry, index) => {
        visit(entry, `${path}[${index}]`)
      })
      return
    }
    if (!isRecord(node)) return
    nodeReferences.length = 0
    commandTargetReferencesAtNode(node, path, nodeReferences)
    for (const reference of nodeReferences) visitReference(reference)
    for (const [key, child] of Object.entries(node)) visit(child, `${path}.${key}`)
  }
  visit(value, where)
}

/**
 * One canonical command visit. Nested command arms are visited separately by the canonical visitor;
 * only the current command, its direct EntityAddress fields and its condition tree are inspected here.
 */
export function collectCanonicalCommandTargetReferences(
  command: unknown,
  where: string,
): CommandTargetReference[] {
  const references = commandTargetReferencesAtNode(command, where)
  if (!isRecord(command)) return references
  for (const key of ['target', 'targets', 'self', 'cond'] as const)
    if (command[key] !== undefined)
      references.push(...collectCommandTargetReferences(command[key], `${where}.${key}`))
  return references
}
