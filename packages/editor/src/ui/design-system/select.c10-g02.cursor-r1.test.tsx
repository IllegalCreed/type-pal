// @vitest-environment jsdom
/** C10-G02 select：Field chrome/描述/只读；排 select.glm-leaf-wave 键盘与搜索主路径。 */
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
import { type DsOption, DsSelect, DsSelectField } from './select.js'

let mounted: DsMountedHost

const baseOptions: DsOption[] = [
  { value: 'north', label: '北', description: '方向一' },
  { value: 'south', label: '南' },
  { value: 'locked', label: '锁定', disabled: true },
]

beforeEach(() => {
  installDsRafStub(vi)
  mounted = createDsHost()
})

afterEach(async () => {
  await unmountDsHost(mounted)
  vi.unstubAllGlobals()
})

describe('C10-G02 select Field 与展示合同', () => {
  test('C10-G02-01 DsSelectField 渲染 label 与 required 标记', () => {
    const html = renderToStaticMarkup(
      <DsSelectField
        id="dir"
        label="朝向"
        required
        options={baseOptions}
        value="north"
        onValueChange={() => undefined}
      />,
    )
    expect(html).toContain('朝向')
    expect(html).toContain('aria-required="true"')
  })

  test('C10-G02-02 error 传递到 invalid 与 aria-invalid', () => {
    const html = renderToStaticMarkup(
      <DsSelectField
        label="朝向"
        error="必选"
        options={baseOptions}
        value=""
        onValueChange={() => undefined}
      />,
    )
    expect(html).toContain('aria-invalid="true"')
    expect(html).toContain('必选')
  })

  test('C10-G02-03 help 与 control 共享 describedby', () => {
    const html = renderToStaticMarkup(
      <DsSelectField
        label="朝向"
        help="选择地图朝向"
        options={baseOptions}
        value="north"
        onValueChange={() => undefined}
      />,
    )
    const match = html.match(/aria-describedby="([^"]+)"/)
    expect(match).not.toBeNull()
    expect(html).toContain(match![1]!)
    expect(html).toContain('选择地图朝向')
  })

  test('C10-G02-04 选项 description 渲染在 popover 行内', async () => {
    await act(async () =>
      mounted.root.render(
        <DsSelect
          aria-label="朝向"
          options={baseOptions}
          value="north"
          onValueChange={() => undefined}
        />,
      ),
    )
    await dsClick(mounted.host.querySelector('button.ds-select')!)
    expect(document.querySelector('.ds-select-option__description')?.textContent).toBe('方向一')
  })

  test('C10-G02-05 compact 尺寸 class 挂在 trigger', async () => {
    await act(async () =>
      mounted.root.render(
        <DsSelect
          aria-label="朝向"
          size="compact"
          options={baseOptions}
          value="south"
          onValueChange={() => undefined}
        />,
      ),
    )
    expect(mounted.host.querySelector('.ds-select--compact')).not.toBeNull()
  })

  test('C10-G02-06 invalid prop 无 error 时也标记 aria-invalid', async () => {
    await act(async () =>
      mounted.root.render(
        <DsSelect
          aria-label="朝向"
          invalid
          options={baseOptions}
          value=""
          onValueChange={() => undefined}
        />,
      ),
    )
    expect(mounted.host.querySelector('[aria-invalid="true"]')).not.toBeNull()
  })

  test('C10-G02-07 Tab 离开 closed trigger 不自动展开', async () => {
    const onValueChange = vi.fn()
    await act(async () =>
      mounted.root.render(
        <DsSelect aria-label="朝向" options={baseOptions} value="" onValueChange={onValueChange} />,
      ),
    )
    const button = mounted.host.querySelector('button')!
    button.focus()
    await dsKey(button, 'Tab')
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(onValueChange).not.toHaveBeenCalled()
  })

  test('C10-G02-08 外部 value 变更时 trigger 文案同步', async () => {
    function Harness() {
      const [value, setValue] = useState('north')
      return (
        <>
          <button type="button" onClick={() => setValue('south')}>
            外部改值
          </button>
          <DsSelect
            aria-label="朝向"
            options={baseOptions}
            value={value}
            onValueChange={setValue}
          />
        </>
      )
    }
    await act(async () => mounted.root.render(<Harness />))
    expect(mounted.host.textContent).toContain('北')
    const external = [...mounted.host.querySelectorAll('button')].find(
      (b) => b.textContent === '外部改值',
    )!
    await dsClick(external)
    expect(mounted.host.querySelector('.ds-select')?.textContent).toContain('南')
  })

  test('C10-G02-09 layout=inline 时 field 带 inline class', () => {
    const html = renderToStaticMarkup(
      <DsSelectField
        label="朝向"
        layout="inline"
        options={baseOptions}
        value="north"
        onValueChange={() => undefined}
      />,
    )
    expect(html).toContain('ds-field--inline')
  })

  test('C10-G02-10 空 options 仍渲染 placeholder 触发器', async () => {
    await act(async () =>
      mounted.root.render(
        <DsSelect
          aria-label="空"
          placeholder="尚无选项"
          options={[]}
          value=""
          onValueChange={() => undefined}
        />,
      ),
    )
    expect(mounted.host.textContent).toContain('尚无选项')
    expect(mounted.host.querySelector('button')?.disabled).not.toBe(true)
  })
})
