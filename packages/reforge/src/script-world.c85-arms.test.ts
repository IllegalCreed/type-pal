// TEST-COVERAGE85-GLM-REFORGE-1 — script-world.ts 残留分支臂合同测试。
// 公开纯函数与 FlowRuntimeCoordinator 公开 API;typed BaseSceneEntity/BaseSceneDef fixture。
import type { BaseSceneDef, BaseSceneEntity } from '@type-pal/content'
import { emptyWorldScriptState } from '@type-pal/content'
import { expect, test, vi } from 'vitest'
import {
  FlowRuntimeCoordinator,
  resolveBaseEntityPage,
  resolveSceneHook,
  selectBaseEntityPage,
  selectBaseSceneHooks,
  selectEntityBehavior,
  setEntityTriggerActivation,
} from './script-world.js'

const digest = 'a'.repeat(64)

const target = { scene: 's1', entity: 'e1' }

function entityWith(pages?: BaseSceneEntity['pages']): BaseSceneEntity & { zone: true } {
  return {
    id: 'e1',
    pos: { col: 0, row: 0, height: 0 },
    zone: true,
    ...(pages ? { pages } : {}),
  }
}

const flow = { kind: 'stages' as const, initial: 's0', stages: [{ id: 's0', body: [] }] }
const behavior = (id: string) => ({ [id]: { label: id, order: 0, flow } })

const hookScene = (): BaseSceneDef => ({
  id: 's1',
  mapId: 'map-1',
  entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
  entities: [],
  hooks: {
    onEnter: {
      initial: 'main',
      variants: {
        main: {
          label: 'Main',
          order: 0,
          flow: { kind: 'stages', initial: 's0', stages: [{ id: 's0', body: [] }] },
        },
      },
    },
  },
})

test('page 缺席臂:entity 无 pages 时解析与切换都安静返回 undefined', () => {
  const world = emptyWorldScriptState()
  const entity = entityWith()
  expect(resolveBaseEntityPage(entity, world.behaviors.entities?.s1?.e1)).toBeUndefined()
  const result = selectBaseEntityPage(world, entity, target, { kind: 'inherit' })
  expect(result).toEqual({ triggerChanged: false, autoChanged: false, animationChanged: false })
})

test('page 缺席臂:initialPage 指向不存在页时 fail-loud', () => {
  const entity = entityWith([{ id: 'p0', label: 'P0' }])
  entity.initialPage = 'ghost'
  expect(() => resolveBaseEntityPage(entity, undefined)).toThrow('entity e1: page 不存在 ghost')
})

test('behavior 注册表臂:页引用的行为 id 不在注册表时 fail-loud', () => {
  const world = emptyWorldScriptState()
  const entity = entityWith([{ id: 'p0', label: 'P0', trigger: 'missing-behavior' }])
  entity.initialPage = 'p0'
  entity.behaviors = { trigger: {}, auto: {} }
  expect(() => selectEntityBehavior(world, entity, target, 'trigger', { kind: 'inherit' })).toThrow(
    'entity e1: trigger behavior 不存在 missing-behavior',
  )
})

test('selectEntityBehavior inherit 臂:显式继承清除该通道的手动选择', () => {
  const world = emptyWorldScriptState()
  const entity = entityWith()
  entity.behaviors = { trigger: behavior('greet') }
  selectEntityBehavior(world, entity, target, 'trigger', { kind: 'use', value: 'greet' })
  const changed = selectEntityBehavior(world, entity, target, 'trigger', { kind: 'inherit' })
  expect(changed).toBe(true)
  expect(world.behaviors.entities?.s1?.e1?.trigger?.selection).toBeUndefined()
  // 再次 inherit 已无变化
  expect(selectEntityBehavior(world, entity, target, 'trigger', { kind: 'inherit' })).toBe(false)
})

test('auto bump 臂:页切换改变 auto 行为时 bump auto owner', () => {
  const world = emptyWorldScriptState()
  const entity = entityWith()
  entity.behaviors = { trigger: {}, auto: { ...behavior('idle'), ...behavior('patrol') } }
  entity.pages = [
    { id: 'pa', label: 'A', auto: 'idle' },
    { id: 'pb', label: 'B', auto: 'patrol' },
  ]
  entity.initialPage = 'pa'
  const coordinator = new FlowRuntimeCoordinator()
  const bumps: string[] = []
  const spy = vi.spyOn(coordinator, 'bump').mockImplementation((owner) => {
    bumps.push(owner.kind === 'entity-behavior' ? `${owner.channel}` : 'hook')
    return 0
  })
  selectBaseEntityPage(world, entity, target, { kind: 'use', value: 'pb' }, coordinator)
  expect(bumps).toEqual(['auto'])
  spy.mockRestore()
})

test('trigger activation 校验臂:range 非法即 fail-loud,合法值落世界态', () => {
  const world = emptyWorldScriptState()
  const entity = entityWith()
  expect(() =>
    setEntityTriggerActivation(world, entity, target, {
      kind: 'use',
      value: { on: 'touch', range: -1 },
    }),
  ).toThrow('trigger activation.range: 期望非负有限数')
  setEntityTriggerActivation(world, entity, target, {
    kind: 'use',
    value: { on: 'touch', range: 0 },
  })
  expect(world.behaviors.entities?.s1?.e1?.triggerActivation).toEqual({
    kind: 'use',
    value: { on: 'touch', range: 0 },
  })
})

test('scene hook 校验臂:空 selection 与未知变体 fail-loud;undefined 槽位安静跳过', () => {
  const world = emptyWorldScriptState()
  const scene = hookScene()
  expect(() => selectBaseSceneHooks(world, scene, {})).toThrow(
    'selectSceneHooks.selection: 至少需要一个 own slot',
  )
  expect(() =>
    selectBaseSceneHooks(world, scene, { onEnter: { kind: 'use', value: 'ghost' } }),
  ).toThrow('scene s1: onEnter hook 不存在 ghost')
  const changed = selectBaseSceneHooks(world, scene, {
    onEnter: { kind: 'use', value: 'main' },
    onTeleport: undefined,
  })
  expect(changed).toEqual({ onEnter: false, onTeleport: false })
})

test('scene hook inherit 臂:继承清空手动选择且同 id 游标保留', () => {
  const world = emptyWorldScriptState()
  const scene = hookScene()
  const coordinator = new FlowRuntimeCoordinator()
  // 手动选 main 并落一个游标
  selectBaseSceneHooks(world, scene, { onEnter: { kind: 'use', value: 'main' } })
  world.behaviors.scenes = {
    s1: {
      onEnter: {
        selection: { kind: 'use', value: 'main' },
        cursor: { hook: 'main', at: { kind: 'stage', stage: 's0' } },
      },
    },
  }
  const changed = selectBaseSceneHooks(world, scene, { onEnter: { kind: 'inherit' } }, coordinator)
  expect(changed).toEqual({ onEnter: false, onTeleport: false })
  const slot = world.behaviors.scenes?.s1?.onEnter
  expect(slot?.selection).toBeUndefined()
  expect(slot?.cursor?.hook).toBe('main')
})

test('resolveSceneHook 缺槽臂:场景无 onTeleport 槽返回 undefined', () => {
  const world = emptyWorldScriptState()
  expect(resolveSceneHook(hookScene(), world, 'onTeleport')).toBeUndefined()
})

test('租约停机臂:closed 租约与 epoch 失效租约的 checkpoint 都返回 stop', async () => {
  const coordinator = new FlowRuntimeCoordinator()
  const owner = { kind: 'entity-behavior' as const, target, channel: 'auto' as const }
  const lease = coordinator.begin(owner, vi.fn())
  if (!lease) throw new Error('expected lease')
  coordinator.bump(owner)
  expect(lease.setCheckpointReady(true)).toBe('stop')
  lease.close()
  await expect(lease.reachSafePoint({ kind: 'stage', stage: 's0' })).resolves.toBe('stop')
})

test('checkpoint 等待臂:save barrier 未就绪时 ready=false 返回 wait,ready=true 返回 continue', async () => {
  const coordinator = new FlowRuntimeCoordinator()
  const owner = { kind: 'entity-behavior' as const, target, channel: 'auto' as const }
  const committed: unknown[] = []
  const lease = coordinator.begin(owner, (cursor, resume) => committed.push({ cursor, resume }))
  if (!lease) throw new Error('expected lease')
  const barrier = coordinator.requestSaveBarrier()
  expect(lease.checkpoint({ kind: 'stage', stage: 's0' }, { digest, frames: [] }, false)).toBe(
    'wait',
  )
  expect(lease.checkpoint({ kind: 'stage', stage: 's0' }, { digest, frames: [] }, true)).toBe(
    'continue',
  )
  await barrier.ready
  barrier.release()
  expect(committed).toEqual([
    { cursor: { kind: 'stage', stage: 's0' }, resume: { digest, frames: [] } },
  ])
})

test('barrier 句柄臂:未 ready release 即 throw,双重 release 与 cancel 都按失效句柄处理', async () => {
  const coordinator = new FlowRuntimeCoordinator()
  // trigger 通道不开 checkpoint:租约不预置 snapshotReady,barrier 不会立即 ready
  const owner = { kind: 'entity-behavior' as const, target, channel: 'trigger' as const }
  const lease = coordinator.begin(owner, vi.fn())
  if (!lease) throw new Error('expected lease')
  const barrier = coordinator.requestSaveBarrier()
  expect(() => barrier.release()).toThrow('save barrier 尚未 ready，不能 release')
  // 非嵌套租约在 gate 关闭时到达安全点 = 'stop' 并结束租约 → barrier 就绪
  await expect(lease.reachSafePoint({ kind: 'stage', stage: 's0' })).resolves.toBe('stop')
  await barrier.ready
  barrier.release()
  expect(() => barrier.release()).toThrow('save barrier handle 已失效')

  const lease2 = coordinator.begin(owner, vi.fn())
  if (!lease2) throw new Error('expected second lease')
  const barrier2 = coordinator.requestSaveBarrier()
  barrier2.cancel()
  await expect(barrier2.ready).rejects.toThrow('save barrier cancelled')
})

test('barrier cancel 臂:Error 原样透传,字符串原因包成 Error', async () => {
  const coordinator = new FlowRuntimeCoordinator()
  const activity = coordinator.beginActivity()
  if (!activity) throw new Error('expected activity')
  const barrier = coordinator.requestSaveBarrier()
  const boom = new Error('存档管线故障')
  barrier.cancel(boom)
  await expect(barrier.ready).rejects.toBe(boom)

  const activity2 = coordinator.beginActivity()
  if (!activity2) throw new Error('expected activity')
  const barrier2 = coordinator.requestSaveBarrier()
  barrier2.cancel('磁盘满')
  await expect(barrier2.ready).rejects.toThrow('磁盘满')
})

test('activation gate 中止臂:等待期间与已中止 signal 都以 AbortError 拒绝', async () => {
  const coordinator = new FlowRuntimeCoordinator()
  const owner = { kind: 'entity-behavior' as const, target, channel: 'auto' as const }
  const lease = coordinator.begin(owner, vi.fn())
  if (!lease) throw new Error('expected lease')
  const barrier = coordinator.requestSaveBarrier()
  const controller = new AbortController()
  const waiting = coordinator.waitForActivationGate(controller.signal)
  controller.abort()
  await expect(waiting).rejects.toMatchObject({ name: 'AbortError' })
  void barrier.ready.catch(() => {})
  barrier.cancel()
  lease.close()

  const fresh = new FlowRuntimeCoordinator()
  fresh.beginActivity()
  const barrier2 = fresh.requestSaveBarrier()
  const aborted = new AbortController()
  aborted.abort()
  await expect(fresh.waitForActivationGate(aborted.signal)).rejects.toMatchObject({
    name: 'AbortError',
  })
  void barrier2.ready.catch(() => {})
  barrier2.cancel()
})

test('owner idle 臂:已空闲即解析;活动期等待并在租约关闭后唤醒;中止拒绝', async () => {
  const coordinator = new FlowRuntimeCoordinator()
  const owner = { kind: 'entity-behavior' as const, target, channel: 'trigger' as const }
  await expect(
    coordinator.waitForOwnerIdle(owner, new AbortController().signal),
  ).resolves.toBeUndefined()

  const lease = coordinator.begin(owner, vi.fn())
  if (!lease) throw new Error('expected lease')
  const controller = new AbortController()
  const waiting = coordinator.waitForOwnerIdle(owner, controller.signal)
  controller.abort()
  await expect(waiting).rejects.toMatchObject({ name: 'AbortError' })

  const idle = coordinator.waitForOwnerIdle(owner, new AbortController().signal)
  lease.close()
  await expect(idle).resolves.toBeUndefined()
})
