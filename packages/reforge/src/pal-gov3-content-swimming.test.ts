// @vitest-environment jsdom
import {
  type ActorDef,
  type AuthorCommand,
  type AuthorSceneDef,
  validateAuthorScenes,
} from '@type-pal/content'
import { afterEach, expect, test, vi } from 'vitest'
import s144 from '../../../projects/pal/content/scenes/s144.json' with { type: 'json' }
import s149 from '../../../projects/pal/content/scenes/s149.json' with { type: 'json' }
import s251 from '../../../projects/pal/content/scenes/s251.json' with { type: 'json' }
import s252 from '../../../projects/pal/content/scenes/s252.json' with { type: 'json' }
import type { ShellHost } from './__tests__/runtime-shell/dom-host.js'
import { installShellHost } from './__tests__/runtime-shell/dom-host.js'
import { drain, key } from './__tests__/runtime-shell/driver.js'
import {
  projectData,
  shellActor,
  shellProject,
  shellScene,
} from './__tests__/runtime-shell/project.js'
import { advance, state } from './__tests__/runtime-shell/scenarios.js'
import { loadCurrentProjectFrom } from './project-loader.js'
import { IndexedDbSaveStore } from './save/store.js'

const actors = ['li-xiaoyao', 'zhao-linger', 'lin-yueru', 'wu-hou'].map((id): ActorDef => {
  const actor = shellActor(id)
  actor.name = `name.${id}`
  actor.spriteId = id
  return actor
})

function canonicalMutations(json: unknown): AuthorCommand[] {
  const definition = validateAuthorScenes([json])[0]
  const flow = definition?.hooks?.onEnter?.variants.default?.flow
  const body = flow?.stages.find((step) => step.id === flow.initial)?.body
  if (!body) throw new Error('missing canonical swim hook')
  return body.filter(
    (command) =>
      command.kind === 'setActorSprite' ||
      command.kind === 'setActorAppearance' ||
      command.kind === 'setParty',
  )
}

const spriteIds = [
  'sprite-193',
  'sprite-232',
  'sprite-512',
  'sprite-531',
  'sprite-532',
  'sprite-533',
  'sprite-534',
  'sprite-576',
  'li-xiaoyao',
  'lin-yueru',
  'zhao-linger',
  'wu-hou',
]

function scene(id: string, body: AuthorCommand[] = []): AuthorSceneDef {
  const value = shellScene(id)
  if (body.length)
    value.hooks = {
      onEnter: {
        initial: 'main',
        variants: {
          main: {
            label: 'swimming governance shell',
            order: 0,
            flow: {
              kind: 'stages',
              initial: 'main',
              stages: [{ id: 'main', body, next: { kind: 'complete' } }],
            },
          },
        },
      },
    }
  return value
}

let host: ShellHost | undefined
afterEach(() => {
  host?.close()
  host = undefined
})

async function boot(body: AuthorCommand[], party: string[], second?: AuthorSceneDef) {
  host = await installShellHost()
  const { WorldScenePresentation } = await import('./world-scene-presentation.js')
  const render = vi.spyOn(WorldScenePresentation.prototype, 'sprites')
  const fixture = await shellProject({ first: scene('a', body), second: second ?? scene('b') })
  const manifest = structuredClone(fixture.project.manifest)
  for (const entry of manifest.entryPoints) entry.startWorld.party = [...party]
  fixture.files['manifest.json'] = manifest
  fixture.files['content/actors.json'] = actors
  fixture.files['content/sprites.json'] = [
    { id: 'walker', label: 'Walker', asset: 'sprite', layout: { kind: 'static' } },
    ...spriteIds.map((id) => ({
      id,
      label: id,
      asset: 'sprite',
      layout: { kind: 'static' as const },
    })),
  ]
  fixture.files['content/battle-sprites.json'] = [
    {
      id: 'fighter',
      label: 'Fighter',
      asset: 'fighter',
      profile: {
        kind: 'player-fighter',
        frames: {
          idle: 0,
          dying: 1,
          dead: 2,
          defend: 3,
          hurt: 4,
          preMagic: 5,
          magic: 6,
          attackWindup: 7,
          attackRush: 8,
          attackStrike: 9,
          steal: 10,
        },
        castEffectBase: 0,
        attackEffectBase: 0,
      },
    },
    {
      id: 'player-fighter-5',
      label: 'Player fighter 5',
      asset: 'fighter',
      profile: {
        kind: 'player-fighter',
        frames: {
          idle: 0,
          dying: 1,
          dead: 2,
          defend: 3,
          hurt: 4,
          preMagic: 5,
          magic: 6,
          attackWindup: 7,
          attackRush: 8,
          attackStrike: 9,
          steal: 10,
        },
        castEffectBase: 0,
        attackEffectBase: 0,
      },
    },
  ]
  const project = await loadCurrentProjectFrom(fixture.source)
  const pristine = structuredClone(projectData(project))
  await (await import('./main.js')).bootGame(project, {
    kind: 'project',
    projectId: 'shell-project',
  })
  if (!host) throw new Error('host missing')
  await advance(host, () => !state().script.running)
  await host.frame(100)
  await drain()
  return { fixture, project, pristine, render }
}

function renderedParty(render: ReturnType<typeof vi.spyOn>): Record<string, string | undefined> {
  const input = render.mock.calls.at(-1)?.[0]
  if (!input) throw new Error('party renderer has not run')
  return Object.fromEntries(
    state().world.party.map((member) => [member.template, input.partyVisual(member)?.def.id]),
  )
}

async function saveRestore() {
  if (!host) throw new Error('host missing')
  const store = new IndexedDbSaveStore({ kind: 'project', projectId: 'shell-project' })
  await key(host, 'F5')
  for (let i = 0; i < 40 && !(await store.getPayload('quick')); i++) {
    await host.frame(100)
    await drain()
    await host.settleIO()
  }
  const payload = await store.getPayload('quick')
  expect(payload).not.toBeNull()
  await key(host, 'F9')
  for (let i = 0; i < 12; i++) {
    await host.frame(100)
    await drain()
    await host.settleIO()
  }
  expect(state().world.script).toStrictEqual(payload?.world.script)
}

test('s252水中入口：李逍遥不在初始队伍仍在setParty后持久化sprite531，切到s250等价场景并SAVE12仍保留', async () => {
  const body: AuthorCommand[] = [...canonicalMutations(s252), { kind: 'loadScene', scene: 'b' }]
  const { pristine, project, render } = await boot(body, ['wu-hou'])
  expect(state().sceneId).toBe('b')
  const li = state().world.party.find((member) => member.template === 'li-xiaoyao')
  expect(li?.appearance?.spriteId).toBe('sprite-531')
  expect(renderedParty(render)['li-xiaoyao']).toBe('sprite-531')
  await saveRestore()
  expect(
    state().world.party.find((member) => member.template === 'li-xiaoyao')?.appearance?.spriteId,
  ).toBe('sprite-531')
  expect(renderedParty(render)['li-xiaoyao']).toBe('sprite-531')
  expect(projectData(project)).toEqual(pristine)
})

test('s251离开水域：吴侯进reserve仍恢复本体，李逍遥临时sprite193后持久本体', async () => {
  const body = canonicalMutations(s251)
  const { pristine, project, render } = await boot(body, ['li-xiaoyao', 'wu-hou'])
  const wu = state().world.reserve?.find((member) => member.template === 'wu-hou')
  expect(wu?.appearance?.spriteId).toBe('wu-hou')
  expect(state().world.party[0]?.appearance?.spriteId).toBe('li-xiaoyao')
  expect(renderedParty(render)['li-xiaoyao']).toBe('li-xiaoyao')
  await saveRestore()
  expect(
    state().world.reserve?.find((member) => member.template === 'wu-hou')?.appearance?.spriteId,
  ).toBe('wu-hou')
  expect(projectData(project)).toEqual(pristine)
})

test('s149上岸演出：李逍遥的sprite232只存于当前演出，灵儿reserve保留sprite512/portrait91/battleSprite5', async () => {
  const body: AuthorCommand[] = [
    // These three leaves are the prior s145 water-entry persistence (source 1389–1399).
    { actor: 'zhao-linger', kind: 'setActorAppearance', portrait: 'portrait.pal.091' },
    { actor: 'zhao-linger', kind: 'setActorAppearance', battleSprite: 'player-fighter-5' },
    { actor: 'zhao-linger', kind: 'setActorAppearance', spriteId: 'sprite-512' },
    ...canonicalMutations(s149),
  ]
  const { pristine, project, render } = await boot(body, ['li-xiaoyao', 'zhao-linger', 'lin-yueru'])
  expect(renderedParty(render)['li-xiaoyao']).toBe('sprite-232')
  const linger = state().world.reserve?.find((member) => member.template === 'zhao-linger')
  expect(linger?.appearance).toEqual({
    spriteId: 'sprite-512',
    portrait: 'portrait.pal.091',
    battleSprite: 'player-fighter-5',
  })
  await saveRestore()
  expect(renderedParty(render)['li-xiaoyao']).toBe('li-xiaoyao')
  expect(
    state().world.reserve?.find((member) => member.template === 'zhao-linger')?.appearance,
  ).toEqual({
    spriteId: 'sprite-512',
    portrait: 'portrait.pal.091',
    battleSprite: 'player-fighter-5',
  })
  expect(projectData(project)).toEqual(pristine)
})

test('s144水中队伍：三名队员的持久泳装形象随SAVE12恢复', async () => {
  const body = canonicalMutations(s144)
  const { pristine, project, render } = await boot(body, ['li-xiaoyao', 'zhao-linger', 'lin-yueru'])
  expect(renderedParty(render)).toMatchObject({
    'li-xiaoyao': 'sprite-532',
    'zhao-linger': 'sprite-534',
    'lin-yueru': 'sprite-533',
  })
  await saveRestore()
  expect(renderedParty(render)).toMatchObject({
    'li-xiaoyao': 'sprite-532',
    'zhao-linger': 'sprite-534',
    'lin-yueru': 'sprite-533',
  })
  expect(projectData(project)).toEqual(pristine)
})
