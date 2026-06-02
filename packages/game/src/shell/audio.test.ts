import { describe, it, expect } from 'vitest'
import { createAudioManager, sfxUrl, musicUrl, pickMusicTrack, sfxForBattleEvent } from './audio.js'

// 注:Web Audio(AudioContext / decodeAudioData)在 node/jsdom 测试环境不可用 → SFX 实际播放
//   退化为 no-op(无法单测发声,归 user 真引擎听验)。此处测**可测逻辑**:url 映射 + sync 队列
//   清空 + BGM 后端切换决策(注入 mock MusicBackend)。

describe('M6 audio url 映射(纯)', () => {
  it('sfxUrl → {base}/sounds/{id}.wav', () => {
    expect(sfxUrl('/extracted', 88)).toBe('/extracted/sounds/88.wav')
    expect(sfxUrl('/extracted', 47)).toBe('/extracted/sounds/47.wav')
  })
  it('musicUrl → {base}/music/{NNN}.mid(3 位零填充,sdlpal midi.c:67 Musics/%.3d.mid)', () => {
    expect(musicUrl('/extracted', 1)).toBe('/extracted/music/001.mid')
    expect(musicUrl('/extracted', 16)).toBe('/extracted/music/016.mid')
    expect(musicUrl('/extracted', 94)).toBe('/extracted/music/094.mid')
  })
  it('pickMusicTrack:战斗中→wNumBattleMusic,否则→wNumMusic(battle.c:728/1849)', () => {
    expect(pickMusicTrack(false, 16, 7)).toBe(16) // 场景:field 乐
    expect(pickMusicTrack(true, 16, 7)).toBe(7) // 战斗:battle 乐
    expect(pickMusicTrack(true, 16, 0)).toBe(0) // 战斗乐 0 → 停(沿用场景静音惯例)
  })
})

describe('M6 AudioManager.sync', () => {
  it('drain gs.pendingSounds → 就地清空队列(core 复用同引用)', () => {
    const am = createAudioManager('/extracted')
    const q = [88, 47, 212]
    am.sync(q, { track: 0, loop: true })
    expect(q).toEqual([]) // 全部消费 + 清空
  })

  it('BGM:track 变化 → backend.play(track, loop);track=0 → stop;同号 → 不重复', () => {
    const am = createAudioManager('/extracted')
    const calls: string[] = []
    am.setMusicBackend({
      play: (t, loop) => calls.push(`play ${t} ${loop}`),
      stop: () => calls.push('stop'),
    })
    am.sync(undefined, { track: 16, loop: true })
    am.sync(undefined, { track: 16, loop: true }) // 同号 → 不重复(幂等)
    am.sync(undefined, { track: 0, loop: true }) // 0 → 停
    expect(calls).toEqual(['play 16 true', 'stop'])
  })

  it('setMusicEnabled(false) → stop;(true) → 重播当前 track', () => {
    const am = createAudioManager('/extracted')
    const calls: string[] = []
    am.setMusicBackend({ play: (t) => calls.push(`play ${t}`), stop: () => calls.push('stop') })
    am.sync(undefined, { track: 5, loop: true }) // play 5
    am.setMusicEnabled(false) // stop
    am.setMusicEnabled(true) // play 5(当前 track 仍 5）
    expect(calls).toEqual(['play 5', 'stop', 'play 5'])
  })

  it('setMusicBackend 注入时若已有当前 track → 立即起播(补 M6a no-op 期间漏播)', () => {
    const am = createAudioManager('/extracted')
    am.sync(undefined, { track: 9, loop: true }) // 后端未注入 → 当前 track 记为 9,无播放
    const calls: string[] = []
    am.setMusicBackend({ play: (t) => calls.push(`play ${t}`), stop: () => calls.push('stop') })
    expect(calls).toEqual(['play 9']) // 注入即补播当前 track
  })
})

describe('M6 sfxForBattleEvent(战斗视觉 bus 事件 → SFX id,fight.c/battle.c AUDIO_PlaySound)', () => {
  const enemies = [{ e: { deathSound: 51, attackSound: 50 } }, { e: { deathSound: 0, attackSound: 60 } }]
  const roles = { 0: { weaponSound: 33 }, 3: { weaponSound: 0 } }
  const party = [0, 3] // partyMembers idx → roleId

  it('敌死 → enemy.deathSound(fight.c:756)', () => {
    expect(sfxForBattleEvent({ op: 'playEnemyDeath', enemyIdx: 0 }, enemies, party, roles)).toBe(51)
  })
  it('敌攻 → enemy.attackSound', () => {
    expect(sfxForBattleEvent({ op: 'playEnemyAttack', enemyIdx: 1 }, enemies, party, roles)).toBe(60)
  })
  it('我攻 → partyMembers[idx]→role.weaponSound(fight.c:2124)', () => {
    expect(sfxForBattleEvent({ op: 'playPlayerAttack', playerIdx: 0 }, enemies, party, roles)).toBe(33)
  })
  it('无音:deathSound=0 / weaponSound=0 / 非战斗事件 → 0(不播)', () => {
    expect(sfxForBattleEvent({ op: 'playEnemyDeath', enemyIdx: 1 }, enemies, party, roles)).toBe(0)
    expect(sfxForBattleEvent({ op: 'playPlayerAttack', playerIdx: 1 }, enemies, party, roles)).toBe(0) // role 3 weaponSound=0
    expect(sfxForBattleEvent({ op: 'showDamageNum' }, enemies, party, roles)).toBe(0)
  })
})
