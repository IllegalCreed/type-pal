/**
 * TEST-GLM-NEW-G-1 G04：world-scene-presentation 残差。
 * 旧证（world-scene-presentation.test.ts / .residual）已证精灵优先级/队尾序/姿势覆盖/
 * 波动绘制/隐藏缺定义过滤/奇数拍震屏；本文件只补旧题未覆盖的公开臂：
 *   1) 震屏偶数拍 +level 臂（world-scene-presentation.ts:263）与 shake(now,0) 显式清场（:108-110）；
 *   2) 实体帧覆盖注册表尾：hasEntityFrame / entityFrame / clearEntityFrame / clearEntityFrames
 *      （:88-106）经 sprites() 真实帧选择互证；
 *   3) extraFollowerSpriteIds 稀疏空洞 fail-loud（:226 expectDefined）。
 * 演出观感不留证；只断言公开方法的状态迁移与有限 tick 输出。
 */
import type { EntityDef, SpriteDef } from '@type-pal/content'
import type { Palette, RleFrame } from '@type-pal/shared'
import { describe, expect, test, vi } from 'vitest'
import type { LoadedSprite } from './assets.js'
import { buildBlankProjectMap } from './project-map.js'
import type { Renderer } from './render.js'
import { WorldScenePresentation, type WorldSpriteInput } from './world-scene-presentation.js'

const palette: Palette = { colors: Array.from({ length: 256 }, () => [0, 0, 0]), cycles: [] }

function frame(width: number, height: number): RleFrame {
  return {
    width,
    height,
    pixels: new Uint8Array(width * height).fill(1),
    opaque: new Uint8Array(width * height).fill(1),
  }
}

function loaded(count: number): LoadedSprite {
  return {
    frames: Array.from({ length: count }, (_, i) => frame(i + 1, 10)),
    anchorX: 0,
    anchorY: 0,
  }
}

function entity(id: string): EntityDef {
  return { id, actor: `${id}-actor`, pos: { col: 3, row: 1, height: 2 }, facing: 'down', zBias: 1 }
}

function spriteDef(id: string): SpriteDef {
  return {
    id,
    label: id,
    asset: `sprite.${id}`,
    layout: { kind: 'directional', framesPerDir: 3 },
  }
}

function context() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
    drawImage: vi.fn(),
    imageSmoothingEnabled: true,
  } as unknown as CanvasRenderingContext2D // 外部 Canvas IO 适配器（既有测试同型）
}

function renderer(ctx: CanvasRenderingContext2D, log: string[], label: string): Renderer {
  return {
    context: ctx,
    clear: () => log.push(`${label}:clear`),
    renderScene: (_map, _room, camera, sprites) =>
      log.push(`${label}:render:${camera.x},${camera.y}:${sprites.length}`),
    drawSprite: vi.fn(),
  }
}

function presentation() {
  const mainContext = context()
  const log: string[] = []
  const instance = new WorldScenePresentation({
    canvas: { width: 1280, height: 800 } as HTMLCanvasElement,
    context: mainContext,
    worldScale: 4,
    createCanvas: () => ({ width: 0, height: 0 }) as HTMLCanvasElement,
    contextFor: () => context(),
    createRenderer: (ctx) => renderer(ctx, log, 'wave'),
  })
  const mainRenderer = renderer(mainContext, log, 'main')
  const scene = {
    map: buildBlankProjectMap(2, 2, 'tiles'),
    room: { col: 0, row: 0, cols: 2, rows: 2 },
    palette,
    tiles: new Map(),
    renderer: mainRenderer,
    rendererForWave: (create: () => Renderer) => create(),
  }
  return { instance, scene, log }
}

function input(overrides: Partial<WorldSpriteInput> = {}): WorldSpriteInput {
  return {
    entities: [],
    visible: () => true,
    entitySprite: () => undefined,
    loadedSprite: () => undefined,
    entityGait: () => undefined,
    entityExplicitAnimation: () => undefined,
    entityActionFrame: () => undefined,
    entityLayer: () => 0,
    party: [],
    partyVisual: () => undefined,
    player: {
      pos: { col: 0, row: 0, height: 0 },
      facing: 'down',
      walking: false,
      stepFrame: 0,
      layer: 0,
    },
    followers: [],
    extraFollowerSpriteIds: [],
    extraFollowerPosition: () => ({ pos: { col: 0, row: 0, height: 0 }, facing: 'down' }),
    spriteById: () => undefined,
    now: () => 999,
    ...overrides,
  }
}

describe('G04 world-scene-presentation 残差', () => {
  test('震屏偶数拍 +level 臂；shake(now,0) 显式清场后相机原样', () => {
    const { instance, scene, log } = presentation()
    const camera = { x: 5, y: 9 }
    instance.shake(80, 2, 3) // until = 80 + 80 = 160
    // now=80：floor(80/40)%2===0 → 偶数拍 +level（旧题只钉过 now=120 奇数拍 −level）。
    expect(
      instance.renderWorld({
        scene,
        camera,
        sprites: [],
        vars: {},
        now: 80,
        advanceWaveFrame: true,
      }),
    ).toEqual({ x: 5, y: 12 })
    // timeFrames 0：显式清场三元 false 臂 → 震屏消失，now=120 相机原样（奇偶不再影响）。
    instance.shake(80, 0, 3)
    expect(
      instance.renderWorld({
        scene,
        camera,
        sprites: [],
        vars: {},
        now: 120,
        advanceWaveFrame: true,
      }),
    ).toEqual(camera)
    expect(log).toEqual(['main:clear', 'main:render:5,12:0', 'main:clear', 'main:render:5,9:0'])
  })

  test('实体帧覆盖注册表尾：has/entityFrame 读出、单体与全清恢复 gait 帧选择', () => {
    const { instance } = presentation()
    const definition = spriteDef('npc-sprite')
    const frames = loaded(12)
    const npc = entity('npc')
    instance.setEntityFrame('npc', 2)
    expect(instance.hasEntityFrame('npc')).toBe(true)
    expect(instance.entityFrame('npc')).toBe(2)
    const withOverride = instance.sprites(
      input({
        entities: [npc],
        entitySprite: () => definition,
        loadedSprite: () => frames,
        entityGait: () => 1,
      }),
    )
    expect(withOverride).toHaveLength(1)
    // clearEntityFrame 单体清除：覆盖消失 → gait 帧选择恢复（帧真不同）。
    instance.clearEntityFrame('npc')
    expect(instance.hasEntityFrame('npc')).toBe(false)
    expect(instance.entityFrame('npc')).toBeUndefined()
    const afterClear = instance.sprites(
      input({
        entities: [npc],
        entitySprite: () => definition,
        loadedSprite: () => frames,
        entityGait: () => 0,
      }),
    )
    expect(afterClear[0]?.frame).not.toBe(withOverride[0]?.frame)
    // clearEntityFrames 全清：清后再清幂等，注册表保持空。
    instance.setEntityFrame('npc', 1)
    instance.clearEntityFrames()
    expect(instance.hasEntityFrame('npc')).toBe(false)
    instance.clearEntityFrames()
    expect(instance.hasEntityFrame('npc')).toBe(false)
  })

  test('extraFollowerSpriteIds 稀疏空洞 fail-loud，不静默跳过', () => {
    const { instance } = presentation()
    const ids: string[] = ['extra-sprite']
    delete ids[0] // 合法类型输入的单点空洞（runtime hole）
    expect(() =>
      instance.sprites(
        input({
          extraFollowerSpriteIds: ids,
          extraFollowerPosition: () => ({ pos: { col: 1, row: 1, height: 0 }, facing: 'down' }),
        }),
      ),
    ).toThrowError()
  })
})
