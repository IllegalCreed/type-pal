# DOCS-CATALOG-SPLIT-1 — phase/lore catalog 分片与统一 loader 迁移

Status: done
Phase: ops
Capability: documentation governance / generated catalog schema
Coding Owner: Codex
Generation Owner: N/A（机器 catalog 由既有脚本生成）
Reviewer: Codex（独立验收；可另请专项审查）
Visual Verification Owner: N/A（纯文档/机器索引迁移）
Visual Verification Timing: N/A
Contributor: Codex
Branch: codex/docs-catalog-split
Last reviewed: 2026-10-17
Template: task-card-v1 / 1.0.0

> 当前采用 AGENTS.md 的“Codex 分派—贡献者执行—Codex 独立验收”临时模式。本卡只授权设计、pilot 和迁移验证；不改变产品源码、旧测试或 coverage。

## 目标

把接近 Biome 1 MiB files.maxSize 上限的 phase/lore machine catalog 改成可长期维护的“薄 manifest + 按 phase 分片 + 统一 loader”结构，同时保持现有 catalog 条目语义、生成索引、目录期望集合、review SHA pin 链和机器消费者兼容。

## 范围

- 范围内：
  - 设计并冻结 manifest、catalog.lore.json、catalog.phase1.json、catalog.phase2.json、catalog.phase3.json 的 schema 与版本；
  - 新增只读 loader/validator，统一服务 check-phase-lore-governance.mjs 和 build-phase-lore-governance.mjs；
  - 将当前 docs/phase-governance/catalog.json 的 184 条 phase/lore entry 逐条映射到目标 shard，并更新 registry、review records、索引与 pin 级联；
  - 为 loader、分片边界、重复路径、SHA 漂移、缺 shard 和生成索引稳定性补 docs tooling 回归；
  - 建立 source SHA、target SHA、链接/索引重算、consumer 验证和回滚记录。
- 范围外：
  - 产品源码、运行时、E2E、视觉、coverage、旧测试和 Biome 规则本身；
  - 改变 184 份 phase/lore 文档的正文结论、状态、历史日期或 evidence 字段；
  - 删除历史 catalog、review record 或生成的 by-phase.md/by-status.md。
- 明确不做：
  - 不把全局 files.maxSize 提高为长期逃生门；
  - 不新增 ignore/exclude 绕开 lint；
  - 不在未通过 pilot 和 consumer 验证前批量改写正文；
  - 不把当前字节压缩救急当作完成方案。

## 前提真值门

### 一句话行为 / 工程前提

catalog.json 是 phase/lore 目录的机器事实源，当前 1,048,568 字节仅比 Biome 默认 1 MiB 上限低 8 字节；分片必须保留同一条目 schema 和合并后的集合，使校验器与索引构建器观察到的逻辑 catalog 不变。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| primary source | 184 条 phase/lore .md 的 afterSha256、状态、阶段和 review 指针由 docs/phase-governance/catalog.json 提供；目录实体由 phase/lore 文件树提供 | docs/phase-governance/catalog.json:1; scripts/docs/check-phase-lore-governance.mjs:1-180 |
| 第一阶段 | phase1 事实仍受 CLAUDE.md 与 docs/phase1/game-mechanics.md 的来源边界约束；本卡不改正文 | CLAUDE.md:1; docs/phase1/game-mechanics.md:1 |
| 当前二阶段 | Reforge 文档只接受当前 canonical，不把历史 catalog 结论升格为当前实现 | docs/phase2/READ-FIRST.md:1; docs/ops/guides/documentation-model.md:1 |
| 本任务目标 | manifest 只描述 shard 清单/版本/summary，shard 保留原 entry；loader 产出确定性合并视图，两个 consumer 只依赖 loader | scripts/docs/build-phase-lore-governance.mjs:1; scripts/docs/check-phase-lore-governance.mjs:1 |

### 反证与替代解释

- 最强替代解释：若实际 Biome 只需将单个 generated file 设为 per-file maxSize，且该配置能不放宽其他文件、能保留零诊断硬门，则可重新比较；当前 Biome 配置没有单文件覆盖语义，只有全局 files.maxSize，因此此解释尚未成立。
- 什么观察会推翻当前前提：独立 consumer 验证证明分片合并后丢失 entry、改变 JSON native shape、改变目录期望集合、破坏索引、或无法稳定重算 review pin；此时停止迁移并回到 rework。
- 已排查的替代根因：
  - runtime 语义 / 命令分类：N/A（本卡不改 runtime）。
  - 原版 / 一阶段理解：N/A（本卡不改机制正文）。
  - extractor / 地图 / 数据解码：N/A（不触碰产物）。
  - audit / test model：已核 check-phase-lore-governance 与 build-phase-lore-governance 均直接读取单文件 catalog，结构变更必须同步二者。

### 用户可见偏离

- 是否主动偏离已核真值: N/A（机器索引结构迁移，不改变产品行为或正文语义）
- before -> after 一句话: 单一近 1 MiB catalog → 小 manifest + phase shards + 同一逻辑视图的 loader。
- 代表场景: check-phase-lore-governance 仍将 docs/{lore,phase1,phase2,phase3} 的 .md 集合与合并 catalog 做精确比较；build-phase-lore-governance 仍只生成两个 projection，不修改 catalog。
- 用户裁决: 2026-10-17 已授权由 Codex 在本卡中裁定结构方案；批量正文迁移仍受全量治理卡和 pilot 停止线约束。

## 上下文锚点

- 已拍板决策 / 铁律:
  - AGENTS.md：schema/migration/generated rewrite 必须有完整卡；lint 的 error/warning/info 必须清零；不以 ignore 降门。
  - docs/ops/guides/documentation-model.md：唯一事实源、显式迁移映射、source/after SHA、consumer 验证和同提交写回。
  - docs/testing/governance.md：机器 JSON 保持 native 字段与真实 consumer；envelope 不能把原对象藏进 payload。
- 代码锚点(file:line):
  - scripts/docs/check-phase-lore-governance.mjs:1-180
  - scripts/docs/build-phase-lore-governance.mjs:1-140
  - docs/phase-governance/catalog.json:1
  - docs/phase-governance/document-registry.json:1
- 已知坑 / 审计文档:
  - catalog 当前 1,048,568 bytes，仅剩 8 bytes；靠缩短 action 或换行压缩不可持续。
  - catalog 变化会更新 R93 entry，再更新 R94 对 R93 的 pin；registry 中 catalog、review record 和结构根也必须一致。
  - 现有 184 条 phase/lore catalog 不能代替全量 1838 文档候选的模板迁移分母。
- 不得重新引入:
  - 全局 maxSize 放宽、ignore/exclude、散文化机器 evidence、历史升格当前、无差别刷新 hash。
- 相关测试:
  - node scripts/docs/check-phase-lore-governance.mjs
  - node scripts/docs/build-phase-lore-governance.mjs
  - pnpm check:docs
  - pnpm lint
  - git diff --check

## 验收条件

- 功能:
  - manifest 明确 schemaVersion、catalogId、sourceRevision、shards、summary 和 loader contract；
  - 每个 shard 只包含一个 phase，原 184 条 entry 一条不丢、无重复 path/id，合并顺序确定；
  - 单文件 manifest/shard 留有明显 Biome 余量；不提高全局 files.maxSize。
- 测试:
  - loader 单元/回归覆盖缺 shard、shard SHA mismatch、phase mismatch、duplicate id/path、summary mismatch、目录孤儿和确定性排序；
  - 两个真实 consumer 使用 loader 后通过原有 phase/lore 检查，生成索引除预期来源注记外保持逻辑等价；
  - pnpm check:docs、pnpm lint、git diff --check 产生零 error/warning/info。
- 文档:
  - source → target mapping 逐条记录 source SHA、target SHA、链接/索引重算和 consumer 验证；
  - document-registry、R93/R94 及相关 review record 同提交更新；
  - 迁移记录保留 rollback、supersedes、历史日期和“不授 runtime/E2E/视觉/coverage 信用”。
- 视觉 / 手工验证: N/A（静态机器 catalog；不授视觉信用）。
- E2E 用例登记: N/A（不改变产品行为；任何 E2E 结论仍需独立任务）。

## 当前模式推进记录

### 进入 build 前：Codex 核定

- Coding Owner / 隔离工作树 / 修改白名单: Codex；codex/docs-catalog-split worktree；仅允许本卡、loader、两个 docs consumer、对应模板/回归、registry/review/index 和 phase/lore catalog shards；禁止产品源码、旧测试、coverage。
- 前提核验: verified（catalog 字节、consumer 和 pin 链已核读；反证条件见上）。
- 范围、设计和验收条件: agree（本卡先冻结 manifest/shard/loader 设计并做 pilot；正文批量治理仍受 DOCS-FULL-TEMPLATE-1 控制）。
- 高风险用户产品裁决: N/A（无产品行为变化；若 schema 破坏现有 consumer，立即 blocked/rework）。
- build 准入结论: Codex build allowed 已完成；正式迁移通过 pilot、mapping、consumer 和独立复核，后续仅按同一合同维护增量。

### 进入 done 前：独立验收

- 贡献者交付与自验: accept（manifest/shard SHA mapping、loader 回归、两个真实 consumer 和静态门禁均有回执）。
- Codex 独立复核: accept（独立重跑 loader、phase/lore consumer、docs tooling、lint 和 diff check）。
- 用户体验/产品验收: N/A（纯文档机器索引）。
- done 准入结论: Codex done allowed；本卡只覆盖 catalog schema 迁移，不授予全 docs、runtime、E2E、视觉或 coverage 完成。

## Draft: 设计与风险

### 设计结论

采用“manifest + phase shards + loader”作为拆分方案的结构化实现：

1. docs/phase-governance/catalog.json 变成小型 manifest，仅保留 schemaVersion、id、generatedBy、sourceRevision、shards、summary 和 loader contract。它不再复制全部 entry，也不承载第二份状态事实。
2. 新增 catalog.lore.json、catalog.phase1.json、catalog.phase2.json、catalog.phase3.json。每个 shard 保留原 entry 对象及 phase，增加 shard 自身 schemaVersion、id、sourceRevision、summary 和生成顺序；phase2 当前 105 条，其余为 lore 14、phase1 60、phase3 5。
3. 新增 scripts/docs/phase-lore-catalog.mjs。它验证 manifest 列出的 shard 文件、afterSha256、phase、entry id/path 唯一性、summary 和确定性 path 排序，并返回与旧 catalog 等价的 entries 视图。验证失败必须硬失败，不能 fallback 读取旧单文件。
4. check-phase-lore-governance.mjs 与 build-phase-lore-governance.mjs 只调用 loader；不各自实现一套分片合并逻辑。生成的 by-phase.md/by-status.md 继续是 projection，不成为事实源。
5. 迁移顺序固定为：先生成候选 shards → 验证原/目标 entry deep equality → 生成 manifest → format 后取所有目标 SHA → 更新 review/registry pin → 真实 consumer → 独立复核 → 再删除旧 catalog entries。任何一步失败保留 draft/rework，不用字节压缩绕过。

### 迁移映射与链接重算

| 源 | 目标 | 映射规则 | 必须重算 |
|---|---|---|---|
| catalog.json.entries[*] phase=lore | catalog.lore.json.entries[*] | 保留完整 entry；id/path/afterSha 不变；按 path 稳定排序 | manifest shard SHA、R93/R94 pin |
| phase=phase1 | catalog.phase1.json.entries[*] | 同上 | 同上 |
| phase=phase2 | catalog.phase2.json.entries[*] | 同上 | 同上 |
| phase=phase3 | catalog.phase3.json.entries[*] | 同上 | 同上 |
| catalog.json consumers | loader import | 只改变读取入口，不改变逻辑视图 | check-phase-lore-governance、build-phase-lore-governance 实跑 |
| registry/review references | manifest + four shards | 新文件各自注册，旧 catalog 身份保留为 manifest | document-registry、review records、R93/R94 chain |

check-phase-lore-governance 的 expected set 口径不变：枚举 docs/lore、docs/phase1、docs/phase2、docs/phase3 的全部 .md，与 loader 合并后的 entry path 做精确集合比较；summary total 仍为 184，且任何 shard 外路径、重复路径或缺失路径都失败。

### 已知风险

- 风险：分片被直接编辑后 manifest SHA 未同步。
  - 缓解：loader 校验 shard SHA；format 后取 hash；pin 级联作为迁移步骤。
- 风险：两个 consumer 之一仍直接读取旧 catalog。
  - 缓解：代码搜索门 + 两个真实脚本输出 + 回归测试。
- 风险：把 shard 作为四份新状态源。
  - 缓解：manifest 只声明构成；entry 的状态、afterSha 和历史仍以 shard 合并视图为唯一 catalog 事实。
- 风险：phase2 文档增长后再次接近上限。
  - 缓解：每个 shard 单独计数，loader 不拼写回巨型文件；新增 phase 只更新对应 shard 与 manifest。
- 风险：历史 review record 的 SHA 级联漏更新。
  - 缓解：migration mapping 列源/目标 SHA；提交前运行 registry/content-review、phase/lore 和 pin-chain 检查。

### 专项审查安排（按需）

- Reviewer: Codex 独立复核；必要时请 docs tooling 专项审查。
- 结论: accept；结构拆分已实现，GLM 的字节救急仅保留为历史迁移背景。
- 必改项: pilot 必须证明 native entry deep equality、真实 consumer 可读和索引集合不变。
- 是否建议进入 build: no；本卡迁移已完成，后续增量必须新开或更新对应治理任务。

### 证据分歧与用户裁决（按需）

- Codex: 选择结构拆分；拒绝全局 files.maxSize 或 ignore/exclude。
- 贡献者/可选专项审查者: GLM 负责的 phase1 注记与 pin 级联已提交为 69d44805e，其字节救急只作为过渡事实。
- 用户拍板: 2026-10-17；接受当前两条 game-mechanics.md 注记入库，并要求输出结构性方案；本卡记录执行边界。

## 分派与容量记录（如适用）

- 原负责人及改派原因: GLM 已完成 phase1 内容和 pin 级联；catalog 结构迁移由 Codex 单独负责，避免同一生成 artifact 并发写入。
- 新贡献者与独占写入范围: TBD；若委派，仅允许 loader/回归或 mapping 子包，不能同时改 manifest、registry 和 review chain。
- 交接风险与 Codex 验收方式: 所有贡献者输出 source/target SHA mapping、命令原始回执和未运行边界；Codex 重新运行真实 consumers 并独立复核。

## Build: 实现与自测

- Coding Owner: Codex；在 codex/docs-catalog-split-impl 隔离 worktree 实施并由 Codex 独立验收。
- 修改文件: docs/phase-governance/catalog.json；catalog.lore.json、catalog.phase1.json、catalog.phase2.json、catalog.phase3.json；scripts/docs/phase-lore-catalog.mjs；两个 phase/lore consumer；phase-lore-catalog.test.mjs；registry、R93/R94、board/index 与本卡。
- 实现摘要: 旧 184 条 entry 按 phase 原对象迁移到四个 shard；manifest 仅保留 catalog 元数据、summary、loader contract 和 shard SHA。loader 校验 schema、路径边界、SHA、phase、重复 id/path、summary 与确定性排序；两个 consumer 均只读取 loader。逻辑视图仍为 184 条，目录 expected set 未变。
- SHA mapping: lore 14 → fa8e8f6808fae6dd93f9dd0a8be78e9df694a7e9597a07f722a9c6b65c963060；phase1 60 → 2b133490adb9ec60b846402c9f892c0945878bcdeef3340104445f7b189b1579；phase2 105 → d7a70394297627d7b5e1ad8b868082c3f6669fd18a2287f9521fd7c39eafce55；phase3 5 → 87c3af6f71f4d22aaa8b2c76ba0c1aca1b9201aff11b3ac2aa6e747a6522da8f；manifest 52 lines → 77daa5edc7b28ae5a85d96f9a1542aad4bd169a5c101d4f68ef429ba27496dcb；四个 shard SHA 与 manifest descriptors 已按 format 后实际字节固定。
- 运行命令: node --test scripts/docs/phase-lore-catalog.test.mjs（5/5）；node scripts/docs/check-phase-lore-governance.mjs（184/184）；node scripts/docs/build-phase-lore-governance.mjs（catalog unchanged）；node scripts/docs/check.mjs；node scripts/docs/check-document-model.mjs；pnpm check:testing-docs；node scripts/docs/check-content-review.mjs --strict；pnpm lint；git diff --check。
- 浏览器 / 手工检查: N/A（机器 catalog 迁移；不授视觉信用）。
- 跳过的检查及原因: runtime、E2E、视觉、coverage 均不适用本卡，未把静态 consumer 结果升格为产品验收。

## 资源生成记录(如适用)

- Generation Owner: N/A
- 生成目的 / 替换对象: N/A
- 提示词要点 / 风格约束: N/A
- 输出路径: N/A
- 尺寸 / 格式 / 透明背景 / 调色约束: N/A
- 资源登记位置: N/A
- 验证方式: N/A

## 视觉验证记录(如适用)

- Visual Verification Owner: N/A
- Visual Verification Timing: N/A
- 验证方式: N/A
- 集中 E2E 用例 / 批次: N/A
- 截图 / 像素检查路径: N/A
- 结论: N/A
- 未完成项: N/A

## Review: 审查与返工

- Reviewer: Codex
- 审查结论: accept；四个 shard 保留原 entry native 字段，loader 的负向回归和两个真实 phase/lore consumer 均通过，R93/R94 pin 与 registry 同步。
- 必须返工项: 后续新增 phase/lore 文档必须通过同一 loader 更新对应 shard 与 manifest SHA；若 consumer 再次直接读取旧 entries，退回 rework。
- Accept / rework: accept

## 用户验收

- 用户结论: 接受结构拆分执行；本卡完成后继续全量 1838 候选治理，不能把本卡完成当作全 docs 完成。
- 后续任务: 维护四个 shard 与 manifest 的增量 SHA；全 docs 完成仍由 DOCS-FULL-TEMPLATE-1 负责。

## 交接日志

- 2026-10-17 Codex: 核对 catalog 1,048,568 bytes、两个直接 consumer、R93/R94 pin 链；选择 manifest + phase shards + loader，拒绝 maxSize/ignore。Evidence: scripts/docs/check-phase-lore-governance.mjs、pnpm lint。Next: Codex 在隔离 worktree 完成设计 pilot。
- 2026-10-17 Codex: 完成四 shard 迁移和 loader；5 个负向/正向回归、184/184 phase/lore、registry 2345/2345 与零诊断门禁通过。Evidence: scripts/docs/phase-lore-catalog.mjs、scripts/docs/phase-lore-catalog.test.mjs、R93/R94。Next: 维护 shard 增量，不再恢复巨型单文件。
- 2026-10-17 Codex: 接受 game-mechanics.md 两条用户/一手源码核验注记，GLM 提交 69d44805e 已推 main。Evidence: docs/phase1/game-mechanics.md、docs/phase-governance/catalog.json。Next: 结构迁移与当前全量治理继续分开收口。

## 下一位 Agent 提示词

无，等待后续全量文档治理；本卡已完成 catalog schema 迁移，后续变更必须沿用 manifest + shard + loader 合同。
