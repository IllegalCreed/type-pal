/**
 * needle-judge.mjs 的可复跑 selftest：在 /tmp 沙箱包上用同一严格判据跑
 * 1 个好针 + 6 类 invalid 反例（hash 漂移、skip、混错、零执行、timeout、错名）。
 * 用法：node docs/testing/glm-large-wave/needle-judge.selftest.mjs
 * 全部符合预期才 exit 0。
 */
import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const judge = resolve(here, 'needle-judge.mjs')
const sandboxRoot = join(tmpdir(), `glw-needle-selftest-${process.pid}`)

function buildSandbox() {
  const pkg = join(sandboxRoot, 'packages', 'sandbox')
  mkdirSync(join(pkg, 'src'), { recursive: true })
  writeFileSync(
    join(pkg, 'src', 'lib.ts'),
    'export const EDGE = 2\nexport function add(a: number, b: number): number {\n  return a + b\n}\n',
  )
  writeFileSync(
    join(pkg, 'src', 'lib.test.ts'),
    `import { expect, test } from 'vitest'\nimport { add, EDGE } from './lib.js'\nimport { appendFileSync } from 'node:fs'\n\nconst BASE = 2\n\ntest('alpha adds two numbers', () => {\n  if (process.env.GLW_SELFTEST_DRIFT === '1') appendFileSync(new URL('./lib.ts', import.meta.url), '\\n// drift\\n')\n  expect(add(1, 1)).toBe(BASE)\n})\ntest('beta uses edge', () => {\n  expect(add(BASE, 0)).toBe(EDGE)\n})\n`,
  )
  writeFileSync(
    join(pkg, 'package.json'),
    JSON.stringify({ name: '@glw-sandbox/pkg', type: 'module' }),
  )
  writeFileSync(
    join(pkg, 'src', 'empty.test.ts'),
    '// no tests here; used for the zero-execution counterexample\n',
  )
  // 沙箱最小 node_modules：让 npx vitest 解析到真仓依赖。
  const repoNodeModules = resolve(here, '../../../node_modules')
  cpSync(repoNodeModules, join(sandboxRoot, 'node_modules'), {
    recursive: true,
    verbatimSymlinks: true,
  })
  const pkgNodeModules = resolve(here, '../../../packages/editor/node_modules')
  cpSync(pkgNodeModules, join(pkg, 'node_modules'), { recursive: true, verbatimSymlinks: true })
}

function run(args, env = {}) {
  const result = spawnSync('node', [judge, ...args], {
    encoding: 'utf8',
    timeout: 300_000,
    env: { ...process.env, ...env },
  })
  let parsed
  try {
    parsed = JSON.parse(result.stdout)
  } catch {
    parsed = null
  }
  return { code: result.status, parsed, output: `${result.stdout ?? ''}\n${result.stderr ?? ''}` }
}

const FIND = 'expect(add(1, 1)).toBe(BASE)'
const REPLACE = 'expect(add(1, 1)).toBe(BASE + 1)'
const NAME = 'alpha adds two numbers'

let failures = 0
function expectCase(label, condition, detail) {
  if (condition) console.log(`ok   ${label}`)
  else {
    failures++
    console.error(`FAIL ${label}: ${detail}`)
  }
}

rmSync(sandboxRoot, { recursive: true, force: true })
buildSandbox()

const base = [
  '--repo-root',
  sandboxRoot,
  '--package',
  'sandbox',
  '--file',
  'packages/sandbox/src/lib.test.ts',
]

// 1 好针 → VALID exit0。
const good = run([...base, '--name', NAME, '--find', FIND, '--replace', REPLACE])
expectCase(
  'good needle is VALID',
  good.code === 0 && good.parsed?.verdict === 'VALID' && good.parsed?.productHashUnchanged === true,
  JSON.stringify(good.parsed ?? good.output.slice(-600)),
)
expectCase(
  'good needle reports absolute file and full name',
  typeof good.parsed?.file === 'string' &&
    good.parsed.file.endsWith('.needle-tmp.test.ts') &&
    good.parsed.fullName === NAME,
  JSON.stringify(good.parsed ?? {}),
)

// 2 hash 漂移 → INVALID。
const drift = run([...base, '--name', NAME, '--find', FIND, '--replace', REPLACE], {
  GLW_SELFTEST_DRIFT: '1',
})
expectCase(
  'hash drift is INVALID',
  drift.code !== 0 &&
    drift.parsed?.verdict === 'INVALID' &&
    /hash drifted/.test(drift.parsed?.reason ?? ''),
  JSON.stringify(drift.parsed ?? drift.output.slice(-600)),
)

// 3 skip → INVALID（把 alpha 换成 skip 语义等价破坏：注入串让 EDGE 检查恒真并跳过？）
// 直接用被测文件中的 skip 反例：注入把 alpha 改为 test.skip 名称不可行（--find 限断言行），
// 改为对 skip 专用文件跑：beta 文件含 skip 时判据拒绝。构造含 skip 的变体文件。
writeFileSync(
  join(sandboxRoot, 'packages', 'sandbox', 'src', 'skips.test.ts'),
  `import { expect, test } from 'vitest'\nimport { add } from './lib.js'\ntest.skip('gamma skipped', () => {\n  expect(add(1, 1)).toBe(2)\n})\ntest('delta holds', () => {\n  expect(add(1, 1)).toBe(2)\n})\n`,
)
const skip = run([
  '--repo-root',
  sandboxRoot,
  '--package',
  'sandbox',
  '--file',
  'packages/sandbox/src/skips.test.ts',
  '--name',
  'delta holds',
  '--find',
  'expect(add(1, 1)).toBe(2)',
  '--replace',
  'expect(add(1, 1)).toBe(4)',
])
expectCase(
  'skipped tests are rejected',
  skip.code !== 0 &&
    skip.parsed?.verdict === 'INVALID' &&
    /skipped/.test(skip.parsed?.reason ?? ''),
  JSON.stringify(skip.parsed ?? skip.output.slice(-600)),
)

// 4 混错（两个测试同时失败）→ INVALID。
const mixed = run([
  ...base,
  '--name',
  NAME,
  '--find',
  'const BASE = 2',
  '--replace',
  'const BASE = 3',
])
expectCase(
  'mixed double failure is INVALID',
  mixed.code !== 0 &&
    mixed.parsed?.verdict === 'INVALID' &&
    /not exactly one/.test(mixed.parsed?.reason ?? ''),
  JSON.stringify(mixed.parsed ?? mixed.output.slice(-600)),
)

// 5 零执行（无测试的文件）→ INVALID。
const zero = run([
  '--repo-root',
  sandboxRoot,
  '--package',
  'sandbox',
  '--file',
  'packages/sandbox/src/empty.test.ts',
  '--name',
  'anything',
  '--find',
  'x',
  '--replace',
  'y',
])
expectCase(
  'zero-execution file is INVALID',
  zero.code !== 0 && zero.parsed?.verdict === 'INVALID',
  JSON.stringify(zero.parsed ?? zero.output.slice(-600)),
)

// 6 timeout 路径 → INVALID。
const timeout = run([
  ...base,
  '--name',
  NAME,
  '--find',
  FIND,
  '--replace',
  REPLACE,
  '--timeout-ms',
  '1',
])
expectCase(
  'timeout is INVALID',
  timeout.code !== 0 &&
    timeout.parsed?.verdict === 'INVALID' &&
    /timed out/.test(timeout.parsed?.reason ?? ''),
  JSON.stringify(timeout.parsed ?? timeout.output.slice(-600)),
)

// 7 错名（注入失败名不含 --name）→ INVALID。
const wrongName = run([
  ...base,
  '--name',
  'a test name that does not exist',
  '--find',
  FIND,
  '--replace',
  REPLACE,
])
expectCase(
  'wrong --name is INVALID',
  wrongName.code !== 0 &&
    wrongName.parsed?.verdict === 'INVALID' &&
    /does not contain --name/.test(wrongName.parsed?.reason ?? ''),
  JSON.stringify(wrongName.parsed ?? wrongName.output.slice(-600)),
)

rmSync(sandboxRoot, { recursive: true, force: true })
if (failures > 0) {
  console.error(`selftest failed: ${failures} case(s)`)
  process.exit(1)
}
console.log('needle-judge selftest: all cases passed')
