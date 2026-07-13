import {
  getScriptBody,
  type ScriptChunkV1,
  type ScriptIndexV1,
  type ScriptRef,
  type ScriptStage,
} from '@type-pal/content'
import type { ScriptSourceRef } from './commands.js'

export interface MaterializedSceneStages {
  stages: ScriptStage[]
  bindings: Array<ScriptRef | undefined>
}

function sceneRootScriptPrefix(sceneId: string, source: ScriptSourceRef): string {
  const root =
    source.kind === 'onEnter'
      ? 'on-enter'
      : source.kind === 'onTeleport'
        ? 'on-teleport'
        : `entity-${source.entityId}/page-0/${source.kind}`
  return `scene/${sceneId}/root/${root}/stage-`
}

/** M3 迁移根脚本的稳定 id。它是场景私有存储绑定，不是作者共享脚本。 */
export function sceneRootScriptId(
  sceneId: string,
  source: ScriptSourceRef,
  stageIndex: number,
): string {
  return `${sceneRootScriptPrefix(sceneId, source)}${stageIndex}`
}

function isSceneRootBindingId(id: string, sceneId: string, source: ScriptSourceRef): boolean {
  const prefix = sceneRootScriptPrefix(sceneId, source)
  return id.startsWith(prefix) && /^\d+$/.test(id.slice(prefix.length))
}

/**
 * 把场景 stage 中仅用于分片存储的单条 callScript 壳透明展开。
 * 真正的 callScript、作者共享脚本和缺失目标仍原样展示，避免把控制流误当存储绑定。
 */
export function materializeSceneStages(
  sceneId: string,
  source: ScriptSourceRef,
  rawStages: readonly ScriptStage[],
  index: ScriptIndexV1 | undefined,
  chunks: Readonly<Record<string, ScriptChunkV1>>,
): MaterializedSceneStages {
  const bindings: Array<ScriptRef | undefined> = []
  const stages = rawStages.map((stage) => {
    const command = stage.body.length === 1 ? stage.body[0] : undefined
    if (
      !index ||
      command?.kind !== 'callScript' ||
      command.self !== undefined ||
      index.library?.[command.ref.id] !== undefined ||
      !isSceneRootBindingId(command.ref.id, sceneId, source)
    ) {
      bindings.push(undefined)
      return stage as ScriptStage
    }
    const body = getScriptBody(index, chunks, command.ref.id)
    if (!body) {
      bindings.push(undefined)
      return stage as ScriptStage
    }
    bindings.push(command.ref)
    return { ...stage, body }
  })
  return { stages, bindings }
}
