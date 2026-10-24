import type {
  AbstractKey,
  Command,
  InputSnapshot,
  SceneEventObject,
  Tilemap,
} from '@type-pal/shared'
import type { SceneAssets } from '../assets/loader.js'

export function makeFlatMap(w: number, h: number): Tilemap {
  const cells = Array.from({ length: h }, () =>
    Array.from({ length: w }, () => ({ lower: 0, upper: 0 })),
  )
  return { width: w, height: h, cells, tileset: 'fake' }
}

/**
 * 生成包含阻挡 tile 的 tilemap。
 * blockedH0: [[col, row], ...] → 对应 cell.lower bit 13 (0x2000) 置 1。
 * blockedH1: [[col, row], ...] → 对应 cell.upper bit 13 (0x2000) 置 1。
 */
export function makeBlockedMap(
  w: number,
  h: number,
  blockedH0: [number, number][] = [],
  blockedH1: [number, number][] = [],
): Tilemap {
  const map = makeFlatMap(w, h)
  for (const [col, row] of blockedH0) {
    map.cells[row]![col]!.lower = 0x2000
  }
  for (const [col, row] of blockedH1) {
    map.cells[row]![col]!.upper = 0x2000
  }
  return map
}

export function snap(
  held: AbstractKey[] = [],
  pressed: AbstractKey[] = [],
  frameNum = 0,
): InputSnapshot {
  return {
    held: new Set(held),
    pressed: new Set(pressed),
    frameNum,
  }
}

export function makeSceneAssets(
  sceneId: number,
  eventObjects: SceneEventObject[] = [],
  eventCommands: Command[] = [],
  labelMap: Record<string, number> = {},
  onEnterLabel?: string,
): SceneAssets {
  return {
    sceneId,
    mapNum: sceneId, // 测试用占位:让 getCurrentMapNum 有可断言的非 0 值(真值来自 scene JSON）
    tilemap: makeFlatMap(64, 128),
    palette: { colors: Array.from({ length: 256 }, () => [0, 0, 0]), cycles: [] },
    eventObjects,
    npcSprites: new Map(),
    eventCommands,
    labelMap,
    onEnterLabel,
  }
}
