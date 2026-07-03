import { describe, expect, test } from 'vitest'
import {
  AddEntityCommand,
  DeleteEntityCommand,
  MoveEntityCommand,
  UpdateActorCommand,
  UpdateEntityCommand,
  UpdateSceneCommand,
  UpdateSpriteCommand,
} from './commands.js'
import type { EditorState } from './edit-session.js'
import type { ActorDef, EntityDef, SpriteDef } from '@type-pal/content'

const ent = (id: string): EntityDef => ({
  id,
  pos: { col: 1, row: 1, height: 0 },
  sprite: 'ghost',
})

/** 最小 EditorState(字段不全,as 断言 —— 测的是命令不可变 + invert,不是数据形状)。 */
function st(): EditorState {
  return {
    manifest: {} as never,
    scenes: [
      {
        id: 's',
        map: {} as never,
        entry: {} as never,
        entities: [ent('a'), ent('b')],
        dialogues: [],
      },
    ],
    actors: [],
    skills: [],
    levelUp: {},
    items: [],
    locale: {},
    sprites: [{ id: 'li', spriteNum: 2, label: '李逍遥', layout: { kind: 'directional', framesPerDir: 3 } }],
    startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
  } as never
}

function stActor(): EditorState {
  const base = st() as EditorState & { actors: ActorDef[] }
  base.actors = [{ id: 'li', name: 'name.li', spriteId: 'li', portraits: { default: 1 } }]
  return base
}

const ids = (s: EditorState): string[] => s.scenes[0]!.entities.map((e) => e.id)
const ent0 = (s: EditorState): EntityDef => s.scenes[0]!.entities[0]!

describe('布置命令集 · 不可变 + invert', () => {
  // ── AddEntityCommand ───────────────────────────────────────
  test('AddEntity:追加到场景末尾 + 源不变;invert 移除该实体', () => {
    const s0 = st()
    const cmd = new AddEntityCommand('s', ent('c'))
    const s1 = cmd.apply(s0)

    expect(ids(s1)).toEqual(['a', 'b', 'c'])
    expect(ids(s0)).toEqual(['a', 'b']) // 源不变
    // 不可变:新 state / 新 scene 是独立对象(非原引用)
    expect(s1).not.toBe(s0)
    expect(s1.scenes[0]).not.toBe(s0.scenes[0])

    // invert 移除
    expect(ids(cmd.invert(s1))).toEqual(['a', 'b'])
  })

  // ── DeleteEntityCommand ────────────────────────────────────
  test('DeleteEntity:移除 + 源不变;invert 插回原索引(非末尾)', () => {
    const s0 = st()
    const cmd = new DeleteEntityCommand('s', 'a') // 删索引 0
    const s1 = cmd.apply(s0)

    expect(ids(s1)).toEqual(['b'])
    expect(ids(s0)).toEqual(['a', 'b']) // 源不变
    // invert:a 回到索引 0,不是追加到末尾
    expect(ids(cmd.invert(s1))).toEqual(['a', 'b'])
    expect(cmd.invert(s1).scenes[0]!.entities[0]!.id).toBe('a')
  })

  test('DeleteEntity:删中间项,invert 仍插回原位(保序)', () => {
    const s0 = st()
    s0.scenes[0]!.entities = [ent('a'), ent('b'), ent('c')]
    const cmd = new DeleteEntityCommand('s', 'b') // 删索引 1
    const s1 = cmd.apply(s0)

    expect(ids(s1)).toEqual(['a', 'c'])
    // invert:b 回到索引 1(原位)
    expect(ids(cmd.invert(s1))).toEqual(['a', 'b', 'c'])
  })

  // ── UpdateEntityCommand ────────────────────────────────────
  test('UpdateEntity:改 collide + 源不变;invert 还原旧值(缺省→undefined)', () => {
    const s0 = st()
    const cmd = new UpdateEntityCommand('s', 'a', { collide: true })
    const s1 = cmd.apply(s0)

    expect(s1.scenes[0]!.entities[0]!.collide).toBe(true)
    expect(s0.scenes[0]!.entities[0]!.collide).toBeUndefined() // 源不变
    expect(cmd.invert(s1).scenes[0]!.entities[0]!.collide).toBeUndefined()
  })

  test('UpdateEntity:已有值时 invert 还原成旧值(非 undefined)', () => {
    const s0 = st()
    s0.scenes[0]!.entities[0]!.collide = true
    const cmd = new UpdateEntityCommand('s', 'a', { collide: false })
    const s1 = cmd.apply(s0)

    expect(ent0(s1).collide).toBe(false)
    expect(cmd.invert(s1).scenes[0]!.entities[0]!.collide).toBe(true)
  })

  test('UpdateEntity:改 interact + facing 多字段,invert 还原各自旧值(C0:sprite 已移出 patch)', () => {
    const s0 = st()
    s0.scenes[0]!.entities[0]!.interact = 'old-talk'
    const cmd = new UpdateEntityCommand('s', 'a', { facing: 'left', interact: 'new-talk' })
    const s1 = cmd.apply(s0)

    expect(ent0(s1).facing).toBe('left')
    expect(ent0(s1).interact).toBe('new-talk')
    const back = cmd.invert(s1).scenes[0]!.entities[0]!
    expect(back.facing).toBeUndefined() // 旧 facing(未设 = undefined)
    expect(back.interact).toBe('old-talk') // 旧 interact
  })

  test('UpdateEntity:pos 不在 patch 范围 —— 不可变且不丢失', () => {
    const s0 = st()
    const cmd = new UpdateEntityCommand('s', 'a', { collide: true })
    const s1 = cmd.apply(s0)
    expect(ent0(s1).pos).toEqual({ col: 1, row: 1, height: 0 })
  })

  // ── UpdateSceneCommand ─────────────────────────────────────
  test('UpdateScene:改 paletteId + 源不变;invert 还原(缺省→undefined)', () => {
    const s0 = st()
    const cmd = new UpdateSceneCommand('s', { paletteId: 3 })
    const s1 = cmd.apply(s0)

    expect(s1.scenes[0]!.paletteId).toBe(3)
    expect(s0.scenes[0]!.paletteId).toBeUndefined() // 源不变
    expect(cmd.invert(s1).scenes[0]!.paletteId).toBeUndefined()
  })

  test('UpdateScene:已有 paletteId 时 invert 还原旧值', () => {
    const s0 = st()
    s0.scenes[0]!.paletteId = 1
    const cmd = new UpdateSceneCommand('s', { paletteId: 3 })
    const s1 = cmd.apply(s0)

    expect(s1.scenes[0]!.paletteId).toBe(3)
    expect(cmd.invert(s1).scenes[0]!.paletteId).toBe(1)
  })

  test('UpdateScene:改 entry;invert 还原旧 entry(深比较)', () => {
    const s0 = st()
    s0.scenes[0]!.entry = { pos: { col: 0, row: 0, height: 0 }, facing: 'down' }
    const cmd = new UpdateSceneCommand('s', {
      entry: { pos: { col: 9, row: 9, height: 0 }, facing: 'up' },
    })
    const s1 = cmd.apply(s0)

    expect(s1.scenes[0]!.entry).toEqual({ pos: { col: 9, row: 9, height: 0 }, facing: 'up' })
    expect(cmd.invert(s1).scenes[0]!.entry).toEqual({
      pos: { col: 0, row: 0, height: 0 },
      facing: 'down',
    })
  })

  // ── 场景隔离:不动其他场景 ─────────────────────────────────
  test('Add/Update 只动目标场景,旁场景引用不变', () => {
    const s0 = st()
    s0.scenes = [
      { id: 's', map: {} as never, entry: {} as never, entities: [ent('a')], dialogues: [] },
      { id: 'other', map: {} as never, entry: {} as never, entities: [ent('x')], dialogues: [] },
    ]
    const s1 = new AddEntityCommand('s', ent('b')).apply(s0)
    expect(s1.scenes[1]).toBe(s0.scenes[1]) // 旁场景同引用(未展开 = 未变)
    expect(s1.scenes[0]).not.toBe(s0.scenes[0])
  })

  // ── MoveEntity(回归:B0 已有,确认未回归)─────────────────
  test('MoveEntity(回归):改 pos + 源不变 + invert', () => {
    const s0 = st()
    const cmd = new MoveEntityCommand('s', 'a', { col: 5, row: 6, height: 0 })
    const s1 = cmd.apply(s0)

    expect(ent0(s1).pos).toEqual({ col: 5, row: 6, height: 0 })
    expect(ent0(s0).pos).toEqual({ col: 1, row: 1, height: 0 })
    expect(cmd.invert(s1).scenes[0]!.entities[0]!.pos).toEqual({ col: 1, row: 1, height: 0 })
  })

  // ── 防御:目标不存在时 noop(返回原 state)─────────────────
  test('防御:sceneId/entityId 不存在 → noop 返回原态', () => {
    const s0 = st()
    const a1 = new DeleteEntityCommand('s', 'nope').apply(s0)
    expect(a1).toBe(s0) // 同引用 = 未改
    const a2 = new UpdateEntityCommand('nope', 'a', { collide: true }).apply(s0)
    expect(a2).toBe(s0)
  })
})

describe('C1 命令 · UpdateSprite / UpdateActor(不可变 + invert)', () => {
  const sp = (s: EditorState): SpriteDef => s.sprites[0]!
  test('UpdateSprite layout:directional → loop,invert 还原;源不变', () => {
    const s0 = st()
    const cmd = new UpdateSpriteCommand('li', { layout: { kind: 'loop', frameCount: 4 } })
    const s1 = cmd.apply(s0)
    expect(sp(s1).layout).toEqual({ kind: 'loop', frameCount: 4 })
    expect(sp(s0).layout).toEqual({ kind: 'directional', framesPerDir: 3 }) // 源不变
    const s2 = cmd.invert(s1)
    expect(sp(s2).layout).toEqual({ kind: 'directional', framesPerDir: 3 }) // 还原
  })
  test('UpdateSprite poses:加命名姿势,invert 清回 undefined', () => {
    const s0 = st()
    const cmd = new UpdateSpriteCommand('li', { poses: { 摔倒: { frames: [12], mode: 'static' } } })
    const s1 = cmd.apply(s0)
    expect(sp(s1).poses).toEqual({ 摔倒: { frames: [12], mode: 'static' } })
    expect(sp(s0).poses).toBeUndefined()
    expect(sp(cmd.invert(s1)).poses).toBeUndefined()
  })
  test('UpdateActor name/portraits:改 + invert 还原', () => {
    const s0 = stActor()
    const cmd = new UpdateActorCommand('li', { name: 'name.new', portraits: { default: 1, expressions: { 愤怒: 55 } } })
    const s1 = cmd.apply(s0)
    expect(s1.actors[0]!.name).toBe('name.new')
    expect(s1.actors[0]!.portraits?.expressions).toEqual({ 愤怒: 55 })
    expect(s0.actors[0]!.name).toBe('name.li') // 源不变
    const s2 = cmd.invert(s1)
    expect(s2.actors[0]!.name).toBe('name.li')
    expect(s2.actors[0]!.portraits).toEqual({ default: 1 }) // 表情还原掉
  })
})
