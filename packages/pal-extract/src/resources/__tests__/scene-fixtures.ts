import { concatBytes, mkfContainer, u16Bytes } from '../../__tests__/binary-fixtures.js'
import { parseSss } from '../../io/sss.js'

export type SceneWords = readonly [
  map: number,
  onEnter: number,
  onTeleport: number,
  firstObject: number,
]
export type EventWords = readonly [
  vanishTime: number,
  x: number,
  y: number,
  layer: number,
  trigger: number,
  auto: number,
  state: number,
  triggerMode: number,
  sprite: number,
  frames: number,
  direction: number,
  currentFrame: number,
  idle: number,
  spriteOffset: number,
  autoFrames: number,
  autoIdle: number,
]

/** 原始IO记录经真实parser生成typed/raw一致视图；不是完整可玩脚本图。每次返回fresh数据。 */
export function sceneFixture(scenes: readonly SceneWords[], objects: readonly EventWords[]) {
  return parseSss(
    mkfContainer([
      concatBytes(objects.map((record) => u16Bytes(...record))),
      concatBytes(scenes.map((record) => u16Bytes(...record))),
      new Uint8Array(),
      new Uint8Array(),
      new Uint8Array(),
    ]),
  )
}
