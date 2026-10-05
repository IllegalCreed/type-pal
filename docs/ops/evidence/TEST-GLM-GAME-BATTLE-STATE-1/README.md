# TEST-GLM-GAME-BATTLE-STATE-1 交付证据(r1)

GLM r1 候选(分支 `codex/glm-game-battle-state-r1`,base `5dcb4569b`):battle 状态机残余
10 合同 + 10/10 三态反控,待 Codex 独立验收。

## 交付物

- 合同文件:`packages/game/src/core/battle/battle-state-machine.glm-battle.test.ts`(10 it)。
  覆盖 haste 队列接线、DH3 未学降级、DL7 沉默掷骰、scriptOnReady 回写、E04 防御/施法经验、
  0 经验结算屏、Phase E 死敌槽脚本、法术槽满、升级快照装备有效值。
- [dedup-ledger.md](dedup-ledger.md):逐合同排重账(10 新增 + 登记未证项)。
- [identity.json](identity.json):定向全量执行身份(file×fullName×status,10/10 passed)。
- [mutation-points.json](mutation-points.json) / [mutation-runner.mjs](mutation-runner.mjs):
  10 针单点变异定义与三态 runner(spawnSync、完整 argv/cwd/env、trimEof 落盘纪律)。
- [mutation-results.json](mutation-results.json):10/10 VALID;每针 failed-total 恰 1
  且命中目标合同、唯一业务 AssertionError、恢复绿 10/10、identitySha 三态一致、
  4 个目标文件字节级恢复。
- [mutation-logs/](mutation-logs):每针 3 相位 × stdout/stderr 规整全文(sha256 按落盘字节)。

## 质量门

定向 10/10;相邻 battle 全目录 36 文件 916/916;typecheck 0 error;`pnpm lint` 全仓
0/0/0;`pnpm check:docs` PASS(三 pin 外科刷新后);`git diff --check` 0。
反控批与全量测试串行执行(判例)。

## 环境备注

反控直接在分支工作树执行(player-opcode-residual 卡先例),每针红相位后立即按保存的原始
字节恢复目标文件,再跑恢复绿相位;runner 末尾对全部 4 个被触文件做 sha 比对。
