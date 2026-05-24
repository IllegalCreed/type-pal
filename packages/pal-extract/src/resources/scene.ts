/**
 * 从已解析的 SSS.MKF scenes / eventObjects 中 dump 出单一场景的 SceneObjects。
 *
 * 切法:scene[N] 拥有的 EventObjects 区间 = [scene[N].eventObjectIndex, scene[N+1].eventObjectIndex)。
 * 末场景兜底用 eventObjects.length。
 *
 * label 命名约定与 disasm 一致:`L_<ip>`;ip=0 视为"无入口"而非"指令 0",输出 undefined。
 */

import type { SceneObjects } from '@type-pal/shared'
import type { EventObject, Scene } from '../io/sss.js'

function labelOf(ip: number): string | undefined {
  return ip > 0 ? `L_${ip}` : undefined
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
    sceneObjects.eventObjects.push({
      id: i,
      x: eo.x,
      y: eo.y,
      spriteNum: eo.spriteNum,
      triggerLabel: labelOf(eo.triggerScript),
      autoLabel: labelOf(eo.autoScript),
      triggerMode: eo.triggerMode,
    })
  }

  return sceneObjects
}
