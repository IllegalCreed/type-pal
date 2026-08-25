# ED-PROJECT-STARTUP-IA-1 - 入口与开局 / 全局资源与启动工作台收口

Status: draft
Phase: phase2
Capability: X7
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: `codex/ed-project-startup-ia-1`

## 目标

在不重开 canonical 入口模型的前提下，把“入口与开局”“全局资源与启动”和项目概览中的入口摘要整理成清晰、紧凑、
可撤销的作者工作流：有序队伍用列表管理，库存/技能/世界资源使用标准重复行，全局音乐与音效都可原位试听，所有
增删、输入、帮助、响应式与滚动行为遵守统一设计系统。

## 范围

- 范围内:
  - “入口与开局”：默认入口标识、入口列表操作、队伍顺序、库存、初始技能、世界资源和现有 HP/MP 覆盖的 IA/控件收口。
  - 队伍改为“有序成员列表 + 可搜索添加器”，不再铺满候选 checkbox；上移/下移/移除保持稳定顺序。
  - 库存、技能、资源值复用标准重复行与标准新增/删除动作，窄宽度不折断动作。
  - “全局资源与启动”：按 `ASSET_ROLES` 与分组源动态渲染，音乐/音效原位试听与“打开资源页”分离。
  - 项目概览删除写死数量和重复流程编辑入口；启动链只保留有决策价值的摘要/帮助。
  - 所有连续输入复用 `ED-FIELD-COMMIT-1` 的字段提交合同。
- 范围外:
  - 不修改 `StartWorld`、`EntryPoint`、`AssetRole` schema；角色等级/装备/属性来源由 `ARCH-ENTRY-ACTOR-SEED-1` 决策。
  - 不改变标题菜单、introVideo、`?entry`、`?menu`、`?scene` 或运行时启动顺序。
  - 不重做音乐/音效工作台；仅复用现有项目资源解析器和单一试听通道。
- 明确不做:
  - 不恢复入口继承、默认开局模板、synthetic entry 或任何 fallback。
  - 不新增页面局部保存按钮，不让试听写入 `WorldState.audio.currentMusic`。
  - 不把自由世界资源键伪装成预制枚举；若功能价值不足，须以证据删除而非继续堆说明。

## 前提真值门

### 一句话行为 / 工程前提

- 当前 `entryPoints` 已是唯一完整入口表，`defaultEntryId` 只选择默认入口；本卡只改作者交互与信息层级，不改变这条
  数据真值，也不把项目设置页做成第二套运行时流程编辑器。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | N/A：这是二阶段项目作者工具；原版只提供内容参考，不定义本工作台 IA。 | `docs/phase2/READ-FIRST.md:1` |
| 第一阶段 | N/A：一阶段没有该 manifest 作者工作台；本卡不改变游戏内标题菜单形态。 | `docs/phase2/READ-FIRST.md:32` |
| 当前二阶段 | `EntryPoint.startWorld` 必填且完整，`defaultEntryId` 只选择；当前页面仍使用候选 checkbox、raw `btn`、写死“编辑 8 项设置”，音乐只“前往预览”而音效可原位播放。 | `packages/content/src/character.ts:52`、`:73`、`:89`；`packages/editor/src/ui/ProjectWorkbenchTab.tsx:693`、`:756`、`:911`、`:1430`、`:1660`；`packages/content/src/asset.ts:33` |
| 本任务目标 | 不改 schema/启动语义，只把现有字段与资源角色组织成统一、可理解、可试听、可撤销的工作台。 | 用户 2026-08-24 拍板；本卡验收条件 |

### 反证与替代解释

- 最强替代解释: 当前大块启动链能帮助新作者理解运行时分支，删除会降低可发现性；候选 checkbox 对少量角色更快。
- 什么观察会推翻当前前提: 用户测试显示结构化摘要/帮助无法回答启动路径，或搜索添加器对小项目明显增加操作步数。
- audit 红项如适用，已排查的替代根因:
  - runtime 语义 / 命令分类: canonical 启动语义已由 `ARCH-ENTRYPOINT-CANONICAL-1` 收口，不在本卡重判。
  - 原版 / 第一阶段理解: 无对应作者 UI，不以原版数据布局替代产品设计。
  - extractor / 地图 / 数据解码: 不适用；本卡不改 PAL 生成数据。
  - audit / test model: 必须以真实 12 个资源角色、角色/技能/物品数据和窄宽度浏览器验证，不能只用空 fixture。

### 用户可见偏离

- 是否主动偏离已核真值: yes
- `before -> after` 一句话: 分散 checkbox、raw 按钮、重复流程说明和跳转预览 -> 有序添加/重复行/原位试听/单一摘要的标准工作台。
- 代表场景: 编辑默认入口队伍与初始技能；在全局资源中试听默认战斗音乐；项目概览跳到对应唯一作者页。
- 用户裁决: 2026-08-24 用户要求将已指出的入口、开局、全局资源与启动缺陷系统收口。

## 上下文锚点

- 已拍板决策 / 铁律:
  - `ARCH-ENTRYPOINT-CANONICAL-1` 已完成且不重开：入口完整独立，无继承/伪入口/fallback。
  - 完整对象动作只有一个 owner；全局保存是唯一写盘入口；业务页必须消费设计系统。
  - 依赖 `ED-FIELD-COMMIT-1` 的连续字段合同和 `ED-DS-3` 冻结的重复行/动作 primitive。
- 代码锚点(`file:line`):
  - `packages/content/src/character.ts:52`
  - `packages/content/src/asset.ts:33`
  - `packages/editor/src/ui/ProjectWorkbenchTab.tsx:446`（资源角色绑定）
  - `packages/editor/src/ui/ProjectWorkbenchTab.tsx:693`（队伍）
  - `packages/editor/src/ui/ProjectWorkbenchTab.tsx:756`（库存/技能/资源/HP-MP）
  - `packages/editor/src/ui/ProjectWorkbenchTab.tsx:1083`（入口单一 commit）
  - `packages/editor/src/ui/ProjectWorkbenchTab.tsx:1430`（全局资源与启动）
  - `packages/editor/src/ui/ProjectWorkbenchTab.tsx:1639`（项目概览）
- 已知坑 / 审计文档:
  - `docs/ops/tasks/ARCH-ENTRYPOINT-CANONICAL-1-canonical-entry-model.md`
  - `docs/phase2/editor/editor-design.md:210`
  - `docs/phase2/editor/editor-design-system-v1.md:340`
- 不得重新引入:
  - 写死资源角色数量、raw `btn/tool`、页面私有试听器、入口继承、第二套保存、逐字符全局命令。
- 相关测试:
  - `packages/editor/src/ui/ProjectWorkbenchTab.test.tsx`
  - 入口 command/project IO/validator 既有测试；音频工作台单通道测试。

## 验收条件

- 功能:
  - 默认入口只是入口列表中的真实项和明确徽标；重排后仍由稳定 ID 指向同一入口。
  - 新建、复制、设默认、删除保护、undo/redo、保存重开保持 canonical 入口语义。
  - 队伍为有序列表 + 可搜索添加器；上移、下移、移除和键盘操作闭环，不显示候选 checkbox 墙。
  - 库存、技能、资源使用同一重复行合同；删除动作不换行，空态与新增路径清楚。
  - 音乐和音效都能原位试听；试听与打开资源页是两个明确动作；切曲停止前一资源。
  - 全局资源角色及分组由源码常量动态生成，界面无“编辑 8 项”等陈旧数字。
  - 项目概览只给摘要与唯一导航，不重复完整问题列表或第二套启动流程。
- 测试:
  - schema closure 测试证明 `ASSET_ROLES` 每项恰好进入一个可见分组，数量变化无需改文案。
  - 入口全操作、队伍顺序、重复行、原位试听、焦点与单步 undo 覆盖。
  - 连续字段命令次数遵守 `ED-FIELD-COMMIT-1`。
- 文档:
  - 更新 `docs/phase2/editor/editor-design.md:210`，删除“八项/四组”等过期描述并记录实际数据驱动合同。
- 视觉 / 手工验证:
  - PAL 真实工程下 1280、900、720px 检查两页与概览；无横向溢出、按钮折行、行高不齐、不可滚动或 popup 裁切。
- E2E 用例登记: N/A（功能性界面在 build 期最小浏览器验证）。

## 推进签字

### 进入 build 前:设计签字

- Codex:
  - premise: verified（`character.ts:73-96` 证明 canonical 入口模型；`ProjectWorkbenchTab.tsx:693-1017` 与 `:1430-1694` 证明现有交互/旧控件/写死摘要）
  - design: agree（业务 IA 与 schema 扩展拆卡，复用字段提交和设计系统 primitive）
- Kimi:
  - premise: verified（2026-08-24 独立直读，非代理）。canonical 入口模型现状属实：
    `character.ts:89-100` 必填非空 entryPoints + defaultEntryId 纯选择器（ARCH-ENTRYPOINT-CANONICAL-1
    已收口，本卡不重开）；当前页遗留属实——`ProjectWorkbenchTab.tsx:697-752` 队伍区 raw
    `<button className="btn">` 上移/下移/移出 + 原生 checkbox 候选墙；`:1643-1647` 项目名 raw
    `<input className="in">` 逐字符 dispatch；`:1686` 写死“编辑 8 项设置”而 `asset.ts:33`
    `ASSET_ROLES` 实为 12 项（本人枚举）；`:581` 音乐“前往预览”跳转代替原位试听。
    前提“只改作者 IA、不改数据真值”成立。
  - design: agree（2026-08-24，附 KP1-KP3，不阻塞准入）:
    - **KP1（试听复用 AUDIO 卡通道）**：原位试听必须消费 ED-AUDIO-WORKBENCH-1 交付的
      preview transport/factory（midi-preview.ts/audio-preview.ts），不得在项目页新写第三套
      音频播放路径；“切曲停止前一资源”由单一 preview owner 保证。
    - **KP2（有序队伍 + 可搜索添加器的键盘闭环）**：上移/下移/移除/添加全部键盘可达且有
      aria 状态反馈；重复行的删除动作窄容器换行规则遵循 DS 合同，不页面自定。
    - **KP3（构建顺序）**：本卡消费 `ED-FIELD-COMMIT-1` 字段合同与 `ED-DS-3` 的重复行/
      动作 primitive；在那两卡公共合同落地前，本卡 build 不得先写私有替代控件（依赖
      顺序即卡内“建议实施顺序”的延伸）。
  - 边界确认：卡面“明确不做”已覆盖入口继承/伪入口/fallback/写死数量/页面保存/逐字符命令；
    角色 seed schema（等级/装备/属性/初始技能所有权）完整留在 ARCH-ENTRY-ACTOR-SEED-1，
    本卡仅做现有 HP/MP 覆盖的 IA 收口，未偷塞 schema 扩展。
- GLM:
  - premise: **verified（2026-08-24，本人一手读码 + 独立枚举，非代理；与 Kimi 互证）**：
    1. **canonical 入口模型**：character.ts:89-100 必填非空 entryPoints + defaultEntryId
       纯选择器——ARCH-ENTRYPOINT-CANONICAL-1 产物完好，本卡不重开（独立确认）。
    2. **ASSET_ROLES 独立枚举 = 12 项**（asset.ts:33-46 本人数出：audio 9 + video 2 +
       visual 1）；`:1686` 写死"编辑 8 项设置"与 12 不符——陈旧数字实锤。
    3. **raw 控件残留**：ProjectWorkbenchTab :806/:818/:878 三处 `className="btn"`
       （队伍上移/下移/移出区）；项目名 raw input 逐字符 dispatch（FIELD-COMMIT 卡
       已核）；:581 音乐"前往预览"跳转代替原位试听。
    4. **试听通道可复用**：midi-preview.ts 的 MidiPreviewTransport 接口 +
       editor audio-preview.ts 在位（AUDIO 卡产物）——KP1 复用方案可行。
    5. **入口单一 commit**：:1083-1085 SetStartupEntriesCommand 原子提交在位
       （ARCH 卡产物），本卡 IA 改造不改此边界。
  - design: **agree（2026-08-24，附 GP1-GP2，不阻塞准入；KP1-KP3 全部同意并互补）**：
    - **GP1（动态分组闭合测试的数据面）**：schema closure 测试除"每项恰好一个分组"外，
      须断言 **分组定义由 ASSET_ROLES 结构派生（kind 前缀）而非第二份手写分组表**——
      12 项当前恰好 audio.*/video.*/visual.* 三前缀，若未来新增第四类前缀分组测试
      应自动红，而不是静默落入"其他"。
    - **GP2（试听单通道断言）**：原位试听与"打开资源页"的分离须有测试证明项目页
      preview 与资源页 preview **不共存**（项目页试听中切到资源页则前者停止）——
      单一 preview owner 的机检形态；另试听不写 WorldState.audio.currentMusic 的
      断言（卡文"明确不做"的测试化）。
  - 独立反证：若 ASSET_ROLES 出现无法归 kind 的角色名（当前 12 项均有 audio/video/
    visual 前缀），GP1 分组测试红即停线重估分组规则。
- 独立反证审查（至少一位非 Coding Owner 必填）:
  - 审查者: Kimi（2026-08-24）
  - 独立证据锚点: `packages/content/src/character.ts:89-100`（canonical 入口模型）；
    `packages/content/src/asset.ts:33-47`（ASSET_ROLES 12 项枚举）；
    `packages/editor/src/ui/ProjectWorkbenchTab.tsx:581,697-752,1643-1647,1686`
    （跳转预览/原始控件/逐字符命令/写死数量）；`packages/editor/src/ui/AudioAssetWorkbench.tsx:600-697`
    与 `packages/reforge/src/audio/midi-preview.ts:20-32`（可复用的试听通道与 transport 接口）。
  - 可证伪观察: 若 `ASSET_ROLES` 存在无法按 kind 分组的异常角色，动态分组前提动摇——12 项枚举
    全部落在 audio/video/visual 三类；若 ED-FIELD-COMMIT-1/ED-DS-3 冻结的 primitive 无法表达
    有序队伍或重复行，本卡须退回重签——两卡设计均已含对应合同且三签齐；若某启动链说明被删后
    作者无法理解 `?entry`/`?menu`/`?scene` 优先级，摘要+DsHelpTip 方案不足——用户裁决条款已覆盖。
- counter / 分歧处理: N/A
- 缺签豁免: N/A
- build 准入结论: blocked——Kimi（KP1-KP3）+ GLM（GP1-GP2）签字齐；**build 排期硬前置：ED-DS-3 与 ED-FIELD-COMMIT-1 公共合同实际落地后**（两卡本席已签 premise/design，见各自任务卡）

### 进入 done 前:审查签字

- Codex: pending
- Kimi: pending
- GLM: pending
- counter / 返工处理:
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论

- 页面仍采用左侧真实对象/分组、中央标题与主编辑、必要时右侧 Inspector 的统一壳；启动链退为紧凑摘要和帮助。
- 队伍采用 ordered collection；候选角色通过搜索/选择添加，选中成员行动作复用标准 reorder/remove 控件。
- 库存/技能/资源使用同一 `repeatable row` recipe；选择/值/动作保持单行，窄容器按规范降为明确的上下块。
- 资源角色列表由 typed registry 派生 label/kind/group/required/preview capability，杜绝 UI 单独维护数量与分组。
- 音乐/音效试听共用现有 resolver/player；资源页导航使用真实 action link，不拿“前往预览”代替播放。

### 已知风险

- 风险: 与 `ED-FIELD-COMMIT-1`、`ED-DS-3` 同时修改公共控件和 `ProjectWorkbenchTab` 容易冲突。
- 缓解: 先冻结两张基础卡公共合同，本卡只在随后采用；同一时刻只允许一个 Coding Owner 改实现。
- 风险: 启动链说明删得过多会失去运行时分支解释。
- 缓解: 保留一句摘要 + 有价值的 `DsHelpTip`，不保留第二套大型流程面板。

### 主审立场

- Reviewer: Kimi
- 结论: agree（2026-08-24；canonical 入口不变前提直读核实，KP1-KP3 已写回）
- 必改项: 无新增；KP1（试听复用 AUDIO 卡通道）与 KP3（构建顺序在 DS-3/FIELD-COMMIT-1 之后）为 build 约束。
- 是否建议进入 build: 是（待 GLM 签字；排期上须在两张基础卡之后）

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件: pending
- 实现摘要: pending
- 运行命令: pending
- 浏览器 / 手工检查: pending
- 跳过的检查及原因: pending

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: pending
- 必须返工项: pending
- Accept / rework: pending

## 用户验收

- 用户结论: pending
- 后续任务: 角色完整初始状态由 `ARCH-ENTRY-ACTOR-SEED-1` 独立决定。

## 交接日志

- 2026-08-24 Kimi: 独立核 canonical 入口模型不变前提（character.ts:89-100）、ASSET_ROLES 12 项枚举、
  当前页遗留（raw btn/checkbox 墙/写死“编辑 8 项”/“前往预览”/逐字符命令）；确认边界完整（不恢复继承/
  伪入口/fallback、seed schema 留在 ARCH-ENTRY-ACTOR-SEED-1）；签 premise verified + design agree
  （附 KP1-KP3）。待 GLM 签字；build 排期在 ED-DS-3/ED-FIELD-COMMIT-1 公共合同之后。未修改实现文件。
- 2026-08-24 Codex: 核对 canonical 入口、12 项资源角色和当前页面遗留，开独立 IA 卡。Next: Kimi/GLM 设计签字。

## 下一位 Agent 提示词

```text
接手任务: ED-PROJECT-STARTUP-IA-1 入口与开局 / 全局资源与启动工作台收口
任务卡: docs/ops/tasks/ED-PROJECT-STARTUP-IA-1-project-entry-startup-workbench.md
当前状态: draft；build blocked
你的角色: Kimi 或 GLM 设计审查者
先读: AGENTS.md、docs/phase2/READ-FIRST.md、ARCH-ENTRYPOINT-CANONICAL-1、本任务卡、editor-design.md:210、ProjectWorkbenchTab 相关锚点
已完成: 已把业务 IA 与角色 seed schema 扩展拆开，列明队伍/重复行/资源角色/原位试听/概览收口验收
请你做: 独立核 canonical 入口不变前提，审队伍添加器、资源 registry、试听与响应式闭环并在卡内签字
不要做: 不得改 schema 或实现；不得恢复入口继承/伪入口；三签未齐不得进入 build
输出要求: premise verified/counter、design agree/counter、直接证据、必改项
```
- 2026-08-24 GLM（覆盖/数据/测试矩阵）: 审查完成，签 **premise verified + design agree
  （附 GP1-GP2）**。ASSET_ROLES 12 项独立枚举（audio 9+video 2+visual 1）vs :1686 写死
  "8 项"实锤；raw btn 三处/跳转预览/逐字符 dispatch 独立确认；midi/audio preview 通道
  可复用（KP1 可行）；入口原子 commit 边界完好。GP1 钉分组由结构派生+第四类前缀自动红；
  GP2 钉试听单通道与不写 WorldState 断言。**build 硬前置：ED-DS-3/FIELD-COMMIT 公共
  合同落地**。未改实现，未代签 Kimi。
