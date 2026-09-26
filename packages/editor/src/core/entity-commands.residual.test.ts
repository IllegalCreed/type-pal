/**
 * TEST-CURSOR-COMMAND-BOUNDARIES-3：实体命令残项。
 */
import type { EntityDef } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  loadBoundaryProject,
  withSharedWorldSprite,
} from './__tests__/cursor-command-boundary-fixtures.js'
import { EditSession } from './edit-session.js'
import { AddEntityCommand, SetEntitySpriteCommand, UpdateEntityCommand } from './entity-commands.js'
import { assertProjectSaveValid } from './project-diagnostics.js'

describe('实体命令残项', () => {
  test('AddEntity 构造后改入参不泄漏；SetEntitySprite 可 undo/redo 换 sprite', async () => {
    const { source, state: loaded } = await loadBoundaryProject('entity-residual-sprite')
    const state = await withSharedWorldSprite(source, loaded, 'crate')
    const session = new EditSession(state)
    const neighborActor = state.actors[0]
    const entity: EntityDef = {
      id: 'prop-chest',
      pos: { col: 3, row: 3, height: 0 },
      sprite: 'crate',
    }
    const add = new AddEntityCommand('start', entity)
    entity.sprite = 'mutated-after-construct'
    entity.pos.col = 99
    expect(session.dispatch(add)).toBe(true)
    const added = session.getState().scenes[0]!.entities.find((entry) => entry.id === 'prop-chest')!
    expect(added).toMatchObject({ sprite: 'crate', pos: { col: 3, row: 3, height: 0 } })
    expect(session.getState().actors[0]).toBe(neighborActor)
    expect(() => assertProjectSaveValid(session.getState())).not.toThrow()

    const setSprite = new SetEntitySpriteCommand('start', 'prop-chest', 'hero')
    expect(session.dispatch(setSprite)).toBe(true)
    expect(
      session.getState().scenes[0]!.entities.find((entry) => entry.id === 'prop-chest'),
    ).toMatchObject({ sprite: 'hero' })
    expect(session.getState().actors[0]).toBe(neighborActor)
    expect(session.undo()).toBe(true)
    expect(
      session.getState().scenes[0]!.entities.find((entry) => entry.id === 'prop-chest'),
    ).toMatchObject({ sprite: 'crate' })
    expect(session.redo()).toBe(true)
    expect(
      session.getState().scenes[0]!.entities.find((entry) => entry.id === 'prop-chest'),
    ).toMatchObject({ sprite: 'hero' })
  })

  test('SetEntitySprite 对 actor 实例是现行 no-op（同引用）', async () => {
    const { state } = await loadBoundaryProject('entity-residual-actor-noop')
    const withActor = new AddEntityCommand('start', {
      id: 'hero-instance',
      pos: { col: 1, row: 1, height: 0 },
      actor: 'hero',
    }).apply(state)
    expect(new SetEntitySpriteCommand('start', 'hero-instance', 'hero').apply(withActor)).toBe(
      withActor,
    )
  })

  test('UpdateEntity facing 对触发区抛无朝向，输入态不变', async () => {
    const { state } = await loadBoundaryProject('entity-residual-zone')
    const withZone = new AddEntityCommand('start', {
      id: 'gate',
      pos: { col: 4, row: 4, height: 0 },
      zone: true,
    }).apply(state)
    const snapshot = structuredClone(withZone)
    expect(() =>
      new UpdateEntityCommand('start', 'gate', { facing: 'down' }).apply(withZone),
    ).toThrow(/触发区 .* 无朝向/)
    expect(withZone).toEqual(snapshot)
  })

  test('AddEntity：构造后改 entity，apply 仍用 clone', async () => {
    const { source, state: loaded } = await loadBoundaryProject('entity-residual-clone')
    const state = await withSharedWorldSprite(source, loaded, 'vase')
    const session = new EditSession(state)
    const neighborScene = state.scenes[0]
    const entity: EntityDef = {
      id: 'prop-vase',
      pos: { col: 5, row: 1, height: 0 },
      sprite: 'vase',
    }
    const add = new AddEntityCommand('start', entity)
    entity.id = 'leaked'
    entity.sprite = 'leaked-sprite'
    expect(session.dispatch(add)).toBe(true)
    expect(() => assertProjectSaveValid(session.getState())).not.toThrow()
    const ids = session.getState().scenes[0]!.entities.map((entry) => entry.id)
    expect(ids).toEqual(['prop-vase'])
    expect(session.getState().scenes[0]!.entities[0]).toMatchObject({ sprite: 'vase' })
    expect(state.scenes[0]).toBe(neighborScene)
    expect(session.undo()).toBe(true)
    expect(session.getState().scenes[0]!.entities).toEqual([])
    expect(session.redo()).toBe(true)
    expect(session.getState().scenes[0]!.entities[0]).toMatchObject({
      id: 'prop-vase',
      sprite: 'vase',
    })
  })
})
