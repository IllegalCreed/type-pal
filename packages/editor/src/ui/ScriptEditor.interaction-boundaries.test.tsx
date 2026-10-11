// @vitest-environment jsdom
/**
 * TEST-EDITOR-SCRIPT-INTERACTION-1 A2/A4/A5/A6/A7/A8 新合同（当前 canonical 正文编辑器交互边界）。
 *
 * 排重登记（旧测已证，本文件不重复）：
 * - ScriptEditor.test.tsx:1194-1286 每_revision 定位/旧 path fail-closed（RAF 同步执行，无过期帧交错）；
 *   :1288-1332 同值新引用重渲染不丢待执行定位帧；:479-525 嵌套重排成功 + 外部 undo/redo 清选择；
 *   :468-476 复制/删除成功路径；:785-786/:913-914 编辑弹层关闭零提交；:1227-1242 无关外部追加时选择保留。
 * - architecture-lab/script-draft.test.tsx G04-02/03/04：编辑草稿确认恰一笔 / 关闭取消 / 外部替换丢弃旧草稿零写回。
 * - ScriptEditor.cov85.test.tsx:297-361：插入菜单禁用项、空态与关闭零提交。
 * - author-command-edit.test.ts / .boundaries.test.ts：路径 helper 全量合同（A1 登记不重写）。
 */
import type { AuthorCommand } from '@type-pal/content'
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { CanonicalScriptBodyEditor } from './ScriptEditor.js'

/**
 * 专属 harness：以公开 props 挂载真实 CanonicalScriptBodyEditor。只控制外部输入（props
 * 替换、caller 拒绝抛错），不 mock 组件内核、不读私有 state；caller 接受提交时像
 * SharedScriptTab.updateBody 一样把新正文应用回 props（onChange 为 void，拒绝协议是
 * throw，见 ScriptEditor.tsx:3547-3557 的 commit try/catch）。harness 保持本文件内：
 * design-system adoption 门按非 test 的 .tsx 计数，独立 fixture 文件会使旧门 pin 101→102 漂移。
 */
interface BodyEditorHarnessProps {
  body: readonly AuthorCommand[]
  onChange: (body: AuthorCommand[]) => void
  onError?: (message: string) => void
  focusCommandPath?: string
  focusRevision?: number
}

interface BodyEditorHandle {
  readonly host: HTMLDivElement
  /** 以公开 props 替换正文（外部共享脚本切换 / undo 后的新 body 引用的真实路径）。 */
  replaceBody(next: AuthorCommand[]): Promise<void>
  /** 以公开 props 更新定位 revision（外部引用跳转的真实路径；body 引用保持不变）。 */
  rerenderFocus(patch: { focusCommandPath?: string; focusRevision?: number }): Promise<void>
  unmount(): Promise<void>
}

const mounted: Array<{ root: Root; host: HTMLDivElement }> = []

/** afterEach 统一卸载本文件挂载的全部编辑器（A10 清理纪律）。 */
async function unmountAllMountedEditors(): Promise<void> {
  for (const { root, host } of mounted.splice(0).reverse()) {
    await act(async () => root.unmount())
    host.remove()
  }
}

async function mountBodyEditor(initial: BodyEditorHarnessProps): Promise<BodyEditorHandle> {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  mounted.push({ root, host })
  let applyPatch: (patch: Partial<BodyEditorHarnessProps>) => void = () => {}
  function Harness() {
    const [state, setState] = useState<BodyEditorHarnessProps>(initial)
    applyPatch = (patch) => setState((current) => ({ ...current, ...patch }))
    return (
      <CanonicalScriptBodyEditor
        body={state.body}
        onChange={(next) => {
          state.onChange(next)
          applyPatch({ body: next })
        }}
        onError={state.onError}
        focusCommandPath={state.focusCommandPath}
        focusRevision={state.focusRevision}
      />
    )
  }
  await act(async () => root.render(<Harness />))
  return {
    host,
    replaceBody: async (next) => {
      await act(async () => applyPatch({ body: next }))
    },
    rerenderFocus: async (patch) => {
      await act(async () => applyPatch(patch))
    },
    unmount: async () => {
      const at = mounted.findIndex((entry) => entry.host === host)
      if (at >= 0) mounted.splice(at, 1)
      await act(async () => root.unmount())
      host.remove()
    },
  }
}

/** 合法的一次性拒绝 caller：第一次提交 throw（BodyEditor 拒绝协议），其后接受并返回内容。
 * submissions 记录每一次提交（含被拒的那笔，供断言被拒提交的业务内容本身合法）。 */
function rejectingFirstSubmit(
  message: string,
  onAccepted?: (body: AuthorCommand[]) => void,
): {
  onChange: (body: AuthorCommand[]) => void
  rejectionsLeft: () => number
  readonly submissions: AuthorCommand[][]
} {
  let rejectionsLeft = 1
  const submissions: AuthorCommand[][] = []
  return {
    onChange: (next) => {
      submissions.push(next)
      if (rejectionsLeft > 0) {
        rejectionsLeft -= 1
        throw new Error(message)
      }
      onAccepted?.(next)
    },
    rejectionsLeft: () => rejectionsLeft,
    submissions,
  }
}

function commandRow(host: HTMLElement, path: string): HTMLElement {
  const row = host.querySelector<HTMLElement>(`[data-command-path="${path}"]`)
  if (!row) throw new Error(`cmd-row 不存在: ${path}`)
  return row
}

function rowActionButton(host: HTMLElement, path: string, label: string): HTMLButtonElement {
  const button = commandRow(host, path).querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)
  if (!button) throw new Error(`行 ${path} 缺少按钮 ${label}`)
  return button
}

const flagCommands = (): AuthorCommand[] => [
  { kind: 'setFlag', flag: 'first', value: true },
  { kind: 'setFlag', flag: 'second', value: true },
]

describe('CanonicalScriptBodyEditor 交互边界（TEST-EDITOR-SCRIPT-INTERACTION-1）', () => {
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  })

  afterEach(async () => {
    try {
      await unmountAllMountedEditors()
    } finally {
      vi.restoreAllMocks()
      vi.unstubAllGlobals()
    }
  })

  test('A2 过期定位帧被新 revision 淘汰：旧帧不定位旧行，新帧定位新行', async () => {
    const frames: FrameRequestCallback[] = []
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.push(callback)
      return frames.length
    })
    const scrollTargets: HTMLElement[] = []
    const originalScroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView')
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      writable: true,
      value(this: HTMLElement) {
        scrollTargets.push(this)
      },
    })
    try {
      const onError = vi.fn()
      const body = flagCommands()
      const editor = await mountBodyEditor({
        body,
        onChange: () => {},
        onError,
        focusCommandPath: '0',
        focusRevision: 1,
      })
      expect(frames).toHaveLength(1)

      await editor.rerenderFocus({ focusCommandPath: '1', focusRevision: 2 })
      expect(frames).toHaveLength(2)
      const staleRow = commandRow(editor.host, '0')
      const freshRow = commandRow(editor.host, '1')
      expect(freshRow.classList.contains('sel')).toBe(true)
      expect(staleRow.classList.contains('sel')).toBe(false)

      await act(async () => frames[0]!(0))
      expect(scrollTargets, 'A2 过期帧不得定位旧行').toEqual([])
      expect(document.activeElement).not.toBe(staleRow)

      await act(async () => frames[1]!(0))
      expect(scrollTargets).toEqual([freshRow])
      expect(document.activeElement).toBe(freshRow)
      expect(onError).not.toHaveBeenCalled()
    } finally {
      rafSpy.mockRestore()
      if (originalScroll)
        Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', originalScroll)
      else delete (HTMLElement.prototype as { scrollIntoView?: unknown }).scrollIntoView
    }
  })

  test('A4 插入面板：外部正文真正变化时撤销，不向过期 path 提交', async () => {
    const onChange = vi.fn()
    const editor = await mountBodyEditor({
      body: [
        { kind: 'wait', ms: 100 },
        { kind: 'wait', ms: 200 },
      ],
      onChange,
    })
    await act(async () => rowActionButton(editor.host, '0', '在此后插入').click())
    const dialog = editor.host.querySelector('[role="dialog"]')
    expect(dialog?.getAttribute('aria-label')).toBe('添加指令')

    await editor.replaceBody([
      { kind: 'setFlag', flag: 'replaced', value: false },
      { kind: 'wait', ms: 200 },
    ])
    expect(editor.host.querySelector('[role="dialog"]'), 'A4 外部真变化必须撤销插入面板').toBeNull()
    expect(onChange).not.toHaveBeenCalled()
    expect(editor.host.querySelectorAll('.cmd-row')).toHaveLength(2)
    expect(commandRow(editor.host, '0').textContent).toContain('旗标 replaced')
  })

  test('A4 插入面板：同值新引用重渲染不误当变化，面板存活且仍向当前正文提交', async () => {
    const onChange = vi.fn()
    const body: AuthorCommand[] = [
      { kind: 'setFlag', flag: 'first', value: true },
      { kind: 'wait', ms: 100 },
    ]
    const editor = await mountBodyEditor({ body, onChange })
    await act(async () => rowActionButton(editor.host, '0', '在此后插入').click())

    await editor.replaceBody(structuredClone(body))
    expect(
      editor.host.querySelector('[role="dialog"]'),
      'A4 同值新引用不得误当外部变化',
    ).not.toBeNull()

    const waitChoice = editor.host.querySelector<HTMLButtonElement>('[data-command-kinds="wait"]')
    if (!waitChoice) throw new Error('插入菜单缺少 wait 选项')
    await act(async () => waitChoice.click())
    expect(onChange).toHaveBeenCalledExactlyOnceWith([
      { kind: 'setFlag', flag: 'first', value: true },
      { kind: 'wait', ms: 200 },
      { kind: 'wait', ms: 100 },
    ])
    expect(editor.host.querySelector('[role="dialog"]')).toBeNull()
  })

  test('A5 复制被拒：不选虚假副本、不动正文、精确报错；重试合法成功', async () => {
    const onError = vi.fn()
    const accepted: AuthorCommand[][] = []
    const rejector = rejectingFirstSubmit('正文保存被拒绝：会话已切到其它脚本', (next) => {
      accepted.push(next)
    })
    const editor = await mountBodyEditor({
      body: flagCommands(),
      onChange: rejector.onChange,
      onError,
    })
    await act(async () => commandRow(editor.host, '0').click())
    expect(commandRow(editor.host, '0').classList.contains('sel')).toBe(true)

    await act(async () => rowActionButton(editor.host, '0', '复制').click())
    expect(onError).toHaveBeenCalledExactlyOnceWith('正文保存被拒绝：会话已切到其它脚本')
    expect(accepted).toEqual([])
    expect(rejector.submissions[0]).toHaveLength(3)
    expect(editor.host.querySelectorAll('.cmd-row'), 'A5 被拒复制不得出现虚假副本行').toHaveLength(
      2,
    )
    expect(
      commandRow(editor.host, '0').classList.contains('sel'),
      'A5 被拒复制不得改选到虚假副本位',
    ).toBe(true)
    expect(commandRow(editor.host, '1').classList.contains('sel')).toBe(false)

    await act(async () => rowActionButton(editor.host, '0', '复制').click())
    expect(onError).toHaveBeenCalledOnce()
    expect(accepted).toEqual([
      [
        { kind: 'setFlag', flag: 'first', value: true },
        { kind: 'setFlag', flag: 'first', value: true },
        { kind: 'setFlag', flag: 'second', value: true },
      ],
    ])
    expect(editor.host.querySelectorAll('.cmd-row')).toHaveLength(3)
    expect(commandRow(editor.host, '1').classList.contains('sel')).toBe(true)
  })

  test('A6 删除被拒：保留选择与正文，重试成功收口', async () => {
    const onError = vi.fn()
    const accepted: AuthorCommand[][] = []
    const rejector = rejectingFirstSubmit('删除被拒绝：该脚本正被引用面板占用', (next) => {
      accepted.push(next)
    })
    const editor = await mountBodyEditor({
      body: flagCommands(),
      onChange: rejector.onChange,
      onError,
    })
    const row1 = commandRow(editor.host, '1')
    await act(async () => row1.click())
    await act(async () => rowActionButton(editor.host, '1', '删除').click())
    expect(onError).toHaveBeenCalledExactlyOnceWith('删除被拒绝：该脚本正被引用面板占用')
    expect(accepted).toEqual([])
    expect(
      commandRow(editor.host, '1').classList.contains('sel'),
      'A6 被拒删除不得清空原选择',
    ).toBe(true)
    expect(editor.host.querySelectorAll('.cmd-row'), 'A6 被拒删除不得移除正文行').toHaveLength(2)

    await act(async () => rowActionButton(editor.host, '1', '删除').click())
    expect(onError).toHaveBeenCalledOnce()
    expect(accepted).toEqual([[{ kind: 'setFlag', flag: 'first', value: true }]])
    expect(editor.host.querySelectorAll('.cmd-row')).toHaveLength(1)
    expect(editor.host.querySelector('.cmd-row.sel')).toBeNull()
    expect(editor.host.querySelector('[role="dialog"]')).toBeNull()
  })

  test('A7 嵌套重排被拒：内部 reorder key 不移动、选择不重映射、错误可观察', async () => {
    const onError = vi.fn()
    const accepted: AuthorCommand[][] = []
    const rejector = rejectingFirstSubmit('重排被拒绝：正文处于只读校验期', (next) => {
      accepted.push(next)
    })
    const editor = await mountBodyEditor({
      body: [
        {
          kind: 'branch',
          cond: { kind: 'flag', flag: 'open', is: true },
          then: [
            { kind: 'wait', ms: 100 },
            { kind: 'wait', ms: 200 },
          ],
        },
      ],
      onChange: rejector.onChange,
      onError,
    })
    const nestedCollection =
      editor.host.querySelector<HTMLElement>(
        '.canonical-command-child [data-ds-reorder-adoption="script/canonical-siblings"]',
      ) ?? undefined
    if (!nestedCollection) throw new Error('嵌套重排集合不存在')
    const keysBefore = [...nestedCollection.querySelectorAll('[data-ds-reorder-item]')].map(
      (item) => item.getAttribute('data-item-key'),
    )

    const moveDown = commandRow(editor.host, '0/then/0').querySelector<HTMLButtonElement>(
      '[aria-label^="下移"]',
    )
    if (!moveDown) throw new Error('嵌套行缺少下移按钮')
    await act(async () => commandRow(editor.host, '0/then/0').click())
    await act(async () => moveDown.click())
    expect(onError).toHaveBeenCalledExactlyOnceWith('重排被拒绝：正文处于只读校验期')
    expect(rejector.submissions).toHaveLength(1)
    expect(rejector.submissions[0]).toMatchObject([
      {
        kind: 'branch',
        then: [
          { kind: 'wait', ms: 200 },
          { kind: 'wait', ms: 100 },
        ],
      },
    ])
    expect(
      [...editor.host.querySelectorAll('[data-command-path]')].map((row) =>
        row.getAttribute('data-command-path'),
      ),
      'A7 被拒重排不得改写正文行顺序',
    ).toEqual(['0', '0/then/0', '0/then/1'])
    expect(
      commandRow(editor.host, '0/then/0').classList.contains('sel'),
      'A7 被拒重排不得把选择重映射到新位置',
    ).toBe(true)
    expect(commandRow(editor.host, '0/then/1').classList.contains('sel')).toBe(false)
    const keysAfter = [...nestedCollection.querySelectorAll('[data-ds-reorder-item]')].map((item) =>
      item.getAttribute('data-item-key'),
    )
    expect(keysAfter, 'A7 被拒重排不得移动内部 reorder key').toEqual(keysBefore)
    const liveRegion = nestedCollection.querySelector<HTMLElement>('[aria-live="polite"]')
    expect(liveRegion?.textContent).toContain('顺序未改变')
  })

  test('A8 键盘事件域：行自身 Enter/Space 选择，子按钮 Enter 冒泡不误选', async () => {
    const onChange = vi.fn()
    const editor = await mountBodyEditor({ body: flagCommands(), onChange })
    const row0 = commandRow(editor.host, '0')
    const row1 = commandRow(editor.host, '1')
    expect(editor.host.querySelector('.cmd-row.sel')).toBeNull()

    await act(async () =>
      row0.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
    )
    expect(row0.classList.contains('sel')).toBe(true)

    await act(async () =>
      row1.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true })),
    )
    expect(row1.classList.contains('sel')).toBe(true)
    expect(row0.classList.contains('sel')).toBe(false)

    const deleteInRow0 = rowActionButton(editor.host, '0', '删除')
    await act(async () =>
      deleteInRow0.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
    )
    expect(row0.classList.contains('sel'), 'A8 子按钮键盘事件冒泡不得改选所在行').toBe(false)
    expect(row1.classList.contains('sel')).toBe(true)
    expect(editor.host.querySelectorAll('.cmd-row')).toHaveLength(2)
    expect(onChange).not.toHaveBeenCalled()
  })
})
