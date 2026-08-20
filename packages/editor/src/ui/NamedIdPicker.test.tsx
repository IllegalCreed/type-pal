// @vitest-environment jsdom
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { NamedIdPicker } from './NamedIdPicker.js'

const CHOICES = [
  { id: '290', name: '天书' },
  { id: '293', name: '手卷' },
]

function Harness(props: { onChange: (id: string) => void }) {
  const [value, setValue] = useState('290')
  return (
    <NamedIdPicker
      value={value}
      choices={CHOICES}
      kindLabel="物品"
      inputName="test-item"
      onChange={(id) => {
        setValue(id)
        props.onChange(id)
      }}
    />
  )
}

let root: Root
let host: HTMLDivElement

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

describe('NamedIdPicker', () => {
  test('以名称与稳定 id 显示当前引用', async () => {
    await act(async () => root.render(<Harness onChange={() => undefined} />))

    const trigger = host.querySelector<HTMLButtonElement>('[role="combobox"]')!
    expect(trigger.textContent).toContain('天书')
    expect(trigger.textContent).toContain('290')
    expect(host.querySelector('datalist, input[list]')).toBeNull()

    await act(async () => trigger.click())
    expect(
      [...document.querySelectorAll<HTMLElement>('[role="option"]')].map((option) =>
        option.textContent?.trim(),
      ),
    ).toEqual(['天书290', '手卷293'])
  })

  test('可按名称或 id 选择引用', async () => {
    const onChange = vi.fn()
    await act(async () => root.render(<Harness onChange={onChange} />))
    const trigger = host.querySelector<HTMLButtonElement>('[role="combobox"]')!

    await act(async () => trigger.click())
    const searchById = document.querySelector<HTMLInputElement>('.ds-select-popover__search-input')!
    const inputSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    await act(async () => {
      inputSetter.call(searchById, '293')
      searchById.dispatchEvent(new Event('input', { bubbles: true }))
    })
    const idMatches = [...document.querySelectorAll<HTMLElement>('[role="option"]')]
    expect(idMatches).toHaveLength(1)
    const handscroll = idMatches[0]!
    expect(handscroll.textContent).toContain('手卷')
    await act(async () => handscroll.click())
    expect(onChange).toHaveBeenLastCalledWith('293')
    expect(trigger.textContent).toContain('手卷')
    expect(trigger.textContent).toContain('293')

    await act(async () => trigger.click())
    const searchByName = document.querySelector<HTMLInputElement>(
      '.ds-select-popover__search-input',
    )!
    await act(async () => {
      inputSetter.call(searchByName, '天书')
      searchByName.dispatchEvent(new Event('input', { bubbles: true }))
    })
    const nameMatches = [...document.querySelectorAll<HTMLElement>('[role="option"]')]
    expect(nameMatches).toHaveLength(1)
    const tome = nameMatches[0]!
    await act(async () => tome.click())
    expect(onChange).toHaveBeenLastCalledWith('290')
    expect(trigger.textContent).toContain('天书')
    expect(trigger.textContent).toContain('290')
  })

  test('悬空引用不会伪装成有效选项', async () => {
    await act(async () =>
      root.render(
        <NamedIdPicker
          value="missing"
          choices={CHOICES}
          kindLabel="仙术"
          inputName="test-skill"
          onChange={() => undefined}
        />,
      ),
    )

    const trigger = host.querySelector<HTMLButtonElement>('[role="combobox"]')!
    expect(trigger.textContent).toContain('未知仙术')
    expect(trigger.textContent).toContain('missing')
    expect(trigger.getAttribute('aria-invalid')).toBe('true')
  })
})
