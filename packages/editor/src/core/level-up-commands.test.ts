import { expect, test } from 'vitest'
import { loadBoundaryProject } from './__tests__/cursor-command-boundary-fixtures.js'
import { AddActorCommand, CopyActorCommand, DeleteActorCommand } from './actor-commands.js'
import { EditSession } from './edit-session.js'
import { UpdateLevelUpCommand } from './level-up-commands.js'
import { assertProjectSaveValid } from './project-diagnostics.js'
import { collectCurrentProjectReferenceIndex } from './project-reference-adapters.js'
import { AddSkillCommand } from './skill-commands.js'

const actorId = 'constructor'
const firstRow = { level: 2, skillId: 'learn-step' }

async function actorSession(): Promise<EditSession> {
  const { state } = await loadBoundaryProject()
  const session = new EditSession(state)
  session.dispatch(new AddActorCommand({ id: actorId, name: 'name.hero', spriteId: 'hero' }))
  session.dispatch(new AddSkillCommand(firstRow.skillId, '踏步'))
  assertProjectSaveValid(session.getState())
  return session
}

test('creates a real upgrade entry on an actor whose ID previously had no rows', async () => {
  const session = await actorSession()
  expect(Object.hasOwn(session.getState().levelUp, actorId)).toBe(false)
  const draft = [{ ...firstRow }]
  const command = new UpdateLevelUpCommand(actorId, draft)
  draft[0]!.level = 12

  expect(() => session.dispatch(command)).not.toThrow()
  expect(Object.entries(session.getState().levelUp)).toEqual([[actorId, [firstRow]]])
  assertProjectSaveValid(session.getState())
  expect(session.undo()).toBe(true)
  expect(Object.hasOwn(session.getState().levelUp, actorId)).toBe(false)
  expect(session.redo()).toBe(true)
  expect(Object.entries(session.getState().levelUp)).toEqual([[actorId, [firstRow]]])
})

test('copies a legal actor without inventing an unregistered upgrade entry', async () => {
  const session = await actorSession()
  const command = new CopyActorCommand(actorId, 'second', 'name.hero')

  expect(() => session.dispatch(command)).not.toThrow()
  expect(session.getState().actors.map(({ id }) => id)).toEqual(['hero', actorId, 'second'])
  expect(Object.entries(session.getState().levelUp)).toEqual([])
  expect(session.undo()).toBe(true)
  expect(session.getState().actors.some(({ id }) => id === 'second')).toBe(false)
})

test('deletes a legal unreferenced actor and restores their absent entry on undo', async () => {
  const session = await actorSession()
  const command = new DeleteActorCommand(actorId, collectCurrentProjectReferenceIndex)

  expect(() => session.dispatch(command)).not.toThrow()
  expect(session.getState().actors.map(({ id }) => id)).toEqual(['hero'])
  expect(session.undo()).toBe(true)
  expect(session.getState().actors.map(({ id }) => id)).toEqual(['hero', actorId])
  expect(Object.entries(session.getState().levelUp)).toEqual([])
})

test('removing the last learning row undoes back to the exact registered rows', async () => {
  const { state } = await loadBoundaryProject()
  const session = new EditSession(state)
  session.dispatch(new AddSkillCommand(firstRow.skillId, '踏步'))
  session.dispatch(new UpdateLevelUpCommand('hero', [firstRow]))
  expect(session.dispatch(new UpdateLevelUpCommand('hero', []))).toBe(true)
  expect(session.getState().levelUp).not.toHaveProperty('hero')
  expect(session.undo()).toBe(true)
  expect(session.getState().levelUp.hero).toEqual([firstRow])
})
