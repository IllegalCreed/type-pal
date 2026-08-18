import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  type ItemDataV5,
  type MigrationDiagnosticsV1,
  type SceneDefV5,
  type ScriptFlowV5,
  type SpriteDef,
  validateItemsV5,
  validateLocale,
  validateMigrationDiagnostics,
  validateSprites,
} from '@type-pal/content'
import { beforeAll, describe, expect, test } from 'vitest'
import { validateHistoricalScenesForCurrentSchema } from '../../historical-enemy-team-authority.js'
import type { MigrationJson } from '../../pal-migration.js'
import { createPalR13TranslationSession } from '../../pal-migration.js'
import {
  C8_AUTO_TERMINAL_ORACLE,
  C8_ITEM_IDS,
  C8_STORY_ITEM_ROOTS,
  type C8OwnedIdentityV1,
} from './c8-item-use-augmentation.js'
import { getPalTestGeneratedFixture } from './pal-test-fixture.js'
import {
  augmentR13TriggerActivations,
  R13_DELAYED_TRIGGER_OWNERS,
  R13_PERSISTENT_CHECKPOINT_OWNERS,
  type R13CheckpointOwnerSpec,
} from './r13-trigger-activation-graph.js'
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
  const { sources, migration, generated } = getPalTestGeneratedFixture()
  const sceneIds = required<string[]>(generated.snapshot.files, 'content/scenes/index.json')
  const scenes = validateHistoricalScenesForCurrentSchema(
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
    // Immutable content7 parent 故意没有 throw.target；这里只做历史 digest oracle，
    // 不能拿 current content8 validator 反向改写或拒绝它。
    parentItems: required<ItemDataV5[]>(
      generated.r13CrossActivationParentSnapshot.files,
      'content/items.json',
    ),
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

function r13OwnerFlow(
  scenes: ReadonlyMap<string, SceneDefV5>,
  spec: R13CheckpointOwnerSpec,
): ScriptFlowV5 | undefined {
  const scene = scenes.get(spec.sceneId)
  if (spec.kind === 'entity')
    return scene?.entities.find((entity) => entity.id === spec.entityId)?.behaviors?.[
      spec.channel
    ]?.[spec.behaviorId]?.flow
  return scene?.hooks?.[spec.slot]?.variants[spec.hookId]?.flow
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
    // C8 的历史 deep oracle 只约束 immutable R13-2 parent；R13-3 successor 会为
    // 同一 throw 合法追加 target/完整效果，不能反向污染旧证明。
    expect(stableJsonSha256(itemById(fixture.parentItems, '137').throw)).toBe(
      C8_ITEM_137_THROW_GOLDEN,
    )
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
      simpleOwnerCount: 4_497,
      stateMachineOwnerCount: 87,
      simpleStageCount: 6_728,
      stateMachineStateCount: 1_190,
      canonicalFlowNodeCount: 7_918,
      itemPrivateScriptCount: 6,
      sharedScriptCount: 0,
    })
  })

  test('terminalizes the exact nine C8 auto allocations with a persistent empty stage', () => {
    expect(C8_AUTO_TERMINAL_ORACLE).toHaveLength(9)
    for (const expected of C8_AUTO_TERMINAL_ORACLE) {
      expect(
        fixture.generated.autoLifecycleRepairEvidence.targets.find(
          (target) =>
            target.sceneId === expected.sceneId &&
            target.entityId === expected.entityId &&
            target.behaviorId === expected.behaviorId,
        ),
      ).toMatchObject({
        installerAddress: expected.installer,
        installerOwnerWord: expected.ownerWord,
        sourceRoot: expected.root,
      })
      const flow = fixture.scenesById
        .get(expected.sceneId)
        ?.entities.find((entity) => entity.id === expected.entityId)?.behaviors?.auto?.[
        expected.behaviorId
      ]?.flow
      expect(flow?.kind, `${expected.sceneId}/${expected.entityId}/${expected.behaviorId}`).toBe(
        'stages',
      )
      if (flow?.kind !== 'stages') continue
      expect(flow.stages.map((stage) => stage.id)).toEqual([flow.initial, 'completed'])
      expect(flow.stages[0]?.next).toBe('completed')
      expect(flow.stages[1]?.body).toEqual([])
    }
  })

  test('projects the exact 34 R13 checkpoint owners into address-free state machines', () => {
    const evidence = fixture.generated.triggerActivationEvidence
    expect(evidence).toMatchObject({
      kind: 'r13-trigger-activation-evidence',
      version: 1,
      persistentClosures: 34,
      coveredSourceCheckpoints: 34,
      resetOverrideSourceCheckpoints: [763],
      existingRepairSourceCheckpoints: [10747],
      discardReturnContexts: 7,
      directDeferredRegistryScripts: 32,
      consumedDeferredRegistryClosureScripts: 39,
    })
    expect(R13_PERSISTENT_CHECKPOINT_OWNERS).toHaveLength(34)
    expect(evidence.owners).toHaveLength(34)
    expect(new Set(evidence.owners.map(({ ownerKey }) => ownerKey)).size).toBe(34)
    expect(
      evidence.owners.map(({ checkpointAddress }) => checkpointAddress).sort((a, b) => a - b),
    ).toEqual(
      R13_PERSISTENT_CHECKPOINT_OWNERS.map(({ checkpointAddress }) => checkpointAddress).sort(
        (a, b) => a - b,
      ),
    )

    for (const spec of R13_PERSISTENT_CHECKPOINT_OWNERS) {
      const owner = evidence.owners.find(
        ({ checkpointAddress }) => checkpointAddress === spec.checkpointAddress,
      )
      expect(owner, `checkpoint ${spec.checkpointAddress}`).toBeDefined()
      expect(owner).toMatchObject({
        rootAddress: spec.rootAddress,
        checkpointAddress: spec.checkpointAddress,
        resumeAddress: spec.checkpointAddress + 1,
      })
      const flow = r13OwnerFlow(fixture.scenesById, spec)
      expect(flow?.kind, owner?.ownerKey).toBe('stateMachine')
      if (flow?.kind !== 'stateMachine' || !owner) continue
      expect(flow.machine.id).toBe('machine')
      expect(Object.keys(flow.machine.states)).toHaveLength(owner.stateCount)
      for (const state of owner.durableStates) {
        expect(state.dialogueCarryDigest).toMatch(/^[a-f0-9]{64}$/)
        expect(state.stateId).toMatch(
          /^(?:initial|after-checkpoint(?:-\d{3})?|phase-\d{3}|continuation-\d{3})$/,
        )
        expect(
          flow.machine.states[state.stateId],
          `${owner.ownerKey}/${state.stateId}`,
        ).toBeDefined()
      }
      expect(stableJson(flow)).not.toContain(`L-${spec.rootAddress}`)
      expect(stableJson(flow)).not.toContain(`L-${spec.checkpointAddress}`)
    }
  })

  test('fails loudly when a lifted scene entry no longer matches its source prefix', () => {
    const parent = fixture.generated.r13CadenceParentSnapshot
    const files = new Map(parent.files)
    const scene = structuredClone(required<SceneDefV5>(files, 'content/scenes/s057.json'))
    const flow = scene.hooks?.onEnter?.variants.default?.flow
    expect(flow?.kind).toBe('stages')
    if (flow?.kind !== 'stages') return
    const initial = flow.stages.find((stage) => stage.id === flow.initial)
    expect(initial?.entry).toBeDefined()
    if (!initial?.entry) return
    initial.entry.prepare.push({ kind: 'stopMusic' })
    files.set('content/scenes/s057.json', scene as unknown as MigrationJson)

    expect(() =>
      augmentR13TriggerActivations({
        snapshot: { ...parent, files },
        ir: fixture.generated.ir,
        translation: createPalR13TranslationSession(fixture.migration),
      }),
    ).toThrow(/hook:s057:onEnter:default.*scene entry 与 source 正文前缀不一致/)
  }, 30_000)

  test('keeps PAL R13 translation sessions process-local, fresh, and fail-loud on closure drift', () => {
    const first = createPalR13TranslationSession(fixture.migration)
    const second = createPalR13TranslationSession(fixture.migration)
    expect(first.ctx).not.toBe(second.ctx)
    first.ctx.locale['test.r13-pal-session-isolation'] = 'first'
    expect(second.finish().locale['test.r13-pal-session-isolation']).toBeUndefined()
    expect(() => createPalR13TranslationSession({ ...fixture.migration })).toThrow(
      /必须使用本进程 buildPalMigration 返回的原始 MigrationFileSet/,
    )

    const translation = createPalR13TranslationSession(fixture.migration)
    const finish = translation.finish
    expect(() =>
      augmentR13TriggerActivations({
        snapshot: fixture.generated.r13CadenceParentSnapshot,
        ir: fixture.generated.ir,
        translation: {
          ...translation,
          finish: () => {
            const output = finish()
            const firstAudit = output.scriptRegistryAudit[0]
            if (firstAudit) delete output.scriptRegistryBodies[firstAudit.id]
            return output
          },
        },
      }),
    ).toThrow(/deferred registry 缺少脚本体/)
  }, 30_000)

  test('pins dialogue-carry durable identities and the sole 6344 alias fold', () => {
    const owners = fixture.generated.triggerActivationEvidence.owners
    const expectedDurableAddresses = new Map<number, number[]>([
      [575, [569, 576]],
      [6344, [6343, 6344, 6345, 6345]],
      [6390, [6379, 6391]],
      [7489, [7482, 7482, 7490, 7490]],
      [1575, [1557, 1568, 1576]],
      [10315, [10245, 10281, 10281, 10309, 10316]],
      [17569, [17554, 17570]],
      [19301, [19253, 19266, 19286, 19302]],
    ])
    for (const [checkpointAddress, expected] of expectedDurableAddresses) {
      const owner = owners.find((candidate) => candidate.checkpointAddress === checkpointAddress)
      expect(
        owner?.durableStates.map(({ sourceAddress }) => sourceAddress),
        `checkpoint ${checkpointAddress}`,
      ).toEqual(expected)
      const byAddress = new Map<number, string[]>()
      for (const state of owner?.durableStates ?? []) {
        const digests = byAddress.get(state.sourceAddress) ?? []
        digests.push(state.dialogueCarryDigest)
        byAddress.set(state.sourceAddress, digests)
      }
      for (const [sourceAddress, digests] of byAddress) {
        if (digests.length < 2) continue
        expect(
          new Set(digests).size,
          `checkpoint ${checkpointAddress} / durable ${sourceAddress}`,
        ).toBe(digests.length)
      }
    }

    const folded = owners.find(({ checkpointAddress }) => checkpointAddress === 6344)
    expect(folded).toMatchObject({
      stateCount: 5,
      checkpointAliasesFolded: 3,
    })
    expect(
      owners
        .filter(({ checkpointAddress }) => checkpointAddress !== 6344)
        .map(({ checkpointAliasesFolded }) => checkpointAliasesFolded),
    ).toEqual(Array.from({ length: 33 }, () => 0))
  })

  test('projects the exact seven trigger delayed-goto owners without replacing e9 legacy-002', () => {
    const evidence = fixture.generated.triggerActivationEvidence
    expect(evidence).toMatchObject({
      delayedGotoAddresses: 9,
      delayedGotoOwners: 7,
      delayedGotoOwnerExpandedPhases: 41,
    })
    expect(R13_DELAYED_TRIGGER_OWNERS).toHaveLength(7)
    expect(evidence.delayedOwners).toHaveLength(7)
    const delayedSites: Array<{
      sourceAddress: number
      targetAddress: number
      fallthroughAddress: number
      threshold: number
      sourceWaitFrames: 0 | 1
    }> = []
    for (const owner of R13_DELAYED_TRIGGER_OWNERS) delayedSites.push(...owner.delayedGotos)
    expect(
      delayedSites.map(({ sourceAddress }) => sourceAddress).sort((left, right) => left - right),
    ).toEqual([193, 205, 32097, 32209, 33696, 33964, 33972, 35054, 35062])
    expect(delayedSites.reduce((sum, { threshold }) => sum + threshold, 0)).toBe(41)
    expect(evidence.delayedOwners.flatMap(({ delayedGotos }) => delayedGotos)).toEqual(
      expect.arrayContaining(delayedSites.map((site) => ({ ...site }))),
    )

    const parentScene = required<SceneDefV5>(
      fixture.generated.r13CadenceParentSnapshot.files,
      'content/scenes/s001.json',
    )
    const before = parentScene.entities.find(({ id }) => id === 'e9')?.behaviors?.trigger?.[
      'legacy-002'
    ]
    const after = fixture.scenesById.get('s001')?.entities.find(({ id }) => id === 'e9')?.behaviors
      ?.trigger?.['legacy-002']
    expect(stableJson(after)).toBe(stableJson(before))
  })

  test('materializes the two newly reachable deferred trigger behaviors locally', () => {
    const expected = [
      { sceneId: 's053', entityId: 'e905', behaviorId: 'legacy-002', rootAddress: 10635 },
      { sceneId: 's053', entityId: 'e908', behaviorId: 'legacy-002', rootAddress: 10639 },
    ] as const
    expect(
      fixture.generated.triggerActivationEvidence.restoredEntityBehaviors.map(
        ({ bodyDigest, ...entry }) => ({
          ...entry,
          digestShape: /^[a-f0-9]{64}$/.test(bodyDigest),
        }),
      ),
    ).toEqual(
      expected.map((entry) => ({
        ...entry,
        channel: 'trigger',
        digestShape: true,
      })),
    )
    for (const target of expected) {
      const behavior = fixture.scenesById
        .get(target.sceneId)
        ?.entities.find(({ id }) => id === target.entityId)?.behaviors?.trigger?.[target.behaviorId]
      expect(behavior?.flow.kind, `${target.sceneId}/${target.entityId}`).toBe('stages')
      if (behavior?.flow.kind !== 'stages') continue
      expect(behavior.flow.stages).toHaveLength(1)
      expect(behavior.flow.stages[0]?.body.length).toBeGreaterThan(0)
      expect(
        countKinds(behavior.flow, new Set(['legacyRaw', 'runScript', 'callScript', 'jumpScript'])),
      ).toBe(0)
    }
    expect(fixture.locale).toMatchObject({
      'spk.韩医仙': '韩医仙',
      'spk.韩梦慈': '韩梦慈',
    })
    expect(Object.values(fixture.locale)).toContain('快让赵姑娘服药吧')
    expect(Object.values(fixture.locale)).toContain('辛苦你们了．．')
  })

  test('projects all idle gates, delayed gotos, restored s231 autos, and cursor handoffs', () => {
    const evidence = fixture.generated.autoIdleGateEvidence
    expect(evidence).toMatchObject({
      kind: 'r13-auto-idle-gate-evidence',
      version: 1,
      sourceGateAddresses: 11,
      entityOwners: 12,
      executionSites: 13,
      ownerExpandedGatePhases: 84,
      delayedGotoAddresses: 8,
      delayedGotoExecutionSites: 15,
      delayedGotoOwnerExpandedPhases: 1657,
      steadyAutoOwners: 15,
      restoredAutoOwners: 16,
      cursorHandoffCases: {
        e405Forward: 1,
        e4168Forward: 16,
        s231CrowdForward: 176,
        e4409Forward: 13,
        e4440Forward: 15,
        e4723Forward: 24,
        reverse: 2,
      },
    })
    expect(evidence.owners).toHaveLength(12)
    expect(evidence.steadyOwners).toHaveLength(15)
    expect(evidence.restoredOwners).toHaveLength(16)
    expect(evidence.installerOwners.reduce((sum, owner) => sum + owner.commands, 0)).toBe(18)
    expect(evidence.installerOwners.reduce((sum, owner) => sum + owner.cases, 0)).toBe(247)
    expect(evidence.owners.reduce((sum, owner) => sum + owner.gateAddresses.length, 0)).toBe(13)
    expect(evidence.owners.reduce((sum, owner) => sum + owner.gatePhaseCount, 0)).toBe(84)

    const e405Installers: Array<Record<string, unknown>> = []
    visit(fixture.scenesById.get('s021'), (command) => {
      if (
        command.kind === 'selectEntityBehavior' &&
        (command.target as { entity?: string } | undefined)?.entity === 'e405' &&
        (command.selection as { value?: string } | undefined)?.value === 'legacy-001'
      )
        e405Installers.push(command)
    })
    expect(e405Installers).toHaveLength(1)
    expect(e405Installers[0]?.cursorHandoff).toEqual({
      kind: 'stateMap',
      fromBehavior: 'default',
      cases: [
        {
          from: {
            kind: 'state',
            machine: 'machine',
            state: 'first-wait-06',
          },
          to: {
            kind: 'state',
            machine: 'machine',
            state: 'cycle-01-phase-06',
          },
        },
      ],
      onUnmapped: 'error',
    })

    for (const owner of evidence.owners) {
      const [sceneId, entityId, , behaviorId] = owner.ownerKey.split('/')
      const flow = fixture.scenesById.get(sceneId!)?.entities.find(({ id }) => id === entityId)
        ?.behaviors?.auto?.[behaviorId!]?.flow
      expect(flow?.kind, owner.ownerKey).toBe('stateMachine')
      if (flow?.kind !== 'stateMachine') continue
      expect(flow.machine.cadence).toBe('transition')
      expect(Object.keys(flow.machine.states)).toHaveLength(owner.productStates)
      expect(stableJson(flow)).not.toMatch(/source-\d|L[_-]\d/)
    }

    const s231e4167 = fixture.scenesById.get('s231')?.entities.find(({ id }) => id === 'e4167')
    expect(s231e4167?.pages?.[0]).toMatchObject({ auto: 'default' })
    expect(s231e4167?.pages?.[0]?.animation).toBeUndefined()
    expect(s231e4167?.behaviors?.auto?.default?.flow.kind).toBe('stateMachine')
    const s231e4168 = fixture.scenesById.get('s231')?.entities.find(({ id }) => id === 'e4168')
    expect(
      Object.fromEntries(
        Object.entries(s231e4168?.behaviors?.auto ?? {}).map(([id, behavior]) => [
          id,
          { order: behavior.order, kind: behavior.flow.kind },
        ]),
      ),
    ).toEqual({
      'legacy-001': { order: 1, kind: 'stateMachine' },
      'legacy-002': { order: 2, kind: 'stateMachine' },
      'legacy-003': { order: 3, kind: 'stateMachine' },
      'legacy-004': { order: 4, kind: 'stateMachine' },
    })
    expect(
      evidence.restoredOwners
        .filter(({ ownerKey }) => ownerKey.includes('/e4168/'))
        .map(({ rootAddress }) => rootAddress)
        .sort((a, b) => a - b),
    ).toEqual([32021, 32218, 32222])

    const e4168Installers: Array<Record<string, unknown>> = []
    visit(fixture.scenesById.get('s231')?.hooks?.onEnter?.variants.default?.flow, (command) => {
      if (
        command.kind === 'selectEntityBehavior' &&
        (command.target as { entity?: string } | undefined)?.entity === 'e4168' &&
        command.channel === 'auto' &&
        (command.selection as { kind?: string } | undefined)?.kind === 'use'
      )
        e4168Installers.push(command)
    })
    expect(
      e4168Installers.map((command) => (command.selection as { value?: string }).value).sort(),
    ).toEqual(['legacy-001', 'legacy-002', 'legacy-003', 'legacy-004'])
    const fourth = e4168Installers.find(
      (command) => (command.selection as { value?: string } | undefined)?.value === 'legacy-004',
    )
    const fourthHandoff = fourth?.cursorHandoff as
      | {
          fromBehavior?: string
          cases?: Array<{ from: unknown; to: unknown }>
          onUnmapped?: string
        }
      | undefined
    expect(fourthHandoff).toMatchObject({
      fromBehavior: 'legacy-003',
      onUnmapped: 'error',
    })
    expect(fourthHandoff?.cases).toHaveLength(16)
    expect(fourthHandoff?.cases?.slice(0, 4)).toEqual([
      {
        from: { kind: 'state', machine: 'machine', state: 'idle-wait' },
        to: { kind: 'state', machine: 'machine', state: 'entry' },
      },
      {
        from: { kind: 'state', machine: 'machine', state: 'idle-wait-phase-02' },
        to: { kind: 'state', machine: 'machine', state: 'entry-phase-02' },
      },
      {
        from: { kind: 'state', machine: 'machine', state: 'idle-wait-phase-03' },
        to: { kind: 'state', machine: 'machine', state: 'entry-phase-03' },
      },
      {
        from: { kind: 'state', machine: 'machine', state: 'idle-wait-phase-04' },
        to: { kind: 'state', machine: 'machine', state: 'entry-phase-03' },
      },
    ])

    for (const [entityId, rootAddress] of [
      ['e4156', 32228],
      ['e4157', 32234],
      ['e4158', 32240],
      ['e4159', 32246],
      ['e4160', 32253],
      ['e4161', 32259],
      ['e4162', 32265],
      ['e4163', 32270],
      ['e4164', 32276],
      ['e4165', 32283],
      ['e4166', 32289],
    ] as const) {
      const entity = fixture.scenesById.get('s231')?.entities.find(({ id }) => id === entityId)
      expect(entity?.behaviors?.auto?.default?.flow.kind, `${entityId}/default`).toBe(
        'stateMachine',
      )
      expect(entity?.behaviors?.auto?.['legacy-001']?.flow.kind, `${entityId}/legacy`).toBe(
        'stateMachine',
      )
      expect(
        evidence.restoredOwners.find(({ ownerKey }) => ownerKey.includes(`/${entityId}/`))
          ?.rootAddress,
      ).toBe(rootAddress)
      const installers: Array<Record<string, unknown>> = []
      visit(fixture.scenesById.get('s231')?.hooks?.onEnter?.variants.default?.flow, (command) => {
        if (
          command.kind === 'selectEntityBehavior' &&
          (command.target as { entity?: string } | undefined)?.entity === entityId &&
          command.channel === 'auto' &&
          (command.selection as { value?: string } | undefined)?.value === 'legacy-001'
        )
          installers.push(command)
      })
      expect(installers, `${entityId} installer`).toHaveLength(1)
      expect(
        installers[0]?.cursorHandoff as
          | { fromBehavior?: string; cases?: unknown[]; onUnmapped?: string }
          | undefined,
      ).toMatchObject({
        fromBehavior: 'default',
        cases: expect.arrayContaining([]),
        onUnmapped: 'error',
      })
      expect(
        (installers[0]?.cursorHandoff as { cases?: unknown[] } | undefined)?.cases,
      ).toHaveLength(16)
    }

    for (const [entityId, rootAddress] of [
      ['e4410', 33641],
      ['e4413', 33786],
    ] as const) {
      const behavior = fixture.scenesById.get('s250')?.entities.find(({ id }) => id === entityId)
        ?.behaviors?.auto?.['legacy-001']
      expect(behavior?.flow.kind, `${entityId}/legacy`).toBe('stateMachine')
      expect(
        evidence.restoredOwners.find(({ ownerKey }) => ownerKey.includes(`/${entityId}/`))
          ?.rootAddress,
      ).toBe(rootAddress)
    }

    for (const [sceneId, entityId, expectedCases, reverseTarget] of [
      ['s250', 'e4409', 13, 'pursuit'],
      ['s252', 'e4440', 15, 'post-pursuit'],
    ] as const) {
      const entity = fixture.scenesById.get(sceneId)?.entities.find(({ id }) => id === entityId)
      const forward: Array<Record<string, unknown>> = []
      visit(entity?.behaviors?.trigger?.default?.flow, (command) => {
        if (
          command.kind === 'selectEntityBehavior' &&
          (command.target as { entity?: string } | undefined)?.entity === entityId &&
          command.channel === 'auto'
        )
          forward.push(command)
      })
      expect(forward).toHaveLength(1)
      expect(
        (forward[0]?.cursorHandoff as { cases?: unknown[] } | undefined)?.cases,
        `${sceneId}/${entityId} forward`,
      ).toHaveLength(expectedCases)

      const legacy = entity?.behaviors?.auto?.['legacy-001']?.flow
      expect(legacy?.kind).toBe('stateMachine')
      if (legacy?.kind !== 'stateMachine') continue
      const restore = legacy.machine.states['restore-touch']
      const reverse = restore?.body.find(
        (command) =>
          command.kind === 'selectEntityBehavior' &&
          command.channel === 'auto' &&
          command.selection.kind === 'use' &&
          command.selection.value === 'default',
      )
      expect((reverse as { cursorHandoff?: unknown } | undefined)?.cursorHandoff).toEqual({
        kind: 'stateMap',
        fromBehavior: 'legacy-001',
        cases: [
          {
            from: { kind: 'state', machine: 'machine', state: 'restore-touch' },
            to: { kind: 'state', machine: 'machine', state: reverseTarget },
          },
        ],
        onUnmapped: 'error',
      })
    }
  })
})
