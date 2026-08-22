import {
  buildEntityLifecycleReferenceIndex,
  type CurrentManifest,
  type WorldState,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { normalizeCurrentSave, preflightCurrentSave } from './current-codec.js'
import type { CurrentSavePayload } from './types.js'

function manifest(): CurrentManifest {
  return {
    id: 'demo',
    name: 'Demo',
    contentVersion: 17,
    minimumSaveVersion: 8,
    defaultEntryId: 'new-game',
    entryPoints: [
      {
        id: 'new-game',
        label: '开始游戏',
        scene: 's001',
        startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
      },
    ],
    content: {},
    assets: { catalog: 'assets/index.json', roles: {} },
  }
}

function world(): WorldState {
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

function payload(): CurrentSavePayload {
  return {
    version: 8,
    contentVersion: 17,
    projectId: 'demo',
    world: world(),
    position: {
      sceneId: 's001',
      pos: { col: 2, row: 3, height: 4 },
      facing: 'left',
    },
  }
}

const references = buildEntityLifecycleReferenceIndex([
  { id: 's001', entities: [{ id: 'e001' }] },
])

describe('current SAVE8/content17 contract', () => {
  test('round-trips the current envelope without mutating input or resetting world values', async () => {
    const raw = payload()
    const before = structuredClone(raw)
    const resolver = await preflightCurrentSave({ manifest: manifest(), payload: raw })
    const normalized = normalizeCurrentSave(raw, resolver, references)

    expect(normalized).toEqual(before)
    expect(normalized).not.toBe(raw)
    expect(normalized.world).not.toBe(raw.world)
    expect(normalized.world.entityLifecycles).not.toBe(raw.world.entityLifecycles)
    expect(raw).toEqual(before)
    expect(normalized).not.toHaveProperty('entryId')
    expect(normalized).not.toHaveProperty('defaultEntryId')
  })

  test.each([
    [7, 17],
    [8, 16],
    [9, 17],
  ])('rejects non-current SAVE%s/content%s before normalization', async (version, contentVersion) => {
    const raw = { ...payload(), version, contentVersion }
    await expect(preflightCurrentSave({ manifest: manifest(), payload: raw })).rejects.toThrow(
      /只接受 SAVE8\/content17/,
    )
  })

  test('rejects malformed or dangling current lifecycle references', async () => {
    const raw = payload()
    raw.world.entityLifecycles = { s001: { missing: { phase: 'removed' } } }
    const resolver = await preflightCurrentSave({ manifest: manifest(), payload: raw })
    expect(() => normalizeCurrentSave(raw, resolver, references)).toThrow(/未知 entity id/)
  })
})
