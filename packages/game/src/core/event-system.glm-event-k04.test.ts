/**
 * K04: current-scene map replacement and signed object layers.
 * Production tick/trigger/auto-script paths share applyRawOpcode in event-system.ts.
 * Primary: global.h EVENTOBJECT.sLayer is SHORT; script.c case 0x0099 changes the
 * current map without restarting onEnter. SDLPal's synchronous IO does not define
 * browser failure recovery; retain-on-failure is the user's 2026-10-25 decision.
 * event-system.test.ts covers positive layers/named-scene overrides; cov85 covers
 * successful reload notification. Here the negative layer, same-frame continuation,
 * absent loader, and rejected loader retain their separate observable contracts.
 */
import type { AbstractKey, Command, InputSnapshot } from '@type-pal/shared'
import { describe, expect, it, vi } from 'vitest'
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

      // 守卫臂(单轴:唯一变量 = 撤下注入):setMapReloader(null) 后再跑同脚本
      // → 仍改写 override、不触发 reload(reloadedMaps 保持 [99])、不崩
      setMapReloader(null)
      const gsNoReloader = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gsNoReloader.wNumScene = 2
      gsNoReloader.eventCursor = { commands, labelMap: buildLabelMap(commands), ip: 0 }
      gsNoReloader.mode = 'event'
      tickEventSystem(gsNoReloader, snap(), createCommandBus())
      expect(gsNoReloader.sceneMapNumOverride?.[2]).toBe(99)
      expect(gsNoReloader.mode).toBe('explore')
      expect(reloadedMaps).toEqual([99]) // 撤下注入后未再触发 reload
    } finally {
      setMapReloader(null)
    }
  })
  it('logs a rejected map replacement without interrupting the remaining script or owning its state', async () => {
    const gs = createInitialGameState({ x: 160, y: 112, facing: 'down' })
    gs.wNumScene = 5
    const npcs = gs.npcs
    const failure = new Error('tileset-blob: fetch /extracted/data/tileset/99.rle failed (500)')
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const commands: Command[] = [
      { op: 'raw', opcode: OP_CHANGE_MAP, operands: [0xffff, 99, 0] },
      { op: 'raw', opcode: OP_PLAY_SOUND, operands: [77, 0, 0] },
      { op: 'end' },
    ]
    try {
      setMapReloader(async () => {
        throw failure
      })
      gs.eventCursor = { commands, labelMap: buildLabelMap(commands), ip: 0 }
      gs.mode = 'event'
      tickEventSystem(gs, snap(), createCommandBus())
      await Promise.resolve()
      expect(error).toHaveBeenCalledExactlyOnceWith(
        'event-system: mapReloader(99) failed:',
        failure,
      )
      expect(soundsOf(gs)).toEqual([77])
      expect(gs.mode).toBe('explore')
      expect(gs.sceneLoading).toBeUndefined()
      expect(gs.npcs).toBe(npcs)
      expect(gs.party).toEqual({ x: 160, y: 112, facing: 'down' })
    } finally {
      setMapReloader(null)
      error.mockRestore()
    }
  })
})
