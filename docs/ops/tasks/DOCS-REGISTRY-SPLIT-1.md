# DOCS-REGISTRY-SPLIT-1 — 文档 registry 存储拆分

Status: draft
Phase: ops
Capability: documentation registry storage
Coding Owner: 待设计复核后指派隔离贡献者
Reviewer: Codex（不得验收自己编写的实现）
Branch: codex/docs-audit-rework
Last reviewed: 2026-10-18
Template: task-card-v1 / 1.0.0

## 目标

将逼近 Biome 1 MiB 上限的文档 registry 改为薄 manifest 加分片，保持所有原生条目、顺序、审查状态、模板版本和引用。为继续逐篇语义重审恢复登记空间，不以拆分授予正文或执行信用。

## 范围

唯一设计见[storage v2 设计](../../phase-governance/reviews/20261018-document-registry-storage-v2-design.md)。允许修改 registry 存储、公开 loader/writer、三个在用 consumer、三项危险旧生成入口及文档工具的 schema fixture/专项反例；根 Owner 维护本卡、看板、索引、显式迁移映射及 review pin。禁止改产品、旧产品测试、coverage、Biome 上限或 ignore。

## 前提真值门

冻结源为 `3fae68aec8f448bf83d1d85e61da35c94d5200ae` 的 `document-registry.json`：1,047,444 字节，SHA256 `921eaef61673fdf83c69763e1f2e9a72e55b08afaf67bc8b5930dbd08331ae33`，2374 条，剩余 1132 字节。main 仍为 `28fd9013e09e8792decbff2fa117aae14c36b196`，本任务只在候选 worktree 推进。

当前 449 条 content-reviewed / 443 条 template-compliant 是账本继承投影，不是本卡新认证。1896 条历史撤回中仅 S02 已重授一篇；S01 在撤回集合之外。固定 1838 cohort 不因拆分或新增文件变化。

## 上下文锚点

- [文档模型](../guides/documentation-model.md)：显式源 SHA、目标、链接重算、真实 consumer；JSON 原生字段与事实权保持。
- [纠错卡](DOCS-RECORD-INTEGRITY-1.md)：五项历史回执隔离、原失败保留；不得恢复 artifactOnly 完成捷径。
- [全量卡](DOCS-FULL-TEMPLATE-1.md)：真实逐篇重审、非作者验收与全量硬门仍未满足。

## 验收条件

- 2374 个源 entry 对象和值逐一相等、原顺序可重建，迁移映射逐条记原索引与目标索引；新增项另列，状态不升档。
- loader 拒绝缺片、hash/count/summary/phase 漂移、重复或越界位置、丢失条目及越界/符号链接路径；writer 先格式化后 hash，manifest 最后发布，并检测输入变化。
- 三个在用 consumer 走同一 loader；危险旧生成器在任何写入前明确失败；专项测试保留并验证既有质量断言。
- 真实 consumer、文档工具测试、check:docs、lint、staged 与完整基点 diff 均保留命令/输入/原始输出；全量语义门的真实失败不改成通过。
- 非作者复核固定代码及迁移产物；未满足全量硬验收前不得合 main、标 done 或宣布统一门通过。

## 当前模式推进记录

设计已提出，待非作者复核后冻结并记 build allowed。暂未实施，也未改动旧 registry。09ec 草案收到 REGISTRY-WRITER-RACE，2.0.1 又收到 REGISTRY-NATIVE-METADATA counter；storage 设计 2.0.2 补排他锁、持锁重验、失败恢复与完整顶层来源保全，尚待复核，不能先实施。

## Draft: 设计与风险

本卡与设计为已明确列出的新增候选，因旧 registry 无安全扩展空间暂未接入其 entries；这是待拆分迁移的显式登记缺口，不能宣布零孤儿。旧 registry 保持冻结，新增文件在 v2 接入时连同 review 记录登记为 partial-review-unknown / needs-migration，未接入前不授信用。

## Build: 实现与自测

未开始。实现 Owner 仅写专属隔离 worktree；根 Owner 不同时改其白名单。迁移后才接收 S03 中央登记。

## Review: 审查与返工

待设计与实现分别核验；不将设计复核误称实现验收。全量 strict / require-complete 仍应真实失败。

## 用户验收

用户已授权持续完成全量治理、纠错和结构方案，不逐批申请。新的产品取舍、不可逆清理仍超出本卡。
