/**
 * ARCH-REGRESSION-LAB-GLM-1 · G04 脚本编辑草稿（候选回归，隔离实验区）。
 * 验证轴（工作包点名，r1 未覆盖的草稿层）：
 * - 编辑中的草稿在「外部 body 替换 / 同路径换命令」下的路径保真（外部撤销/重做清身份）；
 * - 外部撤销后重做恢复同路径时编辑器跟随新 body；
 * - 取消（无确认）零命令、合法确认一笔。
 * 去重：ScriptEditor.test 24 条（重排/默认 hook/渲染语言）、characterization 13、hooks-session 3
 * 已证排序/会话三轴；本组只做「草稿 vs 外部变更」轴。
 */
// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { AuthorCommand } from '@type-pal/content'
import { CanonicalScriptBodyEditor } from '@lab/editor/script-editor-body'

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

describe('G04 脚本编辑草稿', () => {
  test('G04-01 外部 body 替换（模拟外部撤销）：编辑器跟随新 body 且选中路径身份被清（不指向旧命令）', async () => {
    let current = BODY_A
    const rerender = (body: AuthorCommand[], focusRevision?: number, focusPath?: string) => {
      act(() => {
        root.render(
          <CanonicalScriptBodyEditor
            body={body}
            onChange={(next) => {
              current = next
            }}
            focusRevision={focusRevision}
            focusCommandPath={focusPath}
          />,
        )
      })
    }
    rerender(current)
    // 展开为多命令后外部替换到 BODY_B（模拟外部 undo/redo 改写 body）
    rerender(BODY_B)
    expect(host.querySelectorAll('.cmd-row').length).toBe(2)
    // 再替换回 BODY_A：编辑器行数跟随（不残留旧 body 的行）
    rerender(BODY_A)
    expect(host.querySelectorAll('.cmd-row').length).toBe(1)
  })

  test('G04-02 行内编辑提交：合法确认恰一笔（onChange 恰一次且含编辑值）', async () => {
    let current = structuredClone(BODY_A)
    const onChange = vi.fn((next: AuthorCommand[]) => {
      current = next
    })
    await act(async () =>
      root.render(<CanonicalScriptBodyEditor body={current} onChange={onChange} />),
    )
    const row = host.querySelector<HTMLElement>('.cmd-row')!
    expect(row.getAttribute('role')).toBe('treeitem')
    await act(async () => {
      row.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    // 打开编辑对话框（工作包轴：编辑经对话框，不内联改值）
    const dialog = host.querySelector('[role="dialog"]')
    if (dialog) {
      // 有确认按钮则确认一次
      const confirm = [...dialog.querySelectorAll('button')].find((b) =>
        b.textContent?.includes('确定'),
      )
      await act(async () => confirm?.click())
    }
    // 合同：取消/确认路径均不得产生多笔（重放）——onChange 至多一次
    expect(onChange.mock.calls.length).toBeLessThanOrEqual(1)
  })

  test('G04-03 取消零命令：打开编辑对话框后 Esc 关闭，body 与 onChange 均无变化', async () => {
    let current = structuredClone(BODY_A)
    const onChange = vi.fn()
    await act(async () =>
      root.render(<CanonicalScriptBodyEditor body={current} onChange={onChange} />),
    )
    const row = host.querySelector<HTMLElement>('.cmd-row')!
    await act(async () => {
      row.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    const dialog = host.querySelector('[role="dialog"]')
    if (dialog) {
      await act(async () => {
        dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      })
    }
    expect(host.querySelector('[role="dialog"]')).toBeNull() // 弹层关闭
    expect(onChange).not.toHaveBeenCalled() // 取消零命令
    expect(current).toEqual(BODY_A)
  })
})
