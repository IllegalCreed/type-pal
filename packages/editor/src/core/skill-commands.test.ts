import { validateSkills } from '@type-pal/content'
import { expect, test } from 'vitest'
import { loadBoundaryProject } from './__tests__/cursor-command-boundary-fixtures.js'
import { AddSkillCommand, DeleteSkillCommand, UpdateSkillCommand } from './commands.js'
import { EditSession } from './edit-session.js'
import { collectCurrentProjectReferenceIndex } from './project-reference-adapters.js'

async function sessionWithSkills(ids: readonly string[] = []): Promise<EditSession> {
  const { state } = await loadBoundaryProject('skill-history')
  const session = new EditSession(state)
  for (const id of ids) session.dispatch(new AddSkillCommand(id, id))
  return session
}

test('new skill is a valid damage spell and a duplicate adds no history', async () => {
  const session = await sessionWithSkills()
  const initial = session.getState().skills
  expect(session.dispatch(new AddSkillCommand('bolt', '雷击'))).toBe(true)
  const next = session.getState()
  expect(next.skills.at(-1)?.effects).toEqual([{ kind: 'damage', power: 20, elemental: 0 }])
  validateSkills({ skills: next.skills, levelUp: next.levelUp })
  expect(session.dispatch(new AddSkillCommand('bolt', '重复'))).toBe(false)
  expect(session.undo()).toBe(true)
  expect(session.getState().skills).toEqual(initial)
})

test('edit clears an optional lifetime limit and undo restores it without touching other skills', async () => {
  const session = await sessionWithSkills(['fire', 'bolt'])
  session.dispatch(new UpdateSkillCommand('bolt', { lifetimeLimit: 3 }))
  const fire = session.getState().skills.find(({ id }) => id === 'fire')
  const bolt = () => session.getState().skills.find(({ id }) => id === 'bolt')!

  expect(
    session.dispatch(new UpdateSkillCommand('bolt', { lifetimeLimit: undefined, desc: '震击' })),
  ).toBe(true)
  expect(Object.hasOwn(bolt(), 'lifetimeLimit')).toBe(false)
  expect(bolt().desc).toBe('震击')
  expect(session.getState().skills.find(({ id }) => id === 'fire')).toBe(fire)
  validateSkills({ skills: session.getState().skills, levelUp: session.getState().levelUp })
  expect(session.undo()).toBe(true)
  expect(bolt()).toMatchObject({ id: 'bolt', lifetimeLimit: 3, desc: '' })
  expect(session.redo()).toBe(true)
  expect(Object.hasOwn(bolt(), 'lifetimeLimit')).toBe(false)
})

test('missing skill update preserves the working copy and the earlier undo entry', async () => {
  const session = await sessionWithSkills(['bolt'])
  const initial = session.getState()
  expect(session.dispatch(new UpdateSkillCommand('missing', { name: '不存在' }))).toBe(false)
  expect(session.getState()).toBe(initial)
  expect(session.undo()).toBe(true)
  expect(session.getState().skills.some(({ id }) => id === 'bolt')).toBe(false)
})

test('undo returns a deleted middle definition to its original location', async () => {
  const session = await sessionWithSkills(['fire', 'bolt', 'mist'])
  const before = session.getState().skills
  expect(
    session.dispatch(new DeleteSkillCommand('bolt', collectCurrentProjectReferenceIndex)),
  ).toBe(true)
  expect(session.getState().skills.map(({ id }) => id)).toEqual(
    before.map(({ id }) => id).filter((id) => id !== 'bolt'),
  )
  expect(session.undo()).toBe(true)
  expect(session.getState().skills).toEqual(before)
  expect(session.redo()).toBe(true)
  expect(session.getState().skills.some(({ id }) => id === 'bolt')).toBe(false)
})

test('inverse deletion refuses a skill ID now owned by another definition', async () => {
  const session = await sessionWithSkills(['bolt'])
  const command = new DeleteSkillCommand('bolt', collectCurrentProjectReferenceIndex)
  const removed = command.apply(session.getState())
  const occupied = new AddSkillCommand('bolt', '占位').apply(removed)
  expect(() => command.invert(occupied)).toThrow(/^无法撤销删除：技能 id 已被占用 bolt$/)
  expect(occupied.skills.at(-1)?.name).toBe('占位')
  expect(command.invert(removed).skills).toEqual(session.getState().skills)
})
