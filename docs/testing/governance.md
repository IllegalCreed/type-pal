# 测试文档治理与淘汰机制

Status: current
Owner: Codex（文档治理维护；原作者/贡献者身份保留于正文历史）
Last reviewed: 2026-10-30
Template: guide-runbook-v1 / 1.0.0

本次治理只统一当前文档结构与入口字段；原始测试范围、机器字段、日期、状态和未执行边界保持，不新增 runtime/E2E/视觉/coverage 信用。

## 目的

- 让文档治理 Agent 在进入 testing、迁移、E2E 或质量门前先读到合法输入、caller/oracle、历史和停止线。

## 前置条件

- 先读 testing catalog、对应 domain/report/contract/evidence；确认 source revision、合法输入、当前状态和版本适用性。

## 步骤

1. 创建或更新 domain README 与 catalog 条目。
2. 将 canonical report、machine evidence、contract、任务卡和引用保持一一配对。
3. 运行 testing/docs checks，记录 source/after SHA 和未执行边界。

## 失败处理

- 可预期失败：缺 canonical、catalog/evidence 不一致、版本适用性未明、依赖状态不合格、孤儿路径或链接漂移。
- 停止线：静态核读、proposal、rework 或历史 receipt 不能冒充 runtime/E2E/visual/coverage。
- 回滚/人工接管：保留原始历史正文与 SHA，回到 draft/rework/blocked，并由 Owner 补齐真实 evidence。

## 完成定义

- 可观察条件：catalog、README、report、evidence、任务卡和索引一致，检查命令零 error/warning/info。
- 证据路径与复核人：本页配套 docs/testing/catalog.json、review records、machine evidence 和独立 Codex review。


## 治理正文

## 唯一事实源

`docs/testing/catalog.json` 是机器可读的索引事实源；文件名、目录名和正文标题只是展示层，不能用来推断状态。
每个条目必须有稳定 `id`、`kind`、`status`、`phase`、`engines`、`owner`、`provenance`、`domain`、`module`、
`canonical`、`index`、`evidence`、`tags`、`lastVerified`、`dependsOn`，以及 `sourceRefs`、
`publicCallers`、`legalInputs`、`businessOracle`、`dedupe`、`revision`。Agent 名称只能出现在 `owner`/`provenance`
和历史正文，不能出现在 canonical/index/evidence 路径。报告中的候选 SHA、checkpoint、证据 hash 仍是业务证据，
catalog 不复制大段运行结果。

每个 canonical contract/report 顶部必须有 `<!-- testing-meta ... -->` JSON 块，并与 `evidence` 文件一一配对。
metadata 和 evidence 都要给出 source file:line、公开 caller、合法输入、业务 oracle、排重结论、当前或明确缺失的
SHA、content/save 版本和历史 revision。`runtime-backed`/`source-backed` claim 必须带可追溯 evidence；源码核读、
proposal 或 rework 的缺口必须显式写出，不能用“已检查”冒充实跑。

## 分级目录

```text
docs/testing/
├── README.md                 总入口（人类先看这里）
├── catalog.json              Agent/脚本唯一索引源
├── indexes/                  生成的多维入口：阶段、状态、标签、Owner
├── e2e/                      端到端专项
│   ├── README.md             E2E 总览
│   ├── contract.md           跨阶段合同
│   ├── route-proposal.md     路线/前置方案
│   ├── stages/NNN-slug/      一个稳定阶段一个目录
│   │   ├── README.md         元数据、依赖、当前状态、入口
│   │   └── report.md         正式报告；不得拆成 report-r1/r2 平行真相
│   └── cross-stage/          跨阶段问题族和共性审计
├── _templates/               新文档模板，不作为报告
├── archive/                  迁移计划和已退役过程材料
├── legacy-flat-classification.json  存量平面文件的域/模块/功能分类账
└── <legacy-flat-files>       兼容区，必须在 legacy-flat.json 登记
```

覆盖率、专项回归、质量审计等其它主题沿用同样规则：`<domain>/README.md`、`catalog.json` 条目、
`report.md`、`evidence.json`/工具分离。工具文件与报告不混放；工具只能落在对应 domain 的 `tools/` 或
任务专属证据目录。

## 命名规则

- 稳定身份使用 `e2e-NNN`、`coverage-YYYYMMDD-slug` 或任务卡 ID；不因返工改 ID。
- 目录使用 `NNN-lower-kebab-case`；正式报告固定叫 `report.md`，机器回执固定叫 `evidence.json`，
  反控工具固定放 `tools/` 并用 `judge.mjs`/`run.mjs` 等职责名。
- E2E 阶段名使用剧情用途，例如 `002-inn-guests-and-reward`；`e56`、`s003` 等内部 ID 只放 sourceRefs、
  caller 或正文证据锚点。
- 返工不是新文档：更新同一 `report.md` 的 revision history；新候选 SHA 写入证据，不复制 `report-r3.md`。
- `archive/` 只放历史/迁移记录；历史不能继续作为 canonical 或当前前驱。

## 生命周期

`draft → active → verified | rework → superseded → archived`。状态变更只改 catalog 和对应 README，
历史报告正文保留原始结论；若新 revision 推翻旧事实，追加勘误段并明确 `supersedes`，不静默改写历史 hash。
不再使用活动 `reviewBy` 或日历过期门。依赖只能指向 `current`/`verified`；缺 canonical、
缺索引、缺 evidence、依赖状态不合格、sourceRef 行号越界、claim/evidence 不一致、Agent 名称污染 canonical
路径或孤儿阶段文件会让 `pnpm check:docs` 失败。

## 版本适用性

用户2026-10-30裁决：取消日期驱动的循环复核与E2E重跑。`lastVerified` 和实际执行日期是历史事实，不是有效期；活动 catalog 和 stage README 不再接受 `reviewBy`。旧到期、续期及失败原件留在 history，不能改写成当时没有失败。

沿用 `revision.currentSha/currentShas`、`contentVersion`、`minimumSaveVersion` 和 `sourceRefs.sha256`，记录证据所针对的候选、数据/存档合同及相关源码。完整源码指纹仍是默认保守边界；合法重构可在核清实际差异后追加复用证明，不能只更新hash或候选SHA。

只读运行 `node scripts/docs/testing-revisions.mjs` 查看六阶段，或加稳定ID（例如 `e2e-001`）查看指定条目：

- `matching`：已声明的版本/源码边界匹配；不等于完整依赖闭包、当前浏览器/E2E/视觉通过。
- `changed`：版本或相关源码指纹不同。先核变化影响及已有证明，只重验受影响合同；不是自动全路线重跑。
- `unknown`：候选/版本/源码记录或当前文件缺失，不能声称证据适用；补齐可追溯记录后再判断。

HEAD不同只作候选对照，不单独判过时；无关文档提交不触发E2E。比较不会改catalog状态、报告、执行日期或证据。实际前驱checkpoint仍须符合当前同引擎版本、真实执行和业务停止线；source hash、配对、artifact真实性与其它硬性检查继续生效。合法schema迁移的 `migrateBy` 是另一类期限，不在此次日历复核退役范围。

## 提交流程

1. 创建/更新 domain README 与 catalog 条目。
2. 运行 `node scripts/docs/generate-testing-index.mjs`，生成九个多维索引。
3. 运行 `pnpm check:testing-docs` 和 `pnpm check:docs`。
4. 报告、证据、工具、任务卡互相链接；只提交持久证据，临时截图/trace 放 `artifacts/` 不入 Git。
5. 旧文档迁移使用 `scripts/docs/relocate.mjs`，必须提交带源 SHA 的迁移计划；完成移动后用
   `scripts/docs/finalize-testing-migration.mjs` 重写 Markdown 引用，并在 `legacy-flat.json.retired` 与分类账登记源路径、
   目标和 SHA。删除前先确认没有 catalog、任务卡、脚本或 README 引用。过期 legacy 条目只能迁移、归档或明确续期，
   不能无限新增平面文件。
6. 代表性深审先落分类账与迁移理由，再按批次迁移；重复/低信息材料通过 `archive/` 与 `supersedes` 导航，保留
   原始正文和历史 hash。未完成独立核验的条目保持 `retain-legacy`/`rework`，不能静默删除或标 verified。
7. 已迁移条目不再从 active `entries` 计数，但必须在 `retired` 和分类账中保留；canonical 只能用工程域、模块和功能
   语义命名，Agent 名称只能作为 provenance 或历史原始文件的来源说明。
