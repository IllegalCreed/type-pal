/**
 * SSS.MKF 解析 —— 仙剑原版脚本/场景归档。
 * 5-chunk MKF:
 *   0 = 事件对象数组 (EVENTOBJECT × n, 每条 32 字节 / 16 个 u16)
 *   1 = 场景数组 (SCENE × n, 每条 8 字节 / 4 个 u16)
 *   2 = 对象数组 (物品/法术/敌人, 原始 u16 数组)
 *   3 = 消息偏移表 (u32 LE, 每个值 = M.MSG 中的字节偏移)
 *   4 = 字节码 (每条指令 8 字节: u16 opcode + 3×u16 operand)
 *
 * 结构定义参考 reference/sdlpal/global.h::tagEVENTOBJECT / tagSCENE。
 */

import { openMkf, readChunk } from './mkf.js'

// EVENTOBJECT: 16 字段 × 2 字节 = 32 字节
// 字段顺序来自 global.h tagEVENTOBJECT:
//   [0]  sVanishTime
//   [1]  x
//   [2]  y
//   [3]  sLayer
//   [4]  wTriggerScript
//   [5]  wAutoScript
//   [6]  sState
//   [7]  wTriggerMode
//   [8]  wSpriteNum
//   [9]  nSpriteFrames
//  [10]  wDirection
//  [11]  wCurrentFrameNum
//  [12]  nScriptIdleFrame
//  [13]  wSpritePtrOffset
//  [14]  nSpriteFramesAuto
//  [15]  wScriptIdleFrameCountAuto
const EVENT_OBJECT_SIZE = 32 // bytes
const EVENT_OBJECT_FIELDS = EVENT_OBJECT_SIZE / 2 // = 16 u16 slots

// SCENE: 4 字段 × 2 字节 = 8 字节
// 字段顺序:
//   [0]  wMapNum
//   [1]  wScriptOnEnter
//   [2]  wScriptOnTeleport
//   [3]  wEventObjectIndex
const SCENE_SIZE = 8 // bytes
const SCENE_FIELDS = SCENE_SIZE / 2 // = 4 u16 slots

export interface EventObject {
  state: number
  vanishTime: number
  x: number
  y: number
  spriteNum: number
  triggerScript: number
  autoScript: number
  layer: number
  triggerMode: number
  raw: Uint16Array
}

export interface Scene {
  mapNum: number
  scriptOnEnter: number
  scriptOnTeleport: number
  eventObjectIndex: number
  raw: Uint16Array
}

export interface Sss {
  eventObjects: EventObject[]
  scenes: Scene[]
  objects: Uint16Array
  messageOffsets: Uint32Array
  bytecode: Uint8Array
}

function readU16(view: DataView, byteOffset: number): number {
  return view.getUint16(byteOffset, true)
}

function readI16(view: DataView, byteOffset: number): number {
  return view.getInt16(byteOffset, true)
}

function parseEventObjects(chunk: Uint8Array): EventObject[] {
  if (chunk.byteLength % EVENT_OBJECT_SIZE !== 0) {
    throw new Error(
      `SSS chunk0: byte length ${chunk.byteLength} is not a multiple of ${EVENT_OBJECT_SIZE}`,
    )
  }
  const count = chunk.byteLength / EVENT_OBJECT_SIZE
  const view = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength)
  const result: EventObject[] = []

  for (let i = 0; i < count; i++) {
    const base = i * EVENT_OBJECT_SIZE
    // read all 16 u16 slots into raw (use slice for safe alignment)
    const rawBytes = chunk.slice(base, base + EVENT_OBJECT_SIZE)
    const rawView = new DataView(rawBytes.buffer, rawBytes.byteOffset, rawBytes.byteLength)
    const raw = new Uint16Array(EVENT_OBJECT_FIELDS)
    for (let f = 0; f < EVENT_OBJECT_FIELDS; f++) {
      raw[f] = rawView.getUint16(f * 2, true)
    }

    result.push({
      vanishTime: readI16(view, base + 0),  // [0] sVanishTime (signed)
      x:          readU16(view, base + 2),  // [1] x
      y:          readU16(view, base + 4),  // [2] y
      layer:      readI16(view, base + 6),  // [3] sLayer (signed)
      triggerScript: readU16(view, base + 8),  // [4] wTriggerScript
      autoScript:    readU16(view, base + 10), // [5] wAutoScript
      state:         readI16(view, base + 12), // [6] sState (signed)
      triggerMode:   readU16(view, base + 14), // [7] wTriggerMode
      spriteNum:     readU16(view, base + 16), // [8] wSpriteNum
      raw,
    })
  }

  return result
}

function parseScenes(chunk: Uint8Array): Scene[] {
  if (chunk.byteLength % SCENE_SIZE !== 0) {
    throw new Error(
      `SSS chunk1: byte length ${chunk.byteLength} is not a multiple of ${SCENE_SIZE}`,
    )
  }
  const count = chunk.byteLength / SCENE_SIZE
  const view = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength)
  const result: Scene[] = []

  for (let i = 0; i < count; i++) {
    const base = i * SCENE_SIZE
    const rawBytes = chunk.slice(base, base + SCENE_SIZE)
    const rawView = new DataView(rawBytes.buffer, rawBytes.byteOffset, rawBytes.byteLength)
    const raw = new Uint16Array(SCENE_FIELDS)
    for (let f = 0; f < SCENE_FIELDS; f++) {
      raw[f] = rawView.getUint16(f * 2, true)
    }

    result.push({
      mapNum:            readU16(view, base + 0), // [0] wMapNum
      scriptOnEnter:     readU16(view, base + 2), // [1] wScriptOnEnter
      scriptOnTeleport:  readU16(view, base + 4), // [2] wScriptOnTeleport
      eventObjectIndex:  readU16(view, base + 6), // [3] wEventObjectIndex
      raw,
    })
  }

  return result
}

function parseObjects(chunk: Uint8Array): Uint16Array {
  const count = Math.floor(chunk.byteLength / 2)
  const view = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength)
  const result = new Uint16Array(count)
  for (let i = 0; i < count; i++) {
    result[i] = view.getUint16(i * 2, true)
  }
  return result
}

function parseMessageOffsets(chunk: Uint8Array): Uint32Array {
  const count = Math.floor(chunk.byteLength / 4)
  const view = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength)
  const result = new Uint32Array(count)
  for (let i = 0; i < count; i++) {
    result[i] = view.getUint32(i * 4, true)
  }
  return result
}

export function parseSss(buf: Uint8Array): Sss {
  const mkf = openMkf(buf)

  const chunk0 = readChunk(mkf, 0)
  const chunk1 = readChunk(mkf, 1)
  const chunk2 = readChunk(mkf, 2)
  const chunk3 = readChunk(mkf, 3)
  const chunk4 = readChunk(mkf, 4)

  return {
    eventObjects:   parseEventObjects(chunk0),
    scenes:         parseScenes(chunk1),
    objects:        parseObjects(chunk2),
    messageOffsets: parseMessageOffsets(chunk3),
    bytecode:       chunk4,
  }
}
