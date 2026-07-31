// @vitest-environment jsdom
import type { ItemData, SkillData } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import { namedIdChoiceLabel } from './NamedIdPicker.js'
import { SkillTab } from './SkillTab.js'

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

function skill(cost: SkillData['cost'] = { mp: 22 }): SkillData {
  return {
    id: '352',
    name: '三尸咒',
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
      battleSprites={current.battleSprites}
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
})

const setInput = async (input: HTMLInputElement, value: string): Promise<void> => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  await act(async () => {
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('SkillTab · 施法物品成本', () => {
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

    expect(
      host.querySelector<HTMLInputElement>('input[aria-label^="物品（可按名称"]')?.value,
    ).toBe('蛊（148）')
    expect(
      host.querySelector<HTMLInputElement>('input[aria-label="消耗物品数量 1"]')?.value,
    ).toBe('1')

    await act(async () =>
      host.querySelector<HTMLButtonElement>('button[aria-label="添加消耗物品"]')!.click(),
    )
    expect(session.getState().skills[0]!.cost.items).toEqual([
      { itemId: '148', amount: 1 },
      { itemId: '86', amount: 1 },
    ])

    await setInput(
      host.querySelector<HTMLInputElement>('input[aria-label="消耗物品数量 2"]')!,
      '3',
    )
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
    expect(pickers[0]!.classList.contains('missing')).toBe(true)
    expect([...host.querySelectorAll('datalist')[0]!.options].map((option) => option.value)).toEqual([
      '酒（86）',
    ])

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
