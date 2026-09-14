// GLM boundary batch-2 · F组 rework（R7）· 七包覆盖缺口:具体文件/调用点/可实施用例/分支分栏。
// 运行：node --import tsx docs/ops/audits/pre-e2e/probe-glm-next-coverage.mjs [--case ID|all]
// 只读静态盘点:主树 coverage/fast 各包 summary(只读)+ 本仓基线 + 源码哈希见证;不跑 coverage、不写仓库 coverage/基线。
// 见证链:baseline.fast.json sha256 + 各包 coverage-summary.json sha256 + 断言 summary 聚合 == 基线 metrics
// + 引用文件 worktree/主树 sha256 一致(覆盖数字适用于冻结树);数字可复算,不冒充新跑官方覆盖率。
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const caseArg = process.argv.find((a) => a.startsWith('--case'))
const CASE = caseArg
  ? caseArg.includes('=')
    ? caseArg.split('=')[1]
    : process.argv[process.argv.indexOf(caseArg) + 1]
  : 'all'
const want = (id) => CASE === 'all' || CASE === id

const root = new URL('../../../../', import.meta.url)
const repoRoot = fileURLToPath(root)
const mainTree = '/Users/zhangxu/illegal/type-pal'
const PKGS = ['shared', 'content', 'pal-extract', 'migrate', 'reforge', 'game', 'editor']
const sha256 = (value) => createHash('sha256').update(value).digest('hex')

// ── 见证链:基线与 summary 哈希 + 聚合相等断言 ──
const baselineRaw = readFileSync(new URL('scripts/coverage/baseline.fast.json', root), 'utf8')
const baseline = JSON.parse(baselineRaw)
const summaryRaw = {}
const summary = {}
for (const pkg of PKGS) {
  const raw = readFileSync(`${mainTree}/coverage/fast/${pkg}/coverage-summary.json`, 'utf8')
  summaryRaw[pkg] = raw
  summary[pkg] = JSON.parse(raw)
  const total = summary[pkg].total ?? summary[pkg].total
  const metrics = baseline.packages[pkg].metrics
  assert.deepEqual(
    {
      lines: total.lines.covered,
      branches: total.branches.covered,
      functions: total.functions.covered,
    },
    {
      lines: metrics.lines.covered,
      branches: metrics.branches.covered,
      functions: metrics.functions.covered,
    },
    `F: ${pkg} summary 聚合必须与提交基线一致(Codex 已接收的聚合口径)`,
  )
}
/** worktree 与主树同内容 ⇒ 主树跑出的覆盖数字适用于冻结树;否则标记漂移。 */
const fileStatus = (rel) => {
  try {
    const here = readFileSync(new URL(rel, root))
    const there = readFileSync(`${mainTree}/${rel}`)
    return sha256(here) === sha256(there) ? '同内容' : '漂移'
  } catch {
    return '缺席'
  }
}
/** 每包未覆盖行数排序的真实文件清单(summary 键为主树绝对路径)。 */
const lowFiles = (pkg) =>
  Object.entries(summary[pkg])
    .filter(([key]) => key !== 'total' && key !== 'total')
    .map(([abs, v]) => ({
      rel: abs.replace(`${mainTree}/`, ''),
      unc: v.lines.total - v.lines.covered,
      branchMiss: v.branches.total - v.branches.covered,
      lines: `${v.lines.covered}/${v.lines.total}`,
    }))
    .filter((r) => r.unc > 0 || r.branchMiss > 0)
    .sort((a, b) => b.unc - a.unc || b.branchMiss - a.branchMiss)
/** 生产侧真实消费点(grep,排除测试与定义行)。 */
const consumers = (symbol) => {
  try {
    const out = execFileSync(
      'grep',
      [
        '-rn',
        '--include=*.ts',
        '--include=*.tsx',
        '-E',
        `\\b${symbol}\\b`,
        'packages/content/src',
        'packages/editor/src',
        'packages/game/src',
        'packages/migrate/src',
        'packages/pal-extract/src',
        'packages/reforge/src',
        'packages/shared/src',
      ],
      { cwd: repoRoot, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
    )
    return out
      .split('\n')
      .filter((line) => line && !/\.test\./.test(line) && !/\.pal\.test\./.test(line))
      .filter(
        (line) =>
          !line.includes(`function ${symbol}`) &&
          !line.includes(`class ${symbol}`) &&
          !line.includes(`const ${symbol}`),
      )
      .slice(0, 2)
  } catch {
    return []
  }
}
const topOf = (pkg) => lowFiles(pkg).filter((r) => !/\.test\./.test(r.rel))
const fmtTop = (pkg, n) =>
  topOf(pkg)
    .slice(0, n)
    .map((r) => `${r.rel}(行${r.lines}/缺${r.unc}行${r.branchMiss}支,${fileStatus(r.rel)})`)

const rows = []
const add = (id, verdict, detail) => {
  rows.push({ id, verdict, detail })
  console.log(JSON.stringify({ id, verdict, detail }))
}

if (want('F01')) {
  const top = fmtTop('shared', 5)
  const cons = consumers('decodeRngFrames')
  add(
    'F01',
    'risk',
    `shared 具体:${top.join(';')};缺口=yj2.ts decompressYj2(:139) 2/86 行、rng.ts decodeRngFrames(:157)/rngBlitDelta(:37) 26/74 行、mkf.ts 0/19——解码器/解析器为主;真实消费点 decodeRngFrames→[${cons.length ? cons.join(' ') : '无生产消费(资产域)'}];候选=最小 YJ2/RNG 流 fixture 的精确字节断言+截断输入拒绝正控(fast 纯单测可构造,不依赖 gitignored 资产)`,
  )
}
if (want('F02')) {
  const top = fmtTop('content', 5)
  // 纠正 r1 误标:skill.ts:220 实际内容现场读取,不凭记忆归类
  const skillLine = readFileSync(new URL('packages/content/src/skill.ts', root), 'utf8')
    .split('\n')[219]
    .trim()
  const cons = consumers('validateStartWorld')
  add(
    'F02',
    'risk',
    `content 具体:${top.join(';')};缺口集中在 validate.ts(644/850,268 支)可选字段/跨字段分支与 author-script-core/enemy-script;真实消费点 validateStartWorld→[${cons.join(' ')}];r1 纠正:skill.ts:220 实际为「${skillLine}」(引用收集非毒系互斥,不得按互斥合同立用例);合法/非法输入从 projects/pal/content 现值抽样+单字段损坏矩阵`,
  )
}
if (want('F03')) {
  const top = fmtTop('pal-extract', 5)
  const zeroFast = topOf('pal-extract').filter((r) => r.lines.startsWith('0/'))
  add(
    'F03',
    'risk',
    `pal-extract 具体:${top.slice(0, 4).join(';')};fast 0 行文件=${zeroFast.length} 个(parsers/enemies.ts parseEnemies(:64)、player-roles、spells、io/sss 等)——低 fast≠无测试:这些由 PAL 资产组(需 gitignored data)执行,fast 域缺输入合同单列=纯 fixture 解码边界(单敌 buf/截断 buf);cli.ts 0/365=CLI 壳结构约束不列优先`,
  )
}
if (want('F04')) {
  const top = fmtTop('migrate', 5)
  const zeroFast = topOf('migrate').filter((r) => r.lines.startsWith('0/'))
  add(
    'F04',
    'risk',
    `migrate 具体:${top.slice(0, 5).join(';')};PAL 组独占(fast 0 行)=${zeroFast.map((r) => r.rel).join(',')}——unit 与 PAL 组差异的实锤;高风险未命中=journal 恢复异常分支(migration-transaction.ts,本批 E03/E04 已给真实链回归草案)、物化 authored/预检(pal-assets.ts 29/450,本批 E05 已给)、多 scope 交织;不重跑 CLI`,
  )
}
if (want('F05')) {
  const top = fmtTop('reforge', 5).filter(
    (r) => !/battle-core|battle-session|script-project|runtime-script/.test(r),
  )
  add(
    'F05',
    'risk',
    `reforge 具体(排除本批 A-D 已登记的 battle-core/battle-session/script-* 域后):${top.join(';')};main.ts 3371 行缺口=浏览器壳结构约束(E2E 域)不列 unit 优先;剩余 unit 高价值=script-host-adapter.ts executeScriptHostEffect(:21) 27/160(A 组已证真实链,转正式=reloadMap 挂起/abort/残留断言)、debug-tools.ts 498/713、menu/dialog 纯计算组件`,
  )
}
if (want('F06')) {
  const top = fmtTop('editor', 5)
  add(
    'F06',
    'risk',
    `editor 具体:${top.join(';')};.tsx UI 组件大缺口=浏览器壳结构约束与 D-01 已done 矩阵之外的可测核心=core/playback.ts class Playback(:105) 187/412(纯状态机,单测可构造);命令族深分支(stamp-group/battle-data-delete 失败域)与 D-06/D-07 列后续归属不修,不在本批重复`,
  )
}
if (want('F07')) {
  const top = fmtTop('game', 5)
  add(
    'F07',
    'risk',
    `game 具体(仅一阶段域,不与 reforge D 组混算):${top.slice(0, 5).join(';')};dev/dev-panel 与 shell/bootstrap=dev/壳结构约束;真实 unit 缺口=event-system.ts 1740/2067(783 支)与 battle-system.ts 1200/1283(295 支,敌 AI 抑制分支);非视觉高价值=存档载入恢复与菜单状态机;一阶段缺口不阻断 R4(分流见 F12)`,
  )
}
if (want('F08')) {
  const picks = PKGS.map((pkg) => {
    const top = topOf(pkg)[0]
    return `${pkg}→${top ? `${top.rel}(缺${top.unc}行${top.branchMiss}支,${fileStatus(top.rel)})` : '无'}`
  })
  add(
    'F08',
    'risk',
    `各包第一优先文件(按未覆盖行数排序,非百分比;源哈希状态标注):${picks.join(';')};每个文件的真实调用点/消费方见 F01~F07 各条(如 decodeRngFrames/validateStartWorld/parseEnemies/executeScriptHostEffect/Playback 逐条 grep 列出)`,
  )
}
if (want('F09')) {
  add(
    'F09',
    'risk',
    `可实施用例(各包1条,共7条,fixture/操作/assert/反控/命令):①shared:新增 yj2.test.ts——fixture=最小合法 YJ-2 流字节,操作=decompressYj2(bytes),assert=输出精确字节与长度合同,反控=同流不截断成功/截断流抛错,命令=pnpm --filter @type-pal/shared exec vitest run src/yj2.test.ts;②content:validate.test.ts 增 startWorld 段——fixture=projects/pal/content/world-variables.json 现值,操作=逐字段损坏(缺/类型错/未知键),assert=每变体精确报错,反控=现值整体通过,命令=vitest run src/validate.test.ts -t startWorld;③pal-extract:enemies 解析纯 fixture 单测——fixture=单敌最小 enemyBuf,操作=parseEnemies,assert=字段映射,反控=截断 buf 抛错,命令=--filter pal-extract vitest run(新文件);④migrate:validatePalCurrentPublication 单字段损坏矩阵(0/152 行实锤),反控=完整合法 fixture 通过;⑤reforge:executeScriptHostEffect 正式化——fixture=内存 world+可控 scene(),操作=reloadMap 挂起后 abort,assert=无残留+通知恰一次(A 组已证),反控=不 abort 完成;⑥editor:playback.test.ts——fixture=合成 PlaybackView,操作=暂停/单步/越界指针,assert=指针与可见性字段,反控=正常序列;⑦game:battle-system 抑制分支——fixture=sleep/paralyzed 敌,操作=tickBattle,assert=敌方行动跳过,反控=无状态正常行动`,
  )
}
if (want('F10')) {
  let noCheckFiles = []
  try {
    noCheckFiles = execFileSync(
      'grep',
      [
        '-rl',
        'ts-nocheck',
        'packages/shared/src',
        'packages/content/src',
        'packages/pal-extract/src',
        'packages/migrate/src',
        'packages/reforge/src',
        'packages/game/src',
        'packages/editor/src',
      ],
      { cwd: repoRoot, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
    )
      .split('\n')
      .filter(Boolean)
  } catch {}
  const earlyReturns = {}
  for (const pkg of PKGS) {
    const top = topOf(pkg)[0]
    if (!top) continue
    const text = readFileSync(new URL(top.rel, root), 'utf8')
    earlyReturns[pkg] = (text.match(/\breturn\b/g) ?? []).length
  }
  add(
    'F10',
    'risk',
    `定向抽查:ts-nocheck 文件=${noCheckFiles.length} 个[${noCheckFiles.slice(0, 5).join(' ')}${noCheckFiles.length > 5 ? '…' : ''}](清单非命中即 bug);各包第一优先文件早 return 计数=${Object.entries(
      earlyReturns,
    )
      .map(([k, v]) => `${k}:${v}`)
      .join(
        ',',
      )}——早 return/空样本为静态候选;最高优先项已由本批 A-E 探针动态举证(entered/完成信号/零写入见证,见机器账);未动态复核项按静态候选保留分母`,
  )
}
if (want('F11')) {
  const table = [
    [
      'pal-extract parsers(parsers/*.ts fast 0 行)',
      '可达待测',
      'PAL 资产组已跑真实数据;fast 域可纯 fixture 构造(F09③)',
    ],
    [
      'migrate pal-migration/pal-current-publication(fast 0 行)',
      '可达待测',
      'PAL 组执行;纯 unit 可构造单字段损坏矩阵(F09④)',
    ],
    [
      'shared yj2/rng/mkf 解码分支',
      '可达待测',
      '最小流字节 fixture 可构造(F09①);mkf 大样本依赖资产的部分=待证',
    ],
    ['content validate.ts 268 支', '可达待测', '现值抽样+损坏矩阵(F09②)'],
    ['reforge main.ts 3371 行', '结构约束', '浏览器壳,E2E/视觉域,不列 unit 优先'],
    ['game dev-panel/bootstrap', '结构约束', 'dev 工具/启动壳'],
    ['editor UI .tsx 大组件', '结构约束', '浏览器壳;核心状态机(playback)归可达待测(F09⑥)'],
    [
      'reforge journal 恢复/物化预检分支',
      '重叠守卫已证',
      '本批 E03/E04/E05 真实链:journal 层守卫在位,采样前窗口(E02)与物化 symlink(E06-E08)为已证缺口归修复卡',
    ],
    ['game minimap.ts 视觉耦合分支', '待证', '需动态举证渲染耦合,本批未证'],
    ['E02/E06/E07/E08 缺口', '已证 reproduced', '归迁移防护修复卡(N6b 前),不计入覆盖分母争议'],
  ]
  add(
    'F11',
    'risk',
    `分支 classified 表(10 行,候选×类别×依据):${table.map((r) => `[${r[0]}|${r[1]}|${r[2]}]`).join('')}——全部保留覆盖分母,「很难构造」≠不可达;类别判定附依据列`,
  )
}
if (want('F12')) {
  add(
    'F12',
    'risk',
    `去重与顺序(修正 r1):A 组取消域→B-05/B-09 族(A09/A10-12 已在 A 探针真实链登记);偷取战内新增丢弃→审计 C-01 修复卡(C01-C03 复用);毒杀终态→审计 C-04(Q2);B05/B06 barrier 时序→B-06/B-07 域;E09-E12 旧接口与物化 symlink→N6b 前清理/迁移防护卡;D-01 已done 不重开;F 组候选按 Q2/R4/N6b/第一阶段独立批分流;不发明「先补到90%」门槛;七包聚合数字仅作基线见证不作为新覆盖声明`,
  )
}
console.log(
  `\nF组静态盘点完成：${rows.length} 条;见证:baseline=${sha256(baselineRaw).slice(0, 12)} summaries=${PKGS.map((p) => `${p}=${sha256(summaryRaw[p]).slice(0, 8)}`).join(' ')}`,
)
