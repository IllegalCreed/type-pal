import type { ProjectManifest, WorldStateV9 } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { normalizePayloadV8, preflightSaveMigration } from './migration.js'
import type { SavePayloadV8 } from './types.js'

function manifest(over: Partial<ProjectManifest<9>> = {}): ProjectManifest<9> {
  return {
    id: 'demo',
    name: 'Demo',
    contentVersion: 9,
    minimumSaveVersion: 8,
    entryScene: 's001',
    content: {},
    assets: { catalog: 'assets/index.json', roles: {} },
    startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
    ...over,
  }
}

function payload(over: Partial<SavePayloadV8> = {}): SavePayloadV8 {
  const world: WorldStateV9 = {
    party: [],
    money: 0,
    learnedSkills: {},
    inventory: [],
    resources: { karma: 3 },
  }
  return {
    version: 8,
    projectId: 'demo',
    contentVersion: 9,
    world,
    position: {
      sceneId: 's001',
      pos: { col: 2, row: 3, height: 0 },
      facing: 'left',
    },
    ...over,
  }
}

describe('SAVE8 / content9 current epoch', () => {
  test('当前 8/9 只克隆并验证', async () => {
    const raw = payload()
    const resolver = await preflightSaveMigration({ manifest: manifest(), payload: raw })
    expect(resolver).toEqual({
      kind: 'current-v9',
      projectId: 'demo',
      targetContentVersion: 9,
      targetSaveVersion: 8,
    })
    const normalized = normalizePayloadV8(raw, resolver)
    expect(normalized).toEqual(raw)
    expect(normalized).not.toBe(raw)
    expect(normalized.world).not.toBe(raw.world)
  })

  test.each([
    [7, 7],
    [7, 8],
    [7, 9],
    [8, 7],
    [8, 8],
    [8, 10],
    [9, 9],
  ])('旧或未来组合 SAVE v%i / contentVersion %i 在任何兼容 IO 前拒绝', async (version, contentVersion) => {
    let reads = 0
    const args = {
      manifest: manifest(),
      payload: { ...payload(), version, contentVersion },
      get source() {
        reads += 1
        throw new Error('不得读取 sidecar')
      },
    } as unknown as Parameters<typeof preflightSaveMigration>[0]
    await expect(preflightSaveMigration(args)).rejects.toThrow(/epoch 已断开/)
    expect(reads).toBe(0)
  })

  test('错误工程与 minimumSaveVersion 明确拒绝', async () => {
    await expect(
      preflightSaveMigration({
        manifest: manifest(),
        payload: payload({ projectId: 'other' }),
      }),
    ).rejects.toThrow(/不匹配/)
    for (const minimumSaveVersion of [undefined, 7, 9, 1.5])
      await expect(
        preflightSaveMigration({
          manifest: manifest({ minimumSaveVersion }),
          payload: payload(),
        }),
      ).rejects.toThrow(/minimumSaveVersion.*期望 8/)
  })
})
