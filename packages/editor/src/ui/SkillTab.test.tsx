// @vitest-environment jsdom
import type { ItemData, SkillData } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import { namedIdChoiceLabel } from './NamedIdPicker.js'
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
      contentVersion: 1,
      engineVersion: 'test',
      entryScene: 's001',
      startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
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
    startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
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
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
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

    expect(host.querySelector<HTMLInputElement>('input[aria-label^="物品（可按名称"]')?.value).toBe(
      '蛊（148）',
    )
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
    const pickers = host.querySelectorAll<HTMLInputElement>('input[aria-label^="物品（可按名称"]')
    expect(pickers[0]!.value).toBe('未知物品（missing）')
    expect(pickers[0]!.getAttribute('aria-invalid')).toBe('true')
    expect(
      [...host.querySelectorAll('datalist')[0]!.options].map((option) => option.value),
    ).toEqual(['酒（86）'])

    await setInput(pickers[0]!, namedIdChoiceLabel({ id: '86', name: '酒' }))
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
})

describe('SkillTab · 效果卡片', () => {
  test('预览归属对应卡片，排序与删除同步保留结构', async () => {
    const value = skill()
    value.effects = [
      { kind: 'trance', battleSprite: 'player-fighter-5' },
      { kind: 'buffStat', stat: 'attack', percent: 100, duration: 'battle' },
      { kind: 'summon', battleSprite: 'summon-1' },
    ]
    const session = new EditSession(state([value]))
    await act(async () => root.render(<Harness session={session} />))

    const chain = host.querySelector<HTMLOListElement>('[data-skill-effect-chain="base"]')!
    const cards = () => [...chain.querySelectorAll<HTMLElement>('.skill-effect-card')]
    expect(cards().map((card) => card.dataset.effectKind)).toEqual(['trance', 'buffStat', 'summon'])
    expect(cards()[0]!.querySelector('[data-testid="trance-preview"]')).not.toBeNull()
    expect(cards()[0]!.querySelector('[data-effect-preview]')?.textContent).toContain(
      '变身形象预览',
    )
    expect(cards()[1]!.querySelector('[data-effect-preview]')).toBeNull()
    expect(cards()[2]!.querySelector('[data-testid="summon-preview"]')).not.toBeNull()
    expect(cards()[2]!.querySelector('[data-effect-preview]')?.textContent).toContain(
      '召唤形象预览',
    )

    await act(async () =>
      chain.querySelector<HTMLButtonElement>('button[aria-label="下移效果 1"]')!.click(),
    )
    expect(session.getState().skills[0]!.effects.map((effect) => effect.kind)).toEqual([
      'buffStat',
      'trance',
      'summon',
    ])
    expect(cards().map((card) => card.dataset.effectKind)).toEqual(['buffStat', 'trance', 'summon'])
    expect(cards()[0]!.querySelector('[data-effect-preview]')).toBeNull()
    expect(cards()[1]!.querySelector('[data-testid="trance-preview"]')).not.toBeNull()

    await act(async () =>
      chain.querySelector<HTMLButtonElement>('button[aria-label="删除效果 2"]')!.click(),
    )
    expect(session.getState().skills[0]!.effects.map((effect) => effect.kind)).toEqual([
      'buffStat',
      'summon',
    ])
    expect(cards()).toHaveLength(2)
    expect(cards()[0]!.querySelector('[data-effect-preview]')).toBeNull()
    expect(cards()[1]!.querySelector('[data-testid="summon-preview"]')).not.toBeNull()
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
