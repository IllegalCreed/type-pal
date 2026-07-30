import type { ProjectManifest, WorldStateV7 } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { normalizePayloadV7, preflightLegacySaveMigrationV8 } from './migration.js'
import type { LegacySavePayloadV7, SavePayloadV7 } from './types.js'

function manifest(over: Partial<ProjectManifest<8>> = {}): ProjectManifest<8> {
  return {
    id: 'demo',
    name: 'Demo',
    contentVersion: 8,
    minimumSaveVersion: 7,
    entryScene: 's001',
    content: {},
    assets: { catalog: 'assets/index.json', roles: {} },
    startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
    ...over,
  }
}

function world(): WorldStateV7 {
  return {
    party: [],
    money: 0,
    learnedSkills: {},
    inventory: [],
    resources: { karma: 3 },
  }
}

function legacyPayload(): LegacySavePayloadV7 {
  return {
    version: 7,
    projectId: 'demo',
    contentVersion: 7,
    world: world(),
    position: {
      sceneId: 's001',
      pos: { col: 2, row: 3, height: 0 },
      facing: 'left',
    },
  }
}

describe('SAVE7 / content8 identity normalization', () => {
  test('7/7 只升级 contentVersion，世界、位置与工程 id 深相等且输入不变', async () => {
    const raw = legacyPayload()
    const before = structuredClone(raw)
    const resolver = await preflightLegacySaveMigrationV8({ manifest: manifest(), payload: raw })
    expect(resolver).toEqual({
      kind: 'content-v7-v8',
      projectId: 'demo',
      targetContentVersion: 8,
      targetSaveVersion: 7,
    })
    const normalized = normalizePayloadV7(raw, resolver)
    expect(normalized).toEqual({ ...before, contentVersion: 8 })
    expect(normalized.world).toEqual(before.world)
    expect(normalized.position).toEqual(before.position)
    expect(normalized.projectId).toBe(before.projectId)
    expect(raw).toEqual(before)
  })

  test('当前 7/8 只克隆并验证', async () => {
    const raw = { ...legacyPayload(), contentVersion: 8 } as SavePayloadV7
    const resolver = await preflightLegacySaveMigrationV8({ manifest: manifest(), payload: raw })
    expect(resolver.kind).toBe('current-v8')
    const normalized = normalizePayloadV7(raw, resolver)
    expect(normalized).toEqual(raw)
    expect(normalized).not.toBe(raw)
  })

  test.each([
    [6, 7],
    [6, 8],
    [7, 6],
    [7, 9],
    [8, 8],
  ])('非法 SAVE v%i / contentVersion %i 在任何兼容 IO 前拒绝', async (version, contentVersion) => {
    let reads = 0
    const args = {
      manifest: manifest(),
      payload: { ...legacyPayload(), version, contentVersion },
      get source() {
        reads++
        throw new Error('不得读取 sidecar')
      },
    } as unknown as Parameters<typeof preflightLegacySaveMigrationV8>[0]
    await expect(preflightLegacySaveMigrationV8(args)).rejects.toThrow(
      /historical contentVersion 8/,
    )
    expect(reads).toBe(0)
  })

  test('错误工程与 minimumSaveVersion 明确拒绝', async () => {
    await expect(
      preflightLegacySaveMigrationV8({
        manifest: manifest(),
        payload: { ...legacyPayload(), projectId: 'other' },
      }),
    ).rejects.toThrow(/不匹配/)
    for (const minimumSaveVersion of [undefined, 6, 8, 1.5]) {
      await expect(
        preflightLegacySaveMigrationV8({
          manifest: manifest({ minimumSaveVersion }),
          payload: legacyPayload(),
        }),
      ).rejects.toThrow(/minimumSaveVersion.*期望 7/)
    }
  })
})
