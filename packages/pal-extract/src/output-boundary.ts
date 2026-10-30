import { lstatSync } from 'node:fs'

/**
 * Refuse shared output before callers clean or write it.
 *
 * Extraction entrypoints may create their own output directory, but must never follow
 * a shared `data` or `data/extracted` symlink into another tree's files.
 * `data/raw` is input-only and outside this output ownership check.
 */
export function assertOwnedOutputRoot(dataRoot: string, outputRoot: string): void {
  const dataStat = lstatSync(dataRoot)
  if (dataStat.isSymbolicLink()) {
    throw new Error(`[pal-extract] refuse shared output: data is symlink (${dataRoot})`)
  }
  try {
    if (lstatSync(outputRoot).isSymbolicLink()) {
      throw new Error(
        `[pal-extract] refuse shared output: data/extracted is symlink (${outputRoot})`,
      )
    }
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return
    throw error
  }
}
