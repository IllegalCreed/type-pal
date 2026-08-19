import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { serializeMigrationJson, sha256 } from '../src/migration-baseline.js'
import {
  buildPalHistoricalR13_4V9Migration,
  buildPalHistoricalR13_5V10Migration,
  buildPalHistoricalR13_6AV10Migration,
  type MigrationFileSet,
  type PalMigrationSources,
} from '../src/pal-migration.js'
import { loadPalMigrationSources } from '../src/pal-migration-io.js'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const transitionsRoot = resolve(repoRoot, 'packages/migrate/baselines/pal/_transitions')

function argument(name: string): string {
  const prefix = `--${name}=`
  const value = process.argv.find((entry) => entry.startsWith(prefix))?.slice(prefix.length)
  if (!value) throw new Error(`v4 authority audit: 缺 --${name}=...`)
  return value
}

function git(...args: string[]): string {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim()
}

function rawSha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex')
}

interface DigestField {
  pointer: string
  value: string
}

function collectDigestFields(value: unknown): DigestField[] {
  const result: DigestField[] = []
  const visit = (entry: unknown, pointer: string): void => {
    if (Array.isArray(entry)) {
      for (const [index, item] of entry.entries()) visit(item, `${pointer}/${index}`)
      return
    }
    if (!entry || typeof entry !== 'object') return
    for (const [key, child] of Object.entries(entry)) {
      const childPointer = `${pointer}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`
      if (/digest$/i.test(key) && typeof child === 'string')
        result.push({ pointer: childPointer, value: child })
      visit(child, childPointer)
    }
  }
  visit(value, '')
  return result.sort((left, right) => left.pointer.localeCompare(right.pointer, 'en'))
}

function transitionInventory() {
  return readdirSync(transitionsRoot)
    .filter((name) => name.endsWith('.json'))
    .sort((left, right) => left.localeCompare(right, 'en'))
    .map((name) => {
      const path = resolve(transitionsRoot, name)
      const raw = readFileSync(path, 'utf8')
      const value = JSON.parse(raw) as Record<string, unknown>
      return {
        path: `packages/migrate/baselines/pal/_transitions/${name}`,
        kind: value.kind,
        transitionId: value.transitionId,
        rawSha256: rawSha256(raw),
        digestFields: collectDigestFields(value),
      }
    })
}

function freshSources(): PalMigrationSources {
  return loadPalMigrationSources(repoRoot)
}

function ownedLeafInventory(profile: string, migration: MigrationFileSet) {
  const paths = [...migration.managedFiles]
    .filter(
      (path) =>
        path === 'content/enemies.json' ||
        path === 'content/scripts/index.json' ||
        (path.startsWith('content/scripts/') && path.endsWith('.json')),
    )
    .sort((left, right) => left.localeCompare(right, 'en'))
  const files = paths.map((path) => {
    const value = migration.files.get(path)
    if (value === undefined) throw new Error(`v4 authority audit: ${profile} 缺 ${path}`)
    return { path, sha256: sha256(serializeMigrationJson(value, path)) }
  })
  return {
    profile,
    files: files.length,
    scriptChunks: files.filter(
      (entry) =>
        entry.path.startsWith('content/scripts/') && entry.path !== 'content/scripts/index.json',
    ).length,
    aggregateSha256: rawSha256(JSON.stringify(files)),
    entries: files,
  }
}

const output = resolve(repoRoot, argument('output'))
const report = {
  kind: 'type-pal-v4-authority-rebuild-audit',
  version: 1,
  generatedAt: new Date().toISOString(),
  git: {
    head: git('rev-parse', 'HEAD'),
    statusSha256: rawSha256(git('status', '--porcelain=v1')),
  },
  transitions: transitionInventory(),
  ownedLeaves: [
    ownedLeafInventory('r13-4-v9', buildPalHistoricalR13_4V9Migration(freshSources())),
    ownedLeafInventory('r13-5-v10', buildPalHistoricalR13_5V10Migration(freshSources())),
    ownedLeafInventory('r13-6a-v10', buildPalHistoricalR13_6AV10Migration(freshSources())),
  ],
}
mkdirSync(dirname(output), { recursive: true })
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`)
console.log(
  JSON.stringify({
    output,
    head: report.git.head,
    transitions: report.transitions.length,
    ownedLeaves: report.ownedLeaves.map(({ profile, files, scriptChunks, aggregateSha256 }) => ({
      profile,
      files,
      scriptChunks,
      aggregateSha256,
    })),
  }),
)
