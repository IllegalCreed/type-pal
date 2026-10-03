import { type AuthorSceneDef, validateAuthorScenes } from '@type-pal/content'
import { expect, test } from 'vitest'
import { sha256Bytes } from './hash.js'
import receipt from './pal-gov3-content-world-wait-receipt.json' with { type: 'json' }

const sceneModules = import.meta.glob<{ default: unknown }>(
  '../../../projects/pal/content/scenes/s*.json',
  { eager: true },
)
const scenes = new Map(
  validateAuthorScenes(Object.values(sceneModules).map((module) => module.default)).map((scene) => [
    scene.id,
    scene,
  ]),
)

const hash = (value: unknown): Promise<string> =>
  sha256Bytes(new TextEncoder().encode(JSON.stringify(value)))

function stageFor(path: string) {
  const parts = path.split('/')
  const scene: AuthorSceneDef | undefined = scenes.get(parts[0] ?? '')
  if (!scene) throw new Error(`missing scene ${path}`)
  let flow: { stages: readonly { id: string; body: readonly unknown[] }[] } | undefined
  let stageIndex: number
  if (parts[1] === 'onEnter') {
    flow = scene.hooks?.onEnter?.variants[parts[2] ?? '']?.flow
    stageIndex = 4
  } else {
    const entity = scene.entities.find((candidate) => candidate.id === parts[1])
    flow = entity?.behaviors?.trigger?.[parts[3] ?? '']?.flow
    stageIndex = 5
  }
  const stage = flow?.stages.find((candidate) => candidate.id === parts[stageIndex - 1])
  if (!stage) throw new Error(`missing stage ${path}`)
  let body: readonly unknown[] = stage.body
  for (let index = stageIndex; index < parts.length; index += 2) {
    if (parts[index] !== 'body') throw new Error(`invalid body path ${path}`)
    const command = body[Number(parts[index + 1])]
    if (index + 2 === parts.length) return { stage, command }
    if (!command || typeof command !== 'object' || !('body' in command))
      throw new Error(`missing nested body ${path}`)
    body = command.body as readonly unknown[]
  }
  throw new Error(`unterminated body path ${path}`)
}

test('OP_WAIT_FRAMES world wait batch has exact stage hashes and 389 post-values', async () => {
  expect(receipt.counts).toMatchObject({ appliedSites: 389, appliedStages: 81, appliedScenes: 66 })
  const sites = new Set<string>()
  for (const stage of receipt.stages) {
    const first = stage.paths[0]
    if (!first) throw new Error(`empty receipt stage ${stage.owner}`)
    const resolved = stageFor(first.path)
    expect(await hash(resolved.stage.body), stage.owner).toBe(stage.afterBodyHash)
    for (const entry of stage.paths) {
      expect(sites.has(entry.path)).toBe(false)
      sites.add(entry.path)
      const command = stageFor(entry.path).command
      expect(command).toEqual({ kind: 'wait', ms: entry.afterMs })
    }
  }
  expect(sites.size).toBe(receipt.counts.appliedSites)
})
