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

## 下一位 Agent 提示词

```text
你是 TEST-GLM-MIGRATE-PLAN-TRANSACTION-1 的 Coding Owner（GLM）。先读 AGENTS.md、docs/phase2/READ-FIRST.md、docs/phase2/archive/audits/、coverage85-kimi-extract-migrate-r1、GLM-O migration 证据、资产 supply 归档卡及本卡。
只在 codex/glm-migrate-plan-transaction-r1 工作；先对 migration-plan.ts、migration-transaction.ts、migration-write-plan.ts、migration-project-io.ts、migration-files.ts、pal-current-publication.ts、pal-store-boundary.ts 做 caller/input/oracle/fullName 排重。
重点审计 path/identity/journal/cursor/prefix、partial write/recovery、foreign conflict/retry、publication atomicity、second-run zero diff 与 cleanup；不要重复资产 supply 或已闭合 transaction 合同。
只写本卡测试、合法 mkdtemp fixture、证据和回执；禁止产品/schema/旧测/config/baseline/真实数据、真实工程写盘、强转、skip、ignore、扩 timeout、弱错误文本断言。新增反控必须严格三态、完整 identity/hash/清理证明；无新合同就交饱和档案。
交付定向/相邻 test、typecheck、lint 0/0/0、docs、diff 和完整 SHA。覆盖率/例数不是完成条件，不得标 done。
```
