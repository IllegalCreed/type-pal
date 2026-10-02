import type {
  AuthorCommand,
  AuthorScriptFlow,
  AuthorScriptLibrary,
  SceneDef,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { collectScriptMovementPreview } from './script-movement-preview.js'

const pos = (col: number, row = 0) => ({ col, row, height: 0 })
const target = { scene: 'inn', entity: 'aunt' }
const other = { scene: 'inn', entity: 'guest' }
const scene: SceneDef = {
  id: 'inn',
  mapId: 'inn-map',
  entry: { pos: pos(0), facing: 'down' },
  entities: [
    { id: 'aunt', sprite: 'aunt-sprite', pos: pos(1), facing: 'down' },
    { id: 'guest', sprite: 'guest-sprite', pos: pos(9), facing: 'up' },
  ],
}
const move = (col: number): AuthorCommand => ({
  kind: 'moveEntity',
  target,
  to: pos(col),
  speed: 'normal',
})
const flowOf = (body: AuthorCommand[]): AuthorScriptFlow => ({
  kind: 'stages',
  initial: 'start',
  stages: [{ id: 'start', body }],
})
const preview = (body: AuthorCommand[], sharedScripts?: AuthorScriptLibrary) =>
  collectScriptMovementPreview({ scene, flow: flowOf(body), self: target, sharedScripts })

describe('selected author movement preview', () => {
  test('an explicit entity call is an unknown-position boundary, never a fabricated connected route', () => {
    const result = preview([
      move(2),
      { kind: 'runEntityTrigger', target: other },
      { kind: 'stepEntity', target, dir: 'right' },
      move(8),
      move(10),
    ])
    expect(result.notes.join(' ')).toContain('内部轨迹未展开')
    expect(
      result.tracks[0]?.segments.map((segment) => [segment.from.pos.col, segment.to.pos.col]),
    ).toEqual([
      [1, 2],
      [8, 10],
    ])
    expect(result.tracks[0]?.nodes.map((node) => node.pos.col)).toEqual([1, 2, 8, 10])
  })
  test('stopScript ends the current flow, including a branch or loop arm', () => {
    const stop: AuthorCommand = { kind: 'stopScript' }
    expect(
      preview([move(2), stop, move(5)]).tracks[0]?.segments.map((segment) => [
        segment.from.pos.col,
        segment.to.pos.col,
      ]),
    ).toEqual([[1, 2]])
    const branch = preview([
      {
        kind: 'branch',
        cond: { kind: 'flag', flag: 'choice', is: true },
        then: [move(2), stop, move(5)],
        else: [move(7)],
      },
      move(10),
    ])
    expect(
      branch.tracks[0]?.segments.map((segment) => [segment.from.pos.col, segment.to.pos.col]),
    ).toEqual([
      [1, 2],
      [1, 7],
    ])
    expect(branch.notes.join(' ')).toContain('提前结束')
    expect(
      preview([
        {
          kind: 'loop',
          mode: 'while',
          cond: { kind: 'flag', flag: 'choice', is: true },
          body: [move(2), stop, move(5)],
          yield: 'worldTick',
          maxIterations: 3,
        },
        move(10),
      ]).tracks[0]?.nodes.at(-1)?.pos.col,
    ).toBe(2)
  })

  test('shared stop is local, but a shared scene change still ends current-map preview', () => {
    const shared: AuthorScriptLibrary = {
      local: { name: '局部结束', self: 'none', body: [move(2), { kind: 'stopScript' }, move(5)] },
      boundary: {
        name: '切场景',
        self: 'none',
        body: [move(3), { kind: 'loadScene', scene: 'next' }],
      },
    }
    expect(
      preview([{ kind: 'callScript', script: 'local' }, move(8)], shared).tracks[0]?.segments.map(
        (segment) => [segment.from.pos.col, segment.to.pos.col],
      ),
    ).toEqual([
      [1, 2],
      [2, 8],
    ])
    expect(
      preview(
        [{ kind: 'callScript', script: 'boundary' }, move(8)],
        shared,
      ).tracks[0]?.segments.map((segment) => [segment.from.pos.col, segment.to.pos.col]),
    ).toEqual([[1, 3]])
  })

  test('relative party placement uses the target entity height, not party height', () => {
    const elevated: SceneDef = {
      ...scene,
      entry: { ...scene.entry, pos: { ...scene.entry.pos, height: 9 } },
      entities: scene.entities.map((entity) => ({ ...entity, pos: { ...entity.pos, height: 4 } })),
    }
    const result = collectScriptMovementPreview({
      scene: elevated,
      flow: flowOf([{ kind: 'setEntityPosRelParty', target, dcol: 2, drow: 3 }]),
    })
    expect(result.tracks[0]?.nodes.at(-1)?.pos).toEqual({ col: 2, row: 3, height: 4 })
  })
  test('six authored waypoints are independent from other NPC/player routes and do not mutate input', () => {
    const body = [
      move(2),
      move(3),
      move(4),
      { kind: 'moveParty' as const, to: pos(7), speed: 'normal' as const },
      move(5),
      move(6),
      move(8),
      { kind: 'moveEntity' as const, target: other, to: pos(10), speed: 'normal' as const },
    ]
    const before = structuredClone({ scene, body })
    const result = preview(body)
    const aunt = result.tracks[0]!
    expect(aunt.nodes.map((node) => [node.number, node.pos.col])).toEqual([
      [undefined, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 8],
    ])
    expect(aunt.segments.map((segment) => [segment.from.pos.col, segment.to.pos.col])).toEqual([
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 8],
    ])
    expect(result.tracks[1]?.segments[0]?.from.pos.col).toBe(0)
    expect(result.tracks[2]?.segments[0]?.from.pos.col).toBe(9)
    expect({ scene, body }).toEqual(before)
  })

  test('only the selected step/state is shown; no next edge or unrelated preparation executes', () => {
    const flow: AuthorScriptFlow = {
      kind: 'stages',
      initial: 'first',
      stages: [
        { id: 'first', body: [move(20)], next: 'second' },
        {
          id: 'second',
          entry: {
            prepare: [{ kind: 'setEntityPos', target, pos: pos(3) }],
            reveal: { kind: 'cut' },
          },
          body: [move(5)],
        },
      ],
    }
    const collect = (sceneEntry = false) =>
      collectScriptMovementPreview({
        scene,
        flow,
        cursor: { kind: 'stage', stage: 'second' },
        sceneEntry,
      })
    expect(
      collect().tracks[0]?.segments.map((segment) => [segment.from.pos.col, segment.to.pos.col]),
    ).toEqual([[1, 5]])
    expect(
      collect(true).tracks[0]?.segments.map((segment) => [
        segment.from.pos.col,
        segment.to.pos.col,
      ]),
    ).toEqual([[3, 5]])
    expect(collect().tracks[0]?.nodes.some((node) => node.pos.col === 20)).toBe(false)
    const machine: AuthorScriptFlow = {
      kind: 'stateMachine',
      machine: {
        id: 'talk',
        label: '对话',
        initial: 'first',
        states: {
          first: { label: '首次', body: [move(20)], next: { kind: 'continue', state: 'repeat' } },
          repeat: { label: '复读', body: [move(6)], next: { kind: 'stay' } },
        },
      },
    }
    expect(
      collectScriptMovementPreview({
        scene,
        flow: machine,
        cursor: { kind: 'state', machine: 'talk', state: 'repeat' },
      }).tracks[0]?.nodes.at(-1)?.pos.col,
    ).toBe(6)
    expect(
      collectScriptMovementPreview({
        scene,
        flow,
        cursor: { kind: 'stage', stage: 'deleted' },
      }).tracks[0]?.nodes.at(-1)?.pos.col,
    ).toBe(20)
  })

  test('both branch arms are dashed alternatives, not a concatenated path or guessed next start', () => {
    const result = preview([
      move(2),
      {
        kind: 'branch',
        cond: { kind: 'flag', flag: 'choice', is: true },
        then: [move(4)],
        else: [move(7)],
      },
      move(10),
      move(11),
    ])
    const track = result.tracks[0]!
    expect(
      track.segments.map((segment) => [
        segment.from.pos.col,
        segment.to.pos.col,
        segment.conditional,
      ]),
    ).toEqual([
      [1, 2, false],
      [2, 4, true],
      [2, 7, true],
      [10, 11, false],
    ])
    expect(track.nodes.some((node) => node.pos.col === 10)).toBe(true)
    expect(result.notes.join(' ')).toContain('分支后的未知位置')
  })

  test('loops show one conditional iteration and relative moves after uncertainty remain unknown', () => {
    const result = preview([
      {
        kind: 'loop',
        mode: 'while',
        cond: { kind: 'flag', flag: 'patrol', is: true },
        body: [move(3)],
        yield: 'worldTick',
        maxIterations: 100,
      },
      { kind: 'stepEntity', target, dir: 'down' },
      move(5),
    ])
    expect(result.tracks[0]?.segments).toHaveLength(1)
    expect(result.tracks[0]?.segments[0]?.conditional).toBe(true)
    expect(result.tracks[0]?.nodes.at(-1)?.pos.col).toBe(5)
    expect(result.notes.join(' ')).toContain('循环仅展示一次')
    expect(result.notes.join(' ')).toContain('未猜测落点')
  })

  test('teleports and repositioning are separate nodes; no walking line crosses the jump', () => {
    const result = preview([
      move(2),
      { kind: 'setEntityPos', target, pos: pos(20) },
      move(21),
      { kind: 'moveParty', to: pos(2), speed: 'normal' },
      { kind: 'teleportParty', pos: pos(30) },
      { kind: 'moveParty', to: pos(31), speed: 'normal' },
    ])
    expect(
      result.tracks[0]?.segments.map((segment) => [segment.from.pos.col, segment.to.pos.col]),
    ).toEqual([
      [1, 2],
      [20, 21],
    ])
    expect(
      result.tracks[1]?.segments.map((segment) => [segment.from.pos.col, segment.to.pos.col]),
    ).toEqual([
      [0, 2],
      [30, 31],
    ])
    expect(result.tracks[0]?.nodes.find((node) => node.pos.col === 20)?.kind).toBe('teleport')
  })

  test('current-map paths stop at loadScene and ignore foreign entity coordinates', () => {
    const result = preview([
      move(2),
      {
        kind: 'moveEntity',
        target: { scene: 'forest', entity: 'guest' },
        to: pos(40),
        speed: 'normal',
      },
      { kind: 'loadScene', scene: 'forest', pos: pos(100) },
      move(200),
    ])
    expect(result.tracks).toHaveLength(1)
    expect(result.tracks[0]?.nodes.at(-1)?.pos.col).toBe(2)
    expect(result.notes.join(' ')).toContain('跨场景')
    expect(result.notes.join(' ')).toContain('切换之后')
  })

  test('shared self none clears caller; optional/required inherit or honor explicit self; recursive calls break certainty', () => {
    const shared: AuthorScriptLibrary = {
      none: { name: '无触发者', self: 'none', body: [{ kind: 'chasePlayer' }] },
      chase: { name: '追逐', self: 'required', body: [{ kind: 'chasePlayer' }] },
      nested: { name: '嵌套', self: 'optional', body: [{ kind: 'callScript', script: 'chase' }] },
      cycle: {
        name: '递归',
        self: 'none',
        body: [move(3), { kind: 'callScript', script: 'cycle' }],
      },
    }
    const noSelf = preview([{ kind: 'callScript', script: 'none' }, move(5)], shared)
    expect(noSelf.tracks[0]?.segments[0]?.from.pos.col).toBe(1)
    expect(noSelf.tracks[0]?.nodes.some((node) => node.kind === 'dynamic')).toBe(false)
    const inherited = preview([{ kind: 'callScript', script: 'nested' }, move(5)], shared)
    expect(inherited.tracks[0]?.nodes[0]?.kind).toBe('dynamic')
    expect(inherited.tracks[0]?.segments).toHaveLength(0)
    const explicit = preview([{ kind: 'callScript', script: 'chase', self: other }], shared)
    expect(explicit.tracks[0]?.target).toEqual({ kind: 'entity', address: other })
    const recursion = preview([{ kind: 'callScript', script: 'cycle' }, move(8)], shared)
    expect(recursion.tracks[0]?.segments).toHaveLength(1)
    expect(recursion.notes.join(' ')).toContain('递归共享脚本未展开')
    expect(
      collectScriptMovementPreview({
        scene,
        flow: flowOf([{ kind: 'callScript', script: 'chase' }, move(8)]),
        sharedScripts: shared,
      }).tracks,
    ).toHaveLength(0)
  })

  test('relative fragments use shared fractional pixel/grid projection without rounding', () => {
    const result = preview([
      { kind: 'nudgeEntity', target, dx: 4, dy: 2 },
      { kind: 'stepEntity', target, dir: 'down' },
      { kind: 'nudgeParty', dx: -4, dy: 2 },
    ])
    expect(result.tracks[0]?.nodes.at(1)?.pos).toEqual(pos(1.25))
    expect(result.tracks[0]?.nodes.at(2)?.pos).toEqual(pos(1.25, 0.5))
    expect(result.tracks[1]?.nodes.at(1)?.pos).toEqual(pos(0, 0.25))
  })
})
