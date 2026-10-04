/**
 * TEST-GLM-REFORGE-RUNTIME-SESSION-1 — world-view 替换残项。
 * runtime-project-view.test.ts 与 .boundaries.test.ts 已覆盖:页/行为/hook 投影与
 * 有→无→有刷新、completed 失效、shared/private 脚本引用适配、items/throw/scratch 别名
 * 隔离、hook 游标入场选择、依赖捕获稳定性、入口场景只读;本文件补:hostile onLose 命令
 * 体的运行时剥离、canonical 缺席实体的刷新跳过、scratch 可选腿(followers/mapOverride/
 * entityLayer)与整体 runtimeProjectView 替换面。
 */
import { type BaseSceneDef, emptyWorldScriptState } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  assertSceneFixtureLegal,
  deepSnapshot,
  legalScene,
} from './__tests__/glm-state-boundary-fixtures.js'
import { scenarioProject } from './__tests__/runtime-shell/scenarios.js'
import {
  baseSceneView,
  isRuntimeScriptRef,
  projectedWorldScriptScratch,
  refreshSceneViewBindings,
  runtimeProjectView,
} from './runtime-project-view.js'

function hostileScene(): BaseSceneDef {
  return {
    id: 's1',
    mapId: 'map-1',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [
      {
        id: 'e-strip',
        sprite: 'sprite-1',
        pos: { col: 1, row: 2, height: 0 },
        hostile: {
          enemyTeamId: 'team-a',
          chase: { range: 4, speed: 2, floating: true },
          onLose: [{ kind: 'setFlag', flag: 'lost', value: true }],
          onVictory: { kind: 'hide', ticks: 20 },
          onPlayerFlee: { kind: 'remain' },
        },
      },
      {
        id: 'e-gameover',
        sprite: 'sprite-2',
        pos: { col: 3, row: 4, height: 0 },
        hostile: {
          enemyTeamId: 'team-b',
          onLose: 'gameOver',
          onVictory: { kind: 'remove' },
          onPlayerFlee: { kind: 'suspend', ticks: 5 },
        },
      },
      {
        id: 'e-plain',
        sprite: 'sprite-1',
        pos: { col: 5, row: 6, height: 0 },
      },
    ],
  }
}

describe('TEST-GLM-REFORGE-RUNTIME-SESSION-1 world-view 替换', () => {
  test('运行时视图剥离 hostile onLose 命令体,gameOver 与其余 hostile 字段逐字保留', () => {
    const canonical = hostileScene()
    assertSceneFixtureLegal(canonical)
    const view = baseSceneView(canonical, emptyWorldScriptState())
    const strip = view.entities.find((entity) => entity.id === 'e-strip')?.hostile
    expect(strip).toEqual({
      enemyTeamId: 'team-a',
      chase: { range: 4, speed: 2, floating: true },
      onLose: [],
      onVictory: { kind: 'hide', ticks: 20 },
      onPlayerFlee: { kind: 'remain' },
    })
    const gameOver = view.entities.find((entity) => entity.id === 'e-gameover')?.hostile
    expect(gameOver).toEqual(canonical.entities[1]?.hostile)
    expect(view.entities.find((entity) => entity.id === 'e-plain')?.hostile).toBeUndefined()
    // 视图是克隆:改视图 hostile 不写回 canonical。
    if (strip?.chase) strip.chase.range = 99
    expect(canonical.entities[0]?.hostile?.chase?.range).toBe(4)
  })

  test('刷新跳过 canonical 缺席的视图实体,保留其活体绑定', () => {
    const canonical = legalScene()
    assertSceneFixtureLegal(canonical)
    const world = emptyWorldScriptState()
    world.behaviors.entities = { s1: { 'e-talk': { page: 'anim' } } }
    const view = baseSceneView(canonical, world)
    const gone = view.entities.find((entity) => entity.id === 'e-auto')
    if (!gone) throw new Error('活体实体缺失')
    gone.pos = { col: 8, row: 8, height: 0 }
    const gonePages = deepSnapshot(gone.pages)
    // canonical 替换后不再包含 e-auto(实体离场):刷新不得动它的活体绑定。
    const replacement = legalScene()
    replacement.entities = [replacement.entities[0]!]
    assertSceneFixtureLegal(replacement)
    refreshSceneViewBindings(view, replacement, emptyWorldScriptState())
    expect(gone.pages).toEqual(gonePages)
    expect(gone.pos).toEqual({ col: 8, row: 8, height: 0 })
    // 在场实体照常刷新:e-talk 回到空行为世界的缺省 initialPage 投影。
    const present = view.entities.find((entity) => entity.id === 'e-talk')
    expect(present?.pages).toEqual([
      { trigger: { on: 'interact', range: 2, stages: [{ body: [] }] } },
    ])
  })

  test('scratch 对 followers/mapOverride/entityLayer 逐腿深拷贝,缺席不造空对象', () => {
    const world = emptyWorldScriptState()
    world.followers = ['hero', 'friend']
    world.mapOverride = { s1: 'map-9' }
    world.entityLayer = { s1: { 'e-talk': 2 }, s2: { x: 1 } }
    const scratch = projectedWorldScriptScratch(world, 's1')
    expect(scratch.followers).toEqual(['hero', 'friend'])
    expect(scratch.mapOverride).toEqual({ s1: 'map-9' })
    expect(scratch.entityLayer).toEqual({ 'e-talk': 2 })
    scratch.followers?.push('stowaway')
    if (scratch.mapOverride) scratch.mapOverride.s1 = 'map-8'
    if (scratch.entityLayer) scratch.entityLayer['e-talk'] = 7
    expect(world.followers).toEqual(['hero', 'friend'])
    expect(world.mapOverride?.s1).toBe('map-9')
    expect(world.entityLayer?.s1?.['e-talk']).toBe(2)
    const absent = projectedWorldScriptScratch(emptyWorldScriptState(), 's9')
    expect(absent.followers).toBeUndefined()
    expect(absent.mapOverride).toBeUndefined()
    expect(absent.entityLayer).toBeUndefined()
  })

  test('runtimeProjectView 整体替换:入口场景重投影、items 适配、scriptStore 显式置空、其余透传', async () => {
    const fixture = await scenarioProject({
      items: [
        {
          id: 'ext',
          name: '外部脚本物',
          desc: [],
          buyPrice: 0,
          sellPrice: 0,
          sellable: false,
          use: {
            target: 'scene',
            consuming: false,
            effects: [{ kind: 'runScript', script: 'shared/greet' }],
          },
        },
      ],
      sharedScripts: {
        'shared/greet': {
          name: '问好',
          self: 'none',
          body: [
            { kind: 'dialog', cue: { identity: { kind: 'narration' }, rows: [{ text: 'hi' }] } },
          ],
        },
      },
    })
    const project = fixture.project
    const view = runtimeProjectView(project, emptyWorldScriptState())
    // 入口场景是重新投影的新对象,而非原引用透传。
    expect(view.entryScene).not.toBe(project.entryScene)
    expect(view.entryScene.id).toBe(project.entryScene.id)
    // items 走运行时适配:外部脚本引用落到运行时 chunk。
    const extEffect = view.items.ext?.use?.effects[0]
    expect(extEffect?.kind).toBe('runScript')
    if (extEffect?.kind === 'runScript') {
      expect(isRuntimeScriptRef(extEffect.script)).toBe(true)
      expect(extEffect.script.id).toBe('shared/greet')
    }
    // scriptStore 显式置 undefined(own key 在场),消费方不得再读作者脚本库。
    expect(Object.hasOwn(view, 'scriptStore')).toBe(true)
    expect(view.scriptStore).toBeUndefined()
    // 其余工程字段原样透传(引用一致),不复制不重建。
    expect(view.sceneIndex).toBe(project.sceneIndex)
    expect(view.actorsById).toBe(project.actorsById)
    expect(view.assetResolver).toBe(project.assetResolver)
  })
})
