// @vitest-environment jsdom
import { createScriptIndex, deriveScriptChunk, type ItemData } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { UpdateItemCommand, UpsertAuthoredScriptCommand } from '../core/commands.js'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import type { ItemReference } from '../core/item-references.js'
import { type ScriptEditorStateV5, ScriptV5EditSession } from '../core/script-v5-editor.js'
import { ItemTab } from './ItemTab.js'

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
      contentVersion: 1,
      engineVersion: 'test',
      entryScene: 'scene-a',
      startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
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
    startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
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
  onOpenItemReference?: (reference: ItemReference) => void
  assetReader?: EditorAssetReader
  scriptV5?: {
    state: ScriptEditorStateV5
    session: ScriptV5EditSession
  }
}) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const current = props.session.getState()
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
      onOpenScript={props.onOpenScript}
      onOpenItemReference={props.onOpenItemReference}
      scriptV5={props.scriptV5}
    />
  )
}

function button(text: string, root: ParentNode = document): HTMLButtonElement {
  return [...root.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
    candidate.textContent?.includes(text),
  )!
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
  test('空工程可直接创建第一个物品并进入完整工作台', async () => {
    const initial = state([])
    initial.shops = []
    const session = new EditSession(initial)
    await act(async () => root.render(<Harness session={session} />))

    expect(host.textContent).toContain('工程还没有物品')
    await act(async () => button('新建第一个物品', host).click())

    expect(session.getState().items).toHaveLength(1)
    expect(session.getState().items[0]).toMatchObject({ id: 'item-001', name: '新物品' })
    expect(host.querySelector('.item-workbench-title code')?.textContent).toBe('item-001')
    expect(host.textContent).toContain('基础信息')
    expect(
      [...host.querySelectorAll('.item-base-section-heading h4')].map(
        (heading) => heading.textContent,
      ),
    ).toEqual(['图标资源', '身份信息', '交易信息', '显示文本'])
    expect(host.querySelector('.item-catalog-head')?.textContent).not.toContain('复制')
    expect(
      [...host.querySelectorAll<HTMLButtonElement>('.item-icon-actions button')].every(
        (action) =>
          action.classList.contains('item-action-button') && !action.classList.contains('mini'),
      ),
    ).toBe(true)
  })

  test('目录可新建、复制并阻止删除仍在商店中的物品', async () => {
    const session = new EditSession(state())
    await act(async () => root.render(<Harness session={session} />))

    await act(async () => button('＋', host.querySelector('.item-catalog-head')!).click())
    expect(session.getState().items.map((entry) => entry.id)).toEqual(['item-a', 'item-001'])
    expect(host.querySelector('.item-workbench-title code')?.textContent).toBe('item-001')

    await act(async () => button('复制', host.querySelector('.item-workbench-title')!).click())
    expect(session.getState().items.map((entry) => entry.id)).toEqual([
      'item-a',
      'item-001',
      'item-001-copy',
    ])

    const original = [...host.querySelectorAll<HTMLButtonElement>('.item-catalog-row')].find(
      (candidate) => candidate.textContent?.includes('剧情钥匙'),
    )!
    await act(async () => original.click())
    await act(async () => button('删除', host.querySelector('.item-title-actions')!).click())
    await act(async () => button('确认', host.querySelector('.item-title-actions')!).click())

    expect(session.getState().items.some((entry) => entry.id === 'item-a')).toBe(true)
    expect(host.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toContain('引用')
    expect(host.textContent).toContain('商店 7')
  })

  test('目录搜索和能力筛选各自收敛结果，清空后恢复全部物品', async () => {
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
      throw: { effects: [{ kind: 'applyPoison', poisonId: '1' }] },
    }
    const initial = state([equipItem, useItem, throwItem])
    initial.shops = []
    const session = new EditSession(initial)
    await act(async () => root.render(<Harness session={session} />))

    await act(async () => button('可使用', host.querySelector('.item-filter-chips')!).click())
    expect([...host.querySelectorAll('.item-catalog-row')].map((row) => row.textContent)).toEqual([
      expect.stringContaining('还魂香'),
    ])

    const search = host.querySelector<HTMLInputElement>(
      'input[aria-label="搜索物品名称或稳定 ID"]',
    )!
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      setter.call(search, '不存在')
      search.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(host.textContent).toContain('没有匹配项')
    await act(async () => button('清除筛选', host).click())
    expect(host.querySelectorAll('.item-catalog-row')).toHaveLength(3)
  })

  test('图标浏览器使用可聚焦原生按钮组并正确绑定选择', async () => {
    const initial = state([
      {
        ...item('item-a'),
        equip: { slot: 'weapon', equipableBy: [], effects: [] },
        use: { target: 'oneAlly', consuming: true, effects: [{ kind: 'healHp', amount: 10 }] },
        throw: { effects: [{ kind: 'applyPoison', poisonId: '1' }] },
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
    await act(async () => root.render(<Harness session={session} assetReader={reader} />))

    expect(host.querySelectorAll('.item-capability-card.enabled')).toHaveLength(3)
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

    await act(async () => button('引用', host.querySelector('.item-inspector-tabs')!).click())
    await act(async () => button('打开位置', host).click())
    expect(onOpenItemReference).toHaveBeenCalledWith(
      expect.objectContaining({ locator: { kind: 'shop', shopId: 7 } }),
    )

    await act(async () => session.undo())
    expect(session.getState().items[0]?.use?.effects[0]).toMatchObject({
      kind: 'runScript',
      script: { id: scriptId },
    })
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
    const canonical: ScriptEditorStateV5 = {
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
      migrationSidecars: [],
    }
    const scriptV5 = {
      state: canonical,
      session: new ScriptV5EditSession(canonical),
    }
    const onOpenItemReference = vi.fn()

    await act(async () =>
      root.render(
        <Harness session={session} scriptV5={scriptV5} onOpenItemReference={onOpenItemReference} />,
      ),
    )

    expect(host.querySelector('.item-catalog-row')?.textContent).toContain('引用 2')
    await act(async () => button('引用 2', host.querySelector('.item-inspector-tabs')!).click())
    expect(host.textContent).toContain(
      '场景 s151 / 进场脚本“默认进场行为” / 步骤 1 / 脚本正文 / 第 1 条指令',
    )
    expect(host.textContent).toContain(
      '场景 s154 / 实体 e2493 / 交互脚本“触发行为 1” / 步骤 1 / 脚本正文 / 第 1 条指令',
    )

    const openButtons = [...host.querySelectorAll<HTMLButtonElement>('.item-reference-card button')]
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

  test('检查器支持方向键切换，删除后撤销会恢复原选择', async () => {
    const session = new EditSession(state([item('item-a'), item('item-b')]))
    await act(async () => root.render(<Harness session={session} />))

    const referenceTab = button('引用', host.querySelector('.item-inspector-tabs')!)
    referenceTab.focus()
    await act(async () =>
      referenceTab.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
      ),
    )
    expect(host.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toContain('资源')
    expect(host.querySelector('[role="tabpanel"]')?.id).toBe('item-inspector-panel-resource')

    const second = [...host.querySelectorAll<HTMLButtonElement>('.item-catalog-row')].find(
      (candidate) => candidate.textContent?.includes('item-b'),
    )!
    await act(async () => second.click())
    await act(async () => button('删除', host.querySelector('.item-title-actions')!).click())
    await act(async () => button('确认', host.querySelector('.item-title-actions')!).click())
    expect(session.getState().items.map((entry) => entry.id)).toEqual(['item-a'])

    await act(async () => session.undo())
    expect(session.getState().items.map((entry) => entry.id)).toEqual(['item-a', 'item-b'])
    expect(host.querySelector('.item-workbench-title code')?.textContent).toBe('item-b')
  })
})
