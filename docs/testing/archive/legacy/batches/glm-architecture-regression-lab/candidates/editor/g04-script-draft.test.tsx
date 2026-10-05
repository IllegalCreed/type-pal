/**
 * ARCH-REGRESSION-LAB-GLM-1 · G04 脚本编辑草稿（候选回归，隔离实验区）。
 * 验证轴（工作包点名，r1 未覆盖的草稿层）——全部先证明弹层 entered 再断言结果：
 * - G04-01 外部 body 替换（外部 undo/redo 模拟）：编辑器行随新 body，旧行不残留；
 * - G04-02 编辑草稿确认：真实进入对话框（dblclick + 既有值 input 见证 entered）→ 翻转值 →
 *   确认恰一笔、值正确、弹层收口；
 * - G04-03 编辑草稿 Esc 取消：弹层关闭、onChange 零调用、body 深等；
 * - G04-04 弹层打开时外部替换 body：旧草稿被丢弃（弹层收口、零写回），
 *   重开的新草稿确认后写回新 body 对象（ScriptEditor.tsx:3183 草稿同步合同）。
 * 去重：ScriptEditor.test 24 条（重排/默认 hook/渲染语言）、characterization 13、hooks-session 3。
 */
// @vitest-environment jsdom
import { CanonicalScriptBodyEditor } from '@lab/editor/script-editor-body'
import type { AuthorCommand } from '@type-pal/content'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const BODY_A: AuthorCommand[] = [{ kind: 'setFlag', flag: 'opened', value: true }]
const BODY_B: AuthorCommand[] = [
  { kind: 'setFlag', flag: 'opened', value: true },
  { kind: 'playSound', asset: 'sound.test' },
]

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

function firstRow(): HTMLElement {
  const row = host.querySelector<HTMLElement>('.cmd-row')
  expect(row).not.toBeNull() // entered 见证：行真实存在
  return row!
}

async function openEditDialog(): Promise<HTMLElement> {
  await act(async () => {
    firstRow().dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }))
  })
  const dialog = host.querySelector<HTMLElement>('[role="dialog"]')
  expect(dialog?.getAttribute('aria-label') ?? '').toContain('编辑') // entered：弹层真实打开
  return dialog!
}

describe('G04 脚本编辑草稿', () => {
  test('G04-01 外部 body 替换（外部 undo/redo 模拟）：编辑器行随新 body，旧行不残留', async () => {
    const render = (body: AuthorCommand[]) => {
      act(() => {
        root.render(<CanonicalScriptBodyEditor body={body} onChange={() => {}} />)
      })
    }
    render(BODY_A)
    expect(host.querySelectorAll('.cmd-row').length).toBe(1)
    render(BODY_B)
    expect(host.querySelectorAll('.cmd-row').length).toBe(2)
    render(BODY_A)
    expect(host.querySelectorAll('.cmd-row').length).toBe(1)
  })

  test('G04-02 编辑草稿确认：entered 见证后翻转值 → 确认恰一笔、值正确、弹层收口', async () => {
    let current: AuthorCommand[] = structuredClone(BODY_A)
    const onChange = vi.fn((next: AuthorCommand[]) => {
      current = next
    })
    await act(async () =>
      root.render(<CanonicalScriptBodyEditor body={current} onChange={onChange} />),
    )
    const dialog = await openEditDialog()
    const valueInput = [...dialog.querySelectorAll<HTMLInputElement>('input[type=checkbox]')][0]
    expect(valueInput?.checked).toBe(true) // 既有值 true 真实进入草稿
    await act(async () => valueInput!.click()) // 草稿翻转
    // 确认文案为「完成」（dialog 顶层按钮，非右上角关闭）
    const confirm = [...dialog.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('完成'),
    )
    expect(confirm).not.toBeUndefined() // entered：提交按钮真实存在
    await act(async () => confirm!.click())
    expect(onChange).toHaveBeenCalledTimes(1) // 恰一笔
    expect(current[0]).toMatchObject({ kind: 'setFlag', value: false }) // 值正确
    expect(host.querySelector('[role="dialog"]')).toBeNull() // 弹层收口
  })

  test('G04-03 关闭取消：弹层关闭、onChange 零调用、body 深等', async () => {
    const current: AuthorCommand[] = structuredClone(BODY_A)
    const onChange = vi.fn()
    await act(async () =>
      root.render(<CanonicalScriptBodyEditor body={current} onChange={onChange} />),
    )
    const dialog = await openEditDialog()
    // 该弹层的取消路径是「关闭」按钮（ScriptEditor.tsx:4060；非 Esc 键）
    const allButtons = [...dialog.querySelectorAll('button')].map(
      (b) => b.textContent ?? b.getAttribute('aria-label') ?? '',
    )
    const close = dialog.querySelector<HTMLButtonElement>('[aria-label="关闭"]')
    if (!close) {
      throw new Error(`LAB DEBUG dialog buttons: ${JSON.stringify(allButtons)}`)
    }
    await act(async () => close.click())
    expect(host.querySelector('[role="dialog"]')).toBeNull() // 弹层关闭
    expect(onChange).not.toHaveBeenCalled() // 取消零命令
    expect(current).toEqual(BODY_A) // body 深等
  })

  test('G04-04 弹层打开时外部替换 body：旧草稿被丢弃（弹层收口零写回），新草稿确认写回新对象', async () => {
    const onChange = vi.fn()
    await act(async () =>
      root.render(<CanonicalScriptBodyEditor body={BODY_A} onChange={onChange} />),
    )
    const dialog = await openEditDialog() // 编辑 BODY_A[0] 的草稿已打开
    // 草稿先翻转值（草稿 ≠ body → 确认才有实际写入内容）
    const valueInput = [...dialog.querySelectorAll<HTMLInputElement>('input[type=checkbox]')][0]
    expect(valueInput?.checked).toBe(true)
    await act(async () => valueInput!.click())
    // 外部把 body 换成 BODY_B（组件收到新 props）：草稿同步 effect 丢弃旧草稿
    // （ScriptEditor.tsx:3183 editingDraft.sourceBody !== props.body → setEditingDraft(undefined)）
    await act(async () => {
      root.render(<CanonicalScriptBodyEditor body={BODY_B} onChange={onChange} />)
    })
    expect(host.querySelectorAll('.cmd-row').length).toBe(2) // 新 body 生效
    expect(host.querySelector('[role="dialog"]')).toBeNull() // 旧草稿弹层真实收口
    expect(onChange).not.toHaveBeenCalled() // 旧草稿零写回（不污染外部替换后的对象）
    // 旧草稿确实不存在：重新打开第 0 行，编辑的是新 BODY_B[0]，确认写回新对象（2 行保形）
    const reopened = await openEditDialog()
    const reopenedInput = [
      ...reopened.querySelectorAll<HTMLInputElement>('input[type=checkbox]'),
    ][0]
    expect(reopenedInput?.checked).toBe(true) // BODY_B[0] 既有值（不是旧草稿翻转后的 false）
    await act(async () => reopenedInput!.click()) // 再次翻转（草稿 → false）
    const confirm = [...reopened.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('完成'),
    )
    expect(confirm).not.toBeUndefined()
    await act(async () => confirm!.click())
    expect(onChange).toHaveBeenCalledTimes(1) // 只有新草稿这一笔
    // 写回的是新 body 对象的形（2 行），第 0 行翻转；无旧草稿混合残留
    expect(onChange.mock.calls[0]?.[0]).toEqual([
      { kind: 'setFlag', flag: 'opened', value: false },
      { kind: 'playSound', asset: 'sound.test' },
    ])
    expect(host.querySelector('[role="dialog"]')).toBeNull() // 提交后弹层收口
  })
})
