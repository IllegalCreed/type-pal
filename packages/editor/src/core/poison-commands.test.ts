import { validatePoisons } from '@type-pal/content'
import { expect, test } from 'vitest'
import { loadBoundaryProject } from './__tests__/cursor-command-boundary-fixtures.js'
import { AddPoisonCommand, DeletePoisonCommand, UpdatePoisonCommand } from './commands.js'
import { EditSession } from './edit-session.js'
import type { PoisonPatch } from './poison-commands.js'
import { collectCurrentProjectReferenceIndex } from './project-reference-adapters.js'

async function sessionWithPoisons(ids: readonly number[] = []): Promise<EditSession> {
  const { state } = await loadBoundaryProject('poison-history')
  const session = new EditSession({ ...state, poisons: undefined })
  for (const id of ids) session.dispatch(new AddPoisonCommand(id, `毒${id}`))
  return session
}

test('first poison owns valid default ticks and duplicate creation never enters history', async () => {
  const session = await sessionWithPoisons()
  expect(session.dispatch(new AddPoisonCommand(551, '赤毒'))).toBe(true)
  expect(validatePoisons(session.getState().poisons)).toEqual([
    {
      id: 551,
      name: '赤毒',
      curability: 'common',
      color: 0,
      playerTicks: [{ hpDelta: -10 }],
      enemyTicks: [{ hpDelta: -10 }],
    },
  ])
  expect(session.dispatch(new AddPoisonCommand(551, '重复'))).toBe(false)
  expect(session.undo()).toBe(true)
  expect(session.getState().poisons).toEqual([])
})

test('editing ticks captures the caller buffer and restores only the original optional fields', async () => {
  const session = await sessionWithPoisons([551, 556])
  session.dispatch(new UpdatePoisonCommand(551, { lethalWith: 556 }))
  const before = session.getState().poisons
  const patch: PoisonPatch = {
    playerTicks: [{ hpDelta: -77 }],
    lethalWith: undefined,
    counters: undefined,
  }
  const command = new UpdatePoisonCommand(551, patch)
  patch.playerTicks![0]!.hpDelta = -999
  expect(session.dispatch(command)).toBe(true)
  const poison = () => session.getState().poisons?.find(({ id }) => id === 551)!
  expect(poison().playerTicks).toEqual([{ hpDelta: -77 }])
  expect(Object.hasOwn(poison(), 'lethalWith')).toBe(false)
  expect(Object.hasOwn(poison(), 'counters')).toBe(false)
  validatePoisons(session.getState().poisons)
  expect(session.undo()).toBe(true)
  expect(session.getState().poisons).toEqual(before)
  expect(Object.hasOwn(poison(), 'counters')).toBe(false)
  expect(session.redo()).toBe(true)
  expect(poison().playerTicks).toEqual([{ hpDelta: -77 }])
})

test('missing poison update and deletion leave an optional table absent with no undo entry', async () => {
  const session = await sessionWithPoisons()
  const before = session.getState()
  expect(session.dispatch(new UpdatePoisonCommand(551, { name: '不存在' }))).toBe(false)
  expect(session.dispatch(new DeletePoisonCommand(551, collectCurrentProjectReferenceIndex))).toBe(
    false,
  )
  expect(session.getState()).toBe(before)
  expect(session.undo()).toBe(false)
})

test('undo returns a deleted poison to its original middle position', async () => {
  const session = await sessionWithPoisons([551, 556, 557])
  const before = session.getState().poisons
  expect(session.dispatch(new DeletePoisonCommand(556, collectCurrentProjectReferenceIndex))).toBe(
    true,
  )
  expect(session.getState().poisons?.map(({ id }) => id)).toEqual([551, 557])
  expect(session.undo()).toBe(true)
  expect(session.getState().poisons).toEqual(before)
  expect(session.redo()).toBe(true)
  expect(session.getState().poisons?.map(({ id }) => id)).toEqual([551, 557])
})

test('reversing deletion rejects an ID now owned by a different poison', async () => {
  const session = await sessionWithPoisons([551])
  const remove = new DeletePoisonCommand(551, collectCurrentProjectReferenceIndex)
  const removed = remove.apply(session.getState())
  const occupied = new AddPoisonCommand(551, '占位').apply(removed)
  expect(() => remove.invert(occupied)).toThrow(/^无法撤销删除：毒 id 已被占用 551$/)
  expect(occupied.poisons?.[0]?.name).toBe('占位')
  expect(remove.invert(removed).poisons).toEqual(session.getState().poisons)
})
