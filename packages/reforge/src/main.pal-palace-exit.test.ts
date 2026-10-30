// @vitest-environment jsdom
import { type AuthorSceneDef, validateAuthorScenes, validateProjectMap } from '@type-pal/content'
import { afterEach, expect, test } from 'vitest'
import map203Json from '../../../projects/pal/content/maps/map-203.json' with { type: 'json' }
import map204Json from '../../../projects/pal/content/maps/map-204.json' with { type: 'json' }
import upperJson from '../../../projects/pal/content/scenes/s285.json' with { type: 'json' }
import roomJson from '../../../projects/pal/content/scenes/s286.json' with { type: 'json' }
import { installShellHost, type ShellHost } from './__tests__/runtime-shell/dom-host.js'
import { key, observation, until } from './__tests__/runtime-shell/driver.js'
import { shellProject } from './__tests__/runtime-shell/project.js'
import { loadCurrentProjectFrom } from './project-loader.js'

let host: ShellHost | undefined
afterEach(async () => {
  await host?.close()
  host = undefined
})

test('canonical palace zone returns through real touch delivery and reenters the same room', async () => {
  host = await installShellHost()
  const [upper, room] = validateAuthorScenes([upperJson, roomJson])
  if (!upper || !room) throw new Error('canonical palace scenes missing')
  const fixture = await shellProject()
  const entrance = room.entries?.['palace-isolated-room']
  const returnPoint = upper.entries?.['palace-upper-return']
  const exit = room.entities.find((entity) => entity.id === 'palace-isolated-exit')
  const inbound = upper.entities.find((entity) => entity.id === 'e4813')
  if (!entrance || !returnPoint || !exit || !inbound)
    throw new Error('canonical palace route missing')
  const scenes: AuthorSceneDef[] = [
    {
      id: room.id,
      mapId: 'map-a',
      entry: { pos: entrance.pos, facing: 'down' },
      entries: room.entries,
      entities: [exit],
    },
    {
      id: upper.id,
      mapId: 'map-b',
      entry: { pos: returnPoint.pos, facing: 'down' },
      entries: upper.entries,
      entities: [inbound],
    },
  ]
  const manifest = structuredClone(fixture.project.manifest)
  manifest.entryPoints[0]!.scene = room.id
  manifest.entryPoints[1]!.scene = upper.id
  fixture.files['manifest.json'] = manifest
  fixture.files['content/scenes/index.json'] = {
    version: 1,
    scenes: scenes.map((scene) => ({
      id: scene.id,
      name: scene.id,
      path: `content/scenes/${scene.id}.json`,
    })),
  }
  for (const scene of scenes) fixture.files[`content/scenes/${scene.id}.json`] = scene
  // Keep canonical collision and route content; only tile artwork uses the small shell IO assets.
  for (const [name, json] of [
    ['a', map204Json],
    ['b', map203Json],
  ] as const) {
    const map = validateProjectMap(json)
    const tiles = map.collision.map((row) => row.map(() => 0))
    fixture.files[`content/maps/${name}.json`] = {
      ...map,
      tilesetRefs: ['tiles'],
      layers: [{ id: 'floor', name: 'Floor', tiles, sources: tiles }],
    }
  }
  const project = await loadCurrentProjectFrom(fixture.source)
  await (await import('./main.js')).bootGame(project, { kind: 'project', projectId: manifest.id })
  await host.frame()
  expect(observation().sceneId).toBe('s286')
  await key(host, 'ArrowDown')
  expect(observation().player.pos).toEqual({ col: 80, row: 23, height: 0 })
  expect(observation().sceneId).toBe('s286')
  await key(host, 'ArrowDown')
  await until(host, () => observation().sceneId === 's285')
  expect(observation().player.pos).toEqual(returnPoint.pos)
  await until(host, () => !observation().script.running)
  await key(host, 'ArrowUp')
  await until(host, () => observation().sceneId === 's286')
  expect(observation().player.pos).toEqual(entrance.pos)
})
