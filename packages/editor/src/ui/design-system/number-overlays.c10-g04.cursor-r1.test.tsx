// @vitest-environment jsdom
/** C10-G04 number-inputs + overlays：步进/草稿/对话框滚动锁；排 U07 静态快照主路径。 */
import { act, useState } from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  createDsHost,
  type DsMountedHost,
  dsClick,
  dsKey,
  dsSetInputValue,
  installDsDialogStub,
  installDsRafStub,
  uninstallDsDialogStub,
  unmountDsHost,
} from '../../__tests__/cursor-asset-r1/design-system-harness.js'
import { DsDraftNumberField, DsNumberField } from './number-inputs.js'
import { DsDialog } from './overlays.js'

let mounted: DsMountedHost

beforeEach(() => {
  installDsRafStub(vi)
  installDsDialogStub()
  mounted = createDsHost()
})

afterEach(async () => {
  await unmountDsHost(mounted)
  document.body.style.overflow = ''
  uninstallDsDialogStub()
  vi.unstubAllGlobals()
})

describe('C10-G04 number inputs', () => {
  test('C10-G04-01 DsNumberField 步进增按钮提升值', async () => {
    const onChange = vi.fn()
    await act(async () =>
      mounted.root.render(
        <DsNumberField
          label="数量"
          defaultValue={2}
          min={0}
          max={10}
          step={1}
          integer
          onChange={onChange}
        />,
      ),
    )
    const inc = mounted.host.querySelector<HTMLButtonElement>('[aria-label="增加数量"]')!
    await dsClick(inc)
    expect(onChange).toHaveBeenCalled()
    expect(mounted.host.querySelector<HTMLInputElement>('input')!.value).toBe('3')
  })

  test('C10-G04-02 达 max 时 increment disabled', async () => {
    await act(async () =>
      mounted.root.render(
        <DsNumberField label="数量" defaultValue={10} min={0} max={10} step={1} />,
      ),
    )
    expect(mounted.host.querySelector<HTMLButtonElement>('[aria-label="增加数量"]')!.disabled).toBe(
      true,
    )
  })

  test('C10-G04-03 DsDraftNumberField blur 提交合法整数', async () => {
    const onCommit = vi.fn(() => true)
    await act(async () =>
      mounted.root.render(
        <DsDraftNumberField
          label="帧"
          draftKey="frame"
          value={1}
          integer
          min={0}
          onCommit={onCommit}
        />,
      ),
    )
    const input = mounted.host.querySelector<HTMLInputElement>('input')!
    await dsSetInputValue(input, '4')
    await act(async () => input.blur())
    expect(onCommit).toHaveBeenCalledWith(4)
  })

  test('C10-G04-04 validate 失败阻止 commit 并保留草稿', async () => {
    const onCommit = vi.fn()
    await act(async () =>
      mounted.root.render(
        <DsDraftNumberField
          label="帧"
          draftKey="frame"
          value={1}
          validate={(v) => (v > 3 ? '过大' : undefined)}
          onCommit={onCommit}
        />,
      ),
    )
    const input = mounted.host.querySelector<HTMLInputElement>('input')!
    await dsSetInputValue(input, '9')
    await act(async () => input.blur())
    expect(onCommit).not.toHaveBeenCalled()
    expect(input.value).toBe('9')
  })

  test('C10-G04-05 Escape 还原 canonical 数值', async () => {
    const onCancel = vi.fn()
    await act(async () =>
      mounted.root.render(
        <DsDraftNumberField
          label="帧"
          draftKey="frame"
          value={2}
          onCommit={() => true}
          onCancel={onCancel}
        />,
      ),
    )
    const input = mounted.host.querySelector<HTMLInputElement>('input')!
    await dsSetInputValue(input, '99')
    await dsKey(input, 'Escape')
    expect(onCancel).toHaveBeenCalled()
    expect(input.value).toBe('2')
  })
})

describe('C10-G04 overlays', () => {
  function DialogHarness() {
    const [open, setOpen] = useState(false)
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>
          打开
        </button>
        <DsDialog open={open} title="测试层" onClose={() => setOpen(false)}>
          <button type="button">层内按钮</button>
        </DsDialog>
      </>
    )
  }

  test('C10-G04-06 打开 overlay 时 body overflow hidden', async () => {
    await act(async () => mounted.root.render(<DialogHarness />))
    await dsClick(mounted.host.querySelector('button')!)
    expect(document.body.style.overflow).toBe('hidden')
  })

  test('C10-G04-07 关闭 overlay 恢复 body overflow', async () => {
    document.body.style.overflow = 'auto'
    await act(async () => mounted.root.render(<DialogHarness />))
    await dsClick(mounted.host.querySelector('button')!)
    const close = document.querySelector<HTMLButtonElement>('[aria-label="关闭"]')!
    await dsClick(close)
    expect(document.body.style.overflow).toBe('auto')
  })

  test('C10-G04-08 overlay 带 description 时 aria-describedby 存在', async () => {
    await act(async () =>
      mounted.root.render(
        <DsDialog open title="说明" description="副标题" onClose={() => undefined}>
          内容
        </DsDialog>,
      ),
    )
    const dialog = document.querySelector('dialog')!
    expect(dialog.getAttribute('aria-describedby')).toBeTruthy()
    expect(document.body.textContent).toContain('副标题')
  })

  test('C10-G04-09 dismissible=false 时不渲染关闭按钮', async () => {
    await act(async () =>
      mounted.root.render(
        <DsDialog open dismissible={false} title="锁定" onClose={() => undefined}>
          内容
        </DsDialog>,
      ),
    )
    expect(document.querySelector('[aria-label="关闭"]')).toBeNull()
  })

  test('C10-G04-10 aria-busy 传递到 dialog', async () => {
    await act(async () =>
      mounted.root.render(
        <DsDialog open ariaBusy title="加载" onClose={() => undefined}>
          内容
        </DsDialog>,
      ),
    )
    expect(document.querySelector('dialog')?.getAttribute('aria-busy')).toBe('true')
  })
})
