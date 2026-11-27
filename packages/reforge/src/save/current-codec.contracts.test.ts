import {
  buildEntityLifecycleReferenceIndex,
  CONTENT_VERSION,
  CURRENT_PROJECT_MINIMUM_SAVE_VERSION,
  type CurrentManifest,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { makeTestWorld } from '../test-fixtures.js'
import { normalizeCurrentSave, preflightCurrentSave } from './current-codec.js'
import { buildCurrentSavePayload } from './ops.js'
import type { CurrentSavePayload } from './types.js'

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

function payload(): CurrentSavePayload {
  return buildCurrentSavePayload(
    {
      ...makeTestWorld(),
      script: {
        flags: { 'quest.open': true },
        vars: { reputation: 3 },
        entityState: {},
        behaviors: {},
      },
      entityLifecycles: { s001: { e001: { phase: 'suspended', remainingTicks: 9 } } },
    },
    { sceneId: 's001', pos: { col: 2, row: 3, height: 4 }, facing: 'left' },
    'demo',
  )
}

const references = buildEntityLifecycleReferenceIndex([{ id: 's001', entities: [{ id: 'e001' }] }])

async function currentResolver(raw: CurrentSavePayload) {
  return preflightCurrentSave({ manifest: manifest(), payload: raw })
}

describe('current-codec · skillUseCounts 语义（结构层只验有限数，真值层在此）', () => {
  test('空角色 ID 拒绝', async () => {
    const raw = payload()
    raw.world.skillUseCounts = { '': { fire: 1 } }
    const resolver = await currentResolver(raw)
    expect(() => normalizeCurrentSave(raw, resolver, references)).toThrow(/角色 ID 不得为空/)
  })

  test('空技能 ID 拒绝', async () => {
    const raw = payload()
    raw.world.skillUseCounts = { hero: { '': 1 } }
    const resolver = await currentResolver(raw)
    expect(() => normalizeCurrentSave(raw, resolver, references)).toThrow(/技能 ID 不得为空/)
  })

  test('负数计数拒绝（非负条件）', async () => {
    const raw = payload()
    raw.world.skillUseCounts = { hero: { fire: -1 } }
    const resolver = await currentResolver(raw)
    expect(() => normalizeCurrentSave(raw, resolver, references)).toThrow(/期望非负安全整数/)
  })

  test('超出安全整数边界拒绝（MAX_SAFE_INTEGER+1 是整数但不安全）', async () => {
    const raw = payload()
    raw.world.skillUseCounts = { hero: { fire: Number.MAX_SAFE_INTEGER + 1 } }
    const resolver = await currentResolver(raw)
    expect(() => normalizeCurrentSave(raw, resolver, references)).toThrow(/期望非负安全整数/)
  })
})

describe('current-codec · 可省略容器缺省（当前 schema 唯一允许的缺省）', () => {
  test('skillUseCounts 缺席：clone 内补空 {}，原件保持缺席不变', async () => {
    const raw = payload()
    delete raw.world.skillUseCounts
    const before = structuredClone(raw)
    const resolver = await currentResolver(raw)
    const normalized = normalizeCurrentSave(raw, resolver, references)

    expect(normalized.world.skillUseCounts).toEqual({})
    expect(Object.hasOwn(raw.world, 'skillUseCounts')).toBe(false)
    expect(raw).toEqual(before)
  })

  test('entityLifecycles 缺席：clone 内补空 {}，原件保持缺席不变', async () => {
    const raw = payload()
    delete raw.world.entityLifecycles
    const before = structuredClone(raw)
    const resolver = await currentResolver(raw)
    const normalized = normalizeCurrentSave(raw, resolver, references)

    expect(normalized.world.entityLifecycles).toEqual({})
    expect(Object.hasOwn(raw.world, 'entityLifecycles')).toBe(false)
    expect(raw).toEqual(before)
  })
})

describe('current-codec · hostileAwareness 正数性（结构层只验有限数，0 由此层拒绝）', () => {
  test('remainingMs=0 拒绝（期望正有限毫秒）', async () => {
    const raw = payload()
    raw.world.hostileAwareness = { rangeMultiplier: 3, remainingMs: 0 }
    const resolver = await currentResolver(raw)
    expect(() => normalizeCurrentSave(raw, resolver, references)).toThrow(/期望正有限毫秒/)
  })
})

describe('current-codec · script 深层语义接线（结构层只验 record）', () => {
  test('vars 非有限数由 checkWorldScriptState 拒绝，路径锚在 payload.world.script', async () => {
    const raw = payload()
    const script = raw.world.script
    if (!script) throw new Error('fixture requires a persisted script state')
    script.vars.reputation = Number.NaN
    const resolver = await currentResolver(raw)
    expect(() => normalizeCurrentSave(raw, resolver, references)).toThrow(
      /payload\.world\.script\.vars\.reputation: 期望有限数/,
    )
  })
})
