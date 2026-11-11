# Q2 战斗会话源码引用适用性

Status: recorded
Owner: Codex
Last reviewed: 2026-11-11
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

固定来源 `43fea71735236272cfb7f6a1c61c3ac2e691a349`，本轮运行候选 `54d7b378d5094950c10b73bb38a81883cd3d375d`。固定来源与首批合并版本 `18fac8f47fbb002bf76a4c97283225c7156447f2` 的 `battle-session.ts` 和归属报告文件逐字节相同。现行运行、反例与媒体取 [Q2 覆盖报告](../../testing/domains/cross-phase/battle-foundation/report.md)。

## 来源与输入

源码 `packages/reforge/src/battle/battle-session.ts`。固定 SHA-256 为 `818b2c6b19e1c98c2e2a33627e342f801378e5c3d3e090451baebdea50b83bbc`，当前 SHA-256 为 `a684cfacbdb5bc8ab8c71a015ef6add169d30ed9986a2ebf23f554c54293f038`。

| 调用锚点 | 固定范围 | 当前范围 |
| --- | --- | --- |
| `private readonly selection = new BattleCommandSelection` | 210-212 | 209-211 |
| `this.readiness = new BattleTurnReadinessGate` | 362-373 | 362-373 |
| `this.selection.advance(context` | 1163-1172 | 1163-1172 |

## 断言与业务 oracle

三个范围分别绑定指令选择 owner、准备屏障 owner 的构造与当前选择调用。实际锚点仍交给同一 owner。当前候选新增淡出等待和手动选招显示门，验证取 Q2 的双端原件。旧归属合同的取消后准备、结算与脚本播放清理按原出版记录核查。

## 结果

配对报告、目录、机器证据同步这三个 SHA 和行范围。原记录保留于新增 history 的 `previousSourceRefs`。原来源主张的 `path:lines` 指针随实际范围更新。旧候选、版本、业务义务、附件和执行状态按固定来源核验。

## 限制与复核

本回执只授源码引用适用性。运行结果、动作节拍与测试覆盖取独立的 [Q2 任务和证据](../cards/E2E-Q2-1-battle-foundation.md)。
