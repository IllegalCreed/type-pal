import type { Facing, GridPos, SceneDef, SceneSpawn } from '@type-pal/content'

export type RuntimeSceneSpawn = SceneSpawn & { inheritFacing?: Facing }

export interface ResolvedSceneSpawn {
  pos: GridPos
  facing: Facing
}

/**
 * 场景朝向优先级：脚本显式值 > 命名落点值 > 上一场景继承值 > 场景默认值。
 * 首次启动不传 inherited，仍自然落到入口默认值。
 */
export function resolveSceneFacing(
  explicit: Facing | undefined,
  namedEntry: Facing | undefined,
  inherited: Facing | undefined,
  sceneDefault: Facing,
): Facing {
  return explicit ?? namedEntry ?? inherited ?? sceneDefault
}

/** Resolve the default, a registered named entry, or temporary coordinates. */
export function resolveSceneSpawn(
  sceneId: string,
  scene: Pick<SceneDef, 'entry' | 'entries'>,
  spawn?: RuntimeSceneSpawn,
): ResolvedSceneSpawn {
  const entryId = spawn?.entryId
  if (entryId !== undefined && spawn?.pos !== undefined)
    throw new Error(`场景 ${sceneId}: entryId 与 pos 不能同时存在`)
  const entries = scene.entries
  const entry =
    entryId !== undefined && entries && Object.hasOwn(entries, entryId)
      ? entries[entryId]
      : undefined
  if (entryId !== undefined && !entry) throw new Error(`场景 ${sceneId}: 找不到命名落点 ${entryId}`)
  return {
    pos: { ...(spawn?.pos ?? entry?.pos ?? scene.entry.pos) },
    facing: resolveSceneFacing(
      spawn?.facing,
      entry?.facing,
      spawn?.inheritFacing,
      scene.entry.facing,
    ),
  }
}
