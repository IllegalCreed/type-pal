/**
 * TEST-GLM-NEW-G-1 G04：world-scene-presentation 残差。
 * 覆盖实体帧注册表读写与清理经 sprites() 的实际选帧，以及额外跟随者精灵的稀疏空洞校验。
 * 演出观感不留证；只断言公开方法的状态迁移与有限 tick 输出。
 */
import type { EntityDef, SpriteDef } from '@type-pal/content'
import type { RleFrame } from '@type-pal/shared'
import { describe, expect, test, vi } from 'vitest'
import type { LoadedSprite } from './assets.js'
import type { Renderer } from './render.js'
import { WorldScenePresentation, type WorldSpriteInput } from './world-scene-presentation.js'

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

function context(): CanvasRenderingContext2D {
  const stub: Partial<Omit<CanvasRenderingContext2D, 'canvas'>> & {
    canvas: { width: number; height: number }
  } = {
    canvas: { width: 1280, height: 800 },
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
    drawImage: vi.fn(),
    imageSmoothingEnabled: true,
  }
  // 外部 Canvas IO 适配器：与 dom-host.ts 同型的单次窄化（不涉工程/业务输入）。
  return stub as CanvasRenderingContext2D
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
  return { instance }
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
