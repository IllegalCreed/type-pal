// @vitest-environment jsdom
import type { AuthorCommand } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { choose, click, commandForm, input, row } from './__tests__/command-form-current-fixture.js'

const transition = {
  kind: 'source',
  outMs: 80,
  inMs: 120,
  color: 'black',
  evidenceId: 'fixture.transition',
} as const
describe('Current scene destination aggregate', () => {
  test('retargeting through the dialog clears old entry and preserves facing and source timing', async () => {
    const f = await commandForm({
      kind: 'loadScene',
      scene: 'start',
      entryId: 'back',
      facing: 'up',
      transition,
    })
    await choose('目标场景', 'other')
    await f.finish({ kind: 'loadScene', scene: 'other', facing: 'up', transition })
  })
  test('named mode chooses the first actual entry then permits another named destination', async () => {
    const f = await commandForm({
      kind: 'loadScene',
      scene: 'start',
      pos: { col: 2, row: 4, height: 0 },
      transition,
    })
    await click('命名')
    expect(row('命名落点').textContent).toContain('正门')
    await choose('命名落点', '后门')
    await f.finish({ kind: 'loadScene', scene: 'start', entryId: 'back', transition })
  })
  test('reselecting named mode retains the valid selected entry instead of replacing it with the first', async () => {
    const f = await commandForm({ kind: 'loadScene', scene: 'start', entryId: 'back' })
    await click('命名')
    expect(row('命名落点').textContent).toContain('后门')
    await choose('朝向', 'left')
    await f.finish({ kind: 'loadScene', scene: 'start', entryId: 'back', facing: 'left' })
  })
  test('temporary coordinates start at the target default including its height', async () => {
    const f = await commandForm({ kind: 'loadScene', scene: 'start', entryId: 'door' })
    await click('临时坐标')
    await f.finish({ kind: 'loadScene', scene: 'start', pos: { col: 4, row: 3, height: 2 } })
  })
  test.each([
    'col',
    'row',
    'height',
  ] as const)('temporary %s edits preserve both siblings and transition', async (key) => {
    const command: Extract<AuthorCommand, { kind: 'loadScene' }> = {
      kind: 'loadScene',
      scene: 'start',
      pos: { col: 2, row: 3, height: 4 },
      facing: 'right',
      transition,
    }
    const f = await commandForm(command)
    await input('col / row / h', 8, ['col', 'row', 'height'].indexOf(key))
    await f.finish({ ...command, pos: { col: 2, row: 3, height: 4, [key]: 8 } })
  })
  test('default mode removes a temporary location without dropping direction or timing', async () => {
    const f = await commandForm({
      kind: 'loadScene',
      scene: 'start',
      pos: { col: 3, row: 2, height: 0 },
      facing: 'left',
      transition,
    })
    await click('默认')
    await f.finish({ kind: 'loadScene', scene: 'start', facing: 'left', transition })
  })
  test('switching to modern timing changes only transition', async () => {
    const f = await commandForm({
      kind: 'loadScene',
      scene: 'start',
      entryId: 'door',
      facing: 'right',
      transition,
    })
    await click('改用现代过渡')
    expect(row('画面过渡').textContent).toContain('现代过渡')
    await f.finish({
      kind: 'loadScene',
      scene: 'start',
      entryId: 'door',
      facing: 'right',
      transition: undefined,
    })
  })
  test('a target with no named entries disables named mode and seeds its actual zero-height default', async () => {
    const f = await commandForm({ kind: 'loadScene', scene: 'other' })
    const named = [...row('落点').querySelectorAll('button')].find((b) => b.textContent === '命名')
    expect(named?.disabled).toBe(true)
    await click('临时坐标')
    expect(row('col / row / h').querySelectorAll('input')[2]?.value).toBe('0')
    await f.finish({ kind: 'loadScene', scene: 'other', pos: { col: 9, row: 6, height: 0 } })
  })
})
