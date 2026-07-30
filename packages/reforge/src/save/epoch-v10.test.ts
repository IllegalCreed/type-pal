import type {
  ProjectManifest,
  WorldStateV10,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { normalizePayloadV8, preflightSaveMigration } from './migration.js'
import type {
  LegacySavePayloadV8Content9,
  SavePayloadV8,
} from './types.js'

function manifest(over: Partial<ProjectManifest<10>> = {}): ProjectManifest<10> {
  return {
    id: 'demo',
    name: 'Demo',
    contentVersion: 10,
    minimumSaveVersion: 8,
    entryScene: 's001',
    content: {},
    assets: { catalog: 'assets/index.json', roles: {} },
    startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
    ...over,
  }
}

function world(): WorldStateV10 {
  return {
    party: [],
    money: 0,
    learnedSkills: {},
    inventory: [],
    resources: { karma: 3 },
  }
}

function payload10(over: Partial<SavePayloadV8> = {}): SavePayloadV8 {
  return {
    version: 8,
    projectId: 'demo',
    contentVersion: 10,
    world: world(),
    position: {
      sceneId: 's001',
      pos: { col: 2, row: 3, height: 0 },
      facing: 'left',
    },
    ...over,
  }
}

function payload9(
  over: Partial<LegacySavePayloadV8Content9> = {},
): LegacySavePayloadV8Content9 {
  return {
    ...payload10(),
    contentVersion: 9,
    ...over,
  }
}

describe('SAVE8 / content10 current epoch', () => {
  test('当前 8/10 只克隆并验证', async () => {
    const raw = payload10()
    const resolver = await preflightSaveMigration({ manifest: manifest(), payload: raw })
    expect(resolver).toEqual({
      kind: 'current-v10',
      projectId: 'demo',
      targetContentVersion: 10,
      targetSaveVersion: 8,
    })
    const normalized = normalizePayloadV8(raw, resolver)
    expect(normalized).toEqual(raw)
    expect(normalized).not.toBe(raw)
    expect(normalized.world).not.toBe(raw.world)
  })

  test('SAVE8/content9 纯 identity 到 content10，world/position 深相等且 sidecar I/O=0', async () => {
    const raw = payload9()
    const before = structuredClone(raw)
    let reads = 0
    const args = {
      manifest: manifest(),
      payload: raw,
      get source() {
        reads += 1
        throw new Error('不得读取 sidecar')
      },
    } as unknown as Parameters<typeof preflightSaveMigration>[0]
    const resolver = await preflightSaveMigration(args)
    expect(resolver.kind).toBe('content-v9-v10')
    const normalized = normalizePayloadV8(raw, resolver)
    expect(normalized.contentVersion).toBe(10)
    expect(normalized.world).toEqual(before.world)
    expect(normalized.position).toEqual(before.position)
    expect(normalized.projectId).toBe(before.projectId)
    expect(raw).toEqual(before)
    expect(reads).toBe(0)
  })

  test.each([
    [7, 7],
    [7, 8],
    [7, 9],
    [7, 10],
    [8, 7],
    [8, 8],
    [8, 11],
    [9, 10],
  ])('其它组合 SAVE v%i / contentVersion %i 在任何兼容 IO 前拒绝', async (version, contentVersion) => {
    let reads = 0
    const args = {
      manifest: manifest(),
      payload: { ...payload10(), version, contentVersion },
      get source() {
        reads += 1
        throw new Error('不得读取 sidecar')
      },
    } as unknown as Parameters<typeof preflightSaveMigration>[0]
    await expect(preflightSaveMigration(args)).rejects.toThrow(/不支持的存档 epoch/)
    expect(reads).toBe(0)
  })

  test('resolver/payload 不匹配与错误工程均 fail-loud 且不改输入', async () => {
    const raw = payload9()
    const before = structuredClone(raw)
    const current = await preflightSaveMigration({
      manifest: manifest(),
      payload: payload10(),
    })
    expect(() => normalizePayloadV8(raw, current)).toThrow(/resolver.*不匹配/)
    expect(raw).toEqual(before)
    await expect(
      preflightSaveMigration({
        manifest: manifest(),
        payload: payload10({ projectId: 'other' }),
      }),
    ).rejects.toThrow(/不匹配/)
  })
})
