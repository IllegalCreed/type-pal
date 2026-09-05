import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, posix, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { markdownLinks } from './markdown.mjs'

export const digest = (value) => createHash('sha256').update(value).digest('hex')

export function validateMoves(entries) {
  const from = new Set()
  const to = new Set()
  for (const entry of entries) {
    for (const path of [entry.from, entry.to]) {
      if (
        !path ||
        path.startsWith('/') ||
        path.includes('\\') ||
        path.split('/').some((part) => ['', '.', '..', '.git'].includes(part))
      ) {
        throw new Error(`Unsafe document path: ${path}`)
      }
    }
    if (from.has(entry.from) || to.has(entry.to))
      throw new Error(`Duplicate document move: ${entry.from} -> ${entry.to}`)
    from.add(entry.from)
    to.add(entry.to)
  }
}

export function rewriteLinks(markdown, from, to, mapping) {
  const changes = new Map()
  for (const link of markdownLinks(markdown, { positions: true })) {
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(link.target)) continue
    const index = link.target.search(/[?#]/)
    const path = index < 0 ? link.target : link.target.slice(0, index)
    const suffix = index < 0 ? '' : link.target.slice(index)
    if (!path) continue
    const oldTarget = path.startsWith('/')
      ? posix.normalize(decodeURIComponent(path.slice(1)))
      : posix.normalize(posix.join(posix.dirname(from), decodeURIComponent(path)))
    const target = mapping.get(oldTarget.replace(/\/$/, '')) ?? oldTarget
    let newPath = path.startsWith('/') ? `/${target}` : posix.relative(posix.dirname(to), target)
    if (!newPath) newPath = '.'
    // Preserve angle destinations; elsewhere encode spaces and delimiters so a
    // valid path cannot turn into a title or truncate a balanced destination.
    if (markdown[link.start - 1] !== '<')
      newPath = newPath.replaceAll(' ', '%20').replaceAll('(', '%28').replaceAll(')', '%29')
    changes.set(link.start, { start: link.start, end: link.end, value: newPath + suffix })
  }
  let result = markdown
  for (const change of [...changes.values()].sort((a, b) => b.start - a.start)) {
    result = result.slice(0, change.start) + change.value + result.slice(change.end)
  }
  return result
}

// Replace complete repository paths in prose, code comments and tool inputs.
// A SHA:path reference belongs to that immutable Git tree, never the new tree.
export function rewriteRepositoryPaths(text, mapping) {
  const candidates = [...mapping.entries()]
    .filter(([from, to]) => from !== to && from.includes('/'))
    .sort((a, b) => b[0].length - a[0].length)
  if (!candidates.length) return text
  const escaped = candidates.map(([from]) => from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const pattern = new RegExp(escaped.join('|'), 'g')
  return text.replace(pattern, (matched, offset) => {
    const before = text.slice(Math.max(0, offset - 48), offset)
    if (/[a-f\d]{7,40}\^?:$/i.test(before) || /\/blob\/[a-f\d]{7,40}\/$/i.test(before))
      return matched
    const after = text[offset + matched.length]
    if (after && /[\w.-]/.test(after)) return matched
    return mapping.get(matched)
  })
}

export function applyRelocation(root, entries, mapping, { write = false } = {}) {
  validateMoves(entries)
  const sources = new Set(entries.map((entry) => entry.from))
  const prepared = []
  // Read and validate everything before the first mutation. Mapping collisions
  // and edits since planning must never become a partially applied move.
  for (const entry of entries) {
    const source = resolve(root, entry.from)
    const bytes = readFileSync(source)
    if (entry.sha256 !== digest(bytes))
      throw new Error(`Document changed since planning: ${entry.from}`)
    if (entry.to !== entry.from && existsSync(resolve(root, entry.to)) && !sources.has(entry.to))
      throw new Error(`Destination exists: ${entry.to}`)
    let next = bytes
    if (/\.(?:md|html|ts|tsx|mjs|mts|json|sh)$/i.test(entry.from)) {
      const original = bytes.toString('utf8')
      const linked = /\.md$/i.test(entry.from)
        ? rewriteLinks(original, entry.from, entry.to, mapping)
        : original
      next = Buffer.from(rewriteRepositoryPaths(linked, mapping))
    }
    prepared.push({ ...entry, bytes: next })
  }
  // Cyclic swaps are deliberately rejected rather than overwriting their input.
  if (entries.some((entry) => entry.from !== entry.to && sources.has(entry.to)))
    throw new Error('Overlapping moves require a separate staging plan')
  if (write) {
    for (const entry of prepared) {
      const destination = resolve(root, entry.to)
      mkdirSync(dirname(destination), { recursive: true })
      if (entry.from !== entry.to) renameSync(resolve(root, entry.from), destination)
      if (!readFileSync(destination).equals(entry.bytes)) writeFileSync(destination, entry.bytes)
    }
  }
  return prepared.map(({ bytes, ...entry }) => ({ ...entry, afterSha256: digest(bytes) }))
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [planPath, flag] = process.argv.slice(2)
  if (!planPath || (flag && flag !== '--write'))
    throw new Error('Usage: node scripts/docs/relocate.mjs PLAN.json [--write]')
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
  const plan = JSON.parse(readFileSync(resolve(root, planPath), 'utf8'))
  const mapping = new Map([
    ...plan.entries.map((entry) => [entry.from, entry.to]),
    ...Object.entries(plan.directories ?? {}),
  ])
  const result = applyRelocation(root, plan.entries, mapping, { write: flag === '--write' })
  console.log(
    JSON.stringify(
      {
        mode: flag === '--write' ? 'write' : 'dry-run',
        files: result.length,
        moved: result.filter((entry) => entry.from !== entry.to).length,
      },
      null,
      2,
    ),
  )
}
