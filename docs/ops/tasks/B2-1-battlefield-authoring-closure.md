# B2-1 - 战场条目创作七环与安全引用闭环

Status: done
Phase: phase2
Capability: B2
Coding Owner: Codex
Generation Owner: N/A
Reviewer: both
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: Kimi（额度预计 2026-08-15 中午恢复）
Branch: TBD

## 目标

把当前“只能修改 PAL 迁移条目”的战场页升级为完整作者工作台：空白工程可创建第一条战场，已有工程
可创建、复制、编辑、预览、引用、保存重开并安全删除；场景默认、明雷怪专属和剧情战一次性三层引用
均使用同一稳定数字 id、同一类型化选择器、同一反向引用与保存校验。战场背景继续复用 A7-2 已完成的
工程图像资源闭环，不重复实现导入/量化/替换/资源删除。

本卡同时把战场页做成角色模块之后第二个编辑器视觉参考纵切，但只整理战场工作台，不顺带重写技能、
敌人、毒、队伍或整个战斗模块。

## 范围

- 范围内:
  - `BattleFieldDef` 的发现、选择、创建、复制、编辑、预览、引用、保存重开和安全删除。
  - 空白工程第一次创建时，在同一可撤销命令中声明
    `manifest.content.battleFields = "content/battle-fields.json"` 并创建中性战场数据。
  - 战场 id 是不可原地修改的非负安全整数；创建/复制对 id 冲突 fail-loud。
  - 场景默认 `SceneDef.battleFieldId`、明雷怪 `HostileBehavior.battleFieldId`、剧情指令
    `startBattle.fieldId` 三类引用的类型化选择、清除继承、反向引用、精确跳转和悬空诊断。
  - `content12/13/14` 当前编辑器仍支持的作者脚本根：实体 trigger/auto behavior、场景 Hook、
    hostile onLose、物品私有脚本、共享脚本及全部递归 command arms。
  - BattleField 校验收紧：id 安全整数且唯一、五灵对象形状完整、显式引用必须存在。
  - 战场工作台按角色模块的信息架构重排：左侧稳定列表与创建操作，中间分卡编辑与可用尺寸预览，
    右侧摘要、三层引用与精确跳转；窄宽不得压扁 tab、标签或输入文字。
  - 删除战场只删除 `BattleFieldDef`，不会自动删除其背景 Asset；背景资产生命周期仍由 A7-2 管理。
- 范围外:
  - 不把我方/敌方站位、敌队槽位、敌人 `yPosOffset`、动作编排或阵型写入 `BattleFieldDef`。
  - 不重做战场背景导入、PAL 索引色量化、Image 工作台或 AssetId 删除保护。
  - 不改变 D24 的三层解析优先级，不恢复原版 `0x4A` 持久全局战场态。
  - 不改战斗公式、屏波效果、战场背景渲染或战斗运行时站位算法。
  - 不重做战斗模块其他页；全编辑器视觉、七环和代码质量总审查按后续总表另行拆卡。
  - 不在本卡批量修改 PAL 的战场内容、背景图或引用选择。
- 明确不做:
  - 不以数组下标替代显式 `BattleFieldDef.id`，不允许重复 id 后由运行时 `Map` last-wins。
  - 不根据背景路径、显示名或 PAL `id >= 6` 猜战场身份；编辑器必须显示全部显式条目。
  - 不让删除动作静默清空或改写引用；有引用就阻止并列出可跳转位置。
  - 不把运行时缺 field 时的黑底/零加成兜底当成引用安全网。

## 前提真值门

### 一句话行为 / 工程前提

战场是一份由稳定数字 id 引用的“背景 + 屏波 + 五灵修正”内容对象，战斗站位不属于它；B2 的正确修复层
是补齐该内容对象及其三层引用的编辑器/保存闭环，而不是扩写战场 schema 或重做背景资源管线。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | DATA.MKF chunk 5 的每条 `BATTLEFIELD` 只有 `wScreenWave + SHORT magicEffect[5]`，id 是数组下标；战斗背景由同一战场号索引 FBP；敌方站位来自独立 `EnemyPos` 表再加敌人 `yPosOffset`。脚本 `0x4A` 修改当前战场号。 | `packages/pal-extract/src/resources/parsers/battle-fields.ts:1-68`; `reference/sdlpal/global.h:377-381`; `reference/sdlpal/battle.c:933-942,948-987`; `reference/sdlpal/script.c:1719-1724` |
| 第一阶段 | `BattleField` 仍只有 id、screenWave 和五灵向量；`startBattle` 按 id 精确找表项，找不到就抛错；我方/敌方站位继续由独立全局布局表计算。 | `packages/shared/src/tables.ts:396-431`; `packages/game/src/core/battle/battle-system.ts:286-351`; `packages/game/src/core/battle/battle-positions.ts:1-92`; `docs/phase1/game-mechanics.md:485-502` |
| 当前二阶段 | `BattleFieldDef` 在同一语义上仅现代化增加显示名和稳定背景 AssetId；D24 解析为 `startBattle.fieldId > hostile.battleFieldId > scene.battleFieldId > 24`，零持久态。当前编辑器只有 `UpdateBattleFieldCommand`，隐藏 id 0-5，无创建/复制/删除、深链或真实引用清单；三个引用入口也未全部暴露为战场选择器。空白 manifest 不声明 battleFields。 | `packages/content/src/enemy.ts:136-146`; `packages/reforge/src/main.ts:2527-2548,5452-5465`; `docs/phase2/decisions.md:302-330`; `packages/editor/src/ui/BattleFieldTab.tsx:1-17,74-105,140-213`; `packages/editor/src/core/commands.ts:2350-2400`; `packages/editor/src/core/seed.ts:75-247`; `packages/editor/src/ui/CanonicalScriptEditorV5.tsx:2284-2325`; `packages/editor/src/ui/editor-navigation.ts:185-191` |
| 本任务目标 | 保持上述运行语义和 schema 边界，只补完整作者 CRUD、引用闭包、写盘注册和功能性工作台；站位和资产导入分别留在既有独立领域。 | 本任务目标/范围；`docs/phase2/editor/editor-authoring-closure-audit-2026-07-13.md:69-81,245-264`; `docs/phase2/editor/editor-modernization-follow-up-2026-08-14.md:8-21,57-58` |

### PAL 当前数据基线（2026-08-14，已被用户纠正）

- 当前生成产物 `content/battle-fields.json` 是 58 条、id 0..57；但这不是目标真值。A7-2 已明确
  `0..5` 是非战场占位，现代 PAL 工程只应保留 `6..57` 共 52 个真实战场。
- 显式 Battlefield 引用共 140：`SceneDef.battleFieldId=108`、`startBattle.fieldId=32`、
  `HostileBehavior.battleFieldId=0`；47 个不同 id 被引用，0 dangling。
- id 0..5 当前没有任何显式引用、五灵与屏波均全零；它们来自旧 BattleField 数组与 FBP 共索引时代的
  非战场占位，应该由 PAL 迁移器排除，不能进入现代 `BattleFieldDef`。通用 schema 仍允许作者显式创建 id 0；
  修正发生在 PAL 上游生成，而不是恢复编辑器 `id >= 6` 过滤。
- A7-2 已为 field 6..57 迁移 52 个真实 `battle-background` AssetId；0..5 是 PAL FBP 的非战场图槽，
  本卡不重新导入它们，也不把该阈值写进通用创建/选择逻辑。此前把 0..5 的 raw zero records 继续生成
  为现代战场条目与 A7-2 的严格归属裁决冲突，必须修上游。

### 2026-08-14 用户前提纠正与重开门禁

- 用户原话：原版这几个是 UI 背景、开场背景以及主菜单背景；后来已严格区分，剩下的才是战场背景。
- 已复核直接证据：
  - `docs/ops/tasks/A7-2-static-images-engine-chrome.md:146-159,204-205,255,316` 明确冻结
    `FBP 0-5 非战场占位 / 6-57 真实战场 / 52 field refs`；
  - `packages/migrate/src/pal-migration.ts:782-788` 当前却把 extracted 58 条全部写入，只给 6-57 补背景；
  - `packages/content/src/project-upgrade.ts:237-254` 也把 0-5 作为“无背景占位”保留；
  - 当前 `projects/pal/content/battle-fields.json` 的 0-5 恰为全零、无背景、无引用。
- 更新后的前提：`PAL raw 0-5 占位不属于现代 BattleFieldDef；PAL 生成终态为 52 条 ids 6..57；通用
  编辑器仍显示现代工程显式声明的任意非负 id，包括作者自行创建的 #0。`
- `before -> after`：`PAL 编辑器显示 58 条并把 0-5 解释为黑底战场 -> PAL 上游只生成 52 个真实战场，
  UI/开场/菜单图继续由各自严格领域管理。`
- 旧 build/review 授权：**失效**。此前三方设计签字和 Codex accept 只保留历史记录，不授权迁移修正；
  必须更新设计后重新取得 Codex/Kimi/GLM 的 premise verified + design agree，再进入 rework build。
- 预计修正层：PAL migration/legacy PAL upgrade + generated PAL/baseline authority + golden/tests；不得只在
  `BattleFieldTab` 隐藏 0-5，也不得手改 `projects/pal` 冒充完成。

### 反证与替代解释

- 最强替代解释 1：A7-2 已让战场背景可导入/替换/删除，所以 B2 已闭合。
  - 反证：A7-2 闭合的是背景 Asset 生命周期；当前仓库仍只有 `UpdateBattleFieldCommand`，空白 manifest
    无 battleFields 路径，无法产生第一条 `BattleFieldDef`，也没有定义删除该内容对象的引用规则。
- 最强替代解释 2：ED-1 的“引用 ✅”说明当前已有安全引用工作流，只缺两个按钮。
  - 反证：当前 `validateReferences` 没建立 Battlefield id 集，`ref-index` 只索引 flag/var/item，战场页只显示
    一行说明文字；`startBattle` 表单没有 `fieldId`，场景/hostile 检查器也没有类型化 Battlefield 选择器。
- 最强替代解释 3：战场工作台应一并编辑双方站位，才能算“战场完整”。
  - 反证：原版结构、一阶段和当前 Reforge 都把站位放在独立全局布局；把站位塞进 Battlefield 会主动
    改变已核实语义并制造 58 份重复阵型数据。
- 最强替代解释 4：这是纯 UI 小改，不需要动验证/保存层。
  - 反证：空白工程第一次创建必须原子声明文件路径；重复 id 当前可被运行时 Map 静默覆盖；三类悬空
    field id 当前能通过保存；只加按钮会产生不可重开的半工程和不可安全删除的内容。
- 最强替代解释 5：PAL 0..5 不是真战场，所以通用编辑器应永久隐藏所有 `<6` id。
  - 反证：`BattleFieldDef.id` 的 schema 只要求非负整数，现代工程可合法创建 id 0；“PAL raw 0..5 是
    非战场占位”是 PAL 特定迁移事实，不是跨工程 schema 判别式。正确修复是上游不生成这六个占位，
    而不是让通用列表按编号隐藏作者显式创建的现代条目。
- 什么观察会推翻当前前提:
  - 若 primary source 或第一阶段发现每战场独立的我方/敌方位置表，必须重开 schema 边界，当前设计签字失效。
  - 若仓库存在另一套已投入使用的 BattleField create/delete/ref collector，必须复用而非并行新增。
  - 若空白工程无法在不升级 contentVersion/save schema 的情况下原子声明 battleFields 路径，本卡须转为
    schema successor，不得在 serializer 外写旁路文件。
  - 若 D24 的 project default 已从 24 迁为显式 manifest 字段，本卡的默认 id/删除保护策略必须随真实合同重签。
- audit 红项如适用，已排查的替代根因:
  - runtime 语义 / 命令分类：三层来源及独立站位已从 runtime 调用链核实；问题在作者入口和引用闭包。
  - 原版 / 第一阶段理解：两边均无 per-field 站位，排除“需要补迁站位数据”。
  - extractor / 地图 / 数据解码：原始 12-byte record 与 58 条表可往返解析；本卡不修提取数据。
  - audit / test model：ED-1 旧表的“引用 ✅”已被当前源码反证，任务卡以当前工作树重新盘点，不沿用旧勾选。

### 用户可见偏离

- 是否主动偏离已核真值: yes（新增现代作者工作流；不改变战斗运行语义）
- `before -> after` 一句话: `只能改迁移来的战场条目且引用靠手填 -> 可从空白创建、类型化绑定、保存重开、精确定位引用并安全删除`
- 代表场景: 空白工程创建第一条中性战场，给起始场景选择它，在剧情 `startBattle` 临时改选第二条；保存重开
  后两层引用不变；删除第二条先被剧情引用阻止，跳转移除引用后才可删除。
- 用户裁决: 2026-08-14 用户明确当前工作重心为 B2 并指示“开始吧”；详细设计仍须三方签字。

## 上下文锚点

- 已拍板决策 / 铁律:
  - `AGENTS.md`：用户可见/能力格任务先过四向前提门；开卡后 build/done 都需 Codex/Kimi/GLM 三签。
  - `docs/phase2/READ-FIRST.md`：第二阶段 clean schema、稳定 id、零持久战场全局态、迁移缺陷修上游。
  - D24：战场解析固定为剧情一次性 > 明雷专属 > 场景默认 > project/default，旧 `0x4A` 持久态退役。
  - A7-2：BattleField 背景已经是 AssetId 并纳入 Image 工作台；B2 不重复资产管线。
  - 用户 2026-08-14：角色模块是当前编辑器布局基准；B2 仍是当前重心，编辑器总翻新另做后续审查。
- 代码锚点(`file:line`):
  - `packages/content/src/enemy.ts:136-146`：BattleFieldDef 现有 schema。
  - `packages/content/src/index.ts:100,126-134`：hostile/scene Battlefield 引用与优先级文档。
  - `packages/content/src/script-v5.ts:195-204,665-678`：startBattle.fieldId 与形状校验。
  - `packages/content/src/validate.ts:1150-1175`：BattleField 表校验仍缺 duplicate/exact closure。
  - `packages/content/src/validate-refs.ts:752-830`：全局引用校验当前未建立 Battlefield id 集。
  - `packages/reforge/src/main.ts:2527-2548,5452-5465`：生产解析与 hostile 传参。
  - `packages/reforge/src/battle/battle-positions.ts:1-82`：二阶段战斗站位是独立全局布局。
  - `packages/editor/src/ui/BattleFieldTab.tsx:74-213`：只读列表 + Update-only 的现状。
  - `packages/editor/src/core/commands.ts:2350-2400`：只有 UpdateBattleFieldCommand。
  - `packages/editor/src/core/project-io.ts:215-244`：serializer 只写 manifest 已声明的 content 路径。
  - `packages/editor/src/core/seed.ts:75-247`：空白工程未声明/创建 battleFields。
  - `packages/editor/src/ui/CanonicalScriptEditorV5.tsx:2284-2325`：startBattle 表单漏 fieldId。
  - `packages/editor/src/ui/editor-navigation.ts:185-191`：BattleField 页面未接 object deep link。
  - `packages/editor/src/core/ref-index.ts:19-34,72-129`：现索引不含 Battlefield。
- 已知坑 / 审计文档:
  - `docs/phase2/editor/editor-authoring-closure-audit-2026-07-13.md:69-81,245-264`：B2 七环降级证据。
  - `docs/ops/tasks/A7-2-static-images-engine-chrome.md:195,233,555`：52 张真实背景与 AssetId 闭环。
  - `docs/phase2/editor/editor-modernization-follow-up-2026-08-14.md`：B2 与三条编辑器总审查线的边界。
  - 当前工作树有 C1/编辑器与 migrate 大量未提交改动；B2 build 前必须核 owner/测试状态，保留用户改动，
    不把现有变化回退或混称为 B2 产物。
- 不得重新引入:
  - `sys:battleField`、`sceneBattleOverrides` 或随存档的战场全局态。
  - 数组下标身份、PAL `id >= 6` 通用规则、背景路径猜 id、重复 id last-wins。
  - per-field 战斗站位、自动删除背景 Asset、只改 `projects/pal` 生成产物。
  - 仅 UI 删除但保存/运行时仍接受悬空引用的假闭环。
- 相关测试:
  - `packages/content/src/validate.test.ts`
  - `packages/content/src/validate-refs.test.ts`
  - `packages/editor/src/core/commands.test.ts`
  - `packages/editor/src/core/project-io.test.ts`
  - `packages/editor/src/core/project-io-v5.test.ts`
  - `packages/editor/src/core/project-diagnostics.test.ts`
  - `packages/editor/src/core/ref-index.test.ts`
  - `packages/editor/src/ui/BattleFieldTab.test.tsx`（本卡新增）
  - `packages/editor/src/ui/CanonicalScriptEditorV5.test.tsx`
  - `packages/editor/src/ui/App.reference-navigation.test.tsx`
  - `packages/editor/src/ui/editor-navigation.test.ts`

## 验收条件

### 功能

- 空白工程创建第一条时，BattleField 数据、manifest 路径声明和选择状态一次提交；失败不留半 manifest，
  undo/redo 对称。第一次创建的建议 id 预填 24（匹配现有 D24 project default），作者可在提交前改成任意
  未占用非负安全整数；已有列表创建/复制预填 `max(id)+1`。
- 创建默认值：`screenWave=0`、五灵全 0、无 background、可选 name；复制深拷贝字段但分配新 id。
- id 不可在编辑表单原地修改；duplicate、负数、非安全整数、残缺五灵对象在命令/加载/保存边界 fail-loud。
- 删除被以下引用阻止并显示精确位置与跳转按钮：
  1. `SceneDef.battleFieldId`；
  2. `HostileBehavior.battleFieldId`；
  3. 所有 canonical `startBattle.fieldId`，覆盖实体 behavior、场景 Hook、hostile onLose、物品私有脚本、
     共享脚本及 branch/loop/confirm/startBattle battle-result/teleport/battle choreography 支持的递归命令臂。
- 三类编辑入口均为选择器而非裸数字：场景/hostile 可清为继承，startBattle 可清为按 lower layer 解析；
  当前悬空值仍显示“缺数据”并禁止保存，不会从下拉列表静默消失。
- 反向引用清单与加载/保存校验共用同一份 typed reference 定义；不能写两套递归 walker 后各漏一种命令臂。
- Battlefield 页支持 `?module=battle&page=battlefield&object=<id>` 深链；引用跳转能打开对应场景实体、场景根、
  canonical script command 或共享/物品脚本，并给出已定位反馈，位置漂移时 fail-loud。
- 删除无引用、非系统默认的条目可撤销/重做；删除最后一条后保留已声明的空 `battle-fields.json`，重开仍可
  再创建。删除/undo 不自动删除或重签背景 Asset。
- 现行隐式 project default 24 作为系统引用明确显示并受保护；本卡不暗中新增 manifest schema。若审查认为
  “默认战场必须可配置”是 B2 七环必需条件，则在 build 前转 schema successor 并重走三签，不能边做边加。
- PAL 工程由上游只生成 52 条真实战场（ids 6..57），通用编辑器仍显示工程显式声明的全部条目；若
  作者在现代工程新建 id 0，列表必须正常显示，不能按 `<6` 隐藏。

### 测试

- content validator：非安全/重复 id、unknown/missing magicEffect key、三种直接 dangling 引用、每类脚本根与
  每个递归 command arm 的 dangling `startBattle.fieldId`；合法未设置引用不报错。
- reference collector：同一 location 的稳定 id/label/locator；两个内容相同的 startBattle 不按 hash 合并；
  content12/13/14 均覆盖；collector 与 save diagnostics 集合一致。
- editor command：first-create manifest 原子性、create/copy/delete、duplicate、undo/redo、delete ref-block、
  删除最后一条后空文件、背景 Asset 保留；输入 state 不变。
- project I/O：`blank -> create -> bind(scene/hostile/startBattle) -> save -> reopen -> delete blocked ->
  jump/remove refs -> delete -> save -> reopen` 全链；CRLF/其他 manifest 字段不因声明路径丢失。
- UI：全部条目可发现、filter/selection/object deep link、typed picker、悬空 fallback、引用卡跳转、键盘操作、
  窄宽响应式布局、preview loading/error/无背景，且不得白屏。
- PAL golden：52 fields / ids 6..57 / explicit refs 140 = scene108 + startBattle32 + hostile0 /
  distinct47 / dangling0；不存在 0..5 现代条目。该 golden 只钉 PAL 迁移闭包，不把编号阈值变成通用逻辑。
- 运行 `pnpm --filter @type-pal/content check`、`pnpm --filter @type-pal/editor check` 与涉及的定向 Vitest；
  若测试路由/manifest 受影响，按仓库既有生成流程更新并审查。

### 文档

- 更新 Battlefield 作者说明：字段语义、三层继承、project default 24、背景 Asset 生命周期、删除保护和示例。
- 更新 ED-1 七环表；仅在三方 review + 用户验收后把 capability-map B2 editor `⚠️ -> ✅`。
- 后续编辑器整体视觉/七环/代码质量审查不并入 B2，只在总表登记复用经验与遗留。

### 视觉 / 手工验证

- 6010 空白工程执行完整功能链；分别在宽屏和窄宽检查列表、tab、表单标签、预览和右侧引用不被挤压。
- PAL 工程打开 field 24、6、57；列表必须恰为 52 条 `#006..#057`，不得再出现 `#000..#005`；
  背景预览、黑底提示、五灵/屏波布局、引用清单与深链均正常。
- 修改字段后保存、整页重载、重开工程；确认选中对象和数据一致，无 `stages is not iterable` 类白屏。
- 战场工作台只需达到角色模块的信息架构与间距质量；战斗其他页的视觉问题登记后续，不作为本卡阻塞。

### E2E 用例登记

- 功能性编辑器界面，开发期做最小浏览器验证；不属于剧情/演出集中 E2E。
- 新增可自动执行的 editor E2E/集成入口：blank 项目上述七环链，截图/日志证据写入本卡视觉验证记录。

## 推进签字

### 进入 build 前:设计签字

> 2026-08-14 重开说明：以下原三方签字只证明旧的 Battlefield 七环设计；其中“PAL 58 条”前提已失效，
> 不授权本次迁移修正。本次窄范围修正由 Codex 重新核实 premise/design，用户在获知 Kimi 额度不足后明确
> 指示“修复吧”，批准缺签豁免先进入 build；Kimi 恢复后必须补审，补审前不得标 done。

- Codex:
  - premise: **verified（2026-08-14）**。直接证据：原始 12-byte Battlefield record
    `packages/pal-extract/src/resources/parsers/battle-fields.ts:1-68`；独立站位
    `reference/sdlpal/battle.c:933-942` / `packages/game/src/core/battle/battle-positions.ts:1-92`；当前
    Update-only/空白路径缺失 `BattleFieldTab.tsx:74-213`、`commands.ts:2350-2400`、`seed.ts:75-247`。
  - design: **agree**。方案保持 schema/运行语义，复用 A7-2 Asset 闭包，以单一 typed reference collector、
    可逆命令和保存门补七环；project default 24 暂按既有 D24 合同显式保护，不暗改 manifest。
- Kimi:
  - premise: **verified（2026-08-14，独立一手核实，非复述 Codex/GLM 结论）**。独立证据：
    - 原版：`reference/sdlpal/global.h:377-381` tagBATTLEFIELD 仅 `wScreenWave + SHORT rgsMagicEffect[5]`；
      敌方站位来自独立 EnemyPos 表 + 敌人 `wYPosOffset`(`reference/sdlpal/battle.c:933-942`)；背景按
      `wNumBattleField` 索引 FBP(`battle.c:982`)；`0x4A` 写全局 `gpGlobals->wNumBattleField`
      (`reference/sdlpal/script.c:1719-1724`)；解析器 12 字节/条、id=数组下标
      (`packages/pal-extract/src/resources/parsers/battle-fields.ts:44-68`)。
    - 一阶段：`packages/shared/src/tables.ts:414-431` 同形；`battle-system.ts:350-351` 按 id 精确
      find、缺失抛错；站位为独立全局布局 `battle-positions.ts:19-92`。无 per-field 站位。
    - 当前二阶段：运行解析 `battleOpts?.fieldId ?? scene.battleFieldId ?? 24`
      (`packages/reforge/src/main.ts:2527`)、hostile 传参 `main.ts:5452-5465`，零持久态；编辑器仅
      `UpdateBattleFieldCommand`(`commands.ts:2367-2400`)，全仓 grep
      `CreateBattleField|DeleteBattleField|CopyBattleField` 零命中；空白 manifest 无 battleFields
      键、无 battle-fields.json(`seed.ts:222-247`)；serializer 只写 manifest 已声明键
      (`project-io.ts:240-244`)；`validateReferences` 未建 Battlefield id 集(validate-refs.ts:756-769,
      全文仅 :22/:85 两处类型 import)；`ref-index.ts:31-33` 仅 flags/vars/items；startBattle 表单只有
      team/auto/boss(`CanonicalScriptEditorV5.tsx:2284-2318`)；battlefield 子页无 `acceptsObject`
      (`editor-navigation.ts:184-190`)；UI 以 `FIRST_BATTLE_FIELD_ID=6` 隐藏 0..5
      (`BattleFieldTab.tsx:16-17,87-91`)；scene/hostile 检查器完全无 battleFieldId 入口(editor/ui
      全局 grep 仅 BattleFieldTab 提示文字命中)。
    - PAL 基线独立复算（本人 node 脚本只读全量遍历 `projects/pal/content`）：58 条、ids 0..57、dup 0、
      全部非负安全整数、52 条 background 覆盖 6..57；显式引用 140 = scene 108 + hostile 0 +
      startBattle 32、distinct 47、dangling 0、id 0..5 零引用。与卡文逐数一致。
  - design: **agree（2026-08-14，附必改项 K1-K3，验收文字/设计说明级修正，不阻塞准入）**。方案保持
    schema/运行语义与 D24 边界；first-create manifest 原子命令有既有先例可直接复用
    (`commands.ts:573-577` withMapCatalogManifest、`commands.ts:1801` 共享脚本首建原子补
    manifest+index+chunk)，不升 contentVersion 即可落地；单一 typed collector 与 save diagnostics
    同源、id24 作 system reference 保护而不暗加 manifest 字段、移除 PAL 专属 id 阈值过滤，均符合
    READ-FIRST 铁律 4/5。对 GLM G1 有一处实测修正（见 K1）。
- GLM:
  - premise: **verified（2026-08-14，本人独立复算全部 census + 现状四项抽查，非代理）**。
    58/0..57/0 dup/140=108+32+0/47/0 dangling/0..5 refs0 全部精确吻合；Update-only、seed 未声明、
    ref-index 不含、validate-refs 无 id 集、startBattle 表单漏 fieldId 全部属实。详见下方。
  - design: **agree（2026-08-14，附必改项 G1-G2，非阻塞准入）**。schema/运行语义不变 + 单一 typed
    collector + A7-2 资产复用 + id24 system reference 方向正确。G1 修正 root/递归臂显式列表
    （含一处实测遗漏的 enemy ai hooks root）。
- 独立反证审查（至少一位非 Coding Owner 必填）:
  - 审查者: GLM（2026-08-14）+ Kimi（2026-08-14，主审独立反证，见下方「Kimi 独立反证审查」）
  - 独立证据锚点: 见下方两节
  - 可证伪观察: 见下方两节
- counter / 分歧处理: none（三方 agree；GLM 附 G1-G2，Kimi 附 K1-K3，均为 build 时必须落实的非阻塞
  修正；K1 含对 GLM G1「enemy ai hooks root / loop 不存在」两处实测修正，分歧已在证据层收敛）
- 缺签豁免: **仅本次 0..5 上游修正适用**。Kimi 因额度不可用，GLM 未在当前会话重新签字；用户在被
  明确告知旧签字失效、Kimi 次日补审后指示“修复吧”，批准 Codex 先实施已核实的窄范围上游修正。
- build 准入结论: **rework build allowed（2026-08-14，用户缺签豁免）**。只允许修改 PAL
  migration/legacy PAL upgrade、相应测试与 generated authority；不得扩展 schema、通用 UI 编号规则或
  Battlefield 运行语义。Kimi 恢复后补架构/迁移审查，GLM 补数据/测试审查，两者未 accept 前不得 done。

#### GLM 独立反证审查（2026-08-14，本人；非代理）

**方法**：Node 独立递归扫描 PAL 全四来源统计 BattleField 引用 + 逐容器核对 script.ts 递归臂 +
抽查编辑器/校验现状。

**标准 1 — PAL census 独立复算（全部精确吻合）✓：**

| 指标 | 卡文 | 本人复算 | 核对 |
|---|---|---|---|
| battle-fields 条目 | 58 | 58 | ✓ |
| id 范围 | 0..57 | 0..57 | ✓ |
| duplicate | 0 | 0 | ✓ |
| 显式引用总数 | 140 | 140 | ✓ |
| — SceneDef.battleFieldId | 108 | 108 | ✓ |
| — startBattle.fieldId | 32 | 32 | ✓ |
| — HostileBehavior.battleFieldId | 0 | 0 | ✓ |
| distinct 被引用 id | 47 | 47 | ✓ |
| dangling | 0 | 0 | ✓ |
| id 0..5 引用 | 0 | 0 | ✓ |

**标准 2 — 现状四项抽查（全部属实）✓**：
- `commands.ts:2367` 仅 `UpdateBattleFieldCommand`（无 Create/Copy/Delete）✓
- `seed.ts` grep battleFields 零命中（空白工程未声明）✓
- `ref-index.ts` grep BattleField 零命中（索引不含）✓
- `validate-refs.ts` 仅 import 类型（:22,:85），无 id 集校验 ✓
- `CanonicalScriptEditorV5.tsx` grep fieldId 零命中（startBattle 表单漏）✓

**标准 3 — 引用 root/递归臂穷尽性（发现 G1）**：

本人实测 32 处 startBattle.fieldId 的 root 分布：**实体 behaviors 28 + 场景 onEnter 3 + enemy
ai hooks states 1** = 32。

script.ts 实际 Command 递归容器穷尽清单（本人逐行核对）：
1. `startBattle.onLose?: Command[]`（:198）
2. `startBattle.onFlee?: Command[]`（:199）
3. `teleportOut.onFail?: Command[]`（:212）
4. `confirm.onNo: Command[]`（:214）
5. `branch.then/else: Command[]`（:238）
6. **`SceneEntryPresentation.prepare: Command[]`（:254）** — 仅 scene onEnter stage
7. 通用 `body: Command[]`（:359）

enemy 侧：`EnemyHookFlow.states[].body: EnemyHookCommand[]`（enemy-script.ts:75-83）+
`EnemyDef.choreography?: BattleChoreography[]` + `onDefeated`（enemy.ts:103-105）；
hostile 侧：`HostileBehavior.onLose?: 'gameOver' | Command[]`（index.ts:106）。

**必改项 G1（root/递归臂显式列表不准确，build 时必须修正）**：
卡文 `:174-175` 列表为"实体 behavior、场景 Hook、hostile onLose、物品私有脚本、共享脚本及
branch/loop/confirm/startBattle battle-result/teleport/battle choreography"。对照实测：
- **漏 root**：enemy `ai.hooks.*.states.*.body`——实测 1 处 startBattle.fieldId 位于此（与 C1-2
  G1 同型遗漏；卡文只把 "battle choreography" 列为递归臂，未把 ai hooks 列为 root）。
- **漏递归臂**：`SceneEntryPresentation.prepare`（script.ts:254，scene onEnter stage 专属）。
- **列了不存在的容器**：`loop`——script.ts 无 loop 递归容器（grep Command[] 无 loop 命中）。
- **命名应精确**："teleport" → `teleportOut.onFail`；"startBattle battle-result" →
  `startBattle.onLose/onFlee`。
C1-2 教训：显式列表会被实现者直接用来建 walker；按当前列表建会漏 enemy ai hooks root（1 处
真实引用）与 prepare 臂，并浪费精力实现不存在的 loop。修正后的完整清单应为：
**roots** = 实体 pages/behaviors(trigger/auto)、场景 onEnter（含 prepare）、HostileBehavior.onLose、
物品私有脚本、共享脚本、enemy ai.hooks states、enemy choreography、enemy onDefeated；
**递归臂** = startBattle.onLose/onFlee、teleportOut.onFail、confirm.onNo、branch.then/else、
prepare、body。

**必改项 G2（validator 收紧口径）**：
现 `validate.ts:1157` 用 `Number.isInteger && >= 0`，未检查安全整数上限。卡文验收条件写"id 安全
整数"，build 收紧时应同时升级为 `Number.isSafeInteger`（否则 2^53 以上 id 能过 shape 校验）。
同时补 duplicate id 检查（卡文 :127 已正确指出缺失）。

**标准 4 — 测试矩阵与 content12/13/14 覆盖 ✓（附 G1 后修正）**：
卡文测试节已含：validator 负例、collector 稳定性（不按 hash 合并）、command 原子性、I/O 全链、
UI 深链/窄宽、PAL golden（钉数据不钉逻辑）。script-v5（AuthorCommandV5 继承 script.ts Command）、
script-v13（RewriteCommandTreeV13 基于 v5）、C1-2 v14 均复用同一 Command 联合——单一 typed
collector 天然覆盖三版本 ✓。修正 G1 后，"每类脚本根与每个递归 command arm 的 dangling
startBattle.fieldId"负测清单应按上述完整 roots/arms 展开。

**premise verified — 独立核实：**
1. census 全吻合（上表）。
2. 现状缺口四项属实（Update-only/seed/ref-index/validate-refs/表单）。
3. `BattleFieldDef`（enemy.ts:136-146）= id/name?/background?/screenWave/magicEffect——与原版
   12-byte record 语义一致仅现代化显示名与 AssetId，无站位字段；站位在独立
   `battle-positions.ts`（reforge:1-82）。
4. 反证 5（PAL 0..5 不升级为通用规则）成立：schema 只要求非负整数，`id>=6` 是 PAL 资产事实。

**design agree — 方向正确：**
单一 typed reference descriptor/collector（validateReferences + editor locator 共用）、first-create
manifest 原子命令、id 不可原地改、删除只删 BattleFieldDef 不动 Asset（A7-2 继续唯一管理资源）、
id24 显式 system reference 不暗扩 schema、移除 FIRST_BATTLE_FIELD_ID 过滤。

**可证伪观察：**
① 若 build walker 按卡文当前列表实现而漏 enemy ai hooks root，该处真实 startBattle.fieldId 引用
  不会进入删除守卫/保存诊断——G1 要求修正清单。
② 若 primary source 发现 per-battlefield 独立站位表（现核对 battle.c:933-942 为独立 EnemyPos 全局
  表），schema 边界须重开——未发现。
③ 若空白工程无法在不改 contentVersion/save schema 下原子声明 battleFields 路径，本卡转 schema
  successor——project-io.ts:215-244 serializer 按 manifest 声明写盘，first-create 命令同时写
  manifest.content + 表数据即可，无需 schema 变更，不成立。

Evidence: battle-fields.json 58 条实测 / 引用扫描 scenes+items+shared+enemies=140 / commands.ts:2367 /
seed.ts+ref-index.ts+validate-refs.ts+CanonicalScriptEditorV5.tsx grep 零命中 / script.ts:196-204,
212,214,238,254,359 / enemy-script.ts:75-83 / enemy.ts:103-105 / index.ts:106 /
validate.ts:1150-1175。只读审查，未改实现文件，未代签 Kimi，未标 build/done。

#### Kimi 独立反证审查（2026-08-14，主审；本人独立核实）

**方法**：逐文件打开任务卡真值矩阵全部四向证据锚点（sdlpal/一阶段/reforge/editor/content）+
本人 node 脚本独立复算 PAL census 与 32 处 startBattle.fieldId 的 root 分布 + 压力测试五个设计点。

**premise verified — 独立锚点**（详见上方 Kimi 签字块；要点）：四向真值矩阵每一行均被本人用一手
证据复核通过，无一处依赖转述。特别强调两条本人独立确认的关键边界：
- 站位不属于战场：原版 EnemyPos 全局表 + `wYPosOffset`(battle.c:936-939)、一阶段/二阶段
  `battle-positions.ts` 独立布局表，三向一致；`BattleFieldDef`(enemy.ts:136-146) 无站位字段。
- 无既有平行实现可复用：Create/Copy/Delete/ref collector 全仓零命中，设计“新增而非复用”成立。

**32 处 startBattle.fieldId 的 root 分布（本人实测，修正 GLM G1 一处误分类）**：
实体 behaviors.trigger 28 + 场景 hooks.onEnter stages 3 + 场景 hooks.onEnter **v13 machine
states** 1（`scenes/s231.json hooks.onEnter.variants.default.flow.machine.states.continuation-008
.body[61]`）= 32。**enemies.json / items.json / shared-scripts.json 实测 0 处**。GLM G1 把 s231
这 1 处归为「enemy ai hooks root」系误分类：enemy 侧命令闭集（`EnemyHookCommand` /
`BattleChoreographyAction` / `EnemyOnDefeatedLeaf`,enemy-script.ts:20-50,86-113）均不含
startBattle，不可能携带 fieldId；真正被卡文和 GLM 清单都漏掉的是 **v13 flow 的 machine states
形态**（`flow.machine.states.*.body`，对照常见的 `flow.stages[].body`）。

**必改项（build 时落实，不阻塞准入）**：
- **K1（collector root/臂清单定稿）**：在 G1 基础上修正为——可携带 startBattle 的 roots =
  实体 behaviors(trigger/auto；v13 stages 与 machine states 两形态）、场景 Hooks(onEnter/onTeleport;
  stages 与 machine states 两形态）、`HostileBehavior.onLose`(Command[])、物品私有脚本、共享脚本；
  递归臂 = startBattle.onLose/onFlee、teleportOut.onFail、confirm.onNo、branch.then/else、
  **loop.body**(AuthorCommandV5 确有 loop,script-v5.ts:208-215；GLM「loop 不存在」只对旧 script.ts
  Command 联合成立，ref-index.ts:104-106 与 script-v5.ts:796-797 两个现有 walker 均含 loop)、
  SceneEntryPresentation.prepare。enemy ai.hooks/choreography/onDefeated 三处命令闭集不含
  startBattle,collector 应以穷举标注「无需遍历」防未来扩集漏改。卡文 :174-175「battle
  choreography 支持的递归命令臂」表述与 schema 事实不符，一并修正。
- **K2（id24 缺失态必须可见）**：runtime 缺 field 时静默黑底/零波（main.ts:2547-2548 `?? 0`、
  background undefined 无任何提示）。「id24 作 system reference 明确显示并受保护」须钉死两态：
  存在时禁止删除；**工程无 id 24 时**（空白工程作者拒绝预填 24 的合法路径）工作台/诊断必须显示
  「隐式 project default 24 缺失」警告，不得静默——否则卡文「不把黑底兜底当安全网」在缺失态落空。
- **K3（first-create 原子命令复用先例并整体可逆）**：实现须显式复用 withMapCatalogManifest
  (commands.ts:573-577) / 共享脚本首建（commands.ts:1801) 的既有模式；invert 必须整体还原
  manifest+table 两半，禁止出现 undo 后 manifest 声明残留指向不存在表（或反之）的半态；
  save-reopen 集成测试按卡文验收钉住。

**对 G2 的独立确认**：已读 validate.ts:1150-1175——`Number.isInteger` 非 safeInteger、无
duplicate 检查、magicEffect 无 exactKeys,G2 成立，build 一并收紧。

**可证伪观察**：
1. 若 enemy 侧命令闭集未来扩出 startBattle/fieldId 成员（当前闭集不含），K1 的「无需遍历」标注
   必须翻转为必遍历—— collector 类型应让此扩展在编译期报错而非静默漏收。
2. 若 runtime 缺 field 有用户可见告警（实测 main.ts:2547-2548 静默）,K2 可降为可选。
3. 若发现另一套已投入使用的 Battlefield CRUD/collector（实测 grep 零命中），设计须改复用。

**压力测试结论（五项）**：typed collector 边界 → K1 定稿后闭合；id24 system reference → K2 补
缺失态；first-create manifest 原子性 → K3 复用先例，可行且不升 schema;0..5 显示策略 → 同意移除
`FIRST_BATTLE_FIELD_ID`(BattleFieldTab.tsx:16-17) 通用阈值，PAL 事实不升级为 schema rule，初始
选中逻辑随过滤移除改为首条；角色模块式工作台 → 符合用户 2026-08-14「角色模块为布局基准」拍板，
范围仅限 BattlefieldTab 与三层选择器，不外溢。

只读审查，未改实现文件，未代签 GLM，未改 Status。

### 进入 done 前:审查签字

- Codex: **accept（2026-08-14，历史签字；因 PAL 0-5 前提纠正已失效）**。实现与自测闭合 G1/G2/K1-K3：单一 typed startBattle collector、
  Battlefield id/五灵 strict validator、id24 缺失诊断、first-create manifest+table 整体可逆；完整
  content/editor check 和 production build 通过，6010 PAL 实机验证 58 条、#24 默认、引用栏与两类深链。
- Codex: **accept（2026-08-15，当前 rework）**。append-only B2 successor 将 PAL current/baseline
  严格分离为 52 条 `6..57`，冻结 historical 58 槽 parent；publication/project rewind、orphan/half-state、
  modern explicit id0、manifest raw 与 clean replay 均有门禁。content/editor/B2 tests 与 migrate typecheck
  通过；6010 实机 52 条且 0 console error。
- Kimi: **缺席（2026-08-15，额度未恢复；用户明确批准本卡无需等待 Kimi，done 阶段豁免补审）**。
- GLM: **accept（2026-08-15 R1 复核后转签，本人覆盖/数据/测试矩阵终审，非代理）**。原 counter
  唯一阻塞项 R1（oracle 未重录）已由 Codex 修复并经本人逐项复核闭合：oracle input 纳入
  `b2-battle-field-domain-v1` seal、current profile `pal-v14-c1-b2`、producerContractVersion
  `p2-p7-r13-6a-b10-w9-c1-b2-v1`、transition projection 含 B2、`_state.json` 75113 bytes 与
  manifest 一致、migrate/src files 129 一致、managedFiles golden 551 一致、`test:oracle:verify`
  2/2 PASS（本人实跑）。其余全部通过项不变（见下方终审证据）。Kimi 补审 + 用户验收前不得 done。
- counter / 返工处理: **GLM R1 已闭合并经本人复核确认**——producer 代码（migrate/src 128→129）与
  baseline（`_state.json` 74842→75113）变更后 oracle 已按纪律重录；漂移消除。
- 缺签豁免: build 阶段与 done 阶段均由用户明确批准 Kimi 缺席豁免；Codex/GLM accept 有效。
- done 准入结论: **allowed（2026-08-15 用户明确裁决 B2 已完成，无需等待 Kimi）**

#### GLM done 前终审证据（2026-08-15，本人；非代理）

**通过项（独立复算全部精确）：**

| 检查 | 结果 |
|---|---|
| PAL current battle-fields | **52 条** ids 6..57，dup 0，无 background **0** ✓ |
| baseline battle-fields | **52 条** ids 6..57，无 background 0 ✓ |
| 引用闭包 | 140 = scene 108 + startBattle 32 + hostile 0;distinct 47;dangling 0 ✓ |
| B2 seal | `b2-battle-field-domain-v1`,parent=**c1-npc-curation-v1**,removed 0..5 payload 绑定,digest `d65e5c9c…` 与卡文一致 ✓ |
| G2 | `validate.ts:1161` `Number.isSafeInteger` ✓ |
| G1 | collector 采用**纯形状递归**（visit 全 JSON 树，匹配 `kind===startBattle`）而非枚举 root/臂——结构上消灭"漏臂"类缺陷，优于按清单建 walker ✓ |
| 通用 id0 | BattleFieldTab 无 `id>=6` 过滤(modern explicit id0 不受 PAL 规则影响)✓ |
| replay | `writes=0 deletes=0 conflicts=0` + `[B2 battlefield dry-run] 58→52 与可逆 seal 预检完成；manifest bytes 未变` ✓ |
| content check | 41 files / 481 tests ✓(实跑) |
| editor check | 105 files / 873 tests ✓(实跑) |
| git diff --check | clean ✓ |

**阻塞项 R1 — `test:oracle:verify` 2/2 FAIL(本人实跑):**
```
Error: PAL test oracle: packages/migrate/baselines/pal/_state.json bytes 漂移 75113 != 74842
```
manifest 钉 `migrate/src files=128`,实际 **129**(B2 新增 producer 文件);`_state.json` 因 B2
transition 入账 +271 bytes。与 W9 R1(B10 后 v13 文件漂移)、OPS-RW1 A8 同型——**发布后必须重录
oracle** 是项目既有铁律,卡文验收条件也隐含 release 门禁闭合。修复为机械操作(test:oracle:update
→ 审查 diff → 复跑),不涉及实现逻辑。

**可证伪观察**:若 `test:oracle:update` 后 diff 中出现非 producer 指纹/`_state.json` bytes 的变化
(如 projection authority 改写),则问题升级为 oracle 自指污染,须按 OPS-RW1 B1 纪律逐项审查。

Evidence: battle-fields.json current+baseline 52/6..57 实测 / 引用扫描 140/47/0 /
b2-battle-field-domain-v1.json seal / validate.ts:1161 / battle-field-reference.ts:29-52 形状递归 /
BattleFieldTab 无阈值过滤 / content 41/481 + editor 105/873 实跑 / replay 0/0/0 / oracle 2/2 FAIL
(75113!=74842, files 128 vs 129)。只读终审,未改实现文件,未代签 Kimi,未标 done。

#### GLM R1 修复复核证据（2026-08-15，本人实跑；非代理）

Codex 声称的六项修复逐项核实：

| # | 声称 | 本人实跑/实读 | 核对 |
|---|---|---|---|
| 1 | oracle input 纳入 b2 seal | manifest.json 含 `b2-battle-field-domain` | ✓ |
| 2 | transition projection 纳入 B2,current profile `pal-v14-c1-b2` | profiles.current=`pal-v14-c1-b2`;producerContractVersion=`p2-p7-r13-6a-b10-w9-c1-b2-v1`;projection.json 含 b2 | ✓ |
| 3 | managedFiles golden 551 | `_state.json` managedFiles 数=**551** | ✓ |
| 4 | test:oracle:verify 2/2 PASS | **2/2 passed**(实跑) | ✓ |
| 5 | test:manifest PASS | "fast 89/649, release 113/781, canary 1/2"(实跑) | ✓ |
| 6 | typecheck + diff-check | tsc 无输出;git diff --check clean(实跑) | ✓ |

**漂移消除确认**: `_state.json` 实际 bytes **75113** = manifest 钉 75113 ✓;
migrate/src 实际 production .ts **129** = manifest 钉 129 ✓。
**回归确认**: replay 仍 `writes=0 deletes=0 conflicts=0` + B2 dry-run 预检 + manifest bytes 未变 ✓。

R1 闭合,GLM 转 accept。只读复核,未改实现文件,未代签 Kimi,未标 done。

## Draft: 设计与风险

### 设计结论

1. **内容身份不变**：继续使用 `BattleFieldDef.id:number`，编辑时不可改 id；Create/Copy/Delete 是独立不可变
   command，first-create 命令负责 manifest 路径声明。删除最后一条保留空表，避免 manifest/file 来回抖动。
2. **一个引用定义，两类消费者**：在 content 层建立穷尽的 Battlefield reference descriptor/collector，
   `validateReferences` 用它查 dangling；editor 给同一 descriptor 补可跳转 locator，删除 guard、右侧引用卡、
   save diagnostics 共用，禁止另写 BattleFieldTab 私有 walker。
3. **三层作者入口对齐运行时**：scene/hostile/startBattle 都使用同一字段选择器组件，文案明确“继承自哪层”；
   选择器只写显式字段，不预先烘焙 lower layer 值。
4. **A7-2 继续唯一管理资源**：BattleField 只存 background AssetId；ImageAssetPicker/图像工作台负责导入替换和
   资源安全删除。Copy 共享 AssetId，Delete 不回收 Asset。
5. **工作台而非密集表单**：左列表 + 中央 Overview/Visual/Effects 卡片 + 右摘要/References；预览支持容器内
   fit 和清晰 320x200 基准，不用内联 style 把所有字段挤成一排。BattleField 自身属性少，不增加无意义 tab。
6. **PAL 兼容事实不污染通用模型**：移除 `FIRST_BATTLE_FIELD_ID` 过滤；PAL 专用 successor 在上游把
   raw 58 槽拆成 52 个现代战场 `6..57`，通用编辑器仍显示现代工程显式声明的任意非负 id，
   不把 FBP 历史槽位或 `id >= 6` 变成 schema rule。
7. **默认 24 不扩 schema**：现有 runtime/D24 明确 fallback 24；本卡 UI 把它显示为 system reference 并保护。
   是否引入可配置 project default 是独立 schema 决策，若审查判为必须则本卡停线重签。

### 已知风险

- 风险：canonical script 的根/递归臂很多，私有 walker 易漏，导致删除守卫和保存校验不同步。
  - 缓解：content typed collector 为单一来源；每个 root/arm 各有负测，editor 只做 locator projection。
- 风险：first-create 只改 state.battleFields，serializer 因 manifest 未声明路径而丢文件。
  - 缓解：manifest + table 原子命令，save-reopen 集成测试钉住。
- 风险：id 24 是隐式 project default，未显式引用却可改变运行结果。
  - 缓解：作为 system reference 阻止删除并在 UI 说明；不在本卡偷加 manifest 字段。
- 风险：直接修改冻结的历史 PAL 生成器会破坏 C1/R13 historical replay；只在 UI 隐藏又会让错误数据继续存在。
  - 缓解：保留历史 58 槽 parent 不变，新增 append-only B2 successor 做领域分离；发布、工程与 historical
    rewind 都验 seal/file/managed/hash，通用编辑器不使用编号阈值过滤。
- 风险：当前工作树 C1/编辑器改动很多，B2 修改会碰 App/script editor/ref/commands 等同文件。
  - 缓解：build 前记录现有 diff/owner/test 状态，只追加 B2 局部变化，禁止覆盖或回滚用户已有改动；review
    按文件/测试证据区分 C1 与 B2。
- 风险：视觉整改扩大成整个战斗模块重写。
  - 缓解：只重排 BattlefieldTab 与必要的三层选择器；其他页写入后续审查清单。

### 主审立场

- Reviewer: Kimi（架构/公共引用边界/UX 主审），GLM（引用覆盖/测试矩阵复审）
- 结论: Kimi design agree（2026-08-14）;GLM design agree（2026-08-14）
- 必改项: GLM G1(root/递归臂清单，经 Kimi K1 实测修正后定稿）、G2(validator 收紧
  isSafeInteger + duplicate + exactKeys);Kimi K1(collector 清单定稿，含 v13 machine states
  形态与 loop.body)、K2(id24 缺失态诊断可见）、K3(first-create 复用先例 + 整体可逆）。
  均为 build 时落实的验收文字/设计说明级修正，不阻塞准入。
- 是否建议进入 build: 是（三方签字已齐；Status 变更由用户拍板）

### 三方争议记录(按需)

- Codex: 保持现有 schema 与 runtime，id24 作为显式 system reference；不把可配置 project default 偷渡进 B2。
- Kimi: 同意 Codex 边界；对 GLM G1 提两处实测修正（s231 那 1 处是场景 onEnter v13 machine state
  而非 enemy ai hooks;canonical v5 确有 loop.body)，证据层已收敛，无残留分歧；补 K2/K3 两项
  设计钉死。project default 可配置化维持“独立 schema 决策、不进 B2”。
- GLM: 提 G1/G2 必改项；G1 方向正确，细节以 Kimi K1 实测定稿为准。
- 用户拍板: 不需要（三方在证据层收敛，无方案级分歧；是否转 build 属常规推进）

## 额度 / 代班记录(如适用)

- 缺席 Agent: Kimi
- 缺席原因: 订阅额度耗尽，用户告知预计 2026-08-15 中午恢复。
- 代班 Agent: Codex（实现/本地验证）；GLM 待补数据与测试矩阵复审。
- 代班范围: 仅 PAL raw 0..5 非战场占位的上游排除、legacy PAL 表兼容升级、再生成与 golden。
- 风险: 迁移/生成 authority 会变化；通用现代工程 id 0 必须保留，不能误写成 UI 阈值规则。
- 是否需要补审: 是。Kimi 恢复后补架构/迁移审查；GLM 补数据/测试审查；补审前任务不得 done。
- 用户裁决: 2026-08-14 用户在说明 Kimi 不可用后明确指示“修复吧”，批准本轮窄范围 build 缺签豁免。

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件:
  - content：`battle-field-reference.ts`、`validate.ts`、`validate-refs.ts`、`index.ts` 及对应测试。
  - editor core：`battle-field-references.ts`、`commands.ts`、`project-diagnostics.ts`、
    `project-io.test.ts` 及对应测试。
  - editor UI：`BattleFieldPicker.tsx`、`BattleFieldTab.tsx`、`CanonicalScriptEditorV5.tsx`、
    `ItemTab.tsx`、`DataMode.tsx`、`App.tsx`、`editor-navigation.ts`、`editor-target.ts`、
    `editor.css` 及对应测试。
  - docs：`battlefield-authoring.md`、ED-1 七环复核、本任务卡与 board。
  - PAL 领域分离：`project-upgrade.ts`、`upgrade-local-v3-images.ts`、
    `pal-b2-battle-field-domain.ts`、`pal-current-c1-rewind.ts`、`migrate-content.mts`、PAL/baseline
    `battle-fields.json`、B2 transition seal/state 及对应测试。
- 实现摘要:
  - 新增单一 typed Battlefield 引用收集器；保存校验、删除守卫和 UI 引用投影共享该来源，覆盖
    scene/hostile 与所有显式 `startBattle.fieldId` 根和递归结构。
  - validator 收紧为非负安全整数、duplicate 拒绝、顶层与五灵 exact keys；保存门再次验证整表和引用闭包。
  - 新增 Add/Copy/Delete/Update 命令；first-create 原子登记 manifest 路径与表，invert 精确恢复；最后一项
    删除保留已声明空文件，#24 作为系统引用保护。
  - scene/hostile/startBattle 三处统一使用 `BattleFieldPicker`，支持继承/缺数据 fallback/跳回战场；新增
    Battlefield object 深链和 scene/entity/canonical command 引用跳转。
  - 战场页按目录/主编辑/引用 Inspector 三栏重排，显示全部显式 id；提供背景预览、结构化属性、默认缺失
    警告、创建/复制/删除和引用卡。实机首轮发现主区未占满，已把引用栏归位到 shell Inspector 后复验。
  - 新增 append-only `b2-battle-field-domain-v1` successor：冻结 historical 58 槽 parent，只在 PAL
    current surface 严格移除全零且无背景的 0..5，占位 payload、parent/successor file hash、manifest、C1
    parent authority 与 publish surface 全部入 seal；publication/project rewind 可逆并 fail-closed。
  - legacy upgrader 的历史 API 保持 58 槽字节语义；新增显式 PAL domain-separation API，避免把
    `id < 6` 误写成通用规则。普通 content14 replay 与显式 B2 CLI 共用同一 builder。
- 运行命令:
  - `pnpm --filter @type-pal/content check`：41 files / 481 tests PASS，typecheck PASS。
  - `pnpm --filter @type-pal/editor check`：105 files / 873 tests PASS，typecheck PASS。
  - `pnpm --filter @type-pal/editor build`：PASS（仅既有 chunk-size warning）。
  - B2 定向：editor 8 files / 199 tests PASS；content 3 files / 109 tests PASS；布局修正后 editor
    4 files / 41 tests PASS。
  - `git diff --check`（B2/docs/content/editor 范围）：PASS。
  - B2 transition + current adapter：2 files / 5 tests PASS；migrate typecheck PASS。
  - `pnpm --filter @type-pal/migrate test:manifest`：PASS（fast 89/649，release 113/781，canary 1/2）。
  - `pnpm --filter @type-pal/migrate test:oracle:verify`：1 file / 2 tests PASS；oracle current profile
    升为 `pal-v14-c1-b2`，transition 集合显式包含 `b2-battle-field-domain-v1`，managed files=551。
  - `--b2-battlefields --write`：写入后同进程 replay 与独立 clean Node replay 均 `0/0/0`；manifest raw、
    content14、SAVE8 不变。transition seal digest
    `d65e5c9c6c9abe98c151c32e18bc486df988cfa541ae443041475583f3939ed7`。
  - release-pal-fresh 已通过本卡关键 historical R13 `writes=[]` 门，随后停在工作树既有 C1 sound golden
    `playSound 1039 -> 1041`；B2 不改声音数据，未借本卡篡改该 golden。
- 浏览器 / 手工检查:
  - 6010 PAL 直达战场工作台：无白屏；列表恰为 52 条，首项 `#006`、末项 `#057`，不存在
    `#000..#005`；#024 默认徽标、背景预览、屏波、五灵与 9 处引用可见，控制台 0 error。
  - 点击场景引用后 URL 精确为 `?module=scene&page=workspace&object=s062`。
  - 点击剧情引用后精确定位 `s001/e27/default/stages/initial/body[36]`，状态回执显示“第 37 条指令”。
  - 2026-08-15 current viewport screenshot 已由 in-app Browser 现场检查；旧 1280×720 文件只保留为
    纠错前历史布局证据，不用于证明 52 条结果。
- 跳过的检查及原因:
  - in-app Browser 当前固定为 1280×720，控制接口不支持改 viewport；900/720 两档的真实像素巡检留给
    reviewer/用户窗口缩放补验。响应式断点、DOM 可达性和组件回归已实现/通过，未把这项伪称已截图。

## 资源生成记录(如适用)

- Generation Owner: N/A
- 生成目的 / 替换对象: N/A
- 提示词要点 / 风格约束: N/A
- 输出路径: N/A
- 尺寸 / 格式 / 透明背景 / 调色约束: N/A
- 资源登记位置: N/A
- 验证方式: N/A

## 视觉验证记录(如适用)

- Visual Verification Owner: Codex
- Visual Verification Timing: dev-functional
- 验证方式: in-app Browser 直达 6010 PAL 工作台，当前 DOM snapshot + viewport screenshot + console logs；
  历史引用点击证据仍有效。
- 集中 E2E 用例 / 批次: N/A（功能性编辑器界面，开发期验证）
- 截图 / 像素检查路径: 2026-08-15 current viewport 由 in-app Browser 现场检查；2026-08-14 的
  `/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/type-pal-b2-battlefield-1280.jpg`
  仅是纠错前历史证据，不作为 52 条验收依据。
- 结论: 1280 档通过。首轮发现中栏与引用栏错误内嵌造成空白/挤压，修正为 shell 三栏后复验通过；
  PAL current 仅显示 `#006..#057` 共 52 条，预览、属性卡、引用卡均可操作，无白屏、无 console error。
- 未完成项: 900/720 实机像素复核（Browser 无 viewport 调整接口）；review/user 补验。

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: Codex 已完成上游领域分离、append-only authority、current/project rewind、再生成、回放与
  浏览器验证；GLM 首轮 counter 的 oracle R1 已修复并由 GLM 复核转 accept；Kimi 恢复后补架构审查。
- 已闭合返工项: PAL current/baseline 现在恰为 52 条 ids 6..57；通用 schema/UI 仍允许并显示作者显式
  创建的 id 0；历史 parent 与 C1/R13 replay 不改写。
- Accept / rework: **Codex accept；GLM accept；Kimi 缺席由用户豁免；User accept**

## 用户验收

- 用户结论: **通过（2026-08-15：“B2已经算完成了，不用等kimi了，继续推进吧”）**
- 后续任务: B2 完成后启动编辑器视觉/七环/代码质量三线总审查拆卡。

## 交接日志

- 2026-08-14 Codex: 完成四向前提真值核验与当前源码/数据盘点；确认 Battlefield 不拥有战斗站位，
  A7-2 资产闭环不等于 BattleFieldDef 七环；PAL 当前 58 条/140 显式引用/0 dangling。任务保持 draft，
  未修改实现文件。Evidence: 本卡前提矩阵与 PAL 基线。Next: Kimi/GLM 独立 premise + design 签字。
- 2026-08-14 GLM: 独立复算 census 全吻合，签 premise verified + design agree，附必改项 G1/G2。
- 2026-08-14 Kimi（主审）: 独立一手核实四向真值矩阵与 PAL 基线（含 32 处 startBattle.fieldId root
  分布实测），签 premise verified + design agree，附必改项 K1-K3；K1 对 GLM G1 做两处实测修正
  （s231 为场景 onEnter v13 machine state 非 enemy ai hooks；canonical v5 有 loop.body）。三方签字
  已齐，build 准入条件满足；Status 维持 draft 等用户拍板。未改实现文件，未改 Status。
  Next: 用户确认后交 Codex 进 build，落实 G1/G2/K1-K3。
- 2026-08-14 User/Codex: 用户在三方签齐后回复“签了”，批准 `draft -> build`；Codex 接任唯一
  Coding Owner，开始按 G1/G2/K1-K3 实现。Evidence: 本卡三方签字表 + 用户回复。Next: build/self-test。
- 2026-08-14 Codex: B2-1 实现、自测与 6010 功能性视觉验证完成，Status 转 `review`，Codex 签 accept。
  完整证据见 Build/视觉记录；能力地图未提前恢复。Next: Kimi/GLM 分别审查并签 accept/counter；两签后
  交用户验收，未齐不得 done。
- 2026-08-14 User/Codex: 用户指出 PAL 0-5 对应 UI/开场/主菜单背景，A7-2 已严格从战场域拆出；Codex
  复核 A7-2 冻结证据后确认 B2 “PAL 应显示 58 条”前提错误。任务立即由 review 转 rework，旧签字失效；
  纠正层为 PAL migration/legacy upgrade/generated authority，不允许只在 UI 隐藏。Next: 更新修正设计并
  重新取得三方 build 前签字。
- 2026-08-14 User/Codex: Kimi 额度预计次日中午恢复；用户在获知旧签字失效与补审要求后明确指示
  “修复吧”，批准本次窄范围 rework build 缺签豁免。Status 转 build；Codex 只改上游 PAL migration/
  legacy upgrade、测试与再生成证据，Kimi/GLM 补审前不得 done。
- 2026-08-15 Codex: rework build 完成并转 review。PAL current/baseline 为 52 条 `6..57`；新增
  `b2-battle-field-domain-v1` seal 与 B2→C1 current/project rewind；写入后同进程和 clean child 均
  `0/0/0`，6010 实机 52 条、无旧占位、0 console error。Kimi/GLM 补审前不得 done。
- 2026-08-15 GLM/Codex: GLM 终审签 counter R1，指出 PAL oracle 未重录。Codex 复现后发现生成器本身
  还未把 B2 纳入 input/transition projection，已修为 `P7→B2` current profile、重录 manifest/projection；
  oracle verify 2/2、migrate typecheck、diff-check PASS。等待 GLM 复核转 accept，不代签。
- 2026-08-15 GLM: 独立复核 R1 修复，确认 oracle input/profile/transition、state/source 指纹、
  managedFiles=551、oracle 2/2、test manifest、typecheck、diff-check 与 replay 全部闭合，转签 accept。
  Next: 仅待 Kimi 架构补审与用户验收；不得提前 done。
- 2026-08-15 User/Codex: 用户明确裁决 B2 已完成、无需等待 Kimi，批准 done 阶段缺席豁免；Codex 将
  Status 转 done、能力地图 B2 编辑器侧转 ✅，从进行中看板移除。Next: 启动 ED-DS-1 设计规范卡。

## 下一位 Agent 提示词

无下一位 Agent 提示词；B2-1 已由用户验收收口。后续工作进入独立的 ED-DS-1 设计规范任务。
