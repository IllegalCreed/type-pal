import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const writers = [
  'scripts/docs/generate-testing-tools-readmes.mjs',
  'scripts/docs/deepen-testing-records.mjs',
]
const design = JSON.parse(
  readFileSync(join(root, 'docs/phase-governance/reviews/20261016-domain-navigation.json'), 'utf8'),
).frozenK0Design
const inventory = design.fullMutationInventory
const outputs = inventory.allMutationClosureIncludingK49
const renames = inventory.deepenWriter.conditionalRename16
const historyDirectories = inventory.deepenWriter.historyDirectoryCreates8
const digest = (text) => createHash('sha256').update(text).digest('hex')

function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'type-pal-retired-doc-writer-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const write = (path, bytes) => {
    mkdirSync(dirname(join(directory, path)), { recursive: true })
    writeFileSync(join(directory, path), bytes)
  }
  for (const path of writers) write(path, readFileSync(join(root, path)))
  return { directory, write }
}

function snapshot(directory) {
  const entries = []
  function visit(path) {
    const absolute = join(directory, path)
    const stat = lstatSync(absolute)
    const mode = stat.mode & 0o777
    if (stat.isSymbolicLink()) entries.push([path, 'symlink', mode, readlinkSync(absolute)])
    else if (stat.isDirectory()) {
      entries.push([path, 'directory', mode])
      for (const name of readdirSync(absolute).sort()) visit(path ? `${path}/${name}` : name)
    } else if (stat.isFile()) {
      entries.push([path, 'file', mode, readFileSync(absolute).toString('base64')])
    } else entries.push([path, 'unexpected-type', stat.mode])
  }
  visit('')
  return entries
}

function refusesWithoutMutation(directory, writer, args = []) {
  const before = snapshot(directory)
  const result = spawnSync(process.execPath, [join(directory, writer), ...args], {
    cwd: directory,
    encoding: 'utf8',
    timeout: 5000,
  })
  assert.equal(result.error, undefined)
  assert.equal(result.signal, null)
  assert.equal(result.status, 1)
  assert.equal(result.stdout, '')
  const source = design.sourcePins.find((pin) => pin.path === writer)
  assert.ok(source)
  assert.equal(
    result.stderr,
    `Retired documentation writer: ${writer.split('/').at(-1)}. ` +
      'Current documents require task-owned template migration. ' +
      `Historical source: ${source.revision} (blob ${source.gitObject}).\n`,
  )
  assert.deepEqual(snapshot(directory), before)
}

test('retired documentation CLIs refuse before historical prerequisites, regardless of flags', (t) => {
  for (const writer of writers) {
    for (const args of [[], ['--write', '--force', '--legacy']]) {
      const { directory } = fixture(t)
      refusesWithoutMutation(directory, writer, args)
    }
  }
})

test('retired documentation CLIs preserve the full historical mutation closure and absent targets', (t) => {
  assert.equal(outputs.length, 100)
  assert.equal(new Set(outputs).size, 100)
  assert.equal(
    digest(`${outputs.join('\n')}\n`),
    '162567ffba0dbc5468232bbf43269c250d9f7651682ba29834fea60090dece99',
  )
  assert.equal(renames.length, 16)
  assert.equal(
    digest(renames.map(({ from, to }) => `${from}\0${to}\n`).join('')),
    'cc2114356f42e0ce4d7674374dae7df6331c668f9ee83ee74055707a8eadc966',
  )
  assert.equal(historyDirectories.length, 8)
  const historyForSource = new Map(
    renames.map(({ from, to }) => [from, historyDirectories.indexOf(dirname(to))]),
  )
  assert.ok([...historyForSource.values()].every((index) => index >= 0))
  const ownershipValues = [undefined, null, false, '', {}]

  for (const writer of writers) {
    for (const mask of [0, 1]) {
      for (let profile = 0; profile < ownershipValues.length; profile++) {
        const { directory, write } = fixture(t)
        const expectedPresent = new Set()
        outputs.forEach((path, index) => {
          const historyIndex = historyDirectories.findIndex((history) =>
            path.startsWith(`${history}/`),
          )
          const sourceHistoryIndex = historyForSource.get(path)
          const present =
            historyIndex >= 0
              ? (historyIndex + mask) % 2 === 0
              : sourceHistoryIndex !== undefined
                ? (sourceHistoryIndex + mask) % 2 !== 0
                : (index + mask) % 2 === 0
          if (!present) return
          expectedPresent.add(path)
          if (path.endsWith('.json')) {
            const value = { fixture: path, index }
            if (profile > 0) value._governance = ownershipValues[profile]
            write(path, `${JSON.stringify(value)}\n`)
          } else {
            const marker =
              profile === 0
                ? ''
                : [
                    'Template: governance-index-v1 / 1.0.0\n',
                    'Template: \n',
                    'Template: unknown-v999 / 99.0.0\n',
                  ][index % 3]
            const link = profile % 2 === 0 ? '- [Testing tools](tools/README.md)\n' : ''
            write(path, `# Owned fixture ${index}\n${marker}${link}${path}\n`)
          }
        })
        for (const { from, to } of renames) {
          assert.notEqual(expectedPresent.has(from), expectedPresent.has(to))
        }
        // Listed filenames are inert sentinels; neither CLI may import or run them.
        for (const path of inventory.toolsWriter.toolREADMEwrites) {
          write(
            `${dirname(path)}/must-not-execute.mjs`,
            "throw new Error('fixture tool executed')\n",
          )
        }
        const before = snapshot(directory)
        const actualFiles = new Set(
          before.filter((entry) => entry[1] === 'file').map((entry) => entry[0]),
        )
        for (const path of outputs) assert.equal(actualFiles.has(path), expectedPresent.has(path))
        for (let index = 0; index < historyDirectories.length; index++) {
          const exists = before.some((entry) => entry[0] === historyDirectories[index])
          assert.equal(exists, (index + mask) % 2 === 0)
        }
        refusesWithoutMutation(directory, writer)
      }
    }
  }
})
