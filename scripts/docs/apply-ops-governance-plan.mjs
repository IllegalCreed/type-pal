import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs'
import { dirname, posix, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { rewriteLinks, rewriteRepositoryPaths } from './relocate.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const planPath = 'docs/ops/archive/ops-governance-layout-20261004.json'
const plan = JSON.parse(readFileSync(resolve(repoRoot, planPath), 'utf8'))
const mapping = new Map(plan.entries.map((entry) => [entry.from, entry.to]))
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
const packagePattern = /(['"])(\.\.?\/[^'"\n]+)\1/g

function rebaseImports(text, from, to) {
  if (!/\.(?:mjs|mts|ts|tsx|js)$/.test(from)) return text
  return text.replace(packagePattern, (_whole, quote, specifier) => {
    const oldTarget = posix.normalize(posix.join(posix.dirname(from), specifier))
    const mapped = mapping.get(oldTarget) ?? oldTarget
    let next = posix.relative(posix.dirname(to), mapped)
    if (!next.startsWith('.')) next = `./${next}`
    return `${quote}${next}${quote}`
  })
}

const prepared = []
for (const entry of plan.entries) {
  const source = resolve(repoRoot, entry.from)
  if (!existsSync(source)) throw new Error(`Ops source missing: ${entry.from}`)
  const original = readFileSync(source)
  if (digest(original) !== entry.sourceSha256) throw new Error(`Ops source changed: ${entry.from}`)
  let next = original.toString('utf8')
  if (/\.md$/i.test(entry.from)) next = rewriteLinks(next, entry.from, entry.to, mapping)
  next = rebaseImports(next, entry.from, entry.to)
  next = rewriteRepositoryPaths(next, mapping)
  prepared.push({ ...entry, bytes: Buffer.from(next), afterSha256: digest(Buffer.from(next)) })
}

for (const entry of prepared) {
  const destination = resolve(repoRoot, entry.to)
  mkdirSync(dirname(destination), { recursive: true })
  renameSync(resolve(repoRoot, entry.from), destination)
  if (!readFileSync(destination).equals(entry.bytes)) writeFileSync(destination, entry.bytes)
}

const archiveBoard = resolve(repoRoot, 'docs/ops/archive/board-history')
mkdirSync(archiveBoard, { recursive: true })
writeFileSync(
  resolve(archiveBoard, 'README.md'),
  '# 历史协作看板\n\n- [2026-10-04 收口前快照](board-20261004.md)\n\n当前责任以 [`../../board.md`](../../board.md) 和任务卡为准。\n',
)

const boardLines = [
  '# 多 Agent 任务看板',
  '',
  '当前看板只记录尚未终态的任务；历史状态快照见 [board-history/board-20261004.md](archive/board-history/board-20261004.md)。任务卡、证据与审计入口见 [ops README](README.md)。',
  '',
  '| ID | 任务 | 状态 | 负责人/下一步 | 一句话备注 |',
  '|---|---|---|---|---|',
  '| OPS-DOC-GOVERNANCE-1 | [协作文档深度治理与入口收口](tasks/OPS-DOC-GOVERNANCE-1-deep-layout.md) | build | Codex / board、audit tools、evidence 归位 | 当前入口与历史快照分离；所有移动保留 source/after SHA 和停止线 |',
  '| E2E-R4-1 | [路线驱动与合法检查点薄基线](tasks/E2E-R4-1-route-and-checkpoint-foundation.md) | build | Codex / 共性批次优先于006 | 001–005已验；浏览器启动失败自动清理待补 |',
  '| E2E-005-1 | [买虾出门与香兰报信](tasks/E2E-005-1-shrimp-errand-and-xianglan-news.md) | review | Codex技术accept / 用户观感 | 技术证据已核，等待用户观感验收 |',
  '| E2E-006-1 | [回客栈求药与张四出海上仙灵岛](tasks/E2E-006-1-inn-doctor-and-boat-to-island.md) | rework | Codex / 补关键NPC日志与一阶段对比 | 剧情链可达但视觉与关键NPC日志未闭合 |',
  '| REFORGE-OPENING-LOAD-ERROR-1 | [标题读档IO失败的悬空拒绝](tasks/REFORGE-OPENING-LOAD-ERROR-1.md) | draft | 等待前提核验 | 不得开始实现 |',
  '| SCRIPT-AUTHOR-2 | [客栈脚本语义命名与坐标走位](tasks/SCRIPT-AUTHOR-2-readable-inn-choreography.md) | build | Codex / 后续语义命名治理 | 保存 counter 已闭合，剩余命名治理未完成 |',
  '',
  '## 看板规则',
  '',
  '- 只把当前未终态任务放在这里；done/cancelled/rework 历史回执进 archive。',
  '- 任务顶部 Status、任务索引和此表必须一致。',
  '- 证据只放 evidence/<task-id>/；审计正文与探针脚本分离。',
  '- 历史报告保留原结论，不因归档升级为当前通过。',
  '',
]
writeFileSync(resolve(repoRoot, 'docs/ops/board.md'), boardLines.join('\n'))

const nextPlan = {
  ...plan,
  appliedRevision: 'working-tree',
  entries: prepared.map(({ bytes, ...entry }) => entry),
}
writeFileSync(resolve(repoRoot, planPath), `${JSON.stringify(nextPlan, null, 2)}\n`)

const allDocs = []
function walk(root) {
  for (const item of readdirSync(root, { withFileTypes: true })) {
    const file = resolve(root, item.name)
    if (item.isDirectory()) walk(file)
    else if (/\.(?:md|json|mjs|mts|ts|tsx|js)$/.test(item.name)) allDocs.push(file)
  }
}
walk(resolve(repoRoot, 'docs'))
for (const file of allDocs) {
  const repoPath = relative(repoRoot, file)
  if (repoPath === 'docs/ops/board.md') continue
  const original = readFileSync(file, 'utf8')
  let next = original
  if (repoPath.endsWith('.md')) next = rewriteLinks(next, repoPath, repoPath, mapping)
  next = rewriteRepositoryPaths(next, mapping)
  if (next !== original) writeFileSync(file, next)
}

console.log(
  JSON.stringify(
    { files: prepared.length, afterSha: prepared.length, board: 'current board regenerated' },
    null,
    2,
  ),
)
