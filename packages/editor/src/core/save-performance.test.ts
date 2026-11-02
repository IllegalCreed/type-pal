// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

beforeEach(() => vi.resetModules())
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  window.history.replaceState(null, '', '/')
})

test.each([
  ['test', '?profile-save'],
  ['save-performance', ''],
])('save measurements stay silent without both opt-ins: mode=%s query=%s', async (mode, query) => {
  vi.stubEnv('MODE', mode)
  window.history.replaceState(null, '', `/${query}`)
  const output = vi.spyOn(console, 'info').mockImplementation(() => {})
  const clock = vi.spyOn(performance, 'now')
  const { beginSaveMeasurement } = await import('./save-performance.js')

  beginSaveMeasurement('saveProjectAs')()
  expect(clock).not.toHaveBeenCalled()
  expect(output).not.toHaveBeenCalled()
})

test('opted-in save measurements report elapsed spans and reset at the next save', async () => {
  vi.stubEnv('MODE', 'save-performance')
  window.history.replaceState(null, '', '/?profile-save')
  const output = vi.spyOn(console, 'info').mockImplementation(() => {})
  let time = 100
  vi.spyOn(performance, 'now').mockImplementation(() => time)
  const { beginSaveMeasurement } = await import('./save-performance.js')

  const finishSave = beginSaveMeasurement('saveProjectAs')
  const first = beginSaveMeasurement('fileSignature')
  time = 102.25
  first()
  const second = beginSaveMeasurement('fileSignature')
  time = 106
  second()
  expect(output).not.toHaveBeenCalled()
  time = 110
  finishSave()
  expect(output.mock.calls).toEqual([
    [
      '[save-performance]',
      JSON.stringify({
        name: 'saveProjectAs',
        wallMilliseconds: 10,
        spans: { fileSignature: [2, 6, 3.8], saveProjectAs: [1, 10, 10] },
      }),
    ],
  ])

  time = 200
  const finishNext = beginSaveMeasurement('saveProjectAs')
  time = 204
  finishNext()
  expect(output.mock.calls[1]).toEqual([
    '[save-performance]',
    JSON.stringify({
      name: 'saveProjectAs',
      wallMilliseconds: 4,
      spans: { saveProjectAs: [1, 4, 4] },
    }),
  ])
  expect(output).toHaveBeenCalledTimes(2)
})

test('transaction measurements publish one aggregate per thousand completed transactions', async () => {
  vi.stubEnv('MODE', 'save-performance')
  window.history.replaceState(null, '', '/?profile-save')
  const output = vi.spyOn(console, 'info').mockImplementation(() => {})
  let time = 100
  vi.spyOn(performance, 'now').mockImplementation(() => time)
  const { beginSaveMeasurement } = await import('./save-performance.js')

  for (let i = 0; i < 999; i++) {
    const finish = beginSaveMeasurement('transaction')
    time++
    finish()
  }
  expect(output).not.toHaveBeenCalled()
  const thousandth = beginSaveMeasurement('transaction')
  time++
  thousandth()
  expect(output.mock.calls).toEqual([
    [
      '[save-performance]',
      JSON.stringify({
        name: 'transaction',
        wallMilliseconds: 1000,
        spans: { transaction: [1000, 1000, 1] },
      }),
    ],
  ])
  const next = beginSaveMeasurement('transaction')
  time++
  next()
  expect(output).toHaveBeenCalledTimes(1)
})
