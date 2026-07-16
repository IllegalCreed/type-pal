# X7-1 - manifest 工程设置与启动流程工作台

Status: draft
Phase: phase2
Capability: X7 / editor-project
Coding Owner: Codex
Generation Owner: N/A
Reviewer: both
Visual Verification Owner: Codex + Opus + User
Unavailable Agents: none
Branch: TBD

## 目标

把编辑器当前只有一个“入口点”表单的“工程”模块，重构为围绕 `manifest.json` 的完整工程设置与启动流程工作台。作者应能在业务界面中查看和编辑工程身份、启动链、入口点、默认开局数据和资源角色绑定，看到可跳转的问题与引用关系，并通过保存、重开和试玩确认这些设置确实进入工程文件和运行时。manifest 的字段只能有一个权威编辑位置，不能再靠手改 JSON 或分散在音乐、过场、场景页面里的隐式配置维持闭环。

## 范围

- 范围内:
  - 重构“工程”一级模块的信息架构和深链接，保留现有工程生命周期入口，不把它退回“数据”大杂烩。
  - 设计并实现以下不超过五个紧凑子页：
    1. **概览**：工程身份、启动摘要、未解决问题和保存状态。
    2. **启动流程**：启动视频、标题菜单音乐、默认入口、入口视频和场景 `onEnter` 的只读链路预览；可编辑的全局角色绑定从这里进入。
    3. **入口点**：入口点列表的新增、复制、删除和编辑；稳定 `id`、标签、起始场景、入口视频以及默认/自定义开局的继承摘要。
    4. **默认开局**：完整编辑 `manifest.startWorld`，并复用同一编辑器编辑入口点的自定义 `startWorld` 覆盖。
    5. **问题与高级**：只读展示 `content` 路径、`contentVersion`、legacy 家族、资源注册表状态、验证结果和可跳转引用；高级字段不在本页直接裸改。
  - manifest 全局字段的归属和编辑语义：`name`、默认 `entryScene`、`assets.roles`、`entryPoints`、`startWorld`。
  - 入口点引用的资源选择器、预览和缺失/类型不匹配提示；资源二进制的导入、替换、删除仍由资源模块负责。
  - 默认开局与入口点覆盖的继承/复制/清除语义，覆盖队伍、金钱、背包、技能和 `seedStats`。
  - 所有改动使用不可变 Command，支持撤销/重做、保存、重开和运行时试玩。
  - 使用既有 `ProjectReferenceIndex`（ED-3）提供引用、删除守卫和问题跳转，不在本任务建立第二套扫描器。
  - 工程模块的响应式布局、空状态、错误状态、键盘操作、长标签和 1280/900/720 宽度下的视觉闭环。

- 范围外:
  - 不在普通作者界面裸编辑 `manifest.content` 路径、legacy 字段或原始 JSON。
  - 不新增资源二进制 CRUD、MIDI/视频/RNG 编辑器；这些由 A7/R7 资源模块负责，本任务只提供稳定选择和跳转。
  - 不实现地图、场景、角色、物品、技能、敌人等领域的生命周期 CRUD。
  - 不替 ED-3 实现新的引用索引、反查算法或每页私有引用扫描器。
  - 不做工程发现、克隆、另存为、zip 导出等 X6/A5 已有或另有任务负责的生命周期功能。
  - 不改变 manifest schema、运行时启动语义或建立第二套并行 manifest 格式；发现 schema 不足时必须停在设计阶段重新开三方决策。

## 上下文锚点

所有非小改任务必填；无锚点不得进入 `build`。

- 已拍板决策 / 铁律:
  - [`AGENTS.md`](../../AGENTS.md)：三贤人系统、开卡三签、单 Coding Owner、交接提示词和“数据迁移先修上游”规则。
  - [`docs/phase2/READ-FIRST.md`](../../phase2/READ-FIRST.md)：第二阶段全新架构、稳定 id、编辑器 = 在线应用、工程 = 用户本地工程，以及一阶段 UX 形态约束。
  - 工程是 manifest + content + assets 的自包含快照；运行时不去工程目录外找资源。角色绑定指向工程内稳定 `AssetId`，不能退回数字文件名或共享根路径。
  - manifest 字段只能有一个权威编辑者：工程模块拥有全局设置和角色绑定；音乐、过场等资源模块拥有资源注册表与二进制；场景/脚本模块拥有场景内编排。
  - `id` 在本任务中是稳定工程身份，只读；重命名需要独立的引用迁移任务，不能在 UI 中悄悄修改。
  - 默认开局和入口点覆盖必须明确区分“继承默认”和“自定义覆盖”，不能靠空对象、数组位置或 UI 临时状态猜测。

- 代码锚点(`file:line`):
  - [`packages/content/src/character.ts:53-74`](../../packages/content/src/character.ts)：`EntryPoint` 与 `LoadedManifest` 的当前 schema；`entryScene`、`entryPoints`、`assets`、`startWorld` 均属于同一工程清单。
  - [`packages/content/src/asset.ts:28-116`](../../packages/content/src/asset.ts)：稳定资源角色和 `ManifestAssetConfigV3`；角色绑定必须走 `AssetId`/catalog。
  - [`packages/content/src/asset.ts:192-245`](../../packages/content/src/asset.ts)：manifest 资源配置校验；保存前要复用既有 kind/存在性/路径校验。
  - [`packages/content/src/asset.ts:266-435`](../../packages/content/src/asset.ts)：资源引用来源收集；不得在工程页复制一份引用规则。
  - [`packages/editor/src/ui/editor-navigation.ts:52-155`](../../packages/editor/src/ui/editor-navigation.ts)：模块/子页定义与工程模块当前仅有 `entrypoint` 的导航模型。
  - [`packages/editor/src/ui/editor-navigation.ts:185-252`](../../packages/editor/src/ui/editor-navigation.ts)：`module/page/object` 深链接解析和生成约定。
  - [`packages/editor/src/ui/EntryPointTab.tsx:1-362`](../../packages/editor/src/ui/EntryPointTab.tsx)：当前入口点页的局部索引选择、整表命令、默认开局子表单和缺失 UI；这是重构对象，不是新的数据真源。
  - [`packages/editor/src/core/commands.ts:2175-2262`](../../packages/editor/src/core/commands.ts)：现有 manifest 名称、初始技能和入口点命令；新增命令必须保持 apply/invert 不可变约定。
  - [`packages/editor/src/core/project-io.ts:95-187`](../../packages/editor/src/core/project-io.ts)：保存时按 manifest/content 输出文件并整体写回 `manifest.json`；不得因 UI 重构丢失未编辑字段或资源二进制。
  - [`packages/editor/src/core/edit-session.ts:25-47`](../../packages/editor/src/core/edit-session.ts)：编辑会话中 manifest、资源注册表、二进制和脚本工作副本的所有权。

- 已知坑 / 审计文档:
  - [`docs/phase2/editor/project-design.md`](../../phase2/editor/project-design.md) §3：manifest 是工程入口描述，不是让作者直接维护的路径字典。
  - [`docs/phase2/editor/editor-design.md`](../../phase2/editor/editor-design.md) §11：工程模块应承载入口点、工程设置、locale、问题面板、保存/导出/资源闭包报告；页面要少而紧凑。
  - [`docs/phase2/editor/editor-authoring-closure-audit-2026-07-13.md`](../../phase2/editor/editor-authoring-closure-audit-2026-07-13.md) §§5、7、8：工程模块重排建议、统一引用图 ED-3 和后续顺序。
  - [`docs/phase2/roadmap.md`](../../phase2/roadmap.md)：ED-3 是后续 CRUD 共用的引用图地基；本卡只能消费它，不能抢跑替代。
  - [`docs/phase2/capability-map.md`](../../phase2/capability-map.md) X6/X7/A5/A7：工程自包含、入口点和资源生命周期已有边界，不能在 UI 中重新引入外部资源依赖。
  - [`docs/ops/tasks/A7-0-resource-closure-registry.md`](A7-0-resource-closure-registry.md) 与 [`A7-3-cutscene-asset-workbench.md`](A7-3-cutscene-asset-workbench.md)：资源角色、稳定 AssetId、视频/RNG 资源页和引用跳转的现行约定。
  - 当前入口页用 `selIdx`（数组位置）选择对象，且没有深链接、入口视频编辑、全局角色编辑、`seedStats` 表单或可用的右侧诊断；这些都是已知缺口。
  - 空白工程和 PAL 克隆工程都必须覆盖；不能只让当前 PAL 数据看起来能用。

- 不得重新引入:
  - “数据”超级模块、原始 JSON 编辑器或让用户记忆文件路径的普通控件。
  - 在音乐/过场/场景页重复编辑同一个 manifest role 或入口点字段。
  - 以数组下标、文件名、数字编号作为工程、入口或资源身份。
  - `paletteId`、旧调色板并行模型，或任何第二套 map/script/reference 格式。
  - 每个页面各写一套“引用处”扫描器；引用必须来自 ED-3 的统一索引。
  - 用“预览链路”偷偷实现一套不同于运行时的启动流程；预览只解释和验证当前配置。

- 相关测试:
  - 现有 manifest/content/asset validator、`serializeProject`、FSA/HTTP 工程保存重开测试应作为回归基线。
  - `SetEntryPointsCommand`、manifest 名称/技能命令和编辑会话 undo/redo 测试应扩展而不是绕过。
  - A7-0/A7-3 的资源角色、catalog、视频/RNG 引用测试是角色选择器的基线。
  - ED-3 完成后，工程页必须使用其 `ProjectReferenceIndex` 测试夹具；ED-3 未完成时不得假造第二套临时接口进入 build。

## 验收条件

- 功能:
  - PAL 工程和空白 fixture 都能打开工程模块；概览、启动流程、入口点、默认开局、问题与高级五个子页的责任清晰，没有空白的“伪属性面板”。
  - 可编辑 `name`、默认 `entryScene`、入口点 `label/scene/introVideo`；入口点 `id` 展示且只读。可新增、复制、删除入口点；至少保留一个有效入口。
  - 可完整编辑默认 `startWorld`：队伍顺序、金钱、背包、技能和每个角色的 `seedStats`；入口点可明确选择继承默认或拥有独立覆盖，并可清除覆盖回到继承。
  - `assets.roles` 的角色绑定显示角色名、必选性、期望 kind、当前 AssetId、资源预览/跳转和缺失/类型错误；工程页改绑定后资源页和运行时使用同一值。
  - 启动流程能区分 manifest 全局启动角色、入口点 intro video、入口场景 `onEnter` 脚本；链路预览显示来源，不制造重复调用。
  - 缺失场景、缺失入口视频、重复入口 id、非法 AssetId、kind 不匹配和无法解析的路径均 fail-loud，问题可跳转到对应编辑器对象。
  - 所有字段都走 Command，撤销/重做后状态、引用检查和保存内容一致；不编辑的 manifest 字段逐字保留语义。

- 测试:
  - 单元测试覆盖各 manifest patch command 的 apply/invert、默认/覆盖继承、入口 CRUD、重复 id、引用/类型校验和 `seedStats` 边界。
  - 序列化 round-trip 覆盖 PAL、空白和故意损坏 fixture；保存后重开不会丢 `content`、`assets.legacy`、未知但受支持的字段或已登记未引用资产。
  - FSA 与 HTTP/FileSource 两条保存路径都验证；保存后的工程再次加载后能由运行时使用新的入口场景、入口视频、角色绑定和开局数据启动。
  - 深链接测试覆盖 `module=project&page=...&object=...`，按稳定 id 恢复子页和入口点选择，不依赖数组下标。
  - 与 ED-3 的引用索引集成测试覆盖角色绑定、入口视频、入口场景和问题跳转；不得出现工程页私有重复扫描。
  - Playwright 覆盖 PAL/空白工程打开、修改、撤销、保存、重开、试玩及故意错误提示；门禁按仓库现行命令全绿。

- 文档:
  - `editor-navigation` 的工程子页和深链接约定、manifest 字段归属、继承语义、问题跳转责任写入对应设计文档；不把实现细节只留在聊天。
  - capability-map 的 X7 状态只有在真实验收完成后更新；本卡 draft/build 阶段不得提前宣称新增能力已完成。

- 视觉 / 手工验证:
  - Codex 在 1280×900、1440×920、900×720 至少各截一张工程模块截图；验证长标签、错误提示、空白工程和窄宽度无横向溢出或空白右栏。
  - Opus 复核信息架构、控件层级、启动链可读性和视觉一致性；用户最终确认“能看懂并能完成一次新入口配置”。
  - 试玩至少验证：改默认入口、改入口视频、改角色绑定、改开局数据后，重开工程和启动运行时都消费修改结果。

## 推进签字

签字是阶段门禁。本任务触碰 manifest/save/editor 公共边界，按高风险开卡处理；未集齐三方设计签字不得进入 `build`。

### 进入 build 前:设计签字

- Codex: pending
- Opus: pending
- GLM: pending
- counter / 分歧处理: 尚无；任何 schema、引用权威或继承语义分歧先留在本节并请用户拍板
- 缺签豁免: N/A
- build 准入结论: blocked

### 进入 done 前:审查签字

- Codex: pending
- Opus: pending
- GLM: pending
- counter / 返工处理: pending
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论

1. **工程模块是 manifest 全局设置的唯一作者**。工程页负责工程身份、入口、角色绑定、默认开局和诊断；资源库负责 catalog/二进制；场景和脚本页负责局部演出。任何跨模块字段通过稳定链接进入唯一作者页，不提供第二个编辑入口。
2. **入口点用稳定 id 深链接**。UI 可以按列表展示，但选择、URL、引用和撤销都以 `EntryPoint.id` 为身份；新增/复制时先校验不重复，删除前由引用图给出守卫。当前 `selIdx` 只能作为渲染排序位置，不能作为状态身份。
3. **默认开局采用显式继承模型**。入口点缺少 `startWorld` 表示继承 manifest 默认值；存在 `startWorld` 即为完整自包含覆盖。编辑器提供“复制默认到此入口”和“清除覆盖”两个明确动作，不用部分空对象表达隐式继承。默认编辑器与入口覆盖编辑器共享同一组件和校验器。
4. **启动流程是解释层，不是第二个运行时**。页面将 `assets.roles` 的启动角色、入口点 `introVideo`、创建世界、进入 `scene`、场景 `onEnter` 以只读链路串起来；可编辑项只回写对应的 manifest 字段。脚本内播放视频/RNG/BGM 仍由脚本模块和资源引用图管理。
5. **问题面板消费统一引用图和既有 validator**。工程页只聚合诊断、显示来源并提供深链接；ED-3 的 `ProjectReferenceIndex` 是唯一反向引用真源，后续删除/替换策略沿用其 `block/warn/replace-suggest` 语义。
6. **先不改 schema**。当前 V3 manifest 已覆盖本任务字段。实现若发现需要增加字段、改变 `entryPoints`/`startWorld` 语义或让运行时改变启动顺序，立即停止实现，回到 draft 更新设计并重新走三方签字。

### 推荐实现分期

- X7-1A：导航/页面骨架、稳定深链接、工程概览和只读问题汇总。
- X7-1B：入口点 CRUD、场景/入口视频选择、角色绑定选择器和启动链解释。
- X7-1C：可复用 `StartWorldEditor`、默认/覆盖继承、`seedStats` 和命令/校验。
- X7-1D：ED-3 引用图接入、保存重开/试玩、FSA/HTTP 和全套视觉验证。

分期不拆签字门禁：四段都属于本卡 build，任何一段发现 schema 或公共接口变化都必须退回设计审查。

### 已知风险

- 风险: `entryPoints` 缺省时运行时会从 `entryScene` 合成默认入口；编辑器若直接物化一条再保存，可能产生不必要的 manifest 差异。
  - 缓解: 明确“缺省兼容态”和“显式入口表”的序列化策略，加入缺省 round-trip 测试。
- 风险: 默认开局和入口覆盖容易出现浅拷贝、半覆盖或清除后残留。
  - 缓解: 统一纯函数解析/复制/清除 API，测试完整对象快照和 undo/redo。
- 风险: 资源角色既被运行时消费又在资源模块展示，重复编辑会重新出现引用不一致。
  - 缓解: 角色绑定只在工程页写入；资源页只反向展示引用并提供跳转。
- 风险: ED-3 尚在路线中，工程问题面板若先自行扫描会形成永久兼容债。
  - 缓解: 将 ED-3 作为 build 前置依赖；没有统一接口时只完成页面骨架和设计，不进入实现收口。
- 风险: `project-io` 整体输出 manifest，新增 UI 可能意外丢失未知字段或 legacy 数据。
  - 缓解: 命令只做结构化 patch，序列化 round-trip 使用 PAL/空白/未知字段 fixture，并检查非目标字段。
- 风险: 启动链把 manifest 角色和脚本内调用混为一谈，导致视频/RNG/BGM 重复播放。
  - 缓解: 设计阶段先列来源矩阵，页面只解释已有运行时语义，不以预览代码替代脚本执行。

### 主审立场

- Reviewer: Opus（架构、编辑器信息架构和视觉主审）；GLM（manifest 字段覆盖、保存矩阵、引用/测试审计）。
- 结论: pending
- 必改项: pending
- 是否建议进入 build: pending（必须三方设计签字且 ED-3 依赖边界明确）

### 三方争议记录(按需)

- Codex: 提案采用五个子页、稳定 id、显式继承和单一字段作者；待 Opus/GLM 复核。
- Opus: pending
- GLM: pending
- 用户拍板: pending

## 额度 / 代班记录(如适用)

- 缺席 Agent: none
- 缺席原因: N/A
- 代班 Agent: N/A
- 代班范围: N/A
- 风险: N/A
- 是否需要补审: N/A
- 用户裁决: N/A

## Build: 实现与自测

- Coding Owner: 未开始；build 准入签字未齐，不得修改实现文件。
- 修改文件: none
- 实现摘要: pending
- 运行命令: pending
- 浏览器 / 手工检查: pending
- 跳过的检查及原因: pending

## 资源生成记录(如适用)

- Generation Owner: N/A
- 生成目的 / 替换对象: N/A
- 提示词要点 / 风格约束: N/A
- 输出路径: N/A
- 尺寸 / 格式 / 透明背景 / 调色约束: N/A
- 资源登记位置: N/A
- 验证方式: N/A

## 视觉验证记录(如适用)

- Visual Verification Owner: Codex + Opus + User
- 验证方式: pending
- 截图 / 像素检查路径: pending
- 结论: pending
- 未完成项: 设计签字和 build 尚未开始

## Review: 审查与返工

- Reviewer: Opus + GLM
- 审查结论: 尚未实现，等待 build 和三方 review
- 必须返工项: pending
- Accept / rework: pending

## 用户验收

- 用户结论: pending
- 后续任务: pending

## 交接日志

- 2026-07-16 Codex: 根据当前 V3 manifest schema、工程模块设计、编辑器闭环审计和现有入口点实现，起草 X7-1 任务卡；明确工程页字段唯一归属、稳定 id、默认开局继承、ED-3 引用图依赖和保存/重开验收矩阵。Evidence: `packages/content/src/character.ts`、`packages/content/src/asset.ts`、`packages/editor/src/ui/EntryPointTab.tsx`、`docs/phase2/editor/editor-authoring-closure-audit-2026-07-13.md`。Next: Opus 设计/UX 审查。

## 下一位 Agent 提示词

```text
接手任务:X7-1 manifest 工程设置与启动流程工作台
任务卡:docs/ops/tasks/X7-1-manifest-project-workbench.md
当前状态:draft；三方设计签字未齐，build blocked
你的角色:Claude Opus；架构、编辑器信息架构、交互和视觉主审
先读:AGENTS.md；docs/phase2/READ-FIRST.md；本卡全部；docs/phase2/editor/project-design.md §3；docs/phase2/editor/editor-design.md §11；docs/phase2/editor/editor-authoring-closure-audit-2026-07-13.md §§5、7、8；docs/phase2/roadmap.md 中 ED-3；packages/content/src/character.ts:53-74；packages/content/src/asset.ts:28-116、192-245、266-435；packages/editor/src/ui/editor-navigation.ts:52-155、185-252；packages/editor/src/ui/EntryPointTab.tsx；packages/editor/src/core/commands.ts:2175-2262；packages/editor/src/core/project-io.ts:95-187
已完成:Codex 已起草五子页工程模块、manifest 字段唯一归属、稳定 id 深链接、默认/入口 startWorld 显式继承、资源角色选择、启动链解释、ED-3 依赖和保存/重开验收矩阵
请你做:只审设计，不改实现文件；检查信息架构是否过重、manifest/运行时边界是否干净、入口/默认开局继承是否可实现、启动链是否会重复播放、ED-3 依赖和响应式视觉方案是否合理；输出 agree，或 counter + 可执行替代方案，并把结论写回本卡「推进签字」的 Opus 行和「三方争议记录」
不要做:不得开始 build；不得修改 packages/ 下实现；不得标记 done；不得另起第二套引用扫描器或 schema
输出要求:在任务卡签 Opus agree/counter，列出必改项；完成后给出下一位 GLM 的覆盖/测试矩阵复核提示词
```
