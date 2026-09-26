import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '../../..')
const editor = path.join(root, 'packages/editor')

const cases = {
  c00: {
    id: 'c00-error-message',
    sourceFile: 'src/core/battle-data-command-errors.ts',
    testFile: 'src/core/command-contract.test.ts',
    from: '仍被 ${references.length} 处引用',
    to: '仍被 ${references.length} 个引用',
    title: 'keeps BattleDataInUseError identity, message and references on the moved module',
  },
  c01: {
    id: 'c01-in-use-message',
    sourceFile: 'src/core/world-variable-commands.ts',
    testFile: 'src/core/world-variable-commands.test.ts',
    from: '处脚本引用',
    to: '个脚本引用',
    title: 'keeps world-variable constructors and in-use error on the old commands barrel',
  },
  c02: {
    id: 'c02-update-label',
    sourceFile: 'src/core/enemy-commands.ts',
    testFile: 'src/core/enemy-commands.test.ts',
    from: "readonly label = '修改敌人'",
    to: "readonly label = '修改敌方'",
    title: 'keeps enemy constructors on the old commands barrel and patches on first apply',
  },
  c03: {
    id: 'c03-slot-cap',
    sourceFile: 'src/core/enemy-team-commands.ts',
    testFile: 'src/core/enemy-team-references.test.ts',
    from: 'slots: this.next.slots.slice(0, 5)',
    to: 'slots: this.next.slots.slice(0, 4)',
    title: 'keeps enemy-team constructors and in-use error on the old commands barrel',
  },
}

const selected = process.argv[2] ? [process.argv[2]] : Object.keys(cases)

function sha256(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex')
}

function failures(json) {
  const found = []
  for (const file of json?.testResults ?? []) {
    for (const assertion of file.assertionResults ?? []) {
      if (assertion.status === 'failed') {
        found.push({
          title: assertion.title,
          fullName: assertion.fullName,
          message: (assertion.failureMessages ?? []).join('\n'),
        })
      }
    }
  }
  return found
}

function run(spec, config, outputFile) {
  const args = [
    'exec',
    'vitest',
    'run',
    '--reporter=json',
    `--outputFile=${outputFile}`,
    '--maxWorkers=1',
    '-t',
    spec.title,
    spec.testFile,
  ]
  if (config) args.push('--config', config)
  const result = spawnSync('pnpm', args, {
    cwd: editor,
    encoding: 'utf8',
    env: { ...process.env, NODE_COMPILE_CACHE: undefined },
  })
  const json = fs.existsSync(outputFile) ? JSON.parse(fs.readFileSync(outputFile, 'utf8')) : null
  return { status: result.status, json, stderr: result.stderr }
}

const reports = []
let failed = false
for (const key of selected) {
  const spec = cases[key]
  if (!spec) {
    console.error(`unknown case ${key}`)
    process.exit(1)
  }
  const absolute = path.join(editor, spec.sourceFile)
  const source = fs.readFileSync(absolute, 'utf8')
  if (source.split(spec.from).length - 1 !== 1) {
    console.error(`${spec.id}: needle count is not 1`)
    process.exit(1)
  }
  const evidence = fs.mkdtempSync(path.join(os.tmpdir(), `${spec.id}-`))
  const before = sha256(absolute)
  const green = run(spec, undefined, path.join(evidence, 'green.json'))
  if (green.status !== 0 || green.json?.numFailedTests !== 0) {
    console.error(`${spec.id} green failed`, green.status, green.stderr?.slice(-1500))
    fs.rmSync(evidence, { recursive: true, force: true })
    process.exit(1)
  }

  const configDir = fs.mkdtempSync(path.join(editor, `.mutant-${spec.id}-`))
  const configPath = path.join(configDir, 'mutant.config.mts')
  const fileNeedle = path.basename(spec.sourceFile)
  fs.writeFileSync(
    configPath,
    `import { defineConfig, mergeConfig } from 'vitest/config'
import base from '../vite.config.ts'

const needle = ${JSON.stringify(spec.from)}
const replacement = ${JSON.stringify(spec.to)}

export default mergeConfig(
  base,
  defineConfig({
    plugins: [
      {
        name: ${JSON.stringify(`${spec.id}-mutant`)},
        enforce: 'pre',
        transform(code, id) {
          const file = id.split('?')[0] ?? id
          if (!file.endsWith(${JSON.stringify(fileNeedle)})) return null
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
    red = run(spec, configPath, path.join(evidence, 'red.json'))
  } finally {
    fs.rmSync(configDir, { recursive: true, force: true })
    fs.rmSync(evidence, { recursive: true, force: true })
  }
  const after = sha256(absolute)
  const failedTests = failures(red.json)
  const assertion =
    failedTests[0]?.message.split('\n').find((line) => line.includes('AssertionError')) ?? null
  const ok =
    red.status === 1 &&
    failedTests.length === 1 &&
    failedTests[0]?.title === spec.title &&
    Boolean(assertion) &&
    before === after
  const report = {
    id: spec.id,
    file: `packages/editor/${spec.sourceFile}`,
    sha256: before,
    hashUnchanged: before === after,
    greenExit: green.status,
    greenPassed: green.json?.numPassedTests ?? null,
    redExit: red.status,
    failedTitle: failedTests[0]?.title ?? null,
    failedFullName: failedTests[0]?.fullName ?? null,
    assertion,
    ok,
  }
  reports.push(report)
  if (!ok) {
    failed = true
    console.error(failedTests[0]?.message?.slice(0, 1200) ?? red.stderr?.slice(-1200))
  }
}

const out = selected.length === 1 ? reports[0] : reports
console.log(JSON.stringify(out, null, 2))
if (failed) process.exit(1)
