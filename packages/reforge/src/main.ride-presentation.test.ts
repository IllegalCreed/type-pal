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
  const body: AuthorCommand[] = [
    ...(ride ? [{ kind: 'mountParty' as const, target, dx: 0, dy: 0 }] : []),
    {
      kind: ride ? 'ride' : 'moveEntity',
      target,
      to: { col: 6, row: 2, height: 0 },
      speed: 'slow',
    },
  ]
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
      pos: { col: 3, row: 2, height: 0 },
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
  const draws: { col: number; frame: number | undefined; gait: number | undefined }[] = []
  // Observe the actual painter after its original implementation; no business function is replaced.
  vi.spyOn(WorldScenePresentation.prototype, 'sprites').mockImplementation(function (
    this: InstanceType<typeof WorldScenePresentation>,
    input,
  ) {
    const output = present.call(this, input)
    const entity = input.entities.find((value) => value.id === 'carrier')
    if (entity)
      draws.push({
        col: entity.pos.col,
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
    state().entities.some((entity) => entity.id === 'carrier' && entity.pos.col === 6),
  )
  await drain()
  expect(f.files).toEqual(before)
  return draws.filter((draw) => draw.col > 3 && draw.col < 6)
}

test('a mounted carrier translates while its authored bob timeline selects both real frames', async () => {
  const draws = await travelling(true)
  expect(draws.length).toBeGreaterThan(4)
  expect([...new Set(draws.map((draw) => draw.frame))].sort()).toEqual([0, 1])
  expect(draws.every((draw) => draw.gait === undefined)).toBe(true)
  expect(state().player.pos).toEqual({ col: 6, row: 2, height: 0 })
  expect(state().entities.find((entity) => entity.id === 'carrier')?.facing).toBe('down')
})

test('ordinary walking still owns gait presentation over a concurrently authored action', async () => {
  const draws = await travelling(false)
  expect(draws.length).toBeGreaterThan(4)
  expect(draws.every((draw) => draw.gait !== undefined)).toBe(true)
  expect(new Set(draws.map((draw) => draw.frame)).size).toBeGreaterThan(1)
  expect(state().player.pos).toEqual({ col: 2, row: 2, height: 0 })
})
