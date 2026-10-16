# TEST-GLM-MIGRATE-PLAN-TRANSACTION-1 — migration plan, journal and publication boundary audit

Status: done
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: task-card-v1 / 1.0.0

本页把已关闭 ops archive task card 接入 `task-card-v1`，并追加 `archive-record-v1` 历史边界。原始目标、范围、状态、owner、证据、counter、日期、链接和交接在 quote 中保全；历史 done 不自动授权当前 build、runtime、E2E、视觉或 coverage。

## 目标

- 保留原卡目标、用户可见范围、实现/测试边界和关闭时点结论；当前是否需要重新启用由 successor task card 与 fresh evidence 决定。

## 范围

- 当前包含：原卡声明的实现、测试、证据、owner、状态和历史限制。
- 明确不包含：本次迁移不修改产品源码、旧测试、真实数据、机器证据或历史状态。

## 前提与证据

- 行为/工程前提：原卡的 source:line、primary source、合法输入、caller、oracle 与 counter 由 quote 保留。
- 一手证据：固定 source revision `b3c24c04ddb534b9e8195a074590bea8a233fc93`、原卡全文和原卡链接；本次不重跑原执行。
- 最强替代解释与可证伪观察：若需要重新启用，必须用当前代码/数据、合法输入、业务 oracle、反例和独立 review 重新核验；不能以历史 done 或数量补齐。
- 当前状态：done（历史快照）；本页治理检查口径要求 contentVersion=22 / SAVE12，源卡中的较早版本只属于其日期范围。

## 验收

- 功能/文档：原卡的历史验收、失败、blocked、rework、未执行边界和交接保持原样。
- 测试与证据：本次验收只包括 source/after SHA、模板章节、链接、history overlay 和 quote inverse。
- 视觉或 E2E（如适用）：本次未执行 runtime、E2E、视觉或 coverage，信用为 0。

## 状态与交接

- 当前 Owner：原任务 Owner/贡献者与历史 reviewer 保留于 quote；当前文档治理 owner 为 Codex。
- 阻塞/决策：历史卡不可单独授权当前工作；重新启用必须创建/更新当前 task card。
- 下一步：由对应 successor、当前 consumer 和 fresh receipt 重新核验；本次不推进状态。

## 历史范围

- 原始日期、版本、阶段：源文档固定于 `b3c24c04ddb534b9e8195a074590bea8a233fc93`；本轮为 R59。
- 归档原因：已关闭任务只作为时点事实保留，避免历史状态冒充当前事实。

## 原始结论

- TEST-GLM-MIGRATE-PLAN-TRANSACTION-1 — migration plan, journal and publication boundary audit：原始顶部状态为 done；完整原始语义保留于下方 quote。

## 当时证据

- 原始命令、产物、SHA、签字、counter、链接和未决项保留于 quote。

## 当前有效性

historical。do not promote historical task card to current build/runtime/E2E/visual/coverage acceptance
- 历史冲突/未决：当前 task card、代码/consumer 和 fresh receipt 是事实权。

## 继任文档

- 当前 canonical 文档：当前任务卡、当前代码/consumer 和 fresh receipt。
- supersedes / superseded-by：替代 governed-legacy 的未分层呈现；原卡内容不删除。
- 若重新启用的复核条件：合法输入重跑、业务 oracle 可证伪、独立 review 和全量静态门通过。

## 原文保全

固定 source revision `b3c24c04ddb534b9e8195a074590bea8a233fc93`，source SHA `795fccf56a46fc3c51f076ef3f9b79e4d16c85c48b00993a8a39dec0a0f398ac`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # TEST-GLM-MIGRATE-PLAN-TRANSACTION-1 — migration plan, journal and publication boundary audit
>
> Status: done
> Phase: phase2
> Capability: migrate / migration plan, transaction and publication
> Coding Owner: GLM
> Reviewer: Codex（独立验收）
> Contributor: GLM
> Branch: `codex/glm-migrate-plan-transaction-r1`
> Visual Verification Timing: N/A
>
> ## 目标
>
> 审计 migrate 的 plan/transaction/write/publication 边界，证明路径安全、计划身份、journal 恢复、部分写、冲突、重试、幂等和 zero-write/zero-delete。资产 supply 卡已收口，本卡不重复 asset loader/ownership 合同。
>
> ## 范围
>
> - `packages/migrate/src/migration-plan.ts`、`migration-transaction.ts`、`migration-write-plan.ts`、`migration-project-io.ts`、`migration-files.ts`、`pal-current-publication.ts`、`pal-store-boundary.ts` 的公开 API/CLI guard。
> - 先排重 Kimi extract/migrate、GLM-O migration、migration-transaction/plan/write-plan 既有测试及本卡不应重复的 asset-supply 合同。
> - 重点审计：plan path/traversal/identity、journal version/cursor/prefix、partial write/recovery、foreign change/conflict、publication atomicity、second-run zero diff 与 failure cleanup。
> - 不改产品/schema/迁移器语义、旧测/config/baseline/真实 projects/pal/data/raw，不使用真实写盘；CLI 只做安全参数拒绝或 mkdtemp synthetic project。
>
> ## 验收条件
>
> - source:line × public caller × mkdtemp legal input × business oracle × fullName ledger，existing-proof/unreachable/blocked/product-counter 分列。
> - 合同必须观察路径/身份/bytes/journal/transaction/zero-write/zero-diff 等真实结果，不只断言 throw 文本。
> - 反控严格绿→指定业务红→恢复绿，完整 JSON/raw/exit/signal/spawn、file×fullName identity、源/变异/恢复 hash、finally 清理。
> - 定向/相邻/migrate 全量、typecheck、lint 0/0/0、docs、diff 通过；覆盖率/例数不作为单卡门槛。
>
> ## 交付记录
>
> ### r1（2026-10-06，GLM）
>
> - 分支 `codex/glm-migrate-plan-transaction-r1`（基线 `origin/main` `cb12a63e2`），唯一新增测试文件
>   `packages/migrate/src/migration-plan-transaction.glm-r1.test.ts`（2 tests）与反控脚本
>   `packages/migrate/scripts/mpt1-mutation-counterproof.mjs`；产品/schema/旧测/config/baseline/真实数据零改动。
> - 排重账：7 文件逐轴（source:line × caller × input × oracle × fullName）见
>   [dedup-ledger.md](../../../evidence/TEST-GLM-MIGRATE-PLAN-TRANSACTION-1/dedup-ledger.md)。审计结论：
>   transaction/plan/write-plan/project-io 四族被既有四套件 + Kimi/Grokmigrate 波次高度覆盖；
>   publication/store-boundary 已由 asset-supply 归档卡收口（判定沿用）；残余净新仅 2 合同：
>   1. migration-transaction.ts:198 —— 两个 manifest scope 变更（不同目标）在提交排序门被拒绝且零写盘
>      （排序预检先于 scope 域校验与 staging/journal 创建）。**账目修正**：migration-transaction.kimi-r1.test.ts
>      头注对该臂的 construct-unreachable 判断仅对恢复路径成立（assertScopeTarget 先钉 manifest 固定目标 +
>      重复目标拒绝）；提交预检路径一手实证可达。
>   2. migration-write-plan.ts:91 false 臂 —— previousBaseline 退役文件不在磁盘时不产生幻影 delete
>      （在场→删除臂旧证 boundaries:127-135 作同 fixture 正控）。
> - unreachable 账（一手推导，见 ledger）：migration-plan.ts:75（`?? 'missing'` 需强转构造）、:103
>   （base 缺席时单侧缺席必与 base 同态自动消解，冲突不可达）；publication :175/:184-186 沿用 asset-supply
>   ledger 判定。non-contract：migration-files.ts（纯类型模块，typecheck 承载）、write-plan :62 id tie-break
>   （同 path 双退役必被重复目标守卫拒绝，排序差异不可独立观察）。已签排除：project-io :34-43 chunks 域
>   （boundaries T01 E05 历史退役域注，本卡不重开）。
> - 反控：2 针 × 严格三态（绿→指定业务红→恢复绿 + rebuilt hash）全 PASS；runner 自测 11 例；
>   TSV identity artifact 8 相位（baseline/2×mutant/2×restored/final-replay）集合 sha256 级比较；红相位唯一
>   失败 fullName 精确相等 + AssertionError 片段 + console 旁证；mkdtemp 残留前后扫描 0。见
>   [counterproof.json](../../../evidence/TEST-GLM-MIGRATE-PLAN-TRANSACTION-1/counterproof.json)。
> - 门禁：定向 2/2；相邻 29 文件 294/294；migrate 全量 97 文件 740/740；repo typecheck exit 0；
>   lint 0/0/0（3462 文件）；`git diff <base>..HEAD --check` 零输出；docs 门通过（board/index/evidence-README
>   三处 content-review pin 按判例外科刷新，同时修复 main 既有 2 处 after-SHA drift）。
> - 覆盖率未按单卡统计（卡面口径：不作单卡门槛）。无并行卡同树交付（counterproof gateExclusions 为空）。
>
> ## 下一位 Agent 提示词（Codex 独立验收）
>
> ```text
> 你是 TEST-GLM-MIGRATE-PLAN-TRANSACTION-1 的独立验收方（Codex）。先读 AGENTS.md、docs/phase2/READ-FIRST.md、本任务卡交付记录 r1 与 docs/ops/evidence/TEST-GLM-MIGRATE-PLAN-TRANSACTION-1/（README、dedup-ledger.md、counterproof.json、counterproof-raw/、gates/）。
> 工作分支 codex/glm-migrate-plan-transaction-r1（基 origin/main cb12a63e2）。本卡零产品改动，唯一测试文件 packages/migrate/src/migration-plan-transaction.glm-r1.test.ts（2 合同）与反控脚本 packages/migrate/scripts/mpt1-mutation-counterproof.mjs。
> 验收要点：
> 1. 排重账抽查：对 7 文件 ledger 判定抽轴复核（尤其 kimi-r1 ledger :198 unreachable 判断的修正论证——提交预检与恢复路径的 scope 域校验次序；asset-supply 判定沿用的 publication :175/:184-186；E05 chunks 已签排除域）。
> 2. 反控复跑：node packages/migrate/scripts/mpt1-mutation-counterproof.mjs 须 2/2 PASS 且 allPass=true；核对红相位唯一失败 fullName 与针账一致、TSV identity 集合 sha256 与回执一致。
> 3. 门禁复核：定向/相邻 294/294/migrate 全量 740/740、repo typecheck、lint 0/0/0、pnpm check:docs（含 content-review --strict）、git diff cb12a63e2..HEAD --check。
> 4. 结论写回本卡（accept 或 counter 项）；通过后按流程收口，不改产品、不把覆盖率当门槛。
> 不得开始新的实现工作；无下一位实现 Agent，等待你的验收结论。
> ```
>
> ## Codex 独立验收与收口（2026-10-06）
>
> - 独立复跑：定向 2/2；strict transaction counterproof 2/2 PASS，TSV identity 与 hash 一致。
> - 独立质量门：Migrate typecheck、docs、git diff --check 通过；集成全仓 lint 3469 files、0/0/0。
> - 结论：plan/transaction/write-plan 两条净新合同满足门禁，合入 main，任务归档为 done。
>
<!-- original-source-quote:end -->
