// Q10 r20（Q-NEXT1 有限批）· 全局脚本入口接线 fixture（Q 专属纯构造器，无测试）。
//
// 借用已验 cli-pipeline-inputs.ts 纯工厂（DATA/WORD/尾管线不变），新增 SSS 的 OBJECT 表
// hook 注入与四指令 bytecode：
//   ip0 giveItem(61×1)（不可达填充，不参与 slice）
//   ip1 showDialog(0xFFFF, msg0)（scene scriptOnEnter 入口）
//   ip2 plain end(0x0000)（scene scriptOnTeleport 入口；普通 end 真终止——end-advance
//       会 BFS 落穿 i+1 吞掉 hook 目标，故此处必须 0x0000）
//   ip3 plain end(0x0000)（独立合法 end = hook 目标；默认不可由 scene 到达）
// 与 Codex 正控（codex-opq-next-Q-premise-20261002）同构：exit0/roundtrip OK/done、
// shared 恰 [{op:'end',label:'L_3'}]、scene 恰 [showDialog L_1, end L_2]。
//
// OBJECT 表布局（SSS chunk2，551×14B；parsers/_utils.ts）：
//   item  id 61..295 base=id*14：scriptOnUse@4 / scriptOnEquip@6 / scriptOnThrow@8 / scriptDesc@10
//   spell id 296..397：scriptOnSuccess@4 / scriptOnUse@6 / scriptDesc@10
//   enemy obj 398..550：enemyId@0（1-based 指 DATA chunk1）/ resist@2 / turnStart@4 / battleEnd@6 / ready@8
//   player obj 36..41：scriptOnFriendDeath@4 / scriptOnDying@6
import {
  buildDataMkfArchive,
  buildTailPipelineInputs,
  buildWordDatArchive,
  mkfArchive,
} from './cli-pipeline-inputs.js'

export const OBJ_SIZE = 14
export const OBJECT_SLOTS = 551

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
export function buildGlobalEntrySss(hooks: GlobalEntryHook[]): Uint8Array {
  const eventObject = new Uint8Array(32)
  const scene = new Uint8Array(8)
  const sceneView = new DataView(scene.buffer)
  sceneView.setUint16(0, 1, true)
  sceneView.setUint16(2, 1, true)
  sceneView.setUint16(4, 2, true)
  sceneView.setUint16(6, 0, true)
  const objects = new Uint8Array(OBJECT_SLOTS * OBJ_SIZE)
  const objectsView = new DataView(objects.buffer)
  for (const h of hooks) {
    objectsView.setUint16(h.objectId * OBJ_SIZE + h.fieldOff, h.value, true)
  }
  const messageOffsets = new Uint8Array(8)
  const offsetsView = new DataView(messageOffsets.buffer)
  offsetsView.setUint32(0, 0, true)
  offsetsView.setUint32(4, 9, true)
  return mkfArchive([eventObject, scene, objects, messageOffsets, buildBytecode()])
}

/** 全合成 raw 输入（mkdtemp 树落盘用）：SSS(hook) + M.MSG + WORD.DAT + DATA + 已验尾管线。 */
export function buildGlobalEntryRawInputs(hooks: GlobalEntryHook[]): Record<string, Uint8Array> {
  return {
    'SSS.MKF': buildGlobalEntrySss(hooks),
    'M.MSG': new TextEncoder().encode(GLOBAL_ENTRY_MSG_TEXT),
    'WORD.DAT': buildWordDatArchive(),
    'DATA.MKF': buildDataMkfArchive(),
    ...buildTailPipelineInputs(),
  }
}
