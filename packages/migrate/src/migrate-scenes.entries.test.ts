import { pixelToGrid } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { load, migrate, raw, sourceScene } from './__tests__/scene-migration-fixtures.js'
import type { SourceCmd } from './source-facts.js'

const position = (col: number, row: number, h = 0) => ({
  ...pixelToGrid(col * 32 + h * 16, row * 16 + h * 8),
  height: 0,
})
const arrival = (col: number): SourceCmd[] => [raw(70, [col, 2, 1]), load(501)]
describe('current scene migration entries', () => {
  test('head start outranks local indexed and shared arrivals while explicit silence stays null', () => {
    const input = sourceScene({ onEnterLabel: 'L_40' })
    const events = new Map<number, SourceCmd[]>([
      [-1, arrival(4)],
      [-2, arrival(3)],
      [2, arrival(2)],
      [
        500,
        [
          raw(167, [], 'L_40'),
          raw(67, [0]),
          raw(67, [9]),
          raw(70, [7, 5, 1]),
          raw(70, [8, 6]),
          { op: 'end' },
        ],
      ],
    ])
    const out = migrate([input], events)
    expect(out.scenes[0]!.entry).toEqual({ pos: position(7, 5, 1), facing: 'down' })
    expect(out.scenes[0]!.music).toBeNull()
    expect(out.report).toMatchObject({
      entriesFound: 2,
      scenesWithStart: 1,
      scenesWithMusic: 1,
      entryFallback: [],
    })
  })
  test('local arrivals use sorted source identity rather than Map insertion order', () => {
    const out = migrate(
      [sourceScene()],
      new Map([
        [7, arrival(7)],
        [-1, arrival(8)],
        [2, arrival(2)],
      ]),
    )
    expect(out.scenes[0]!.entry.pos).toEqual(position(2, 2, 1))
    expect(out.report.entriesFound).toBe(3)
  })
  test('indexed arrival outranks shared without inventing a named source or source count', () => {
    const out = migrate(
      [sourceScene()],
      new Map([
        [-1, arrival(4)],
        [-2, arrival(3)],
      ]),
    )
    expect(out.scenes[0]!.entry.pos).toEqual(position(3, 2, 1))
    expect(out.report.entriesFound).toBe(1)
    expect(out.scenes[0]!.entries).toBeUndefined()
  })
  test('shared alone supplies a fallback but unrelated negative sources do not', () => {
    const shared = migrate([sourceScene()], new Map([[-1, arrival(4)]]))
    expect(shared.scenes[0]!.entry.pos).toEqual(position(4, 2, 1))
    const other = migrate(
      [sourceScene()],
      new Map([
        [-4, arrival(6)],
        [-3, arrival(5)],
      ]),
    )
    expect(other.scenes[0]!.entry.pos).toEqual({ ...pixelToGrid(1024, 1024), height: 0 })
    expect(other.report.entryFallback).toEqual(['s500'])
  })
  test.each([
    4, 5,
  ])('arrival window %i counts intervening end and clears at the first load', (gap) => {
    const events: SourceCmd[] = [
      raw(70, [9, 3]),
      ...Array.from({ length: gap - 1 }, (): SourceCmd => ({ op: 'end' })),
      load(501),
      load(502),
    ]
    const out = migrate([sourceScene(), sourceScene({ sceneId: 501 })], new Map([[1, events]]))
    expect(out.report.entriesFound).toBe(gap === 4 ? 1 : 0)
    expect(out.scenes[0]!.entry.pos).toEqual(
      gap === 4 ? position(9, 3) : { ...pixelToGrid(1024, 1024), height: 0 },
    )
    expect(out.report.entryFallback).toEqual(gap === 4 ? ['s501'] : ['s500', 's501'])
  })
  test.each([
    'end',
    'other',
    'limit',
  ] as const)('head scan stops at %s without guessing later music or start', (stop) => {
    const prefix: SourceCmd[] =
      stop === 'limit'
        ? Array.from({ length: 8 }, () => raw(167))
        : [stop === 'end' ? { op: 'end' } : raw(9, [1])]
    prefix[0]!.label = 'L_10'
    const out = migrate(
      [sourceScene({ onEnterLabel: 'L_10' })],
      new Map([[500, [...prefix, raw(67, [5]), raw(70, [3, 4]), { op: 'end' }]]]),
    )
    expect(out.scenes[0]!.music).toBeUndefined()
    expect(out.report).toMatchObject({
      scenesWithStart: 0,
      scenesWithMusic: 0,
      entryFallback: ['s500'],
    })
  })
  test('positive music and omitted coordinate operands are scanned literally', () => {
    const out = migrate(
      [sourceScene({ onEnterLabel: 'L_10' })],
      new Map([[500, [raw(67, [5], 'L_10'), raw(70), { op: 'end' }]]]),
    )
    expect(out.scenes[0]!.music).toBe('music.pal.005')
    expect(out.scenes[0]!.entry.pos).toEqual(position(0, 0))
  })
  test('all-table labels must equal physical indices and rejection preserves actual input', () => {
    const commands = [raw(9, [1], 'L_5')]
    const before = structuredClone(commands)
    expect(() => migrate([sourceScene()], new Map([[-2, commands]]))).toThrow(/index=0, label=L_5/)
    expect(commands).toEqual(before)
    expect(migrate([sourceScene()], new Map([[-2, [raw(9, [1], 'L_0')]]])).scenes).toHaveLength(1)
  })
})
