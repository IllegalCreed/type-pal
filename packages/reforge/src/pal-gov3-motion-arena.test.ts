import type { AuthorCondition } from '@type-pal/content'
import { validateAuthorScenes } from '@type-pal/content'
import { expect, test } from 'vitest'
import sceneJson from '../../../projects/pal/content/scenes/s032.json' with { type: 'json' }
import { sha256Bytes } from './hash.js'
import oracle from './pal-gov3-motion-arena-oracle.json' with { type: 'json' }
import { compileRuntimeScriptFlow } from './runtime-script-compiler.js'
import { RuntimeScriptRunner, type ScriptRuntimeHost } from './runtime-script-runner.js'

const [scene] = validateAuthorScenes([sceneJson])
if (!scene) throw new Error('missing arena')
const flow = scene.entities.find((entity) => entity.id === 'e547')?.behaviors?.auto?.default?.flow
if (!flow) throw new Error('missing joint arena loop')
const hash = (value: unknown) => sha256Bytes(new TextEncoder().encode(JSON.stringify(value)))

test.each(
  oracle.cases,
)('joint arena $name preserves all source frames, sounds and RNG calls', async (entry) => {
  const entities = new Map([
    ['e547', { frame: 0, x: 1088, y: 688 }],
    ['e549', { frame: 0, x: 1120, y: 704 }],
  ])
  let time = 0,
    random = entry.seed,
    index = 0
  const sounds: number[] = []
  const samples: {
    at: number
    owner: { frame: number; x: number; y: number }
    opponent: { frame: number; x: number; y: number }
    sounds: number[]
  }[] = []
  const draws: { at: number; ip: number; value: number }[] = []
  const controller = new AbortController()
  const entity = (id: string) => {
    const value = entities.get(id)
    if (!value) throw new Error(`unexpected arena entity ${id}`)
    return value
  }
  const advance = (milliseconds: number) => {
    expect(milliseconds % 100).toBe(0)
    for (let left = milliseconds; left > 0; left -= 100) {
      samples.push({
        at: time,
        owner: { ...entity('e547') },
        opponent: { ...entity('e549') },
        sounds: [...sounds],
      })
      sounds.length = 0
      time += 100
      if (time >= entry.milliseconds) {
        controller.abort()
        break
      }
    }
  }
  const evaluate = (condition: AuthorCondition): boolean => {
    if (condition.kind === 'not') return !evaluate(condition.cond)
    if (condition.kind !== 'chance') throw new Error(`unexpected arena condition ${condition.kind}`)
    let value: number
    if (entry.values.length) value = entry.values[index++ % entry.values.length]!
    else {
      random ^= random << 13
      random ^= random >>> 17
      random ^= random << 5
      value = (random >>> 0) / 2 ** 32
    }
    const ip =
      condition.percent === 69
        ? 8149
        : condition.percent === 49
          ? 8162
          : condition.percent === 39
            ? 8163
            : undefined
    if (ip === undefined) throw new Error(`unexpected arena probability ${condition.percent}`)
    draws.push({ at: time, ip, value })
    return value * 100 < condition.percent
  }
  const host: ScriptRuntimeHost = {
    execute(command) {
      if (command.kind === 'wait') advance(command.ms)
      else if (command.kind === 'setEntityFrame')
        entity(command.target.entity).frame = command.frame
      else if (command.kind === 'nudgeEntity') {
        entity(command.target.entity).x += command.dx
        entity(command.target.entity).y += command.dy
      } else if (command.kind === 'playSound') sounds.push(Number(command.asset.split('.').at(-1)))
    },
    evalCondition: evaluate,
    gameplayNow: () => time,
    wait: async (milliseconds) => advance(milliseconds),
    waitWorldTick: async () => advance(100),
    yieldMacroTask: async () => {},
    confirm: async () => true,
    startBattle: async () => 'victory',
    teleportOut: async () => false,
  }
  try {
    await new RuntimeScriptRunner(host, controller.signal).runFlow(
      compileRuntimeScriptFlow(flow, { timing: 'auto', canonicalContentDigest: 'a'.repeat(64) }),
      {
        cursorController: { checkpointEnabled: false, reachSafePoint: () => 'continue' },
      },
    )
  } catch (error) {
    if (!controller.signal.aborted) throw error
  }
  expect(samples).toHaveLength(entry.sampleCount)
  expect(draws).toHaveLength(entry.drawCount)
  expect(await hash(samples)).toBe(entry.sampleHash)
  expect(await hash(draws)).toBe(entry.drawHash)
  expect(samples.slice(0, 5)).toEqual(entry.firstFrames)
  expect(samples.at(-1)).toEqual(entry.final)
  expect(
    samples.every(
      (sample) => Math.abs(sample.owner.x - 1088) <= 2 && Math.abs(sample.owner.y - 688) <= 1,
    ),
  ).toBe(true)
  expect(
    samples.every(
      (sample) =>
        Math.abs(sample.opponent.x - 1120) <= 12 && Math.abs(sample.opponent.y - 704) <= 8,
    ),
  ).toBe(true)
})
