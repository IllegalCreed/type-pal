// GLM boundary batch-2 · F组（七包覆盖率缺口与优先回归清单）· 静态盘点。
// 运行：node --import tsx docs/ops/audits/pre-e2e/probe-glm-next-coverage.mjs
// 只读：主树 coverage/fast 各包 summary（已核关键源码 hash 与冻结树一致）+ baseline.fast.json
// + 测试文件 census。不跑 coverage、不写仓库 coverage/基线。F 组为静态清单，不虚标动态 covered。
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = new URL('../../../../', import.meta.url)
const repoRoot = fileURLToPath(root)
const mainTree = '/Users/zhangxu/illegal/type-pal' // 主树 coverage（只读；源码一致性已核）

const baseline = JSON.parse(readFileSync(new URL('scripts/coverage/baseline.fast.json', root), 'utf8'))
const perPkg = {}
for (const pkg of ['shared', 'content', 'pal-extract', 'migrate', 'reforge', 'game', 'editor']) {
  const s = JSON.parse(readFileSync(`${mainTree}/coverage/fast/${pkg}/coverage-summary.json`, 'utf8'))
  const t = s.total ?? s['total']
  perPkg[pkg] = {
    lines: `${t.lines.covered}/${t.lines.total}`,
    branch: `${t.branches.covered}/${t.branches.total}`,
    funcs: `${t.functions.covered}/${t.functions.total}`,
    tests: baseline.packages[pkg].fastTests?.testCount,
    testFiles: baseline.packages[pkg].fastTests?.testFileCount,
    srcFiles: baseline.packages[pkg].sourceFileCount,
  }
}
const grepCount = (pattern, paths) => {
  const r = execFileSync('grep', ['-rn', '-E', pattern, ...paths], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  })
  return (r.match(new RegExp(pattern, 'g')) ?? []).length
}
const noCheck = grepCount('ts-nocheck', ['packages/shared/src', 'packages/content/src', 'packages/pal-extract/src', 'packages/migrate/src', 'packages/reforge/src', 'packages/game/src', 'packages/editor/src'])

const rows = []
const add = (id, verdict, detail) => {
  rows.push({ id, verdict, detail })
  console.log(JSON.stringify({ id, verdict, detail }))
}

// F01-F07 各包缺口盘点（静态，附真实调用点）
add('F01', 'risk', `shared 行${perPkg.shared.lines} 分支${perPkg.shared.branch}（${perPkg.shared.tests}项/${perPkg.shared.testFiles}文件）：解码器/解析器输入边界为主要缺口；最高优先真实调用点=content/reforge 对 shared 编解码与 id 规范的消费（低百分比源于包小+入口集中在 CLI）。候选：边界值/非法 UTF-8/超长 id 的解码拒绝正控`)
add('F02', 'risk', `content 行${perPkg.content.lines} 分支${perPkg.content.branch}（${perPkg.content.tests}项）：验证器未覆盖分支集中在可选字段组合与跨字段约束（skill.ts:220 毒系互斥、scene-core 深层嵌套）；真实合法/非法输入应从 projects/pal 现有内容抽样。避免把类型外不可能值算优先用例`)
add('F03', 'risk', `pal-extract 行${perPkg['pal-extract'].lines} 分支${perPkg['pal-extract'].branch}（fast ${perPkg['pal-extract'].tests}项 vs PAL 资产组更多）：fast 不含真实 MKF 解析（缺 gitignored 资产）；缺输入合同单列=MKF 边界块/截断文件。最高价值候选=用 data/raw 只读小样本的解码边界`)
add('F04', 'risk', `migrate 行${perPkg.migrate.lines} 分支${perPkg.migrate.branch}（${perPkg.migrate.tests}项）：unit 与 PAL 组差异大；高风险未命中=journal 恢复路径异常分支、物化 authored 跳过、多 scope 提交交织（migration-transaction.ts:258+/migration-write-plan）。不重跑 CLI`)
add('F05', 'risk', `reforge 行${perPkg.reforge.lines} 分支${perPkg.reforge.branch}（${perPkg.reforge.tests}项）：与 A-D 去重后最高价值=战斗终态链（C10 玩家死亡终态、毒杀自动结算——Q2）、脚本宿主 gate/cancel 组合（A 组已列）、存档恢复 snapshot 边界（SAVE 域已修，剩余为极端交织）。不重复计算 A-D 已登记缺口`)
add('F06', 'risk', `editor 行${perPkg.editor.lines} 分支${perPkg.editor.branch}（${perPkg.editor.tests}项/${perPkg.editor.testFiles}文件）：D-01 done 后剩余=命令族深分支（stamp-group/battle-data-delete 等删除命令失败域）、加载边界（D-06 新建物品 canonical 缺席、D-07 共享 ScriptId 前缀冲突——均列后续归属不修）`)
add('F07', 'risk', `game 行${perPkg.game.lines} 分支${perPkg.game.branch}（${perPkg.game.tests}项）：普通 unit 覆盖较高，缺口在 headless 集成与 PAL 资产组（需 data/extracted）；非视觉高价值=菜单/状态机边界（D 组同域已列）、存档载入恢复。第一阶段缺口不阻断 R4（分流见 F12）`)
add('F08', 'risk', `各包最高优先文件（按真实调用点而非百分比）：shared→id/codec 核心；content→skill.ts 验证器（:220 毒系）+scene-core；pal-extract→MKF 主解码器；migrate→migration-transaction.ts（恢复链）+migration-write-plan（symlink/authored）；reforge→battle-session.ts 终态+script-runner-core gate；editor→D-06/D-07 相关命令族；game→菜单状态机+存档载入`)
add('F09', 'risk', `可实施用例草案（每包≤3，fixture/操作/断言/反控/命令）：①migrate E06 扩展=临时父根 symlink→journal 恢复拒绝（反控=无链接通过）；②reforge C10=低防满血敌+毒玩家→死亡终态 assert defeat（正控=胜利链）；③editor D-06=新建物品→立即私有脚本→保存缺 canonical 记录（原树观察+合同草案双模式）。运行入口均在本包探针 --case 形态`)
add('F10', 'risk', `定向抽查风险：整文件 ts-nocheck 计数=${noCheck}（含历史 Node 审计惯例文件，非按命中判 bug）；早 return/空样本需动态举证——本批 A-E 探针已对最高优先项给了 entered/完成信号见证；未动态复核的只标静态候选`)
add('F11', 'risk', `分支 classified 分栏原则（本包 72 行执行）：可达待测（fixture 可构造）/重叠守卫（后层拦截，如 save 6红中 2 下游拒绝）/结构约束（宿主/环境域如浏览器壳）/待证（需一手证据）。全部保留在覆盖分母，「很难构造」≠不可达`)
add('F12', 'risk', `统一去重与顺序：本批 A09/A10-cancel/A11-cancel/A12-cancel（提交前 abort 写入残留）归 D-01 同族全局历史域（已 done 但 cancel 写入域或需复核）→列 Codex 复核；C 组偷取 writeBack 语义（战内新增丢弃）归 C-04 审计项修复卡；B05/B06 barrier 时序归 B-06/B-07 域；E09-E12 旧接口归 N6b 前清理卡；其余 Q2/R4 按现有排期，不发明「先补 90%」门槛`)
console.log(`\nF组静态盘点完成：${rows.length} 条`)
