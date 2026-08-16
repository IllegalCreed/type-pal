import { isDeepStrictEqual } from 'node:util'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { BattleFieldDef, ManifestV14 } from '@type-pal/content'
import {
  type MigrationSnapshot,
  serializeMigrationJson,
  sha256,
} from './migration-baseline.js'
import type { MigrationJson } from './pal-migration.js'

const mocks = vi.hoisted(() => ({
  rewindC1: vi.fn(({ source }: { source: MigrationSnapshot }) => source),
}))

vi.mock('./pal-c1-npc-curation-transition.js', () => ({
  C1_NPC_CURATION_TRANSITION_ID: 'c1-npc-curation-v1',
  rewindPublishedC1NpcCurationIfPresent: mocks.rewindC1,
}))

import {
  B2_BATTLE_FIELD_DOMAIN_SEAL_PATH,
  B2_BATTLE_FIELD_DOMAIN_TRANSITION_ID,
  buildPalB2BattleFieldDomainMigration,
  PAL_B2_BATTLE_FIELD_PATH,
  rewindPublishedB2BattleFieldDomainIfPresent,
  rewindPublishedB2BattleFieldProjectAgainstPublishedBaseline,
} from './pal-b2-battle-field-domain.js'

const manifest = {
  id: 'pal',
  name: 'PAL',
  contentVersion: 14,
  minimumSaveVersion: 8,
  entryScene: 's000',
  content: {},
  assets: { catalog: 'assets/index.json', roles: {} },
  startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
} as unknown as ManifestV14
const manifestRawText = `${JSON.stringify(manifest, null, 2)}\n`

function field(id: number): BattleFieldDef {
  return {
    id,
    screenWave: 0,
    magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    ...(id >= 6
      ? { background: `battle-background.pal.${String(id).padStart(3, '0')}` }
      : {}),
  }
}

function fileHash(value: unknown, path: string): string {
  return sha256(serializeMigrationJson(value as never, path))
}

function asJson(value: unknown): MigrationJson {
  return JSON.parse(JSON.stringify(value)) as MigrationJson
}

function parentSnapshot(): MigrationSnapshot {
  const fields = Array.from({ length: 58 }, (_, id) => field(id))
  const other = { stable: true }
  return {
    files: new Map([
      [PAL_B2_BATTLE_FIELD_PATH, asJson(fields)],
      ['content/other.json', asJson(other)],
    ]),
    managedFiles: new Set([PAL_B2_BATTLE_FIELD_PATH, 'content/other.json']),
    hashes: new Map([
      [PAL_B2_BATTLE_FIELD_PATH, fileHash(fields, PAL_B2_BATTLE_FIELD_PATH)],
      ['content/other.json', fileHash(other, 'content/other.json')],
    ]),
    baselineMetadata: {
      generatorEpoch: 'test-c1',
      transitions: { 'c1-npc-curation-v1': 'c'.repeat(64) },
    },
  }
}

function cloneSnapshot(source: MigrationSnapshot): MigrationSnapshot {
  return {
    files: new Map([...source.files].map(([path, value]) => [path, structuredClone(value)])),
    managedFiles: new Set(source.managedFiles),
    ...(source.hashes ? { hashes: new Map(source.hashes) } : {}),
    ...(source.baselineMetadata
      ? { baselineMetadata: structuredClone(source.baselineMetadata) }
      : {}),
  }
}

beforeEach(() => vi.clearAllMocks())

describe('B2 PAL battlefield domain successor', () => {
  test('publishes 58→52, seals the removed payload, and rewinds byte-exact', () => {
    const parent = parentSnapshot()
    const source = Array.from({ length: 58 }, (_, id) => {
      const value = field(id)
      delete value.background
      return value
    })
    const result = buildPalB2BattleFieldDomainMigration({
      baseline: parent,
      manifest,
      manifestRawText,
      sourceBattleFields: source,
    })
    const fields = result.successor.files.get(PAL_B2_BATTLE_FIELD_PATH) as unknown as BattleFieldDef[]
    expect(fields).toHaveLength(52)
    expect(fields.map(({ id }) => id)).toEqual(Array.from({ length: 52 }, (_, index) => index + 6))
    expect(result.seal.source.removed.map(({ id }) => id)).toEqual([0, 1, 2, 3, 4, 5])
    expect(result.successor.files.has(B2_BATTLE_FIELD_DOMAIN_SEAL_PATH)).toBe(true)
    expect(
      result.successor.baselineMetadata?.transitions[B2_BATTLE_FIELD_DOMAIN_TRANSITION_ID],
    ).toBe(result.seal.digest)

    const rewound = rewindPublishedB2BattleFieldDomainIfPresent({
      source: result.successor,
      manifest,
      manifestRawText,
    })
    expect(isDeepStrictEqual([...rewound.files], [...parent.files])).toBe(true)
    expect(isDeepStrictEqual(rewound.baselineMetadata, parent.baselineMetadata)).toBe(true)
  })

  test('project rewind preserves authored retained edits and rejects copied-seal drift', () => {
    const source = Array.from({ length: 58 }, (_, id) => {
      const value = field(id)
      delete value.background
      return value
    })
    const published = buildPalB2BattleFieldDomainMigration({
      baseline: parentSnapshot(),
      manifest,
      manifestRawText,
      sourceBattleFields: source,
    }).successor
    const project = cloneSnapshot(published)
    delete project.baselineMetadata
    const fields = project.files.get(PAL_B2_BATTLE_FIELD_PATH) as unknown as BattleFieldDef[]
    fields[0]!.screenWave = 7
    project.hashes?.set(
      PAL_B2_BATTLE_FIELD_PATH,
      fileHash(fields, PAL_B2_BATTLE_FIELD_PATH),
    )
    const rewound = rewindPublishedB2BattleFieldProjectAgainstPublishedBaseline({
      project,
      publishedBaseline: published,
      manifest,
      manifestRawText,
    })
    const restored = rewound.files.get(PAL_B2_BATTLE_FIELD_PATH) as unknown as BattleFieldDef[]
    expect(restored).toHaveLength(58)
    expect(restored[6]?.screenWave).toBe(7)

    const stale = cloneSnapshot(project)
    stale.hashes?.set(B2_BATTLE_FIELD_DOMAIN_SEAL_PATH, '0'.repeat(64))
    expect(() =>
      rewindPublishedB2BattleFieldProjectAgainstPublishedBaseline({
        project: stale,
        publishedBaseline: published,
        manifest,
        manifestRawText,
      }),
    ).toThrow('project seal 与 published authority 不符')
  })

  test('successor payload without the four-part marker is orphan state', () => {
    const orphan = parentSnapshot()
    const fields = Array.from({ length: 52 }, (_, index) => field(index + 6))
    orphan.files.set(PAL_B2_BATTLE_FIELD_PATH, asJson(fields))
    orphan.hashes?.set(
      PAL_B2_BATTLE_FIELD_PATH,
      fileHash(fields, PAL_B2_BATTLE_FIELD_PATH),
    )
    expect(() =>
      rewindPublishedB2BattleFieldDomainIfPresent({
        source: orphan,
        manifest,
        manifestRawText,
      }),
    ).toThrow('无 transition marker')
  })
})
