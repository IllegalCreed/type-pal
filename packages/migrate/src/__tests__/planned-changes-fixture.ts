import { loadProjectMigrationSnapshot } from '../migration-project-io.js'
import { buildMigrationTransactionChanges } from '../migration-write-plan.js'

/** Existing no-race fixtures capture their actual disk input before building the changes. */
export function plannedChanges(
  args: Omit<Parameters<typeof buildMigrationTransactionChanges>[0], 'projectSnapshot'>,
) {
  const projectSnapshot = loadProjectMigrationSnapshot(
    args.repo,
    new Set([...args.plan.writes.keys(), ...args.plan.deletes]),
  )
  return buildMigrationTransactionChanges({ ...args, projectSnapshot })
}
