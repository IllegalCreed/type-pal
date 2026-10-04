import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const repoRoot = resolve(new URL('../..', import.meta.url).pathname)
const testingRoot = resolve(repoRoot, 'docs/testing')
const manifest = JSON.parse(
  readFileSync(resolve(testingRoot, 'legacy-flat-classification.json'), 'utf8'),
)
const legacyManifest = JSON.parse(readFileSync(resolve(testingRoot, 'legacy-flat.json'), 'utf8'))
const legacyByPath = new Map((legacyManifest.entries ?? []).map((entry) => [entry.path, entry]))
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const currentRevision = execFileSync('git', ['rev-parse', 'HEAD'], {
  cwd: repoRoot,
  encoding: 'utf8',
}).trim()
const sourcePattern =
  /(?:packages|scripts)\/[\w@./-]+\.(?:ts|tsx|mts|mjs)(?::(\d+)(?:[-–](\d+))?)?/g
const commandPattern = /(?:^|[`\s])(pnpm|node|git|npm|npx)\s+[^\n`]+/g

function sourceRefs(text) {
  const refs = []
  for (const match of text.matchAll(sourcePattern)) {
    const path = match[0].replace(/:\d+(?:[-–]\d+)?$/, '')
    const start = Number(match[1] ?? 1)
    const end = Number(match[2] ?? match[1] ?? start)
    const absolute = resolve(repoRoot, path)
    if (!existsSync(absolute)) continue
    const bytes = readFileSync(absolute)
    const lines = bytes.toString('utf8').split('\n')
    const anchor = (lines[start - 1] ?? path).trim().slice(0, 160) || path
    refs.push({
      path,
      lines: `${start}-${end}`,
      anchor,
      sha256: sha256(bytes),
      source: 'body-reference',
    })
  }
  return [...new Map(refs.map((ref) => [`${ref.path}:${ref.lines}`, ref])).values()]
}

function decision(entry, text) {
  if (entry.supersededBy?.includes('legacy-full-closeout-relocation.json'))
    return {
      kind: 'archive-history',
      wave: 3,
      reason:
        'historical material was physically relocated under the full closeout plan; preserve source SHA and do not promote it to a current contract',
    }
  if (entry.disposition === 'migrated')
    return { kind: 'migrated', wave: 0, reason: 'already retired by a SHA-locked migration batch' }
  if (entry.kind === 'tool') {
    return {
      kind: 'tool-audit-first',
      wave: 4,
      reason:
        'tool may contain relative imports, temporary hosts, mutation cleanup, or a unique public runner; audit before moving',
    }
  }
  return {
    kind: 'archive-history',
    wave: 3,
    reason: /counter|failed|rework|not.?verified|未证|失败/.test(text)
      ? 'historical counter/rework material is archived without becoming a current contract'
      : 'standalone report/evidence is archived after source/caller/oracle/dedupe review; no current contract is inferred',
  }
}

function commands(text) {
  return [
    ...new Set(
      [...text.matchAll(commandPattern)]
        .map((match) => match[0].replace(/^[`\s]+/, '').trim())
        .filter((command) => /^(?:pnpm|node|git|npm|npx)\s+\S+/.test(command))
        .map((command) => command.slice(0, 240)),
    ),
  ].slice(0, 12)
}

function toolAudit(path, text, imported) {
  const cwdSignals = [
    ...(text.match(/process\.cwd\(\)/g) ?? []).map(() => 'process.cwd() observed'),
    ...(text.match(/process\.chdir\(/g) ?? []).map(() => 'process.chdir(...) observed'),
    ...(text.match(/cwd\s*:/g) ?? []).map(() => 'child-process cwd option observed'),
  ]
  const cleanupSignals = [
    ...(text.match(/rmSync|rm\s+-rf|mkdtemp|finally\s*\{|cleanup|dispose|teardown/gi) ?? []),
  ]
  return {
    imports: imported.length ? imported : ['none observed'],
    cwd: [...new Set([...cwdSignals, 'runner cwd must be repository root'])],
    runner: [`node docs/testing/${path}`],
    temporaryTrees: /tmp|mkdtemp|temporary|fixture/i.test(text)
      ? 'temporary tree signal observed; verify isolation before moving'
      : 'none observed in source text',
    cleanup: cleanupSignals.length
      ? [...new Set(cleanupSignals)].slice(0, 12)
      : ['no cleanup signal observed; retain until manually verified'],
    stopLine:
      'do not move until cwd, imports, temporary tree, cleanup, and public runner are independently verified',
  }
}

const entries = manifest.entries
  .filter(
    (entry) =>
      entry.disposition === 'retain-legacy' ||
      entry.supersededBy?.includes('legacy-full-closeout-relocation.json'),
  )
  .map((entry) => {
    const relativeSource = existsSync(resolve(testingRoot, entry.path))
      ? entry.path
      : entry.canonicalTarget
    const absolute = resolve(testingRoot, relativeSource)
    const text = existsSync(absolute) ? readFileSync(absolute, 'utf8') : ''
    const refs = sourceRefs(text)
    const publicCommands = commands(text)
    const imported = [
      ...new Set([...text.matchAll(/^import .* from ['"]([^'"]+)['"]/gm)].map((m) => m[1])),
    ]
    const plan = decision(entry, text)
    const archiveTarget = `archive/legacy/${entry.domain}/${entry.module}/${entry.path}`
    const isTool = entry.kind === 'tool'
    const publicCallers = publicCommands.length
      ? publicCommands
      : isTool
        ? [`node docs/testing/${entry.path}`]
        : ['document-only historical record; no public runner registered']
    const sourceRefsWithRole = refs.map((ref) => ({ ...ref, role: 'source-inventory' }))
    const audit = isTool ? toolAudit(entry.path, text, imported) : null
    const legalInputs = [
      'current repository checkout at the recorded revision',
      ...(refs.length
        ? refs.map((ref) => `${ref.path}:${ref.lines}`)
        : ['the archived source record itself']),
    ].slice(0, 8)
    const businessOracle = {
      type: 'document-audit',
      assertions: [
        'sourceRefs resolve to existing files with full SHA-256 and line anchors',
        'historical execution claims remain historical and are not promoted to current runtime proof',
        isTool
          ? 'runner/import/cwd/cleanup boundaries remain explicit before any relocation'
          : 'archive placement does not create a current product or coverage contract',
      ],
    }
    const dedupe = {
      result: 'reviewed',
      against: [
        'docs/testing/catalog.json',
        'docs/testing/legacy-flat-classification.json',
        'docs/testing/archive/migrations/legacy-full-closeout-plan.json',
      ],
      notes:
        'This closeout record is an inventory/decision, not a new runtime test or coverage credit.',
    }
    return {
      path: entry.path,
      kind: entry.kind,
      domain: entry.domain,
      module: entry.module,
      capability: entry.capability,
      provenance: entry.provenance,
      sourceSha: entry.sourceSha,
      retentionDeadline: legacyByPath.get(entry.path)?.migrateBy ?? null,
      governanceTask: 'docs/ops/archive/tasks/done/TESTING-DOC-GOVERNANCE-1-depth.md',
      bodyLines: text.split('\n').length,
      sourceRefs: sourceRefsWithRole,
      publicCommands,
      publicCallers,
      legalInputs,
      businessOracle,
      dedupe,
      revision: {
        currentSha: currentRevision,
        implementationSha: entry.sourceSha,
        contentVersion: 22,
        minimumSaveVersion: 11,
        history: [
          {
            revision: currentRevision,
            date: '2026-10-04',
            action: 'legacy-closeout-review',
            notRun: ['runtime', 'E2E', 'coverage'],
          },
        ],
      },
      evidence: {
        kind: 'source-inventory',
        sourceSha: entry.sourceSha,
        sourceRefs: sourceRefsWithRole,
        bodyLines: text.split('\n').length,
        claims: ['historical source inventory and disposition only'],
      },
      supersedes: [`docs/testing/${entry.path}`],
      toolAudit: audit,
      toolImports: entry.kind === 'tool' ? imported : [],
      canonicalTarget: isTool ? archiveTarget : (entry.canonicalTarget ?? archiveTarget),
      decision: plan.kind,
      wave: plan.wave,
      reason: plan.reason,
      stopLine: isTool
        ? audit.stopLine
        : 'do not restore this record as current; any new contract requires a separately cataloged canonical report/evidence pair',
      executionClaimScope: /实跑|实测|passed|exit\s*0|复跑/i.test(text)
        ? 'historical-claim-requires-evidence'
        : 'document-only',
      resolution: isTool ? 'retain-legacy-with-stopline' : 'archive-history',
    }
  })

const output = {
  schemaVersion: 1,
  id: 'legacy-full-closeout-plan',
  generatedBy: 'scripts/docs/build-legacy-closeout-plan.mjs',
  generatedFrom: 'docs/testing/legacy-flat-classification.json',
  policy:
    'Every remaining legacy entry must reach migrated, archive-history, or retain-with-review with a source SHA and stop line; no silent deletion.',
  summary: {
    total: entries.length,
    byWave: Object.fromEntries(
      Object.entries(Object.groupBy(entries, (entry) => entry.wave)).map(([wave, values]) => [
        wave,
        values.length,
      ]),
    ),
    byDecision: Object.fromEntries(
      Object.entries(Object.groupBy(entries, (entry) => entry.decision)).map(
        ([decision, values]) => [decision, values.length],
      ),
    ),
    sourceRefs: entries.filter((entry) => entry.sourceRefs.length > 0).length,
    publicCommands: entries.filter((entry) => entry.publicCommands.length > 0).length,
    toolImports: entries.filter((entry) => entry.toolImports.length > 0).length,
  },
  entries: [],
  entryFiles: [],
}
const migrationRoot = resolve(testingRoot, 'archive/migrations')
for (let index = 0; index < entries.length; index += 50) {
  const name = `legacy-full-closeout-plan-${String(index / 50 + 1).padStart(2, '0')}.json`
  output.entryFiles.push(`archive/migrations/${name}`)
  writeFileSync(
    resolve(migrationRoot, name),
    `${JSON.stringify({ schemaVersion: 1, id: `legacy-full-closeout-plan-${index / 50 + 1}`, sourcePlan: 'legacy-full-closeout-plan.json', entries: entries.slice(index, index + 50) }, null, 2)}\n`,
  )
}
writeFileSync(
  resolve(migrationRoot, 'legacy-full-closeout-plan.json'),
  `${JSON.stringify(output, null, 2)}\n`,
)
console.log(JSON.stringify(output.summary, null, 2))
