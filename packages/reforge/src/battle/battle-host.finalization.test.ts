// @vitest-environment jsdom
/**
 * TEST-GLM-REFORGE-BATTLE-FLOW-1：宿主终局流（battle-host.ts，BF-08..BF-10）。
 * 排重：battle-host.test.ts 16 例覆盖 victory 单景/取消/失效/恢复竞态，无 defeat 与
 * playerFled 终局分配、无胜利曲经验门与 boss 旗传递合同。本文件以与
 * battle-host-fixture 同构的真实装配（scenarioProject 真工程 + 真 BattleLaunchPreparation
 * + 真 BattleHost + 真 settle/finish 端口接线）补三条终局流。
 */

import type { AuthorEnemyDef } from '@type-pal/content'
import { buildWorld } from '@type-pal/content'
import { expect, test } from 'vitest'
import { drain } from '../__tests__/runtime-shell/driver.js'
import { shellActor } from '../__tests__/runtime-shell/project.js'
import {
  combatActor,
  installShellHost,
  opponent,
  scenarioProject,
} from '../__tests__/runtime-shell/scenarios.js'
import { loadStandardPalette } from '../assets.js'
import { SfxPlayer } from '../audio/sfx.js'
import { projectItemsView } from '../runtime-project-view.js'
import { BattleHost, type BattleHostPorts } from './battle-host.js'
import { BattleLaunchPreparation } from './battle-launch-preparation.js'
import type { BattleResult } from './battle-result.js'
import { finishBattleWorldState, settleBattleVictory } from './battle-world-result.js'

/** 完整敌属性（同文件 1：opponent 顶层浅覆盖，stats 整块替换）。 */
function foeWith(stats: Partial<AuthorEnemyDef['stats']>) {
  return opponent({
    stats: {
      health: 1,
      level: 1,
      exp: 0,
      cash: 7,
      attackStrength: 1,
      magicStrength: 0,
      defense: 0,
      dexterity: 1,
      fleeRate: 0,
      physicalResistance: 0,
      poisonResistance: 0,
      elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
      dualMove: false,
      collectValue: 0,
      ...stats,
    },
  })
}

interface HostScenario {
  enemy: AuthorEnemyDef
  /** 覆盖 hero 演员（如 luck 100 的逃跑者）。 */
  heroOverrides?: (actor: ReturnType<typeof combatActor>) => void
}

/** 与 battle-host-fixture 同构的真实宿主装配（可参数化敌与演员；端口按 main 语义接真 settle/finish）。 */
async function hostHarness(scenario: HostScenario) {
  const browser = await installShellHost()
  const fixture = await scenarioProject({
    enemies: [scenario.enemy],
    actors: (() => {
      const hero = combatActor()
      scenario.heroOverrides?.(hero)
      return [hero, shellActor('friend')]
    })(),
    items: [],
    inventory: [],
  })
  const project = fixture.project
  const start = project.manifest.entryPoints[0]?.startWorld
  if (!start) throw new Error('fixture 缺入口 startWorld')
  const world = buildWorld(start, project.actorsById)
  world.audio = { currentMusic: null }
  const content = { ...project, items: projectItemsView(project.items) }
  const events: string[] = []
  const sessions: import('./battle-session.js').BattleSession[] = []
  const plays: Array<{ asset: string; loop: boolean; fadeMs: number }> = []
  const victoryAssets: boolean[] = []
  const bgm = {
    play: (asset: string, loop: boolean, fadeMs: number) => {
      plays.push({ asset, loop, fadeMs })
      events.push(`music:play:${asset}`)
    },
    stop: () => {
      events.push('music:stop')
    },
  }
  const palette = await loadStandardPalette(project.assetBase)
  const sfx = new SfxPlayer(project.assetResolver)
  const prep = new BattleLaunchPreparation(
    content,
    {
      assetBase: project.assetBase,
      reader: project.assetResolver,
      imageCache: project.imageCache,
      spriteCache: project.battleSpriteCache,
      soundRoles: project.manifest.assets.roles,
      portraits: new Map(),
      faces: new Map(),
      palette: () => palette,
      chrome: { glyphs: { has: () => false, get: () => undefined } },
      sfx,
      loadEffect: async () => undefined,
    },
    {
      readWorld: () => world,
      readScene: () => project.entryScene,
      debugLeaders: () => ({ dualLeader: null, allLeader: null }),
    },
  )
  const ports: BattleHostPorts = {
    readWorld: () => world,
    exitFrameStep: () => {
      events.push('exitFrame')
    },
    captureScriptOwner: () => () => {},
    settleVictory: (session, playVictory) => {
      events.push('settlement')
      return settleBattleVictory(session, world, project, playVictory)
    },
    finishWorld: (session, result) => {
      events.push(`write:${result}`)
      finishBattleWorldState(session, result, world, project)
    },
    runDefeated: async () => {
      events.push('defeated')
    },
    restoreSceneSounds: async () => {
      events.push('restore')
    },
    publishDebug: (session) => {
      if (session) sessions.push(session)
      events.push(session ? 'publish' : 'clear')
    },
    reportReadiness: () => {
      events.push('report')
    },
    reportRestoreFailure: () => {
      events.push('restoreFailed')
    },
  }
  const host = new BattleHost(prep, ports, {
    bgm,
    locale: project.locale,
    victory: (boss) => {
      victoryAssets.push(boss)
      return boss ? 'victory-boss' : 'victory'
    },
  })
  /** 逐拍推进至宿主收口（有界；Enter 兼作结算屏放行）。 */
  async function pumpUntilSettled(
    observe: { state: { settled: boolean; result?: BattleResult; error?: unknown } },
    keys: readonly string[] = ['Enter'],
    maxTicks = 400,
  ) {
    for (let i = 0; i < maxTicks && !observe.state.settled; i += 1) {
      if (host.active) host.active.tick(100, new Set(keys))
      await drain()
      await browser.settleIO()
    }
    expect(observe.state.settled).toBe(true)
  }
  const observe = (promise: Promise<BattleResult>) => {
    const state: { settled: boolean; result?: BattleResult; error?: unknown } = { settled: false }
    promise.then(
      (result) => {
        state.result = result
        state.settled = true
      },
      (error) => {
        state.error = error
        state.settled = true
      },
    )
    return { state }
  }
  const untilActive = async () => {
    for (let i = 0; i < 100 && host.active === null; i += 1) {
      await drain()
      await browser.settleIO()
    }
    expect(host.active).not.toBeNull()
  }
  return {
    host,
    events,
    sessions,
    plays,
    victoryAssets,
    world,
    observe,
    untilActive,
    pumpUntilSettled,
    close: async () => {
      host.cancel()
      host.active?.cancel()
      await browser.close()
    },
  }
}

test('BF-08 宿主战败终局：无结算无战后脚本、恢复场景音但不还原音乐、HP 写回 0', async () => {
  const h = await hostHarness({ enemy: foeWith({ health: 5000, attackStrength: 200 }) })
  try {
    const op = h.observe(h.host.start('encounter', { auto: true }))
    await h.untilActive()
    await h.pumpUntilSettled(op)
    expect(op.state.result).toBe('defeat')
    // 终局分配：defeat 不触发 settleVictory、不跑 onDefeated 战后脚本、不还原大世界音乐。
    expect(h.events).toEqual([
      'exitFrame',
      'music:stop',
      'publish',
      'clear',
      'write:defeat',
      'restore',
    ])
    expect(h.world.party[0]!.hp).toBe(0) // finishWorld → writeBackHp lost 分支允许 0
    expect(h.world.money).toBe(50) // 无胜利奖励入账
  } finally {
    await h.close()
  }
})

test('BF-09 胜利曲经验门与 boss 旗：exp>0 才奏、options.boss 直传 victory(boss)', async () => {
  const rich = await hostHarness({ enemy: foeWith({ exp: 15, cash: 7 }) })
  try {
    const op = rich.observe(rich.host.start('encounter', { auto: true, boss: true }))
    await rich.untilActive()
    await rich.pumpUntilSettled(op)
    expect(op.state.result).toBe('victory')
    expect(rich.victoryAssets).toEqual([true]) // boss 旗恰一次直达 victory(boss)
    expect(rich.plays).toEqual([{ asset: 'victory-boss', loop: false, fadeMs: 300 }])
    expect(rich.events.at(-1)).toBe('music:stop') // playedVictory 后大世界静音态仍收 stop
    expect(rich.world.money).toBe(50 + 7)
  } finally {
    await rich.close()
  }
  const broke = await hostHarness({ enemy: foeWith({ exp: 0, cash: 7 }) })
  try {
    const op = broke.observe(broke.host.start('encounter', { auto: true, boss: true }))
    await broke.untilActive()
    await broke.pumpUntilSettled(op)
    expect(op.state.result).toBe('victory')
    expect(broke.victoryAssets).toEqual([]) // exp=0：经验门关 → 胜利曲回调零触发
    expect(broke.plays).toEqual([])
    expect(broke.world.money).toBe(50 + 7) // 金钱不受经验门影响
  } finally {
    await broke.close()
  }
})

test('BF-10 宿主逃跑终局：playerFled 不结算不跑战后脚本、金钱零变化、场景音恢复', async () => {
  const h = await hostHarness({
    enemy: foeWith({}),
    heroOverrides: (actor) => {
      actor.battler!.baseStats.luck = 100 // fleeRate 100 ≥ 任意 roll
    },
  })
  try {
    const op = h.observe(h.host.start('encounter'))
    await h.untilActive()
    h.host.active!.tick(100, new Set(['q'])) // 菜单提交逃跑
    await h.pumpUntilSettled(op)
    expect(op.state.result).toBe('playerFled')
    expect(h.events).toEqual([
      'exitFrame',
      'music:stop',
      'publish',
      'clear',
      'write:playerFled',
      'restore',
      'music:stop',
    ])
    expect(h.world.money).toBe(50) // 逃跑零奖励零扣减
  } finally {
    await h.close()
  }
})
