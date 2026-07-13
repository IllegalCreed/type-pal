# ED-2 - 编辑器八个一级模块与稳定深链

Status: draft
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

签字是阶段门禁。当前仅可审设计，不得修改实现文件。

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

- Codex: pending
- Opus: pending
- GLM: pending
- counter / 返工处理: pending
- 缺签豁免: N/A
- done 准入结论: blocked

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
- 结论: pending
- 必改项: pending
- 是否建议进入 build: pending

### 三方争议记录(按需)

- Codex: 八模块和单一权威页按 ED-1 共识执行；建议以 typed URL location 作为跨模块唯一跳转协议。
- Opus: 无分歧;氛围归场景(环境属性)与审计战斗域(毒/状态/战场)的划分自洽,以对象权威编辑页为锚的归属规则可裁决未来争议。
- GLM: pending
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
- 修改文件: pending
- 实现摘要: 未开始
- 运行命令: pending
- 浏览器 / 手工检查: pending
- 跳过的检查及原因: 三签未齐，禁止实现。

## 视觉验证记录(如适用)

- Visual Verification Owner: Codex + User
- 验证方式: 1280/900/720 浏览器截图 + 交互检查
- 截图 / 像素检查路径: pending
- 结论: pending
- 未完成项: 全部实现级验证待 build。

## Review: 审查与返工

- Reviewer: Opus + GLM
- 审查结论: pending
- 必须返工项: pending
- Accept / rework: pending

## 用户验收

- 用户结论: pending
- 后续任务: W7E 地图库与场景绑定；ED-3 工程引用图。

## 交接日志

- 2026-07-14 Codex: 按 ED-1 三签结论起草八模块、唯一权威页、typed URL 深链、状态保留和三档视觉验收方案；未改实现。Evidence: 本卡 Draft/验收矩阵。Next: Opus 设计主审。
- 2026-07-14 Opus: 设计签 **agree,无必改**。注册表同源/typed 深链/空态兜底/真值单一/S1+S3 落实逐项过。Next: GLM 复核(15 页恰好一次映射+跨模块跳转矩阵);三签齐后 build。

## 下一位 Agent 提示词

```text
接手任务: ED-1 done 复核 + W7E-0/ED-2/W7E 三子卡设计复核(GLM 四卡合并)
四卡: docs/ops/tasks/{ED-1-editor-authoring-closure-audit, W7E-0-blank-scene-map-reference, ED-2-editor-primary-modules, W7E-map-library-scene-binding}.md
当前状态: ED-1 review(Codex+Opus accept,GLM pending);W7E-0/ED-2 draft(Codex+Opus agree,无必改);W7E draft(Codex+Opus agree,附 M1/M2 必改待 Codex 落卡)
你的角色: GLM,覆盖/测试矩阵/一致性复核;只审文档,不改实现
Opus 已过: ED-1 收口忠实(capability 五格逐行对账/R1-R3+S1+S3 定位到子卡条文;唯一余项 S2 已补记 ED-1 后续任务行=ED-3 开卡必带);W7E-0 最小修复+四支测试齐;ED-2 注册表同源+typed 深链+objectId 不偷选第 0 项;W7E schema/升级边界/懒加载/MG2 双表全过,M1=纯 reuse 工程不升 v2 不注入空 index、M2=消费方表补 clone/zip(A5)。
请你复核: (1)ED-1:S2 补记文本与 GLM 自己首轮抽查结论仍一致,签 done accept/counter;(2)W7E-0:测试矩阵(own/reuse+room/undo-redo/save-reload)对 P0-1 复现路径的覆盖,签 agree/counter;(3)ED-2:15 旧页→八模块映射"恰好一次"可测性、跨模块跳转三例是否足够,签 agree/counter;(4)W7E:M1/M2 落卡后的消费方矩阵终版逐层对照实际代码面(content/reforge/editor core/editor UI/migrate/MG2/docs),给漏项差集;测试节对 D1-D5 分期的映射,签 agree/counter。各卡分别写 GLM 行+日志
不要做: 不改实现;子卡三签未齐不 build;ED-1 三方未齐不标 done
输出要求: 四项分别结论、W7E 消费方差集、提交 hash
```
