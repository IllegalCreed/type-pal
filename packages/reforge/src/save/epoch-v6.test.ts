import type { ProjectManifest, WorldStateV6 } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  normalizePayloadV6,
  preflightLegacySaveMigrationV6,
  type SaveMigrationResolverV6,
} from './migration.js'
import type { SavePayloadV6 } from './types.js'

function manifest(over: Partial<ProjectManifest<6>> = {}): ProjectManifest<6> {
  return {
    id: 'demo',
    name: 'Demo',
    contentVersion: 6,
    minimumSaveVersion: 6,
    entryScene: 's001',
    content: {},
    assets: { catalog: 'assets/index.json', roles: {} },
    startWorld: {
      party: [],
      money: 0,
      learnedSkills: {},
      inventory: [],
    },
    ...over,
  }
}

function world(): WorldStateV6 {
  return {
    party: [],
    money: 0,
    learnedSkills: {},
    inventory: [],
  }
}

function payload(over: Partial<SavePayloadV6> = {}): SavePayloadV6 {
  return {
    version: 6,
    projectId: 'demo',
    contentVersion: 6,
    world: world(),
    position: {
      sceneId: 's001',
      pos: { col: 0, row: 0, height: 0 },
      facing: 'down',
    },
    ...over,
  }
}

describe('historical save/content epoch 6 byte-pin', () => {
  test('accepts exactly 6/6 and normalizes only the canonical script container', async () => {
    const raw = payload()
    const resolver = await preflightLegacySaveMigrationV6({
      manifest: manifest(),
      payload: raw,
    })
    expect(resolver).toEqual({
      kind: 'current-v6',
      projectId: 'demo',
      targetContentVersion: 6,
      targetSaveVersion: 6,
    } satisfies SaveMigrationResolverV6)
    const normalized = normalizePayloadV6(raw, resolver)
    expect(normalized).not.toBe(raw)
    expect(normalized).toEqual({
      ...raw,
      world: {
        ...raw.world,
        script: {
          flags: {},
          vars: {},
          entityState: {},
          behaviors: {},
        },
      },
    })
  })

  test.each([
    [5, 6],
    [6, 5],
    [7, 6],
    [6, 7],
  ])('rejects non-6/6 payload SAVE v%i / contentVersion %i', async (version, contentVersion) => {
    await expect(
      preflightLegacySaveMigrationV6({
        manifest: manifest(),
        payload: { ...payload(), version, contentVersion },
      }),
    ).rejects.toThrow(/historical 6\/6 epoch/)
  })

  test.each([
    undefined,
    5,
    7,
    1.5,
  ])('rejects non-exact minimumSaveVersion %s', async (minimumSaveVersion) => {
    await expect(
      preflightLegacySaveMigrationV6({
        manifest: manifest({ minimumSaveVersion }),
        payload: payload(),
      }),
    ).rejects.toThrow(/minimumSaveVersion.*期望 6/)
  })

  test('normalizer rejects a mismatched resolver and never mutates the input', () => {
    const raw = payload()
    const before = structuredClone(raw)
    expect(() =>
      normalizePayloadV6(raw, {
        kind: 'current-v6',
        projectId: 'other',
        targetContentVersion: 6,
        targetSaveVersion: 6,
      }),
    ).toThrow(/不匹配/)
    expect(raw).toEqual(before)
  })
})
