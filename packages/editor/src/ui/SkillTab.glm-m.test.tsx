// @vitest-environment jsdom
/**
 * TEST-GLM-WAVE-M-1 M01（SkillTab.glm-m）：技能效果分支字段当前合同。
 * 去重：SkillTab.test.tsx / glm-ui-wave / kimi-workflows 已证目录/深链/删除门/成本/动画/
 * 重排/gate 参数/目标/玩家分支/召唤缺精灵；本文件只补未被任何旧断言覆盖的效果分支：
 * 下毒 poisonId（含引用索引联动）、解状态多选数组、属性增益持续切换、金钱伤害比例字段。
 */
import type { ItemData, SkillData } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  blurField,
  clickCheckboxByLabelText,
  comboboxTrigger,
  controlByAriaLabel,
  controlByLabel,
  fillAndBlur,
  loadLegalProject,
  pickCombobox,
  typeDraft,
} from '../__tests__/glm-m/kit.js'
import { collectBattleDataReferences } from '../core/battle-data-references.js'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import { AddPoisonCommand } from '../core/poison-commands.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import { SkillTab } from './SkillTab.js'

const ITEMS: ItemData[] = [
  { id: 'item-glm-m', name: '蛊', desc: [], buyPrice: 0, sellPrice: 0, sellable: false },
]

function skill(effects: SkillData['effects'], id = 'skill-glm-m'): SkillData {
  return {
    id,
    name: '三尸咒',
    desc: '',
    cost: { mp: 22 },
    usableOutsideBattle: false,
    target: 'allEnemies',
    effects,
    animation: { effectSprite: 1 },
  }
}

async function legalSkillState(effects: SkillData['effects']): Promise<EditorState> {
  const { state } = await loadLegalProject('glm-wave-m-skill')
  const next = { ...state, skills: [skill(effects)], items: ITEMS }
  assertProjectSaveValid(next)
  return next
}

/** 合法项目 + 一枚真实毒（供下毒引用与删除门边界），返回已装载技能的会话。 */
async function poisonedSkillSession(effects: SkillData['effects']): Promise<EditSession> {
  const session = new EditSession(await legalSkillState(effects))
  session.dispatch(new AddPoisonCommand(1, '赤蝎粉'))
  return session
}

function Harness(props: { session: EditSession }) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const current = props.session.getState()
  return (
    <SkillTab
      skills={current.skills}
      items={current.items}
      session={props.session}
      assetBase={undefined as never}
      assetCatalog={current.assetCatalog}
      assetReader={{} as never}
      battleSprites={current.battleSprites ?? []}
      referenceIndex={collectCurrentProjectReferenceIndex(current)}
      referenceStatus="current"
      getCurrentReferenceIndex={(next) => collectCurrentProjectReferenceIndex(next)}
      focusObjectId="skill-glm-m"
    />
  )
}

let root: Root
let host: HTMLDivElement

beforeEach(async () => {
  const nodeBufferModule = 'node:buffer'
  const nodeCryptoModule = 'node:crypto'
  const buffer = (await import(nodeBufferModule)) as { Blob: typeof Blob }
  const webcrypto = (await import(nodeCryptoModule)) as { webcrypto: typeof crypto }
  vi.stubGlobal('Blob', buffer.Blob)
  vi.stubGlobal('crypto', webcrypto.webcrypto)
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function mountSession(
  effects: SkillData['effects'],
  withPoison = false,
): Promise<EditSession> {
  const session = withPoison
    ? await poisonedSkillSession(effects)
    : new EditSession(await legalSkillState(effects))
  await act(async () => {
    root.render(<Harness session={session} />)
    await Promise.resolve()
  })
  return session
}

describe('M01 SkillTab 效果分支字段当前合同', () => {
  test('下毒 poisonId 提交真实毒 id 并生成 skill-poison 引用，undo 后引用消失', async () => {
    const session = await mountSession([{ kind: 'applyPoison', poisonId: '' }], true)
    const before = session.getHistoryVersion()
    expect(
      collectBattleDataReferences(session.getState(), 'poison', { includeScriptCommands: false }),
    ).toHaveLength(0)

    const input = controlByLabel<HTMLInputElement>(host, '毒 id')
    await fillAndBlur(input, '1')
    const effects = session.getState().skills[0]!.effects
    expect(effects).toEqual([{ kind: 'applyPoison', poisonId: '1' }])
    expect(session.getHistoryVersion()).toBe(before + 1)
    const references = collectBattleDataReferences(session.getState(), 'poison', {
      includeScriptCommands: false,
    })
    expect(references).toHaveLength(1)
    expect(references[0]).toMatchObject({
      target: 'poison',
      targetId: '1',
      kind: 'skill-poison',
      detail: '施加毒',
    })

    expect(session.undo()).toBe(true)
    expect(session.getState().skills[0]!.effects).toEqual([{ kind: 'applyPoison', poisonId: '' }])
    expect(
      collectBattleDataReferences(session.getState(), 'poison', { includeScriptCommands: false }),
    ).toHaveLength(0)
  })

  test('解状态多选数组按勾选序提交，取消一项精确摘除，undo 逐步还原', async () => {
    const session = await mountSession([{ kind: 'removeStatus', statuses: [] }])
    const before = session.getHistoryVersion()

    await clickCheckboxByLabelText(host, '混乱')
    expect(session.getState().skills[0]!.effects).toEqual([
      { kind: 'removeStatus', statuses: ['confused'] },
    ])
    await clickCheckboxByLabelText(host, '睡眠')
    expect(session.getState().skills[0]!.effects).toEqual([
      { kind: 'removeStatus', statuses: ['confused', 'sleep'] },
    ])
    expect(session.getHistoryVersion()).toBe(before + 2)

    await clickCheckboxByLabelText(host, '混乱')
    expect(session.getState().skills[0]!.effects).toEqual([
      { kind: 'removeStatus', statuses: ['sleep'] },
    ])

    expect(session.undo()).toBe(true)
    expect(session.getState().skills[0]!.effects).toEqual([
      { kind: 'removeStatus', statuses: ['confused', 'sleep'] },
    ])
    expect(session.undo()).toBe(true)
    expect(session.getState().skills[0]!.effects).toEqual([
      { kind: 'removeStatus', statuses: ['confused'] },
    ])
    expect(session.undo()).toBe(true)
    expect(session.getState().skills[0]!.effects).toEqual([{ kind: 'removeStatus', statuses: [] }])
  })

  test('属性增益：属性/持续切换提交，N 回合数 blur 精确落账并可整体撤销', async () => {
    const session = await mountSession([
      { kind: 'buffStat', stat: 'attack', percent: 50, duration: 'battle' },
    ])
    const before = session.getHistoryVersion()

    await pickCombobox(comboboxTrigger(host, '属性'), '灵力')
    expect(session.getState().skills[0]!.effects[0]).toMatchObject({
      kind: 'buffStat',
      stat: 'magic',
    })

    await pickCombobox(comboboxTrigger(host, '持续'), 'N 回合')
    expect(session.getState().skills[0]!.effects[0]).toEqual({
      kind: 'buffStat',
      stat: 'magic',
      percent: 50,
      duration: 3,
    })

    const turns = controlByAriaLabel<HTMLInputElement>(host, '持续回合数')
    await typeDraft(turns, '5')
    await blurField(turns)
    expect(session.getState().skills[0]!.effects[0]).toEqual({
      kind: 'buffStat',
      stat: 'magic',
      percent: 50,
      duration: 5,
    })
    expect(session.getHistoryVersion()).toBe(before + 3)

    expect(session.undo()).toBe(true)
    expect(session.getState().skills[0]!.effects[0]).toMatchObject({ duration: 3 })
    expect(session.undo()).toBe(true)
    expect(session.getState().skills[0]!.effects[0]).toMatchObject({ duration: 'battle' })
  })

  test('金钱伤害：消耗上限/分子/分母/五灵逐字段 blur 提交，undo 逐步还原', async () => {
    const session = await mountSession([
      { kind: 'moneyDamage', maxSpend: 5000, num: 2, den: 5, elemental: 0 },
    ])
    const before = session.getHistoryVersion()

    await fillAndBlur(controlByLabel<HTMLInputElement>(host, '消耗上限'), '800')
    expect(session.getState().skills[0]!.effects[0]).toMatchObject({
      kind: 'moneyDamage',
      maxSpend: 800,
    })
    await fillAndBlur(controlByLabel<HTMLInputElement>(host, '分子'), '3')
    expect(session.getState().skills[0]!.effects[0]).toMatchObject({ num: 3 })
    await fillAndBlur(controlByLabel<HTMLInputElement>(host, '分母'), '4')
    expect(session.getState().skills[0]!.effects[0]).toMatchObject({ den: 4 })
    await fillAndBlur(controlByLabel<HTMLInputElement>(host, '五灵'), '2')
    expect(session.getState().skills[0]!.effects[0]).toEqual({
      kind: 'moneyDamage',
      maxSpend: 800,
      num: 3,
      den: 4,
      elemental: 2,
    })
    expect(session.getHistoryVersion()).toBe(before + 4)

    expect(session.undo()).toBe(true)
    expect(session.getState().skills[0]!.effects[0]).toMatchObject({ elemental: 0 })
    expect(session.undo()).toBe(true)
    expect(session.getState().skills[0]!.effects[0]).toMatchObject({ den: 5 })
    expect(session.undo()).toBe(true)
    expect(session.getState().skills[0]!.effects[0]).toMatchObject({ num: 2 })
    expect(session.undo()).toBe(true)
    expect(session.getState().skills[0]!.effects[0]).toMatchObject({ maxSpend: 5000 })
  })
})
