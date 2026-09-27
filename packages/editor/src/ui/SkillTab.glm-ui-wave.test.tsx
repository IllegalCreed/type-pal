// @vitest-environment jsdom
/**
 * TEST-GLM-EDITOR-UI-WAVE-1 U1a：SkillTab 残差。
 * 去重：SkillTab.test.tsx 已证新建/删除 commit、名字/一生限用/消耗物品/动画/重排、
 * 引用门禁与 live oracle——本文件只补当前公开入口仍未证明的业务交互：
 * 删除确认取消零提交、添加效果缺省 damage 提交、效果类型切换提交与召唤缺精灵失败零提交、
 * gate 概率参数提交、目标/战外可用/说明基础字段、玩家施法分支增删、目录行点击深链回调。
 */
import type { ItemData, SkillData } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import type { ProjectReferenceIndex } from '../core/project-reference.js'
import {
  type CurrentProjectReferenceIndexProvider,
  collectCurrentProjectReferenceIndex,
} from '../core/project-reference-adapters.js'
import {
  chooseComboboxOption,
  clickButton,
  clickCheckboxByLabel,
  comboboxByAriaLabel,
  fieldControlByLabel,
  setInputValue,
} from './__tests__/glm-ui-wave-kit.js'
import { SkillTab } from './SkillTab.js'

vi.mock('./TrancePreview.js', () => ({
  TrancePreview: () => <div data-testid="trance-preview">变身预览</div>,
}))
vi.mock('./SummonPreview.js', () => ({
  SummonPreview: () => <div data-testid="summon-preview">召唤预览</div>,
}))

const ITEMS: ItemData[] = [
  { id: '148', name: '蛊', desc: [], buyPrice: 0, sellPrice: 0, sellable: false },
  { id: '86', name: '酒', desc: [], buyPrice: 0, sellPrice: 0, sellable: false },
]

function skill(effects: SkillData['effects'] = [], id = '352', name = '三尸咒'): SkillData {
  return {
    id,
    name,
    desc: '',
    cost: { mp: 22 },
    usableOutsideBattle: false,
    target: 'allEnemies',
    effects,
    animation: { effectSprite: 1 },
  }
}

function state(skills: SkillData[]): EditorState {
  return {
    manifest: {
      id: 'test',
      name: '测试项目',
      contentVersion: 20,
      minimumSaveVersion: 8,
      defaultEntryId: 'main',
      content: {},
      entryPoints: [
        {
          id: 'main',
          label: '主要入口',
          scene: 's001',
          startWorld: { party: [], money: 0, inventory: [] },
        },
      ],
      assets: { catalog: 'assets/index.json', roles: {} },
    },
    scenes: [],
    actors: [],
    skills,
    levelUp: {},
    items: ITEMS,
    locale: {},
    sprites: [],
    battleSprites: [],
    maps: {},
    sceneIndex: { version: 1, scenes: [] },
    mapIndex: { version: 1, maps: [] },
    tilesets: [],
    tilesetBlobs: {},
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
    scriptChunks: {},
    stamps: [],
    shops: [],
    poisons: [],
  } as unknown as EditorState
}

function Harness(props: {
  session: EditSession
  focusObjectId?: string
  onObjectFocus?: (id: string | undefined) => void
  onStatusNotice?: (notice: { kind: 'info' | 'error'; message: string } | undefined) => void
  referenceIndex?: ProjectReferenceIndex
  getCurrentReferenceIndex?: CurrentProjectReferenceIndexProvider
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
      referenceIndex={props.referenceIndex ?? collectCurrentProjectReferenceIndex(current)}
      referenceStatus="current"
      getCurrentReferenceIndex={
        props.getCurrentReferenceIndex ?? ((state) => collectCurrentProjectReferenceIndex(state))
      }
      focusObjectId={props.focusObjectId}
      onObjectFocus={props.onObjectFocus}
      onStatusNotice={props.onStatusNotice}
    />
  )
}

let root: Root
let host: HTMLDivElement

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

async function mountSkill(skills: SkillData[], focus = '352'): Promise<EditSession> {
  const session = new EditSession(state(skills))
  await act(async () => {
    root.render(<Harness session={session} focusObjectId={focus} />)
    await Promise.resolve()
  })
  return session
}

describe('U1a SkillTab 残差', () => {
  test('删除确认取消 → 零提交：历史与列表均不变', async () => {
    const session = await mountSkill([skill()])
    const before = session.getHistoryVersion()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await clickButton(host, '删除技能')
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(session.getHistoryVersion()).toBe(before)
    expect(session.getState().skills).toHaveLength(1)
  })

  test('添加效果提交缺省 damage，undo 精确移除', async () => {
    const session = await mountSkill([skill()])
    const before = session.getHistoryVersion()
    await clickButton(host, '添加效果')
    expect(session.getState().skills[0]!.effects).toEqual([
      { kind: 'damage', power: 10, elemental: 0 },
    ])
    expect(session.getHistoryVersion()).toBe(before + 1)
    expect(session.undo()).toBe(true)
    expect(session.getState().skills[0]!.effects).toEqual([])
  })

  test('效果类型切换提交 applyStatus；召唤缺 summon 精灵报错零提交', async () => {
    const session = await mountSkill([skill([{ kind: 'damage', power: 10, elemental: 0 }])])
    await chooseComboboxOption(comboboxByAriaLabel(host, '效果 1 类型'), '上状态')
    expect(session.getState().skills[0]!.effects).toEqual([
      { kind: 'applyStatus', status: 'sleep', turns: 3 },
    ])

    const notices: Array<{ kind: string; message?: string } | undefined> = []
    const bare = new EditSession(state([skill([{ kind: 'damage', power: 10, elemental: 0 }])]))
    await act(async () => {
      root.render(<Harness session={bare} onStatusNotice={(notice) => notices.push(notice)} />)
      await Promise.resolve()
    })
    const before = bare.getHistoryVersion()
    await chooseComboboxOption(comboboxByAriaLabel(host, '效果 1 类型'), '召唤')
    const last = notices.at(-1)
    expect(last?.kind).toBe('error')
    expect(last?.message).toContain('summon')
    expect(bare.getHistoryVersion()).toBe(before)
    expect(bare.getState().skills[0]!.effects[0]!.kind).toBe('damage')
  })

  test('gate 概率参数提交并精确 undo；目录行点击传出 onObjectFocus', async () => {
    const session = await mountSkill([skill([{ kind: 'gate', chance: 50 }])])
    const gateInput = fieldControlByLabel<HTMLInputElement>(host, '概率%')
    await setInputValue(gateInput, '80')
    expect(session.getState().skills[0]!.effects[0]).toEqual({ kind: 'gate', chance: 80 })
    expect(session.undo()).toBe(true)
    expect(session.getState().skills[0]!.effects[0]).toEqual({ kind: 'gate', chance: 50 })

    const focus: string[] = []
    const two = new EditSession(state([skill([], '352', '甲'), skill([], '353', '乙')]))
    await act(async () => {
      root.render(
        <Harness
          session={two}
          focusObjectId="352"
          onObjectFocus={(id) => focus.push(String(id))}
        />,
      )
      await Promise.resolve()
    })
    const rows = [...host.querySelectorAll('.ds-catalog-row')]
    expect(rows.length).toBe(2)
    await act(async () => {
      rows[1]!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(focus.at(-1)).toBe('353')
    expect(two.getHistoryVersion()).toBe(0)
  })

  test('目标/战外可用/说明提交；玩家施法分支增删单命令且 undo 还原', async () => {
    const session = await mountSkill([skill()])
    await chooseComboboxOption(fieldControlByLabel(host, '目标'), '单队友')
    expect(session.getState().skills[0]!.target).toBe('oneAlly')
    await clickCheckboxByLabel(host, '战外可用')
    expect(session.getState().skills[0]!.usableOutsideBattle).toBe(true)
    const desc = host.querySelector<HTMLTextAreaElement>('textarea')
    expect(desc, 'desc textarea').not.toBeNull()
    await setInputValue(desc!, '新人引导')
    expect(session.getState().skills[0]!.desc).toBe('新人引导')

    const before = session.getHistoryVersion()
    await clickButton(host, '添加玩家施法分支')
    expect(session.getState().skills[0]!.execution).toEqual({ player: { effects: [] } })
    expect(session.getHistoryVersion()).toBe(before + 1)
    expect(session.undo()).toBe(true)
    expect(session.getState().skills[0]!.execution).toBeUndefined()
    await act(async () => {
      root.render(<Harness session={session} focusObjectId="352" />)
      await Promise.resolve()
    })
    await clickButton(host, '添加玩家施法分支')
    await clickButton(host, '删除玩家分支')
    expect(session.getState().skills[0]!.execution).toBeUndefined()
  })
})
