# ED-2 - 编辑器八个一级模块与稳定深链

Status: review
Phase: phase2
Capability: Editor / R6
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Opus + GLM
Visual Verification Owner: Codex + User
Unavailable Agents: none
Branch: main

## 目标

退役编辑器顶层“大杂烩数据页”，把现有工作区重组为场景、地图、剧情、角色、物品、战斗、资源、工程八个一级业务模块；建立可折叠导航和统一深链协议，使作者能从引用处准确跳到唯一权威编辑页，同时保持现有业务组件、Command/undo 与保存行为不变。

## 范围

- 范围内:
  - 定义稳定 `EditorModuleId`：`scene | map | story | actor | item | battle | asset | project`。
  - 用可折叠 `ModuleNav` 替换当前 52px 四模式 rail；展开显示图标+中文名，折叠只显示图标并带 tooltip。
  - 把现有 15 个 `DataMode` 页及场景/角色/地图工作区迁到明确模块；同一业务组件只挂载在一个权威位置。
  - 定义 `(module + subpage + objectId?)` 深链契约，并让已有“跳到事件/共享脚本/对象”的入口统一调用该契约。
  - 记住各模块最后子页、选中对象和滚动/面板状态；返回模块时恢复工作上下文。
  - 将底栏“引用完整性 OK”改为“已检查的引用无问题”，避免在 ED-3 前过度承诺。
  - 保持现有三栏工作区可调宽/折叠和脚本抽屉可调高；720px 宽时允许收起次要面板，不挤压主画布。
- 范围外:
  - 不改 content schema、项目文件、loader 或迁移器。
  - 不在本卡补角色/物品/战场/资源 CRUD，不伪造尚未存在的页面。
  - 不实现 W7E 地图注册表、ED-3 引用图、A7/R7 资源注册表。
- 明确不做:
  - 不把 15 个旧标签直接变成 15 个一级图标。
  - 不复制表单形成“角色模块一套、资源模块又一套”的双真值。
  - 不继续向可见的“数据”总容器添加业务页；内部临时适配组件可以存在，但不得承担导航身份。

## 上下文锚点

- 已拍板决策 / 铁律:
  - `docs/phase2/READ-FIRST.md`：第二阶段编辑器服务现代创作平台，不以迁移后 PAL 既有数据为唯一工作流。
  - `docs/ops/tasks/ED-1-editor-authoring-closure-audit.md`：三签确认八模块、唯一权威页、稳定深链和 2-5 个紧密子页的约束。
  - `docs/phase2/editor/editor-authoring-closure-audit-2026-07-13.md:173`：一级模块表及信息架构约束。
  - 用户 2026-07-13：数据下功能应展开为和场景/地图平级的一级模块；编辑器面板应可调宽、折叠。
- 代码锚点(`file:line`):
  - `packages/editor/src/ui/App.tsx:456`：当前一级导航只有场景/角色/地图/数据。
  - `packages/editor/src/ui/DataMode.tsx:41`：15 个异质标签集中在同一页面。
  - `packages/editor/src/ui/App.tsx:867`：底栏“引用完整性 OK”。
  - `packages/editor/src/ui/App.tsx`：现有 `jumpToEvent`、共享脚本跳转、面板尺寸与折叠状态是迁移入口。
  - `packages/editor/src/ui/app.css`：现有布局、splitter、窄屏规则和可折叠面板样式。
- 已知坑 / 审计文档:
  - `docs/phase2/editor/editor-design.md` 的 Command/session/画布壳保留；旧“数据模式”分组不再保留为产品 IA。
  - `docs/phase2/editor/editor-audit-2026-07-05.md` 是历史基线，不是当前完成真值。
  - W7E-0 先修新场景断链；ED-2 只搬导航壳，不碰地图 schema。
- 不得重新引入:
  - `paletteId`、原版 opcode 编辑、数组下标/文件路径作业务身份、直接 mutate `EditorState`。
  - 用重复组件、镜像表单或模块内 iframe 实现“迁移”。
  - 只在 React 内存中可跳、刷新后丢失的假深链。
- 相关测试:
  - `packages/editor/src/ui/*.test.tsx`（按现有测试组织补充）。
  - `packages/editor/src/core/edit-session.test.ts`。
  - Playwright/浏览器截图：1280、900、720 三档。

## 验收条件

- 功能:
  - 顶层只显示八个业务模块；可见 UI 中不再出现“数据”一级入口。
  - 现有功能全部可达且每个业务页面只有一个权威挂载点；旧 15 页没有丢失，也没有复制。
  - 一级导航可展开/折叠，状态重开编辑器后保留；窄屏能收起，不覆盖画布或检查器。
  - `EditorLocation` 至少包含 `module`、`subpage`、可选 `objectId`；编码到 URL 查询参数，刷新/前进/后退可恢复位置。
  - 跨模块选择器的“打开目标”使用同一导航 API，并准确选中目标对象；无目标时落到模块默认页。
  - 每模块可见子页最多 5 个；目标是 2-5 个紧密页面，若当前只有一个真实权威工作区，不为凑数制造空页。
  - 切换模块后再返回，恢复该模块的子页、选中对象及合理的滚动/分栏状态。
  - 底栏文案为“已检查的引用无问题”，ED-3 完成后再升级为全工程引用结论。
- 测试:
  - 纯函数测试覆盖 URL 编解码、非法 module/subpage 兜底、objectId 转义与 back/forward 恢复。
  - 导航映射测试证明所有旧工作页恰好登记一次，模块子页不超过 5。
  - 关键跨模块跳转测试至少覆盖：场景事件 -> 剧情脚本、角色 -> 资源精灵、场景 -> 地图。
  - 现有 editor 单测、typecheck、根 `pnpm check` 全绿。
- 文档:
  - 更新编辑器设计文档中的一级导航与深链契约；ED-1/看板状态一致。
  - 若实现中调整模块归属，必须写清唯一权威页，不能只改 UI 文案。
- 视觉 / 手工验证:
  - 1280、900、720 三档截图；导航展开/折叠、左右面板展开/折叠、脚本抽屉展开/折叠均无重叠。
  - 长模块名、最长子页名、空列表和长列表都不撑破容器。
  - 鼠标、键盘焦点、tooltip 和 active 状态可辨识；画布尺寸不会因 hover/label 改变而跳动。

## 推进签字

签字是阶段门禁。设计三签已齐，Codex 已完成 build 与自验证，当前进入实现审查。

### 进入 build 前:设计签字

- Codex: **agree（2026-07-14）**。先建立八模块壳和 typed URL 深链，再让 W7E/ED-3 等页面落位，可以避免业务页重复搬迁；本卡严格不改 schema 和业务 CRUD。
- Opus: **agree（2026-07-14;信息架构/深链/状态边界全过——单一子页注册表同源派生导航/URL/测试(防菜单漂移);EditorLocation typed+URL 查询参数+popstate 单向恢复+解析失败回安全默认页;objectId 仅提示、目标缺失显空态**不偷选第 0 项**(杜绝下标身份的 UI 版);EditSession 仍是唯一真值、URL 非第二份数据;过场"编排归剧情/媒体归资源"且当前不造假编排页,诚实;S1 文案项+S3 子页≤5 硬门禁均落卡。无必改）
- GLM: **agree**（2026-07-14）。
  - **15 旧页→八模块"恰好一次"可测性**：DataMode.tsx:57 列了 15 个 tab（sprite/skill/item/enemy/poison/ambience/shop/battlefield/music/tileset/cutscene/entrypoint/vars/sharedscript/locale）。ED-2 §114-123 模块归属表逐页映射到八模块，每页只出现一次。验收 §66"每个业务页面只有一个权威挂载点"+ §76"导航映射测试证明所有旧工作页恰好登记一次"= **可测性充分**。✅
  - **跨模块跳转三例**：验收 §76 列"场景事件→剧情脚本、角色→资源精灵、场景→地图"——覆盖了"内容→脚本引用""角色→资产引用""场景→地图绑定"三类典型跨域跳转，**足够**（第四类"物品→商店"在同一模块内不需跨模块跳转测试）。✅
  - **注册表同源**：§125 `EditorSubpageRegistry` 派生导航/URL/测试防漂移，方向正确。✅

- counter / 分歧处理: 无。
- 缺签豁免: N/A
- build 准入结论: **三签齐（Codex+Opus+GLM agree），build allowed。**

### 进入 done 前:审查签字

- Codex: **accept（2026-07-14）**。八模块注册表、typed URL/历史恢复、失效对象空态、模块偏好持久化和三档响应式布局均已实现并实测；编辑器 150 项测试与全仓 3449 项测试通过，未改 schema/loader/迁移器。
- Opus: **accept**（2026-07-14,基线 b8c824d1;五点复核全过——①注册表唯一真源:EDITOR_MODULES 派生导航/URL/测试,15 旧页恰好一次+子页≤5 有专项测试,未登记数据页即抛;②历史语义:popstate 走 'none' 单向恢复不写历史(无循环),sameEditorLocation 守卫,对象点选 replace 防历史膨胀,活体验证战斗→back→场景恢复;③记忆按 `type-pal:editor:navigation:<projectId>` 键控,工程切换 App 重挂载零串扰,URL 优先于存储;④720/900 活体检测零横向溢出、五面板矩形零重叠;失效深链显"目标不存在"且不偷选(objectId 存在性校验后才选中);⑤core/content/schema 零触碰(提交仅 UI+main.tsx 装配行)。editor 150 测试独立复跑绿。无返工项）
- GLM: **accept（2026-07-14;见下）**
- counter / 返工处理: 无。
- 缺签豁免: N/A
- done 准入结论: **三方 done 前审查签字齐（Codex + Opus + GLM accept），交用户验收。**

### GLM done 前覆盖复验（2026-07-14）

增量范围：b8c824d1（实现）。未改实现文件，只做文档/代码/测试复验。全 editor 18 文件 150 tests 复跑全绿。

**(1) 验收条款逐项对照实现与测试映射** ✅
- **URL 编解码/非法兜底/objectId 转义/back-forward**：`editor-navigation.ts:199-206` decodeEditorLocation → normalizeEditorLocation；非法 module 回 `scene`（:188-190）、合法 module 非法 page 回本模块默认页（:192-194）；objectId trim 空归一化（:195）。editor-navigation.test.ts:34-58 覆盖合法位置+保留字符 objectId（`shared/user/剧情 #1?`）、非法 module 回退、合法 module 非法 page 回退、空 objectId 归一化四支。
- **旧 15 页恰好一次**：editor-navigation.ts:14-30 DATA_PAGE_IDS 15 项 = EDITOR_MODULES 注册的 15 个 dataPage，`grep -c dataPage` = 15，`uniq -d` 零重复。editor-navigation.test.ts:24-30 断言 `[...registered].sort() === [...DATA_PAGE_IDS].sort()` + `Set.size === length`。
- **子页 ≤5 硬门禁**：editor-navigation.test.ts:17-21 逐模块断言 `subpages.length <= 5` + `defaultSubpage 存在`。实测最大 4（battle），无超标。
- **跨模块跳转三例**：App.tsx `editorLinks.sharedScript`（:329 剧情）、`editorLinks.actorSprite`（:720 角色→资源精灵）、`editorLinks.sceneMap`（:1030 场景→地图）——三例均经 `applyEditorLocation` 走统一导航 API。editor-navigation.test.ts:72-88 断言三个 link 的 EditorLocation 形状。
- **状态恢复**：App.tsx:204-227 `applyEditorLocation` + :229-243 popstate 走 `'none'` 单向恢复 + :245-259 scroll 恢复。`persistNavigation` 按 projectId 键控 localStorage（Opus 已核零串扰）。

**(2) editor-design §5.1 文档一致性** ✅
- §5.1 八模块表（editor-design.md:83-92）与 editor-navigation.ts:52-155 `EDITOR_MODULES` 逐行一致：模块 id、label、子页全部对应。
- §5.1 四条约束（注册表唯一真源/EditorLocation URL/popstate 单向/每页恰好一次 ≤5）与实现完全对应。
- §10（:137）已标注"数据表模式不再代表可见一级导航"，与 DataMode 退役一致。

**(3) DataMode 退役后的可见入口审计** ✅
- App.tsx 中"数据"字样仅出现在注释（:319）和无关文案（:1378/1407），无可见一级导航入口。
- ModuleNav.tsx 从 `EDITOR_MODULES` 派生 8 个按钮，无"数据"项。
- DataMode.tsx 注释改为"八模块导航下的数据型业务页挂载器"，`DataTab` 类型别名改为 `DataPageId`（从注册表派生），不再自维护 tab 列表。`editorSubpageForDataPage` 未登记页抛错（:177）。
- 15 页全部可达：每个 dataPage 在 EDITOR_MODULES 中恰好一个 subpage 挂载点。

**(4) 受改文件行为回归抽查** ✅
- **SharedScriptTab.tsx**：新增 `onSelectedScriptId` 回调 + `selectScript` 包装；`onOpenScript` 从 `setSelectedId` 改为 `selectScript`（内部仍只跳 library 内目标）。App.tsx:327 `openSharedScript` 加 `if (!library[id]) return` 守卫 + 走 `editorLinks.sharedScript`。行为一致，无语义漂移。
- **ActorMode.tsx**：新增 `focusActorId`/`onActorFocus`/`onOpenSprite` props + useEffect 响应 focusActorId；App.tsx:720 `onOpenSprite` 经 `editorLinks.actorSprite` 跳资源。原有角色编辑逻辑未改。
- **MapMode.tsx**：仅 4 行改动（接入导航），地图编辑逻辑未触碰。
- **main.tsx**：1 行（工程切换时重挂载导航状态）。

**(5) core/content/schema 零触碰** ✅
- b8c824d1 `--name-only` 不含 packages/content/packages/migrate/schema 任何文件。仅 UI + main.tsx + 文档。

**总结**：验收条款逐项对照实现+测试映射无缺口；§5.1 文档与实现一致；DataMode 退役后 15 页全部可达且无"数据"一级入口；受改文件行为回归无漂移；core/schema 零触碰。**accept**。

## Draft: 设计与风险

### 设计结论

#### 1. 模块与现有页面归属

| 模块 | 稳定 id | 当前权威工作区/子页 | 说明 |
|---|---|---|---|
| 场景 | `scene` | 场景工作区、氛围 | 场景列表/实体/脚本/入口仍是一个组合工作区；氛围归场景环境 |
| 地图 | `map` | 地图工作区、瓦片集 | ED-2 先迁入口；W7E 再把当前场景地图升级为独立地图库 |
| 剧情 | `story` | 共享脚本、变量、指令手册 | 过场编排未来归剧情；当前只读媒体浏览器归资源，不伪装为编排 |
| 角色 | `actor` | 角色工作区 | 角色引用精灵时深链到资源，不复制精灵编辑器 |
| 物品 | `item` | 物品、商店 | 商店货单仍引用物品稳定 id |
| 战斗 | `battle` | 技能、敌人、毒、战场 | 最多四页，不再拆成一级图标 |
| 资源 | `asset` | 精灵、音乐、过场素材 | 当前页面按真实能力展示；A7/R7 后扩展资源注册表 |
| 工程 | `project` | 入口点、工程问题/校验 | 工程生命周期命令继续留顶栏；本模块承载可编辑设置与诊断 |

每个页面注册一次，例如 `EditorSubpageRegistry` 记录 `module/id/render`；导航、URL 解析和测试都从同一注册表派生，避免菜单配置与实际组件漂移。

#### 2. 深链契约

```ts
type EditorModuleId =
  | "scene"
  | "map"
  | "story"
  | "actor"
  | "item"
  | "battle"
  | "asset"
  | "project"

interface EditorLocation {
  module: EditorModuleId
  subpage: string
  objectId?: string
}
```

- URL 使用 `?module=<id>&page=<subpage>&object=<encoded-id>`；解析失败时回到当前工程的安全默认页，不抛异常。
- 所有跳转只调用 `navigateEditor(location, mode)`；`mode` 区分 push/replace，浏览器前进后退通过同一 decoder 恢复。
- `objectId` 只是目标选择提示；目标不存在时页面仍能打开并显示空态/问题，不偷偷选中数组第 0 项。
- 选中对象的业务真值仍在 `EditSession`；URL 与 UI 偏好不是第二份内容数据。

#### 3. 布局与状态

- `ModuleNav` 使用稳定宽度约束：展开宽度、折叠宽度、icon button 尺寸固定，文字换行/省略不会推动主画布。
- 继续复用现有 splitter 和面板持久化方式；模块切换只切工作区，不重置全局左右栏宽度。
- 每模块保存轻量 UI 状态：最后子页、对象 id、滚动 key；内容数据不写 localStorage。
- 窄屏优先保证画布/主表单可操作；左右检查器和次要列表可折叠，不能把工具栏挤成不可读的一行。

### 已知风险

- 风险: 一次迁移 15 页时遗漏入口或形成重复实例。
  - 缓解: 单一子页注册表 + “每个旧页面恰好一次”测试；不重写业务组件。
- 风险: URL 状态与内部 selection 互相循环更新。
  - 缓解: decoder 归一化后比较 location；仅实际变化时 push/replace，popstate 走单向恢复。
- 风险: 模块归属争议导致后续再搬。
  - 缓解: 以对象权威编辑页为准；引用处只深链。过场“编排”和“媒体文件”明确分属剧情/资源。
- 风险: 为满足子页数量造空壳。
  - 缓解: 上限 5 是硬门禁；当前不存在的能力不显示 soon 页，待对应子卡实现后登记。
- 风险: 720px 布局仍被多层工具条压缩。
  - 缓解: 浏览器逐档截图；固定工具条高度并允许合理换行/收起，禁止内容互相覆盖。

### 主审立场

- Reviewer: Opus（信息架构/深链/状态边界）+ GLM（现有页面覆盖/测试矩阵）
- 结论: 三方设计签字均为 `agree`，无分歧。
- 必改项: 无。
- 是否建议进入 build: 是，已完成 build。

### 三方争议记录(按需)

- Codex: 八模块和单一权威页按 ED-1 共识执行；建议以 typed URL location 作为跨模块唯一跳转协议。
- Opus: 无分歧;氛围归场景(环境属性)与审计战斗域(毒/状态/战场)的划分自洽,以对象权威编辑页为锚的归属规则可裁决未来争议。
- GLM: 现有 15 页恰好一次、跨模块跳转矩阵和注册表同源方案均通过，无分歧。
- 用户拍板: 已要求一级展开和面板可调；具体实现待本卡三签。

## 额度 / 代班记录(如适用)

- 缺席 Agent: none
- 缺席原因: N/A
- 代班 Agent: N/A
- 代班范围: N/A
- 风险: N/A
- 是否需要补审: N/A
- 用户裁决: N/A

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件:
  - `packages/editor/src/ui/editor-navigation.ts`、`ModuleNav.tsx`、`App.tsx`、`editor.css`：单一八模块注册表、模块/子页导航、typed URL、历史与偏好持久化、响应式布局。
  - `packages/editor/src/ui/DataMode.tsx`、`ActorMode.tsx`、`MapMode.tsx`、`SharedScriptTab.tsx`：把现有权威页面接入模块导航和对象深链，不复制业务组件。
  - `packages/editor/src/main.tsx`：切换工程时按工程 id 重建编辑器导航状态。
  - `packages/editor/src/ui/editor-navigation.test.ts`：模块覆盖、URL 契约和跨模块链接测试。
  - `docs/phase2/editor/editor-design.md`：八模块 IA 与深链契约定稿。
- 实现摘要:
  - 顶层只保留 `scene/map/story/actor/item/battle/asset/project` 八个模块；旧 15 个数据页由同一注册表恰好登记一次，`DataMode` 仅作为内部挂载器。
  - URL 使用 `module/page/object`，普通跳转写 history，`popstate` 走同一 decoder；合法页面的失效对象显示空态，不回退第 0 项。
  - 各模块记住最后子页/对象/滚动位置；模块导航折叠偏好持久化，低于 860px 自动折叠并禁用手动展开。
  - 场景 -> 地图、角色 -> 精灵、共享脚本引用统一使用 `EditorLocation`；底栏改为“已检查的引用无问题”。
- 运行命令:
  - `pnpm exec biome check <ED-2 修改的 10 个实现文件>`：通过。
  - `pnpm --filter @type-pal/editor typecheck`：通过。
  - `pnpm --filter @type-pal/editor check`：18 个文件、150 项测试全过。
  - `pnpm check`：全仓 251 个测试文件、3449 项通过、1 项既有跳过；Biome 657 个文件通过。
  - `git diff --check`：通过。
- 浏览器 / 手工检查:
  - `http://localhost:6012/`（`e2e-own`）逐一打开八模块及全部非默认子页，页面均可达且无控制台错误。
  - 验证 asset/music -> scene 的后退/前进、模块最后子页恢复、导航折叠重载持久化。
  - 验证失效 sprite 深链显示“目标不存在”且无列表选中；验证场景 -> 地图、角色 -> 精灵均带准确 `objectId`。
  - 1280px 展开导航；900px 三栏无横向溢出；720px 自动折叠为 52px、左右栏可同时收起，主区无覆盖。
- 跳过的检查及原因: 无。

## 视觉验证记录(如适用)

- Visual Verification Owner: Codex + User
- 验证方式: 1280/900/720 浏览器截图 + 交互检查
- 截图 / 像素检查路径: Codex 浏览器会话（`http://localhost:6012/`）；三档截图已逐张检查，临时二进制证据未写入仓库。
- 结论: 三档均无模块导航、Outliner、主区和 Inspector 重叠；720px 强制收起生效，按钮/icon/focus/active 状态可辨识。
- 未完成项: Opus 与 GLM 独立复验签字。

## Review: 审查与返工

- Reviewer: Opus + GLM
- 审查结论: pending
- 必须返工项: pending
- Accept / rework: pending

## 用户验收

- 用户结论: 2026-07-14 用户表示无法代替 Agent 做技术验收，授权 Codex 继续按三贤人系统完成实现、自动验证与交审；这不是产品验收 `accept`，`done` 仍须三方审查签字。
- 后续任务: W7E 地图库与场景绑定；ED-3 工程引用图。

## 交接日志

- 2026-07-14 Codex: 按 ED-1 三签结论起草八模块、唯一权威页、typed URL 深链、状态保留和三档视觉验收方案；未改实现。Evidence: 本卡 Draft/验收矩阵。Next: Opus 设计主审。
- 2026-07-14 Opus: 设计签 **agree,无必改**。注册表同源/typed 深链/空态兜底/真值单一/S1+S3 落实逐项过。Next: GLM 复核(15 页恰好一次映射+跨模块跳转矩阵);三签齐后 build。
- 2026-07-14 GLM: 设计签 **agree**。确认旧 15 页恰好一次、跨模块跳转矩阵与注册表同源方案可测。Next: Codex build。
- 2026-07-14 Codex: 完成八模块、typed URL、历史/偏好恢复、对象空态和三档布局；编辑器 150 项、全仓 3449 项测试通过，浏览器逐页/深链/响应式检查通过，自签 `accept`。Next: Opus 实现审查。

- 2026-07-14 Opus: 实现审查签 **accept**(b8c824d1)。注册表唯一真源(15 页恰好一次/≤5 专项测试)/popstate 单向无循环+对象 replace/记忆 per-projectId 零串扰/720+900 活体零溢出零重叠+失效深链不偷选/core-schema 零触碰;150 测试复跑绿。Evidence: done 签字行。Next: GLM 复核;三签齐可 done。未改实现文件。
- 2026-07-14 GLM: done 前覆盖复验签 **accept**(b8c824d1)。五项逐条：(1)验收条款逐项对照——URL 编解码/非法兜底/objectId 转义/back-forward 四支测试+15 页恰好一次(Set 断言)+子页≤5 门禁+跨模块跳转三例(editorLinks)+状态恢复(popstate none/scroll/per-projectId)全映射；(2)§5.1 文档八模块表与 EDITOR_MODULES 逐行一致+四条约束对应+§10 退役标注；(3)DataMode 退役审计——App 无"数据"一级入口，ModuleNav 8 按钮从注册表派生，DataMode 注释改为内部挂载器+DataTab=DataPageId，15 页全部可达；(4)受改回归——SharedScriptTab selectScript 包装+library 守卫、ActorMode focusActorId effect+onOpenSprite、MapMode 4 行接入、main.tsx 1 行；(5)core/schema 零触碰。editor 18 文件 150 tests 复跑全绿。Evidence: done 准入 GLM 复验段。Next: 交用户验收，用户点头方 done。未改实现文件。

## 下一位 Agent 提示词

```text
接手任务: ED-2 八个一级模块与稳定深链,实现复核(GLM)
任务卡: docs/ops/tasks/ED-2-editor-primary-modules.md
实现提交: b8c824d1;当前状态 review;Codex accept + Opus accept,GLM pending,不得标 done
你的角色: GLM,覆盖/测试矩阵复核;只审文档与代码,不改实现
Opus 已过: 注册表唯一真源(15 旧页恰好一次+子页≤5 专项测试);popstate 'none' 单向无循环+sameEditorLocation 守卫+对象 replace;记忆 per-projectId localStorage 零串扰;720/900 活体零溢出零重叠;失效深链"目标不存在"不偷选;core/content/schema 零触碰;150 测试复跑绿。
请你复核: (1)验收条款逐项对照实现(URL 编解码/非法兜底/objectId 转义/back-forward、旧页恰好一次、跨模块跳转三例、状态恢复)与测试映射,列缺口;(2)editor-design §5.1/§11 文档与实现一致性;(3)DataMode 退役后的可见入口审计(不再有"数据"一级入口,15 页全部可达);(4)SharedScriptTab/ActorMode 等受改文件的行为回归点抽查。在 done 签字 GLM 行签 accept/counter,更新交接日志
不要做: 不改实现;GLM accept 前不标 done
输出要求: 结论、缺口清单、提交 hash
```
