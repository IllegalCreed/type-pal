import { createHash } from 'node:crypto'
import { relative, sep } from 'node:path'

export interface ListedVitestTest {
  name: string
  file: string
  projectName?: string
}

export interface NormalizedTestEntry {
  file: string
  name: string
  key: string
  projectName: string
  routeKey: string
}

export interface TestListSummary {
  files: number
  tests: number
  sha256: string
  routeSha256: string
  entries: NormalizedTestEntry[]
}

export function normalizeTestList(
  entries: readonly ListedVitestTest[],
  packageRoot: string,
): NormalizedTestEntry[] {
  const normalized = entries.map((entry) => {
    if (!entry || typeof entry.name !== 'string' || !entry.name.trim())
      throw new Error('test manifest: test name 为空')
    if (typeof entry.file !== 'string' || !entry.file)
      throw new Error('test manifest: test file 为空')
    const file = relative(packageRoot, entry.file).split(sep).join('/')
    if (!file || file.startsWith('../') || file === '..' || file.startsWith('/'))
      throw new Error(`test manifest: file 不在 package root 内 ${entry.file}`)
    const name = entry.name.trim().replace(/\s+/g, ' ')
    const projectName = entry.projectName?.trim() ?? ''
    return {
      file,
      name,
      key: `${file}\0${name}`,
      projectName,
      routeKey: `${file}\0${name}\0${projectName}`,
    }
  })
  const compare = (left: string, right: string): number =>
    left < right ? -1 : left > right ? 1 : 0
  normalized.sort((left, right) => compare(left.key, right.key))
  for (let index = 1; index < normalized.length; index++) {
    if (normalized[index]!.key === normalized[index - 1]!.key)
      throw new Error(`test manifest: duplicate test ${normalized[index]!.key}`)
  }
  return normalized
}

export function summarizeTestList(entries: readonly NormalizedTestEntry[]): TestListSummary {
  const compare = (left: string, right: string): number =>
    left < right ? -1 : left > right ? 1 : 0
  const lines = entries.map((entry) => entry.key).sort(compare)
  const routeLines = entries.map((entry) => entry.routeKey).sort(compare)
  return {
    files: new Set(entries.map((entry) => entry.file)).size,
    tests: entries.length,
    sha256: createHash('sha256')
      .update(`${lines.join('\n')}\n`)
      .digest('hex'),
    routeSha256: createHash('sha256')
      .update(`${routeLines.join('\n')}\n`)
      .digest('hex'),
    entries: [...entries],
  }
}
