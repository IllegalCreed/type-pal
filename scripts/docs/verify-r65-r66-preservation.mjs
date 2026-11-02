import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const results = []
for (const batch of [65, 66]) {
  const name = `docs/phase-governance/reviews/20261017-r${batch}-ops-evidence-readmes.json`
  const review = JSON.parse(readFileSync(resolve(root, name), 'utf8'))
  for (const entry of review.entries) {
    const bytes = readFileSync(resolve(root, entry.path))
    const source = bytes.toString('utf8')
    const start = '<!-- original-source-quote:start -->\n'
    const end = '<!-- original-source-quote:end -->'
    const quoted = source.slice(source.indexOf(start) + start.length, source.lastIndexOf(end))
    const inverse = quoted
      .split('\n')
      .map((line) => (line.startsWith('> ') ? line.slice(2) : line === '>' ? '' : line))
      .join('\n')
    const options = [inverse, inverse.endsWith('\n\n') ? inverse.slice(0, -1) : inverse]
    const sourceMatches = options.some((value) => hash(Buffer.from(value)) === entry.sourceSha256)
    results.push({
      batch,
      path: entry.path,
      sourceSha256: entry.sourceSha256,
      actualAfterSha256: hash(bytes),
      pinnedAfterSha256: entry.afterSha256,
      quoteInverseMatches: sourceMatches,
      afterShaMatches: hash(bytes) === entry.afterSha256,
      credit: 'mechanical preservation only; semantic/independent acceptance withdrawn',
    })
  }
}
console.log(JSON.stringify({ kind: 'r65-r66-current-preservation-check', results }, null, 2))
if (
  results.length !== 20 ||
  results.some((result) => !result.quoteInverseMatches || !result.afterShaMatches)
)
  process.exitCode = 1
