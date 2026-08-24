// @vitest-environment jsdom
import type { EnemyDef, EnemyTeamDef, ItemData } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { BattleDataReference } from '../core/battle-data-references.js'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import { setCatalogSearch } from './catalog-controls-test-utils.js'
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
    steal: { itemId: 'item-a', count: 2 },
    attackEquivItem: { itemId: 'item-b', rate: 3 },
    onDefeated: [
      {
        kind: 'branch',
        cond: { kind: 'chance', percent: 75 },
        then: [{ kind: 'stopScript' }],
      },
      { kind: 'giveItem', itemId: 'item-b', count: 2 },
      { kind: 'dialog', cue: { rows: [{ text: 'dialog.reward' }] } },
      { kind: 'giveMoney', delta: 9 },
    ],
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
      contentVersion: 17,
      minimumSaveVersion: 8,
      defaultEntryId: 'main',
      content: {},
      entryPoints: [
        {
          id: 'main',
          label: '主要入口',
          scene: 's001',
          startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
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
  onOpenReference?: (reference: BattleDataReference) => void
}) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const current = props.session.getState()
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
      battleSprites={current.battleSprites}
      projectId="test-project"
      focusObjectId={props.focusObjectId}
      onOpenReference={props.onOpenReference}
    />
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
    expect(content).not.toBeNull()
    expect(content.contains(hero)).toBe(false)
    expect(host.querySelectorAll('.battle-data-form > .ds-workbench-section')).toHaveLength(6)
    expect(host.querySelector('.battle-data-form > .section')).toBeNull()
    expect(host.querySelectorAll('.ds-catalog-row')).toHaveLength(2)
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
      expect.objectContaining({ locator: { kind: 'enemy', enemyId: 'enemy-b' } }),
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

    const combat = host.querySelector<HTMLElement>('[data-enemy-stat-group="combat"]')!
    const rewards = host.querySelector<HTMLElement>('[data-enemy-stat-group="rewards"]')!
    const actionSounds = host.querySelector<HTMLElement>('[data-enemy-sound-group="actions"]')!
    const stateSounds = host.querySelector<HTMLElement>('[data-enemy-sound-group="states"]')!
    expect(combat.querySelector('legend')?.textContent).toBe('战斗能力')
    expect(combat.querySelectorAll('.ds-field')).toHaveLength(8)
    expect(rewards.querySelector('legend')?.textContent).toBe('战后结算')
    expect(rewards.querySelectorAll('.ds-field')).toHaveLength(3)
    expect(actionSounds.querySelectorAll('.ds-field')).toHaveLength(3)
    expect(stateSounds.querySelectorAll('.ds-field')).toHaveLength(2)
    expect(host.querySelector('.enemy-sound-option')?.textContent).toContain('施法音优先')

    const health = host.querySelector<HTMLInputElement>('input[name$=".stats.health"]')!
    await setAndCommit(health, '88')
    expect(session.getState().enemies?.[0]?.stats.health).toBe(88)
    await act(async () => expect(session.undo()).toBe(true))
    expect(session.getState().enemies?.[0]?.stats.health).toBe(50)
  })

  test('物品交互与战败奖励使用结构化字段，并保留高级战败脚本', async () => {
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
      .find((label) => label.textContent?.includes('战败后发放物品'))!
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
})
