// @vitest-environment jsdom
import { type AuthorSceneDef, gridToPixel, spriteScreenY } from '@type-pal/content'
import { afterEach, expect, test, vi } from 'vitest'
import type { ShellHost } from './__tests__/runtime-shell/dom-host.js'
import { installShellHost } from './__tests__/runtime-shell/dom-host.js'
import { drain, key } from './__tests__/runtime-shell/driver.js'
import { projectData, shellProject, shellScene } from './__tests__/runtime-shell/project.js'
import { advance, state } from './__tests__/runtime-shell/scenarios.js'
import { loadCurrentProjectFrom } from './project-loader.js'
import type { SpriteDraw } from './render.js'
import { IndexedDbSaveStore } from './save/store.js'
import type { WorldSpriteInput } from './world-scene-presentation.js'

let host: ShellHost | undefined
afterEach(() => {
  host?.close()
  host = undefined
})

function stoneScene(): AuthorSceneDef {
  const scene = shellScene('a')
  scene.entities = [
    {
      id: 'e757',
      label: '隐龙窟石钥匙石门',
      pos: { col: 2, row: 3, height: 0 },
      sprite: 'sprite-255',
      collide: true,
      initialPage: 'default',
      pages: [
        {
          id: 'default',
          label: '默认模式',
          trigger: 'c8-602d89c238c1',
          triggerActivation: { on: 'interact', range: 1 },
        },
        {
          id: 'open',
          label: '已打开',
          trigger: 'default',
          triggerActivation: { on: 'interact', range: 1 },
          animation: { sprite: 'sprite-255', action: 'open', loop: false },
        },
      ],
      behaviors: {
        trigger: {
          default: {
            label: '已打开后保持交互',
            order: 0,
            flow: {
              kind: 'stages',
              initial: 'main',
              stages: [{ id: 'main', body: [], next: { kind: 'complete' } }],
            },
          },
          'c8-602d89c238c1': {
            label: '石钥匙解锁并打开石门',
            order: 1030,
            flow: {
              kind: 'stages',
              initial: 'main',
              stages: [
                {
                  id: 'main',
                  body: [
                    {
                      kind: 'setEntityTriggerActivation',
                      target: { scene: 'a', entity: 'e757' },
                      selection: { kind: 'disabled' },
                    },
                    { kind: 'setEntityState', state: 1, target: { scene: 'a', entity: 'e757' } },
                    {
                      kind: 'setEntityFacing',
                      facing: 'down',
                      target: { scene: 'a', entity: 'e757' },
                    },
                    { kind: 'setEntityFrame', frame: 1, target: { scene: 'a', entity: 'e757' } },
                    { kind: 'wait', ms: 200 },
                    { kind: 'setEntityFrame', frame: 2, target: { scene: 'a', entity: 'e757' } },
                    { kind: 'wait', ms: 200 },
                    { kind: 'setEntityFrame', frame: 3, target: { scene: 'a', entity: 'e757' } },
                    {
                      kind: 'selectEntityPage',
                      target: { scene: 'a', entity: 'e757' },
                      selection: { kind: 'use', value: 'open' },
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
  return scene
}

async function bootStone() {
  host = await installShellHost()
  const { WorldScenePresentation } = await import('./world-scene-presentation.js')
  const render = vi.spyOn(WorldScenePresentation.prototype, 'sprites')
  const fixture = await shellProject({ first: stoneScene() })
  fixture.files['content/sprites.json'] = [
    { id: 'walker', label: 'Walker', asset: 'sprite', layout: { kind: 'static' } },
    {
      id: 'sprite-255',
      label: '隐龙窟石钥匙石门',
      asset: 'sprite',
      layout: { kind: 'static' },
      poses: { open: { label: '已打开', steps: [{ frame: 3, durationMs: 100 }] } },
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
  return { project, pristine, render }
}

function renderedStoneFrame(render: ReturnType<typeof vi.spyOn>): number | undefined {
  const input = render.mock.calls.at(-1)?.[0]
  const result = render.mock.results.at(-1)
  if (!input || result?.type !== 'return') throw new Error('stone renderer has not run')
  const entity = input.entities.find(
    (candidate: WorldSpriteInput['entities'][number]) => candidate.id === 'e757',
  )
  if (!entity) throw new Error('stone entity missing')
  const definition = input.entitySprite('e757')
  const loaded = definition && input.loadedSprite(definition)
  if (!loaded) throw new Error('stone sprite not loaded')
  const pixel = gridToPixel(entity.pos)
  const draw = result.value.find(
    (sprite: SpriteDraw) =>
      sprite.worldX === pixel.x && sprite.worldY === spriteScreenY(entity.pos),
  )
  return draw ? loaded.frames.indexOf(draw.frame) : undefined
}

test('s047/e757真实Main：石门三段帧→open页，F5/F9恢复帧3且不回默认页', async () => {
  const { project, pristine, render } = await bootStone()
  if (!host) throw new Error('host missing')
  await key(host, 'Enter')
  await advance(host, () => !state().script.running)
  await host.frame(100)
  await drain()
  expect(renderedStoneFrame(render)).toBe(3)
  expect(state().world.script?.entityState.a?.e757).toBe(1)
  expect(state().world.script?.behaviors.entities?.a?.e757?.page).toBe('open')

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
  expect(renderedStoneFrame(render)).toBe(3)
  expect(state().world.script?.behaviors.entities?.a?.e757?.page).toBe('open')
  expect(projectData(project)).toEqual(pristine)
})
