# C3 - 装备结构化编辑器 + 数值单一真相源(desc 去脱节)

Status: done
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: task-card-v1 / 1.0.0

本页把已关闭 ops 任务卡接入 `task-card-v1`，并追加 `archive-record-v1` 历史边界。原始状态、日期、证据、counter、链接和未决项在 quote 中保全；历史 done 不自动授权当前 build、runtime、E2E、视觉或 coverage。

## 目标
- 保留原任务的目标、完成边界、历史结论和用户可见适用范围。

## 范围
- 当前包含：原卡声明的实现/测试/证据范围及其历史限制。
- 明确不包含：本次迁移不修改产品源码、旧测试、真实数据或历史结论。

## 前提与证据
- primary source：固定 source revision `bb7b1d24e9e517e09730282b104ce51b4204cb0b` 与原卡全文。
- 合法输入、caller、证据和 counter：按原文 quote 解释；本次不重跑原执行。
- 事实权：当前 task card、代码、consumer 和新 receipt；历史卡不单独证明当前行为。

## 验收
- 原卡历史验收、失败、blocked、rework 和未执行边界保持原样。
- 本次迁移验收：source/after SHA、quote inverse、模板章节、链接和历史 overlay 通过。
- runtime/E2E/视觉/coverage：本次均未执行，信用为 0。

## 状态与交接
- `status`: done（历史快照）；当前工作不得从 quote 中自动获得 build 授权。
- Owner/provenance：原卡保留于 quote；当前文档治理 owner 为 Codex。
- 下一步：若需重新启用，创建当前 task card，重新核 primary source、合法输入、business oracle 和独立验收。

## 历史范围
- 原始日期、版本、阶段：源文档固定于 `bb7b1d24e9e517e09730282b104ce51b4204cb0b`；本轮为 2026-10-17 R42。
- 归档原因：已关闭任务记录只作为时点事实保留，避免历史状态冒充当前事实。

## 原始结论
- `Status: done(编辑器侧 ⚠️→✅;引擎详情框派生显示落地。整体 C3 引擎列仍留用户观感验收)`；原始任务语义完整保留于下方 quote。

## 当时证据
- 原始命令、产物、SHA、签字、counter、链接和状态保留于 quote。

## 当前有效性
historical。do not promote historical task card to current runtime/E2E/visual/coverage acceptance
- 历史冲突/未决：需由当前 task card、consumer 和新证据重新复核。

## 继任文档
- 当前 canonical 文档：当前任务卡、当前代码/consumer 和 fresh receipt。
- supersedes / superseded-by：替代 governed-legacy 的未分层呈现；原卡内容不删除。
- 若重新启用的复核条件：合法输入重跑、业务 oracle 可证伪、独立 review 和全量静态门通过。

## 原文保全
固定源 revision `bb7b1d24e9e517e09730282b104ce51b4204cb0b`，source SHA `57744b1d07d54843600d5b95ae3423c9509e26187f9ac34c338506011afc3ea1`；下方 quote 可逆回原始 UTF-8 字节。
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
