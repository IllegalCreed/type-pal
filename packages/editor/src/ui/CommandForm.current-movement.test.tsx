// @vitest-environment jsdom
import type { AuthorCommand } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { choose, commandForm, input, row } from './__tests__/command-form-current-fixture.js'

const cases: Array<{
  name: string
  command: AuthorCommand
  label: string
  value: number
  expected: AuthorCommand
}> = [
  {
    name: 'wait duration',
    command: { kind: 'wait', ms: 40 },
    label: '毫秒',
    value: 120,
    expected: { kind: 'wait', ms: 120 },
  },
  {
    name: 'fade duration',
    command: { kind: 'fade', dir: 'out' },
    label: '毫秒',
    value: 600,
    expected: { kind: 'fade', dir: 'out', ms: 600 },
  },
  {
    name: 'dither duration',
    command: { kind: 'ditherScreen' },
    label: '毫秒',
    value: 900,
    expected: { kind: 'ditherScreen', ms: 900 },
  },
  {
    name: 'teleport col',
    command: { kind: 'teleportParty', pos: { col: 2, row: 3, height: 4 }, facing: 'left' },
    label: 'col',
    value: 9,
    expected: { kind: 'teleportParty', pos: { col: 9, row: 3, height: 4 }, facing: 'left' },
  },
  {
    name: 'teleport row',
    command: { kind: 'teleportParty', pos: { col: 2, row: 3, height: 4 } },
    label: 'row',
    value: 8,
    expected: { kind: 'teleportParty', pos: { col: 2, row: 8, height: 4 } },
  },
  {
    name: 'party gesture',
    command: { kind: 'setPartyFacing', facing: 'up' },
    label: '姿势帧',
    value: 3,
    expected: { kind: 'setPartyFacing', facing: 'up', gesture: 3 },
  },
  {
    name: 'party gesture clear',
    command: { kind: 'setPartyFacing', facing: 'up', gesture: 3 },
    label: '姿势帧',
    value: 0,
    expected: { kind: 'setPartyFacing', facing: 'up', gesture: undefined },
  },
  {
    name: 'move col',
    command: { kind: 'moveParty', to: { col: 2, row: 3, height: 4 }, speed: 'slow' },
    label: 'col',
    value: 9,
    expected: { kind: 'moveParty', to: { col: 9, row: 3, height: 4 }, speed: 'slow' },
  },
  {
    name: 'move row',
    command: { kind: 'moveParty', to: { col: 2, row: 3, height: 0 }, speed: 'run' },
    label: 'row',
    value: 8,
    expected: { kind: 'moveParty', to: { col: 2, row: 8, height: 0 }, speed: 'run' },
  },
  ...(['dx', 'dy', 'layer'] as const).map((key) => ({
    name: `nudge ${key}`,
    command: { kind: 'nudgeParty' as const, dx: 2, dy: 3, layer: 1 },
    label: key === 'layer' ? '层号' : `${key}(px)`,
    value: 7,
    expected: { kind: 'nudgeParty' as const, dx: 2, dy: 3, layer: 1, [key]: 7 },
  })),
  ...(['dx', 'dy', 'frames'] as const).map((key) => ({
    name: `camera ${key}`,
    command: { kind: 'cameraPan' as const, dx: 2, dy: 3, frames: 4 },
    label: key === 'frames' ? '帧数' : key,
    value: 9,
    expected: { kind: 'cameraPan' as const, dx: 2, dy: 3, frames: 4, [key]: 9 },
  })),
]
describe('Current command motion aggregate', () => {
  test.each(cases)('$name commits exact sibling-preserving command', async ({
    command,
    label,
    value,
    expected,
  }) => {
    const f = await commandForm(command)
    await input(label, value)
    await f.finish(expected)
  })
  test.each([
    {
      command: { kind: 'teleportParty', pos: { col: 2, row: 3, height: 0 } },
      label: '朝向',
      option: 'up',
      expected: { kind: 'teleportParty', pos: { col: 2, row: 3, height: 0 }, facing: 'up' },
    },
    {
      command: { kind: 'setPartyFacing', facing: 'down', gesture: 2 },
      label: '朝向',
      option: 'right',
      expected: { kind: 'setPartyFacing', facing: 'right', gesture: 2 },
    },
    {
      command: { kind: 'moveParty', to: { col: 2, row: 3, height: 0 }, speed: 'slow' },
      label: '速度',
      option: 'fast',
      expected: { kind: 'moveParty', to: { col: 2, row: 3, height: 0 }, speed: 'fast' },
    },
  ] satisfies Array<{
    command: AuthorCommand
    label: string
    option: string
    expected: AuthorCommand
  }>)('$command.kind selector updates only its field', async ({
    command,
    label,
    option,
    expected,
  }) => {
    const f = await commandForm(command)
    await choose(label, option)
    await f.finish(expected)
  })
  test.each([
    { kind: 'holdScreen', color: 'black', token: 'transition-1' },
    { kind: 'revealScreen', token: 'transition-1' },
  ] satisfies AuthorCommand[])('$kind exposes its paired token as read-only', async (command) => {
    const f = await commandForm(command)
    const field = row('事务').querySelector('input')
    expect(field?.readOnly).toBe(true)
    expect(field?.value).toBe('transition-1')
    f.pending()
  })
})
