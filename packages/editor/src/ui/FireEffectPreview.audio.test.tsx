// @vitest-environment jsdom

import type { SkillAnimation } from '@type-pal/content'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { installAudioContextPort } from '../__tests__/audio-ports.js'
import { installBrowserHardwarePorts } from '../__tests__/canvas-test-ports.js'
import { createFireEffectFixture } from '../__tests__/fire-effect-fixture.js'
import { installReactActEnvironment, waitForReact } from '../__tests__/react-io-wait.js'
import { deferred } from '../__tests__/test-promises.js'
import { disposeSoundPreview } from '../core/sound-picker-preview.js'
import { SkillAnimationEditor } from './SkillAnimationEditor.js'

let host: HTMLDivElement
let root: Root
let restoreAct: () => void

beforeEach(() => {
  installBrowserHardwarePorts()
  restoreAct = installReactActEnvironment()
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  try {
    await act(async () => root.unmount())
    await disposeSoundPreview()
  } finally {
    host.remove()
    restoreAct()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  }
})

type Fixture = Awaited<ReturnType<typeof createFireEffectFixture>>

async function renderAnimation(fixture: Fixture, animation: SkillAnimation): Promise<void> {
  await act(async () => {
    root.render(
      <SkillAnimationEditor
        animation={animation}
        onChange={vi.fn()}
        assetCatalog={fixture.catalog}
        assetReader={fixture.reader}
        assetBase={fixture.base}
        draftScope="preview-test"
        syncToken={0}
      />,
    )
  })
}

function playbackButton(): HTMLButtonElement {
  const button = host.querySelector<HTMLButtonElement>('.fire-preview .fp-controls button')
  if (!button) throw new Error('FIRE preview playback control is unavailable')
  return button
}

async function startPreview(fixture: Fixture): Promise<void> {
  await renderAnimation(fixture, { effectSprite: fixture.chunk, sound: fixture.soundAsset })
  await waitForReact(() => expect(host.querySelector('.fire-preview canvas')).not.toBeNull())
  await act(async () => playbackButton().click())
}

test('leaving the animation editor stops the active FIRE sound and closes its context', async () => {
  const audio = installAudioContextPort()
  const fixture = await createFireEffectFixture({
    projectId: 'fire-playback-exit',
    chunk: 61,
    frames: [{ paletteIndex: 1 }],
    soundSamples: [0.25, -0.25],
  })
  await startPreview(fixture)
  await waitForReact(() => expect(audio.contexts[0]?.sources[0]?.starts).toEqual([0]))
  const context = audio.contexts[0]
  if (!context) throw new Error('The selected FIRE sound never opened Web Audio')

  await act(async () => root.render(null))

  expect({
    state: context.state,
    stops: context.sources[0]?.stopCalls,
    closes: context.closeCalls,
  }).toEqual({ state: 'closed', stops: 1, closes: 1 })
})

test('the old sound read cannot start playback after the editor switches to a silent animation', async () => {
  const audio = installAudioContextPort()
  const entered = deferred<void>()
  const release = deferred<void>()
  const fixture = await createFireEffectFixture({
    projectId: 'fire-playback-change',
    chunk: 62,
    frames: [{ paletteIndex: 1 }],
    soundSamples: [0.25, -0.25],
    async beforeRead(path) {
      if (!path.endsWith('.wav')) return
      entered.resolve()
      await release.promise
    },
  })
  await startPreview(fixture)
  try {
    await entered.promise
    await renderAnimation(fixture, { effectSprite: fixture.chunk })
    expect(playbackButton().getAttribute('aria-label')).toBe('播放 FIRE 特效预览')
  } finally {
    await act(async () => release.resolve())
  }
  await waitForReact(() => expect(audio.contexts[0]?.decodeCalls).toBe(1))

  expect(playbackButton().getAttribute('aria-label')).toBe('播放 FIRE 特效预览')
  expect(audio.contexts[0]?.sources).toEqual([])
})

test('an unregistered sound surfaces its preparation error without starting the frame clock', async () => {
  const audio = installAudioContextPort()
  const fixture = await createFireEffectFixture({
    projectId: 'fire-missing-sound',
    chunk: 63,
    frames: [{ paletteIndex: 1 }],
  })
  await renderAnimation(fixture, { effectSprite: fixture.chunk, sound: 'sound.unregistered' })
  await waitForReact(() => expect(host.querySelector('.fire-preview canvas')).not.toBeNull())
  await act(async () => playbackButton().click())

  await waitForReact(() =>
    expect(host.querySelector('.fire-preview .cf-err')?.textContent).toContain(
      'AssetId "sound.unregistered" 不在 catalog',
    ),
  )
  expect(playbackButton().getAttribute('aria-label')).toBe('播放 FIRE 特效预览')
  expect(vi.getTimerCount()).toBe(0)
  expect(audio.contexts).toEqual([])
})
