import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)
const directory = 'scripts/e2e/dragon-pillar'
export const proofSources = [
  'compare-interlude.py',
  'compare-sage-foreground.py',
  'compare-sage.py',
].map((file) => `${directory}/${file}`)

export async function readSpecialProofs(root, game, reforge) {
  const out = await mkdtemp(join(tmpdir(), 'pal-pillar-review-'))
  try {
    const proofs = await Promise.all(
      proofSources.slice(0, 2).map(async (source, index) => {
        const output = join(out, `proof-${index}.json`)
        try {
          await run('python3', ['-B', resolve(root, source), game, reforge, output], { cwd: root })
        } catch (error) {
          if (error.code !== 1) throw error
          // A mismatched native comparison writes its actual findings before returning 1.
          try {
            const data = JSON.parse(await readFile(output, 'utf8'))
            assert.equal(data.status, 'differences-observed')
            return data
          } catch {
            throw new Error(`${source} did not produce its proof: ${error.stderr}`)
          }
        }
        return JSON.parse(await readFile(output, 'utf8'))
      }),
    )
    const [interlude, sage] = proofs
    const findings = [
      ...interlude.differences.map((entry) => ({ type: 'film-to-world-boundary', ...entry })),
      ...[...sage.visualDifferences, ...sage.ownershipDifferences].map((entry) => ({
        type: 'cliff-sage',
        ...entry,
      })),
    ]
    assert.deepEqual(
      proofs.map(({ status }) => status === 'passed'),
      [
        !interlude.differences.length,
        !sage.visualDifferences.length && !sage.ownershipDifferences.length,
      ],
    )
    return { interlude, sage, findings }
  } finally {
    await rm(out, { recursive: true })
  }
}
