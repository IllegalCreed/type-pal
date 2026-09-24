import type {
  ActorDef,
  AuthorEnemyDef,
  AuthorItemCore,
  AuthorSceneDef,
  WorldState,
} from '@type-pal/content'
import { collectAssetReferences, validateAssetFileClosure } from '@type-pal/content'
import { expect } from 'vitest'
import type { BattleResult } from '../../battle/battle-result.js'
import type { BattleSession } from '../../battle/battle-session.js'
import type { FileSource } from '../../file-source.js'
import { sha256Bytes } from '../../hash.js'
import { loadCurrentProjectFrom } from '../../project-loader.js'
import { projectItemsView } from '../../runtime-project-view.js'
import { installShellHost, type ShellHost } from './dom-host.js'
import { drain, key, observation, type ShellObservation } from './driver.js'
import { projectData, shellActor, shellProject } from './project.js'

export const medicine = (id = 'tonic', amount = 10): AuthorItemCore => ({
  id,
  name: id,
  desc: [],
  buyPrice: 0,
  sellPrice: 0,
  sellable: false,
  use: { target: 'oneAlly', consuming: true, effects: [{ kind: 'healHp', amount }] },
})
export const weapon = (id: string): AuthorItemCore => ({
  id,
  name: id,
  desc: [],
  buyPrice: 0,
  sellPrice: 0,
  sellable: false,
  equip: {
    slot: 'weapon',
    equipableBy: ['hero'],
    effects: [{ kind: 'statBonus', stat: 'attack', delta: 5 }],
  },
})
export function combatActor(): ActorDef {
  const actor = shellActor('hero')
  if (!actor.battler) throw new Error('fixture battler missing')
  actor.battler.baseStats.attack = 100
  actor.battler.baseStats.speed = 100
  actor.battler.baseStats.luck = 0
  return actor
}
export function opponent(overrides: Partial<AuthorEnemyDef> = {}): AuthorEnemyDef {
  return {
    id: 'foe',
    name: 'Foe',
    battleSprite: 'foe-sprite',
    yPosOffset: 0,
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
    },
    ai: { resistanceToSorcery: 0 },
    sounds: {},
    ...overrides,
  }
}
export interface ScenarioOptions {
  first?: AuthorSceneDef
  second?: AuthorSceneDef
  actors?: ActorDef[]
  party?: string[]
  inventory?: WorldState['inventory']
  items?: AuthorItemCore[]
  enemies?: AuthorEnemyDef[]
}

/** Extend the old legal in-memory file source, then reload through the formal author guards. */
export async function scenarioProject(options: ScenarioOptions = {}) {
  const fixture = await shellProject({
    first: options.first,
    second: options.second,
    party: options.party ?? ['hero'],
  })
  const manifest = structuredClone(fixture.project.manifest)
  manifest.content.enemies = 'content/enemies.json'
  manifest.content.enemyTeams = 'content/enemy-teams.json'
  const entry = manifest.entryPoints[0]
  if (!entry?.startWorld) throw new Error('fixture start world missing')
  entry.startWorld.inventory = options.inventory ?? []
  // The second entry remains a valid independent start even when a case supplies one actor.
  const second = manifest.entryPoints[1]
  if (second?.startWorld) second.startWorld.party = [...entry.startWorld.party]
  fixture.files['manifest.json'] = manifest
  for (const name of ['a', 'b']) {
    const original = fixture.files[`content/scenes/${name}.json`]
    if (!original || typeof original !== 'object') throw new Error('scene fixture missing')
    fixture.files[`content/scenes/${name}.json`] = { ...original, battleMusic: null }
  }
  fixture.files['content/actors.json'] = options.actors ?? [combatActor(), shellActor('friend')]
  fixture.files['content/items.json'] = options.items ?? []
  fixture.files['content/enemies.json'] = options.enemies ?? [opponent()]
  fixture.files['content/enemy-teams.json'] = [
    { id: 'encounter', slots: ['foe', null, null, null, null] },
  ]
  fixture.files['content/battle-sprites.json'] = [
    ...Object.values(fixture.project.battleSpritesById),
    {
      id: 'foe-sprite',
      label: 'Foe sprite',
      asset: 'fighter',
      profile: {
        kind: 'enemy',
        idle: { start: 0, count: 2 },
        magic: { start: 2, count: 0 },
        attack: { start: 2, count: 2 },
        idleTicksPerFrame: 5,
        actTicksPerFrame: 1,
      },
    },
  ]
  // Retain each actual object delivered to the loader (including lazy scenes), not just
  // a pre-load files table that product code never consumes directly.
  const delivered: { path: string; actual: unknown; before: unknown }[] = []
  const source: FileSource = {
    ...fixture.source,
    async readJson<T>(path: string): Promise<T> {
      const actual = await fixture.source.readJson<T>(path)
      delivered.push({ path, actual, before: structuredClone(actual) })
      return actual
    },
  }
  const project = await loadCurrentProjectFrom(source)
  const references = collectAssetReferences({
    assets: project.manifest.assets,
    entryPoints: project.manifest.entryPoints,
    actors: Object.values(project.actorsById),
    skills: Object.values(project.skills),
    items: Object.values(projectItemsView(project.items)),
    enemies: Object.values(project.enemiesById),
    sprites: Object.values(project.spritesById),
    battleSprites: Object.values(project.battleSpritesById),
    tilesets: project.tilesets,
  })
  const issues = await validateAssetFileClosure(project.assetResolver.catalog, references, {
    readBytes: async (path) => new Uint8Array(await fixture.source.readBytes(path)),
    sha256: sha256Bytes,
  })
  if (issues.some((issue) => issue.severity === 'error')) throw new Error(JSON.stringify(issues))
  return { ...fixture, source, project, delivered }
}

export async function bootScenario(h: ShellHost, options: ScenarioOptions = {}) {
  const fixture = await scenarioProject(options)
  const input = structuredClone(projectData(fixture.project))
  await (await import('../../main.js')).bootGame(fixture.project, {
    kind: 'project',
    projectId: 'shell-project',
  })
  h.frame()
  return {
    h,
    fixture,
    assertInputUnchanged: () => {
      expect(projectData(fixture.project)).toEqual(input)
      expect(fixture.delivered.some(({ path }) => path === 'content/scenes/a.json')).toBe(true)
      for (const { path, actual, before } of fixture.delivered) expect(actual, path).toEqual(before)
    },
  }
}

export interface ScenarioObservation extends ShellObservation {
  readonly entities: readonly {
    id: string
    pos: { col: number; row: number; height: number }
    facing: string
    hidden?: boolean
  }[]
  readonly battleLog: readonly string[]
  startBattle(id: string): Promise<BattleResult>
}
export function state(): ScenarioObservation {
  return observation() as ScenarioObservation
}
export function session(): BattleSession {
  const value: unknown = Reflect.get(window, '__rfBattle')
  if (!value || typeof value !== 'object' || !('debugReadiness' in value))
    throw new Error('battle session not published')
  return value as BattleSession
}
export async function enterItems(h: ShellHost, panel: 'equip' | 'use') {
  await key(h, 'Escape')
  await key(h, 'ArrowDown')
  await key(h, 'ArrowDown')
  await key(h, 'Enter')
  if (panel === 'use') await key(h, 'ArrowDown')
  await key(h, 'Enter')
}
/** Bounded gameplay stepping, including a real task turn for decompression/IDB IO. */
export async function advance(h: ShellHost, predicate: () => boolean, frames = 100) {
  for (let i = 0; i < frames && !predicate(); i++) {
    h.frame(100)
    await drain()
    await h.settleIO()
  }
  expect(predicate()).toBe(true)
}
export { installShellHost }
