// Deterministic packing shared by initial storage migration and current-generation updates.
// Formatting is never an authority to change values: strict parse, key order and caps follow it.
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { closeSync, constants, mkdtempSync, openSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import {
  hasLossyJsonValue,
  reviewDirRelative,
  reviewStorageContractId,
  reviewStorageFlatCap,
  reviewStorageMarker,
  reviewStorageShardCap,
} from './review-record-storage.mjs'
import { parseTerminalJson } from './terminal-json.mjs'

const require = createRequire(import.meta.url)
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
const demand = (condition, message) => {
  if (!condition) throw new Error(`review-record-storage-packing: ${message}`)
}
export const biomeFormat = (value, path, context) => {
  const input = `${JSON.stringify(value, null, 2).replaceAll('\u26a0', '\\u26a0')}\n`
  demand(Buffer.byteLength(input) < reviewStorageFlatCap, `unformatted file reaches 1 MiB: ${path}`)
  if (context.format) return Buffer.from(context.format(input, path), 'utf8')
  // A regular-file stdin gives the nested Biome launcher an unambiguous EOF;
  // the project registry formatter uses the same no-follow file-descriptor pattern.
  const directory = mkdtempSync(join(tmpdir(), 'rrs-format-'))
  const inputPath = join(directory, 'input.json')
  writeFileSync(inputPath, input, { flag: 'wx' })
  const fd = openSync(inputPath, constants.O_RDONLY | constants.O_NOFOLLOW)
  let result
  try {
    result = spawnSync(
      process.execPath,
      [
        context.biomePath ?? require.resolve('@biomejs/biome/bin/biome'),
        'format',
        '--stdin-file-path',
        path,
      ],
      {
        cwd: context.repoRoot ?? process.cwd(),
        stdio: [fd, 'pipe', 'pipe'],
        encoding: 'utf8',
        maxBuffer: 16 * 1024 * 1024,
        timeout: 30_000,
      },
    )
  } finally {
    closeSync(fd)
    rmSync(directory, { recursive: true, force: true })
  }
  demand(
    !result.error && !result.signal && result.status === 0 && result.stderr === '',
    `formatter failed or emitted diagnostics: ${path}: ${result.stderr || result.error || result.signal || result.status}`,
  )
  return Buffer.from(result.stdout, 'utf8')
}

// C02: post-format strict validation — reparse, deepEqual, Unicode, lossy check
export function validateFormattedOutput(formatted, expectedValue, label, path) {
  demand(
    formatted.length <= reviewStorageShardCap,
    `formatted output exceeds 512 KiB: ${path} (${formatted.length})`,
  )
  let reparsed
  try {
    reparsed = parseTerminalJson(formatted)
  } catch (error) {
    throw new Error(`formatted output is not strict JSON (${error.message}): ${path}`)
  }
  // C02: actual deepStrictEqual (not just stringify comparison)
  demand(
    isDeepStrictEqual(reparsed, expectedValue),
    `formatted output deepStrictEqual mismatch (${label}): ${path}`,
  )
  demand(
    !hasLossyJsonValue(reparsed),
    `formatted output contains lossy values after format (${label}): ${path}`,
  )
  const originalJson = JSON.stringify(expectedValue)
  const reparsedJson = JSON.stringify(reparsed)
  demand(originalJson === reparsedJson, `formatted output loses logical value (${label}): ${path}`)
  demand(
    digest(Buffer.from(reparsedJson)) === digest(Buffer.from(originalJson)),
    `formatted output Unicode/value fingerprint mismatch: ${path}`,
  )
}

export function packReviewStorageRecord({ logicalPath, record, sourcePin, context = {} }) {
  demand(!hasLossyJsonValue(record), `lossy JSON values: ${logicalPath}`)
  const logicalKeys = Object.keys(record)
  const entries = record.entries
  demand(Array.isArray(entries) && entries.length > 0, `entries missing: ${logicalPath}`)
  const logicalSha256 = digest(Buffer.from(JSON.stringify(record)))
  const entryOrderSha256 = digest(Buffer.from(JSON.stringify(entries.map((e) => e.path))))
  const orderedEntriesSha256 = digest(Buffer.from(JSON.stringify(entries)))
  const stem = logicalPath
    .split('/')
    .pop()
    .replace(/\.json$/, '')
  const outputs = [],
    descriptors = [],
    groups = []
  let current = [],
    size = 0
  for (const entry of entries) {
    const next = Buffer.byteLength(JSON.stringify(entry, null, 2)) + 12
    if (current.length && size + next + 260 > 420000) {
      groups.push(current)
      current = []
      size = 0
    }
    current.push(entry)
    size += next
  }
  if (current.length) groups.push(current)
  let position = 0
  for (const [i, values] of groups.entries()) {
    const key = `part-${String(i + 1).padStart(3, '0')}`
    const path = `shards/${stem}/${logicalSha256}/${key}.json`
    const value = {
      schemaVersion: 1,
      logicalPath,
      generation: logicalSha256,
      key,
      positions: values.map(() => position++),
      entries: values,
    }
    const bytes = biomeFormat(value, `${key}.json`, context)
    validateFormattedOutput(bytes, value, 'shard', path)
    outputs.push({ kind: 'shard', path: `${reviewDirRelative}/${path}`, bytes })
    descriptors.push({ key, path, total: values.length, sha256: digest(bytes) })
  }
  const manifest = {}
  for (const key of logicalKeys) if (key !== 'entries') manifest[key] = record[key]
  manifest[reviewStorageMarker] = {
    schemaVersion: 1,
    producer: reviewStorageContractId,
    logicalPath,
    logicalKeys,
    source: sourcePin,
    logicalSha256,
    totalEntries: entries.length,
    entryOrderSha256,
    orderedEntriesSha256,
    shards: descriptors,
  }
  const bytes = biomeFormat(manifest, logicalPath.split('/').pop(), context)
  validateFormattedOutput(bytes, manifest, 'manifest', logicalPath)
  outputs.push({ kind: 'manifest', path: logicalPath, bytes })
  return { outputs, manifest, logicalSha256, entryOrderSha256, orderedEntriesSha256 }
}
