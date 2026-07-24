// @vitest-environment jsdom
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { NamedIdPicker, namedIdChoiceLabel } from './NamedIdPicker.js'

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

    expect(host.querySelector('input')?.value).toBe('天书（290）')
    expect([...host.querySelectorAll('option')].map((option) => option.value)).toEqual([
      '天书（290）',
      '手卷（293）',
    ])
  })

  test('可按名称或 id 选择引用', async () => {
    const onChange = vi.fn()
    await act(async () => root.render(<Harness onChange={onChange} />))
    const input = host.querySelector('input')!
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!

    await act(async () => {
      setter.call(input, namedIdChoiceLabel(CHOICES[1]!))
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(onChange).toHaveBeenLastCalledWith('293')
    expect(input.value).toBe('手卷（293）')

    await act(async () => {
      setter.call(input, '290')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(onChange).toHaveBeenLastCalledWith('290')
    expect(input.value).toBe('天书（290）')
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

    const input = host.querySelector('input')!
    expect(input.value).toBe('未知仙术（missing）')
    expect(input.classList.contains('missing')).toBe(true)
  })
})
