/**
 * TEST-GLM-NEW-H-1 反控 runner（Codex r1 审查返工项 3）。
 *
 * 对生产源做单点业务变异的反控，改为**隔离副本 + loader 注入**：
 *   1. 把生产源复制到 `packages/game/node_modules/.glm-counter-H/<id>/`（gitignored，
 *      不在正式源码路径），对副本做唯一注入（find/replace 计数必须恰 1），
 *      副本内的相对 import 重写为真实树的绝对 .ts 路径（兄弟模块仍是正式产物）。
 *   2. 生成临时 vitest config（同目录），用 vite resolveId 插件把「解析结果 ==
 *      生产源绝对路径」的模块替换成隔离副本 —— 即 loader 注入，正式源码零改动。
 *   3. 每枚反控跑三段：基线（无注入）恰 exit 0 → 针（注入）恰 exit 1 →
 *      校验失败集合（绝对 file/fullName）、实际执行数、无混错/skip/timeout/exit2、
 *      注入命中仅目标模块、前后生产源 SHA256 一致且 git 状态干净。
 * 全程不改任何正式文件；产物证据写本目录 counter-controls.json。
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '../../../../../../..')
const gameRoot = resolve(repoRoot, 'packages/game')
const copyRoot = resolve(gameRoot, 'node_modules/.glm-counter-H')

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const git = (args) => execFileSync('git', ['-C', repoRoot, ...args], { encoding: 'utf8' }).trim()

/** 单点注入定义：find 必须在生产源中恰出现 1 次。 */
const COUNTERS = [
  {
    id: 'A',
    group: 'H01',
    production: 'packages/game/src/core/battle/battle-opcodes.ts',
    testFile: 'src/core/battle/battle-opcodes.glm-next-wave.test.ts',
    find: `      state.battleDialogPendingClear = true`,
    replace: `      state.battleDialogPendingClear = false`,
    expectedRedFullNames: [
      '0x05 → battleDialogPendingClear = true(战斗侧延迟清屏标记)',
      '0x8E → battleDialogPendingClear = true(与 0x05 同一战斗侧语义)',
      '战斗脚本内 0x05 → 下一个 showDialog 带 clearBefore 且只清一次;后续行不受影响',
    ],
    expectedGreenFullNames: [
      '正操作数 → 原值存入 state.iBlow(present 击退位移消费)',
      '0xFFFF → (SHORT) 截断为 -1(负值 = 反向吹飞;fight.c:2681 RandomLong(iBlow,0) 分支)',
    ],
  },
  {
    id: 'B',
    group: 'H06',
    production: 'packages/game/src/core/battle/anim-timeline.ts',
    testFile: 'src/core/battle/anim-timeline.glm-next-wave.test.ts',
    find: `  for (let i = 0; i < 5; i++) {
    x -= i + 8
    y -= 4
    const fighters: FighterDelta[] = [
      { side: 'player', idx: playerIdx, currentFrame: 10, pos: { x, y } },
    ]`,
    replace: `  for (let i = 0; i < 5; i++) {
    x -= i + 9
    y -= 4
    const fighters: FighterDelta[] = [
      { side: 'player', idx: playerIdx, currentFrame: 10, pos: { x, y } },
    ]`,
    expectedRedFullNames: [
      'frame10 偷窃姿 + offset=(target-player)*8 冲到敌前 + 5 步逼近(i==4 敌闪白) + 收尾 x-- 敌复色',
      '目标在玩家左(target<player)→ 负 offset 反向落点(同一公式,不分支)',
    ],
    expectedGreenFullNames: [
      '5 帧:frame4 受击姿;前 3 帧 iColorShift=6 后 2 帧复位;位移逐帧累加 (8>>i, 4>>i)',
      'AoE 多队员同帧各自独立累加位移(不受彼此影响)',
      '无受伤队员(affected 空)→ 空时间线(生产 caller 只传掉血队员)',
    ],
  },
  {
    id: 'C',
    group: 'H02',
    production: 'packages/game/src/core/battle/battle-progression.ts',
    testFile: 'src/core/battle/battle-progression.glm-next-wave.test.ts',
    find: `    let dwExp = Math.trunc((expGained * wCount) / iTotalCount) * 2 + entry.wExp
    if (entry.wLevel > 99) entry.wLevel = 99`,
    replace: `    let dwExp = Math.trunc((expGained * wCount) / iTotalCount) * 2 + entry.wExp`,
    expectedRedFullNames: ['wLevel=120 先钳 99;99 级上继续扣阈值涨属性,wLevel 停 99 不再 ++'],
    expectedGreenFullNames: [
      '隐藏涨点无 STAT_LIMIT 999 钳:base 998 再涨 → 突破 999(与主升级 cap 明确不同)',
      '多池同涨:R(1,2) 按 Health→Magic 严格序消费(rng 调用序可证)',
      '无主升级但隐藏涨 maxHP → HP 保持战后值不回满(if(fLevelUp) 才回满)',
      '主升级成立 → 隐藏涨点后 HP/MP 回满到(可能更高的)新 max(battle.c:1289-1292)',
    ],
  },
  {
    id: 'D',
    group: 'H06',
    production: 'packages/game/src/core/battle/battle-settlement.ts',
    testFile: 'src/core/battle/battle-settlement.glm-next-wave.test.ts',
    find: `  if (screen.kind === 'exp-cash') return screen.isBoss ? 5500 : 3000`,
    replace: `  if (screen.kind === 'exp-cash') return screen.isBoss ? 3000 : 3000`,
    expectedRedFullNames: ['exp 屏 boss 5500ms / 普通战 3000ms;升级/隐藏涨点/练成屏一律 3000ms'],
    expectedGreenFullNames: [
      '不升级:仅 exp-cash 一屏;cash 无条件入账;战斗 HP/MP 先回写 runtime',
      '屏序:exp-cash → level-up → hidden-exp-up → learn-magic(battle.c 逐屏同序)',
      '首帧不收键;任意键次帧生效;无键 75 tick(3000ms)超时自动翻',
      '屏放完 → Phase E scriptOnBattleEnd 仅跑一次;对话 hold 不收尾;清后 finalize 半血恢复',
    ],
  },
]

/** 副本的相对 import → 真实树绝对 .ts 路径；bare import（@type-pal/shared）保持原样。 */
function rewriteImports(source, prodAbs) {
  const dir = dirname(prodAbs)
  return source.replace(/from '(\.[^']+)'/g, (_m, spec) => {
    const abs = resolve(dir, spec).replace(/\.js$/, '.ts')
    return `from '${abs}'`
  })
}

const CONFIG_TEMPLATE = (
  root,
  setupAbs,
  prodAbs,
  mutantAbs,
  hitsFile,
) => `import { writeFileSync } from 'node:fs'
import { defineConfig } from 'vitest/config'

const prodAbs = ${JSON.stringify(prodAbs)}
const mutantAbs = ${JSON.stringify(mutantAbs)}
const hits = []
const inject = {
  name: 'glm-h-counter-inject',
  enforce: 'pre',
  async resolveId(source, importer, options) {
    if (importer === undefined) return null
    const r = await this.resolve(source, importer, { ...options, skipSelf: true })
    if (r != null && r.id === prodAbs) {
      hits.push(r.id)
      writeFileSync(${JSON.stringify(hitsFile)}, JSON.stringify(hits))
      return mutantAbs
    }
    return null
  },
}

export default defineConfig({
  root: ${JSON.stringify(root)},
  plugins: [inject],
  test: {
    environment: 'jsdom',
    setupFiles: [${JSON.stringify(setupAbs)}],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**'],
  },
})
`

function runVitest(configAbs, filter, reporter) {
  const args = ['exec', 'vitest', 'run', '--config', configAbs]
  if (reporter === 'json') args.push('--reporter=json')
  args.push(filter)
  const r = spawnSync('pnpm', args, {
    cwd: gameRoot,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  })
  return { exit: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '' }
}

function parseJsonOut(stdout) {
  const start = stdout.indexOf('{')
  if (start < 0) throw new Error(`no JSON in vitest output: ${stdout.slice(0, 400)}`)
  return JSON.parse(stdout.slice(start))
}

/** vitest fullName = describe + it 拼接；预期集合用「fullName 以预期标题结尾」匹配（计数须相等）。 */
function sameSet(actualFullNames, expectedTitles) {
  if (actualFullNames.length !== expectedTitles.length) return false
  const remaining = [...expectedTitles]
  for (const name of actualFullNames) {
    const idx = remaining.findIndex((title) => name.endsWith(title))
    if (idx < 0) return false
    remaining.splice(idx, 1)
  }
  return remaining.length === 0
}

function collect(report, testFileAbs) {
  const tr = report.testResults.find((t) => t.name === testFileAbs)
  if (!tr) throw new Error(`report missing ${testFileAbs}`)
  const assertions = tr.assertionResults.map((a) => ({
    fullName: a.fullName,
    status: a.status,
  }))
  const red = assertions.filter((a) => a.status === 'failed')
  const green = assertions.filter((a) => a.status === 'passed')
  const invalid = assertions.filter((a) => a.status !== 'failed' && a.status !== 'passed')
  const timedOut =
    JSON.stringify(tr).includes('Test timed out') || JSON.stringify(tr).includes('timed out')
  return {
    executed: assertions.length,
    redFullNames: red.map((a) => a.fullName),
    greenFullNames: green.map((a) => a.fullName),
    invalidStatuses: invalid.map((a) => a.status),
    timedOut,
    fileStatus: tr.status,
  }
}

const evidence = {
  criteria:
    '隔离副本 + loader 注入(vite resolveId)：生产源复制到 packages/game/node_modules/.glm-counter-H/<id>/ 后唯一注入(find/replace 恰 1 次)，副本相对 import 重写为真实树绝对路径；临时 vitest config 把「解析结果==生产源」的模块替换为副本。判据：基线(无注入)恰 exit0 → 针(注入)恰 exit1；红集合==预期(绝对 file + fullName)；实际执行数=红+绿、无 skip/todo/timeout/exit2/混错；注入命中仅目标模块；前后生产源 SHA256 一致、git 对生产源及全仓零改动。',
  runner:
    'docs/testing/archive/legacy/batches/glm-new-waves/wave-H/counter-run.mjs（node 直跑，可复跑）',
  counters: [],
}

let allOk = true
for (const counter of COUNTERS) {
  const prodAbs = resolve(repoRoot, counter.production)
  const testFileAbs = resolve(gameRoot, counter.testFile)
  const prodBefore = sha256(readFileSync(prodAbs))
  const gitBefore = git(['status', '--porcelain', '--', counter.production])
  const repoDirtyBefore = git(['status', '--porcelain'])

  // 隔离副本 + 唯一注入
  const source = readFileSync(prodAbs, 'utf8')
  const occurrences = source.split(counter.find).length - 1
  if (occurrences !== 1) throw new Error(`${counter.id}: find 匹配 ${occurrences} 次，要求恰 1`)
  const mutantSource = rewriteImports(source.replace(counter.find, counter.replace), prodAbs)
  const copyDir = join(copyRoot, counter.id)
  rmSync(copyDir, { recursive: true, force: true })
  mkdirSync(copyDir, { recursive: true })
  const mutantAbs = join(copyDir, basename(prodAbs))
  writeFileSync(mutantAbs, mutantSource)
  const hitsFile = join(copyDir, 'hits.json')
  const configWithInjection = join(copyDir, 'vitest.config.ts')
  const configBaseline = join(copyDir, 'vitest.config.baseline.ts')
  writeFileSync(
    configWithInjection,
    CONFIG_TEMPLATE(gameRoot, resolve(gameRoot, 'vitest.setup.ts'), prodAbs, mutantAbs, hitsFile),
  )
  writeFileSync(
    configBaseline,
    CONFIG_TEMPLATE(
      gameRoot,
      resolve(gameRoot, 'vitest.setup.ts'),
      prodAbs,
      mutantAbs,
      `${hitsFile}.baseline`,
    ),
  )

  // 基线：同一 config 但不注册注入插件 → 恰 exit 0
  writeFileSync(
    configBaseline,
    readFileSync(configBaseline, 'utf8').replace('plugins: [inject],', 'plugins: [],'),
  )
  const baseline = runVitest(configBaseline, counter.testFile, 'json')
  const baselineReport =
    baseline.exit === 0 ? collect(parseJsonOut(baseline.stdout), testFileAbs) : null

  // 针：loader 注入 → 恰 exit 1
  const needle = runVitest(configWithInjection, counter.testFile, 'json')
  const needleReport = collect(parseJsonOut(needle.stdout), testFileAbs)
  const hits = JSON.parse(readFileSync(hitsFile, 'utf8'))

  const prodAfter = sha256(readFileSync(prodAbs))
  const gitAfter = git(['status', '--porcelain', '--', counter.production])
  const repoDirtyAfter = git(['status', '--porcelain'])
  const ok =
    baseline.exit === 0 &&
    baselineReport !== null &&
    baselineReport.executed ===
      counter.expectedRedFullNames.length + counter.expectedGreenFullNames.length &&
    needle.exit === 1 &&
    needleReport.fileStatus === 'failed' &&
    !needleReport.timedOut &&
    needleReport.invalidStatuses.length === 0 &&
    sameSet(needleReport.redFullNames, counter.expectedRedFullNames) &&
    sameSet(needleReport.greenFullNames, counter.expectedGreenFullNames) &&
    hits.length > 0 &&
    hits.every((h) => h === prodAbs) &&
    prodBefore === prodAfter &&
    gitBefore === '' &&
    gitAfter === '' &&
    repoDirtyBefore === repoDirtyAfter
  allOk = allOk && ok

  evidence.counters.push({
    id: counter.id,
    group: counter.group,
    mutation: `${counter.production}: 唯一注入 ${JSON.stringify(counter.find.split('\n')[0].trim())}…`,
    injectionHits: {
      count: hits.length,
      allTargetModule: hits.length > 0 && hits.every((h) => h === prodAbs),
    },
    production: {
      sha256Before: prodBefore,
      sha256After: prodAfter,
      unchanged: prodBefore === prodAfter,
      gitStatusClean: gitAfter === '',
    },
    baseline: {
      injected: false,
      exit: baseline.exit,
      executed: baselineReport?.executed ?? 0,
      red: baselineReport?.redFullNames.length ?? -1,
    },
    needle: {
      injected: true,
      exit: needle.exit,
      executed: needleReport.executed,
      redFullNames: needleReport.redFullNames,
      greenCount: needleReport.greenFullNames.length,
      invalidStatuses: needleReport.invalidStatuses,
      timedOut: needleReport.timedOut,
      fileStatus: needleReport.fileStatus,
    },
    checks: {
      baselineExit0: baseline.exit === 0,
      needleExit1: needle.exit === 1,
      redSetMatchesExpected: sameSet(needleReport.redFullNames, counter.expectedRedFullNames),
      greenSetMatchesExpected: sameSet(needleReport.greenFullNames, counter.expectedGreenFullNames),
      executedEqualsRedPlusGreen:
        needleReport.executed ===
        needleReport.redFullNames.length + needleReport.greenFullNames.length,
      noSkipNoTimeoutNoExit2:
        needleReport.invalidStatuses.length === 0 && !needleReport.timedOut && needle.exit !== 2,
      productionHashUnchanged: prodBefore === prodAfter,
      gitTreeClean: repoDirtyBefore === repoDirtyAfter,
      passed: ok,
    },
  })
  console.log(
    `counter ${counter.id}: baseline exit=${baseline.exit}/${baselineReport?.executed ?? 0} executed, needle exit=${needle.exit} red=${needleReport.redFullNames.length}/${needleReport.executed} ok=${ok}`,
  )
  rmSync(copyDir, { recursive: true, force: true })
}

evidence.summary = { counters: evidence.counters.length, allPassed: allOk }
if (!allOk) {
  writeFileSync(join(here, 'counter-controls.json'), JSON.stringify(evidence, null, 2))
  throw new Error('至少一枚反控未满足判据，证据已落盘 counter-controls.json')
}
writeFileSync(join(here, 'counter-controls.json'), JSON.stringify(evidence, null, 2))
console.log('ALL COUNTERS OK -> counter-controls.json')
