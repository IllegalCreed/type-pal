import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ActorDef, ItemData, SpriteDef } from '@type-pal/content'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  baselineWrites,
  loadPalBaseline,
  serializeMigrationJson,
  sha256,
  snapshotFileHash,
} from './migration-baseline.js'
import { createMigrationPlan, snapshotOf } from './migration-plan.js'
import { loadProjectMigrationSnapshot } from './migration-project-io.js'
import { commitMigrationTransaction, recoverMigrationTransaction } from './migration-transaction.js'
import { buildMigrationTransactionChanges } from './migration-write-plan.js'
import { buildPalContentSupply } from './pal-content-supply.js'
import { loadPalContentSupplySources } from './pal-content-supply-io.js'
import { buildPalCurrentPublication } from './pal-current-publication.js'
import { PAL_WORLD_SCENE_SEMANTIC_SPRITE_ALIASES } from './pal-world-sprite-layouts.js'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
let sources: ReturnType<typeof loadPalContentSupplySources>
let supply: ReturnType<typeof buildPalContentSupply>

beforeAll(() => {
  sources = loadPalContentSupplySources(repo)
  supply = buildPalContentSupply(sources)
})

describe('PAL narrow resource supply', () => {
  it('matches the current required resource contract, raw scene ids and role-domain definitions', () => {
    const baseline = loadPalBaseline(repo)!
    expect(supply.files.size).toBe(228)
    expect(supply.mapReport).toMatchObject({
      mapCount: 223,
      rawRoundTripMismatchCount: 6,
      semanticRoundTripMismatchCount: 0,
    })
    const roleIds = ['li-xiaoyao', 'zhao-linger', 'lin-yueru', 'wu-hou', 'anu', 'gai-luojiao']
    for (const [path, value] of supply.files) {
      // Atomic maps stay hash-only in baseline; canonical serialization omits default source grids.
      if (/^content\/maps\/map-\d+\.json$/.test(path)) {
        expect(sha256(serializeMigrationJson(value, path)), path).toBe(
          snapshotFileHash(baseline, path),
        )
        continue
      }
      const expected =
        path === 'content/actors.json'
          ? (baseline.files.get(path) as unknown as ActorDef[]).filter(({ id }) =>
              roleIds.includes(id),
            )
          : baseline.files.get(path)
      expect(value, path).toEqual(expected)
    }
    expect(supply.sceneIndex).toEqual(baseline.files.get('content/scenes/index.json'))
    const fullSprites = baseline.files.get('content/sprites.json') as unknown as SpriteDef[]
    const assets = new Set(supply.roleDefinitions.map(({ asset }) => asset))
    expect(supply.roleDefinitions).toEqual(fullSprites.filter(({ asset }) => assets.has(asset)))
    expect(supply.roleDefinitions).toHaveLength(6)
    expect(supply.scenes).toHaveLength(294)
    expect(supply.scenes.map(({ id }) => id)).toEqual(
      Array.from({ length: 294 }, (_, id) => `s${String(id).padStart(3, '0')}`),
    )
    const sourceScenes = new Map(sources.scenes.map((scene) => [scene.sceneId, scene]))
    for (const scene of supply.scenes) {
      const raw = sourceScenes.get(Number(scene.id.slice(1)))!
      const rawEntities = raw.eventObjects.filter(({ spriteNum }) => spriteNum > 0)
      expect(
        scene.entities.map(({ id }) => id),
        scene.id,
      ).toEqual(rawEntities.map(({ id }) => `e${id}`))
      for (const [index, entity] of scene.entities.entries()) {
        expect(entity).not.toHaveProperty('actor')
        if (!roleIds.includes(entity.sprite)) {
          const source = rawEntities[index]!
          expect(entity.sprite, `${scene.id}/${entity.id}`).toMatch(
            new RegExp(`^sprite-${source.spriteNum}(-f${source.nSpriteFrames ?? 0})?$`),
          )
        }
      }
    }
    for (const alias of PAL_WORLD_SCENE_SEMANTIC_SPRITE_ALIASES) {
      const actual = supply.scenes.flatMap((scene) =>
        scene.entities
          .filter((entity) => entity.sprite === alias.semanticId)
          .map((entity) => ({ sceneId: scene.id, entityId: entity.id })),
      )
      expect(actual, alias.semanticId).toEqual(alias.references)
    }
    const items = baseline.files.get('content/items.json') as unknown as ItemData[]
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
