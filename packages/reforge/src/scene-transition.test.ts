import type { SceneDef } from '@type-pal/content'
import { expect, test } from 'vitest'
import { type RuntimeSceneSpawn, resolveSceneSpawn } from './scene-transition.js'

const scene = {
  entry: { pos: { col: 10, row: 20, height: 0 }, facing: 'down' },
  entries: {
    west: { pos: { col: 1, row: 2, height: 0 }, facing: 'up' },
    east: { pos: { col: 8, row: 9, height: 1 } },
  },
} satisfies Pick<SceneDef, 'entry' | 'entries'>

test.each([
  { mode: 'boot default', spawn: undefined, pos: scene.entry.pos, facing: 'down' },
  {
    mode: 'inherited across scenes',
    spawn: { inheritFacing: 'left' },
    pos: scene.entry.pos,
    facing: 'left',
  },
  {
    mode: 'named entry',
    spawn: { entryId: 'west', inheritFacing: 'left' },
    pos: scene.entries.west.pos,
    facing: 'up',
  },
  {
    mode: 'named entry without facing',
    spawn: { entryId: 'east', inheritFacing: 'right' },
    pos: scene.entries.east.pos,
    facing: 'right',
  },
  {
    mode: 'command facing overrides the entry',
    spawn: { entryId: 'west', facing: 'down', inheritFacing: 'left' },
    pos: scene.entries.west.pos,
    facing: 'down',
  },
  {
    mode: 'temporary coordinates',
    spawn: { pos: { col: 4, row: 5, height: 2 }, facing: 'left', inheritFacing: 'right' },
    pos: { col: 4, row: 5, height: 2 },
    facing: 'left',
  },
] satisfies {
  mode: string
  spawn: RuntimeSceneSpawn | undefined
  pos: SceneDef['entry']['pos']
  facing: SceneDef['entry']['facing']
}[])('$mode selects the actual position and facing without borrowing the configured coordinates', ({
  spawn,
  pos,
  facing,
}) => {
  const landing = resolveSceneSpawn('town', scene, spawn)
  expect(landing).toEqual({ pos, facing })
  expect(landing.pos).not.toBe(pos)
  if (spawn?.pos) expect(landing.pos).not.toBe(spawn.pos)
})

test('missing entry and conflicting decoded input report different errors', () => {
  expect(() => resolveSceneSpawn('town', scene, { entryId: 'missing' })).toThrow(
    '场景 town: 找不到命名落点 missing',
  )
  // Deliberately bypass the typed union to exercise the runtime guard for decoded data.
  const conflicting = { entryId: 'west', pos: { col: 0, row: 0, height: 0 } }
  expect(() => Reflect.apply(resolveSceneSpawn, undefined, ['town', scene, conflicting])).toThrow(
    '场景 town: entryId 与 pos 不能同时存在',
  )
})

test('an unregistered name matching an inherited property is reported missing', () => {
  expect(() => resolveSceneSpawn('town', scene, { entryId: 'constructor' })).toThrow(
    '场景 town: 找不到命名落点 constructor',
  )
})

test('a genuinely registered constructor entry supplies its own position and facing', () => {
  const entry = { pos: { col: 17, row: 23, height: 1 }, facing: 'right' } as const
  expect(
    resolveSceneSpawn(
      'town',
      {
        ...scene,
        entries: { ...scene.entries, constructor: entry },
      },
      { entryId: 'constructor' },
    ),
  ).toEqual(entry)
})
