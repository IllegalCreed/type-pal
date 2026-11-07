// @vitest-environment jsdom

import type { AssetCatalogV1, SceneDef, SceneIndexV1 } from '@type-pal/content'
import { act, type ComponentProps, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { UpdateItemCommand } from '../core/commands.js'
import { type EditorState, EditSession } from '../core/edit-session.js'
import {
  buildProjectReferenceSnapshot,
  createProjectReferenceIndex,
} from '../core/project-reference.js'
import {
  collectCurrentProjectReferenceIndex,
  sharedScriptReferenceEdges,
} from '../core/project-reference-adapters.js'
import {
  collectCanonicalScriptCommandVisits,
  collectCanonicalSharedScriptReferencesFromVisits,
  type ScriptEditorState,
  ScriptEditSession,
} from '../core/script-editor.js'
import { setCatalogSearch } from './catalog-controls-test-utils.js'
import { verifyCatalogWorkspace } from './catalog-workspace-test-utils.js'
import { CanonicalScriptBodyEditor, type CanonicalScriptEditorContext } from './ScriptEditor.js'
import { CanonicalSharedScriptTab as CanonicalSharedScriptTabContent } from './SharedScriptTab.js'

function currentSharedScriptReferences(candidate: ScriptEditorState) {
  const visits = collectCanonicalScriptCommandVisits(candidate)
  return createProjectReferenceIndex(
    buildProjectReferenceSnapshot(
      sharedScriptReferenceEdges(
        collectCanonicalSharedScriptReferencesFromVisits(candidate, visits),
        candidate,
      ),
    ),
  )
}

function CanonicalSharedScriptTab(
  props: Omit<
    ComponentProps<typeof CanonicalSharedScriptTabContent>,
    'referenceStatus' | 'getCurrentReferenceIndex'
  > & {
    referenceStatus?: ComponentProps<typeof CanonicalSharedScriptTabContent>['referenceStatus']
    getCurrentReferenceIndex?: ComponentProps<
      typeof CanonicalSharedScriptTabContent
    >['getCurrentReferenceIndex']
  },
) {
  const index = props.referenceIndex ?? currentSharedScriptReferences(props.state)
  return (
    <CanonicalSharedScriptTabContent
      {...props}
      referenceIndex={index}
      referenceStatus={props.referenceStatus ?? 'current'}
      getCurrentReferenceIndex={props.getCurrentReferenceIndex ?? currentSharedScriptReferences}
    />
  )
}

const state: ScriptEditorState = {
  scenes: [],
  items: [],
  sharedScripts: {
    'shared/user/book': {
      name: '读天书',
      self: 'none',
      body: [
        {
          kind: 'dialog',
          cue: {
            identity: { kind: 'narration' },
            rows: [{ text: '天书正文' }],
          } as never,
        },
      ],
    },
  },
}

const catalog: AssetCatalogV1 = { version: 1, assets: {} }
const context: CanonicalScriptEditorContext = {
  state,
  shellScenes: [] as SceneDef[],
  locale: {},
  assetCatalog: catalog,
  audioResolver: {} as CanonicalScriptEditorContext['audioResolver'],
  assetReader: {} as CanonicalScriptEditorContext['assetReader'],
  references: {
    choices: () => [],
    has: () => false,
    label: (_kind, id) => id,
  },
  battleSprites: [],
}
const projectProps = {
  projectId: 'test',
  projectMaps: {},
  sceneIndex: { version: 1, scenes: [] },
  mapIndex: { version: 1 as const, maps: [] },
  tilesets: [],
}

function buttonWithText(container: HTMLElement, text: string): HTMLButtonElement {
  const button = [...container.querySelectorAll('button')].find(
    (candidate) => candidate.textContent?.trim() === text,
  )
  expect(button, `按钮「${text}」`).toBeDefined()
  return button!
}

async function openOptions(container: HTMLElement, name: string): Promise<HTMLElement> {
  const label = [...container.querySelectorAll('label')].find(
    (candidate) => candidate.textContent?.trim() === name,
  )
  const control =
    container.querySelector<HTMLButtonElement>(`button[role="combobox"][aria-label="${name}"]`) ??
    label?.control
  expect(control?.getAttribute('role'), `选择器「${name}」`).toBe('combobox')
  await act(async () => control!.click())
  const options = document.getElementById(control!.getAttribute('aria-controls')!)
  expect(options?.getAttribute('role'), `选项列表「${name}」`).toBe('listbox')
  return options!
}

function optionWithText(listbox: HTMLElement, text: string): HTMLElement {
  const option = [...listbox.querySelectorAll<HTMLElement>('[role="option"]')].find(
    (candidate) => candidate.textContent?.trim() === text,
  )
  expect(option, `选项「${text}」`).toBeDefined()
  return option!
}

describe('CanonicalSharedScriptTab', () => {
  let host: HTMLDivElement
  let root: Root

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

  async function renderSession(
    session: ScriptEditSession,
    sceneIndex: SceneIndexV1 = { version: 1, scenes: [] },
    onError?: (message: string) => void,
  ): Promise<void> {
    function Harness() {
      useSyncExternalStore(
        (listener) => session.subscribe(listener),
        () => session.getVersion(),
      )
      const editorState = session.getState()
      return (
        <CanonicalSharedScriptTab
          tabBar={null}
          state={editorState}
          session={session}
          context={{ ...context, state: editorState, sceneIndex }}
          {...projectProps}
          onError={onError}
        />
      )
    }
    await act(async () => root.render(<Harness />))
  }

  test('reads the canonical library and mounts the shared body editor', () => {
    const html = renderToStaticMarkup(
      <CanonicalSharedScriptTab
        tabBar={null}
        state={state}
        session={new ScriptEditSession(state)}
        context={context}
        {...projectProps}
      />,
    )
    expect(html).toContain('读天书')
    expect(html).toContain('shared/user/book')
    expect(html).toContain('天书正文')
    expect(html).toContain('canonical-script-editor')
    expect(html).toContain('data-ds-scroll-scope="main"')
    expect(html).toContain('ds-object-workspace__content')
    expect(html).toContain('ds-workbench-section')
    expect(html).toContain('data-content-layout="list"')
    expect(html).not.toContain('canonical-shared-script-editor-scroll')
    expect(html).not.toContain('迁移内部实现')
    expect(html).not.toContain('Canonical ScriptFlow JSON')
  })

  test('目录搜索覆盖命中、空结果与清空恢复，且不偷换被过滤的脚本', async () => {
    const searchState: ScriptEditorState = {
      ...state,
      sharedScripts: {
        ...state.sharedScripts,
        'shared/user/opening': { name: '序章', self: 'none', body: [] },
      },
    }
    const session = new ScriptEditSession(searchState)
    await act(async () =>
      root.render(
        <CanonicalSharedScriptTab
          tabBar={null}
          state={searchState}
          session={session}
          context={{ ...context, state: searchState }}
          {...projectProps}
        />,
      ),
    )
    const search = host.querySelector<HTMLInputElement>('input[aria-label="搜索可复用脚本"]')!
    verifyCatalogWorkspace(host, '可复用脚本目录')
    expect(host.querySelectorAll('.shared-list > .ds-catalog-row')).toHaveLength(2)

    await setCatalogSearch(search, '序章')
    expect(host.querySelectorAll('.shared-list > .ds-catalog-row')).toHaveLength(1)
    expect(host.querySelector('.shared-list > [data-selected="true"]')).toBeNull()
    expect(host.querySelector('.canonical-shared-script-main')?.textContent).toContain('读天书')

    await setCatalogSearch(search, '不存在')
    expect(host.querySelectorAll('.shared-list > .ds-catalog-row')).toHaveLength(0)
    expect(host.textContent).toContain('没有匹配的可复用脚本')
    await setCatalogSearch(search, '')
    expect(host.querySelectorAll('.shared-list > .ds-catalog-row')).toHaveLength(2)
    expect(host.querySelector('.shared-list > [data-selected="true"]')?.textContent).toContain(
      '读天书',
    )
  })

  test('opens creation from the list header and creates through a dedicated dialog', async () => {
    const session = new ScriptEditSession(structuredClone(state))

    function Harness() {
      useSyncExternalStore(
        (listener) => session.subscribe(listener),
        () => session.getVersion(),
      )
      const editorState = session.getState()
      return (
        <CanonicalSharedScriptTab
          tabBar={null}
          state={editorState}
          session={session}
          context={{ ...context, state: editorState }}
          {...projectProps}
        />
      )
    }

    await act(async () => root.render(<Harness />))
    expect(host.querySelector('.canonical-shared-script-create-form')).toBeNull()

    const open = host.querySelector<HTMLButtonElement>('[aria-label="新建可复用脚本"]')!
    await act(async () => open.click())

    const dialog = host.querySelector<HTMLElement>('[role="dialog"]')!
    expect(dialog.getAttribute('aria-label')).toBe('新建可复用脚本')
    expect(dialog.textContent).toContain('脚本名称')
    expect(dialog.textContent).toContain('稳定 ID')
    expect(document.activeElement?.getAttribute('name')).toBe('shared-script-name')

    const submit = dialog.querySelector<HTMLButtonElement>('button[type="submit"]')!
    expect(submit.disabled).toBe(false)
    await act(async () => submit.click())
    expect(dialog.querySelector('[role="alert"]')?.textContent).toBe('请输入脚本名称。')
    expect(document.activeElement?.getAttribute('name')).toBe('shared-script-name')

    const name = dialog.querySelector<HTMLInputElement>('[name="shared-script-name"]')!
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(
      name,
      '序章开场',
    )
    await act(async () => name.dispatchEvent(new Event('input', { bubbles: true })))

    const id = dialog.querySelector<HTMLInputElement>('[name="shared-script-id"]')!
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(
      id,
      'shared/user/opening-story',
    )
    await act(async () => id.dispatchEvent(new Event('input', { bubbles: true })))
    await act(async () => submit.click())

    expect(session.getState().sharedScripts['shared/user/opening-story']).toEqual({
      name: '序章开场',
      self: 'none',
      body: [],
    })
    expect(host.querySelector('[role="dialog"]')).toBeNull()
    expect(host.textContent).toContain('序章开场')
  })

  test('metadata uses field commits without a redundant local save action', async () => {
    const metadataState = structuredClone(state)
    const session = new ScriptEditSession(metadataState)

    function Harness() {
      useSyncExternalStore(
        (listener) => session.subscribe(listener),
        () => session.getVersion(),
      )
      const editorState = session.getState()
      return (
        <CanonicalSharedScriptTab
          tabBar={null}
          state={editorState}
          session={session}
          context={{ ...context, state: editorState }}
          {...projectProps}
        />
      )
    }

    await act(async () => root.render(<Harness />))
    const name = host.querySelector<HTMLInputElement>(
      '.shared-meta input[name="shared-script-display-name"]',
    )!
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(name, '天书·改')
    await act(async () => name.dispatchEvent(new Event('input', { bubbles: true })))
    expect(session.getState().sharedScripts['shared/user/book']?.name).toBe('读天书')

    await act(async () => name.dispatchEvent(new FocusEvent('focusout', { bubbles: true })))
    expect(session.getState().sharedScripts['shared/user/book']?.name).toBe('天书·改')
    expect(
      [...host.querySelectorAll<HTMLButtonElement>('.shared-meta button')].some(
        (candidate) => candidate.textContent?.trim() === '保存',
      ),
    ).toBe(false)

    const description = host.querySelector<HTMLTextAreaElement>('.shared-meta textarea')!
    const historyBeforeDescription = session.getHistoryVersion()
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(
      description,
      '逐键提交说明',
    )
    await act(async () => description.dispatchEvent(new Event('input', { bubbles: true })))
    expect(session.getState().sharedScripts['shared/user/book']?.description).toBeUndefined()
    expect(session.getHistoryVersion()).toBe(historyBeforeDescription)
    await act(async () => description.dispatchEvent(new FocusEvent('focusout', { bubbles: true })))
    expect(session.getState().sharedScripts['shared/user/book']?.description).toBe('逐键提交说明')
    expect(session.getHistoryVersion()).toBe(historyBeforeDescription + 1)

    const self = host.querySelector<HTMLButtonElement>('[aria-label="self 契约"]')!
    await act(async () => self.click())
    const optional = [...document.body.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (option) => option.textContent?.includes('可选'),
    )!
    await act(async () => optional.click())
    expect(session.getState().sharedScripts['shared/user/book']?.self).toBe('optional')
  })

  test('delete rechecks a main-session item binding that appeared after the derived snapshot', async () => {
    const canonical = structuredClone(state)
    const scriptSession = new ScriptEditSession(canonical)
    const item = {
      id: 'item-a',
      name: '调用物品',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
    }
    const mainState = {
      manifest: {
        id: 'test',
        name: 'Test',
        contentVersion: 23,
        minimumSaveVersion: 12,
        defaultEntryId: 'main',
        content: {},
        assets: { catalog: 'assets/index.json', roles: {} },
        entryPoints: [],
      },
      scenes: [],
      actors: [],
      skills: [],
      levelUp: {},
      items: [item],
      locale: {},
      sprites: [],
      battleSprites: [],
      enemies: [],
      enemyTeams: [],
      battleFields: [],
      maps: {},
      sceneIndex: { version: 1, scenes: [] },
      mapIndex: { version: 1, maps: [] },
      tilesets: [],
      tilesetBlobs: {},
      assetCatalog: { version: 1, assets: {} },
      assetBlobs: {},
      scriptChunks: {},
      sharedScripts: {},
      stamps: [],
      shops: [],
      poisons: [],
      ambiences: [],
    } as unknown as EditorState
    const mainSession = new EditSession(mainState)
    const staleIndex = currentSharedScriptReferences(canonical)
    const onError = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    function Harness() {
      useSyncExternalStore(
        (listener) => scriptSession.subscribe(listener),
        () => scriptSession.getVersion(),
      )
      const editorState = scriptSession.getState()
      return (
        <CanonicalSharedScriptTab
          tabBar={null}
          state={editorState}
          session={scriptSession}
          context={{ ...context, state: editorState }}
          referenceIndex={staleIndex}
          getCurrentReferenceIndex={(candidate) =>
            collectCurrentProjectReferenceIndex(mainSession.getState(), candidate)
          }
          onError={onError}
          {...projectProps}
        />
      )
    }

    await act(async () => root.render(<Harness />))
    expect(
      host.querySelector<HTMLButtonElement>('button[title="删除当前可复用脚本"]')?.disabled,
    ).toBe(false)
    mainSession.dispatch(
      new UpdateItemCommand('item-a', {
        use: {
          target: 'scene',
          consuming: false,
          effects: [
            {
              kind: 'runScript',
              script: { chunk: '__author-script-runtime', id: 'shared/user/book' },
            },
          ],
        },
      }),
    )

    await act(async () =>
      host.querySelector<HTMLButtonElement>('button[title="删除当前可复用脚本"]')!.click(),
    )

    expect(scriptSession.getState().sharedScripts['shared/user/book']).toBeDefined()
    expect(scriptSession.getHistoryVersion()).toBe(0)
    expect(onError).toHaveBeenCalledWith(expect.stringMatching(/仍有 1 个引用/))
  })

  test('does not invent a scene owner or mount playback in the project-level library', () => {
    const html = renderToStaticMarkup(
      <CanonicalSharedScriptTab
        tabBar={null}
        state={state}
        session={new ScriptEditSession(state)}
        context={context}
        {...projectProps}
      />,
    )
    expect(html).not.toContain('预览场景')
    expect(html).not.toContain('调用实体')
    expect(html).not.toContain('shared-preview')
    expect(html).toContain('请从真实场景调用位置进入预览')
  })

  test('empty workbench keeps the single header add action without a duplicate body button', () => {
    const emptyState: ScriptEditorState = {
      ...state,
      sharedScripts: {
        'shared/user/empty': { name: '空脚本', self: 'none', body: [] },
      },
    }
    const html = renderToStaticMarkup(
      <CanonicalSharedScriptTab
        tabBar={null}
        state={emptyState}
        session={new ScriptEditSession(emptyState)}
        context={{ ...context, state: emptyState }}
        {...projectProps}
      />,
    )

    expect(html.match(/<span>添加指令<\/span>/g)).toHaveLength(1)
    expect(html).not.toContain('添加第一条指令')
    expect(html).toContain('请使用右上角“添加指令”')
  })

  test('共享脚本调用行显示当前名称，引用失效时保留可定位的 ID', async () => {
    const callState: ScriptEditorState = {
      scenes: [],
      items: [],
      sharedScripts: {
        'shared/user/caller': {
          name: '调查箱子',
          self: 'none',
          body: [{ kind: 'callScript', script: 'shared/user/open-chest' }],
        },
        'shared/user/open-chest': { name: '普通宝箱开盖', self: 'none', body: [] },
      },
    }
    const rowLabels = () =>
      [...host.querySelectorAll('[role="treeitem"] .cmd-label')].map((label) => label.textContent)
    await renderSession(new ScriptEditSession(callState))
    expect(rowLabels()).toEqual(['调用共享脚本：普通宝箱开盖'])

    // 会话拒绝载入悬空引用，直接从正文编辑器的展示入口核对旧引用的可读回退。
    await act(async () =>
      root.render(
        <CanonicalScriptBodyEditor
          body={[
            { kind: 'callScript', script: 'shared/user/missing' },
            { kind: 'callScript', script: 'constructor' },
          ]}
          context={{ ...context, state: callState }}
          onChange={() => {}}
        />,
      ),
    )
    expect(rowLabels()).toEqual([
      '调用共享脚本：shared/user/missing（未找到）',
      '调用共享脚本：constructor（未找到）',
    ])
  })

  test.each([
    { title: '实体转向', command: { kind: 'setEntityFacing', target: 'self', facing: 'up' } },
    { title: '设置实体画面帧', command: { kind: 'setEntityFrame', target: 'self', frame: 3 } },
  ] as const)('$title可在调用实体和选定的场景对象间切换，完成后才写入正文', async ({ command }) => {
    const id = 'shared/user/chest-pose'
    const session = new ScriptEditSession({
      items: [],
      scenes: [
        {
          id: 'courtyard',
          mapId: 'courtyard-map',
          entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
          entities: [
            { id: 'guard', label: '门卫', sprite: 'guard', pos: { col: 1, row: 0, height: 0 } },
          ],
        },
        {
          id: 'storeroom',
          mapId: 'storeroom-map',
          entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
          entities: [
            { id: 'entrance', zone: true, pos: { col: 0, row: 2, height: 0 } },
            { id: 'shelf', label: '货架', sprite: 'shelf', pos: { col: 1, row: 1, height: 0 } },
            { id: 'chest', label: '木箱', sprite: 'chest', pos: { col: 2, row: 1, height: 0 } },
          ],
        },
      ],
      sharedScripts: {
        [id]: {
          name: '调整箱子姿态',
          self: 'required',
          body: [command],
        },
      },
    })
    await renderSession(session, {
      version: 1,
      scenes: [
        { id: 'courtyard', name: '庭院', path: 'content/scenes/courtyard.json' },
        { id: 'storeroom', name: '储物间', path: 'content/scenes/storeroom.json' },
      ],
    })

    const edit = () =>
      act(async () => host.querySelector<HTMLButtonElement>('button[aria-label="编辑"]')!.click())
    await edit()
    const dialog = host.querySelector<HTMLElement>('dialog[open]')!
    const targets = await openOptions(dialog, '目标实体')
    expect(optionWithText(targets, '调用实体').getAttribute('aria-selected')).toBe('true')
    await act(async () => optionWithText(targets, '指定实体').click())
    expect(dialog.querySelector('button[aria-label="实体"]')?.textContent).toContain('门卫 · guard')
    const scenes = await openOptions(dialog, '场景')
    expect(optionWithText(scenes, '庭院 · courtyard').getAttribute('aria-selected')).toBe('true')
    await act(async () => optionWithText(scenes, '储物间 · storeroom').click())
    const entities = await openOptions(dialog, '实体')
    const offeredEntities = [...entities.querySelectorAll('[role="option"]')].map(
      (option) => option.textContent,
    )
    expect(offeredEntities.includes('storeroom / entrance')).toBe(command.kind === 'setEntityFrame')
    await act(async () => optionWithText(entities, 'storeroom / 木箱 · chest').click())
    expect(session.getHistoryVersion()).toBe(0)

    await act(async () => buttonWithText(dialog, '完成').click())
    expect(session.getState().sharedScripts[id]?.body).toEqual([
      { ...command, target: { scene: 'storeroom', entity: 'chest' } },
    ])
    expect(session.getHistoryVersion()).toBe(1)

    await edit()
    const reopened = host.querySelector<HTMLElement>('dialog[open]')!
    const savedTargets = await openOptions(reopened, '目标实体')
    expect(optionWithText(savedTargets, '指定实体').getAttribute('aria-selected')).toBe('true')
    await act(async () => optionWithText(savedTargets, '调用实体').click())
    await act(async () => buttonWithText(reopened, '完成').click())
    expect(session.getState().sharedScripts[id]?.body).toEqual([command])
    expect(session.getHistoryVersion()).toBe(2)
  })

  test('空工程的必需调用实体脚本可添加两条姿态指令并保护 self 契约', async () => {
    const id = 'shared/user/chest-pose'
    const session = new ScriptEditSession({
      scenes: [],
      items: [],
      sharedScripts: { [id]: { name: '准备开箱姿态', self: 'required', body: [] } },
    })
    const onError = vi.fn()
    await renderSession(session, undefined, onError)

    for (const kind of ['setEntityFacing', 'setEntityFrame']) {
      await act(async () => buttonWithText(host, '添加指令').click())
      const picker = host.querySelector<HTMLElement>('dialog[open][aria-label="添加指令"]')!
      await act(async () =>
        picker.querySelector<HTMLButtonElement>(`button[data-command-kinds="${kind}"]`)!.click(),
      )
    }
    const body = [
      { kind: 'setEntityFacing', target: 'self', facing: 'down' },
      { kind: 'setEntityFrame', target: 'self', frame: 0 },
    ]
    expect(session.getState().sharedScripts[id]?.body).toEqual(body)

    await act(async () =>
      host
        .querySelector<HTMLButtonElement>('[data-command-path="1"] button[aria-label="编辑"]')!
        .click(),
    )
    const dialog = host.querySelector<HTMLElement>('dialog[open]')!
    const targets = await openOptions(dialog, '目标实体')
    const specific = optionWithText(targets, '指定实体')
    expect(specific.getAttribute('aria-disabled')).toBe('true')
    await act(async () => specific.click())
    expect(optionWithText(targets, '调用实体').getAttribute('aria-selected')).toBe('true')
    await act(async () => buttonWithText(dialog, '完成').click())

    const contract = await openOptions(host, 'self 契约')
    await act(async () => optionWithText(contract, '可选').click())
    expect(onError).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining('调用实体仅用于必须提供 self 的共享脚本'),
    )
    expect(session.getState().sharedScripts[id]).toEqual({
      name: '准备开箱姿态',
      self: 'required',
      body,
    })
    expect(session.getHistoryVersion()).toBe(2)
  })
})
