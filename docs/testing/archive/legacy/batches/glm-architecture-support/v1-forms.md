# V1 · 表单视觉/交互取证（ARCH-SUPPORT-GLM-1）

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 ARCH-SUPPORT-GLM-1 V1 表单取证（2026-09-25 r2 返工同日，冻结 3270473862；In-app Browser 实际看图、1440×1024 与 768×1024、6013 独立实例、工程只读；浏览器内核/缩放/DPR 如实未测量——视觉结论收窄为 CSS px 布局观察）。含 r2 三条更正：撤回「过滤输入无可访问名」（multi-select.tsx:119-121 有 aria-label=搜索${label}，Codex 6010 实测过滤生效）、撤回「语义不一致请产品裁决」（逐击即提交=DS-C.5a 离散动作+Esc=DS-C.6 合同，与 quick-trial 草稿替换是两类控件合同）、补齐 r1 未覆盖六页（v1-06~v1-11 实际执行）。

## Scope

- 覆盖对象：BattleSimulatorWorkbench 试打方案+我方预设、物品/技能+效果链/敌队五槽/战场编辑、TrialDialog 敌队试打弹窗（Esc 已验证）、ActorMode 角色四 tab。

## Execution and assertions

- **证据链 V1-01~11**：试打方案（字段左对齐/三选择器同行等高/动词按钮/间距均匀符合 DS-F.4）、我方预设（3/3 上限/stepper 四列等宽/装备派生值/危险色移出）、技能多选弹层（悬浮无遮挡/全选清空计数/焦点环）、改选→Esc→重开（即时提交已选 6 项+状态条未保存——合同确认非风险）、768 降级（两列网格/菜单收纳）；r2 补：角色 8 位列表四 tab、物品四按钮组+买卖价 stepper、战斗技能基础字段+效果链行编辑（预览黑块=资源缺口）、敌队五槽拖柄+战后结算、战场常驻波动+五灵修正五 stepper、敌队试打弹窗三键 Esc 关闭快照复核；11 条全部 covered（布局层）
- **分类条目（r3 与机账对齐四条无 005）**：V1-001 covered 布局/间距/文案/状态色符合现行设计系统；V1-002 covered（r2 撤回两条 risk 合并）：多选弹层合同=DS-C.5a+DS-C.6；过滤输入有 aria-label——旧两条结论撤回，无 placeholder 保留为可发现性小建议；V1-003 covered（=r2 补齐六张新截图：v1-06~11）；V1-004 N/A（360px 既有边界未测不提新要求）
- **复验矩阵**：1440 simulator/schemes·allies；768 simulator/allies 两列；任意宽度技能多选弹层（全选/清空/Esc/即时提交）

## Results

- 未证风险：各数据 Tab 完整表单矩阵未逐字段走查（每页主表单布局层已覆盖）；弹层键盘过滤行为本轮未输入验证（accessible name 缺失已撤回，Codex 6010 过滤生效引用保持）；战斗形象预览黑块与战场背景错误横幅为已知资源缺口不判布局缺陷。

## Evidence

- 证据路径：本报告正文（quote 保全）；11 张截图（/tmp 不入 Git）按证据链表登记。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| V1 表单取证 | 2026-09-25 | V1-01~11+r2 三更正 | 四条目 covered×3+N/A×1 | intake counter |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy batches/glm-architecture-support 的 V1 表单取证；固定来源与 source SHA 见下方保全节。

## 原始结论

11 条证据链全 covered（布局层）；r2 撤回两条旧 risk（有 aria-label/两类控件合同）+补齐六页；视觉结论收窄 CSS px。

## 当时证据

证据链表、分类条目、复验矩阵与未证风险在 quote 保全。

## 当前有效性

historical。取证按冻结 3270473862 时点。

## 继任文档

当前结论归 ARCH-SUPPORT-GLM-1 任务卡。

## 原文保全

固定源 revision `5cd599bd28c6aaa67d61e00479bb5379099b9157`，source SHA `54d14d6253963b378de2569e606196aeff45ff56a5ade68bc61b40b2d3482ab3`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # V1 · 表单视觉/交互取证（ARCH-SUPPORT-GLM-1）
>
> 日期 2026-09-25（r2 返工 2026-09-25）。冻结 SHA `3270473862…`。浏览器：ZCode In-app Browser（**实际看到了全部截图画面**）；
> viewport 1440×1024 与 768×1024；dev 6013（包内独立实例）；工程数据只读（磁盘核验 `git status` 零改动，
> 会话内临时改动经刷新丢弃，未保存任何工程）。浏览器内核版本/页面缩放/DPR **如实未测量**——视觉结论
> 收窄为 CSS px 布局观察。
>
> > **r2 返工更正（Codex intake counter 0e751efe）**
> > ① **撤回"过滤输入无可访问名"**：`design-system/multi-select.tsx:119-121` 有
> > `aria-label=搜索${props.label}`（实际 AX 名"搜索指定技能"），Codex 在 6010 实测输入"气疗"过滤生效、
> > Esc 回触发器——r1 的 ARIA 快照判读有误。无 placeholder 保留为独立可发现性小建议。
> > ② **撤回"语义不一致请产品裁决"**：多选"逐击即提交"正是 DS-C.5a（editor-design-system.md:686）
> > 允许即时提交的离散动作（checkbox）；Esc 关选择层是 DS-C.6（:312）合同——与 quick-trial 整份草稿
> > 替换（App.leave-guard.test.tsx:199）是**两类控件合同**，不需要产品裁决。
> > ③ **补齐 r1 未覆盖页**（本次执行，实际看图）：角色 v1-06、物品 v1-07、战斗技能+效果链 v1-08、
> > 敌队五槽 v1-09、战场 v1-10、敌队试打弹窗 v1-11（Esc 关闭已验证）。画布/预览黑块为已知资源缺口。
>
> ## 覆盖对象（工作包定义 ↔ 实际路径；r3 更新——r1 未覆盖页已全部补齐）
>
> - **BattleSimulatorWorkbench/Forms**：试打方案页 + 我方预设页（`?module=simulator`）；
> - **物品/技能/敌队/战场编辑**：r3 补齐——物品工作区（v1-07）、技能工作区含效果链（v1-08）、
>   敌队五槽（v1-09）、战场编辑（v1-10），另有战斗模拟器内的战场/音乐/金钱/技能多选/装备选择器实测；
> - **TrialDialog**：r3 补齐——敌队页"试打"按钮打开弹窗（v1-11），Esc 关闭经快照复核；
> - **ActorMode**：r3 补齐——角色工作区四 tab 表单（v1-06）。
>
> ## 证据链（进入路径 → 对象 → 操作 → 实际/预期 → 截图）
>
> | # | 操作链 | 实际（截图判读） | 结论 |
> |---|---|---|---|
> | V1-01 | 菜单 战斗模拟器→试打方案 | `/tmp/glm-arch-visual/v1-01-battle-sim-scheme.png`：名称/说明字段左对齐、配置来源三选择器同一行等高、本场条件分区（选择器+stepper+复选）、按钮全为动词命名、无 `…` 结尾文案、间距均匀 | **covered**（符合 DS-F.4 间距阶梯与文案规范） |
> | V1-02 | 战斗模拟器→我方预设 | `v1-02-battle-sim-party.png`：3/3 队员上限提示、属性 stepper 四列网格等宽、装备选择器四列、开战有效值面板（含装备派生值）、危险动作"移出队伍"用危险色 | **covered** |
> | V1-03 | 点开"指定技能"多选弹层 | `v1-03-skill-multiselect-dialog.png`：弹层悬浮表单之上无错位遮挡；全选/清空 + "已选 N 项"计数 + 复选列表；顶部过滤输入聚焦有焦点环 | **covered**（布局；r3 更正——过滤输入有 `aria-label=搜索${label}`，无 accessible name 的旧结论已撤回） |
> | V1-04 | 弹层内改选→Esc→重开 | `v1-04-esc-cancel-fidelity.png`：改选已即时提交（已选 6 项、开战有效值含还魂咒、状态条"未保存改动"）；**Esc 仅关闭弹层**——即 DS-C.5a 离散动作即时提交 + DS-C.6 选择层 Esc 合同的正常行为（r3 更正：不是待产品裁决的风险，与 quick-trial 草稿模型是两类控件合同） | **covered**（合同确认） |
> | V1-05 | 768×1024 我方预设 | `v1-05-party-768.png`：属性行降为两列、装备选择器单列、无截断/横向滚动；菜单栏收纳为 文件/编辑/视图/导航 | **covered**（规范支持宽度内的可执行复验） |
> | V1-06 | `?module=actor&page=workspace`（r2 补） | `v1-06-actor-forms.png`：角色 8 位列表、四 tab（总览/战斗与成长/关系与脚本/外观资源）、身份/外观/基础能力分区对齐、右侧摘要 | **covered**（布局层） |
> | V1-07 | `?module=item&page=workspace`（r2 补） | `v1-07-item-forms.png`：图标资源四按钮组、买卖价 stepper、商店可收购复选、装备/使用能力开关 | **covered** |
> | V1-08 | `?module=battle&page=workspace`（r2 补） | `v1-08-battle-forms.png`：技能基础字段（目标/三耗/一生限用/战外可用）+ 效果链行编辑+变形形象预览（预览黑块=资源缺口） | **covered**（布局层） |
> | V1-09 | `?module=battle&page=enemy-team`（r2 补） | `v1-09-enemy-team-forms.png`：五槽阵容编辑（拖柄+上下移）、战后结算摘要（经验/金钱/收狐值） | **covered** |
> | V1-10 | `?module=battle&page=battlefield`（r2 补） | `v1-10-battlefield-forms.png`：身份与背景（预览黑块+资源错误横幅）、常驻波动 stepper、五灵修正五 stepper | **covered**（布局层） |
> | V1-11 | 敌队页"试打"按钮→弹窗→Esc（r2 补） | `v1-11-trial-dialog.png`：选择方案/到模拟器详细配置/开始试打三键、Esc 关闭已快照复核 | **covered**（TrialDialog 合同） |
>
> ## 分类条目
>
> **r3 条目与机账逐 ID 对齐（四条，无 V1-005）**：
>
> - **V1-001 covered** V1-01/V1-02/V1-05：表单布局、间距、按钮文案、状态色符合现行设计系统
>   （`docs/phase2/specs/editor-design-system.md` DS-F.4 阶梯与 §文案 规则）。
> - **V1-002 covered（r2 撤回两条 risk 合并为本条）** 多选弹层合同 = DS-C.5a 即时提交离散动作 +
>   DS-C.6 Esc 关选择层（规范条款比对，见顶部更正②）；过滤输入有 `aria-label=搜索${label}`
>   （multi-select.tsx:119-121，Codex 6010 实测 AX 名与过滤一致）——"无可访问名"与"语义待裁决"两条
>   旧结论均撤回；无 placeholder 保留为独立可发现性小建议。
> - **V1-003 covered（= r2 补齐的六张新截图，与机账同 ID）** 角色 v1-06、物品 v1-07、战斗技能+效果链
>   v1-08、敌队五槽 v1-09、战场 v1-10、敌队试打弹窗 v1-11（打开→Esc 关闭验证）。布局层 covered；
>   画布/预览黑块 = 已知资源缺口（不判布局缺陷）。
> - **V1-004 N/A** 360px 只记录既有边界（V0/工作包纪律），未测，不提新要求。
>
> ## 复验矩阵（可执行）
>
> | 宽度 | 页面 | 预期 | 复验入口 |
> |---|---|---|---|
> | 1440×1024 | simulator/schemes·allies | 见 V1-01/02 截图 | dev 6013 + 本报告截图 |
> | 768×1024 | simulator/allies | 两列属性网格 | v1-05 |
> | 任意 | 技能多选弹层 | 全选/清空/Esc 关闭、即时提交 | V1-03/04 |
>
> ## 未证风险
>
> - 各数据 Tab 的**完整**表单矩阵未逐字段走查（r3 已覆盖每页主表单的布局层，字段级交互未穷尽）；
> - 弹层过滤输入的键盘过滤行为本轮未输入验证（accessible name 缺失结论已撤回；Codex 6010 实测过滤
>   生效的引用保持）。
> - 战斗形象预览黑块与战场背景错误横幅为已知资源缺口（不判布局缺陷）。
>
<!-- original-source-quote:end -->
