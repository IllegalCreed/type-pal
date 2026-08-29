import type { ActorDef, EntityDef, SpriteDef } from '@type-pal/content'
import { resolveEntitySpriteId } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  AddActorCommand,
  CompositeCommand,
  CopyActorCommand,
  DeleteActorCommand,
  DetachActorEntityCommand,
  MoveEntityCommand,
  UpdateActorCommand,
  UpdateLocaleCommand,
} from './commands.js'
import { type EditorState, EditSession } from './edit-session.js'

const sprite: SpriteDef = {
  id: 'sprite.hero',
  label: '主角精灵',
  asset: 'asset.sprite.hero',
  layout: { kind: 'directional', framesPerDir: 3 },
}

function state(actors: ActorDef[] = []): EditorState {
  return {
    manifest: {
      id: 'actor-crud',
      name: 'actor crud',
      contentVersion: 19,
      defaultEntryId: 'main',
      content: {},
      assets: { catalog: 'assets/index.json', roles: {} },
      entryPoints: [
        {
          id: 'main',
          label: '主要入口',
          scene: 's',
          startWorld: { party: [], money: 0, inventory: [] },
        },
      ],
    },
    scenes: [
      {
        id: 's',
        mapId: 'map-s',
        entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        entities: [],
      },
    ],
    actors,
    skills: [],
    levelUp: {},
    items: [],
    locale: {},
    sprites: [sprite],
    battleSprites: [],
    maps: {},
    mapIndex: { version: 1, maps: [] },
    stamps: [],
    tilesetBlobs: {},
    scriptChunks: {},
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
  } as unknown as EditorState
}

function actor(id = 'hero', name = 'name.hero'): ActorDef {
  return { id, name, spriteId: sprite.id }
}

describe('人物 CRUD 与解除关联', () => {
  test('空白项目以 locale + Actor 单事务创建第一人，undo/redo 对称且默认无 levelUp', () => {
    const session = new EditSession(state())
    const command = new CompositeCommand('创建人物', [
      new UpdateLocaleCommand('name.hero', '主角'),
      new AddActorCommand(actor()),
    ])
    expect(session.dispatch(command)).toBe(true)
    expect(session.getState().actors).toEqual([actor()])
    expect(session.getState().locale['name.hero']).toBe('主角')
    expect(session.getState().levelUp.hero).toBeUndefined()
    expect(session.undo()).toBe(true)
    expect(session.getState().actors).toEqual([])
    expect(session.getState().locale['name.hero']).toBeUndefined()
    expect(session.redo()).toBe(true)
    expect(session.getState().actors).toEqual([actor()])
  })

  test('创建失败不会留下半条 locale，且冲突/空 id/悬空 sprite fail-loud', () => {
    const session = new EditSession(state())
    expect(() =>
      session.dispatch(
        new CompositeCommand('坏人物', [
          new UpdateLocaleCommand('name.bad', '坏人物'),
          new AddActorCommand({ id: 'bad', name: 'name.bad', spriteId: 'missing' }),
        ]),
      ),
    ).toThrow(/默认精灵不存在/)
    expect(session.getState().locale['name.bad']).toBeUndefined()
    expect(session.getState().actors).toEqual([])

    const withHero = { ...state([actor()]), locale: { 'name.hero': '主角', 'name.copy': '复制' } }
    expect(() => new AddActorCommand(actor()).apply(withHero)).toThrow(/id 已存在/)
    expect(() =>
      new AddActorCommand({ id: '', name: 'name.copy', spriteId: sprite.id }).apply(withHero),
    ).toThrow(/id 必须/)
  })

  test('复制人物深拷贝定义与 levelUp；共享资产只保留引用', () => {
    const current = state([actor()])
    current.locale = { 'name.hero': '主角' }
    current.levelUp = { hero: [{ level: 3, skillId: 'skill.fire' }] }
    const session = new EditSession(current)
    const command = new CompositeCommand('复制人物', [
      new UpdateLocaleCommand('name.hero-copy', '主角副本'),
      new CopyActorCommand('hero', 'hero-copy', 'name.hero-copy'),
    ])
    session.dispatch(command)
    const copied = session.getState().actors[1]!
    expect(copied).toEqual({ ...actor(), id: 'hero-copy', name: 'name.hero-copy' })
    expect(copied.spriteId).toBe(actor().spriteId)
    expect(session.getState().levelUp['hero-copy']).toEqual([{ level: 3, skillId: 'skill.fire' }])
    expect(session.getState().levelUp['hero-copy']).not.toBe(current.levelUp.hero)
    session.getState().levelUp.hero![0]!.level = 99
    expect(session.getState().levelUp['hero-copy']![0]!.level).toBe(3)
    session.undo()
    expect(session.getState().actors.map((entry) => entry.id)).toEqual(['hero'])
    expect(session.getState().levelUp['hero-copy']).toBeUndefined()
    session.redo()
    expect(session.getState().levelUp['hero-copy']![0]!.level).toBe(3)
  })

  test('复制事务失败时不留下 locale 或 levelUp 半状态', () => {
    const current = state([actor(), actor('hero-copy', 'name.existing')])
    current.locale = { 'name.hero': '主角', 'name.existing': '已有角色' }
    current.levelUp = { hero: [{ level: 3, skillId: 'skill.fire' }] }
    const session = new EditSession(current)
    expect(() =>
      session.dispatch(
        new CompositeCommand('复制人物', [
          new UpdateLocaleCommand('name.hero-copy', '主角副本'),
          new CopyActorCommand('hero', 'hero-copy', 'name.hero-copy'),
        ]),
      ),
    ).toThrow(/id 已存在/)
    expect(session.getState().locale['name.hero-copy']).toBeUndefined()
    expect(session.getState().levelUp['hero-copy']).toBeUndefined()
    expect(session.getState().actors).toEqual([actor(), actor('hero-copy', 'name.existing')])
    expect(session.canUndo()).toBe(false)
  })

  test('删除未引用人物同步清理 levelUp，undo/redo 精确恢复', () => {
    const current = state([actor()])
    current.locale = { 'name.hero': '主角' }
    current.levelUp = { hero: [{ level: 2, skillId: 'skill' }] }
    const session = new EditSession(current)
    session.dispatch(new DeleteActorCommand('hero'))
    expect(session.getState().actors).toEqual([])
    expect(session.getState().levelUp.hero).toBeUndefined()
    session.undo()
    expect(session.getState().actors).toEqual([actor()])
    expect(session.getState().levelUp.hero).toEqual([{ level: 2, skillId: 'skill' }])
    session.redo()
    expect(session.getState().actors).toEqual([])
  })

  test('删除被场景实例引用的人物 fail-loud 且无半删除', () => {
    const current = state([actor()])
    current.locale = { 'name.hero': '主角' }
    current.scenes[0]!.entities = [{ id: 'e', pos: { col: 1, row: 1, height: 0 }, actor: 'hero' }]
    expect(() => new DeleteActorCommand('hero').apply(current)).toThrow(/场景 s \/ 实体 e/)
    expect(current.actors).toEqual([actor()])
  })

  test('DeleteActor 在动作边界读取 current author 新引用', () => {
    const shell = state([actor()])
    const currentAuthor = structuredClone(shell)
    currentAuthor.scenes[0]!.entities = [
      { id: 'live', pos: { col: 1, row: 1, height: 0 }, actor: 'hero' },
    ]
    expect(() => new DeleteActorCommand('hero', () => currentAuthor).apply(shell)).toThrow(
      /场景 s \/ 实体 live/,
    )
    expect(() => new DeleteActorCommand('hero', () => undefined).apply(shell)).toThrow(
      /无法读取当前作者态引用/,
    )
  })

  test('解除人物关联只替换 actor→sprite，所有实例字段与行为保持并可 undo/redo', () => {
    const source: EntityDef = {
      id: 'npc',
      actor: 'hero',
      pos: { col: 4, row: 5, height: 0 },
      facing: 'left',
      collide: true,
      hidden: true,
      zBias: 7,
      pages: [{ state: 2 }],
      hostile: {
        enemyTeamId: 'team-1',
        chase: { range: 3, speed: 2, floating: true },
      },
    }
    const current = state([actor()])
    current.locale = { 'name.hero': '主角' }
    current.scenes[0]!.entities = [source]
    const session = new EditSession(current)
    session.dispatch(new DetachActorEntityCommand('s', 'npc'))
    const detached = session.getState().scenes[0]!.entities[0]!
    expect(detached).toEqual({
      id: 'npc',
      sprite: 'sprite.hero',
      pos: { col: 4, row: 5, height: 0 },
      facing: 'left',
      collide: true,
      hidden: true,
      zBias: 7,
      pages: [{ state: 2 }],
      hostile: {
        enemyTeamId: 'team-1',
        chase: { range: 3, speed: 2, floating: true },
      },
    })
    session.undo()
    expect(session.getState().scenes[0]!.entities[0]).toEqual(source)
    session.redo()
    expect(session.getState().scenes[0]!.entities[0]).toEqual(detached)
  })

  test('两个场景共享人物资源，但位置与脚本仍各自属于实例', () => {
    const current = state([actor()])
    current.locale = { 'name.hero': '主角' }
    current.sprites.push({ ...sprite, id: 'sprite.hero.next', label: '新形象' })
    current.scenes = [
      {
        ...current.scenes[0]!,
        id: 'a',
        entities: [{ id: 'one', actor: 'hero', pos: { col: 1, row: 1, height: 0 }, pages: [{}] }],
      },
      {
        ...current.scenes[0]!,
        id: 'b',
        entities: [
          { id: 'two', actor: 'hero', pos: { col: 8, row: 8, height: 0 }, pages: [{ state: 2 }] },
        ],
      },
    ]
    const session = new EditSession(current)
    session.dispatch(new UpdateActorCommand('hero', { spriteId: 'sprite.hero.next' }))
    const actorsById = Object.fromEntries(
      session.getState().actors.map((entry) => [entry.id, entry]),
    )
    expect(resolveEntitySpriteId(session.getState().scenes[0]!.entities[0]!, actorsById)).toBe(
      'sprite.hero.next',
    )
    expect(resolveEntitySpriteId(session.getState().scenes[1]!.entities[0]!, actorsById)).toBe(
      'sprite.hero.next',
    )
    session.dispatch(new MoveEntityCommand('a', 'one', { col: 2, row: 3, height: 0 }))
    expect(session.getState().scenes[0]!.entities[0]!.pos).toEqual({ col: 2, row: 3, height: 0 })
    expect(session.getState().scenes[1]!.entities[0]!.pos).toEqual({ col: 8, row: 8, height: 0 })
    expect(session.getState().scenes[1]!.entities[0]!.pages).toEqual([{ state: 2 }])
  })

  test('编辑人物引用在提交前校验，失败时不产生历史或半更新', () => {
    const current = state([actor()])
    current.locale = { 'name.hero': '主角' }
    const session = new EditSession(current)
    expect(() => session.dispatch(new UpdateActorCommand('hero', { spriteId: 'missing' }))).toThrow(
      /默认精灵不存在/,
    )
    expect(session.getState().actors).toEqual([actor()])
    expect(session.canUndo()).toBe(false)
    expect(() =>
      session.dispatch(
        new UpdateActorCommand('hero', {
          portraits: { default: 'portrait.missing' },
        }),
      ),
    ).toThrow(/默认立绘资源不存在/)
    expect(session.getState().actors).toEqual([actor()])
    expect(session.canUndo()).toBe(false)
  })
})
