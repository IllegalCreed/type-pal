import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  assertAppendOnly,
  filterProgress,
  PROGRESS_PATH,
  parseProgressDocument,
  reportProgress,
} from './progress.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const json = async (path) => JSON.parse(await readFile(join(root, path), 'utf8'))

export function parseArguments(args) {
  const options = { limit: 40 }
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]
    if (['--json', '--pending', '--check'].includes(arg)) options[arg.slice(2)] = true
    else {
      assert(
        ['--scene', '--entity', '--limit', '--against'].includes(arg),
        `unknown argument: ${arg}`,
      )
      const value = args[++index]
      assert(value && !value.startsWith('--'), `missing value: ${arg}`)
      options[arg.slice(2)] = arg === '--limit' ? Number(value) : value
    }
  }
  assert(Number.isInteger(options.limit) && options.limit > 0, 'limit must be a positive integer')
  return options
}

async function readReference(ref) {
  try {
    return ref.revision
      ? execFileSync('git', ['show', `${ref.revision}:${ref.path}`], {
          cwd: root,
          maxBuffer: 600 * 1024 * 1024,
          stdio: ['ignore', 'pipe', 'pipe'],
        })
      : await readFile(join(root, ref.path))
  } catch (error) {
    if (error.code === 'ENOENT' || (ref.revision && error.status === 128)) return null
    throw error
  }
}

export async function runProgressReport(args = process.argv.slice(2)) {
  const options = parseArguments(args)
  const [index, ledger, library] = await Promise.all([
    json('projects/pal/content/scenes/index.json'),
    readFile(join(root, PROGRESS_PATH), 'utf8').then(parseProgressDocument),
    json('projects/pal/editor/script-preview.json'),
  ])
  const paths = new Set()
  const scenes = await Promise.all(
    index.scenes.map(async (entry) => {
      assert(
        typeof entry.path === 'string' &&
          entry.path.startsWith('content/scenes/') &&
          !entry.path.split('/').includes('..'),
        'invalid canonical scene path',
      )
      assert(!paths.has(entry.path), 'duplicate scene path')
      paths.add(entry.path)
      const scene = await json(`projects/pal/${entry.path}`)
      assert.equal(scene.id, entry.id, 'scene index/body identity mismatch')
      return scene
    }),
  )
  if (options.against) {
    const revision = execFileSync('git', ['rev-parse', '--verify', options.against], {
      cwd: root,
      encoding: 'utf8',
    }).trim()
    assert(/^[a-f0-9]{40}$/.test(revision), 'against must resolve to one Git object')
    const previous = await readReference({ revision, path: PROGRESS_PATH })
    assertAppendOnly(
      previous ? parseProgressDocument(previous.toString('utf8')) : { events: [] },
      ledger,
    )
  }
  const report = await reportProgress({ scenes, library, ledger, readReference })
  const rows = filterProgress(report, options)
  const counts = {}
  for (const row of rows)
    for (const [axis, status] of Object.entries(row.statuses)) {
      counts[axis] ??= {}
      counts[axis][status.current] = (counts[axis][status.current] ?? 0) + 1
    }
  const summary = {
    scope: report.scope,
    totalEntries: report.totalEntries,
    eventCount: report.eventCount,
    matchingContexts: rows.length,
    counts,
    orphanedEvents: report.orphaned.length,
    needsReview: rows.filter((row) => Object.values(row.statuses).some((s) => s.issues.length))
      .length,
  }
  if (options.json)
    console.log(JSON.stringify({ ...summary, orphaned: report.orphaned, rows }, null, 2))
  else {
    console.log(JSON.stringify(summary, null, 2))
    if (!options.check) {
      console.log('entry\tcontext\treview\tinitialState\toptimization')
      for (const row of rows.slice(0, options.limit)) {
        const entry = row.entry
        console.log(
          [
            `${entry.sceneId}/${entry.entityId ?? 'scene'}/${entry.channel}/${entry.schemeId}/${entry.stageId}`,
            row.context?.id ?? '(unrecorded)',
            ...Object.values(row.statuses).map((status) => status.current),
          ].join('\t'),
        )
      }
      if (rows.length > options.limit)
        console.log(
          `Showing ${options.limit}/${rows.length} contexts; use --scene/--entity or --json for the complete selection.`,
        )
    }
  }
  // Filtering changes presentation only; a narrow view must not conceal failures from --check.
  if (
    options.check &&
    (report.orphaned.length ||
      report.rows.some((row) => Object.values(row.statuses).some((status) => status.issues.length)))
  )
    process.exitCode = 1
  return report
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await runProgressReport()
