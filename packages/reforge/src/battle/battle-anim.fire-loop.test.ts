import { describe, expect, test } from 'vitest'
import { recordBattleAnimation } from '../__tests__/battle-workflows/animation-observer.js'
import { PLAYER_PROFILE } from '../__tests__/battle-workflows/catalog.js'
import { buildOffMagic } from './battle-anim.js'
import { AnimPlayer } from './battle-animation-player.js'

const PLAYER_FRAMES = PLAYER_PROFILE.frames

describe('法术 FIRE 时间线', () => {
  test('a wind spell displaces both occupied enemy slots per FIRE beat and restores both before the hit', () => {
    const frames = buildOffMagic({
      fireFrames: 3,
      fx: {
        placement: 'attackField',
        xOffset: 0,
        yOffset: 0,
        speed: 0,
        fireDelay: 0,
        effectTimes: 0,
        shake: 0,
        wave: 0,
      },
      blow: {
        steps: [-2, -1, -2],
        targets: [
          { idx: 0, pos: { x: 70, y: 140 } },
          { idx: 2, pos: { x: 160, y: 100 } },
        ],
      },
    })
    const { events, player } = recordBattleAnimation(frames)
    player.tick(0)
    expect(events).toEqual(['f:enemy0@68,139', 'f:enemy2@158,99'])
    player.tick(50)
    expect(events.slice(2)).toEqual(['f:enemy0@67,139', 'f:enemy2@157,99'])
    player.tick(50)
    expect(events.slice(4)).toEqual(['f:enemy0@65,138', 'f:enemy2@155,98'])
    player.tick(50)
    expect(events.slice(6)).toEqual(['f:enemy0@70,140', 'f:enemy2@160,100'])
  })

  test('OffMagic 以特效帧推进施法脚本震屏，末尾 shake 仍独立', () => {
    const frames = buildOffMagic({
      fireFrames: 3,
      fx: {
        placement: 'normal',
        xOffset: 0,
        yOffset: 0,
        speed: 0,
        fireDelay: 0,
        effectTimes: 1,
        shake: 1,
        preShake: { frames: 2, level: 3 },
        wave: 0,
      },
    })
    expect(frames).toHaveLength(7)
    expect(frames[0]).toMatchObject({
      overlays: [expect.objectContaining({ sheet: 'magic', frameIdx: 0 })],
    })
    const { player } = recordBattleAnimation(frames)
    player.tick(0)
    expect(player.frameShakeOffsetY).toBe(3)
    player.tick(40)
    expect(player.frameShakeOffsetY).toBe(3)
    player.tick(10)
    expect(player.frameShakeOffsetY).toBe(-3)
    player.tick(49)
    expect(player.frameShakeOffsetY).toBe(-3)
    player.tick(1)
    expect(player.frameShakeOffsetY).toBeUndefined()
    expect(frames.at(-1)).toMatchObject({ screenShake: true })
    expect(frames.at(-1)?.frameShakeOffsetY).toBeUndefined()
  })

  test('OffMagic 在第一张特效帧播放一次音效，施法者切姿和特效循环保持原帧序', () => {
    const frames = buildOffMagic({
      fireFrames: 3,
      fx: {
        placement: 'normal',
        xOffset: 0,
        yOffset: 0,
        speed: 0,
        fireDelay: 1,
        effectTimes: 2,
        shake: 1,
        wave: 0,
        sound: 'sound.pal.109',
      },
      casterMagic: { side: 'player', idx: 0, frame: PLAYER_FRAMES.magic },
    })
    const playedOverlays: number[] = []
    const soundEvents: Array<{ sound: string; overlayCount: number }> = []
    const animation = new AnimPlayer(frames, {
      onOverlay: (overlays) => {
        const frame = overlays?.[0]
        if (frame) playedOverlays.push(frame.frameIdx)
      },
      onSound: (sound) => soundEvents.push({ sound, overlayCount: playedOverlays.length }),
    })

    expect(animation.tick(400)).toBe(true)
    expect(playedOverlays).toEqual([0, 1, 2, 1, 2, 1, 2, 0])
    expect(frames[1]?.fighters).toEqual([{ side: 'player', idx: 0, frame: PLAYER_FRAMES.magic }])
    expect(soundEvents).toEqual([{ sound: 'sound.pal.109', overlayCount: 1 }])
  })
})
