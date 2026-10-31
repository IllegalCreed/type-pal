/**
 * 当前场景换图通知的事件生命周期：成功、无 loader、拒绝时均继续后续脚本。
 * SDLPal PAL_InterpretInstruction 0x0099 是同步 IO；浏览器拒绝的日志与资源归属遵循本项目合同。
 * event-opcodes.cov85.test.ts 已核简单通知；这里额外核当帧声音、无 loader 和拒绝后的状态边界。
 * loader/日志观察器在 finally 释放；这里只核事件层，不授 Shell 下载或画面替换信用。
 */
import type { Command, InputSnapshot } from '@type-pal/shared'
import { describe, expect, it, vi } from 'vitest'
import {
  buildLabelMap,
  OP_CHANGE_MAP,
  OP_NOOP_A7,
  OP_PLAY_SOUND,
  setMapReloader,
  tickEventSystem,
} from './event-system.js'
import { createInitialGameState } from './game-state.js'

function idleInput(): InputSnapshot {
  return { held: new Set(), pressed: new Set(), frameNum: 0 }
}

describe('opcode 0x99 — current-scene map replacement', () => {
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
      tickEventSystem(gs, idleInput())
      // 当前场景(1-based wNumScene=5)地图被改写为 99
      expect(gs.sceneMapNumOverride?.[5]).toBe(99)
      // 负控:其它 scene 未被误改(单键覆盖)
      expect(Object.keys(gs.sceneMapNumOverride ?? {})).toEqual(['5'])
      // 通知 mapReloader 一次并传入新编号；TS 异步请求不阻塞脚本，不据此声称 C 同步 IO 时序等价。
      expect(reloadedMaps).toEqual([99])
      // 脚本继续合同:换图当帧后续 opcode 照常执行、脚本正常收尾
      expect(gs.pendingSounds ?? []).toEqual([77])
      expect(gs.mode).toBe('explore')

      // 无 loader 的独立场景：setMapReloader(null) 后再跑同脚本
      // → 仍改写 override、不触发 reload(reloadedMaps 保持 [99])、不崩
      setMapReloader(null)
      const gsNoReloader = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gsNoReloader.wNumScene = 2
      gsNoReloader.eventCursor = { commands, labelMap: buildLabelMap(commands), ip: 0 }
      gsNoReloader.mode = 'event'
      tickEventSystem(gsNoReloader, idleInput())
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
      tickEventSystem(gs, idleInput())
      await Promise.resolve()
      expect(error).toHaveBeenCalledExactlyOnceWith(
        'event-system: mapReloader(99) failed:',
        failure,
      )
      expect(gs.pendingSounds ?? []).toEqual([77])
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
