import type { ProjectManifest, WorldStateV12 } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { normalizePayloadV8, preflightSaveMigration } from './migration.js'
import type {
  LegacySavePayloadV8Content10,
  LegacySavePayloadV8Content11,
  SavePayloadV8,
} from './types.js'

function manifest(over: Partial<ProjectManifest<12>> = {}): ProjectManifest<12> {
  return {
    id: 'demo',
    name: 'Demo',
    contentVersion: 12,
    minimumSaveVersion: 8,
    entryScene: 's001',
    content: {},
    assets: { catalog: 'assets/index.json', roles: {} },
    startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
    ...over,
  }
}

function world(): WorldStateV12 {
  return {
    party: [],
    money: 0,
    learnedSkills: {},
    inventory: [],
    resources: { karma: 3 },
  }
}

function payload11(over: Partial<LegacySavePayloadV8Content11> = {}): LegacySavePayloadV8Content11 {
  return {
    version: 8,
    projectId: 'demo',
    contentVersion: 11,
    world: world(),
    position: {
      sceneId: 's001',
      pos: { col: 2, row: 3, height: 0 },
      facing: 'left',
    },
    ...over,
  }
}

function payload12(over: Partial<SavePayloadV8> = {}): SavePayloadV8 {
  return {
    ...payload11(),
    contentVersion: 12,
    ...over,
  }
}

function payload10(over: Partial<LegacySavePayloadV8Content10> = {}): LegacySavePayloadV8Content10 {
  return {
    ...payload11(),
    contentVersion: 10,
    ...over,
  }
}

describe('SAVE8 / content12 current epoch', () => {
  test('当前 8/12 克隆、补齐并验证持久技能计数', async () => {
    const raw = payload12()
    const resolver = await preflightSaveMigration({ manifest: manifest(), payload: raw })
    expect(resolver).toEqual({
      kind: 'current-v12',
      projectId: 'demo',
      targetContentVersion: 12,
      targetSaveVersion: 8,
    })
    const normalized = normalizePayloadV8(raw, resolver)
    expect(normalized).toEqual({
      ...raw,
      world: { ...raw.world, skillUseCounts: {} },
    })
    expect(normalized).not.toBe(raw)
    expect(normalized.world).not.toBe(raw.world)
  })

  test('SAVE8/content10 到 content12 只补持久技能计数，position 不变且 sidecar I/O=0', async () => {
    const raw = payload10()
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
    expect(resolver.kind).toBe('content-v10-v12')
    const normalized = normalizePayloadV8(raw, resolver)
    expect(normalized.contentVersion).toBe(12)
    expect(normalized.world).toEqual({ ...before.world, skillUseCounts: {} })
    expect(normalized.position).toEqual(before.position)
    expect(normalized.projectId).toBe(before.projectId)
    expect(raw).toEqual(before)
    expect(reads).toBe(0)
  })

  test.each([
    ['顶层不是对象', 42],
    ['显式 null', null],
    ['数组', []],
    ['角色项不是对象', { hero: 42 }],
    ['负数', { hero: { '370': -1 } }],
    ['小数', { hero: { '370': 1.5 } }],
    ['字符串', { hero: { '370': '8' } }],
    ['超出安全整数', { hero: { '370': Number.MAX_SAFE_INTEGER + 1 } }],
    ['空角色 ID', { '': { '370': 1 } }],
    ['空技能 ID', { hero: { '': 1 } }],
  ])('SAVE8/content10|11 拒绝畸形 skillUseCounts：%s', async (_label, skillUseCounts) => {
    for (const raw of [payload10(), payload11(), payload12()]) {
      ;(raw.world as unknown as Record<string, unknown>).skillUseCounts = skillUseCounts
      const resolver = await preflightSaveMigration({ manifest: manifest(), payload: raw })
      expect(() => normalizePayloadV8(raw, resolver)).toThrow(/skillUseCounts/)
    }
  })

  test('SAVE8/content10|11 接受零次和正安全整数且不修改输入', async () => {
    for (const raw of [payload10(), payload11(), payload12()]) {
      raw.world.skillUseCounts = { hero: { '370': 0, '371': 9 } }
      const before = structuredClone(raw)
      const resolver = await preflightSaveMigration({ manifest: manifest(), payload: raw })
      expect(normalizePayloadV8(raw, resolver).world.skillUseCounts).toEqual(
        before.world.skillUseCounts,
      )
      expect(raw).toEqual(before)
    }
  })

  test.each([
    [7, 7],
    [7, 8],
    [7, 9],
    [7, 10],
    [8, 7],
    [8, 8],
    [8, 9],
    [9, 11],
  ])('其它组合 SAVE v%i / contentVersion %i 在任何兼容 IO 前拒绝', async (version, contentVersion) => {
    let reads = 0
    const args = {
      manifest: manifest(),
      payload: { ...payload11(), version, contentVersion },
      get source() {
        reads += 1
        throw new Error('不得读取 sidecar')
      },
    } as unknown as Parameters<typeof preflightSaveMigration>[0]
    await expect(preflightSaveMigration(args)).rejects.toThrow(/不支持的存档 epoch/)
    expect(reads).toBe(0)
  })

  test('resolver/payload 不匹配与错误工程均 fail-loud 且不改输入', async () => {
    const raw = payload10()
    const before = structuredClone(raw)
    const current = await preflightSaveMigration({
      manifest: manifest(),
      payload: payload12(),
    })
    expect(() => normalizePayloadV8(raw, current)).toThrow(/resolver.*不匹配/)
    expect(raw).toEqual(before)
    await expect(
      preflightSaveMigration({
        manifest: manifest(),
        payload: payload11({ projectId: 'other' }),
      }),
    ).rejects.toThrow(/不匹配/)
  })
})
