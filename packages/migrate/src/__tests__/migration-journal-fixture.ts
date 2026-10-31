import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { type guardFixture, put } from './migration-guard-fixture.js'

/** Populates a caller-owned root with valid disk input, before any intentional JSON corruption. */
export function journalFixture(f: ReturnType<typeof guardFixture>) {
  const id = 'b'.repeat(16)
  const transaction = join(f.repo, '.type-pal-migrate/transactions', id)
  const stagedProject = `.type-pal-migrate/transactions/${id}/stage/000000`
  const stagedManifest = `.type-pal-migrate/transactions/${id}/stage/000001`
  const digest = (body: string) => createHash('sha256').update(body).digest('hex')
  put(join(f.repo, stagedProject), 'pending-project\n')
  put(join(f.repo, stagedManifest), 'pending-manifest\n')
  put(join(f.repo, 'projects/pal/assets/ready.bin'), 'asset-ready')
  put(join(f.repo, 'baselines/evil.json'), 'asset-ready')
  put(join(f.outside, 'keep.txt'), 'outside-keep')
  const projectOperation = {
    kind: 'write',
    target: 'projects/pal/content/a.json',
    scope: 'project',
    staged: stagedProject,
    hash: digest('pending-project\n'),
    previousHash: null,
  }
  const precondition = { target: 'projects/pal/assets/ready.bin', hash: digest('asset-ready') }
  const manifestOperation = {
    kind: 'write',
    target: 'projects/pal/manifest.json',
    scope: 'manifest',
    staged: stagedManifest,
    hash: digest('pending-manifest\n'),
    previousHash: null,
    preconditions: [precondition],
  }
  const journal = { version: 2, id, operations: [projectOperation, manifestOperation] }
  const journalPath = join(f.repo, '.type-pal-migrate/pal-journal.json')
  put(journalPath, JSON.stringify(journal))
  return {
    ...f,
    journal,
    journalPath,
    projectOperation,
    manifestOperation,
    precondition,
    transaction,
  }
}
