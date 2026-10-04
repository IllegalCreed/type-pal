import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(new URL('../..', import.meta.url).pathname)
const reviewDir = resolve(root, 'docs/phase-governance/reviews')
const sourcePath = resolve(reviewDir, '20261004-structured-content-batch.json')
const source = JSON.parse(readFileSync(sourcePath, 'utf8'))
const notes = new Map([
  [
    'docs/ops/README.md',
    '现行 Ops 总入口：看板、任务、指南、审计和证据分层；历史归档不再承担当前责任。',
  ],
  [
    'docs/ops/agent-workflow.md',
    '当前临时模式以 Codex 分派、贡献者执行、Codex 独立验收为准；旧三贤人流程只保留历史。测试必须按真实 caller/oracle、排重、反控和隔离验收，不能由绿灯/数量/覆盖率单独证明。',
  ],
  [
    'docs/ops/board.md',
    '当前看板只保留非终态任务，状态必须与任务卡和索引一致；本次文档治理卡仍是 build，不能因机器清单而提前关闭。',
  ],
  [
    'docs/ops/audits/README.md',
    '当前审计入口只消费未归档台账；历史审计必须留在 archive，不因整理升级为当前缺陷结论。',
  ],
  [
    'docs/ops/audits/architecture-debt.md',
    '架构债台账明确首轮是静态盘点，不是语义审计完成证明；队列按所有权/生命周期/取消与依赖拆分，未测项和已完成回执保持边界。',
  ],
  [
    'docs/ops/evidence/README.md',
    '活动任务证据按卡分目录，已关闭证据归档；证据材料服务于当前任务但不自动证明运行时或覆盖率结果。',
  ],
  [
    'docs/ops/guides/README.md',
    '指南入口只负责操作方法，覆盖率和 E2E 合同统一放 testing，避免同类流程另造模型。',
  ],
  [
    'docs/ops/guides/documentation.md',
    '把 current/historical/evidence/superseded 四类有效范围、归档与索引规则、链接和版本检查边界写清；工具检查不能替代语义判断。',
  ],
  [
    'docs/ops/guides/browser-verification.md',
    '浏览器手册区分游戏键盘、编辑器鼠标和 debug DOM，要求真实入口、机读观察点和集中 E2E 证据，禁止把点画布无反应当作产品缺陷。',
  ],
  [
    'docs/ops/guides/dev-servers.md',
    '开发服务器手册固定端口、PAL 资源物化、current-only 迁移和 demo/pal 入口；明确 bake 不会物化 PAL 工程资源，避免错误修复路径。',
  ],
  [
    'docs/ops/tasks/README.md',
    '活动任务按风险选择完整/轻量模板，前提真值门先于 build，当前看板只承载非终态卡；历史三贤人门禁不覆盖当前临时模式。',
  ],
  [
    'docs/ops/tasks/index.md',
    '任务索引由检查器按卡片顶部状态生成，历史终态说明不改变当前责任；索引本身不是完成证据。',
  ],
  [
    'docs/ops/templates/README.md',
    'Ops 任务模板提供完整/轻量两种合同；当前新增文档应绑定统一治理模板，历史卡按记录保留。',
  ],
  [
    'docs/ops/templates/TASK-lite-template.md',
    '轻量卡明确适用范围、前提证据、验证和 Codex 独立验收；遇到 schema/save/migration/真值等高风险必须升级完整卡。',
  ],
  [
    'docs/ops/templates/TASK-template.md',
    '完整卡覆盖四向真值矩阵、可证伪替代解释、上下文锚点、验收、分派、视觉/E2E、复核和交接；模板本身不授予 build/done。',
  ],
  [
    'docs/phase2/guides/actor-presets.md',
    '人物定义与场景实例分离，稳定 actor id 与资源引用可共享；解除关联、复制、删除必须保持引用安全和可撤销，不能把人物预制误当行为 prefab。',
  ],
  [
    'docs/phase2/guides/battlefield-authoring.md',
    '战场是环境定义，不是阵型；场景/明雷/startBattle按显式优先级选择 fieldId，PAL raw 0..5 的迁移事实不应污染通用 schema。',
  ],
  [
    'docs/phase2/guides/content-publication.md',
    '作者正文以当前工程为真源，PAL 供应分区才经 migrate 重导；check:content 只读，migrate --write 会写盘，禁止直接改生成 JSON 代替上游修复。',
  ],
  [
    'docs/phase2/guides/debug-tools.md',
    'debug 面板仅 DEV，通过公开 runCommands/runner caller 提供场景、战斗、脚本和帧步进；内存态动作不落档，生产构建必须无 debug chunk。',
  ],
  [
    'docs/phase2/guides/scene-entry-authoring.md',
    '现行入口只编辑 prepare/body，reveal 合同存在但暂无独立控件；prepare 安全目录尚未在插入/保存门真正拒绝，文档明确不把数据字段误报成 UI 能力。',
  ],
  [
    'docs/phase2/guides/shared-script-author-guide.md',
    '共享脚本只承载稳定业务语义的多调用逻辑；实体行为、hook、物品私有脚本和模板各有边界，N6b 参数化仍是未实现的未来工作。',
  ],
])
const selected = []
const rest = []
for (const entry of source.entries) {
  const note = notes.get(entry.path)
  if (!note) rest.push(entry)
  else {
    entry.reviewDepth = 'deep-semantic'
    entry.readMethod = 'full-text-read'
    entry.reviewNotes = note
    entry.businessOracle.assertions.unshift(
      'Codex independently reconciled the document purpose, current/historical boundary, template type and explicit unresolved claims',
    )
    selected.push(entry)
  }
}
writeFileSync(sourcePath, `${JSON.stringify({ ...source, entries: rest }, null, 2)}\n`)
writeFileSync(
  resolve(reviewDir, '20261004-semantic-current-batch.json'),
  `${JSON.stringify({ schemaVersion: 1, id: 'semantic-current-document-review-20261004', reviewer: 'Codex', reviewDate: '2026-10-04', policy: 'Full-text semantic review for current governance and author-facing documents; historical/large ledger documents remain structured-content review and are not silently promoted.', entries: selected }, null, 2)}\n`,
)
console.log(
  JSON.stringify({ promoted: selected.length, remainingStructured: rest.length }, null, 2),
)
