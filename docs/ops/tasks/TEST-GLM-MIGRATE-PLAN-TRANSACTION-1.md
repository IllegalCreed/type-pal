# TEST-GLM-MIGRATE-PLAN-TRANSACTION-1 — migration plan, journal and publication boundary audit

Status: build
Phase: phase2
Capability: migrate / migration plan, transaction and publication
Coding Owner: GLM
Reviewer: Codex（独立验收）
Contributor: GLM
Branch: `codex/glm-migrate-plan-transaction-r1`
Visual Verification Timing: N/A

## 目标

审计 migrate 的 plan/transaction/write/publication 边界，证明路径安全、计划身份、journal 恢复、部分写、冲突、重试、幂等和 zero-write/zero-delete。资产 supply 卡已收口，本卡不重复 asset loader/ownership 合同。

## 范围

- `packages/migrate/src/migration-plan.ts`、`migration-transaction.ts`、`migration-write-plan.ts`、`migration-project-io.ts`、`migration-files.ts`、`pal-current-publication.ts`、`pal-store-boundary.ts` 的公开 API/CLI guard。
- 先排重 Kimi extract/migrate、GLM-O migration、migration-transaction/plan/write-plan 既有测试及本卡不应重复的 asset-supply 合同。
- 重点审计：plan path/traversal/identity、journal version/cursor/prefix、partial write/recovery、foreign change/conflict、publication atomicity、second-run zero diff 与 failure cleanup。
- 不改产品/schema/迁移器语义、旧测/config/baseline/真实 projects/pal/data/raw，不使用真实写盘；CLI 只做安全参数拒绝或 mkdtemp synthetic project。

## 验收条件

- source:line × public caller × mkdtemp legal input × business oracle × fullName ledger，existing-proof/unreachable/blocked/product-counter 分列。
- 合同必须观察路径/身份/bytes/journal/transaction/zero-write/zero-diff 等真实结果，不只断言 throw 文本。
- 反控严格绿→指定业务红→恢复绿，完整 JSON/raw/exit/signal/spawn、file×fullName identity、源/变异/恢复 hash、finally 清理。
- 定向/相邻/migrate 全量、typecheck、lint 0/0/0、docs、diff 通过；覆盖率/例数不作为单卡门槛。

## 交付记录

### r1（2026-10-06，GLM）

- 分支 `codex/glm-migrate-plan-transaction-r1`（基线 `origin/main` `cb12a63e2`），唯一新增测试文件
  `packages/migrate/src/migration-plan-transaction.glm-r1.test.ts`（2 tests）与反控脚本
  `packages/migrate/scripts/mpt1-mutation-counterproof.mjs`；产品/schema/旧测/config/baseline/真实数据零改动。
- 排重账：7 文件逐轴（source:line × caller × input × oracle × fullName）见
  [dedup-ledger.md](../evidence/TEST-GLM-MIGRATE-PLAN-TRANSACTION-1/dedup-ledger.md)。审计结论：
  transaction/plan/write-plan/project-io 四族被既有四套件 + Kimi/Grokmigrate 波次高度覆盖；
  publication/store-boundary 已由 asset-supply 归档卡收口（判定沿用）；残余净新仅 2 合同：
  1. migration-transaction.ts:198 —— 两个 manifest scope 变更（不同目标）在提交排序门被拒绝且零写盘
     （排序预检先于 scope 域校验与 staging/journal 创建）。**账目修正**：migration-transaction.kimi-r1.test.ts
     头注对该臂的 construct-unreachable 判断仅对恢复路径成立（assertScopeTarget 先钉 manifest 固定目标 +
     重复目标拒绝）；提交预检路径一手实证可达。
  2. migration-write-plan.ts:91 false 臂 —— previousBaseline 退役文件不在磁盘时不产生幻影 delete
     （在场→删除臂旧证 boundaries:127-135 作同 fixture 正控）。
- unreachable 账（一手推导，见 ledger）：migration-plan.ts:75（`?? 'missing'` 需强转构造）、:103
  （base 缺席时单侧缺席必与 base 同态自动消解，冲突不可达）；publication :175/:184-186 沿用 asset-supply
  ledger 判定。non-contract：migration-files.ts（纯类型模块，typecheck 承载）、write-plan :62 id tie-break
  （同 path 双退役必被重复目标守卫拒绝，排序差异不可独立观察）。已签排除：project-io :34-43 chunks 域
  （boundaries T01 E05 历史退役域注，本卡不重开）。
- 反控：2 针 × 严格三态（绿→指定业务红→恢复绿 + rebuilt hash）全 PASS；runner 自测 11 例；
  TSV identity artifact 8 相位（baseline/2×mutant/2×restored/final-replay）集合 sha256 级比较；红相位唯一
  失败 fullName 精确相等 + AssertionError 片段 + console 旁证；mkdtemp 残留前后扫描 0。见
  [counterproof.json](../evidence/TEST-GLM-MIGRATE-PLAN-TRANSACTION-1/counterproof.json)。
- 门禁：定向 2/2；相邻 29 文件 294/294；migrate 全量 97 文件 740/740；repo typecheck exit 0；
  lint 0/0/0（3462 文件）；`git diff <base>..HEAD --check` 零输出；docs 门通过（board/index/evidence-README
  三处 content-review pin 按判例外科刷新，同时修复 main 既有 2 处 after-SHA drift）。
- 覆盖率未按单卡统计（卡面口径：不作单卡门槛）。无并行卡同树交付（counterproof gateExclusions 为空）。

## 下一位 Agent 提示词（Codex 独立验收）

```text
你是 TEST-GLM-MIGRATE-PLAN-TRANSACTION-1 的独立验收方（Codex）。先读 AGENTS.md、docs/phase2/READ-FIRST.md、本任务卡交付记录 r1 与 docs/ops/evidence/TEST-GLM-MIGRATE-PLAN-TRANSACTION-1/（README、dedup-ledger.md、counterproof.json、counterproof-raw/、gates/）。
工作分支 codex/glm-migrate-plan-transaction-r1（基 origin/main cb12a63e2）。本卡零产品改动，唯一测试文件 packages/migrate/src/migration-plan-transaction.glm-r1.test.ts（2 合同）与反控脚本 packages/migrate/scripts/mpt1-mutation-counterproof.mjs。
验收要点：
1. 排重账抽查：对 7 文件 ledger 判定抽轴复核（尤其 kimi-r1 ledger :198 unreachable 判断的修正论证——提交预检与恢复路径的 scope 域校验次序；asset-supply 判定沿用的 publication :175/:184-186；E05 chunks 已签排除域）。
2. 反控复跑：node packages/migrate/scripts/mpt1-mutation-counterproof.mjs 须 2/2 PASS 且 allPass=true；核对红相位唯一失败 fullName 与针账一致、TSV identity 集合 sha256 与回执一致。
3. 门禁复核：定向/相邻 294/294/migrate 全量 740/740、repo typecheck、lint 0/0/0、pnpm check:docs（含 content-review --strict）、git diff cb12a63e2..HEAD --check。
4. 结论写回本卡（accept 或 counter 项）；通过后按流程收口，不改产品、不把覆盖率当门槛。
不得开始新的实现工作；无下一位实现 Agent，等待你的验收结论。
```
