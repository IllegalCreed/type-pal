// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, test } from 'vitest'
import {
  DsDraftNumberInput,
  DsDraftTextArea,
  DsDraftTextInput,
  DsNumberInput,
  DsTextArea,
  DsTextInput,
} from './controls.js'
import { DsCatalogRow } from './recipes.js'

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

const controls = [
  ['DsTextInput', () => <DsTextInput defaultValue="text" />],
  ['DsNumberInput', () => <DsNumberInput defaultValue={1} />],
  ['DsTextArea', () => <DsTextArea defaultValue="text" />],
  [
    'DsDraftTextInput',
    () => <DsDraftTextInput draftKey="text" value="text" onCommit={() => false} />,
  ],
  [
    'DsDraftNumberInput',
    () => <DsDraftNumberInput draftKey="number" value={1} onCommit={() => false} />,
  ],
  [
    'DsDraftTextArea',
    () => <DsDraftTextArea draftKey="area" value="text" onCommit={() => false} />,
  ],
] as const

test.each(
  controls,
)('%s keeps a wrapping label associated with the actual native control', async (_name, control) => {
  await act(async () =>
    root.render(
      // biome-ignore lint/a11y/noLabelWithoutControl: This parametrized regression proves label.control for the inserted native-control component.
      <label>作者字段{control()}</label>,
    ),
  )
  const input = host.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea')!
  const label = host.querySelector('label')!
  expect(input).not.toBeNull()
  expect(label.control).toBe(input)
  expect([...input.labels!]).toEqual([label])
})

test('catalog selection metadata follows option versus toggle-button semantics across rerenders', async () => {
  await act(async () => root.render(<DsCatalogRow title="对象" selected />))
  const row = host.querySelector('button')!
  expect(row.getAttribute('aria-pressed')).toBe('true')
  expect(row.hasAttribute('aria-selected')).toBe(false)
  await act(async () => root.render(<DsCatalogRow title="对象" role="option" selected />))
  expect(row.getAttribute('aria-selected')).toBe('true')
  expect(row.hasAttribute('aria-pressed')).toBe(false)
  await act(async () => root.render(<DsCatalogRow title="对象" selected={false} />))
  expect(row.getAttribute('aria-pressed')).toBe('false')
  expect(row.hasAttribute('aria-selected')).toBe(false)
})
