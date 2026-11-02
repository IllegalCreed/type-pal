import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadDocumentLocations } from './document-location.mjs'

// Read only. Storage aliases/codecs never create or merge execution identity.
export function readRetainedArtifact(root, args) {
  const [path, flag] = args
  assert(
    path && args.length <= 2 && (!flag || flag === '--cat'),
    'Usage: node scripts/docs/read-retained-artifact.mjs LOGICAL_OR_RELOCATED_PATH [--cat]',
  )
  const locations = loadDocumentLocations(root)
  const identity = locations.identity(path)
  const alias = locations.artifactAliases.find((row) => row.path === identity)
  const compressed = locations.compressedArtifact(alias?.retained ?? identity)
  assert(alias || compressed, 'Path is not an admitted retained artifact')
  const bytes = locations.assertCurrent(identity).current
  locations.assertUnchanged()
  return flag === '--cat'
    ? bytes
    : Buffer.from(
        `${JSON.stringify(
          {
            ...(alias ?? compressed),
            ...(alias && compressed ? { compression: compressed } : {}),
            sourceRevision: locations.manifest.baseRevision,
            currentPath: locations.currentPath(identity),
            executionIdentity:
              'Fixed carrier bytes; original execution provenance and display/original distinctions stay in existing receipts/maps',
          },
          null,
          2,
        )}\n`,
      )
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('../../', import.meta.url))
  process.stdout.write(readRetainedArtifact(root, process.argv.slice(2)))
}
