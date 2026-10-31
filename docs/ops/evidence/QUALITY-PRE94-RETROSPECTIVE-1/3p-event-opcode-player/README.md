# CODE3p event player/equipment/poison opcode 当前复审切片

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 CODE3p 事件玩家/装备/HPMP/复活/毒/状态/魔法 opcode 的当前复审切片（基点 6110cc585，分支 codex/code-quality-3y）：重新复审 event-opcode-player.ts 及其公开/相邻测试 caller，不把历史 done、旧全仓门或原批数字当作当前整卡验收；3p 当前复审提升为 partial，未标 accept/done。2026-10-24 已有后继增量。证据原件为下方逐字节保全的固定main源；读域明细见同目录 read-boundaries.json（5 全文 + 6 区间）。

## 来源与输入

全文读取 event-opcode-player.ts 及 event-opcode-player.test.ts、glm-next-wave.test.ts、cov85.test.ts、glm-opcode-residual.test.ts 四份直接测试。caller/ownership 读取：event-system.ts 的唯一 applyPlayerOpcode dispatch、equip-effect.ts 的效果/属性 owner、inventory-state.ts 的道具 owner、player-poison-state.ts 的 party-slot/毒 owner；primary 核对 script.c:752-832,1052-1135,1257-1405,1623-1627,1816-1846 与 global.c:1459-1685,2173-2344。逐项核 role/slot/0xFFFF、SHORT/WORD、fScriptSuccess、HP/MP clamp、装备 inventory swap、复活/毒/状态/魔法的失败与合法 no-op。2026-10-24 当前增量见[模式／玩家生命周期质量及获批毒整理](../mode-player-quality/README.md)。来源为固定Git载体,非本次运行;原1个链接处置见作者review的linkDisposition。当前存活入口:[README.md](../mode-player-quality/README.md)。

## 断言与业务 oracle

结论：opcode helper 仍只写其 owner 的 GameState/equipment/inventory/poison 字段；currentEventObjectId/显式 role、party-wide target、<=999 状态清理、>999 装备态、level99 伪毒、毒入口同步 runner、0x55/0x56 槽位和 0x8D 随机升级边界均与 caller/primary 一致。未发现新的可证伪实现缺陷，也没有把 event-system 重新双写或扩大到 battle-opcodes/save/raw。文档事实核对(currentExecution=false):原记录按其自身字段成立;空数组/exit0/成功字样不外推为零诊断或产品通过。

## 结果

验证：四份 opcode 直接测试 61 passed，无测试 stderr；加入 event-system/equip/ownership/magic-script 相邻回归后 8 files / 471 passed，有既有 fixture 的预期 warning（未知 label、无当前对象），因此运行时诊断未清零。pnpm --filter @type-pal/game typecheck 通过；coverage、official ratchet、protected fast、全仓 pnpm check 未在此小批运行。

## 限制与复核

高风险边界：触及第一阶段脚本 opcode、复活/毒/状态/装备 owner，但未改变事件格式、schema/save、公共接口、生成物或产品取舍。3p 仍需统一门与相邻诊断收口；2026-10-24 后继片已按其版本复用本片全文/primary 证据并修复或收窄旧误绿与 Wear 偏差。未重跑原命令/浏览器/测试;历史结论保持原时点;候选待Owner非作者接收。


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2377B / SHA-256 16cb623451f7edc8d237424431999a8c6e9f7696aaf454e2a19d65f4a2bb9e4d；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE3p event player/equipment/poison opcode 当前复审切片

2026-10-24 当前增量：[模式／玩家生命周期质量及获批毒整理](../mode-player-quality/README.md)。旧全文/primary证据按其版本复用，具体旧误绿与Wear偏差已在新片修复或收窄，整卡仍partial，统一门等全部pre94收尾。

基点：`6110cc585`；分支：`codex/code-quality-3y`。本片重新复审 `event-opcode-player.ts` 及其公开/相邻测试 caller；不把历史 done、旧全仓门或原批数字当作当前整卡验收。3p 当前复审提升为 `partial`，未标 accept/done。

完整读取：

- `packages/game/src/core/event-opcode-player.ts`；
- `event-opcode-player.test.ts`、`event-opcode-player.glm-next-wave.test.ts`、`event-opcode-player.cov85.test.ts`、`event-opcode-player.glm-opcode-residual.test.ts`。

caller / ownership 读取：`event-system.ts` 的唯一 `applyPlayerOpcode` dispatch、`equip-effect.ts` 的效果/属性 owner、`inventory-state.ts` 的道具 owner、`player-poison-state.ts` 的 party-slot/毒 owner；primary 核对 `script.c:752-832,1052-1135,1257-1405,1623-1627,1816-1846` 与 `global.c:1459-1685,2173-2344`。逐项核 role/slot/0xFFFF、SHORT/WORD、fScriptSuccess、HP/MP clamp、装备 inventory swap、复活/毒/状态/魔法的失败与合法 no-op。

结论：opcode helper 仍只写其 owner 的 GameState/equipment/inventory/poison 字段；`currentEventObjectId`/显式 role、party-wide target、`<=999` 状态清理、`>999` 装备态、level99 伪毒、毒入口同步 runner、0x55/0x56 槽位和 0x8D 随机升级边界均与 caller/primary 一致。未发现新的可证伪实现缺陷，也没有把 event-system 重新双写或扩大到 battle-opcodes/save/raw。

验证：四份 opcode 直接测试 `61 passed`，无测试 stderr；加入 event-system/equip/ownership/magic-script 相邻回归后 `8 files / 471 passed`，有既有 fixture 的预期 warning（未知 label、无当前对象），因此运行时诊断未清零。`pnpm --filter @type-pal/game typecheck` 通过；coverage、official ratchet、protected fast、全仓 `pnpm check` 未在此小批运行。

高风险边界：触及第一阶段脚本 opcode、复活/毒/状态/装备 owner，但未改变事件格式、schema/save、公共接口、生成物或产品取舍。3p 仍需统一门与相邻诊断收口。
```
<!-- incremental-original-source:end -->
