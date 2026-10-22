// review-record-storage-guards.mjs — full-selection fail-before-write guards (contract §writer守卫).
// Legacy writers must call assertWritableReviewSelection with their COMPLETE selection set
// before performing any write; lock presence, thin-manifest shape and unsupported shapes are
// rejected up front so a write loop can never persist a prefix before failing.
import { lstatSync } from 'node:fs'
import { parseTerminalJson } from './terminal-json.mjs'

export const reviewStorageLockFile = '.storage.lock'
export const reviewStorageMarker = '_reviewStorage'
export const reviewDirRelative = 'docs/phase-governance/reviews'

export function reviewStorageGuardIssues(selection, context = {}) {
  const readBuffer = context.readBuffer
  const lstat = context.lstat ?? lstatSync
  const resolvePath = context.resolve ?? ((p) => p)
  const issues = []
  const list = Array.isArray(selection) ? selection : []
  if (!Array.isArray(selection) || list.length === 0)
    issues.push('guard selection must be a non-empty array of review paths')
  const seen = new Set()
  for (const path of list) {
    if (
      typeof path !== 'string' ||
      !path.startsWith(`${reviewDirRelative}/`) ||
      path.split('/').includes('..') ||
      path.split('/').some((part) => part === '')
    ) {
      issues.push(`guard: not a review path: ${path}`)
      continue
    }
    if (seen.has(path)) issues.push(`guard: duplicate selection: ${path}`)
    seen.add(path)
    if (path.includes('/shards/')) issues.push(`guard: physical shard selected as review: ${path}`)
  }
  const lockPath = `${reviewDirRelative}/${reviewStorageLockFile}`
  try {
    lstat(resolvePath(lockPath))
    issues.push(`guard: review storage lock present (${lockPath}); publication in progress`)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  for (const path of list) {
    if (typeof path !== 'string' || !path.startsWith(`${reviewDirRelative}/`)) continue
    let bytes
    try {
      bytes = readBuffer(path)
    } catch (error) {
      issues.push(`guard: cannot read selected review (${error.code ?? error.message}): ${path}`)
      continue
    }
    if (bytes === undefined || bytes === null) {
      issues.push(`guard: selected review missing: ${path}`)
      continue
    }
    let document
    try {
      document = parseTerminalJson(bytes)
    } catch (error) {
      issues.push(`guard: selected review is not valid JSON (${error.message}): ${path}`)
      continue
    }
    if (document === null || typeof document !== 'object' || Array.isArray(document)) {
      issues.push(`guard: selected review is not an object: ${path}`)
      continue
    }
    if (Object.hasOwn(document, reviewStorageMarker)) {
      issues.push(
        `guard: thin manifest stores entries in shards (${reviewStorageMarker} present); use review-record-storage writer APIs: ${path}`,
      )
      continue
    }
    if (!Object.hasOwn(document, 'entries')) {
      issues.push(
        `guard: unsupported review shape (no entries array); refusing before any write: ${path}`,
      )
      continue
    }
    if (!Array.isArray(document.entries))
      issues.push(`guard: review entries is not an array; refusing before any write: ${path}`)
  }
  return issues
}

export function assertWritableReviewSelection(selection, context = {}) {
  const issues = reviewStorageGuardIssues(selection, context)
  if (issues.length) {
    throw new Error(
      'review-record-storage guard: refusing before any mutation:\n' +
        issues.map((x) => `  - ${x}`).join('\n'),
    )
  }
}
