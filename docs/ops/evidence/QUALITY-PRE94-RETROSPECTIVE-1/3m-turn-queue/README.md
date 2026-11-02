# CODE3m turn-queue 只读复审切片

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 CODE3m 行动队列 helper 的只读复审切片（基点 1ffef6802，分支 codex/code-quality-3y，相对 origin/main 0 behind/198 ahead）：只读队列实现、直接测试与 battle-system caller，不改行动顺序、RNG、战斗玩法或公共接口；3m 整卡保持 partial。重要：原始切片「未发现可证伪直接缺陷」的结论已被 2026-10-18 counter 撤回，当前以 counter 与批准窄修记录为准。证据原件为下方逐字节保全的固定main源；读域明细见同目录 read-boundaries.json。

## 来源与输入

全文读取 98 行 turn-queue.ts（敌/我填充顺序、dualMove dex2、稳定降序排序、队列项所有权）与 117 行 turn-queue.test.ts（降序、同 dex 敌先、dualMove 二抽两方向、空队伍、综合顺序 oracle）。部分区间：battle-system.ts 680-770/1900-1960 的建队与 perform caller；primary 为 fight.c:1451-1605 的 CLASSIC 填充/dualMove 二抽/玩家倍率/严格比较排序与 battle.h:158-167,216 的 ACTIONQUEUE 结构。caller 先填敌人再填玩家；失能玩家在 caller 中 dex=0 且不消耗 RNG；dualMove 的 dex2 由 caller 独立抖动，helper 只负责 fIsSecond 归属和稳定降序排序。来源为固定Git载体,非本次运行;原2个链接处置见作者review的linkDisposition。当前存活入口:[README.md](../core-comment-audit/README.md) [README.md](../core-comment-audit/queue-approved-fix/README.md)。

## 断言与业务 oracle

2026-10-18 counter：严格小于时交换不保证全域稳定——较快玩家能反转两同速敌；原生 C 片段与真实 helper 已复现，原「未发现缺陷/C 稳定等价」当前信用撤回，源/专测转 review；完整排序外括号实际在 fight.c:1585，不是 1584。用户已批准 GAME-ACTION-QUEUE-TIE-ORDER-1 先红后修；批准窄修已恢复原 C 双循环/SHORT/13 槽及速度 0xffff 前缀，原 C 静态 oracle 和真实按键 caller 已测。原始切片验证为：turn-queue.test.ts 与 battle-state-machine.glm-battle.test.ts 关键词定向 5 passed / 14 skipped、game typecheck 通过、无测试 stderr；NaN/越界 dex 不在真实 caller 合法输入域，保持未裁决，不擅自加 guard 或改变排序合同。文档事实核对(currentExecution=false):原记录按其自身字段成立;空数组/exit0/成功字样不外推为零诊断或产品通过。

## 结果

原始切片未改实现，结论为只读核读；counter 后旧稳定等价结论不恢复整文件闭合，任务保持 review。批准窄修当前进展：原 C 双循环/SHORT/13 槽及速度 0xffff 前缀已恢复并有原 C 静态 oracle 与真实按键 caller 测试，见直接原件；非有限数值/超容量/dex2 缺省/统一门和视觉未完成，不重签整文件。

## 限制与复核

coverage、official ratchet、protected fast、全仓 pnpm check 按用户成本规则留到完整大模块收口；3m formulas/magic-damage/status/RNG 各自成片、整卡 partial。本页 5 passed/14 skipped 为关键词定向而非全量，不外推为整文件绿。未重跑原命令/浏览器/测试;历史结论保持原时点;候选待Owner非作者接收。


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2108B / SHA-256 5f4818c517916b13c9769e54d51a325220dba795a0bf243d42a868a9545c58ed；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE3m turn-queue 只读复审切片

2026-10-18 counter：严格小于时交换不保证全域稳定；较快玩家能反转两同速敌。原生C片段与真实helper已复现，原“未发现缺陷/C稳定等价”当前信用撤回，源/专测转review。完整排序外括号实际在fight.c:1585，不是1584。用户已批准GAME-ACTION-QUEUE-TIE-ORDER-1先红后修；[直接原件](../core-comment-audit/README.md)。下文保留原候选历史，不恢复整文件闭合。

基点：`1ffef6802`；分支：`codex/code-quality-3y`，相对 `origin/main` 为 `0 behind / 198 ahead`。本片只读 `turn-queue.ts`、直接测试和 battle-system caller；不改行动顺序、RNG、战斗玩法或公共接口。3m 整卡保持 `partial`。

完整读取 98 行队列实现和 117 行直接测试；读取 `battle-system.ts` 建队列区间，核对 `fight.c:1451-1584` CLASSIC 填充/dualMove 二抽/玩家倍率/严格比较排序和 `battle.h:158-167,216` ACTIONQUEUE 结构。caller 先填敌人、再填玩家；失能玩家在 caller 中 dex=0 且不消耗 RNG；dualMove 的 dex2 由 caller 独立抖动，helper 只负责 fIsSecond 归属和稳定降序排序。

测试覆盖降序、同 dex 敌先、dualMove 二抽两方向、空队伍和综合顺序；`turn-queue.test.ts` 与 `battle-state-machine.glm-battle.test.ts` 关键词定向执行 `5 passed / 14 skipped`，game typecheck 通过，无测试 stderr。未发现可证伪直接缺陷；NaN/越界 dex 不在真实 caller 合法输入域，保持未裁决，不擅自加 guard 或改变排序合同。

coverage、official ratchet、protected fast、全仓 `pnpm check` 按用户成本规则留到完整大模块收口；3m formulas/magic-damage/status/RNG 仍 pending。


2026-10-18 批准窄修当前进展：原C双循环/SHORT/13槽及速度0xffff前缀已恢复，原C静态oracle和真实按键caller已测；[完整实施原件](../core-comment-audit/queue-approved-fix/README.md)。旧稳定等价结论仍撤回，任务review，非有限数值/超容量/dex2缺省/统一门和视觉未完成，不重签整文件。
```
<!-- incremental-original-source:end -->
