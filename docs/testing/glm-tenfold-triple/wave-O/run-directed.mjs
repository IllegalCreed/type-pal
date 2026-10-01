#!/usr/bin/env node
/** Wave O 定向实跑：三个 Owner 包全部 glm-o 文件实跑并合并 directed-vitest.json
 *  （file=packages/<pkg>/<rel>，fullName，status）。真实执行证据，非 vitest list 枚举。
 */
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const here = import.meta.dirname
const repoRoot = resolve(here, '../../../..')
const outPath = resolve(here, 'directed-vitest.json')

const tests = []
let failed = 0
for (const pkg of ['migrate', 'content', 'shared']) {
  const tmp = `/tmp/glm-o-directed-${pkg}.json`
  const res = spawnSync(
    'pnpm',
    [
      '--filter',
      `@type-pal/${pkg}`,
      'exec',
      'vitest',
      'run',
      'glm-o',
      ...(pkg === 'migrate' ? ['--project', 'unit'] : []),
      '--reporter=json',
      `--outputFile=${tmp}`,
    ],
    { cwd: repoRoot, encoding: 'utf8', env: { ...process.env, NODE_COMPILE_CACHE: '' } },
  )
  if (res.status !== 0) {
    console.error(`${pkg} directed run exit=${res.status}`)
    console.error(String(res.stderr).slice(0, 2000))
    process.exit(1)
  }
  const json = JSON.parse(readFileSync(tmp, 'utf8'))
  const leaves = (json.testResults ?? []).flatMap((suite) =>
    (suite.assertionResults ?? []).map((leaf) => ({
      file: `packages/${pkg}/${suite.name.replace(/^.*?src\//, 'src/')}`,
      fullName: leaf.fullName,
      status: leaf.status,
    })),
  )
  const topCount = json.numTotalTests
  if (Number.isInteger(topCount) && topCount !== leaves.length)
    throw new Error(`${pkg}: numTotalTests ${topCount} ≠ 叶集合 ${leaves.length}`)
  failed += leaves.filter((t) => t.status !== 'passed').length
  tests.push(...leaves)
  console.log(`${pkg}: ${leaves.length} tests`)
}

writeFileSync(
  outPath,
  JSON.stringify(
    { numTotalTests: tests.length, passed: tests.length - failed, failed, tests },
    null,
    2,
  ) + '\n',
)
console.log(`directed total: ${tests.length}, failed: ${failed}`)
