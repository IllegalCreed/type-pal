// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest'
import { type AudioAssetReader, createBgmPlayer, createBgmPlayerWithRuntime } from './bgm.js'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function reader() {
  return {
    readBytes: vi.fn(async () => {
      throw new Error('unavailable BGM runtime must not read assets')
    }),
    readRoleBytes: vi.fn(async () => {
      throw new Error('unavailable BGM runtime must not read the soundfont')
    }),
  } satisfies AudioAssetReader
}

test('without AudioContext the public BGM player remains safe to call', async () => {
  vi.stubGlobal('AudioContext', undefined)
  vi.stubGlobal('webkitAudioContext', undefined)
  const assets = reader()
  const player = createBgmPlayer(assets)

  player.play('music.menu')
  player.setEnabled(false)
  player.play('music.battle', false, 300)
  player.setEnabled(true)
  player.resume()
  player.stop(500)
  player.stop()
  await expect(player.dispose()).resolves.toBeUndefined()
  player.play('music.menu')
  player.setEnabled(false)
  expect(assets.readBytes).not.toHaveBeenCalled()
  expect(assets.readRoleBytes).not.toHaveBeenCalled()
})

test('the player reports an initialization failure once and does not retry on track changes', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const failure = new Error('worklet unavailable')
  const initialize = vi.fn(async () => {
    throw failure
  })
  const assets = reader()
  const player = createBgmPlayerWithRuntime(assets, {
    context: { state: 'running', resume: vi.fn(async () => {}) },
    initialize,
  })

  player.play('music.menu')
  await vi.waitFor(() => {
    expect(warn.mock.calls).toEqual([['[bgm] ✗ MIDI 后端初始化失败 → BGM 静默:', failure]])
  })
  player.play('music.menu')
  player.play('music.battle')
  await Promise.resolve()
  expect(initialize).toHaveBeenCalledOnce()
  expect(assets.readBytes).not.toHaveBeenCalled()
  expect(assets.readRoleBytes).not.toHaveBeenCalled()
  await expect(player.dispose()).resolves.toBeUndefined()
})
