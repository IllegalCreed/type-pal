/**
 * TEST-RUNTIME-STATE-BOUNDARIES-1 C1-C6：实体动作播放器纯状态边界（entity-action-player.ts）。
 * entity-action-player.test.ts:41-231 已覆盖位置/变长步骤/独立相位/intro/基础轨冻结/幂等/stop/
 * abort/清场——不重复；本文件补解析守卫轴、越尾 startAtMs、三条收尾终态、覆盖期换基础轨、
 * 旧 signal 迟到 abort 与边界/非法 dt 轨迹。SpriteDef 合法性由 content validateSprites 先证。
 */
import { type SpriteDef, validateSprites } from '@type-pal/content'
import { describe, expect, test, vi } from 'vitest'
import {
  EntityActionPlayer,
  resolveSpriteActionBinding,
  resolveSpriteActionPosition,
} from './entity-action-player.js'

const sprite = (): SpriteDef => ({
  id: 'sp-1',
  label: '精灵一',
  asset: 'sprite.sp-1',
  layout: { kind: 'static' },
  poses: {
    walk: {
      label: '走',
      steps: [
        { frame: 0, durationMs: 100, cues: [{ kind: 'sound', asset: 'sfx.step0' }] },
        { frame: 1, durationMs: 100 },
        { frame: 2, durationMs: 100, cues: [{ kind: 'sound', asset: 'sfx.step2' }] },
      ],
      loopFrom: 1,
    },
    once: {
      label: '单次',
      steps: [
        { frame: 5, durationMs: 50 },
        { frame: 6, durationMs: 50 },
      ],
    },
  },
})

const bind = (action: string, loop = false, startAtMs?: number) => ({
  sprite: 'sp-1',
  action,
  loop,
  ...(startAtMs !== undefined ? { startAtMs } : {}),
})

/** 主 fixture 先过现行守卫（合法 SpriteDef 自证）。 */
test('fixture 合法性：sprite 过 content validateSprites', () => {
  expect(() => validateSprites([sprite()])).not.toThrow()
})

describe('C1 resolveSpriteActionBinding 守卫轴', () => {
  test('精灵不匹配/动作缺失/空 steps/非正时长/loopFrom 越界/实际帧数门各自精确拒绝', () => {
    const s = sprite()
    expect(() =>
      resolveSpriteActionBinding(s, { sprite: 'other', action: 'walk', loop: false }),
    ).toThrow('实体精灵为 "sp-1"，动作声明却引用 "other"')
    expect(() => resolveSpriteActionBinding(s, bind('missing'))).toThrow(
      '动作 "sp-1/missing" 不存在',
    )
    const emptySteps = sprite()
    ;(emptySteps.poses!.walk as { steps: unknown[] }).steps = []
    expect(() => resolveSpriteActionBinding(emptySteps, bind('walk'))).toThrow('steps 不能为空')
    const badDuration = sprite()
    ;(badDuration.poses!.walk as { steps: { durationMs: number }[] }).steps[0]!.durationMs = 0
    expect(() => resolveSpriteActionBinding(badDuration, bind('walk'))).toThrow(
      'steps[0].durationMs 必须为正有限数',
    )
    const badLoop = sprite()
    ;(badLoop.poses!.walk as { loopFrom: number }).loopFrom = 3
    expect(() => resolveSpriteActionBinding(badLoop, bind('walk'))).toThrow('loopFrom 越界')
    // 实际帧数门：合法 sprite 声明 frame 0-6，actualFrameCount=2 时 frame 2 越界
    expect(() => resolveSpriteActionBinding(s, bind('walk'), 2)).toThrow(
      'steps[2].frame=2 超出实际 2 帧',
    )
    expect(() => resolveSpriteActionBinding(s, bind('walk'), 0)).toThrow('实际源帧数无效 (0)')
    expect(() => resolveSpriteActionBinding(s, bind('walk'), 1.5)).toThrow('实际源帧数无效 (1.5)')
    // 帧域内正控：actualFrameCount 覆盖全部声明帧即通过，且返回拷贝 binding
    const resolved = resolveSpriteActionBinding(s, bind('walk'), 3)
    expect(resolved.action).toBe(s.poses!.walk)
    expect(resolved.binding).toEqual(bind('walk'))
  })
})

describe('C2 单次动作 startAtMs 越尾', () => {
  test('play 兑现、覆盖不悬挂、历史 cue 不补发', async () => {
    const cues: Array<{ entity: string; asset: string }> = []
    const player = new EntityActionPlayer((entity, cue) => {
      if (cue.kind === 'sound') cues.push({ entity, asset: cue.asset })
    })
    // once 总长 100ms；startAtMs=150 越尾 → 立即完成
    const resolved = resolveSpriteActionBinding(sprite(), bind('once', false, 150))
    await expect(player.play('e1', resolved)).resolves.toBeUndefined()
    expect(player.hasOverride('e1')).toBe(false) // 覆盖已清
    expect(player.frame('e1')).toBeUndefined() // 无基础轨 → 实体移除
    expect(cues).toEqual([]) // 历史位置的 cue（frame5 起点）不补发
    // 非空 cue 正控：once-sound 每步带 sound，从头播放两条 cue 按序一次发出
    const withSound = sprite()
    ;(
      withSound.poses!.once as {
        steps: Array<{ frame: number; durationMs: number; cues?: unknown[] }>
      }
    ).steps = [
      { frame: 5, durationMs: 50, cues: [{ kind: 'sound', asset: 'sfx.once-a' }] },
      { frame: 6, durationMs: 50, cues: [{ kind: 'sound', asset: 'sfx.once-b' }] },
    ]
    expect(() => validateSprites([withSound])).not.toThrow() // 合法性自证
    const player2 = new EntityActionPlayer((entity, cue) => {
      if (cue.kind === 'sound') cues.push({ entity, asset: cue.asset })
    })
    const fromStart = resolveSpriteActionBinding(withSound, bind('once', false, 0))
    void player2.play('e1', fromStart)
    player2.advance(50)
    player2.advance(50)
    expect(cues.map((entry) => entry.asset)).toEqual(['sfx.once-a', 'sfx.once-b'])
    // 越尾（startAtMs 越过全部 cue 位置）也不重播任何历史 cue（与上方空断言对照的实证）
    const player3 = new EntityActionPlayer((_entity, cue) => {
      if (cue.kind === 'sound') cues.push({ entity: 'e3', asset: cue.asset })
    })
    const expired = resolveSpriteActionBinding(withSound, bind('once', false, 999))
    void player3.play('e1', expired)
    player3.advance(1000)
    expect(cues.filter((entry) => entry.entity === 'e3')).toEqual([])
  })
})

describe('C3 无基础轨覆盖的三条收尾', () => {
  const makePlayer = () => {
    const cue = vi.fn()
    const player = new EntityActionPlayer(cue)
    const resolved = resolveSpriteActionBinding(sprite(), bind('once'))
    return { player, cue, resolved }
  }
  test('自然结束：deferred 兑现一次，后续 advance 不重复 cue/兑现', async () => {
    const { player, cue, resolved } = makePlayer()
    const done = player.play('e1', resolved)
    player.advance(50)
    player.advance(50)
    await expect(done).resolves.toBeUndefined()
    const callsAfterEnd = cue.mock.calls.length
    player.advance(100) // 结束后再次推进
    expect(cue.mock.calls.length).toBe(callsAfterEnd)
    expect(player.frame('e1')).toBeUndefined()
  })
  test('stop(false)：waiter 兑现、覆盖清除；clearEntity：同样收尾', async () => {
    const a = makePlayer()
    const waiting = a.player.play('e1', a.resolved)
    a.player.stop('e1', false)
    await expect(waiting).resolves.toBeUndefined()
    expect(a.player.hasOverride('e1')).toBe(false)

    const b = makePlayer()
    const waitingB = b.player.play('e1', b.resolved)
    b.player.clearEntity('e1')
    await expect(waitingB).resolves.toBeUndefined()
    expect(b.player.frame('e1')).toBeUndefined()
  })
})

describe('C4 覆盖期间 setBase 删除/替换', () => {
  test('覆盖结束后恢复到新基础轨，不接回旧轨', () => {
    const player = new EntityActionPlayer()
    const sp = sprite()
    player.setBase('e1', resolveSpriteActionBinding(sp, bind('walk', true)))
    expect(player.frame('e1')).toBe(0) // 旧基础轨 frame 0
    // 覆盖进行中替换基础轨
    player.play('e1', resolveSpriteActionBinding(sp, bind('once')))
    player.setBase('e1', resolveSpriteActionBinding(sp, bind('walk', true, 100)))
    // 删除基础轨：覆盖仍在
    player.setBase('e1', undefined)
    expect(player.hasOverride('e1')).toBe(true)
    // 恢复新基础轨并让覆盖自然结束
    player.setBase('e1', resolveSpriteActionBinding(sp, bind('walk', true, 100)))
    player.advance(100) // once 总长 100 → 覆盖结束（余量为 0，基础轨未动）
    expect(player.hasOverride('e1')).toBe(false)
    expect(player.frame('e1')).toBe(0) // 基础轨仍在 intro 段（loopFrom=1 前的 step0）
    player.advance(100) // intro 结束 → 实例循环相位 startAtMs=100 生效
    expect(player.frame('e1')).toBe(2) // 相位 100ms 落在循环（step1 起）的 step2 边界
    // stop(reset=true) 重建到自身 intro 起点
    player.stop('e1', true)
    expect(player.frame('e1')).toBe(0)
  })
})

describe('C5 旧 signal 迟到 abort 不删新覆盖', () => {
  test('新请求接管后旧 signal abort：新覆盖存活并完成；stop 后迟到 abort 无副作用', async () => {
    const player = new EntityActionPlayer()
    const sp = sprite()
    const oldSignal = new AbortController()
    const first = player.play('e1', resolveSpriteActionBinding(sp, bind('once')), oldSignal.signal)
    const second = player.play('e1', resolveSpriteActionBinding(sp, bind('walk', true)))
    oldSignal.abort() // 旧 signal 迟到：不得删除新覆盖
    expect(player.hasOverride('e1')).toBe(true)
    await expect(first).resolves.toBeUndefined() // 旧 waiter 被新请求兑现（非 abort）
    player.advance(1000) // 循环覆盖继续存在（不会自然结束）
    expect(player.hasOverride('e1')).toBe(true)
    player.stop('e1', false) // stop 收尾循环覆盖
    await expect(second).resolves.toBeUndefined()
    expect(player.hasOverride('e1')).toBe(false)
    // stop 后再 abort 一个已被替换的 signal：无异常、无状态残留
    const controller = new AbortController()
    const pending = player.play(
      'e1',
      resolveSpriteActionBinding(sp, bind('once')),
      controller.signal,
    )
    player.stop('e1', false)
    controller.abort()
    await expect(pending).resolves.toBeUndefined()
    expect(player.frame('e1')).toBeUndefined()
  })
})

describe('C6 边界 startAtMs 与 dt 轴', () => {
  test('精确边界/半步 startAtMs 的帧号；dt=0 no-op；非法 dt 拒绝', () => {
    const action = sprite().poses!.walk!
    // 边界：startAtMs=100 恰好进入 step1
    expect(resolveSpriteActionPosition(action, 0, false, 100)).toMatchObject({
      stepIndex: 1,
      frame: 1,
      finished: false,
    })
    // 半步：startAtMs=150 在 step1 中段
    expect(resolveSpriteActionPosition(action, 0, false, 150)).toMatchObject({
      stepIndex: 1,
      elapsedInStepMs: 50,
      frame: 1,
    })
    // 非循环越尾 → 末步 finished
    expect(resolveSpriteActionPosition(action, 0, false, 1000)).toMatchObject({
      stepIndex: 2,
      finished: true,
    })
    const player = new EntityActionPlayer()
    player.setBase('e1', resolveSpriteActionBinding(sprite(), bind('walk', true)))
    const before = player.frame('e1')
    player.advance(0) // no-op
    expect(player.frame('e1')).toBe(before)
    expect(() => player.advance(-1)).toThrow('dtMs 必须为非负有限数')
    expect(() => player.advance(Number.NaN)).toThrow('dtMs 必须为非负有限数')
  })
  test('完整 cue 轨迹按步序一次发出（walk：step0 与 step2 的 sound）', () => {
    const cues: string[] = []
    const player = new EntityActionPlayer((_entity, cue) => {
      if (cue.kind === 'sound') cues.push(cue.asset)
    })
    player.setBase('e1', resolveSpriteActionBinding(sprite(), bind('walk', true)))
    player.advance(100) // 跨 step0→1 边界
    player.advance(100) // 跨 step1→2 边界
    player.advance(100) // 循环回 loopFrom=1
    expect(cues).toEqual(['sfx.step0', 'sfx.step2']) // 每步 cue 恰一次、按序
  })
})
