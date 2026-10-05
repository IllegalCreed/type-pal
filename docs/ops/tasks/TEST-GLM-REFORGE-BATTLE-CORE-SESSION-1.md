# TEST-GLM-REFORGE-BATTLE-CORE-SESSION-1 — battle core and session business contracts

Status: build
Phase: phase2
Capability: reforge / battle core and session
Coding Owner: GLM
Reviewer: Codex（独立验收）
Contributor: GLM
Branch: `codex/glm-reforge-battle-core-session-r1`
Visual Verification Timing: mixed

## 目标

审计 Reforge 当前 Branch 瓶颈中的 battle core/session 公开业务合同：行动执行、目标选择、状态效果、物品/魔法/逃跑、异步交接、取消与 done 回执。终局奖励/音乐/结算已由 battle-flow 卡收口，本卡不得重复终局合同或只测私有 visual state。

## 范围

- `packages/reforge/src/battle/battle-core.ts`、`battle-session.ts`、`battle-command-selection.ts`、`battle-turn-readiness.ts`、`battle-action-presentation-scheduler.ts` 与真实 `main.battle-host-flows.test.ts` public caller。
- 重点审计 action input/target legality、damage/status/poison/steal/item/magic、player/enemy action handoff、cancel/abort/latest session、done/error cleanup 与公开 settlement input。
- 先读并排除 `TEST-GLM-REFORGE-BATTLE-FLOW-1`、HOST-LIFECYCLE、RUNTIME-SESSION、WORLD-LIFECYCLE 的 existing-proof；不碰 asset/audio/UI/剧情 E2E。
- 不改产品/schema/API/旧测/config/baseline/真实内容，禁止私有 `state/visual/__rf*`、核心 mock、强转、skip、ignore、扩 timeout。

## 验收条件

- 建立 battle-core/session family ledger，逐合同写 source/caller/legal input/oracle/fullName；不能合法构造的轴必须登记 blocked/unreachable。
- 新合同必须观察公开结果、事件、资源/状态、目标拒绝、session done/error/cancel 或可继续运行；调用次数仅作辅助。
- 反控必须全量或完整定向执行集，红相位恰一业务 AssertionError，严格核 exit/signal/spawn、pending/todo/runtime/collection、完整 identity、hash 与清理。
- 定向/相邻/Reforge 全包、typecheck、lint 0/0/0、docs、diff 通过；不以覆盖率或用例数量 accept。

## GLM 交付回执（r1，2026-10-06，待 Codex 独立验收）

- 分支/基线：`codex/glm-reforge-battle-core-session-r1`，基 `origin/main` `f4dbd0e3d`；
  产品/schema/API/旧测/config/baseline/真实数据零改动（diff 仅本卡测试/脚本/证据/卡面/导航行）。
- **排重结论**（[dedup-ledger.md](../evidence/TEST-GLM-REFORGE-BATTLE-CORE-SESSION-1/dedup-ledger.md)）：
  卡面六文件逐轴对账——battle-command-selection 三族 20 例、battle-turn-readiness 8 例、
  battle-action-presentation-scheduler 5 例判**饱和不新增**；终局 BF-01..12、异步 handoff
  （readiness 屏障族 + H9-6 延迟精灵 abort）、cancel/abort/latest（session cancel 四态族）、
  done/error 清理均 existing-proof；私有 `state/visual/__rf*` 不作 oracle（旧 session 测试的
  `as unknown as { state }` 反射形态未沿用）。逐轴 grep 后仅补 6 条真实未证合同：
  - `battle-core.enemy-cast-residual.test.ts`(5)：**BCS-1** 敌方回复术（applyEnemySkill
    healHp 分支全仓零敌侧覆盖：按量回复+钳满血上限+log 留痕）、**BCS-2** 敌方 HP 阈值门
    （敌侧 hpAtMostPercent 零覆盖：超线「无任何效果」/过线即死）、**BCS-3** 敌方状态术
    （applyEnemySkill applyStatus→applyPlayerStatus caller 接线零覆盖：sleep 回合写入）、
    **BCS-4** 复活无保底（trunc(9×5/100)=0 复活后仍倒地的忠实边界，旧例均 ≥1 档）、
    **BCS-5** 先杀后逃战果会计（reward sweep `if (!s.enemyFled)` 门：先死之敌照计
    exp7/cash4、逃跑之敌不计）。
  - `battle-session.enemy-flee-residual.test.ts`(1)：**BCS-6** AI 规则敌逃终局（敌侧
    fleeAll → observeCorePhase 映射 → 会话 done 精确兑现 `enemyFled`、buildSettlement
    零触发（辅助）、零战果；terminal-flows 既有 enemyFled 走 choreography
    requestTerminal caller，非重复）。
- **反控 6/6 PASS**（mt1 r2 口径，[counterproof.json](../evidence/TEST-GLM-REFORGE-BATTLE-CORE-SESSION-1/counterproof.json)）：
  全量执行集（8773 测试/777 文件）identity TSV 落盘；每针红相位 exit 1、恰 1 指定业务
  AssertionError、fullName 精确相等、零 pending/todo/collection-error、signal/spawnError
  null；还原绿与 baseline 集合级 sha256 一致（`3f63521b…f1f4e`）；末次全套重放同 sha；
  四态源 hash/argv/env/mkdtemp finally 全记；runner 自测 11 例全过。再生：
  `node packages/reforge/scripts/bcs1-mutation-counterproof.mjs`（尾步自动 biome 格式化回执）。
- **门**：定向 6/6、相邻 24 文件 327/327（[identity.json](../evidence/TEST-GLM-REFORGE-BATTLE-CORE-SESSION-1/identity.json)，
  `bcs1-identity-status.mjs` 零 diff 再生）；Reforge 全量 349 文件 8773/8773（反控
  baseline/final-replay + gates/reforge-full.raw）；typecheck exit 0；全仓 lint 3450 文件
  0/0/0；`git diff --check` 干净；check:docs 的链接/任务/testing/phase-lore 全 PASS——
  **唯一红 = content-review 3 处 ops 文档 SHA drift（board/evidence-README/tasks-index），
  纯 `origin/main` `f4dbd0e3d` 检出复跑同败 = main 既有**，本卡未触碰 pin 区，留 Codex。
- **并行披露**：反控期间同树出现并行卡（migrate-asset-supply）未跟踪交付文件，与本卡
  执行域（packages/reforge）零交集；反控清洁断言按本卡作用域判定，变异源零残留另由
  四态字节 hash 逐针断言。
- 覆盖率/例数未作完成条件；不标 done，等待 Codex 独立验收。

## 下一位 Agent 提示词

```text
你是 TEST-GLM-REFORGE-BATTLE-CORE-SESSION-1 的独立验收方（Codex）。先读
docs/ops/tasks/TEST-GLM-REFORGE-BATTLE-CORE-SESSION-1.md 的「GLM 交付回执」节与
docs/ops/evidence/TEST-GLM-REFORGE-BATTLE-CORE-SESSION-1/README.md、dedup-ledger.md。
候选分支 codex/glm-reforge-battle-core-session-r1（基 origin/main f4dbd0e3d，产品零 diff）。
重点复核：
1) 排重裁决抽查：BCS-1..3 是否与 battle-core.test 既有敌施法族（夺魂概率门/下毒/格挡
   除因子）真的不同轴；BCS-6 与 terminal-flows enemyFled（choreo requestTerminal caller）
   的 caller/oracle 区分是否成立；command-selection/turn-readiness/presentation-scheduler
   三文件饱和判定是否与现行 fullName 一致。
2) 反控复跑：node packages/reforge/scripts/bcs1-mutation-counterproof.mjs（应 6/6 PASS、
   回执再生后与落盘 counterproof.json 逐字节一致，含 biome 尾步）；核对 identity TSV
   的 file×fullName 执行集、四态 hash、自测 11 例与 mkdtemp 清理。
3) 门禁复跑：定向 2 文件 6/6、相邻（identity.json 所列 24 文件）327/327、全量 reforge
   8773/8773、typecheck、pnpm lint、check:docs（content-review 3 处 drift 为 main 既有，
   纯 origin/main 复跑可复现，勿计本卡）。
4) 裁决 accept/counter/rework；未验收前不合 main、不标 done。
```
