/**
 * 从已解析的 SSS.MKF scenes / eventObjects 中 dump 出单一场景的 SceneObjects。
 *
 * 切法:scene[N] 拥有的 EventObjects 区间 = [scene[N].eventObjectIndex, scene[N+1].eventObjectIndex)。
 * 末场景兜底用 eventObjects.length。
 *
 * label 命名约定与 disasm 一致:`L_<ip>`;ip=0 视为"无入口"而非"指令 0",输出 undefined。
 */

import type { EventObjectsFile, SceneEventObject, SceneObjects } from '@type-pal/shared'
import type { EventObject, Scene } from '../io/sss.js'

function labelOf(ip: number): string | undefined {
  return ip > 0 ? `L_${ip}` : undefined
}

/** 单个 EventObject → SceneEventObject(全局 id = sss.eventObjects 下标)。dumpScene / dumpAllEventObjects 共用。 */
function mapEventObject(eo: EventObject, id: number): SceneEventObject {
  return {
    id,
    x: eo.x,
    y: eo.y,
    spriteNum: eo.spriteNum,
    triggerLabel: labelOf(eo.triggerScript),
    autoLabel: labelOf(eo.autoScript),
    triggerMode: eo.triggerMode,
    sState: eo.state,
    sLayer: eo.layer,
    vanishTime: eo.vanishTime,
    nSpriteFrames: eo.nSpriteFrames,
    direction: eo.direction,
    currentFrameNum: eo.currentFrameNum,
    scriptIdleFrame: eo.scriptIdleFrame,
    spritePtrOffset: eo.spritePtrOffset,
    nSpriteFramesAuto: eo.nSpriteFramesAuto,
    scriptIdleFrameCountAuto: eo.scriptIdleFrameCountAuto,
  }
}

/**
 * Dump 全局 event object 表(忠实 sdlpal lprgEventObject)。
 * 全部 event object(下标=全局 id)+ 各 scene 的 [start,end) 区间(键=scene 0-based index)。
 */
export function dumpAllEventObjects(scenes: Scene[], eventObjects: EventObject[]): EventObjectsFile {
  const allObjs = eventObjects.map((eo, i) => mapEventObject(eo, i))
  const sceneRanges: Record<number, [number, number]> = {}
  for (let s = 0; s < scenes.length; s++) {
    const scene = scenes[s]
    if (!scene) continue
    const from = scene.eventObjectIndex
    const to = s + 1 < scenes.length ? scenes[s + 1]!.eventObjectIndex : eventObjects.length
    sceneRanges[s] = [from, to]
  }
  return { eventObjects: allObjs, sceneRanges }
}

export function dumpScene(
  sceneId: number,
  scenes: Scene[],
  eventObjects: EventObject[],
): SceneObjects {
  const scene = scenes[sceneId]
  if (!scene) {
    throw new Error(`dumpScene: scene ${sceneId} 不存在(scenes.length=${scenes.length})`)
  }

  const fromIdx = scene.eventObjectIndex
  const toIdx =
    sceneId + 1 < scenes.length
      ? // biome-ignore lint/style/noNonNullAssertion: sceneId+1 < scenes.length checked above
        scenes[sceneId + 1]!.eventObjectIndex
      : eventObjects.length

  const sceneObjects: SceneObjects = {
    sceneId,
    mapNum: scene.mapNum,
    onEnterLabel: labelOf(scene.scriptOnEnter),
    onTeleportLabel: labelOf(scene.scriptOnTeleport),
    eventObjects: [],
  }

  for (let i = fromIdx; i < toIdx; i++) {
    const eo = eventObjects[i]
    if (!eo) continue
    sceneObjects.eventObjects.push(mapEventObject(eo, i))
  }

  return sceneObjects
}
