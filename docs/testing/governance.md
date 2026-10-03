# 测试文档治理与淘汰机制

## 唯一事实源

`docs/testing/catalog.json` 是机器可读的索引事实源；文件名、目录名和正文标题只是展示层，不能用来推断状态。
每个条目必须有稳定 `id`、`kind`、`status`、`phase`、`engines`、`owner`、`canonical`、`index`、`tags`、
`lastVerified`、`reviewBy` 和 `dependsOn`。报告中的候选 SHA、checkpoint、证据 hash 仍是业务证据，
catalog 不复制大段运行结果。

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
└── <legacy-flat-files>       兼容区，必须在 legacy-flat.json 登记
```

覆盖率、专项回归、质量审计等其它主题沿用同样规则：`<domain>/README.md`、`catalog.json` 条目、
`report.md`、`evidence.json`/工具分离。工具文件与报告不混放；工具只能落在对应 domain 的 `tools/` 或
任务专属证据目录。

## 命名规则

- 稳定身份使用 `e2e-NNN`、`coverage-YYYYMMDD-slug` 或任务卡 ID；不因返工改 ID。
- 目录使用 `NNN-lower-kebab-case`；正式报告固定叫 `report.md`，机器回执固定叫 `evidence.json`，
  反控工具固定放 `tools/` 并用 `judge.mjs`/`run.mjs` 等职责名。
- 返工不是新文档：更新同一 `report.md` 的 revision history；新候选 SHA 写入证据，不复制 `report-r3.md`。
- `archive/` 只放历史/迁移记录；历史不能继续作为 canonical 或当前前驱。

## 生命周期

`draft → active → verified | rework → superseded → archived`。状态变更只改 catalog 和对应 README，
历史报告正文保留原始结论；若新 revision 推翻旧事实，追加勘误段并明确 `supersedes`，不静默改写历史 hash。
每条 current/verified/rework 记录必须有 `reviewBy`。过期、缺 canonical、缺索引、依赖指向非 verified 或
孤儿文件会让 `pnpm check:docs` 失败。

## 提交流程

1. 创建/更新 domain README 与 catalog 条目。
2. 运行 `node scripts/docs/generate-testing-index.mjs`，生成四维索引。
3. 运行 `pnpm check:testing-docs` 和 `pnpm check:docs`。
4. 报告、证据、工具、任务卡互相链接；只提交持久证据，临时截图/trace 放 `artifacts/` 不入 Git。
5. 旧文档迁移使用 `scripts/docs/relocate.mjs`，必须提交带源 SHA 的迁移计划；删除前先确认没有 catalog、任务卡、
   脚本或 README 引用。过期 legacy 条目只能迁移、归档或明确续期，不能无限新增平面文件。
