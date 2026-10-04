# TEST-GLM-GAME-PLAYER-OPCODE-RESIDUAL-1 交付证据

分支 `codex/glm-game-player-opcode-residual-r1`，base `053ae5bb4`（origin/main）。
范围：`packages/game/src/core/event-opcode-player.ts` 玩家 opcode 残余合同。

## 交付物

- `packages/game/src/core/event-opcode-player.glm-opcode-residual.test.ts` — 6 条新合同
  （C1-C6，见 [dedup-ledger.md](dedup-ledger.md)）：0x18 换装撤效果层、0x23 单槽/全卸效果层
  两臂、0x1c/0x1d applyAll 全队臂、0x29 抗性等值边界。
- `dedup-ledger.md` — 逐 opcode 排重账（REG/NEW/防御守卫）。
- `mutation-points.json` / `mutation-runner.mjs` / `mutation-results.json` / `mutation-logs/`
  （42 份）— 7 针三态反控，7/7 VALID。
- `directed-vitest.json` — 定向 file×fullName×status 身份集。

## 质量门（最终树实测）

- 定向：1 文件 6/6；相邻：12 文件 469/469（player 族 4 + equip-effect + equipment-state +
  magic-script + stats e2~e5 + event-system）；game 全量 3466/3466。
- typecheck 0 error；`pnpm lint` 全仓 0/0/0（3354 files）；`pnpm check:docs` PASS（含三处
  after-SHA 外科刷新，见任务卡回执）；`git diff --check` 0。
- 反控判据：零执行/red-json-unparsable/red-pending>0/red-runtime-error/red-no-business-assertion/
  restored-not-green/restore-sha-mismatch/green-identity-drift 全部未命中；恢复后源 sha 与原始
  byte-identical（cleanupRestored=true）。

## 环境备注

隔离 worktree 缺 gitignored `data/extracted`（软链主仓）与 `data/raw` MKF（逐文件软链），
不改 tracked 文件；此为 worktree 环境处置，非仓库改动。
