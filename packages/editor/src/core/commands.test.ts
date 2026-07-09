import { describe, expect, test } from 'vitest'
import {
  AddEnemyCommand,
  CreateOwnMapCommand,
  CreateScriptSourceCommand,
  AddEntityCommand,
  DeleteEnemyCommand,
  DeleteEntityCommand,
  MoveEntityCommand,
  PaintTilesCommand,
  UpdateActorCommand,
  UpdateBattleFieldCommand,
  UpdateEntityCommand,
  UpdateLevelUpCommand,
  UpdateMusicNameCommand,
  UpdateSceneCommand,
  UpdateEnemyCommand,
  UpdateEnemyTeamsCommand,
  UpdateScriptCommand,
  UpdateSpriteCommand,
} from './commands.js'
import type { EditorState } from './edit-session.js'
import type { ActorDef, EntityDef, ScriptStage, SpriteDef } from '@type-pal/content'

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

  test('UpdateEntity:改 hidden + facing 多字段,invert 还原各自旧值(interact 已随 demo 旧路退役)', () => {
    const s0 = st()
    s0.scenes[0]!.entities[0]!.hidden = true
    const cmd = new UpdateEntityCommand('s', 'a', { facing: 'left', hidden: undefined })
    const s1 = cmd.apply(s0)

    expect(ent0(s1).facing).toBe('left')
    expect(ent0(s1).hidden).toBeUndefined() // 取消隐藏
    const back = cmd.invert(s1).scenes[0]!.entities[0]!
    expect(back.facing).toBeUndefined() // 旧 facing(未设 = undefined)
    expect(back.hidden).toBe(true) // 旧 hidden(曾漏记 captureOld,undo 不回 —— 钉住)
  })

  test('UpdateEntity:pos 不在 patch 范围 —— 不可变且不丢失', () => {
    const s0 = st()
    const cmd = new UpdateEntityCommand('s', 'a', { collide: true })
    const s1 = cmd.apply(s0)
    expect(ent0(s1).pos).toEqual({ col: 1, row: 1, height: 0 })
  })

  // ── UpdateSceneCommand ─────────────────────────────────────
  test('UpdateScene:改 musicId + 源不变;invert 还原(缺省→undefined)', () => {
    const s0 = st()
    const cmd = new UpdateSceneCommand('s', { musicId: 3 })
    const s1 = cmd.apply(s0)

    expect(s1.scenes[0]!.musicId).toBe(3)
    expect(s0.scenes[0]!.musicId).toBeUndefined() // 源不变
    expect(cmd.invert(s1).scenes[0]!.musicId).toBeUndefined()
  })

  test('UpdateScene:已有 musicId 时 invert 还原旧值', () => {
    const s0 = st()
    s0.scenes[0]!.musicId = 1
    const cmd = new UpdateSceneCommand('s', { musicId: 3 })
    const s1 = cmd.apply(s0)

    expect(s1.scenes[0]!.musicId).toBe(3)
    expect(cmd.invert(s1).scenes[0]!.musicId).toBe(1)
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
      { id: 's', map: {} as never, entry: {} as never, entities: [ent('a')] },
      { id: 'other', map: {} as never, entry: {} as never, entities: [ent('x')] },
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

describe('C-track v1 · UpdateScript(整 stages 替换 + invert)', () => {
  const stg = (t: string): ScriptStage[] => [{ body: [{ kind: 'dialog', line: { text: t } }] }]
  function stScript(): EditorState {
    const base = st()
    const scene = base.scenes[0]! as { onEnter?: ScriptStage[]; entities: EntityDef[] }
    scene.onEnter = stg('old')
    scene.entities[0] = {
      ...scene.entities[0]!,
      pages: [{ auto: { stages: stg('auto-old') } }],
    } as EntityDef
    return base
  }

  test('onEnter:替换 → invert 还原;源 state 不变', () => {
    const s0 = stScript()
    const cmd = new UpdateScriptCommand('s', { kind: 'onEnter' }, stg('new'))
    const s1 = cmd.apply(s0)
    expect((s1.scenes[0] as { onEnter?: ScriptStage[] }).onEnter).toEqual(stg('new'))
    expect((s0.scenes[0] as { onEnter?: ScriptStage[] }).onEnter).toEqual(stg('old'))
    const s2 = cmd.invert(s1)
    expect((s2.scenes[0] as { onEnter?: ScriptStage[] }).onEnter).toEqual(stg('old'))
  })

  test('实体 auto:替换 stages;旁实体同引用', () => {
    const s0 = stScript()
    const cmd = new UpdateScriptCommand('s', { kind: 'auto', entityId: 'a' }, stg('auto-new'))
    const s1 = cmd.apply(s0)
    const e0 = s1.scenes[0]!.entities[0]! as EntityDef
    expect(e0.pages?.[0]?.auto?.stages).toEqual(stg('auto-new'))
    expect(s1.scenes[0]!.entities[1]).toBe(s0.scenes[0]!.entities[1])
    const s2 = cmd.invert(s1)
    expect((s2.scenes[0]!.entities[0] as EntityDef).pages?.[0]?.auto?.stages).toEqual(stg('auto-old'))
  })

  test('源不存在(实体无 trigger 页)= no-op', () => {
    const s0 = stScript()
    const cmd = new UpdateScriptCommand('s', { kind: 'trigger', entityId: 'b' }, stg('x'))
    expect(cmd.apply(s0)).toBe(s0)
  })
})

describe('M4c-3 敌人命令(不可变 + invert)', () => {
  const mkE = (id: string): import('@type-pal/content').EnemyDef => ({
    id, name: `name.${id}`, spriteNum: 1,
    stats: { health: 10, level: 1, exp: 1, cash: 1, attackStrength: 5, magicStrength: 0, defense: 0, dexterity: 5, fleeRate: 0, physicalResistance: 0, poisonResistance: 0, elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 }, dualMove: false, collectValue: 0 },
    ai: { resistanceToSorcery: 5 },
    anim: { idleFrames: 1, magicFrames: 0, attackFrames: 1, idleAnimSpeed: 5, actWaitFrames: 0, yPosOffset: 0 },
    sounds: { attack: 0, action: 0, magic: 0, death: 0, call: 0 },
  })
  function stE(): EditorState {
    const base = st() as EditorState & { enemies: import('@type-pal/content').EnemyDef[]; enemyTeams: import('@type-pal/content').EnemyTeamDef[] }
    base.enemies = [mkE('enemy-1'), mkE('enemy-2')]
    base.enemyTeams = [{ id: 'team-1', members: ['enemy-1'] }]
    return base
  }
  test('UpdateEnemy:patch ai.rules,invert 还原;源不变', () => {
    const s0 = stE()
    const rules = [{ at: 'act' as const, do: { kind: 'divide' as const, copies: 1 } }]
    const cmd = new UpdateEnemyCommand('enemy-1', { ai: { resistanceToSorcery: 5, rules } })
    const s1 = cmd.apply(s0)
    expect(s1.enemies![0]!.ai.rules).toEqual(rules)
    expect(s0.enemies![0]!.ai.rules).toBeUndefined()
    expect(cmd.invert(s1).enemies![0]!.ai.rules).toBeUndefined()
  })
  test('Add/Delete:末尾增,原位删还原;Teams 整表替换可逆', () => {
    const s0 = stE()
    const add = new AddEnemyCommand(mkE('enemy-9'))
    const s1 = add.apply(s0)
    expect(s1.enemies!.map((e) => e.id)).toEqual(['enemy-1', 'enemy-2', 'enemy-9'])
    expect(add.invert(s1).enemies!.length).toBe(2)
    const del = new DeleteEnemyCommand('enemy-1')
    const s2 = del.apply(s0)
    expect(s2.enemies![0]!.id).toBe('enemy-2')
    expect(del.invert(s2).enemies![0]!.id).toBe('enemy-1')
    const t = new UpdateEnemyTeamsCommand([{ id: 'team-1', members: ['enemy-2'] }])
    const s3 = t.apply(s0)
    expect(s3.enemyTeams![0]!.members).toEqual(['enemy-2'])
    expect(t.invert(s3).enemyTeams![0]!.members).toEqual(['enemy-1'])
  })
})

describe('D24 战场命令(不可变 + invert)', () => {
  function stF(): EditorState {
    const base = st() as EditorState & {
      battleFields: import('@type-pal/content').BattleFieldDef[]
    }
    base.battleFields = [
      { id: 24, screenWave: 0, magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 } },
    ]
    return base
  }
  test('UpdateBattleField:patch name/magicEffect,invert 还原;源不变', () => {
    const s0 = stF()
    const cmd = new UpdateBattleFieldCommand(24, {
      name: '熔岩',
      magicEffect: { wind: 0, thunder: 0, water: -3, fire: 3, earth: 0 },
    })
    const s1 = cmd.apply(s0)
    expect(s1.battleFields![0]!.name).toBe('熔岩')
    expect(s1.battleFields![0]!.magicEffect.fire).toBe(3)
    expect(s0.battleFields![0]!.name).toBeUndefined() // 源不变
    const back = cmd.invert(s1)
    expect(back.battleFields![0]!.name).toBeUndefined() // name 清回未设
    expect(back.battleFields![0]!.magicEffect.fire).toBe(0)
  })
})

describe('W5 音乐(musicId patch + 音乐库别名)', () => {
  function stMusic(): EditorState {
    const base = st() as EditorState & { music: { id: number; name?: string }[] }
    base.music = [{ id: 1 }, { id: 31, name: '客栈' }]
    return base
  }

  test('UpdateScene musicId:设值/清 undefined,invert 还原「延续」语义', () => {
    const s0 = st()
    const c = new UpdateSceneCommand('s', { musicId: 31 })
    const s1 = c.apply(s0)
    expect(s1.scenes[0]!.musicId).toBe(31)
    expect(s0.scenes[0]!.musicId).toBeUndefined() // 源不变
    const back = c.invert(s1)
    expect(back.scenes[0]!.musicId).toBeUndefined() // 还原成「延续」
    // 清空:31 → undefined
    const c2 = new UpdateSceneCommand('s', { musicId: undefined })
    const s2 = c2.apply(s1)
    expect(s2.scenes[0]!.musicId).toBeUndefined()
    expect(c2.invert(s2).scenes[0]!.musicId).toBe(31)
  })

  test('UpdateMusicName:起名/invert 还原;源不变', () => {
    const s0 = stMusic()
    const c = new UpdateMusicNameCommand(1, '蝶恋')
    const s1 = c.apply(s0)
    expect((s1 as typeof s0).music![0]).toEqual({ id: 1, name: '蝶恋' })
    expect((s0 as typeof s0).music![0]).toEqual({ id: 1 }) // 源不变
    expect((c.invert(s1) as typeof s0).music![0]).toEqual({ id: 1 })
  })

  test('UpdateMusicName:空串 = 清名(键消失);invert 还原旧名', () => {
    const s0 = stMusic()
    const c = new UpdateMusicNameCommand(31, '')
    const s1 = c.apply(s0)
    expect((s1 as typeof s0).music![1]).toEqual({ id: 31 }) // name 键消失
    expect((c.invert(s1) as typeof s0).music![1]).toEqual({ id: 31, name: '客栈' })
  })

  test('UpdateMusicName:id 不存在 = no-op', () => {
    const s0 = stMusic()
    const c = new UpdateMusicNameCommand(99, 'x')
    expect(c.apply(s0)).toBe(s0)
  })
})

test('UpdateScene 回归:仅 musicId patch 不得把必填 entry 覆成 undefined', () => {
  const s0 = st()
  ;(s0.scenes[0] as { entry: unknown }).entry = { pos: { col: 1, row: 1, height: 0 }, facing: 'down' }
  const s1 = new UpdateSceneCommand('s', { musicId: 5 }).apply(s0)
  expect(s1.scenes[0]!.entry).toEqual({ pos: { col: 1, row: 1, height: 0 }, facing: 'down' })
  const s2 = new UpdateSceneCommand('s', { musicId: 31 }).apply(s1)
  expect(s2.scenes[0]!.entry.facing).toBe('down')
})

describe('B9 敌对行为 patch(hostile 整对象替换)', () => {
  test('UpdateEntity hostile:开敌对/invert 还原 undefined;源不变', () => {
    const s0 = st()
    const h = { team: 3, chase: { range: 6, speed: 2 }, respawnSeconds: 80 }
    const cmd = new UpdateEntityCommand('s', 'a', { hostile: h })
    const s1 = cmd.apply(s0)
    expect(ent0(s1).hostile).toEqual(h)
    expect(ent0(s1).hostile).not.toBe(h) // 深拷贝,非同引用
    expect(ent0(s0).hostile).toBeUndefined() // 源不变
    expect(ent0(cmd.invert(s1)).hostile).toBeUndefined()
  })

  test('UpdateEntity hostile:撤销敌对(undefined),invert 还原旧配置(深拷贝)', () => {
    const s0 = st()
    ent0(s0).hostile = { team: 1, chase: { range: 4, speed: 1 } }
    const cmd = new UpdateEntityCommand('s', 'a', { hostile: undefined })
    const s1 = cmd.apply(s0)
    expect(ent0(s1).hostile).toBeUndefined()
    expect(ent0(cmd.invert(s1)).hostile).toEqual({ team: 1, chase: { range: 4, speed: 1 } })
  })
})

test('W4 UpdateScene entries:增改删 + invert 深还原;空表传 undefined 清键', () => {
  const s0 = st()
  const es = { 'from-s2': { pos: { col: 3, row: 4, height: 0 }, facing: 'up' as const } }
  const c1 = new UpdateSceneCommand('s', { entries: es })
  const s1 = c1.apply(s0)
  expect(s1.scenes[0]!.entries).toEqual(es)
  expect(s1.scenes[0]!.entries).not.toBe(es) // 深拷贝
  expect(s0.scenes[0]!.entries).toBeUndefined() // 源不变
  expect(c1.invert(s1).scenes[0]!.entries).toBeUndefined()
  // 清空:undefined
  const c2 = new UpdateSceneCommand('s', { entries: undefined })
  const s2 = c2.apply(s1)
  expect(s2.scenes[0]!.entries).toBeUndefined()
  expect(c2.invert(s2).scenes[0]!.entries).toEqual(es)
})

describe('C6 升级学技能命令(levelUp 表)', () => {
  function stLv(): EditorState {
    const base = st()
    ;(base as { levelUp: Record<string, { level: number; skillId: string }[]> }).levelUp = {
      li: [{ level: 7, skillId: 's1' }],
    }
    return base
  }
  test('整列表替换 + invert 还原;源不变', () => {
    const s0 = stLv()
    const c = new UpdateLevelUpCommand('li', [
      { level: 7, skillId: 's1' },
      { level: 10, skillId: 's2' },
    ])
    const s1 = c.apply(s0)
    expect(s1.levelUp['li']).toHaveLength(2)
    expect(s0.levelUp['li']).toHaveLength(1) // 源不变
    expect(c.invert(s1).levelUp['li']).toEqual([{ level: 7, skillId: 's1' }])
  })
  test('空行 = 删角色键;invert 还原键', () => {
    const s0 = stLv()
    const c = new UpdateLevelUpCommand('li', [])
    const s1 = c.apply(s0)
    expect('li' in s1.levelUp).toBe(false)
    expect(c.invert(s1).levelUp['li']).toEqual([{ level: 7, skillId: 's1' }])
  })
  test('新角色键从无到有;invert 删回', () => {
    const s0 = stLv()
    const c = new UpdateLevelUpCommand('zhao', [{ level: 3, skillId: 's9' }])
    const s1 = c.apply(s0)
    expect(s1.levelUp['zhao']).toHaveLength(1)
    expect('zhao' in c.invert(s1).levelUp).toBe(false)
  })
})

describe('CreateScriptSourceCommand(断点 #5:空态创建)', () => {
  test('onEnter:创建空段;invert 删键;已存在 no-op', () => {
    const s0 = st()
    const c = new CreateScriptSourceCommand('s', { kind: 'onEnter' })
    const s1 = c.apply(s0)
    expect(s1.scenes[0]!.onEnter).toEqual([{ body: [] }])
    expect(s0.scenes[0]!.onEnter).toBeUndefined() // 源不变
    expect('onEnter' in c.invert(s1).scenes[0]!).toBe(false)
    // 已存在 → no-op
    const c2 = new CreateScriptSourceCommand('s', { kind: 'onEnter' })
    expect(c2.apply(s1)).toBe(s1)
  })
  test('trigger:无 pages 实体创建 pages[0].trigger(interact);invert 整 pages 删回', () => {
    const s0 = st()
    const c = new CreateScriptSourceCommand('s', { kind: 'trigger', entityId: 'a' })
    const s1 = c.apply(s0)
    expect(ent0(s1).pages?.[0]?.trigger).toEqual({ on: 'interact', stages: [{ body: [] }] })
    expect(ent0(s0).pages).toBeUndefined()
    expect(ent0(c.invert(s1)).pages).toBeUndefined() // 页空 → pages 键删回
  })
  test('auto:已有 trigger 的页上加 auto;invert 只删 auto 留 trigger', () => {
    const s0 = st()
    const s1 = new CreateScriptSourceCommand('s', { kind: 'trigger', entityId: 'a' }).apply(s0)
    const c = new CreateScriptSourceCommand('s', { kind: 'auto', entityId: 'a' })
    const s2 = c.apply(s1)
    expect(ent0(s2).pages?.[0]?.auto).toEqual({ stages: [{ body: [] }] })
    expect(ent0(s2).pages?.[0]?.trigger).toBeTruthy()
    const back = c.invert(s2)
    expect(ent0(back).pages?.[0]?.auto).toBeUndefined()
    expect(ent0(back).pages?.[0]?.trigger).toBeTruthy()
  })
})

describe('CreateOwnMapCommand(W7a-5)', () => {
  const stMap = (): EditorState =>
    ({
      ...st(),
      scenes: [
        {
          id: 's',
          map: { reuseOriginalMap: 20 },
          entry: { pos: { col: 5, row: 5, height: 0 }, facing: 'down' },
          entities: [],
        },
      ],
      maps: {},
    }) as never

  test('apply:场景转 own + entry 重置 + maps 存图;源不变', () => {
    const s0 = stMap()
    const tilemap = { width: 3, height: 3, cells: [], tileset: 'tileset/20.rle' }
    const cmd = new CreateOwnMapCommand('s', 'content/maps/s.json', tilemap as never, {
      col: 1,
      row: 2,
      height: 0,
    })
    const s1 = cmd.apply(s0)
    expect(s1.scenes[0]!.map).toEqual({ ownMap: 'content/maps/s.json' })
    expect(s1.scenes[0]!.entry.pos).toEqual({ col: 1, row: 2, height: 0 })
    expect(s1.maps['content/maps/s.json']).toEqual(tilemap)
    // 不可变:源 state 不动
    expect(s0.scenes[0]!.map).toEqual({ reuseOriginalMap: 20 })
    expect(s0.maps).toEqual({})
  })

  test('invert:还原 map/entry + 丢掉 maps 该键', () => {
    const s0 = stMap()
    const cmd = new CreateOwnMapCommand(
      's',
      'content/maps/s.json',
      { width: 3, height: 3, cells: [], tileset: 'tileset/20.rle' } as never,
      { col: 1, row: 2, height: 0 },
    )
    const s2 = cmd.invert(cmd.apply(s0))
    expect(s2.scenes[0]!.map).toEqual({ reuseOriginalMap: 20 })
    expect(s2.scenes[0]!.entry.pos).toEqual({ col: 5, row: 5, height: 0 })
    expect(s2.maps['content/maps/s.json']).toBeUndefined()
  })
})

describe('PaintTilesCommand(W7c)', () => {
  const rel = 'content/maps/s.json'
  const stPaint = (): EditorState => {
    const cells = Array.from({ length: 3 }, () =>
      Array.from({ length: 3 }, () => ({ lower: 0, upper: 0 })),
    )
    return { ...st(), maps: { [rel]: { width: 3, height: 3, cells, tileset: 't' } } } as never
  }

  test('apply:写子格;invert:还原旧 word;源 state 不动', () => {
    const s0 = stPaint()
    const cmd = new PaintTilesCommand(rel, [
      { col: 0, row: 0, h: 0, word: 5 },
      { col: 1, row: 0, h: 1, word: 9 },
    ])
    const s1 = cmd.apply(s0)
    expect(s1.maps[rel]!.cells[0]![0]).toEqual({ lower: 5, upper: 0 })
    expect(s1.maps[rel]!.cells[0]![1]).toEqual({ lower: 0, upper: 9 })
    expect(s0.maps[rel]!.cells[0]![0]).toEqual({ lower: 0, upper: 0 }) // 源不变
    const back = cmd.invert(s1)
    expect(back.maps[rel]!.cells[0]![0]).toEqual({ lower: 0, upper: 0 })
    expect(back.maps[rel]!.cells[0]![1]).toEqual({ lower: 0, upper: 0 })
  })

  test('同子格重复编辑:后者为准;undo 还原到 stroke 前(首见旧值)', () => {
    const s0 = stPaint()
    const c1 = new PaintTilesCommand(rel, [{ col: 0, row: 0, h: 0, word: 3 }])
    const s1 = c1.apply(s0)
    // 第二笔:同格先 7 后 8(拖动折返),apply 后 = 8;undo 回 3(不是 7)
    const c2 = new PaintTilesCommand(rel, [
      { col: 0, row: 0, h: 0, word: 7 },
      { col: 0, row: 0, h: 0, word: 8 },
    ])
    const s2 = c2.apply(s1)
    expect(s2.maps[rel]!.cells[0]![0]!.lower).toBe(8)
    expect(c2.invert(s2).maps[rel]!.cells[0]![0]!.lower).toBe(3)
  })

  test('地图不存在(rel 悬空)→ noop', () => {
    const s0 = stPaint()
    const cmd = new PaintTilesCommand('content/maps/ghost.json', [
      { col: 0, row: 0, h: 0, word: 5 },
    ])
    expect(cmd.apply(s0)).toBe(s0)
  })
})
