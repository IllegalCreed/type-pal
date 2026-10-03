// @vitest-environment jsdom
import { type AuthorCommand, validateAuthorScenes } from '@type-pal/content'
import { afterEach, expect, test, vi } from 'vitest'
import type { ShellHost } from './__tests__/runtime-shell/dom-host.js'
import { key } from './__tests__/runtime-shell/driver.js'
import { shellProject, shellScene } from './__tests__/runtime-shell/project.js'
import { advance, installShellHost, state } from './__tests__/runtime-shell/scenarios.js'
import { gov3Runtime } from './pal-gov3-content-harness.js'

const modules = import.meta.glob<{ default: unknown }>(
  '../../../projects/pal/content/scenes/s*.json',
  { eager: true },
)
const scenes = validateAuthorScenes(Object.values(modules).map((module) => module.default))
let host: ShellHost | undefined
afterEach(() => {
  host?.close()
  host = undefined
})

function children(body: AuthorCommand[]): AuthorCommand[] {
  return body.flatMap((command) => {
    if (command.kind === 'branch')
      return [command, ...children(command.then), ...children(command.else ?? [])]
    if (command.kind === 'confirm')
      return [command, ...children(command.onYes), ...children(command.onNo)]
    if (command.kind === 'loop' || command.kind === 'repeat')
      return [command, ...children(command.body)]
    return [command]
  })
}
const cases = [
  { scene: 's025', entity: 'e492', behavior: 'legacy-001', stage: 'initial', ip: 6519, outMs: 600 },
  {
    scene: 's084',
    entity: 'e1577',
    behavior: 'legacy-001',
    stage: 'initial',
    ip: 13021,
    outMs: 600,
  },
  {
    scene: 's115',
    entity: 'e2135',
    behavior: 'legacy-001',
    stage: 'initial',
    ip: 15635,
    outMs: 600,
  },
  {
    scene: 's180',
    entity: 'e2960',
    behavior: 'legacy-001',
    stage: 'initial',
    ip: 25096,
    outMs: 600,
  },
  {
    scene: 's176',
    entity: 'e2916',
    behavior: 'legacy-001',
    stage: 'initial',
    ip: 27729,
    outMs: 600,
  },
  {
    scene: 's206',
    entity: 'e3458',
    behavior: 'legacy-001',
    stage: 'initial',
    ip: 28871,
    outMs: 600,
  },
  { scene: 's084', entity: 'e1609', behavior: 'default', stage: 'initial', ip: 13410, outMs: 600 },
  { scene: 's145', entity: 'e2399', behavior: 'default', stage: 'initial', ip: 23971, outMs: 1200 },
  { scene: 's179', entity: 'e2953', behavior: 'default', stage: 'initial', ip: 25955, outMs: 600 },
  { scene: 's186', entity: 'e3131', behavior: 'default', stage: 'initial', ip: 25960, outMs: 600 },
  { scene: 's186', entity: 'e3132', behavior: 'default', stage: 'initial', ip: 25965, outMs: 600 },
  { scene: 's192', entity: 'e3244', behavior: 'default', stage: 'initial', ip: 25970, outMs: 600 },
  {
    scene: 's186',
    entity: 'e3133',
    behavior: 'c8-ada8a05f3c2f',
    stage: 'main',
    ip: 25168,
    outMs: 600,
  },
  {
    scene: 's268',
    entity: 'e4673',
    behavior: 'c8-b3088e3c8aaf',
    stage: 'stage-1',
    ip: 34617,
    outMs: 600,
  },
  {
    scene: 's128',
    entity: 'e2245',
    behavior: 'legacy-001',
    stage: 'initial',
    ip: 19359,
    outMs: 600,
  },
  {
    scene: 's128',
    entity: 'e2245',
    behavior: 'legacy-001',
    stage: 'decision-001',
    ip: 19359,
    outMs: 600,
  },
]

function body(row: (typeof cases)[number]) {
  const stage = scenes
    .find((scene) => scene.id === row.scene)
    ?.entities.find((entity) => entity.id === row.entity)
    ?.behaviors?.trigger?.[row.behavior]?.flow.stages.find((stage) => stage.id === row.stage)
  if (!stage) throw new Error('missing canonical portal root')
  return stage.body
}

test.each(
  cases,
)('$scene/$entity/$stage preserves source transaction instead of a late standalone blackout', (row) => {
  const commands = children(body(row))
  const load = commands.find((command) => command.kind === 'loadScene')
  if (load?.kind !== 'loadScene') throw new Error('missing load request')
  expect(load.transition).toEqual({
    kind: 'source',
    outMs: row.outMs,
    inMs: 600,
    color: 'black',
    evidenceId: `pal-load-scene-${row.ip}`,
  })
  const late = commands.slice(commands.indexOf(load) + 1)
  expect(late.filter((command) => command.kind === 'fade' && command.dir === 'out')).toEqual([])
  expect(
    late.filter((command) => command.kind === 'teleportParty' || command.kind === 'setPartyFacing'),
  ).toEqual([])
  if (row.entity === 'e3133') expect(load.pos).toEqual({ col: 158, row: 54, height: 0 })
})

test.each(
  cases,
)('$scene/$entity/$stage canonical activation produces the complete atomic load request', async (row) => {
  const run = gov3Runtime(row.scene)
  if (row.entity === 'e2245') {
    run.enter('s108')
    await run.activate('e2005')
    run.enter('s128')
    if (row.stage === 'decision-001') {
      run.choices.push(false)
      await run.activate('e2245')
    }
  } else if (row.behavior !== 'default') await run.install(row.entity, row.behavior)
  run.effects.length = 0
  expect(await run.activate(row.entity)).toBe(true)
  const request = run.effects
    .map((effect) => effect.command)
    .find((command) => command.kind === 'loadScene')
  const expected = children(body(row)).find((command) => command.kind === 'loadScene')
  expect(request).toEqual(expected)
  expect(request?.kind === 'loadScene' && request.transition?.kind).toBe('source')
  expect(
    run.effects.some((effect) => effect.command.kind === 'fade' && effect.command.dir === 'out'),
  ).toBe(false)
})

test('收费道士不足不会请求目标scene或source事务，真实caller及再次询价都保持失败路径', async () => {
  const run = gov3Runtime('s108')
  await run.activate('e2005')
  run.enter('s128')
  run.world.money = 14999
  for (let i = 0; i < 2; i++) {
    run.effects.length = 0
    expect(await run.activate('e2245')).toBe(true)
    expect(run.world.money).toBe(14999)
    expect(run.effects.some((effect) => effect.command.kind === 'loadScene')).toBe(false)
  }
})

for (const row of [cases[0]!, cases[7]!])
  test(`${row.scene} canonical ${row.outMs}/600 profile keeps source scene until commit and fades in target`, async () => {
    const source = children(body(row)).find((command) => command.kind === 'loadScene')
    if (source?.kind !== 'loadScene') throw new Error('missing load')
    host = await installShellHost()
    const { SupersedingFadeDriver } = await import('./fade-driver.js')
    const fades = vi.spyOn(SupersedingFadeDriver.prototype, 'begin')
    const first = shellScene('a')
    first.entities = [
      {
        id: 'portal',
        pos: { col: 2, row: 3, height: 0 },
        sprite: 'walker',
        pages: [
          {
            id: 'normal',
            label: 'Normal',
            trigger: 'go',
            triggerActivation: { on: 'interact', range: 1 },
          },
        ],
        initialPage: 'normal',
        behaviors: {
          trigger: {
            go: {
              label: 'Canonical transition',
              order: 0,
              flow: {
                kind: 'stages',
                initial: 'first',
                stages: [
                  {
                    id: 'first',
                    body: [
                      {
                        kind: 'loadScene',
                        scene: 'b',
                        pos: { col: 4, row: 3, height: 0 },
                        facing: 'up',
                        transition: source.transition,
                      },
                    ],
                  },
                ],
              },
            },
          },
        },
      },
    ]
    const fixture = await shellProject({ first })
    await (await import('./main.js')).bootGame(fixture.project, {
      kind: 'project',
      projectId: 'shell-project',
    })
    host.frame(100)
    await key(host, ' ')
    expect(state().sceneId).toBe('a')
    await advance(host, () => state().sceneId === 'b' && !state().script.running, 100)
    expect(state().player.pos).toEqual({ col: 4, row: 3, height: 0 })
    expect(fades.mock.calls.some((call) => call[0] === 1 && call[2] === row.outMs)).toBe(true)
    expect(fades.mock.calls.some((call) => call[0] === 0 && call[2] === 600)).toBe(true)
  })
