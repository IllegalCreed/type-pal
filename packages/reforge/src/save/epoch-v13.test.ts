import {
  buildEntityLifecycleReferenceIndexV13,
  type ProjectManifest,
  type WorldStateV13,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { normalizePayloadV13, preflightSaveMigrationV13 } from './migration-v13.js'
import type {
  LegacySavePayloadV8Content10,
  SavePayloadV8Content13,
} from './types.js'

function manifest(over: Partial<ProjectManifest<13>> = {}): ProjectManifest<13> {
  return {
    id: 'demo',
    name: 'Demo',
    contentVersion: 13,
    minimumSaveVersion: 8,
    entryScene: 's001',
    content: {},
    assets: { catalog: 'assets/index.json', roles: {} },
    startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
    ...over,
  }
}

function world(): WorldStateV13 {
  return {
    party: [],
    money: 0,
    learnedSkills: {},
    inventory: [],
    script: {
      flags: {},
      vars: {},
      entityState: { s001: { e001: 0 } },
      behaviors: {},
    },
  }
}

function payload(contentVersion: 10 | 11 | 12 | 13): SavePayloadV8Content13 {
  return {
    version: 8,
    projectId: 'demo',
    contentVersion: contentVersion as 13,
    world: world(),
    position: {
      sceneId: 's001',
      pos: { col: 2, row: 3, height: 0 },
      facing: 'left',
    },
  }
}

const references = buildEntityLifecycleReferenceIndexV13([
  { id: 's001', entities: [{ id: 'e001' }, { id: 'e002' }] },
])

describe('SAVE8/content13 W9 resolver', () => {
  test.each([10, 11, 12, 13] as const)('normalizes content%s without inferring entityState', async (version) => {
    const raw = payload(version)
    const before = structuredClone(raw)
    const resolver = await preflightSaveMigrationV13({ manifest: manifest(), payload: raw })
    const normalized = normalizePayloadV13(raw, resolver, references)
    expect(normalized.contentVersion).toBe(13)
    expect(normalized.world.entityLifecycles).toEqual({})
    expect(normalized.world.script?.entityState.s001?.e001).toBe(0)
    expect(raw).toEqual(before)
  })

  test('retains and clones valid nested lifecycle entries', async () => {
    const raw = payload(13)
    raw.world.entityLifecycles = {
      s001: {
        e001: { phase: 'suspended', remainingTicks: 15 },
        e002: { phase: 'awaitingExit' },
      },
    }
    const resolver = await preflightSaveMigrationV13({ manifest: manifest(), payload: raw })
    const normalized = normalizePayloadV13(raw, resolver, references)
    expect(normalized.world.entityLifecycles).toEqual(raw.world.entityLifecycles)
    expect(normalized.world).not.toBe(raw.world)
    expect(normalized.world.entityLifecycles).not.toBe(raw.world.entityLifecycles)
  })

  test.each([
    ['unknown scene', { s999: { e001: { phase: 'removed' } } }],
    ['unknown entity', { s001: { e999: { phase: 'removed' } } }],
    ['zero ticks', { s001: { e001: { phase: 'despawned', remainingTicks: 0 } } }],
    ['extra field', { s001: { e001: { phase: 'removed', remainingTicks: 1 } } }],
  ])('rejects malformed lifecycle table: %s', async (_label, table) => {
    const raw = payload(13)
    ;(raw.world as unknown as Record<string, unknown>).entityLifecycles = table
    const resolver = await preflightSaveMigrationV13({ manifest: manifest(), payload: raw })
    expect(() => normalizePayloadV13(raw, resolver, references)).toThrow(/entityLifecycles/)
  })

  test('rejects resolver/project/version combinations before normalization', async () => {
    const raw = payload(13)
    await expect(
      preflightSaveMigrationV13({
        manifest: manifest({ minimumSaveVersion: 7 }),
        payload: raw,
      }),
    ).rejects.toThrow(/minimumSaveVersion/)
    await expect(
      preflightSaveMigrationV13({
        manifest: manifest(),
        payload: { ...raw, contentVersion: 9 },
      }),
    ).rejects.toThrow(/不支持的 W9/)
  })

  test('legacy content10 type remains accepted at the explicit input boundary', async () => {
    const raw = payload(10) as unknown as LegacySavePayloadV8Content10
    const resolver = await preflightSaveMigrationV13({ manifest: manifest(), payload: raw })
    expect(resolver.kind).toBe('content-v10-v13')
    expect(normalizePayloadV13(raw, resolver, references).contentVersion).toBe(13)
  })
})
