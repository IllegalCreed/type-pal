/**
 * TEST-GLM-REFORGE-RUNTIME-SESSION-1 — 取消/迟到回执/scene token 残项。
 * world-motion-runtime.test.ts 与 .residual.test.ts 已覆盖:节奏/余量/冻结复位、队伍走位
 * 替换与完成分离、双注册表 commit-先于唤醒、authority 采样、追逐注册/取消回调、步态
 * owner 清理、party epoch、trace 克隆/上限淘汰、teardown 全量取消与 session 换代、
 * one-shot authority 丢弃、侧避锁保留、阻挡原因记录。本文件补:在途走位的中止署名消息
 * 与注册表清理、预中止信号的全注册入口拒绝、在途单步中止、同目标重复注册的替换接管、
 * 实体 authority 接管的 script 步态/侧避锁清空、attempted/取消后的迟到回执静默、scene token
 * 注册时快照与 teardown 失效语义。
 */
import { describe, expect, test, vi } from 'vitest'
import type { MotionSnapshotActor, SideStick } from './entity-motion.js'
import { WorldMotionRuntime } from './world-motion-runtime.js'

const pos = (col: number, row = 0) => ({ col, row, height: 0 })
const snapshotOf = (id: string): MotionSnapshotActor => ({
  actor: { kind: 'entity', id },
  pos: pos(1),
  facing: 'right',
  footprints: [{ dcol: 0, drow: 0 }],
  hasBody: true,
  yieldable: true,
})
const planSticks = (motion: WorldMotionRuntime, id: string) =>
  motion.plan({
    actors: [snapshotOf(id)],
    intents: [],
    terrainBlocked: () => false,
    liveActors: new Set([`1:${id}`]),
  }).previousSideSticks

describe('TEST-GLM-REFORGE-RUNTIME-SESSION-1 取消与替换', () => {
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

  test('实体 authority 接管清空旧 script owner 的步态与侧避锁', () => {
    const motion = new WorldMotionRuntime(100)
    motion.advanceCadence(100, false)
    // Automatic gait is paused and retained; main.auto-pose-authority exercises its actual
    // standing presentation and resumed phase. This caller covers the script cleanup boundary.
    motion.markGait('npc', 'script', 4)
    expect(motion.hasGait('npc')).toBe(true)
    const npcStick: SideStick = {
      actor: { kind: 'entity', id: 'npc' },
      epoch: 1,
      side: 'positive',
      remainingEligibleTicks: 2,
    }
    motion.commitSideSticks([npcStick], [], [], () => true)
    expect(planSticks(motion, 'npc')).toHaveLength(1)
    motion.coordinator.setAuthority('npc', { kind: 'script' })
    expect(motion.hasGait('npc')).toBe(false)
    expect(motion.gaitOwner('npc')).toBeUndefined()
    expect(motion.lastMovedWorldTick('npc')).toBeUndefined()
    expect(planSticks(motion, 'npc')).toHaveLength(0)
    motion.coordinator.releaseAuthority('npc')
  })
})

describe('TEST-GLM-REFORGE-RUNTIME-SESSION-1 迟到回执', () => {
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
})

describe('TEST-GLM-REFORGE-RUNTIME-SESSION-1 scene token', () => {
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
