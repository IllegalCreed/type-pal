import type { AudioManager } from './audio.js'
import { describe, expect, it } from 'vitest'
import { createInitialGameState } from '../core/game-state.js'
import { syncShellAudio } from './bootstrap.js'

function makeAudioSpy(): AudioManager & { calls: string[] } {
  const calls: string[] = []
  return {
    calls,
    sync(pendingSounds, music) {
      calls.push(`sync ${music.track} ${music.loop}`)
      if (pendingSounds) pendingSounds.length = 0
    },
    playSound(soundId) {
      calls.push(`sound ${soundId}`)
    },
    resume() {},
    setSfxEnabled(on) {
      calls.push(`sfx ${on}`)
    },
    setMusicEnabled(on) {
      calls.push(`music ${on}`)
    },
    setMusicBackend() {},
  }
}

describe('syncShellAudio', () => {
  it('suspendRaf/modal CG 期间仍同步 BGM/SFX,不等画面 present 恢复后才 flush', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.suspendRaf = true
    gs.wNumMusic = 16
    gs.musicLoop = true
    gs.pendingSounds = [47]
    const audio = makeAudioSpy()

    syncShellAudio(audio, gs, [], { roles: [] })

    expect(audio.calls).toEqual(['music true', 'sfx true', 'sync 16 true'])
    expect(gs.pendingSounds).toEqual([])
  })
})
