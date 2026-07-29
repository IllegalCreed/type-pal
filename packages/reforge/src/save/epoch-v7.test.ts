import type { ProjectManifest, WorldStateV7 } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { normalizeLegacyPayloadV7, preflightLegacySaveMigrationV7 } from './migration.js'
import type { LegacySavePayloadV7 } from './types.js'

function manifest(over: Partial<ProjectManifest<7>> = {}): ProjectManifest<7> {
  return {
    id: 'demo',
    name: 'Demo',
    contentVersion: 7,
    minimumSaveVersion: 7,
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

function world(): WorldStateV7 {
  return {
    party: [],
    money: 0,
    learnedSkills: {},
    inventory: [],
  }
}

function payload(over: Partial<LegacySavePayloadV7> = {}): LegacySavePayloadV7 {
  return {
    version: 7,
    projectId: 'demo',
    contentVersion: 7,
    world: world(),
    position: {
      sceneId: 's001',
      pos: { col: 0, row: 0, height: 0 },
      facing: 'down',
    },
    ...over,
  }
}

describe('save/content epoch 7', () => {
  test('accepts only current 7/7 and normalizes the canonical script container', async () => {
    const raw = payload()
    const resolver = await preflightLegacySaveMigrationV7({ manifest: manifest(), payload: raw })
    expect(resolver).toEqual({
      kind: 'current-v7',
      projectId: 'demo',
      targetContentVersion: 7,
      targetSaveVersion: 7,
    })
    const normalized = normalizeLegacyPayloadV7(raw, resolver)
    expect(normalized).not.toBe(raw)
    expect(normalized.world.script).toEqual({
      flags: {},
      vars: {},
      entityState: {},
      behaviors: {},
    })
  })

  test.each([
    ...[1, 2, 3, 4, 5, 6].flatMap((version) =>
      [4, 5, 6, 7].map((contentVersion) => [version, contentVersion]),
    ),
    [7, 4],
    [7, 5],
    [7, 6],
  ])('rejects disconnected SAVE v%i / contentVersion %i before compatibility I/O', async (version, contentVersion) => {
    let sidecarReads = 0
    const args = {
      manifest: manifest(),
      payload: { ...payload(), version, contentVersion },
      get source() {
        sidecarReads++
        throw new Error('historical sidecar must not be touched')
      },
    } as unknown as Parameters<typeof preflightLegacySaveMigrationV7>[0]
    await expect(preflightLegacySaveMigrationV7(args)).rejects.toThrow(/epoch 已断开.*请新开游戏/)
    expect(sidecarReads).toBe(0)
  })

  test('rejects future, wrong-project and every non-exact minimum version explicitly', async () => {
    await expect(
      preflightLegacySaveMigrationV7({
        manifest: manifest(),
        payload: { ...payload(), version: 8 },
      }),
    ).rejects.toThrow(/epoch 已断开/)
    await expect(
      preflightLegacySaveMigrationV7({
        manifest: manifest(),
        payload: { ...payload(), projectId: 'other' },
      }),
    ).rejects.toThrow(/不匹配/)
    for (const minimumSaveVersion of [undefined, 6, 8, 1.5]) {
      await expect(
        preflightLegacySaveMigrationV7({
          manifest: manifest({ minimumSaveVersion }),
          payload: payload(),
        }),
      ).rejects.toThrow(/minimumSaveVersion.*期望 7/)
    }
  })
})
