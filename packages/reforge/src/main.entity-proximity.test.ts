// @vitest-environment jsdom
import type { AuthorCondition } from '@type-pal/content'
import { afterEach, expect, test } from 'vitest'
import type { ShellHost } from './__tests__/runtime-shell/dom-host.js'
import { drain } from './__tests__/runtime-shell/driver.js'
import { sceneWithCommands, shellScene } from './__tests__/runtime-shell/project.js'
import {
  advance,
  bootScenario,
  installShellHost,
  state,
} from './__tests__/runtime-shell/scenarios.js'

let host: ShellHost | undefined
afterEach(() => {
  host?.close()
  host = undefined
})

test('two real moving instances cross the strict half-grid boundary, including a hidden different-height target', async () => {
  host = await installShellHost()
  const from = { scene: 'a', entity: 'walker' }
  const to = { scene: 'a', entity: 'anchor' }
  const near: AuthorCondition = { kind: 'entitiesNear', from, to, range: 0.5 }
  const first = sceneWithCommands('a', [
    {
      kind: 'branch',
      cond: { ...near, to: { scene: 'b', entity: 'anchor' } },
      then: [{ kind: 'giveMoney', delta: 1000 }],
      else: [{ kind: 'giveMoney', delta: 3 }],
    },
  ])
  first.entities = [
    {
      id: 'walker',
      sprite: 'walker',
      pos: { col: 4, row: 4, height: 0 },
      initialPage: 'normal',
      pages: [{ id: 'normal', label: 'Normal', auto: 'walk' }],
      behaviors: {
        auto: {
          walk: {
            label: 'Walk',
            order: 0,
            flow: {
              kind: 'stages',
              initial: 'one',
              stages: [
                {
                  id: 'one',
                  body: [
                    {
                      kind: 'moveEntity',
                      target: from,
                      to: { col: 5.25, row: 4, height: 0 },
                      speed: 'normal',
                    },
                  ],
                  next: { kind: 'complete' },
                },
              ],
            },
          },
        },
      },
    },
    { id: 'anchor', sprite: 'walker', pos: { col: 5.25, row: 4, height: 200 }, hidden: true },
    {
      id: 'observer',
      sprite: 'walker',
      pos: { col: 6, row: 6, height: 0 },
      initialPage: 'normal',
      pages: [{ id: 'normal', label: 'Normal', auto: 'observe' }],
      behaviors: {
        auto: {
          observe: {
            label: 'Observe',
            order: 0,
            flow: {
              kind: 'stages',
              initial: 'one',
              stages: [
                {
                  id: 'one',
                  body: [
                    { kind: 'loop', mode: 'until', cond: near, body: [{ kind: 'wait', ms: 1 }] },
                    { kind: 'giveMoney', delta: 7 },
                  ],
                  next: { kind: 'complete' },
                },
              ],
            },
          },
        },
      },
    },
  ]
  const second = shellScene('b')
  second.entities = [{ id: 'anchor', sprite: 'walker', pos: { col: 4, row: 4, height: 0 } }]
  const f = await bootScenario(host, { first, second })
  await advance(
    host,
    () => state().entities.find((entity) => entity.id === 'walker')?.pos.col === 4.75,
  )
  expect(state().world.money).toBe(53)
  await advance(host, () => state().world.money === 60)
  expect(state().entities.find((entity) => entity.id === 'walker')!.pos.col).toBeGreaterThan(4.75)
  for (let i = 0; i < 5; i++) {
    await host.frame(100)
    await drain()
  }
  expect(state().world.money).toBe(60)
  f.assertInputUnchanged()
})
