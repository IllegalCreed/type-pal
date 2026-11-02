# C3 - 装备结构化编辑器 + 数值单一真相源(desc 去脱节)

Status: done(编辑器侧 ⚠️→✅;引擎详情框派生显示落地。整体 C3 引擎列仍留用户观感验收)
Owner: Opus(用户拍板:装备说明回归风味,数值一律派生自 effects)
Reviewer: 用户(方向拍板 + 观感待手动复验);Codex/GLM 补签可选
Phase: phase2
Capability: C3 装备(能力地图)
Last reviewed: 2026-10-18
Governance Owner: Codex（历史卡文档治理；不代签原执行）
Template: task-card-v1 / 1.0.0

本卡是装备说明与数值脱节的根治历史卡：用户点破 desc 手写「+14 武术」与 equip.effects 脱节，定案说明只写风味、数值一律从 effects 派生，单一真相源=equip.effects；含编辑器结构化与运行时详情框同一文案源。

## 目标

desc 去脱节：content 唯一效果文案出处 describeEquipEffects（属性/上限/抗性并一行全角空格分隔、攻击全体/常驻/授技能/回合回复各一行、抗性照原版灵珠「避X率+N%」措辞，5 单测）；编辑器装备段 JSON→结构化+「玩家看到」只读派生预览；运行时详情框三处共用同一源；详情框 >3 行自动上滚。

## 范围

- 范围内：item.ts describeEquipEffects、ItemTab 结构化（可装备开关/槽位/角色勾选/效果链）、item-list.ts 详情框、pal 种子一次性剥 105 件装备 desc 手拼效果文本（土灵珠散文抗性单独手修，仅动 desc 字段）、>3 行 marquee 上滚。
- 范围外：use/throw 结构化（另开）；迁移器 item 翻译仍把效果烘进 desc——种子洗了但迁移器未改，MG2 前严禁重跑。

## 前提与证据

派生比旧 desc 更完整：长鞭「玩家看到」含旧 desc 漏掉的攻击全体。装备菜单绿色语义核对：绿=已装备件 id 仍在列表，木剑变绿截图为测试塞重复件假象非 bug。
- 当前状态：done（历史终态；引擎列观感留用户）

## 验收

原卡记录：pnpm check 全绿（新增 content 5 测）；编辑器 6010 长鞭实测（风味+三行结构化+派生预览，截图 c3-editor-changbian.png）；运行时 6051 铁剑静态两行+土灵珠 5 行上滚滚出「避土率+50%」「习得·山神」（截图 c3-runtime-tiejian/c3-scroll-a,b.png）。本页未复跑。本页治理验收：quote 字节保全与模板合同。

## 状态与交接

遗留：引擎 C3 列转 ✅ 仍待用户游戏内装备系统整体观感验收；迁移器待 MG2 时同步只出风味 desc。本页治理不重开。

## 历史范围

选择器铁律「先闭合半 done 格」窗口（原卡未单列日期，按其实测记录时点读取）；固定源 bb7b1d24e9e517e09730282b104ce51b4204cb0b。2026-10-17 R42 泛化封套，2026-10-18 S15 改写。

## 原始结论

`Status: done`：装备数值单一真相源（effects 派生）全链落地并实测；迁移器同步留 MG2。原卡全文在下方 quote 保全。

## 当时证据

describeEquipEffects 5 单测、6010/6051 实测截图、种子 diff 仅 desc 字段。本页治理未新增执行。

## 当前有效性

historical。装备文案现行形态以当前 content/editor/reforge 代码为准；观感验收归用户当时。

## 继任文档

use/throw 结构化若需要另开卡；迁移器同步归 MG2 窗口。

## 原文保全

固定源 revision `bb7b1d24e9e517e09730282b104ce51b4204cb0b`，source SHA `57744b1d07d54843600d5b95ae3423c9509e26187f9ac34c338506011afc3ea1`；下方 quote 逆回读规则：直接逐字节相等（逐行剥 "> " 或空行裸 ">"，零额外变换）。
<!-- original-source-quote:start -->
> # C3 - 装备结构化编辑器 + 数值单一真相源(desc 去脱节)
>
> Status: done(编辑器侧 ⚠️→✅;引擎详情框派生显示落地。整体 C3 引擎列仍留用户观感验收)
> Owner: Opus(用户拍板:装备说明回归风味,数值一律派生自 effects)
> Reviewer: 用户(方向拍板 + 观感待手动复验);Codex/GLM 补签可选
> Phase: phase2
> Capability: C3 装备(能力地图)
>
> ## 目标(达成)
> 选择器铁律「先闭合半done格」→ 挑 C3(引擎装备效果全链已通,编辑器只剩 JSON 手编)。
> 用户点破核心病:**说明 desc 手写「+14 武术」与实际 `equip.effects` 脱节**——改数值,说明那行死
> 文本不跟着变,谁都不是权威。定案:**说明只写风味介绍,数值一律从 effects 派生显示**,单一真相
> 源 = `equip.effects`。
>
> ## 落地(4 处 + 1 收口)
> 1. **content** `describeEquipEffects(effects, {skillName?})`(item.ts)——唯一效果文案出处。
>    数值(属性/上限/抗性)并成一行、全角空格分隔(照原版密度);攻击全体/常驻状态/授技能/
>    回合回复各占一行。抗性照原版灵珠措辞「避X率+N%」。5 单测钉死(含长鞭 attackAll、负数、
>    授技能查名回退 id、纯剧情空数组)。
> 2. **编辑器 ItemTab**:装备段 JSON → 结构化(可装备开关/槽位下拉/可装角色勾选/效果链增删改
>    排序,照 SkillTab `.ef-row` 范式);说明框正名「介绍(风味)」;底部「玩家看到」只读派生
>    预览(所见即所得,= 游戏里显示)。use/throw 仍留 JSON(本切片只碰装备)。
> 3. **运行时**详情框(item-list.ts,装备/使用/装备菜单三处共用):风味 desc + 派生效果行,
>    同一 `describeEquipEffects` 源。grantSkill 显技能名(main.ts 传 `project.skills[id].name`)。
> 4. **pal 种子**(items.json):一次性剥掉 105 件装备 desc 尾部/行内手拼效果文本(现由 effects
>    派生);土灵珠散文抗性单独手修;仅动 desc 字段(diff 干净)。
> 5. **详情框 >3 行自动上滚**(用户要求):灵珠系风味长 + 派生多,静态放不下 → 裁剪到可见区
>    垂直无缝 marquee 上滚,机制行(避X率/习得·X)保证全看得到。≤3 行静态不变。
>
> ## 验证
> - ✅ pnpm check 全绿(shared/content/migrate/reforge/pal-extract/game/editor 全过;新增 content 5 测)。
> - ✅ 编辑器(6010 pal)实测:长鞭 → 介绍只剩风味、效果三行结构化、「玩家看到」= 武术+20　身法+20 /
>   攻击全体(**含旧 desc 漏掉的攻击全体**,派生更完整)。截图 c3-editor-changbian.png。
> - ✅ 运行时(6051 pal)实测:铁剑详情框 = 风味2行 + 派生「武术+10　防御+3」(静态);
>   土灵珠(5行)自动上滚,滚出「避土率+50%」「习得·山神」(技能 id 336→名解析、避X率照原版)。
>   截图 c3-runtime-tiejian / c3-scroll-a,b.png。
> - ✅ 装备菜单绿色语义核对:绿 = 已装备件的 id 仍出现在列表(正常仅灵珠这类「可装+可用」在使用
>   菜单绿)。截图里木剑变绿 = 测试往背包塞了与身上同 id 的重复件的假象,非 bug。
>
> ## 遗留 / 交接
> - 引擎 C3 列转 ✅ 仍待用户游戏内装备系统整体观感验收(装上/卸下/效果生效手感)。
> - 迁移器(@type-pal/migrate)item 翻译仍会把效果文本烘进 desc:一次性洗了种子,但**未改迁移器**
>   (重跑 gated,MG2 前严禁重跑)。待 MG2 落地时同步迁移器只出风味 desc,种子与迁移器才彻底一致。
> - use/throw 结构化编辑未做(本切片聚焦装备;若作者要,另开)。
<!-- original-source-quote:end -->
