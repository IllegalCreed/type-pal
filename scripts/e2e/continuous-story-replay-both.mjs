import assert from 'node:assert/strict'
import { fork } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { repoRoot } from './browser-journey.mjs'
import { continuousStoryPlan } from './continuous-story.mjs'

const args = process.argv.slice(2),
  hold = args.includes('--hold'),
  tape = resolve(args[args.indexOf('--tape') + 1])
assert(tape, 'continuous replay requires --tape')
const output = resolve(
  repoRoot,
  'build/e2e',
  `continuous-both-${new Date().toISOString().replace(/[:.]/g, '-')}`,
)
await mkdir(output, { recursive: true })
const children = new Map(),
  arrivals = new Map()
const start = (engine) => {
  const child = fork(
    fileURLToPath(new URL('./continuous-story-replay-engine.mjs', import.meta.url)),
    [
      engine === 'game' ? '--game' : '--reforge',
      '--headed',
      ...(hold ? ['--hold'] : []),
      '--tape',
      tape,
    ],
    { stdio: ['ignore', 'inherit', 'inherit', 'ipc'] },
  )
  children.set(engine, child)
  child.on('message', (message) => {
    if (!message.checkpoint) return
    const state = arrivals.get(message.checkpoint) ?? new Map()
    state.set(engine, message.state)
    arrivals.set(message.checkpoint, state)
    if (state.size === 2) {
      if (!(hold && message.checkpoint === '006'))
        for (const participant of children.values())
          if (participant.connected && participant.exitCode === null)
            participant.send({ release: message.checkpoint }, () => {})
    }
  })
  child.on('error', () => {})
  return new Promise((resolveChild) =>
    child.once('exit', (code, signal) => resolveChild({ engine, code, signal })),
  )
}
const results = await Promise.all(['game', 'reforge'].map(start))
const receipt = {
  kind: 'continuous-story-replay',
  mode: 'story-only',
  tape,
  results,
  barriers: Object.fromEntries([...arrivals].map(([key, value]) => [key, [...value.keys()]])),
}
await writeFile(resolve(output, 'continuous-both.json'), `${JSON.stringify(receipt, null, 2)}\n`)
assert(
  results.every((result) => result.code === 0),
  `continuous story failed: ${JSON.stringify(results)}`,
)
console.log(`[continuous both] PASS ${output}`)
