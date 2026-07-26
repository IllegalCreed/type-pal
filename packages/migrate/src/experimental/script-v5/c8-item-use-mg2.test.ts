import { SCRIPT_V4_V5_SIDECAR_PATH, SCRIPT_V4_V5_TRANSITION_ID } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  baselineWrites,
  type MigrationSnapshot,
  serializeMigrationJson,
  sha256,
} from '../../migration-baseline.js'
import type { MigrationJson } from '../../pal-migration.js'
import {
  C8_ITEM_IDS,
  C8_ITEM_SOURCE_ROOTS,
  C8_STORY_ITEM_ROOTS,
  type C8ItemUseAugmentationEvidenceV1,
} from './c8-item-use-augmentation.js'
import {
  C8_ITEM_USE_SEAL_PATH,
  C8_ITEM_USE_TRANSITION_ID,
  createC8ItemUseV5MigrationPlan,
} from './c8-item-use-mg2.js'
import { P7_FULL_LEDGER_PATH } from './p7-mg2.js'
import { stableJsonSha256 } from './stable-json.js'

function signed<T extends Record<string, unknown>>(value: T): T & { digest: string } {
  return { ...value, digest: stableJsonSha256(value) }
}

function controls() {
  const sourceAuditDigest = 'a'.repeat(64)
  const compatibility = signed({
    legacyBindings: [],
    legacyCursors: [],
    legacyEntities: [],
    lineagePlans: { pages: [], stages: [] },
    localAllocations: [],
    targetClosures: [],
  })
  const ledger = signed({
    kind: 'script-identity-transition',
    version: 1,
    projectId: 'pal',
    transitionId: SCRIPT_V4_V5_TRANSITION_ID,
    sourceAudit: { digest: sourceAuditDigest },
    compatibility,
  })
  const sidecar = signed({
    version: 1,
    projectId: 'pal',
    transitionId: SCRIPT_V4_V5_TRANSITION_ID,
    fromContentVersion: 4,
    toContentVersion: 5,
    sourceAuditDigest,
    provenance: { kind: 'pal-baseline', fullLedgerDigest: ledger.digest },
    legacyBindings: [],
    legacyCursors: [],
    legacyEntities: [],
    lineagePlans: { pages: [], stages: [] },
    localAllocations: [],
    targetClosures: [],
  })
  return { ledger, sidecar }
}

function scene(): MigrationJson {
  return {
    id: 's001',
    mapId: 'm001',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [],
  }
}

function runnableItems(): MigrationJson {
  const ids = new Set(C8_ITEM_IDS.map(String))
  for (let id = 1; ids.size < 100; id++) ids.add(String(id))
  return [...ids]
    .sort((left, right) => Number(left) - Number(right))
    .map((id) => ({
      id,
      name: `物品 ${id}`,
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      use: {
        target: 'scene',
        consuming: false,
        effects: [
          {
            kind: 'modifyHostileAwareness',
            rangeMultiplier: 0,
            durationMs: 1,
          },
        ],
      },
      ...(id === '137'
        ? {
            throw: {
              effects: [
                { kind: 'currentHpDamage', numerator: 1, denominator: 2, bonus: 0, cap: 1 },
              ],
            },
          }
        : {}),
    })) as unknown as MigrationJson
}

function cloneSnapshot(source: MigrationSnapshot): MigrationSnapshot {
  return {
    files: new Map(
      [...source.files].map(([path, value]) => [path, structuredClone(value)] as const),
    ),
    managedFiles: new Set(source.managedFiles),
    ...(source.hashes ? { hashes: new Map(source.hashes) } : {}),
    ...(source.baselineMetadata
      ? { baselineMetadata: structuredClone(source.baselineMetadata) }
      : {}),
  }
}

function evidence(): C8ItemUseAugmentationEvidenceV1 {
  const usable = new Set(C8_ITEM_IDS.map(String))
  for (let id = 1; usable.size < 100; id++) usable.add(String(id))
  const gates = [...usable].sort((left, right) => Number(left) - Number(right))
  return {
    generator: { id: 'c8-item-use-augmentation', version: 1 },
    items: C8_ITEM_IDS.map((itemId) => {
      const roots = C8_ITEM_SOURCE_ROOTS.filter((root) => root.itemId === itemId)
      return {
        itemId: String(itemId),
        sourceRoots: roots.map((root) => ({
          channel: root.channel,
          address: root.address,
          closureDigest: stableJsonSha256(root),
        })),
        targets: roots.map((root) => ({
          channel: root.channel,
          identity:
            root.channel === 'use'
              ? ({ kind: 'item-use', itemId: String(itemId) } as const)
              : ({ kind: 'item-throw', itemId: String(itemId) } as const),
          digest: stableJsonSha256({ itemId, channel: root.channel }),
        })),
      }
    }),
    ownedTargets: [
      {
        identity: { kind: 'locale', key: 'c8.test' },
        digest: stableJsonSha256('test'),
      },
    ],
    diagnostics: {
      removedItemIds: C8_STORY_ITEM_ROOTS.map((entry) => String(entry.itemId)).sort(
        (left, right) => Number(left) - Number(right),
      ),
      remainingItemUseIds: [],
      sourceDigest: stableJsonSha256({ diagnostics: 'c8' }),
    },
    gates: {
      sourceUsableItemIds: gates,
      targetRunnableUseItemIds: [...gates],
      itemUseDiagnosticCount: 0,
    },
  }
}

function snapshots() {
  const { ledger, sidecar } = controls()
  const projectFiles = new Map<string, MigrationJson>([
    ['content/scenes/index.json', ['s001']],
    ['content/scenes/s001.json', scene()],
    ['content/items.json', runnableItems()],
    ['content/migration-diagnostics.json', { version: 1, diagnostics: [] }],
    ['content/shared-scripts.json', {}],
  ])
  const projectManaged = new Set(projectFiles.keys())
  const base: MigrationSnapshot = {
    files: new Map([
      ...projectFiles,
      [SCRIPT_V4_V5_SIDECAR_PATH, sidecar as unknown as MigrationJson] as const,
      [P7_FULL_LEDGER_PATH, ledger as unknown as MigrationJson] as const,
    ]),
    managedFiles: new Set([...projectManaged, SCRIPT_V4_V5_SIDECAR_PATH, P7_FULL_LEDGER_PATH]),
    baselineMetadata: {
      generatorEpoch: 'n3-script-v5-p7-v1',
      transitions: { [SCRIPT_V4_V5_TRANSITION_ID]: ledger.digest },
    },
  }
  const ours: MigrationSnapshot = {
    files: new Map([
      ...projectFiles,
      [SCRIPT_V4_V5_SIDECAR_PATH, sidecar as unknown as MigrationJson] as const,
    ]),
    managedFiles: new Set([...projectManaged, SCRIPT_V4_V5_SIDECAR_PATH]),
  }
  const generated: MigrationSnapshot = {
    files: new Map(projectFiles),
    managedFiles: new Set(projectManaged),
  }
  return { base, ours, generated, evidence: evidence() }
}

function replaySnapshots() {
  const initial = snapshots()
  const first = createC8ItemUseV5MigrationPlan(initial)
  const base = cloneSnapshot(first.nextBaseline)
  const seal = base.files.get(C8_ITEM_USE_SEAL_PATH)!
  base.hashes = new Map([
    [C8_ITEM_USE_SEAL_PATH, sha256(serializeMigrationJson(seal, C8_ITEM_USE_SEAL_PATH))],
  ])
  const ours = cloneSnapshot(initial.ours)
  // discoverProjectManagedFiles 会从 baseline 带入控制路径，但工程里没有控制文件。
  ours.managedFiles.add(C8_ITEM_USE_SEAL_PATH)
  return { ...initial, base, ours, first }
}

describe('C8 item-use append-only MG2 seal', () => {
  test('initialize only appends the baseline seal and never leaks it into project writes', () => {
    const args = snapshots()
    const result = createC8ItemUseV5MigrationPlan(args)
    expect(result.sealMode).toBe('initialize')
    expect(result.plan).toMatchObject({ conflicts: [], deletes: [] })
    expect(result.plan.writes.size).toBe(0)
    expect(result.target.files.has(C8_ITEM_USE_SEAL_PATH)).toBe(false)
    expect(result.target.managedFiles.has(C8_ITEM_USE_SEAL_PATH)).toBe(false)
    expect(result.nextBaseline.files.get(P7_FULL_LEDGER_PATH)).toEqual(
      args.base.files.get(P7_FULL_LEDGER_PATH),
    )
    expect(result.nextBaseline.files.get(C8_ITEM_USE_SEAL_PATH)).toEqual(result.seal)
    expect(result.nextBaseline.baselineMetadata?.transitions[C8_ITEM_USE_TRANSITION_ID]).toBe(
      result.seal.digest,
    )
    const writes = baselineWrites(result.nextBaseline)
    expect(writes.has(`packages/migrate/baselines/pal/${C8_ITEM_USE_SEAL_PATH}`)).toBe(true)
    expect([...writes.keys()].some((path) => path.startsWith('projects/pal/'))).toBe(false)
  })

  test('replay revalidates authority and remains a strict 0/0/0 plan', () => {
    const args = replaySnapshots()
    const result = createC8ItemUseV5MigrationPlan(args)
    expect(result.sealMode).toBe('replay')
    expect(result.seal).toEqual(args.first.seal)
    expect(result.plan.writes.size).toBe(0)
    expect(result.plan.deletes).toEqual([])
    expect(result.plan.conflicts).toEqual([])
    expect(result.target.files.has(C8_ITEM_USE_SEAL_PATH)).toBe(false)
  })

  test('preserves the published JSON representation for equal subtrees', () => {
    const args = snapshots()
    const publishedScene: MigrationJson = {
      entities: [],
      entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
      mapId: 'm001',
      id: 's001',
    }
    const generatedScene: MigrationJson = {
      id: 's001',
      mapId: 'm001',
      entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
      entities: [],
      hooks: {},
    }
    args.base.files.set('content/scenes/s001.json', publishedScene)
    args.ours.files.set('content/scenes/s001.json', structuredClone(publishedScene))
    args.generated.files.set('content/scenes/s001.json', generatedScene)

    const result = createC8ItemUseV5MigrationPlan(args)
    expect(result.plan.writes.has('content/scenes/s001.json')).toBe(true)
    const next = result.nextBaseline.files.get('content/scenes/s001.json') as Record<
      string,
      MigrationJson
    >
    expect(Object.keys(next)).toEqual(['entities', 'entry', 'mapId', 'id', 'hooks'])
  })

  test.each([
    {
      name: '删除 use',
      mutate: (items: Array<Record<string, MigrationJson>>) => {
        delete items.find((item) => item.id === '90')!.use
      },
      message: /target runnable/,
    },
    {
      name: '保留空 use 效果链',
      mutate: (items: Array<Record<string, MigrationJson>>) => {
        const use = items.find((item) => item.id === '90')!.use as Record<string, MigrationJson>
        use.effects = []
      },
      message: /target runnable/,
    },
    {
      name: '删除 137 throw',
      mutate: (items: Array<Record<string, MigrationJson>>) => {
        delete items.find((item) => item.id === '137')!.throw
      },
      message: /137\.throw 不可运行/,
    },
  ])('rejects final author target that $name', ({ mutate, message }) => {
    const args = snapshots()
    const items = structuredClone(args.ours.files.get('content/items.json')) as unknown as Array<
      Record<string, MigrationJson>
    >
    mutate(items)
    args.ours.files.set('content/items.json', items as unknown as MigrationJson)
    expect(() => createC8ItemUseV5MigrationPlan(args)).toThrow(message)
  })

  test('rejects item/use diagnostics added by the author merge', () => {
    const args = snapshots()
    args.ours.files.set('content/migration-diagnostics.json', {
      version: 1,
      diagnostics: [
        {
          id: 'item-use-90',
          severity: 'warn',
          target: {
            domain: 'item',
            objectId: '90',
            capability: 'use',
            label: '物品 90',
          },
          category: 'manual-review',
          reason: '测试诊断',
          source: { kind: 'legacy-script', label: 'L_1', address: 1 },
        },
      ],
    })
    expect(() => createC8ItemUseV5MigrationPlan(args)).toThrow(/final target 仍有 item\/use/)
  })

  test('rejects a final target with a dangling dynamic hook selection', () => {
    const args = snapshots()
    const hookScene: MigrationJson = {
      ...(scene() as Record<string, MigrationJson>),
      hooks: {
        onEnter: {
          initial: 'talk',
          variants: {
            talk: {
              label: '测试入口',
              order: 0,
              flow: {
                kind: 'stages',
                initial: 'initial',
                stages: [{ id: 'initial', body: [] }],
              },
            },
          },
        },
      },
    }
    for (const snapshot of [args.base, args.ours, args.generated])
      snapshot.files.set('content/scenes/s001.json', structuredClone(hookScene))
    for (const snapshot of [args.base, args.ours, args.generated]) {
      const items = structuredClone(snapshot.files.get('content/items.json')) as unknown as Array<
        Record<string, MigrationJson>
      >
      const item = items.find((candidate) => candidate.id === '260')!
      item.use = {
        target: 'scene',
        consuming: false,
        effects: [
          {
            kind: 'itemPrivateScript',
            script: {
              id: 'use',
              body: [
                {
                  kind: 'selectSceneHooks',
                  scene: 's001',
                  selection: { onEnter: { kind: 'use', value: 'talk' } },
                },
              ],
            },
          },
        ],
      }
      snapshot.files.set('content/items.json', items as unknown as MigrationJson)
    }
    const oursScene = structuredClone(hookScene) as Record<string, MigrationJson>
    delete oursScene.hooks
    args.ours.files.set('content/scenes/s001.json', oursScene)
    expect(() => createC8ItemUseV5MigrationPlan(args)).toThrow(/悬空 hook/)
  })

  test.each([
    'metadata',
    'file',
    'managed',
    'hash',
  ] as const)('rejects %s-only half-published state', (part) => {
    const args = snapshots()
    if (part === 'metadata')
      args.base.baselineMetadata!.transitions[C8_ITEM_USE_TRANSITION_ID] = 'f'.repeat(64)
    if (part === 'file') args.base.files.set(C8_ITEM_USE_SEAL_PATH, {})
    if (part === 'managed') args.base.managedFiles.add(C8_ITEM_USE_SEAL_PATH)
    if (part === 'hash') args.base.hashes = new Map([[C8_ITEM_USE_SEAL_PATH, 'f'.repeat(64)]])
    expect(() => createC8ItemUseV5MigrationPlan(args)).toThrow(/transition 半状态/)
  })

  test('rejects unsigned and re-signed seal tampering', () => {
    const unsigned = replaySnapshots()
    const raw = unsigned.base.files.get(C8_ITEM_USE_SEAL_PATH) as Record<string, MigrationJson>
    unsigned.base.files.set(C8_ITEM_USE_SEAL_PATH, { ...raw, projectId: 'tampered' })
    expect(() => createC8ItemUseV5MigrationPlan(unsigned)).toThrow(/自摘要不符/)

    const resigned = replaySnapshots()
    const changed = structuredClone(resigned.base.files.get(C8_ITEM_USE_SEAL_PATH)) as Record<
      string,
      MigrationJson
    >
    changed.diagnostics = {
      ...(resigned.first.seal.diagnostics as unknown as Record<string, MigrationJson>),
      sourceDigest: 'f'.repeat(64),
    }
    delete changed.digest
    const digest = stableJsonSha256(changed)
    resigned.base.files.set(C8_ITEM_USE_SEAL_PATH, { ...changed, digest })
    resigned.base.baselineMetadata!.transitions[C8_ITEM_USE_TRANSITION_ID] = digest
    expect(() => createC8ItemUseV5MigrationPlan(resigned)).toThrow(/权威重建证据/)
  })

  test('rejects authority/root drift, P7 drift, and control files in project inputs', () => {
    const authority = replaySnapshots()
    authority.evidence.items[0]!.sourceRoots[0]!.closureDigest = 'f'.repeat(64)
    expect(() => createC8ItemUseV5MigrationPlan(authority)).toThrow(/权威重建证据/)

    const root = snapshots()
    root.evidence.items[0]!.sourceRoots[0]!.address += 1
    expect(() => createC8ItemUseV5MigrationPlan(root)).toThrow(/source root 漂移/)

    const p7 = replaySnapshots()
    const ledger = p7.base.files.get(P7_FULL_LEDGER_PATH) as Record<string, MigrationJson>
    p7.base.files.set(P7_FULL_LEDGER_PATH, { ...ledger, projectId: 'tampered' })
    expect(() => createC8ItemUseV5MigrationPlan(p7)).toThrow(/自摘要不符/)

    const generated = snapshots()
    generated.generated.files.set(C8_ITEM_USE_SEAL_PATH, {})
    expect(() => createC8ItemUseV5MigrationPlan(generated)).toThrow(/generated 不得携带/)

    const ours = snapshots()
    ours.ours.files.set(C8_ITEM_USE_SEAL_PATH, {})
    expect(() => createC8ItemUseV5MigrationPlan(ours)).toThrow(/project 不得携带/)
  })
})
