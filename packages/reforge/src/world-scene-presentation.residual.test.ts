import type { EntityDef, SpriteDef, WorldState } from '@type-pal/content'
import type { RleFrame } from '@type-pal/shared'
import { describe, expect, test } from 'vitest'
import type { LoadedSprite } from './assets.js'
import type { Renderer } from './render.js'
import { WorldScenePresentation, type WorldSpriteInput } from './world-scene-presentation.js'

const pos = (col: number, row = 0) => ({ col, row, height: 0 })

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
    frames: Array.from({ length: count }, (_, index) => frame(index + 2, index + 5)),
    anchorX: 0,
    anchorY: 0,
  }
}

function member(template: string): WorldState['party'][number] {
  return {
    id: `${template}-instance`,
    template,
    level: 1,
    exp: 0,
    hp: 10,
    maxHP: 10,
    mp: 5,
    maxMP: 5,
    attack: 1,
    defense: 1,
    magicAttack: 1,
    speed: 1,
    luck: 1,
    equipment: {},
    tags: [],
  }
}

function presentation() {
  const context = {} as CanvasRenderingContext2D
  const canvas = { width: 320, height: 200 } as HTMLCanvasElement
  const renderer: Renderer = {
    context,
    clear() {},
    renderScene() {},
    drawSprite() {},
  }
  return new WorldScenePresentation({
    canvas,
    context,
    worldScale: 1,
    createCanvas: () => canvas,
    contextFor: () => context,
    createRenderer: () => renderer,
  })
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
    entityLayer: () => undefined,
    party: [],
    partyVisual: () => undefined,
    player: { pos: pos(0), facing: 'down', walking: false, stepFrame: 0, layer: 2 },
    followers: [],
    extraFollowerSpriteIds: [],
    extraFollowerPosition: () => ({ pos: pos(0), facing: 'down' }),
    spriteById: () => undefined,
    now: () => 750,
    ...overrides,
  }
}

const staticDef: SpriteDef = {
  id: 'static',
  label: '静物',
  asset: 'sprite.static',
  layout: { kind: 'static' },
}
const directional: SpriteDef = {
  id: 'walk',
  label: '行走',
  asset: 'sprite.walk',
  layout: { kind: 'directional', framesPerDir: 3 },
}

describe('当前大世界呈现的实体与队伍帧选择', () => {
  test('只有受控队长主动触发前景透明，NPC/静物/队友/编外跟随者仍保留普通遮挡与不透明本体', () => {
    const frames = loaded(1)
    const sprites = presentation().sprites(
      input({
        entities: [
          { id: 'hero-npc', actor: 'hero', pos: pos(1) },
          { id: 'prop', sprite: staticDef.id, pos: pos(2) },
        ],
        entitySprite: () => staticDef,
        loadedSprite: () => frames,
        party: [member('hero'), member('friend')],
        partyVisual: () => ({ def: staticDef, frames }),
        followers: [undefined, { pos: pos(3), facing: 'up' }],
        extraFollowerSpriteIds: [staticDef.id],
        spriteById: () => staticDef,
      }),
    )
    expect(sprites.map((sprite) => sprite.occlusionTrigger)).toEqual([
      false,
      false,
      true,
      false,
      false,
    ])
    expect(sprites.map((sprite) => sprite.coverSortOffset)).toEqual([9, 9, 26, 26, 26])
    expect(sprites.every((sprite) => sprite.alpha === undefined)).toBe(true)
  })

  test('空队伍的首个编外跟随者不因深度序号为0而成为受控主角', () => {
    const frames = loaded(1)
    const sprites = presentation().sprites(
      input({
        loadedSprite: () => frames,
        extraFollowerSpriteIds: [staticDef.id],
        spriteById: () => staticDef,
      }),
    )
    expect(sprites).toHaveLength(1)
    expect(sprites[0]?.baseYBias).toBe(2)
    expect(sprites[0]?.occlusionTrigger).toBe(false)
  })

  test('队长换人按当前受控绘制点触发，不绑定旧Actor；队长无可绘帧时队友不接替触发', () => {
    const hero = member('hero')
    const friend = member('friend')
    const heroFrames = loaded(1)
    const friendFrames = loaded(2)
    const presenter = presentation()
    const state = input({
      party: [hero, friend],
      partyVisual: (entry) => ({
        def: staticDef,
        frames: entry === hero ? heroFrames : friendFrames,
      }),
      followers: [undefined, { pos: pos(3), facing: 'down' }],
    })
    const original = presenter.sprites(state)
    const swapped = presenter.sprites({ ...state, party: [friend, hero] })
    expect(original.map((sprite) => sprite.frame)).toEqual([
      heroFrames.frames[0],
      friendFrames.frames[0],
    ])
    expect(swapped.map((sprite) => sprite.frame)).toEqual([
      friendFrames.frames[0],
      heroFrames.frames[0],
    ])
    expect(original.map((sprite) => sprite.occlusionTrigger)).toEqual([true, false])
    expect(swapped.map((sprite) => sprite.occlusionTrigger)).toEqual([true, false])
    const missingLeader = presenter.sprites({
      ...state,
      partyVisual: (entry) =>
        entry === hero ? undefined : { def: staticDef, frames: friendFrames },
    })
    expect(missingLeader).toHaveLength(1)
    expect(missingLeader[0]?.occlusionTrigger).toBe(false)
  })

  test('隐藏、缺定义和空解码帧不进入绘制队列，只有合法可见精灵留下实际帧锚', () => {
    const entity = (id: string): EntityDef => ({ id, sprite: 'static', pos: pos(2) })
    const frames = loaded(1)
    const emptyDef: SpriteDef = { ...staticDef, id: 'empty', asset: 'sprite.empty' }
    const state = input({
      entities: [entity('hidden'), entity('unknown'), entity('empty'), entity('shown')],
      visible: (candidate) => candidate.id !== 'hidden',
      entitySprite: (id) => (id === 'unknown' ? undefined : id === 'empty' ? emptyDef : staticDef),
      loadedSprite: (definition) => (definition === emptyDef ? { ...frames, frames: [] } : frames),
    })
    const before = structuredClone(state.entities)
    const result = presentation().sprites(state)
    expect(result).toHaveLength(1)
    expect(result.map((sprite) => sprite.frame)).toEqual([frames.frames[0]])
    expect(result.map((sprite) => [sprite.anchorX, sprite.anchorY])).toEqual([[1, 5]])
    expect(state.entities).toEqual(before)
  })

  test('显式动画优先于 loop 时钟；无覆盖时 loop 真按时间取帧，层深取实体 zBias', () => {
    const loop: SpriteDef = {
      id: 'loop',
      label: '火光',
      asset: 'sprite.loop',
      layout: { kind: 'loop', frameCount: 4 },
    }
    const staticFrames = loaded(4)
    const loopFrames = loaded(4)
    const entities: EntityDef[] = [
      { id: 'animated', sprite: staticDef.id, pos: pos(1), zBias: 4 },
      { id: 'flame', sprite: loop.id, pos: pos(3) },
    ]
    let clockReads = 0
    const result = presentation().sprites(
      input({
        entities,
        entitySprite: (id) => (id === 'animated' ? staticDef : loop),
        loadedSprite: (definition) => (definition.id === staticDef.id ? staticFrames : loopFrames),
        entityExplicitAnimation: (id) => (id === 'animated' ? 2 : undefined),
        now: () => {
          clockReads++
          return 750
        },
      }),
    )
    expect(result.map((sprite) => sprite.frame)).toEqual([
      staticFrames.frames[2],
      loopFrames.frames[3],
    ])
    expect(clockReads).toBe(1)
    expect(
      result.map((sprite) => [sprite.coverILayer, sprite.coverSortOffset, sprite.baseYBias]),
    ).toEqual([
      [34, 41, 4],
      [2, 9, 0],
    ])
    expect(result.every((sprite) => sprite.occlusionTrigger === false)).toBe(true)
  })

  test('队长脚本姿势压过走帧；清姿势后恢复 3 帧步序，当前帧尺寸决定脚底锚', () => {
    const presenter = presentation()
    const frames = loaded(12)
    const shared = input({
      party: [member('hero')],
      partyVisual: () => ({ def: directional, frames }),
      player: { pos: pos(2, 1), facing: 'left', walking: true, stepFrame: 1, layer: 3 },
    })
    presenter.setPartyGesture(2)
    expect(presenter.partyGesture).toBe(2)
    const scripted = presenter.sprites(shared)
    expect(scripted[0]?.frame).toBe(frames.frames[5])
    expect([scripted[0]?.anchorX, scripted[0]?.anchorY]).toEqual([3, 10])
    presenter.setPartyGesture(null)
    const walking = presenter.sprites(shared)
    expect(walking[0]?.frame).toBe(frames.frames[4])
    expect([walking[0]?.anchorX, walking[0]?.anchorY]).toEqual([3, 9])
    expect(walking[0]?.baseYBias).toBe(3)
  })

  test('缺席队友不占绘制位；额外跟随源按身份筛选，步行队友取自身朝向组', () => {
    const presenter = presentation()
    const leaderFrames = loaded(12)
    const followerFrames = loaded(12)
    const extraFrames = loaded(1)
    const common = input({
      party: [member('hero'), member('friend')],
      partyVisual: (entry) => ({
        def: directional,
        frames: entry.template === 'hero' ? leaderFrames : followerFrames,
      }),
      player: { pos: pos(2), facing: 'down', walking: true, stepFrame: 3, layer: 2 },
      followers: [undefined, undefined],
      extraFollowerSpriteIds: ['missing', staticDef.id],
      spriteById: (id) => (id === staticDef.id ? staticDef : undefined),
      loadedSprite: (definition) => (definition.id === staticDef.id ? extraFrames : undefined),
      extraFollowerPosition: (partyIndex) => ({ pos: pos(partyIndex), facing: 'up' }),
    })
    const withoutFriend = presenter.sprites(common)
    expect(withoutFriend.map((sprite) => sprite.frame)).toEqual([
      leaderFrames.frames[2],
      extraFrames.frames[0],
    ])
    expect(withoutFriend.map((sprite) => sprite.baseYBias)).toEqual([2, 1.97])

    const withFriend = presenter.sprites({
      ...common,
      followers: [undefined, { pos: pos(1), facing: 'up' }],
    })
    expect(withFriend.map((sprite) => sprite.frame)).toEqual([
      leaderFrames.frames[2],
      followerFrames.frames[8],
      extraFrames.frames[0],
    ])
    expect(withFriend.map((sprite) => sprite.baseYBias)).toEqual([2, 1.99, 1.97])
  })
})
