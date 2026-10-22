import type { PalLanguagePack } from '@type-pal/shared'

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** Validate the optional text resource before publishing any part of it to the running game. */
function assertLanguagePack(value: unknown): asserts value is PalLanguagePack {
  const invalid = (): never => {
    throw new Error('Invalid English language pack')
  }
  if (!record(value) || value.version !== 1 || value.language !== 'en') return invalid()
  const { source, words, groups, layout } = value
  if (!record(source) || !record(words) || !Array.isArray(groups) || !record(layout)) {
    return invalid()
  }
  for (const key of ['slfSha256', 'scriptSha256', 'messageSha256']) {
    if (typeof source[key] !== 'string' || !/^[a-f0-9]{64}$/.test(source[key])) return invalid()
  }
  for (const [key, word] of Object.entries(words)) {
    if (!/^(0|[1-9]\d*)$/.test(key) || typeof word !== 'string') return invalid()
  }
  const keys = new Set<string>()
  for (const group of groups) {
    if (
      !record(group) ||
      !Number.isInteger(group.start) ||
      !Number.isInteger(group.end) ||
      typeof group.start !== 'number' ||
      typeof group.end !== 'number' ||
      group.start < 0 ||
      group.end < group.start ||
      !Array.isArray(group.lines) ||
      !group.lines.every((line: unknown) => line === null || typeof line === 'string')
    ) {
      return invalid()
    }
    const key = `${group.start}:${group.end}`
    if (keys.has(key)) return invalid()
    keys.add(key)
  }
  for (const [key, pos] of Object.entries(layout)) {
    if (
      !/^[1-9]\d*$/.test(key) ||
      !record(pos) ||
      typeof pos.x !== 'number' ||
      typeof pos.y !== 'number' ||
      typeof pos.flags !== 'number' ||
      !Number.isInteger(pos.x) ||
      !Number.isInteger(pos.y) ||
      !Number.isInteger(pos.flags) ||
      pos.x < -320 ||
      pos.x >= 320 ||
      pos.y < -200 ||
      pos.y >= 200 ||
      pos.flags < 0 ||
      pos.flags > 3
    ) {
      return invalid()
    }
  }
}

export function parseLanguagePack(value: unknown): PalLanguagePack {
  assertLanguagePack(value)
  return value
}

/** Chinese-only extractions do not request en.json, avoiding a speculative missing-resource fetch. */
export async function loadEnglishLanguage(
  base = '/extracted',
): Promise<PalLanguagePack | undefined> {
  const manifestResponse = await fetch(`${base}/lookup/languages.json`)
  if (!manifestResponse.ok) throw new Error(`Language manifest HTTP ${manifestResponse.status}`)
  const manifest: unknown = await manifestResponse.json()
  if (!record(manifest) || !Array.isArray(manifest.languages)) {
    throw new Error('Invalid language manifest')
  }
  if (!manifest.languages.includes('en')) return undefined
  const response = await fetch(`${base}/lookup/en.json`)
  if (!response.ok) throw new Error(`English language pack HTTP ${response.status}`)
  return parseLanguagePack(await response.json())
}
