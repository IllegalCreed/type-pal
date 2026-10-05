// TEST-GLM-GAME-SHELL-BOOTSTRAP-1 — shell bootstrap / 资源边界残余公开合同。
//
// 排重(去重表见 docs/ops/evidence/TEST-GLM-GAME-SHELL-BOOTSTRAP-1/dedup-ledger.md):
//  - bootstrap-audio.test.ts 只证 syncShellAudio 的 explore+suspendRaf 窗口(wNumMusic/pendingSounds/
//    默认开关);bootstrap.glm-next-wave.test.ts 证 showError;bootstrap-load.test.ts 证 palette helpers。
//    本文件补战斗侧装配臂:胜利结算曲覆盖(bootstrap.ts:191-198)、揭场 introFade 静默与战斗曲
//    循环(bootstrap.ts:192-199)、战斗帧 bus SFX drain(bootstrap.ts:202-213)。pickMusicTrack/
//    battleVictoryTrack/sfxForBattleEvent 的纯函数轴已由 audio.test.ts 证,不重复。
//  - precache-client.test.ts / .glm-phase1-leaves.test.ts 证注册参数/无 SW 降级/ready 屏障/start
//    缓冲与 pause/resume 协议,但从未驱动 addEventListener('message') 注册的监听器——SW 进度消息
//    → 回调的路由(precache-client.ts:67-72)与 storage.persist 失败容忍(:74-79)在此补证。
//  - main-loop-gates.grok-r1.test.ts G09-B13 只证 cancel 取消刚排上的帧 id(rAF 桩不回调);
//    main-loop.test.ts 证 advanceRafFrame 三不变量。本文件补 startRafLoop 真实帧链
//    (main-loop.ts:173-180):每帧回调驱动推进并自续订、cancel 停链。
// 硬件端口替身:AudioManager spy(bootstrap-audio.test.ts 同模式)、fake ServiceWorkerContainer +
// navigator.storage(precache-client 旧测同模式)、rAF 队列桩(直接赋值同签名函数,无强转)。

import type { PlayerRoles, Tilemap } from '@type-pal/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BattleEnemy, BattleState } from '../core/battle/battle-state.js'
import { createCommandBus } from '../core/command-bus.js'
import { createInitialGameState, type GameState } from '../core/game-state.js'
import { createSeedableRng } from '../core/rng.js'
import type { AudioManager } from './audio.js'
import { syncShellAudio } from './bootstrap.js'
import { ReplayInputSource } from './input.js'
import { type LoopContext, startRafLoop } from './main-loop.js'

// ── AudioManager 记录替身(bootstrap-audio.test.ts 同模式;只记公开端口调用序列) ──
function audioSpy(): AudioManager & {
  syncCalls: Array<{ track: number; loop: boolean }>
  playSoundCalls: number[]
} {
  const syncCalls: Array<{ track: number; loop: boolean }> = []
  const playSoundCalls: number[] = []
  return {
    syncCalls,
    playSoundCalls,
    sync(pendingSounds, music) {
      syncCalls.push({ track: music.track, loop: music.loop })
      if (pendingSounds) pendingSounds.length = 0
    },
    playSound(soundId) {
      playSoundCalls.push(soundId)
    },
    resume() {},
    setSfxEnabled() {},
    setMusicEnabled() {},
    setMusicBackend() {},
  }
}

// ── 合法完整 BattleState 夹具(battle-ui-pixels.grok-r1.test.ts mkState 同模式,无强转) ──
function mkEnemy(deathSound: number): BattleEnemy {
  return {
    e: {
      id: 50,
      _name: 'TestEnemy',
      idleFrames: 0,
      magicFrames: 0,
      attackFrames: 0,
      idleAnimSpeed: 0,
      actWaitFrames: 0,
      yPosOffset: 0,
      attackSound: 0,
      actionSound: 0,
      magicSound: 0,
      deathSound,
      callSound: 0,
      health: 50,
      exp: 10,
      cash: 30,
      level: 5,
      magic: 0,
      magicRate: 0,
      attackEquivItem: 0,
      attackEquivItemRate: 0,
      stealItem: 0,
      stealItemCount: 0,
      attackStrength: 0,
      magicStrength: 0,
      defense: 0,
      dexterity: 20,
      fleeRate: 5,
      poisonResistance: 0,
      elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
      physicalResistance: 1,
      dualMove: 0,
      collectValue: 0,
    },
    status: { sleep: 0, paralyzed: 0, confused: 0, haste: 0, slow: 0 },
    prevHp: 50,
    scriptOnTurnStart: 0,
    scriptOnBattleEnd: 0,
    scriptOnReady: 0,
  }
}

function mkBattle(over: {
  phase: BattleState['phase']
  isBoss?: boolean
  expGained?: number
  introFade?: { step: number; total: number }
  enemies?: BattleEnemy[]
}): BattleState {
  return {
    players: [],
    enemies: over.enemies ?? [],
    field: {
      id: 0,
      screenWave: 0,
      magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    },
    isBoss: over.isBoss ?? false,
    phase: over.phase,
    turn: 1,
    actionQueue: [],
    currentActionIndex: 0,
    pendingActions: new Map(),
    uiState: 'selectMove',
    menuState: 'main',
    selectedAction: 0,
    uiCursor: 0,
    miscMenuCursor: 0,
    miscSubMenuCursor: 0,
    expGained: over.expGained ?? 0,
    cashGained: 0,
    rng: createSeedableRng(1),
    phaseStallTicks: 0,
    ...(over.introFade !== undefined ? { introFade: over.introFade } : {}),
  }
}

function battleGs(battle: BattleState): GameState {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.wNumMusic = 16
  gs.wNumBattleMusic = 7
  gs.pendingSounds = []
  gs.battleState = battle
  return gs
}

const emptyRoles: PlayerRoles = { roles: [] }

describe('TEST-GLM-GAME-SHELL-BOOTSTRAP-1 shell bootstrap 边界', () => {
  it('SB1 战斗胜利结算期 BGM 覆盖:track=胜利曲且不循环(battle.c:1030-1032 FALSE)', () => {
    const audio = audioSpy()
    const gs = battleGs(mkBattle({ phase: 'won', expGained: 100 }))
    syncShellAudio(audio, gs, [], emptyRoles)
    // 胜利曲优先于 pickMusicTrack(wNumMusic/wNumBattleMusic 均不参与);loop=false = 原版 FALSE
    expect(audio.syncCalls).toEqual([{ track: 3, loop: false }])
    expect(audio.playSoundCalls).toEqual([])
  })

  it('SB2 揭场 introFade 期静默(DM29),揭场后切战斗曲并循环', () => {
    const audio = audioSpy()
    // 揭场未完:introFade 定义 + 非胜利 → track 0(静默),loop 仍按战斗 true
    const intro = battleGs(mkBattle({ phase: 'selectAction', introFade: { step: 0, total: 18 } }))
    syncShellAudio(audio, intro, [], emptyRoles)
    expect(audio.syncCalls).toEqual([{ track: 0, loop: true }])
    // 揭场完:introFade 清 → 切 wNumBattleMusic=7(非 wNumMusic=16),战斗期 loop=true
    const revealed = battleGs(mkBattle({ phase: 'selectAction' }))
    syncShellAudio(audio, revealed, [], emptyRoles)
    expect(audio.syncCalls).toEqual([
      { track: 0, loop: true },
      { track: 7, loop: true },
    ])
  })

  it('SB3 战斗帧 bus SFX drain:playSound 正 id 与 per-单位声播出,explore 不消费', () => {
    const drained = [
      { cmd: { op: 'playSound', soundId: 12 } },
      { cmd: { op: 'playSound' } }, // 无 soundId → (?? 0) > 0 不成立,跳过
      { cmd: { op: 'playEnemyDeath', enemyIdx: 0 } }, // sfxForBattleEvent → enemies[0].e.deathSound
      { cmd: { op: 'showDamageNum' } }, // sfxForBattleEvent → 0,跳过
    ]
    const inBattle = audioSpy()
    syncShellAudio(
      inBattle,
      battleGs(mkBattle({ phase: 'selectAction', enemies: [mkEnemy(51)] })),
      drained,
      emptyRoles,
    )
    expect(inBattle.playSoundCalls).toEqual([12, 51])

    // explore(无 battleState):同一批 bus 事件不触发任何 playSound(仅战斗帧消费)
    const explore = audioSpy()
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.pendingSounds = []
    syncShellAudio(explore, gs, drained, emptyRoles)
    expect(explore.playSoundCalls).toEqual([])
  })
})

describe('TEST-GLM-GAME-SHELL-BOOTSTRAP-1 precache-client 边界', () => {
  afterEach(() => {
    // 还原 navigator 硬件端口属性(可配置属性置回 undefined,不留跨测试污染)
    Object.defineProperty(navigator, 'serviceWorker', { value: undefined, configurable: true })
    Object.defineProperty(navigator, 'storage', { value: undefined, configurable: true })
    vi.restoreAllMocks()
  })

  it('SB4 SW 进度消息路由:progress→onProgress(原对象)、done/error→onDone、未知类型忽略', async () => {
    vi.resetModules() // 隔离模块级 _activeWorker/_pendingStart(precache-client.test.ts 同模式)
    const mod = await import('./precache-client.js')
    let handler: ((e: MessageEvent) => void) | undefined
    const sw = {
      register: vi.fn(async () => ({})),
      ready: Promise.resolve({ active: { postMessage: vi.fn() } }),
      addEventListener: vi.fn((type: string, cb: (e: MessageEvent) => void) => {
        if (type === 'message') handler = cb
      }),
    }
    Object.defineProperty(navigator, 'serviceWorker', { value: sw, configurable: true })
    const received: unknown[] = []
    let doneCalls = 0
    await mod.registerPrecache({
      isProd: true,
      onProgress: (p) => received.push(p),
      onDone: () => {
        doneCalls += 1
      },
    })

    expect(typeof handler).toBe('function')
    const fire = (data: unknown): void => {
      if (handler) handler(new MessageEvent('message', { data }))
    }
    const progress = {
      type: 'precache-progress',
      done: 50,
      total: 100,
      bytes: 1024,
      totalBytes: 4096,
    }
    fire(progress)
    fire({ type: 'precache-done' })
    fire({ type: 'precache-error' })
    fire({ type: 'precache-started' }) // 未知类型:不路由
    expect(received).toEqual([progress])
    expect(received[0]).toBe(progress) // 同一对象透传,不重包装
    expect(doneCalls).toBe(2) // done 与 error 都收尾(error 时缓存不全,进度框不应挂着)
  })

  it('SB5 storage.persist 失败不降级注册:onReady 与 startPrecache 照常(best-effort)', async () => {
    vi.resetModules()
    const mod = await import('./precache-client.js')
    const posted: Array<{ type: string }> = []
    const sw = {
      register: vi.fn(async () => ({})),
      ready: Promise.resolve({
        active: { postMessage: (m: { type: string }) => posted.push(m) },
      }),
      addEventListener: vi.fn(),
    }
    Object.defineProperty(navigator, 'serviceWorker', { value: sw, configurable: true })
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: { persist: () => Promise.reject(new Error('quota denied')) },
    })
    const onReady = vi.fn()

    // 手动 settle 成字符串,红相位(registerPrecache 因 persist 拒绝逃逸而 reject)落在
    // 第一条业务断言上(纯 AssertionError),不依赖 .resolves 包装错误的分类。
    const outcome: string = await mod
      .registerPrecache({ isProd: true, onProgress: () => {}, onReady })
      .then(
        () => 'resolved',
        (err: unknown) => `rejected:${String(err)}`,
      )
    expect(outcome).toBe('resolved')
    expect(onReady).toHaveBeenCalledOnce()
    mod.startPrecache()
    expect(posted).toEqual([{ type: 'precache' }])
  })
})

describe('TEST-GLM-GAME-SHELL-BOOTSTRAP-1 主循环生命周期', () => {
  it('SB6 startRafLoop 帧链:每帧回调驱动推进并自续订,cancel 停链', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const cells = Array.from({ length: 8 }, () =>
      Array.from({ length: 8 }, () => ({ lower: 0, upper: 0 })),
    )
    const tilemap: Tilemap = { width: 8, height: 8, cells, tileset: 'fake' }
    let presentCount = 0
    const ctx: LoopContext = {
      gs,
      bus: createCommandBus(),
      input: new ReplayInputSource([]),
      tilemap,
      eventCommands: [],
      labelMap: {},
      onPresent: () => {
        presentCount += 1
      },
    }

    // rAF 队列桩:记录排上的回调与 id;cancel 记录被取消的 id。签名与 DOM 一致,直接赋值。
    const origRaf = globalThis.requestAnimationFrame
    const origCancel = globalThis.cancelAnimationFrame
    const scheduled: Array<{ id: number; cb: FrameRequestCallback }> = []
    const canceled: number[] = []
    let nextId = 1
    globalThis.requestAnimationFrame = (cb: FrameRequestCallback): number => {
      const id = nextId
      nextId += 1
      scheduled.push({ id, cb })
      return id
    }
    globalThis.cancelAnimationFrame = (id: number): void => {
      canceled.push(id)
    }
    try {
      const cancel = startRafLoop(ctx)
      expect(scheduled.length).toBe(1) // 启动即排首帧

      const t0 = performance.now() // startRafLoop 用 performance.now() 起锚,回调时间戳须同锚
      scheduled[0]?.cb(t0 + 100) // dt=100 = explore interval → tick #1
      expect(scheduled.length).toBe(2) // 回调内自续订下一帧
      expect(gs.frameNum).toBe(1)
      scheduled[1]?.cb(t0 + 250) // dt=150 → tick #2(结转余量 50)
      expect(scheduled.length).toBe(3)
      expect(gs.frameNum).toBe(2)
      scheduled[2]?.cb(t0 + 280) // dt=30,累计 80 < 100 → 不 tick,仍续订
      expect(scheduled.length).toBe(4)
      expect(gs.frameNum).toBe(2)
      expect(presentCount).toBe(2) // 仅逻辑 tick 帧 present(无 fade)

      cancel()
      expect(canceled).toEqual([4]) // 取消的是链头待执行帧(id=4),链终止
      expect(scheduled.length).toBe(4) // 停链后不再有新帧排上
    } finally {
      globalThis.requestAnimationFrame = origRaf
      globalThis.cancelAnimationFrame = origCancel
    }
  })
})
