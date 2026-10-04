# TEST-GLM-REFORGE-ASSET-RESOLVER-1 — asset resolver and cache lifecycle contracts

Status: build
Owner: GLM
Reviewer: Codex（独立验收）
Phase: phase2
Capability: reforge / asset resolver lifecycle
Branch: `codex/glm-reforge-asset-resolver-r1`
Visual Verification Timing: dev-functional

## 目标与范围

核验 Reforge 资源解析、缓存和失败恢复的公开生命周期合同；不以覆盖率或例数作为本卡指标。只允许新增 `packages/reforge` 测试、合法 fixture 和证据，重点范围为 `asset-resolver.ts`、`project-image-cache.ts`、`asset-resolver.io-boundaries.test.ts` 相邻公开 caller，以及缺失/失败/重试/取消/缓存失效。先对照旧测试、GLM/Kimi 已有 asset 证据和 fullName 排重。

## 硬约束与交付

只走公开 loader/cache API，禁止真实 PAL 数据、私有反射、业务核心 mock、强转、skip、ignore、扩大 timeout。每条合同写 source/caller/typed input/oracle/fullName；反控必须原始绿→指定业务红→恢复绿，保存 raw/JSON/exit/执行集/四态 hash、clean-tree 和 mkdtemp 清理证明。交付 identity/family ledger、existing-proof、定向/相邻/typecheck/lint/docs/diff；覆盖率只记录到整体 main。

## 下一位 Agent 提示词

```text
你是 TEST-GLM-REFORGE-ASSET-RESOLVER-1 的 Coding Owner（GLM）。先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡和已归档 Reforge 卡；只在 codex/glm-reforge-asset-resolver-r1 工作。对 asset-resolver.ts、project-image-cache.ts 及公开 loader/cache caller 先做旧 fullName/caller/input/oracle 排重，再补缺失、失败、重试、取消、缓存失效合同。不得改产品、旧测、配置、baseline、真实 PAL 数据、私有 state 或 __rf*；禁止强转、skip、ignore、扩大 timeout、业务核心 mock。反控须三态绿红绿、四态 hash、执行集和清理证明。交付定向/相邻测试、typecheck、lint 0/0/0、docs、diff 和完整 SHA；不得把覆盖率或例数当完成条件，不得标 done。
```
