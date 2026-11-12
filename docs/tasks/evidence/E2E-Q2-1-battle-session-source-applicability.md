# Q2 战斗会话源码引用适用性

Status: recorded
Owner: Codex
Last reviewed: 2026-11-12
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

## 2026-11-11 敌方机制批次再绑定

后继基点 `3a921678f20950cccee3f631dfbb1e60bb8efa3b`，本轮运行候选 `e746620556cf961eed871ec3f8038f5223d37357`。本轮候选改敌普攻时间线的直接伤害和物理命中倒地判定。三个已接收 caller 的源码片段与基点逐字节相同。当前行范围为 `209-211`, `362-373`, `1163-1172`，SHA-256 为 `4e77e5ee0c50144b19c5fe9bb316cb900532577eef508a696c6a0ccd4dcf203f`。

目录、配对报告与机器证据追加本轮适用性历史，前次重绑和原发布的候选、版本、执行业务义务均按原记录核查。第三批运行结果取 [Q2 覆盖报告](../../testing/domains/cross-phase/battle-foundation/report.md)。

## 2026-11-11 赤毒头像返工后的现行绑定

新冻结候选 `4f1bea68f897ca59d4a2cd892e7619ffdebe479e` 将战斗头像的毒色索引交给绘制层。三个会话 caller 片段仍与固定基点逐字节相同，当前源码 SHA-256 为 `e71852534a1568874b7c8893bc7c58e976adba97349d0eaf3f160cb602c9b08c`。首次第三批候选与第三批原件保留各自身份，目录、配对报告和机器证据的当前指针绑定返工后的源码。 [头像验收范围](../../testing/domains/cross-phase/battle-foundation/report.md#2026-11-11-赤毒头像返工)

## 2026-11-12 回合末演出与敌普攻起手音

固定前驱 `5a3093c93746d6e04e8f569ef526e07778aa439f`。首版第四批候选 `5d42c84ffaa20fb5cb3b8df3a57c8c248342b7e3` 的会话源码 SHA-256 为 `3ace4643724f0df7411de03c4a92cec1badb3ca1d92e96d83fef1241f122ec15`。数值反馈等待置于下一轮起手和手动选择之前，敌普攻音效在时间线构造时传入。

防御返工候选 `3ac5c7b8b42c967b51ca12c9ddeeba6b1397ee9b` 的现行会话源码 SHA-256 为 `57fa83264a9418ea4e2b4a83ae57d44295c3fb550ea97b1bd6e588e627b2f0f1`。物攻构造使用受击前姿态和本次物理扣血后的血量。三个现行 caller 范围 `211-213`、`365-376`、`1167-1176` 与固定前驱和首版第四批候选的片段逐字节相同。 [防御复位复验](../../testing/domains/cross-phase/battle-foundation/report.md#2026-11-12-防御受击复位与自动格挡)

目录、配对报告及机器证据的引用随实际源码更新，并追加 2026-11-12 适用性历史。原先三次重绑各由固定 Git 版本核对。 [动画与音效覆盖](../../testing/domains/cross-phase/battle-foundation/report.md)

## 2026-11-12 普通行动队列首拍

固定前驱 `d0020e0749483651d9b0f86cf79ef738ac34663e`，冻结候选 `f38df3e308b7b0c6df5a4fbb883fbb1f77cb864f`。现行会话 SHA-256 为 `569d70d1b93c2799369433c4a5bb5b8c9734d8473b9937df1659472be73a401a`。`211-213`、`365-376`、`1167-1176` 三个 caller 的片段与固定前驱逐字节相同，readiness oracle 全文件字节相同。候选在原准备入口记入已过的一个游戏帧，仍由原无参回调建队。

目录、配对报告和机器证据追加本次适用性记录。各次既有归属与历史反控的执行身份保留，普通队列的旧 240 ms 断言只适用于其固定候选。新节拍的运行结论见 [双端复验](../../testing/domains/cross-phase/battle-foundation/report.md#2026-11-12-主动防御至首次命中的行动节拍)。

## 2026-11-12 物攻玩家伤亡和胜利结算

固定前驱 `58812c028ebd87dd75a9c5dda46a4ec997fb4b09`，冻结候选 `55d5512d81a87660185b17afad621a3d33e9e5a0`。现行会话 SHA-256 为 `0e12586ab29d9526f39bf14fd3c74c1cbc57c9ee5def27033d6e57ef74d8f476`。`211-213`、`365-376`、`1167-1176` 三个 caller 片段与固定前驱逐字节相同。当前行动时间线消费本次物攻伤亡音，胜利写回使用实际倒地 HP。

目录、配对报告和机器证据追加本次适用性记录，各次归属测试执行身份保留。新场景的双端运行结论取 [物攻玩家伤亡复验](../../testing/domains/cross-phase/battle-foundation/report.md#2026-11-12-玩家物攻濒死和阵亡)。
