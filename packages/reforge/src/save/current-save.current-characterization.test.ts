import {
  buildEntityLifecycleReferenceIndex,
  CONTENT_VERSION,
  CURRENT_PROJECT_MINIMUM_SAVE_VERSION,
  type CurrentManifest,
  type WorldState,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { normalizeCurrentSave, preflightCurrentSave } from './current-codec.js'
import { type CurrentSavePayload, SAVE_VERSION } from './types.js'

function manifest(): CurrentManifest {
  return {
    id: 'demo',
    name: 'Demo',
    contentVersion: CONTENT_VERSION,
    minimumSaveVersion: CURRENT_PROJECT_MINIMUM_SAVE_VERSION,
    defaultEntryId: 'new-game',
    entryPoints: [
      {
        id: 'new-game',
        label: '开始游戏',
        scene: 's001',
        startWorld: { party: [], money: 0, inventory: [] },
      },
    ],
    content: {},
    assets: { catalog: 'assets/index.json', roles: {} },
  }
}

function world(): WorldState {
  return {
    party: [
      {
        id: 'hero',
        template: 'hero',
        level: 1,
        exp: 0,
        hp: 0,
        maxHP: 10,
        mp: 0,
        maxMP: 5,
        attack: 1,
        defense: 1,
        magicAttack: 1,
        speed: 1,
        luck: 1,
        equipment: {},
        tags: [],
      },
    ],
    money: 7,
    learnedSkills: { hero: [] },
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
    version: SAVE_VERSION,
    sceneRuntime: {},
    contentVersion: CONTENT_VERSION,
    projectId: 'demo',
    world: world(),
    position: {
      sceneId: 's001',
      pos: { col: 2, row: 3, height: 4 },
      facing: 'left',
    },
  }
}

const references = buildEntityLifecycleReferenceIndex([{ id: 's001', entities: [{ id: 'e001' }] }])

describe('current SAVE12/content22 contract', () => {
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
    expect(normalized.world.learnedSkills.hero).toEqual([])
    expect(normalized).not.toHaveProperty('entryId')
    expect(normalized).not.toHaveProperty('defaultEntryId')
  })

  // 版本拒收按真实不同条件留代表：仅 version 不同 / 仅 contentVersion 不同 / 两者不同
  // （同一 preflight 检查、同一 oracle；旧矩阵六行全是两者不同，未隔离单一条件）。
  // 拒收以 catch + 同步断言表达：未被拒收时以 AssertionError 报「必须被拒收」，而非
  // rejects matcher 的裸 Error 文案。
  test.each([
    [SAVE_VERSION - 1, CONTENT_VERSION],
    [SAVE_VERSION, CONTENT_VERSION - 1],
    [SAVE_VERSION - 1, CONTENT_VERSION - 1],
  ])('rejects non-current SAVE%s/content%s before normalization', async (version, contentVersion) => {
    const raw = { ...payload(), version, contentVersion }
    const error: unknown = await preflightCurrentSave({ manifest: manifest(), payload: raw }).then(
      () => null,
      (thrown: unknown) => thrown,
    )
    expect(error, `SAVE${version}/content${contentVersion} 必须被拒收`).toBeInstanceOf(Error)
    expect((error as Error).message).toMatch(
      new RegExp(`只接受 SAVE${SAVE_VERSION}/content${CONTENT_VERSION}`),
    )
  })

  test('rejects a resolver whose identity does not match the payload before cloning', async () => {
    const raw = payload()
    const resolver = await preflightCurrentSave({ manifest: manifest(), payload: raw })
    const forged: typeof resolver = { ...resolver, projectId: 'other-project' }
    expect(() => normalizeCurrentSave(raw, forged, references)).toThrow(
      /resolver 与 payload 不匹配/,
    )
  })

  test('rejects malformed or dangling current lifecycle references', async () => {
    const raw = payload()
    raw.world.entityLifecycles = { s001: { missing: { phase: 'removed' } } }
    const resolver = await preflightCurrentSave({ manifest: manifest(), payload: raw })
    expect(() => normalizeCurrentSave(raw, resolver, references)).toThrow(/未知 entity id/)
  })
})
