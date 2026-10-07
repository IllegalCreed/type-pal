import type { AuthorEnemyDef } from '@type-pal/content'
import { buildWorld } from '@type-pal/content'
import { expect, vi } from 'vitest'
import { loadStandardPalette } from '../../assets.js'
import { SfxPlayer } from '../../audio/sfx.js'
import { BattleHost, type BattleHostPorts } from '../../battle/battle-host.js'
import { BattleLaunchPreparation } from '../../battle/battle-launch-preparation.js'
import type { BattleResult } from '../../battle/battle-result.js'
import { finishBattleWorldState, settleBattleVictory } from '../../battle/battle-world-result.js'
import { projectItemsView } from '../../runtime-project-view.js'
import { drain } from '../runtime-shell/driver.js'
import { shellActor } from '../runtime-shell/project.js'
import {
  combatActor,
  installShellHost,
  opponent,
  scenarioProject,
} from '../runtime-shell/scenarios.js'

/**
 * TEST-REFORGE-BATTLE-HOST-TEST-RELIABILITY-1：宿主终局流共享装配。
 * 与 battle-host-fixture 同构的真实宿主链（scenarioProject 真工程 + 真
 * BattleLaunchPreparation + 真 BattleHost + 真 settle/finish 端口接线），
 * 可参数化敌与演员；端口按 main 语义接真结算/写回。
 *
 * 等待器纪律（CI 37560425624 / 37585132871 BF-08/BF-09 untilActive 红的根因）：
 * prepare 的原生 DecompressionStream 完成是调度相关的异步事件，不是事件循环
 * 轮数常量（本地实测整链 7–9 轮、CI 2 核满包+coverage 下可超 100 轮预算）。
 * 一律用条件 + 默认期限的 vi.waitFor（同 battle-host-fixture.ts 的 until 判例），
 * 不数轮数、不扩 timeout、不 sleep。
 */
export function foeWith(stats: Partial<AuthorEnemyDef['stats']>) {
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

export interface HostScenario {
  enemy: AuthorEnemyDef
  /** 覆盖 hero 演员（如 luck 100 的逃跑者）。 */
  heroOverrides?: (actor: ReturnType<typeof combatActor>) => void
}

export async function hostHarness(scenario: HostScenario) {
  // 收尾复原探针：installShellHost 之前的全局身份，close 后必须逐身份复原。
  const restoreProbe = { fetch: globalThis.fetch }
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
  // 本次 harness 生命周期内必须被兑现的 start Promise 续链（收尾纪律：先消费再复原）。
  const pending: Promise<unknown>[] = []
  // 本次生命周期内被持定的外部 IO 门（收尾纪律：close 先放行再等待续链落定）。
  const releases: (() => void)[] = []
  const observe = (promise: Promise<BattleResult>) => {
    const state: { settled: boolean; result?: BattleResult; error?: unknown } = { settled: false }
    const consumed = promise.then(
      (result) => {
        state.result = result
        state.settled = true
      },
      (error) => {
        state.error = error
        state.settled = true
      },
    )
    pending.push(consumed)
    return { state, consumed }
  }
  /** 条件同步（默认 1000ms/50ms 期限）：原生 IO 完成不是轮数常量，见文件头。 */
  const until = (predicate: () => boolean) => vi.waitFor(() => expect(predicate()).toBe(true))
  const untilActive = () => until(() => host.active !== null)
  /** 逐拍推进至宿主收口（有界；Enter 兼作结算屏放行）。会话推进是 tick 驱动的同步业务逻辑。 */
  async function pumpUntilSettled(
    op: { state: { settled: boolean } },
    keys: readonly string[] = ['Enter'],
    maxTicks = 400,
  ) {
    for (let i = 0; i < maxTicks && !op.state.settled; i += 1) {
      if (host.active) host.active.tick(100, new Set(keys))
      await drain()
      await browser.settleIO()
    }
    expect(op.state.settled).toBe(true)
  }
  /** 持定真实精灵 IO（外部 IO 门）：prepare 停在读处，直到 release。 */
  function blockSpriteRead() {
    let release!: () => void
    const promise = new Promise<void>((resolve) => {
      release = resolve
    })
    releases.push(release)
    let entered = 0
    fixture.hooks.read = async (path) => {
      if (path === 'assets/generated/fighter.rle') {
        entered += 1
        await promise
      }
    }
    return { release, entered: () => entered }
  }
  /** 让真实精灵 IO 拒绝（外部 IO 故障注入）：下一次 fighter.rle 读取以 NotFoundError 失败。 */
  function failSpriteRead() {
    fixture.hooks.read = async (path) => {
      if (path === 'assets/generated/fighter.rle')
        throw new DOMException(`fixture sprite IO broken: ${path}`, 'NotFoundError')
    }
  }
  /**
   * 收尾纪律（正常/准备拒绝/断言提前失败/取消四条路径共用）：
   * ①cancel 本次宿主与会话 ②放行本次持定的外部 IO 门 ③消费本次 start Promise 续链
   * ④browser.close 复原 spy/global/DOM。只 restoreAllMocks 不等于业务结束。
   */
  async function close() {
    host.cancel()
    host.active?.cancel()
    for (const release of releases) release()
    await Promise.allSettled(pending)
    await browser.close()
  }
  return {
    host,
    events,
    plays,
    victoryAssets,
    world,
    restoreProbe,
    observe,
    until,
    untilActive,
    pumpUntilSettled,
    blockSpriteRead,
    failSpriteRead,
    close,
  }
}
