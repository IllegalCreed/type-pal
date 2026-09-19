/**
 * TEST-RUNTIME-STATE-BOUNDARIES-1 B4-B7：只读投影边界（runtime-project-view.ts）。
 * runtime-project-view.test.ts:96/118/165/180 已覆盖基础页/行为/hook 投影、shared/private
 * 引用适配、scratch 平面化与入口只读；本文件补有→无→有刷新精确性、hook 游标入场选择、
 * 依赖捕获稳定性与 items/throw/scratch 双向别名轴。
 */
import { emptyWorldScriptState, type WorldScriptState } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { deepSnapshot, legalItems, legalScene } from './__tests__/glm-state-boundary-fixtures.js'
import {
  baseSceneView,
  captureRuntimeSceneBehaviorDependencies,
  isRuntimeScriptRef,
  projectedWorldScriptScratch,
  projectItemsView,
  refreshSceneViewBindings,
} from './runtime-project-view.js'

const worldWith = (patch: (world: WorldScriptState) => void): WorldScriptState => {
  const world = emptyWorldScriptState()
  patch(world)
  return world
}

describe('B4 page/trigger/auto 有→无→有刷新', () => {
  test('字段精确删除/恢复；活体位置保留；hook 投影保持；canonical 输入不变', () => {
    const world = worldWith((w) => {
      w.behaviors.entities = { s1: { 'e-talk': { page: 'idle' } } }
    })
    const canonical = legalScene()
    const canonicalSnapshot = deepSnapshot(canonical)
    const view = baseSceneView(canonical, world)
    const talk = view.entities[0]
    if (!talk) throw new Error('missing entity')
    talk.pos = { col: 9, row: 9, height: 0 } // 活体走位
    expect(talk.pages?.[0]).toEqual({
      trigger: { on: 'interact', range: 2, stages: [{ body: [] }] },
    })
    // 有 → 无通道：切到空白页（无 trigger/auto/animation）→ 页壳保留但三通道字段精确消失
    const blank = worldWith((w) => {
      w.behaviors.entities = { s1: { 'e-talk': { page: 'blank' } } }
    })
    refreshSceneViewBindings(view, canonical, blank)
    expect(talk.pages).toEqual([{}])
    expect(talk.pos).toEqual({ col: 9, row: 9, height: 0 }) // 活体位置保留
    // 无 → 有：切回 idle → 精确恢复
    refreshSceneViewBindings(view, canonical, world)
    expect(talk.pages?.[0]).toEqual({
      trigger: { on: 'interact', range: 2, stages: [{ body: [] }] },
    })
    expect(talk.pos).toEqual({ col: 9, row: 9, height: 0 })
    // hook 投影两态均在（canonical initial 恒可解析）；入场 reveal 不因页刷新漂移
    expect(view.onEnter).toEqual([{ entry: { prepare: [], reveal: { kind: 'cut' } }, body: [] }])
    expect(canonical).toEqual(canonicalSnapshot) // 真正传入的 canonical 全程不变
  })
})

describe('B5 hook 游标选择的入场投影', () => {
  test('stages 游标命中对应 stage 的 entry；stateMachine 游标命中对应 state；正文一律空', () => {
    const world = emptyWorldScriptState()
    const view = baseSceneView(legalScene(), world)
    // onEnter initial=first → 该 stage 的 entry（cut）
    expect(view.onEnter).toEqual([{ entry: { prepare: [], reveal: { kind: 'cut' } }, body: [] }])
    // onTeleport 状态机 initial=a 无 entry → 空 body 投影（不复活可执行正文）
    expect(view.onTeleport).toEqual([{ body: [] }])
    // 把 onTeleport 游标切到 b（带 fadeIn entry）：经世界 hook override
    const worldB = worldWith((w) => {
      w.behaviors.scenes = {
        s1: {
          onTeleport: {
            cursor: { hook: 'tp', at: { kind: 'state', machine: 'm1', state: 'b' } },
          },
        },
      }
    })
    const viewB = baseSceneView(legalScene(), worldB)
    expect(viewB.onTeleport).toEqual([
      { entry: { prepare: [], reveal: { kind: 'fade', outMs: 100, inMs: 100 } }, body: [] },
    ])
  })
})

describe('B6 依赖捕获稳定性与差分', () => {
  test('实体换序输出稳定（按 id 排序）；相关变化有差、无关场景不误报', () => {
    const world = worldWith((w) => {
      w.behaviors.entities = { s1: { 'e-talk': { page: 'idle' } } }
    })
    const runtimeScene = legalScene() as unknown as import('@type-pal/content').RuntimeSceneDef
    const a = captureRuntimeSceneBehaviorDependencies(runtimeScene, world)
    const reordered = legalScene()
    reordered.entities = [reordered.entities[1]!, reordered.entities[0]!]
    const b = captureRuntimeSceneBehaviorDependencies(
      reordered as unknown as import('@type-pal/content').RuntimeSceneDef,
      world,
    )
    expect(a.entities.map((entity) => entity.id)).toEqual(['e-auto', 'e-talk']) // 稳定排序
    expect(b.entities).toEqual(a.entities) // 换序不变
    // 相关变化：页选择 moving → trigger/auto/animation 差分
    const worldAnim = worldWith((w) => {
      w.behaviors.entities = { s1: { 'e-talk': { page: 'anim' } } }
    })
    const c = captureRuntimeSceneBehaviorDependencies(runtimeScene, worldAnim)
    expect(c.entities.find((entity) => entity.id === 'e-talk')).not.toEqual(
      a.entities.find((entity) => entity.id === 'e-talk'),
    )
    expect(c.onEnter).toEqual(a.onEnter) // 页变化不影响 hook 捕获
  })
})

describe('B7 items/scratch 可选分支与双向别名', () => {
  test('use 双效果与 throw 完整投影；裸物品无 use/throw；输入不别名', () => {
    const items = legalItems()
    const snapshot = deepSnapshot(items)
    const view = projectItemsView(items)
    const both = view.both
    if (!both?.use || !both.throw) throw new Error('fixture')
    const [shared, privateEffect] = both.use.effects
    expect(shared?.kind).toBe('runScript')
    expect(privateEffect?.kind).toBe('runScript')
    if (shared?.kind === 'runScript' && privateEffect?.kind === 'runScript') {
      expect(isRuntimeScriptRef(shared.script)).toBe(true)
      expect(privateEffect.script.id).toBe('item:both:use')
    }
    expect(both.throw).toEqual({ target: 'oneEnemy', effects: [] })
    expect(view.bare?.use).toBeUndefined()
    expect(view.bare?.throw).toBeUndefined()
    expect(items).toEqual(snapshot) // 实际传入对象不变（无别名写回）
    // 双向：改投影不改输入
    view.both!.name! = '改投影'
    expect(items.both?.name).toBe('双分支')
  })
  test('scratch 可选分支缺席与在场：flags/vars/entityState 深拷贝不别名', () => {
    const world = worldWith((w) => {
      w.flags.done = true
      w.vars.count = 3
      w.entityState = { s1: { 'e-talk': 1 }, s2: { x: 0 } }
      w.entityPos = { s1: { 'e-talk': { col: 2, row: 3, height: 0 } } }
    })
    const scratch = projectedWorldScriptScratch(world, 's1')
    expect(scratch.flags).toEqual({ done: true })
    expect(scratch.vars).toEqual({ count: 3 })
    expect(scratch.entityState).toEqual({ 'e-talk': 1 }) // 只含当前场景
    expect(scratch.entityStage).toEqual({})
    expect('entityLayer' in scratch && scratch.entityLayer).toBeFalsy() // 缺席分支不造空对象
    // 改 scratch 不写回 world（深拷贝）
    scratch.flags.done = false
    ;(scratch.entityState as Record<string, number>)['e-talk'] = 99
    expect(world.flags.done).toBe(true)
    expect(world.entityState.s1?.['e-talk']).toBe(1)
  })
})
