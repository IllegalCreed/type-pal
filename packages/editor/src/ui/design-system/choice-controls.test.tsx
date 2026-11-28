// @vitest-environment jsdom
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { unmountHost } from '../../__tests__/react-host-cleanup.js'
import { installReactActEnvironment } from '../../__tests__/react-io-wait.js'
import { DsCheckbox, DsRadioGroup, DsSwitch } from './index.js'

let host: HTMLDivElement
let root: Root
let restoreActEnvironment: () => void

beforeEach(() => {
  restoreActEnvironment = installReactActEnvironment()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await unmountHost({ host, root, restoreResourceObservers: restoreActEnvironment })
})

test('a partial selection updates both the native mixed state and accessible announcement', async () => {
  await act(async () =>
    root.render(<DsCheckbox label="应用到全部用途" checked readOnly indeterminate />),
  )
  const label = host.querySelector('label')!
  const input = host.querySelector('input')!
  expect(label.control).toBe(input)
  expect(input.indeterminate).toBe(true)
  expect(input.getAttribute('aria-checked')).toBe('mixed')
  await act(async () => root.render(<DsCheckbox label="应用到全部用途" checked readOnly />))
  expect(input.indeterminate).toBe(false)
  expect(input.getAttribute('aria-checked')).toBe('true')
})

test('group selection cannot move to a disabled layout choice and reports the selected value', async () => {
  function LayoutChoices() {
    const [value, setValue] = useState('static')
    return (
      <>
        <DsRadioGroup
          name="sprite-layout"
          label="初始布局"
          options={[
            { value: 'static', label: '定格' },
            { value: 'directional', label: '四向行走' },
            { value: 'automatic', label: '自动循环', disabled: true },
          ]}
          value={value}
          onChange={setValue}
        />
        <output>{value}</output>
      </>
    )
  }
  await act(async () => root.render(<LayoutChoices />))
  const disabled = host.querySelector<HTMLInputElement>('input[value="automatic"]')!
  const directional = host.querySelector<HTMLInputElement>('input[value="directional"]')!
  expect(disabled.disabled).toBe(true)
  await act(async () => disabled.click())
  expect(host.querySelector('output')?.textContent).toBe('static')
  await act(async () => directional.click())
  expect(host.querySelector('output')?.textContent).toBe('directional')
  expect(directional.checked).toBe(true)
})
