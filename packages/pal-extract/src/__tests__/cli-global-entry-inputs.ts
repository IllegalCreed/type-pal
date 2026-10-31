/** OBJECT hook input for real CLI entry collection.
 * Four instructions separate scene roots (1/2) from an otherwise unreachable global hook (3).
 * The plain end at ip2 must not fall through into ip3. Dedicated enemy input retains a
 * placeholder at index0 and a nonzero index1 record to verify direct references.
 * Builders return fresh bytes; the CLI host owns directories, processes and cleanup.
 */
import { encodeSpriteChunk } from '@type-pal/shared'
import { mkfContainer as mkfArchive, u16Bytes as u16le } from './binary-fixtures.js'
import { buildTailPipelineInputs, buildWordDatArchive } from './cli-pipeline-inputs.js'

const OBJECT_RECORD_BYTES = 14
const OBJECT_SLOTS = 551

/** OBJECT 表 hook 注入点（objectId 绝对索引 × 字段偏移 × u16 值）。 */
export interface GlobalEntryHook {
  objectId: number
  fieldOff: number
  value: number
}

export const GLOBAL_ENTRY_MSG_TEXT = 'HELLO MSG'

/** 四指令 bytecode：16×u16（每指令 8B = opcode + 3 操作数，disasm 合同）。 */
function buildBytecode(): Uint8Array {
  const words: number[] = [
    0x001f,
    61,
    1,
    0, // ip0 giveItem(61×1)
    0xffff,
    0,
    0,
    0, // ip1 showDialog(msg0)
    0x0000,
    0,
    0,
    0, // ip2 plain end（scene 终止；不落穿）
    0x0000,
    0,
    0,
    0, // ip3 plain end（hook 目标，scene 默认不可达）
  ]
  const out = new Uint8Array(words.length * 2)
  const view = new DataView(out.buffer)
  for (const [i, w] of words.entries()) view.setUint16(i * 2, w, true)
  return out
}

/**
 * SSS 五 chunk（与基线同构）+ OBJECT 表 hook 注入。
 * scene 头：mapNum=1 / scriptOnEnter=1 / scriptOnTeleport=2 / eventObjectIndex=0。
 */
function buildGlobalEntrySss(hooks: GlobalEntryHook[]): Uint8Array {
  const eventObject = new Uint8Array(32)
  const scene = new Uint8Array(8)
  const sceneView = new DataView(scene.buffer)
  sceneView.setUint16(0, 1, true)
  sceneView.setUint16(2, 1, true)
  sceneView.setUint16(4, 2, true)
  sceneView.setUint16(6, 0, true)
  const objects = new Uint8Array(OBJECT_SLOTS * OBJECT_RECORD_BYTES)
  const objectsView = new DataView(objects.buffer)
  for (const h of hooks) {
    objectsView.setUint16(h.objectId * OBJECT_RECORD_BYTES + h.fieldOff, h.value, true)
  }
  const messageOffsets = new Uint8Array(8)
  const offsetsView = new DataView(messageOffsets.buffer)
  offsetsView.setUint32(0, 0, true)
  offsetsView.setUint32(4, 9, true)
  return mkfArchive([eventObject, scene, objects, messageOffsets, buildBytecode()])
}

/**
 * index1 敌记录的植入字段（enemyId直接索引parseEnemies的id；
 * SDLPal PAL_BattleStart直接以对象enemyId索引敌表，index0保留placeholder）。
 */
export const ENEMY_REFERENCE_STATS = { health: 777, exp: 55, cash: 66, level: 9 } as const

/**
 * DATA.MKF（其余14 chunk与基础pipeline输入同构）：
 * chunk1 = 140B 两条 ENEMY 记录——index0 placeholder（70B 全零）+ index1 完整真实记录
 * （health@22=777 / exp@24=55 / cash@26=66 / level@28=9），使 OBJECT398.enemyId=1
 * 成为合法直接索引引用。
 */
function buildGlobalEntryDataMkf(): Uint8Array {
  const placeholder = new Uint8Array(70) // index0：占位（health 0）
  const enemy1 = new Uint8Array(70)
  const v = new DataView(enemy1.buffer)
  v.setUint16(22, ENEMY_REFERENCE_STATS.health, true)
  v.setUint16(24, ENEMY_REFERENCE_STATS.exp, true)
  v.setUint16(26, ENEMY_REFERENCE_STATS.cash, true)
  v.setUint16(28, ENEMY_REFERENCE_STATS.level, true)
  const store = new Uint8Array([...u16le(61), ...new Uint8Array(16)])
  const roles = new Uint8Array(900)
  new DataView(roles.buffer).setUint16(24, 2, true)
  const spriteChunk = encodeSpriteChunk([
    { width: 4, height: 4, pixels: new Uint8Array(16).fill(3), opaque: new Uint8Array(16).fill(1) },
  ])
  return mkfArchive([
    store,
    new Uint8Array([...placeholder, ...enemy1]), // chunk1：140B 两条敌记录
    new Uint8Array(10),
    roles,
    new Uint8Array(32),
    new Uint8Array(12),
    new Uint8Array(20),
    new Uint8Array(0),
    new Uint8Array(0),
    spriteChunk,
    spriteChunk,
    new Uint8Array(40),
    new Uint8Array(282).fill(7),
    new Uint8Array(100),
    new Uint8Array(200),
  ])
}

/** 全合成 raw 输入（mkdtemp 树落盘用）：SSS(hook) + M.MSG + WORD.DAT + DATA + 已验尾管线。 */
export function buildGlobalEntryRawInputs(hooks: GlobalEntryHook[]): Record<string, Uint8Array> {
  return {
    'SSS.MKF': buildGlobalEntrySss(hooks),
    'M.MSG': new TextEncoder().encode(GLOBAL_ENTRY_MSG_TEXT),
    'WORD.DAT': buildWordDatArchive(),
    'DATA.MKF': buildGlobalEntryDataMkf(),
    ...buildTailPipelineInputs(),
  }
}
