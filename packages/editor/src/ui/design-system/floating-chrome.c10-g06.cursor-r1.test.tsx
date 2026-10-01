// @vitest-environment jsdom
/** C10-G06 card/list-header/tabs/choice/help/overflow/floating 叶组件合同。 */
import { act, useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  createDsHost,
  type DsMountedHost,
  dsClick,
  dsKey,
  installDsRafStub,
  unmountDsHost,
} from '../../__tests__/cursor-asset-r1/design-system-harness.js'
import { DsCard } from './card.js'
import { DsCheckbox, DsRadioGroup, DsSwitch } from './choice-controls.js'
import { DsHelpTip } from './help-tips.js'
import { DsListHeader } from './list-header.js'
import { DsOverflowText } from './overflow-text.js'
import { DsTabs } from './tabs.js'

let mounted: DsMountedHost

beforeEach(() => {
  installDsRafStub(vi)
  mounted = createDsHost()
})

afterEach(async () => {
  await unmountDsHost(mounted)
  vi.unstubAllGlobals()
})

describe('C10-G06 静态 chrome', () => {
  test('C10-G06-01 DsCard 渲染 title 与 actions 槽', () => {
    const html = renderToStaticMarkup(
      <DsCard title="区块" actions={<button type="button">操作</button>}>
        正文
      </DsCard>,
    )
    expect(html).toContain('区块')
    expect(html).toContain('操作')
    expect(html).toContain('正文')
  })

  test('C10-G06-02 DsListHeader help 与 count 同排', () => {
    const html = renderToStaticMarkup(
      <DsListHeader title="库" count={3} unit="项" help={{ label: '说明', content: '帮助正文' }} />,
    )
    expect(html).toContain('3 项')
    expect(html).toContain('帮助正文')
  })

  test('C10-G06-03 DsCheckbox indeterminate 设 aria-checked=mixed', async () => {
    await act(async () =>
      mounted.root.render(<DsCheckbox label="半选" indeterminate onChange={() => undefined} />),
    )
    expect(mounted.host.querySelector('input')?.getAttribute('aria-checked')).toBe('mixed')
  })

  test('C10-G06-04 DsSwitch 切换 onChange', async () => {
    const onChange = vi.fn()
    await act(async () => mounted.root.render(<DsSwitch label="启用" onChange={onChange} />))
    await dsClick(mounted.host.querySelector('input')!)
    expect(onChange).toHaveBeenCalled()
  })
})

describe('C10-G06 tabs 与 overflow', () => {
  test('C10-G06-05 DsTabs End 跳到末个 enabled tab', async () => {
    const onChange = vi.fn()
    await act(async () =>
      mounted.root.render(
        <DsTabs
          label="分区"
          activeId="a"
          onChange={onChange}
          items={[
            { id: 'a', label: 'A' },
            { id: 'b', label: 'B', disabled: true },
            { id: 'c', label: 'C' },
          ]}
        />,
      ),
    )
    const tab = mounted.host.querySelector<HTMLButtonElement>('[role="tab"]')!
    tab.focus()
    await dsKey(tab, 'End')
    expect(onChange).toHaveBeenCalledWith('c')
  })

  test('C10-G06-06 DsTabs inspector variant class', async () => {
    await act(async () =>
      mounted.root.render(
        <DsTabs
          label="分区"
          variant="inspector"
          activeId="a"
          onChange={() => undefined}
          items={[{ id: 'a', label: 'A' }]}
        />,
      ),
    )
    expect(mounted.host.querySelector('.ds-tabs--inspector')).not.toBeNull()
  })

  test('C10-G06-07 DsRadioGroup 选中值随 onChange', async () => {
    function Harness() {
      const [value, setValue] = useState('x')
      return (
        <DsRadioGroup
          name="pick"
          label="选择"
          value={value}
          options={[
            { value: 'x', label: 'X' },
            { value: 'y', label: 'Y' },
          ]}
          onChange={setValue}
        />
      )
    }
    await act(async () => mounted.root.render(<Harness />))
    const y = [...mounted.host.querySelectorAll('input')].find(
      (i) => (i as HTMLInputElement).value === 'y',
    )!
    await dsClick(y)
    expect(y.checked).toBe(true)
  })

  test('C10-G06-08 DsOverflowText 未裁剪时不带 tabIndex', async () => {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 200 })
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', { configurable: true, value: 100 })
    await act(async () => mounted.root.render(<DsOverflowText>短文本</DsOverflowText>))
    expect(mounted.host.querySelector('[tabindex="0"]')).toBeNull()
  })

  test('C10-G06-09 DsHelpTip 子控件获得 aria-describedby', async () => {
    await act(async () =>
      mounted.root.render(
        <DsHelpTip label="提示">
          <button type="button">目标</button>
        </DsHelpTip>,
      ),
    )
    const btn = mounted.host.querySelector('button')!
    expect(btn.getAttribute('aria-describedby')).toBeTruthy()
  })

  test('C10-G06-10 DsListHeader overflow 菜单打开可见 menuitem', async () => {
    await act(async () =>
      mounted.root.render(
        <DsListHeader
          title="库"
          count={1}
          unit="项"
          overflowActions={[{ id: 'del', label: '删除', onClick: () => undefined }]}
        />,
      ),
    )
    await dsClick(mounted.host.querySelector<HTMLButtonElement>('[aria-label="更多操作"]')!)
    await vi.waitFor(() => {
      expect(document.querySelector('[role="menuitem"]')).not.toBeNull()
    })
  })
})
