import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const repoRoot = resolve(new URL('../..', import.meta.url).pathname)
const opsRoot = resolve(repoRoot, 'docs/ops')
const digest = (path) => createHash('sha256').update(readFileSync(path)).digest('hex')
const entries = []
const add = (from, to, kind, reason) => {
  const absolute = resolve(repoRoot, from)
  entries.push({
    from,
    to,
    kind,
    reason,
    sourceSha256: digest(absolute),
    stopLine:
      'preserve historical payload; verify rewritten links/imports and after SHA before integration',
    governanceTask: 'docs/ops/tasks/OPS-DOC-GOVERNANCE-1-deep-layout.md',
  })
}

// Keep the current board small; the existing board is immutable historical evidence.
add(
  'docs/ops/board.md',
  'docs/ops/archive/board-history/board-20261004.md',
  'board-history',
  'old board snapshots and closed-task narratives are historical, not current responsibility',
)

// Audit scripts belong under a dedicated tools namespace; one extra ../ is needed for package imports.
for (const entry of readdirSync(resolve(opsRoot, 'audits/pre-e2e'), { withFileTypes: true })) {
  if (!entry.isFile() || !/\.(?:mjs|mts|ts|tsx)$/.test(entry.name)) continue
  add(
    `docs/ops/audits/pre-e2e/${entry.name}`,
    `docs/ops/audits/pre-e2e/tools/${entry.name}`,
    'audit-tool',
    'pre-e2e probe/tool is separated from current audit reports; relative imports must be rebased by the executor',
  )
}

// The Kimi evidence driver and receipt belong to its task evidence directory.
const evidenceMoves = [
  [
    'docs/ops/evidence/coverage85-kimi-extract-migrate-r1-evidence.md',
    'docs/ops/evidence/coverage85-kimi-extract-migrate-r1/README.md',
  ],
  [
    'docs/ops/evidence/coverage85-kimi-extract-migrate-r1-mutants.mjs',
    'docs/ops/evidence/coverage85-kimi-extract-migrate-r1/mutants.mjs',
  ],
  [
    'docs/ops/evidence/gen-kimi-r1-ledger.mjs',
    'docs/ops/evidence/coverage85-kimi-extract-migrate-r1/gen-ledger.mjs',
  ],
]
for (const [from, to] of evidenceMoves)
  add(
    from,
    to,
    'task-evidence',
    'task evidence must live under its task directory; receipt and driver remain historical and are not runtime proof',
  )

const output = {
  schemaVersion: 1,
  id: 'ops-governance-layout-20261004',
  generatedBy: 'scripts/docs/build-ops-governance-plan.mjs',
  sourceRevision: '0438dcfdd56df4c388f2ddff12a2a721c8806737',
  rootWhitelist: [
    'README.md',
    'agent-workflow.md',
    'archive',
    'audits',
    'board.md',
    'evidence',
    'guides',
    'tasks',
    'templates',
  ],
  summary: {
    files: entries.length,
    boardHistory: entries.filter((entry) => entry.kind === 'board-history').length,
    auditTools: entries.filter((entry) => entry.kind === 'audit-tool').length,
    taskEvidence: entries.filter((entry) => entry.kind === 'task-evidence').length,
  },
  entries,
}
writeFileSync(
  resolve(opsRoot, 'archive/ops-governance-layout-20261004.json'),
  `${JSON.stringify(output, null, 2)}\n`,
)
console.log(JSON.stringify(output.summary, null, 2))
