/**
 * TEST-GLM-PHASE1-LEAVES-3 L08（dev/state-dump.ts）— 去重表：无既有测试（targets.json
 * existingTestPointers 为空，全仓 grep 无其它 dumpFrameJson/initStateDump 测试）。
 *  - 新合同：dumpFrameJson 全字段（frame/scene/viewport/party dir 映射/wFrame 三来源/role/sprite
 *    回退链/members/npcs 缺省回退）+ initStateDump ?tp_dump=1 启用与关闭、push 帧号递增。
 * 边界：不启用真实页面逐帧 dump、不碰 Codex E2E 稀疏日志；只在 jsdom 隔离 window 上验证，
 * 结束恢复 location 与全局（finally）。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { createInitialGameState } from '../core/game-state.js'
import { dumpFrameJson, initStateDump } from './state-dump.js'

function gsForDump() {
  const gs = createInitialGameState({ x: 300, y: 400, facing: 'left' })
  gs.wNumScene = 4
  gs.camera.x = 140
  gs.camera.y = 288
  gs.partyMembers = [0, 1]
  gs.PlayerRolesRuntime.rgwSpriteNum[0] = 2
  gs.PlayerRolesRuntime.rgwSpriteNum[1] = 5
  gs.npcs = [
    {
      id: 3,
      x: 100,
      y: 50,
      spriteNum: 9,
      facing: 'up',
      scriptedFrame: 3,
      sState: 2,
      sLayer: 1,
      triggerMode: 4,
    },
    { id: 8, x: 200, y: 60, spriteNum: 11 }, // 最小 npc：dir 0 / frame 0 / sState 1 / layer 0 / trigMode 0
  ]
  return gs
}

describe('L08 dumpFrameJson 字段合同', () => {
  it('全字段：scene/viewport/dir 映射(w=1)/idle wFrame=dir*walkFrames/role/sprite/members/npcs', () => {
    const gs = gsForDump()
    const obj = JSON.parse(dumpFrameJson(gs, 42, 4)) as Record<string, any>
    expect(obj).toEqual({
      frame: 42,
      scene: 4,
      viewport: [140, 288],
      party: {
        x: 300,
        y: 400,
        dir: 1, // left
        wFrame: 1 * 4, // 非行走无脚本帧 → dir*walkFrames
        role: 0,
        sprite: 2,
        members: [
          { role: 0, sprite: 2 },
          { role: 1, sprite: 5 },
        ],
      },
      npcs: [
        { id: 3, x: 100, y: 50, dir: 2, frame: 3, sState: 2, sprite: 9, layer: 1, trigMode: 4 },
        { id: 8, x: 200, y: 60, dir: 0, frame: 0, sState: 1, sprite: 11, layer: 0, trigMode: 0 },
      ],
    })
  })

  it('wFrame 三来源：脚本帧 > 行走(3帧表 [0,1,0,2] / 4帧直通) > 站立', () => {
    const gs = gsForDump()
    gs.party.facing = 'up' // dir 2
    gs.partyScriptedFrame[0] = 7
    expect(JSON.parse(dumpFrameJson(gs, 0, 4)).party.wFrame).toBe(7)
    delete gs.partyScriptedFrame[0]
    gs.walkingFrame = { walking: true, stepFrame: 2 }
    expect(JSON.parse(dumpFrameJson(gs, 0, 3)).party.wFrame).toBe(2 * 3 + 0) // [0,1,0,2][2]=0
    gs.walkingFrame = { walking: true, stepFrame: 3 }
    expect(JSON.parse(dumpFrameJson(gs, 0, 4)).party.wFrame).toBe(2 * 4 + 3) // 4 帧直通
    gs.walkingFrame = { walking: false, stepFrame: 0 }
    expect(JSON.parse(dumpFrameJson(gs, 0, 4)).party.wFrame).toBe(2 * 4)
  })

  it('sprite 回退链：rgwSpriteNum 命中优先；稀疏（legacy 短数组）才落 partyLeaderSpriteId；空队伍 role 0', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = []
    gs.PlayerRolesRuntime.rgwSpriteNum[0] = 3
    expect(JSON.parse(dumpFrameJson(gs, 0, 4)).party.sprite).toBe(3)
    // legacy 短数组：rgwSpriteNum[0] undefined → 回退 partyLeaderSpriteId（再缺 → 0）
    gs.PlayerRolesRuntime.rgwSpriteNum = []
    gs.partyLeaderSpriteId = 7
    expect(JSON.parse(dumpFrameJson(gs, 0, 4)).party.sprite).toBe(7)
    gs.partyLeaderSpriteId = undefined
    expect(JSON.parse(dumpFrameJson(gs, 0, 4)).party.sprite).toBe(0)
    expect(JSON.parse(dumpFrameJson(gs, 0, 4)).party.role).toBe(0)
    expect(JSON.parse(dumpFrameJson(gs, 0, 4)).party.members).toEqual([])
  })
})

describe('L08 initStateDump 控制器', () => {
  const originalSearch = typeof window !== 'undefined' ? window.location.search : ''
  afterEach(() => {
    if (typeof window === 'undefined') return
    window.history.replaceState(null, '', originalSearch || '/')
    delete (window as { __tpDumpBuffer?: unknown }).__tpDumpBuffer
    delete (window as { __tpDumpDownload?: unknown }).__tpDumpDownload
  })

  it('无 ?tp_dump=1：enabled false，push no-op 且不暴露全局', () => {
    window.history.replaceState(null, '', '/?tp_dump=0')
    const ctl = initStateDump()
    expect(ctl.enabled).toBe(false)
    ctl.push(gsForDump(), 4)
    expect(window.location.search).toBe('?tp_dump=0')
    expect((window as { __tpDumpBuffer?: unknown }).__tpDumpBuffer).toBeUndefined()
  })

  it('?tp_dump=1：push 进 __tpDumpBuffer 且帧号从 0 递增；download 句柄暴露（不点击）', () => {
    window.history.replaceState(null, '', '/?tp_dump=1')
    const ctl = initStateDump()
    expect(ctl.enabled).toBe(true)
    ctl.push(gsForDump(), 4)
    ctl.push(gsForDump(), 4)
    const buffer = (window as { __tpDumpBuffer?: string[] }).__tpDumpBuffer
    expect(buffer).toHaveLength(2)
    expect(JSON.parse(buffer![0]!).frame).toBe(0)
    expect(JSON.parse(buffer![1]!).frame).toBe(1)
    expect(typeof (window as { __tpDumpDownload?: unknown }).__tpDumpDownload).toBe('function')
  })
})
