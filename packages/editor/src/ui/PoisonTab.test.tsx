// @vitest-environment jsdom
import type { PoisonDef, SkillData } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { BattleDataReference } from '../core/battle-data-references.js'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import { verifyInspectorTabs } from './inspector-tabs-test-utils.js'
import { PoisonTab } from './PoisonTab.js'

const poisons: PoisonDef[] = [
  { id: 1, name: '赤蝎粉', curability: 'common', color: 2, playerTicks: [{ hpDelta: -5 }] },
  { id: 2, name: '无影毒', curability: 'incurable', color: 0 },
]

const poisonSkill: SkillData = {
  id: 'skill-poison',
  name: '万蚁蛀象',
  desc: '',
  cost: {},
  usableOutsideBattle: false,
  target: 'oneEnemy',
  effects: [{ kind: 'applyPoison', poisonId: '1' }],
  animation: { effectSprite: 0 },
}

function state(): EditorState {
  return {
    manifest: {
      id: 'test',
      contentVersion: 13,
      minEngineVersion: '2.0.0',
      entryScene: 's001',
      startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
      assets: { catalog: 'assets/index.json', roles: {} },
    },
    scenes: [],
    actors: [],
    levelUp: {},
    skills: [poisonSkill],
    items: [],
    enemies: [],
    enemyTeams: [],
    poisons,
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
  } as unknown as EditorState
}

function Harness(props: {
  session: EditSession
  focusObjectId?: string
  onOpenReference?: (reference: BattleDataReference) => void
}) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const current = props.session.getState()
  return (
    <PoisonTab
      poisons={current.poisons ?? []}
      items={current.items}
      session={props.session}
      focusObjectId={props.focusObjectId}
      onOpenReference={props.onOpenReference}
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

describe('PoisonTab shared workbench', () => {
  test('检查器使用共享引用/关系/说明 Tab 完整键盘与 ARIA 合同', async () => {
    const session = new EditSession(state())
    await act(async () => root.render(<Harness session={session} />))
    await verifyInspectorTabs(host, '毒检查器', [/^引用 \d+$/, '关系', '说明'])
  })

  test('可新建、编辑，并由数值 object 深链精确定位', async () => {
    vi.spyOn(window, 'prompt').mockReturnValue('新毒')
    const session = new EditSession(state())
    await act(async () => root.render(<Harness session={session} focusObjectId="2" />))
    expect(host.querySelector('h1')?.textContent).toBe('无影毒')

    const nameLabel = [...host.querySelectorAll<HTMLLabelElement>('label')].find(
      (candidate) => candidate.textContent?.trim() === '名字',
    )!
    const name = document.getElementById(nameLabel.htmlFor) as HTMLInputElement
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    await act(async () => {
      setter.call(name, '无影毒·改')
      name.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(session.getState().poisons?.find((entry) => entry.id === 2)?.name).toBe('无影毒·改')

    const create = [...host.querySelectorAll<HTMLButtonElement>('button')].find((button) =>
      button.textContent?.includes('新建毒'),
    )!
    await act(async () => create.click())
    expect(session.getState().poisons?.at(-1)).toMatchObject({ id: 1000, name: '新毒' })
    expect(host.querySelector('h1')?.textContent).toBe('新毒')
    await act(async () => expect(session.undo()).toBe(true))
    expect(session.getState().poisons?.some((entry) => entry.id === 1000)).toBe(false)
  })

  test('共享 Hero/目录/分区，不借用技能页私有布局类', async () => {
    const open = vi.fn()
    const session = new EditSession(state())
    await act(async () => root.render(<Harness session={session} onOpenReference={open} />))

    expect(host.querySelector('h1')?.textContent).toBe('赤蝎粉')
    expect(host.querySelectorAll('.ds-catalog-row')).toHaveLength(2)
    expect(host.querySelectorAll('.ds-workbench-section').length).toBeGreaterThanOrEqual(3)
    expect(host.querySelector('.ds-sequence-index [aria-hidden="true"]')?.textContent).toBe('1')
    expect(host.querySelector('.ds-sequence-index .ds-visually-hidden')?.textContent).toBe(
      '第 1 回合',
    )
    expect(host.querySelector('.skill-form')).toBeNull()
    expect(host.querySelector('.sk-grid')).toBeNull()
    expect(
      [...host.querySelectorAll<HTMLButtonElement>('button')].find(
        (button) => button.textContent === '删除毒',
      )?.disabled,
    ).toBe(true)
    const reference = host.querySelector<HTMLButtonElement>('.battle-data-reference-list button')!
    await act(async () => reference.click())
    expect(open).toHaveBeenCalledWith(
      expect.objectContaining({ locator: { kind: 'skill', skillId: 'skill-poison' } }),
    )
  })

  test('无引用毒可删除并精确撤销', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const session = new EditSession(state())
    await act(async () => root.render(<Harness session={session} focusObjectId="2" />))
    expect(host.querySelector('h1')?.textContent).toBe('无影毒')
    const remove = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent === '删除毒',
    )!
    await act(async () => remove.click())
    expect(session.getState().poisons?.map((entry) => entry.id)).toEqual([1])
    await act(async () => expect(session.undo()).toBe(true))
    expect(session.getState().poisons?.map((entry) => entry.id)).toEqual([1, 2])
  })
})
