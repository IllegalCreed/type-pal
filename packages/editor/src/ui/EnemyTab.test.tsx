// @vitest-environment jsdom
import type { EnemyDef, EnemyTeamDef, ItemData } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import type { EditorDerivedStatus } from '../core/editor-derived-contract.js'
import {
  buildProjectReferenceSnapshot,
  createProjectReferenceIndex,
  createProjectReferenceSource,
  type ProjectReferenceEdge,
  type ProjectReferenceIndex,
} from '../core/project-reference.js'
import {
  type CurrentProjectReferenceIndexProvider,
  collectCurrentProjectReferenceIndex,
} from '../core/project-reference-adapters.js'
import { setCatalogSearch } from './catalog-controls-test-utils.js'
import { verifyCatalogWorkspace } from './catalog-workspace-test-utils.js'
import { EnemyTab } from './EnemyTab.js'

function enemy(id: string, ruleTarget?: string): EnemyDef {
  return {
    id,
    name: `name.${id}`,
    battleSprite: 'battle.enemy',
    yPosOffset: 0,
    stats: {
      health: 50,
      level: 1,
      exp: 1,
      cash: 1,
      attackStrength: 10,
      magicStrength: 10,
      defense: 10,
      dexterity: 10,
      fleeRate: 10,
      physicalResistance: 0,
      poisonResistance: 0,
      elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
      dualMove: false,
      collectValue: 0,
    },
    ai: {
      resistanceToSorcery: 0,
      ...(ruleTarget
        ? {
            rules: [
              { at: 'act' as const, do: { kind: 'transform' as const, enemyId: ruleTarget } },
            ],
          }
        : {}),
    },
    sounds: {},
  }
}

function state(): EditorState {
  const enemies = [enemy('enemy-a'), enemy('enemy-b', 'enemy-a')]
  enemies[0] = {
    ...enemies[0]!,
    stats: { ...enemies[0]!.stats, collectValue: 3 },
    steal: { itemId: 'item-a', count: 2 },
    attackEquivItem: { itemId: 'item-b', rate: 3 },
    onDefeated: [
      {
        kind: 'branch',
        cond: { kind: 'chance', percent: 75 },
        then: [{ kind: 'stopScript' }],
      },
      { kind: 'giveItem', itemId: 'item-b', count: 2 },
      {
        kind: 'dialog',
        cue: { identity: { kind: 'narration' }, rows: [{ text: 'dialog.reward' }] },
      },
      { kind: 'giveMoney', delta: 9 },
    ] as unknown as EnemyDef['onDefeated'],
  }
  const enemyTeams: EnemyTeamDef[] = [{ id: 'team-7', slots: ['enemy-a'] }]
  const items: ItemData[] = [
    {
      id: 'item-a',
      name: 'name.item-a',
      desc: [],
      buyPrice: 10,
      sellPrice: 5,
      sellable: true,
    },
    {
      id: 'item-b',
      name: 'name.item-b',
      desc: [],
      buyPrice: 20,
      sellPrice: 10,
      sellable: true,
    },
  ]
  return {
    manifest: {
      id: 'test-project',
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
    levelUp: {},
    skills: [],
    items,
    enemies,
    enemyTeams,
    locale: {
      'name.enemy-a': '赤鬼王',
      'name.enemy-b': '变身者',
      'name.item-a': '还魂香',
      'name.item-b': '金蚕王',
      'dialog.reward': '获得奖励',
    },
    sprites: [],
    battleSprites: [
      {
        id: 'battle.enemy',
        label: '敌人测试精灵',
        asset: 'battle.enemy.asset',
        profile: {
          kind: 'enemy',
          idle: { start: 0, count: 1 },
          magic: { start: 1, count: 0 },
          attack: { start: 1, count: 0 },
          idleTicksPerFrame: 1,
          actTicksPerFrame: 0,
        },
      },
    ],
    maps: {},
    sceneIndex: { version: 1, scenes: [] },
    mapIndex: { version: 1, maps: [] },
    tilesets: [],
    tilesetBlobs: {},
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
    scriptChunks: {},
    stamps: [],
    poisons: [],
  } as unknown as EditorState
}

function Harness(props: {
  session: EditSession
  focusObjectId?: string
  onOpenReference?: (reference: ProjectReferenceEdge) => void
  withAssetBase?: boolean
  referenceStatus?: EditorDerivedStatus
  referenceIndex?: ProjectReferenceIndex
  omitReferenceIndex?: boolean
  getCurrentReferenceIndex?: CurrentProjectReferenceIndexProvider
  onStatusNotice?: (notice: { kind: 'info' | 'error'; message: string } | undefined) => void
}) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const current = props.session.getState()
  const referenceIndex = props.omitReferenceIndex
    ? undefined
    : (props.referenceIndex ?? collectCurrentProjectReferenceIndex(current))
  return (
    <EnemyTab
      enemies={current.enemies ?? []}
      enemyTeams={current.enemyTeams ?? []}
      skills={current.skills}
      items={current.items}
      locale={current.locale}
      session={props.session}
      assetCatalog={current.assetCatalog}
      assetReader={{} as never}
      assetBase={props.withAssetBase ? ({} as never) : undefined}
      battleSprites={current.battleSprites}
      projectId="test-project"
      focusObjectId={props.focusObjectId}
      referenceIndex={referenceIndex}
      referenceStatus={props.referenceStatus ?? 'current'}
      getCurrentReferenceIndex={
        props.getCurrentReferenceIndex ?? ((state) => collectCurrentProjectReferenceIndex(state))
      }
      onOpenReference={props.onOpenReference}
      onStatusNotice={props.onStatusNotice}
    />
  )
}

function enemyBlockingIndex(enemyId: string): ProjectReferenceIndex {
  return createProjectReferenceIndex(
    buildProjectReferenceSnapshot([
      {
        target: { kind: 'enemy', id: enemyId },
        source: createProjectReferenceSource(
          { kind: 'enemy-team', id: 'external-team' },
          '敌队 external-team',
          { deletedWith: [{ kind: 'enemy-team', id: 'external-team' }] },
        ),
        relation: { kind: 'battle-data-use', target: 'enemy', use: 'enemy-team-slot' },
        where: 'enemyTeams.external-team.slots[0]',
        detail: '敌队槽位 1',
        locator: { kind: 'object', object: { kind: 'enemy-team', id: 'external-team' } },
        deletePolicy: 'replace-suggest',
      },
    ]),
  )
}

let root: Root
let host: HTMLDivElement

const setAndCommit = async (input: HTMLInputElement, value: string): Promise<void> => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  await act(async () => {
    input.focus()
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.blur()
  })
}

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

describe('EnemyTab shared workbench', () => {
  test('目录第二行保留原始 EnemyId，不制造点分展示别名', async () => {
    const current = state()
    current.enemies = [enemy('enemy-468')]
    current.enemyTeams = []
    current.locale = { 'name.enemy-468': '蝶精彩依' }
    const session = new EditSession(current)
    await act(async () => root.render(<Harness session={session} />))
    const row = host.querySelector('.ds-catalog-row')!
    expect(row.querySelector('.ds-catalog-row__title')?.textContent).toBe('蝶精彩依')
    expect(row.querySelector('.ds-catalog-row__meta')?.textContent).toBe('enemy-468')
    expect(row.textContent).not.toContain('enemy.pal.')
  })

  test('profile fields stay disabled until the referenced sprite frames are ready', async () => {
    const session = new EditSession(state())
    await act(async () => root.render(<Harness session={session} withAssetBase />))
    const label = [...host.querySelectorAll<HTMLLabelElement>('label')].find(
      (candidate) => candidate.textContent?.trim() === '待机帧',
    )!
    expect((document.getElementById(label.htmlFor) as HTMLInputElement).disabled).toBe(true)
  })

  test('目录搜索覆盖命中、空结果与清空恢复，且不会偷换深链选择', async () => {
    const session = new EditSession(state())
    await act(async () => root.render(<Harness session={session} focusObjectId="enemy-b" />))
    const search = host.querySelector<HTMLInputElement>('input[aria-label="过滤敌人"]')!
    expect(host.querySelectorAll('.ds-catalog-row')).toHaveLength(2)

    await setCatalogSearch(search, '赤鬼王')
    expect(host.querySelectorAll('.ds-catalog-row')).toHaveLength(1)
    expect(host.querySelector('.ds-catalog-row[data-selected="true"]')).toBeNull()
    expect(host.querySelector('h1')?.textContent).toBe('变身者')

    await setCatalogSearch(search, '不存在')
    expect(host.querySelectorAll('.ds-catalog-row')).toHaveLength(0)
    await setCatalogSearch(search, '')
    expect(host.querySelectorAll('.ds-catalog-row')).toHaveLength(2)
    expect(host.querySelector('.ds-catalog-row[data-selected="true"]')?.textContent).toContain(
      '变身者',
    )
  })

  test('可新建、编辑，并由 object 深链精确定位', async () => {
    const session = new EditSession(state())
    await act(async () => root.render(<Harness session={session} focusObjectId="enemy-b" />))
    expect(host.querySelector('h1')?.textContent).toBe('变身者')

    const nameLabel = [...host.querySelectorAll<HTMLLabelElement>('label')].find(
      (candidate) => candidate.textContent?.trim() === '名字',
    )!
    const name = document.getElementById(nameLabel.htmlFor) as HTMLInputElement
    await setAndCommit(name, '变身者·改')
    expect(session.getState().locale['name.enemy-b']).toBe('变身者·改')

    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="新建敌人"]')!.click())
    expect(session.getState().enemies?.at(-1)?.id).toBe('enemy-c1')
    expect(host.querySelector('h1')?.textContent).toBe('新敌人 1')
    await act(async () => expect(session.undo()).toBe(true))
    expect(session.getState().enemies?.some((entry) => entry.id === 'enemy-c1')).toBe(false)
  })

  test('共享 Hero/目录行、试打 URL 与引用跳转保持闭环', async () => {
    const open = vi.fn()
    const session = new EditSession(state())
    await act(async () => root.render(<Harness session={session} onOpenReference={open} />))

    expect(host.querySelector('h1')?.textContent).toBe('赤鬼王')
    const workspace = host.querySelector('.ds-object-workspace')!
    const hero = workspace.querySelector(':scope > .ds-object-hero')!
    const content = workspace.querySelector(':scope > .ds-object-workspace__content.et-scroll')!
    expect(workspace.classList.contains('data-body')).toBe(true)
    expect(hero).not.toBeNull()
    expect(hero.getAttribute('data-has-media')).toBe('true')
    const heroThumbnail = hero.querySelector<HTMLCanvasElement>(
      '.ds-object-hero__media .enemy-battle-sprite-thumbnail',
    )!
    expect(heroThumbnail).toMatchObject({ width: 56, height: 56 })
    expect(heroThumbnail.dataset.placement).toBe('hero')
    expect(hero.textContent).not.toContain('👹')
    expect(content).not.toBeNull()
    expect(content.contains(hero)).toBe(false)
    expect(host.querySelectorAll('.battle-data-form > .ds-workbench-section')).toHaveLength(6)
    expect(host.querySelector('.battle-data-form > .section')).toBeNull()
    const catalogRows = [...host.querySelectorAll<HTMLElement>('.ds-catalog-row')]
    expect(catalogRows).toHaveLength(2)
    expect(catalogRows.every((row) => row.dataset.leading === 'present')).toBe(true)
    expect(catalogRows[0]?.querySelector('.ds-catalog-row__title')?.textContent).toBe('赤鬼王')
    expect(catalogRows[0]?.querySelector('.ds-catalog-row__meta')?.textContent).toBe('enemy-a')
    expect(catalogRows[0]?.querySelector('.ds-catalog-row__trailing')?.textContent).toBe(
      '收服 +3 灵葫值',
    )
    expect(catalogRows[1]?.querySelector('.ds-catalog-row__title')?.textContent).toBe('变身者')
    expect(catalogRows[1]?.querySelector('.ds-catalog-row__meta')?.textContent).toBe('enemy-b')
    expect(catalogRows[1]?.querySelector('.ds-catalog-row__trailing')?.textContent).toBe(
      '收服 +0 灵葫值',
    )
    expect(hero.textContent).toContain('收服 +3 灵葫值')
    const thumbnails = [
      ...host.querySelectorAll<HTMLCanvasElement>(
        '.ds-catalog-row__leading .enemy-battle-sprite-thumbnail[aria-hidden="true"]',
      ),
    ]
    expect(thumbnails).toHaveLength(2)
    expect(thumbnails.every((thumbnail) => thumbnail.width === 36 && thumbnail.height === 36)).toBe(
      true,
    )
    expect(host.querySelectorAll('.ds-catalog-row[data-selected="true"]')).toHaveLength(1)
    const remove = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent === '删除敌人',
    )!
    expect(remove.disabled).toBe(true)
    expect([...remove.classList]).toEqual(
      expect.arrayContaining(['ds-button', 'ds-button--danger']),
    )
    expect(remove.classList.contains('tool')).toBe(false)
    const trials = [...host.querySelectorAll<HTMLAnchorElement>('a')].filter((link) =>
      link.textContent?.includes('试打'),
    )
    expect(trials).toHaveLength(1)
    expect(
      trials.every(
        (trial) => trial.getAttribute('href') === 'play.html?project=test-project&battle=team-7',
      ),
    ).toBe(true)
    expect(
      trials.every(
        (trial) =>
          trial.classList.contains('ds-button') &&
          trial.classList.contains('ds-button--secondary') &&
          !trial.classList.contains('tool') &&
          !trial.classList.contains('pv-btn'),
      ),
    ).toBe(true)
    const inspector = host.querySelector<HTMLElement>('.inspector--tabbed')!
    expect(inspector.querySelector(':scope > .insp-head')).not.toBeNull()
    const inspectorTabs = inspector.querySelector<HTMLElement>('[aria-label="敌人属性分区"]')!
    const tabs = [...inspectorTabs.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
    expect(tabs.map((tab) => tab.textContent)).toEqual(['敌队', '引用 2', '说明'])
    expect(inspector.querySelectorAll('[role="tabpanel"]:not([hidden])')).toHaveLength(1)
    await act(async () =>
      tabs.find((tab) => tab.querySelector('.ds-tab__label')?.textContent === '引用')!.click(),
    )
    const reference = [
      ...host.querySelectorAll<HTMLButtonElement>('.ds-reference-list .ds-reference-row'),
    ].find((button) => button.textContent?.includes('enemy-b'))
    expect(reference).toBeDefined()
    await act(async () => reference!.click())
    expect(open).toHaveBeenCalledWith(
      expect.objectContaining({
        locator: { kind: 'object', object: { kind: 'enemy', id: 'enemy-b' } },
      }),
    )
  })

  test('无引用敌人可删除且保留撤销入口', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const session = new EditSession(state())
    await act(async () => root.render(<Harness session={session} focusObjectId="enemy-b" />))
    expect(host.querySelector('h1')?.textContent).toBe('变身者')
    const remove = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent === '删除敌人',
    )!
    await act(async () => remove.click())
    expect(session.getState().enemies?.map((entry) => entry.id)).toEqual(['enemy-a'])
    await act(async () => expect(session.undo()).toBe(true))
    expect(session.getState().enemies?.map((entry) => entry.id)).toEqual(['enemy-a', 'enemy-b'])
  })

  test('数值与音效按业务分组，字段编辑保持命令与撤销语义', async () => {
    const session = new EditSession(state())
    await act(async () => root.render(<Harness session={session} />))
    verifyCatalogWorkspace(host, '敌人目录')

    const combat = host.querySelector<HTMLElement>('[data-enemy-stat-group="combat"]')!
    const rewards = host.querySelector<HTMLElement>('[data-enemy-stat-group="rewards"]')!
    const capture = host.querySelector<HTMLElement>('[data-enemy-stat-group="capture"]')!
    const actionSounds = host.querySelector<HTMLElement>('[data-enemy-sound-group="actions"]')!
    const stateSounds = host.querySelector<HTMLElement>('[data-enemy-sound-group="states"]')!
    expect(combat.querySelector('legend')?.textContent).toBe('战斗能力')
    expect(combat.querySelectorAll('.ds-field')).toHaveLength(8)
    expect(rewards.querySelector('legend')?.textContent).toBe('战后结算')
    expect(rewards.querySelectorAll('.ds-field')).toHaveLength(2)
    expect(capture.querySelector('legend')?.textContent).toBe('灵葫咒收服')
    expect(capture.querySelectorAll('.ds-field')).toHaveLength(1)
    const collect = capture.querySelector<HTMLInputElement>('input[name$=".stats.collectValue"]')!
    expect(collect.labels?.[0]?.textContent).toContain('收服获得灵葫值')
    expect(capture.textContent).toContain(
      '灵葫咒成功收服该敌人时，实际增加到全局灵葫值；0 表示不增加灵葫值。',
    )
    expect(actionSounds.querySelectorAll('.ds-field')).toHaveLength(3)
    expect(stateSounds.querySelectorAll('.ds-field')).toHaveLength(2)
    expect(host.querySelector('.enemy-sound-option')?.textContent).toContain('施法音优先')

    const health = host.querySelector<HTMLInputElement>('input[name$=".stats.health"]')!
    await setAndCommit(health, '88')
    expect(session.getState().enemies?.[0]?.stats.health).toBe(88)
    await act(async () => expect(session.undo()).toBe(true))
    expect(session.getState().enemies?.[0]?.stats.health).toBe(50)

    const beforeCollect = session.getHistoryVersion()
    await setAndCommit(collect, '5')
    expect(session.getHistoryVersion()).toBe(beforeCollect + 1)
    expect(session.getState().enemies?.[0]?.stats.collectValue).toBe(5)
    await act(async () => expect(session.undo()).toBe(true))
    expect(session.getState().enemies?.[0]?.stats.collectValue).toBe(3)
  })

  test('[reorder-family:enemy-ai] AI handle 同值相邻移动零命令，有效移动单命令且 undo/redo 对称', async () => {
    const editorState = state()
    editorState.enemies![0] = {
      ...editorState.enemies![0]!,
      ai: {
        ...editorState.enemies![0]!.ai,
        rules: [
          { at: 'act', do: { kind: 'attack' } },
          { at: 'act', do: { kind: 'attack' } },
          { at: 'act', do: { kind: 'flee' } },
        ],
      },
    }
    const session = new EditSession(editorState)
    await act(async () => root.render(<Harness session={session} />))
    expect(host.querySelectorAll('.rule-row.ds-repeat-row')).toHaveLength(3)
    const handle = host.querySelector<HTMLButtonElement>('[data-ds-reorder-handle]')!
    await act(async () => {
      for (let index = 0; index < 20; index += 1)
        handle.dispatchEvent(new MouseEvent('pointermove', { bubbles: true }))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(session.getHistoryVersion()).toBe(0)

    await act(async () => {
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(session.getHistoryVersion()).toBe(1)
    expect(session.getState().enemies?.[0]?.ai.rules?.map((rule) => rule.do.kind)).toEqual([
      'attack',
      'flee',
      'attack',
    ])
    expect(session.undo()).toBe(true)
    expect(session.getState().enemies?.[0]?.ai.rules?.map((rule) => rule.do.kind)).toEqual([
      'attack',
      'attack',
      'flee',
    ])
    expect(session.redo()).toBe(true)
    expect(session.getState().enemies?.[0]?.ai.rules?.map((rule) => rule.do.kind)).toEqual([
      'attack',
      'flee',
      'attack',
    ])
  })

  test('物品交互与击败后奖励使用结构化字段，并保留未识别事件', async () => {
    const session = new EditSession(state())
    await act(async () => root.render(<Harness session={session} />))

    expect(host.textContent).not.toContain('JSON 兜底')
    expect(host.querySelector('.battle-data-form textarea')).toBeNull()
    const steal = host.querySelector<HTMLElement>('[data-enemy-item-group="steal"]')!
    const attackEffect = host.querySelector<HTMLElement>('[data-enemy-item-group="attack-effect"]')!
    expect(steal.querySelector('legend')?.textContent).toBe('偷取')
    expect(attackEffect.querySelector('legend')?.textContent).toBe('普攻附带物品效果')
    expect(steal.querySelectorAll('.ds-field')).toHaveLength(3)
    expect(attackEffect.querySelectorAll('.ds-field')).toHaveLength(2)

    const stealMode = steal.querySelector<HTMLButtonElement>('[role="combobox"]')!
    await act(async () => stealMode.click())
    const stealModeListbox = document.getElementById(stealMode.getAttribute('aria-controls')!)!
    const moneyOption = [...stealModeListbox.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (option) => option.textContent?.trim() === '金钱',
    )!
    await act(async () => moneyOption.click())
    expect(session.getState().enemies?.[0]?.steal).toEqual({ itemId: '0', count: 2 })
    await act(async () => expect(session.undo()).toBe(true))
    expect(session.getState().enemies?.[0]?.steal).toEqual({ itemId: 'item-a', count: 2 })

    const probability = host.querySelector<HTMLInputElement>(
      'input[name="enemy.enemy-a.onDefeated.probability"]',
    )!
    await setAndCommit(probability, '40')
    const changedCommands = session.getState().enemies?.[0]?.onDefeated ?? []
    expect(changedCommands[0]).toMatchObject({
      kind: 'branch',
      cond: { kind: 'chance', percent: 60 },
    })
    expect(changedCommands).toContainEqual({ kind: 'giveMoney', delta: 9 })
    expect(changedCommands.some((command) => command.kind === 'dialog')).toBe(true)
    await act(async () => expect(session.undo()).toBe(true))
    expect(session.getState().enemies?.[0]?.onDefeated?.[0]).toMatchObject({
      kind: 'branch',
      cond: { kind: 'chance', percent: 75 },
    })

    const stealCount = host.querySelector<HTMLInputElement>(
      'input[name="enemy.enemy-a.steal.count"]',
    )!
    await setAndCommit(stealCount, '4')
    expect(session.getState().enemies?.[0]?.steal?.count).toBe(4)
    await act(async () => expect(session.undo()).toBe(true))
    expect(session.getState().enemies?.[0]?.steal?.count).toBe(2)

    const rewardToggle = [...host.querySelectorAll<HTMLLabelElement>('.ds-check-label')]
      .find((label) => label.textContent?.includes('击败后发放物品'))!
      .querySelector<HTMLInputElement>('input')!
    await act(async () => rewardToggle.click())
    expect(session.getState().enemies?.[0]?.onDefeated).toEqual([{ kind: 'giveMoney', delta: 9 }])
    await act(async () => expect(session.undo()).toBe(true))
    expect(session.getState().enemies?.[0]?.onDefeated).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'giveItem', itemId: 'item-b', count: 2 }),
        expect.objectContaining({ kind: 'dialog' }),
        { kind: 'giveMoney', delta: 9 },
      ]),
    )
  })

  test('击败后事件弹窗按原序完整只读展示，开关查看器不写历史', async () => {
    const session = new EditSession(state())
    await act(async () => root.render(<Harness session={session} />))
    const historyBefore = session.getHistoryVersion()
    const trigger = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent?.trim() === '查看完整事件',
    )!
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog')
    trigger.focus()

    await act(async () => trigger.click())
    const dialog = host.querySelector<HTMLDialogElement>('dialog.enemy-defeated-events-dialog')!
    expect(dialog).not.toBeNull()
    expect(dialog.getAttribute('aria-label')).toBe('赤鬼王 · 击败后事件')
    expect(dialog.textContent).toContain('仅查看')
    expect(dialog.textContent).toContain('75% 概率时')
    expect(dialog.textContent).toContain('结束本敌槽后续事件')
    expect(dialog.textContent).toContain('获得金蚕王 ×2')
    expect(dialog.textContent).toContain('显示“获得奖励”')
    expect(dialog.textContent).toContain('获得金钱 9')
    expect(
      dialog.querySelector<HTMLOListElement>('[aria-label="击败后事件执行顺序"]')?.children,
    ).toHaveLength(4)
    const branch = dialog.querySelector<HTMLDetailsElement>('details[open]')!
    const branchSummary = branch.querySelector<HTMLElement>('summary')!
    expect(branchSummary).not.toBeNull()
    await act(async () =>
      branchSummary.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
      ),
    )
    expect(branch.open).toBe(false)
    await act(async () =>
      branchSummary.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }),
      ),
    )
    expect(branch.open).toBe(true)
    expect(dialog.querySelector('.enemy-defeated-event-tree button')).toBeNull()
    expect(dialog.querySelector('input, select, textarea')).toBeNull()
    expect(dialog.textContent).not.toContain('JSON')
    expect(session.getHistoryVersion()).toBe(historyBefore)

    await act(async () => {
      branchSummary.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      )
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    expect(host.querySelector('dialog.enemy-defeated-events-dialog')).toBeNull()
    expect(document.activeElement).toBe(trigger)
    expect(session.getHistoryVersion()).toBe(historyBefore)

    await act(async () => trigger.click())
    const reopened = host.querySelector<HTMLDialogElement>('dialog.enemy-defeated-events-dialog')!
    const close = [...reopened.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent?.trim() === '关闭',
    )!
    await act(async () => close.click())
    expect(host.querySelector('dialog.enemy-defeated-events-dialog')).toBeNull()
    expect(session.getHistoryVersion()).toBe(historyBefore)
  })

  test('奖励同值不写历史，单次修改仅一条命令且 undo/redo 实时刷新事件树', async () => {
    const session = new EditSession(state())
    await act(async () => root.render(<Harness session={session} />))
    const probability = host.querySelector<HTMLInputElement>(
      'input[name="enemy.enemy-a.onDefeated.probability"]',
    )!

    await setAndCommit(probability, '25')
    expect(session.getHistoryVersion()).toBe(0)
    await setAndCommit(probability, '40')
    expect(session.getHistoryVersion()).toBe(1)
    expect(
      session.getState().enemies?.[0]?.onDefeated?.find((command) => command.kind === 'dialog'),
    ).toMatchObject({
      cue: { identity: { kind: 'narration' }, rows: [{ text: 'dialog.reward' }] },
    })

    const trigger = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent?.trim() === '查看完整事件',
    )!
    await act(async () => trigger.click())
    expect(host.querySelector('dialog.enemy-defeated-events-dialog')?.textContent).toContain(
      '60% 概率时',
    )

    await act(async () => expect(session.undo()).toBe(true))
    expect(host.querySelector('dialog.enemy-defeated-events-dialog')?.textContent).toContain(
      '75% 概率时',
    )
    await act(async () => expect(session.redo()).toBe(true))
    expect(host.querySelector('dialog.enemy-defeated-events-dialog')?.textContent).toContain(
      '60% 概率时',
    )
  })
})

describe('EnemyTab unified reference guard', () => {
  const removeButton = () =>
    [...host.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent === '删除敌人',
    )!

  test.each([
    ['checking', 'loading'],
    ['stale', 'partial'],
    ['failed', 'error'],
  ] as const)('%s 快照不冒充精确引用并禁用删除', async (status, panelState) => {
    const session = new EditSession(state())
    await act(async () => root.render(<Harness session={session} referenceStatus={status} />))
    const referencesTab = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
      (tab) => tab.textContent?.includes('引用'),
    )!
    await act(async () => referencesTab.click())
    expect(host.querySelector('.ds-reference-panel')?.getAttribute('data-state')).toBe(panelState)
    expect(host.textContent).toContain('数量未知')
    expect(removeButton().disabled).toBe(true)
  })

  test('current 但索引缺失时按 error/unknown fail-closed', async () => {
    const session = new EditSession(state())
    await act(async () => root.render(<Harness session={session} omitReferenceIndex />))
    const referencesTab = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
      (tab) => tab.textContent?.includes('引用'),
    )!
    await act(async () => referencesTab.click())
    expect(host.querySelector('.ds-reference-panel')?.getAttribute('data-state')).toBe('error')
    expect(host.textContent).toContain('数量未知')
    expect(removeButton().disabled).toBe(true)
  })

  test('self transform remains visible without self-locking the delete button', async () => {
    const current = state()
    current.enemyTeams = []
    current.enemies = [enemy('enemy-self', 'enemy-self')]
    current.locale = { 'name.enemy-self': '自变身敌人' }
    const session = new EditSession(current)
    await act(async () => root.render(<Harness session={session} />))
    expect(removeButton().disabled).toBe(false)
    expect(host.textContent).not.toContain('引用 1')
  })

  test('展示为零后删除仍按 live oracle 阻断并报告数量', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const session = new EditSession(state())
    const notices = vi.fn()
    await act(async () =>
      root.render(
        <Harness
          session={session}
          focusObjectId="enemy-b"
          getCurrentReferenceIndex={() => enemyBlockingIndex('enemy-b')}
          onStatusNotice={notices}
        />,
      ),
    )
    expect(removeButton().disabled).toBe(false)
    await act(async () => removeButton().click())
    expect(session.getState().enemies?.some((entry) => entry.id === 'enemy-b')).toBe(true)
    expect(notices).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: 'error', message: expect.stringContaining('1 处引用') }),
    )
  })

  test('live oracle 失败时保留敌人并显示具体错误', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const session = new EditSession(state())
    const notices = vi.fn()
    await act(async () =>
      root.render(
        <Harness
          session={session}
          focusObjectId="enemy-b"
          getCurrentReferenceIndex={() => {
            throw new Error('oracle down')
          }}
          onStatusNotice={notices}
        />,
      ),
    )
    await act(async () => removeButton().click())
    expect(session.getState().enemies?.some((entry) => entry.id === 'enemy-b')).toBe(true)
    expect(notices).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: 'error', message: expect.stringContaining('oracle down') }),
    )
  })
})
