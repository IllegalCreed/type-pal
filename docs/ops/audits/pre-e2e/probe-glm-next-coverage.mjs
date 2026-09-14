// GLM boundary batch-2 · F组 rework（R7）· 七包覆盖缺口:具体文件/调用点/可实施用例/分支分栏。
// 运行：node --import tsx docs/ops/audits/pre-e2e/probe-glm-next-coverage.mjs [--case ID|all]
// 只读静态盘点:主树 coverage/fast 各包 summary(只读)+ 本仓基线 + 源码哈希见证;不跑 coverage、不写仓库 coverage/基线。
// 见证链:baseline.fast.json sha256 + 各包 coverage-summary.json sha256 + 断言 summary 聚合 == 基线 metrics
// + baseline所列617个生产文件逐个核冻结Git blob；仅核既有报告来源，不冒充新跑官方覆盖率。
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { validateStartWorld } from '../../../../packages/content/src/validate.ts'
import { parseEnemies } from '../../../../packages/pal-extract/src/resources/parsers/enemies.ts'
import { decompressYj2 } from '../../../../packages/shared/src/yj2.ts'

const caseArg = process.argv.find((a) => a.startsWith('--case'))
const CASE = caseArg
  ? caseArg.includes('=')
    ? caseArg.split('=')[1]
    : process.argv[process.argv.indexOf(caseArg) + 1]
  : 'all'
assert.ok(CASE === 'all' || /^F(0[1-9]|1[0-2])$/.test(CASE), '未知case，不允许零用例成功')
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
  for (const metric of ['lines', 'statements', 'branches', 'functions']) {
    assert.equal(total[metric].covered, metrics[metric].covered, `F: ${pkg}.${metric}.covered`)
    assert.equal(total[metric].total, metrics[metric].total, `F: ${pkg}.${metric}.total`)
  }
}
const frozenFiles = new Map(
  execFileSync('git', ['ls-tree', '-r', '70e3f627', '--', 'packages'], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
    .trim()
    .split('\n')
    .map((line) => {
      const [meta, path] = line.split('\t')
      return [path, meta.split(' ')[2]]
    }),
)
const fileStatus = (rel) => {
  const bytes = readFileSync(new URL(rel, root))
  const oid = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')
  assert.equal(oid, frozenFiles.get(rel), `F: ${rel}未匹配冻结产品`)
  return '已核冻结blob'
}
for (const pkg of PKGS) for (const path of baseline.packages[pkg].sourceFiles) fileStatus(path)
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
/** 静态符号引用候选（排除测试与常见定义行），不是完整AST调用图。 */
const consumers = (symbol) => {
  try {
    const out = execFileSync(
      'rg',
      [
        '-n',
        '--glob=*.ts',
        '--glob=*.tsx',
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
    `shared 具体:${top.join(';')};缺口=yj2.ts decompressYj2(:139) 2/86 行、rng.ts decodeRngFrames(:157)/rngBlitDelta(:37) 26/74 行、mkf.ts 0/19——解码器/解析器为主;静态引用候选 decodeRngFrames→[${cons.length ? cons.join(' ') : '本次检索未命中，不据此断言无调用'}];候选=最小 YJ2/RNG 流 fixture 的精确字节断言+截断输入拒绝正控(fast 纯单测可构造,不依赖 gitignored 资产)`,
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
    `content 具体:${top.join(';')};缺口集中在 validate.ts(644/850,268 支)可选字段/跨字段分支与 author-script-core/enemy-script;静态引用候选 validateStartWorld→[${cons.join(' ')}];r1 纠正:skill.ts:220 实际为「${skillLine}」(引用收集非毒系互斥,不得按互斥合同立用例);合法/非法输入从当前manifest.entryPoints.startWorld抽样+单字段损坏矩阵`,
  )
}
if (want('F03')) {
  const top = fmtTop('pal-extract', 5)
  const zeroFast = topOf('pal-extract').filter((r) => r.lines.startsWith('0/'))
  add(
    'F03',
    'risk',
    `pal-extract 具体:${top.slice(0, 4).join(';')};fast 0 行文件=${zeroFast.length} 个(parsers/enemies.ts parseEnemies(:64)、player-roles、spells、io/sss 等)——低 fast≠无测试:这些由 PAL 资产组(需 gitignored data)执行,fast 域缺输入合同单列=纯 fixture 解码边界(单敌 buf/截断 buf);cli.ts 0/365只是覆盖候选，宿主类别不证明不可达，按具体调用与风险排序`,
  )
}
if (want('F04')) {
  const top = fmtTop('migrate', 5)
  const zeroFast = topOf('migrate').filter((r) => r.lines.startsWith('0/'))
  add(
    'F04',
    'risk',
    `migrate 具体:${top.slice(0, 5).join(';')};fast零行候选=${zeroFast.map((r) => r.rel).join(',')}——需与full/PAL清单另核，不据零行断言PAL独占;高风险未命中=journal 恢复异常分支(migration-transaction.ts,本批 E03/E04 已给真实链回归草案)、物化 authored/预检(pal-assets.ts 29/450,本批 E05 已给)、多 scope 交织;不重跑 CLI`,
  )
}
if (want('F05')) {
  const top = fmtTop('reforge', 5).filter(
    (r) => !/battle-core|battle-session|script-project|runtime-script/.test(r),
  )
  add(
    'F05',
    'risk',
    `reforge 具体(排除本批 A-D 已登记的 battle-core/battle-session/script-* 域后):${top.join(';')};main.ts未覆盖路径需逐函数判定；已有AST测试能覆盖部分壳逻辑，不按文件名排除unit;剩余 unit 高价值=script-host-adapter.ts executeScriptHostEffect(:21) 27/160(A 组已证真实链,转正式=reloadMap 挂起/abort/残留断言)、debug-tools.ts 498/713、menu/dialog 纯计算组件`,
  )
}
if (want('F06')) {
  const top = fmtTop('editor', 5)
  add(
    'F06',
    'risk',
    `editor 具体:${top.join(';')};.tsx缺口应逐调用判定，不据后缀定不可达；D-01之外的候选核心=core/playback.ts class Playback(:105) 187/412(纯状态机,单测可构造);命令族深分支(stamp-group/battle-data-delete 失败域)与 D-06/D-07 列后续归属不修,不在本批重复`,
  )
}
if (want('F07')) {
  const top = fmtTop('game', 5)
  add(
    'F07',
    'risk',
    `game 具体(仅一阶段域,不与 reforge D 组混算):${top.slice(0, 5).join(';')};dev/dev-panel与shell/bootstrap只说明宿主类别，不证明分支不可达;真实 unit 缺口=event-system.ts 1740/2067(783 支)与 battle-system.ts 1200/1283(295 支,敌 AI 抑制分支);非视觉高价值=存档载入恢复与菜单状态机;一阶段缺口不阻断 R4(分流见 F12)`,
  )
}

const proposals = [
  {
    pkg: 'shared',
    file: 'packages/shared/src/yj2.ts',
    target: 'packages/shared/src/yj2.boundaries.test.ts',
    fixture: 'U8[0,0,0,0]合法空流/前三字节非法头；另由raw合法非空chunk补深分支',
    operation: 'decompressYj2',
    assertion: '空流精确空字节，短头按source too small拒绝；非空case需精确输出',
    control: '同一头只截去末字节',
    command: 'pnpm --filter @type-pal/shared exec vitest run src/yj2.boundaries.test.ts',
    status: '拟新增，未计入官方测试；本probe仅执行最小头正反控制',
  },
  {
    pkg: 'content',
    file: 'packages/content/src/validate.ts',
    target: 'packages/content/src/validate.test.ts',
    fixture: 'projects/pal/manifest.json.entryPoints[new-game].startWorld的克隆',
    operation: 'validateStartWorld，删除party或把money换string',
    assertion: '原值通过，坏值报对应字段',
    control: '同输入逐字段改变，不把world-variables当startWorld',
    command: 'pnpm --filter @type-pal/content exec vitest run src/validate.test.ts -t startWorld',
    status: '扩展既有测试前需逐case去重',
  },
  {
    pkg: 'pal-extract',
    file: 'packages/pal-extract/src/resources/parsers/enemies.ts',
    target: 'packages/pal-extract/src/resources/parsers/enemies.boundaries.test.ts',
    fixture: '70字节单敌零记录与69字节截断',
    operation: 'parseEnemies',
    assertion: '输出1行id0/health0，截断按ENEMY_SIZE拒绝',
    control: '相同字节只截断1字节',
    command:
      'pnpm --filter @type-pal/pal-extract exec vitest run src/resources/parsers/enemies.boundaries.test.ts',
    status: '拟新增纯fixture，不跑extract',
  },
  {
    pkg: 'migrate',
    file: 'packages/migrate/src/migration-transaction.ts',
    target: 'packages/migrate/src/migration-transaction.test.ts',
    fixture: '复用既有memory fs的两个scope操作，定点journal rename抛EIO',
    operation: 'commitMigrationTransaction→recoverMigrationTransaction',
    assertion: '未提交前目标不变，恢复资料与正确journal阶段对应；重试后精确目标字节',
    control: '同一输入不注入EIO完成；与E03不同的存储失败域',
    command:
      'pnpm --filter @type-pal/migrate exec vitest run src/migration-transaction.test.ts --project unit',
    status: '候选待与已有故障矩阵逐项去重，不宣称新覆盖',
  },
  {
    pkg: 'reforge',
    file: 'packages/reforge/src/script-project-core.ts',
    target: 'packages/reforge/src/runtime-script-project.test.ts',
    fixture: '本包A02/A03/A09/A10成功resolver+取消信号',
    operation: '真实runtime.runCommands跨await取消',
    assertion: '正确残留/通知合同；当前原树业务红',
    control: '同输入无取消的正控，引用本包而非另造副本',
    command: 'pnpm --filter @type-pal/reforge exec vitest run src/runtime-script-project.test.ts',
    status: '与A组共用候选，不重复计算；产品修复卡准入后转正',
  },
  {
    pkg: 'editor',
    file: 'packages/editor/src/core/playback.ts',
    target: 'packages/editor/src/core/playback.test.ts',
    fixture: '复用既有scene/choiceFlow；confirm挂起时stop后立即play新flow',
    operation: 'Playback.play/stop/tick和旧confirm resolve',
    assertion: '旧flow不能改变新view/player/facing；真实当前flow可继续',
    control: '不stop时同确认正常推进；先与既有stop/choice测试去重',
    command: 'pnpm --filter @type-pal/editor exec vitest run src/core/playback.test.ts',
    status: '非视觉控制器候选，不假设存在seek或传PlaybackView构造',
  },
  {
    pkg: 'game',
    file: 'packages/game/src/shell/bootstrap.ts',
    target: 'packages/game/src/shell/bootstrap-save-boundaries.test.ts',
    fixture: '复用原probe-phase1-world-lifecycle正常当前存档，当前精灵alias有值而目标槽缺席',
    operation: '实际loadGameFromSlot(AST)读取目标槽',
    assertion: '恢复后外观由目标槽决定，不继承旧局alias',
    control: '目标槽明确alias作为对照',
    command:
      'pnpm --filter @type-pal/game exec vitest run src/shell/bootstrap-save-boundaries.test.ts',
    status: '拟新增，一阶段B-02独立批；不外推二阶段R4门槛',
  },
]
if (want('F08'))
  add(
    'F08',
    'risk',
    JSON.stringify(
      proposals.map((p) => ({
        pkg: p.pkg,
        file: p.file,
        reason: p.operation,
        status: p.status,
        blob: fileStatus(p.file),
      })),
    ),
  )
if (want('F09')) {
  const manifest = JSON.parse(readFileSync(new URL('projects/pal/manifest.json', root), 'utf8'))
  const start = manifest.entryPoints.find((x) => x.id === manifest.defaultEntryId).startWorld
  validateStartWorld(start)
  const missing = structuredClone(start)
  delete missing.party
  assert.throws(() => validateStartWorld(missing), /party/)
  assert.deepEqual(decompressYj2(new Uint8Array(4)), new Uint8Array())
  assert.throws(() => decompressYj2(new Uint8Array(3)), /source too small/)
  const enemies = parseEnemies(new Uint8Array(70))
  assert.equal(enemies.length, 1)
  assert.equal(enemies[0].id, 0)
  assert.equal(enemies[0].health, 0)
  assert.throws(() => parseEnemies(new Uint8Array(69)), /ENEMY_SIZE/)
  add(
    'F09',
    'risk',
    JSON.stringify({
      proposals,
      smoke: ['shared空流/短头', '真实startWorld/缺party', '70字节敌/69字节截断'],
      scope:
        '三个最小输入正控已运行；七项均是未来测试提案，未声称拟新增文件已存在或Vitest命令已经通过',
    }),
  )
}
if (want('F10')) {
  let noCheckFiles = []
  try {
    noCheckFiles = execFileSync(
      'rg',
      [
        '-l',
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
  const branches = []
  for (const pkg of PKGS) {
    const text = readFileSync(`${mainTree}/coverage/fast/${pkg}/lcov.info`, 'utf8')
    let source,
      taken = 0
    for (const line of text.split('\n')) {
      if (line.startsWith('SF:')) {
        source = line.slice(3).replace(`${mainTree}/`, '')
        taken = 0
      }
      if (line.startsWith('BRDA:') && taken < 2) {
        const [ln, block, arm, hits] = line.slice(5).split(',')
        if (hits === '0' || hits === '-') {
          if (!source.startsWith('packages/')) source = `packages/${pkg}/${source}`
          fileStatus(source)
          const code = readFileSync(new URL(source, root), 'utf8').split('\n')[Number(ln) - 1]
          branches.push({
            pkg,
            source,
            line: Number(ln),
            block,
            arm,
            hits,
            code,
            classification: '待证',
            evidence: '仅LCOV零命中候选，不据文件类型宣称不可达或结构约束',
          })
          taken++
        }
      }
      if (branches.filter((x) => x.pkg === pkg).length >= 2) break
    }
  }
  assert.ok(branches.length > 0)
  add(
    'F11',
    'risk',
    JSON.stringify({
      branches,
      scope:
        '每包最多两条真实未命中BRDA，不是全仓穷举；功能可达性/重叠守卫需后续case验证，分母不删除',
    }),
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
