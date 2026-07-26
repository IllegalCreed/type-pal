import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  type ItemDataV5,
  type MigrationDiagnosticsV1,
  type SceneDefV5,
  type SpriteDef,
  validateItemsV5,
  validateLocale,
  validateMigrationDiagnostics,
  validateScenesV5,
  validateSprites,
} from '@type-pal/content'
import { beforeAll, describe, expect, test } from 'vitest'
import type { MigrationJson } from '../../pal-migration.js'
import { buildPalMigration } from '../../pal-migration.js'
import { loadPalMigrationSources } from '../../pal-migration-io.js'
import {
  assertScriptControlFlowAudit,
  auditPalScriptControlFlow,
  type ScriptControlFlowAuditV1,
} from '../../script-control-flow-audit.js'
import {
  C8_ITEM_IDS,
  C8_STORY_ITEM_ROOTS,
  type C8OwnedIdentityV1,
} from './c8-item-use-augmentation.js'
import { buildP7GeneratedCanonical } from './p7-generated.js'
import { stableJson, stableJsonSha256 } from './stable-json.js'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..')
const extracted = resolve(repo, 'data/extracted/events/all.json')
const auditPath = resolve(repo, 'packages/migrate/baselines/script-control-flow/pal-v1.json')
const baselineStatePath = resolve(repo, 'packages/migrate/baselines/pal/_state.json')
const p7LedgerPath = resolve(repo, 'packages/migrate/baselines/pal/_transitions/script-v4-v5.json')
const c8SealPath = resolve(
  repo,
  'packages/migrate/baselines/pal/_transitions/c8-item-use-v5-v1.json',
)
const P7_FROZEN_LEDGER_DIGEST = '9b01dea89f4d567663ad64e03017d1ecdbdb01fb1540e6798a931f47900f4901'
const C8_ITEM_USE_GOLDEN = {
  '90': 'd9d9132aaf242153de7724227979be64b1bdf092999cf213643cae09397028d8',
  '91': '83e284bf1101e2610c8ccd81ebb6734e8e31920765365440bceec30dbdc075d4',
  '137': '079057d05739523dca4f8873f26c88ef1118a4039a6a1f870599142f25a4dda3',
  '150': '779b84c33f6f0a1e79f1a943f281e8ec059abbed00c975bca89274dd189b6059',
  '260': '43d0627815b7f9a86c604344fce4175663240a5d9a99c61ca5611c9fad3d7c7b',
  '263': '3ee2ee841f31138c5a56094132f501275cedc68be2a8cbb8587676992638033e',
  '264': '37e8f7650fa3cb82967fdd3be927443e8ea89851d161086e26c1e6e4dcd9ad51',
  '271': '25ea374ab55aaafea2374c6866d4089640b8d7958e668ab7ee12c0a705d64470',
  '272': '39ba9336c0386773c1d0b07b7b898bb52efc0fcad3efcdaacdc16617a03e8d09',
  '273': '0fb177e437f150e92afdb17ff26a213b8a36eb543dd20c7d2a8fc3211222dcf7',
  '279': '9be2875eeec73a7793914198c8517096ac18ad8f9f866c7a64bb6d69e58882c3',
  '284': '28b89de5e988dd9ee3157565977a6c18d83ee174bfe3836d7e0b7afeeea453ec',
  '285': 'c1646c846ae0f893562a4edca09005c555431cf8e145f98c23a92140aa014c93',
  '286': '6eb93d6cc0e523c6e3139b59c3113cf1629ea1e63e56f3c935d1cb6474b4ac8c',
  '287': '815ab6a4951ae354d5c8036797795c1d0a68e98afb168c1955d0eda1c2bc3b5d',
  '288': '9e8e213992e09caa2ca814bf8156fbc4fdb42a0113f642e094fa91c2ef69519f',
  '289': 'a98baad3d0da9dedb3056d857557f7ffa2631a5cbbae800d2df107ac0803cbbe',
  '291': 'e468b502cc51ecb23da450965ef7403eba55706d741cf7974ae3749248ac9f65',
  '292': '1f77d8d258d984be4f41ed2cdcf3f91d470e2b431405cb1227c44298df68fce1',
  '294': '998a7a1f812a9e030137d8fd5ea2c5b1cf9e14d25cd4bf2e2c9a0d9e6106f854',
} as const
const C8_ITEM_137_THROW_GOLDEN = '25ec7beda67cc8baa5629794bb7a86a73b19a3b3d478eb6aff271886950f3881'
const C8_PUBLISHED_SEAL_DIGEST = 'fbdbd50f5e47b924c8bf4dcfb0700d5b08a04afa0d3cc2bff0711b4b9da627a3'

type Fixture = ReturnType<typeof loadFixture>
let fixture: Fixture

function required<T>(files: ReadonlyMap<string, MigrationJson>, path: string): T {
  const value = files.get(path)
  if (value === undefined) throw new Error(`C8 test fixture missing ${path}`)
  return value as unknown as T
}

function loadFixture() {
  const sources = loadPalMigrationSources(repo)
  const migration = buildPalMigration(sources)
  const currentAudit = auditPalScriptControlFlow(sources, migration)
  assertScriptControlFlowAudit(currentAudit)
  const frozenAudit = JSON.parse(readFileSync(auditPath, 'utf8')) as ScriptControlFlowAuditV1
  const generated = buildP7GeneratedCanonical({
    migration,
    currentAudit,
    frozenAudit,
    sourceCommands: sources.allJson.segments.flatMap((segment) => segment.commands),
    itemSources: sources.migrate.items,
  })
  const sceneIds = required<string[]>(generated.snapshot.files, 'content/scenes/index.json')
  const scenes = validateScenesV5(
    sceneIds.map((sceneId) => required(generated.snapshot.files, `content/scenes/${sceneId}.json`)),
  )
  return {
    sources,
    migration,
    generated,
    scenes,
    scenesById: new Map(scenes.map((scene) => [scene.id, scene])),
    items: validateItemsV5(required(generated.snapshot.files, 'content/items.json')),
    locale: validateLocale(required(generated.snapshot.files, 'content/locale.json'), {
      allowLegacySoftWrap: true,
    }),
    baseLocale: validateLocale(required(migration.files, 'content/locale.json'), {
      allowLegacySoftWrap: true,
    }),
    sprites: validateSprites(required(generated.snapshot.files, 'content/sprites.json')),
    diagnostics: validateMigrationDiagnostics(
      required(generated.snapshot.files, 'content/migration-diagnostics.json'),
    ),
  }
}

function visit(value: unknown, callback: (record: Record<string, unknown>) => void): void {
  if (Array.isArray(value)) {
    for (const child of value) visit(child, callback)
    return
  }
  if (!value || typeof value !== 'object') return
  const record = value as Record<string, unknown>
  callback(record)
  for (const child of Object.values(record)) visit(child, callback)
}

function countKinds(value: unknown, kinds: ReadonlySet<string>): number {
  let count = 0
  visit(value, (record) => {
    if (typeof record.kind === 'string' && kinds.has(record.kind)) count++
  })
  return count
}

function itemById(items: readonly ItemDataV5[], id: string): ItemDataV5 {
  const item = items.find((candidate) => candidate.id === id)
  if (!item) throw new Error(`C8 test fixture missing item ${id}`)
  return item
}

function ownedTarget(
  scenes: ReadonlyMap<string, SceneDefV5>,
  identity: C8OwnedIdentityV1,
): unknown {
  if (identity.kind === 'entity-behavior') {
    const scene = scenes.get(identity.sceneId)
    const entity = scene?.entities.find((candidate) => candidate.id === identity.entityId)
    return entity?.behaviors?.[identity.channel]?.[identity.behaviorId]
  }
  if (identity.kind === 'scene-hook')
    return scenes.get(identity.sceneId)?.hooks?.[identity.hook]?.variants[identity.hookId]
  return undefined
}

function c8CanonicalObjects(current: Fixture): unknown[] {
  const itemTargets = C8_STORY_ITEM_ROOTS.map(
    ({ itemId }) => itemById(current.items, String(itemId)).use,
  )
  const allocations = current.generated.c8Evidence.ownedTargets
    .map(({ identity }) => ownedTarget(current.scenesById, identity))
    .filter((value) => value !== undefined)
  return [...itemTargets, ...allocations]
}

describe.skipIf(
  !existsSync(extracted) ||
    !existsSync(auditPath) ||
    !existsSync(baselineStatePath) ||
    !existsSync(p7LedgerPath) ||
    !existsSync(c8SealPath),
)('C8 post-P7 item-use augmentation', () => {
  beforeAll(() => {
    fixture = loadFixture()
  }, 360_000)

  test('seals the exact 20 item identities and 21 authority roots', () => {
    const evidence = fixture.generated.c8Evidence
    expect(evidence.items.map(({ itemId }) => Number(itemId))).toEqual([...C8_ITEM_IDS])
    expect(evidence.items.flatMap(({ sourceRoots }) => sourceRoots)).toHaveLength(21)

    const sources = new Map(fixture.sources.migrate.items.map((item) => [item.id, item]))
    for (const item of evidence.items) {
      const source = sources.get(Number(item.itemId))
      expect(source, `source item ${item.itemId}`).toBeDefined()
      expect(
        item.sourceRoots.map(({ channel, address }) => ({ channel, address })),
        `source roots ${item.itemId}`,
      ).toEqual([
        { channel: 'use', address: source!.scriptOnUse },
        ...(item.itemId === '137'
          ? [{ channel: 'throw' as const, address: source!.scriptOnThrow }]
          : []),
      ])
      expect(
        item.sourceRoots.every(({ closureDigest }) => /^[a-f0-9]{64}$/.test(closureDigest)),
      ).toBe(true)
      expect(item.targets.map(({ channel }) => channel)).toEqual(
        item.itemId === '137' ? ['use', 'throw'] : ['use'],
      )
    }
    expect(
      C8_STORY_ITEM_ROOTS.map(({ itemId }) => ({
        itemId,
        address: evidence.items
          .find((item) => Number(item.itemId) === itemId)
          ?.sourceRoots.find(({ channel }) => channel === 'use')?.address,
      })),
    ).toEqual(C8_STORY_ITEM_ROOTS.map(({ itemId, address }) => ({ itemId, address })))
  })

  test('pins the published append-only C8 seal independently from regeneration code', () => {
    const seal = JSON.parse(readFileSync(c8SealPath, 'utf8')) as Record<string, unknown>
    const { digest, ...body } = seal
    expect(digest).toBe(C8_PUBLISHED_SEAL_DIGEST)
    expect(stableJsonSha256(body)).toBe(C8_PUBLISHED_SEAL_DIGEST)
  })

  test('projects all 14 story uses as local canonical bodies and closes the 100/0 gate', () => {
    const legacyKinds = new Set(['legacyRaw', 'runScript', 'callScript', 'jumpScript'])
    for (const { itemId } of C8_STORY_ITEM_ROOTS) {
      const item = itemById(fixture.items, String(itemId))
      expect(item.use?.target, `item ${itemId} target`).toBe('scene')
      const effects = item.use?.effects ?? []
      expect(effects, `item ${itemId} effects`).toHaveLength(1)
      expect(effects[0]?.kind, `item ${itemId} effect`).toBe('itemPrivateScript')
      const effect = effects[0]
      if (effect?.kind !== 'itemPrivateScript') throw new Error(`item ${itemId} is not private`)
      expect(effect.script.id).toBe('use')
      expect(effect.script.body.length, `item ${itemId} body`).toBeGreaterThan(0)
      expect(countKinds(effect.script.body, legacyKinds), `item ${itemId} retired commands`).toBe(0)
    }

    const gates = fixture.generated.c8Evidence.gates
    expect(gates.sourceUsableItemIds).toHaveLength(100)
    expect(gates.targetRunnableUseItemIds).toHaveLength(100)
    expect(gates.targetRunnableUseItemIds).toEqual(gates.sourceUsableItemIds)
    expect(gates.itemUseDiagnosticCount).toBe(0)
    expect(
      (fixture.diagnostics as MigrationDiagnosticsV1).diagnostics.filter(
        ({ target }) => target.domain === 'item' && target.capability === 'use',
      ),
    ).toEqual([])
  })

  test('pins a deep oracle for every one of the 20 uses and the 137 throw channel', () => {
    expect(
      Object.fromEntries(
        C8_ITEM_IDS.map((itemId) => {
          const use = itemById(fixture.items, String(itemId)).use
          return [String(itemId), stableJsonSha256(use)]
        }),
      ),
    ).toEqual(C8_ITEM_USE_GOLDEN)
    expect(stableJsonSha256(itemById(fixture.items, '137').throw)).toBe(C8_ITEM_137_THROW_GOLDEN)
    expect(itemById(fixture.items, '285').use).toMatchObject({
      effects: [
        {
          kind: 'placeEntityInFront',
          target: { scene: 's048', entity: 'e797' },
          state: 2,
        },
      ],
    })
    expect(itemById(fixture.items, '294').use).toMatchObject({
      effects: [
        {
          kind: 'placeEntityInFront',
          target: { scene: 's213', entity: 'e3606' },
          state: 2,
        },
      ],
    })
  })

  test('reuses 29 locale keys, owns 337 new keys, and resolves every dynamic selection/address', () => {
    const objects = c8CanonicalObjects(fixture)
    const localeReferences = new Set<string>()
    const entityAddresses: Array<{ scene: string; entity: string }> = []
    let dynamicSelections = 0
    const s273Selections: string[] = []

    for (const object of objects)
      visit(object, (record) => {
        for (const value of Object.values(record))
          if (typeof value === 'string' && Object.hasOwn(fixture.locale, value))
            localeReferences.add(value)

        if (typeof record.scene === 'string' && typeof record.entity === 'string')
          entityAddresses.push({ scene: record.scene, entity: record.entity })

        if (record.kind === 'selectEntityBehavior') {
          const target = record.target as { scene?: unknown; entity?: unknown }
          const channel = record.channel
          const selection = record.selection as { kind?: unknown; value?: unknown }
          if (
            selection.kind !== 'use' ||
            typeof selection.value !== 'string' ||
            typeof target.scene !== 'string' ||
            typeof target.entity !== 'string' ||
            (channel !== 'trigger' && channel !== 'auto')
          )
            return
          dynamicSelections++
          const entity = fixture.scenesById
            .get(target.scene)
            ?.entities.find((candidate) => candidate.id === target.entity)
          expect(
            entity?.behaviors?.[channel]?.[selection.value],
            `${target.scene}/${target.entity}/${channel}/${selection.value}`,
          ).toBeDefined()
        }

        if (record.kind === 'selectSceneHooks') {
          const sceneId = record.scene
          const selection = record.selection as
            | Record<string, { kind?: unknown; value?: unknown }>
            | undefined
          if (typeof sceneId !== 'string' || !selection) return
          for (const hook of ['onEnter', 'onTeleport'] as const) {
            const slot = selection[hook]
            if (slot?.kind !== 'use' || typeof slot.value !== 'string') continue
            dynamicSelections++
            expect(
              fixture.scenesById.get(sceneId)?.hooks?.[hook]?.variants[slot.value],
              `${sceneId}/${hook}/${slot.value}`,
            ).toBeDefined()
            if (sceneId === 's273') s273Selections.push(slot.value)
          }
        }
      })

    const referencedNew = [...localeReferences].filter(
      (key) => !Object.hasOwn(fixture.baseLocale, key),
    )
    const referencedReused = [...localeReferences].filter((key) =>
      Object.hasOwn(fixture.baseLocale, key),
    )
    const ownedLocale = fixture.generated.c8Evidence.ownedTargets
      .filter(({ identity }) => identity.kind === 'locale')
      .map(({ identity }) => (identity.kind === 'locale' ? identity.key : ''))
      .sort()
    expect(localeReferences).toHaveLength(366)
    expect(referencedNew).toHaveLength(337)
    expect(referencedReused).toHaveLength(29)
    expect(ownedLocale).toEqual(referencedNew.sort())

    expect(dynamicSelections).toBeGreaterThan(0)
    expect(entityAddresses.length).toBeGreaterThan(0)
    for (const address of entityAddresses)
      expect(
        fixture.scenesById
          .get(address.scene)
          ?.entities.some((entity) => entity.id === address.entity),
        `${address.scene}/${address.entity}`,
      ).toBe(true)

    const ownedS273 = fixture.generated.c8Evidence.ownedTargets.filter(
      ({ identity }) => identity.kind === 'scene-hook' && identity.sceneId === 's273',
    )
    expect(ownedS273).toHaveLength(1)
    expect(s273Selections).toHaveLength(2)
    expect(new Set(s273Selections)).toEqual(
      new Set([
        ownedS273[0]?.identity.kind === 'scene-hook' ? ownedS273[0].identity.hookId : 'missing',
      ]),
    )

    const ownerAndFlow = fixture.generated.c8Evidence.ownedTargets.flatMap(({ identity }) => {
      if (identity.kind !== 'entity-behavior' && identity.kind !== 'scene-hook') return []
      const target = ownedTarget(fixture.scenesById, identity)
      const owner =
        identity.kind === 'entity-behavior'
          ? [identity.kind, identity.sceneId, identity.entityId, identity.channel]
          : [identity.kind, identity.sceneId, identity.hook]
      return [stableJson({ owner, flow: (target as { flow?: unknown } | undefined)?.flow })]
    })
    expect(new Set(ownerAndFlow).size).toBe(ownerAndFlow.length)
  })

  test('seals sprite 259 with its physical static layout without reopening P7', () => {
    const sprite = fixture.sprites.find(({ id }) => id === 'sprite-259')
    expect(sprite).toMatchObject({
      id: 'sprite-259',
      asset: 'sprite.pal.259',
      layout: { kind: 'static' },
    } satisfies Partial<SpriteDef>)
    const assetCatalog = required<{
      assets: Record<
        string,
        { kind: string; path: string; origin?: { kind?: string; ref?: string } }
      >
    }>(fixture.generated.snapshot.files, 'assets/index.json')
    expect(assetCatalog.assets['sprite.pal.259']).toMatchObject({
      kind: 'sprite',
      path: 'assets/migrated/sprites/259.rle',
      origin: { kind: 'legacy-migrated', ref: 'sprite/259.rle' },
    })
    expect(
      fixture.generated.c8Evidence.ownedTargets.find(
        ({ identity }) => identity.kind === 'sprite' && identity.spriteId === 'sprite-259',
      ),
    ).toEqual({
      identity: { kind: 'sprite', spriteId: 'sprite-259' },
      digest: stableJsonSha256(sprite),
    })

    const baselineState = JSON.parse(readFileSync(baselineStatePath, 'utf8')) as {
      transitions: Record<string, string>
    }
    const p7Ledger = JSON.parse(readFileSync(p7LedgerPath, 'utf8')) as { digest: string }
    expect(baselineState.transitions['script-v4-v5']).toBe(P7_FROZEN_LEDGER_DIGEST)
    expect(p7Ledger.digest).toBe(P7_FROZEN_LEDGER_DIGEST)
    expect(fixture.generated.project.report).toEqual({
      sceneCount: 294,
      itemCount: 234,
      pageCount: 3_616,
      ownerCount: 4_584,
      entityBehaviorCount: 4_300,
      sceneHookCount: 284,
      simpleOwnerCount: 4_519,
      stateMachineOwnerCount: 65,
      simpleStageCount: 6_396,
      stateMachineStateCount: 771,
      canonicalFlowNodeCount: 7_167,
      itemPrivateScriptCount: 6,
      sharedScriptCount: 0,
    })
  })
})
