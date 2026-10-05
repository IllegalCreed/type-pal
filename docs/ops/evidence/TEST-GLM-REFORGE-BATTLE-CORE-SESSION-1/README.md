# TEST-GLM-REFORGE-BATTLE-CORE-SESSION-1 交付证据（GLM r1，待 Codex 独立验收）

分支 `codex/glm-reforge-battle-core-session-r1`，基 `origin/main` `f4dbd0e3d`。
产品/schema/API/旧测/config/baseline/真实数据零改动（diff 仅本卡测试/脚本/证据/卡面/导航）。

## 交付概览

- **6 条新合同 / 2 个测试文件**（产品零 diff）：
  - `battle-core.enemy-cast-residual.test.ts`（5）：BCS-1 敌方回复术（healHp 按量回复+钳
    满血上限）、BCS-2 敌方 HP 阈值门（过门即死/超线「无任何效果」）、BCS-3 敌方状态术
    （applyStatus 写入玩家 sleep 回合）、BCS-4 复活无保底（trunc 0 极端档复活后仍倒地）、
    BCS-5 先杀后逃战果会计（先死照计 exp/cash、逃跑之敌不计）。
  - `battle-session.enemy-flee-residual.test.ts`（1）：BCS-6 AI 规则敌逃终局（会话 done
    精确兑现 `enemyFled`、零结算回调、零战果、逃跑 log 留痕）。
- **排重账**：[dedup-ledger.md](dedup-ledger.md)——卡面六文件逐轴对账（command-selection
  三族 20 例、turn-readiness 8 例、presentation-scheduler 5 例判饱和不新增；终局
  BF-01..12、异步 handoff、cancel/abort/latest、done/error 清理 existing-proof；六条
  未证轴附排除性 grep 证据）。
- **反控**：[counterproof.json](counterproof.json) + [counterproof-raw/](counterproof-raw/) —
  **6/6 针 PASS**（mt1 r2 口径）。全量执行集（8773 测试 / 777 文件）identity TSV 落盘，
  每针红相位 exit 1 / 恰 1 指定业务 AssertionError / fullName 精确相等 / 零 pending·todo·
  collection error / signal·spawnError null；还原绿与 baseline **集合级 sha256 一致**
  （`3f63521bac97…d2f1f4e`）；末次全套重放同 sha；四态源 hash、argv/env、mkdtemp finally
  清理全记；runner 自测 11 例（含 wrong-fullName/exit0/pending/collection-error/signal/
  spawn/非断言错误拒收）全过。重建：
  `node packages/reforge/scripts/bcs1-mutation-counterproof.mjs`（尾步自动 biome 格式化
  回执，单命令再生即过 lint）。
- **identity**：[identity.json](identity.json)——定向 2 文件 6/6 + 相邻 24 文件 327/327
  全绿；再生 `node packages/reforge/scripts/bcs1-identity-status.mjs`（零 diff）。

## 门禁

- 定向 6/6、相邻 24 文件 327/327（identity.json）；
- Reforge 全量：反控 baseline与 final-replay 8773/8773 + 终态复跑
  [gates/reforge-full.raw](gates/reforge-full.raw)（349 文件 8773/8773）；
- typecheck exit 0（[gates/typecheck.raw](gates/typecheck.raw)）；
- 全仓 lint **3450 文件 0/0/0**（[gates/lint.raw](gates/lint.raw)）；
- `pnpm check:docs`：docs 链接/任务/testing-docs/phase-lore 全 PASS；唯一红 =
  `check-content-review --strict` 的 3 处 ops 文档 SHA drift（board.md / evidence
  README / tasks index），**main 既有**（纯 `origin/main` `f4dbd0e3d` 检出复跑同败，
  本卡未触碰该三文件的 pin 区；留 Codex 集中处理，见 [gates/docs-gate.raw](gates/docs-gate.raw)）；
- `git diff --check` 干净。

## 范围与安全披露

- 不变量遵守：无产品/旧测/配置/baseline/真实数据改动；无私有 `state/visual/__rf*`
  反射（旧 session 测试的 `as unknown as { state }` 形态未沿用）；无核心 mock、强转、
  skip/ignore、timeout 扩大；fixture 复用共享 `battle-workflows` catalog 与生产 guard
  （validateEnemies/validateBattleSprites）。
- 并行工作树披露：反控期间同树出现并行卡（migrate-asset-supply）未跟踪交付文件
  `packages/migrate/src/pal-migrate-asset-supply.glm-r1.test.ts`，与本卡执行域
  （packages/reforge）零交集；反控清洁断言按本卡作用域（packages/reforge + 本证据目录）
  判定，变异源零残留另由四态字节 hash 逐针断言。
- 覆盖率/例数不作完成条件；未标 done，等待 Codex 独立验收。
