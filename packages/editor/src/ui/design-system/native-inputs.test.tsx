// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import * as controls from './controls.js'
import * as root from './index.js'
import { DsColorInput, DsFileInput, DsFilePicker, DsRangeInput } from './native-inputs.js'

describe('U04 native inputs', () => {
  test('keeps native file, range, and color input identity with file-picker class', () => {
    expect(controls.DsFileInput).toBe(DsFileInput)
    expect(controls.DsFilePicker).toBe(DsFilePicker)
    expect(controls.DsRangeInput).toBe(DsRangeInput)
    expect(controls.DsColorInput).toBe(DsColorInput)
    expect(root.DsFilePicker).toBe(DsFilePicker)

    const fileInputHost = document.createElement('div')
    fileInputHost.innerHTML = renderToStaticMarkup(<DsFileInput accept=".png" />)
    const fileInput = fileInputHost.querySelector('input')!
    expect(fileInput.getAttribute('accept')).toBe('.png')
    expect(fileInput.getAttribute('type')).toBe('file')
    expect(fileInput.hasAttribute('hidden')).toBe(true)
    const pickerHtml = renderToStaticMarkup(
      <DsFilePicker label="选择图片" description="PNG 或 JPG" accept="image/*" />,
    )
    const pickerHost = document.createElement('div')
    pickerHost.innerHTML = pickerHtml
    expect(pickerHost.querySelector('label')?.className).toBe('ds-file-picker')
    expect(pickerHost.querySelector('.ds-file-picker__label')?.textContent).toBe('选择图片')
    expect(pickerHost.querySelector('input')?.getAttribute('accept')).toBe('image/*')

    const rangeHost = document.createElement('div')
    rangeHost.innerHTML = renderToStaticMarkup(
      <DsRangeInput min={0} max={100} defaultValue={50} />,
    )
    const rangeInput = rangeHost.querySelector('input')!
    expect(rangeInput.className).toBe('ds-range-input')
    expect(rangeInput.getAttribute('type')).toBe('range')
    expect(rangeInput.getAttribute('value')).toBe('50')

    const colorHost = document.createElement('div')
    colorHost.innerHTML = renderToStaticMarkup(<DsColorInput defaultValue="#336699" />)
    const colorInput = colorHost.querySelector('input')!
    expect(colorInput.className).toBe('ds-color-input')
    expect(colorInput.getAttribute('type')).toBe('color')
    expect(colorInput.getAttribute('value')).toBe('#336699')
  })
})
