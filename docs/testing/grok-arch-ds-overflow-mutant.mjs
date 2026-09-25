import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '../..')
const editor = path.join(root, 'packages/editor')
const sourceFile = 'src/ui/design-system/overflow-text.tsx'
const testFile = 'src/ui/design-system/overflow-text.test.tsx'
const from = 'node.scrollWidth > node.clientWidth + 1'
const to = 'node.scrollWidth > node.clientWidth'
const title = 'uses a zero-width guard and one-pixel tolerance before adding a Tab stop'

function sha256(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex')
}

function run(config, outputFile) {
  const args = [
    'exec',
    'vitest',
    'run',
    '--reporter=json',
    `--outputFile=${outputFile}`,
    '--maxWorkers=1',
  ]
  if (config) args.push('--config', config)
  args.push(testFile)
  const result = spawnSync('pnpm', args, {
    cwd: editor,
    encoding: 'utf8',
    env: { ...process.env, NODE_COMPILE_CACHE: undefined },
  })
  const json = fs.existsSync(outputFile) ? JSON.parse(fs.readFileSync(outputFile, 'utf8')) : null
  return { status: result.status, json, stderr: result.stderr }
}

function failures(json) {
  const found = []
  for (const file of json?.testResults ?? []) {
    for (const assertion of file.assertionResults ?? []) {
      if (assertion.status === 'failed') {
        found.push({
          title: assertion.title,
          message: (assertion.failureMessages ?? []).join('\n'),
        })
      }
    }
  }
  return found
}

const absolute = path.join(editor, sourceFile)
const source = fs.readFileSync(absolute, 'utf8')
if (source.split(from).length - 1 !== 1) {
  console.error('needle count is not 1')
  process.exit(1)
}
const before = sha256(absolute)
const green = run(undefined, '/tmp/grok-arch-overflow-green.json')
if (green.status !== 0 || green.json?.numFailedTests !== 0) {
  console.error('green failed', green.status, green.stderr?.slice(-1500))
  process.exit(1)
}

const configPath = path.join(editor, '.mutant-overflow.mts')
fs.writeFileSync(
  configPath,
  `import { defineConfig, mergeConfig } from 'vitest/config'
import base from './vite.config.ts'

const needle = ${JSON.stringify(from)}
const replacement = ${JSON.stringify(to)}

export default mergeConfig(
  base,
  defineConfig({
    plugins: [
      {
        name: 'grok-overflow-mutant',
        enforce: 'pre',
        transform(code, id) {
          const file = id.split('?')[0] ?? id
          if (!file.endsWith('overflow-text.tsx')) return null
          const count = code.split(needle).length - 1
          if (count !== 1) throw new Error('needle count ' + count)
          return { code: code.replace(needle, replacement), map: null }
        },
      },
    ],
  }),
)
`,
)

let red
try {
  red = run(configPath, '/tmp/grok-arch-overflow-red.json')
} finally {
  fs.rmSync(configPath, { force: true })
}
const after = sha256(absolute)
const failed = failures(red.json)
const ok =
  red.status === 1 &&
  failed.length === 1 &&
  failed[0]?.title === title &&
  failed[0]?.message.includes('AssertionError') &&
  before === after
const report = {
  id: 'overflow-tolerance',
  file: `packages/editor/${sourceFile}`,
  sha256: before,
  hashUnchanged: before === after,
  greenExit: green.status,
  greenPassed: green.json?.numPassedTests ?? null,
  redExit: red.status,
  failedTitle: failed[0]?.title ?? null,
  assertion: failed[0]?.message.split('\n').find((line) => line.includes('AssertionError')) ?? null,
  ok,
}
console.log(JSON.stringify(report, null, 2))
fs.writeFileSync(
  path.join(here, 'grok-arch-ds-overflow-mutant.json'),
  `${JSON.stringify(report, null, 2)}\n`,
)
if (!ok) {
  console.error(failed[0]?.message?.slice(0, 1200) ?? red.stderr?.slice(-1200))
  process.exit(1)
}
