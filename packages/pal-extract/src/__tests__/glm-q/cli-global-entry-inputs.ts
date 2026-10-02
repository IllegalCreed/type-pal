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

import { encodeSpriteChunk } from '@type-pal/shared'
import {
  buildTailPipelineInputs,
  buildWordDatArchive,
  mkfArchive,
  u16le,
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

/**
 * index1 敌记录的植入字段（Q-NEXT-02：enemyId 直接作 index 引用——parseEnemies
 * id=index、sdlpal fight.c:516 均不减一；index0 为 placeholder，引用必须落到真实 index1）。
 */
export const GE_ENEMY1_FIELDS = { health: 777, exp: 55, cash: 66, level: 9 } as const

/**
 * DATA.MKF（Q-NEXT1 专属，其余 14 chunk 与已验 cli-pipeline 工厂同构）：
 * chunk1 = 140B 两条 ENEMY 记录——index0 placeholder（70B 全零）+ index1 完整真实记录
 * （health@22=777 / exp@24=55 / cash@26=66 / level@28=9），使 OBJECT398.enemyId=1
 * 成为合法直接索引引用。
 */
export function buildGlobalEntryDataMkf(): Uint8Array {
  const placeholder = new Uint8Array(70) // index0：占位（health 0）
  const enemy1 = new Uint8Array(70)
  const v = new DataView(enemy1.buffer)
  v.setUint16(22, GE_ENEMY1_FIELDS.health, true)
  v.setUint16(24, GE_ENEMY1_FIELDS.exp, true)
  v.setUint16(26, GE_ENEMY1_FIELDS.cash, true)
  v.setUint16(28, GE_ENEMY1_FIELDS.level, true)
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
