import {
  type BattleFieldDef,
  DEFAULT_BATTLE_FIELD_ID,
  validateBattleFields,
} from '@type-pal/content'
import { expect, test } from 'vitest'
import { loadBoundaryProject } from './__tests__/cursor-command-boundary-fixtures.js'
import {
  AddBattleFieldCommand,
  BATTLE_FIELDS_PATH,
  CopyBattleFieldCommand,
  DeleteBattleFieldCommand,
  nextBattleFieldId,
  UpdateBattleFieldCommand,
} from './battle-field-commands.js'
import { EditSession } from './edit-session.js'
import { collectCurrentProjectReferenceIndex } from './project-reference-adapters.js'

const field = (id: number): BattleFieldDef => ({
  id,
  screenWave: 0,
  magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
})

test('allocates after the greatest ID and rejects an exhausted safe-integer range', () => {
  expect(nextBattleFieldId([])).toBe(DEFAULT_BATTLE_FIELD_ID)
  expect(nextBattleFieldId([field(97), field(24)])).toBe(98)
  expect(() => nextBattleFieldId(validateBattleFields([field(Number.MAX_SAFE_INTEGER)]))).toThrow(
    '已超出安全整数范围',
  )
})

test('first creation captures nested definitions and undoes the table declaration', async () => {
  const { state } = await loadBoundaryProject()
  const session = new EditSession(state)
  const draft = field(25)
  const command = new AddBattleFieldCommand(draft)
  draft.magicEffect.fire = 2

  expect(session.dispatch(command)).toBe(true)
  expect(session.getState().battleFields).toEqual([field(25)])
  expect(session.getState().manifest.content.battleFields).toBe(BATTLE_FIELDS_PATH)
  expect(session.undo()).toBe(true)
  expect(session.getState().battleFields).toEqual([])
  expect(session.getState().manifest.content.battleFields).toBeUndefined()
  expect(session.redo()).toBe(true)
  expect(session.getState().battleFields).toEqual([field(25)])
})

test('undo restores the removed label and nested element values after a valid patch', async () => {
  const { state } = await loadBoundaryProject()
  const session = new EditSession(state)
  const original = { ...field(25), name: '山洞' }
  session.dispatch(new AddBattleFieldCommand(original))
  const magicEffect = { ...original.magicEffect, fire: 3 }
  const command = new UpdateBattleFieldCommand(25, { name: undefined, magicEffect })
  magicEffect.water = 5

  expect(session.dispatch(command)).toBe(true)
  const current = session.getState().battleFields?.[0]
  expect(current).not.toHaveProperty('name')
  expect(current?.magicEffect).toEqual({ ...original.magicEffect, fire: 3 })
  expect(session.undo()).toBe(true)
  expect(session.getState().battleFields).toEqual([original])
  expect(session.redo()).toBe(true)
  expect(session.getState().battleFields?.[0]).toEqual(current)
})

test('an absent target blocks copying and leaves update and deletion outside history', async () => {
  const { state } = await loadBoundaryProject()
  const session = new EditSession(state)
  session.dispatch(new AddBattleFieldCommand(field(25)))
  const historyVersion = session.getHistoryVersion()

  expect(() => session.dispatch(new CopyBattleFieldCommand(51, 52))).toThrow(
    '复制失败：找不到战场 51',
  )
  expect(session.dispatch(new UpdateBattleFieldCommand(51, { name: '山洞' }))).toBe(false)
  expect(
    session.dispatch(new DeleteBattleFieldCommand(51, collectCurrentProjectReferenceIndex)),
  ).toBe(false)
  expect(session.getHistoryVersion()).toBe(historyVersion)
  expect(session.getState().battleFields).toEqual([field(25)])
})
