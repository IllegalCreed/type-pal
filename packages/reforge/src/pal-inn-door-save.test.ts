// @vitest-environment jsdom
import {
  type AuthorCommand,
  type AuthorSceneDef,
  gridToPixel,
  spriteScreenY,
  validateAuthorScenes,
  validateSprites,
} from '@type-pal/content'
import { afterEach, expect, test, vi } from 'vitest'
import authorInn from '../../../projects/pal/content/scenes/s003.json' with { type: 'json' }
import authorSprites from '../../../projects/pal/content/sprites.json' with { type: 'json' }
import type { ShellHost } from './__tests__/runtime-shell/dom-host.js'
import { drain, key } from './__tests__/runtime-shell/driver.js'
import { projectData, shellProject, shellScene } from './__tests__/runtime-shell/project.js'
import { advance, installShellHost, state } from './__tests__/runtime-shell/scenarios.js'
import { loadCurrentProjectFrom } from './project-loader.js'
import { IndexedDbSaveStore } from './save/store.js'

const doors = ['e73', 'e74']
type AuthorSceneEntity = AuthorSceneDef['entities'][number]
let host: ShellHost | undefined
afterEach(() => {
  host?.close()
  host = undefined
})

function innEntities(): AuthorSceneEntity[] {
  const scene = validateAuthorScenes([structuredClone(authorInn)])[0]
  if (!scene) throw new Error('canonical inn missing')
  return scene.entities
}

function door(id: string): AuthorSceneEntity {
  const entity = innEntities().find((candidate) => candidate.id === id)
  if (!entity || !('sprite' in entity)) throw new Error(`canonical door ${id} missing`)
  return entity
}

function opening(caller: string): AuthorCommand[] {
  const owner = innEntities().find((entity) => entity.id === caller)
  const flow =
    caller === 'e60'
      ? owner?.behaviors?.auto?.['legacy-003']?.flow
      : owner?.behaviors?.trigger?.default?.flow
  if (!flow || flow.kind !== 'stages') throw new Error(`canonical opening ${caller} missing`)
  const stage = flow.stages.find((candidate) => candidate.id === flow.initial)
  if (!stage) throw new Error('canonical opening stage missing')
  return stage.body.filter(
    (command) =>
      'target' in command &&
      command.target &&
      'scene' in command.target &&
      command.target.scene === 's003' &&
      doors.includes(command.target.entity),
  )
}

function fixtureOpening(caller: string): AuthorCommand[] {
  // Only the source address is adapted to the small legal shell map. Keep actual author order,
  // page selections, state/facing values and (before the fix) the failing transient frame leaves.
  return opening(caller).map((command) => {
    switch (command.kind) {
      case 'setEntityState':
      case 'setEntityFacing':
      case 'setEntityFrame':
      case 'selectEntityPage':
        return { ...command, target: { scene: 'a', entity: command.target.entity } }
      default:
        throw new Error(`unexpected door command ${command.kind}`)
    }
  })
}

async function bootDoors(caller: string, afterOpening: AuthorCommand[] = []) {
  host = await installShellHost()
  const { WorldScenePresentation } = await import('./world-scene-presentation.js')
  // Calls through the real frame-selection/renderer input; this is not a replacement or pixel oracle.
  const render = vi.spyOn(WorldScenePresentation.prototype, 'sprites')
  const first = shellScene('a')
  const interactingDoor = caller === 'e74' ? 'e74' : 'e73'
  first.entities = doors.map((id) => {
    const entity = door(id)
    if (!entity.behaviors?.trigger?.default) throw new Error('canonical door trigger missing')
    entity.pos = {
      col: id === interactingDoor ? 2 : 4,
      row: id === interactingDoor ? 3 : 4,
      height: 0,
    }
    entity.behaviors.trigger.default.flow = {
      kind: 'stages',
      initial: 'initial',
      stages: [
        {
          id: 'initial',
          body: [
            ...fixtureOpening(id === interactingDoor ? caller : id),
            ...(id === interactingDoor ? afterOpening : []),
          ],
        },
      ],
    }
    return entity
  })
  first.entities.push({ id: 'temporary', sprite: 'walker', pos: { col: 5, row: 5, height: 0 } })
  first.hooks = {
    onEnter: {
      initial: 'setup',
      variants: {
        setup: {
          label: 'One-time shell setup',
          order: 0,
          flow: {
            kind: 'stages',
            initial: 'once',
            stages: [
              {
                id: 'once',
                body: [
                  { kind: 'giveMoney', delta: 7 },
                  { kind: 'setEntityFrame', target: { scene: 'a', entity: 'temporary' }, frame: 1 },
                ],
                next: { kind: 'complete' },
              },
            ],
          },
        },
      },
    },
  }
  const fixture = await shellProject({ first })
  const definitions = validateSprites(authorSprites).filter((sprite) =>
    ['sprite-53', 'sprite-54'].includes(sprite.id),
  )
  fixture.files['content/sprites.json'] = [
    ...Object.values(fixture.project.spritesById),
    ...definitions.map((sprite) => ({ ...sprite, asset: 'sprite' })),
  ]
  const project = await loadCurrentProjectFrom(fixture.source)
  const pristine = structuredClone(projectData(project))
  await (await import('./main.js')).bootGame(project, {
    kind: 'project',
    projectId: 'shell-project',
  })
  await advance(
    host,
    () => state().world.script?.behaviors.scenes?.a?.onEnter?.cursor?.at?.kind === 'completed',
  )
  await host.frame(100)
  await drain()
  const frame = (id: string): number | undefined => {
    const input = render.mock.calls.at(-1)?.[0]
    const result = render.mock.results.at(-1)
    if (!input || result?.type !== 'return') throw new Error('actual world renderer has not run')
    const entity = input.entities.find((candidate) => candidate.id === id)
    if (!entity) throw new Error(`rendered entity ${id} missing`)
    const definition = input.entitySprite(id)
    const loaded = definition && input.loadedSprite(definition)
    if (!loaded) throw new Error('actual door sprite not loaded')
    const pixel = gridToPixel(entity.pos)
    const draw = result.value.find(
      (sprite) => sprite.worldX === pixel.x && sprite.worldY === spriteScreenY(entity.pos),
    )
    return draw ? loaded.frames.indexOf(draw.frame) : undefined
  }
  return { frame, assertPristine: () => expect(projectData(project)).toEqual(pristine) }
}

async function saveAndRestore(h: ShellHost) {
  const store = new IndexedDbSaveStore({ kind: 'project', projectId: 'shell-project' })
  await key(h, 'F5')
  for (let i = 0; i < 40 && !(await store.getPayload('quick')); i++) {
    await h.frame(100)
    await drain()
    await h.settleIO()
  }
  const payload = await store.getPayload('quick')
  expect(payload).not.toBeNull()
  await key(h, 'F9')
  for (let i = 0; i < 12; i++) {
    await h.frame(100)
    await drain()
    await h.settleIO()
  }
  // Compare the entire persistent script tree, including all cursors and selections. Full World
  // (including canonical audio/use-count defaults) and RGBA equality remain formal 002 E2E gates.
  expect(state().world.script).toStrictEqual(payload?.world.script)
  expect(state().world.money).toBe(57)
  return payload
}

test('untouched doors remain closed after real F5/F9 while the saved explicit NPC pose is retained', async () => {
  const booted = await bootDoors('e73')
  if (!host) throw new Error('host missing')
  for (const id of doors) expect(booted.frame(id)).toBe(0)
  expect(booted.frame('temporary')).toBe(1)
  await saveAndRestore(host)
  for (const id of doors) {
    expect(booted.frame(id)).toBe(0)
    expect(state().world.script?.behaviors.entities?.a?.[id]?.page).toBeUndefined()
  }
  expect(booted.frame('temporary')).toBe(1)
  booted.assertPristine()
})

test.each([
  'e73',
  'e74',
  'e60',
])('actual %s opening survives real F5/F9 with its page and the other NPC pose intact, without reward replay', async (caller) => {
  const booted = await bootDoors(caller)
  if (!host) throw new Error('host missing')
  await key(host, 'Enter')
  await advance(host, () => !state().script.running && doors.every((id) => booted.frame(id) === 1))
  expect(booted.frame('temporary')).toBe(1)
  await saveAndRestore(host)
  for (const id of doors) {
    expect(booted.frame(id), `${caller}/${id} actual rendered frame after restore`).toBe(1)
    expect(state().world.script?.entityState.a?.[id]).toBe(1)
    expect(state().world.script?.behaviors.entities?.a?.[id]?.page).toBe('open')
    expect(state().world.script?.behaviors.entities?.a?.[id]?.trigger?.cursor?.at?.kind).not.toBe(
      'completed',
    )
  }
  expect(booted.frame('temporary')).toBe(1)
  // Same trigger remains interactive after selecting open, including a second actual invocation.
  const { ScriptRunnerCore } = await import('./script-runner-core.js')
  const invocations = vi.spyOn(ScriptRunnerCore.prototype, 'runFlow')
  await key(host, 'Enter')
  expect(invocations).toHaveBeenCalledOnce()
  await advance(host, () => !state().script.running)
  for (const id of doors) expect(booted.frame(id)).toBe(1)
  expect(state().world.money).toBe(57)
  booted.assertPristine()
})

test.each([
  'hidden',
  'closed',
] as const)('existing page/state model restores %s doors without inventing a canonical close storyline', async (mode) => {
  // Synthetic controls exercise the existing model after the real opening body; current PAL has
  // no close caller. Hidden state must gate an open action; inherit/default must restore closed.
  const controls: AuthorCommand[] = doors.flatMap((entity) => [
    ...(mode === 'closed'
      ? [
          {
            kind: 'selectEntityPage' as const,
            target: { scene: 'a', entity },
            selection: { kind: 'inherit' as const },
          },
        ]
      : []),
    { kind: 'setEntityState', target: { scene: 'a', entity }, state: mode === 'hidden' ? 0 : 2 },
  ])
  const booted = await bootDoors('e73', controls)
  if (!host) throw new Error('host missing')
  await key(host, 'Enter')
  await advance(host, () => !state().script.running)
  await host.frame(100)
  await drain()
  for (const id of doors) expect(booted.frame(id)).toBe(mode === 'hidden' ? undefined : 0)
  await saveAndRestore(host)
  for (const id of doors) {
    expect(booted.frame(id)).toBe(mode === 'hidden' ? undefined : 0)
    expect(state().world.script?.entityState.a?.[id]).toBe(mode === 'hidden' ? 0 : 2)
    expect(state().world.script?.behaviors.entities?.a?.[id]?.page).toBe(
      mode === 'hidden' ? 'open' : undefined,
    )
  }
  booted.assertPristine()
})

test('all three canonical opening chains select pages at the original frame leaves, with stable one-frame base actions', () => {
  for (const caller of ['e60', ...doors]) {
    expect(opening(caller)).toEqual(
      doors.flatMap((entity) => [
        { kind: 'setEntityState', target: { scene: 's003', entity }, state: 1 },
        { kind: 'setEntityFacing', target: { scene: 's003', entity }, facing: 'down' },
        {
          kind: 'selectEntityPage',
          target: { scene: 's003', entity },
          selection: { kind: 'use', value: 'open' },
        },
      ]),
    )
  }
  for (const id of doors) {
    const entity = door(id)
    if (!('sprite' in entity)) throw new Error('door sprite missing')
    expect(entity.initialPage).toBe('default')
    expect(entity.collide).toBe(true)
    const closed = entity.pages?.find((page) => page.id === 'default')
    const open = entity.pages?.find((page) => page.id === 'open')
    expect(closed?.animation).toBeUndefined()
    expect(open).toEqual({
      id: 'open',
      label: '已打开',
      trigger: 'default',
      triggerActivation: { on: 'interact', range: 1 },
      animation: { sprite: entity.sprite, action: 'open', loop: false },
    })
    const sprite = validateSprites(authorSprites).find(
      (definition) => definition.id === entity.sprite,
    )
    expect(sprite?.poses?.open).toEqual({ label: '已打开', steps: [{ frame: 1, durationMs: 100 }] })
  }
})
