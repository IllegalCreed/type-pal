import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ActorDef, ItemData, SpriteDef } from '@type-pal/content'
import { beforeAll, describe, expect, it } from 'vitest'
import { baselineWrites, loadPalBaseline, serializeMigrationJson } from './migration-baseline.js'
import { createMigrationPlan, snapshotOf } from './migration-plan.js'
import { loadProjectMigrationSnapshot } from './migration-project-io.js'
import { commitMigrationTransaction, recoverMigrationTransaction } from './migration-transaction.js'
import { buildMigrationTransactionChanges } from './migration-write-plan.js'
import { buildPalContentSupply } from './pal-content-supply.js'
import { loadPalContentSupplySources } from './pal-content-supply-io.js'
import { buildPalCurrentPublication } from './pal-current-publication.js'
import { buildPalMigration } from './pal-migration.js'
import { loadPalMigrationSources } from './pal-migration-io.js'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
let sources: ReturnType<typeof loadPalContentSupplySources>
let supply: ReturnType<typeof buildPalContentSupply>
let full: ReturnType<typeof buildPalMigration>

beforeAll(() => {
  sources = loadPalContentSupplySources(repo)
  full = buildPalMigration(loadPalMigrationSources(repo))
  supply = buildPalContentSupply(sources)
})

describe('PAL narrow resource supply', () => {
  it('matches every old required file, map report, raw scene id and role-domain definition', () => {
    expect(supply.files.size).toBe(228)
    expect(supply.mapReport).toEqual(full.report.maps)
    for (const [path, value] of supply.files) expect(value, path).toEqual(full.files.get(path))
    expect(supply.sceneIndex).toEqual(full.files.get('content/scenes/index.json'))
    const fullSprites = full.files.get('content/sprites.json') as unknown as SpriteDef[]
    const assets = new Set(supply.roleDefinitions.map(({ asset }) => asset))
    expect(supply.roleDefinitions).toEqual(fullSprites.filter(({ asset }) => assets.has(asset)))
    expect(supply.roleDefinitions).toHaveLength(6)
    for (const scene of supply.scenes) {
      const generated = full.files.get(`content/scenes/${scene.id}.json`) as unknown as {
        entities: { id: string; sprite?: string }[]
      }
      expect(scene.entities).toEqual(
        generated.entities
          .filter(({ sprite }) => sprite !== undefined)
          .map(({ id, sprite }) => ({ id, sprite })),
      )
    }
    const items = full.files.get('content/items.json') as unknown as ItemData[]
    for (const source of supply.itemMessages)
      expect(source.effect).toEqual(items.find(({ id }) => id === source.id)!.use!.effects[0])
    expect(supply.files.has('content/skills.json')).toBe(false)
    expect(supply.files.has('content/enemies.json')).toBe(false)
    expect(supply.files.has('content/items.json')).toBe(false)
    expect([...supply.files].some(([path]) => /content\/(scenes|scripts)\//.test(path))).toBe(false)
  })

  it('does not mutate sources or baseline and stops on map, alias, role, callback and message drift', () => {
    const baseline = loadPalBaseline(repo)!
    const before = structuredClone(baseline)
    const sourceBefore = JSON.stringify({
      migrate: sources.migrate,
      scenes: sources.scenes,
      players: sources.objectPlayers,
      frames: sources.worldSpriteFrameCounts,
      catalog: sources.assetCatalog,
      stores: sources.stores,
    })
    buildPalCurrentPublication(baseline, sources)
    expect(baseline).toEqual(before)
    expect(
      JSON.stringify({
        migrate: sources.migrate,
        scenes: sources.scenes,
        players: sources.objectPlayers,
        frames: sources.worldSpriteFrameCounts,
        catalog: sources.assetCatalog,
        stores: sources.stores,
      }),
    ).toBe(sourceBefore)
    const changed = {
      ...sources,
      objectPlayers: sources.objectPlayers.map((value) => ({ ...value })),
    }
    changed.objectPlayers[0]!.scriptOnFriendDeath = 0
    expect(() => buildPalContentSupply(changed)).toThrow(/入口缺失/)
    const malformed = {
      ...sources,
      migrate: {
        ...sources.migrate,
        commands: sources.migrate.commands.map((command) => ({ ...command })),
      },
    }
    const vessel = malformed.migrate.items.find(({ id }) => id === 268)!
    malformed.migrate.commands[vessel.scriptOnUse]!.opcode = 0x34
    expect(() => buildPalContentSupply(malformed)).toThrow(/item268 用途形状漂移/)
    const badRoles = {
      ...sources,
      migrate: { ...sources.migrate, roles: sources.migrate.roles.map((role) => ({ ...role })) },
    }
    badRoles.migrate.roles[0]!.id = 99
    expect(() => buildPalContentSupply(badRoles)).toThrow(/未知 roleId/)
    const badMap = {
      ...sources,
      tilemaps: [
        { ...sources.tilemaps[0]!, source: { ...sources.tilemaps[0]!.source, tileset: 'invalid' } },
        ...sources.tilemaps.slice(1),
      ],
    }
    expect(() => buildPalContentSupply(badMap)).toThrow(/tileset/)
    const badAlias = {
      ...sources,
      scenes: sources.scenes.map((scene) => ({
        ...scene,
        eventObjects: scene.eventObjects.map((entity) => ({ ...entity })),
      })),
    }
    const extra = badAlias.scenes
      .flatMap(({ eventObjects }) => eventObjects)
      .find(
        ({ spriteNum }) =>
          spriteNum > 0 && !sources.migrate.roles.some((role) => role.spriteNum === spriteNum),
      )!
    extra.spriteNum = sources.migrate.roles[0]!.spriteNum
    extra.nSpriteFrames = sources.migrate.roles[0]!.walkFrames || 3
    expect(() => buildPalCurrentPublication(baseline, badAlias)).toThrow(/引用集合漂移/)
    expect(() =>
      buildPalCurrentPublication(baseline, {
        ...sources,
        stores: sources.stores.filter(({ id }) => id !== 0),
      }),
    ).toThrow(/Store0/)
  })

  it('commits only in an isolated repository and replays the same supply with zero changes', () => {
    const temporary = mkdtempSync(resolve(tmpdir(), 'type-pal-supply-transaction-'))
    try {
      const baseline = loadPalBaseline(repo)!
      const publication = buildPalCurrentPublication(baseline, sources)
      const put = (path: string, bytes: string) => {
        mkdirSync(dirname(resolve(temporary, path)), { recursive: true })
        writeFileSync(resolve(temporary, path), bytes)
      }
      for (const [path, value] of baseline.files)
        put(`projects/pal/${path}`, serializeMigrationJson(value, path))
      for (const [path, bytes] of baselineWrites(baseline)) put(path, bytes)
      const project = loadProjectMigrationSnapshot(
        temporary,
        new Set([...baseline.managedFiles, ...publication.managedFiles]),
      )
      const plan = createMigrationPlan(baseline, project, publication)
      expect(plan.conflicts).toEqual([])
      const changes = buildMigrationTransactionChanges({
        repo: temporary,
        plan,
        projectSnapshot: project,
        previousBaseline: baseline,
        nextBaseline: snapshotOf(publication),
      })
      commitMigrationTransaction(temporary, changes)
      expect(recoverMigrationTransaction(temporary)).toBe(false)
      const publishedBaseline = loadPalBaseline(temporary)!
      const publishedProject = loadProjectMigrationSnapshot(temporary, publication.managedFiles)
      const replay = createMigrationPlan(
        publishedBaseline,
        publishedProject,
        buildPalCurrentPublication(publishedBaseline, sources),
      )
      expect(replay.summary).toMatchObject({ writes: 0, deletes: 0, conflicts: 0 })
      expect(
        buildMigrationTransactionChanges({
          repo: temporary,
          plan: replay,
          projectSnapshot: publishedProject,
          previousBaseline: publishedBaseline,
          nextBaseline: snapshotOf(publication),
        }),
      ).toEqual([])
      expect(readFileSync(resolve(temporary, 'projects/pal/content/actors.json'), 'utf8')).toBe(
        serializeMigrationJson(
          publication.files.get('content/actors.json')!,
          'content/actors.json',
        ),
      )
    } finally {
      rmSync(temporary, { recursive: true, force: true })
    }
  })

  it('does not overwrite author changes when both generated and author sides differ from base', () => {
    const baseline = loadPalBaseline(repo)!
    const actors = structuredClone(
      baseline.files.get('content/actors.json'),
    ) as unknown as ActorDef[]
    actors[0]!.battler!.baseStats.hp = 1
    const base = { ...baseline, files: new Map(baseline.files) }
    base.files.set('content/actors.json', actors as never)
    const authored = structuredClone(base)
    const authorActors = authored.files.get('content/actors.json') as unknown as ActorDef[]
    authorActors[0]!.battler!.baseStats.hp = 2
    const before = structuredClone(authored)
    const publication = buildPalCurrentPublication(base, sources)
    const plan = createMigrationPlan(base, authored, publication)
    expect(
      plan.conflicts.some(
        ({ file, path }) => file === 'content/actors.json' && path.endsWith('/hp'),
      ),
    ).toBe(true)
    expect(authored).toEqual(before)
  })
})
