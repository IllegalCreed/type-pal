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

## GLM r1 交付回执（2026-10-05，基线 f83ed41e9，工作提交 b8e315497c72ae261dbd3c3aefc00fe69e8128a8）

- 交付（产品/旧测/配置零改动，仅新增）：4 个测试文件 8 合同 ——
  `asset-resolver.failure-causes.test.ts`（C1 非 Error 原因包装+恢复 / C2 无 dispose 源 no-op）、
  `project-image-cache.decode-lifecycle.test.ts`（C3 解码失败消息+不缓存+重试 / C4 Blob
  mediaType+字节保真 / C5 四支持 kind 正面枚举）、`project-image-cache.inflight-dispose.test.ts`
  （C6 在途 dispose 不取消+窗口内真重解码 / C7 回填命中零新 IO+二次 dispose 关闭）、
  `project-loader.image-cache-binding.test.ts`（C8 loader 绑定 cache→同 catalog/source）。
- 排重账/身份集/反控证据：[docs/ops/evidence/TEST-GLM-REFORGE-ASSET-RESOLVER-1/](../evidence/TEST-GLM-REFORGE-ASSET-RESOLVER-1/)
  （dedup-ledger 8 合同+登记未测项+判例；identity.json 执行集 43/43；mutation-results 7/7 VALID）。
- 反控口径：每针 = 产品源码单点变异（find 恰命中 1）→ 执行集（4 新+6 旧模块测，43 测试）全量跑；
  红相位 exit≠0 且 failed-total 恰 1 且首条失败为业务 AssertionError；恢复相位字节恢复
  （sha 逐字节一致）+复跑全绿且身份集 hash 与原始绿一致。变异全程在 mkdtemp 副本
  （/tmp/type-pal-asset-resolver-mut.XrgrBS）内，跑完 rm -rf，`ls -d /tmp/type-pal-asset-resolver-mut.*`
  无匹配；交付树产品文件 `git diff f83ed41e9 --` 为空。
- 质量门实测：定向 8/8（4 文件）；执行集 43/43；相邻 reforge 全包 337 文件 8739/8739；
  reforge typecheck 0 错；全仓 `pnpm lint` 0/0/0（3342 文件）。
- **docs 门（r1 披露 → r2 已闭合）**：r1 时 `pnpm check:docs` 红于三处 after-SHA drift ——
  `docs/ops/board.md`、`docs/ops/tasks/index.md` 为基线 f83ed41e9 自带漂移（开卡提交未刷新
  评审戳）；`docs/ops/evidence/README.md` 为本卡按「子目录未进入导航」要求追加的一行导航。
  r2 按 8494b465c 先例的机械流程刷新（`content-review-sha-refresh`：仅改三条目的
  afterSha256/implementationSha 并 append-only 追加 history，不改任何评审结论；origin/main
  无新提交，基线即 f83ed41e9），`pnpm check:docs` 与
  `node scripts/docs/check-content-review.mjs --strict` 均 PASS。
- **现行政策登记（交 Codex 复核）**：C6 观察到「dispose 早于在途完成且回填前又有新 load」时，
  先完成位图失去 close 通道（等 GC；battle-trial abort 路径到达时泄漏有界）。若判定应改
  「dispose 后完成即 close/不回填」，属产品决策另开卡；本卡按现行行为钉住。
- 覆盖率未单独计量（卡面约定只记录到整体 main）；不标 done，等待 Codex 独立验收。

### 下一位 Agent 提示词（Codex 独立验收）

```text
你是 TEST-GLM-REFORGE-ASSET-RESOLVER-1 的 Reviewer（Codex）。先读本卡与
docs/ops/evidence/TEST-GLM-REFORGE-ASSET-RESOLVER-1/（README/dedup-ledger/identity/
mutation-results + mutation-logs），在 codex/glm-reforge-asset-resolver-r1 上独立复核：
1) 对照 dedup-ledger 的 8 条 source/caller/input/oracle 与排重结论是否属实（重点：在途 dispose
   两合同的时序构造、C8 loader 绑定判别点、登记未证项是否确无单点针）；
2) 复跑定向 4 文件与执行集 10 文件，抽验至少 2 针三态（红相位 failed-total 恰 1、恢复字节一致）；
3) 裁决「现行政策登记」的 in-flight 泄漏形行为（改产品另开卡或按现状接受）；
4) 核对 r2 的 content-review-sha-refresh 仅机械刷新三条目 stamp（diff 应只有
   afterSha256/implementationSha 与追加 history，无评审结论改动）。
验收通过后按现行模式收口并更新看板。
```

## GLM r2 返工记录（2026-10-05）

- 返工指令：docs content-review strict 三处 after-SHA drift 须闭合；基于最新 origin/main
  rebase，保留本卡测试与证据，重生成索引/证据引用，不覆盖其它任务文档，全门复跑。
- 基线核实：`git fetch` 后 origin/main 仍为 f83ed41e9（无新提交），本分支基线即最新，
  无需 rebase；本卡测试、证据与 evidence/README.md 导航行原样保留，tasks/index.md 的
  本卡条目系开卡提交已有，未改动其它任务文档。
- stamp 刷新：按 8494b465c 先例机械刷新
  `docs/phase-governance/reviews/20261004-semantic-current-batch.json` 中
  board.md / evidence/README.md / tasks/index.md 三条目（afterSha256、
  revision.implementationSha 对齐当前字节 + append-only history
  `content-review-sha-refresh`），diff 仅 24+/6-，无评审结论改动。
- 全门复跑实测：定向 4 文件 8/8；reforge typecheck 0 错；全仓 `pnpm lint` 0/0/0（3342 文件）；
  `pnpm check:docs` PASS（testing docs / phase-lore / content review 全绿）；
  `node scripts/docs/check-content-review.mjs --strict` PASS（570 documents）；
  `git diff f83ed41e9..HEAD --check` 干净。产品零 diff 不变。
- 不标 done，等待 Codex 独立验收。
