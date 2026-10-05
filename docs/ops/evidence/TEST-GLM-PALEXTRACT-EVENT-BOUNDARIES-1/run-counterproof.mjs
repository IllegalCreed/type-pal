// TEST-GLM-PALEXTRACT-EVENT-BOUNDARIES-1 反控三态重放脚本（证据再生用，非测试）。
// 逐针：变异产品 → 定向红（exit≠0 且恰 1 指定业务 AssertionError，防 -t 零匹配假绿）→
// git 字节还原 → 定向绿；raw 落盘统一 trimEof（恰好一个终止换行）并按落盘字节计算
// sha256；四态 = 基线绿 / 各针红 / 各针还原绿 / 末次全套重放。逐针记录产品文件
// 原始/变异/恢复 hash。临时树：每相位 raw 先写 mkdtemp 临时目录，终结化到证据目录后
// 在 finally 移除，清理证明（临时树存在性 + 全仓 porcelain 无产品残留）写入回执。
// 任何一步不符即非零退出，不产出合格回执。
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'

const root = path.resolve(import.meta.dirname, '../../../..')
const pkg = path.join(root, 'packages/pal-extract')
const ev = path.join(root, 'docs/ops/evidence/TEST-GLM-PALEXTRACT-EVENT-BOUNDARIES-1')
const logs = path.join(ev, 'mutation-logs')

const FILES = ['src/resources/parsers/__tests__/player-roles.event-boundaries-1.test.ts']

const hashBytes = (file) => createHash('sha256').update(readFileSync(file)).digest('hex')

const run = (args, rawPath) => {
  let stdout = ''
  let exit = 0
  let signal = null
  try {
    stdout = execFileSync('pnpm', ['exec', 'vitest', 'run', ...args], {
      cwd: pkg,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 240_000,
      env: { ...process.env, NODE_COMPILE_CACHE: '' },
    })
  } catch (error) {
    stdout = `${error.stdout ?? ''}${error.stderr ?? ''}`
    exit = error.status ?? 1
    signal = error.signal ?? null
  }
  const trimmed = `${stdout.replace(/\n+$/, '')}\n`
  writeFileSync(rawPath, trimmed)
  return {
    exit,
    signal,
    sha: createHash('sha256').update(trimmed, 'utf8').digest('hex'),
    testsLine: stdout.match(/Tests\s+([^\n]+)/)?.[1]?.trim() ?? '',
    failedLine: stdout.match(/Failed Tests\s+([^\n]+)/)?.[1]?.trim() ?? '',
    firstFailure:
      stdout
        .split('\n')
        .find((line) => line.startsWith('AssertionError') || line.startsWith('Error: ')) ?? '',
  }
}

const mutate = (file, edits) => {
  const full = path.join(pkg, file)
  let source = readFileSync(full, 'utf8')
  for (const [oldText, newText] of edits) {
    if (source.split(oldText).length !== 2)
      throw new Error(`mutation anchor not unique in ${file}: ${oldText.slice(0, 60)}`)
    source = source.replace(oldText, newText)
  }
  writeFileSync(full, source)
}
const restore = (file) => {
  execFileSync('git', ['-C', root, 'checkout', '--', `packages/pal-extract/${file}`], {
    stdio: 'ignore',
  })
}

const needles = [
  {
    id: 'N1-name-pointer-clamped',
    file: 'src/resources/parsers/player-roles.ts',
    edits: [
      [
        `    const personIdx = name[i]! - PERSONS_WORD_OFFSET`,
        `    const personIdx = Math.max(0, name[i]! - PERSONS_WORD_OFFSET)`,
      ],
    ],
    target: FILES[0],
    filter: ['-t', '安全缺省 _name'],
    mutation:
      'player-roles.ts 名称指针下限钳 0 → 0 哨兵缺省 role 错取 persons[0] 当名（越表尾不受此钳影响）',
    expectedFailure: 'roles[1]._name 由 undefined 变 李逍遥（_name 映射数组 toEqual 首失）',
  },
  {
    id: 'N2-elem-water-earth-transposed',
    file: 'src/resources/parsers/player-roles.ts',
    edits: [
      [
        `        water: elemResRows[2]![i]!,
        fire: elemResRows[3]![i]!,
        earth: elemResRows[4]![i]!,`,
        `        water: elemResRows[4]![i]!,
        fire: elemResRows[3]![i]!,
        earth: elemResRows[2]![i]!,`,
      ],
    ],
    target: FILES[0],
    filter: ['-t', '两键行列映射判别补全'],
    mutation: 'player-roles.ts elemResistance 手写键字面量 water↔earth 行互换',
    expectedFailure: 'roles[0].elemResistance 变 {water:50, earth:30}（toEqual 首失）',
  },
]

const tempTree = mkdtempSync(path.join(tmpdir(), 'palextract-boundaries-counterproof-'))
const receipt = { tempTree, phases: {}, needles: [], cleanup: {} }
let failed = false
const assertOk = (condition, message) => {
  if (!condition) {
    failed = true
    console.error(`[counterproof] FAIL: ${message}`)
  }
}

try {
  // 基线绿：定向文件全量。
  const baselineRaw = path.join(tempTree, 'green-baseline.raw')
  const baseline = run(FILES, baselineRaw)
  receipt.phases.greenBaseline = { ...baseline, raw: 'mutation-logs/green-baseline.raw' }
  execFileSync('mv', [baselineRaw, path.join(logs, 'green-baseline.raw')])
  assertOk(baseline.exit === 0, 'green baseline must pass')
  assertOk(/Tests\s+\d+ passed \(\d+\)/.test(`Tests ${baseline.testsLine}`), 'baseline all green')

  for (const needle of needles) {
    const productPath = path.join(pkg, needle.file)
    const originalHash = hashBytes(productPath)
    mutate(needle.file, needle.edits)
    const mutatedHash = hashBytes(productPath)

    const redRaw = path.join(tempTree, `${needle.id}.red.raw`)
    const red = run([needle.target, ...needle.filter], redRaw)
    execFileSync('mv', [redRaw, path.join(logs, `${needle.id}.red.raw`)])

    restore(needle.file)
    const restoredHash = hashBytes(productPath)
    const greenRaw = path.join(tempTree, `${needle.id}.green.raw`)
    const green = run([needle.target, ...needle.filter], greenRaw)
    execFileSync('mv', [greenRaw, path.join(logs, `${needle.id}.green.raw`)])

    receipt.needles.push({
      id: needle.id,
      mutation: needle.mutation,
      expectedFailure: needle.expectedFailure,
      file: needle.file,
      productHashes: { original: originalHash, mutated: mutatedHash, restored: restoredHash },
      hashRestoredEqualsOriginal: restoredHash === originalHash,
      red: {
        exit: red.exit,
        signal: red.signal,
        testsLine: red.testsLine,
        firstFailure: red.firstFailure,
        raw: `mutation-logs/${needle.id}.red.raw`,
        sha: red.sha,
      },
      restoredGreen: {
        exit: green.exit,
        testsLine: green.testsLine,
        raw: `mutation-logs/${needle.id}.green.raw`,
        sha: green.sha,
      },
    })

    assertOk(red.exit !== 0, `${needle.id}: red phase must exit non-zero`)
    assertOk(
      /1 failed/.test(red.testsLine),
      `${needle.id}: red phase must fail exactly the one targeted test (${red.testsLine})`,
    )
    assertOk(
      red.firstFailure.startsWith('AssertionError'),
      `${needle.id}: first failure must be a business AssertionError, got: ${red.firstFailure.slice(0, 80)}`,
    )
    assertOk(green.exit === 0, `${needle.id}: restored phase must pass`)
    assertOk(restoredHash === originalHash, `${needle.id}: restored bytes must equal original`)
  }

  // 末次全套重放：全部针还原后定向文件再跑一遍。
  const finalRaw = path.join(tempTree, 'final-replay.raw')
  const finalReplay = run(FILES, finalRaw)
  execFileSync('mv', [finalRaw, path.join(logs, 'final-replay.raw')])
  receipt.phases.finalReplay = { ...finalReplay, raw: 'mutation-logs/final-replay.raw' }
  assertOk(finalReplay.exit === 0, 'final replay must pass')

  // 产品零残留：本脚本运行后工作树不得有 M/D 产品文件（测试与证据已在/将在此提交前）。
  const porcelain = execFileSync('git', ['-C', root, 'status', '--porcelain'], {
    encoding: 'utf8',
  })
  receipt.cleanup.porcelainAfterRestore = porcelain.trim()
  assertOk(
    !porcelain
      .split('\n')
      .some((line) => /^\s*[MD]\s+packages\/pal-extract\/src\//.test(line ?? '')),
    'no mutated product file may remain',
  )
} finally {
  const tempExistedBeforeRemoval = existsSync(tempTree)
  rmSync(tempTree, { recursive: true, force: true })
  receipt.cleanup.tempTree = {
    path: tempTree,
    existedBeforeRemoval: tempExistedBeforeRemoval,
    removed: !existsSync(tempTree),
  }
}

receipt.allPhasesValid = !failed
writeFileSync(path.join(ev, 'counterproof.json'), `${JSON.stringify(receipt, null, 2)}\n`)
console.log(`[counterproof] ${failed ? 'INVALID' : 'VALID'} — ${needles.length} needles`)
process.exit(failed ? 1 : 0)
