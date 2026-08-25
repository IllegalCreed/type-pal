// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { claimEditorAudioPreview, stopEditorAudioPreview } from '../core/audio-preview-session.js'

const musicMocks = vi.hoisted(() => ({
  player: {
    play: vi.fn(),
    stop: vi.fn(),
  },
}))

vi.mock('@type-pal/reforge', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@type-pal/reforge')>()),
  createBgmPlayer: () => musicMocks.player,
}))

import { MusicPicker, stopPreview } from './MusicPicker.js'

let root: Root
let host: HTMLDivElement

beforeEach(() => {
  stopEditorAudioPreview()
  musicMocks.player.play.mockClear()
  musicMocks.player.stop.mockClear()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  stopPreview()
  stopEditorAudioPreview()
  await act(async () => root.unmount())
  host.remove()
})

describe('音乐选择器的全局试听 ownership', () => {
  test('音乐试听会接管现有 owner，并在资源工作台接管时停止', async () => {
    const previousOwner = { stop: vi.fn() }
    claimEditorAudioPreview(previousOwner)
    const catalog = {
      version: 1 as const,
      assets: {
        'music.one': {
          kind: 'music' as const,
          path: 'assets/authored/one.mid',
          mediaType: 'audio/midi',
          bytes: 1,
          sha256: '1'.repeat(64),
          origin: { kind: 'authored' as const },
        },
      },
    }

    await act(async () =>
      root.render(
        <MusicPicker
          value="music.one"
          onChange={vi.fn()}
          catalog={catalog}
          resolver={{} as never}
        />,
      ),
    )
    await act(async () =>
      host.querySelector<HTMLButtonElement>('[aria-label="试听 music.one"]')!.click(),
    )

    expect(previousOwner.stop).toHaveBeenCalledOnce()
    expect(musicMocks.player.play).toHaveBeenCalledWith('music.one', true)

    const nextOwner = { stop: vi.fn() }
    claimEditorAudioPreview(nextOwner)
    expect(musicMocks.player.stop).toHaveBeenCalledOnce()
  })
})
