import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { closeSync, lstatSync, openSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadDocumentRegistry } from './document-registry.mjs'
import { incrementalRegistryEntry, incrementalRoute } from './incremental-control-view.mjs'
import { inspectIncrementalCohort } from './incremental-review.mjs'
import { incrementalReviewPath, normalizeIncrementalReview } from './incremental-review-content.mjs'
import {
  prepareIncrementalPublication,
  publishIncrementalPublication,
} from './incremental-review-publication.mjs'
import { loadReviewRecords } from './review-record-storage.mjs'
import { parseTerminalJson } from './terminal-json.mjs'

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const external = (root, path) => {
  const absolute = realpathSync(resolve(path)),
    rel = relative(root, absolute)
  assert(rel === '..' || rel.startsWith('../'), 'ordinary external input required')
  assert(lstatSync(absolute).isFile(), 'ordinary external file required')
  return absolute
}
const checkedJson = (root, descriptor) => {
  const path = external(root, descriptor.path)
  assert(lstatSync(path).size <= 32 * 1024 * 1024, 'external candidate input exceeds32MiB')
  const bytes = readFileSync(path)
  assert.equal(sha(bytes), descriptor.sha256, 'external input digest differs')
  return parseTerminalJson(bytes)
}

export function runIncrementalPublication(argv) {
  const args = new Map(),
    flags = new Set()
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--publish') {
      assert(!flags.has(argv[i]))
      flags.add(argv[i])
      continue
    }
    assert(
      ['--root', '--input', '--out'].includes(argv[i]) && !args.has(argv[i]),
      'unknown/duplicate flag',
    )
    args.set(argv[i], argv[++i])
  }
  const root = realpathSync(
    resolve(args.get('--root') ?? fileURLToPath(new URL('../..', import.meta.url))),
  )
  const requestedOut = resolve(args.get('--out'))
  const out = join(realpathSync(dirname(requestedOut)), basename(requestedOut))
  const outputRelative = relative(root, out)
  assert(outputRelative === '..' || outputRelative.startsWith('../'), 'output must be external')
  try {
    lstatSync(out)
    throw new Error('output already exists')
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  let outputSaved = false
  const git = (a) => execFileSync('git', a, { cwd: root, maxBuffer: 64 * 1024 * 1024 })
  const beforeStatus = git(['status', '--porcelain', '--untracked-files=all']).toString('utf8')
  const head = git(['rev-parse', 'HEAD']).toString('utf8').trim()
  const inputPath = external(root, args.get('--input'))
  assert(lstatSync(inputPath).size <= 65536, 'publication input descriptor exceeds64KiB')
  const input = parseTerminalJson(readFileSync(inputPath))
  assert.equal(input.kind, 'S78-incremental-publication-input/1.0.0')
  assert.equal(input.baseRevision, head, 'input must name the actual publication HEAD')
  const group = loadReviewRecords({ root })
  const existing = inspectIncrementalCohort(group.records)
  let result
  if (existing) {
    assert(existing.rows.every((row) => row.contentReviewStatus === 'content-reviewed'))
    const { registry } = loadDocumentRegistry({
      manifestPath: resolve(root, 'docs/phase-governance/document-registry.json'),
    })
    assert.equal(registry.entries.length, 4351)
    const registryByPath = new Map(registry.entries.map((row) => [row.path, row]))
    const routing = parseTerminalJson(
      readFileSync(resolve(root, 'docs/phase-governance/routing.json')),
    )
    assert.equal(routing.migratedDocuments.length, 4351)
    const routes = new Map(routing.migratedDocuments.map((row) => [row.path, row]))
    assert.equal(routes.size, 4351)
    for (const row of existing.rows) {
      assert.deepEqual(registryByPath.get(row.path), incrementalRegistryEntry(row))
      assert.deepEqual(routes.get(row.path), incrementalRoute(row))
    }
    let pins = 0
    for (const record of group.records.values())
      for (const row of record.entries) {
        assert.equal(
          sha(readFileSync(resolve(root, row.path))),
          row.afterSha256,
          `published after pin differs: ${row.path}`,
        )
        pins++
      }
    assert.equal(pins, 4351)
    result = {
      mode: 'already-published',
      written: 0,
      retired: 0,
      semanticGrants: 0,
      existingAcceptedDocuments: 1916,
      allAfterPinsExact: pins,
      runtimeCredit: 0,
    }
  } else {
    assert.equal(group.records.get(incrementalReviewPath).entries.length, 28)
    const authored = checkedJson(root, input.authoredRecords)
    assert.equal(authored.head, '62f27e854466f540fb595dc4ca4fbcb3bf4adf56')
    assert.equal(authored.entries.length, 1916)
    const override = checkedJson(root, input.ownerPolicyRecords)
    assert.equal(override.entries.length, 1)
    assert.equal(override.entries[0].path, 'docs/ops/code-quality.md')
    const index = authored.entries.findIndex((row) => row.path === override.entries[0].path)
    assert(index >= 0)
    authored.entries[index] = override.entries[0]
    const rows = authored.entries.map(normalizeIncrementalReview)
    const plan = prepareIncrementalPublication({ root, baseRevision: head, rows })
    if (flags.has('--publish')) {
      assert.equal(
        git(['rev-parse', 'HEAD']).toString('utf8').trim(),
        head,
        'HEAD changed before publication',
      )
      assert.equal(
        git(['status', '--porcelain', '--untracked-files=all']).toString('utf8'),
        beforeStatus,
        'worktree changed before publication',
      )
      // Reserve the receipt before acquiring write authority; an output collision
      // must not turn a successful live publication into an unrecorded failure.
      const fd = openSync(out, 'wx', 0o600)
      try {
        result = { mode: 'published', ...publishIncrementalPublication(plan, { allowWrite: true }) }
        writeFileSync(fd, `${JSON.stringify({ head, ...result }, null, 2)}\n`)
        outputSaved = true
      } catch (error) {
        writeFileSync(
          fd,
          `${JSON.stringify({ head, mode: 'publication-failed', message: error.message })}\n`,
        )
        throw error
      } finally {
        closeSync(fd)
      }
    } else result = { mode: 'dry-run', ...plan }
  }
  if (!flags.has('--publish')) {
    assert.equal(
      git(['status', '--porcelain', '--untracked-files=all']).toString('utf8'),
      beforeStatus,
    )
    assert.equal(git(['rev-parse', 'HEAD']).toString('utf8').trim(), head)
  }
  if (!outputSaved)
    writeFileSync(out, `${JSON.stringify({ head, ...result }, null, 2)}\n`, { flag: 'wx' })
  console.log(
    JSON.stringify({
      ...result,
      outputFiles: result.outputFiles?.length,
      retired: Array.isArray(result.retired) ? result.retired.length : result.retired,
      edges: Array.isArray(result.edges) ? result.edges.length : result.edges,
    }),
  )
  return result
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    runIncrementalPublication(process.argv.slice(2))
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
