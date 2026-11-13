# Q2 战斗会话源码引用适用性

Status: recorded
Owner: Codex
Last reviewed: 2026-11-13
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

## 2026-11-13 伤亡对白和普通败局交接

固定前驱 `f84bcd91dd71498e1099e7bf8f4b2d7900507090`，冻结候选 `31002d214bb106272f34af46c86c57872b9b2849`。现行会话 SHA-256 为 `24315ad2cd70eaa1f1e5418e5d4df71eb13421707232318252e65d30d10a7181`。原 `211-213`、`365-376`、`1167-1176` 的三个片段逐字节保留，当前范围为 `216-218`、`375-386`、`1195-1204`。候选新增伤亡对白排程和普通全灭交给世界呈现的条件。业务结果回 Q2 独立原件。 [覆盖报告](../../testing/domains/cross-phase/battle-foundation/report.md#2026-11-13-伤亡对白雷咒毒伤和全灭)

普通全灭还影响三个当前来源文件的指纹。开场采集测试加入全灭画面反控，已有 Game 世界绘制原件的断言代码逐字节保留。Reforge 的场景、镜头、运动构造与 BattleHost 的准备、释放当前会话和写回仍有同一调用。主壳构造片段加入两行 `worldDefeatFrameCapture`，由普通全灭信号持有战斗末帧闭包。去掉这两行后原构造片段逐字节相同。

| 文档来源 | 固定范围 | 当前范围 |
| --- | --- | --- |
| `opening-trace.test.mjs` 的 Game 世界绘制断言（001 和共性问题） | 527–642 | 538–653 |
| `main.ts` 的 ActiveScene、WorldCamera 与 WorldMotionRuntime | 407–414、448–455、434–445 | 408–415、449–456、435–446 |
| `main.ts` 的 BattleHost 构造 | 1242–1261 | 1245–1266 |
| `battle-host.ts` 的 start 与 active 释放后的写回 | 53–67、156–160 | 55–69、165–169 |

文档桥接按固定前驱和冻结候选核这些位置，将五项配对证据反向还原到各自已发布的记录，再校验历史版本、场景、执行结论和原件保持。五项现行来源变动只授来源适用性。 [现行目录](../../testing/catalog.json) · [正常战斗覆盖报告](../../testing/domains/cross-phase/battle-foundation/report.md)

## 2026-11-13 玩家仙术与投掷的会话来源

固定前驱 `faae7bde3078a06d5072326327459994107607e2` 包含上一轮发布的归属证据，会话源码与 `31002d214bb106272f34af46c86c57872b9b2849` 逐字节相同。中间候选 `2b8a38c53598dbba8d42ebbf16fa93da2d9e5531` 的会话摘要为 `e31925b1a090a4a8e8e4b07fa0f5950f3904b0cfb625e2b46c64c3e8052612d3`。玩家伤害法术的超杀飘字保留计算值，投掷时间线接收角色起手音、站位和物品名称。投掷归位修正 `6fc3b4e350500bd117e37ed33ce6a7f6233a3a33` 复用会话已有姿态选择，其会话摘要为 `25617f929cae55cd782c68aa87b514b0b3741b133274d5da142803da85037b5e`。友方仙术修正 `8c943feb6abd3be44a57f3b0bdaaafcd334797e0` 将实际受术槽传给时间线，其会话摘要为 `25673bced6594f8b5ff887fedf812489998819f3c9e7a69c8d1386d95809296b`。合击耗血飘字修正 `f03b46b2ae192f78d132ef933f86f0fa242dd0db` 只调整显示基线，现行会话摘要为 `8a64629ba6e2361e7981a0e33006c385c2e3d37ff7f507f0f449d58980cf321f`。

选择归属构造、准备屏障构造和选择提交分别位于 `216-218`、`375-386`、`1191-1200`。三个片段与固定前驱逐字节相同，第三处原在 `1195-1204`。目录、配对报告与机器证据更新当前摘要，并以 `q2-battle-session-player-actions-source-rebinding` 追加一次适用性历史。桥接逐段比对字节，并逐层核查此前发布的归属和普通败局证据。实际试打与验收按 [Q2 覆盖报告](../../testing/domains/cross-phase/battle-foundation/report.md) 对应的运行候选核查。

## 2026-11-13 合击降级与攻击仙术收势的会话来源

固定前驱为 `a86eea156e360bfb916a63afb8c8c7b5d5d0f018`。它包含已发布的战斗会话归属及玩家行动来源记录，`battle-session.ts` 的 SHA-256 为 `8a64629ba6e2361e7981a0e33006c385c2e3d37ff7f507f0f449d58980cf321f`。待验运行候选 `ee449348590d9c8115889fa9b5e7b5ef3ca1fabe` 的同文件 SHA-256 为 `80e9c9e4775f3ad7b15cb59ea33ae6472d44dc3af66d601286188c0a69e5cd37`。该候选让合击降级复用普通攻击，分别使用两击的暴击声，并按目标底锚放置双击飘字。玩家攻击仙术的时间线在特效结束后进入伤害反馈或收势。

两个 Git 对象中的三个调用片段逐字节相同，行范围一致。片段摘要包括末行换行。

| 调用锚点 | 两版本范围 | 片段 SHA-256 |
| --- | --- | --- |
| `private readonly selection = new BattleCommandSelection` | 216–218 | `06748bc9b41060a59eb9ce1a4f35eaa83a1928e28cfe1b77ca79e9fce8b8aab5` |
| `this.readiness = new BattleTurnReadinessGate` | 375–386 | `53a94cb63d8c929db87931718c62beafe957b20c8f5175fa036b6f1245be7fd2` |
| `this.selection.advance(context` | 1191–1200 | `82194abf644a9712e369e0f638e10a17d7360ed16819cf2e5706941c3567ec65` |

目录、配对报告与机器证据更新三个来源摘要，并追加 `q2-battle-session-cooperative-recovery-source-rebinding`。桥接按固定 Git 前驱验证旧来源和历史，再核现行片段字节、摘要及主张指针。归属测试的执行身份、义务、结果与附件沿用原记录。双端实跑结果与用户验收见 [Q2 覆盖报告](../../testing/domains/cross-phase/battle-foundation/report.md)。
