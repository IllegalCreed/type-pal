/**
 * TEST-GLM-EVENT-WAVE-K-1 · K01 trigger 游标、子脚本及恢复
 *
 * 审计行(组 K01):
 * - 现行 caller:mode.ts:63(explore/event 每帧 tickEventSystem)、scene-system trigger 触发时读
 *   owner.triggerResume 起跑、event-system.ts:1919-1952(trigger 'end' 持久化)。
 * - 旧测证据(排重):event-system.test.ts『NPC trigger 脚本推进持久化』
 *   - :2765 `0x01 advance:trigger 跑完 → triggerResume 续跑下一条`
 *   - :2786 `0x00 plain:trigger 跑完 → triggerResume **不动**`
 *   - :2807 `0x08 checkpoint:推进 resume 点到 0x08 后…`
 *   - :2826 `0x25 setTriggerScript:清 triggerResume`
 *   旧测对 trigger 'end' 的 **0x02 reset 收尾**(含 idleFrames 计数)零断言。
 * - 一手真值:reference/sdlpal/script.c:3218-3237(PAL_RunTriggerScript case 0x0002:
 *   `op1==0 || ++nScriptIdleFrame < op1` → wNextScriptEntry = op0(以 resetTo 收尾);
 *   计数满 → `nScriptIdleFrame = 0; wScriptEntry++`(fall-through 继续本次运行));
 *   play.c:153 `p->wTriggerScript = PAL_RunTriggerScript(...)`(返回值写回对象)。
 * - 缺口结论:trigger 0x02 reset 收尾两条合同(re-arm 到 resetTo / idleFrames 满次同帧
 *   fall-through 且计数挂 owner 跨运行累计)均无旧证 → 新增;其余 trigger 恢复合同已证不重做。
 */
import type { AbstractKey, Command, InputSnapshot } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { createCommandBus } from './command-bus.js'
import { buildLabelMap, OP_PLAY_SOUND, setGlobalEvents, tickEventSystem } from './event-system.js'
import { createInitialGameState, type GameState } from './game-state.js'

function snap(pressed: AbstractKey[] = []): InputSnapshot {
  return { held: new Set(), pressed: new Set(pressed), frameNum: 0 }
}

/** 跑了哪些音效 = 脚本实际执行轨迹(0x47 push pendingSounds,shell drain 播)。 */
function soundsOf(gs: GameState): number[] {
  return gs.pendingSounds ?? []
}

/** 以 trigger 上下文装 cursor(owner 语义齐全;owner 对象跨触发复用 = 持久事件对象)。 */
function loadTrigger(gs: GameState, commands: Command[], ownerId: number, startIp = 0): void {
  if (!gs.npcs.some((n) => n.id === ownerId)) {
    gs.npcs = [{ id: ownerId, x: 0, y: 0, spriteNum: 1, sState: 2 }]
  }
  gs.eventCursor = {
    commands,
    labelMap: buildLabelMap(commands),
    ip: startIp,
    currentEventObjectId: ownerId,
    triggerOwnerId: ownerId,
  }
  gs.mode = 'event'
}

describe('K01 trigger 0x02 reset 收尾 → owner.triggerResume 重臂到 resetTo(sdlpal script.c:3218-3237 + play.c:153)', () => {
  it('0x02 end(resetTo=L_4)→ resume={ip:4};end 与目标之间的 op 永不执行;从 resume 再触发跑目标段', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const commands: Command[] = [
      { op: 'raw', opcode: OP_PLAY_SOUND, operands: [11, 0, 0] }, // ip0:本次内容
      { op: 'end', reset: true, resetTo: 4 }, // ip1:0x02 收尾 → 重臂 L_4
      { op: 'raw', opcode: OP_PLAY_SOUND, operands: [99, 0, 0] }, // ip2:end 与目标之间(必须永不跑)
      { op: 'end' }, // ip3 占位
      { op: 'raw', opcode: OP_PLAY_SOUND, operands: [44, 0, 0], label: 'L_4' }, // ip4:重臂点
      { op: 'end' }, // ip5:目标段 0x00 plain
    ]
    try {
      setGlobalEvents([]) // 本组用自带 commands/labelMap,不依赖全局数组
      loadTrigger(gs, commands, 3, 0)
      tickEventSystem(gs, snap(), createCommandBus())
      // 0x02 收尾 → 脚本结束回 explore;resume 重臂到 resetTo=4(不是 advance 的 ip+1=2、
      // 也不是 plain 的原地 1 —— 单值 4 同时排除三臂中另外两臂)
      expect(gs.mode).toBe('explore')
      expect(gs.npcs[0]?.triggerResume?.ip).toBe(4)
      // 负控:重臂后本次脚本已停,end 与目标之间的 ip2(音效 99)没跑
      expect(soundsOf(gs)).toEqual([11])

      // 下次触发:从 triggerResume(ip4)起跑 → 目标段执行;0x00 plain 不动 resume(旧测 :2786 已证,此处复核衔接)
      loadTrigger(gs, commands, 3, 4)
      tickEventSystem(gs, snap(), createCommandBus())
      expect(soundsOf(gs)).toEqual([11, 44]) // 目标段执行;ip0(11)不重播
      expect(gs.npcs[0]?.triggerResume?.ip).toBe(4) // plain 收尾不动 resume
    } finally {
      setGlobalEvents([])
    }
  })
})

describe('K01 trigger 0x02 end 带 idleFrames:计数挂 owner 跨运行累计,满次 fall-through 继续本次运行(sdlpal script.c:3219-3237)', () => {
  it('第 1 次触发重臂 L_5(count 1<2);第 2 次触发计数满同帧 fall-through 跑后续 op、resume 不动、计数清零', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const commands: Command[] = [
      { op: 'raw', opcode: OP_PLAY_SOUND, operands: [11, 0, 0] }, // ip0
      { op: 'end', reset: true, resetTo: 5, idleFrames: 2 }, // ip1:0x02 + 计数门
      { op: 'raw', opcode: OP_PLAY_SOUND, operands: [22, 0, 0] }, // ip2:fall-through 当帧续跑
      { op: 'end' }, // ip3:本次运行到此 plain 收尾
      { op: 'end' }, // ip4 占位
      { op: 'raw', opcode: OP_PLAY_SOUND, operands: [33, 0, 0], label: 'L_5' }, // ip5:重臂点
      { op: 'end' }, // ip6
    ]
    const bus = createCommandBus()
    try {
      setGlobalEvents([]) // 本组用自带 commands/labelMap,不依赖全局数组
      // —— 触发 #1:count 1 < 2 → 以 resetTo 重臂收尾 ——
      loadTrigger(gs, commands, 4, 0)
      tickEventSystem(gs, snap(), bus)
      expect(soundsOf(gs)).toEqual([11])
      expect(gs.npcs[0]?.triggerResume?.ip).toBe(5)
      expect(gs.npcs[0]?.triggerEndIdleCount).toBe(1) // 计数挂 owner

      // —— 触发 #2(从头重触发):count 2 ≥ 2 → 清零 + 同帧 fall-through 跑 ip2,再 plain 收尾 ——
      loadTrigger(gs, commands, 4, 0)
      const owner2 = gs.npcs[0]
      expect(owner2).toBeDefined()
      if (owner2) owner2.triggerResume = { ip: 5 } // 延续 #1 的重臂点,证 fall-through 不覆盖它
      tickEventSystem(gs, snap(), bus)
      // 帧序:ip0(11)→ ip1 计数满 fall-through → ip2(22)当帧续跑 → ip3 plain 收尾
      expect(soundsOf(gs)).toEqual([11, 11, 22])
      expect(gs.npcs[0]?.triggerEndIdleCount).toBe(0) // 满次清零(下次重新计)
      expect(gs.npcs[0]?.triggerResume?.ip).toBe(5) // fall-through 路径不覆盖 resume(仍指重臂点)
      expect(gs.mode).toBe('explore')
    } finally {
      setGlobalEvents([])
    }
  })
})
