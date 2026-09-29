/**
 * TEST-GLM-EVENT-WAVE-K-1 · K04 场景对象、地图与相机边界
 *
 * 审计行(组 K04):
 * - 现行 caller:event-system.ts:4111(OP_SET_OBJECT_LAYER)、:4528(OP_CHANGE_MAP);
 *   入口 = tickEventSystem/trigger/autoScript 共用 applyRawOpcode(mode.ts:63 每帧驱动)。
 * - 旧测证据(排重):
 *   - 0x7E setObjectLayer:event-system.test.ts:1998 `sLayer = SHORT(op1)`(正数路径)→
 *     **SHORT 负值 wrap(op1 ≥ 0x8000)零断言**;
 *   - 0x99 changeMap::4671 `op0!=0xFFFF → sceneMapNumOverride[op0]=op1` →
 *     **op0==0xFFFF 当前场景换图 + mapReloader 触发零断言**(setMapReloader 全仓测试零注入)。
 * - 一手真值:reference/sdlpal/global.h:78(`SHORT sLayer` —— 有符号层值,立交/上下层用负层);
 *   script.c:2740-2753(case 0x0099:op0==0xFFFF → `rgScene[wNumScene-1].wMapNum = op1` +
 *   `PAL_SetLoadFlags(kLoadScene); PAL_LoadResources()`(立即只换图 reload,脚本继续);
 *   否则改指定 scene 的 wMapNum,下次 load 生效)。
 * - 缺口结论:0x7E 负层 SHORT 语义、0x99 当前场景换图合同可达且无旧证 → 新增;
 *   0x7E 正数、0x99 指定 scene、0x46/0x7F/0xA1 相机与走位合同已证不重做。
 */
import type { AbstractKey, Command, InputSnapshot } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { createCommandBus } from './command-bus.js'
import {
  buildLabelMap,
  OP_CHANGE_MAP,
  OP_NOOP_A7,
  OP_PLAY_SOUND,
  OP_SET_OBJECT_LAYER,
  setMapReloader,
  tickEventSystem,
} from './event-system.js'
import { createInitialGameState, type GameState } from './game-state.js'

function snap(pressed: AbstractKey[] = []): InputSnapshot {
  return { held: new Set(), pressed: new Set(pressed), frameNum: 0 }
}

function soundsOf(gs: GameState): number[] {
  return gs.pendingSounds ?? []
}

describe('K04 opcode 0x7E setObjectLayer:sLayer 是 SHORT(global.h:78)——op1 按 16 位有符号写', () => {
  it('op1=0xFFFE → sLayer=-2(SHORT wrap,立交/负层合同);单轴对照 op1=3 → 3(正数直通)', () => {
    // —— 负值 wrap:op1=0xFFFE(WORD 视角 65534)→ SHORT -2 ——
    const gsNeg = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const negCmds: Command[] = [
      { op: 'raw', opcode: OP_SET_OBJECT_LAYER, operands: [0xffff, 0xfffe, 0] }, // self
      { op: 'end' },
    ]
    gsNeg.npcs = [{ id: 7, x: 0, y: 0, spriteNum: 1, sState: 2 }]
    gsNeg.eventCursor = {
      commands: negCmds,
      labelMap: buildLabelMap(negCmds),
      ip: 0,
      currentEventObjectId: 7,
    }
    gsNeg.mode = 'event'
    tickEventSystem(gsNeg, snap(), createCommandBus())
    expect(gsNeg.npcs[0]?.sLayer).toBe(-2)

    // —— 单轴对照:同脚本仅 op1 改 3 → 正数直通(排除"恒取负"式误实现) ——
    const gsPos = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const posCmds: Command[] = [
      { op: 'raw', opcode: OP_SET_OBJECT_LAYER, operands: [0xffff, 3, 0] },
      { op: 'end' },
    ]
    gsPos.npcs = [{ id: 7, x: 0, y: 0, spriteNum: 1, sState: 2 }]
    gsPos.eventCursor = {
      commands: posCmds,
      labelMap: buildLabelMap(posCmds),
      ip: 0,
      currentEventObjectId: 7,
    }
    gsPos.mode = 'event'
    tickEventSystem(gsPos, snap(), createCommandBus())
    expect(gsPos.npcs[0]?.sLayer).toBe(3)
  })
})

describe('K04 opcode 0x99 changeMap op0=0xFFFF:当前场景只换地图 + 立即 reload,脚本继续(sdlpal script.c:2743-2748)', () => {
  it('0x99[0xFFFF,99] → sceneMapNumOverride[wNumScene]=99 + mapReloader(99) 一次;当帧后续 op 照跑', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.wNumScene = 5
    const reloadedMaps: number[] = []
    const commands: Command[] = [
      { op: 'raw', opcode: OP_CHANGE_MAP, operands: [0xffff, 99, 0] }, // ip0:当前 scene 换图
      { op: 'raw', opcode: OP_PLAY_SOUND, operands: [77, 0, 0] }, // ip1:脚本继续(reload 异步不阻塞)
      { op: 'raw', opcode: OP_NOOP_A7, operands: [0, 0, 0] }, // ip2
      { op: 'end' }, // ip3
    ]
    try {
      setMapReloader((mapNum) => {
        reloadedMaps.push(mapNum)
        return Promise.resolve()
      })
      gs.eventCursor = { commands, labelMap: buildLabelMap(commands), ip: 0 }
      gs.mode = 'event'
      tickEventSystem(gs, snap(), createCommandBus())
      // 当前场景(1-based wNumScene=5)地图被改写为 99
      expect(gs.sceneMapNumOverride?.[5]).toBe(99)
      // 负控:其它 scene 未被误改(单键覆盖)
      expect(Object.keys(gs.sceneMapNumOverride ?? {})).toEqual(['5'])
      // PAL_LoadResources 等价:mapReloader 恰一次、参数 = 新 mapNum(fire-and-forget 不挂 waiting)
      expect(reloadedMaps).toEqual([99])
      // 脚本继续合同:换图当帧后续 opcode 照常执行、脚本正常收尾
      expect(soundsOf(gs)).toEqual([77])
      expect(gs.mode).toBe('explore')

      // 守卫臂:未注入 mapReloader(非 bootstrap 路径)→ 仍改写 override,只是不触发 reload,不崩
      const gsNoReloader = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gsNoReloader.wNumScene = 2
      gsNoReloader.eventCursor = { commands, labelMap: buildLabelMap(commands), ip: 0 }
      gsNoReloader.mode = 'event'
      tickEventSystem(gsNoReloader, snap(), createCommandBus())
      expect(gsNoReloader.sceneMapNumOverride?.[2]).toBe(99)
      expect(gsNoReloader.mode).toBe('explore')
    } finally {
      setMapReloader(null)
    }
  })
})
