# Cursor地图六组：4dc8fb75窄返工接收

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 TEST-CURSOR-MAP-LOGIC-2 r2 窄返工接收（2026-09-27，候选 4dc8fb75…4a5c 本地/远端一致）：**counter，仅剩 CM1 的计划/patch 输入保真**；不合候选不计覆盖，本轮只提交本席证据不改 Cursor 测试语义。

## Scope

- 已接受不重开：CM1 原两针（draft-move 5 绿/1 红、selection-reducer 2 绿/3 红——真实 draft/state/action 快照已补）；CM2（M4 真实双组目标/成员/高度/碰撞/原格清理/未选哨兵已落；stamp-group-lost-height 3 绿/1 红；删重复 copy 例总数 30→29 允许正确去重）；CM3（judge 拒三种混错+17 项自测+六对照/六针独立通过；M6 收窄公开 owner 查询）；CM4（blank-project→正式 loader→toEditorState 三 map 守卫及 manifest 通过 id=map-logic/content20/SAVE8，不扩大为完整保存/资产闭包）；候选带入的本席旧审查正文与 b4cea56f 逐字一致不计 Cursor 新增；七测试/fixture 外无 packages 增量。

## Execution and assertions

- **唯一残项 CM1**：上轮已明确「传入计划/地图/剪贴板不应被原地改写」，本轮规划后和应用后只比较原 map 仍未比较实际交给 Command 的 plan——计划携带 mapRevision 及 preparedPatch，结果地图正确不等于计划输入保真；本席唯一加载层变异：M4 stamp-group-transform:67/142（stamp-group-command.ts:256 消费 preparedPatch 时给原 plan.mapRevision 加 1）候选 4/4 仍绿、独立 oracle 原实现 5 绿变异 4 绿/1 AssertionError（revision 1 不等于 0）；M5 stamp-placement:114 同一 structuredClone 入口前加 1——4/4 仍绿 oracle 同；两针均不改成功地图只暴露原计划被污染；原函数/候选/fixture hash 不变；M6:98 同一命令入口亦应补；M3 map-transform:79/139 与 M5:86 实际交给 applyPlanPatch 的 patch/requiredWritableLayerIds 也未比较应一并完成原 CM1
- **最小修订**：在原用例中先独立 structuredClone 实际 plan，构造 Command 后及 dispatch 后立即比较同一 plan；patch/权限数组同样；薄断言助手可复用但必须捕捉调用前对象，不能拿应用后的值再快照或自比较；新返回 map 允许变化 EditSession 会推进，不对这两者强加错误全对象不变合同；不要求新增数量/矩阵不重开 CM2-CM4
- **复跑**：背景 6 文件 29 项；更宽定向/相邻 19 文件 117/117（29 新+88 旧——额外含 stamp-placement-command 7+mutation 6 不记为作者新增）；全 editor 359 文件 3,048/3,048；TC 零；15 文件 Biome 0/0/0/0 截断；原三针×四跑正控绿候选变异与 oracle 变异均业务红；新两针×四跑候选变异仍绿 oracle 各一红；适配器只适配 async 工厂与 oracle 回调不改原三处变异/判据；四组临时目录与 /tmp 日志清单在 quote；未跑全仓 check/官方 coverage/浏览器/6010

## Results

- 可直接转发 Cursor 的提示词全文在 quote（只闭 CM1、复跑两见证工具、静态零诊断、推送 SHA 交 Codex 统一门禁集成清理）。

## Evidence

- 证据路径：本回执正文（quote 保全）；机账与两个见证工具链接在 quote。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| r2 窄返工接收 | 2026-09-27 | CM2-CM4 接受+CM1 plan 保真反证 | counter（仅 CM1） | r1 counter |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy content/authoring-and-runtime 的 Cursor 地图 r2 接收回执；固定来源与 source SHA 见下方保全节。

## 原始结论

counter 仅 CM1：加载层变异给原 plan.mapRevision 加 1 候选仍绿 oracle 红——结果地图正确不等于计划输入保真；M3/M5 patch 与权限数组一并完成。

## 当时证据

CM1 变异表、最小修订与复跑数字在 quote 保全。

## 当前有效性

historical。counter 由集成回执闭合（be9a8636）。

## 继任文档

当前结论归 TEST-CURSOR-MAP-LOGIC-2 完成卡。

## 原文保全

固定源 revision `226f8cb90880b74c82f3c39b6e09d949f2a16e7b`，source SHA `200ea3fba477788737efeba384197c8a1b463f20b82b40ecd38bae80b14070dc`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # Cursor地图六组：4dc8fb75窄返工接收
>
> 2026-09-27，Codex复核`4dc8fb758f46de5c291fc45397d74255972e4a5c`（本地/远端一致），
> 结论 **counter，仅剩CM1的计划/patch输入保真**。
> [任务卡](../../../../../ops/archive/tasks/done/TEST-CURSOR-MAP-LOGIC-2-selection-stamps.md) /
> [上轮要求](cursor-map-logic-r1-review.md) / [机账](../../editor/authoring-and-runtime/cursor-map-logic-r2-review-evidence.json)。
> 不合候选、不计覆盖；本轮只提交本席证据，不改Cursor测试语义。
>
> ## 已接受，不重开
>
> - **CM1原两针**：draft-move-input-mutation现候选5绿/1业务红；selection-reducer-input-mutation
>   现2绿/3业务红。真实draft/state/action快照已补，原漏洞关闭。
> - **CM2**：M4真实双组目标/成员、高度3与2、碰撞0与2、原格清理、未选普通哨兵tile9/height1/collision6
>   已落；stamp-group-lost-height现候选3绿/1业务红。删去重复copy例，单组copy沿用旧证明；多组delete
>   明确只声明另一组保真。M5完整三通道patch与实际应用值通过。新例总数从30减为29，允许正确去重。
> - **CM3**：本席直接抽候选真实judge，对无缩进/空格/tab三种混错均拒绝；作者17项判据自测和六对照/六针
>   独立通过。M6已收窄为公开owner查询，不再宣称删除inherit缓存就应变红。
> - **CM4**：EditorState改用blank-project→正式loader→toEditorState；本席await实际工厂后，三map守卫及
>   manifest startup均通过（id=map-logic、content20/SAVE8）。不扩大为完整保存/资产闭包验证。
> - 候选额外带入的本席旧审查正文/机账/见证与`b4cea56f`逐字一致，是既有审查上下文，不计Cursor新增成果；
>   board/index仅同步rework上下文。后续集成由Codex保留主线最新看板及QUALITY-ZERO后的工具版本，不用旧文件覆盖。
> - 七个测试/fixture源文件以外无packages/scripts候选增量，生产六模块/旧测试/配置/基线不变。
>
> ## 唯一残项CM1：执行前后未比较传入的plan/patch
>
> 上轮CM1已经明确“传入计划/地图/剪贴板等不应因此被原地改写”。这轮在规划后和应用后只比较原map，
> 仍未比较**实际交给Command的plan**。计划携带mapRevision及preparedPatch，结果地图正确不等于计划输入保真。
>
> | 位置 | 本席唯一加载层变异 | 候选 | 独立oracle |
> |---|---|---|---|
> | M4 `stamp-group-transform.background.test.ts:67/142` | `stamp-group-command.ts:256`消费preparedPatch时给原plan.mapRevision加1 | 4/4仍绿 | 原实现5绿；变异4绿/1 AssertionError，revision 1不等于0 |
> | M5 `stamp-placement.background.test.ts:114` | `stamp-placement-command.ts`同一structuredClone入口前给原plan.mapRevision加1 | 4/4仍绿 | 原实现5绿；变异4绿/1 AssertionError |
>
> 两针均不改成功地图，只暴露原计划被污染；原函数/候选/fixture字节hash不变。见
> [计划实参见证](../../../../domains/content/authoring-and-runtime/tools/map-r2-plan-witnesses.mjs)，不是新业务域、不是宣称生产现在有该缺陷。
> M6 `stamp-ownership.background.test.ts:98`的同一命令入口亦应补同样保护。
> M3 `map-transform.background.test.ts:79/139`、M5 `stamp-placement.background.test.ts:86`实际交给
> `applyPlanPatch`的patch/requiredWritableLayerIds也未作应用前后的输入比较；应一并完成原CM1，不只迎合两针。
>
> 最小修订：在**原用例**中先独立structuredClone实际plan，构造Command后及dispatch后立即比较同一plan；
> 对实际patch/权限数组同样比较。可在薄断言助手中复用，但必须捕捉调用前对象，不能拿应用后的值再快照或自比较。
> 新返回map允许变化，EditSession本身会推进，不对这两者强加错误的全对象不变合同。
> 没有要求新增测试数量/矩阵，也不重开已接受的CM2–CM4。
>
> ## 本席复跑
>
> - 背景6文件29项；更宽定向/相邻19文件117/117（29新+88旧）。相比作者17/104，额外含
>   stamp-placement-command7项与stamp-placement-mutation6项，不把该13项记为作者新增。
> - 全editor359文件3048/3048；editor TC零诊断；15文件Biome **0error/0warning/0info/0截断**；docs/diff通过。
> - 原三针×四跑全部正控绿、候选变异与oracle变异均业务红；新两针×四跑各候选变异仍绿、oracle各一业务红。
>   [原针适配器](../../../../domains/content/authoring-and-runtime/tools/map-r2-review-witnesses.mjs)只适配async工厂与oracle回调，不改原三处变异、判据或旧工具。
> - 原三针目录`codex-cursor-map-review-TCDffb`，judge/fixture目录`codex-cursor-map-runner-S5D0O2`；
>   计划残项`codex-map-r2-plan-3nJpnj`；作者工具`cursor-map-logic-r2-mutants-VeVW52`，完整绝对路径见日志/机账。
> - `/tmp/codex-cursor-map-r2-{directed,editor,tc,mutants,witnesses,plan-witnesses}.log`；新鲜directed/editor JSON与
>   Biome完整JSON同前缀。未跑全仓check/官方coverage，不启动浏览器，6010未操作，原WIP未改。
> - 适配器补唯一替换自检后复跑原三针，结果相同，记录`/tmp/codex-cursor-map-r2-witnesses-final.log`；
>   并非失败重试取多数。主线新增审查工具/文档也通过全仓严格lint零诊断与docs/diff门。
>
> ## 可直接转发给Cursor
>
> 在codex/cursor-map-logic-r2原工作树，以4dc8fb75只闭CM1的plan/patch输入保真残项。
> 先fetch，读origin/main本文与机账；CM2/CM3/CM4及原三针已接受，不重开、不加新业务矩阵。
> 在现有M3/M4/M5/M6调用路径，对实际交给applyPlanPatch/TransformStampPlacementsCommand/PlaceStampCommand的
> plan、patch及权限数组调用前独立深快照，构造/应用后立即比同一输入；保持返回map可变与EditSession推进合同。
> 复跑Codex cursor-map-r2-plan-witnesses.mjs（两个变异须候选自身AssertionError红、正控绿）及
> cursor-map-r2-review-witnesses.mjs（原三针仍抓住）；不改Codex工具或产品来过门。
> 复跑原定向/相邻/TC/15文件Biome/docs/diff/六代表反控；error/warning/info必须零。
> 回执只写实际提交树已完成内容，提交推送完整SHA。产品/旧测试/基线不改，不跑全仓coverage、不合main、不标done。
> 通过后由Codex统一门禁、集成推送与清理，无需固定AI席位签字。
>
<!-- original-source-quote:end -->
