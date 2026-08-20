import {
  buildEntityLifecycleReferenceIndexV13,
  type ProjectManifest,
  type WorldStateV16,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { normalizePayloadV16, preflightSaveMigrationV16 } from './migration-v16.js'
import type { SavePayloadV8Content16 } from './types.js'

function manifest(): ProjectManifest<16> {
  return {
    id: 'demo',
    name: 'Demo',
    contentVersion: 16,
    minimumSaveVersion: 8,
    entryScene: 's001',
    content: {},
    assets: { catalog: 'assets/index.json', roles: {} },
    startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
  }
}

function world(): WorldStateV16 {
  return {
    party: [],
    money: 7,
    learnedSkills: {},
    skillUseCounts: {},
    inventory: [],
    script: {
      flags: { 'quest.open': true },
      vars: { reputation: 3 },
      entityState: { s001: { e001: 0 } },
      behaviors: {},
    },
    entityLifecycles: { s001: { e001: { phase: 'suspended', remainingTicks: 9 } } },
  }
}

function payload(): SavePayloadV8Content16 {
  return {
    version: 8,
    contentVersion: 16,
    projectId: 'demo',
    world: world(),
    position: {
      sceneId: 's001',
      pos: { col: 2, row: 3, height: 4 },
      facing: 'left',
    },
  }
}

const references = buildEntityLifecycleReferenceIndexV13([
  { id: 's001', entities: [{ id: 'e001' }] },
])

describe('current SAVE8/content16 contract before migration-layer removal', () => {
  test('round-trips the current envelope without mutating input or resetting world values', async () => {
    const raw = payload()
    const before = structuredClone(raw)
    const resolver = await preflightSaveMigrationV16({ manifest: manifest(), payload: raw })
    const normalized = normalizePayloadV16(raw, resolver, references)

    expect(normalized).toEqual(before)
    expect(normalized).not.toBe(raw)
    expect(normalized.world).not.toBe(raw.world)
    expect(normalized.world.entityLifecycles).not.toBe(raw.world.entityLifecycles)
    expect(raw).toEqual(before)
  })

  test.each([
    [7, 16],
    [8, 14],
    [9, 16],
  ])('rejects non-current SAVE%s/content%s before normalization', async (version, contentVersion) => {
    const raw = { ...payload(), version, contentVersion }
    await expect(preflightSaveMigrationV16({ manifest: manifest(), payload: raw })).rejects.toThrow(
      /只接受 SAVE8\/content16/,
    )
  })

  test('rejects malformed or dangling current lifecycle references', async () => {
    const raw = payload()
    raw.world.entityLifecycles = { s001: { missing: { phase: 'removed' } } }
    const resolver = await preflightSaveMigrationV16({ manifest: manifest(), payload: raw })
    expect(() => normalizePayloadV16(raw, resolver, references)).toThrow(/未知 entity id/)
  })
})
