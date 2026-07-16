import { describe, expect, test, vi } from 'vitest'
import { runOpeningMenuWithMusic } from './opening-menu.js'

describe('标题菜单音乐生命周期', () => {
  test('进入时循环播放，读档结果返回前先停止且不污染世界音乐', async () => {
    const events: string[] = []
    const world = { currentMusic: 'music.saved' }
    const bgm = {
      play: vi.fn((asset: string, loop?: boolean) => events.push(`play:${asset}:${loop}`)),
      stop: vi.fn(() => events.push('stop')),
    }

    const result = await runOpeningMenuWithMusic(bgm, 'music.menu', async () => {
      events.push('menu')
      return { kind: 'load' as const, slotId: 1 }
    })
    events.push('load')

    expect(result).toEqual({ kind: 'load', slotId: 1 })
    expect(events).toEqual(['play:music.menu:true', 'menu', 'stop', 'load'])
    expect(world.currentMusic).toBe('music.saved')
  })

  test('菜单异常退出也停止，无角色的工程保持静默', async () => {
    const bgm = { play: vi.fn(), stop: vi.fn() }
    await expect(
      runOpeningMenuWithMusic(bgm, 'music.menu', async () => {
        throw new Error('menu failed')
      }),
    ).rejects.toThrow('menu failed')
    expect(bgm.stop).toHaveBeenCalledOnce()

    bgm.play.mockClear()
    bgm.stop.mockClear()
    await expect(runOpeningMenuWithMusic(bgm, undefined, async () => 'silent')).resolves.toBe(
      'silent',
    )
    expect(bgm.play).not.toHaveBeenCalled()
    expect(bgm.stop).not.toHaveBeenCalled()
  })
})
