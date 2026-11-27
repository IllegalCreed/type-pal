import { describe, expect, test, vi } from 'vitest'
import { WorldMotionRuntime } from './world-motion-runtime.js'

const pos = (col: number, row = 0) => ({ col, row, height: 0 })

describe('entity motion commands and scene ownership', () => {
  test('script and auto durable slots coexist and commit before their deferred wake-up', async () => {
    const motion = new WorldMotionRuntime(100)
    const script = motion.registerMove({
      source: 'script',
      id: 'npc',
      to: pos(2),
      speed: 'normal',
      sceneId: 'a',
    })
    const auto = motion.registerMove({
      source: 'auto',
      id: 'npc',
      to: pos(3),
      speed: 'fast',
      sceneId: 'a',
      activation: { ownerId: 'owner', epoch: 5 },
    })
    const scriptSlot = motion.coordinator.scriptSlots.get('npc')
    const autoSlot = motion.coordinator.autoSlots.get('npc')
    expect(scriptSlot?.kind).toBe('move')
    expect(autoSlot?.kind).toBe('move')
    if (scriptSlot?.kind !== 'move' || autoSlot?.kind !== 'move') throw new Error('missing slots')

    scriptSlot.commitSettlement()
    autoSlot.commitSettlement()
    expect(motion.coordinator.scriptSlots.has('npc')).toBe(false)
    expect(motion.coordinator.autoSlots.has('npc')).toBe(false)
    scriptSlot.cancel('late replacement')
    autoSlot.cancel('late lifecycle')
    scriptSlot.resolve()
    autoSlot.resolve()
    expect(await script).toBe(scriptSlot.commandEpoch)
    expect(await auto).toBe(autoSlot.commandEpoch)
  })

  test('auto one-shot registration samples authority and activation identities once', async () => {
    const motion = new WorldMotionRuntime(100)
    motion.coordinator.setAuthority('npc', { kind: 'script' })
    await expect(
      motion.registerAutoStep({
        id: 'npc',
        dir: 'left',
        sceneId: 'a',
        signal: new AbortController().signal,
        activation: { ownerId: 'owner', epoch: 4 },
      }),
    ).resolves.toEqual({ outcome: 'droppedByAuthority' })

    motion.coordinator.releaseAuthority('npc')
    const pending = motion.registerAutoStep({
      id: 'npc',
      dir: 'right',
      sceneId: 'a',
      signal: new AbortController().signal,
      activation: { ownerId: 'owner', epoch: 4 },
    })
    const slot = motion.coordinator.autoSlots.get('npc')
    expect(slot).toMatchObject({
      kind: 'step',
      activationOwnerId: 'owner',
      activationEpoch: 4,
      authorityEpochAtEnqueue: 2,
    })
    slot?.resolve()
    await expect(pending).resolves.toMatchObject({ outcome: 'attempted' })
    expect(motion.coordinator.autoLineagesForTarget('npc')).toHaveLength(1)
  })

  test('chase registration publishes its exact slot and cancellation callback before rejection', async () => {
    const motion = new WorldMotionRuntime(100)
    const controller = new AbortController()
    const registered = vi.fn()
    const cancelled = vi.fn()
    const dropped = vi.fn()
    const pending = motion.registerChase({
      source: 'auto',
      id: 'npc',
      range: 8,
      floating: false,
      sceneId: 'a',
      signal: controller.signal,
      activation: { ownerId: 'owner', epoch: 3 },
      onRegistered: registered,
      onDropped: dropped,
      onCancelled: cancelled,
    })
    const slot = motion.coordinator.autoSlots.get('npc')
    expect(registered).toHaveBeenCalledWith(slot)
    controller.abort()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    expect(cancelled).toHaveBeenCalledWith(slot)
    expect(dropped).not.toHaveBeenCalled()
    expect(motion.coordinator.autoSlots.has('npc')).toBe(false)
  })

  test('中止在途实体走位按来源署名拒绝并清空注册表', async () => {
    const motion = new WorldMotionRuntime(100)
    for (const source of ['script', 'auto'] as const) {
      const controller = new AbortController()
      const detach = vi.spyOn(controller.signal, 'removeEventListener')
      const pending = motion.registerMove({
        source,
        id: 'npc',
        to: pos(2),
        speed: 'normal',
        sceneId: 'a',
        signal: controller.signal,
        ...(source === 'auto' ? { activation: { ownerId: 'npc', epoch: 1 } } : {}),
      })
      const registry =
        source === 'script' ? motion.coordinator.scriptSlots : motion.coordinator.autoSlots
      expect(registry.has('npc')).toBe(true)
      controller.abort()
      const failure = await pending.catch((error) => error)
      expect(failure).toMatchObject({
        name: 'AbortError',
        message: `实体 npc ${source} 走位所属 runner 已取消`,
      })
      expect(registry.has('npc')).toBe(false)
      expect(detach).toHaveBeenCalledOnce()
    }
  })

  test('预中止信号让全部注册入口立即拒绝且不留槽位', async () => {
    const motion = new WorldMotionRuntime(100)
    const aborted = new AbortController()
    aborted.abort()
    await expect(motion.schedulePartyMove(pos(1), 'normal', aborted.signal)).rejects.toMatchObject({
      name: 'AbortError',
    })
    expect(motion.partyMove).toBeNull()
    await expect(
      motion.registerMove({
        source: 'script',
        id: 'npc',
        to: pos(2),
        speed: 'normal',
        sceneId: 'a',
        signal: aborted.signal,
      }),
    ).rejects.toMatchObject({ name: 'AbortError' })
    expect(motion.coordinator.scriptSlots.size).toBe(0)
    await expect(
      motion.registerAutoStep({
        id: 'npc',
        dir: 'left',
        sceneId: 'a',
        signal: aborted.signal,
        activation: { ownerId: 'owner', epoch: 1 },
      }),
    ).rejects.toMatchObject({ name: 'AbortError' })
    expect(motion.coordinator.autoSlots.size).toBe(0)
    const registered = vi.fn()
    await expect(
      motion.registerChase({
        source: 'auto',
        id: 'npc',
        range: 3,
        floating: false,
        sceneId: 'a',
        signal: aborted.signal,
        activation: { ownerId: 'owner', epoch: 1 },
        onRegistered: registered,
        onDropped: vi.fn(),
        onCancelled: vi.fn(),
      }),
    ).rejects.toMatchObject({ name: 'AbortError' })
    expect(registered).not.toHaveBeenCalled()
    expect(motion.coordinator.autoSlots.size).toBe(0)
  })

  test('中止在途 auto 单步拒绝且不留下已提交续点', async () => {
    const motion = new WorldMotionRuntime(100)
    const controller = new AbortController()
    const pending = motion.registerAutoStep({
      id: 'npc',
      dir: 'left',
      sceneId: 's1',
      signal: controller.signal,
      activation: { ownerId: 'scene-auto', epoch: 3 },
    })
    expect(motion.coordinator.autoSlots.has('npc')).toBe(true)
    controller.abort()
    await expect(pending).rejects.toMatchObject({
      name: 'AbortError',
      message: 'auto 实体 npc 单步所属 runner 已取消',
    })
    expect(motion.coordinator.autoSlots.has('npc')).toBe(false)
    expect(motion.coordinator.autoLineagesForTarget('npc')).toEqual([])
  })

  test('同目标重复注册以替换消息拒绝旧等待者并由新槽接管注册表', async () => {
    const motion = new WorldMotionRuntime(100)
    const first = motion.registerMove({
      source: 'script',
      id: 'npc',
      to: pos(2),
      speed: 'normal',
      sceneId: 'a',
    })
    const firstSlot = motion.coordinator.scriptSlots.get('npc')
    expect(firstSlot?.kind).toBe('move')
    const second = motion.registerMove({
      source: 'script',
      id: 'npc',
      to: pos(3),
      speed: 'fast',
      sceneId: 'a',
    })
    await expect(first).rejects.toMatchObject({
      name: 'AbortError',
      message: '实体 npc 的旧 script 走位已被新走位替换',
    })
    const secondSlot = motion.coordinator.scriptSlots.get('npc')
    expect(secondSlot).not.toBe(firstSlot)
    if (secondSlot?.kind !== 'move') throw new Error('替换槽缺失')
    expect(secondSlot.to).toEqual(pos(3))
    secondSlot.resolve()
    await expect(second).resolves.toBe(secondSlot.commandEpoch)

    // auto 跨类替换:在途 auto 走位被单步接管。
    const autoMove = motion.registerMove({
      source: 'auto',
      id: 'mob',
      activation: { ownerId: 'owner', epoch: 1 },
      to: pos(2),
      speed: 'normal',
      sceneId: 'a',
    })
    const step = motion.registerAutoStep({
      id: 'mob',
      dir: 'left',
      sceneId: 'a',
      signal: new AbortController().signal,
      activation: { ownerId: 'owner', epoch: 1 },
    })
    await expect(autoMove).rejects.toMatchObject({
      name: 'AbortError',
      message: '实体 mob 的旧 auto locomotion 已被单步替换',
    })
    const stepSlot = motion.coordinator.autoSlots.get('mob')
    expect(stepSlot?.kind).toBe('step')
    stepSlot?.resolve()
    await expect(step).resolves.toMatchObject({ outcome: 'attempted' })
  })

  test('已登记的一次性 auto 步进在 authority 换代后只回 dropped，不留下成功续点', async () => {
    const motion = new WorldMotionRuntime(100)
    const controller = new AbortController()
    const pending = motion.registerAutoStep({
      id: 'npc',
      dir: 'left',
      sceneId: 's1',
      signal: controller.signal,
      activation: { ownerId: 'scene-auto', epoch: 3 },
    })
    const slot = motion.coordinator.autoSlots.get('npc')
    expect(slot).toMatchObject({ kind: 'step', source: 'auto', authorityEpochAtEnqueue: 0 })
    if (slot?.kind !== 'step') throw new Error('step registration missing')
    motion.coordinator.setAuthority('npc', { kind: 'script' })
    expect(motion.coordinator.shouldDropAutoOneShot('npc', slot)).toBe(true)
    slot.dropByAuthority()
    await expect(pending).resolves.toEqual({ outcome: 'droppedByAuthority' })
    expect(motion.coordinator.autoSlots.has('npc')).toBe(false)
    expect(motion.coordinator.autoLineagesForTarget('npc')).toEqual([])
    controller.abort()
  })

  test('追逐入队前/后两种 authority 丢弃分别只触发一次回调；脚本源不误丢', async () => {
    const motion = new WorldMotionRuntime(100)
    const signal = new AbortController().signal
    const dropped = vi.fn()
    const registered = vi.fn()
    const cancelled = vi.fn()
    motion.coordinator.setAuthority('npc', { kind: 'script' })
    await expect(
      motion.registerChase({
        source: 'auto',
        id: 'npc',
        range: 3,
        floating: false,
        sceneId: 's1',
        signal,
        activation: { ownerId: 'scene-auto', epoch: 1 },
        onDropped: dropped,
        onRegistered: registered,
        onCancelled: cancelled,
      }),
    ).resolves.toBe('droppedByAuthority')
    expect(dropped).toHaveBeenCalledTimes(1)
    expect(registered).not.toHaveBeenCalled()
    expect(motion.coordinator.autoSlots.has('npc')).toBe(false)

    const scripted = motion.registerChase({
      source: 'script',
      id: 'npc',
      range: 4,
      floating: true,
      sceneId: 's1',
      signal,
      onDropped: dropped,
      onRegistered: registered,
      onCancelled: cancelled,
    })
    const scriptSlot = motion.coordinator.scriptSlots.get('npc')
    expect(scriptSlot).toMatchObject({ kind: 'chase', source: 'script', range: 4, floating: true })
    if (scriptSlot?.kind !== 'chase') throw new Error('script chase missing')
    expect(motion.coordinator.shouldDropAutoOneShot('npc', scriptSlot)).toBe(false)
    scriptSlot.resolve()
    await expect(scripted).resolves.toBe('attempted')
    expect(registered).toHaveBeenCalledTimes(1)
    expect(dropped).toHaveBeenCalledTimes(1)
    expect(cancelled).not.toHaveBeenCalled()

    motion.coordinator.releaseAuthority('npc')
    const auto = motion.registerChase({
      source: 'auto',
      id: 'npc',
      range: 5,
      floating: false,
      sceneId: 's1',
      signal,
      activation: { ownerId: 'scene-auto', epoch: 2 },
      onDropped: dropped,
      onRegistered: registered,
      onCancelled: cancelled,
    })
    const autoSlot = motion.coordinator.autoSlots.get('npc')
    if (autoSlot?.kind !== 'chase') throw new Error('auto chase missing')
    motion.coordinator.setAuthority('npc', { kind: 'mount', parent: 'party', dx: 0, dy: 0 })
    expect(motion.coordinator.shouldDropAutoOneShot('npc', autoSlot)).toBe(true)
    autoSlot.dropByAuthority?.()
    await expect(auto).resolves.toBe('droppedByAuthority')
    expect(dropped).toHaveBeenCalledTimes(2)
    expect(registered).toHaveBeenCalledTimes(2)
    expect(cancelled).not.toHaveBeenCalled()
    expect(motion.coordinator.autoSlots.has('npc')).toBe(false)
  })

  test('单步 attempted 结算后的迟到回执不再重发 committed 回调', async () => {
    const motion = new WorldMotionRuntime(100)
    const committed = vi.fn()
    const pending = motion.registerAutoStep({
      id: 'npc',
      dir: 'left',
      sceneId: 's1',
      signal: new AbortController().signal,
      activation: { ownerId: 'owner', epoch: 2 },
      onCommitted: committed,
    })
    const slot = motion.coordinator.autoSlots.get('npc')
    if (slot?.kind !== 'step') throw new Error('单步槽缺失')
    slot.resolve()
    await expect(pending).resolves.toEqual({
      outcome: 'attempted',
      commandEpoch: slot.commandEpoch,
    })
    expect(committed).toHaveBeenCalledOnce()
    expect(committed).toHaveBeenCalledWith('continuation')
    slot.dropByAuthority()
    slot.cancel('迟到取消')
    slot.resolve()
    expect(committed).toHaveBeenCalledOnce()
    expect(motion.coordinator.autoSlots.has('npc')).toBe(false)
    // 已提交续点不被迟到回执撤销。
    expect(motion.coordinator.autoLineagesForTarget('npc')).toHaveLength(1)
  })

  test('追逐取消结算后的迟到调用不再重发任何回调', async () => {
    const motion = new WorldMotionRuntime(100)
    const cancelled = vi.fn()
    const dropped = vi.fn()
    const committed = vi.fn()
    const controller = new AbortController()
    const pending = motion.registerChase({
      source: 'auto',
      id: 'npc',
      range: 3,
      floating: false,
      sceneId: 's1',
      signal: controller.signal,
      activation: { ownerId: 'owner', epoch: 1 },
      onRegistered: vi.fn(),
      onDropped: dropped,
      onCancelled: cancelled,
      onCommitted: committed,
    })
    const slot = motion.coordinator.autoSlots.get('npc')
    if (slot?.kind !== 'chase') throw new Error('追逐槽缺失')
    controller.abort()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    expect(cancelled).toHaveBeenCalledOnce()
    slot.resolve()
    slot.dropByAuthority?.()
    slot.cancel('迟到取消')
    expect(cancelled).toHaveBeenCalledOnce()
    expect(dropped).not.toHaveBeenCalled()
    expect(committed).not.toHaveBeenCalled()
    expect(motion.coordinator.autoSlots.has('npc')).toBe(false)
  })

  test('scene teardown cancels both registries, releases authority and clears visual motion', async () => {
    const motion = new WorldMotionRuntime(100)
    const pending = motion.registerMove({
      source: 'script',
      id: 'npc',
      to: pos(4),
      speed: 'normal',
      sceneId: 'a',
    })
    const auto = motion.registerMove({
      source: 'auto',
      id: 'auto-npc',
      to: pos(6),
      speed: 'slow',
      sceneId: 'a',
      activation: { ownerId: 'auto-npc', epoch: 5 },
    })
    const aborted = Promise.all([
      expect(pending).rejects.toMatchObject({ name: 'AbortError', message: 'script:npc' }),
      expect(auto).rejects.toMatchObject({ name: 'AbortError', message: 'auto:auto-npc' }),
    ])
    motion.coordinator.setAuthority('npc', { kind: 'script' })
    motion.markGait('npc', 'script', 1)
    motion.advanceExplicitAnimation('other')
    const before = motion.currentSceneSessionId('a')
    motion.teardownScene({
      beforeCancelSlots: vi.fn(),
      beforeReleaseAllAuthority: vi.fn(),
      slotMessage: (source, actorId) => `${source}:${actorId}`,
    })
    await aborted
    expect(motion.coordinator.scriptSlots.size).toBe(0)
    expect(motion.coordinator.autoSlots.size).toBe(0)
    expect(motion.coordinator.authority.size).toBe(0)
    expect(motion.hasGait('npc')).toBe(false)
    expect(motion.hasExplicitAnimation('other')).toBe(false)
    expect(motion.currentSceneSessionId('a')).not.toBe(before)
  })

  test('scene token 在注册时快照,teardown 失效后旧槽保持旧 token 而新注册取新 token', async () => {
    const motion = new WorldMotionRuntime(100)
    motion.coordinator.setAuthority('npc', { kind: 'script' })
    const tokenBefore = motion.currentSceneSessionId('a')
    const tokenSceneB = motion.currentSceneSessionId('b')
    const first = motion.registerMove({
      source: 'script',
      id: 'npc',
      to: pos(2),
      speed: 'normal',
      sceneId: 'a',
    })
    const firstSlot = motion.coordinator.scriptSlots.get('npc')
    expect(firstSlot?.sceneSessionId).toBe(tokenBefore)
    let authorityAtCancel = false
    let slotsAtRelease = -1
    motion.teardownScene({
      beforeCancelSlots: () => {
        authorityAtCancel = motion.coordinator.authority.has('npc')
      },
      beforeReleaseAllAuthority: () => {
        slotsAtRelease = motion.coordinator.scriptSlots.size
      },
      slotMessage: (source, actorId) => `${source}:${actorId}`,
    })
    await expect(first).rejects.toMatchObject({ name: 'AbortError' })
    // teardown 顺序回执:取消槽位时 authority 尚在,释放 authority 前槽位已清空。
    expect(authorityAtCancel).toBe(true)
    expect(slotsAtRelease).toBe(0)
    expect(motion.coordinator.authority.size).toBe(0)
    // 旧槽的迟到回执保持注册时快照的旧 token;当前 token 已换代。
    expect(firstSlot?.sceneSessionId).toBe(tokenBefore)
    expect(motion.currentSceneSessionId('a')).not.toBe(tokenBefore)
    const second = motion.registerMove({
      source: 'script',
      id: 'npc',
      to: pos(4),
      speed: 'normal',
      sceneId: 'a',
    })
    const secondSlot = motion.coordinator.scriptSlots.get('npc')
    expect(secondSlot?.sceneSessionId).toBe(motion.currentSceneSessionId('a'))
    expect(secondSlot?.sceneSessionId).not.toBe(tokenBefore)
    const crossScene = motion.registerMove({
      source: 'script',
      id: 'other',
      to: pos(1),
      speed: 'normal',
      sceneId: 'b',
    })
    const crossSlot = motion.coordinator.scriptSlots.get('other')
    // 换代是全局 epoch:其它场景的新注册同样取换代后 token。
    expect(crossSlot?.sceneSessionId).not.toBe(tokenSceneB)
    secondSlot?.resolve()
    crossSlot?.resolve()
    await second
    await crossScene
  })
})
