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
import { projectActiveScriptEditorStateV5 } from '../core/project-io-v5.js'
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
  focusPrivateScript?: {
    itemId: string
    ability: 'use' | 'throw'
    scriptId: string
    commandPath: string
    revision: number
  }
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
  useSyncExternalStore(
    (callback) => props.scriptV5?.session.subscribe(callback) ?? (() => undefined),
    () => props.scriptV5?.session.getVersion() ?? 0,
  )
  const current = props.session.getState()
  const activeScriptState = props.scriptV5
    ? projectActiveScriptEditorStateV5(props.scriptV5.session.getState(), current.items)
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
      onOpenItemReference={props.onOpenItemReference}
      scriptV5={
        props.scriptV5 && activeScriptState
          ? { state: activeScriptState, session: props.scriptV5.session }
          : undefined
      }
    />
  )
}

function button(text: string, root: ParentNode = document): HTMLButtonElement {
  return [...root.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
    candidate.textContent?.includes(text),
  )!
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

  test('投掷法术演出使用共享结构化编辑器并可添加、编辑、移除和撤销', async () => {
    const initial = state([
      {
        ...item('throw-item'),
        name: '无影毒',
        throw: {
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
    const numberField = (label: string): HTMLInputElement =>
      [...presentation.querySelectorAll<HTMLInputElement>('input[type="number"]')].find(
        (candidate) => candidate.closest('label')?.textContent?.includes(label),
      )!
    await setInput(numberField('特效号'), '24')
    await setInput(numberField('X 偏移'), '-12')
    await setInput(numberField('层级偏移'), '1')
    await setInput(numberField('速度'), '-1')
    const placement = [...presentation.querySelectorAll<HTMLSelectElement>('select')].find(
      (candidate) => candidate.closest('label')?.textContent?.includes('落点'),
    )!
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!
      setter.call(placement, 'attackWhole')
      placement.dispatchEvent(new Event('change', { bubbles: true }))
    })
    const sound = presentation.querySelector<HTMLSelectElement>('select[aria-label="音效"]')!
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!
      setter.call(sound, 'sound.pal.157')
      sound.dispatchEvent(new Event('change', { bubbles: true }))
    })
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
              script: { chunk: '__script-v5-runtime', id: 'item:private:use' },
            },
          ],
        },
      },
    ])
    initial.shops = []
    const session = new EditSession(initial)
    const canonical: ScriptEditorStateV5 = {
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
      migrationSidecars: [],
    }
    const scriptSession = new ScriptV5EditSession(canonical)
    await act(async () =>
      root.render(
        <Harness session={session} scriptV5={{ state: canonical, session: scriptSession }} />,
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
      projectActiveScriptEditorStateV5(scriptSession.getState(), session.getState().items).items[0]!
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
              script: { chunk: '__script-v5-runtime', id: 'item:private:use' },
            },
          ],
        },
      },
    ])
    initial.shops = []
    const session = new EditSession(initial)
    const canonical: ScriptEditorStateV5 = {
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
      migrationSidecars: [],
    }
    const scriptV5 = {
      state: canonical,
      session: new ScriptV5EditSession(canonical),
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
          scriptV5={scriptV5}
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
          scriptV5={scriptV5}
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
