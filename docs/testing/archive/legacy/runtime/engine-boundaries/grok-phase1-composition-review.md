# TEST-GROK-PRESENT-2 — Codex 独立接收复核

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 TEST-GROK-PRESENT-2 独立接收复核（首轮 e0d7511e counter 仅 P15/P16 三项定点返工→**定点返工 7a49d651 accept 三项全闭**：P15-2 只宣称预填 disabled 着色及 runtime MP 数字旧建表测试承担可用性；P15-3 合法单人目录与 roleId99 防御输入拆例；P16-1 裸数字 3 字形正断言+独立漏画 fallback 单点变异恰在目标业务断言红；正式套件首次因候选固定 Date.now=0 P15 闪烁红 Codex 时钟桩局部化后 19/19 绿；正式接入另文）。

## Scope

- 范围与复跑：diff 恰 grok-phase1-composition-r1/** 16 文件（产品/旧测试/脚本/PAL 资产/基线零 diff）；候选 18/18 passed 18 真实 title 与 ledger 逐字一致+tsc+Biome exit0；四目标生产调用均有；相邻正式四文件 177/177；四针反控独立重跑绿对照 exit0/红跑 exit1/指定标题恰一 AssertionError/生产磁盘源 SHA 前后同；check.mjs 唯一失败为父导航（归 Codex 正式接入登记非候选业务 counter）。

## Execution and assertions

- **已核通过去重表**：P11 world-layers（sLayer 只改变叠盖/透明孔/不透明索引 0/cover 前后关系+调用前像，与旧纯 Y-sort cover 几何例组合差异）；P12 overlays（波震 advanceEffects/场景 remap 后对话色保留/菜单 event 两模式+present-remap mutant 红）；P13 battle-commands（消息替换到期/对话结算叠盖/数字继续上移/清场残留）；P14 battle-fades（起中终及重复帧 intro/summon 像素/背景波补帧/精灵不位移；battle-intro 负控命中；不重领旧 death-fade 纯函数与 palette ramp）；P16 两例（直接绘制与 presentFrame 都区分头像不透明索引 0/透明孔/缺资源后正文）；P15 使用投掷共用 drawItemSelectGrid（:294-297）不强造像素差异是正确分类
- **首轮 counter 三项**：P15-2 MP 可用性由 fixture 预填非被测链算出（:77-85 手写 rightText MP 9 disabled:true；生产 :601-609 只从 runtime MP 取显示数字、:733-735 直接按 menu.items[].disabled 上色——currentMp=0 只证青色数字不证禁用语义；旧 battle-system.test:2604-2622 已覆建表）→收窄标题或真实建表入口生成 flags；P16-1 缺 UI 帧数字字形无正断言（:62-68 完全漏画字符 3 也绿；生产 dialog-box.ts:874-885 fallback 应在 textY=50 走 renderText）→对裸绘制断言 3 可见字形点+隔离单点反控 fallback 漏画业务红；P15-3 混入非现行可玩队伍防御输入（:118-131 role0 定义时放 battlePlayer(99) 把缺 role 兜底与正常 1-3 人同列；:133-154 空 item catalog 只证数量绘制）→拆明 defensive/out-of-domain 与合法正控
- **边界**：反控覆盖各目标链一个断言不能替代同组其它合同；mutants.mjs 通过唯一 needle 与业务红间接证替换但未输出独立注入见证（正式集成前可补机械见证）；Grok 自验不作独立证明；不能从候选全绿推断第一阶段呈现已无 bug；三项只允许 Grok 自有目录修测试/fixture/回执/机账不改产品旧测试

## Results

- P11-P14+P16 两例接受；三项定点 counter（MP 预填非链算/裸字形无正断言/防御输入 role99 混列）返工闭合 accept；时钟桩闪烁教训留档。

## Evidence

- 证据路径：本复核正文（quote 保全）。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| 首轮+定点返工 | 2026-09-25 | P11-P14/P16 两例接受+三项定点 | counter→accept（7a49d651） | 无 |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy runtime/engine-boundaries 的 Grok 合成复核回执；固定来源与 source SHA 见下方保全节。

## 原始结论

P11-P14+P16 立绘接受；三项定点（MP 预填非链算/裸字形无正断言/防御输入混列）返工闭合 accept；时钟桩闪烁教训。

## 当时证据

去重表、三项 counter 与边界在 quote 保全。

## 当前有效性

historical。accept 后正式接入另文。

## 继任文档

当前结论归 grok-phase1-composition-integration。

## 原文保全

固定源 revision `aebc1cb249a606a5202a7f00247c099dace0b2eb`，source SHA `c330b4821bb6b0724bbc4531a6d4a734505078aa38eca79132ecbacb50530893`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # TEST-GROK-PRESENT-2 — Codex 独立接收复核
>
> ## 定点返工 accept 与正式接入（2026-09-25）
>
> 候选 `7a49d651` **accept，首轮三项 counter 全闭**。[正式接入证据](grok-phase1-composition-integration.md)记录 Grok 19 项贡献、Codex 选择性移植及统一门禁；下方 `e0d7511e` counter 是历史，不再阻断。P15-2 只宣称预填 disabled 着色及 runtime MP 数字，旧建表测试承担可用性；P15-3 把合法单人道具目录与 roleId99 防御输入拆例；P16-1 对裸数字 `3` 的字形点有正断言，独立漏画 fallback 单点变异恰在目标业务断言红。本席复跑候选 19/19、相邻 177/177、typecheck/Biome及五针；Grok 自验不充独立证明。正式套件首次因候选固定 `Date.now=0` 而 P15 闪烁红，Codex 把时钟桩局部化后 19/19 绿，无产品/断言预期修改。任务已由 Codex 按当前模式收口，未借此宣称 full/E2E 完成。
>
> 2026-09-25。候选 `e0d7511e5bc2dbd3fde1872217ed3147a1768d0f`，基点 `bf4c51c496b9698530616749cdb142e197039b35`。结论：**counter，仅 P15/P16 的合同鉴别力与 P15 输入归属需定点返工；P11–P14 及 P16 的立绘两例接受为隔离候选证据。** 本卡仍 draft，测试尚未进入正式 game runner/覆盖率；Grok 自验不作独立证明。没有新产品缺陷复现，不能从候选全绿推断第一阶段呈现已无 bug。
>
> ## 范围与复跑
>
> - `git diff bf4c51c4..e0d7511e --name-status` 恰 `docs/testing/grok-phase1-composition-r1/**` 16 文件；产品、旧测试、脚本、PAL 资源及官方基线零 diff。工作树干净，远端 tip 与候选完整 SHA 一致。
> - Codex 独立复跑候选 Vitest JSON **18/18 passed、0 failed/pending**，18 个真实 test title 与 `ledger.json` 逐字一致；候选 `tsc -p .../tsconfig.json --noEmit` 和目录 Biome exit0。四个目标 `presentFrame`、`BattlePresent.draw`、`drawBattleUI`、`drawDialogBox` 均有真实生产调用。
> - 相邻正式四文件 177/177 passed；四针反控独立重跑，均绿对照 exit0、红跑 exit1、指定标题恰一条 `AssertionError`、生产磁盘源 SHA-256 前后相同。反控覆盖的是各目标链的**一个断言**，不能替代同组其它合同。`mutants.mjs` 通过唯一 needle 和业务红间接证明替换发生，但未输出独立注入见证；正式集成前可补该机械见证。
> - `node scripts/docs/check.mjs` 唯一失败为新候选目录尚未从父 `docs/testing/README.md` 导航；父文件不在 Grok 白名单，归 Codex 正式接入时登记，**不是候选业务 counter**。`git diff --check` exit0。本轮不跑全仓 check、官方 ratchet/strict/full 或浏览器剧情 E2E。
>
> ## 已核通过与去重
>
> | 组 | 可采信的窄证据 |
> |---|---|
> | P11 | `p11-world-layers.test.ts:28-70,73-139` 经真实 `presentFrame` 断言 sLayer 只改变叠盖、透明孔/不透明索引0及 cover 前后关系；位图尺寸/indices/opaque 和实际 world 输入有调用前像。与旧纯 Y-sort/cover 几何例有明确组合差异。 |
> | P12 | `p12-overlays.test.ts:21-150,152-188` 对波/震 `advanceEffects`、场景 remap 后对话色保留、菜单/event 两模式叠层给出精确点和成对帧。mutant `present-remap` 在目标业务点红。 |
> | P13 | `p13-battle-commands.test.ts:49-119,122-165` 钉消息替换/到期、对话和结算叠盖、数字继续上移及清场后的残留，与旧“有写入”和单条伤害测试区分。 |
> | P14 | `p14-battle-fades.test.ts:48-110,113-164,167-218` 起/中/终及重复帧的 intro/summon 像素、背景波补帧与精灵不位移；`battle-intro` 负控命中。未重领旧 death-fade 纯函数及 palette ramp。 |
> | P16（两例） | `p16-dialog.test.ts:71-105,107-156` 直接绘制和 `presentFrame` 都区分头像不透明索引0/透明孔/缺资源后的正文，已有对话状态机未被重抄。 |
>
> P15 使用/投掷在生产 `drawBattleUI` 中共用 `drawItemSelectGrid`（`draw-battle-ui.ts:294-297`），不强造一项像素差异是正确分类；`>3` 队员未作为新需求，旧调色板 ramp、death-fade 纯函数和对话状态机也未重复计数。
>
> ## 阻断 counter
>
> 1. **P15-2 的 MP 可用性由 fixture 预填，并非被测链算出。** `p15-battle-ui.test.ts:77-85` 手写 `{rightText:'MP 9', disabled:true}` 和 `{rightText:'MP 8', disabled:false}`；生产 `drawBattleUI` 在 `draw-battle-ui.ts:601-609` 只从 runtime MP 取**显示数字**，在 `:733-735` 直接按 `menu.items[].disabled` 上色。因此四针中的 `currentMp=0` 只证明青色现行 MP 数字，不能证明“MP 8 使需求 9 禁用、需求 8 可选”。旧 `battle-system.test.ts:2604-2622` 已覆盖建表 MP 不足。返工可将标题/README/机账收窄为“预先建好 disabled 菜单的着色 + runtime MP 数字”，并精确引用旧建表证据；若保留跨链主张，则让真实 battle 菜单建表入口生成这两个 flags 再绘制。
> 2. **P16-1 缺 UI 帧的数字字形没有正断言。** `p16-dialog.test.ts:62-68` 只证明无框、`(176,54)` 不是黄色数字，以及“甲”在 `(160,50)`；即使无 UI 帧时**完全漏画字符 `3`**也会绿。生产 `dialog-box.ts:874-885` 的 fallback 应在 `textY=50`、数字起点附近走 `renderText`。对同一裸绘制输入断言 `3` 的可见字形点，再用隔离单点反控令 fallback 数字漏画而业务红；保持现有“有 UI 帧用黄 sprite”正控不变。
> 3. **P15-3 混入非现行可玩队伍的防御输入。** `p15-battle-ui.test.ts:118-131` 在只有 role0 定义时放入 `battlePlayer(99)`，把缺 role 的兜底与正常 1–3 人呈现同列为业务例；`:133-154` 的菜单项 id1 又配空 item catalog，只证 `rightText` 的数量绘制。若保留这两臂，拆明 `defensive/out-of-domain` 与合法目录/正常队伍正控，不把 role99 说成玩家可组队状态；否则移除该防御子例。无需因防御分支写新玩法。
>
> 这三项只允许 Grok 在自有目录修测试/fixture/回执/机账，不改产品或旧测试。验收重点是 P15 标题与实际输入/消费者同义、P16 裸字形漏画负控变红、P15 防御输入的合法归属。其余已闭 P11–P14/P16立绘不重开。正式接入、父导航、全仓质量门和统计并集归 Codex；不代签、不标 done。
>
<!-- original-source-quote:end -->
