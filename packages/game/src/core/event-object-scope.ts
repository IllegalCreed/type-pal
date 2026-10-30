/** 事件对象定位与失败诊断；借用原对象引用，不推进游标、不修改游戏状态。
 * self只查当前场景；场景专用操作不回退全局；显式全局ID使用1-based地址。
 */
import type { GameState, NpcState } from './game-state.js'

type SceneObjectScope = Pick<GameState, 'npcs'>
type GlobalObjectScope = Pick<GameState, 'npcs' | 'allEventObjects'>

/** 取 trigger 的 self NPC(sdlpal `pEvtObj`,纯 self 类 opcode 0x14 / 0xF 用)。无效 id 时 warn + 返回 null。 */
export function getSelfNpc(
  gs: SceneObjectScope,
  currentEventObjectId: number | undefined,
  opName: string,
): NpcState | null {
  if (currentEventObjectId === undefined) {
    console.warn(`event-system: ${opName} 无 currentEventObjectId(可能从 runEnterScript 跑),跳过`)
    return null
  }
  const npc = gs.npcs.find((n) => n.id === currentEventObjectId)
  if (!npc) {
    console.warn(`event-system: ${opName} npc id=${currentEventObjectId} 不在 gs.npcs,跳过`)
    return null
  }
  return npc
}

/**
 * DM17:仅限**当前场景**的对象解析(0x81/0x83/0x84 专用)。
 * C 真值(script.c:2395-2404/2452-2461/2477-2486):三个 case 先查
 * `op0 <= rgScene[cur-1].wEventObjectIndex || op0 > rgScene[cur].wEventObjectIndex`,
 * 不在当前场景即失败跳转 —— 这是物品 scriptOnUse 跨场景共享脚本的路由机制
 * ("换个场景用就提示无法使用",30 处)。回退全局表会让异场景对象"假成功"
 * (用陈旧坐标判距离/把异场景对象搬来当前场景 = 跨场景状态污染)。
 */
export function resolveInSceneNpc(
  gs: SceneObjectScope,
  operand0: number,
  currentEventObjectId: number | undefined,
  opName: string,
): NpcState | null {
  if (operand0 === 0 || operand0 === 0xffff) {
    return getSelfNpc(gs, currentEventObjectId, opName)
  }
  const targetId = operand0 - 1
  return gs.npcs.find((n) => n.id === targetId) ?? null
}

/**
 * Sync.2 fix4:resolve `pCurrent` 对应的 NPC(port sdlpal script.c:608-639 PAL_InterpretInstruction 入口)。
 *
 *   operand[0] == 0 / 0xFFFF → pCurrent = pEvtObj(self,由 currentEventObjectId 决定)
 *   其它                     → pCurrent = lprgEventObject[operand[0] - 1](1-based 全局 NPC id)
 *
 * 0x13 / 0x16 / 0x6C 等 pCurrent 类 opcode 用,允许显式选其他 NPC(onEnter 段经此走对 NPC)。
 */
export function resolveTargetNpc(
  gs: GlobalObjectScope,
  operand0: number,
  currentEventObjectId: number | undefined,
  opName: string,
): NpcState | null {
  // operand[0] = 0 或 0xFFFF → self
  if (operand0 === 0 || operand0 === 0xffff) {
    return getSelfNpc(gs, currentEventObjectId, opName)
  }
  // 其它 → lprgEventObject[operand0-1](1-based 全局 NPC id),经唯一全局解析器。
  return resolveGlobalEventObject(gs, operand0, opName)
}

/**
 * 唯一"1-based 全局 event object id → 对象"解析器(sdlpal `lprgEventObject[id-1]`)。
 *
 * 所有按全局 id 选对象的 opcode(0x49 单对象 via resolveTargetNpc / 0x9A 多对象范围)共用此函数,
 * 杜绝各自手搓 `id-1` / scope 而出 off-by-one 或漏全局对象(P0#2,2026-05-29:0x9A 曾 0-based
 * [op0..op1] + 只扫 gs.npcs)。
 *
 * 先查当前 scene 切片 gs.npcs(拿到引用),不在则回退 gs.allEventObjects 全局表 —— sdlpal
 * lprgEventObject 是单一全局表,脚本可改任意 scene 对象状态;gs.npcs 只是当前 scene 的引用切片,
 * 跨 scene 改动经全局表持久(eg. 客栈苗人 0x49 [25,2,0] 跨 scene 显隐)。
 */
export function resolveGlobalEventObject(
  gs: GlobalObjectScope,
  oneBasedId: number,
  opName: string,
): NpcState | null {
  const targetId = oneBasedId - 1
  const npc = gs.npcs.find((n) => n.id === targetId)
  if (npc) return npc
  const global = gs.allEventObjects?.[targetId]
  if (global && global.id === targetId) return global
  console.warn(
    `event-system: ${opName} id(1-based)=${oneBasedId} → idx=${targetId} 不在当前 scene 也不在全局表,跳过`,
  )
  return null
}
