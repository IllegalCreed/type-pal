import type { MigrationSnapshot } from '../../migration-baseline.js'

export type AppendOnlyTransitionState = 'initialize' | 'replay'

/**
 * Every append-only MG2 seal is published atomically in four places. An empty tuple may be
 * initialized and a complete tuple may be replayed; every partial tuple is corrupt and must fail
 * before a migration plan can merge project content.
 */
export function appendOnlyTransitionState(
  base: MigrationSnapshot,
  args: {
    transitionId: string
    sealPath: string
    errorPrefix: string
  },
): AppendOnlyTransitionState {
  const metadata = base.baselineMetadata?.transitions[args.transitionId] !== undefined
  const file = base.files.has(args.sealPath)
  const managed = base.managedFiles.has(args.sealPath)
  const hash = base.hashes?.has(args.sealPath) === true
  if (!metadata && !file && !managed && !hash) return 'initialize'
  if (metadata && file && managed && hash) return 'replay'
  throw new Error(
    `${args.errorPrefix}: transition 半状态 metadata=${metadata} file=${file} ` +
      `managed=${managed} hash=${hash}`,
  )
}
