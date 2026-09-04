// @vitest-environment jsdom
import type { EnemyDef } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import type { EditorDerivedStatus } from '../core/editor-derived-contract.js'
import type { ProjectReferenceIndex } from '../core/project-reference.js'
import {
  type CurrentProjectReferenceIndexProvider,
  collectCurrentProjectReferenceIndex,
} from '../core/project-reference-adapters.js'
import type { ScriptEditorState } from '../core/script-editor.js'
import { EnemyTeamTab } from './EnemyTeamTab.js'
import { verifyCanonicalObjectWorkspace } from './object-workspace-test-utils.js'

function enemy(id: string, exp: number): EnemyDef {
  return {
    id,
    name: `name.${id}`,
    battleSprite: 'battle.enemy',
    yPosOffset: 0,
    stats: {
      health: 1,
      level: 1,
      exp,
      cash: exp * 2,
      attackStrength: 1,
      magicStrength: 1,
      defense: 1,
      dexterity: 1,
      fleeRate: 1,
      physicalResistance: 0,
      poisonResistance: 0,
      elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
      dualMove: false,
      collectValue: exp * 3,
    },
    ai: { resistanceToSorcery: 0 },
    sounds: {},
  }
}

function state(): EditorState {
  return {
    manifest: {
      id: 'demo',
      name: 'Demo',
      contentVersion: 19,
      minimumSaveVersion: 8,
      defaultEntryId: 'main',
      entryPoints: [
        {
          id: 'main',
          label: '主要入口',
          scene: 's001',
          startWorld: { party: [], money: 0, inventory: [] },
        },
      ],
      content: {},
      assets: { catalog: 'assets/index.json', roles: {} },
    },
    scenes: [
      {
        id: 's001',
        mapId: 'map-001',
        entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        entities: [
          {
            id: 'e1',
            sprite: 'npc',
            pos: { col: 0, row: 0, height: 0 },
            hostile: { enemyTeamId: 'team-c1' },
          },
        ],
      },
    ],
    actors: [],
    skills: [],
    items: [],
    enemies: [enemy('enemy-a', 5)],
    enemyTeams: [{ id: 'team-c1', slots: ['enemy-a', null, 'enemy-a'] }],
    locale: { 'name.enemy-a': '赤鬼' },
    sprites: [],
    battleSprites: [],
    maps: {},
    mapIndex: { version: 1, maps: [] },
    stamps: [],
    tilesetBlobs: {},
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
    scriptChunks: {},
  } as unknown as EditorState
}

function Harness(props: {
  session: EditSession
  focusObjectId?: string
  onObjectFocus?: (id: string | undefined) => void
  onOpenEnemy?: (id: string) => void
  referenceStatus?: EditorDerivedStatus
  referenceIndex?: ProjectReferenceIndex
  omitReferenceIndex?: boolean
  getCurrentReferenceIndex?: CurrentProjectReferenceIndexProvider
}) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const current = props.session.getState()
  const currentReferences = (next: EditorState) => collectCurrentProjectReferenceIndex(next)
  const index = props.omitReferenceIndex
    ? undefined
    : (props.referenceIndex ?? currentReferences(current))
  return (
    <EnemyTeamTab
      enemyTeams={current.enemyTeams ?? []}
      enemies={current.enemies ?? []}
      items={current.items}
      locale={current.locale}
      assetCatalog={current.assetCatalog}
      worldVariables={current.worldVariables ?? {}}
      actors={current.actors}
      scenes={current.scenes}
      projectId="demo"
      session={props.session}
      referenceIndex={index}
      referenceStatus={props.referenceStatus ?? 'current'}
      getCurrentReferenceIndex={props.getCurrentReferenceIndex ?? currentReferences}
      focusObjectId={props.focusObjectId}
      onObjectFocus={props.onObjectFocus}
      onOpenEnemy={props.onOpenEnemy}
    />
  )
}

let root: Root
let host: HTMLDivElement

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.restoreAllMocks()
})

describe('EnemyTeamTab authoring closure', () => {
  test('selected、creating 与 empty 共用唯一 canonical main owner', async () => {
    const selectedSession = new EditSession(state())
    await act(async () => root.render(<Harness session={selectedSession} />))
    const selected = verifyCanonicalObjectWorkspace(host, '敌队工作区')
    expect(selected.content.querySelector('.enemy-team-slots')).not.toBeNull()

    const createTrigger = host.querySelector<HTMLButtonElement>('button[aria-label="新建敌队"]')!
    await act(async () => {
      createTrigger.focus()
      createTrigger.click()
    })
    const creating = verifyCanonicalObjectWorkspace(host, '敌队工作区', { hero: false })
    expect(creating.content).toBe(selected.content)
    expect(creating.content.querySelector('.enemy-team-create-card')).not.toBeNull()
    expect(document.activeElement).toBe(creating.content.querySelector('input'))

    const emptyState = state()
    emptyState.enemyTeams = []
    await act(async () =>
      root.render(
        <Harness key="empty-enemy-team-workspace" session={new EditSession(emptyState)} />,
      ),
    )
    const empty = verifyCanonicalObjectWorkspace(host, '敌队工作区', { hero: false })
    expect(empty.content.textContent).toContain('还没有敌队')
  })

  test('目录以成员派生标题分组重复项，第二行保留精确 EnemyTeamId', async () => {
    const current = state()
    current.enemies = [enemy('enemy-a', 5), enemy('enemy-b', 7)]
    current.enemyTeams = [
      { id: 'team-mixed', slots: ['enemy-a', null, 'enemy-b', 'enemy-a'] },
      { id: 'team-empty', slots: [null, null] },
      { id: 'team-missing', slots: ['enemy-unknown'] },
    ]
    current.locale = { 'name.enemy-a': '赤鬼', 'name.enemy-b': '青鬼' }
    const session = new EditSession(current)
    const onObjectFocus = vi.fn()
    await act(async () => root.render(<Harness session={session} onObjectFocus={onObjectFocus} />))

    const rows = [
      ...host.querySelectorAll<HTMLButtonElement>('.enemy-team-catalog .ds-catalog-row'),
    ]
    expect(rows.map((row) => row.querySelector('.ds-catalog-row__title')?.textContent)).toEqual([
      '赤鬼×2、青鬼',
      '空敌队',
      'enemy-unknown',
    ])
    expect(rows.map((row) => row.querySelector('.ds-catalog-row__meta')?.textContent)).toEqual([
      'team-mixed',
      'team-empty',
      'team-missing',
    ])
    expect(rows.every((row) => !row.textContent?.includes('team.pal.'))).toBe(true)
    expect(rows.every((row) => !row.textContent?.includes('语义槽'))).toBe(true)
    expect(rows.every((row) => !row.querySelector('.ds-catalog-row__trailing'))).toBe(true)

    await act(async () => rows[2]!.click())
    expect(onObjectFocus).toHaveBeenLastCalledWith('team-missing')
    expect(host.querySelector('.ds-object-hero__title')?.textContent).toBe('team-missing')
  })

  test('renders five semantic slots, duplicate-member totals, full stable trial id and blocking reference', async () => {
    const session = new EditSession(state())
    await act(async () => root.render(<Harness session={session} />))
    const slots = [...host.querySelectorAll<HTMLElement>('.enemy-team-slot')]
    expect(slots).toHaveLength(5)
    for (const slot of slots) {
      expect(slot.classList.contains('ds-repeat-row')).toBe(true)
      expect(slot.dataset.density).toBe('compact')
      const moveButtons = [...slot.querySelectorAll<HTMLElement>('.ds-icon-button')]
      expect(moveButtons).toHaveLength(2)
      expect(
        moveButtons.every((button) => button.classList.contains('ds-icon-button--compact')),
      ).toBe(true)
    }
    const hero = host.querySelector<HTMLElement>('.ds-object-hero')!
    expect(hero.dataset.hasMedia).toBe('false')
    expect(hero.querySelector('.ds-object-hero__media')).toBeNull()
    expect(hero.textContent).not.toContain('⚔')
    expect(
      host.querySelector<HTMLElement>('.enemy-team-catalog .ds-catalog-row')?.dataset.leading,
    ).toBe('none')
    expect(host.querySelector('.enemy-team-catalog .ds-catalog-row__title')?.textContent).toBe(
      '赤鬼×2',
    )
    expect(host.querySelector('.enemy-team-catalog .ds-catalog-row__meta')?.textContent).toBe(
      'team-c1',
    )
    expect(host.textContent).toContain('10 经验')
    expect(host.textContent).toContain('20 金钱')
    expect(host.textContent).toContain('30 收妖值')
    expect(host.textContent).toContain('场景 s001 · 实体 e1')
    expect(host.textContent).toContain('敌对实体')
    expect(host.querySelector<HTMLAnchorElement>('a[href*="battle="]')?.getAttribute('href')).toBe(
      'play.html?project=demo&battle=team-c1',
    )
    expect(
      [...host.querySelectorAll<HTMLButtonElement>('button')].find((button) =>
        button.textContent?.includes('删除敌队'),
      )?.disabled,
    ).toBe(true)
  })

  test('重复敌槽逐行显示同一击败后语义摘要，不再暴露底层命令计数', async () => {
    const current = state()
    current.items = [
      {
        id: '115',
        name: 'name.item.115',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
      },
    ]
    current.locale = { ...current.locale, 'name.item.115': '蜂巢', 'dlg.13119': '获得一个蜂巢' }
    current.enemies![0] = {
      ...current.enemies![0]!,
      onDefeated: [
        {
          kind: 'branch',
          cond: { kind: 'chance', percent: 89 },
          then: [{ kind: 'stopScript' }],
        },
        { kind: 'giveItem', itemId: '115', count: 1 },
        {
          kind: 'dialog',
          cue: { identity: { kind: 'narration' }, rows: [{ text: 'dlg.13119' }] },
        },
      ] as unknown as EnemyDef['onDefeated'],
    }
    const session = new EditSession(current)
    const onOpenEnemy = vi.fn()
    await act(async () => root.render(<Harness session={session} onOpenEnemy={onOpenEnemy} />))

    const memberRows = [
      ...host.querySelectorAll<HTMLButtonElement>('.enemy-team-member-summary > button'),
    ]
    expect(memberRows).toHaveLength(2)
    expect(memberRows.every((row) => row.textContent?.includes('击败后：11% 获得蜂巢 ×1'))).toBe(
      true,
    )
    expect(host.textContent).toContain('重复成员按槽位各结算一次')
    expect(host.textContent).not.toContain('战败指令')
    expect(host.textContent).not.toContain('3 条')

    await act(async () => memberRows[1]!.click())
    expect(onOpenEnemy).toHaveBeenCalledWith('enemy-a')
  })

  test('偷取摘要使用字面量道具名，缺失引用才保留 ID，金钱哨兵语义不变', async () => {
    const current = state()
    current.items = [
      {
        id: '125',
        name: '断肠草',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
      },
    ]
    current.locale = {
      'name.enemy-known': '金蟾鬼母',
      'name.enemy-missing': '金蟾',
      'name.enemy-money-zero': '钱袋甲',
      'name.enemy-money-empty': '钱袋乙',
      断肠草: '不应替换字面量道具名',
    }
    current.enemies = [
      { ...enemy('enemy-known', 5), steal: { itemId: '125', count: 9 } },
      { ...enemy('enemy-missing', 5), steal: { itemId: '999', count: 2 } },
      { ...enemy('enemy-money-zero', 5), steal: { itemId: '0', count: 3 } },
      { ...enemy('enemy-money-empty', 5), steal: { itemId: '', count: 4 } },
    ]
    current.enemyTeams = [
      {
        id: 'team-c1',
        slots: ['enemy-known', 'enemy-missing', 'enemy-money-zero', 'enemy-money-empty'],
      },
    ]
    const session = new EditSession(current)
    await act(async () => root.render(<Harness session={session} />))

    const memberRows = [
      ...host.querySelectorAll<HTMLButtonElement>('.enemy-team-member-summary > button'),
    ]
    expect(memberRows[0]?.textContent).toContain('偷物 断肠草 ×9')
    expect(memberRows[0]?.textContent).not.toContain('偷物 125')
    expect(memberRows[0]?.textContent).not.toContain('不应替换字面量道具名')
    expect(memberRows[1]?.textContent).toContain('偷物 999（引用缺失） ×2')
    expect(memberRows[2]?.textContent).toContain('偷钱 ×3')
    expect(memberRows[3]?.textContent).toContain('偷钱 ×4')
  })

  test('copies the current preset and creates an arbitrary stable id through the workbench', async () => {
    const session = new EditSession(state())
    await act(async () => root.render(<Harness session={session} />))

    await act(async () =>
      host.querySelector<HTMLButtonElement>('button[aria-label="复制当前敌队"]')!.click(),
    )
    expect(session.getState().enemyTeams?.find((team) => team.id === 'team-c2')?.slots).toEqual([
      'enemy-a',
      null,
      'enemy-a',
    ])
    expect(host.querySelector('h1')?.textContent).toBe('team-c2')
    await act(async () => expect(session.undo()).toBe(true))

    await act(async () =>
      host.querySelector<HTMLButtonElement>('button[aria-label="新建敌队"]')!.click(),
    )
    const idInput = host.querySelector<HTMLInputElement>('.enemy-team-create-card input')!
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    await act(async () => {
      valueSetter.call(idInput, 'boss.final')
      idInput.dispatchEvent(new Event('input', { bubbles: true }))
    })
    const create = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent?.trim() === '创建敌队',
    )!
    await act(async () => create.click())
    expect(session.getState().enemyTeams?.at(-1)).toEqual({ id: 'boss.final', slots: [] })
    expect(host.querySelector('h1')?.textContent).toBe('boss.final')
  })

  test('[reorder-family:enemy-team-fixed-slots] handle swaps with an empty slot without compression in one command', async () => {
    const session = new EditSession(state())
    await act(async () => root.render(<Harness session={session} />))
    expect(host.querySelectorAll('.enemy-team-slot.ds-repeat-row')).toHaveLength(5)
    const first = host.querySelectorAll<HTMLElement>('[data-ds-reorder-item]')[0]!
    const handle = first.querySelector<HTMLButtonElement>('[data-ds-reorder-handle]')!
    await act(async () => {
      for (let index = 0; index < 20; index += 1)
        handle.dispatchEvent(new MouseEvent('pointermove', { bubbles: true }))
    })
    expect(session.getHistoryVersion()).toBe(0)
    await act(async () => {
      handle.focus()
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    })
    expect(session.getHistoryVersion()).toBe(1)
    expect(session.getState().enemyTeams?.[0]?.slots).toEqual([null, 'enemy-a', 'enemy-a'])
    expect(host.querySelectorAll('.enemy-team-slot')).toHaveLength(5)
    const reorderedItems = [...host.querySelectorAll<HTMLElement>('[data-ds-reorder-item]')]
    const committedKeys = reorderedItems.map((item) => item.dataset.itemKey)
    expect(document.activeElement).toBe(handle)
    expect(reorderedItems.indexOf(handle.closest<HTMLElement>('[data-ds-reorder-item]')!)).toBe(1)
    expect(handle.closest<HTMLElement>('[data-ds-reorder-item]')?.textContent).toContain('赤鬼')
    await act(async () => expect(session.undo()).toBe(true))
    expect(session.getState().enemyTeams?.[0]?.slots).toEqual(['enemy-a', null, 'enemy-a'])
    const undoKeys = [...host.querySelectorAll<HTMLElement>('[data-ds-reorder-item]')].map(
      (item) => item.dataset.itemKey,
    )
    expect(undoKeys.some((key) => committedKeys.includes(key))).toBe(false)
    await act(async () => expect(session.redo()).toBe(true))
    expect(session.getState().enemyTeams?.[0]?.slots).toEqual([null, 'enemy-a', 'enemy-a'])
    const redoKeys = [...host.querySelectorAll<HTMLElement>('[data-ds-reorder-item]')].map(
      (item) => item.dataset.itemKey,
    )
    expect(redoKeys.some((key) => undoKeys.includes(key))).toBe(false)

    const history = session.getHistoryVersion()
    const fourth = host.querySelectorAll<HTMLElement>('[data-ds-reorder-item]')[3]!
    await act(async () =>
      fourth.querySelector<HTMLButtonElement>('[aria-label="槽 4 下移"]')!.click(),
    )
    expect(session.getHistoryVersion()).toBe(history)
  })

  test.each([
    ['checking', 'loading'],
    ['stale', 'partial'],
    ['failed', 'error'],
  ] as const)('%s 引用快照不冒充零引用并禁用删除', async (status, panelState) => {
    const session = new EditSession(state())
    await act(async () => root.render(<Harness session={session} referenceStatus={status} />))
    expect(host.querySelector('.ds-reference-panel')?.getAttribute('data-state')).toBe(panelState)
    expect(host.textContent).toContain('数量未知')
    expect(
      [...host.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
        candidate.textContent?.includes('删除敌队'),
      )?.disabled,
    ).toBe(true)
  })

  test('current 但索引缺失时仍按失败态关闭删除', async () => {
    const session = new EditSession(state())
    await act(async () =>
      root.render(<Harness session={session} omitReferenceIndex referenceStatus="current" />),
    )
    expect(host.querySelector('.ds-reference-panel')?.getAttribute('data-state')).toBe('error')
    expect(host.textContent).toContain('数量未知')
  })

  test('展示为零后删除仍以 live canonical oracle 为准', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const current = state()
    current.scenes = []
    current.enemyTeams = [{ id: 'team-c2', slots: [] }]
    const session = new EditSession(current)
    const canonical: ScriptEditorState = {
      scenes: [],
      items: [],
      sharedScripts: {
        'shared/live': {
          name: '实时开战',
          self: 'none',
          body: [{ kind: 'startBattle', enemyTeamId: 'team-c2' }],
        },
      },
    }
    await act(async () =>
      root.render(
        <Harness
          session={session}
          getCurrentReferenceIndex={(editorState) =>
            collectCurrentProjectReferenceIndex(editorState, canonical)
          }
        />,
      ),
    )
    const remove = [...host.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
      candidate.textContent?.includes('删除敌队'),
    )!
    expect(remove.disabled).toBe(false)
    await act(async () => remove.click())
    expect(session.getState().enemyTeams?.some((team) => team.id === 'team-c2')).toBe(true)
    expect(host.textContent).toContain('仍有 1 处引用')
  })

  test('live oracle 失败时保留敌队并显示错误', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const current = state()
    current.scenes = []
    current.enemyTeams = [{ id: 'team-c2', slots: [] }]
    const session = new EditSession(current)
    await act(async () =>
      root.render(
        <Harness
          session={session}
          getCurrentReferenceIndex={() => {
            throw new Error('oracle down')
          }}
        />,
      ),
    )
    const remove = [...host.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
      candidate.textContent?.includes('删除敌队'),
    )!
    await act(async () => remove.click())
    expect(session.getState().enemyTeams?.some((team) => team.id === 'team-c2')).toBe(true)
    expect(host.textContent).toContain('oracle down')
  })
})
