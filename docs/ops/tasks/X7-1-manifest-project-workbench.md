# X7-1 - manifest 工程设置与启动流程工作台

Status: done
Phase: phase2
Capability: X7 / editor-project
Coding Owner: Codex
Generation Owner: N/A
Reviewer: both
Visual Verification Owner: Codex + Opus + User
Unavailable Agents: none
Branch: main

## 目标

把编辑器当前只有一个“入口点”表单的“工程”模块，重构为围绕 `manifest.json` 的完整工程设置与启动流程工作台。作者应能在业务界面中查看和编辑工程身份、启动链、入口点、默认开局数据和资源角色绑定，看到可跳转的问题与引用关系，并通过保存、重开和试玩确认这些设置确实进入工程文件和运行时。manifest 的字段只能有一个权威编辑位置，不能再靠手改 JSON 或分散在音乐、过场、场景页面里的隐式配置维持闭环。

## 范围

- 范围内:
  - 重构“工程”一级模块的信息架构和深链接，保留现有工程生命周期入口，不把它退回“数据”大杂烩。
  - 设计并实现以下四个紧凑子页（用户于 2026-07-16 裁决合并入口点与开局设置）：
    1. **概览**：工程身份、启动摘要、未解决问题和保存状态。
    2. **全局资源与启动**：八项 `assets.roles` 按启动、战斗、音频基础和视觉基础分组置顶编辑；下半部只读解释启动视频、标题菜单音乐、默认入口、入口视频和场景 `onEnter` 链路。
    3. **入口点与开局**：左侧第一项“默认入口（不经过标题菜单）”统一编辑 `manifest.entryScene + manifest.startWorld`；其余菜单入口按稳定 `id` 编辑标签、场景、入口视频和自己的完整开局设置，并明确显示跟随默认/本入口独立设置。
    4. **问题与高级**：只读展示 `content` 路径、`contentVersion`、legacy 家族、资源注册表状态、验证结果和可跳转引用；高级字段不在本页直接裸改。
  - manifest 全局字段的归属和编辑语义：`name`、默认 `entryScene`、`assets.roles`、`entryPoints`、`startWorld`。
  - 入口点引用的资源选择器、预览和缺失/类型不匹配提示；资源二进制的导入、替换、删除仍由资源模块负责。
  - 默认开局与入口点覆盖的继承/复制/清除语义，覆盖队伍、金钱、背包、技能和 `seedStats`。
  - 所有改动使用不可变 Command，支持撤销/重做、保存、重开和运行时试玩。
  - 使用现有 `collectAssetReferences` 与 manifest/content/asset validator 提供资产引用、问题聚合和跳转；本任务不等待尚未落地的 ED-3，也不建立第二套扫描器。真正需要反向跨域查询的能力另行开卡。
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
  - [`AGENTS.md`](../../../AGENTS.md)：三贤人系统、开卡三签、单 Coding Owner、交接提示词和“数据迁移先修上游”规则。
  - [`docs/phase2/READ-FIRST.md`](../../phase2/READ-FIRST.md)：第二阶段全新架构、稳定 id、编辑器 = 在线应用、工程 = 用户本地工程，以及一阶段 UX 形态约束。
  - 工程是 manifest + content + assets 的自包含快照；运行时不去工程目录外找资源。角色绑定指向工程内稳定 `AssetId`，不能退回数字文件名或共享根路径。
  - manifest 字段只能有一个权威编辑者：工程模块拥有全局设置和角色绑定；音乐、过场等资源模块拥有资源注册表与二进制；场景/脚本模块拥有场景内编排。
  - `id` 在本任务中是稳定工程身份，只读；重命名需要独立的引用迁移任务，不能在 UI 中悄悄修改。
  - 默认开局和入口点覆盖必须明确区分“跟随默认”和“本入口独立设置”，不能靠空对象、数组位置或 UI 临时状态猜测；跟随状态下有效开局只读，复制后才可编辑。

- 代码锚点(`file:line`):
  - [`packages/content/src/character.ts:53-74`](../../../packages/content/src/character.ts)：`EntryPoint` 与 `LoadedManifest` 的当前 schema；`entryScene`、`entryPoints`、`assets`、`startWorld` 均属于同一工程清单。
  - [`packages/content/src/asset.ts:28-116`](../../../packages/content/src/asset.ts)：稳定资源角色和 `ManifestAssetConfigV3`；角色绑定必须走 `AssetId`/catalog。
  - [`packages/content/src/asset.ts:192-245`](../../../packages/content/src/asset.ts)：manifest 资源配置校验；保存前要复用既有 kind/存在性/路径校验。
  - [`packages/content/src/asset.ts:266-435`](../../../packages/content/src/asset.ts)：资源引用来源收集；不得在工程页复制一份引用规则。
  - [`packages/editor/src/ui/editor-navigation.ts:52-155`](../../../packages/editor/src/ui/editor-navigation.ts)：模块/子页定义与工程模块当前仅有 `entrypoint` 的导航模型。
  - [`packages/editor/src/ui/editor-navigation.ts:185-252`](../../../packages/editor/src/ui/editor-navigation.ts)：`module/page/object` 深链接解析和生成约定。
  - `packages/editor/src/ui/EntryPointTab.tsx:1-362`（历史路径 `d0a42191^:packages/editor/src/ui/EntryPointTab.tsx`，已由 ProjectWorkbenchTab 取代）：当前入口点页的局部索引选择、整表命令、默认开局子表单和缺失 UI；这是重构对象，不是新的数据真源。
  - [`packages/editor/src/core/commands.ts:2175-2262`](../../../packages/editor/src/core/commands.ts)：现有 manifest 名称、初始技能和入口点命令；新增命令必须保持 apply/invert 不可变约定。
  - [`packages/editor/src/core/project-io.ts:95-187`](../../../packages/editor/src/core/project-io.ts)：保存时按 manifest/content 输出文件并整体写回 `manifest.json`；不得因 UI 重构丢失未编辑字段或资源二进制。
  - [`packages/editor/src/core/edit-session.ts:25-47`](../../../packages/editor/src/core/edit-session.ts)：编辑会话中 manifest、资源注册表、二进制和脚本工作副本的所有权。

- 已知坑 / 审计文档:
  - [`docs/phase2/editor/project-design.md`](../../phase2/editor/project-design.md) §3：manifest 是工程入口描述，不是让作者直接维护的路径字典。
  - [`docs/phase2/editor/editor-design.md`](../../phase2/editor/editor-design.md) §11：工程模块应承载入口点、工程设置、locale、问题面板、保存/导出/资源闭包报告；页面要少而紧凑。
  - [`docs/phase2/editor/editor-authoring-closure-audit-2026-07-13.md`](../../phase2/editor/editor-authoring-closure-audit-2026-07-13.md) §§5、7、8：工程模块重排建议、统一引用图 ED-3 和后续顺序。
  - [`docs/phase2/roadmap.md`](../../phase2/roadmap.md)：ED-3 是后续 CRUD 共用的引用图方向；本卡不把它设为前置依赖，先消费现有 `collectAssetReferences` 和既有 validator。
  - [`docs/phase2/capability-map.md`](../../phase2/capability-map.md) X6/X7/A5/A7：工程自包含、入口点和资源生命周期已有边界，不能在 UI 中重新引入外部资源依赖。
  - [`docs/ops/tasks/A7-0-resource-closure-registry.md`](A7-0-resource-closure-registry.md) 与 [`A7-3-cutscene-asset-workbench.md`](A7-3-cutscene-asset-workbench.md)：资源角色、稳定 AssetId、视频/RNG 资源页和引用跳转的现行约定。
  - 当前入口页用 `selIdx`（数组位置）选择对象，且没有深链接、入口视频编辑、全局角色编辑、`seedStats` 表单或可用的右侧诊断；这些都是已知缺口。
  - 空白工程和 PAL 克隆工程都必须覆盖；不能只让当前 PAL 数据看起来能用。

- 不得重新引入:
  - “数据”超级模块、原始 JSON 编辑器或让用户记忆文件路径的普通控件。
  - 在音乐/过场/场景页重复编辑同一个 manifest role 或入口点字段。
  - 以数组下标、文件名、数字编号作为工程、入口或资源身份。
  - `paletteId`、旧调色板并行模型，或任何第二套 map/script/reference 格式。
  - 每个页面各写一套“引用处”扫描器；资产引用必须来自现有统一收集器/validator，不能为本卡造临时反向索引。
  - 用“预览链路”偷偷实现一套不同于运行时的启动流程；预览只解释和验证当前配置。

- 相关测试:
  - 现有 manifest/content/asset validator、`serializeProject`、FSA/HTTP 工程保存重开测试应作为回归基线。
  - `SetEntryPointsCommand`、manifest 名称/技能命令和编辑会话 undo/redo 测试应扩展而不是绕过。
  - A7-0/A7-3 的资源角色、catalog、视频/RNG 引用测试是角色选择器的基线。
  - 工程页测试必须覆盖现有 `collectAssetReferences` 与本地入口点 validator；若未来需要 `ProjectReferenceIndex` 的反向查询，另行开卡接入，不阻塞本卡 build。

## 验收条件

- 功能:
  - PAL 工程和空白 fixture 都能打开工程模块；概览、全局资源与启动、入口点与开局、问题与高级四个子页责任清晰，没有把同一概念拆成两个模块或留下空白“伪属性面板”。
  - 可编辑 `name`、默认 `entryScene`、入口点 `label/scene/introVideo`；入口点 `id` 展示且只读。可新增、复制、删除入口点；至少保留一个有效入口。
  - “入口点与开局”同页可完整编辑默认 `startWorld`（队伍顺序、金钱、背包、技能和每个角色的 `seedStats`）；每个菜单入口在自己的详情中始终展示有效整套开局，跟随默认时只读，复制后进入本入口独立设置，并可改回跟随默认。
  - `assets.roles` 的角色绑定显示角色名、必选性、期望 kind、当前 AssetId、资源预览/跳转和缺失/类型错误；工程页改绑定后资源页和运行时使用同一值。
  - 启动流程能区分 manifest 全局启动角色、入口点 intro video、入口场景 `onEnter` 脚本；链路预览显示来源，不制造重复调用。
  - 缺失场景、缺失入口视频、重复入口 id、非法 AssetId、kind 不匹配和无法解析的路径均 fail-loud，问题可跳转到对应编辑器对象。
  - 所有字段都走 Command，撤销/重做后状态、引用检查和保存内容一致；不编辑的 manifest 字段逐字保留语义。

- 测试:
  - 单元测试覆盖各 manifest patch command 的 apply/invert、默认/覆盖继承、入口 CRUD、重复 id、引用/类型校验和 `seedStats` 边界。
  - 序列化 round-trip 覆盖 PAL、空白和故意损坏 fixture；保存后重开不会丢 `content`、`assets.legacy`、未知但受支持的字段或已登记未引用资产。
  - FSA 与 HTTP/FileSource 两条保存路径都验证；保存后的工程再次加载后能由运行时使用新的入口场景、入口视频、角色绑定和开局数据启动。
  - 深链接测试覆盖 `module=project&page=...&object=...`，按稳定 id 恢复子页和入口点选择，不依赖数组下标。
  - 与现有资产引用收集器/validator 的集成测试覆盖角色绑定、入口视频、入口场景和问题跳转；不得出现工程页私有重复扫描。
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

- Codex: **agree（2026-07-16）**。作为 Coding Owner，已复核 `READ-FIRST`、本卡上下文锚点、Opus/GLM 的 R1-R3 与 G1-G2 结论；接受五页信息架构、稳定 id、显式继承、单一字段作者和不改 schema 的设计。R1 按用户裁决解耦 ED-3，问题面板使用现有 `collectAssetReferences` + validator；R2 缺省字段 round-trip、R3 locale 归属、S1/S2 只读边界，以及 G1/G2 均列入本次 build 验收。无 counter。
- Opus: **agree（2026-07-16,附 R1-R3 必改 + S1-S2 建议,见主审立场）**。架构/信息架构/交互/视觉七问逐项复核,
  核心设计成立,独立地面核对锚点全部坐实:
  - **信息架构**:当前 project 模块仅 `entrypoint` 一子页(editor-navigation.ts:146-154 实证);editor-design
    line 92 模块表与 §11 确把工程模块定位为入口点+工程设置+问题面板+闭包报告,五子页方向与之一致。
    单一字段作者(工程页拥 manifest 全局 + 角色绑定;资源库拥 catalog/二进制;场景/脚本拥局部演出)
    与 project-design §3、READ-FIRST 铁律契合。
  - **稳定 id**:当前 EntryPointTab.tsx:41 用 `selIdx`(数组位置)作选择态是真实缺口,设计 #2 改 `EntryPoint.id`
    深链接身份正确;`EntryPoint.id/LoadedManifest.id` schema(character.ts:54-74)已支持,id 只读、重命名
    另开卡的边界正确。
  - **默认/入口 startWorld 继承**:现有 `toggleCustom`(EntryPointTab.tsx:58-60,custom=克隆 manifest.startWorld /
    关=删字段回落)已是"缺字段=继承、有字段=完整覆盖"雏形;设计 #3 formalize 为复制默认/清除覆盖两显式
    动作 + 共享 StartWorldEditor,是对既有模式的正确收敛,不靠空对象/下标猜。
  - **启动链无重复播放**:三类视频源实证互斥且触发点不同——manifest 角色 startupTrademark/Splash(001/002)、
    entryPoints[].introVideo(003)、quitToTitle.videos\[](004/005/006,脚本级);设计 #4 把启动流程定为
    **只读解释层、可编辑项只回写 manifest 字段、脚本内 video/RNG/BGM 仍归脚本模块**——正确规避了
    "预览变第二运行时"的重复播放陷阱。
  - **命令/序列化**:现有 manifest 命令(RenameProjectCommand/UpdateStartSkillsCommand/SetEntryPointsCommand,
    commands.ts:2178-2244)均守 apply/invert 不可变约定;设计 #1"新增命令扩展不绕过" + project-io 整
    manifest 回写"结构化 patch 不丢未知字段"方向正确。
  - **不改 schema**:设计 #6"发现 schema 不足即停回设计"守铁律。
  裁定:核心架构无 counter。但 **R1(ED-3 依赖被过度耦合且陈述失实)必须先改,否则本卡要么永久 blocked
  于一个无卡无码的 ED-3、要么有人造一次性扫描器违铁律**——见主审立场 R1。
- GLM: **agree（2026-07-16;见下）**。六项独立实测逐条。

  **(1) R1 独立验证——ED-3 解耦主张完全坐实** ✅：
  - **ED-3 确实零卡零码**：`ls docs/ops/tasks/ED-3*` = 无；`grep ProjectReferenceIndex packages/` 唯一命中 = commands.ts:484 注释（"临时窄反查；ED-3 落地统一 ProjectReferenceIndex 后删除"）。无类/接口/模块。✅
  - **`collectAssetReferences`（asset.ts:266-436）已覆盖 X7-1 全部引用面**：
    - manifest 8 角色（:353-364）/ entryPoints.introVideo（:365-373）/ 场景 music+battleMusic（:374-388）/ 脚本命令资产 playMusic/playVideo/playFrameAnimation/startBattle.music/quitToTitle.videos（:298-348 递归 branch/battle/confirm）/ 敌人编舞（:421-434）。✅
    - 已有消费者：CutsceneTab / MusicTab / migration-validate.ts:464。✅
  - **X7-1 剩余需求分类**：
    - (a) 角色→资产引用、(b) introVideo→资产引用 = **collectAssetReferences 已覆盖**
    - (f) 角色 kind/存在性 = **validateManifestAssetConfigV3 已覆盖**（:235-243）
    - (c) entryPoint.scene 存在性、(d) id 唯一、(e) ≥1 入口 = **本地不变式**（纯集合检查，小 validator 即可，不需要跨域反查）
    - (g) "哪些场景引用某资产"反向查询 = **X7-1 manifest 编辑不需要**（manifest 需要正向 asset→where，collectAssetReferences 已提供；反向 scene→asset 只地图删除守卫需要，已有 mapAssetSceneReferences 窄 helper）
  - **结论：X7-1 的引用需求 100% 被现有代码覆盖，零项真正需要 ED-3。** 与用户判断一致——**不必等 ED-3**。R1 解耦方向正确。

  **(2) manifest 五字段覆盖矩阵** ✅：
  - **name**：RenameProjectCommand（commands.ts:2159-2189 apply/invert）✅
  - **entryScene**：schema 字段（character.ts:69），编辑待新增命令；loader.ts:165 有 load-time 存在性检查 ✅
  - **entryPoints**：SetEntryPointsCommand（commands.ts:2236-2262 整表 structuredClone + invert）✅
  - **startWorld**：UpdateStartSkillsCommand（commands.ts:2196-2230）+ 待扩展 party/inventory/money/seedStats ✅
  - **assets.roles**：manifest validator（asset.ts:192-245）校验角色存在性+kind；编辑走 manifest patch command ✅
  - **只读逐字保留**：content 路径 / contentVersion / legacy families / 未知字段——project-io:185 整 manifest 回写，typed schema 不丢已知字段。✅ **⚠ G1（build 必落）**：serialize 不 passthrough 未知 key（typed LoadedManifest 无索引签名）——如需保留未来字段，build 时确认是否需要 passthrough。

  **(3) R2 缺省 round-trip** ✅：
  - 实测 project-io:185 整 manifest 回写；entryPoints 未编辑时 `state.manifest.entryPoints` 保持 undefined → manifest.json 不含该字段。✅
  - 合成 `new-game` 只在 UI（EntryPointTab:25-27 resolveEntryPoints）和 runtime boot，不进 serialize。✅
  - **测试形态**：无 entryPoints manifest → 打开 → 不编辑 → 保存 → 断言 `files['manifest.json']` 不含 `entryPoints` 键（零物化零伪 diff）。PAL（有 entryPoints）与空白 fixture 各一。✅

  **(4) 继承语义测试** ✅：
  - EntryPointTab toggleCustom（:58-60）：custom=true → structuredClone(manifest.startWorld)；false → startWorld=undefined 回落。✅
  - 设计 #3 formalize 为"复制默认"/"清除覆盖"两显式动作 + 共享 StartWorldEditor。✅
  - 测试：party/inventory/learnedSkills/money/seedStats 完整对象快照 + undo/redo + 清除后字段缺席断言。✅

  **(5) 保存矩阵** ✅：
  - FSA + HTTP 两路径保存重开 + 运行时消费（改入口/视频/角色/开局后 boot 使用新值）。✅
  - serialize round-trip：PAL / 空白 / 故意损坏 fixture（缺场景/重复 id/非法 AssetId → fail-loud）。✅
  - project-io:99-103 当前保存前只跑 assertScriptProjectValid——**⚠ G2（build 必落）**：保存前须加 manifest entrypoint 本地校验（scene 存在/id 唯一/≥1 入口），否则 (c)(d)(e) 缺口在 save 时可达。

  **(6) R3 locale + S1/S2** ✅：
  - **R3 locale**：editor-design §11 列在工程模块下但五页未含——设计须显式表态（延后到独立任务或明确不归工程页）。✅ 方向正确。
  - **S1 五页摘要重叠**：概览问题/启动摘要 vs 详情页——设计论证"概览=纯摘要只读、详情页=唯一编辑处"分工消歧。✅
  - **S2 启动页 onEnter 只读**：场景 onEnter 内 video/RNG 是脚本所有、不可从启动页编辑——显式标注。✅

  **总结**：R1 解耦完全坐实（ED-3 零卡零码 + collectAssetReferences 覆盖 100% 引用面 + 剩余全本地不变式）；五字段覆盖矩阵全可落；R2 缺省 round-trip 不物化已验证；继承语义/保存矩阵全可落；R3/S1/S2 方向明确。**agree。X7-1 不必等 ED-3。**

  **G1-G2 build 必落（非阻塞，纳入 build 范围）**：
  - **G1**：确认 serialize 是否需要 passthrough 未知 manifest key（当前 typed schema 无索引签名）。
  - **G2**：保存前加 manifest entrypoint 本地校验（scene 存在/id 唯一/≥1 入口），封 (c)(d)(e) save-time 缺口。

- counter / 分歧处理: Opus 无架构 counter;R1-R3 为设计必补,GLM 无 counter(标 G1-G2 build 必落)。**R1 排期方向：X7-1 不等 ED-3**（用户拍板正确——collectAssetReferences + 本地 validator 覆盖全部引用面，零项需跨域反查）。
- 缺签豁免: N/A
- build 准入结论: **三签齐（Codex/Opus/GLM 均 agree，2026-07-16），build allowed。** R1-R3 必改 + S1-S2 + G1(serialize passthrough 确认)+ G2(保存前 entrypoint 校验)纳入 build 范围。**X7-1 不依赖 ED-3，可独立 build。**

### 进入 done 前:审查签字

- Codex: **accept（2026-07-16，资源设置返工后重签）**。实现、编辑器全量测试、PAL 迁移回归、三视口浏览器验证和浏览器错误日志均已复核；用户追加的入口术语、跟随状态只读、蓝色 checkbox，以及八项全局资源设置的分组置顶/概览直达反馈均已落地。独立只读 UX 复核亦未发现阻塞项。
- Opus: **accept（2026-07-17,实现/信息架构/交互/视觉主审,零阻塞返工项）**。七项重点逐条代码核对 + 6010 实机复验全过:
  1. **四页 IA + 单一作者边界** ✅:editor-navigation project 四子页(overview/startup/entrypoint/advanced)实证;live 四 tab 齐;
     全局资源页明文"资源文件导入/替换/预览仍在'资源'模块"(绑定归工程页、二进制归资源模块);ActorMode 的 startSkills
     已从可编辑 select 改为**只读摘要 + "前往'入口与开局'编辑↗"**跳转(diff 实证),单一作者坐实。
  2. **跟随默认只读 / 复制后独立** ✅:StartWorldFields `readOnly` 贯穿每控件,`value={selected.startWorld ?? manifest.startWorld}`、
     `readOnly={!selected.startWorld}`;live new-game 入口 跟随默认(18 控件 disabled)→ 复制默认 → 本入口独立设置(disabled→4)→
     改为跟随默认可回退;默认入口标"默认真源"。
  3. **八项 role 发现性 + 特殊战胜利结算自由绑定** ✅:PROJECT_ASSET_ROLE_GROUPS 四组恰覆盖 8 项 ASSET_ROLES
     (project-role-groups.test 断言 sort()===ASSET_ROLES.sort() 穷尽守护);live 页首 4 组 3/3+3/3+1/1+1/1=8、每项下拉可绑
     任意期望 kind + 预览↗;`audio.bossVictoryMusic` = "特殊战胜利结算音乐" + "可自由绑定音乐资源"(不写死 PAL 002)。
  4. **问题面板跳具体资源** ✅:按资产 kind 解析目标页(music→music / video·frame-animation→cutscene)+ objectId;
     live 点 music.pal.005 → `?module=asset&page=music&object=music.pal.005` 且行 `.selected`;底栏误报绿色改为 `⚠ 15 项待处理`。
  5. **跨子页不携带旧 objectId** ✅:`objectIdForSubpageNavigation` 仅同子页且 acceptsObject 才保留(wired ModuleNav:75);
     live music+object 点"过场素材"→ `?module=asset&page=cutscene`(objectId 已丢)、无"目标不存在"。
  6. **文字按钮/checkbox/队伍动作列无溢出(1280/900/720)** ✅:队伍行 grid `22px minmax(0,1.15fr) minmax(0,0.85fr) 28px 28px max-content`、
     linked-value-open 自适应、checkbox inline-flex 居中;live 900px 文档零横向溢出、文字按钮零 scrollWidth 溢出;
     `.project-party-name` scrollW>clientW 系 overflow-x:hidden+ellipsis 的**设计内截断**(非破裂),已核。
  7. **稳定 id 深链 / R1 不依赖 ED-3 / S1-S2 只读边界** ✅:入口深链按稳定 id(live object=new-game 非下标)、page=startworld→entrypoint
     归一化;**R1 坐实**:project-diagnostics/ProjectWorkbenchTab 对 `ProjectReferenceIndex` **零命中**,collectAssetReferences 用 4 次
     作唯一资产引用源 + 本地 entrypoint validator,无第二扫描器、无 ED-3 依赖;S1 概览=只读摘要+跳转、S2 启动链(只读)均实证。
  另核门禁:editor 27 files/211 tests 独立重跑通过;G2 `assertProjectSaveValid`(保存前)对入口场景缺失/重复 id/≥1 入口/
  startWorld 引用与不变式 fail-loud,FSA/HTTP 同门;R2 缺省 entryPoints 不物化(整 manifest 回写实证)。
  非阻塞观察(不返工):N1 900px 下 `.project-party-name` 对三字名即 ellipsis(clientW≈30px)且 AssetId 在 900px 仍显示
  (交接日志曾述"900 隐藏 AssetId"),身份列偏窄纯观感、无破裂;N2 概览中栏"未解决问题"与右栏"工程诊断"同页两处
  问题列表(同源一致、皆只读跳转,S1 残留)可择一更紧凑,非必须。
- GLM: **accept（2026-07-17;见下）**。九项验收点逐条独立核对，editor 27 files / 211 tests 全绿。

  **(1) 五字段唯一作者 + round-trip** ✅：
  - **name** → RenameProjectCommand（:2170 apply/invert 首次捕获）✅
  - **entryScene** → UpdateEntrySceneCommand（:2194）✅
  - **entryPoints** → SetEntryPointsCommand（:2293 整表 structuredClone + invert 恢复或 delete 空表 + 空表/空 id/重复 id/非规范 id 构造期 reject）✅
  - **startWorld** → UpdateStartWorldCommand（:2218 manifest+state 双镜像 + seedStats 缺失规范化）✅
  - **assets.roles** → UpdateManifestAssetRolesCommand（:2248 逐角色 patch + unbind delete key + 保留 catalog/legacy）✅
  - **唯一作者**：EntryPointTab.tsx 是文档化 shim（render ProjectWorkbenchTab），非第二编辑器；App.tsx:751 RenameProjectCommand 是菜单快捷入口非第二编辑器。✅
  - **round-trip**：project-io:189 整 manifest 回写；未编辑 entryPoints 保持 undefined 不物化（:100-101 注释 + project-io.test:199-215 断言）。✅

  **(2) 入口稳定 id + 旧 startworld 深链归一化** ✅：
  - `editor-navigation.ts:184` entrypoint `acceptsObject:true`；selection 按 `entry.id===focusObjectId`（ProjectWorkbenchTab:660-665），零 selIdx 身份。✅
  - **旧 `page=startworld` → 归一化 `entrypoint`**：normalizeEditorLocation:242 重写 + editor-navigation.test:84-94 断言。✅
  - 损坏 id（空/重复/非规范）不伪造深链，降级到修复模式（getRepairableEntryIndexes project-diagnostics:55-67）。✅

  **(3) 跟随/独立开局完整快照 + apply/invert** ✅：
  - **跟随**：selected.startWorld falsy → readOnly=true + 显示 manifest.startWorld 活值（:983-988）✅
  - **复制为独立**：`structuredClone(manifest.startWorld)`（:962-971）完整深拷贝 ✅
  - **清除覆盖**：`patchEntry(id,{startWorld:undefined})` → SetEntryPointsCommand `delete copy.startWorld`（:760-761 + commands:2309-2314）✅
  - 全走 commit()→SetEntryPointsCommand apply/invert。✅

  **(4) FSA/HTTP 保存重开** ✅：
  - project-io 整 manifest 回写 + assertProjectSaveValid 保存门禁（scene 存在/id 唯一/≥1 入口/seedStats/角色引用/资产闭包，project-diagnostics:416-481）。✅
  - project-io.test:175-197 full round-trip + :199-215 缺省不物化 + :217-235 未知字段保留 + :237-244 损坏 fixture fail-loud。✅

  **(5) collectAssetReferences / validator 诊断口径** ✅：
  - project-diagnostics:315-321 调用唯一 `collectAssetReferences`（assets+entryPoints+scenes+scriptChunks+enemies）→ validateAssetReferenceClosure → unused-asset warn（:329-331）。✅
  - 底栏 / 保存门 / 问题面板共用同一 scanner，零第二扫描器。✅
  - 15 种诊断码覆盖入口身份/结构/startWorld/资产闭包/catalog。✅

  **(6) 未引用资源跳转保留 AssetId** ✅：
  - unused-asset 诊断 target `objectId=assetId`（:366-372 按 kind 映射 music→music/cutscene→cutscene page）。✅
  - project-diagnostics.test:155-198 断言 `music.unused→{module:asset,page:music,objectId:music.unused}`。✅
  - 目标页选择该 asset：MusicTab:140-148 seed from focusObjectId + App:944 pass through。✅

  **(7) 跨资源子页清除 objectId** ✅：
  - `objectIdForSubpageNavigation`（editor-navigation:206-219）：仅同子页保留 objectId，跨子页 undefined。✅
  - 重复 id 不伪造深链（:128 注释）。✅

  **(8) 胜利结算 role 不限制 002** ✅：
  - UI 标签 `'特殊战胜利结算音乐'`（ProjectWorkbenchTab:68），非"胜利音乐 002"。✅
  - `<select>` 列出全部 music-kind catalog 条目，任意绑定（:185-187 candidates filter by kind=music）。✅
  - 002 仅在迁移升级路径 roleTrack(2)（upgrade-local-v2:122），非 schema 限制。✅
  - roleHint "可自由绑定音乐资源"（:200-203）。✅

  **(9) 未知字段保留 + 不改第一阶段/运行时** ✅：
  - serialize 整 manifest 回写，未知 key passthrough（project-io:189 无 allowlist）。✅
  - project-io.test:217-235 断言 `futureTopLevel`+`assets.futureAssetMeta` round-trip 保留 + absent startWorld/introVideo 不引入。✅
  - commands.test:1366-1386 断言 UpdateEntryScene/AssetRoles 保留 futureField。✅
  - 高级页只读展示未知字段计数（:1267-1279）。✅
  - 零第一阶段/运行时代码改动。✅

  **总结**：九项全过——五字段唯一作者+round-trip/稳定 id+深链归一化/跟随-独立完整快照+apply-invert/保存重开/诊断口径/AssetId 跳转/跨页清除 objectId/胜利 role 不限 002/未知字段保留。editor 27 files / 211 tests 全绿。**accept**。

- counter / 返工处理: 无。
- 缺签豁免: N/A
- done 准入结论: **三方 done 前审查签字齐（Codex accept + Opus accept + GLM accept，2026-07-17）。待用户验收；不得由 Agent 标 done。**

## Draft: 设计与风险

### 设计结论

1. **工程模块是 manifest 全局设置的唯一作者**。工程页负责工程身份、入口、角色绑定、默认开局和诊断；资源库负责 catalog/二进制；场景和脚本页负责局部演出。任何跨模块字段通过稳定链接进入唯一作者页，不提供第二个编辑入口。
2. **入口点用稳定 id 深链接**。UI 可以按列表展示，但选择、URL、引用和撤销都以 `EntryPoint.id` 为身份；新增/复制时先校验不重复，删除前由引用图给出守卫。当前 `selIdx` 只能作为渲染排序位置，不能作为状态身份。
3. **开局设置从属于入口，不再单列模块（用户裁决，2026-07-16）**。入口页第一项“默认直达”编辑 manifest 默认场景与默认开局；每个菜单入口的详情就地展示自己的有效开局。入口缺少 `startWorld` 表示继承 manifest 默认值；存在即为完整自包含覆盖。编辑器提供“复制默认到此入口”和“清除覆盖”两个明确动作，不用部分空对象表达隐式继承；底层兼容字段不应迫使作者理解为两套模块。
4. **启动流程是解释层，不是第二个运行时**。页面将 `assets.roles` 的启动角色、入口点 `introVideo`、创建世界、进入 `scene`、场景 `onEnter` 以只读链路串起来；可编辑项只回写对应的 manifest 字段。脚本内播放视频/RNG/BGM 仍由脚本模块和资源引用图管理。
5. **问题面板消费现有统一引用收集器和 validator**。工程页只聚合诊断、显示来源并提供深链接；资产正向引用来自 `collectAssetReferences`，manifest/content/asset 本地不变式复用既有 validator。需要真正反向跨域查询的删除/替换策略另行开 ED-3 任务，不在本卡造临时索引。
6. **先不改 schema**。当前 V3 manifest 已覆盖本任务字段。实现若发现需要增加字段、改变 `entryPoints`/`startWorld` 语义或让运行时改变启动顺序，立即停止实现，回到 draft 更新设计并重新走三方签字。

### 推荐实现分期

- X7-1A：导航/页面骨架、稳定深链接、工程概览和只读问题汇总。
- X7-1B：入口点 CRUD、场景/入口视频选择、角色绑定选择器和启动链解释。
- X7-1C：可复用 `StartWorldEditor`、默认/覆盖继承、`seedStats` 和命令/校验。
- X7-1D：现有引用收集器/validator 接入、保存重开/试玩、FSA/HTTP 和全套视觉验证；不等待 ED-3。

分期不拆签字门禁：四段都属于本卡 build，任何一段发现 schema 或公共接口变化都必须退回设计审查。

### 已知风险

- 风险: `entryPoints` 缺省时运行时会从 `entryScene` 合成默认入口；编辑器若直接物化一条再保存，可能产生不必要的 manifest 差异。
  - 缓解: 明确“缺省兼容态”和“显式入口表”的序列化策略，加入缺省 round-trip 测试。
- 风险: 默认开局和入口覆盖容易出现浅拷贝、半覆盖或清除后残留。
  - 缓解: 统一纯函数解析/复制/清除 API，测试完整对象快照和 undo/redo。
- 风险: 资源角色既被运行时消费又在资源模块展示，重复编辑会重新出现引用不一致。
  - 缓解: 角色绑定只在工程页写入；资源页只反向展示引用并提供跳转。
- 风险: 工程问题面板若复制引用规则或自建反向扫描，会形成永久兼容债。
  - 缓解: 只消费现有 `collectAssetReferences` 和 validator；真正需要跨域反向查询时另行开 ED-3 任务，不在本卡创建临时接口。
- 风险: `project-io` 整体输出 manifest，新增 UI 可能意外丢失未知字段或 legacy 数据。
  - 缓解: 命令只做结构化 patch，序列化 round-trip 使用 PAL/空白/未知字段 fixture，并检查非目标字段。
- 风险: 启动链把 manifest 角色和脚本内调用混为一谈，导致视频/RNG/BGM 重复播放。
  - 缓解: 设计阶段先列来源矩阵，页面只解释已有运行时语义，不以预览代码替代脚本执行。

### 主审立场

- Reviewer: Opus（架构、编辑器信息架构和视觉主审）；GLM（manifest 字段覆盖、保存矩阵、引用/测试审计）。
- 结论(Opus,2026-07-16): **agree — 核心设计成立(见推进签字 Opus 行七问);附 R1-R3 必改 + S1-S2**。
- 必改项(R,设计层面,build 前必落):
  - **R1 解除 ED-3 硬依赖并纠正"既有 ProjectReferenceIndex"的失实陈述**(最关键)。事实:ED-3 无任务卡、
    无 `ProjectReferenceIndex` 代码(全仓零命中),故本卡范围/设计 #5/风险把它当"既有"是错的。而 X7-1
    真正需要的引用面**已被现有统一收集器覆盖**:`collectAssetReferences`(asset.ts:351-436,A7-0/A7-3 建立)
    已跨 manifest 角色 + entryPoints.introVideo + 场景 music/命令资产 + 脚本 chunk + 敌人编舞 收集 typed
    资产引用边——**用它就是用既有唯一资产引用源,不是"第二套扫描器"**。其余 X7-1 所谓"引用"实为本地
    不变式:入口点"至少留一条有效"、`entryPoint.scene` 存在性、角色绑定 kind/存在性——均是 manifest/
    content/asset validator 的本地校验,非反查图查询。**改法**:①范围与设计 #5 改为"问题面板与角色/
    introVideo 引用展示消费 `collectAssetReferences` + 既有 validator";②显式枚举 X7-1 是否真需要任何
    跨域反查(如"哪些场景引用某资产"——manifest 编辑不需要),需要的那一小块才标 ED-3-依赖并**延后**,
    不阻塞本卡主体;③删除"ED-3 是 build 前置依赖"这条硬门,把 done 准入改为"消费既有引用源即可"。
    这条不改,本卡在无卡无码的 ED-3 面前要么死锁、要么诱使造一次性扫描器(违"每页各写一套扫描器"铁律)。
  - **R2 缺省态 round-trip 升为显式序列化契约,不止一条测试**。设计须明文规定:打开无 `entryPoints` 的
    manifest 且未编辑入口点即保存,**不得物化合成的 'new-game' 条目**(缺字段逐字保留),仅显式入口点编辑
    才写 `entryPoints` 数组;同理入口点无 `startWorld` 覆盖时保存保持字段缺席。把这钉成契约 + round-trip
    测试守住,否则每次 PAL/空白工程开→存都产生伪 manifest diff(风险节 #1 只列了测试,未把规则钉进设计)。
  - **R3 locale 归属显式表态**。editor-design §11(本卡引为信息架构权威)把 locale 列在工程模块下,但五子页
    未含 locale 编辑。设计须明说 locale 编辑延后到哪个任务(或明确不归工程页),避免"UI 文案在哪编"成为
    静默缺口日后返工。
- 建议项(S,不阻塞):
  - S1 五子页存在摘要重叠(问题:概览 + 问题与高级两处;启动:概览摘要 + 启动流程详情)。editor-design §11
    要求"页面少而紧凑";设计应论证为何 5 页而非 4(把概览的问题/启动摘要折进详情页,避免两张可能不一致
    的问题列表),或明确概览=纯摘要只读、详情页=唯一编辑处的分工以消歧。
  - S2 启动流程页的来源矩阵应显式标注:场景 onEnter 内的 video/RNG(如 s001 逐像素/s066 梦境)是脚本
    所有、**不可从启动页编辑**,只读展示——防止未来"在这里也能改"诱发本卡自己警告的双作者。
- 是否建议进入 build: **已获 Codex/Opus/GLM 三方 agree，build allowed**；R1-R3、G1-G2 纳入实现与验收范围，且本卡不依赖 ED-3。

### 三方争议记录(按需)

- Codex: **agree（2026-07-16）**。原提案采用五个子页、稳定 id、显式继承和单一字段作者；接受 Opus/GLM 的 R1-R3 必改、S1-S2 建议及 G1-G2 build 必落项。随后用户裁决把入口点与默认开局合并，信息架构收敛为四页；X7-1 仍不依赖 ED-3、不改 schema。
- Opus: **agree**。核心架构成立(五子页 IA/稳定 id 深链/显式继承/单一字段作者/启动链只读解释层无重复播放/
  不改 schema),锚点全实证(entrypoint 单页现状/selIdx 缺口/toggleCustom 继承雏形/三类视频源互斥/命令
  apply-invert)。**关键分歧 R1**:ED-3 依赖被过度耦合且"既有 ProjectReferenceIndex"陈述失实(ED-3 无卡无码);
  X7-1 的引用需求已被现有 `collectAssetReferences`(跨 manifest/场景/脚本/敌人)+ 既有 validator 覆盖,应据此
  解耦、删掉 ED-3 硬门,只把真正跨域反查(若有)延后。附 R2(缺省 round-trip 契约)/R3(locale 归属)+S1-S2。
- GLM: **agree**。R1 独立验证完全坐实解耦：ED-3 零卡零码（唯一命中 commands.ts:484 注释）；collectAssetReferences(asset.ts:266-436) 覆盖 X7-1 全部引用面（8 角色+introVideo+场景 music+脚本命令+敌人编舞）；剩余需求(scene 存在/id 唯一/≥1 入口)全本地不变式，零项需跨域反查。**X7-1 不等 ED-3**（用户判断正确）。五字段覆盖矩阵/R2 缺省 round-trip(不物化)/继承语义/保存矩阵全可落。G1(serialize passthrough 确认)+G2(保存前 entrypoint 校验)非阻塞。
- 用户拍板: **R1 解耦方向已拍板——X7-1 不等 ED-3**（用户 2026-07-16 判断"不必等，现成引用源足够支撑本卡主体"，GLM 独立验证坐实）。

## 额度 / 代班记录(如适用)

- 缺席 Agent: none
- 缺席原因: N/A
- 代班 Agent: N/A
- 代班范围: N/A
- 风险: N/A
- 是否需要补审: N/A
- 用户裁决: N/A

## Build: 实现与自测

- Coding Owner: Codex（2026-07-16，三方设计签字齐，开始 build）。
- 用户产品裁决（2026-07-16）：取消独立“默认开局”子页；默认直达与所有菜单入口必须在同一“入口点与开局”工作台编辑。`manifest.startWorld` 仍作为兼容/无菜单直达真源，不改 schema；本裁决收敛信息架构，不扩大公共接口。
- 修改文件: `packages/editor/src/ui/ProjectWorkbenchTab.tsx`、`packages/editor/src/ui/editor.css`、`packages/editor/src/ui/ActorMode.tsx`、`packages/editor/src/ui/App.tsx`、`packages/editor/src/ui/ModuleNav.tsx`、`packages/editor/src/ui/editor-navigation.ts`、`packages/editor/src/core/commands.ts`、`packages/editor/src/core/project-diagnostics.ts`、`packages/editor/src/core/project-io.ts`、`packages/editor/src/core/project-diagnostics.test.ts`、`packages/editor/src/ui/project-role-groups.test.ts` 及对应测试/设计文档。
- 实现摘要: 按 X7-1A→D 实现；工程模块收敛为四页，默认入口与标题菜单入口共用“入口与开局”作者页；入口深链接按稳定 id；菜单入口始终展示有效整套开局，跟随默认状态下控件只读，复制后才形成完整独立覆盖；保存门复用资产闭包并阻断坏入口/重复队伍、道具、技能；角色页只读摘要跳回唯一作者页；工程页 checkbox 使用蓝色自绘控件。八项 `manifest.assets.roles` 现按启动、战斗、音频基础、视觉基础四组置于“全局资源与启动”页首，概览提供直达入口；资源有效时才显示定向预览，缺失/类型错误改为行内错误并安全回到资源库。队伍操作按钮不再复用固定宽度 `.mini` 图标契约：箭头固定 28px，`移出` 按文字自适应，姓名/AssetId 列可收缩省略。胜利结算 role 的 UI 文案现为“特殊战胜利结算音乐”，并明确该语义槽可自由绑定任意音乐资源、升级屏沿用当前曲；不新增 role、不改变运行时和第一阶段代码。
- 运行命令: `pnpm --filter @type-pal/editor check`（typecheck + 27 个测试文件 / 211 个测试通过）；`pnpm exec biome check packages/editor/src/ui/ModuleNav.tsx packages/editor/src/ui/editor-navigation.ts packages/editor/src/ui/editor-navigation.test.ts packages/editor/src/ui/ProjectWorkbenchTab.tsx packages/editor/src/ui/MusicTab.tsx`（通过）；`pnpm --filter @type-pal/editor exec biome check src/core/project-diagnostics.ts src/core/project-diagnostics.test.ts src/ui/App.tsx src/ui/ProjectWorkbenchTab.tsx src/ui/editor.css`（通过）；独立复核定向 Vitest 2 个文件 / 9 项测试通过；`pnpm --filter @type-pal/migrate exec vitest run src/migrate-content.test.ts src/pal-migration-integration.test.ts --reporter=verbose`（43 通过、1 跳过）；`git diff --check`。
- 浏览器 / 手工检查: PAL 工程实际验证默认入口、标题菜单入口深链、跟随/复制为独立/改回跟随、角色页唯一跳转、旧 `page=startworld` 归一化；验证入口页 1440×920、1280×900、900×720 无横向溢出。全局资源页在当前 1280×720 实测 4 个分组、8 个选择器、预览按钮 `scrollWidth <= clientWidth` 且无文档横向溢出；问题页底栏从错误的绿色文案改为 `⚠ 15 项待处理`，首条未引用音乐跳转后 URL 带 `module=asset&page=music&object=music.pal.005` 且对应行 `.selected`；入口页 checkbox 标签和输入框几何中心一致；浏览器 console error 为空；截图见视觉验证记录。
- 跳过的检查及原因: 故意损坏 manifest 的 ID 修复模式未通过浏览器 UI 注入，已由 `getRepairableEntryIndexes` 单测覆盖；未执行全仓库与 A7-3 无关的长时集成套件，避免把现有并行任务变更混入验收。

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
- 验证方式: Codex 使用本地编辑器浏览器实际操作 + DOM 状态断言 + `view_image` 复核；关键状态包含默认入口/菜单入口、继承只读、复制独立后解锁、checkbox computed style、八项全局资源分组与概览直达、问题资产对象深链、底栏诊断汇总、文字按钮内容宽度、队伍 checkbox 垂直居中和视口溢出检查。
- 截图 / 像素检查路径: `/private/tmp/x7-1-entrypoint-1440x920.png`、`/private/tmp/x7-1-menu-entry-1440x920.png`、`/private/tmp/x7-1-inherited-readonly-1440x920.png`、`/private/tmp/x7-1-checkbox-blue-1440x920.png`、`/private/tmp/x7-1-entrypoint-1280x900.png`、`/private/tmp/x7-1-entrypoint-900x720.png`、`/private/tmp/x7-1-global-assets-1440x920.png`、`/private/tmp/x7-1-global-assets-900x720.png`、`/private/tmp/x7-1-entrypoint-fixed-1280x720.png`、`/private/tmp/x7-1-diagnostics-fixed.png`。
- 结论: 本轮用户反馈对应的逻辑和布局返工已完成并通过当前浏览器/单测证据；文字按钮不再复用固定 24px 图标契约，底栏只有零诊断才显示绿色，未引用 music/video/frame-animation 可到具体资源对象，checkbox 与标签中心线一致。任务暂回 `rework`，待 Opus/GLM 复核及用户再次验收后回 `review`。
- 未完成项: Opus/GLM review 签字及用户最终验收仍待完成。

## Review: 审查与返工

- Reviewer: Opus + GLM
- 审查结论: Codex 自审 accept；**Opus accept（2026-07-17,七项重点代码核对 + 6010 实机复验全过,零阻塞返工项）**；**GLM accept（2026-07-17，九项验收点全过，211 tests 绿）**。第二轮返工（诊断口径/资产深链/按钮布局/checkbox 对齐）已由 Opus/GLM 独立复核通过。
- 必须返工项: 无（三方一致）。Opus 附两条非阻塞观察 N1（900px 身份列偏窄、AssetId 未按交接日志所述在 900 隐藏）/N2（概览页问题列表两处同源可择一），均可 build 期顺手或后续微调，不阻塞 done。
- Accept / rework: **三方 accept（Codex + Opus + GLM，2026-07-17）**；无阻塞返工项，审查门已通过。

## 用户验收

- 用户结论: **accepted（2026-07-17）**。用户明确这些工程回归项无需重复手工验证，接受 Codex/Opus/GLM 已完成的代码、测试与浏览器证据作为验收依据。
- 后续任务: 按 capability-map 选择下一能力，不在 X7-1 继续堆补丁。

## 交接日志

- 2026-07-16 User + Codex: 用户指出“入口点”和“默认开局”拆成两个模块不符合作者心智；裁决合并为同页入口工作台。默认直达作为首项编辑 `entryScene + manifest.startWorld`，菜单入口各自就地编辑 scene/intro/startWorld 继承或完整覆盖；删除独立 startworld 导航，不改 schema。Next: Codex 按裁决返工 UI、深链接、诊断目标和测试，Opus/GLM 在 review 阶段复核。
- 2026-07-16 User + Codex: 用户继续指出“默认直达/继承/独立开局”术语难懂且跟随状态仍显示可编辑控件。UI 统一改称“默认入口（不经过标题菜单）”“跟随默认入口”“本入口独立设置”；跟随状态下整套有效开局只读，点击“复制默认为本入口设置”后才解锁编辑；工程页队伍 checkbox 改为蓝色主题自绘样式并保留键盘焦点/强制色回退。
- 2026-07-16 User + Codex: 用户指出 manifest 中八项 `assets.roles` 找不到对应 UI。实证控件虽存在，但被放在“启动流程”长页底部，且把战斗、SoundFont、标准色表混在启动概念内，发现性失败。任务退回 rework：保持 `startup` URL 与 schema 不变，将页面改为“全局资源与启动”，八项按启动/战斗/音频基础/视觉基础分组置顶，并从概览提供直达入口。
- 2026-07-16 Codex: 全局资源发现性返工完成并回到 review。八项 role 在页面首部按四组恰好覆盖一次，概览新增“编辑 8 项设置”；有效音乐/视频提供定向预览，坏绑定行内报错并安全回到资源库，SoundFont/色表明确暂无专用资产页。Evidence: editor check 27 files/208 tests；独立定向复核 2 files/9 tests；1440×920、900×720 均为 4 groups/8 selects/无横向溢出，console error 为空。Next: Opus/GLM 正式 review 签 `accept` 或列返工项；签字未齐不得标记 done。
- 2026-07-16 User + Codex: 用户指出问题页同时存在“15 项需要处理”和左下“已检查的引用无问题”，并指出未引用资源的跳转没有定位到具体对象；随后补充“预览 ↗”等文字按钮溢出及队伍 checkbox/文本不居中。任务再次退回 rework：状态条必须合并内容引用与工程/资产诊断，未引用 music/video/frame-animation 必须带对象深链，文字操作按钮不能继续使用固定 24px 图标契约，checkbox 行需 flex 居中。Next: Codex 已完成实现和自测；Opus/GLM 只读复核，用户视觉复验。
- 2026-07-16 Codex: 第二轮返工完成。`collectEditorStatusIssues` 合并非 startWorld 内容引用与 `collectProjectIssues` 并去重；`unused-asset` 资源页 target 不再排除未引用项；两处文字“预览”按钮改为自适应 `.btn`；队伍 checkbox label 改为 inline-flex center。Evidence: editor check 27 files/210 tests；Biome + diff check 通过；问题页 15 条警告、music.pal.005 深链 URL/object/selected row、1280×720 按钮/checkbox DOM 几何检查通过。Next: Opus/GLM formal review；签字未齐不得标记 done。
- 2026-07-16 User + Codex: 用户继续发现队伍行“↑/↓/移出”仍有同类窄按钮问题。根因是 `.mini` 的 22px 固定宽度与姓名/AssetId 固定列最小宽度叠加；已移除 `.mini` 复用，箭头使用 28px 专用契约，“移出”按内容宽度，身份列改为可收缩省略，900px 断点继续隐藏 AssetId。Evidence: 相关 CSS/TS Biome 通过，editor check 27 files/210 tests 通过；静态布局审计确认固定动作列不会被内容列推出。Next: Opus/GLM formal review；签字未齐不得标记 done。
- 2026-07-16 Codex: 根据当前 V3 manifest schema、工程模块设计、编辑器闭环审计和现有入口点实现，起草 X7-1 任务卡；明确工程页字段唯一归属、稳定 id、默认开局继承、ED-3 引用图依赖和保存/重开验收矩阵。Evidence: `packages/content/src/character.ts`、`packages/content/src/asset.ts`、`packages/editor/src/ui/EntryPointTab.tsx`、`docs/phase2/editor/editor-authoring-closure-audit-2026-07-13.md`。Next: Opus 设计/UX 审查。
- 2026-07-16 User + Codex: 用户指出 `audio.bossVictoryMusic` 对应的 PAL 002 MIDI 听感像升级提示。初版曾写成“修行提升（首领战结算）”，但用户要求重新核对 SDL；该初版曲名判断证据不足，现改为“特殊战胜利结算音乐（PAL 002）”。精确复核：`battle.c:1025-1032` 在升级判断前按 `fIsBoss ? 2 : 3` 播放，`1088-1113` 才计算升级，`1122-1148` 只绘制升级屏且无第二次播放；因此升级屏沿用 002/003，不能新增独立 `audio.levelUpMusic`。兼容 role、运行时和第一阶段均不改。Evidence: `reference/sdlpal/battle.c`、`battle.h`、`script.c`、`fight.c`；编辑器文案与说明同步修正。若产品仍要把 role 语义改成升级触发，需另开 schema/三方设计任务。
- 2026-07-17 User + Codex: 用户指出编辑器不能把迁移默认编号写进可编辑 role 名称。已将 `ProjectWorkbenchTab` 与 `MusicTab` 的可见文案改为“特殊战胜利结算音乐”，并在说明中明确可自由绑定任意 music AssetId；002 只保留在 PAL 迁移/默认 fixture 映射中，不作为编辑器限制或显示名称。运行语义、schema、第一阶段代码不变。
- 2026-07-17 User + Codex: 用户发现资源页切到“过场素材”后出现“目标不存在”，但目标仍是 `music.pal.003`。根因是资源三个子页都声明接受 objectId，子页切换时错误携带了上一页的音乐 AssetId；已改为只有留在同一子页才保留 objectId，跨到音乐/过场/精灵页时由目标页重新选择自己的首项。未改变深链接跳转和资源数据。
- 2026-07-17 Codex: 资源子页串 ID 修复完成后重新做浏览器实测：直接打开 `?module=asset&page=music&object=music.pal.003` 正确选中音乐行；点击“过场素材”后 URL 变为 `?module=asset&page=cutscene`，不再显示“目标不存在”，并显示 6 个视频 / 12 个帧动画；浏览器 error 日志为空。编辑器 check 为 27 个测试文件 / 211 个测试通过。请 Opus/GLM 在正式 review 中重点复核跨子页 objectId 生命周期、问题面板对象深链，以及胜利结算音乐 role 文案不写死 PAL 编号且仍保持单一字段作者边界。
- 2026-07-16 Opus: 设计/UX 主审签 **agree + R1-R3 必改 + S1-S2 建议**。核心架构成立并锚点实证:project 模块
  现仅 entrypoint 单页(editor-navigation:146-154)、editor-design line92/§11 定位一致;selIdx 数组身份缺口
  (EntryPointTab:41)、toggleCustom 继承雏形(:58-60)、三类视频源(startupTrademark/Splash 角色 + introVideo +
  quitToTitle.videos)互斥、manifest 命令 apply/invert(commands:2178-2244)——七问全立,启动链只读解释层
  无重复播放。**R1(关键)**:ED-3 无卡无码,"既有 ProjectReferenceIndex"失实;X7-1 引用需求已被
  `collectAssetReferences`(asset.ts:351-436,跨 manifest 角色/introVideo/场景/脚本/敌人)+ 既有 validator 覆盖,
  须解耦、删 ED-3 硬门,仅真跨域反查延后,否则死锁或诱造违铁律的第二扫描器。R2=缺省 round-trip 升为
  序列化契约(不物化合成 new-game);R3=locale 归属显式表态(§11 列在工程模块下但五页未含)。S1 五页摘要
  重叠论证/S2 启动页 onEnter 脚本源只读标注。Evidence: 主审立场 + 代码锚点核对。Next: GLM manifest 字段
  覆盖/保存矩阵/引用测试复核;R1 排期方向请用户拍板;三签齐 + R1-R3 纳入后方可 build。未改实现文件。
- 2026-07-16 GLM: 设计复核签 **agree**。六项独立实测：(1)**R1 完全坐实解耦**——ED-3 零卡零码(ls 无 ED-3*；grep ProjectReferenceIndex 唯一命中 commands.ts:484 注释)；collectAssetReferences(asset.ts:266-436)覆盖 X7-1 全部引用面(8 角色:353-364/introVideo:365-373/场景 music:374-388/脚本命令:298-348 递归/敌人编舞:421-434)；剩余(scene 存在/id 唯一/≥1入口)全本地不变式；"哪些场景引用某资产"反向查询 manifest 编辑不需要。**X7-1 不等 ED-3**（用户拍板正确）。(2)五字段覆盖矩阵(name RenameProject/entryScene loader 检查/entryPoints SetEntryPoints/startWorld UpdateStartSkills/assets.roles validator)全可落。(3)R2 缺省 round-trip——project-io:185 整 manifest 回写,entryPoints 未编辑保持 undefined 不物化,合成 new-game 只在 UI+runtime。(4)继承语义 toggleCustom 雏形→formalize 复制/清除两动作。(5)保存矩阵 FSA+HTTP+round-trip PAL/空白/损坏。(6)R3 locale 延后/S1 概览摘要只读/S2 onEnter 只读标注。G1(serialize passthrough)+G2(保存前 entrypoint 校验封 c/d/e)非阻塞。Evidence: 设计签字 GLM 行。Next: Codex 签后 build allowed（不等 ED-3）。未改实现文件。
- 2026-07-17 GLM: done 前 review 签 **accept**（rework 复核）。九项验收点逐条独立核对+editor 27 files/211 tests 全绿：(1)五字段唯一作者——name/entryScene/entryPoints/startWorld/assets.roles 各一命令 apply/invert structuredClone 首次捕获，EntryPointTab 文档化 shim 非第二编辑器；round-trip 整 manifest 回写不物化 entryPoints。(2)稳定 id——entrypoint acceptsObject+selection by entry.id 非数组下标，旧 page=startworld 归一化 entrypoint(test:84-94)，损坏 id 降级修复模式不伪造深链。(3)跟随/独立——跟随 readOnly 显示活值，复制 structuredClone 全拷贝，清除 delete startWorld key，全走 SetEntryPointsCommand apply/invert。(4)保存重开——assertProjectSaveValid 门禁(scene/id唯一/≥1/seedStats/角色/资产闭包)+project-io.test 4 路覆盖。(5)诊断——collectAssetReferences 唯一 scanner 喂底栏+保存门+问题面板，15 码覆盖。(6)unused 跳转 objectId=assetId 按 kind 映射 page+目标页选中(test:155-198)。(7)跨子页 objectIdForSubpageNavigation 仅同页保留。(8)胜利 role 标签'特殊战胜利结算音乐' select 列全 music-kind 任意绑定，002 仅迁移升级路径非 schema 限制。(9)未知字段 serialize passthrough+test 断言+高级页只读计数+零第一阶段改动。Evidence: done 准入 GLM 行。Next: 待 Opus 签后交用户验收。未改实现文件。
- 2026-07-17 Opus: done 前 review 签 **accept,零阻塞返工项**。七项重点代码核对 + 6010 PAL 实机复验全过:(1)四页 IA
  (editor-navigation project 四子页)+单一作者(全局资源页明文绑定归工程/二进制归资源;ActorMode startSkills 改只读摘要+
  跳转,diff 实证)。(2)跟随默认只读(readOnly 贯穿,value=selected.startWorld??manifest.startWorld)/复制独立(live 18→4
  disabled + 本入口独立设置)/改回跟随可回退。(3)八项 role 四组穷尽(project-role-groups.test sort()===ASSET_ROLES)、
  特殊战胜利结算音乐"可自由绑定音乐资源"不写死 002。(4)问题跳转按 kind 映射目标页+objectId,live music.pal.005→
  asset/music/object 且行 selected,底栏改 ⚠15 项待处理。(5)跨子页 objectIdForSubpageNavigation 仅同页保留(wired
  ModuleNav:75),live music→cutscene objectId 丢弃无"目标不存在"。(6)900px 文档零横向溢出/文字按钮零溢出,
  .project-party-name 为设计内 ellipsis 截断非破裂。(7)稳定 id 深链(live object=new-game)/R1 坐实(project-diagnostics 与
  ProjectWorkbenchTab 对 ProjectReferenceIndex 零命中,collectAssetReferences×4 唯一源+本地 validator,无 ED-3)/
  S1 概览只读摘要+S2 启动链只读。另核:editor 27 files/211 tests 独立重跑绿;G2 assertProjectSaveValid 保存前 fail-loud;
  R2 缺省 entryPoints 不物化。非阻塞观察 N1(900px 身份列偏窄+AssetId 未如交接日志所述在 900 隐藏,纯观感无破裂)/
  N2(概览问题列表两处同源可择一)。Evidence: done 准入 Opus 行 + Review 区。Next: 三方 accept 齐,交用户验收(改
  默认入口/入口视频/角色绑定/开局数据后重开+启动运行时消费);不得由 Agent 标 done。未改实现文件。

2026-07-17 User + Codex: 用户确认 Opus/GLM 审查签字已齐，并明确不需要重复手工跑工程回归项，接受三方代码、测试与浏览器证据作为最终验收依据。三方均为 `accept` 且无 counter，任务由 `rework` 收口为 `done`。

## 下一位 Agent 提示词（已完成，无需继续交接）

无下一位 Agent 提示词：X7-1 已完成三方 review 与用户验收并收口为 `done`。下方保留本轮已执行的历史 review 提示词，供追溯。

当前阶段由 Codex 作为唯一 Coding Owner 负责 build；本轮返工实现与自测已完成，现交 Opus/GLM review。两位审查 Agent 只读，不得修改实现文件；三方 review 签字未齐不得标记 done。可分别复制下面对应提示词：

```text
【Opus review】
接手任务：X7-1 manifest 工程设置与启动流程工作台
任务卡：docs/ops/tasks/X7-1-manifest-project-workbench.md
当前状态：rework 已完成本轮返工，待正式 review（请先核对 Build/验证记录、最新交接日志和改动文件）
你的角色：Opus，审查架构、信息架构、交互和视觉；只做 review，不改实现文件、不替换 Coding Owner。
先读：AGENTS.md、docs/phase2/READ-FIRST.md、本卡全部，以及 packages/content/src/character.ts、packages/content/src/asset.ts、packages/editor/src/core/project-io.ts、packages/editor/src/ui/editor-navigation.ts。
重点验收：四页工程信息架构和入口/开局单一作者边界；跟随默认只读、复制后独立编辑；八项全局 role 的发现性与“特殊战胜利结算音乐”可自由绑定任意 music AssetId；问题面板跳转到具体资源；资源 music→cutscene/sprite 切换不得携带旧 objectId；文字按钮、checkbox、队伍动作列无溢出且 1280/900/720 视口可用；稳定 id 深链接、R1 不依赖 ED-3、S1/S2 只读边界。
输出：在本卡 Review 区写 `accept` 或 `counter`（含证据与明确返工项）；若无阻塞请签 `accept`，不得在三方 review 完成前标记 done。
```

```text
【GLM review】
接手任务：X7-1 manifest 工程设置与启动流程工作台
任务卡：docs/ops/tasks/X7-1-manifest-project-workbench.md
当前状态：rework 已完成本轮返工，待正式 review（请先核对 Build/验证记录、最新交接日志和改动文件）
你的角色：GLM，审查 manifest 字段覆盖、数据/schema 边界、保存矩阵、引用/诊断和测试覆盖；只做 review，不改实现文件、不替换 Coding Owner。
先读：AGENTS.md、docs/phase2/READ-FIRST.md、本卡全部，以及 packages/content/src/character.ts、packages/content/src/asset.ts、packages/editor/src/core/project-io.ts、packages/editor/src/ui/editor-navigation.ts。
重点验收：`name/entryScene/entryPoints/startWorld/assets.roles` 的唯一作者和 round-trip；入口稳定 id 与旧 startworld 深链归一化；跟随/独立开局完整快照与命令 apply/invert；FSA/HTTP 保存重开；现有 `collectAssetReferences`/validator 的诊断口径；未引用资源跳转保留具体 AssetId；跨资源子页清除不属于目标资源族的 objectId；胜利结算 role 不把迁移默认 002 误当 schema 限制；未知字段保留和不改第一阶段/运行时。
输出：在本卡 Review 区写 `accept` 或 `counter`（含证据与明确返工项）；若无阻塞请签 `accept`，不得在三方 review 完成前标记 done。
```
