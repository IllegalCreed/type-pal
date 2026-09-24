import { buildWorld } from '@type-pal/content'
import { expect, vi } from 'vitest'
import { loadStandardPalette } from '../assets.js'
import { AsyncIntentController } from '../async-intent.js'
import { SfxPlayer } from '../audio/sfx.js'
import { BattleHost, type BattleHostPorts } from '../battle/battle-host.js'
import { BattleLaunchPreparation } from '../battle/battle-launch-preparation.js'
import type { BattleResult } from '../battle/battle-result.js'
import type { BattleSession } from '../battle/battle-session.js'
import { finishBattleWorldState, settleBattleVictory } from '../battle/battle-world-result.js'
import { sha256Bytes } from '../hash.js'
import { loadCurrentProjectFrom } from '../project-loader.js'
import { projectItemsView } from '../runtime-project-view.js'
import { drain } from './runtime-shell/driver.js'
import { installShellHost, medicine, scenarioProject } from './runtime-shell/scenarios.js'

export function gate() {
  let release!: () => void
  const promise = new Promise<void>((resolve) => {
    release = resolve
  })
  return { promise, release }
}
/** Real loader, guards, asset readers, preparation and BattleSession. Only browser/audio IO is external. */
export async function battleHostFixture(withSound = false) {
  const browser = await installShellHost()
  const fixture = await scenarioProject({
    items: [medicine()],
    inventory: [{ itemId: 'tonic', count: 3 }],
  })
  if (withSound) {
    const bytes = new Uint8Array(46)
    const view = new DataView(bytes.buffer)
    const tag = (at: number, text: string) => bytes.set(new TextEncoder().encode(text), at)
    tag(0, 'RIFF')
    view.setUint32(4, 38, true)
    tag(8, 'WAVE')
    tag(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, 1, true)
    view.setUint32(24, 8000, true)
    view.setUint32(28, 16000, true)
    view.setUint16(32, 2, true)
    view.setUint16(34, 16, true)
    tag(36, 'data')
    view.setUint32(40, 2, true)
    const path = 'assets/generated/attack.wav'
    fixture.binaries.set(path, bytes)
    const catalog = structuredClone(fixture.project.assetCatalog)
    catalog.assets.attack = {
      kind: 'sound',
      path,
      mediaType: 'audio/wav',
      bytes: bytes.length,
      sha256: await sha256Bytes(bytes),
      origin: { kind: 'generated' },
    }
    fixture.files['assets/index.json'] = catalog
    const actors = structuredClone(Object.values(fixture.project.actorsById))
    const hero = actors.find((actor) => actor.id === 'hero')
    if (!hero?.battler) throw new Error('missing hero')
    hero.battler.sounds = { attack: 'attack' }
    fixture.files['content/actors.json'] = actors
    fixture.project = await loadCurrentProjectFrom(fixture.source)
  }
  const project = fixture.project
  const start = project.manifest.entryPoints[0]?.startWorld
  if (!start) throw new Error('missing entry')
  let world = buildWorld(start, project.actorsById)
  world.audio = { currentMusic: null }
  const originalWorld = structuredClone(world)
  const content = { ...project, items: projectItemsView(project.items) }
  const input = structuredClone({
    actors: project.actorsById,
    enemies: project.enemiesById,
    items: content.items,
  })
  const script = new AsyncIntentController()
  const events: string[] = []
  const sessions: BattleSession[] = []
  const bgm = {
    play: vi.fn(() => {
      events.push('music:play')
    }),
    stop: vi.fn(() => {
      events.push('music:stop')
    }),
  }
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
  const palette = await loadStandardPalette(project.assetBase)
  const ports: BattleHostPorts = {
    readWorld: () => world,
    exitFrameStep: vi.fn(),
    captureScriptOwner: () => {
      const token = script.capture()
      return () => script.assertCurrent(token, 'script replaced')
    },
    settleVictory: (session, music) => {
      events.push('settlement')
      return settleBattleVictory(session, world, project, music)
    },
    finishWorld: (session, result) => {
      events.push(`write:${result}`)
      finishBattleWorldState(session, result, world, project)
    },
    runDefeated: vi.fn(async () => {
      events.push('defeated')
    }),
    restoreSceneSounds: vi.fn(async () => {
      events.push('restore')
    }),
    publishDebug: vi.fn((session) => {
      if (session) sessions.push(session)
      events.push(session ? 'publish' : 'clear')
    }),
    reportReadiness: vi.fn(),
    reportRestoreFailure: vi.fn(),
  }
  const host = new BattleHost(prep, ports, {
    bgm,
    locale: project.locale,
    victory: () => 'victory',
  })
  const pending: Promise<unknown>[] = []
  const releases: (() => void)[] = []
  function observe(promise: Promise<BattleResult>) {
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
  async function until(predicate: () => boolean) {
    for (let i = 0; i < 150 && !predicate(); i++) {
      await drain()
      await browser.settleIO()
    }
    expect(predicate()).toBe(true)
  }
  async function finish() {
    for (let i = 0; i < 150 && host.active; i++) {
      host.active.tick(100, new Set(['Enter']))
      await drain()
      await browser.settleIO()
    }
    expect(host.active).toBeNull()
  }
  function blockSprite() {
    const wait = gate()
    releases.push(wait.release)
    let entered = 0
    fixture.hooks.read = async (path) => {
      if (path === 'assets/generated/fighter.rle') {
        entered++
        await wait.promise
      }
    }
    return { ...wait, entered: () => entered }
  }
  return {
    host,
    prep,
    ports,
    bgm,
    sfx,
    fixture,
    script,
    events,
    originalWorld,
    browser,
    world: () => world,
    replaceWorld: () => {
      world = structuredClone(world)
    },
    observe,
    until,
    finish,
    blockSprite,
    async close() {
      host.cancel()
      for (const session of sessions) session.cancel()
      for (const release of releases) release()
      await Promise.all(pending)
      browser.close()
    },
    assertInputs() {
      expect({
        actors: project.actorsById,
        enemies: project.enemiesById,
        items: content.items,
      }).toEqual(input)
    },
  }
}
