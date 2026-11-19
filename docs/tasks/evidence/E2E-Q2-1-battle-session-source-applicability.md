# Q2 战斗会话源码引用适用性

Status: recorded
Owner: Codex
Last reviewed: 2026-11-16
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

## 2026-11-13 群体用物、吸血和复活的会话来源

固定前驱 `398a930d2c1ddb4c0fe1a8a96271dba70e3aa93c` 是 PR #63 合并对象，已保存上一轮会话归属的目录和配对证据。其 `battle-session.ts` 的 SHA-256 为 `80e9c9e4775f3ad7b15cb59ea33ae6472d44dc3af66d601286188c0a69e5cd37`。道具候选 `bd48eda19ab9e08b9c17c176c08ff1a9243862d4` 的同文件 SHA-256 为 `3730d55abbb4af06a419b3d3251b7a7d68aeedf53864f7426206c46933ccf50f`。本次会话改动将群体道具的辉光应用于全部目标，在结果帧更新复活者姿态，并将投掷伤害和吸血回血数字派发到同一帧。投掷的数字取核心提供的显示值。

下列三个范围在两个 Git 对象中逐字节一致。摘要覆盖末行换行。

| 调用锚点 | 两版本范围 | 片段 SHA-256 |
| --- | --- | --- |
| `private readonly selection = new BattleCommandSelection` | 216–218 | `06748bc9b41060a59eb9ce1a4f35eaa83a1928e28cfe1b77ca79e9fce8b8aab5` |
| `this.readiness = new BattleTurnReadinessGate` | 375–386 | `53a94cb63d8c929db87931718c62beafe957b20c8f5175fa036b6f1245be7fd2` |
| `this.selection.advance(context` | 1191–1200 | `82194abf644a9712e369e0f638e10a17d7360ed16819cf2e5706941c3567ec65` |

目录、归属报告及配对证据按新摘要登记，并追加 `q2-battle-session-item-effects-source-rebinding`。桥接继续检验固定前驱、三个调用片段、主张指针及已有历史。归属测试的执行身份与结果仍取其原始记录。道具双端执行范围见 [Q2 覆盖报告](../../testing/domains/cross-phase/battle-foundation/report.md)。

## 2026-11-13 投掷失败提示的会话来源

固定前驱 `5a5a02a2f56eb4748d0415e902c334999121dcdb`，运行候选 `5aa5cb252597dfaf6989e5d91f203b2253449770`。会话文件由 `3730d55abbb4af06a419b3d3251b7a7d68aeedf53864f7426206c46933ccf50f` 更新为 `def44c8648f31c08eaba3de03c4da238011fa6a93cedd95eec11910366cb21d0`。当前会话在挥臂出手后显示无效果的中央提示，确认或到时再恢复原收招。

三个已出版调用片段分别与固定前驱逐字节相同。摘要覆盖末行换行。

| 调用锚点 | 前驱范围 | 当前范围 | 片段 SHA-256 |
| --- | --- | --- | --- |
| `private readonly selection = new BattleCommandSelection` | 216-218 | 217-219 | `06748bc9b41060a59eb9ce1a4f35eaa83a1928e28cfe1b77ca79e9fce8b8aab5` |
| `this.readiness = new BattleTurnReadinessGate` | 375-386 | 378-389 | `53a94cb63d8c929db87931718c62beafe957b20c8f5175fa036b6f1245be7fd2` |
| `this.selection.advance(context` | 1191-1200 | 1209-1218 | `82194abf644a9712e369e0f638e10a17d7360ed16819cf2e5706941c3567ec65` |

目录、归属报告及配对证据追加本次适用性历史。归属测试原有执行身份和业务结果取原记录。投掷实跑范围见 [Q2 覆盖报告](../../testing/domains/cross-phase/battle-foundation/report.md)。

## 2026-11-14 敌方施法演出的会话来源

固定前驱 `a4d04282dbbdaecff8e97e37528b5c0d67659550`。敌方施法的会话接入补齐原始起手与姿态，并在五拍受击后恢复施法者原位。会话文件由 `def44c8648f31c08eaba3de03c4da238011fa6a93cedd95eec11910366cb21d0` 更新为 `13396fdb6f00dbe4e6dd3789c844bc0c64363e047a2ca248d637a1f1003c68ab`。

| 调用锚点 | 前驱范围 | 当前范围 | 片段 SHA-256 |
| --- | --- | --- | --- |
| `private readonly selection = new BattleCommandSelection` | 217-219 | 220-222 | `06748bc9b41060a59eb9ce1a4f35eaa83a1928e28cfe1b77ca79e9fce8b8aab5` |
| `this.readiness = new BattleTurnReadinessGate` | 378-389 | 381-392 | `53a94cb63d8c929db87931718c62beafe957b20c8f5175fa036b6f1245be7fd2` |
| `this.selection.advance(context` | 1209-1218 | 1212-1221 | `82194abf644a9712e369e0f638e10a17d7360ed16819cf2e5706941c3567ec65` |

三个调用片段的范围含末行换行，逐字节相同。原归属测试的执行身份和结论由其原证据承载。敌方施法和毒道具的复验范围取 [Q2 覆盖报告](../../testing/domains/cross-phase/battle-foundation/report.md)。

## 2026-11-14 特殊状态与物攻呈现的会话来源

固定前驱 `9662bbe177aa9567f15cb7e556a961c286a430da`，候选 `681040c59b1c6787cbaecb91e3dd20b9acd62b1d`。现行会话 SHA-256 为 `4ec415e8dbe39d1435c10251e1b9b00b2b2c27b8b2d8b08bb1affd1ea6582b4d`。群攻使用逐挥命中，混乱打友按真实状态复位，单体第二挥读取首挥结束的敌方位置。三个调用片段按含末行换行的原始字节比较。

| 调用锚点 | 前驱范围 | 当前范围 | 片段 SHA-256 |
| --- | --- | --- | --- |
| `private readonly selection = new BattleCommandSelection` | 220-222 | 220-222 | `06748bc9b41060a59eb9ce1a4f35eaa83a1928e28cfe1b77ca79e9fce8b8aab5` |
| `this.readiness = new BattleTurnReadinessGate` | 381-392 | 381-392 | `53a94cb63d8c929db87931718c62beafe957b20c8f5175fa036b6f1245be7fd2` |
| `this.selection.advance(context` | 1212-1221 | 1213-1222 | `82194abf644a9712e369e0f638e10a17d7360ed16819cf2e5706941c3567ec65` |

其余归属来源和原执行回执沿用既有记录。运行和反控取 [Q2 覆盖报告](../../testing/domains/cross-phase/battle-foundation/report.md)。

## 2026-11-14 胜利持帧后的五项来源适用性

固定前驱 `11b5b8d8183147732b9ea30560b5eb2bec4b2d7f`，冻结候选 `840625b531130f6a9c4819c509ed3bf3a47353a5`。目录与五份配对证据的现行范围如下。

| 条目 | 来源与锚点 | 前驱范围 | 当前范围 |
| --- | --- | --- | --- |
| `e2e-001`、`e2e-common-issues` | `opening-trace.test.mjs` 的 Game 世界绘制测试 | 538–653 | 551–666 |
| `runtime-active-scene` | `main.ts` 的 ActiveScene、WorldCamera | 408–415、449–456 | 413–420、454–461 |
| `runtime-world-owners` | `main.ts` 的 WorldMotionRuntime | 435–446 | 440–451 |
| `runtime-battle-host` | `main.ts` 的 BattleHost 构造 | 1245–1266 | 1251–1295 |
| `runtime-battle-host` | `battle-host.ts` 的 start、释放 active 后写回 | 55–69、165–169 | 63–78、174–178 |

Game 世界绘制测试、场景/镜头/运动构造、释放 active 后写回的范围均逐字节一致。开场采集新增对 Reforge 胜利持帧早退分支的验证，检查该帧继续画对白，同时不产生新世界帧回执。旧会话仍由身份检查保护，释放 active 与 `finishWorld` 之间没有异步等待。

BattleHost 构造将原胜利奖励调用改为延后半恢复，并在普通败局末帧端口与 `runDefeated` 之间接入胜利持帧端口。还原奖励调用并移除持帧端口后，构造片段与前驱逐字节一致。宿主 `start` 在取得新启动意图后增加对上一场胜利持帧的取消，移除该行后即为前驱片段。原 runner、脚本和世界身份检查、准备后提交及普通败局末帧交接仍由原调用完成。

本次复核只确认既有来源适用性。各条目保留其原执行身份、主张和附件，以固定前驱重放上一层普通败局回绑。新明雷战斗、复活实跑和比较反控由 [Q2 覆盖报告](../../testing/domains/cross-phase/battle-foundation/report.md#2026-11-14-复活组合与真实明雷掉落)记录。

## 2026-11-14 明雷进出场和战斗结算的来源适用性

固定前驱 `9f5f57d4df53ea122622ffda110807e39e0ec66e`，冻结候选 `39d5bf7eb080a2a569421c50b79ebe60f38eecb0`。中间候选 `d008dfe82960754ee97a428110e03ab49b8d9110` 保留原进出场实现。更新四项既有 Reforge 运行时记录及 Game 脚本修正、输入方向两项配对记录的调用来源。此前开场与共性问题引用的 `opening-trace.test.mjs` 在这两个对象中逐字节相同，继续使用已刊范围和执行记录。

| 条目 | 来源 | 前驱范围 | 当前范围 |
| --- | --- | --- | --- |
| `runtime-active-scene` | `main.ts` 的 ActiveScene、WorldCamera | 413–420、454–461 | 414–421、455–462 |
| `runtime-world-owners` | `main.ts` 的 WorldMotionRuntime | 440–451 | 441–452 |
| `runtime-battle-host` | `main.ts` 的 BattleHost 构造 | 1251–1295 | 1268–1343 |
| `runtime-battle-host` | `battle-host.ts` 的 start、释放 active 后写回 | 63–78、174–178 | 72–88、265–276 |
| `runtime-battle-session-owners` | `battle-session.ts` 的选择、资源准备与指令提交 | 220–222、381–392、1213–1222 | 242–244、406–418、1243–1252 |
| `game-script-corrections` | Game `bootstrap.ts` 的 `supplySupplementalSceneObjects` | 346 | 349 |
| `game-input-rotation` | Game `scene-system.ts` 的 `DIR_DELTA` | 44 | 46 |

场景、镜头、运动构造与会话的选择、提交片段逐字节一致。会话构造加正常明雷的结算选项，撤去该行即可还原原有资源准备与会话初始化范围。

主壳 BattleHost 构造添加明雷入场端口，并在胜利脚本收尾后交给同一遭遇的生命周期提交、过场及对白释放。普通败局末帧端口、战后脚本调用和存档世界读取照前驱接线。BattleHost 开始时一并取消旧入场，释放活动会话后仍同步执行 `finishWorld`，其后才等待扩充的胜利过场参数。反向去掉这些增量后，三个主壳/宿主片段与固定前驱逐字节一致。

宫殿场景的十二个明雷胜利淡变采用工程默认。冻结候选的 `s286.json` 与固定前驱逐字节一致，独立出口继续引用 1100 行。原运行主张和历史报告中的第二份 metadata 保留。

Game 的正常明雷改为独立的原盘六组换屏节拍，导致两个现行来源顺延。补充实体调用和完整方向表与固定前驱逐字节一致。旧存档及方向控制的运行主张、输入和原件均保留。

最终候选在原调用片段外修正淡变起始色阶、明雷战斗 MIDI 准备和遇敌期间的世界自动脚本暂停。主壳前三个范围和宿主启动范围与中间候选原位逐字节一致。主壳 BattleHost 构造从 1267–1342 移至 1268–1343，宿主写回从 250–261 移至 265–276，两个片段保持原字节。会话和开场采集测试的整文件与中间候选一致。工程默认与敌人覆写在 BattleHost 构造以外的 `runHostileEncounter` 解析，构造端口、胜利与失败的回调以及三个构造引用保持原位。

桥接器核现行文件完整指纹、确切锚点与新历史，再还原并重放旧出版校验。报告此前刊行的范围保留原复核时点，表中当前范围对应各报告 `testing-meta`。原主张、原执行和附件继续由各配对证据持有。本轮明雷、状态演出和选招的动态复核取 [Q2 覆盖报告](../../testing/domains/cross-phase/battle-foundation/report.md)。

## 2026-11-15 战斗生命周期来源

固定前驱 `2d17adc064409630aa74415dc8195080d2344d28`。来源重新绑定到已冻结的 `4d50dbed3ed2ad18eb2dba9814dfe187739e0338`。构造、动作调用或保存入口的可用性取当前源码，已发布的角色、版本、运行状态和原件继续对应各自的历史版本。

| 引用范围 | 固定前驱 → 现行 |
| --- | --- |
| 活动场景及世界归属 `main.ts` | 414–421、455–462、441–452 原片段字节相同 |
| 战斗宿主 `main.ts` | 1268–1343 → 1269–1367，新增脚本入场的专属接线；准备、败局取帧、胜利和世界提交仍逐段核对 |
| 战斗宿主 `battle-host.ts` | 72–88 不变；265–276 → 277–288 |
| 战斗会话及选招 `battle-session.ts` | 242–244 不变；406–418 → 407–419；1243–1252 → 1254–1263。选招测试 72–95 → 73–96 |
| Game 脚本更正 `bootstrap.ts` | 349 → 354，原入口字节相同 |

机器入口使用固定前驱及现行源码检查旧调用片段。实际玩家逃跑、敌逃、剧情必败和存读另取本轮原件。 [覆盖报告](../../testing/domains/cross-phase/battle-foundation/report.md#2026-11-15-敌方逃跑剧情必败与战后存读)

## 2026-11-15 分屏返工后的来源

前驱 `761bc57b8c2420413580b209088db0b87d060cc2`，现行来源候选 `af644d2fd07b2d1ed528e50680ac0ad99a891116`。Game 壳的变化只在脚本走位障碍接线。Reforge 主文件的变化在剧情跟随和战利品对白绘制。Game 壳 354、Reforge 主文件 414–421、441–452、455–462、1269–1367 均原位置同字节。开场采集测试补了 `needsRender` 的 fixture，原绘制断言 `551–666` 移到 `554–669`，116 行字节相同。独立校验先恢复三份旧来源引用及两个开场主张指针，再重放原有生命周期校验，保留旧主张、执行版本和反例。Q2 的新采集和判据按各自运行候选取证。 [双端实跑与限制](../../testing/domains/cross-phase/battle-foundation/report.md#2026-11-15-分屏返工与明雷暂停复验)

读档淡入冻结 `4a8cf1d83` 延用上述三个归属报告的 Reforge 主文件片段，四个范围 `414–421`、`441–452`、`455–462`、`1269–1367` 逐字节保留。新增行为由读档恢复和最后一层画布呈现接线承接。存档恢复采集继续在共同提交后、自动脚本恢复前取证。三个旧归属主张仍由各自原有执行与反例支撑。 [读档双端运行](../../testing/domains/cross-phase/battle-foundation/report.md#2026-11-15-读取进度的淡入与槽位布局)

## 2026-11-16 Q2 收尾来源

紧接前驱 `4b2692d65917034f3743a348ca161d2ffb447b97`，收尾文档绑定 `f8bc4292b7b5e8dc1b39c77502fd9197d2474559`。逐字节核对八段旧调用和选择语义。各原件的实际运行版本、旧主张、反例与独立审阅依其自身回执保存。

| 旧记录 | 文件与范围 | 当前范围 |
| --- | --- | --- |
| `runtime-active-scene` | Reforge `main.ts` 414–421、455–462 | 414–421、455–462 |
| `runtime-world-owners` | Reforge `main.ts` 441–452 | 441–452 |
| `runtime-battle-host` | Reforge `main.ts` 1269–1367 | 1269–1367 |
| `runtime-battle-session-owners` | `battle-session.ts` 242–244、407–419、1254–1263 | 246–248、412–424、1261–1270 |
| `runtime-battle-session-owners` | `battle-command-selection.test.ts` 73–96 | 73–96 |

会话新增状态页、作者合体技与偷窃反馈。旧选择实例、构造与原指令提交片段逐字节保留，原单测片段仍在同一位置。Q2 现行 runner、比较器和控制的引用按实际出口绑定。上一批的执行、附件及旧引用逐条保存在机器回执。 [Q2 收尾实跑证据](E2E-Q2-1-battle-closeout-20261116.tar.gz)

## 2026-11-16 敌人召唤音效后的来源

`e9a960647` 将敌人召唤音效与新敌入场接入同帧时间线。以 `b8b8dd2fc` 为前驱核对，会话中原指令选择的状态、构造与提交片段 246–248、412–424、1261–1270 字节和行号一致。只续接现行会话源摘要，历史执行、证据和结论沿用各自原版本。 [会话来源](../../../packages/reforge/src/battle/battle-session.ts) · [现行双端报告](../../testing/domains/cross-phase/battle-foundation/report.md)

PAL 工程 manifest 的唯一变更是绑定召唤音效。Q2 已引用的第 7 行明雷胜利转场仍为淡出淡入，目录、报告和机器回执续接现行摘要。 [工程 manifest](../../../projects/pal/manifest.json#L7)

## 2026-11-16 召唤与分裂后的来源

从 `62959793cf6fb2450806d12072608ce768d80c39` 到 `cf0d1e965a18094d85247a4dfa314ab5f76f9775` 逐段核对已有来源引用。下表片段保持原字节，现行摘要随文件更新。历史运行继续由原候选及原件支撑。

| 文件 | 旧范围 | 现行范围 |
| --- | --- | --- |
| `packages/reforge/src/battle/battle-session.ts` | 246-248 | 248-250 |
| `packages/reforge/src/battle/battle-session.ts` | 412-424 | 415-427 |
| `packages/reforge/src/battle/battle-session.ts` | 1261-1270 | 1269-1278 |
| `scripts/e2e/battle-reforge-instrumentation.mjs` | 17 | 17 |
| `packages/reforge/src/battle/battle-core.ts` | 2473 | 2466 |
| `packages/game/src/core/battle/battle-system.ts` | 2788 | 2824 |

## 2026-11-16 敌方色偏采集后的来源

从 `070e8145c20e3c2cc8cc77c1e696843d453a0a92` 到 `b50fcfbe049f3a16d45bc4352e38dae3937ed4c7` 逐段核对已有来源引用。下表片段保持原字节，现行摘要随文件更新。历史运行继续由原候选及原件支撑。

| 文件 | 旧范围 | 现行范围 |
| --- | --- | --- |
| `scripts/e2e/battle-trace-observer.mjs` | 204 | 204 |
| `scripts/e2e/battle-game-instrumentation.mjs` | 42 | 42 |
| `scripts/e2e/battle-trace-observer.mjs` | 307 | 309 |
| `scripts/e2e/battle-game-instrumentation.mjs` | 336 | 336 |

## 2026-11-16 连续召唤播放后的来源

从 `093fdb31abab95c08ce42b3b99c142e01adb3710` 到 `01909219fdd3d09f42a744fc674cbc790034ab9e` 逐段核对已有来源引用。下表片段保持原字节，现行摘要随文件更新。历史运行继续由原候选及原件支撑。

| 文件 | 旧范围 | 现行范围 |
| --- | --- | --- |
| `packages/reforge/src/battle/battle-session.ts` | 248-250 | 251-253 |
| `packages/reforge/src/battle/battle-session.ts` | 415-427 | 420-432 |
| `packages/reforge/src/battle/battle-session.ts` | 1269-1278 | 1282-1291 |

## 2026-11-16 敌方施法失败卷轴修复后的来源

从 `257296ec61b0dd8a6e103df9d26b8af374ca702b` 到 `d5da81104291894c48bd6b0e606fc22518d55fa9` 逐段核对已有来源引用。下表片段保持原字节，现行摘要随文件更新。历史运行继续由原候选及原件支撑。

| 文件 | 旧范围 | 现行范围 |
| --- | --- | --- |
| `packages/reforge/src/battle/battle-session.ts` | 251-253 | 251-253 |
| `packages/reforge/src/battle/battle-session.ts` | 420-432 | 420-432 |
| `packages/reforge/src/battle/battle-session.ts` | 1282-1291 | 1286-1295 |
| `packages/reforge/src/battle/battle-core.ts` | 2466 | 2466 |

## 2026-11-17 行动节拍修复后的来源

从 `f1a72ef4c649db5a1d75650d18a84991306d6936` 到 `b74ce91dda71a1f23494dd96ea8f49c16e29fbbd` 核对战斗会话的三处已验接线。逐段字节一致，实时来源摘要已按当前文件重新绑定。实际节拍另见 [Q2 连续行动复验](../../testing/domains/cross-phase/battle-foundation/report.md#2026-11-17-连续行动的累计节拍)。

| 文件 | 旧范围 | 现行范围 |
| --- | --- | --- |
| `packages/reforge/src/battle/battle-session.ts` | 251-253 | 251-253 |
| `packages/reforge/src/battle/battle-session.ts` | 420-432 | 420-432 |
| `packages/reforge/src/battle/battle-session.ts` | 1286-1295 | 1286-1295 |

## 2026-11-17 敌方变身后的来源

从连续行动节拍复验候选到新变身候选 `f692f6546188221f8d827346669731bbb71bc851` 逐段比较下列引用。五处接线的片段字节逐一相等，新的文件摘要应用于现行来源。实跑结果见 [Q2 敌方变身复验](../../testing/domains/cross-phase/battle-foundation/report.md#2026-11-17-敌方变身与站位)。

| 文件 | 旧范围 | 现行范围 |
| --- | --- | --- |
| `packages/reforge/src/battle/battle-session.ts` | 251-253 | 251-253 |
| `packages/reforge/src/battle/battle-session.ts` | 420-432 | 420-432 |
| `packages/reforge/src/battle/battle-session.ts` | 1286-1295 | 1286-1295 |
| `packages/reforge/src/battle/battle-core.ts` | 2466 | 2467 |
| `packages/game/src/core/battle/battle-system.ts` | 2824 | 2824 |

## 2026-11-17 绘制观察修复后的来源

从 `53f5fc147de8e987365ef7531dade6c83958ca1f` 到 `cc32d9214288e559dab6f0d47293afd438807861` 核对 `scripts/e2e/battle-reforge-instrumentation.mjs` 第 17 行的 `observeSfx` 入口，逐字节相同。场景绘制观察改在渐变分支之前插入。旧执行保留原候选，最终画帧及分屏以新采集复验。 [修后双端与反例](E2E-Q2-1-enemy-transform-pixels-20261117.tar.gz)

## 2026-11-17 角色默认合击后的来源

固定前驱 `839c6829346a53d8e5e149986d034460aba10432`，候选 `22e9bc60473ac401d94ec4f05a24d37407de13f1`。两端在有效合击执行时跳过后续队友动作，并在普通合击的死亡淡出完成后才让队伍归位。Game 回合收尾引用从 2824 到 2827，Reforge 群攻从 2467 到 2469。Reforge 选择调用从 1286–1295 到 1283–1292，两个构造期片段仍在 251–253 和 420–432。核五个片段字节并更新文件摘要，原执行和反例保留其固定候选。

## 2026-11-17 队友阵亡联动后的来源

固定前驱 `dd4bd6afd23882b8777ba8b50c3bb8d10a534d17`，候选 `8c80a0cea5c247348ab2dc73dc3ad057c15092e6`。Reforge 阵亡增益复用同一裸属性百分比与临时槽规则。群攻函数声明从 2469 移到 2465，逐字节相同，核对当前文件摘要并重绑来源。原有群攻执行与反例保留原候选。

## 2026-11-17 胜利补学仙术后的来源

固定前驱 `23c111a58d091685b556b0dc8f69e861317592e4`，候选 `798548a2573a6867496009cc5fd3c0fdfb0eb811`。核对 Reforge 练成卷轴渲染入口第 334→322 行，及共享战后半恢复入口第 254→260 行。两个声明及函数体逐字节相同。当前来源坐标随候选更新，双方既有执行与反例保留原候选。续接会话用实际来源桥分别还原 catalog、机器回执与覆盖报告的固定前驱值，另验证修改历史 claim 或当前源码会被拒绝。新的实际执行与旧版反例见[战后练成复验](../../testing/domains/cross-phase/battle-foundation/report.md#战后练成仙术返工)。

## 2026-11-18 玩家仙术按 FIRE 帧震屏后的来源

固定前驱 `087d243365e62759930c7db40787a7620da6420f`，候选 `c209d141b270a49220e6373f90ccc334de3c00bd`。战斗会话的渲染读取当前施法帧的纵向偏移。选择与构造相关的 251–253、420–432、1283–1292 三处源码片段逐字节相同，三处指针保持原坐标。catalog、现行报告和机器回执同步该候选的文件摘要，原会话声明与执行继续按历史候选读取。 [会话渲染入口](../../../packages/reforge/src/battle/battle-session.ts#L2453-L2460)

用实际桥接器还原 catalog 与机器回执的固定前驱值，修改历史断言指针或当前源码字节均由同一检查拒绝。两套受影响的文档工具测试共 86 项通过。实际震屏及分屏由剑诀批的原生像素和实战轨迹独立复验。 [剑诀验收](../../testing/domains/cross-phase/battle-foundation/report.md#2026-11-18-六种剑诀震屏与战场留痕)

## 2026-11-18 风卷残云吹飞后的来源

固定前驱 `aa999b84470b487dfff963ddcc55a90e1df84d7b`，候选 `5add3f551983e6fbd414b487396599808d163b03`。Reforge 战斗会话将预载的 FIRE 帧数交给规则层，并用后者记录的位移构建玩家施法演出。会话三处已有接线逐字节相同，分别核 251–253、420–432 → 426–438、1283–1292 → 1289–1298。既有群体物攻函数声明从 2465 移到 2490 行，内容相同。 [FIRE 帧数入口](../../../packages/reforge/src/battle/battle-session.ts#L403-L413) · [位移抽样](../../../packages/reforge/src/battle/battle-core.ts#L1385-L1405)

同步更新 catalog、现行报告和机器回执的现行来源。用桥接器还原四份固定出版物，改写旧事件、断言指针和当前源码三项反控均被拒绝。两套文档工具共 86 项通过，既有执行及反例仍对应各自的固定候选。 [本轮双端实战](../../testing/domains/cross-phase/battle-foundation/report.md#2026-11-18-风卷残云与三种攻击仙术)

## 2026-11-18 玩家处决与收妖失败分支的来源

固定前驱 `af55382a655a20b5c78095d0de52f4419d0bad71`，候选 `a32bfe1a9e90a409227638d735bd7a0457d010c2`。处决类失败沿用卷轴出口，会话构造及选招三个既有片段分别为 251–253、426–438、1289–1298，核对均逐字节相同。独立的群体物攻声明由 2490 移至 2497 行，内容相同。重绑现行 catalog、报告和机器回执中的四个来源，历次执行和已有断言继续对应各自原件。 [卷轴出口](../../../packages/reforge/src/battle/battle-session.ts#L2222-L2232) · [群体物攻声明](../../../packages/reforge/src/battle/battle-core.ts#L2497)

用实际桥接器复算四份固定出版物。改变旧历史事件、会话断言坐标和现行源码的三项反控均被拒绝。文档位置和战斗出版两套工具共 86 项通过。 [本批实战](../../testing/domains/cross-phase/battle-foundation/report.md#2026-11-18-夺魂鬼降与灵葫咒)

## 2026-11-19 耗材卷轴与混乱抖动后的来源

固定前驱 `839c1ede2ffff006b0fc67be3deb1c1674b1b303`，候选 `1d84214d2395cd12cde31b651b7a67e1412fe70a`。耗材失败用已有动作反馈在起手结束时显示卷轴。鬼降的混乱抖动从主特效清除时启用。会话选招与构造三处片段分别核 251–253、426–438 及 1289–1298 → 1290–1299，逐字节相同。另核群体物攻声明 2497 → 2500 与随机观察入口第 28 行，两处片段相同。随机观察将同一个成长标记交给提取后的公共增长函数消费。 [卷轴和抖动接线](../../../packages/reforge/src/battle/battle-session.ts#L713-L719)

用现行源码与两个固定 Git 候选复算 catalog、两份机器原件及覆盖报告的前驱值。改动历史事件、旧会话断言指针、现行随机观察源码三项反控都被拒绝。早先候选只用于原执行的恢复。 [耗材实战](../../testing/domains/cross-phase/battle-foundation/report.md#2026-11-19-三尸咒与万蛊蚀天) · [鬼降抖动实战](../../testing/domains/cross-phase/battle-foundation/report.md#2026-11-19-鬼降命中后的抖动)

## 2026-11-19 玩家仙术金钱结算后的来源

固定前驱 `1805ef135a1238b5c75d152ec643a6ff56053c1d`，候选 `a20e5e0b09ce42c8f0573c3a577f174041944de6`。选招移除了余额预检，Reforge 试打观察器分阶段记录战内实时余额及终态世界余额。下列已引用片段逐字节相同。现行摘要及坐标同步到 catalog、报告和机器回执，早先运行继续绑定原候选。

| 文件 | 旧范围 | 现行范围 |
| --- | --- | --- |
| `packages/reforge/src/battle/battle-session.ts` | 251–253、426–438、1290–1299 | 251–253、426–438、1284–1293 |
| `packages/reforge/src/battle/battle-command-selection.test.ts` | 73–96 | 72–95 |
| `packages/reforge/src/battle/battle-command-selection.ts` | 60 | 59 |
| `packages/reforge/src/battle/battle-core.ts` | 2500 | 2500 |
| `scripts/e2e/battle-reforge-adapter.mjs` | 179 | 179 |

实际桥接器复算四份出版物的固定前驱，拒绝旧历史事件、选招断言坐标和实时观察源字节三种改动。文档位置与战斗出版工具共 86 项通过。 [七组修后实战](../../testing/domains/cross-phase/battle-foundation/report.md#2026-11-19-铜钱镖与乾坤一掷)

## 2026-11-19 金蝉脱壳演出后的来源

固定前驱 `768c8de4ea02d931826e583d00dc108677adbbea`，候选 `9cba55f6b2a1432a471572921a8d32fae3718717`。同一施法时间线在使用者起手后衔接退场或禁逃卷轴。以下既有片段逐字节相同，现行摘要同步，旧原件继续按原候选读取。

| 文件 | 旧范围 | 现行范围 |
| --- | --- | --- |
| `packages/reforge/src/battle/battle-session.ts` | 251–253、426–438、1284–1293 | 251–253、426–438、1284–1293 |
| `packages/reforge/src/battle/battle-core.ts` | 2500 | 2500 |
| `packages/game/src/core/battle/battle-system.ts` | 2827 | 2828 |
| `scripts/e2e/battle-game-adapter.mjs` | 480 | 480 |

复算四份出版物的固定前驱值及历史断言。旧事件、选招断言坐标及 Game 适配器实时字节的改动均被拒绝。两套文档工具共 86 项通过。 [金蝉脱壳实战](../../testing/domains/cross-phase/battle-foundation/report.md#2026-11-19-金蝉脱壳的退场和禁逃)

## 2026-11-19 敌方仙术尾段震屏后的来源

固定前驱 `ac11b220065fbbd76cb059132bd6732ab086f998`，候选 `0b513733e659a64aef7c8eca20e6560b502d40b0`。合成器对敌方仙术尾段使用当前 FIRE 纵移。战斗会话 `251–253`、`426–438`、`1284–1293` 三处构造与选招片段同坐标逐字节相等。按现行摘要重绑，原有执行按固定候选记录。

实际来源桥复算固定前驱，拒绝修改旧事件、选招断言坐标及会话实时源字节。文档位置与战斗出版工具共 86 项通过。 [敌方四招实测](../../testing/domains/cross-phase/battle-foundation/report.md#2026-11-19-敌方风咒冰咒玄冰咒与土咒)

## 2026-11-19 战内用物后的来源

固定前驱 `89dab268613141283aa49ddb228351060607316e`，候选 `7600b4b265a47c5083535a9536d8301fe77d7b0f`。会话的构造及选招片段 `251–253`、`426–438`、`1284–1293` 逐字节相等。战斗核的群攻声明从 2500 行移到 2501 行，引用行逐字节相等。现行目录、报告和机器证据使用候选摘要，历次执行依据各自固定候选。 [用物复验](../../testing/domains/cross-phase/battle-foundation/report.md#2026-11-19-战内解毒道具和毒卵)

## 2026-11-19 隐身过渡后的来源

固定前驱 `970731da74e22ee1aa7bf661f6e5be6481d26332`，候选 `bc995df55ff2d5fdefc7c0477707b562e4fed3b4`。现行 Reforge 会话构造两处 `251–253`、`426–438` 和选招 `1298–1307` 分别与固定前驱的对应片段逐字节相等。Game 轮末入口从 2828 行移到 2844 行，声明原字节相等。旧指纹和执行原件保留，现行交叉报告、目录和机器证据绑定候选。 [隐蛊实战与过渡取样](../../testing/domains/cross-phase/battle-foundation/report.md#2026-11-19-最后六种战内道具)

## 2026-11-19 投掷抵抗卷轴后的来源

固定前驱 `55fcc99d356c1bb0332e687019b495c6eb340052`，候选 `a4a90964f8ae2b4597521c27fdc9256ee5519d13`。Reforge 战斗会话引用的 `251–253`、`426–438`、`1298–1307`，以及战斗核 `2501` 的引用内容，与固定前驱逐字节相等。现行报告、目录和机器证据更新文件指纹，历史执行仍按各自原件复算。 [同局投掷与抵抗](../../testing/domains/cross-phase/battle-foundation/report.md#2026-11-19-七种投掷道具与捆仙绳抵抗)

## 2026-11-19 寄生毒孵化旁白后的来源

固定前驱 `aa2e8d2c69c714d050e0d0ae0f684a123a968007`，候选 `cf1c8fc889711622a0cf1fe942381b0e475aecb1`。战斗会话的构造引用 `251–253`、`426–438` 字节相等。选招入口从 `1298–1307` 移到 `1305–1314`，战斗核的全体攻击声明从 2501 行移到 2506 行，两段也逐字节相等。现行目录与证据使用候选指纹，历史执行按各自原件复验。 [寄生毒与产物旁白](../../phase2/specs/content-schema.md#寄生毒与产物旁白)

## 2026-11-19 战外选人后的菜单引用

固定前驱 `0daf5f51472d793258dd8d3a331ae60e95bc881b`，候选 `8a3c6a96210b4ea4fb800b02bbd673deefe27ef5`。菜单会话所有权引用由 `105–128` 移至 `106–130`，扣除新增的上次选人槽位后与固定前驱逐字节相等。原测试片段 `9–32` 字节相等，新增用物回归位于原范围之后。目录、报告与机器证据更新这两处指纹，原执行和归属主张沿用已刊证据。 [双端选人复验](../../testing/domains/cross-phase/battle-foundation/report.md#2026-11-19-战外选人与十一件恢复道具)

## 2026-11-19 感知香修复后的世界调用引用

固定前驱 `5e3c1f59de533fa43ceed1ac052c9bcd84f1849b`，候选 `333bfeff7745597a9b9d66c52892023cd5786517`。场景、摄像机、战斗 host 和世界动作的四段入口原位且字节相等。存档恢复由 5769 移至 5784 行，WorldScenePresentation 的声明由 71–88 移至 72–89 行，展示所有权测试的 82–105 行原位。三段均逐字节相等。目录、现行正文和机器证据更新指纹及坐标。 [感知香实战](../../testing/domains/cross-phase/battle-foundation/report.md#2026-11-19-战外感知香炼化与读物)

## 2026-11-19 场景用物修复后的世界调用引用

固定前驱 `25b4d5430f7daa410cef5e91447ac02e1dc00c3d`，候选 `f3163e1da5450080e958eb9f7adc1b72dc9d83c9`。场景、摄像机、战斗 host、世界动作和存档恢复五处引用的前后片段逐字节相等。战斗 host 迁至 1286–1384 行，恢复入口迁至 5841 行。目录、现行正文和机器证据同步指纹及范围，使用既有执行原件。 [场景用物实战](../../testing/domains/cross-phase/battle-foundation/report.md#2026-11-19-引路蜂和石钥匙)

## 2026-11-19 姜清与末柱演出后的世界调用引用

固定前驱 `759886346d091f3dc2c0b67f72547c6861b81b6a`，候选 `a91f7719560e5016d8103409e06fe5eb83052d4b`。四个现行范围同步候选摘要及行号。场景、相机、战斗宿主、存档恢复声明及精灵测试片段前后逐字节相等。两个构造片段只记录震屏职责迁移，`main.ts` 新增输出层实例，`WorldScenePresentation` 移除按相机偏移的震屏字段。发布执行及其原件仍按各自固定候选恢复。 [同场复验](../../testing/domains/cross-phase/battle-foundation/report.md#2026-11-19-姜清退移与末柱倒塌复验)

## 2026-11-19 雪崖淡入后的现行调用引用

固定前驱 `abfc31fcfd9a4ef16380ef4ae054604ad6159762`，候选 `4ad644b7aae107275315336d23048665e49a38a6`。逐字节核对四项现行发布引用：场景、相机、战斗宿主、世界构造与存档恢复片段均未变化；存档恢复声明由 5833 移至 5840。实际代码只在 `hostSceneEntryReveal` 把事务起步与等待完成拆开，原战斗、状态构造及存档恢复没有改动。历史执行和原件仍按各自固定候选恢复。 [入场并行任务](../cards/PAL-ENTRY-FADE-1.md)


## 2026-11-19 分片队伍姿势来源重绑

候选 `9412d0c37b4caba5ae1997b0f85814b784ec9a5a`。单次点名姿势落在当前队员实例。核主文件入口范围逐字等同；呈现宿主范围只增加队员临时姿势表，历史执行身份与 Q2 战斗结论原样保留。读取 `aee2d69c439378a5be98b154c2b788fbfed0a594` 与候选的固定 Git 对象，核对引用坐标及出入。此处只重绑四条已出版记录的当前文件身份；末柱演出证据进入[分片卡](../cards/E2E-PILLAR-CINEMATIC-1.md)，不新增 Q2 覆盖。

同时核 `scripts/e2e/recompare-recording.mjs` 只新增末柱分片分发。007、009、010 的分发内容和正式回执原样保留。

## 2026-11-19 装备、原编队和对白淡出合入后的现行引用

固定前驱 `45e199287d99ed0e2e4ed3f0bb8dd716f6d9d335`，候选 `f23862925656b8aa85ddbcb6c342f488b7685b66`。装备会话声明迁至 107–131 行，原关闭菜单 oracle 保持 9–32 行。战斗 Game 启动、轨迹验证、Reforge 音效与回场恢复分别迁至 486、1014、18、268，Reforge 启动与视频时钟声明保持 179 和 25。活动场景、摄像机和世界运动引用原位逐字等同，战斗宿主引用迁至 1291–1389，存档恢复声明迁至 5869。开场实绘资源测试迁至 560–675。逐一核对新旧 Git 对象，受影响引用片段字节相同。各次执行继续由原候选、输入和原始归档复算。

## 2026-11-19 场景放置提示修复后的现行引用

固定前驱 `cb83b4f76a150915105121482cbef9e4edd58d58`，候选 `0cf4f7b3f4cc4d8719df96a17b4847486cd00513`。核新旧 Git 对象所引片段逐字节相等。菜单会话声明迁至 108–132 行，关闭菜单 oracle 迁至 10–33 行。场景、世界动作和战斗宿主的四个引用范围不变，存档恢复声明迁至 5878 行。原执行候选、输入、结论和原件继续按各自历史记录复算。


## 2026-11-20 桃花林原地换景后的现行引用

固定前驱 `b1d046a12de4ec4082a5acbae64be24253881990`，运行候选 `07088c58275f9d78acdfcf9562468a2cfe77236e`。桃花林的切场命令在读取目标资源前取得来源脚点和跟随轨迹。五个现行片段在两个候选中逐字节相等。活动场景与相机分别移至 417–424 和 459–466，世界运动构造移至 444–456，战斗宿主移至 1298–1396，存档恢复声明移至 5890。历史执行继续使用各自的固定候选和原件。

## 2026-11-20 战外定时叙述后的现行引用

固定前驱 `0b315ffc89248b157112ca83ebf77d557d6224ad`，运行候选 `9bea94e1c89f000d198a136884b5abe5fa864333`。归并放置受阻与其它定时叙述的关闭入口。现行活动场景、相机、世界移动、战斗宿主及存档恢复五个片段逐字节相等，依次位于 417–424、459–466、444–456、1298–1396、5883。原始验收继续绑定各自执行候选。
