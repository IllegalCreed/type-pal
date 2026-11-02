// TEST-GLM-GAME-SHELL-BOOTSTRAP-1 严格三态反控 runner(GLM r1)。
//
// 判据(对齐已验收卡 TEST-GLM-GAME-TURN-BOUNDARIES-1 / PALEXTRACT-EVENT-BOUNDARIES-1 判例):
//  - 绿相位:定向文件 exit 0,执行集(numTotalTests=6,零 skip)与 identity sha 记盘;
//  - 每针:find 串在目标源文件中恰出现 1 次(否则 INVALID,不改文件);单点变异后记录 mutated sha;
//  - 红相位:exit≠0 且 numFailedTests 恰 1、该 failed 的 fullName 与目标合同精确相等、
//    failureMessages[0] 以 AssertionError 开头(业务断言,非 TypeError/编译错);
//  - 恢复:反向替换后源文件 sha256 与原始逐字节一致(cleanupRestored);
//  - 恢复绿:重跑 exit 0 且 identity sha 与原始绿一致;
//  - 反控驱动运行期禁止并发编辑(卡面纪律);全程串行 spawn。
// 运行:node docs/ops/evidence/TEST-GLM-GAME-SHELL-BOOTSTRAP-1/run-counterproof.mjs
//      (cwd = 仓库根;vitest 从 packages/game 目录用 pnpm exec 起,避免 --filter banner 污染 JSON。)

import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = '/private/tmp/type-pal-shell-bootstrap'
const PKG = join(ROOT, 'packages/game')
const TEST_FILE = 'src/shell/shell-bootstrap.glm-shell.test.ts'
const EVIDENCE = join(ROOT, 'docs/ops/evidence/TEST-GLM-GAME-SHELL-BOOTSTRAP-1')
const LOGS = join(EVIDENCE, 'mutation-logs')
mkdirSync(LOGS, { recursive: true })

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex')

function runVitest(tag) {
  const res = spawnSync('pnpm', ['exec', 'vitest', 'run', TEST_FILE, '--reporter=json'], {
    cwd: PKG,
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
  })
  writeFileSync(join(LOGS, `${tag}.stdout.log`), res.stdout ?? '')
  writeFileSync(join(LOGS, `${tag}.stderr.log`), res.stderr ?? '')
  const out = res.stdout ?? ''
  const start = out.indexOf('{"numTotalTestSuites"')
  if (start < 0) throw new Error(`[${tag}] json reporter payload not found (exit=${res.status})`)
  let jsonText = out.slice(start).trim()
  try {
    JSON.parse(jsonText)
  } catch {
    const end = jsonText.lastIndexOf('}')
    jsonText = jsonText.slice(0, end + 1)
    JSON.parse(jsonText) // 再失败即抛
  }
  return { exit: res.status ?? -1, report: JSON.parse(jsonText) }
}

function summarize(report) {
  const rows = []
  for (const tr of report.testResults ?? []) {
    for (const ar of tr.assertionResults ?? []) {
      rows.push({ fullName: ar.fullName, status: ar.status, failures: ar.failureMessages ?? [] })
    }
  }
  rows.sort((a, b) => (a.fullName < b.fullName ? -1 : a.fullName > b.fullName ? 1 : 0))
  const identity = rows.map((r) => `${r.fullName}|${r.status}`).join('\n')
  return {
    numTotalTests: report.numTotalTests ?? 0,
    numPassedTests: report.numPassedTests ?? 0,
    numFailedTests: report.numFailedTests ?? 0,
    numPendingTests: report.numPendingTests ?? 0,
    rows,
    identitySha: sha256(identity),
  }
}

// ── 针定义(单点变异;锚点见 dedup-ledger.md) ──────────────────────────────────
const NEEDLES = [
  {
    id: 'MUT-01',
    target: 'SB1 胜利结算期 BGM 覆盖',
    file: 'packages/game/src/shell/bootstrap.ts',
    find: 'const victoryTrack = battleVictoryTrack(gs.battleState)',
    replace: 'const victoryTrack = -1',
    titlePrefix: 'SB1 ',
  },
  {
    id: 'MUT-02',
    target: 'SB2 揭场 introFade 静默',
    file: 'packages/game/src/shell/bootstrap.ts',
    find: 'const battleIntroActive = gs.battleState?.introFade !== undefined',
    replace: 'const battleIntroActive = false',
    titlePrefix: 'SB2 ',
  },
  {
    id: 'MUT-03',
    target: 'SB3 战斗帧 bus SFX drain',
    file: 'packages/game/src/shell/bootstrap.ts',
    find: 'if (inBattle) {',
    replace: 'if (false) {',
    titlePrefix: 'SB3 ',
  },
  {
    id: 'MUT-04',
    target: 'SB4 SW 进度消息路由',
    file: 'packages/game/src/shell/precache-client.ts',
    find: "if (d?.type === 'precache-progress') opts.onProgress(d)",
    replace: "if (d?.type === 'precache-progress-x') opts.onProgress(d)",
    titlePrefix: 'SB4 ',
  },
  {
    id: 'MUT-05',
    target: 'SB5 storage.persist 失败容忍',
    file: 'packages/game/src/shell/precache-client.ts',
    find: '  try {\n    await navigator.storage?.persist?.()\n  } catch {\n    /* ignore */\n  }',
    replace:
      '  try {\n    await navigator.storage?.persist?.()\n  } catch (err) {\n    throw err\n  }',
    titlePrefix: 'SB5 ',
  },
  {
    id: 'MUT-06',
    target: 'SB6 startRafLoop 帧链自续订',
    file: 'packages/game/src/shell/main-loop.ts',
    find: '    tickFps(now) // 左上角 FPS 覆盖层:每 rAF 累计帧数(未启用时内部早退)\n    raf = requestAnimationFrame(loop)',
    replace:
      '    tickFps(now) // 左上角 FPS 覆盖层:每 rAF 累计帧数(未启用时内部早退)\n    // MUT-06: raf = requestAnimationFrame(loop)',
    titlePrefix: 'SB6 ',
  },
]

// ── 原始绿相位 ────────────────────────────────────────────────────────────────
const originalGreenRun = runVitest('SHARED-original')
const originalGreen = summarize(originalGreenRun.report)
writeFileSync(join(EVIDENCE, 'identity.json'), `${JSON.stringify(originalGreen, null, 2)}\n`)
if (
  originalGreenRun.exit !== 0 ||
  originalGreen.numTotalTests !== 6 ||
  originalGreen.numFailedTests !== 0
) {
  throw new Error(`original green phase failed: exit=${originalGreenRun.exit}`)
}
const sourceOriginalSha = {}
for (const n of NEEDLES) {
  sourceOriginalSha[n.id] = sha256(readFileSync(join(ROOT, n.file)))
}
console.log(`original green: 6/6 identity=${originalGreen.identitySha.slice(0, 12)}`)

// ── 逐针:红 → 恢复 → 恢复绿 ─────────────────────────────────────────────────
const verdicts = []
for (const n of NEEDLES) {
  const abs = join(ROOT, n.file)
  const before = readFileSync(abs, 'utf8')
  const hits = before.split(n.find).length - 1
  if (hits !== 1) {
    verdicts.push({
      id: n.id,
      target: n.target,
      file: n.file,
      findHits: hits,
      verdict: 'INVALID',
      reason: `find occurs ${hits} times (must be exactly 1)`,
    })
    continue
  }
  const mutated = before.replace(n.find, n.replace)
  writeFileSync(abs, mutated)
  const mutatedSha = sha256(readFileSync(abs))

  const redRun = runVitest(`${n.id}-red`)
  const red = summarize(redRun.report)
  const failedRows = red.rows.filter((r) => r.status === 'failed')
  // vitest json reporter 的 fullName 以空格连接 describe 链(判例),不能用 ' > ' 分隔匹配
  const targetRows = red.rows.filter((r) => r.fullName.includes(` ${n.titlePrefix}`))
  const targetFullName = targetRows[0]?.fullName ?? null
  const failedIsTarget =
    failedRows.length === 1 && targetFullName !== null && failedRows[0]?.fullName === targetFullName
  const businessAssertion =
    failedRows.length === 1 && (failedRows[0]?.failures[0] ?? '').startsWith('AssertionError')
  const redValid =
    redRun.exit !== 0 &&
    red.numFailedTests === 1 &&
    red.numTotalTests === 6 &&
    failedIsTarget &&
    businessAssertion

  // 恢复(反向替换)并核对逐字节
  const restored = mutated.replace(n.replace, n.find)
  writeFileSync(abs, restored)
  const restoredSha = sha256(readFileSync(abs))
  const cleanupRestored = restoredSha === sourceOriginalSha[n.id]

  const restoredRun = runVitest(`${n.id}-restored`)
  const restoredSummary = summarize(restoredRun.report)
  const restoredGreen =
    restoredRun.exit === 0 &&
    restoredSummary.numTotalTests === 6 &&
    restoredSummary.identitySha === originalGreen.identitySha

  verdicts.push({
    id: n.id,
    target: n.target,
    file: n.file,
    find: n.find,
    replace: n.replace,
    findHits: hits,
    mutatedSha,
    targetFullName,
    verdict:
      redValid && cleanupRestored && restoredGreen
        ? 'VALID'
        : `INVALID(red=${redValid},cleanup=${cleanupRestored},restoredGreen=${restoredGreen})`,
    red: {
      exitCode: redRun.exit,
      failedCount: red.numFailedTests,
      totalTests: red.numTotalTests,
      failedFullName: failedRows[0]?.fullName ?? null,
      firstBusinessAssertion:
        failedRows[0]?.failures[0]?.split('\n').slice(0, 4).join('\n') ?? null,
      identitySha: red.identitySha,
    },
    restoredGreen: {
      exitCode: restoredRun.exit,
      tests: restoredSummary.numTotalTests,
      identitySha: restoredSummary.identitySha,
    },
    cleanupRestored,
  })
  console.log(
    `${n.id} ${verdicts.at(-1).verdict} redExit=${redRun.exit} failed=${red.numFailedTests} target=${failedRows[0]?.fullName?.slice(0, 48) ?? '??'}...`,
  )
}

const sourceFinalSha = {}
for (const n of NEEDLES) {
  sourceFinalSha[n.id] = sha256(readFileSync(join(ROOT, n.file)))
}

const results = {
  card: 'TEST-GLM-GAME-SHELL-BOOTSTRAP-1',
  testFile: `packages/game/${TEST_FILE}`,
  originalGreen: {
    exitCode: originalGreenRun.exit,
    tests: originalGreen.numTotalTests,
    allPassed: originalGreen.numFailedTests === 0,
    identitySha: originalGreen.identitySha,
  },
  sourceOriginalSha,
  sourceFinalSha,
  sourceRestoredByteIdentical: NEEDLES.every(
    (n) => sourceOriginalSha[n.id] === sourceFinalSha[n.id],
  ),
  verdicts,
}
writeFileSync(join(EVIDENCE, 'mutation-results.json'), `${JSON.stringify(results, null, 2)}\n`)
const valid = verdicts.filter((v) => v.verdict === 'VALID').length
console.log(`done: ${valid}/${verdicts.length} VALID`)
if (valid !== verdicts.length) process.exit(1)
