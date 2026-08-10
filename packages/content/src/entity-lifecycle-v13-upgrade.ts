import type { LegacyManifestV12, ProjectManifest } from './character.js'
import type { HostileBehaviorV13, SceneDefV13 } from './scene-v13.js'
import { checkHostileBehaviorV13, checkPositiveSafeIntV13 } from './scene-v13.js'
import { checkAuthorCommandsV13 } from './script-v13.js'
import { validateScenesV5 } from './validate.js'

export type ManifestV13 = ProjectManifest<13>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[], path: string): void {
  const allowed = new Set(keys)
  for (const key of Object.keys(value))
    if (!allowed.has(key)) throw new Error(`${path}.${key}: 未知字段`)
}

/** v12 → v13 尚无 owner/self 注入时，任何深层 legacy vanish 都必须停在写盘前。 */
function rejectNestedLegacyVanish(value: unknown, path: string): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      rejectNestedLegacyVanish(entry, `${path}[${index}]`)
    })
    return
  }
  if (!isRecord(value)) return
  if (value.kind === 'vanishEntity')
    throw new Error(`${path}.kind: v13 升级缺少 owner/self，禁止遗留 vanishEntity`)
  for (const [key, child] of Object.entries(value))
    rejectNestedLegacyVanish(child, `${path}.${key}`)
}

/**
 * v12 authored hostile → v13 policy. PAL-specific 15-tick flee behavior is deliberately not
 * invented here: authored input gets remain on flee, while a positive, exact decisecond
 * respawnSeconds becomes the explicit victory hide policy.
 */
export function upgradeHostileBehaviorV12ToV13(
  value: unknown,
  path = 'hostile',
): HostileBehaviorV13 {
  if (!isRecord(value)) throw new Error(`${path}: 期望对象`)
  exactKeys(value, ['team', 'battleFieldId', 'chase', 'respawnSeconds', 'onLose'], path)
  if (!Number.isSafeInteger(value.team) || Number(value.team) < 0)
    throw new Error(`${path}.team: 期望非负安全整数`)
  const onVictory =
    value.respawnSeconds === undefined
      ? ({ kind: 'remove' } as const)
      : (() => {
          if (
            typeof value.respawnSeconds !== 'number' ||
            !Number.isFinite(value.respawnSeconds) ||
            value.respawnSeconds <= 0
          )
            throw new Error(`${path}.respawnSeconds: 期望可精确换算的正秒数`)
          const ticks = value.respawnSeconds * 10
          if (ticks / 10 !== value.respawnSeconds)
            throw new Error(`${path}.respawnSeconds: 不能精确换算为 100ms tick`)
          checkPositiveSafeIntV13(ticks, `${path}.respawnSeconds*10`)
          return { kind: 'hide' as const, ticks }
        })()
  if (value.onLose !== undefined && value.onLose !== 'gameOver')
    checkAuthorCommandsV13(value.onLose, `${path}.onLose`)
  const upgraded = {
    ...(clone(value) as Record<string, unknown>),
    onVictory,
    onPlayerFlee: { kind: 'remain' as const },
  } as Record<string, unknown>
  delete upgraded.respawnSeconds
  checkHostileBehaviorV13(upgraded, path)
  return upgraded as HostileBehaviorV13
}

/** v12 scene input remains validated by the historical v5 guard before policy conversion. */
export function upgradeScenesV12ToV13(value: unknown): SceneDefV13[] {
  rejectNestedLegacyVanish(value, 'scenes')
  const scenes = validateScenesV5(value)
  return scenes.map((scene, sceneIndex) => ({
    ...clone(scene),
    entities: scene.entities.map((entity, entityIndex) => ({
      ...clone(entity),
      ...(entity.hostile === undefined
        ? {}
        : {
            hostile: upgradeHostileBehaviorV12ToV13(
              entity.hostile,
              `scenes[${sceneIndex}].entities[${entityIndex}].hostile`,
            ),
          }),
    })),
  })) as SceneDefV13[]
}

/** v12 manifest → v13 successor; SAVE minimum remains an explicit 8. */
export function upgradeManifestV12ToV13(value: unknown): ManifestV13 {
  if (!isRecord(value)) throw new Error('manifest: 期望对象')
  if (value.contentVersion !== 12) throw new Error('manifest: 期望 contentVersion 12')
  if (value.minimumSaveVersion !== 8)
    throw new Error(
      `manifest.minimumSaveVersion: contentVersion 12 期望 8，收到 ${String(value.minimumSaveVersion)}`,
    )
  return {
    ...(clone(value) as unknown as LegacyManifestV12),
    contentVersion: 13,
    minimumSaveVersion: 8,
  }
}
