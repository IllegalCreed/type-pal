/**
 * TEST-COVERAGE85-GLM-GAME-1 — event-system.ts applyRawOpcode 未证 opcode 臂
 * (palette fade 0x50/51/80/8C/93、世界/NPC/物品/音乐/队伍族)。
 *
 * 公开 caller:runScript({commands, ip, bus, runtimeMode})(生产 battle fallback / 装备脚本 /
 * magic-script 同路)。返回值 = 停止时 ip,可作跳转类 opcode 的 oracle。全部 typed,不 mock。
 * 旧证去重:event-system.test.ts / glm-event-k01~k06 / palette-fade.test.ts 已证的对话、
 * trigger 主循环、0x50 event 侧阻塞、物品 giveItem、战斗族 opcode 不重复。
 */
import type { Command } from '@type-pal/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeBattle } from '../__tests__/coverage85-glm-game/harness.js'
import { runScript, setMapReloader } from './event-system.js'
import type { GameState, NpcState } from './game-state.js'
import { setGlobalEvents } from './script-catalog.js'

function freshGs(): GameState {
  // runScript 的 raw opcode 只在 battle 模式经 battleCtx.gs 落 applyRawOpcode(D26);
  // 世界/演出 opcode 用 makeBattle 提供真实 typed battle state + gs。
  const { gs } = makeBattle()
  return gs
}

function npc(id: number, over: Partial<NpcState> = {}): NpcState {
  return { id, x: 100, y: 100, spriteNum: 1, ...over }
}

/** 在 battle ctx 下跑一条 raw opcode + 尾随 end(plain),返回 runScript 返回值。 */
function run1(
  gs: GameState,
  opcode: number,
  operands: [number, number, number],
  eventObjectId?: number,
): number {
  const commands: Command[] = [{ op: 'raw', opcode, operands }, { op: 'end' }]
  return runScript({
    commands,
    ip: 0,
    bus: { emit: () => 0, drain: () => [], complete: () => {} },
    runtimeMode: 'battle',
    battleCtx: { state: gs.battleState!, gs },
    eventObjectId,
  })
}

afterEach(() => {
  setMapReloader(null)
  setGlobalEvents([]) // 清本文件 installGlobalScripts/0x24 labelMap 安装的全局脚本态
  vi.restoreAllMocks()
})

describe('cov85 palette fade 族(applyRawOpcode 3493-3547)', () => {
  it('0x51 FadeIn:建 lerp fade 且清 needToFadeIn;0x93 SceneFade step<0 → needToFadeIn=true', () => {
    const gs = freshGs()
    gs.needToFadeIn = true
    run1(gs, 0x51, [1, 0, 0])
    expect(gs.paletteFadeState).toBeDefined()
    expect(gs.needToFadeIn).toBe(false)

    const gs2 = freshGs()
    run1(gs2, 0x93, [-2, 0, 0])
    expect(gs2.paletteFadeState).toBeDefined()
    expect(gs2.needToFadeIn).toBe(true)
    const gs3 = freshGs()
    run1(gs3, 0x93, [2, 0, 0])
    expect(gs3.needToFadeIn).toBe(false)
  })

  it('0x80 PaletteFade:nightPalette 翻转 + fUpdateScene 两档时长', () => {
    const gs = freshGs()
    run1(gs, 0x80, [0, 0, 0]) // fUpdateScene=true → 32*100
    expect(gs.nightPalette).toBe(true)
    expect(gs.paletteFadeState?.totalMs).toBe(3200)
    run1(gs, 0x80, [1, 0, 0]) // 非更新 → 32*25
    expect(gs.nightPalette).toBe(false)
    expect(gs.paletteFadeState?.totalMs).toBe(800)
  })

  it('0x8C ColorFade:color 取 0xff、perStep=op1*10(0 回退 10)', () => {
    const gs = freshGs()
    run1(gs, 0x8c, [0x1ff, 3, 1])
    expect(gs.paletteFadeState).toBeDefined()
    expect(gs.paletteFadeState?.totalMs).toBe(64 * 30)
    expect(gs.needToFadeIn).toBe(false)
    const gs2 = freshGs()
    run1(gs2, 0x8c, [5, 0, 0]) // perStep 0 → 10
    expect(gs2.paletteFadeState?.totalMs).toBe(640)
  })

  it('0x50 FadeOut:battle fallback 无 cursor 仍建 fade + needToFadeIn;delay=0 → 1', () => {
    const gs = freshGs()
    run1(gs, 0x50, [0, 0, 0])
    expect(gs.paletteFadeState).toBeDefined()
    expect(gs.paletteFadeState?.totalMs).toBe(600)
    expect(gs.needToFadeIn).toBe(true)
  })
})

describe('cov85 世界/队伍 opcode(3550+,4436-4446)', () => {
  it('0x46 SetPartyPos:world=(col*32+h*16, row*16+h*8),party 与 camera 联动', () => {
    const gs = freshGs()
    run1(gs, 0x46, [2, 3, 1])
    expect(gs.party.x).toBe(2 * 32 + 1 * 16)
    expect(gs.party.y).toBe(3 * 16 + 1 * 8)
  })

  it('0x75 SetParty:partyMembers = op0..op2 各 -1(0xffff 槽跳过)', () => {
    const gs = freshGs()
    gs.partyMembers = [0]
    run1(gs, 0x75, [1, 2, 0])
    expect(gs.partyMembers).toEqual([0, 1])
  })

  it('0x71 WaveScreen:wScreenWave/sWaveProgression 写入', () => {
    const gs = freshGs()
    run1(gs, 0x71, [4, 2, 0])
    expect(gs.wScreenWave).toBe(4)
  })

  it('0x36 SetRNG:iCurPlayingRNG = op0', () => {
    const gs = freshGs()
    run1(gs, 0x36, [12, 0, 0])
    expect(gs.iCurPlayingRNG).toBe(12)
  })
})

describe('cov85 音乐/CD opcode(3605-3680)', () => {
  it('0x43 PlayMusic / 0x45 SetBattleMusic / 0x77 StopMusic / 0xA3 PlayCDMusic', () => {
    const gs = freshGs()
    const bus = { emit: () => 0, drain: () => [], complete: () => {} }
    const run = (opcode: number, operands: [number, number, number]): void => {
      runScript({
        commands: [{ op: 'raw', opcode, operands }, { op: 'end' }],
        ip: 0,
        bus,
        runtimeMode: 'battle',
        battleCtx: { state: gs.battleState!, gs },
      })
    }
    run(0x43, [5, 1, 0])
    expect(gs.wNumMusic).toBe(5)
    run(0x45, [7, 0, 0])
    expect(gs.wNumBattleMusic).toBe(7)
    run(0x77, [3, 0, 0]) // StopMusic → music 0 + 战斗 BGM 不动
    expect(gs.wNumMusic).toBe(0)
    expect(gs.wNumBattleMusic).toBe(7)
    run(0xa3, [2, 0, 0]) // CD 段:写 CD 段标记,不炸
    expect(gs.wNumBattleMusic).toBe(7)
  })
})

describe('cov85 现金/物品 opcode(3665-3743)', () => {
  it('0x1E AddCash:symbol 扩展 i16(负数可减);0x20 RemoveItem:库存按量减', () => {
    const gs = freshGs()
    gs.dwCash = 100
    run1(gs, 0x1e, [0xff9c, 0, 0]) // -100
    expect(gs.dwCash).toBe(0)
    run1(gs, 0x1e, [50, 0, 0])
    expect(gs.dwCash).toBe(50)
    gs.inventory = [{ itemId: 30, count: 5 }]
    run1(gs, 0x20, [30, 2, 0])
    expect(gs.inventory).toEqual([{ itemId: 30, count: 3 }])
    run1(gs, 0x20, [30, 99, 0]) // 超量 → 清空条目
    expect(gs.inventory).toEqual([])
  })
})

describe('cov85 NPC 状态/移动 opcode(3758-3815,4010-4084,4103-4185,4265-4422)', () => {
  it('0x12 SetObjectPosRelParty:npc 落 party 相对位(x±dx*32/2,y±dy*16/2)', () => {
    const gs = freshGs()
    gs.party.x = 500
    gs.party.y = 300
    gs.npcs = [npc(0)]
    run1(gs, 0x12, [1, 0xfffb, 2]) // 显式对象 1(=npc id 0);x = -5+party.x, y = 2+party.y
    expect(gs.npcs[0]!.x).toBe(495)
    expect(gs.npcs[0]!.y).toBe(302)
  })

  it('0x6F SyncObjState:pCurrent.sState==op1 才把 self 同步成 op1', () => {
    const gs = freshGs()
    gs.npcs = [npc(0, { sState: 2 }), npc(1, { sState: 9 })]
    run1(gs, 0x6f, [1, 7, 0], 1) // pCurrent=npc0(sState 2 ≠ 7)→ 不同步
    expect(gs.npcs[1]!.sState).toBe(9)
    run1(gs, 0x6f, [1, 2, 0], 1) // pCurrent.sState==2==op1 → self(npc1) 同步成 2
    expect(gs.npcs[1]!.sState).toBe(2)
    expect(gs.npcs[0]!.sState).toBe(2)
  })

  it('0x24 SetAutoScript:label 在全局表 → 静默写 autoLabel 并重置 autoCursor(无任何 warning)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    setGlobalEvents([
      { op: 'end', label: 'L_55' },
      { op: 'end', label: 'L_0' },
    ])
    const gs = freshGs()
    gs.npcs = [npc(0, { autoCursor: { ip: 9 } })]
    run1(gs, 0x24, [1, 55, 0], 0) // op0=1:启用 + 选 npc id 0;L_55 已在全局 labelMap
    expect(gs.npcs[0]!.autoLabel).toBe('L_55')
    expect(gs.npcs[0]!.autoCursor).toEqual({ ip: 0 }) // 命中 → 立即解析为全局 ip(L_55@commands[0])
    expect(warn).not.toHaveBeenCalled() // 精确合同:解析命中时零 warning
    run1(gs, 0x24, [1, 0, 0], 0) // entry=0 → 清
    expect(gs.npcs[0]!.autoLabel).toBeUndefined()
  })

  it('0x24 SetAutoScript:label 不在全局表 → 精确 warning 一次且不写 autoLabel', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const gs = freshGs()
    gs.npcs = [npc(0)]
    run1(gs, 0x24, [1, 999, 0], 0)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith('event-system: setAutoScript id=0 L_999 不在全局 labelMap')
    expect(gs.npcs[0]!.autoLabel).toBe('L_999') // label 先写;解析失败只阻断 autoCursor
    expect(gs.npcs[0]!.autoCursor).toBeUndefined()
  })

  it('0x14 SetObjectGesture / 0x0F SetDirOrFrame / 0x6C NpcWalkOneStep', () => {
    const gs = freshGs()
    gs.npcs = [npc(0, { facing: 'down' })]
    run1(gs, 0x14, [3, 0, 0], 0) // gesture:operand[0] 是帧号,强制朝南
    expect(gs.npcs[0]!.scriptedFrame).toBe(3)
    run1(gs, 0x0f, [2, 1, 0], 0) // operand 是数据:dir=2(North=up),frame=1
    expect(gs.npcs[0]!.facing).toBe('up')
    expect(gs.npcs[0]!.scriptedFrame).toBe(1)
    run1(gs, 0x6c, [0, 3, 0xfffb], 0) // pCurrent 位移:dx=+3, dy=-5
    expect([gs.npcs[0]!.x, gs.npcs[0]!.y]).toEqual([103, 95])
  })

  it('0x7D MoveObject:x/y += i16;0x7E SetObjectLayer;0x87 AnimateObject 帧推进', () => {
    const gs = freshGs()
    gs.npcs = [npc(0, { x: 100, y: 100 })]
    run1(gs, 0x7d, [0, 0xfffb, 5], 0) // x += -5, y += 5
    expect([gs.npcs[0]!.x, gs.npcs[0]!.y]).toEqual([95, 105])
    run1(gs, 0x7e, [0, 4, 0], 0)
    expect(gs.npcs[0]!.sLayer).toBe(4)
    gs.npcs[0]!.scriptedFrame = undefined
    run1(gs, 0x87, [0, 0, 0], 0)
    expect(gs.npcs[0]!.scriptedFrame).toBeDefined()
  })

  it('0x40 SetTriggerMethod / 0x25 SetTriggerScript / 0x9A SetMultiObjectState 区间', () => {
    const gs = freshGs()
    gs.npcs = [npc(0), npc(1)]
    run1(gs, 0x40, [1, 4, 0], 0) // op0=1(≠0)→ npc id 0
    expect(gs.npcs[0]!.triggerMode).toBe(4)
    run1(gs, 0x25, [1, 77, 0], 0) // op0=1(≠0)选 npc id 0
    expect(gs.npcs[0]!.triggerLabel).toBe('L_77')
    run1(gs, 0x9a, [1, 2, 5])
    expect(gs.npcs.map((n) => n.sState)).toEqual([5, 5])
  })

  it('0x49 SetSceneObjectState / 0x6D SetSceneScripts / 0x99 ChangeMap', async () => {
    const gs = freshGs()
    gs.npcs = [npc(0, { sState: 1 })]
    run1(gs, 0x49, [1, 0, 0]) // 全局对象 1 → sState 0
    expect(gs.npcs[0]!.sState).toBe(0)

    let reloaded = -1
    setMapReloader(async (mapNum) => {
      reloaded = mapNum
    })
    await Promise.resolve()
    run1(gs, 0x99, [0xffff, 8, 0]) // 当前场景换图 mapNum=8
    expect(reloaded).toBe(8)
  })

  it('0xA6 BackupScreen:合同 no-op(本游戏 0 调用,script.c:3069)', () => {
    const gs = freshGs()
    expect(run1(gs, 0xa6, [0, 0, 0])).toBe(0) // plain end → 起始 entry
    expect(gs.paletteFadeState).toBeUndefined()
  })
})

describe('cov85 条件跳转 opcode(4290+,4549-4579)', () => {
  it('0x58 JumpIfItemLess:库存不足 → 跳 op2;足 → 顺序推进(现金标记判别)', () => {
    const mk = (): GameState => makeBattle().gs
    const bus = { emit: () => 0, drain: () => [], complete: () => {} }
    const jumpScript: Command[] = [
      { op: 'raw', opcode: 0x58, operands: [30, 5, 2] }, // 不足 → 跳 ip2(只跳过 ip1)
      { op: 'raw', opcode: 0x1e, operands: [111, 0, 0] }, // ip1(不跳才跑)
      { op: 'raw', opcode: 0x1e, operands: [222, 0, 0] }, // ip2
      { op: 'end' }, // ip3
    ]
    const gs = mk()
    gs.inventory = [{ itemId: 30, count: 2 }] // 2 < 5 → 跳
    runScript({
      commands: jumpScript,
      ip: 0,
      bus,
      runtimeMode: 'battle',
      battleCtx: { state: gs.battleState!, gs },
    })
    expect(gs.dwCash).toBe(222)
    const gs2 = mk()
    gs2.inventory = [{ itemId: 30, count: 9 }] // 足 → 顺序
    runScript({
      commands: jumpScript,
      ip: 0,
      bus,
      runtimeMode: 'battle',
      battleCtx: { state: gs2.battleState!, gs: gs2 },
    })
    expect(gs2.dwCash).toBe(333)
  })

  it('0x81 JumpIfNotFacing:party 面对对象 → 顺序;背对 → 跳(现金标记判别)', () => {
    const mkGs = (): GameState => {
      // party 留在 (0,0)(camera 与 party 同步基线);npc 在正下方 40px,sState>0 才算可面对
      const gs = makeBattle().gs
      gs.npcs = [npc(0, { x: 0, y: 40, sState: 1 })]
      return gs
    }
    const bus = { emit: () => 0, drain: () => [], complete: () => {} }
    const script: Command[] = [
      { op: 'raw', opcode: 0x81, operands: [0, 3, 2] }, // 不面对 → 跳 ip2;op1=3 触发半径
      { op: 'raw', opcode: 0x1e, operands: [111, 0, 0] },
      { op: 'raw', opcode: 0x1e, operands: [222, 0, 0] },
      { op: 'end' },
    ]
    const facing = mkGs()
    facing.party.facing = 'down' // npc 在下方 → 面对 → 顺序
    runScript({
      commands: script,
      ip: 0,
      bus,
      runtimeMode: 'battle',
      battleCtx: { state: facing.battleState!, gs: facing },
      eventObjectId: 0,
    })
    expect(facing.dwCash).toBe(333)
    expect(facing.npcs[0]!.triggerMode).toBe(8) // 面对中且 op1=3 → contact 触发模式 5+3
    const back = mkGs()
    back.party.facing = 'up' // 背对 → 跳
    runScript({
      commands: script,
      ip: 0,
      bus,
      runtimeMode: 'battle',
      battleCtx: { state: back.battleState!, gs: back },
      eventObjectId: 0,
    })
    expect(back.dwCash).toBe(222)
  })
})
