import type { ActorDef, EntityDef, ScriptStage, SpriteDef } from '@type-pal/content'
import { deriveScriptChunk, getScriptBody } from '@type-pal/content'
import { buildBlankOwnMap, buildOwnMapLayer, paintOwnMapTiles } from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import {
  AddAmbienceCommand,
  AddEnemyCommand,
  AddEntityCommand,
  AddOwnMapLayerCommand,
  AddPoisonCommand,
  AddSpriteCommand,
  AppendSpriteFramesCommand,
  CreateOwnMapCommand,
  CreateScriptSourceCommand,
  DeleteAuthoredScriptCommand,
  DeleteEnemyCommand,
  DeleteEntityCommand,
  MoveEntityCommand,
  MoveOwnMapLayerCommand,
  PaintCollisionCommand,
  PaintTilesCommand,
  RemoveOwnMapLayerCommand,
  RemoveSpriteCommand,
  RenameProjectCommand,
  ResizeOwnMapCommand,
  SetActorBattleSpriteCommand,
  SetEnemyBattleSpriteCommand,
  UpdateActorCommand,
  UpdateAmbienceCommand,
  UpdateBattleFieldCommand,
  UpdateEnemyCommand,
  UpdateEnemyTeamsCommand,
  UpdateEntityCommand,
  UpdateLevelUpCommand,
  UpdateMusicNameCommand,
  UpdateOwnMapLayerCommand,
  UpdatePoisonCommand,
  UpdateSceneCommand,
  UpdateScriptCommand,
  UpdateSharedScriptBodyCommand,
  UpdateSpriteCommand,
  UpsertAuthoredScriptCommand,
} from './commands.js'
import type { EditorState } from './edit-session.js'

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
    sprites: [
      { id: 'li', spriteNum: 2, label: '李逍遥', layout: { kind: 'directional', framesPerDir: 3 } },
    ],
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

describe('N6 共享脚本命令 · 原子状态 + invert', () => {
  const id = 'shared/user/demo-a1b2c3d4'

  test('首次创建原子补 manifest/index/chunk，invert 恢复无脚本工程', () => {
    const s0 = st()
    s0.scriptChunks = {}
    const cmd = new UpsertAuthoredScriptCommand(id, { name: '演示', self: 'none' }, [
      { kind: 'wait', ms: 100 },
    ])
    const s1 = cmd.apply(s0)
    expect(s1.manifest.content.scripts).toBe('content/scripts/')
    expect(s1.scriptIndex?.library?.[id]?.name).toBe('演示')
    expect(getScriptBody(s1.scriptIndex!, s1.scriptChunks, id)).toEqual([{ kind: 'wait', ms: 100 }])
    expect(s0.scriptIndex).toBeUndefined()
    const back = cmd.invert(s1)
    expect(back.scriptIndex).toBeUndefined()
    expect(back.scriptChunks).toEqual({})
    expect(back.manifest.content?.scripts).toBeUndefined()
  })

  test('内部/作者 body 更新统一归一化，invert 恢复旧体', () => {
    const create = new UpsertAuthoredScriptCommand(id, { name: '演示', self: 'none' }, [
      { kind: 'wait', ms: 100 },
    ])
    const s1 = create.apply(Object.assign(st(), { scriptChunks: {} }))
    const update = new UpdateSharedScriptBodyCommand(id, [{ kind: 'wait', ms: 200 }])
    const s2 = update.apply(s1)
    expect(getScriptBody(s2.scriptIndex!, s2.scriptChunks, id)).toEqual([{ kind: 'wait', ms: 200 }])
    const back = update.invert(s2)
    expect(getScriptBody(back.scriptIndex!, back.scriptChunks, id)).toEqual([
      { kind: 'wait', ms: 100 },
    ])
  })

  test('删除有调用方时阻止并列出来源；无引用时删除且可撤销', () => {
    const create = new UpsertAuthoredScriptCommand(id, { name: '演示', self: 'none' }, [
      { kind: 'wait', ms: 100 },
    ])
    const base = create.apply(Object.assign(st(), { scriptChunks: {} }))
    const chunk = deriveScriptChunk(id, base.scriptIndex!.shards)!
    const referenced: EditorState = {
      ...base,
      scenes: [
        { ...base.scenes[0]!, onEnter: [{ body: [{ kind: 'callScript', ref: { chunk, id } }] }] },
      ],
    }
    expect(() => new DeleteAuthoredScriptCommand(id).apply(referenced)).toThrow(/仍被 1 处引用/)

    const remove = new DeleteAuthoredScriptCommand(id)
    const deleted = remove.apply(base)
    expect(deleted.scriptIndex?.library?.[id]).toBeUndefined()
    expect(getScriptBody(deleted.scriptIndex!, deleted.scriptChunks, id)).toBeUndefined()
    const restored = remove.invert(deleted)
    expect(restored.scriptIndex?.library?.[id]?.name).toBe('演示')
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
    const cmd = new UpdateActorCommand('li', {
      name: 'name.new',
      portraits: { default: 1, expressions: { 愤怒: 55 } },
    })
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
    expect((s2.scenes[0]!.entities[0] as EntityDef).pages?.[0]?.auto?.stages).toEqual(
      stg('auto-old'),
    )
  })

  test('源不存在(实体无 trigger 页)= no-op', () => {
    const s0 = stScript()
    const cmd = new UpdateScriptCommand('s', { kind: 'trigger', entityId: 'b' }, stg('x'))
    expect(cmd.apply(s0)).toBe(s0)
  })
})

describe('M4c-3 敌人命令(不可变 + invert)', () => {
  const mkE = (id: string): import('@type-pal/content').EnemyDef => ({
    id,
    name: `name.${id}`,
    spriteNum: 1,
    stats: {
      health: 10,
      level: 1,
      exp: 1,
      cash: 1,
      attackStrength: 5,
      magicStrength: 0,
      defense: 0,
      dexterity: 5,
      fleeRate: 0,
      physicalResistance: 0,
      poisonResistance: 0,
      elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
      dualMove: false,
      collectValue: 0,
    },
    ai: { resistanceToSorcery: 5 },
    anim: {
      idleFrames: 1,
      magicFrames: 0,
      attackFrames: 1,
      idleAnimSpeed: 5,
      actWaitFrames: 0,
      yPosOffset: 0,
    },
    sounds: { attack: 0, action: 0, magic: 0, death: 0, call: 0 },
  })
  function stE(): EditorState {
    const base = st() as EditorState & {
      enemies: import('@type-pal/content').EnemyDef[]
      enemyTeams: import('@type-pal/content').EnemyTeamDef[]
    }
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

describe('A4 精灵上传命令(不可变 + invert;blob 暂存进 tilesetBlobs)', () => {
  const heroDef: SpriteDef = {
    id: 'my-hero',
    spriteNum: 600,
    label: '我的主角',
    layout: { kind: 'directional', framesPerDir: 3 },
    path: 'assets/sprites/my-hero.rle',
  }
  function stS(): EditorState {
    const base = st() as EditorState & { tilesetBlobs: Record<string, ArrayBuffer> }
    base.tilesetBlobs = {}
    return base
  }
  test('AddSprite:注册表追加 + 字节暂存到 path;invert 双清;源不变', () => {
    const s0 = stS()
    const blob = new ArrayBuffer(8)
    const cmd = new AddSpriteCommand(heroDef, blob)
    const s1 = cmd.apply(s0)
    expect(s1.sprites.map((s) => s.id)).toContain('my-hero')
    expect(s1.tilesetBlobs['assets/sprites/my-hero.rle']).toBe(blob)
    expect(s0.sprites.map((s) => s.id)).not.toContain('my-hero') // 源不变
    const back = cmd.invert(s1)
    expect(back.sprites.map((s) => s.id)).not.toContain('my-hero')
    expect(back.tilesetBlobs['assets/sprites/my-hero.rle']).toBeUndefined()
  })
  test('RemoveSprite:移除 + 清暂存;invert 插回原位带字节', () => {
    const s0 = new AddSpriteCommand(heroDef, new ArrayBuffer(8)).apply(stS())
    const cmd = new RemoveSpriteCommand('my-hero')
    const s1 = cmd.apply(s0)
    expect(s1.sprites.some((s) => s.id === 'my-hero')).toBe(false)
    expect(s1.tilesetBlobs['assets/sprites/my-hero.rle']).toBeUndefined()
    const back = cmd.invert(s1)
    expect(back.sprites[back.sprites.length - 1]?.id).toBe('my-hero') // 原位(末尾)
    expect(back.tilesetBlobs['assets/sprites/my-hero.rle']).toBeInstanceOf(ArrayBuffer)
  })
  test('AppendSpriteFrames:替换暂存字节;invert 回旧字节;无旧暂存(帧在盘)则删键回落读盘', () => {
    const path = 'assets/sprites/my-hero.rle'
    const prev = new ArrayBuffer(8)
    const merged = new ArrayBuffer(16)
    // 有暂存(未保存过的新精灵续帧):invert 回旧字节
    const s0 = new AddSpriteCommand(heroDef, prev).apply(stS())
    const cmd = new AppendSpriteFramesCommand(path, prev, merged)
    const s1 = cmd.apply(s0)
    expect(s1.tilesetBlobs[path]).toBe(merged)
    expect(s0.tilesetBlobs[path]).toBe(prev) // 源不变
    expect(cmd.invert(s1).tilesetBlobs[path]).toBe(prev)
    // 无暂存(帧在磁盘):apply 建键,invert 删键(引用回落读盘文件)
    const cmd2 = new AppendSpriteFramesCommand(path, undefined, merged)
    const s2 = cmd2.apply(stS())
    expect(s2.tilesetBlobs[path]).toBe(merged)
    expect(cmd2.invert(s2).tilesetBlobs[path]).toBeUndefined()
  })
})

describe('A4c 战斗外观命令(patch path + blob 一步 undo)', () => {
  function stB(): EditorState {
    const base = st() as EditorState & {
      enemies: import('@type-pal/content').EnemyDef[]
      tilesetBlobs: Record<string, ArrayBuffer>
      actors: ActorDef[]
    }
    base.tilesetBlobs = {}
    base.enemies = [
      {
        id: 'slime',
        name: 'n.slime',
        spriteNum: 42,
        stats: {} as never,
        ai: {} as never,
        anim: {} as never,
        sounds: {} as never,
      },
    ]
    base.actors = [
      {
        id: 'hero',
        name: 'n.hero',
        spriteId: 'hero',
        battler: { baseStats: {} as never, initialEquipment: {}, initialMagic: [] },
      },
      { id: 'npc', name: 'n.npc', spriteId: 'npc' }, // 无 battler
    ]
    return base
  }
  test('SetEnemyBattleSprite:spritePath + blob 双写;invert 双清(原无 path)', () => {
    const s0 = stB()
    const blob = new ArrayBuffer(4)
    const cmd = new SetEnemyBattleSpriteCommand(
      'slime',
      'assets/battle-sprites/enemy/slime.rle',
      blob,
    )
    const s1 = cmd.apply(s0)
    expect(s1.enemies![0]!.spritePath).toBe('assets/battle-sprites/enemy/slime.rle')
    expect(s1.tilesetBlobs['assets/battle-sprites/enemy/slime.rle']).toBe(blob)
    expect(s0.enemies![0]!.spritePath).toBeUndefined() // 源不变
    const back = cmd.invert(s1)
    expect('spritePath' in back.enemies![0]!).toBe(false)
    expect(back.tilesetBlobs['assets/battle-sprites/enemy/slime.rle']).toBeUndefined()
  })
  test('重传覆盖:invert 还原旧字节(同路径)', () => {
    const old = new ArrayBuffer(2)
    const s0 = stB()
    s0.enemies![0]!.spritePath = 'assets/battle-sprites/enemy/slime.rle'
    s0.tilesetBlobs['assets/battle-sprites/enemy/slime.rle'] = old
    const nw = new ArrayBuffer(8)
    const cmd = new SetEnemyBattleSpriteCommand(
      'slime',
      'assets/battle-sprites/enemy/slime.rle',
      nw,
    )
    const s1 = cmd.apply(s0)
    expect(s1.tilesetBlobs['assets/battle-sprites/enemy/slime.rle']).toBe(nw)
    const back = cmd.invert(s1)
    expect(back.tilesetBlobs['assets/battle-sprites/enemy/slime.rle']).toBe(old)
    expect(back.enemies![0]!.spritePath).toBe('assets/battle-sprites/enemy/slime.rle')
  })
  test('SetActorBattleSprite:battler.battleSpritePath;无 battler 角色 no-op', () => {
    const s0 = stB()
    const blob = new ArrayBuffer(4)
    const cmd = new SetActorBattleSpriteCommand(
      'hero',
      'assets/battle-sprites/player/hero.rle',
      blob,
    )
    const s1 = cmd.apply(s0)
    expect(s1.actors.find((a) => a.id === 'hero')?.battler?.battleSpritePath).toBe(
      'assets/battle-sprites/player/hero.rle',
    )
    const back = cmd.invert(s1)
    expect(back.actors.find((a) => a.id === 'hero')?.battler?.battleSpritePath).toBeUndefined()
    // 无 battler → no-op 同引用
    expect(new SetActorBattleSpriteCommand('npc', 'x.rle', blob).apply(s0)).toBe(s0)
  })
})

describe('W6 氛围命令(不可变 + invert)', () => {
  function stA(): EditorState {
    const base = st() as EditorState & { ambiences: import('@type-pal/content').AmbienceDef[] }
    base.ambiences = [
      { id: 'day', name: '白天', tint: [255, 255, 255] },
      { id: 'night', name: '夜晚', tint: [117, 229, 255] },
    ]
    return base
  }
  test('UpdateAmbience:调乘色,invert 还原;源不变', () => {
    const s0 = stA()
    const cmd = new UpdateAmbienceCommand('night', { tint: [100, 200, 255] })
    const s1 = cmd.apply(s0)
    expect(s1.ambiences![1]!.tint).toEqual([100, 200, 255])
    expect(s0.ambiences![1]!.tint).toEqual([117, 229, 255]) // 源不变
    expect(cmd.invert(s1).ambiences![1]!.tint).toEqual([117, 229, 255])
  })
  test('AddAmbience:追加恒等白;invert 移除;重复 id 不动', () => {
    const s0 = stA()
    const cmd = new AddAmbienceCommand('dusk', '黄昏')
    const s1 = cmd.apply(s0)
    expect(s1.ambiences).toHaveLength(3)
    expect(s1.ambiences![2]).toEqual({ id: 'dusk', name: '黄昏', tint: [255, 255, 255] })
    expect(cmd.invert(s1).ambiences).toHaveLength(2)
    expect(new AddAmbienceCommand('day', '重复').apply(s0)).toBe(s0)
  })
})

describe('B10 毒命令(不可变 + invert)', () => {
  function stP(): EditorState {
    const base = st() as EditorState & { poisons: import('@type-pal/content').PoisonDef[] }
    base.poisons = [
      { id: 551, name: '赤毒', curability: 'common', color: 16, playerTicks: [{ hpDelta: -7 }] },
      { id: 556, name: '鹤顶红', curability: 'severe', color: 160, lethalWith: 557, counters: 558 },
    ]
    return base
  }
  test('UpdatePoison:patch 名/ticks,invert 还原;源不变', () => {
    const s0 = stP()
    const cmd = new UpdatePoisonCommand(551, {
      name: '赤毒·改',
      playerTicks: [{ hpDelta: -9 }, { hpDelta: -18, selfCure: true }],
    })
    const s1 = cmd.apply(s0)
    expect(s1.poisons![0]!.name).toBe('赤毒·改')
    expect(s1.poisons![0]!.playerTicks).toHaveLength(2)
    expect(s0.poisons![0]!.name).toBe('赤毒') // 源不变
    expect(s0.poisons![0]!.playerTicks).toHaveLength(1)
    const back = cmd.invert(s1)
    expect(back.poisons![0]!.name).toBe('赤毒')
    expect(back.poisons![0]!.playerTicks).toEqual([{ hpDelta: -7 }])
  })
  test('UpdatePoison:patch undefined = 删键(清 lethalWith),invert 还原', () => {
    const s0 = stP()
    const cmd = new UpdatePoisonCommand(556, { lethalWith: undefined })
    const s1 = cmd.apply(s0)
    expect('lethalWith' in s1.poisons![1]!).toBe(false)
    expect(s1.poisons![1]!.counters).toBe(558) // 未 patch 的键不动
    const back = cmd.invert(s1)
    expect(back.poisons![1]!.lethalWith).toBe(557)
  })
  test('AddPoison:追加缺省毒;invert 移除;重复 id 不动', () => {
    const s0 = stP()
    const cmd = new AddPoisonCommand(1000, '试验毒')
    const s1 = cmd.apply(s0)
    expect(s1.poisons).toHaveLength(3)
    expect(s1.poisons![2]).toMatchObject({ id: 1000, name: '试验毒', curability: 'common' })
    expect(cmd.invert(s1).poisons).toHaveLength(2)
    // 重复 id:apply 原样返回
    const dup = new AddPoisonCommand(551, '重复')
    expect(dup.apply(s0)).toBe(s0)
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
  ;(s0.scenes[0] as { entry: unknown }).entry = {
    pos: { col: 1, row: 1, height: 0 },
    facing: 'down',
  }
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
    expect(s1.levelUp.li).toHaveLength(2)
    expect(s0.levelUp.li).toHaveLength(1) // 源不变
    expect(c.invert(s1).levelUp.li).toEqual([{ level: 7, skillId: 's1' }])
  })
  test('空行 = 删角色键;invert 还原键', () => {
    const s0 = stLv()
    const c = new UpdateLevelUpCommand('li', [])
    const s1 = c.apply(s0)
    expect('li' in s1.levelUp).toBe(false)
    expect(c.invert(s1).levelUp.li).toEqual([{ level: 7, skillId: 's1' }])
  })
  test('新角色键从无到有;invert 删回', () => {
    const s0 = stLv()
    const c = new UpdateLevelUpCommand('zhao', [{ level: 3, skillId: 's9' }])
    const s1 = c.apply(s0)
    expect(s1.levelUp.zhao).toHaveLength(1)
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

describe('CreateOwnMapCommand(W7D)', () => {
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
    const map = buildBlankOwnMap(3, 3, 'tileset/20.rle')
    const cmd = new CreateOwnMapCommand('s', 'content/maps/s.json', map, {
      col: 1,
      row: 2,
      height: 0,
    })
    const s1 = cmd.apply(s0)
    expect(s1.scenes[0]!.map).toEqual({ ownMap: 'content/maps/s.json' })
    expect(s1.scenes[0]!.entry.pos).toEqual({ col: 1, row: 2, height: 0 })
    expect(s1.maps['content/maps/s.json']).toEqual(map)
    // 不可变:源 state 不动
    expect(s0.scenes[0]!.map).toEqual({ reuseOriginalMap: 20 })
    expect(s0.maps).toEqual({})
  })

  test('invert:还原 map/entry + 丢掉 maps 该键', () => {
    const s0 = stMap()
    const cmd = new CreateOwnMapCommand(
      's',
      'content/maps/s.json',
      buildBlankOwnMap(3, 3, 'tileset/20.rle'),
      { col: 1, row: 2, height: 0 },
    )
    const s2 = cmd.invert(cmd.apply(s0))
    expect(s2.scenes[0]!.map).toEqual({ reuseOriginalMap: 20 })
    expect(s2.scenes[0]!.entry.pos).toEqual({ col: 5, row: 5, height: 0 })
    expect(s2.maps['content/maps/s.json']).toBeUndefined()
  })
})

describe('OwnMap v1 绘制与图层命令(W7D)', () => {
  const rel = 'content/maps/s.json'
  const stPaint = (): EditorState => {
    return { ...st(), maps: { [rel]: buildBlankOwnMap(3, 3, 't') } } as never
  }

  test('画瓦按稳定 layer.id 写入；invert 还原，源 state 不动', () => {
    const s0 = stPaint()
    const cmd = new PaintTilesCommand(rel, [
      { layerId: 'floor', col: 0, row: 0, tileId: 5 },
      { layerId: 'floor', col: 1, row: 1, tileId: 900 },
    ])
    const s1 = cmd.apply(s0)
    expect(s1.maps[rel]!.layers[0]?.tiles[0]?.[0]).toBe(5)
    expect(s1.maps[rel]!.layers[0]?.tiles[1]?.[1]).toBe(900)
    expect(s0.maps[rel]!.layers[0]?.tiles[0]?.[0]).toBeNull()
    const back = cmd.invert(s1)
    expect(back.maps[rel]!.layers[0]?.tiles[0]?.[0]).toBeNull()
    expect(back.maps[rel]!.layers[0]?.tiles[1]?.[1]).toBeNull()
  })

  test('同格重复编辑以后者为准；undo 回到 stroke 前', () => {
    const s0 = stPaint()
    const c1 = new PaintTilesCommand(rel, [{ layerId: 'floor', col: 0, row: 0, tileId: 3 }])
    const s1 = c1.apply(s0)
    const c2 = new PaintTilesCommand(rel, [
      { layerId: 'floor', col: 0, row: 0, tileId: 7 },
      { layerId: 'floor', col: 0, row: 0, tileId: 8 },
    ])
    const s2 = c2.apply(s1)
    expect(s2.maps[rel]!.layers[0]?.tiles[0]?.[0]).toBe(8)
    expect(c2.invert(s2).maps[rel]!.layers[0]?.tiles[0]?.[0]).toBe(3)
  })

  test('独立碰撞命令与视觉层正交并可撤销', () => {
    const s0 = stPaint()
    const painted = new PaintTilesCommand(rel, [
      { layerId: 'floor', col: 0, row: 0, tileId: 12 },
    ]).apply(s0)
    const cmd = new PaintCollisionCommand(rel, [{ col: 0, row: 0, value: 1 }])
    const s1 = cmd.apply(painted)
    expect(s1.maps[rel]!.collision[0]?.[0]).toBe(1)
    expect(s1.maps[rel]!.layers[0]?.tiles[0]?.[0]).toBe(12)
    const back = cmd.invert(s1)
    expect(back.maps[rel]!.collision[0]?.[0]).toBe(0)
    expect(back.maps[rel]!.layers[0]?.tiles[0]?.[0]).toBe(12)
  })

  test('图层新增、重排、属性更新、删除均 apply/invert', () => {
    const s0 = stPaint()
    const layer = buildOwnMapLayer(s0.maps[rel]!, 'objects', '物件')
    const add = new AddOwnMapLayerCommand(rel, layer)
    const s1 = add.apply(s0)
    expect(s1.maps[rel]!.layers.map((item) => item.id)).toEqual(['floor', 'objects'])

    const move = new MoveOwnMapLayerCommand(rel, 'objects', 0)
    const s2 = move.apply(s1)
    expect(s2.maps[rel]!.layers.map((item) => item.id)).toEqual(['objects', 'floor'])
    expect(move.invert(s2).maps[rel]!.layers.map((item) => item.id)).toEqual(['floor', 'objects'])

    const update = new UpdateOwnMapLayerCommand(rel, 'objects', {
      name: '遮挡物',
      occlude: true,
    })
    const s3 = update.apply(s2)
    expect(s3.maps[rel]!.layers[0]).toMatchObject({ name: '遮挡物', occlude: true })
    expect(update.invert(s3).maps[rel]!.layers[0]).toMatchObject({ name: '物件', occlude: false })

    const remove = new RemoveOwnMapLayerCommand(rel, 'objects')
    const s4 = remove.apply(s3)
    expect(s4.maps[rel]!.layers.map((item) => item.id)).toEqual(['floor'])
    expect(remove.invert(s4).maps[rel]!.layers.map((item) => item.id)).toEqual(['objects', 'floor'])
    expect(add.invert(s1).maps[rel]!.layers.map((item) => item.id)).toEqual(['floor'])
  })

  test('地图不存在(rel 悬空)→ noop', () => {
    const s0 = stPaint()
    const cmd = new PaintTilesCommand('content/maps/ghost.json', [
      { layerId: 'floor', col: 0, row: 0, tileId: 5 },
    ])
    expect(cmd.apply(s0)).toBe(s0)
  })
})

describe('ResizeOwnMapCommand(W7c-4)', () => {
  const stMap = (): EditorState => {
    const base = st() as EditorState & { maps: Record<string, unknown> }
    let map = buildBlankOwnMap(3, 3, 't')
    map = paintOwnMapTiles(map, [{ layerId: 'floor', col: 2, row: 5, tileId: 7 }])
    base.maps = { 'content/maps/s.json': map }
    return base
  }

  test('裁剪后 invert 整图还原(被裁内容精确回来);源不变', () => {
    const s0 = stMap()
    const cmd = new ResizeOwnMapCommand('content/maps/s.json', 2, 2)
    const s1 = cmd.apply(s0)
    const m1 = s1.maps['content/maps/s.json']!
    expect(m1.width).toBe(2)
    expect(m1.layers[0]!.tiles.length).toBe(4)
    // 源不变
    expect(s0.maps['content/maps/s.json']!.width).toBe(3)
    // invert 整图还原,被裁 tileId=7 回来
    const back = cmd.invert(s1).maps['content/maps/s.json']!
    expect(back.width).toBe(3)
    expect(back.layers[0]!.tiles[5]![2]).toBe(7)
  })

  test('尺寸不变 → noop 原引用;redo 稳定', () => {
    const s0 = stMap()
    expect(new ResizeOwnMapCommand('content/maps/s.json', 3, 3).apply(s0)).toBe(s0)
    const cmd = new ResizeOwnMapCommand('content/maps/s.json', 4, 4)
    const s1 = cmd.apply(s0)
    const s2 = cmd.apply(cmd.invert(s1)) // undo → redo
    expect(s2.maps['content/maps/s.json']!.width).toBe(4)
    expect(s2.maps['content/maps/s.json']!.layers[0]!.tiles[5]![2]).toBe(7)
  })
})

describe('RenameProjectCommand', () => {
  test('改显示名不动 id;invert 还原;源不变', () => {
    const s0 = st()
    s0.manifest = { id: 'pal', name: '旧名' } as never
    const cmd = new RenameProjectCommand('新名')
    const s1 = cmd.apply(s0)
    expect((s1.manifest as { name: string }).name).toBe('新名')
    expect((s1.manifest as { id: string }).id).toBe('pal')
    expect((s0.manifest as { name: string }).name).toBe('旧名') // 源不变
    const back = cmd.invert(s1)
    expect((back.manifest as { name: string }).name).toBe('旧名')
  })
})
