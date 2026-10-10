import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  assertContinuousTapeBinding,
  prepareContinuousAcceptance,
} from './continuous-acceptance.mjs'
import { continuousStoryActions, continuousStoryPlan } from './continuous-story.mjs'

const args = process.argv.slice(2),
  values = {}
for (let i = 0; i < args.length; i++) {
  const key = args[i]
  assert(['--game', '--reforge', '--out', '--acceptance'].includes(key), `unknown argument ${key}`)
  assert(args[i + 1] && !args[i + 1].startsWith('--'), `missing value for ${key}`)
  values[key] = resolve(args[++i])
}
for (const key of ['--game', '--reforge', '--out', '--acceptance'])
  assert(values[key], `${key} is required`)

const readReports = async (path) => {
  const value = JSON.parse(await readFile(path, 'utf8'))
  return Array.isArray(value) ? value : [value]
}
const [gameReports, reforgeReports] = await Promise.all([
  readReports(values['--game']),
  readReports(values['--reforge']),
])
const plan = continuousStoryPlan({ gameReports, reforgeReports })
const actions = Object.fromEntries(
  ['game', 'reforge'].map((engine) => [
    engine,
    plan.fragments.map((fragment, index) => ({
      fragment: fragment.id,
      actions: continuousStoryActions((engine === 'game' ? gameReports : reforgeReports)[index]),
    })),
  ]),
)
const receipt = {
  kind: 'continuous-story-action-tape',
  mode: 'story-only',
  boundary: { fragmentLoad: false, fragmentSave: false },
  plan,
  actions,
  acceptance: await Promise.all(
    JSON.parse(await readFile(values['--acceptance'], 'utf8')).map(async (path) => {
      const bytes = await readFile(resolve(path))
      return {
        fragment: JSON.parse(bytes).fragment,
        path: resolve(path),
        sha256: createHash('sha256').update(bytes).digest('hex'),
      }
    }),
  ),
}
const { validated, handoffs } = await prepareContinuousAcceptance(receipt.acceptance)
receipt.handoffs = handoffs
assertContinuousTapeBinding(receipt, validated, handoffs)
await mkdir(resolve(values['--out'], '..'), { recursive: true })
await writeFile(values['--out'], `${JSON.stringify(receipt, null, 2)}\n`)
console.log(`[continuous story] ${values['--out']}`)
