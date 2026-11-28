import { type ActorDef, type EntityDef, resolveEntitySpriteId } from '@type-pal/content'
import { expect, test } from 'vitest'
import {
  loadBoundaryProject,
  withSharedEnemyBattleSprite,
  withSharedWorldSprite,
} from './__tests__/cursor-command-boundary-fixtures.js'
import {
  ActorInUseError,
  AddActorCommand,
  CopyActorCommand,
  DeleteActorCommand,
  DetachActorEntityCommand,
  SetActorBattleSpriteCommand,
  UpdateActorCommand,
} from './actor-commands.js'
import { CompositeCommand } from './composite-command.js'
import { EditSession } from './edit-session.js'
import { AddEntityCommand, MoveEntityCommand } from './entity-commands.js'
import { UpdateLevelUpCommand } from './level-up-commands.js'
import { UpdateLocaleCommand } from './locale-commands.js'
import { assertProjectSaveValid } from './project-diagnostics.js'
import { collectCurrentProjectReferenceIndex } from './project-reference-adapters.js'
import { AddSkillCommand } from './skill-commands.js'

const resident: ActorDef = { id: 'resident', name: 'name.hero', spriteId: 'hero' }
const learning = { level: 3, skillId: 'step' }

async function projectSession(): Promise<EditSession> {
  const { state } = await loadBoundaryProject()
  return new EditSession(state)
}

function addLearning(session: EditSession, actorId: string): void {
  session.dispatch(new AddSkillCommand(learning.skillId, '入门步'))
  session.dispatch(new UpdateLevelUpCommand(actorId, [learning]))
}

test('creation registers the actor and their display text in one history step', async () => {
  const session = await projectSession()
  const draft = { ...resident, name: 'name.resident' }
  const command = new CompositeCommand('创建人物', [
    new UpdateLocaleCommand(draft.name, '店员'),
    new AddActorCommand(draft),
  ])
  draft.spriteId = 'missing'

  expect(session.dispatch(command)).toBe(true)
  expect(session.getState().actors.at(-1)).toEqual({ ...resident, name: 'name.resident' })
  expect(session.getState().locale['name.resident']).toBe('店员')
  expect(session.getHistoryVersion()).toBe(1)
  assertProjectSaveValid(session.getState())
  expect(session.undo()).toBe(true)
  expect(session.getState().actors.map(({ id }) => id)).toEqual(['hero'])
  expect(session.getState().locale).not.toHaveProperty('name.resident')
  expect(session.redo()).toBe(true)
  expect(session.getState().locale['name.resident']).toBe('店员')
})

test('a missing sprite rolls back the whole creation including its proposed text', async () => {
  const session = await projectSession()
  const original = session.getState()
  const command = new CompositeCommand('创建人物', [
    new UpdateLocaleCommand('name.resident', '店员'),
    new AddActorCommand({ ...resident, name: 'name.resident', spriteId: 'missing' }),
  ])

  expect(() => session.dispatch(command)).toThrow('默认精灵不存在')
  expect(session.getState()).toBe(original)
  expect(session.getState().locale).not.toHaveProperty('name.resident')
  expect(session.canUndo()).toBe(false)
})

test.each([
  { patch: { id: '' }, reason: '人物 id 必须' },
  { patch: { name: ' name.hero ' }, reason: '人物 name 必须' },
  { patch: { id: 'hero' }, reason: '人物 id 已存在' },
  { patch: { name: 'name.missing' }, reason: '名称文本不存在或为空' },
  { patch: { name: 'constructor' }, reason: '名称文本不存在或为空' },
  { patch: { face: 'portrait.missing' }, reason: '小头像资源不存在或类型错误' },
])('actor creation rejects $patch with its authoring diagnostic', async ({ patch, reason }) => {
  const session = await projectSession()
  const original = session.getState()
  expect(() => session.dispatch(new AddActorCommand({ ...resident, ...patch }))).toThrow(reason)
  expect(session.getState()).toBe(original)
  expect(session.canUndo()).toBe(false)
})

test('copy shares authored assets and owns an independent learning history', async () => {
  const session = await projectSession()
  addLearning(session, 'hero')
  const source = session.getState().actors[0]
  expect(session.dispatch(new CopyActorCommand('hero', 'replica', 'name.hero'))).toBe(true)
  const copied = session.getState()

  expect(copied.actors.at(-1)).toEqual({ ...source, id: 'replica' })
  expect(copied.levelUp.replica).toEqual([learning])
  expect(copied.levelUp.replica).not.toBe(copied.levelUp.hero)
  assertProjectSaveValid(copied)
  expect(session.undo()).toBe(true)
  expect(session.getState().levelUp).not.toHaveProperty('replica')
  expect(session.redo()).toBe(true)
  expect(session.getState().levelUp.replica).toEqual([learning])
})

test('a duplicate copy rolls back a new locale key and its associated learning rows', async () => {
  const session = await projectSession()
  addLearning(session, 'hero')
  session.dispatch(new AddActorCommand(resident))
  const original = session.getState()
  const version = session.getHistoryVersion()

  expect(() =>
    session.dispatch(
      new CompositeCommand('复制人物', [
        new UpdateLocaleCommand('name.replica', '副本'),
        new CopyActorCommand('hero', 'resident', 'name.replica'),
      ]),
    ),
  ).toThrow('人物 id 已存在')
  expect(session.getState()).toBe(original)
  expect(session.getState().locale).not.toHaveProperty('name.replica')
  expect(session.getState().levelUp).not.toHaveProperty('resident')
  expect(session.getHistoryVersion()).toBe(version)
})

test('actor deletion removes owned rows and restores them in the original catalog slot', async () => {
  const session = await projectSession()
  session.dispatch(new AddActorCommand(resident))
  addLearning(session, resident.id)
  const before = session.getState()

  const deleteResident = new DeleteActorCommand(resident.id, collectCurrentProjectReferenceIndex)
  expect(session.dispatch(deleteResident)).toBe(true)
  expect(session.getState().actors.map(({ id }) => id)).toEqual(['hero'])
  expect(session.getState().levelUp).not.toHaveProperty(resident.id)
  expect(session.undo()).toBe(true)
  expect(session.getState().actors).toEqual(before.actors)
  expect(session.getState().levelUp[resident.id]).toEqual([learning])
  expect(session.redo()).toBe(true)
  expect(session.getState().levelUp).not.toHaveProperty(resident.id)
})

test('deletion and redo reject a real incoming scene reference without modifying history', async () => {
  const session = await projectSession()
  session.dispatch(new AddActorCommand(resident))
  const unreferenced = session.getState()
  const withResident = new AddEntityCommand('start', {
    id: 'shopkeeper',
    actor: resident.id,
    pos: { col: 5, row: 0, height: 0 },
  }).apply(unreferenced)
  assertProjectSaveValid(withResident)
  let current = withResident
  const command = new DeleteActorCommand(resident.id, () =>
    collectCurrentProjectReferenceIndex(current),
  )
  const version = session.getHistoryVersion()

  expect(() => session.dispatch(command)).toThrow(/场景 start · 实体 shopkeeper/)
  expect(session.getHistoryVersion()).toBe(version)
  expect(session.getState()).toBe(unreferenced)
  current = unreferenced
  expect(
    session.dispatch(
      new DeleteActorCommand(resident.id, () => collectCurrentProjectReferenceIndex(current)),
    ),
  ).toBe(true)
  expect(session.undo()).toBe(true)
  current = withResident
  expect(() => session.redo()).toThrow(ActorInUseError)
  expect(session.getState().actors.some(({ id }) => id === resident.id)).toBe(true)
  expect(session.canRedo()).toBe(true)
})

test('missing deletion targets skip lookup and a failing reference provider cannot publish state', async () => {
  const session = await projectSession()
  session.dispatch(new AddActorCommand(resident))
  const before = session.getState()
  const version = session.getHistoryVersion()
  const provider = () => {
    throw new Error('reference index unavailable')
  }

  expect(session.dispatch(new DeleteActorCommand('missing', provider))).toBe(false)
  expect(() => session.dispatch(new DeleteActorCommand(resident.id, provider))).toThrow(
    'reference index unavailable',
  )
  expect(session.getState()).toBe(before)
  expect(session.getHistoryVersion()).toBe(version)
})

test('detaching an actor replaces only the instance appearance binding', async () => {
  const session = await projectSession()
  session.dispatch(new AddActorCommand(resident))
  const source: EntityDef = {
    id: 'counter',
    actor: resident.id,
    pos: { col: 5, row: 0, height: 0 },
    facing: 'left',
    collide: true,
    hidden: true,
    zBias: 7,
  }
  session.dispatch(new AddEntityCommand('start', source))
  assertProjectSaveValid(session.getState())

  expect(session.dispatch(new DetachActorEntityCommand('start', source.id))).toBe(true)
  const { actor: _actor, ...instance } = source
  expect(session.getState().scenes[0]?.entities).toEqual([{ ...instance, sprite: 'hero' }])
  expect(session.undo()).toBe(true)
  expect(session.getState().scenes[0]?.entities).toEqual([source])
  expect(session.redo()).toBe(true)
  expect(session.getState().scenes[0]?.entities).toEqual([{ ...instance, sprite: 'hero' }])
})

test('instances follow changes to the shared actor sprite and retain their positions', async () => {
  const { source, state } = await loadBoundaryProject()
  const session = new EditSession(await withSharedWorldSprite(source, state, 'costume'))
  session.dispatch(new AddActorCommand(resident))
  session.dispatch(
    new AddEntityCommand('start', {
      id: 'west',
      actor: resident.id,
      pos: { col: 5, row: 0, height: 0 },
    }),
  )
  session.dispatch(
    new AddEntityCommand('start', {
      id: 'east',
      actor: resident.id,
      pos: { col: 6, row: 0, height: 0 },
      facing: 'right',
    }),
  )
  assertProjectSaveValid(session.getState())

  expect(session.dispatch(new UpdateActorCommand(resident.id, { spriteId: 'costume' }))).toBe(true)
  expect(
    session.dispatch(new MoveEntityCommand('start', 'west', { col: 4, row: 0, height: 0 })),
  ).toBe(true)
  const current = session.getState()
  const byId = Object.fromEntries(current.actors.map((actor) => [actor.id, actor]))
  expect(current.scenes[0]?.entities.map((entity) => resolveEntitySpriteId(entity, byId))).toEqual([
    'costume',
    'costume',
  ])
  expect(current.scenes[0]?.entities.map(({ pos }) => pos)).toEqual([
    { col: 4, row: 0, height: 0 },
    { col: 6, row: 0, height: 0 },
  ])
  expect(current.scenes[0]?.entities.find(({ id }) => id === 'east')?.facing).toBe('right')
})

test('bad actor resources and relationships are rejected before entering history', async () => {
  const { source, state } = await loadBoundaryProject()
  const session = new EditSession(await withSharedEnemyBattleSprite(source, state, 'enemy-shape'))
  const before = session.getState()
  const battler = before.actors[0]?.battler
  if (!battler) throw new Error('blank project hero has no battler')

  expect(() => session.dispatch(new UpdateActorCommand('hero', { spriteId: 'missing' }))).toThrow(
    '默认精灵不存在',
  )
  expect(() =>
    session.dispatch(new UpdateActorCommand('hero', { portraits: { default: 'missing' } })),
  ).toThrow('默认立绘资源不存在')
  expect(() => session.dispatch(new UpdateActorCommand('hero', { face: 'missing-face' }))).toThrow(
    '小头像资源不存在或类型错误',
  )
  expect(() =>
    session.dispatch(
      new UpdateActorCommand('hero', { battler: { ...battler, battleSprite: 'missing' } }),
    ),
  ).toThrow('战斗精灵不存在')
  expect(() =>
    session.dispatch(
      new UpdateActorCommand('hero', { battler: { ...battler, coveredBy: 'ghost' } }),
    ),
  ).toThrow('援护者不存在')
  expect(() => session.dispatch(new SetActorBattleSpriteCommand('hero', 'enemy-shape'))).toThrow(
    '只能引用 player-fighter',
  )
  expect(session.getState()).toBe(before)
  expect(session.canUndo()).toBe(false)
})

test('deleting an actor owns self-cover and learning entries, but cannot remove an incoming reference', async () => {
  const session = await projectSession()
  session.dispatch(new CopyActorCommand('hero', resident.id, resident.name))
  addLearning(session, resident.id)
  const battler = session.getState().actors[0]?.battler
  if (!battler) throw new Error('blank project hero has no battler')

  const remove = () => new DeleteActorCommand(resident.id, collectCurrentProjectReferenceIndex)
  session.dispatch(
    new UpdateActorCommand(resident.id, { battler: { ...battler, coveredBy: resident.id } }),
  )
  expect(session.dispatch(remove())).toBe(true)
  expect(session.getState().levelUp).not.toHaveProperty(resident.id)
  expect(session.undo()).toBe(true)
  expect(session.getState().levelUp[resident.id]).toEqual([learning])
  session.dispatch(
    new UpdateActorCommand('hero', { battler: { ...battler, coveredBy: resident.id } }),
  )

  expect(() => session.dispatch(remove())).toThrow(ActorInUseError)
  expect(session.getState().actors.map(({ id }) => id)).toEqual(['hero', resident.id])
  expect(session.getState().levelUp[resident.id]).toEqual([learning])
})

test('adding a battler rejects unregistered sprite and cover references independently', async () => {
  const session = await projectSession()
  const original = session.getState()
  const battler = original.actors[0]?.battler
  if (!battler) throw new Error('blank project hero has no battler')

  expect(() =>
    session.dispatch(
      new AddActorCommand({ ...resident, battler: { ...battler, battleSprite: 'missing' } }),
    ),
  ).toThrow('战斗精灵不存在')
  expect(() =>
    session.dispatch(
      new AddActorCommand({ ...resident, battler: { ...battler, coveredBy: 'ghost' } }),
    ),
  ).toThrow('援护者不存在')
  expect(session.getState()).toBe(original)
  expect(session.canUndo()).toBe(false)
})
