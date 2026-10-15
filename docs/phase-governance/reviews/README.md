# 内容深审记录

这里保存逐篇实际阅读后的内容 review records。`docs/phase-governance/catalog.json` 是机器 inventory；只有这里明确标记
`content-reviewed` 的条目才表示 Codex 已读正文并形成内容结论。`partial-review-unknown`、`unread` 和 `blocked` 不得当作当前真值。

审查深度分两层：`deep-semantic` 用于当前入口、治理规则和作者-facing 文档，记录 Codex 对目的、边界、依赖和未决项的语义核对；`structured-content` 用于历史计划、归档任务和机器证据，读取全文并记录所有标题、状态信号、链接、未决标记与 SHA，但不把历史回执升级为当前事实。两者都不等于 runtime/E2E/视觉/coverage 通过。

- [Lore + Phase3 第一批内容深审](20261004-lore-phase3-batch1.json)
- [Lore Guijie 创作材料深审](20261004-lore-guijie-batch2.json)
- [Phase1 根文档内容深审](20261004-phase1-root-batch2.json)
- [当前入口/作者文档语义深审](20261004-semantic-current-batch.json)
- [其余历史/证据全文结构深审（ops 批次 01–05）](20261004-structured-content-ops-01.json)
- [其余历史/证据全文结构深审（phase1 批次 01）](20261004-structured-content-phase1-01.json)
- [其余历史/证据全文结构深审（phase2 批次 01–02）](20261004-structured-content-phase2-01.json)
- [合并最新 main 后新增材料全文结构深审](20261004-structured-content-new-01.json)
- [Agent-first 操作路由与权威入口实际改写](20261015-agent-first-routing-batch.json)：仅四份全文核读与改写；全量任务仍在 build。
- [协作历史分层与 E2E-001 真实 pilot](20261015-protocol-and-e2e-pilot-batch.json)：保留原协议全文、报告段落和 JSON 顶层字段，不新增实跑信用。
- [历史/参考/创意/设计与域报告真实 pilot](20261015-historical-and-domain-pilot-batch.json)：旧作者与数字按时点保留，具体未知与矩阵停止线显式，不发新运行时信用。

- [E2E 合同与历史质量门 pilot](20261015-contract-and-gate-pilot-batch.json)：完整元数据/用户裁决不变，旧版本和 0/50/11 诊断范围不升级。

- [JSON catalog 真正 pilot](20261015-catalog-pilot-batch.json)：18条逐字段阅读，3条分类/4字段勘误有源留痕、逆向相等与真实消费者检查，不变旧状态和版本。

- [域报告/机器证据与历史卡接收记录](20261015-domain-pairs-and-archive-cards.json)：逐篇真实阅读、实际字段/历史/锚点边界；贡献者候选只有独立接收后才写入。

- [Testing 十份索引与公开 producer 冻结设计](20261016-testing-index-design.md)：保留设计冻结时准入与0/10基点；后续逐篇内容/producer验收及中央状态见专属记录，不从设计外推。

- [Testing 十索引逐篇与生成链接入记录](20261016-testing-index-navigation.json)：保留固定738d作者候选和独立读域，当前中央/路由/矩阵按实际受审快照与记录核验；不授359来源或runtime信用。

- [E2E 002–005 八篇治理冻结设计](20261016-e2e-stage-m-design.md)：A仅八MD，先002入口/报告两canonical pilot再另准余六；四配对JSON未纳入，006不改不重计。设计自身pending，不从设计/静态门授执行信用。

- [固定 binding baseline JSON 合同冻结设计](20261016-binding-baseline-design.md)：test-catalog父1.2.0专用frozen-capture变体，固定33cc原生八字段保全、旧default行为不变；现2.0.1含22项必要写域，实施/canonical接收另验，设计自身pending。

- [Lore 九篇导航与参考治理冻结设计](20261016-lore-reference-n-design.md)：既有三类1.0，先三类型各一pilot再另准余六；已定作者约束、待核官设与创作建议分轴，设计不裁canon、不授产品实施。

- [F1固定binding baseline实现与canonical候选](20261016-binding-baseline-contract.json)：entries为空，完整pilotCandidate待独立代码/正文接收；typed route只做结构验证，未给baseline增迁移信用。
