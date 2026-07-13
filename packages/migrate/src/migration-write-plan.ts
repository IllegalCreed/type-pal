import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  baselineWrites,
  type MigrationSnapshot,
  PAL_BASELINE_REL,
  serializeMigrationJson,
} from './migration-baseline.js'
import type { MigrationPlan } from './migration-plan.js'
import type { TransactionChange } from './migration-transaction.js'

function differs(repo: string, path: string, content: string): boolean {
  const full = resolve(repo, path)
  return !existsSync(full) || readFileSync(full, 'utf8') !== content
}

/** 工程 target 与新纯 theirs baseline 的改动属于同一个可恢复事务。 */
export function buildMigrationTransactionChanges(args: {
  repo: string
  plan: Pick<MigrationPlan, 'writes' | 'deletes'>
  previousBaseline?: MigrationSnapshot
  nextBaseline: MigrationSnapshot
}): TransactionChange[] {
  const { repo, plan, previousBaseline, nextBaseline } = args
  const changes: TransactionChange[] = []
  for (const [path, value] of [...plan.writes].sort(([a], [b]) => a.localeCompare(b))) {
    changes.push({
      target: `projects/pal/${path}`,
      scope: 'project',
      content: serializeMigrationJson(value),
    })
  }
  for (const path of [...plan.deletes].sort()) {
    changes.push({ target: `projects/pal/${path}`, scope: 'project' })
  }

  const desired = baselineWrites(nextBaseline)
  const statePath = `${PAL_BASELINE_REL}/_state.json`
  for (const [path, content] of [...desired]
    .filter(([path]) => path !== statePath)
    .sort(([a], [b]) => a.localeCompare(b))) {
    if (differs(repo, path, content)) changes.push({ target: path, scope: 'baseline', content })
  }
  for (const path of [...(previousBaseline?.managedFiles ?? [])].sort()) {
    if (nextBaseline.managedFiles.has(path)) continue
    const target = `${PAL_BASELINE_REL}/${path}`
    if (existsSync(resolve(repo, target))) changes.push({ target, scope: 'baseline' })
  }
  const state = desired.get(statePath)!
  if (differs(repo, statePath, state))
    changes.push({ target: statePath, scope: 'baseline', content: state })
  return changes
}
