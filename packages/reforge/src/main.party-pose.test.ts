// @vitest-environment jsdom
import type { AssetCatalogV1, AuthorCommand } from '@type-pal/content'
import { encodeSpriteChunk } from '@type-pal/shared'
import { afterEach, expect, test, vi } from 'vitest'
import type { ShellHost } from './__tests__/runtime-shell/dom-host.js'
import { sceneWithCommands, shellProject } from './__tests__/runtime-shell/project.js'
import { advance, installShellHost, state } from './__tests__/runtime-shell/scenarios.js'
import { compressGzip } from './assets.js'
import { sha256Bytes } from './hash.js'
import { loadCurrentProjectFrom } from './project-loader.js'

let host: ShellHost | undefined
afterEach(async () => {
  await host?.close()
  host = undefined
})

async function bootPartyPose(commands: AuthorCommand[]) {
  const shell = await installShellHost()
  host = shell
  const fixture = await shellProject({ first: sceneWithCommands('a', commands) })
  fixture.files['content/sprites.json'] = [
    {
      id: 'walker',
      label: 'Walker',
      asset: 'sprite',
      layout: { kind: 'directional', framesPerDir: 2 },
    },
  ]
  const catalog = await fixture.source.readJson<AssetCatalogV1>('assets/index.json')
  const sprite = catalog.assets.sprite
  if (!sprite) throw new Error('fixture sprite missing')
  // Stand and gesture frames have distinct actual pixel indices in each direction.
  const bytes = await compressGzip(
    encodeSpriteChunk(
      Array.from({ length: 8 }, (_, frame) => ({
        width: 2,
        height: 2,
        pixels: new Uint8Array(4).fill(40 + frame),
        opaque: new Uint8Array(4).fill(1),
      })),
    ),
  )
  fixture.binaries.set(sprite.path, bytes)
  catalog.assets.sprite = { ...sprite, bytes: bytes.length, sha256: await sha256Bytes(bytes) }
  fixture.files['assets/index.json'] = catalog
  const project = await loadCurrentProjectFrom(fixture.source)
  const { WorldScenePresentation } = await import('./world-scene-presentation.js')
  const sprites = vi.spyOn(WorldScenePresentation.prototype, 'sprites')
  await (await import('./main.js')).bootGame(project, {
    kind: 'project',
    projectId: 'shell-project',
  })
  const paintAfter = async (money: number) => {
    await advance(shell, () => state().world.money === money)
    await shell.frame(16)
    const paint = sprites.mock.results.at(-1)
    if (paint?.type !== 'return') throw new Error('world sprite pass missing')
    return paint.value
      .filter(({ occlusionTrigger }) => occlusionTrigger)
      .map((draw) => ({
        index: draw.frame.pixels[0],
        foot: [draw.worldX, draw.worldY],
      }))
  }
  return { paintAfter }
}

test('a named follower changes only its drawn pose, then a real step ends that pose', async () => {
  const { paintAfter } = await bootPartyPose([
    { kind: 'setPartyFacing', facing: 'down', gesture: 1 },
    { kind: 'giveMoney', delta: 1 },
    { kind: 'wait', ms: 300 },
    { kind: 'setPartyFacing', facing: 'up', gesture: 1, member: 1 },
    { kind: 'giveMoney', delta: 1 },
    { kind: 'wait', ms: 300 },
    { kind: 'setPartyFacing', facing: 'left' },
    { kind: 'giveMoney', delta: 1 },
    { kind: 'wait', ms: 300 },
    { kind: 'nudgeParty', dx: 16, dy: 8 },
    { kind: 'setPartyFacing', facing: 'down' },
    { kind: 'giveMoney', delta: 1 },
    { kind: 'wait', ms: 300 },
  ])
  const initial = await paintAfter(51)
  expect(initial.map(({ index }) => index)).toEqual([41, 40])
  const followerTurn = await paintAfter(52)
  expect(followerTurn.map(({ index }) => index)).toEqual([41, 45])
  expect(followerTurn.map(({ foot }) => foot)).toEqual(initial.map(({ foot }) => foot))
  expect((await paintAfter(53)).map(({ index }) => index)).toEqual([42, 45])
  const afterStep = await paintAfter(54)
  expect(afterStep.map(({ index }) => index)).toEqual([40, 40])
  expect(afterStep[0]?.foot).not.toEqual(initial[0]?.foot)
})

test('re-seating the same roster does not revive a follower pose or lend it to a new leader', async () => {
  const { paintAfter } = await bootPartyPose([
    { kind: 'setPartyFacing', facing: 'down', gesture: 1 },
    { kind: 'setPartyFacing', facing: 'up', gesture: 1, member: 1 },
    { kind: 'giveMoney', delta: 1 },
    { kind: 'wait', ms: 300 },
    { kind: 'setParty', members: ['friend', 'hero'] },
    { kind: 'giveMoney', delta: 1 },
    { kind: 'wait', ms: 300 },
    { kind: 'setParty', members: ['hero', 'friend'] },
    { kind: 'giveMoney', delta: 1 },
    { kind: 'wait', ms: 300 },
  ])
  expect((await paintAfter(51)).map(({ index }) => index)).toEqual([41, 45])
  const followerId = state().world.party[1]?.id
  expect(followerId).toBeTruthy()
  expect((await paintAfter(52)).map(({ index }) => index)).toEqual([40, 40])
  expect(state().world.party[0]?.id).toBe(followerId)
  expect((await paintAfter(53)).map(({ index }) => index)).toEqual([40, 40])
  expect(state().world.party[1]?.id).toBe(followerId)
})
