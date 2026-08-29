// @vitest-environment jsdom
import type { PoisonDef, SkillData } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  type BattleDataReference,
  blockingPoisonReferenceMap,
} from '../core/battle-data-references.js'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import { setCatalogSearch } from './catalog-controls-test-utils.js'
import { verifyCatalogWorkspace } from './catalog-workspace-test-utils.js'
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
    levelUp: {},
    skills: [poisonSkill],
    items: [],
    enemies: [],
    enemyTeams: [],
    poisons,
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
  } as unknown as EditorState
}

function Harness(props: {
  session: EditSession
  focusObjectId?: string
  onOpenReference?: (reference: BattleDataReference) => void
  referenceIndex?: ReadonlyMap<string, readonly BattleDataReference[]>
  referenceStatus?: 'checking' | 'stale' | 'current' | 'failed'
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
      referenceIndex={props.referenceIndex ?? blockingPoisonReferenceMap(current)}
      referenceStatus={props.referenceStatus ?? 'current'}
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
  test('毒目录以名称、ID、可解度分槽且不伪造媒体位', async () => {
    const session = new EditSession(state())
    await act(async () => root.render(<Harness session={session} focusObjectId="1" />))
    verifyCatalogWorkspace(host, '毒目录')

    const rows = [
      ...host.querySelectorAll<HTMLElement>('.ds-catalog-workspace__content .ds-catalog-row'),
    ]
    expect(rows).toHaveLength(2)
    expect(rows.every((row) => row.dataset.leading === 'none')).toBe(true)
    expect(rows[0]!.querySelector('.ds-catalog-row__title')?.textContent).toBe('赤蝎粉')
    expect(rows[0]!.querySelector('.ds-catalog-row__meta')?.textContent).toBe('1')
    expect(rows[0]!.querySelector('.ds-catalog-row__trailing .ds-tag')?.textContent).toBe('常规')
  })

  test('目录搜索覆盖命中、空结果与清空恢复，且不会偷换深链选择', async () => {
    const session = new EditSession(state())
    await act(async () => root.render(<Harness session={session} focusObjectId="2" />))
    const search = host.querySelector<HTMLInputElement>('input[aria-label="过滤毒"]')!
    expect(host.querySelectorAll('.ds-catalog-row')).toHaveLength(2)

    await setCatalogSearch(search, '赤蝎')
    expect(host.querySelectorAll('.ds-catalog-row')).toHaveLength(1)
    expect(host.querySelector('.ds-catalog-row[data-selected="true"]')).toBeNull()
    expect(host.querySelector('h1')?.textContent).toBe('无影毒')

    await setCatalogSearch(search, '不存在')
    expect(host.querySelectorAll('.ds-catalog-row')).toHaveLength(0)
    await setCatalogSearch(search, '')
    expect(host.querySelectorAll('.ds-catalog-row')).toHaveLength(2)
    expect(host.querySelector('.ds-catalog-row[data-selected="true"]')?.textContent).toContain(
      '无影毒',
    )
  })

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
    const historyBefore = session.getHistoryVersion()
    await act(async () => {
      for (let index = 1; index <= 100; index += 1) {
        setter.call(name, `无影毒·改${index}`)
        name.dispatchEvent(new Event('input', { bubbles: true }))
      }
    })
    expect(session.getState().poisons?.find((entry) => entry.id === 2)?.name).toBe('无影毒')
    expect(session.getHistoryVersion()).toBe(historyBefore)
    await act(async () => name.dispatchEvent(new FocusEvent('focusout', { bubbles: true })))
    expect(session.getState().poisons?.find((entry) => entry.id === 2)?.name).toBe('无影毒·改100')
    expect(session.getHistoryVersion()).toBe(historyBefore + 1)

    const create = host.querySelector<HTMLButtonElement>('button[aria-label="新建毒"]')!
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
    const reference = host.querySelector<HTMLButtonElement>(
      '.ds-reference-list .ds-reference-row[data-actionable="true"]',
    )!
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

  test('[reorder-family:poison-ticks] 回合 handle 有效移动单命令，同值移动零命令并可 undo/redo', async () => {
    const editorState = state()
    editorState.poisons = editorState.poisons!.map((poison, index) =>
      index === 0
        ? {
            ...poison,
            playerTicks: [{ hpDelta: -5 }, { hpDelta: -5 }, { hpDelta: -9 }],
            enemyTicks: [{ mpDelta: -2 }, { mpDelta: -4 }],
          }
        : poison,
    )
    const session = new EditSession(editorState)
    await act(async () => root.render(<Harness session={session} focusObjectId="1" />))
    const playerCollection = host.querySelector<HTMLElement>(
      '[data-ds-reorder-adoption="poison/ticks"][data-ds-reorder-scope="poison:1:player-ticks"]',
    )!
    const handle = playerCollection.querySelector<HTMLButtonElement>('[data-ds-reorder-handle]')!
    const sourceToken = handle.dataset.reorderKey
    const rows = () => playerCollection.querySelectorAll<HTMLElement>('[data-ds-reorder-item]')
    await act(async () => {
      for (let index = 0; index < 20; index += 1)
        handle.dispatchEvent(new MouseEvent('pointermove', { bubbles: true }))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(session.getHistoryVersion()).toBe(0)
    expect(rows()[0]?.dataset.itemKey).toBe(sourceToken)
    expect(session.getState().poisons?.[0]?.enemyTicks).toEqual([{ mpDelta: -2 }, { mpDelta: -4 }])

    await act(async () => {
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(session.getHistoryVersion()).toBe(1)
    expect(session.getState().poisons?.[0]?.playerTicks).toEqual([
      { hpDelta: -5 },
      { hpDelta: -9 },
      { hpDelta: -5 },
    ])
    expect(rows()[2]?.dataset.itemKey).toBe(sourceToken)
    expect(session.getState().poisons?.[0]?.enemyTicks).toEqual([{ mpDelta: -2 }, { mpDelta: -4 }])
    await act(async () => expect(session.undo()).toBe(true))
    expect(session.getState().poisons?.[0]?.playerTicks).toEqual([
      { hpDelta: -5 },
      { hpDelta: -5 },
      { hpDelta: -9 },
    ])
    await act(async () => expect(session.redo()).toBe(true))
    expect(session.getState().poisons?.[0]?.playerTicks?.[1]).toEqual({ hpDelta: -9 })
    expect(session.getState().poisons?.[0]?.enemyTicks).toEqual([{ mpDelta: -2 }, { mpDelta: -4 }])
  })

  test('引用快照未就绪时 fail-closed，失败与过期状态不伪装成零引用', async () => {
    const session = new EditSession(state())
    await act(async () =>
      root.render(
        <Harness
          session={session}
          focusObjectId="2"
          referenceIndex={new Map()}
          referenceStatus="stale"
        />,
      ),
    )
    const remove = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent === '删除毒',
    )!
    expect(remove.disabled).toBe(true)
    expect(remove.title).toContain('仍在检查')
    expect(host.querySelector('.ds-reference-panel')?.getAttribute('data-state')).toBe('partial')
    expect(host.textContent).toContain('数量未知')

    await act(async () =>
      root.render(
        <Harness
          session={session}
          focusObjectId="2"
          referenceIndex={new Map()}
          referenceStatus="failed"
        />,
      ),
    )
    expect(host.querySelector('.ds-reference-panel')?.getAttribute('data-state')).toBe('error')
    expect(host.textContent).toContain('无法完成引用检查')
  })

  test('派生索引漏掉当前引用时，删除命令仍同步重验并阻断', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const session = new EditSession(state())
    await act(async () =>
      root.render(
        <Harness
          session={session}
          focusObjectId="1"
          referenceIndex={new Map()}
          referenceStatus="current"
        />,
      ),
    )
    const remove = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent === '删除毒',
    )!
    expect(remove.disabled).toBe(false)
    await act(async () => remove.click())
    expect(session.getState().poisons?.some((entry) => entry.id === 1)).toBe(true)
  })
})
