#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const read = (path) => readFileSync(resolve(root, path))
const json = (path) => JSON.parse(read(path).toString('utf8'))
const gitShow = (ref, path) => execFileSync('git', ['show', `${ref}:${path}`], { cwd: root })
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const targets = json('docs/testing/glm-next-triple/targets.json')
const olderLarge = json('docs/testing/glm-large-wave/targets.json')
const olderNew = json('docs/testing/glm-new-waves/targets.json')
const olderK = json('docs/testing/glm-event-wave-k/targets.json')
const previous = new Set([
  olderK.source,
  ...olderLarge.batches.flatMap((batch) => batch.groups.flatMap((group) => group.sources)),
  ...olderNew.waves.flatMap((wave) => wave.groups.flatMap((group) => group.sources)),
])
const failures = []
const claimed = new Set()
if (
  hash(gitShow(targets.productionFreeze, 'scripts/coverage/baseline.fast.json')) !==
  targets.officialBaselineSha256
)
  failures.push('frozen official baseline hash mismatch')
for (const wave of targets.waves) {
  const requiredPrefix = wave.id === 'N' ? 'packages/reforge/src/' : 'packages/editor/src/'
  for (const group of wave.groups) {
    if (!group.id.startsWith(wave.id)) failures.push(`wrong group owner: ${group.id}`)
    for (const path of group.sources) {
      if (!path.startsWith(requiredPrefix) || !/\.tsx?$/.test(path))
        failures.push(`out of scope: ${path}`)
      if (previous.has(path)) failures.push(`historical A-K target reused: ${path}`)
      if (claimed.has(path)) failures.push(`duplicate L-M-N target: ${path}`)
      claimed.add(path)
      try {
        if (hash(read(path)) !== hash(gitShow(targets.productionFreeze, path)))
          failures.push(`source changed since freeze: ${path}`)
      } catch (error) {
        failures.push(`source unreadable: ${path}: ${String(error)}`)
      }
    }
  }
}
if (failures.length) {
  for (const failure of failures) console.error(failure)
  process.exitCode = 1
} else {
  console.log(
    JSON.stringify(
      {
        base: targets.productionFreeze,
        waves: targets.waves.map((wave) => ({
          id: wave.id,
          groups: wave.groups.length,
          sources: wave.groups.reduce((count, group) => count + group.sources.length, 0),
        })),
        totalSources: claimed.size,
        historicalOverlap: 0,
      },
      null,
      2,
    ),
  )
}
