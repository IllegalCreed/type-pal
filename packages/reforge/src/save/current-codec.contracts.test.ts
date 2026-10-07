/**
 * TEST-REFORGE-CURRENT-SAVE-TEST-PRECISION-1 codec 深层合同（S6/S7）。
 *
 * 只收外层结构 guard 放行、真正落到 current-codec 语义层的拒绝：输入全部 typed 合法
 * （normalize 只接 typed 合法可表达值），逐条先过 assertCurrentSaveStructure 才到达
 * checkWorldScriptState / validateHostileAwareness / normalizeAndValidateSkillUseCounts /
 * normalizeEntityLifecycleTable——外层形状红不构成 codec 证明（任务卡 S6）。
 * 结构层可达的同形拒绝（如 hostileAwareness 0/3、script 非 record）留在
 * current-structure.test.ts，不在此重复。
 */

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
    contentVersion: CONTENT_VERSION,
    projectId: 'demo',
    world: world(),
    position: { sceneId: 's001', pos: { col: 2, row: 3, height: 4 }, facing: 'left' },
  }
}

const references = buildEntityLifecycleReferenceIndex([{ id: 's001', entities: [{ id: 'e001' }] }])

/** 走真实公开管线取 resolver（preflight 通过 = 载荷 envelope 合法）。 */
async function currentResolver(raw: CurrentSavePayload) {
  return preflightCurrentSave({ manifest: manifest(), payload: raw })
}

describe('current-codec · skillUseCounts 语义（结构层只验有限数，真值层在此）', () => {
  // 空字符串键 + 有限数值：结构 guard 放行（其 record 检查不看键名），拒绝只能来自
  // normalizeAndValidateSkillUseCounts 的 ID 语义。
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
  test('skillUseCounts/entityLifecycles 缺席：clone 内补空 {}，原件保持缺席不变', async () => {
    const raw = payload()
    delete raw.world.skillUseCounts
    delete raw.world.entityLifecycles
    const before = structuredClone(raw)
    const resolver = await currentResolver(raw)
    const normalized = normalizeCurrentSave(raw, resolver, references)

    expect(normalized.world.skillUseCounts).toEqual({})
    expect(normalized.world.entityLifecycles).toEqual({})
    expect('skillUseCounts' in raw.world).toBe(false)
    expect('entityLifecycles' in raw.world).toBe(false)
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
    raw.world.script!.vars = { reputation: Number.NaN }
    const resolver = await currentResolver(raw)
    expect(() => normalizeCurrentSave(raw, resolver, references)).toThrow(
      /payload\.world\.script\.vars\.reputation: 期望有限数/,
    )
  })
})
