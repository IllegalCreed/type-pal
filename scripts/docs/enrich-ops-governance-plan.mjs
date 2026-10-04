import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const repoRoot = resolve(new URL('../..', import.meta.url).pathname)
const planPath = resolve(repoRoot, 'docs/ops/archive/ops-governance-layout-20261004.json')
const plan = JSON.parse(readFileSync(planPath, 'utf8'))
const revision = '0438dcfdd56df4c388f2ddff12a2a721c8806737'
for (const entry of plan.entries) {
  const name = entry.to.split('/').at(-1)
  const kind = entry.kind
  entry.domain = 'ops'
  entry.module =
    kind === 'audit-tool'
      ? 'pre-e2e-audits'
      : kind === 'task-evidence'
        ? 'task-evidence'
        : 'collaboration-governance'
  entry.capability = name.replace(/\.[^.]+$/, '')
  entry.provenance = ['Codex', 'historical-collaboration-record']
  entry.sourceRefs = [{ path: entry.from, lines: '1-1', anchor: name }]
  entry.publicCallers =
    kind === 'audit-tool'
      ? [`node ${entry.to}`]
      : kind === 'task-evidence'
        ? ['task-specific evidence runner; see evidence README']
        : ['docs/ops/board.md', 'docs/ops/archive/board-history/board-20261004.md']
  entry.legalInputs = [
    'current repository checkout',
    'the task/audit/evidence record identified by this path',
  ]
  entry.businessOracle = {
    type: 'ops-document-governance',
    assertions: [
      'the document remains reachable from the correct current or historical index',
      'historical execution claims retain their original scope and are not promoted by relocation',
    ],
  }
  entry.dedupe = {
    result: 'reviewed',
    against: [
      'docs/ops/board.md',
      'docs/ops/tasks/index.md',
      'docs/ops/evidence/README.md',
      'docs/ops/audits/README.md',
    ],
    notes: 'Layout relocation only; no new runtime/test/coverage credit.',
  }
  entry.revision = {
    currentSha: revision,
    implementationSha: entry.sourceSha256,
    contentVersion: 22,
    minimumSaveVersion: 11,
    history: [
      {
        revision,
        date: '2026-10-04',
        action: 'ops-governance-layout-closeout',
        notRun: ['product runtime', 'E2E', 'coverage'],
      },
    ],
  }
  entry.history = [{ revision, action: 'relocated', source: entry.from, target: entry.to }]
  entry.supersedes = [entry.from]
  entry.evidence = {
    kind: 'layout-record',
    sourceSha256: entry.sourceSha256,
    afterSha256: entry.afterSha256,
  }
  entry.retentionDeadline = '2026-11-01'
  entry.resolution =
    kind === 'board-history'
      ? 'archive-history'
      : kind === 'audit-tool'
        ? 'migrate-audit-tool'
        : 'migrate-task-evidence'
}
plan.policy =
  'Every moved ops record keeps source/after SHA, domain/module/capability, provenance, caller, inputs, oracle, dedupe, revision, evidence, history, supersedes, deadline and stopline. Relocation does not certify runtime, E2E or coverage.'
writeFileSync(planPath, `${JSON.stringify(plan, null, 2)}\n`)
console.log(JSON.stringify(plan.summary, null, 2))
