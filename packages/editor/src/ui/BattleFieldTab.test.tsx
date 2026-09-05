// @vitest-environment jsdom
import type { BattleFieldDef } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import type { EditorDerivedStatus } from '../core/editor-derived-contract.js'
import type { ProjectReferenceEdge, ProjectReferenceIndex } from '../core/project-reference.js'
import {
  type CurrentProjectReferenceIndexProvider,
  collectCurrentProjectReferenceIndex,
} from '../core/project-reference-adapters.js'
import type { ScriptEditorState } from '../core/script-editor.js'
import { BattleFieldTab } from './BattleFieldTab.js'
import { setCatalogSearch } from './catalog-controls-test-utils.js'
import { verifyCanonicalObjectWorkspace } from './object-workspace-test-utils.js'

const field = (id: number, name = `战场 ${id}`): BattleFieldDef => ({
  id,
  name,
  screenWave: 0,
  magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
})

function state(fields: BattleFieldDef[], declared = true): EditorState {
  return {
    manifest: {
      id: 'test',
      name: '测试',
      contentVersion: 20,
      minimumSaveVersion: 8,
      defaultEntryId: 'main',
      content: {
        scenes: 'content/scenes/index.json',
        items: 'content/items.json',
        skills: 'content/skills.json',
        actors: 'content/actors.json',
        locale: 'content/locale.json',
        sprites: 'content/sprites.json',
        maps: 'content/maps/index.json',
        sharedScripts: 'content/shared-scripts.json',
        ...(declared ? { battleFields: 'content/battle-fields.json' } : {}),
      },
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
    scenes: [
      {
        id: 's001',
        mapId: 'map-001',
        battleFieldId: fields[0]?.id,
        entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        entities: [],
      },
    ],
    actors: [],
    skills: [],
    levelUp: {},
    items: [],
    locale: {},
    sprites: [],
    battleSprites: [],
    battleFields: fields,
    maps: {},
    sceneIndex: { version: 1, scenes: [] },
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
  onOpenReference?: (reference: ProjectReferenceEdge) => void
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
    <BattleFieldTab
      battleFields={current.battleFields ?? []}
      assetBase={{} as never}
      session={props.session}
      assetCatalog={current.assetCatalog}
      assetReader={{} as EditorAssetReader}
      referenceIndex={index}
      referenceStatus={props.referenceStatus ?? 'current'}
      getCurrentReferenceIndex={props.getCurrentReferenceIndex ?? currentReferences}
      focusObjectId={props.focusObjectId}
      onOpenBattleFieldReference={props.onOpenReference}
    />
  )
}

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    imageSmoothingEnabled: false,
  } as never)
})

afterEach(async () => {
  await act(async () => root.unmount())
  vi.restoreAllMocks()
  host.remove()
})

function button(text: string): HTMLButtonElement {
  return [...host.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
    candidate.textContent?.includes(text),
  )!
}

async function setInput(input: HTMLInputElement, value: string): Promise<void> {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('BattleFieldTab B2-1 authoring closure', () => {
  test('目录行将名称、稳定 ID 与默认状态分槽且全族省略媒体位', async () => {
    const session = new EditSession(state([field(6, '初遇战场'), field(24, '默认战场')]))
    await act(async () => root.render(<Harness session={session} focusObjectId="24" />))

    const rows = [...host.querySelectorAll<HTMLElement>('.bf-catalog .ds-catalog-row')]
    expect(rows).toHaveLength(2)
    expect(rows.every((row) => row.dataset.leading === 'none')).toBe(true)
    expect(rows[0]!.querySelector('.ds-catalog-row__title')?.textContent).toBe('初遇战场')
    expect(rows[0]!.querySelector('.ds-catalog-row__meta')?.textContent).toBe('#006')
    expect(rows[0]!.querySelector('.ds-catalog-row__trailing')).toBeNull()
    expect(rows[1]!.querySelector('.ds-catalog-row__title')?.textContent).toBe('默认战场')
    expect(rows[1]!.querySelector('.ds-catalog-row__meta')?.textContent).toBe('#024')
    expect(rows[1]!.querySelector('.ds-catalog-row__trailing .ds-tag')?.textContent).toBe('默认')
  })

  test('目录搜索覆盖命中、空结果与清空恢复，且不会偷换深链选择', async () => {
    const session = new EditSession(state([field(1, '前置战场'), field(24, '默认战场')]))
    await act(async () => root.render(<Harness session={session} focusObjectId="24" />))
    const search = host.querySelector<HTMLInputElement>('input[aria-label="搜索战场"]')!
    expect(host.querySelectorAll('.bf-catalog .ds-catalog-row')).toHaveLength(2)

    await setCatalogSearch(search, '前置')
    expect(host.querySelectorAll('.bf-catalog .ds-catalog-row')).toHaveLength(1)
    expect(host.querySelector('.bf-catalog .ds-catalog-row[data-selected="true"]')).toBeNull()
    expect(host.querySelector('.ds-object-hero__title')?.textContent).toBe('默认战场')

    await setCatalogSearch(search, '不存在')
    expect(host.querySelectorAll('.bf-catalog .ds-catalog-row')).toHaveLength(0)
    expect(host.textContent).toContain('没有匹配的战场')
    await setCatalogSearch(search, '')
    expect(host.querySelectorAll('.bf-catalog .ds-catalog-row')).toHaveLength(2)
    expect(
      host.querySelector('.bf-catalog .ds-catalog-row[data-selected="true"]')?.textContent,
    ).toContain('默认战场')
  })

  test('显示全部已声明编号，不再把小于 6 的合法作者数据过滤掉', async () => {
    const session = new EditSession(state([field(1, '自定义前置战场'), field(24, '默认战场')]))
    await act(async () => root.render(<Harness session={session} focusObjectId="1" />))
    expect(host.textContent).toContain('#001')
    expect(host.textContent).toContain('自定义前置战场')
    expect(host.querySelector('.ds-object-hero__eyebrow')?.textContent).toBe('战场')
    expect(host.querySelector('.ds-object-hero__title')?.textContent).toBe('自定义前置战场')
    expect(host.querySelector('.ds-object-hero__id')?.textContent).toBe('#001')
  })

  test('对象标题固定在工作区顶层，正文使用独立滚动层', async () => {
    const session = new EditSession(state([field(6, '')]))
    await act(async () => root.render(<Harness session={session} focusObjectId="6" />))

    const { workspace, content } = verifyCanonicalObjectWorkspace(host, '战场工作区')
    const hero = workspace.querySelector<HTMLElement>(':scope > .ds-object-hero')

    expect(hero).not.toBeNull()
    expect(content.classList.contains('bf-editor-scroll')).toBe(true)
    expect(content?.contains(hero ?? null)).toBe(false)
    expect(hero?.querySelector('h1')?.textContent).toBe('战场 #006')
    expect(hero?.querySelector('.ds-object-hero__eyebrow')?.textContent).toBe('战场')
    expect(hero?.querySelector('.ds-object-hero__id')?.textContent).toBe('#006')
    expect(hero?.querySelector('.ds-object-hero__actions .ds-button--danger')).not.toBeNull()
    expect(content?.querySelectorAll(':scope > .ds-workbench-section')).toHaveLength(1)
    expect(content?.querySelectorAll('.bf-card-grid > .ds-workbench-section')).toHaveLength(2)
    expect(content?.querySelector('.bf-card')).toBeNull()
  })

  test('空项目先编辑编号/名称再提交，首次创建同时登记 manifest', async () => {
    const session = new EditSession(state([], false))
    await act(async () => root.render(<Harness session={session} />))
    expect(host.textContent).toContain('还没有战场')
    const empty = verifyCanonicalObjectWorkspace(host, '战场工作区', { hero: false })
    const emptyCreate = button('创建第一个战场')
    await act(async () => {
      emptyCreate.focus()
      emptyCreate.click()
    })
    const creating = verifyCanonicalObjectWorkspace(host, '战场工作区', { hero: false })
    expect(creating.content).toBe(empty.content)
    expect(document.activeElement).toBe(creating.content.querySelector('input'))
    const inputs = host.querySelectorAll<HTMLInputElement>('.bf-create-grid input')
    expect(inputs[0]!.value).toBe('24')
    await setInput(inputs[0]!, '30')
    await setInput(inputs[1]!, '云海')
    await act(async () => button('创建战场').click())
    expect(session.getState().battleFields).toEqual([field(30, '云海')])
    expect(session.getState().manifest.content.battleFields).toBe('content/battle-fields.json')
    expect(host.textContent).toContain('缺少项目默认战场 #024')
  })

  test('引用面板展示系统/场景引用，精确场景引用可跳转', async () => {
    const open = vi.fn()
    const session = new EditSession(state([field(24, '默认战场')]))
    await act(async () => root.render(<Harness session={session} onOpenReference={open} />))
    expect(host.textContent).toContain('2 处引用会阻断删除')
    expect(host.textContent).toContain('系统默认')
    expect(host.textContent).toContain('场景 s001')
    await act(async () =>
      host.querySelector<HTMLButtonElement>('.ds-reference-row[data-actionable="true"]')?.click(),
    )
    expect(open).toHaveBeenCalledWith(
      expect.objectContaining({
        relation: { kind: 'battle-field-use', use: 'scene-default' },
        locator: {
          kind: 'object',
          object: { kind: 'scene', id: 's001' },
          section: 'battle-field',
        },
      }),
    )
  })

  test.each([
    ['checking', 'loading'],
    ['stale', 'partial'],
    ['failed', 'error'],
  ] as const)('%s 引用快照不冒充零引用并禁用删除', async (status, panelState) => {
    const session = new EditSession(state([field(6, '待检查战场')]))
    await act(async () => root.render(<Harness session={session} referenceStatus={status} />))

    expect(host.querySelector('.ds-reference-panel')?.getAttribute('data-state')).toBe(panelState)
    expect(host.textContent).toContain('数量未知')
    expect(button('删除战场').disabled).toBe(true)
  })

  test('current 但索引缺失时仍按失败态关闭删除', async () => {
    const session = new EditSession(state([field(6, '缺失索引')]))
    await act(async () =>
      root.render(<Harness session={session} omitReferenceIndex referenceStatus="current" />),
    )
    expect(host.querySelector('.ds-reference-panel')?.getAttribute('data-state')).toBe('error')
    expect(host.textContent).toContain('数量未知')
    expect(button('删除战场').disabled).toBe(true)
  })

  test('展示为零后删除仍以 live canonical oracle 为准', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const session = new EditSession(state([field(24, '默认战场'), field(25, '实时引用战场')]))
    const canonical: ScriptEditorState = {
      scenes: [],
      items: [],
      sharedScripts: {
        'shared/live': {
          name: '实时开战',
          self: 'none',
          body: [{ kind: 'startBattle', enemyTeamId: 'team-live', fieldId: 25 }],
        },
      },
    }
    await act(async () =>
      root.render(
        <Harness
          session={session}
          focusObjectId="25"
          getCurrentReferenceIndex={(current) =>
            collectCurrentProjectReferenceIndex(current, canonical)
          }
        />,
      ),
    )
    expect(button('删除战场').disabled).toBe(false)
    await act(async () => button('删除战场').click())
    expect(session.getState().battleFields?.some((candidate) => candidate.id === 25)).toBe(true)
    expect(host.textContent).toContain('仍有 1 处引用')
  })

  test('live oracle 失败时保留战场并显示可恢复错误', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const session = new EditSession(state([field(24, '默认战场'), field(25, '待删除战场')]))
    const provider = vi.fn(() => {
      throw new Error('oracle down')
    })
    await act(async () =>
      root.render(
        <Harness session={session} focusObjectId="25" getCurrentReferenceIndex={provider} />,
      ),
    )
    await act(async () =>
      host.querySelector<HTMLButtonElement>('.ds-object-hero__actions button')?.click(),
    )
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(provider).toHaveBeenCalledTimes(1)
    expect(session.getState().battleFields?.some((candidate) => candidate.id === 25)).toBe(true)
    expect(host.textContent).toContain('oracle down')
  })
})
