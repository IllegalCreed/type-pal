// TEST-GLM-REFORGE-MENU-BOX-RESIDUAL-1 反控 runner(证据工具,非测试,不进默认 runner)。
// 协议:判据自测 → 工作树冻结源核验 → 隔离树绿基线(五文件执行集逐字锁定) → 每针
// 独立新树变异→红(跨文件恰一指定业务 AssertionError)→删树→新净树还原绿(执行集与
// 基线逐字一致)→工作树产品零残留。raw/JSON 全落 mutation-logs,sha 按落盘字节;
// 任何一步不符即非零退出,不产出合格回执。
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import {
  buildIsolatedTree,
  executionSetOf,
  judgeGreen,
  judgeRed,
  judgeSelfTest,
  persistJson,
  REPO,
  runVitestJson,
  sha256Of,
  TEST_FILES,
} from './lib-isolated-tree.mjs'

const EVIDENCE_DIR = import.meta.dirname
const LOGS_DIR = path.join(EVIDENCE_DIR, 'mutation-logs')
rmSync(LOGS_DIR, { recursive: true, force: true })
mkdirSync(LOGS_DIR, { recursive: true })

const M_EQUAL = 'to deeply equal'

// 每针一个合同族;from/to 为 menu-box.ts 内唯一锚点(探针期已核 split==2)。
const NEEDLES = [
  {
    id: 'K1-cascade-layer-offset',
    from: 'const CASCADE_DX = 27',
    to: 'const CASCADE_DX = 28',
    fullName:
      '当前 MenuBox 级联与面板公开布局残余 级联两级框几何与金钱条：卷轴(0,0)五段带影、金额右对齐(85,14)、框(3+27d,37+23d,61,22+18n)、项字随层偏移',
    marker: M_EQUAL,
    axis: '级联层框几何:depth 偏移 CASCADE_DX 接线(menu-box.ts:153,529)',
  },
  {
    id: 'K2-blink-phase-wrap',
    from: `    // 选中色:6 帧闪烁(原版 ui.h MENUITEM_COLOR_SELECTED);父层选中项静态高亮指示已展开路径
    const blink = SELECTED_COLORS[Math.floor(now / 100) % SELECTED_COLORS.length] ?? COLOR_NORMAL`,
    to: `    // 选中色:6 帧闪烁(原版 ui.h MENUITEM_COLOR_SELECTED);父层选中项静态高亮指示已展开路径
    const blink = SELECTED_COLORS[Math.floor(now / 200) % SELECTED_COLORS.length] ?? COLOR_NORMAL`,
    fullName:
      '当前 MenuBox 级联与面板公开布局残余 级联选中颜色残余臂：最深层随 now 闪烁并整表回绕、系统面板期最深层转静态、禁用选中显红、未选中米白',
    marker: 'to deeply equal [ 235, 211, 97 ]',
    axis: '级联选中色 now 相位接线(menu-box.ts:525)',
  },
  {
    id: 'K3-stat-row-pitch',
    from: 'const STAT_LINE_H = 20',
    to: 'const STAT_LINE_H = 21',
    fullName:
      '当前 MenuBox 级联与面板公开布局残余 属性九行数据驱动布局：行序与 label(8,10+20i)、值右对齐(70,14+20i)、HP·MP 斜杠+蓝max、exp 青max、攻击值走装备加成',
    marker: M_EQUAL,
    axis: '属性行距 STAT_LINE_H 数据驱动布局接线(menu-box.ts:176,576)',
  },
  {
    id: 'K4-mid-name-anchor',
    from: 'const NAME_Y = 30',
    to: 'const NAME_Y = 31',
    fullName:
      '当前 MenuBox 级联与面板公开布局残余 中栏名字金黄居中于158、回落立绘按宽居中于(142,50)',
    marker: 'to deeply equal [ 142, 30',
    axis: '中栏名字 NAME_Y 定位接线(menu-box.ts:180,581)',
  },
  {
    id: 'K5-empty-slot-skip',
    from: 'if (!equippedId) return // 空槽:格画了,图标/名都不画(留空)',
    to: 'if (false) return // 空槽:格画了,图标/名都不画(留空)',
    fullName:
      '当前 MenuBox 级联与面板公开布局残余 装备格2×3网格六格全画(56×56,列距62行距60)、空槽只留格、已装备图标内缩居中、物名0xBE格底居中',
    marker: 'to have a length of 11 but got 16',
    axis: '装备格空槽跳过接线(menu-box.ts:624)',
  },
]

function fail(message) {
  throw new Error(message)
}

function rel(file) {
  return path.relative(EVIDENCE_DIR, file)
}

function runSummary(run) {
  return {
    exit: run.exit,
    signal: run.signal,
    pid: run.pid,
    spawnError: run.spawnError,
    argvTail: run.argv.slice(-4),
    cwd: run.cwd,
    env: run.env,
    unhandledInOutput: run.unhandledInOutput,
    numTotalTests: run.report.numTotalTests,
    numPassedTests: run.report.numPassedTests,
    numFailedTests: run.report.numFailedTests,
    raw: { file: rel(run.rawFile), sha256: run.rawSha256 },
    json: { file: rel(run.jsonFile), sha256: run.jsonSha256 },
  }
}

const receipt = {
  card: 'TEST-GLM-REFORGE-MENU-BOX-RESIDUAL-1',
  protocol:
    '判据自测 → 隔离树绿基线(五文件执行集逐字锁定) → 每针独立新树变异红(跨文件恰一指定业务 AssertionError) → 删树 → 新净树还原绿(执行集与基线逐字一致) → 工作树产品零残留',
  createdAt: new Date().toISOString(),
  judgeCriteria:
    '进程层(exit/signal/spawnError) + 非空 file×fullName 执行集逐字锁定 + 计数/明细一致 + 非空 suite.message 拒收 + 零断言 failed suite 拒收 + stdout/stderr 无 unhandled + 红态跨文件恰一指定业务 AssertionError;judgeSelfTest 以合成反例自证拒收',
  sourceFreeze: '9aa3bed892728f17c70d2f86d1fe07db10a718b8',
  executionSet:
    '五文件 = 新增 residual.glm + 已接收 residual/glm-runtime-resource/glm-n/status-residual',
}
receipt.judgeSelfTest = judgeSelfTest(TEST_FILES)

// 工作树冻结源核验(树内再核一次,双保险)。
const worktreeMenuBox = sha256Of(path.join(REPO, 'packages/reforge/src/menu/menu-box.ts'))
if (worktreeMenuBox !== '9c7c7b569e035fe5771fce79e5549e34aea1d66b7577569b2a6d98962ffcf2c1')
  fail('worktree menu-box.ts 与任务卡冻结源不符')
receipt.frozenSources = {
  'packages/reforge/src/menu/menu-box.ts': worktreeMenuBox,
}

// Phase 1:绿基线(隔离树,五文件执行集)。
const greenTree = buildIsolatedTree('baseline-green')
let baselineRows
try {
  const run = runVitestJson(
    greenTree.pkg,
    TEST_FILES,
    path.join(LOGS_DIR, 'green-baseline.raw'),
    path.join(LOGS_DIR, 'green-baseline.json'),
  )
  baselineRows = executionSetOf(run, TEST_FILES)
  const problems = judgeGreen(run, baselineRows, TEST_FILES)
  if (problems.length > 0) fail(`baseline green rejected: ${problems.join('; ')}`)
  receipt.baseline = {
    treeCleanup: greenTree.cleanup(),
    tests: `${run.report.numPassedTests}/${run.report.numTotalTests} passed`,
    executionRows: baselineRows.length,
    ...runSummary(run),
  }
} finally {
  greenTree.cleanup()
}
if (baselineRows.length !== 25) fail(`baseline execution rows=${baselineRows.length} != 25`)

// Phase 2:逐针 红 → 删树 → 还原绿(新净树,执行集与基线逐字一致)。
receipt.needles = []
for (const needle of NEEDLES) {
  const entry = {
    id: needle.id,
    mutation: `${needle.from} → ${needle.to}`,
    axis: needle.axis,
    execution: '五文件执行集(隔离树,与基线同集)',
    red: {},
    restoredGreen: {},
  }
  receipt.needles.push(entry)

  const redTree = buildIsolatedTree(`${needle.id}-red`)
  let red
  try {
    const file = path.join(redTree.pkg, 'src/menu/menu-box.ts')
    const source = readFileSync(file, 'utf8')
    if (source.split(needle.from).length !== 2) fail(`${needle.id}: mutation anchor not unique`)
    writeFileSync(file, source.replace(needle.from, needle.to))
    red = runVitestJson(
      redTree.pkg,
      TEST_FILES,
      path.join(LOGS_DIR, `${needle.id}.red.raw`),
      path.join(LOGS_DIR, `${needle.id}.red.json`),
    )
  } finally {
    entry.redTreeCleanup = redTree.cleanup()
  }
  const problems = judgeRed(red, baselineRows, TEST_FILES, needle.fullName, needle.marker)
  if (problems.length > 0) fail(`${needle.id}: red rejected: ${problems.join('; ')}`)
  entry.red = runSummary(red)
  entry.red.failedFullName = needle.fullName

  const greenTree2 = buildIsolatedTree(`${needle.id}-green`)
  try {
    const green = runVitestJson(
      greenTree2.pkg,
      TEST_FILES,
      path.join(LOGS_DIR, `${needle.id}.green.raw`),
      path.join(LOGS_DIR, `${needle.id}.green.json`),
    )
    const gproblems = judgeGreen(green, baselineRows, TEST_FILES)
    if (gproblems.length > 0) fail(`${needle.id}: restored green rejected: ${gproblems.join('; ')}`)
    const restoredSha = sha256Of(path.join(greenTree2.pkg, 'src/menu/menu-box.ts'))
    if (restoredSha !== worktreeMenuBox)
      fail(`${needle.id}: restored tree menu-box.ts != frozen product`)
    entry.restoredGreen = runSummary(green)
    entry.restoredGreen.menuBoxSha256 = restoredSha
  } finally {
    entry.greenTreeCleanup = greenTree2.cleanup()
  }
  console.log(`${needle.id}: red ok, restored green ok`)
}

// Phase 3:工作树产品零残留(变异全在隔离树;工作树只允许本卡新增测试为未跟踪)。
const residue = execFileSync('git', ['-C', REPO, 'status', '--porcelain', 'packages/'], {
  encoding: 'utf8',
})
const modifiedResidue = residue.split('\n').filter((line) => line && !line.startsWith('??'))
if (modifiedResidue.length > 0) fail(`product residue in worktree:\n${modifiedResidue.join('\n')}`)
receipt.productResidue =
  'clean (git status --porcelain packages/ 无 M/D 残留；?? 仅本卡新增测试与证据)'

writeFileSync(path.join(EVIDENCE_DIR, 'counterproof.json'), '')
receipt.counterproofSha256 = persistJson(
  path.join(EVIDENCE_DIR, 'counterproof.json'),
  JSON.stringify(receipt, null, 2),
)
console.log('counterproof.json written')
