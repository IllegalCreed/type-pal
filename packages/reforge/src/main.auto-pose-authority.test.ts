// @vitest-environment jsdom
import type { AuthorCommand, AuthorSceneDef, SpriteDef } from '@type-pal/content'
import { afterEach, expect, test, vi } from 'vitest'
import type { ShellHost } from './__tests__/runtime-shell/dom-host.js'
import { drain, key } from './__tests__/runtime-shell/driver.js'
import { sceneWithCommands, shellProject, shellScene } from './__tests__/runtime-shell/project.js'
import { advance, installShellHost, state } from './__tests__/runtime-shell/scenarios.js'
import { loadCurrentProjectFrom } from './project-loader.js'
import { IndexedDbSaveStore } from './save/store.js'

let host: ShellHost | undefined
afterEach(() => {
  host?.close()
  host = undefined
})

const target = { scene: 'a', entity: 'target' }
const neighbor = { scene: 'a', entity: 'neighbor' }
const sprite: SpriteDef = {
  id: 'walker',
  label: 'Walker',
  asset: 'sprite',
  layout: { kind: 'static' },
  poses: {
    gesture: {
      label: 'Gesture',
      steps: [
        { frame: 2, durationMs: 600 },
        { frame: 3, durationMs: 600 },
      ],
    },
  },
}

function automatic(id: string, body: AuthorCommand[]): AuthorSceneDef['entities'][number] {
  return {
    id,
    sprite: 'walker',
    pos: { col: id === 'neighbor' ? 6 : 4, row: 4, height: 0 },
    facing: 'down',
    pages: [{ id: 'normal', label: 'Normal', auto: 'routine' }],
    initialPage: 'normal',
    behaviors: {
      auto: {
        routine: {
          label: 'Routine',
          order: 0,
          flow: {
            kind: 'stages',
            initial: 'one',
            stages: [{ id: 'one', body, next: { kind: 'complete' } }],
          },
        },
      },
    },
  }
}

async function boot(first: AuthorSceneDef, second?: AuthorSceneDef) {
  host = await installShellHost()
  const fixture = await shellProject()
  fixture.files['content/scenes/a.json'] = first
  if (second) fixture.files['content/scenes/b.json'] = second
  fixture.files['content/sprites.json'] = [sprite]
  const input = structuredClone(fixture.files)
  const project = await loadCurrentProjectFrom(fixture.source)
  await (await import('./main.js')).bootGame(project, {
    kind: 'project',
    projectId: 'shell-project',
  })
  host.frame(100)
  await drain()
  return { h: host, unchanged: () => expect(fixture.files).toEqual(input) }
}

const poseCommands: AuthorCommand[] = [
  { kind: 'setEntityFacing', target, facing: 'left' },
  { kind: 'setEntityFrame', target, frame: 1 },
  { kind: 'animEntity', target },
  {
    kind: 'playEntityAction',
    target,
    sprite: 'walker',
    action: 'gesture',
    loop: true,
    wait: false,
  },
  { kind: 'stopEntityAction', target, reset: true },
]

test.each(
  poseCommands,
)('automatic $kind waits for the actual target owner, including a different automatic caller', async (command) => {
  const first = sceneWithCommands('a', [
    { kind: 'takeEntity', target },
    { kind: 'wait', ms: 1200 },
    { kind: 'releaseEntity', target },
    { kind: 'giveMoney', delta: 9 },
  ])
  first.entities = [
    automatic('target', [
      { kind: 'wait', ms: 300 },
      { kind: 'giveMoney', delta: 7 },
      command,
      { kind: 'giveMoney', delta: 11 },
    ]),
    automatic('caller', [{ kind: 'wait', ms: 300 }, command, { kind: 'giveMoney', delta: 13 }]),
    automatic('neighbor', [
      { kind: 'wait', ms: 300 },
      { kind: 'setEntityFacing', target: neighbor, facing: 'up' },
      { kind: 'giveMoney', delta: 17 },
    ]),
  ]
  const { h, unchanged } = await boot(first)
  await advance(h, () => state().world.money >= 74)
  for (let turn = 0; turn < 3; turn++) {
    h.frame(100)
    await drain()
  }
  expect(state().script.running).toBe(true)
  expect(state().world.money).toBe(74)
  expect(state().entities.find((entity) => entity.id === 'neighbor')?.facing).toBe('up')
  expect(state().world.script?.behaviors.entities?.a?.target?.auto?.cursor?.resume?.frames).toEqual(
    [{ index: 2 }],
  )
  expect(state().world.script?.behaviors.entities?.a?.caller?.auto?.cursor?.resume?.frames).toEqual(
    [{ index: 1 }],
  )
  await key(h, 'F5')
  expect(state().renderDebug.menuActive).toBe(false)
  const store = new IndexedDbSaveStore({ kind: 'project', projectId: 'shell-project' })
  expect(await store.getPayload('quick')).toBeNull()
  await advance(h, () => !state().script.running && state().world.money === 107)
  expect(state().world.script?.behaviors.entities?.a?.target?.auto?.cursor?.at).toEqual({
    kind: 'completed',
  })
  expect(state().world.script?.behaviors.entities?.a?.caller?.auto?.cursor?.at).toEqual({
    kind: 'completed',
  })
  await key(h, 'F5')
  await advance(h, () => !state().script.running, 1)
  await vi.waitFor(async () => expect(await store.getPayload('quick')).not.toBeNull())
  const saved = await store.getPayload('quick')
  expect(saved?.version).toBe(11)
  expect(saved?.world.money).toBe(107)
  await key(h, 'F9')
  for (let turn = 0; turn < 8; turn++) {
    h.frame(100)
    await drain()
    await h.settleIO()
  }
  expect(state().world.money).toBe(107)
  unchanged()
})

test('an already playing automatic action keeps its exact phase while its target is held and resumes after release', async () => {
  const first = sceneWithCommands('a', [
    { kind: 'wait', ms: 400 },
    { kind: 'takeEntity', target },
    { kind: 'giveMoney', delta: 9 },
    { kind: 'wait', ms: 1000 },
    { kind: 'releaseEntity', target },
  ])
  first.entities = [
    automatic('target', [
      { kind: 'wait', ms: 100 },
      {
        kind: 'playEntityAction',
        target,
        sprite: 'walker',
        action: 'gesture',
        loop: false,
        wait: true,
      },
      { kind: 'giveMoney', delta: 7 },
    ]),
    automatic('neighbor', [
      { kind: 'wait', ms: 700 },
      { kind: 'giveMoney', delta: 11 },
    ]),
  ]
  const { h, unchanged } = await boot(first)
  const { EntityActionPlayer } = await import('./entity-action-player.js')
  const actionFrame = vi.spyOn(EntityActionPlayer.prototype, 'frame')
  const targetFrames = () =>
    actionFrame.mock.calls.flatMap((args, index) =>
      args[0] === 'target' ? [actionFrame.mock.results[index]?.value] : [],
    )
  await advance(h, () => state().world.money === 59)
  h.frame(100)
  await drain()
  const frameAtTake = targetFrames().at(-1)
  expect(frameAtTake).toBe(2)
  for (let turn = 0; turn < 7; turn++) {
    h.frame(100)
    await drain()
  }
  expect(state().script.running).toBe(true)
  expect(state().world.money).toBe(70)
  expect(targetFrames().at(-1)).toBe(frameAtTake)
  await advance(h, () => !state().script.running && state().world.money === 77)
  unchanged()
})

test('a taken target pauses only its automatic page action while another page continues', async () => {
  const first = sceneWithCommands('a', [
    { kind: 'takeEntity', target },
    { kind: 'wait', ms: 1400 },
    { kind: 'releaseEntity', target },
    { kind: 'giveMoney', delta: 9 },
  ])
  first.entities = [target, neighbor].map((address) => ({
    id: address.entity,
    sprite: 'walker',
    pos: { col: address.entity === 'target' ? 4 : 6, row: 4, height: 0 },
    pages: [
      {
        id: 'normal',
        label: 'Normal',
        animation: { sprite: 'walker', action: 'gesture', loop: true },
      },
    ],
    initialPage: 'normal',
  }))
  const { h, unchanged } = await boot(first)
  const { EntityActionPlayer } = await import('./entity-action-player.js')
  const frames = vi.spyOn(EntityActionPlayer.prototype, 'frame')
  for (let turn = 0; turn < 7; turn++) {
    h.frame(100)
    await drain()
  }
  const lastFrame = (id: string) =>
    frames.mock.calls
      .flatMap((args, index) => (args[0] === id ? [frames.mock.results[index]?.value] : []))
      .at(-1)
  expect(state().script.running).toBe(true)
  expect(lastFrame('target')).toBe(2)
  expect(lastFrame('neighbor')).toBe(3)
  await advance(h, () => state().world.money === 59)
  for (let turn = 0; turn < 6; turn++) {
    h.frame(100)
    await drain()
  }
  expect(lastFrame('target')).toBe(3)
  unchanged()
})

test('a foreground awaited action still finishes on a target it has explicitly taken', async () => {
  const first = sceneWithCommands('a', [
    { kind: 'takeEntity', target },
    {
      kind: 'playEntityAction',
      target,
      sprite: 'walker',
      action: 'gesture',
      loop: false,
      wait: true,
    },
    { kind: 'giveMoney', delta: 9 },
  ])
  first.entities = [{ id: 'target', sprite: 'walker', pos: { col: 4, row: 4, height: 0 } }]
  const { h, unchanged } = await boot(first)
  await advance(h, () => !state().script.running && state().world.money === 59)
  unchanged()
})

test('switching the automatic binding while a pose waits invalidates the old owner and never writes its old frame or reward', async () => {
  const first = sceneWithCommands('a', [
    { kind: 'takeEntity', target },
    { kind: 'wait', ms: 500 },
    {
      kind: 'selectEntityBehavior',
      target,
      channel: 'auto',
      selection: { kind: 'use', value: 'new' },
    },
    { kind: 'wait', ms: 500 },
    { kind: 'releaseEntity', target },
    { kind: 'giveMoney', delta: 9 },
  ])
  const entity = automatic('target', [
    { kind: 'giveMoney', delta: 7 },
    { kind: 'setEntityFrame', target, frame: 1 },
    { kind: 'giveMoney', delta: 11 },
  ])
  if (!entity.behaviors?.auto) throw new Error('fixture automatic behavior missing')
  entity.behaviors.auto.new = {
    label: 'New pose',
    order: 1,
    flow: {
      kind: 'stages',
      initial: 'new',
      stages: [
        {
          id: 'new',
          body: [
            { kind: 'setEntityFrame', target, frame: 4 },
            { kind: 'giveMoney', delta: 19 },
          ],
          next: { kind: 'complete' },
        },
      ],
    },
  }
  first.entities = [entity]
  const { h, unchanged } = await boot(first)
  const { WorldScenePresentation } = await import('./world-scene-presentation.js')
  const frames = vi.spyOn(WorldScenePresentation.prototype, 'setEntityFrame')
  await advance(h, () => !state().script.running && state().world.money === 85)
  expect(frames.mock.calls).toEqual([['target', 4]])
  expect(state().world.script?.behaviors.entities?.a?.target?.auto?.cursor).toEqual({
    behavior: 'new',
    at: { kind: 'completed' },
  })
  unchanged()
})

test('a new scene with the same entity id cannot receive the previous scene automatic pose or tail', async () => {
  const first = sceneWithCommands('a', [
    { kind: 'takeEntity', target },
    { kind: 'wait', ms: 500 },
    { kind: 'loadScene', scene: 'b' },
    { kind: 'giveMoney', delta: 9 },
  ])
  first.entities = [
    automatic('target', [
      { kind: 'giveMoney', delta: 7 },
      { kind: 'setEntityFrame', target, frame: 1 },
      { kind: 'giveMoney', delta: 11 },
    ]),
  ]
  const second = shellScene('b')
  second.entities = [
    automatic('target', [
      { kind: 'setEntityFrame', target: { scene: 'b', entity: 'target' }, frame: 4 },
      { kind: 'giveMoney', delta: 5 },
    ]),
  ]
  const { h, unchanged } = await boot(first, second)
  const { WorldScenePresentation } = await import('./world-scene-presentation.js')
  const frames = vi.spyOn(WorldScenePresentation.prototype, 'setEntityFrame')
  await advance(h, () => state().sceneId === 'b' && !state().script.running)
  expect(state().world.money).toBe(71)
  expect(frames.mock.calls).toEqual([['target', 4]])
  unchanged()
})

test('a foreground action with the same binding replaces a paused automatic waiter and still completes', async () => {
  const first = sceneWithCommands('a', [
    { kind: 'wait', ms: 400 },
    { kind: 'takeEntity', target },
    {
      kind: 'playEntityAction',
      target,
      sprite: 'walker',
      action: 'gesture',
      loop: false,
      wait: true,
    },
    { kind: 'giveMoney', delta: 9 },
    { kind: 'releaseEntity', target },
  ])
  first.entities = [
    automatic('target', [
      {
        kind: 'playEntityAction',
        target,
        sprite: 'walker',
        action: 'gesture',
        loop: false,
        wait: true,
      },
      { kind: 'giveMoney', delta: 7 },
    ]),
  ]
  const { h, unchanged } = await boot(first)
  for (let turn = 0; turn < 8; turn++) {
    h.frame(100)
    await drain()
  }
  expect(state().script.running).toBe(true)
  expect(state().world.money).toBe(50)
  await advance(h, () => !state().script.running && state().world.money === 66)
  unchanged()
})

test('restoring the same scene invalidates the old held automatic activation before its pose can write', async () => {
  const first = sceneWithCommands('a', [])
  delete first.hooks
  first.entities = [
    automatic('target', [
      { kind: 'wait', ms: 500 },
      { kind: 'giveMoney', delta: 7 },
      { kind: 'setEntityFrame', target, frame: 1 },
      { kind: 'giveMoney', delta: 9 },
    ]),
    {
      id: 'switch',
      sprite: 'walker',
      pos: { col: 2, row: 3, height: 0 },
      initialPage: 'normal',
      pages: [
        {
          id: 'normal',
          label: 'Normal',
          trigger: 'restore',
          triggerActivation: { on: 'interact', range: 2 },
        },
      ],
      behaviors: {
        trigger: {
          restore: {
            label: 'Restore',
            order: 0,
            flow: {
              kind: 'stages',
              initial: 'one',
              stages: [
                {
                  id: 'one',
                  body: [
                    { kind: 'takeEntity', target },
                    { kind: 'wait', ms: 1000 },
                    { kind: 'loadLastSave' },
                  ],
                },
              ],
            },
          },
        },
      },
    },
  ]
  const { h, unchanged } = await boot(first)
  const store = new IndexedDbSaveStore({ kind: 'project', projectId: 'shell-project' })
  await key(h, 'F5', 1)
  await vi.waitFor(async () => expect(await store.getPayload('quick')).not.toBeNull())
  const saved = await store.getPayload('quick')
  expect(saved?.world.money).toBe(50)
  const { WorldScenePresentation } = await import('./world-scene-presentation.js')
  const frames = vi.spyOn(WorldScenePresentation.prototype, 'setEntityFrame')
  await key(h, 'Enter', 1)
  await advance(h, () => state().world.money === 57)
  expect(state().script.running).toBe(true)
  expect(frames).not.toHaveBeenCalled()
  await advance(h, () => !state().script.running && state().world.money === 66)
  expect(state().sceneId).toBe('a')
  expect(frames.mock.calls).toEqual([['target', 1]])
  expect(saved?.world.money).toBe(50)
  unchanged()
})
