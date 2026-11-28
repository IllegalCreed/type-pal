// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { installBrowserHardwarePorts } from '../__tests__/canvas-test-ports.js'
import { pixelAt } from '../__tests__/cursor-asset-r1/canvas-pixels.js'
import { createFireEffectFixture } from '../__tests__/fire-effect-fixture.js'
import { installReactActEnvironment, waitForReact } from '../__tests__/react-io-wait.js'
import { deferred } from '../__tests__/test-promises.js'
import { FireEffectPreview } from './FireEffectPreview.js'

type Fixture = Awaited<ReturnType<typeof createFireEffectFixture>>
let host: HTMLDivElement
let root: Root
let restoreAct: () => void

beforeEach(() => {
  installBrowserHardwarePorts()
  restoreAct = installReactActEnvironment()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  try {
    await act(async () => root.unmount())
  } finally {
    host.remove()
    restoreAct()
    vi.unstubAllGlobals()
  }
})

async function render(fixture: Fixture, effectSprite = fixture.chunk): Promise<void> {
  await act(async () =>
    root.render(
      <FireEffectPreview
        assetBase={fixture.base}
        assetReader={fixture.reader}
        anim={{ effectSprite }}
      />,
    ),
  )
}

test('an unresolved frame read shows loading until the selected FIRE canvas can paint', async () => {
  const entered = deferred<void>()
  const release = deferred<void>()
  const fixture = await createFireEffectFixture({
    projectId: 'fire-resource-pending',
    chunk: 19,
    frames: [{ paletteIndex: 3 }],
    async beforeRead(path) {
      if (!path.endsWith('.rle')) return
      entered.resolve()
      await release.promise
    },
  })
  await render(fixture)
  try {
    await entered.promise
    expect(host.querySelector('[role="status"]')?.textContent).toContain('正在加载 FIRE #19')
    expect(host.querySelector('canvas')).toBeNull()
  } finally {
    await act(async () => release.resolve())
  }
  await waitForReact(() => {
    const canvas = host.querySelector('canvas')
    if (!canvas) throw new Error('Selected FIRE canvas has not loaded')
    expect(pixelAt(canvas, 100, 85)).toEqual([230, 200, 40, 255])
  })
})

test('selecting an unregistered FIRE number clears the previous canvas and names the missing asset', async () => {
  const fixture = await createFireEffectFixture({
    projectId: 'fire-resource-missing',
    chunk: 20,
    frames: [{ paletteIndex: 0 }],
  })
  await render(fixture)
  await waitForReact(() => expect(host.querySelector('canvas')).not.toBeNull())

  await render(fixture, 21)

  await waitForReact(() =>
    expect(host.querySelector('[role="status"]')?.textContent).toContain('无法加载 FIRE #21'),
  )
  expect(host.querySelector('canvas')).toBeNull()
  expect(host.querySelector('.fp-controls')).toBeNull()
})
