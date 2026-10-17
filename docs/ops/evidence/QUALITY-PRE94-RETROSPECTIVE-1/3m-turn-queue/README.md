# CODE3m turn-queue 只读复审切片

基点：`1ffef6802`；分支：`codex/code-quality-3y`，相对 `origin/main` 为 `0 behind / 198 ahead`。本片只读 `turn-queue.ts`、直接测试和 battle-system caller；不改行动顺序、RNG、战斗玩法或公共接口。3m 整卡保持 `partial`。

完整读取 98 行队列实现和 117 行直接测试；读取 `battle-system.ts` 建队列区间，核对 `fight.c:1451-1584` CLASSIC 填充/dualMove 二抽/玩家倍率/严格比较排序和 `battle.h:158-167,216` ACTIONQUEUE 结构。caller 先填敌人、再填玩家；失能玩家在 caller 中 dex=0 且不消耗 RNG；dualMove 的 dex2 由 caller 独立抖动，helper 只负责 fIsSecond 归属和稳定降序排序。

测试覆盖降序、同 dex 敌先、dualMove 二抽两方向、空队伍和综合顺序；`turn-queue.test.ts` 与 `battle-state-machine.glm-battle.test.ts` 关键词定向执行 `5 passed / 14 skipped`，game typecheck 通过，无测试 stderr。未发现可证伪直接缺陷；NaN/越界 dex 不在真实 caller 合法输入域，保持未裁决，不擅自加 guard 或改变排序合同。

coverage、official ratchet、protected fast、全仓 `pnpm check` 按用户成本规则留到完整大模块收口；3m formulas/magic-damage/status/RNG 仍 pending。

