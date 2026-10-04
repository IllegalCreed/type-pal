import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Reproducible metadata reconciliation for the explicitly reviewed October batch.
// Old publication bytes are retained under history/; no runtime tests are run here.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const testing = resolve(root, 'docs/testing')
const base = execFileSync(
  'git',
  ['rev-parse', 'd02278dc0154dd73b5db24388a35c30bb096cc81^{commit}'],
  {
    cwd: root,
    encoding: 'utf8',
  },
).trim()
const gitSha = (value) =>
  value
    ? execFileSync('git', ['rev-parse', `${value}^{commit}`], {
        cwd: root,
        encoding: 'utf8',
      }).trim()
    : null
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const read = (path) => readFileSync(resolve(root, path), 'utf8')
const json = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)

function ref(path, anchor, role, span = 8) {
  const text = read(path)
  const offset = text.indexOf(anchor)
  if (offset < 0 || text.indexOf(anchor, offset + anchor.length) >= 0)
    throw new Error(`Missing/ambiguous reviewed anchor ${path}: ${anchor}`)
  const start = text.slice(0, offset).split('\n').length
  const end = Math.min(start + span - 1, text.split('\n').length - 1)
  return { path, lines: `${start}-${end}`, anchor, role, sha256: hash(text) }
}

const versionRef = () =>
  ref('packages/content/src/character.ts', 'export const CONTENT_VERSION =', 'version', 3)
const e2e = {
  'e2e-contract': {
    refs: [ref('scripts/e2e/opening-both.mjs', 'import { spawn }', 'caller'), versionRef()],
    issue:
      '合同硬门中的旧平面报告名应由 catalog canonical 解析。capture、路线、存读与 NPC 演出门分别保留。',
  },
  'e2e-route': {
    refs: [
      ref('scripts/e2e/inn-contract.mjs', 'export function validatePredecessor(', 'input', 18),
      versionRef(),
    ],
    issue:
      '方案在 2026-09-27 写作时尚无 runner，现已存在 root package E2E 命令；该段保留为历史前提，不能当当前能力缺口。',
  },
  'e2e-common-issues': {
    refs: [
      ref(
        'scripts/e2e/errand-contract.mjs',
        'export function assertErrandBackground(',
        'oracle',
        14,
      ),
      ref('scripts/e2e/kitchen-contract.mjs', 'export function assertKitchenTrace(', 'oracle', 18),
    ],
    issue: '共性问题族只汇总已报告问题，不为后期站点或 006 追加实跑信用。',
  },
  'e2e-001': {
    refs: [
      ref(
        'scripts/e2e/game-opening.mjs',
        'const openingContract = await readOpeningContract',
        'caller',
        5,
      ),
      ref('scripts/e2e/opening-matrix.mjs', 'export function assertOpeningMatrix(', 'oracle', 18),
      ref('scripts/e2e/opening-handoff.mjs', 'export function assertOpeningHandoff(', 'oracle', 18),
      versionRef(),
    ],
    issue:
      '历史 2026-09-28 二阶段回执是 content20/SAVE8；原文后加的 content21/SAVE10 不是该次执行版本。当前 22/11 链由 current-checkpoints 单独登记。',
  },
  'e2e-002': {
    refs: [
      ref('scripts/e2e/game-inn.mjs', 'await runInnJourney', 'caller', 3),
      ref('scripts/e2e/inn-contract.mjs', 'export function validatePredecessor(', 'input', 18),
      ref('scripts/e2e/inn-contract.mjs', 'export function assertInnEvidence(', 'oracle', 18),
      ref(
        'scripts/e2e/inn-contract.mjs',
        "'money not committed between thanks and reward display'",
        'oracle',
        12,
      ),
      versionRef(),
    ],
    issue:
      '旧段落混写 content21/SAVE9 与后续 SAVE10，须按每轮历史回执理解。内部实体编号只用于源定位，当前业务名为客栈住客与赏银。',
  },
  'e2e-003': {
    refs: [
      ref('scripts/e2e/kitchen-game.mjs', 'await runKitchenJourney', 'caller', 3),
      ref(
        'scripts/e2e/kitchen-contract.mjs',
        'export function validateKitchenPredecessor(',
        'input',
        18,
      ),
      ref(
        'scripts/e2e/kitchen-contract.mjs',
        "'stairs must commit all twelve authored fragments'",
        'oracle',
        15,
      ),
      ref(
        'scripts/e2e/kitchen-contract.mjs',
        'export function assertKitchenStoryEnd(',
        'oracle',
        18,
      ),
      versionRef(),
    ],
    issue:
      '两份旧实跑使用不同 revision，不能据此写成同 SHA both 汇总；004 取菜/姿态相邻核读不计 003 运行覆盖。',
  },
  'e2e-004': {
    refs: [
      ref('scripts/e2e/meal-game.mjs', 'await runMealJourney', 'caller', 3),
      ref('scripts/e2e/meal-contract.mjs', 'export function validateMealPredecessor(', 'input', 18),
      ref('scripts/e2e/meal-contract.mjs', 'export function assertMealSuite(', 'oracle', 16),
      ref(
        'scripts/e2e/meal-contract.mjs',
        'export function assertMealGameSaveInput(',
        'oracle',
        18,
      ),
      versionRef(),
    ],
    issue:
      '9a488c02 六 case 是旧版本历史执行；不能把当前 canonical 22/11 倒填到旧回执。receipt-model-only 复核不等于新增实跑。',
  },
  'e2e-005': {
    refs: [
      ref('scripts/e2e/errand-game.mjs', 'await runErrandJourney', 'caller', 3),
      ref(
        'scripts/e2e/errand-contract.mjs',
        'export function validateErrandPredecessor(',
        'input',
        18,
      ),
      ref('scripts/e2e/errand-contract.mjs', 'export function assertErrandStory(', 'oracle', 20),
      ref(
        'scripts/e2e/errand-contract.mjs',
        'export function assertErrandBackground(',
        'oracle',
        20,
      ),
      versionRef(),
    ],
    issue:
      '98a42d4e 六 case 与其后 22/11 重建链分开；wrapper 启动失败保留，后补 case 不冒称同一次 wrapper 全程成功。',
  },
  'e2e-006': {
    refs: [
      ref('scripts/e2e/boat-reforge.mjs', 'await runBoatJourney', 'caller', 3),
      ref('scripts/e2e/boat-journey.mjs', 'export async function runBoatJourney(', 'caller', 20),
      versionRef(),
    ],
    issue:
      '真实入口是 node scripts/e2e/boat-reforge.mjs，上一版误引了 005 runner。报告没有完整执行 SHA，缺当前第一阶段 NPC 和船段视觉复验，rework 继续保留。',
    callers: ['node scripts/e2e/boat-reforge.mjs'],
  },
}

const domains = [
  {
    id: 'runtime-active-scene',
    module: 'scene',
    slug: 'active-scene',
    title: '活动场景资源与镜头所有权',
    implementation: '2dc5d1d5',
    legacy: 'active-scene-refactor.md',
    originalEvidence: 'active-scene-evidence.json',
    refs: [
      ref('packages/reforge/src/main.ts', 'const activeScene = new ActiveScene', 'caller', 8),
      ref('packages/reforge/src/main.ts', 'const cameraSession = new WorldCamera', 'caller', 8),
      ref('packages/reforge/src/active-scene.ts', 'commit(plan:', 'contract', 26),
      ref(
        'packages/reforge/src/active-scene.test.ts',
        "test('next scene clears old actions",
        'oracle',
        25,
      ),
      ref(
        'packages/reforge/src/world-camera.test.ts',
        "test('pre-aborted request rejects",
        'oracle',
        18,
      ),
    ],
    callers: [
      'bootGame → ActiveScene.commit(plan)',
      'bootGame → WorldCamera.update/pan/advance/reset',
    ],
    inputs: [
      '正式 ScenePreparer.prepare 产出的 ActiveScenePlan',
      'GridPos 与 live bounds callbacks',
      '当前 runner AbortSignal',
    ],
    assertions: [
      '换场清旧 action/baseline/wave 并兑现旧 waiter',
      '新资源在 boundary cue 前发布，room/bounds 时机保留',
      'pre-abort 不取代旧 pan；reset 不提前采样像素位置',
    ],
    dedupe:
      '17 项历史 owner 回归与 save/async/checkpoint 链职责不同；不将 80 个 AST 保护函数或 2560 步对照计作新增业务测试。当前 residual 文件属于后续测试包，本卡不重收/修改。',
    findings:
      '历史正文 A3 未完成、53 warning/6 info 属于 2026-09-25 快照。后续全队列统一接收已由 architecture-continuation-integration 记载；本轮只核当前 owner 接线。历史临时日志/内联截图没有随隔离 checkout 入库，无法本轮复算原实跑。',
  },
  {
    id: 'runtime-battle-host',
    module: 'battle',
    slug: 'battle-host',
    title: '战斗宿主启动、取消与世界提交',
    implementation: '46287966',
    legacy: 'battle-host-refactor.md',
    originalEvidence: 'battle-host-refactor-evidence.json',
    refs: [
      ref('packages/reforge/src/main.ts', 'const battleHost = new BattleHost', 'caller', 20),
      ref('packages/reforge/src/battle/battle-host.ts', 'async start(', 'contract', 15),
      ref(
        'packages/reforge/src/battle/battle-host.ts',
        'this.ports.finishWorld(session, result)',
        'contract',
        5,
      ),
      ref(
        'packages/reforge/src/battle/battle-host.test.ts',
        "test('commit consumes live inventory",
        'oracle',
        24,
      ),
    ],
    callers: [
      'bootGame → BattleHost.start/cancel/active',
      'BattleHost.start → BattleLaunchPreparation.prepare → commit → BattleSession',
    ],
    inputs: [
      '当前 loader 验证的 team/world/content',
      '真实准备资源端口',
      'runner signal 与 captureScriptOwner 身份门',
    ],
    assertions: [
      'await 准备完成后提交拍读取 world snapshot',
      '旧 finally 只释放自身 active session',
      '释放 active 与 finishWorld 同一 continuation',
    ],
    dedupe:
      '准备资源、宿主 identity、BattleSession 内部菜单/结算是不同合同；H9 随机败北固定输入为历史测试校正，不计本治理的新反控。',
    findings:
      '历史候选 57794d15/348a50d1 被原子收尾 46287966 取代。历史单次严格 fast7972 与 warnings 数字不改写为当前质量。主壳当前 caller 仍消费该 owner；未复跑原反控、PAL 战斗或覆盖基线。',
  },
  {
    id: 'runtime-battle-session-owners',
    module: 'battle',
    slug: 'battle-session-owners',
    title: '战斗会话 readiness、结算与指令选择',
    implementation: 'afef3cd3',
    legacy: 'battle-session-owners-refactor.md',
    originalEvidence: 'battle-session-owners-refactor-evidence.json',
    refs: [
      ref(
        'packages/reforge/src/battle/battle-session.ts',
        'private readonly selection = new BattleCommandSelection',
        'caller',
        3,
      ),
      ref(
        'packages/reforge/src/battle/battle-session.ts',
        'this.readiness = new BattleTurnReadinessGate',
        'caller',
        12,
      ),
      ref(
        'packages/reforge/src/battle/battle-session.ts',
        'this.selection.advance(context',
        'caller',
        10,
      ),
      ref(
        'packages/reforge/src/battle/battle-turn-readiness.test.ts',
        "describe('BattleTurnReadinessGate'",
        'oracle',
        24,
      ),
      ref(
        'packages/reforge/src/battle/battle-command-selection.test.ts',
        "describe('BattleCommandSelection'",
        'oracle',
        24,
      ),
    ],
    callers: [
      'BattleSession constructor → readiness/settlement owners',
      'BattleSession.tick → command selection and settlement',
      'BattleSession.playTimeline → action scheduler',
    ],
    inputs: [
      '当前 BattleContent 与 typed PlayerRuntime 投影',
      '五敌槽与存活目标集合',
      '真实 pressed key Set 与明确 dtMs',
    ],
    assertions: [
      '取消后迟到 prepare 无法提交',
      '结算每屏 300ms 与 terminated 同拍边界',
      '指令 LIFO 与 scripted playback 清理保持区别',
    ],
    dedupe:
      '四 owner 共35条历史回归；与 BattleHost 的 launch/world 写回合同区分。AST 接线计数是结构合同，不能独立证明胜敗演出。',
    findings:
      '旧 report/evidence 的 candidate、not merged、unified gates pending 已被 2026-09-26 统一集成回执 supersede；原文只留 history。三人成型最小试打不能扩大成完整胜败、存档或剧情 E2E。',
  },
  {
    id: 'runtime-world-owners',
    module: 'world',
    slug: 'world-runtime',
    title: '世界移动提交与绘制状态所有权',
    implementation: '7be10bf4',
    legacy: 'world-runtime-refactor.md',
    originalEvidence: 'world-runtime-refactor-evidence.json',
    refs: [
      ref('packages/reforge/src/main.ts', 'const motion = new WorldMotionRuntime', 'caller', 12),
      ref(
        'packages/reforge/src/world-motion-runtime.ts',
        'export class WorldMotionRuntime',
        'contract',
        24,
      ),
      ref(
        'packages/reforge/src/world-scene-presentation.ts',
        'export class WorldScenePresentation',
        'contract',
        18,
      ),
      ref(
        'packages/reforge/src/world-motion-runtime.test.ts',
        "describe('WorldMotionRuntime ownership'",
        'oracle',
        24,
      ),
      ref(
        'packages/reforge/src/world-scene-presentation.test.ts',
        "describe('WorldScenePresentation sprite ownership'",
        'oracle',
        24,
      ),
    ],
    callers: [
      'bootGame → WorldMotionRuntime + WorldScenePresentation',
      'advanceMoves → canonical endpoint/live position/touch',
      'render → scene presentation snapshot',
    ],
    inputs: [
      '当前 scene session/authority/runner lineage',
      'production MotionRuntimeCoordinator 与合法 GridPos',
      'typed scene/renderer draw snapshot',
    ],
    assertions: [
      'endpoint 先落 canonical，live 提交后 touch，再唤醒 continuation',
      'party/实体取消释放监听器与 waiter',
      '每帧自身锚点与 frame priority/shake/wave 保留',
    ],
    dedupe:
      'MotionRuntimeCoordinator 仍拥有 authority/slot；WorldMotionRuntime 管外围节拍和生命周期。ActiveScene 拥有资源、presentation 拥有绘制状态，不能把两份报告重复算整场景 E2E。',
    findings:
      '旧正文中的不合 main/未统一门仅为候选时点；当前由 unified integration 收口。未读取 console 的原最小功能过程保持未证，不倒填 console 零错误；完整剧情观感仍另归 E2E。',
  },
]

const catalog = JSON.parse(read('docs/testing/catalog.json'))
function decorate(entry, refs, issue) {
  entry.sourceRefs = refs
  const currentSha = entry.revision?.currentSha ?? base
  entry.revision = {
    currentSha,
    contentVersion: 22,
    minimumSaveVersion: 11,
    history: [
      {
        revision: currentSha,
        date: '2026-10-04',
        action: 'source-and-publication-audit',
        notRun: ['runtime', 'E2E', 'coverage'],
      },
    ],
  }
  entry.reviewScope =
    'document-audit; historical execution claims retained with their original scope'
  const evidence = {
    schemaVersion: 2,
    id: entry.id,
    kind: 'document-audit',
    status: entry.status,
    candidateSha: base,
    versions: { content: 22, minimumSave: 11 },
    sourceRefs: refs,
    publicCallers: entry.publicCallers,
    legalInputs: entry.legalInputs,
    businessOracle: entry.businessOracle,
    dedupe: entry.dedupe,
    claims: [
      {
        id: `${entry.id}-source-contract`,
        result: 'source-backed',
        evidence: refs.map((source) => `${source.path}:${source.lines}`),
      },
    ],
    runtimeExecution: {
      performed: false,
      rawArtifacts: 'not-present-in-isolated-checkout',
      claimScope: 'historical-publication-only',
    },
    findings: [issue],
    artifacts: [],
    history: entry.revision.history,
  }
  const meta = {
    schemaVersion: 2,
    id: entry.id,
    sourceRefs: refs,
    publicCallers: entry.publicCallers,
    legalInputs: entry.legalInputs,
    businessOracle: entry.businessOracle,
    dedupe: entry.dedupe,
    revision: entry.revision,
    evidence: entry.evidence,
  }
  json(resolve(testing, entry.evidence), evidence)
  return `---\ntestingSchema: 2\nid: ${entry.id}\nevidence: ${entry.evidence}\n---\n\n<!-- testing-meta\n${JSON.stringify(meta)}\n-->\n\n`
}
for (const entry of catalog.entries.filter((entry) => e2e[entry.id])) {
  const audit = e2e[entry.id]
  if (audit.callers) entry.publicCallers = audit.callers
  if (entry.revision?.currentSha) entry.revision.currentSha = gitSha(entry.revision.currentSha)
  const header = decorate(entry, audit.refs, audit.issue)
  const file = resolve(testing, entry.canonical)
  let body = readFileSync(file, 'utf8')
    .replace(/^---[\s\S]*?\n---\s*/, '')
    .replace(/<!-- testing-meta[\s\S]*?-->\s*/, '')
  body = body.replace(/\n## 2026-10-04 文档深审[\s\S]*?(?=\n## |$)/, '')
  const index = body.indexOf('\n')
  body = `${body.slice(0, index)}\n\n## 2026-10-04 文档深审\n\n${audit.issue}\n\n当前核读基线为 \`${base}\`，content22/SAVE11。本轮没有执行游戏；配对 evidence 记录精确 source/caller/oracle、源 hash 与缺失原始产物。下文数值/告警/通过结论保留为各轮历史记录。\n${body.slice(index)} `
  writeFileSync(file, `${header}${body.trimEnd()}\n`)
}

for (const audit of domains) {
  const directory = `domains/runtime/${audit.module}/${audit.slug}`
  const absolute = resolve(testing, directory)
  const history = resolve(absolute, 'history')
  mkdirSync(history, { recursive: true })
  for (const name of ['report.md', 'evidence.json']) {
    const path = resolve(absolute, name)
    const target = resolve(history, name)
    if (!existsSync(target)) renameSync(path, target)
  }
  const entry = {
    id: audit.id,
    kind: 'report',
    title: audit.title,
    status: 'current',
    phase: ['phase2'],
    engines: ['reforge'],
    owner: 'Codex',
    provenance: ['Codex'],
    domain: 'runtime',
    module: audit.module,
    canonical: `${directory}/report.md`,
    index: `${directory}/README.md`,
    evidence: `${directory}/evidence.json`,
    tags: ['ownership', audit.module, 'document-audit'],
    lastVerified: '2026-10-04',
    reviewBy: '2026-11-04',
    dependsOn: [],
    publicCallers: audit.callers,
    legalInputs: audit.inputs,
    businessOracle: { type: audit.id, assertions: audit.assertions },
    dedupe: {
      result: 'source-review-no-new-test-credit',
      against: [
        'docs/testing/architecture-continuation-integration.md',
        `${directory}/history/report.md`,
      ],
      notes: audit.dedupe,
    },
    historical: {
      report: `${directory}/history/report.md`,
      evidence: `${directory}/history/evidence.json`,
      implementationSha: execFileSync('git', ['rev-parse', audit.implementation], {
        cwd: root,
        encoding: 'utf8',
      }).trim(),
      originalReport: audit.legacy,
      originalEvidence: audit.originalEvidence,
      supersededBy: audit.id,
    },
  }
  const header = decorate(entry, [...audit.refs, versionRef()], audit.findings)
  const lines = audit.refs
    .map(
      (source) =>
        `- \`${source.path}:${source.lines}\`（${source.role}；anchor \`${source.anchor}\`）`,
    )
    .join('\n')
  writeFileSync(
    resolve(absolute, 'report.md'),
    `${header}# ${audit.title}\n\n## 复核范围与结论\n\n${audit.findings}\n\n本轮结论为当前源码接线与历史出版记录已核读。没有重跑运行时、旧反控、浏览器或覆盖率；历史证据不可因文档治理升级为当前动态验证。\n\n## 真实 caller、输入与业务 oracle\n\n${lines}\n\n公开调用链：${audit.callers.join('；')}。合法输入：${audit.inputs.join('；')}。\n\n业务判据：${audit.assertions.join('；')}。这里是对既有测试合同的核读，不是新增测试或历史运行真实性再认证。\n\n## 排重和处理理由\n\n${audit.dedupe}\n\n保留唯一历史 report/evidence；当前索引与报告 supersede 原平面材料的导航和当前状态口径，原失败、warnings、计数和候选 SHA 均由 [历史报告](history/report.md) 和 [原始机账](history/evidence.json) 保留。\n\n## 证据与 revision\n\n[配对文档核读证据](evidence.json)记录 source hashes。原始材料迁移前 hash 在 [迁移计划](/docs/testing/archive/migrations/testing-domains-20261004.json)；当前内容22/保存11，历史内容20/保存8不升级。\n\n2026-10-04：基线 ${base}，迁移+source audit；未重新执行产品，原作者验收与历史 counter 按旧记录保留。\n`,
  )
  writeFileSync(
    resolve(absolute, 'README.md'),
    `# ${audit.title}\n\n- [当前文档核读报告](report.md)\n- [配对 evidence](evidence.json)\n- [历史出版记录](history/README.md)\n\n状态：current（source audit），当前版本 content22/SAVE11。历史动态验收见原报告，不用 source review 冒充实跑。\n`,
  )
  writeFileSync(
    resolve(history, 'README.md'),
    `# ${audit.title} · 历史\n\n- [原报告](report.md)\n- [原始机账](evidence.json)\n\n原始候选与告警保留；当前导航由 [治理报告](../report.md) supersede。迁移只重基相对链接，不追溯改写结果。\n`,
  )
  const existing = catalog.entries.findIndex((candidate) => candidate.id === audit.id)
  if (existing < 0) catalog.entries.push(entry)
  else catalog.entries[existing] = entry
}
json(resolve(testing, 'catalog.json'), catalog)
console.log('deep testing metadata reconciled: 9 E2E audits + 4 runtime domain reports')
