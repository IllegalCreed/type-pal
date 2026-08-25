// @vitest-environment jsdom
import { createScriptIndex, deriveScriptChunk, type ItemData } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { UpdateItemCommand, UpsertAuthoredScriptCommand } from '../core/commands.js'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import type { EditorDerivedStatus } from '../core/editor-derived-contract.js'
import { EditorHistoryCoordinator } from '../core/editor-history-coordinator.js'
import { itemReferenceMap, type ItemReference } from '../core/item-references.js'
import { type ScriptEditorState, ScriptEditSession } from '../core/script-editor.js'
import {
  mergeEditorProjectionWithCurrentAuthorState,
  projectActiveScriptEditorState,
  projectCurrentAuthorScriptEditorState,
} from '../core/script-editor-projection.js'
import { ItemTab } from './ItemTab.js'
import { verifyInspectorTabs } from './inspector-tabs-test-utils.js'

function item(id = 'item-a'): ItemData {
  return {
    id,
    name: id === 'item-a' ? '剧情钥匙' : id,
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
  }
}

function state(items: ItemData[] = [item()]): EditorState {
  return {
    manifest: {
      id: 'test',
      name: '测试项目',
      contentVersion: 18,
      minimumSaveVersion: 8,
      defaultEntryId: 'main',
      content: {},
      entryPoints: [
        {
          id: 'main',
          label: '主要入口',
          scene: 'scene-a',
          startWorld: { party: [], money: 0, inventory: [] },
        },
      ],
      assets: { catalog: 'assets/index.json', roles: {} },
    },
    scenes: [],
    actors: [],
    skills: [],
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
    shops: [{ id: 7, items: ['item-a'] }],
    poisons: [
      {
        id: 1,
        name: '测试毒',
        color: 0,
        curability: 'common',
      },
    ],
  } as unknown as EditorState
}

function Harness(props: {
  session: EditSession
  focusObjectId?: string
  onOpenScript?: (id: string) => void
  onOpenImage?: (id: string) => void
  onOpenItemReference?: (reference: ItemReference) => void
  onOpenProjectIssues?: () => void
  focusPrivateScript?: {
    itemId: string
    ability: 'use' | 'throw'
    scriptId: string
    commandPath: string
    revision: number
  }
  assetReader?: EditorAssetReader
  script?: {
    state: ScriptEditorState
    session: ScriptEditSession
  }
  historyCoordinator?: EditorHistoryCoordinator
  referenceStatus?: EditorDerivedStatus
  referenceIndex?: ReturnType<typeof itemReferenceMap>
  getCurrentAuthorState?: () => EditorState | undefined
  getCurrentScriptState?: () => ScriptEditorState | undefined
}) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  useSyncExternalStore(
    (callback) => props.script?.session.subscribe(callback) ?? (() => undefined),
    () => props.script?.session.getVersion() ?? 0,
  )
  const current = props.session.getState()
  const activeScriptState = props.script
    ? projectActiveScriptEditorState(props.script.session.getState(), current.items)
    : undefined
  return (
    <ItemTab
      items={current.items}
      actors={current.actors}
      skills={current.skills}
      poisons={current.poisons ?? []}
      locale={current.locale}
      session={props.session}
      assetCatalog={current.assetCatalog}
      assetReader={props.assetReader ?? ({} as EditorAssetReader)}
      battleSprites={current.battleSprites}
      focusObjectId={props.focusObjectId}
      focusPrivateScript={props.focusPrivateScript}
      onOpenScript={props.onOpenScript}
      onOpenImage={props.onOpenImage}
      onOpenItemReference={props.onOpenItemReference}
      onOpenProjectIssues={props.onOpenProjectIssues}
      script={
        props.script && activeScriptState
          ? { state: props.script.session.getStateSnapshot(), session: props.script.session }
          : undefined
      }
      historyCoordinator={props.historyCoordinator}
      itemReferenceIndex={props.referenceIndex ?? itemReferenceMap(current, activeScriptState)}
      itemReferenceStatus={props.referenceStatus ?? 'current'}
      getCurrentAuthorState={
        props.getCurrentAuthorState ??
        (() =>
          props.script
            ? mergeEditorProjectionWithCurrentAuthorState(
                props.script.session.getStateSnapshot(),
                props.session.getState(),
              )
            : props.session.getState())
      }
      getCurrentScriptState={
        props.getCurrentScriptState ??
        (() =>
          props.script
            ? projectCurrentAuthorScriptEditorState(
                props.script.session.getStateSnapshot(),
                props.session.getState(),
              )
            : undefined)
      }
    />
  )
}

function button(text: string, root: ParentNode = document): HTMLButtonElement {
  return [...root.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
    candidate.textContent?.includes(text),
  )!
}

function combobox(ariaLabel: string, root: ParentNode = document): HTMLButtonElement {
  const trigger = [...root.querySelectorAll<HTMLButtonElement>('[role="combobox"]')].find(
    (candidate) => candidate.getAttribute('aria-label') === ariaLabel,
  )
  if (!trigger) throw new Error(`combobox not found: ${ariaLabel}`)
  return trigger
}

function comboboxListbox(trigger: HTMLButtonElement): HTMLElement {
  const listboxId = trigger.getAttribute('aria-controls')
  const listbox = listboxId ? document.getElementById(listboxId) : null
  if (!listbox)
    throw new Error(`listbox not found for: ${trigger.getAttribute('aria-label') ?? trigger.id}`)
  return listbox
}

async function chooseComboboxOption(trigger: HTMLButtonElement, optionText: string): Promise<void> {
  if (trigger.getAttribute('aria-expanded') !== 'true') {
    await act(async () => trigger.click())
  }
  const option = [
    ...comboboxListbox(trigger).querySelectorAll<HTMLElement>('[role="option"]'),
  ].find((candidate) => candidate.textContent?.includes(optionText))
  if (!option) throw new Error(`option not found: ${optionText}`)
  await act(async () => option.click())
}

async function setInput(element: HTMLInputElement, value: string): Promise<void> {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    setter.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

let root: Root
let host: HTMLDivElement

beforeEach(() => {
  ;(
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true
  document.body.innerHTML = ''
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

describe('ItemTab', () => {
  test('空项目可直接创建第一个物品并进入完整工作台', async () => {
    const initial = state([])
    initial.shops = []
    const session = new EditSession(initial)
    await act(async () => root.render(<Harness session={session} />))

    expect(host.textContent).toContain('项目还没有物品')
    await act(async () => button('新建第一个物品', host).click())

    expect(session.getState().items).toHaveLength(1)
    expect(session.getState().items[0]).toMatchObject({ id: 'item-001', name: '新物品' })
    expect(host.querySelector('.ds-object-hero__id')?.textContent).toBe('item-001')
    const workspace = host.querySelector('.item-workbench')!
    const hero = workspace.querySelector(':scope > .ds-object-hero')!
    const content = workspace.querySelector(':scope > .ds-object-workspace__content')!
    expect(hero).not.toBeNull()
    expect(content).not.toBeNull()
    expect(content.contains(hero)).toBe(false)
    expect(host.textContent).toContain('基础信息')
    expect(host.querySelector('.item-base-card')?.classList.contains('ds-workbench-section')).toBe(
      true,
    )
    expect(
      [...host.querySelectorAll('.item-capability-card')].every((section) =>
        section.classList.contains('ds-workbench-section'),
      ),
    ).toBe(true)
    expect(host.querySelector('.item-card-heading')).toBeNull()
    expect(
      [...host.querySelectorAll('.item-base-section-heading h4')].map(
        (heading) => heading.textContent,
      ),
    ).toEqual(['图标资源', '身份信息', '交易信息', '显示文本'])
    expect(host.querySelector('.ds-list-header')?.textContent).not.toContain('复制')
    expect(
      [...host.querySelectorAll<HTMLButtonElement>('.item-icon-actions button')].every(
        (action) =>
          action.classList.contains('ds-button') &&
          action.classList.contains('ds-button--compact') &&
          !action.classList.contains('item-action-button') &&
          !action.classList.contains('mini'),
      ),
    ).toBe(true)
  })

  test('目录可新建、复制并阻止删除仍在商店中的物品', async () => {
    const session = new EditSession(state())
    await act(async () => root.render(<Harness session={session} />))

    const initialHero = host.querySelector('.ds-object-hero')!
    const heroTags = [...initialHero.querySelectorAll('.ds-object-hero__meta .ds-tag')]
    expect(heroTags.map((tag) => tag.textContent)).toEqual(['引用 1'])
    const heroActions = [
      ...initialHero.querySelectorAll<HTMLButtonElement>('.ds-object-hero__actions button'),
    ]
    expect(heroActions.map((action) => action.textContent)).toEqual(['复制', '删除'])
    expect(
      heroActions.every(
        (action) =>
          action.classList.contains('ds-button') &&
          !action.classList.contains('item-action-button'),
      ),
    ).toBe(true)
    expect(button('删除', initialHero).classList).toContain('ds-button--danger')

    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="新建物品"]')!.click())
    expect(session.getState().items.map((entry) => entry.id)).toEqual(['item-a', 'item-001'])
    expect(host.querySelector('.ds-object-hero__id')?.textContent).toBe('item-001')

    await act(async () => button('复制', host.querySelector('.ds-object-hero')!).click())
    expect(session.getState().items.map((entry) => entry.id)).toEqual([
      'item-a',
      'item-001',
      'item-001-copy',
    ])

    const original = [...host.querySelectorAll<HTMLButtonElement>('.ds-catalog-row')].find(
      (candidate) => candidate.textContent?.includes('剧情钥匙'),
    )!
    await act(async () => original.click())
    const deleteButton = button('删除', host.querySelector('.item-title-actions')!)
    expect(deleteButton.disabled).toBe(true)
    expect(deleteButton.title).toContain('仍有 1 处引用')
    const referenceTab = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
      (candidate) => candidate.textContent?.includes('引用'),
    )!
    await act(async () => referenceTab.click())

    expect(session.getState().items.some((entry) => entry.id === 'item-a')).toBe(true)
    expect(host.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toContain('引用')
    expect(host.textContent).toContain('商店 7')
  })

  test('引用快照过期时禁删，点击边界的 canonical 新引用仍阻断删除', async () => {
    const current = state()
    current.shops = []
    const session = new EditSession(current)
    await act(async () =>
      root.render(<Harness session={session} referenceStatus="stale" referenceIndex={new Map()} />),
    )
    expect(button('删除', host.querySelector('.item-title-actions')!).disabled).toBe(true)

    const canonical: ScriptEditorState = {
      scenes: [],
      items: structuredClone(current.items) as ScriptEditorState['items'],
      sharedScripts: {
        live: {
          name: '当前奖励',
          self: 'none',
          body: [{ kind: 'giveItem', itemId: 'item-a', count: 1 }],
        },
      },
    }
    const scriptSession = new ScriptEditSession(canonical)
    await act(async () =>
      root.render(
        <Harness
          session={session}
          script={{ state: canonical, session: scriptSession }}
          referenceStatus="current"
          referenceIndex={new Map()}
        />,
      ),
    )
    await act(async () => button('删除', host.querySelector('.item-title-actions')!).click())
    await act(async () => button('确认', host.querySelector('.item-title-actions')!).click())
    expect(session.getState().items.some((item) => item.id === 'item-a')).toBe(true)
  })

  test('目录搜索和全部能力筛选覆盖组合、空结果与清空恢复，且不偷换选择', async () => {
    const equipItem: ItemData = {
      ...item('equip-item'),
      name: '青锋剑',
      equip: { slot: 'weapon', equipableBy: [], effects: [] },
    }
    const useItem: ItemData = {
      ...item('use-item'),
      name: '还魂香',
      use: { target: 'oneAlly', consuming: true, effects: [{ kind: 'revive', hpPercent: 30 }] },
    }
    const throwItem: ItemData = {
      ...item('throw-item'),
      name: '赤蝎粉',
      throw: { target: 'oneEnemy', effects: [{ kind: 'applyPoison', poisonId: '1' }] },
    }
    const initial = state([equipItem, useItem, throwItem])
    initial.shops = []
    const session = new EditSession(initial)
    await act(async () => root.render(<Harness session={session} />))

    expect(host.querySelectorAll('.ds-catalog-row')).toHaveLength(3)

    await chooseComboboxOption(combobox('按物品能力筛选', host), '可使用')
    expect([...host.querySelectorAll('.ds-catalog-row')].map((row) => row.textContent)).toEqual([
      expect.stringContaining('还魂香'),
    ])
    expect(host.querySelector('.ds-catalog-row[data-selected="true"]')).toBeNull()
    expect(host.querySelector('h1')?.textContent).toBe('青锋剑')

    await chooseComboboxOption(combobox('按物品能力筛选', host), '可投掷')
    expect(host.querySelector('.ds-catalog-row')?.textContent).toContain('赤蝎粉')
    await chooseComboboxOption(combobox('按物品能力筛选', host), '装备')
    expect(host.querySelector('.ds-catalog-row')?.textContent).toContain('青锋剑')
    await chooseComboboxOption(combobox('按物品能力筛选', host), '有引用')
    expect(host.querySelectorAll('.ds-catalog-row')).toHaveLength(0)
    await chooseComboboxOption(combobox('按物品能力筛选', host), '待迁移')
    expect(host.querySelectorAll('.ds-catalog-row')).toHaveLength(0)
    await chooseComboboxOption(combobox('按物品能力筛选', host), '可使用')

    const search = host.querySelector<HTMLInputElement>(
      'input[aria-label="搜索物品名称或稳定 ID"]',
    )!
    await setInput(search, '赤蝎')
    expect(host.querySelectorAll('.ds-catalog-row')).toHaveLength(0)
    await setInput(search, '还魂')
    expect(host.querySelectorAll('.ds-catalog-row')).toHaveLength(1)
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      setter.call(search, '不存在')
      search.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(host.textContent).toContain('没有匹配项')
    await act(async () => button('清除筛选', host).click())
    expect(host.querySelectorAll('.ds-catalog-row')).toHaveLength(3)
    expect(host.querySelector('.ds-catalog-row[data-selected="true"]')?.textContent).toContain(
      '青锋剑',
    )
  })

  test('图标浏览器使用可聚焦原生按钮组并正确绑定选择', async () => {
    const initial = state([
      {
        ...item('item-a'),
        equip: { slot: 'weapon', equipableBy: [], effects: [] },
        use: { target: 'oneAlly', consuming: true, effects: [{ kind: 'healHp', amount: 10 }] },
        throw: { target: 'oneEnemy', effects: [{ kind: 'applyPoison', poisonId: '1' }] },
      },
    ])
    initial.shops = []
    initial.assetCatalog.assets['item-icon.test'] = {
      kind: 'item-icon',
      path: 'assets/authored/item-icons/test.png',
      mediaType: 'image/png',
      bytes: 4,
      sha256: 'a'.repeat(64),
      label: '测试图标',
      origin: { kind: 'authored', ref: 'test.png' },
    }
    const reader = {
      projectId: 'test',
      record: () => initial.assetCatalog.assets['item-icon.test']!,
      readBytes: () => new Promise<ArrayBuffer>(() => undefined),
      readRoleBytes: () => new Promise<ArrayBuffer>(() => undefined),
      urlFor: () => new Promise<string>(() => undefined),
    } as EditorAssetReader
    const session = new EditSession(initial)
    const onOpenImage = vi.fn()
    await act(async () =>
      root.render(<Harness session={session} assetReader={reader} onOpenImage={onOpenImage} />),
    )

    expect(host.querySelectorAll('.item-capability-card.enabled')).toHaveLength(3)
    const addEquipEffect = button('添加效果', host.querySelector('.item-equip-effects')!)
    expect(addEquipEffect.classList).toContain('ds-button')
    expect(addEquipEffect.classList).toContain('ds-button--compact')
    expect(addEquipEffect.classList).not.toContain('item-action-button')
    await act(async () => addEquipEffect.click())
    const equipEffectActions = [
      ...host.querySelectorAll<HTMLButtonElement>('.item-equip-effects .ef-ops button'),
    ]
    expect(equipEffectActions).toHaveLength(3)
    expect(equipEffectActions.every((action) => action.classList.contains('ds-icon-button'))).toBe(
      true,
    )
    const iconTrigger = button('选择已有图标', host)
    await act(async () => iconTrigger.click())
    expect(document.activeElement).toBe(host.querySelector<HTMLInputElement>('#item-icon-filter'))
    await act(async () => {
      host
        .querySelector('#item-icon-browser-panel')!
        .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(host.querySelector('#item-icon-browser-panel')).toBeNull()
    expect(document.activeElement).toBe(iconTrigger)

    await act(async () => iconTrigger.click())
    const group = host.querySelector<HTMLFieldSetElement>('fieldset[aria-label="物品图标"]')!
    expect(group).not.toBeNull()
    expect(host.querySelector('[role="listbox"]')).toBeNull()
    expect(group.querySelector('[role="option"]')).toBeNull()
    const iconButton = [...group.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
      candidate.textContent?.includes('测试图标'),
    )!
    expect(iconButton.type).toBe('button')
    expect(iconButton.tabIndex).toBe(0)
    expect(iconButton.getAttribute('aria-pressed')).toBe('false')

    iconButton.focus()
    expect(document.activeElement).toBe(iconButton)
    await act(async () => iconButton.click())
    expect(session.getState().items[0]?.icon).toBe('item-icon.test')
    expect(document.activeElement).toBe(iconTrigger)

    const editorActions = host.querySelector('.item-icon-actions')!
    const editorOpen = button('在图像库打开', editorActions)
    const editorUnbind = button('解除绑定', editorActions)
    expect(editorOpen.classList).toContain('ds-button--secondary')
    expect(editorUnbind.classList).toContain('ds-button--danger')
    expect(
      [...editorActions.querySelectorAll<HTMLButtonElement>('button')].every(
        (action) => action.querySelector('.ds-icon') !== null,
      ),
    ).toBe(true)
    await act(async () => editorOpen.click())
    expect(onOpenImage).toHaveBeenLastCalledWith('item-icon.test')
    expect(host.querySelector('[role="tab"][aria-label^="资源"]')).toBeNull()
    expect(host.querySelector('.item-resource-actions')).toBeNull()
    await act(async () => editorUnbind.click())
    expect(session.getState().items[0]?.icon).toBeUndefined()
  })

  test('战斗形象覆写按可装备角色逐行编辑，新勾选保持空映射，取消角色同命令剪枝并可撤销', async () => {
    const initial = state([
      {
        ...item('weapon'),
        equip: {
          slot: 'weapon',
          equipableBy: ['hero', 'mage'],
          effects: [
            {
              kind: 'battleSprite',
              byActor: { hero: 'fighter-hero', mage: 'fighter-mage' },
            },
            { kind: 'statBonus', stat: 'attack', delta: 10 },
            { kind: 'attackAll' },
          ],
        },
      },
    ])
    initial.shops = []
    initial.actors = [
      {
        id: 'hero',
        name: 'actor.hero',
        spriteId: 'hero',
        battler: { battleSprite: 'fighter-hero' },
      },
      {
        id: 'mage',
        name: 'actor.mage',
        spriteId: 'mage',
        battler: { battleSprite: 'fighter-mage' },
      },
      {
        id: 'anu',
        name: 'actor.anu',
        spriteId: 'anu',
        battler: { battleSprite: 'fighter-mage' },
      },
    ] as never
    initial.locale = {
      'actor.hero': '李逍遥',
      'actor.mage': '赵灵儿',
      'actor.anu': '阿奴',
    }
    initial.battleSprites = [
      { id: 'fighter-hero', label: '逍遥战斗形象', profile: { kind: 'player-fighter' } },
      { id: 'fighter-mage', label: '灵儿战斗形象', profile: { kind: 'player-fighter' } },
    ] as never
    const session = new EditSession(initial)
    await act(async () => root.render(<Harness session={session} />))

    const heroPicker = combobox('李逍遥的战斗形象覆写', host)
    const magePicker = combobox('赵灵儿的战斗形象覆写', host)
    expect(heroPicker.textContent).toContain('逍遥战斗形象 · fighter-hero')
    expect(magePicker.textContent).toContain('灵儿战斗形象 · fighter-mage')
    expect(
      host
        .querySelector('[aria-label="装备效果 1 类型"]')
        ?.closest('.item-equip-effect-row')
        ?.classList.contains('item-equip-effect-row-battle-sprite'),
    ).toBe(true)
    expect(
      host
        .querySelector('[aria-label="装备效果 2 类型"]')
        ?.closest('.item-equip-effect-row')
        ?.classList.contains('item-equip-effect-row-battle-sprite'),
    ).toBe(false)
    expect(host.querySelector('.item-effect-no-params')?.textContent).toBe('(无参数)')
    expect(
      host.querySelectorAll<HTMLButtonElement>(
        '.item-battle-sprite-row [role="combobox"][aria-label$="的战斗形象覆写"]',
      ),
    ).toHaveLength(2)
    await act(async () => heroPicker.click())
    expect(
      [...comboboxListbox(heroPicker).querySelectorAll('[role="option"]')].find(
        (option) => option.textContent === '不覆写',
      ),
    ).toBeDefined()
    const otherEffectKind = host.querySelector<HTMLButtonElement>('[aria-label="装备效果 2 类型"]')!
    await act(async () => otherEffectKind.click())
    const disabledBattleSprite = [
      ...document.querySelectorAll<HTMLElement>('[role="option"]'),
    ].find((option) => option.textContent?.includes('战斗形象覆写'))!
    expect(disabledBattleSprite.getAttribute('aria-disabled')).toBe('true')
    await act(async () => otherEffectKind.click())

    await chooseComboboxOption(heroPicker, '灵儿战斗形象 · fighter-mage')
    expect(session.getState().items[0]?.equip?.effects[0]).toEqual({
      kind: 'battleSprite',
      byActor: { hero: 'fighter-mage', mage: 'fighter-mage' },
    })

    const checkbox = (label: string): HTMLInputElement =>
      [...host.querySelectorAll<HTMLInputElement>('.item-character-checks input')].find(
        (candidate) => candidate.closest('label')?.textContent?.includes(label),
      )!
    await act(async () => checkbox('阿奴').click())
    expect(session.getState().items[0]?.equip?.equipableBy).toEqual(['hero', 'mage', 'anu'])
    expect(session.getState().items[0]?.equip?.effects[0]).toEqual({
      kind: 'battleSprite',
      byActor: { hero: 'fighter-mage', mage: 'fighter-mage' },
    })
    expect(combobox('阿奴的战斗形象覆写', host).textContent).toContain('不覆写')
    expect(
      host.querySelectorAll<HTMLButtonElement>(
        '.item-battle-sprite-row [role="combobox"][aria-label$="的战斗形象覆写"]',
      ),
    ).toHaveLength(3)

    await act(async () => checkbox('赵灵儿').click())
    expect(session.getState().items[0]?.equip?.equipableBy).toEqual(['hero', 'anu'])
    expect(session.getState().items[0]?.equip?.effects[0]).toEqual({
      kind: 'battleSprite',
      byActor: { hero: 'fighter-mage' },
    })
    await act(async () => session.undo())
    expect(session.getState().items[0]?.equip?.equipableBy).toEqual(['hero', 'mage', 'anu'])
    expect(session.getState().items[0]?.equip?.effects[0]).toEqual({
      kind: 'battleSprite',
      byActor: { hero: 'fighter-mage', mage: 'fighter-mage' },
    })
    await act(async () => session.redo())
    expect(session.getState().items[0]?.equip?.equipableBy).toEqual(['hero', 'anu'])
  })

  test('使用能力可创建并原子绑定共享脚本，引用页可跳商店', async () => {
    const initial = state()
    const index = createScriptIndex({ shared: 1, global: {} })
    const scriptId = 'shared/user/existing-00000000'
    const chunk = deriveScriptChunk(scriptId, index.shards)!
    initial.scriptIndex = index
    const session = new EditSession(initial)
    session.dispatch(
      new UpsertAuthoredScriptCommand(scriptId, { name: '旧使用脚本', self: 'none' }, []),
    )
    session.dispatch(
      new UpdateItemCommand('item-a', {
        use: {
          target: 'scene',
          consuming: true,
          menuAfterUse: 'close',
          effects: [{ kind: 'runScript', script: { id: scriptId, chunk } }],
        },
      }),
    )
    session.markSaved()
    const onOpenScript = vi.fn()
    const onOpenItemReference = vi.fn()
    await act(async () =>
      root.render(
        <Harness
          session={session}
          onOpenScript={onOpenScript}
          onOpenItemReference={onOpenItemReference}
        />,
      ),
    )

    await act(async () => button('新建并绑定', host).click())
    expect(session.getState().items[0]?.use?.effects[0]).toMatchObject({
      kind: 'runScript',
      script: { id: scriptId },
    })
    expect(host.textContent).toContain('当前 1 个效果将被替换')
    await act(async () => button('确认新建并替换', host).click())
    const nextEffect = session.getState().items[0]?.use?.effects[0]
    expect(nextEffect?.kind).toBe('runScript')
    if (nextEffect?.kind !== 'runScript') throw new Error('expected runScript')
    expect(nextEffect.script.id).not.toBe(scriptId)
    expect(session.getState().scriptIndex?.library?.[nextEffect.script.id]).toBeDefined()
    expect(onOpenScript).toHaveBeenCalledWith(nextEffect.script.id)

    await act(async () =>
      button('引用', host.querySelector('[role="tablist"][aria-label="物品检查器"]')!).click(),
    )
    const referenceRow = host.querySelector<HTMLButtonElement>('.ds-reference-row')!
    expect(referenceRow.textContent).toContain('打开')
    await act(async () => referenceRow.click())
    expect(onOpenItemReference).toHaveBeenCalledWith(
      expect.objectContaining({ locator: { kind: 'shop', shopId: 7 } }),
    )

    await act(async () => session.undo())
    expect(session.getState().items[0]?.use?.effects[0]).toMatchObject({
      kind: 'runScript',
      script: { id: scriptId },
    })
  })

  test('投掷法术演出使用共享结构化编辑器并可添加、编辑、移除和撤销', async () => {
    const initial = state([
      {
        ...item('throw-item'),
        name: '无影毒',
        throw: {
          target: 'oneEnemy',
          effects: [
            {
              kind: 'currentHpDamage',
              numerator: 1,
              denominator: 2,
              bonus: 1,
              cap: 1000,
            },
          ],
        },
      },
    ])
    initial.shops = []
    initial.assetCatalog.assets['sound.pal.157'] = {
      kind: 'sound',
      path: 'assets/legacy/sounds/157.wav',
      mediaType: 'audio/wav',
      bytes: 1,
      sha256: '1'.repeat(64),
      origin: { kind: 'legacy-migrated', ref: 'VOC.MKF/157' },
    }
    const session = new EditSession(initial)
    await act(async () => root.render(<Harness session={session} />))

    await act(async () => button('添加法术特效', host).click())
    expect(session.getState().items[0]?.throw?.presentation).toEqual({
      kind: 'magic',
      animation: { effectSprite: 0, placement: 'normal' },
    })

    const presentation = host.querySelector('.item-throw-presentation')!
    const field = (label: string): HTMLElement =>
      [...presentation.querySelectorAll<HTMLElement>('.ds-field')].find((candidate) =>
        candidate.querySelector('.ds-field__label')?.textContent?.includes(label),
      )!
    const numberField = (label: string): HTMLInputElement =>
      field(label).querySelector<HTMLInputElement>('input[type="number"]')!
    for (const [label, value] of [
      ['特效号', '24'],
      ['X 偏移', '-12'],
      ['层级偏移', '1'],
      ['速度', '-1'],
    ] as const) {
      const input = numberField(label)
      await setInput(input, value)
      await act(async () => input.dispatchEvent(new FocusEvent('focusout', { bubbles: true })))
    }
    const placement = field('落点').querySelector<HTMLButtonElement>('[role="combobox"]')!
    await chooseComboboxOption(placement, '敌群中心')
    const sound = combobox('音效', presentation)
    await chooseComboboxOption(sound, 'sound.pal.157')
    await act(async () =>
      [...presentation.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')]
        .find((candidate) => candidate.closest('label')?.textContent?.includes('保留特效末帧'))!
        .click(),
    )

    expect(session.getState().items[0]?.throw?.presentation).toEqual({
      kind: 'magic',
      animation: {
        effectSprite: 24,
        placement: 'attackWhole',
        xOffset: -12,
        layerOffset: 1,
        speed: -1,
        sound: 'sound.pal.157',
        keepEffect: true,
      },
    })

    await act(async () => button('移除演出', host).click())
    expect(session.getState().items[0]?.throw?.presentation).toBeUndefined()
    await act(async () => session.undo())
    expect(session.getState().items[0]?.throw?.presentation?.animation).toMatchObject({
      effectSprite: 24,
      xOffset: -12,
      layerOffset: 1,
      sound: 'sound.pal.157',
    })
  })

  test('物品私有脚本由 shell 原子增删排序，撤销重做保留 canonical 正文', async () => {
    const initial = state([
      {
        ...item('private'),
        name: '私有脚本物品',
        use: {
          target: 'scene',
          consuming: true,
          effects: [
            {
              kind: 'runScript',
              script: { chunk: '__author-script-runtime', id: 'item:private:use' },
            },
          ],
        },
      },
    ])
    initial.shops = []
    const session = new EditSession(initial)
    const canonical: ScriptEditorState = {
      scenes: [],
      items: [
        {
          id: 'private',
          name: '私有脚本物品',
          desc: [],
          buyPrice: 0,
          sellPrice: 0,
          sellable: false,
          use: {
            target: 'scene',
            consuming: true,
            effects: [
              {
                kind: 'itemPrivateScript',
                script: {
                  id: 'use',
                  label: '私有正文',
                  body: [{ kind: 'setFlag', flag: 'private-body', value: true }],
                },
              },
            ],
          },
        },
      ],
      sharedScripts: {},
    }
    const scriptSession = new ScriptEditSession(canonical)
    const historyCoordinator = new EditorHistoryCoordinator(session, scriptSession)
    await act(async () =>
      root.render(
        <Harness
          session={session}
          script={{ state: canonical, session: scriptSession }}
          historyCoordinator={historyCoordinator}
        />,
      ),
    )

    expect(host.textContent).toContain('私有正文')
    await act(async () => button('添加效果', host.querySelector('.item-effect-chain')!).click())
    expect(session.getState().items[0]!.use).toMatchObject({
      target: 'oneAlly',
      effects: [{ kind: 'runScript' }, { kind: 'healHp', amount: 100 }],
    })
    expect(scriptSession.getState().items[0]!.use!.effects).toMatchObject([
      { kind: 'itemPrivateScript', script: { body: [{ flag: 'private-body' }] } },
    ])
    expect(
      projectActiveScriptEditorState(scriptSession.getState(), session.getState().items).items[0]!
        .use!.effects,
    ).toMatchObject([{ kind: 'itemPrivateScript' }, { kind: 'healHp', amount: 100 }])

    await act(async () =>
      host.querySelector<HTMLButtonElement>('button[aria-label="下移效果 1"]')!.click(),
    )
    expect(session.getState().items[0]!.use!.effects).toMatchObject([
      { kind: 'healHp' },
      { kind: 'runScript' },
    ])
    expect(scriptSession.getState().items[0]!.use!.effects).toMatchObject([
      { kind: 'itemPrivateScript', script: { body: [{ flag: 'private-body' }] } },
    ])
    expect(host.textContent).toContain('私有正文')

    await act(async () => button('添加指令', host).click())
    await act(async () =>
      host.querySelector<HTMLButtonElement>('[data-command-kinds="setFlag"]')!.click(),
    )
    const storedAfterMove = scriptSession.getState().items[0]!.use!.effects[0]
    expect(storedAfterMove?.kind).toBe('itemPrivateScript')
    if (storedAfterMove?.kind !== 'itemPrivateScript') throw new Error('正文未保留')
    expect(storedAfterMove.script.body).toHaveLength(2)
    expect(storedAfterMove.script.body[0]).toMatchObject({ flag: 'private-body' })

    await act(async () => session.undo())
    expect(session.getState().items[0]!.use!.effects).toMatchObject([
      { kind: 'runScript' },
      { kind: 'healHp' },
    ])
    expect(host.textContent).toContain('私有正文')
    await act(async () => session.redo())
    expect(session.getState().items[0]!.use!.effects).toMatchObject([
      { kind: 'healHp' },
      { kind: 'runScript' },
    ])

    await act(async () =>
      host.querySelector<HTMLButtonElement>('button[aria-label="删除效果 2"]')!.click(),
    )
    expect(session.getState().items[0]!.use!.effects).toEqual([{ kind: 'healHp', amount: 100 }])
    expect(scriptSession.getState().items[0]!.use!.effects).toMatchObject([
      { kind: 'itemPrivateScript', script: { body: [{ flag: 'private-body' }, {}] } },
    ])
    expect(host.textContent).not.toContain('私有正文')

    await act(async () => session.undo())
    expect(host.textContent).toContain('私有正文')
    expect(session.getState().items[0]!.use!.effects).toMatchObject([
      { kind: 'healHp' },
      { kind: 'runScript' },
    ])
    await act(async () => session.redo())
    expect(host.textContent).not.toContain('私有正文')
  })

  test('新建私有脚本:一次跨会话历史入帐→编辑正文→配对撤销重做→投影含正文', async () => {
    const initial = state([
      {
        ...item('private'),
        name: '私有脚本物品',
        use: {
          target: 'scene',
          consuming: true,
          effects: [],
        },
      },
    ])
    initial.shops = []
    const session = new EditSession(initial)
    const canonical: ScriptEditorState = {
      scenes: [],
      items: [
        {
          id: 'private',
          name: '私有脚本物品',
          desc: [],
          buyPrice: 0,
          sellPrice: 0,
          sellable: false,
          use: {
            target: 'scene',
            consuming: true,
            effects: [],
          },
        },
      ],
      sharedScripts: {},
    }
    const scriptSession = new ScriptEditSession(canonical)
    const historyCoordinator = new EditorHistoryCoordinator(session, scriptSession)
    await act(async () =>
      root.render(
        <Harness
          session={session}
          script={{ state: canonical, session: scriptSession }}
          historyCoordinator={historyCoordinator}
        />,
      ),
    )

    const chain = host.querySelector('.item-effect-chain')!
    const addButton = button('添加脚本', chain)
    expect(addButton.disabled).toBe(false)
    await act(async () => addButton.click())

    expect(session.getState().items[0]!.use!.effects).toMatchObject([
      { kind: 'runScript', script: { chunk: '__author-script-runtime', id: 'item:private:use' } },
    ])
    expect(scriptSession.getState().items[0]!.use!.effects).toMatchObject([
      {
        kind: 'itemPrivateScript',
        script: { id: 'use', label: '私有脚本物品私有脚本', body: [] },
      },
    ])
    expect(host.textContent).toContain('私有脚本物品私有脚本')
    // 已存在一条后入口禁用(每件物品至多一条)
    expect(button('添加脚本', chain).disabled).toBe(true)

    // 编辑正文:添加一条指令
    await act(async () => button('添加第一条指令', host).click())
    await act(async () =>
      host.querySelector<HTMLButtonElement>('[data-command-kinds="setFlag"]')!.click(),
    )
    const stored = scriptSession.getState().items[0]!.use!.effects[0]
    expect(stored?.kind).toBe('itemPrivateScript')
    if (stored?.kind !== 'itemPrivateScript') throw new Error('新建行未绑定正文')
    expect(stored.script.body).toHaveLength(1)

    // 投影(保存链同构)应含 canonical 私有正文
    expect(
      projectActiveScriptEditorState(scriptSession.getState(), session.getState().items).items[0]!
        .use!.effects,
    ).toMatchObject([{ kind: 'itemPrivateScript', script: { id: 'use' } }])

    // 正文编辑是后续独立动作，先撤它；随后一次 coordinator undo 成对撤 shell + canonical。
    await act(async () => scriptSession.undo())
    const afterBodyUndo = scriptSession.getState().items[0]!.use!.effects[0]
    expect(afterBodyUndo?.kind).toBe('itemPrivateScript')
    if (afterBodyUndo?.kind !== 'itemPrivateScript') throw new Error('正文编辑未回滚')
    expect(afterBodyUndo.script.body).toHaveLength(0)
    await act(async () => historyCoordinator.undo())
    expect(session.getState().items[0]!.use!.effects).toHaveLength(0)
    expect(scriptSession.getState().items[0]!.use!.effects).toHaveLength(0)
    await act(async () => historyCoordinator.redo())
    expect(session.getState().items[0]!.use!.effects).toMatchObject([{ kind: 'runScript' }])
    const restoredEmpty = scriptSession.getState().items[0]!.use!.effects[0]
    expect(restoredEmpty?.kind).toBe('itemPrivateScript')
    if (restoredEmpty?.kind !== 'itemPrivateScript') throw new Error('配对重做后正文壳丢失')
    expect(restoredEmpty.script.body).toHaveLength(0)
    await act(async () => scriptSession.redo())
    const restored = scriptSession.getState().items[0]!.use!.effects[0]
    expect(restored?.kind).toBe('itemPrivateScript')
    if (restored?.kind !== 'itemPrivateScript') throw new Error('重做后正文丢失')
    expect(restored.script.body).toHaveLength(1)
  })

  test('同一物品的私有脚本引用可按 revision 重复定位并明显高亮目标指令', async () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0)
      return 1
    })
    const scrollIntoView = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    })
    const initial = state([
      {
        ...item('private'),
        name: '私有脚本物品',
        use: {
          target: 'scene',
          consuming: true,
          effects: [
            {
              kind: 'runScript',
              script: { chunk: '__author-script-runtime', id: 'item:private:use' },
            },
          ],
        },
      },
    ])
    initial.shops = []
    const session = new EditSession(initial)
    const canonical: ScriptEditorState = {
      scenes: [],
      items: [
        {
          id: 'private',
          name: '私有脚本物品',
          desc: [],
          buyPrice: 0,
          sellPrice: 0,
          sellable: false,
          use: {
            target: 'scene',
            consuming: true,
            effects: [
              {
                kind: 'itemPrivateScript',
                script: {
                  id: 'use',
                  label: '私有正文',
                  body: [
                    { kind: 'setFlag', flag: 'first', value: true },
                    { kind: 'setFlag', flag: 'target', value: true },
                  ],
                },
              },
            ],
          },
        },
      ],
      sharedScripts: {},
    }
    const script = {
      state: canonical,
      session: new ScriptEditSession(canonical),
    }
    const focus = {
      itemId: 'private',
      ability: 'use' as const,
      scriptId: 'use',
      commandPath: '1',
      revision: 1,
    }

    await act(async () =>
      root.render(
        <Harness
          session={session}
          script={script}
          focusObjectId="private"
          focusPrivateScript={focus}
        />,
      ),
    )
    let target = host.querySelector<HTMLElement>('[data-command-path="1"]')!
    expect(target.classList.contains('sel')).toBe(true)
    expect(target.classList.contains('reference-focus-odd')).toBe(true)
    expect(document.activeElement).toBe(target)
    expect(scrollIntoView).toHaveBeenCalledTimes(1)

    await act(async () => host.querySelector<HTMLElement>('[data-command-path="0"]')!.click())
    expect(target.classList.contains('sel')).toBe(false)
    await act(async () =>
      root.render(
        <Harness
          session={session}
          script={script}
          focusObjectId="private"
          focusPrivateScript={{ ...focus, revision: 2 }}
        />,
      ),
    )
    target = host.querySelector<HTMLElement>('[data-command-path="1"]')!
    expect(target.classList.contains('sel')).toBe(true)
    expect(target.classList.contains('reference-focus-even')).toBe(true)
    expect(document.activeElement).toBe(target)
    expect(scrollIntoView).toHaveBeenCalledTimes(2)
  })

  test('引用页合并 canonical 脚本中的物品引用并传出精确落点', async () => {
    const initial = state([
      {
        ...item('290'),
        name: '天书',
      },
    ])
    initial.shops = []
    const session = new EditSession(initial)
    const canonical: ScriptEditorState = {
      scenes: [
        {
          id: 's151',
          mapId: 'm151',
          entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
          entities: [],
          hooks: {
            onEnter: {
              initial: 'default',
              variants: {
                default: {
                  label: '默认进场行为',
                  order: 0,
                  flow: {
                    kind: 'stages',
                    initial: 'initial',
                    stages: [
                      {
                        id: 'initial',
                        body: [{ kind: 'loseItem', itemId: '290', count: 1 }],
                      },
                    ],
                  },
                },
              },
            },
          },
        },
        {
          id: 's154',
          mapId: 'm154',
          entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
          entities: [
            {
              id: 'e2493',
              sprite: 'npc',
              pos: { col: 0, row: 0, height: 0 },
              behaviors: {
                trigger: {
                  'legacy-001': {
                    label: '触发行为 1',
                    order: 0,
                    flow: {
                      kind: 'stages',
                      initial: 'initial',
                      stages: [
                        {
                          id: 'initial',
                          body: [{ kind: 'giveItem', itemId: '290', count: 1 }],
                        },
                      ],
                    },
                  },
                },
              },
            },
          ],
        },
      ],
      items: [],
      sharedScripts: {},
    }
    const script = {
      state: canonical,
      session: new ScriptEditSession(canonical),
    }
    const onOpenItemReference = vi.fn()

    await act(async () =>
      root.render(
        <Harness session={session} script={script} onOpenItemReference={onOpenItemReference} />,
      ),
    )

    expect(host.querySelector('.ds-catalog-row')?.textContent).toContain('引用 2')
    await act(async () =>
      button('引用 2', host.querySelector('[role="tablist"][aria-label="物品检查器"]')!).click(),
    )
    expect(host.textContent).toContain(
      '场景 s151 / 进场脚本“默认进场行为” / 步骤 1 / 脚本正文 / 第 1 条指令',
    )
    expect(host.textContent).toContain(
      '场景 s154 / 实体 e2493 / 交互脚本“触发行为 1” / 步骤 1 / 脚本正文 / 第 1 条指令',
    )
    const groupOccurrenceCounts = [
      ...host.querySelectorAll<HTMLElement>('.ds-reference-group__count'),
    ].map((node) => Number.parseInt(node.textContent ?? '0', 10))
    expect(groupOccurrenceCounts.reduce((sum, count) => sum + count, 0)).toBe(2)

    const openButtons = [
      ...host.querySelectorAll<HTMLButtonElement>('.ds-reference-row[data-actionable="true"]'),
    ]
    expect(openButtons).toHaveLength(2)
    await act(async () => openButtons[0]!.click())
    expect(onOpenItemReference).toHaveBeenCalledWith(
      expect.objectContaining({
        locator: expect.objectContaining({
          kind: 'canonical-script',
          reference: expect.objectContaining({
            locator: expect.objectContaining({
              owner: expect.objectContaining({
                kind: 'scene-hook',
                sceneId: 's151',
              }),
              commandPath: '0',
            }),
          }),
        }),
      }),
    )
  })

  test('迁移诊断保留来源地址，且问题面板回调只触发一次', async () => {
    const initial = state()
    initial.migrationDiagnostics = {
      version: 1,
      diagnostics: [
        {
          id: 'item-use:item-a',
          severity: 'warn',
          target: {
            domain: 'item',
            objectId: 'item-a',
            capability: 'use',
            label: '剧情钥匙使用能力',
          },
          category: 'manual-review',
          reason: '旧版脚本需要人工确认',
          source: { kind: 'legacy-script', label: 'L_99', address: 99 },
        },
      ],
    }
    const session = new EditSession(initial)
    const before = structuredClone(session.getState().migrationDiagnostics)
    const onOpenProjectIssues = vi.fn()
    await act(async () =>
      root.render(<Harness session={session} onOpenProjectIssues={onOpenProjectIssues} />),
    )

    const row = host.querySelector<HTMLElement>('.ds-diagnostic-row')!
    expect(row.tagName).toBe('BUTTON')
    expect(row.textContent).toContain('剧情钥匙使用能力')
    expect(row.textContent).toContain('L_99 · 0x63')
    await act(async () => row.click())
    expect(onOpenProjectIssues).toHaveBeenCalledOnce()
    expect(session.getState().migrationDiagnostics).toEqual(before)

    await act(async () => root.render(<Harness session={session} />))
    expect(host.querySelector('.ds-diagnostic-row')?.tagName).toBe('ARTICLE')
    expect(host.querySelector('.ds-diagnostic-row')?.textContent).toContain('无法定位')
    expect(session.getState().migrationDiagnostics).toEqual(before)
  })

  test('检查器支持方向键切换，删除后撤销会恢复原选择', async () => {
    const session = new EditSession(state([item('item-a'), item('item-b')]))
    await act(async () => root.render(<Harness session={session} />))

    await verifyInspectorTabs(host, '物品检查器', ['概览', /^引用 \d+$/])

    const referenceTab = button(
      '引用',
      host.querySelector('[role="tablist"][aria-label="物品检查器"]')!,
    )
    referenceTab.focus()
    await act(async () =>
      referenceTab.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
      ),
    )
    expect(host.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toContain('概览')
    expect(host.querySelector('[role="tabpanel"]:not([hidden])')?.id).toBe(
      'item-inspector-panel-overview',
    )

    const second = [...host.querySelectorAll<HTMLButtonElement>('.ds-catalog-row')].find(
      (candidate) => candidate.textContent?.includes('item-b'),
    )!
    await act(async () => second.click())
    await act(async () => button('删除', host.querySelector('.item-title-actions')!).click())
    await act(async () => button('确认', host.querySelector('.item-title-actions')!).click())
    expect(session.getState().items.map((entry) => entry.id)).toEqual(['item-a'])

    await act(async () => session.undo())
    expect(session.getState().items.map((entry) => entry.id)).toEqual(['item-a', 'item-b'])
    expect(host.querySelector('.ds-object-hero__id')?.textContent).toBe('item-b')
  })
})
