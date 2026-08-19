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

function optionalArgument(name: string): string | undefined {
  const prefix = `--${name}=`
  const value = process.argv.find((entry) => entry.startsWith(prefix))?.slice(prefix.length)
  return value ? resolve(repoRoot, value) : undefined
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

interface TransitionDomain {
  transitionId: string
  digestDomain: string
  v4MapImpact: 'direct-body' | 'direct-hash-surface' | 'transitive-parent' | 'none'
  checkpointDisposition: 'rebuild' | 'preserve'
  codeAnchor: string
}

const transitionDomains: readonly TransitionDomain[] = [
  {
    transitionId: 'script-v4-v5',
    digestDomain: 'script identity ledger and source audit; no project-map body/hash input',
    v4MapImpact: 'none',
    checkpointDisposition: 'preserve',
    codeAnchor: 'src/experimental/script-v5/p2-transform.ts',
  },
  {
    transitionId: 'c8-item-use-v5-v1',
    digestDomain: 'item-use owned targets plus script-v4-v5 parent ledger',
    v4MapImpact: 'none',
    checkpointDisposition: 'preserve',
    codeAnchor: 'src/experimental/script-v5/c8-item-use-mg2.ts',
  },
  {
    transitionId: 'r13-cadence-v1',
    digestDomain: 'cadence evidence plus c8-item-use parent seal',
    v4MapImpact: 'none',
    checkpointDisposition: 'preserve',
    codeAnchor: 'src/experimental/script-v5/r13-cadence-mg2.ts',
  },
  {
    transitionId: 'r13-cross-activation-v1',
    digestDomain: 'cross-activation evidence plus cadence parent seal',
    v4MapImpact: 'none',
    checkpointDisposition: 'preserve',
    codeAnchor: 'src/experimental/script-v5/r13-cross-activation-mg2.ts',
  },
  {
    transitionId: 'r13-item-throw-v1',
    digestDomain: 'item-throw evidence plus cross-activation parent seal',
    v4MapImpact: 'none',
    checkpointDisposition: 'preserve',
    codeAnchor: 'src/experimental/script-v5/r13-item-throw-mg2.ts',
  },
  {
    transitionId: 'r13-confirm-v1',
    digestDomain: 'confirm evidence/audits plus item-throw parent seal',
    v4MapImpact: 'none',
    checkpointDisposition: 'preserve',
    codeAnchor: 'src/experimental/script-v5/r13-confirm-mg2.ts',
  },
  {
    transitionId: 'r13-enemy-script-v1',
    digestDomain: 'whole managed parent/successor bodies plus enemy/script owned evidence',
    v4MapImpact: 'direct-body',
    checkpointDisposition: 'rebuild',
    codeAnchor: 'src/experimental/script-v5/r13-enemy-script-augmentation.ts',
  },
  {
    transitionId: 'r13-source-semantics-v1',
    digestDomain: 'whole managed parent/successor bodies plus source-control/augmentation evidence',
    v4MapImpact: 'direct-body',
    checkpointDisposition: 'rebuild',
    codeAnchor: 'src/experimental/script-v5/r13-source-semantics-mg2.ts',
  },
  {
    transitionId: 'r13-z-source-closure-v1',
    digestDomain: 'source/runtime closure evidence plus source-semantics parent seal',
    v4MapImpact: 'transitive-parent',
    checkpointDisposition: 'rebuild',
    codeAnchor: 'src/experimental/script-v5/r13-z-transition-mg2.ts',
  },
  {
    transitionId: 'r13-6c-lossy-closure-v1',
    digestDomain: 'lossy-closure ledger plus source-semantics parent seal',
    v4MapImpact: 'transitive-parent',
    checkpointDisposition: 'rebuild',
    codeAnchor: 'src/pal-r13-six-c.ts',
  },
  {
    transitionId: 'b10-enemy-team-slots-v1',
    digestDomain: 'enemy-team content plus all-managed publication hash surface and R13 control seals',
    v4MapImpact: 'direct-hash-surface',
    checkpointDisposition: 'rebuild',
    codeAnchor: 'src/pal-b10-enemy-team-slots.ts',
  },
  {
    transitionId: 'w9-entity-lifecycle-v1',
    digestDomain: 'all-managed publication hash surfaces plus B10/R13 control graph',
    v4MapImpact: 'direct-hash-surface',
    checkpointDisposition: 'rebuild',
    codeAnchor: 'src/pal-w9-entity-lifecycle.ts',
  },
  {
    transitionId: 'c1-dialogue-identity-v1',
    digestDomain: 'explicit C1 file successor hashes plus W9 parent seal; no direct map list',
    v4MapImpact: 'transitive-parent',
    checkpointDisposition: 'rebuild',
    codeAnchor: 'src/pal-c1-dialogue-identity.ts',
  },
  {
    transitionId: 'c1-npc-curation-v1',
    digestDomain: 'all-managed publication hash surfaces plus C1 dialogue parent seal and approved edits',
    v4MapImpact: 'direct-hash-surface',
    checkpointDisposition: 'rebuild',
    codeAnchor: 'src/pal-c1-npc-curation-transition.ts',
  },
  {
    transitionId: 'b2-battle-field-domain-v1',
    digestDomain: 'all-managed publication hash surfaces plus C1 NPC parent seal and battlefield source',
    v4MapImpact: 'direct-hash-surface',
    checkpointDisposition: 'rebuild',
    codeAnchor: 'src/pal-b2-battle-field-domain.ts',
  },
]

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
  const domains = new Map(transitionDomains.map((entry) => [entry.transitionId, entry]))
  const inventory = readdirSync(transitionsRoot)
    .filter((name) => name.endsWith('.json'))
    .sort((left, right) => left.localeCompare(right, 'en'))
    .map((name) => {
      const path = resolve(transitionsRoot, name)
      const raw = readFileSync(path, 'utf8')
      const value = JSON.parse(raw) as Record<string, unknown>
      if (typeof value.transitionId !== 'string')
        throw new Error(`v4 authority audit: transitionId 无效 ${name}`)
      const domain = domains.get(value.transitionId)
      if (!domain) throw new Error(`v4 authority audit: 未分类 transition ${value.transitionId}`)
      return {
        path: `packages/migrate/baselines/pal/_transitions/${name}`,
        kind: value.kind,
        transitionId: value.transitionId,
        digestDomain: domain.digestDomain,
        v4MapImpact: domain.v4MapImpact,
        checkpointDisposition: domain.checkpointDisposition,
        codeAnchor: `packages/migrate/${domain.codeAnchor}`,
        rawSha256: rawSha256(raw),
        digestFields: collectDigestFields(value),
      }
    })
  const actualIds = inventory.map(({ transitionId }) => transitionId).sort()
  const expectedIds = transitionDomains.map(({ transitionId }) => transitionId).sort()
  if (JSON.stringify(actualIds) !== JSON.stringify(expectedIds))
    throw new Error('v4 authority audit: transition domain inventory 未覆盖精确 15 项')
  return inventory
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

interface OwnedLeafInventory {
  profile: string
  files: number
  scriptChunks: number
  aggregateSha256: string
  entries: Array<{ path: string; sha256: string }>
}

interface AuthorityAuditReport {
  kind: 'type-pal-v4-authority-rebuild-audit'
  version: number
  transitions: ReturnType<typeof transitionInventory>
  ownedLeaves: OwnedLeafInventory[]
}

function compareOwnedLeaves(before: AuthorityAuditReport, after: OwnedLeafInventory[]) {
  const beforeProfiles = [...before.ownedLeaves].sort((left, right) =>
    left.profile.localeCompare(right.profile, 'en'),
  )
  const afterProfiles = [...after].sort((left, right) =>
    left.profile.localeCompare(right.profile, 'en'),
  )
  if (
    JSON.stringify(beforeProfiles.map(({ profile }) => profile)) !==
    JSON.stringify(afterProfiles.map(({ profile }) => profile))
  )
    throw new Error('v4 authority audit: PB4 profile 集合漂移')
  const profiles = afterProfiles.map((current) => {
    const previous = beforeProfiles.find(({ profile }) => profile === current.profile)!
    const beforeEntries = new Map(previous.entries.map((entry) => [entry.path, entry.sha256]))
    const afterEntries = new Map(current.entries.map((entry) => [entry.path, entry.sha256]))
    const paths = [...new Set([...beforeEntries.keys(), ...afterEntries.keys()])].sort((a, b) =>
      a.localeCompare(b, 'en'),
    )
    const entries = paths.map((path) => ({
      path,
      beforeSha256: beforeEntries.get(path) ?? null,
      afterSha256: afterEntries.get(path) ?? null,
      equal: beforeEntries.get(path) === afterEntries.get(path),
    }))
    return {
      profile: current.profile,
      beforeFiles: previous.files,
      afterFiles: current.files,
      beforeAggregateSha256: previous.aggregateSha256,
      afterAggregateSha256: current.aggregateSha256,
      driftCount: entries.filter(({ equal }) => !equal).length,
      entries,
    }
  })
  const driftCount = profiles.reduce((sum, profile) => sum + profile.driftCount, 0)
  if (driftCount) throw new Error(`v4 authority audit: PB4 owned leaf 漂移 ${driftCount}`)
  return {
    beforeReportSha256: rawSha256(JSON.stringify(before)),
    profiles,
    comparedFiles: profiles.reduce((sum, profile) => sum + profile.afterFiles, 0),
    driftCount,
    exactMatch: true,
  }
}

const output = resolve(repoRoot, argument('output'))
const beforePath = optionalArgument('before')
const transitions = transitionInventory()
const ownedLeaves = [
  ownedLeafInventory('r13-4-v9', buildPalHistoricalR13_4V9Migration(freshSources())),
  ownedLeafInventory('r13-5-v10', buildPalHistoricalR13_5V10Migration(freshSources())),
  ownedLeafInventory('r13-6a-v10', buildPalHistoricalR13_6AV10Migration(freshSources())),
]
const before = beforePath
  ? (JSON.parse(readFileSync(beforePath, 'utf8')) as AuthorityAuditReport)
  : undefined
if (before && (before.kind !== 'type-pal-v4-authority-rebuild-audit' || before.version !== 1))
  throw new Error('v4 authority audit: PB4 before report identity/version 漂移')
const report = {
  kind: 'type-pal-v4-authority-rebuild-audit',
  version: 2,
  generatedAt: new Date().toISOString(),
  git: {
    head: git('rev-parse', 'HEAD'),
    statusSha256: rawSha256(git('status', '--porcelain=v1')),
  },
  transitions,
  transitionDomainSummary: {
    total: transitions.length,
    rebuild: transitions.filter(({ checkpointDisposition }) => checkpointDisposition === 'rebuild')
      .length,
    preserve: transitions.filter(({ checkpointDisposition }) => checkpointDisposition === 'preserve')
      .length,
    directBody: transitions.filter(({ v4MapImpact }) => v4MapImpact === 'direct-body').length,
    directHashSurface: transitions.filter(({ v4MapImpact }) => v4MapImpact === 'direct-hash-surface')
      .length,
    transitiveParent: transitions.filter(({ v4MapImpact }) => v4MapImpact === 'transitive-parent')
      .length,
    unaffected: transitions.filter(({ v4MapImpact }) => v4MapImpact === 'none').length,
  },
  ownedLeaves,
  ...(before ? { pb4Comparison: compareOwnedLeaves(before, ownedLeaves) } : {}),
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
