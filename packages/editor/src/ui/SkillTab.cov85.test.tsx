// @vitest-environment jsdom
/**
 * TEST-COVERAGE85-GLM-EDITOR-1 批3a：SkillTab 效果类型矩阵与施法分支残臂。
 *
 * fullName 排重（旧文件已证，不复制）：
 * - SkillTab.test.tsx：新建/删除 commit、基础字段、重排、引用门禁 live oracle。
 * - SkillTab.glm-m / kimi-workflows / glm-ui-wave：damage 缺省与 applyStatus/gate 切换、
 *   召唤缺精灵报错、目标/战外可用、玩家施法分支增删、目录行深链。
 * 本文件只补 cov-base 实测缺臂：其余全部效果类型的缺省体矩阵（healHp/healMp/revive/
 * removeStatus/applyPoison/curePoison/buffStat/instantKill/resourceDelta/steal/
 * collectTreasure/fleeBattle/moneyDamage）、召唤/变身在真实战斗精灵下成功提交、
 * 效果参数字段（五行/数量/资源/增减/毒物/比例/数值）、敌方施法分支的效果类型受
 * 运行时白名单过滤、入场预备 remainingResourceDamage 开关、删除被引用技能的精确
 * 回显与引用刷新期禁止删除。全部走真实组件事件 → 公开 EditSession 状态 oracle。
 */

// @ts-expect-error Node test-host bridge only.
import { Blob as NodeBlob } from 'node:buffer'
// @ts-expect-error Node test-host bridge only.
import { webcrypto } from 'node:crypto'
import type { SkillData, SkillEffect } from '@type-pal/content'
import { ENEMY_RUNTIME_SKILL_EFFECT_KINDS } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterAll, afterEach, beforeEach, expect, test, vi } from 'vitest'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import {
  type CurrentProjectReferenceIndexProvider,
  collectCurrentProjectReferenceIndex,
} from '../core/project-reference-adapters.js'
import {
  chooseComboboxOption,
  clickButton,
  comboboxByAriaLabel,
  fieldControlByLabel,
  loadLegalUiProject,
  setInputValue,
} from './__tests__/glm-ui-wave-kit.js'
import { SkillTab } from './SkillTab.js'

vi.mock('./TrancePreview.js', () => ({
  TrancePreview: () => <div data-testid="trance-preview">变身预览</div>,
}))
vi.mock('./SummonPreview.js', () => ({
  SummonPreview: () => <div data-testid="summon-preview">召唤预览</div>,
}))

function skill(effects: SkillData['effects'] = [], id = 'skill-cov85'): SkillData {
  return {
    id,
    name: ' Cov85 技能 ',
    desc: '',
    cost: { mp: 5 },
    usableOutsideBattle: false,
    target: 'allEnemies',
    effects,
    animation: { effectSprite: 1 },
  }
}

async function legalSkillState(skills: SkillData[]): Promise<EditorState> {
  const { state } = await loadLegalUiProject('cov85-skill')
  const next: EditorState = {
    ...state,
    skills,
    poisons: [{ id: 1, name: 'cov85 毒', color: 0, curability: 'common' }],
  }
  assertProjectSaveValid(next)
  return next
}

let root: Root
let host: HTMLDivElement

vi.stubGlobal('Blob', NodeBlob)
vi.stubGlobal('crypto', webcrypto)
afterAll(() => {
  vi.unstubAllGlobals()
})

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.restoreAllMocks()
})

interface MountOptions {
  focus?: string
  referenceStatus?: 'current' | 'stale' | 'failed'
  onStatusNotice?: (notice: { kind: 'info' | 'error'; message: string } | undefined) => void
  battleSprites?: EditorState['battleSprites']
}

function Harness(props: {
  session: EditSession
  focus?: string
  referenceStatus: 'current' | 'stale' | 'failed'
  provider: CurrentProjectReferenceIndexProvider
  onStatusNotice?: (notice: { kind: 'info' | 'error'; message: string } | undefined) => void
}) {
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
      battleSprites={current.battleSprites}
      referenceIndex={props.referenceStatus === 'current' ? props.provider(current) : undefined}
      referenceStatus={props.referenceStatus}
      getCurrentReferenceIndex={props.provider}
      focusObjectId={props.focus ?? 'skill-cov85'}
      onStatusNotice={props.onStatusNotice}
    />
  )
}

const INDEX_PROVIDER: CurrentProjectReferenceIndexProvider = (state) =>
  collectCurrentProjectReferenceIndex(state)

async function mountSkill(skills: SkillData[], options: MountOptions = {}): Promise<EditSession> {
  let base = await legalSkillState(skills)
  if (options.battleSprites) base = { ...base, battleSprites: options.battleSprites }
  const session = new EditSession(base)
  await act(async () => {
    root.render(
      <Harness
        session={session}
        referenceStatus={options.referenceStatus ?? 'current'}
        provider={INDEX_PROVIDER}
        focus={options.focus}
        onStatusNotice={options.onStatusNotice}
      />,
    )
    await Promise.resolve()
  })
  return session
}

const DEFAULT_EFFECT_CASES = [
  { option: '回体力', effect: { kind: 'healHp', amount: 50 } as SkillEffect },
  { option: '回真气', effect: { kind: 'healMp', amount: 20 } as SkillEffect },
  { option: '复活', effect: { kind: 'revive', hpPercent: 10 } as SkillEffect },
  { option: '解状态', effect: { kind: 'removeStatus', statuses: [] } as SkillEffect },
  { option: '下毒', effect: { kind: 'applyPoison', poisonId: '' } as SkillEffect },
  { option: '解毒', effect: { kind: 'curePoison' } as SkillEffect },
  {
    option: '属性增益',
    effect: { kind: 'buffStat', stat: 'attack', percent: 50, duration: 'battle' } as SkillEffect,
  },
  { option: '即死', effect: { kind: 'instantKill' } as SkillEffect },
  {
    option: '直接增减资源',
    effect: { kind: 'resourceDelta', resource: 'hp', delta: -1 } as SkillEffect,
  },
  { option: '偷窃', effect: { kind: 'steal', rate: 50 } as SkillEffect },
  { option: '收宝', effect: { kind: 'collectTreasure' } as SkillEffect },
  { option: '脱离战斗', effect: { kind: 'fleeBattle' } as SkillEffect },
  {
    option: '金钱伤害',
    effect: { kind: 'moneyDamage', maxSpend: 5000, num: 2, den: 5, elemental: 0 } as SkillEffect,
  },
] as const

test.each(DEFAULT_EFFECT_CASES)('$option 类型切换提交精确缺省效果体并可 undo', async ({
  option,
  effect,
}) => {
  const session = await mountSkill([skill([{ kind: 'damage', power: 10, elemental: 0 }])])
  await chooseComboboxOption(comboboxByAriaLabel(host, '效果 1 类型'), option)
  expect(session.getState().skills[0]!.effects).toEqual([effect])
  expect(session.undo()).toBe(true)
  expect(session.getState().skills[0]!.effects).toEqual([
    { kind: 'damage', power: 10, elemental: 0 },
  ])
})

test('cov85-skill 变身：blank 项目的 player-fighter 精灵直接可用', async () => {
  const session = await mountSkill([skill([{ kind: 'damage', power: 10, elemental: 0 }])])
  await chooseComboboxOption(comboboxByAriaLabel(host, '效果 1 类型'), '变身')
  expect(session.getState().skills[0]!.effects).toEqual([
    { kind: 'trance', battleSprite: 'starter-fighter' },
  ])
})

test('cov85-skill 召唤：登记 summon 用途后缺省体引用其稳定 id', async () => {
  const { state } = await loadLegalUiProject('cov85-skill-summon')
  const withSummon: EditorState = {
    ...state,
    skills: [skill([{ kind: 'damage', power: 10, elemental: 0 }])],
    battleSprites: [
      ...state.battleSprites,
      {
        id: 'cov85-summon-fox',
        label: '灵狐',
        asset: state.battleSprites[0]!.asset,
        profile: { kind: 'summon' },
      },
    ],
  }
  assertProjectSaveValid(withSummon)
  const session = new EditSession(withSummon)
  await act(async () => {
    root.render(<Harness session={session} referenceStatus="current" provider={INDEX_PROVIDER} />)
    await Promise.resolve()
  })
  await chooseComboboxOption(comboboxByAriaLabel(host, '效果 1 类型'), '召唤')
  expect(session.getState().skills[0]!.effects).toEqual([
    { kind: 'summon', battleSprite: 'cov85-summon-fox' },
  ])
})

test('cov85-skill 效果参数字段：五行/数量/资源/增减/毒物/比例逐一提交', async () => {
  const session = await mountSkill([
    skill([
      { kind: 'damage', power: 10, elemental: 0 },
      { kind: 'healHp', amount: 50 },
      { kind: 'resourceDelta', resource: 'hp', delta: -1 },
      { kind: 'applyPoison', poisonId: '1' },
      { kind: 'steal', rate: 50 },
    ]),
  ])
  await chooseComboboxOption(comboboxByAriaLabel(host, '效果 1 类型'), '伤害')
  // 五行下拉选择「毒」= 6。
  const elemental = fieldControlByLabel<HTMLButtonElement>(host, '五行')
  await chooseComboboxOption(elemental, '毒')
  expect(session.getState().skills[0]!.effects[0]).toEqual({
    kind: 'damage',
    power: 10,
    elemental: 6,
  })

  const amount = fieldControlByLabel<HTMLInputElement>(host, '量')
  await setInputValue(amount, '77')
  expect(session.getState().skills[0]!.effects[1]).toEqual({ kind: 'healHp', amount: 77 })

  const resource = fieldControlByLabel<HTMLButtonElement>(host, '资源')
  await chooseComboboxOption(resource, '真气')
  expect(session.getState().skills[0]!.effects[2]).toEqual({
    kind: 'resourceDelta',
    resource: 'mp',
    delta: -1,
  })
  const delta = fieldControlByLabel<HTMLInputElement>(host, '增减')
  await setInputValue(delta, '4')
  expect(session.getState().skills[0]!.effects[2]).toEqual({
    kind: 'resourceDelta',
    resource: 'mp',
    delta: 4,
  })

  const poison = fieldControlByLabel<HTMLInputElement>(host, '毒 id')
  await setInputValue(poison, '1')
  expect(session.getState().skills[0]!.effects[3]).toEqual({
    kind: 'applyPoison',
    poisonId: '1',
  })

  const rate = fieldControlByLabel<HTMLInputElement>(host, '成功率')
  await setInputValue(rate, '35')
  expect(session.getState().skills[0]!.effects[4]).toEqual({ kind: 'steal', rate: 35 })
})

test('cov85-skill 敌方施法分支：类型选项被运行时白名单过滤且效果进入 enemy 覆写', async () => {
  const session = await mountSkill([skill()])
  await clickButton(host, '添加敌人施法分支')
  expect(session.getState().skills[0]!.execution).toEqual({ enemy: { effects: [] } })
  // 敌方分支添加效果：缺省 damage；类型下拉不含玩家专属（如属性增益）。
  const enemySection = host.querySelector<HTMLElement>('[data-side="enemy"]')
  if (!enemySection) throw new Error('enemy execution section missing')
  const enemyAdd = [...enemySection.querySelectorAll<HTMLButtonElement>('button')].find(
    (button) => button.textContent?.trim() === '添加分支效果',
  )
  expect(enemyAdd).toBeDefined()
  await act(async () => {
    enemyAdd!.click()
  })
  expect(session.getState().skills[0]!.execution?.enemy?.effects).toEqual([
    { kind: 'damage', power: 10, elemental: 0 },
  ])
  const trigger = enemySection.querySelector<HTMLButtonElement>(
    'button[role="combobox"][aria-label="效果 1 类型"]',
  )
  if (!trigger) throw new Error('enemy effect kind combobox missing')
  await act(async () => {
    trigger.click()
  })
  const optionsText = [...document.querySelectorAll('[role="option"]')].map((option) =>
    option.textContent?.trim(),
  )
  // 白名单长度判别：敌方类型选项数 = ENEMY_RUNTIME_SKILL_EFFECT_KINDS 全集（含禁用项）。
  expect(optionsText).toHaveLength(ENEMY_RUNTIME_SKILL_EFFECT_KINDS.length)
  expect(optionsText).not.toContain('属性增益')
  expect(optionsText).toContain('伤害')
  await act(async () => {
    document.body.click()
  })
  await clickButton(host, '删除敌人分支')
  expect(session.getState().skills[0]!.execution).toBeUndefined()
  expect(session.undo()).toBe(true)
  expect(session.getState().skills[0]!.execution).toEqual({
    enemy: { effects: [{ kind: 'damage', power: 10, elemental: 0 }] },
  })
})

test('cov85-skill 玩家分支入场预备：勾选提交 remainingResourceDamage，取消清空', async () => {
  const session = await mountSkill([skill()])
  await clickButton(host, '添加玩家施法分支')
  const playerSection = host.querySelector('[data-side="player"]')!
  const prepareToggle = [...playerSection.querySelectorAll<HTMLLabelElement>('label')].find(
    (label) => label.textContent?.includes('施法前按剩余真气扣体力'),
  )
  expect(prepareToggle).toBeDefined()
  const prepareInput = prepareToggle!.querySelector<HTMLInputElement>('input[type="checkbox"]')!
  await act(async () => {
    prepareInput.click()
  })
  expect(session.getState().skills[0]!.execution?.player?.prepare).toEqual([
    { kind: 'remainingResourceDamage', resource: 'mp', multiplier: 8, consume: 'all' },
  ])
  await act(async () => {
    prepareInput.click()
  })
  expect(session.getState().skills[0]!.execution?.player?.prepare).toBeUndefined()
})

test('cov85-skill 引用索引未就绪（stale）：删除按钮同样禁用', async () => {
  await mountSkill([skill()], { referenceStatus: 'stale' })
  const deleteButton = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
    (button) => button.textContent?.trim() === '删除技能',
  )
  expect(deleteButton).toBeDefined()
  expect(deleteButton!.disabled).toBe(true)
})
