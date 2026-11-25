import type { AuthorEnemyDef } from '@type-pal/content'
import { expect } from 'vitest'
import { battleHostFixture } from '../battle-host-fixture.js'
import { drain } from '../runtime-shell/driver.js'
import { shellActor } from '../runtime-shell/project.js'
import { combatActor, opponent } from '../runtime-shell/scenarios.js'

export function foeWith(stats: Partial<AuthorEnemyDef['stats']>): AuthorEnemyDef {
  const foe = opponent()
  return { ...foe, stats: { ...foe.stats, ...stats } }
}

interface HostScenario {
  enemy: AuthorEnemyDef
  heroOverrides?: (actor: ReturnType<typeof combatActor>) => void
}

/** Capture terminal effects from the real battle host and settlement. */
export async function hostHarness(scenario: HostScenario) {
  const restoreProbe = { fetch: globalThis.fetch }
  const hero = combatActor()
  scenario.heroOverrides?.(hero)
  const plays: Array<{ asset: string; loop: boolean; fadeMs: number }> = []
  const victoryAssets: boolean[] = []
  const play = (asset: string, loop = true, fadeMs = 0) => {
    plays.push({ asset, loop, fadeMs })
    events.push(`music:play:${asset}`)
  }
  const fixture = await battleHostFixture({
    scenario: {
      enemies: [scenario.enemy],
      actors: [hero, shellActor('friend')],
      items: [],
      inventory: [],
    },
    music: {
      play,
      stop: () => events.push('music:stop'),
      prepare: async (asset) => () => play(asset),
    },
    victoryMusic: (boss) => {
      victoryAssets.push(boss)
      return boss ? 'victory-boss' : 'victory'
    },
  })
  const { browser, events, host, ports } = fixture
  ports.exitFrameStep = () => {
    events.push('exitFrame')
  }
  ports.reportReadiness = () => {
    events.push('report')
  }
  ports.reportRestoreFailure = () => {
    events.push('restoreFailed')
  }

  async function pumpUntilSettled(op: { state: { settled: boolean } }) {
    for (let i = 0; i < 400 && !op.state.settled; i += 1) {
      host.active?.tick(100, new Set(['Enter']))
      // Wait for the start promise after session completion and scene recovery.
      await drain()
      await browser.settleIO()
    }
    expect(op.state.settled).toBe(true)
  }

  return {
    host,
    events,
    plays,
    victoryAssets,
    world: fixture.world(),
    sfx: fixture.sfx,
    restoreProbe,
    observe: fixture.observe,
    until: fixture.until,
    untilActive: () => fixture.until(() => host.active !== null),
    pumpUntilSettled,
    blockSpriteRead: fixture.blockSprite,
    failSpriteRead() {
      fixture.fixture.hooks.read = async (path) => {
        if (path === 'assets/generated/fighter.rle')
          throw new DOMException(`fixture sprite IO broken: ${path}`, 'NotFoundError')
      }
    },
    close: fixture.close,
  }
}
