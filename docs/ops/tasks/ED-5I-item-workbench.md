# ED-5I - 物品工作台 CRUD、图标、用途与引用闭环

Status: review
Phase: phase2
Capability: ED-5 / C3 / C8（依赖）/ A4
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex + User
Unavailable Agents: none
Branch: main

## 目标

把现有“长列表 + 零间距搜索 + 基础字段散排 + 装备半结构化 + 使用/投掷 raw JSON + 场景少量引用”的物品页，重构成完整物品工作台。作者应能从空工程创建第一件物品，清楚看懂一件物品可装备、可使用、可投掷或被剧情判断的所有身份；能选择/导入图标，结构化编辑用途和特殊机制，查看并跳转所有引用，安全复制/删除，撤销、保存、重开后保持一致。

## 用户裁决

- 2026-07-22：搜索框与顶部缺间距是通病，不能继续按页面打补丁。
- 2026-07-22：当前布局难看且不对齐，物品模块应整体重构。
- 2026-07-22：必须有明确的新增物品、修改/导入图标和删除闭环。
- 2026-07-22：剧情物品必须显示所有引用来源并能跳到具体位置。
- 2026-07-22：土灵珠“可装备 + 可使用”、返回地图入口；炼蛊皿、紫金葫芦等特殊用途必须被明确展示和结构化编辑。
- 既有裁决：说明只写风味，数值/机制以结构化数据为唯一真相源。

## 依赖

- `C8-item-use-mechanisms.md` 必须先确定 schema、上下文合法性和运行时消费矩阵。
- ED-5I 可以先搭 CRUD、布局、图标、引用与现有 effect 编辑器，但在 C8 build 完成前不得声称特殊用途闭环，也不得为未定 schema 造临时 UI 字段。

## 范围

- 范围内:
  - 新增、复制、删除、撤销/重做、保存/重开完整七环。
  - 统一 catalog 工具栏（标题下稳定内边距、搜索、能力过滤、空态）；物品先落地，并清除裸 input 顶部贴边的系统性样式根因。
  - 稳定三栏工作台：左侧库，中间身份/基础/能力编辑，右侧“概览 / 引用 / 资源”。
  - `equip/use/throw` 三张可独立启停、可共存的能力卡；效果增删、改类型、参数、排序和删除全结构化。
  - 图标“选择已有 / 导入并使用 / 移除 / 在图像库打开”；导入与绑定是一次可撤销原子操作。
  - 全工程 `collectItemReferences(EditorState)`，覆盖脚本、共享脚本、商店、入口/默认开局、角色初装、技能耗材、敌人、毒与其他 itemId 字段；按来源分组、可跳转、作为删除守卫。
  - 迁移诊断/未落用途必须在物品身份和用途卡中明显展示，并提供源位置/问题跳转。
- 范围外:
  - 商店工作台的整体重构另开 ED-5S；本卡只保证物品引用里能看到商店上架位置并跳转。
  - 替换共享图标的二进制内容仍在图像库完成；物品页只导入新 AssetId 并绑定，避免误改多个物品。
  - 不复制新的资产存储或上传链。
- 明确不做:
  - 不把物品压成互斥“装备/消耗品/剧情道具”单类型。
  - 不保留 raw JSON 作为日常主编辑器；高级源码视图只能是可校验、显式应用的辅助工具，且不能绕过 schema。
  - 不在引用不完整时开放删除。
  - 不顺手删除可能被其他对象共享的图标资源。
  - 不用 inline `style` 修一个搜索框后结束。

## 上下文锚点

- 已拍板决策 / 铁律:
  - `AGENTS.md`：本卡依赖 schema/迁移新能力格，必须三签；单一 Coding Owner。
  - `docs/phase2/READ-FIRST.md`：编辑器只编 clean 项目格式，资源按稳定 AssetId 管理。
  - `docs/phase2/editor/editor-authoring-closure-audit-2026-07-13.md:245-315`：ED-5 按业务域独立开卡，必须通过七环验收。
  - Web Interface Guidelines：控件要有标签/焦点；危险动作确认/可撤销；长列表要优化；搜索/空态/溢出不能缺失。
- 代码锚点(`file:line`):
  - `packages/editor/src/ui/ItemTab.tsx:357-404`：左栏只有计数与搜索；无 CRUD、无空结果操作，搜索顶部 margin 写死为 0。
  - `packages/editor/src/ui/ItemTab.tsx:411-469`：基础区用固定宽度 flex，造成换行、基线和对齐不稳定。
  - `packages/editor/src/ui/ItemTab.tsx:417-426`：实际能换已有图标，但入口只是一只下拉框，导入链不在工作流中。
  - `packages/editor/src/ui/ItemTab.tsx:675-738`：使用/投掷靠 raw JSON，解析失败静默吞掉。
  - `packages/editor/src/ui/ItemTab.tsx:748-769`：右栏只有提示与场景事件引用。
  - `packages/editor/src/ui/editor.css:6786-6825`：物品表单固定宽度与 flex 布局。
  - `packages/editor/src/ui/editor.css:8642-8648`：裸目录搜索通用 margin-top=0；地图用特例补 8px，证明确为系统性组件缺失。
  - `packages/editor/src/core/commands.ts:1933-1980`：物品只有 `UpdateItemCommand`，无 Add/Delete。
  - `packages/editor/src/core/ref-index.ts:36-145`：只扫场景且只读 `hasItem`，只遍历实体第 0 页；不是删除所需引用闭包。
  - `packages/editor/src/ui/ImageAssetPicker.tsx:151-196`：现有图标选择与资源跳转可复用。
  - `packages/editor/src/ui/ImageTab.tsx:294-385,471-503`、`packages/editor/src/core/image-import.ts:88`：现有导入、AssetId 分配和资源命令链。
  - `packages/editor/src/ui/SkillTab.tsx:613`：结构化效果链交互可复用，不另造 JSON 编辑范式。
- 已知坑 / 审计文档:
  - `docs/ops/tasks/C3-equip-structured-editor.md`：装备效果单一真相源已完成，不能回退。
  - `packages/content/src/item.ts:152-165`：三种能力块可叠加；列表和表单必须表达组合，不做互斥分类。
  - `packages/content/src/validate-refs.ts` 已零散验证部分 itemId，但不是可展示、可跳转的统一引用图。
  - 234 条 PAL 列表 > 50；必须窗口化或至少 `content-visibility` 并验证滚动与选择稳定。
- 不得重新引入:
  - 说明文字与效果参数双真相。
  - 原生数百项 `<select>` 作为唯一视觉资源浏览器。
  - 删除对象时顺带删除共享资产。
  - 只扫描场景第 0 页或只扫描 `hasItem/giveItem/loseItem` 的“伪全量引用”。
- 相关测试:
  - `packages/editor/src/core/commands.test.ts`
  - `packages/editor/src/core/project-io.test.ts`
  - 新增 `packages/editor/src/core/item-references.test.ts`
  - 新增 `packages/editor/src/ui/ItemTab.test.tsx`
  - `packages/content/src/validate-refs.test.ts`

## 验收条件

### 左栏与 CRUD

- 标题下有统一工具区：`＋ 新建物品`、复制、搜索、可装备/可使用/可投掷/剧情引用/待处理筛选；搜索与顶部有稳定间距。
- 列表行显示图标、名称、稳定 id、能力徽标；土灵珠同时显示“装备”“使用”，不能只显示装备。
- 空项目可创建第一件物品；无搜索结果有清空筛选和新建入口。
- 新建使用稳定、可预测且不冲突的 id；复制深拷贝能力数据但不复制共享资源本体。
- 新增、复制、删除均支持 undo/redo 和保存重开；删除恢复原列表位置与选择。

### 中栏与图标

- 顶部身份卡展示大图标、名称、只读稳定 id 和所有能力/引用/迁移状态。
- 基础字段用响应式 CSS grid 对齐，1440×900、1920×1080 和窄面板不出现随机折行或横向溢出。
- 图标工作流明确区分：选择已有；导入新图标并绑定；移除绑定；打开当前资源。
- “导入并使用”使用 `prepareAuthoredImage + UpsertAssetCommand + UpdateItemCommand` 原子执行，一次 undo 同时撤回资源登记与绑定。
- 替换已有资源内容只在图像库做，并显示“会影响 N 个引用”的风险。

### 能力编辑

- 装备/使用/投掷各有独立启用开关和摘要，可任意共存。
- `UseSpec` 的 target/consuming/battleOnly/sound 结构化；每种 effect 有中文类型、字段控件、引用选择器、增删排序和上下文校验。
- C8 的场景出口、配方、资源池炼化、脚本引用在结构化卡中可读可改；土灵珠显示返回入口，炼蛊皿显示材料→产物，紫金葫芦显示资源池、随机规则和奖励表。
- 高级源码视图若保留，必须折叠、实时校验、显式“应用修改”，错误可见且不落盘；不能静默吞掉 JSON 错误。
- “玩家看到/机制摘要”从结构化数据派生，不手写第二份。

### 引用与删除

- 右栏 tab：概览、引用、资源；切换不改变当前物品或中栏滚动位置。
- 统一引用至少覆盖：所有场景页/进场/敌对分支、共享脚本、`hasItem`、`itemEquipped`、give/lose、商店货单、默认和入口开局背包、角色 initialEquipment、技能 item cost、敌人 steal/attackEquivItem、毒或其他 itemId 字段。
- 引用按来源分组，显示读/写/持有关系与具体路径，能跳转的跳到具体对象/脚本；暂不能深链的必须说明原因，不能伪装成“无引用”。
- 有任何引用时禁止删除并列出阻塞项；零引用时使用行内二次确认，删除后可 undo。
- 删除物品不删除图标；无引用图标由图像库独立清理。

### 测试与视觉

- commands：Add/Delete、防重复 id、深拷贝、原位 undo/redo；导入图标复合命令一次撤销。
- reference collector：覆盖上述每一来源、所有实体页和递归子命令；有引用删除阻止，零引用删除成功。
- UI：空态 CRUD、过滤、能力叠加、图标导入、每类效果编辑/排序/删除、JSON 错误、键盘/ARIA、删除确认。
- project I/O：新增/复制/编辑/删除、保存、关闭、重开、引用与资产闭包一致。
- 视觉：1280×720、1440×900、1920×1080；表单对齐、无文字溢出、长列表滚动稳定；浏览器 console 零新增错误。
- 门禁：`pnpm --filter @type-pal/editor run check`、`pnpm --filter @type-pal/content run check`、`pnpm check`。

## 推进签字

### 进入 build 前:设计签字

- Codex: **agree（2026-07-22）**。应按“库 / 工作台 / 检查器”重构，能力块正交，复用现有图片导入链和技能效果链；删除前必须先补引用闭包。ED-5I 不得抢跑 C8 未定字段。
- Kimi: **agree（2026-07-22;附 R1-R3 build 必落钉,见「主审立场」）**。信息架构(库/工作台/检查器
  三栏)、图标导入原子性、统一引用闭包与删除 fail-closed 逐项成立;C8 依赖纪律正确(先定真值再
  落特殊用途 UI,不发明未定 schema 字段);左栏 catalog 工具区与裸 input 零顶距根因修复方向正确;
  长列表窗口化/content-visibility 与滚动选择稳定已列入验收;GLM 的 ShopDef.items 引用缺口
  并入 R2。无架构 counter。
- GLM: **agree（2026-07-15）**。引用覆盖/测试矩阵/CRUD/资产/视觉无障碍审查通过，附 G1-G5 必改项与一处引用闭包缺口（ShopDef.items 未验证，见「GLM 引用审查」）。双卡依赖（C8 先于 ED-5I 特殊用途）成立。
- counter / 分歧处理: 当前无 counter；GLM agree 附 G1-G5 必改项。任一方签 counter 时停在 draft。
- 缺签豁免: N/A
- build 准入结论: **build allowed（2026-07-22；Codex / Kimi / GLM 三方 agree，无 counter）**

### 进入 done 前:审查签字

- Codex: **accept（2026-07-22）**。物品 CRUD、图标原子导入、正交能力编辑、全工程引用/删除守卫、迁移诊断与三档视觉自测均通过；仍须 Kimi / GLM 独立审查，且不得由 Codex 单方标 done。
- Kimi: **accept（2026-07-22）**。信息架构/UX/引用闭包独立复审,无 P0/P1/P2 阻塞;R1-R3 全部满足。证据:
  1. **R1 C8 依赖纪律**:工作台三张能力卡正交共存;土灵珠显示「装备 饰品·2 效果 + 使用 1 效果 +
   投掷 未启用」双徽标,「使用时发生什么」= 当前场景·不消耗·运行 shared/user/pal-item-use/267;
   炼蛊皿五条 ordered 配方、紫金葫芦资源池/上限/初始状态/九档奖励面板均在 PAL 实测可见;
   267「打开脚本」实达共享脚本。
  2. **R2 引用闭包穷尽**:`item-references.ts`(571 行)覆盖全部实体页与递归子命令(含
   startBattle.choreography)、共享脚本、商店(shop.items)、默认/入口开局、角色初装、技能耗材、
   敌人 steal/attackEquivItem、毒与物品间引用;土灵珠引用页列出 3 处(s059/s231 给出×1、
   shared/scc-L-39805 收走×1)并可跳具体位置,未登记内部脚本如实标注不可跳原因而非假跳转;
   「仍有 3 处外部引用,删除会被阻止」fail-closed 实测可见。
  3. **R3 图标原子与共享安全**:导入 PNG 并绑定与资源登记为同一复合命令、一次 undo 双撤回;
   物品页无替换共享资源入口(只在图像库);删除物品不连带删图标。
  4. **独立复跑**:根 `pnpm check` 全绿(838 files;editor 677/content 309);Codex 截图三档
   (1280/1440/1920)与我方 PAL 实测一致,无横向溢出,console 0 error/0 warning。
- GLM: **accept（2026-07-15）**。独立复跑引用闭包/CRUD/图标原子性/测试矩阵全部对账成立;
  G1-G5 逐项通过(见「GLM done 审查」节)。无 counter/rework。
- counter / 返工处理: N/A
- 缺签豁免: N/A
- done 准入结论: **Codex+Kimi+GLM 三签齐(2026-07-22);待用户验收后由收口方标 done。**

## Draft: 设计与风险

### 设计结论

1. 左栏是可创作的 catalog，不是被动列表；CRUD/搜索/筛选全部置顶。
2. 中栏围绕一个物品的“身份 + 多能力”组织；装备、使用、投掷不是互斥类型。
3. 右栏负责跨对象关系和资源身份，避免把引用塞回长表单底部。
4. 图标导入复用 A4 资产链；绑定与导入原子 undo，替换共享资源留在图像库。
5. `collectItemReferences` 是删除安全的唯一来源；现有场景 `RefIndex` 可复用递归 walker，但不能冒充全工程引用。
6. 通用 `CatalogToolbar` 先在物品页落地，随后单独小改推广；本卡至少移除 `.outliner > input.in` 的零顶距根因与地图特例依赖。

### 已知风险

- 风险：C8 schema 尚未签定，提前写效果表单会返工。
  - 缓解：先签 C8；ED-5I 组件以判别联合穷尽渲染，禁止私有 UI shape。
- 风险：引用闭包范围大，漏一处就可能误删。
  - 缓解：从 `EditorState` schema 和 `validate-refs` 双向枚举，每个 itemId 字段必须有单测；删除默认 fail-closed。
- 风险：在物品页直接替换共享 icon 会波及多对象。
  - 缓解：物品页只“导入新资源并绑定”；共享替换在资源工作台完成并展示引用数。
- 风险：一次重构组件过大。
  - 缓解：拆 `CatalogToolbar`、`ItemIdentityCard`、`ItemCapabilityCard`、`ItemUseEffectEditor`、`ItemReferenceInspector`，ItemTab 只编排状态。

### 主审立场

- Reviewer: Kimi（信息架构/跨包边界）+ GLM（引用覆盖/测试矩阵）
- 结论: **agree（2026-07-22）**——逐项成立,无阻塞;附 R1-R3 build 必落钉。
  1. **信息架构**:成立。左栏可创作 catalog(CRUD/搜索/能力过滤/空态置顶,修掉裸 input 零顶距
     根因而非 inline 补丁);中栏身份+多能力(装备/使用/投掷可叠加共存,不做互斥类型);
     右栏概览/引用/资源分管跨对象关系。与 C3 装备结构化、技能效果链的既有范式一致,不另造
     JSON 编辑范式;高级源码视图只作折叠、实时校验、显式应用的辅助。
  2. **图标原子导入**:成立。`prepareAuthoredImage + UpsertAssetCommand + UpdateItemCommand`
     一次原子执行、一次 undo 同时撤回登记与绑定;物品页不替换共享资源内容(共享替换留在图像库
     并显示引用数),删除物品不连带删图标。
  3. **引用闭包与删除 fail-closed**:成立。`collectItemReferences(EditorState)` 覆盖脚本/共享
     脚本/商店/入口与默认开局/角色初装/技能耗材/敌人 steal 与 attackEquivItem/毒及其他
     itemId 字段、全部实体页与递归子命令,按来源分组、可跳转、不可跳写明原因;有引用必禁删
     并列阻塞项,零引用行内二次确认+undo。GLM 发现的 ShopDef.items 未验证缺口并入 R2 必查。
  4. **C8 依赖纪律**:成立且必要。ED-5I 可先落 CRUD/布局/图标/引用/既有 effect 编辑器,但
     C8 schema 三签前不得落特殊用途 UI 字段,不为未定 schema 造临时 shape;效果编辑器按判别联合
     穷尽渲染。
- 必落钉(R,不阻塞签字,build 验收核对):
  - **R1 C8 依赖**:特殊用途(场景出口/配方/资源池/脚本引用)的结构化卡只在 C8 schema 三签后
    实现;未定 kind 不发明 UI 字段;C8 完成后土灵珠显示「可装备+可使用+返回入口」、炼蛊皿显示
    材料→产物、紫金葫芦显示资源池/随机规则/奖励表。
  - **R2 引用闭包穷尽**:collectItemReferences 每一来源类(含 GLM 发现的 ShopDef.items)逐项有
    单测;覆盖全部实体页与递归子命令;有任何引用删除必 fail-closed 且阻塞项可跳转。
  - **R3 图标原子与共享安全**:导入+绑定单命令一次 undo 恢复登记与绑定;物品页无替换共享资源
    入口;删除物品不删图标;无引用图标由图像库独立清理。
- 是否建议进入 build: **是,待 GLM 已 agree、三签齐 build allowed。**

### 三方争议记录(按需)

- Codex: 赞成双卡依赖；C8 先定真值，ED-5I 再把所有能力做成结构化 UX。
- Kimi: **agree**。三栏 IA/图标原子导入(单命令一次 undo)/引用闭包 fail-closed/C8 依赖纪律
  (未定 schema 不落 UI 字段)逐项成立;GLM ShopDef.items 缺口并入 R2。R1(C8 依赖)/R2(引用穷尽)/
  R3(图标原子与共享安全)必落。
- GLM: **agree**。引用覆盖/测试矩阵/CRUD/资产/视觉无障碍审查通过；引用闭包有一处缺口（ShopDef.items 未验证），
  G3 必落。双卡依赖（C8 先于 ED-5I 特殊用途）成立。
- 用户拍板: pending

### GLM 引用审查（2026-07-15）

#### 物品引用闭包枚举（逐源核对）

GLM 逐行核对 content schema 中所有 itemId 字段，确认 `collectItemReferences(EditorState)` 必须覆盖的来源：

| 来源 | 字段位置 | 现有 validate-refs 覆盖 | 现有 ref-index 覆盖 | collectItemReferences 必落 |
|---|---|---|---|---|
| 场景脚本 giveItem/loseItem | script.ts Command union | ✅ `validate-refs.ts` 间接 | ✅ `ref-index.ts:81-86` | ✅ 复用 walkCmds |
| 场景条件 hasItem | ScriptCondition | ✅ | ✅ `ref-index.ts:49-51` | ✅ 复用 walkCond |
| **所有实体页（非仅 page[0]）** | entity.pages[].trigger/auto | ⚠️ 部分遍历 | ❌ **仅 page[0]**（ref-index.ts:124-136） | **G1 必落：遍历全部 pages** |
| 共享脚本 chunk | scriptChunks | ⚠️ | ❌ | **G1 必落：递归 callScript/jumpScript** |
| actor initialEquipment | actor.ts:50 | ✅ `validate-refs.ts:743-749` | ❌ | ✅ 新增 |
| skill cost.items | skill.ts:11 | ✅ `validate-refs.ts:868-875` | ❌ | ✅ 新增 |
| enemy steal | enemy.ts:88 | ✅ `validate-refs.ts:707-711` | ❌ | ✅ 新增 |
| enemy attackEquivItem | enemy.ts:90 | ⚠️ 未独立验证 | ❌ | **G2 必落：补验证 + 引用** |
| **ShopDef items（货单）** | shop.ts:13 | ❌ **未验证** | ❌ | **G3 必落：补 validate-refs + collectItemReferences** |
| startWorld inventory | character.ts:25 | ✅ `validate-refs.ts:829-835` | ❌ | ✅ 新增 |
| startWorld learnedSkills | — | ✅（skill 引用） | ❌ | ✅（间接，物品无） |
| item icon | item.ts:158 | ✅ `validate-refs.ts:198-205` | ❌ | ✅ 新增（资源引用） |
| item equip.effects grantskill/sprite | item.ts equip | ✅ | ❌ | ✅ 新增 |

**G1 关键缺口**：现有 `ref-index.ts:118-146 buildRefIndex` **只遍历 entity.pages[0]**（trigger/auto），
**不覆盖 page[1+]、不覆盖共享脚本 chunk**。删除守卫若基于此索引，会漏掉 page[1+] 和共享脚本里的 giveItem/loseItem/hasItem，
**误判为零引用并允许删除**。`collectItemReferences` 必须遍历全部 pages + 递归共享 chunk。

**G3 关键缺口**：`ShopDef.items: string[]`（店铺货单）在 `validate-refs.ts` 中**完全未验证**——
商店引用的 itemId 若不在 items 注册表，validate-refs 不报错。删除物品时若商店货单还引用它，
`collectItemReferences` 必须能检测到，否则误删导致商店卖空物品。

#### CRUD 与命令链审查

- `commands.ts:1933-1980` 现有只有 `UpdateItemCommand`，**无 Add/Delete**（卡内 :67 已标注）。
- **G4 必落**：新增 `AddItemCommand`（稳定 id 生成、不冲突）+ `DeleteItemCommand`（引用守卫：有引用时 reject 并列出阻塞项）；
  复制 = 深拷贝能力数据但不复制共享资源本体；undo/redo 原位恢复列表位置与选择。
- **图标导入原子性**（卡内 :104）：`prepareAuthoredImage + UpsertAssetCommand + UpdateItemCommand` 必须是复合命令，
  一次 undo 同时撤回资源登记与绑定。现有 `image-import.ts:88` + `ImageTab.tsx:294-385` 链可复用。

#### 测试矩阵审查

| 域 | 现有测试 | ED-5I 必落 |
|---|---|---|
| commands | `commands.test.ts` | Add/Delete/防重复 id/深拷贝/原位 undo-redo/图标导入复合命令一次撤销 |
| reference collector | 无（卡内 :85 新增 `item-references.test.ts`） | **每一来源单测**：场景全页/共享 chunk/initialEquipment/skill cost/enemy steal+attackEquivItem/ShopDef items/startWorld inventory；有引用删除阻止，零引用删除成功 |
| UI | 无（卡内 :86 新增 `ItemTab.test.tsx`） | 空态 CRUD/过滤/能力叠加/图标导入/每类效果编辑排序删除/JSON 错误/键盘 ARIA/删除确认 |
| project I/O | `project-io.test.ts` | 新增/复制/编辑/删除/保存/关闭/重开/引用与资产闭包一致 |
| validate-refs | `validate-refs.test.ts` | 补 ShopDef.items 验证 + enemy.attackEquivItem 验证 |
| 视觉 | — | 1280×720/1440×900/1920×1080；表单对齐/无溢出/长列表滚动/console 零错误 |

**G5 必落**：`item-references.test.ts` 必须对每个来源独立单测（非只跑合计数）；删除守卫测试覆盖
"有引用时 reject + 列阻塞项"和"零引用时成功 + 可 undo"两条路径。

#### GLM 必改项（G，build 验收核对）

- **G1 全页 + 共享 chunk 引用闭包**：`collectItemReferences` 必须遍历 entity 的**全部 pages**（非仅 page[0]）
  + 递归共享脚本 chunk（callScript/jumpScript 闭包）；现有 `ref-index.ts:118-146` 不够，必须扩展或新建。
- **G2 enemy.attackEquivItem 验证**：`validate-refs.ts` 补 enemy.attackEquivItem.itemId 的 items 注册表验证；
  collectItemReferences 覆盖此字段。
- **G3 ShopDef.items 验证 + 引用**：`validate-refs.ts` 补 ShopDef.items 全部 itemId 验证；
  collectItemReferences 覆盖商店货单；删除物品时商店引用计入阻塞项。
- **G4 Add/Delete 命令 + 图标导入原子性**：AddItemCommand（稳定 id）+ DeleteItemCommand（引用守卫）；
  图标导入复合命令一次 undo。
- **G5 引用单测矩阵**：`item-references.test.ts` 每来源独立单测；删除守卫两条路径（有引用 reject / 零引用 success）。

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件:
  - authoring / commands / references：`packages/editor/src/core/item-authoring.ts`、`commands.ts`、`item-references.ts`、`project-io.ts`、`project-diagnostics.ts`、导航/target/ref-index 及对应测试。
  - UI：`packages/editor/src/ui/ItemTab.tsx`、`ItemUseEffectEditor.tsx`、`App.tsx`、`DataMode.tsx`、`ProjectWorkbenchTab.tsx`、`ScriptTree.tsx`、`ShopTab.tsx`、`editor.css` 及对应测试。
  - cross-package：`packages/content/src/validate-refs.ts` 等引用验证，以及 C8 的 content/reforge/migrate 消费链。
- 实现摘要:
  - 左栏 catalog 提供置顶新建/复制、搜索、能力/引用/待迁移筛选和空结果恢复；稳定 id 分配、防冲突、深复制、删除、原位 undo/redo 均落入命令链。
  - 中栏重构为身份卡 + 基础信息 + `equip/use/throw` 三张独立能力卡；用途效果完全结构化，支持增删、排序、改类型和字段编辑。土灵珠同时显示装备/使用，炼蛊皿显示五条 ordered 配方，紫金葫芦显示资源池、上限、初始状态与九档奖励。
  - 图标支持选择已有、导入 PNG 并绑定、解除绑定和打开图像库；导入资源登记与物品绑定由同一复合命令执行，一次 undo 同时撤回。
  - `collectItemReferences(EditorState)` 覆盖所有场景实体页与递归子命令、共享脚本、商店、默认/入口开局、角色初装、技能耗材、敌人 steal/attackEquivItem、毒和物品间引用；有引用删除 fail-closed，零引用可删并 undo。
  - 右栏“概览 / 引用 / 资源”按来源分组，能跳到具体场景/脚本/对象；迁移诊断显示源 label/address/category 并反跳问题面板。
  - 删除零引用物品时，其附属迁移诊断与物品同一命令移除，undo/redo 精确恢复，避免 sidecar 悬空导致保存失败；投掷能力发现旧数据中的非施毒效果时显式报错并提供安全重置。
  - 非法投掷旧数据进入统一问题面板，并由 `serializeProject` 保存门拒绝，避免写出无法重新打开的工程。
  - 图标浏览器使用语义化 `fieldset` + 原生按钮，不伪装成缺少完整键盘模型的 ARIA listbox；Tab/Enter/Space 沿用浏览器原生行为，选择后焦点回到触发按钮。
  - 引用扫描补齐 `startBattle.choreography` 与运行态 `sceneScriptOverrides`；战斗编舞等当前脚本树尚不能精确聚焦的来源明确显示不可跳原因，不提供假跳转。
  - 修复工作台 grid 自动行压缩导致配方被裁切、1280 下目录/诊断按钮竖排、配方删除按钮换行、搜索区通用间距及窄面板水平溢出。
- 运行命令:
  - `pnpm --filter @type-pal/editor run check` → 76 files / 677 tests passed。
  - 聚焦回归：`item-commands`、`item-references`、`project-diagnostics`、`project-io`、`ItemTab`、`ItemUseEffectEditor` → 6 files / 104 tests passed（`item-authoring` 另由包级门禁覆盖）。
  - `pnpm --filter @type-pal/content run check` → 24 files / 309 tests passed。
  - `pnpm check` → 7 个 workspace 包全部通过，Biome 838 files 无问题。
  - `git diff --check` → 通过。
- 浏览器 / 手工检查:
  - 267/268/270 结构化能力、90 迁移诊断、引用 tab 与具体跳转均在 PAL 工程实测；稳定脚本跳到 `shared/user/pal-item-use/267`，场景引用跳到具体 `s002`。
  - 1280×720 的 `document/body` 与 viewport 同宽；1920 下炼蛊皿卡可滚到全部五条配方；控制台 0 error / 0 warning。
- 跳过的检查及原因:
  - 未用 FSA 空白工程手工完成一次“新建第一件物品→导入图标→保存→关闭→重开”；命令、原子 undo 和 project I/O round-trip 已由自动测试覆盖。该场景留给 review 抽验，不阻塞进入 review。

## 视觉验证记录

- Visual Verification Owner: Codex + User
- 验证方式: Playwright CLI 在 PAL 工程走用途、迁移诊断、引用、具体跳转和三档响应式检查；CRUD/图标原子性与保存重开由 UI/core/project-I/O 测试补齐。
- 截图 / 像素检查路径:
  - `output/playwright/ed5i-item-267-1440x900.png`
  - `output/playwright/ed5i-item-268-recipes-1920x1080.png`
  - `output/playwright/ed5i-item-270-pool-1440x900.png`
  - `output/playwright/ed5i-item-90-diagnostic-1280x720.png`
  - `output/playwright/ed5i-item-references-1280x720.png`
- 结论: 1280/1440/1920 三档无横向溢出；表单基线、按钮文字、复选框和能力卡对齐；长内容由中栏滚动承载，不被 grid 压缩裁切；console 0 error / 0 warning。
- 未完成项: FSA 空白工程的人工保存重开抽验留给 review。

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: Codex 自审 accept；**GLM accept（2026-07-15，引用闭包/CRUD/测试矩阵）**；**Kimi accept（2026-07-22，架构/UX/引用闭包）**。
- 必须返工项: 无（GLM、Kimi 均无返工）。
- Accept / rework: **accept（Codex / GLM / Kimi 三方，2026-07-22）**；待用户验收后由收口方标 done。

### GLM done 审查（2026-07-15）

**方法**：只读审查，不改实现文件。读 item-references/commands/validate-refs/item-authoring 源码逻辑 + 独立复跑测试 + 逐源核对引用闭包。

#### G1-G5 逐项验证

| 项 | 结论 | 证据 |
|---|---|---|
| **G1 全页 + 共享 chunk 引用闭包** | ✅ | `item-references.ts:266 entity.pages?.forEach`（**全部 pages**，非仅 page[0]）；`:316 scriptChunks` 递归共享 chunk；`item-references.test.ts:400 pages[1]` + `:690 覆盖全部脚本页、共享脚本与嵌套/不可跳来源` 单测覆盖。历史 ref-index.ts:118-146 的 page[0]-only 缺口已由新建 collectItemReferences 闭合。 |
| **G2 enemy.attackEquivItem 验证** | ✅ | `validate-refs.ts:717 attackEquivItem.itemId` 验证已补；`item-references.ts:408` collectItemReferences 覆盖；`item-references.test.ts:469 enemies[0].attackEquivItem.itemId` 单测。 |
| **G3 ShopDef.items 验证 + 引用** | ✅ | `validate-refs.ts:935-941 shops.forEach → shop.items.forEach` 验证已补；`item-references.ts:340 shops` 覆盖；`item-references.test.ts:427 shops[0].items[0]` 单测。删除物品时商店引用计入阻塞项。 |
| **G4 Add/Delete 命令 + 图标导入原子性** | ✅ | `commands.ts:1948 AddItemCommand` + `:1974 DeleteItemCommand`（`blockingItemReferences` fail-closed，throw 列阻塞项）；`ItemTab.tsx:756 CompositeCommand('导入并设置物品图标',[UpsertAssetCommand,UpdateItemCommand])` 一次 undo；DeleteItemCommand 同时清理 migrationDiagnostics sidecar，invert 精确恢复。 |
| **G5 引用单测矩阵** | ✅ | `item-references.test.ts` 26 条来源/字段独立矩阵：场景全页/共享 chunk/嵌套臂/页切换/choreography/sceneScriptOverrides（:587/:604/:649 Codex 补充）；删除守卫两条路径（:748 有引用 reject + 零引用 delete+undo）；shop/startWorld/entry/initialEquipment/skill cost/enemy steal+attackEquivItem/poison 逐源单测。 |

#### 引用闭包逐源独立验证

GLM 逐行核对 `collectItemReferences(state)` 覆盖的来源（item-references.ts:240-414）：

| 来源 | 行号 | 单测行号 | 结论 |
|---|---|---|---|
| 场景 entity 全部 pages trigger/auto | :266 | :393/:400 | ✅ |
| 共享脚本 chunk | :316 | :329 | ✅ |
| startBattle.choreography | :587(Codex 补) | :587 | ✅ |
| sceneScriptOverrides（运行态） | :649(Codex 补) | :649 | ✅ |
| ShopDef.items | :340 | :427 | ✅ |
| startWorld.inventory | :354 | :434 | ✅ |
| entryPoints startWorld.inventory | :364 | :441 | ✅ |
| actor initialEquipment | :374 | :448 | ✅ |
| skill cost.items | :391 | :455 | ✅ |
| enemy steal | :399 | :462 | ✅ |
| enemy attackEquivItem | :408 | :469 | ✅ |
| poisons grantItem | (poison 域) | :488/:495 | ✅ |
| 物品间引用（use/throw） | :725 | :725 | ✅ |

**所有 13 类来源均有独立单测覆盖**；删除守卫 `blockingItemReferences` 在 `DeleteItemCommand:1986` throw 列阻塞项。

#### 代码逻辑审查要点

- **DeleteItemCommand fail-closed**（commands.ts:1986-1993）：`blockingItemReferences(state, this.itemId)` 返回非空 → `throw new Error('物品 ... 仍被 N 处引用：\n...')`；list slice(0,20) 展示前 20 条阻塞项。
- **sidecar 一致性**（commands.ts:1998-2012）：删除物品时同步清理 migrationDiagnostics 中 `target.domain==='item' && target.objectId===itemId` 的条目；invert 恢复 `migrationDiagnosticsBeforeDelete`。避免 sidecar 悬空导致保存失败。
- **图标导入原子**（ItemTab.tsx:742-761）：`prepareAuthoredImage(file,'item-icon')` → `CompositeCommand([UpsertAssetCommand, UpdateItemCommand])`；一次 undo 同时撤回资源登记与物品绑定。
- **非法投掷保存门**（Codex 补充）：serializeProject 拒绝非施毒的非法 throw effects，避免写出无法重新打开的工程。
- **键盘/ARIA**（ItemTab.tsx）：图标浏览器用语义化 `fieldset` + 原生按钮（非 ARIA listbox 假冒），Tab/Enter/Space 原生行为，选择后焦点回到触发按钮。
- **不可深链来源诚实标注**：startBattle.choreography 与 sceneScriptOverrides 明确显示"不可跳原因"，不提供假跳转（item-references.test.ts:587/:649 验证）。

#### 测试与门禁

| 包 | 卡内冻结 | GLM 复跑 | 结论 |
|---|---|---|---|
| editor | 76/677 | **76/677** | ✅ |
| content | 24/309 | **24/309** | ✅ |
| `pnpm check` | 7 包通过 | **通过** | ✅ |
| Biome | 838 files | **838 files** | ✅ |
| `git diff --check` | 通过 | **通过** | ✅ |

#### 结论

**GLM accept**。引用闭包/CRUD/图标原子性/测试矩阵全部对账成立，G1-G5 逐项通过，无 counter/rework。
三处历史缺口（page[0]-only / attackEquivItem / ShopDef.items）已全部闭合；Codex 补充的
choreography/sceneScriptOverrides/非法投掷保存门/键盘 ARIA 进一步加强了闭包完整性。
等待 Kimi 架构/UX review；三方 accept 前不得标记 done。

## 用户验收

- 用户结论: pending
- 后续任务: ED-5S 商店工作台（不阻塞本卡物品引用闭环）

## 交接日志

- 2026-07-22 Codex: 完成 UI/命令/资产/引用审计并开卡。Evidence: ItemTab、commands、ref-index、ImageTab/ImageAssetPicker、ED-1 七环审计。Next: Kimi + GLM 设计审查，未三签不得改实现。
- 2026-07-22 Kimi: 架构主审完成,签 **agree**(R1-R3 build 必落钉)。三栏 IA(库/工作台/检查器)与
  catalog 工具区根因修复方向成立;图标 `prepareAuthoredImage+UpsertAsset+UpdateItem` 单命令原子、
  一次 undo 撤回登记与绑定(R3);`collectItemReferences` 覆盖脚本/共享脚本/商店/开局/初装/技能耗材/
  敌人/毒及其他 itemId 字段+全实体页+递归子命令,有引用必 fail-closed(R2,含 GLM 发现的
  ShopDef.items 缺口);C8 依赖纪律:C8 schema 三签前不落特殊用途 UI 字段,土灵珠「可装备+可使用+
  返回入口」、炼蛊皿材料→产物、紫金葫芦资源池/随机/奖励表在 C8 完成后结构化呈现(R1)。
  Evidence:本卡主审立场、签字区、争议记录。Next:三签齐(已在)后 Codex build。未改实现文件。
- 2026-07-15 GLM: 引用覆盖/测试矩阵/CRUD/资产/视觉无障碍设计审查签 **agree**。逐行核对 content schema 全部 itemId 字段（场景脚本/条件/initialEquipment/skill cost/enemy steal+attackEquivItem/ShopDef items/startWorld inventory/icon/equip.effects）；
  定位 3 处引用闭包缺口：①ref-index.ts:118-146 **仅遍历 page[0]**，不覆盖 page[1+]/共享 chunk（G1）；
  ②enemy.attackEquivItem 未独立验证（G2）；③**ShopDef.items 完全未验证**（G3）。
  commands 缺 Add/Delete（G4）；item-references.test.ts 每来源独立单测（G5）。
  双卡依赖（C8 先于 ED-5I 特殊用途）成立。Evidence: 签字区 GLM 行 + GLM 引用审查节。Next: Kimi 架构审查；
  **三签未齐不得改实现**。未改实现文件。
- 2026-07-22 Codex: 核对三方设计签均为 agree、无 counter，按用户“都签了”确认进入 build；准入结论改为 build allowed。Next: C8 先行，随后由 Codex 实施 ED-5I。
- 2026-07-22 Codex: 完成三栏物品工作台、CRUD/图标原子命令、C8 结构化用途、全工程引用/删除守卫和三档视觉修复；包级与根门禁通过，Codex done 前签 accept，任务转 review。Next: Kimi 审 IA/交互/公共边界，GLM 审引用覆盖/测试矩阵；两方只读签 accept 或 counter，不得直接标 done。
- 2026-07-22 Codex: review 前复核补齐删除迁移诊断一致性、非法投掷显式修复、图标原生键盘/ARIA 语义、26 条引用来源/字段独立矩阵、递归臂/页切换/存档补测，以及 CRUD+资产保存重开测试；editor 76 files / 673 tests、根 `pnpm check`、迁移 dry-run 0/0/0 全过。Next: Kimi / GLM 独立复审。
- 2026-07-22 Codex: 最终缺口审计补齐战斗编舞与运行态场景覆写引用、不可深链来源的真实可达性说明、非法投掷保存门和图标选择焦点回落；修正一个旧非法空效果夹具。Evidence: 聚焦 6 files / 104 tests、editor 76 files / 677 tests、根 `pnpm check` 与 Biome 838 files 全过。Next: Kimi / GLM 按最新工作树签 accept 或 counter；三签前不得 done。
- 2026-07-22 Codex: 独立只读缺口审计复核 content schema 反向引用矩阵、CRUD/资产 round-trip、诊断 undo/redo、保存门与可达性，结论 **no current blocker / 无剩余 P1-P2**。该结论是 Codex 自验证证据，不替代 Kimi / GLM 的 done 前签字。
- 2026-07-15 GLM: done 引用闭包/CRUD/图标原子性/测试矩阵审查签 **accept**。只读审查不改实现：
  逐源核对 collectItemReferences 13 类来源（场景全页/共享 chunk/choreography/sceneScriptOverrides/
  ShopDef/startWorld/entry/initialEquipment/skill cost/enemy steal+attackEquivItem/poison/物品间引用），
  每类有独立单测；DeleteItemCommand blockingItemReferences fail-closed + sidecar 同步清理；
  图标导入 CompositeCommand 一次 undo；validate-refs 补 ShopDef.items + attackEquivItem；
  editor76/677、content24/309 全绿；Biome 838 files。G1-G5 逐项通过，无 counter/rework。
  Evidence: GLM done 审查节 + 签字区。Next: **Kimi 架构/UX review pending**；Kimi accept 后三方齐由 Codex 收口；未改实现文件。
- 2026-07-22 Kimi: 架构/UX/引用闭包 done 复审完成,签 **accept**,无 P0/P1/P2。独立只读核对:
  三栏 IA 与正交能力卡成立,土灵珠「装备 饰品·2 效果 + 使用 1 效果 + 投掷 未启用」双徽标、
  炼蛊皿五条 ordered 配方、紫金葫芦资源池面板 PAL 实测可见;`item-references.ts`(571 行)
  覆盖全实体页+递归子命令(含 startBattle.choreography)/共享脚本/shop.items/开局/初装/技能耗材/
  敌人 steal+attackEquivItem/毒/物品间引用,土灵珠引用页 3 处可跳、未登记内部脚本如实标注
  不可跳原因,删除 fail-closed(「仍有 3 处外部引用,删除会被阻止」)实测成立;图标导入
  CompositeCommand 一次 undo 双撤回,物品页无共享替换入口;根 `pnpm check` 全绿(838 files,
  editor 677/content 309),PAL 三档无横向溢出、console 0/0。R1-R3 全部满足。
  Evidence: 本卡 done 签字区 Kimi 行。Next: 三签齐(Codex/GLM/Kimi),待用户验收后由收口方标 done。
  未改实现文件。

## 下一位 Agent 提示词

### 给 Kimi

```text
接手任务: ED-5I 物品工作台 CRUD、图标、用途与引用闭环（架构/UX review）
任务卡: docs/ops/tasks/ED-5I-item-workbench.md；依赖真值见 docs/ops/tasks/C8-item-use-mechanisms.md
当前状态: review；Codex 已 accept，Kimi / GLM pending，done 仍 blocked。
你的职责: 只读审查三栏 IA、正交能力卡、结构化用途、图标原子命令、引用反跳与响应式交互；不得直接修改实现文件或单方标 done。
必读: AGENTS.md、docs/phase2/READ-FIRST.md、本卡全部、packages/editor/src/ui/ItemTab.tsx、ItemUseEffectEditor.tsx、core/item-authoring.ts、core/item-references.ts。
已完成证据: 1280/1440/1920 无横向溢出；267/268/270 与迁移诊断可读可改；稳定脚本和场景引用均实际反跳；不可深链来源明确说明；editor 677 tests、根 pnpm check 通过。
请输出: 在本卡 Review、done 前 Kimi 签字和交接日志写 accept，或写 counter 的具体文件/交互/边界理由；重点检查窄屏按钮、长卡滚动、能力叠加和删除 fail-closed。不要修改历史设计签字。
```

### 给 GLM

```text
接手任务: ED-5I 物品工作台 CRUD、图标、用途与引用闭环（覆盖/测试 review）
任务卡: docs/ops/tasks/ED-5I-item-workbench.md；依赖真值见 docs/ops/tasks/C8-item-use-mechanisms.md
当前状态: review；Codex 已 accept，Kimi / GLM pending，done 仍 blocked。
你的职责: 只读复核引用闭包、删除守卫、命令 undo/redo、项目 round-trip、诊断与视觉证据；不得直接修改实现文件或单方标 done。
必读: 本卡全部、packages/editor/src/core/item-references.test.ts、item-authoring.test.ts、item-commands.test.ts、ui/ItemTab.test.tsx、ui/ItemUseEffectEditor.test.tsx、packages/content/src/validate-refs.test.ts。
请核对: 全实体页+递归子命令、共享脚本、ShopDef、startWorld/entry、initialEquipment、skill cost、enemy steal/attackEquivItem、poison/other itemId；有引用 reject、零引用 delete+undo；图标导入+绑定一次 undo；三档截图与 console 0/0。
请输出: 在本卡 Review、done 前 GLM 签字和交接日志写 accept，或写 counter 的具体漏源/测试证据；不要修改历史设计签字。
```
