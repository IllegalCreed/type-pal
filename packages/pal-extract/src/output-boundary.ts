import { lstatSync } from 'node:fs'

/**
 * Refuse to clean output owned by another checkout.
 *
 * `pnpm extract` may create its own output directory, but it must never follow
 * a shared `data` or `data/extracted` symlink and remove another tree's files.
 * `data/raw` remains an input-only path and is checked by the caller separately.
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
