// @vitest-environment jsdom
import type { AuthorCommand, SpriteDef } from '@type-pal/content'
import { afterEach, expect, test, vi } from 'vitest'
import type { ShellHost } from './__tests__/runtime-shell/dom-host.js'
import { drain } from './__tests__/runtime-shell/driver.js'
import { sceneWithCommands, shellProject } from './__tests__/runtime-shell/project.js'
import { advance, installShellHost, state } from './__tests__/runtime-shell/scenarios.js'
import { loadCurrentProjectFrom } from './project-loader.js'

let host: ShellHost | undefined
afterEach(() => {
  host?.close()
  host = undefined
  vi.restoreAllMocks()
})

async function travelling(ride: boolean) {
  host = await installShellHost()
  const target = { scene: 'a', entity: 'carrier' }
  const start = { col: 3, row: 2, height: 0 }
  const turn = { col: 6, row: 2, height: 0 }
  const end = ride ? { col: 6, row: 5, height: 0 } : turn
  const body: AuthorCommand[] = ride
    ? [
        { kind: 'setPartyFacing', facing: 'left' },
        { kind: 'mountParty', target, dx: 0, dy: 0 },
        { kind: 'ride', target, to: start, speed: 'slow' },
        { kind: 'wait', ms: 200 },
        { kind: 'ride', target, to: turn, speed: 'slow' },
        { kind: 'ride', target, to: end, speed: 'slow' },
      ]
    : [{ kind: 'moveEntity', target, to: end, speed: 'slow' }]
  const scene = sceneWithCommands('a', body)
  scene.entities = [
    {
      id: 'carrier',
      sprite: 'walker',
      pages: [
        {
          id: 'default',
          label: 'Default',
          animation: { sprite: 'walker', action: 'bob', loop: true },
        },
      ],
      initialPage: 'default',
      facing: 'down',
      pos: start,
    },
  ]
  const f = await shellProject({ first: scene, party: ['hero'] })
  const definition: SpriteDef = {
    id: 'walker',
    label: 'Carrier',
    asset: 'sprite',
    layout: ride ? { kind: 'static' } : { kind: 'directional', framesPerDir: 2 },
    poses: {
      bob: {
        label: 'Bob',
        order: 0,
        steps: [
          { frame: 0, durationMs: 200 },
          { frame: 1, durationMs: 200 },
        ],
        loopFrom: 0,
      },
    },
  }
  f.files['content/sprites.json'] = [definition]
  const before = structuredClone(f.files)
  const project = await loadCurrentProjectFrom(f.source)
  const { WorldScenePresentation } = await import('./world-scene-presentation.js')
  const present = WorldScenePresentation.prototype.sprites
  const draws: {
    carrier: typeof start
    player: { pos: typeof start; facing: string; walking: boolean }
    frame: number | undefined
    gait: number | undefined
  }[] = []
  // Observe the actual painter after its original implementation; no business function is replaced.
  vi.spyOn(WorldScenePresentation.prototype, 'sprites').mockImplementation(function (
    this: InstanceType<typeof WorldScenePresentation>,
    input,
  ) {
    const output = present.call(this, input)
    const entity = input.entities.find((value) => value.id === 'carrier')
    if (entity)
      draws.push({
        carrier: { ...entity.pos },
        player: {
          pos: { ...input.player.pos },
          facing: input.player.facing,
          walking: input.player.walking,
        },
        frame: this.renderedEntityFrame('carrier'),
        gait: input.entityGait('carrier'),
      })
    return output
  })
  await (await import('./main.js')).bootGame(project, {
    kind: 'project',
    projectId: 'shell-project',
  })
  await advance(host, () =>
    state().entities.some(
      (entity) =>
        entity.id === 'carrier' && entity.pos.col === end.col && entity.pos.row === end.row,
    ),
  )
  await drain()
  expect(f.files).toEqual(before)
  return draws
}

test('a rider faces each travel leg while the carrier keeps its authored bob timeline', async () => {
  const draws = await travelling(true)
  const stationary = draws.filter(
    ({ carrier, player }) => carrier.col === 3 && player.pos.col === 3,
  )
  expect(stationary.length).toBeGreaterThan(0)
  expect(new Set(stationary.map(({ player }) => player.facing))).toEqual(new Set(['left']))
  const first = draws.filter(({ carrier }) => carrier.col > 3 && carrier.col < 6)
  const second = draws.filter(({ carrier }) => carrier.row > 2 && carrier.row < 5)
  expect(first.length).toBeGreaterThan(4)
  expect(second.length).toBeGreaterThan(4)
  expect(new Set(first.map(({ player }) => player.facing))).toEqual(new Set(['right']))
  expect(new Set(second.map(({ player }) => player.facing))).toEqual(new Set(['down']))
  const moving = [...first, ...second]
  expect([...new Set(moving.map((draw) => draw.frame))].sort()).toEqual([0, 1])
  expect(moving.every((draw) => draw.gait === undefined)).toBe(true)
  expect(moving.every(({ player }) => !player.walking)).toBe(true)
  expect(moving.map(({ player }) => player.pos)).toEqual(moving.map(({ carrier }) => carrier))
  expect(state().player.pos).toEqual({ col: 6, row: 5, height: 0 })
  expect(state().entities.find((entity) => entity.id === 'carrier')?.facing).toBe('down')
})

test('ordinary walking still owns gait presentation over a concurrently authored action', async () => {
  const draws = (await travelling(false)).filter(
    ({ carrier }) => carrier.col > 3 && carrier.col < 6,
  )
  expect(draws.length).toBeGreaterThan(4)
  expect(draws.every((draw) => draw.gait !== undefined)).toBe(true)
  expect(new Set(draws.map((draw) => draw.frame)).size).toBeGreaterThan(1)
  expect(state().player.pos).toEqual({ col: 2, row: 2, height: 0 })
})
