// @vitest-environment jsdom
/** C10-G05 multi-select + add-picker + draft：排 leaf-wave 摘要/搜索主路径。 */
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
  installDsScrollToStub,
  uninstallDsDialogStub,
  unmountDsHost,
} from '../../__tests__/cursor-asset-r1/design-system-harness.js'
import { DsAddPickerDialog } from './add-picker.js'
import { draftSource, useDsDraftController } from './draft-input-state.js'
import { DsMultiSelect } from './multi-select.js'

let mounted: DsMountedHost

const options = [
  { value: 'a', label: '甲' },
  { value: 'b', label: '乙' },
  { value: 'c', label: '丙' },
] as const

beforeEach(() => {
  installDsRafStub(vi)
  installDsDialogStub()
  installDsScrollToStub()
  mounted = createDsHost()
})

afterEach(async () => {
  await unmountDsHost(mounted)
  uninstallDsDialogStub()
  vi.unstubAllGlobals()
})

describe('C10-G05 draft-input-state', () => {
  test('C10-G05-01 draftSource 拼接 draftKey syncToken value', () => {
    expect(draftSource('name', 3, 'x')).toBe(`name\0${3}\0x`)
    expect(draftSource('name', undefined, '')).toBe('name\0\0')
  })

  function DraftHarness(props: { syncToken?: number; canonical: string }) {
    const controller = useDsDraftController({
      draftKey: 'field',
      syncToken: props.syncToken,
      value: props.canonical,
      onCommit: () => true,
    })
    return (
      <input
        aria-label="草稿"
        value={controller.value}
        onChange={(event) => controller.change(event.target.value)}
        onBlur={() => controller.blur()}
        onKeyDown={(event) => controller.keyDown(event)}
      />
    )
  }

  test('C10-G05-02 syncToken 变更重置草稿到 canonical', async () => {
    await act(async () => mounted.root.render(<DraftHarness syncToken={1} canonical="旧" />))
    const input = mounted.host.querySelector<HTMLInputElement>('input')!
    await dsSetInputValue(input, '草稿')
    await act(async () => mounted.root.render(<DraftHarness syncToken={2} canonical="新" />))
    expect(mounted.host.querySelector<HTMLInputElement>('input')!.value).toBe('新')
  })

  test('C10-G05-03 onCommit 返回 false 时 blur 回滚 canonical', async () => {
    function RejectHarness() {
      const controller = useDsDraftController({
        draftKey: 'x',
        value: 'ok',
        onCommit: () => false,
      })
      return (
        <input
          value={controller.value}
          onChange={(e) => controller.change(e.target.value)}
          onBlur={() => controller.blur()}
        />
      )
    }
    await act(async () => mounted.root.render(<RejectHarness />))
    const input = mounted.host.querySelector<HTMLInputElement>('input')!
    await dsSetInputValue(input, 'bad')
    await act(async () => input.blur())
    expect(input.value).toBe('ok')
  })
})

describe('C10-G05 DsMultiSelect', () => {
  test('C10-G05-04 disabled 时 trigger disabled 且无法展开', async () => {
    await act(async () =>
      mounted.root.render(
        <DsMultiSelect
          label="标签"
          options={options}
          value={[]}
          disabled
          onChange={() => undefined}
        />,
      ),
    )
    const trigger = mounted.host.querySelector('button')!
    expect(trigger.disabled).toBe(true)
    await dsClick(trigger)
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })

  test('C10-G05-05 打开后 Escape 关闭并回到 trigger', async () => {
    await act(async () =>
      mounted.root.render(
        <DsMultiSelect label="标签" options={options} value={[]} onChange={() => undefined} />,
      ),
    )
    const trigger = mounted.host.querySelector('button')!
    await dsClick(trigger)
    await dsKey(document.querySelector('[role="dialog"]')!, 'Escape')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })

  test('C10-G05-06 勾选一项 onChange 收到新数组', async () => {
    const onChange = vi.fn()
    await act(async () =>
      mounted.root.render(
        <DsMultiSelect label="标签" options={options} value={[]} onChange={onChange} />,
      ),
    )
    await dsClick(mounted.host.querySelector('button')!)
    const checkbox = document.querySelector<HTMLInputElement>('.ds-check-control')!
    await dsClick(checkbox)
    expect(onChange).toHaveBeenCalledWith(['a'])
  })
})

describe('C10-G05 DsAddPickerDialog', () => {
  const pickerOptions = [
    { id: 'one', label: '候选一', searchText: 'alpha' },
    { id: 'two', label: '候选二', disabledReason: '占用' },
  ]

  const pickerBase = {
    adoptionId: 'c10/add-picker',
    triggerLabel: '添加',
    title: '选择候选',
    confirmLabel: '确认添加',
    scopeKey: 'scope',
    revision: 0,
    options: pickerOptions,
    onConfirm: () => undefined,
  }

  test('C10-G05-07 readOnly 时触发器 disabled', async () => {
    await act(async () => mounted.root.render(<DsAddPickerDialog {...pickerBase} readOnly />))
    expect(mounted.host.querySelector('button')!.disabled).toBe(true)
  })

  test('C10-G05-08 搜索过滤缩小候选列表', async () => {
    await act(async () => mounted.root.render(<DsAddPickerDialog {...pickerBase} />))
    await dsClick(mounted.host.querySelector('button')!)
    const search = document.querySelector<HTMLInputElement>('input[type="search"], input.ds-input')!
    await dsSetInputValue(search, 'alpha')
    expect(document.body.textContent).toContain('候选一')
    expect(document.body.textContent).not.toContain('候选二')
  })

  test('C10-G05-09 disabledReason 行不可确认', async () => {
    await act(async () => mounted.root.render(<DsAddPickerDialog {...pickerBase} />))
    await dsClick(mounted.host.querySelector('button')!)
    const row = [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('候选二'),
    )
    if (row) await dsClick(row)
    const confirm = [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('确认添加'),
    )
    expect(confirm?.disabled ?? true).toBe(true)
  })

  test('C10-G05-10 scopeKey 变更关闭已开对话框', async () => {
    function Harness() {
      const [scope, setScope] = useState('a')
      return (
        <>
          <button type="button" onClick={() => setScope('b')}>
            换 scope
          </button>
          <DsAddPickerDialog {...pickerBase} scopeKey={scope} />
        </>
      )
    }
    await act(async () => mounted.root.render(<Harness />))
    await dsClick(
      [...mounted.host.querySelectorAll('button')].find((b) => b.textContent === '添加')!,
    )
    expect(document.querySelector('dialog[open], dialog[open=""]')).not.toBeNull()
    await dsClick(
      [...mounted.host.querySelectorAll('button')].find((b) => b.textContent === '换 scope')!,
    )
    await act(async () => Promise.resolve())
    const dialog = document.querySelector('dialog')
    expect(dialog?.hasAttribute('open')).toBe(false)
  })
})
