import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { ProjectManifest } from '@type-pal/content'
import {
  baselineWrites,
  type MigrationSnapshot,
  PAL_BASELINE_REL,
  serializeMigrationJson,
} from './migration-baseline.js'
import type { MigrationPlan } from './migration-plan.js'
import type { TransactionChange, TransactionPrecondition } from './migration-transaction.js'

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
  /** 必须最后提交：新 manifest 只能在资源及其 catalog 已就绪后对运行时可见。 */
  nextManifest?: ProjectManifest<number>
  manifestPreconditions?: readonly TransactionPrecondition[]
  /** Same-version successor: prove the live manifest bytes are unchanged and emit no manifest op. */
  preserveManifestRawText?: string
}): TransactionChange[] {
  const { repo, plan, previousBaseline, nextBaseline, nextManifest } = args
  const changes: TransactionChange[] = []
  for (const [path, value] of [...plan.writes].sort(([a], [b]) => a.localeCompare(b))) {
    changes.push({
      target: `projects/pal/${path}`,
      scope: 'project',
      content: serializeMigrationJson(value, path),
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
  if (args.preserveManifestRawText !== undefined) {
    const path = resolve(repo, 'projects/pal/manifest.json')
    if (!existsSync(path) || readFileSync(path, 'utf8') !== args.preserveManifestRawText)
      throw new Error('same-version transition manifest raw bytes 漂移')
  } else if (nextManifest) {
    if (!args.manifestPreconditions?.length) throw new Error('manifest 变更缺资源闭包前置条件')
    const path = 'projects/pal/manifest.json'
    const content = `${JSON.stringify(nextManifest, null, 2)}\n`
    if (differs(repo, path, content))
      changes.push({
        target: path,
        scope: 'manifest',
        content,
        preconditions: args.manifestPreconditions,
      })
  }
  return changes
}
