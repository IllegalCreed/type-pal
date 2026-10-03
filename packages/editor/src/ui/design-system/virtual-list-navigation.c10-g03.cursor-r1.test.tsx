// @vitest-environment jsdom
/** C10-G03 virtual-list + navigation：外部 keyboardOwner、菜单检索、toolbar；排 leaf-wave 主键盘路径。 */
import { act, useRef, useState } from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  createDsHost,
  type DsMountedHost,
  dsClick,
  dsKey,
  installDsRafStub,
  installDsScrollToStub,
  unmountDsHost,
} from '../../__tests__/cursor-asset-r1/design-system-harness.js'
import { DsToolbar, type DsToolbarCommand, handleMenuCharacterSearch } from './navigation.js'
import { DsVirtualListbox } from './virtual-list.js'

let mounted: DsMountedHost

beforeEach(() => {
  installDsRafStub(vi, false)
  installDsScrollToStub()
  mounted = createDsHost()
})

afterEach(async () => {
  await unmountDsHost(mounted)
  vi.unstubAllGlobals()
})

describe('C10-G03 navigation 纯函数', () => {
  function menuKeyEvent(
    key: string,
    modifiers: { meta?: boolean; ctrl?: boolean; alt?: boolean } = {},
  ): Parameters<typeof handleMenuCharacterSearch>[0] {
    return {
      key,
      metaKey: modifiers.meta ?? false,
      ctrlKey: modifiers.ctrl ?? false,
      altKey: modifiers.alt ?? false,
    } as Parameters<typeof handleMenuCharacterSearch>[0]
  }

  test('C10-G03-01 handleMenuCharacterSearch 匹配首字母索引', () => {
    expect(handleMenuCharacterSearch(menuKeyEvent('b'), ['Alpha', 'Beta', 'Gamma'])).toBe(1)
  })

  test('C10-G03-02 handleMenuCharacterSearch 修饰键返回 undefined', () => {
    expect(handleMenuCharacterSearch(menuKeyEvent('a', { meta: true }), ['Alpha'])).toBeUndefined()
  })

  test('C10-G03-03 handleMenuCharacterSearch 无匹配返回 undefined', () => {
    expect(handleMenuCharacterSearch(menuKeyEvent('z'), ['Alpha'])).toBeUndefined()
  })
})

describe('C10-G03 DsToolbar', () => {
  const saveCmd: DsToolbarCommand = {
    id: 'save',
    label: '保存',
    icon: 'save',
    execute: vi.fn(),
  }

  test('C10-G03-04 toolbar 按钮 aria-busy 随 busy 传递', async () => {
    await act(async () =>
      mounted.root.render(
        <DsToolbar
          label="编辑"
          groups={[[{ ...saveCmd, busy: true, execute: () => undefined }]]}
        />,
      ),
    )
    expect(mounted.host.querySelector('[aria-busy="true"]')).not.toBeNull()
  })

  test('C10-G03-05 disabled 命令不可点击', async () => {
    const execute = vi.fn()
    await act(async () =>
      mounted.root.render(
        <DsToolbar
          label="编辑"
          groups={[[{ ...saveCmd, disabled: true, disabledReason: '只读', execute }]]}
        />,
      ),
    )
    const btn = mounted.host.querySelector('button')!
    expect(btn.disabled).toBe(true)
    await dsClick(btn)
    expect(execute).not.toHaveBeenCalled()
  })

  test('C10-G03-06 showLabel 时按钮带 ds-button class', async () => {
    await act(async () =>
      mounted.root.render(
        <DsToolbar
          label="编辑"
          groups={[[{ ...saveCmd, showLabel: true, execute: () => undefined }]]}
        />,
      ),
    )
    expect(mounted.host.querySelector('.ds-button')).not.toBeNull()
  })
})

describe('C10-G03 DsVirtualListbox keyboardOwner', () => {
  function TrayHarness() {
    const ownerRef = useRef<HTMLInputElement>(null)
    const [selected, setSelected] = useState<number | null>(0)
    const items = Array.from({ length: 12 }, (_, index) => index)
    return (
      <>
        <input ref={ownerRef} aria-label="托盘宿主" defaultValue="" />
        <DsVirtualListbox
          label="候选"
          items={items}
          itemHeight={24}
          height={72}
          virtualizeAbove={8}
          keyboardOwnerRef={ownerRef}
          getKey={(item) => item}
          selectedKey={selected}
          onSelect={(item) => setSelected(item)}
          renderItem={(item, _index, control) => (
            <div
              role="option"
              tabIndex={0}
              aria-selected={control.selected}
              id={`opt-${item}`}
              data-active={control.active}
            >
              项 {item}
            </div>
          )}
        />
      </>
    )
  }

  test('C10-G03-07 keyboardOwner 聚焦时 ArrowDown 更新 activedescendant', async () => {
    await act(async () => mounted.root.render(<TrayHarness />))
    const owner = mounted.host.querySelector<HTMLInputElement>('[aria-label="托盘宿主"]')!
    owner.focus()
    await dsKey(owner, 'ArrowDown')
    expect(owner.getAttribute('aria-activedescendant')).toMatch(/option-1/)
  })

  test('C10-G03-08 keyboardOwner Enter 触发 onSelect', async () => {
    await act(async () => mounted.root.render(<TrayHarness />))
    const owner = mounted.host.querySelector<HTMLInputElement>('[aria-label="托盘宿主"]')!
    owner.focus()
    await dsKey(owner, 'ArrowDown')
    await dsKey(owner, 'Enter')
    expect(mounted.host.querySelector('[aria-selected="true"]')?.textContent).toContain('项 1')
  })

  test('C10-G03-09 12 项低于 virtualizeAbove 时可见窗口含首末索引', async () => {
    await act(async () => mounted.root.render(<TrayHarness />))
    const indices = [...mounted.host.querySelectorAll('[data-virtual-index]')].map((node) =>
      node.getAttribute('data-virtual-index'),
    )
    expect(indices).toContain('0')
    expect(indices.some((value) => Number(value) >= 10)).toBe(true)
  })

  test('C10-G03-10 listbox role 与 label 可达', async () => {
    await act(async () => mounted.root.render(<TrayHarness />))
    const listbox = mounted.host.querySelector('[role="listbox"]')
    expect(listbox?.getAttribute('aria-label')).toBe('候选')
  })
})
