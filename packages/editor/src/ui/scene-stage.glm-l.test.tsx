import type { ActorDef, SceneDef, SpriteDef } from '@type-pal/content'
import type { RleFrame } from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import {
  buildInitialSceneSpriteDraws,
  collectInitialSceneSpriteAssets,
  fitStageView,
  mapBoxOf,
} from './scene-stage.js'

function frame(width = 32, height = 32): RleFrame {
  const opaque = new Uint8Array(width * height)
  opaque.fill(1)
  return { width, height, opaque, pixels: new Uint8Array(width * height) }
}

function sprite(id: string, asset: string): SpriteDef {
  return {
    id,
    asset: asset as SpriteDef['asset'],
    label: '测试精灵',
    layout: { kind: 'static' },
  }
}

function sceneWith(entities: SceneDef['entities']): SceneDef {
  return {
    id: 'scene-a',
    mapId: 'map-a',
    entry: { pos: { col: 1, row: 2, height: 0 }, facing: 'left' },
    entities,
  }
}

describe('TEST-GLM-WAVE-L-1 L02 scene stage pure helpers', () => {
  test('静态作者态精灵资源收集跳过隐藏、区域实体并按 asset 去重', () => {
    const sprites = [sprite('s-hero', 'asset/hero'), sprite('s-sign', 'asset/sign')]
    const actors: Record<string, ActorDef> = {
      'actor-lee': {
        id: 'actor-lee',
        name: '李大娘',
        spriteId: 's-hero',
        portraits: {},
      } as ActorDef,
    }
    const scene = sceneWith([
      { id: 'sign', sprite: 's-sign', pos: { col: 2, row: 2, height: 0 } },
      { id: 'hidden', sprite: 's-hero', hidden: true, pos: { col: 3, row: 2, height: 0 } },
      { id: 'zone', zone: true, pos: { col: 4, row: 2, height: 0 } },
      { id: 'lee', actor: 'actor-lee', pos: { col: 5, row: 2, height: 0 } },
      { id: 'unknown', sprite: 'missing', pos: { col: 6, row: 2, height: 0 } },
    ])
    expect(collectInitialSceneSpriteAssets(scene, sprites, actors, 's-hero')).toEqual([
      'asset/hero',
      'asset/sign',
    ])
    expect(collectInitialSceneSpriteAssets(scene, sprites, actors)).toEqual([
      'asset/sign',
      'asset/hero',
    ])
  })

  test('作者态 SpriteDraw：leader 常量层与实体 zBias 映射各就各位', () => {
    const sprites = [sprite('s-hero', 'asset/hero'), sprite('s-sign', 'asset/sign')]
    const actors: Record<string, ActorDef> = {
      'actor-lee': {
        id: 'actor-lee',
        name: '李大娘',
        spriteId: 's-hero',
        portraits: {},
      } as ActorDef,
    }
    const loaded = new Map([
      ['asset/hero', { frames: [frame()], anchorX: 16, anchorY: 32 }],
      ['asset/sign', { frames: [frame()], anchorX: 16, anchorY: 32 }],
    ])
    const scene = sceneWith([
      { id: 'sign', sprite: 's-sign', pos: { col: 2, row: 2, height: 0 } },
      { id: 'raised', sprite: 's-hero', pos: { col: 3, row: 2, height: 1 }, zBias: 2 },
      { id: 'hidden', sprite: 's-hero', hidden: true, pos: { col: 4, row: 2, height: 0 } },
    ])
    const draws = buildInitialSceneSpriteDraws(scene, sprites, actors, loaded, 's-hero')
    expect(draws).toHaveLength(3)
    expect(draws[0]).toMatchObject({
      sortOffset: 10,
      coverILayer: 6,
      coverSortOffset: 10,
      baseYBias: 0,
      occlusionTrigger: true,
      anchorX: 16,
      anchorY: 32,
    })
    expect(draws[1]).toMatchObject({
      baseYBias: 0,
      coverILayer: 2,
      coverSortOffset: 9,
      occlusionTrigger: false,
    })
    // zBias=2 的景物映射 coverILayer=2*8+2、coverSortOffset=2*8+9。
    expect(draws[2]).toMatchObject({
      baseYBias: 2,
      coverILayer: 18,
      coverSortOffset: 25,
      occlusionTrigger: false,
    })
  })

  test('未知精灵与缺失帧安全跳过，不产出空 draw', () => {
    const sprites = [sprite('s-missing-asset', 'asset/none')]
    const draws = buildInitialSceneSpriteDraws(
      sceneWith([{ id: 'x', sprite: 's-missing-asset', pos: { col: 0, row: 0, height: 0 } }]),
      sprites,
      {},
      new Map([['asset/other', { frames: [], anchorX: 0, anchorY: 0 }]]),
    )
    expect(draws).toEqual([])
  })

  test('fitStageView 把极端纵横比夹进 [0.04,16]；mapBoxOf 支持房间偏移', () => {
    const huge = fitStageView({ minX: 0, minY: 0, maxX: 1, maxY: 1 }, { w: 10000, h: 10000 })
    expect(huge.zoom).toBe(16)
    const tiny = fitStageView(
      { minX: 0, minY: 0, maxX: 1_000_000, maxY: 1_000_000 },
      { w: 800, h: 600 },
    )
    expect(tiny.zoom).toBe(0.04)

    const whole = mapBoxOf({ width: 20, height: 10 }, undefined)
    expect(whole).toEqual({ minX: -32, minY: -40, maxX: 20 * 32 + 32, maxY: 10 * 16 + 16 })
    const room = mapBoxOf({ width: 20, height: 10 }, { col: 2, row: 1, cols: 3, rows: 2 })
    expect(room).toEqual({
      minX: 2 * 32 - 32,
      minY: 1 * 16 - 40,
      maxX: 5 * 32 + 32,
      maxY: 3 * 16 + 16,
    })
  })
})
