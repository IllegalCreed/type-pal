// @vitest-environment jsdom
import type { ItemData, SkillData } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import { setCatalogSearch } from './catalog-controls-test-utils.js'
import { verifyCatalogWorkspace } from './catalog-workspace-test-utils.js'
import { verifyInspectorTabs } from './inspector-tabs-test-utils.js'
import { SkillTab } from './SkillTab.js'

vi.mock('./TrancePreview.js', () => ({
  TrancePreview: () => <div data-testid="trance-preview">变身预览</div>,
}))
vi.mock('./SummonPreview.js', () => ({
  SummonPreview: () => <div data-testid="summon-preview">召唤预览</div>,
}))

const ITEMS: ItemData[] = [
  {
    id: '148',
    name: '蛊',
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
  },
  {
    id: '86',
    name: '酒',
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
  },
]

function skill(cost: SkillData['cost'] = { mp: 22 }, id = '352', name = '三尸咒'): SkillData {
  return {
    id,
    name,
    desc: '',
    cost,
    usableOutsideBattle: false,
    target: 'allEnemies',
    effects: [],
    animation: { effectSprite: 1 },
  }
}

function state(skills = [skill()], items: ItemData[] = ITEMS): EditorState {
  return {
    manifest: {
      id: 'test',
      name: '测试项目',
      contentVersion: 19,
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
    items,
    locale: {},
    sprites: [],
    battleSprites: [],
    maps: {},
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

function Harness(props: { session: EditSession; focusObjectId?: string }) {
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
      focusObjectId={props.focusObjectId}
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

const setInput = async (input: HTMLInputElement, value: string): Promise<void> => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  await act(async () => {
    input.focus()
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.blur()
  })
}

function controlByLabel<T extends HTMLElement>(text: string): T {
  const label = [...host.querySelectorAll<HTMLLabelElement>('label')].find(
    (candidate) => candidate.textContent?.trim() === text,
  )
  expect(label, `label ${text}`).toBeDefined()
  const control = label?.htmlFor ? (document.getElementById(label.htmlFor) as T | null) : null
  expect(control, `control for ${text}`).not.toBeNull()
  return control!
}

describe('SkillTab · 施法物品成本', () => {
  test('目录第二行保留原始数值 SkillId，不制造点分展示别名', async () => {
    const session = new EditSession(state([skill({ mp: 8 }, '295', '梦蛇')]))
    await act(async () => root.render(<Harness session={session} />))
    const row = host.querySelector('.ds-catalog-row')!
    expect(row.querySelector('.ds-catalog-row__title')?.textContent).toBe('梦蛇')
    expect(row.querySelector('.ds-catalog-row__meta')?.textContent).toBe('295')
    expect(row.textContent).not.toContain('skill.pal.295')
  })

  test('目录搜索覆盖命中、空结果与清空恢复，且不会偷换被过滤的选择', async () => {
    const session = new EditSession(state([skill(), skill({ mp: 8 }, '353', '另一技能')]))
    await act(async () => root.render(<Harness session={session} focusObjectId="353" />))
    const search = host.querySelector<HTMLInputElement>('input[aria-label="过滤技能"]')!
    expect(host.querySelectorAll('.ds-catalog-row')).toHaveLength(2)

    await setCatalogSearch(search, '三尸')
    expect(host.querySelectorAll('.ds-catalog-row')).toHaveLength(1)
    expect(host.querySelector('.ds-catalog-row')?.textContent).toContain('三尸咒')
    expect(host.querySelector('.ds-catalog-row[data-selected="true"]')).toBeNull()
    expect(host.querySelector('h1')?.textContent).toBe('另一技能')

    await setCatalogSearch(search, '不存在')
    expect(host.querySelectorAll('.ds-catalog-row')).toHaveLength(0)
    await setCatalogSearch(search, '')
    expect(host.querySelectorAll('.ds-catalog-row')).toHaveLength(2)
    expect(host.querySelector('.ds-catalog-row[data-selected="true"]')?.textContent).toContain(
      '另一技能',
    )
  })

  test('检查器使用共享引用/说明 Tab 完整键盘与 ARIA 合同', async () => {
    const session = new EditSession(state())
    await act(async () => root.render(<Harness session={session} />))
    verifyCatalogWorkspace(host, '技能目录')
    await verifyInspectorTabs(host, '技能检查器', [/^引用 \d+$/, '说明'])
  })

  test('可新建、编辑，并由 object 深链精确定位', async () => {
    vi.spyOn(window, 'prompt').mockReturnValue('新技能')
    const session = new EditSession(state([skill(), skill({ mp: 8 }, '353', '另一技能')]))
    await act(async () => root.render(<Harness session={session} focusObjectId="353" />))
    expect(host.querySelector('h1')?.textContent).toBe('另一技能')

    const name = controlByLabel<HTMLInputElement>('名字')
    await setInput(name, '另一技能·改')
    expect(session.getState().skills.find((entry) => entry.id === '353')?.name).toBe('另一技能·改')

    const create = host.querySelector<HTMLButtonElement>('button[aria-label="新建技能"]')!
    await act(async () => create.click())
    expect(session.getState().skills.at(-1)).toMatchObject({ id: '1000', name: '新技能' })
    expect(host.querySelector('h1')?.textContent).toBe('新技能')
    await act(async () => expect(session.undo()).toBe(true))
    expect(session.getState().skills.some((entry) => entry.id === '1000')).toBe(false)
  })

  test('使用共享 Hero 与方角目录行，无引用时可删除并撤销', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const session = new EditSession(state())
    await act(async () => root.render(<Harness session={session} />))
    expect(host.querySelector('h1')?.textContent).toBe('三尸咒')
    expect(host.querySelectorAll('.battle-data-form > .ds-workbench-section')).toHaveLength(4)
    expect(host.querySelector('.battle-data-form > .section')).toBeNull()
    expect(host.querySelectorAll('.ds-catalog-row')).toHaveLength(1)
    expect(host.querySelectorAll('.ds-catalog-row[data-selected="true"]')).toHaveLength(1)
    const remove = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent === '删除技能',
    )!
    expect([...remove.classList]).toEqual(
      expect.arrayContaining(['ds-button', 'ds-button--danger']),
    )
    expect(remove.classList.contains('tool')).toBe(false)
    expect(remove.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    await act(async () => remove.click())
    expect(session.getState().skills).toEqual([])
    await act(async () => expect(session.undo()).toBe(true))
    expect(session.getState().skills[0]?.id).toBe('352')
  })

  test('战斗中试放使用可直接导航的安全链接', async () => {
    const session = new EditSession(state())
    await act(async () => root.render(<Harness session={session} />))

    const link = Array.from(host.querySelectorAll<HTMLAnchorElement>('a')).find(
      (candidate) => candidate.textContent?.trim() === '战斗中试放',
    )
    expect(link).toBeDefined()
    expect([...(link?.classList ?? [])]).toEqual(
      expect.arrayContaining(['ds-button', 'ds-button--secondary']),
    )
    expect(link?.classList.contains('tool')).toBe(false)
    expect(link?.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    expect(link?.getAttribute('href')).toBe('play.html?project=pal&scene=s001&battle=0&skill=352')
    expect(link?.target).toBe('_blank')
    expect(link?.rel.split(/\s+/).sort()).toEqual(['noopener', 'noreferrer'])
  })

  test('显示、添加、改量、删除均保留兄弟成本并进入单步 undo/redo', async () => {
    const session = new EditSession(
      state([
        skill({
          mp: 22,
          stamina: 3,
          money: 7,
          items: [{ itemId: '148', amount: 1 }],
        }),
      ]),
    )
    await act(async () => root.render(<Harness session={session} />))

    const firstItemPicker = host.querySelector<HTMLButtonElement>(
      'button[aria-label^="物品（可按名称"]',
    )!
    expect(firstItemPicker.textContent).toContain('蛊')
    expect(firstItemPicker.textContent).toContain('148')
    expect(host.querySelector<HTMLInputElement>('input[aria-label="消耗物品数量 1"]')?.value).toBe(
      '1',
    )

    await act(async () =>
      host.querySelector<HTMLButtonElement>('button[aria-label="添加消耗物品"]')!.click(),
    )
    expect(session.getState().skills[0]!.cost.items).toEqual([
      { itemId: '148', amount: 1 },
      { itemId: '86', amount: 1 },
    ])

    await setInput(host.querySelector<HTMLInputElement>('input[aria-label="消耗物品数量 2"]')!, '3')
    expect(session.getState().skills[0]!.cost).toEqual({
      mp: 22,
      stamina: 3,
      money: 7,
      items: [
        { itemId: '148', amount: 1 },
        { itemId: '86', amount: 3 },
      ],
    })

    await act(async () => {
      expect(session.undo()).toBe(true)
    })
    expect(session.getState().skills[0]!.cost.items?.[1]?.amount).toBe(1)
    await act(async () => {
      expect(session.undo()).toBe(true)
    })
    expect(session.getState().skills[0]!.cost.items).toEqual([{ itemId: '148', amount: 1 }])
    await act(async () => {
      expect(session.redo()).toBe(true)
      expect(session.redo()).toBe(true)
    })
    expect(session.getState().skills[0]!.cost.items?.[1]?.amount).toBe(3)

    await act(async () =>
      host.querySelector<HTMLButtonElement>('button[aria-label="删除消耗物品 2"]')!.click(),
    )
    await act(async () =>
      host.querySelector<HTMLButtonElement>('button[aria-label="删除消耗物品 1"]')!.click(),
    )
    expect(Object.hasOwn(session.getState().skills[0]!.cost, 'items')).toBe(false)
    expect(session.getState().skills[0]!.cost).toEqual({ mp: 22, stamina: 3, money: 7 })
  })

  test('悬空引用显式报警且可改选；其他行已用物品不会重复出现', async () => {
    const session = new EditSession(
      state([
        skill({
          mp: 22,
          items: [
            { itemId: 'missing', amount: 1 },
            { itemId: '148', amount: 1 },
          ],
        }),
      ]),
    )
    await act(async () => root.render(<Harness session={session} />))
    const pickers = host.querySelectorAll<HTMLButtonElement>('button[aria-label^="物品（可按名称"]')
    expect(pickers[0]!.textContent).toContain('未知物品')
    expect(pickers[0]!.textContent).toContain('missing')
    expect(pickers[0]!.getAttribute('aria-invalid')).toBe('true')

    await act(async () => pickers[0]!.click())
    const options = [...document.querySelectorAll<HTMLElement>('[role="option"]')]
    expect(options.map((option) => option.textContent?.trim())).toEqual(['未知物品missing', '酒86'])
    const wine = options.find((option) => option.textContent?.includes('酒'))!
    await act(async () => wine.click())
    expect(session.getState().skills[0]!.cost.items?.[0]).toEqual({
      itemId: '86',
      amount: 1,
    })
    expect(
      host.querySelector<HTMLButtonElement>('button[aria-label="添加消耗物品"]')!.disabled,
    ).toBe(true)
  })

  test('空物品表时添加按钮禁用，不伪造稳定 ID', async () => {
    const session = new EditSession(state([skill()], []))
    await act(async () => root.render(<Harness session={session} />))
    expect(
      host.querySelector<HTMLButtonElement>('button[aria-label="添加消耗物品"]')!.disabled,
    ).toBe(true)
    expect(session.getState().skills[0]!.cost.items).toBeUndefined()
  })
})

describe('SkillTab · 一生限用次数', () => {
  test('设置入账、清空删键恢复不限、undo/redo 复原', async () => {
    const session = new EditSession(state([skill()]))
    await act(async () => root.render(<Harness session={session} />))
    const input = controlByLabel<HTMLInputElement>('一生限用')
    expect(input.value).toBe('')
    expect(input.min).toBe('1')
    expect(input.step).toBe('1')

    await setInput(input, '9')
    expect(session.getState().skills[0]!.lifetimeLimit).toBe(9)

    await setInput(input, '')
    expect(Object.hasOwn(session.getState().skills[0]!, 'lifetimeLimit')).toBe(false)

    await act(async () => {
      expect(session.undo()).toBe(true)
    })
    expect(session.getState().skills[0]!.lifetimeLimit).toBe(9)
    await act(async () => {
      expect(session.undo()).toBe(true)
    })
    expect(Object.hasOwn(session.getState().skills[0]!, 'lifetimeLimit')).toBe(false)
  })
})

describe('SkillTab · 动画布局', () => {
  test('FIRE 参数按三组呈现，缺少资源根时给出明确状态且仍可编辑', async () => {
    const session = new EditSession(state([skill()]))
    await act(async () => root.render(<Harness session={session} />))

    const editor = host.querySelector<HTMLElement>('.skill-animation-editor')!
    expect(
      [...editor.querySelectorAll<HTMLLegendElement>('.skill-animation-group > legend')].map(
        (legend) => legend.textContent,
      ),
    ).toEqual(['素材与落点', '播放与循环', '画面与声音'])
    expect(editor.querySelector('[data-animation-group="placement"]')?.textContent).toContain(
      '层级偏移',
    )
    expect(editor.querySelector('[data-animation-group="playback"]')?.textContent).toContain(
      '循环次数',
    )
    expect(editor.querySelector('[data-animation-group="feedback"]')?.textContent).toContain(
      '特效音',
    )
    expect(editor.querySelector('.skill-animation-preview-panel')?.textContent).toContain(
      '当前环境未载入 FIRE 资源',
    )

    const effectSprite = [...editor.querySelectorAll<HTMLElement>('.ds-field')]
      .find((field) => field.querySelector('.ds-field__label')?.textContent?.includes('特效号'))
      ?.querySelector<HTMLInputElement>('input')
    expect(effectSprite).toBeDefined()
    await setInput(effectSprite!, '42')
    expect(session.getState().skills[0]?.animation.effectSprite).toBe(42)
  })

  test('0xFFFF 特效哨兵显示为无特效，填写与清空仍写回原数据语义', async () => {
    const value = skill()
    value.animation.effectSprite = 0xffff
    const session = new EditSession(state([value]))
    await act(async () => root.render(<Harness session={session} />))

    const effectSprite = controlByLabel<HTMLInputElement>('特效号')
    expect(effectSprite.value).toBe('')
    expect(effectSprite.placeholder).toBe('无特效')
    expect(effectSprite.getAttribute('aria-describedby')).not.toBeNull()
    expect(host.querySelector('.skill-animation-preview-panel')?.textContent).toContain(
      '该技能不播放 FIRE 特效',
    )
    expect(host.querySelector('.skill-animation-preview-panel')?.textContent).not.toContain(
      'FIRE #65535',
    )

    await setInput(effectSprite, '12')
    expect(session.getState().skills[0]?.animation.effectSprite).toBe(12)

    await setInput(controlByLabel<HTMLInputElement>('特效号'), '')
    expect(session.getState().skills[0]?.animation.effectSprite).toBe(0xffff)
  })

  test('前置震屏帧可用步进按钮在关闭与 1 帧之间双向切换', async () => {
    const value = skill()
    value.animation.preShake = { frames: 1, level: 3 }
    const session = new EditSession(state([value]))
    await act(async () => root.render(<Harness session={session} />))

    await act(async () =>
      host.querySelector<HTMLButtonElement>('[aria-label="减少前置震屏帧"]')!.click(),
    )
    expect(session.getState().skills[0]?.animation.preShake).toBeUndefined()
    expect(controlByLabel<HTMLInputElement>('前置震屏帧').value).toBe('')
    expect(controlByLabel<HTMLInputElement>('前置震屏帧').placeholder).toBe('关闭')

    await act(async () =>
      host.querySelector<HTMLButtonElement>('[aria-label="增加前置震屏帧"]')!.click(),
    )
    expect(session.getState().skills[0]?.animation.preShake).toEqual({ frames: 1, level: 3 })
  })
})

describe('SkillTab · 效果卡片', () => {
  test('[reorder-family:skill-effects] 预览跟随 handle 单命令排序，undo/redo 与删除保持结构', async () => {
    const value = skill()
    value.effects = [
      { kind: 'trance', battleSprite: 'player-fighter-5' },
      { kind: 'trance', battleSprite: 'player-fighter-5' },
      { kind: 'buffStat', stat: 'attack', percent: 100, duration: 'battle' },
      { kind: 'summon', battleSprite: 'summon-1' },
    ]
    const session = new EditSession(state([value]))
    await act(async () => root.render(<Harness session={session} />))

    const chain = host.querySelector<HTMLOListElement>('[data-skill-effect-chain="base"]')!
    const cards = () => [...chain.querySelectorAll<HTMLElement>('[data-effect-editor-card]')]
    expect(cards().map((card) => card.dataset.effectKind)).toEqual([
      'trance',
      'trance',
      'buffStat',
      'summon',
    ])
    expect(cards()[0]!.querySelector('[data-testid="trance-preview"]')).not.toBeNull()
    expect(cards()[0]!.querySelector('[data-effect-editor-preview]')?.textContent).toContain(
      '变身形象预览',
    )
    expect(cards()[1]!.querySelector('[data-testid="trance-preview"]')).not.toBeNull()
    expect(cards()[2]!.querySelector('[data-effect-editor-preview]')).toBeNull()
    expect(cards()[3]!.querySelector('[data-testid="summon-preview"]')).not.toBeNull()
    expect(cards()[3]!.querySelector('[data-effect-editor-preview]')?.textContent).toContain(
      '召唤形象预览',
    )

    const collection = host.querySelector<HTMLElement>(
      '[data-ds-reorder-adoption="skill/base-effects"][data-ds-reorder-scope="skill:352:effects"]',
    )!
    const handle = collection.querySelector<HTMLButtonElement>('[data-ds-reorder-handle]')!
    const sourceToken = handle.dataset.reorderKey
    const rows = () => collection.querySelectorAll<HTMLElement>('[data-ds-reorder-item]')
    await act(async () => {
      for (let index = 0; index < 20; index += 1)
        handle.dispatchEvent(new MouseEvent('pointermove', { bubbles: true }))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(session.getHistoryVersion()).toBe(0)
    expect(rows()[0]?.dataset.itemKey).toBe(sourceToken)

    await act(async () => {
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(session.getHistoryVersion()).toBe(1)
    expect(session.getState().skills[0]!.effects.map((effect) => effect.kind)).toEqual([
      'trance',
      'buffStat',
      'summon',
      'trance',
    ])
    expect(rows()[3]?.dataset.itemKey).toBe(sourceToken)
    expect(cards().map((card) => card.dataset.effectKind)).toEqual([
      'trance',
      'buffStat',
      'summon',
      'trance',
    ])
    expect(cards()[0]!.querySelector('[data-testid="trance-preview"]')).not.toBeNull()
    expect(cards()[1]!.querySelector('[data-effect-editor-preview]')).toBeNull()
    expect(cards()[2]!.querySelector('[data-testid="summon-preview"]')).not.toBeNull()
    expect(cards()[3]!.querySelector('[data-testid="trance-preview"]')).not.toBeNull()

    await act(async () => expect(session.undo()).toBe(true))
    expect(session.getState().skills[0]!.effects.map((effect) => effect.kind)).toEqual([
      'trance',
      'trance',
      'buffStat',
      'summon',
    ])
    await act(async () => expect(session.redo()).toBe(true))
    expect(session.getState().skills[0]!.effects.map((effect) => effect.kind)).toEqual([
      'trance',
      'buffStat',
      'summon',
      'trance',
    ])

    await act(async () =>
      chain.querySelector<HTMLButtonElement>('button[aria-label="删除效果 4"]')!.click(),
    )
    expect(session.getState().skills[0]!.effects.map((effect) => effect.kind)).toEqual([
      'trance',
      'buffStat',
      'summon',
    ])
    expect(cards()).toHaveLength(3)
    expect(cards()[0]!.querySelector('[data-testid="trance-preview"]')).not.toBeNull()
    expect(cards()[1]!.querySelector('[data-effect-editor-preview]')).toBeNull()
    expect(cards()[2]!.querySelector('[data-testid="summon-preview"]')).not.toBeNull()
  })
})

describe('SkillTab · 敌方 execution 能力边界', () => {
  test('敌方分支不显示 prepare，效果下拉只开放 runtime 已支持集合', async () => {
    const value = skill()
    value.execution = {
      player: { effects: [{ kind: 'damage', power: 1, elemental: 0 }] },
      enemy: { effects: [{ kind: 'damage', power: 1, elemental: 0 }] },
    }
    const session = new EditSession(state([value]))
    await act(async () => root.render(<Harness session={session} />))

    const player = host.querySelector<HTMLElement>('[data-side="player"]')!
    const enemy = host.querySelector<HTMLElement>('[data-side="enemy"]')!
    expect(player.textContent).toContain('施法前按剩余真气扣体力')
    expect(enemy.textContent).not.toContain('施法前按剩余真气扣体力')
    const kindCombobox = enemy.querySelector<HTMLButtonElement>(
      'button[role="combobox"][aria-label="效果 1 类型"]',
    )!
    expect(kindCombobox).not.toBeNull()
    await act(async () => kindCombobox.click())
    const listbox = document.getElementById(kindCombobox.getAttribute('aria-controls')!)
    expect(listbox?.getAttribute('role')).toBe('listbox')
    const enemyKinds = [...listbox!.querySelectorAll<HTMLElement>('[role="option"]')].map(
      (option) => option.textContent?.trim(),
    )
    expect(enemyKinds).toEqual([
      '伤害',
      '回体力',
      '上状态',
      '下毒',
      '条件门',
      '即死',
      '直接增减资源',
    ])
    expect(enemyKinds).not.toContain('召唤')
    expect(enemyKinds).not.toContain('回真气')
  })
})
