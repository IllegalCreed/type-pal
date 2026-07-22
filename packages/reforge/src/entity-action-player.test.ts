import type { SpriteActionDef } from '@type-pal/content'
import { describe, expect, it, vi } from 'vitest'
import {
  EntityActionPlayer,
  type ResolvedEntityAction,
  resolveSpriteActionBinding,
  resolveSpriteActionPosition,
} from './entity-action-player.js'

const forge: SpriteActionDef = {
  label: '打铁',
  steps: [
    { frame: 0, durationMs: 100 },
    { frame: 0, durationMs: 80 },
    {
      frame: 1,
      durationMs: 160,
      cues: [{ kind: 'sound', asset: 'sound.pal.135' }],
    },
    { frame: 2, durationMs: 120 },
  ],
  loopFrom: 1,
}

function resolved(
  action = forge,
  patch: Partial<ResolvedEntityAction['binding']> = {},
): ResolvedEntityAction {
  return {
    binding: {
      sprite: 'sprite-96',
      action: 'forge',
      loop: true,
      ...patch,
    },
    action,
  }
}

describe('resolveSpriteActionPosition', () => {
  it('保留一次启动段，并按 loopFrom 归一任意起始相位', () => {
    expect(resolveSpriteActionPosition(forge, 0, true)).toMatchObject({ stepIndex: 0, frame: 0 })
    expect(resolveSpriteActionPosition(forge, 100, true)).toMatchObject({
      stepIndex: 1,
      elapsedInStepMs: 0,
      frame: 0,
    })
    expect(resolveSpriteActionPosition(forge, 460, true)).toMatchObject({
      stepIndex: 1,
      elapsedInStepMs: 0,
      frame: 0,
    })
    expect(resolveSpriteActionPosition(forge, 540, true)).toMatchObject({
      stepIndex: 2,
      elapsedInStepMs: 0,
      frame: 1,
    })
    expect(resolveSpriteActionPosition(forge, 0, true, 200)).toMatchObject({
      stepIndex: 0,
      elapsedInStepMs: 0,
    })
    expect(resolveSpriteActionPosition(forge, 100, true, 200)).toMatchObject({
      stepIndex: 2,
      elapsedInStepMs: 120,
      frame: 1,
    })
  })

  it('单次动作忽略定义 loopFrom，越过末尾后定格末帧', () => {
    expect(resolveSpriteActionPosition(forge, 999, false)).toEqual({
      stepIndex: 3,
      elapsedInStepMs: 120,
      frame: 2,
      finished: true,
    })
  })
})

describe('resolveSpriteActionBinding', () => {
  const sprite = {
    id: 'sprite-96',
    asset: 'sprite.pal.096',
    label: '铁匠',
    layout: { kind: 'static' as const },
    poses: { forge },
  }

  it('对精灵不匹配、动作缺失和真实帧越界 fail-loud', () => {
    expect(() =>
      resolveSpriteActionBinding(sprite, {
        sprite: 'sprite-other',
        action: 'forge',
        loop: true,
      }),
    ).toThrow('动作声明却引用')
    expect(() =>
      resolveSpriteActionBinding(sprite, {
        sprite: 'sprite-96',
        action: 'missing',
        loop: true,
      }),
    ).toThrow('动作 "sprite-96/missing" 不存在')
    expect(() =>
      resolveSpriteActionBinding(sprite, { sprite: 'sprite-96', action: 'forge', loop: true }, 2),
    ).toThrow('超出实际 2 帧')
  })
})

describe('EntityActionPlayer', () => {
  it('逐边界推进非均匀步骤，相同源帧仍保留独立 cue 语义', () => {
    const cues = vi.fn()
    const player = new EntityActionPlayer(cues)
    player.replaceScene([{ entity: 'e96', ...resolved() }])

    expect(player.frame('e96')).toBe(0)
    player.advance(100)
    expect(player.frame('e96')).toBe(0)
    player.advance(80)
    expect(player.frame('e96')).toBe(1)
    expect(cues).toHaveBeenCalledTimes(1)
    expect(cues).toHaveBeenCalledWith('e96', {
      kind: 'sound',
      asset: 'sound.pal.135',
    })
  })

  it('每实体相位独立，暂停实体不追帧也不补 cue', () => {
    const cues = vi.fn()
    const player = new EntityActionPlayer(cues)
    const cycle = { ...forge, loopFrom: 0 }
    player.replaceScene([
      { entity: 'early', ...resolved(cycle) },
      { entity: 'late', ...resolved(cycle, { startAtMs: 180 }) },
    ])
    player.advance(80, (entity) => entity === 'early')

    expect(player.frame('early')).toBe(0)
    expect(player.frame('late')).toBe(1)
    expect(cues).toHaveBeenCalledTimes(1)
  })

  it('循环相位不跳过共同启动段，只在进入 loopFrom 时应用', () => {
    const player = new EntityActionPlayer()
    player.replaceScene([{ entity: 'phased', ...resolved(forge, { startAtMs: 200 }) }])

    expect(player.frame('phased')).toBe(0)
    player.advance(99)
    expect(player.frame('phased')).toBe(0)
    player.advance(1)
    expect(player.frame('phased')).toBe(1)
    player.advance(40)
    expect(player.frame('phased')).toBe(2)
  })

  it('脚本覆盖期间冻结基础轨，单次完成后用剩余 dt 恢复基础轨', async () => {
    const player = new EntityActionPlayer()
    player.replaceScene([{ entity: 'e', ...resolved() }])
    player.advance(50)
    const once = resolved(
      { label: '挥手', steps: [{ frame: 9, durationMs: 100 }] },
      { action: 'wave', loop: false },
    )
    const done = player.play('e', once)
    player.advance(120)
    await done

    expect(player.hasOverride('e')).toBe(false)
    expect(player.frame('e')).toBe(0)
    player.advance(30)
    expect(player.frame('e')).toBe(0)
    player.advance(80)
    expect(player.frame('e')).toBe(1)
  })

  it('相同活动请求幂等，不重置游标或重复首帧 cue', () => {
    const cues = vi.fn()
    const action: SpriteActionDef = {
      label: '闪烁',
      steps: [
        { frame: 3, durationMs: 100, cues: [{ kind: 'sound', asset: 'sound.once' }] },
        { frame: 4, durationMs: 100 },
      ],
    }
    const player = new EntityActionPlayer(cues)
    const request = resolved(action, { action: 'blink', loop: true })
    void player.play('e', request)
    player.advance(60)
    void player.play('e', request)
    player.advance(40)

    expect(player.frame('e')).toBe(4)
    expect(cues).toHaveBeenCalledTimes(1)
  })

  it('stop(false) 恢复冻结相位，stop(true) 重启页动作', () => {
    const player = new EntityActionPlayer()
    player.replaceScene([{ entity: 'e', ...resolved() }])
    player.advance(90)
    void player.play('e', resolved(forge, { action: 'override', startAtMs: 180 }))
    player.advance(200)
    player.stop('e', false)
    player.advance(10)
    expect(player.frame('e')).toBe(0)
    player.advance(80)
    expect(player.frame('e')).toBe(1)

    void player.play('e', resolved(forge, { action: 'override' }))
    player.stop('e', true)
    expect(player.frame('e')).toBe(0)
    player.advance(100)
    expect(player.frame('e')).toBe(0)
  })

  it('signal 中止覆盖并以 AbortError 兑现 waiter', async () => {
    const player = new EntityActionPlayer()
    const controller = new AbortController()
    const done = player.play(
      'e',
      resolved(
        { label: '单次', steps: [{ frame: 8, durationMs: 500 }] },
        { action: 'once', loop: false },
      ),
      controller.signal,
    )
    controller.abort()

    await expect(done).rejects.toMatchObject({ name: 'AbortError' })
    expect(player.hasOverride('e')).toBe(false)
  })

  it('替换、停止与清场都会兑现旧 waiter，不留下悬挂 Promise', async () => {
    const player = new EntityActionPlayer()
    const one = player.play(
      'e',
      resolved(
        { label: '一', steps: [{ frame: 1, durationMs: 500 }] },
        { action: 'one', loop: false },
      ),
    )
    void player.play(
      'e',
      resolved(
        { label: '二', steps: [{ frame: 2, durationMs: 500 }] },
        { action: 'two', loop: false },
      ),
    )
    await expect(one).resolves.toBeUndefined()

    const two = player.play(
      'e',
      resolved(
        { label: '三', steps: [{ frame: 3, durationMs: 500 }] },
        { action: 'three', loop: false },
      ),
    )
    player.clearScene()
    await expect(two).resolves.toBeUndefined()
  })
})
