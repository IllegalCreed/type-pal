import { afterEach, beforeEach, vi } from 'vitest'
import { createInitialGameState } from '../core/game-state.js'
import type { AudioVolumeController } from '../shell/audio-volume.js'
import { createMusicSourceController, type MusicSourceController } from '../shell/music-source.js'
import { setFpsEnabled } from './fps-overlay.js'
import { __resetSpeedrunForTest } from './speedrun/index.js'
import type { ToolsPanelDeps } from './tools-panel.js'

/** Keep the mute readback stateful so the second click exercises the opposite action. */
export function mkVol(initialMuted = false): AudioVolumeController {
  let muted = initialMuted
  return {
    getVolume: () => 0.8,
    setVolume: vi.fn(),
    isMuted: () => muted,
    setMuted: vi.fn((value: boolean) => {
      muted = value
    }),
  }
}

/**
 * The production panel lives for the page lifetime. Each test owns a shorter host:
 * remove its window listeners, timers, controllers, DOM and preferences even on failure.
 * Listener spying calls through; it does not replace panel/minimap event behavior.
 */
export function useToolsPanelTestHost(): (over?: Partial<ToolsPanelDeps>) => ToolsPanelDeps {
  const musicSources = new Set<MusicSourceController>()
  let releaseHost = (): void => {}

  beforeEach(() => {
    const savedPreferences = new Map<string, string>()
    for (const key of Object.keys(localStorage)) {
      const value = localStorage.getItem(key)
      if (value !== null) savedPreferences.set(key, value)
    }
    localStorage.clear()
    vi.useFakeTimers()
    document.body.replaceChildren()
    for (const id of ['tp-tools-style', 'tp-fps-style']) {
      document.getElementById(id)?.remove()
    }
    __resetSpeedrunForTest()
    const listeners = vi.spyOn(window, 'addEventListener')
    releaseHost = () => {
      for (const [type, listener, options] of listeners.mock.calls) {
        window.removeEventListener(type, listener, options)
      }
      listeners.mockRestore()
      for (const controller of musicSources) controller.dispose?.()
      musicSources.clear()
      setFpsEnabled(false)
      __resetSpeedrunForTest()
      vi.clearAllTimers()
      vi.useRealTimers()
      document.body.replaceChildren()
      for (const id of ['tp-tools-style', 'tp-fps-style']) {
        document.getElementById(id)?.remove()
      }
      localStorage.clear()
      for (const [key, value] of savedPreferences) localStorage.setItem(key, value)
    }
  })
  afterEach(() => releaseHost())

  return (over = {}) => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.wNumScene = 1
    const musicSource =
      over.musicSource ?? createMusicSourceController(() => ({ play() {}, stop() {} }), 'midi')
    musicSources.add(musicSource)
    return {
      getGs: () => gs,
      getResources: () => ({ playerRoles: { roles: [] }, objectPoisons: [], items: [] }),
      displayScale: {
        getPercent: () => 100,
        setPercent: vi.fn(),
        toggleFullscreen: vi.fn(),
      },
      musicSource,
      audioVolume: mkVol(),
      sfxVolume: mkVol(),
      videoVolume: mkVol(),
      saveSlot: async () => {},
      loadSlot: async () => null,
      ...over,
    }
  }
}
