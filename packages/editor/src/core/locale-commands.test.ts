import { validateLocale } from '@type-pal/content'
import { expect, test } from 'vitest'
import { loadBoundaryProject } from './__tests__/cursor-command-boundary-fixtures.js'
import { UpdateLocaleCommand } from './commands.js'
import { EditSession } from './edit-session.js'

test.each([
  { caseName: 'a fresh key', textBefore: undefined },
  { caseName: 'an existing empty translation', textBefore: '' },
])('undo restores the locale table after editing $caseName', async ({ textBefore }) => {
  const { state } = await loadBoundaryProject('locale-undo')
  const key = 'constructor'
  const original = {
    ...state.locale,
    ...(textBefore === undefined ? {} : { [key]: textBefore }),
  }
  validateLocale(original)
  const session = new EditSession({ ...state, locale: original })

  expect(session.dispatch(new UpdateLocaleCommand(key, '新名称'))).toBe(true)
  expect(session.getState().locale).toEqual({ ...original, [key]: '新名称' })
  expect(session.undo()).toBe(true)
  const restored = session.getState().locale
  expect(Object.hasOwn(restored, key)).toBe(textBefore !== undefined)
  expect(restored).toEqual(original)
  validateLocale(restored)

  expect(session.redo()).toBe(true)
  expect(session.getState().locale[key]).toBe('新名称')
})
