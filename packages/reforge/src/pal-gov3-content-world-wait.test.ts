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

const palaceGuideWaitPath = 's019/e270/trigger/default/initial/body/17'
const palaceGuideTarget = { scene: 's019', entity: 'e270' }
const palaceGuideMove = {
  kind: 'moveEntity',
  speed: 'normal',
  to: { col: 77, height: 0, row: 17.75 },
  target: palaceGuideTarget,
}

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
    const candidate = entity?.behaviors?.trigger?.[parts[3] ?? '']?.flow
    if (candidate?.kind !== 'stages') throw new Error(`missing ordinary flow ${path}`)
    flow = candidate
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

test('OP_WAIT_FRAMES preserves 389 sites including the palace guide movement replacement', async () => {
  expect(receipt.counts).toMatchObject({ appliedSites: 389, appliedStages: 81, appliedScenes: 66 })
  const sites = new Set<string>()
  for (const stage of receipt.stages) {
    const first = stage.paths[0]
    if (!first) throw new Error(`empty receipt stage ${stage.owner}`)
    const resolved = stageFor(first.path)
    let previousBody = resolved.stage.body
    if (first.path === palaceGuideWaitPath) {
      // L_4327 advances L_4330 for fourteen speed-3 steps before L_4328 hides the guide.
      // Reconstruct the frozen post-migration body to still check the rest of the stage.
      expect(stage.paths).toHaveLength(1)
      expect(first).toMatchObject({ source: [4327], beforeMs: 560, afterMs: 1400 })
      const hide = { kind: 'setEntityState', state: 0, target: palaceGuideTarget }
      const [clearAtTurn, faceRight, rightFrame, redrawWait, faceUp, upFrame] = previousBody.slice(
        5,
        11,
      )
      // L_4313 redraws the right-facing pose before L_4314 turns the guide up.
      expect(clearAtTurn).toEqual({ kind: 'clearDialog' })
      expect(redrawWait).toEqual({ kind: 'wait', ms: 100 })
      expect(previousBody.slice(-3)).toEqual([{ kind: 'clearDialog' }, palaceGuideMove, hide])
      previousBody = [
        ...previousBody.slice(0, 5),
        faceRight,
        rightFrame,
        clearAtTurn,
        faceUp,
        upFrame,
        clearAtTurn,
        ...previousBody.slice(11, -3),
        {
          kind: 'selectEntityBehavior',
          target: palaceGuideTarget,
          channel: 'auto',
          selection: { kind: 'use', value: 'legacy-001' },
        },
        { kind: 'wait', ms: first.afterMs },
        hide,
      ]
    }
    expect(await hash(previousBody), stage.owner).toBe(stage.afterBodyHash)
    for (const entry of stage.paths) {
      expect(sites.has(entry.path)).toBe(false)
      sites.add(entry.path)
      const command = stageFor(entry.path).command
      expect(command).toEqual(
        entry.path === palaceGuideWaitPath ? palaceGuideMove : { kind: 'wait', ms: entry.afterMs },
      )
    }
  }
  expect(sites.size).toBe(receipt.counts.appliedSites)
})
