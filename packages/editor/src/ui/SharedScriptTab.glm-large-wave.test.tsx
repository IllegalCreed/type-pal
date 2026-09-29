// @vitest-environment jsdom
/**
 * TEST-GLM-LARGE-WAVE-4 A03（SharedScriptTab 对）：目录级深链与元数据/删除合同。
 * 去重：SharedScriptTab.test 已证目录搜索、创建流、元数据字段提交、删除的 live 复核与
 * 空态。本文件只补：focusScriptId 深链选中并把 focusCommandPath/focusRevision 只传给
 * 聚焦脚本；self 契约切换落库；重复稳定 ID 创建经 onError 上抛；引用未就绪时删除关闭；
 * 引用面板「打开」逐行回调。正文编辑器仅做 props 探针替身，会话与命令全部真实。
 */
import { act, type ComponentProps } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  buildProjectReferenceSnapshot,
  createProjectReferenceIndex,
  createProjectReferenceSource,
} from '../core/project-reference.js'
import { sharedScriptReferenceEdges } from '../core/project-reference-adapters.js'
import {
  collectCanonicalScriptCommandVisits,
  collectCanonicalSharedScriptReferencesFromVisits,
  type ScriptEditorState,
  ScriptEditSession,
} from '../core/script-editor.js'
import { CanonicalSharedScriptTab } from './SharedScriptTab.js'

const bodyProps: Array<Record<string, unknown>> = []

vi.mock('./ScriptEditor.js', async (original) => {
  const actual = await original<typeof import('./ScriptEditor.js')>()
  return {
    ...actual,
    CanonicalScriptBodyEditor: (props: Record<string, unknown>) => {
      bodyProps.push(props)
      return null
    },
  }
})

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

let root: Root
let host: HTMLDivElement

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  bodyProps.length = 0
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.restoreAllMocks()
})

const scriptState: ScriptEditorState = {
  scenes: [],
  items: [],
  sharedScripts: {
    'shared/user/chest': { name: '开宝箱', self: 'none', body: [] },
    'shared/user/heal': { name: '治疗', self: 'required', body: [] },
  },
}

type TabProps = ComponentProps<typeof CanonicalSharedScriptTab>

async function renderTab(overrides: Partial<TabProps> = {}): Promise<void> {
  const state = overrides.state ?? scriptState
  const props: TabProps = {
    tabBar: <div data-testid="tab-bar" />,
    state,
    session: overrides.session ?? new ScriptEditSession(state),
    context: {
      state,
      shellScenes: [],
      locale: {},
      assetCatalog: { version: 1, assets: {} },
      battleSprites: [],
      audioResolver: {} as TabProps['context']['audioResolver'],
      assetReader: {} as TabProps['context']['assetReader'],
      references: {
        choices: () => [],
        has: () => false,
        label: (_kind, id) => id,
      },
    },
    projectId: 'test',
    projectMaps: {},
    mapIndex: { version: 1, maps: [] },
    tilesets: [],
    referenceStatus: 'current',
    getCurrentReferenceIndex: currentSharedScriptReferences,
    ...overrides,
  }
  await act(async () => root.render(<CanonicalSharedScriptTab {...props} />))
}

describe('A03 SharedScriptTab 深链与元数据', () => {
  test('focusScriptId 选中聚焦脚本，且 focusCommandPath/Revision 只传给聚焦脚本', async () => {
    await renderTab({
      focusScriptId: 'shared/user/heal',
      focusCommandPath: 'body/0',
      focusRevision: 3,
    })
    expect(document.querySelector('.ds-catalog-row[data-selected="true"]')?.textContent).toContain(
      '治疗',
    )
    const focused = bodyProps.at(-1)!
    expect(focused.focusCommandPath).toBe('body/0')
    expect(focused.focusRevision).toBe(3)

    await act(async () => {
      const row = [...document.querySelectorAll<HTMLButtonElement>('.ds-catalog-row')].find(
        (candidate) => candidate.textContent?.includes('开宝箱'),
      )!
      row.click()
    })
    // 深链 prop 在位时选择被钉回聚焦脚本：点选其它目录行后焦点仍回到聚焦脚本。
    const pinned = bodyProps.at(-1)!
    expect(document.querySelector('.ds-catalog-row[data-selected="true"]')?.textContent).toContain(
      '治疗',
    )
    expect(pinned.focusCommandPath).toBe('body/0')
    expect(pinned.focusRevision).toBe(3)
  })

  test('self 契约切换写入会话状态', async () => {
    const session = new ScriptEditSession(scriptState)
    await renderTab({ state: scriptState, session })
    const trigger = document.querySelector<HTMLButtonElement>('[aria-label="self 契约"]')!
    await act(async () => trigger.click())
    const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (candidate) => candidate.textContent === '必须提供',
    )
    await act(async () => option!.click())
    expect(session.getState().sharedScripts['shared/user/chest']?.self).toBe('required')
  })

  test('重复稳定 ID 创建经 createError 与 onError 双路上抛', async () => {
    const onError = vi.fn()
    await renderTab({ onError })
    await act(async () => {
      document.querySelector<HTMLButtonElement>('[aria-label="新建可复用脚本"]')!.click()
    })
    const dialog = document.querySelector('dialog[open]')!
    const nameInput = dialog.querySelector<HTMLInputElement>('input[name="shared-script-name"]')!
    const idInput = dialog.querySelector<HTMLInputElement>('input[name="shared-script-id"]')!
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    await act(async () => {
      setter.call(nameInput, '开宝箱复制')
      nameInput.dispatchEvent(new Event('input', { bubbles: true }))
      setter.call(idInput, 'shared/user/chest')
      idInput.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => {
      ;[...dialog.querySelectorAll<HTMLButtonElement>('button')]
        .find((button) => button.textContent === '创建脚本')!
        .click()
    })
    expect(dialog.querySelector('[role="alert"]')?.textContent).toContain('shared/user/chest')
    expect(onError).toHaveBeenCalledTimes(1)
  })

  test('引用未就绪时删除按钮关闭并给出检查中原因', async () => {
    await renderTab({ referenceStatus: 'checking', referenceIndex: undefined })
    const button = [...document.querySelectorAll<HTMLButtonElement>('button')].find(
      (candidate) => candidate.textContent === '删除脚本',
    )!
    expect(button.disabled).toBe(true)
    expect(button.title).toBe('引用仍在检查，暂不能删除')
  })

  test('引用面板逐行列出阻断引用并回调 onOpenReference', async () => {
    const onOpenReference = vi.fn()
    const index = createProjectReferenceIndex(
      buildProjectReferenceSnapshot([
        {
          target: { kind: 'shared-script', id: 'shared/user/chest' },
          source: createProjectReferenceSource({ kind: 'scene', id: 'scene-a' }, '场景 场景A'),
          relation: { kind: 'script-reference', use: 'call', explicitSelf: false },
          where: 'scenes["scene-a"].entities[0].pages[0].body[0]',
          locator: { kind: 'object', object: { kind: 'scene', id: 'scene-a' } },
          deletePolicy: 'block',
        },
      ]),
    )
    await renderTab({ referenceIndex: index, onOpenReference })
    expect(document.querySelector('.ds-reference-panel')?.getAttribute('data-state')).toBe('ready')
    expect(document.querySelector('.ds-reference-row')?.textContent).toContain('场景 场景A')
    const open = document.querySelector<HTMLButtonElement>('button.ds-reference-row')
    expect(open, 'reference row open button').not.toBeNull()
    await act(async () => open!.click())
    expect(onOpenReference).toHaveBeenCalledTimes(1)
    expect(onOpenReference.mock.calls[0]?.[0]).toMatchObject({
      target: { kind: 'shared-script', id: 'shared/user/chest' },
    })
  })
})
