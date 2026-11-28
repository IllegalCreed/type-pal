// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, test } from 'vitest'
import { DsColorInput, DsFileInput, DsFilePicker, DsRangeInput } from './index.js'

test('hidden upload triggers and visible pickers preserve the browser file-control contract', () => {
  const host = document.createElement('div')
  host.innerHTML = renderToStaticMarkup(
    <>
      <DsFileInput accept=".png" id="hidden-sprite-file" />
      <DsFilePicker label="选择图片" description="PNG 或 JPG" accept="image/*" />
      <DsFilePicker label="读取尚未结束" disabled accept="image/*" />
    </>,
  )
  const hidden = host.querySelector<HTMLInputElement>('#hidden-sprite-file')!
  expect(hidden.type).toBe('file')
  expect(hidden.accept).toBe('.png')
  expect(hidden.hidden).toBe(true)
  const label = host.querySelector('label')!
  const visible = label.querySelector('input')!
  expect(label.className).toBe('ds-file-picker')
  expect(label.textContent).toBe('选择图片PNG 或 JPG')
  expect(label.control).toBe(visible)
  expect(visible.type).toBe('file')
  expect(visible.accept).toBe('image/*')
  expect(visible.hidden).toBe(false)
  const busyPicker = host.querySelector<HTMLLabelElement>('label.is-disabled')!
  expect(busyPicker.textContent).toBe('读取尚未结束')
  expect(busyPicker.querySelector('input')?.disabled).toBe(true)
})

test('range and color widgets pass valid defaults to their respective native controls', () => {
  const host = document.createElement('div')
  host.innerHTML = renderToStaticMarkup(
    <>
      <DsRangeInput min={0} max={100} defaultValue={50} />
      <DsColorInput defaultValue="#336699" />
    </>,
  )
  const range = host.querySelector<HTMLInputElement>('input.ds-range-input')!
  expect(range.type).toBe('range')
  expect([range.min, range.max, range.valueAsNumber]).toEqual(['0', '100', 50])
  const color = host.querySelector<HTMLInputElement>('input.ds-color-input')!
  expect(color.type).toBe('color')
  expect(color.value).toBe('#336699')
})
