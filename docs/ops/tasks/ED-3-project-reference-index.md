# ED-3 - 统一工程引用边与安全删除地基

Status: review
Phase: phase2
Capability: Editor cross-cutting / E1 / E9 / W7 / A7 / N5
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: main

## 目标

在不改内容格式的前提下，把编辑器现有的领域引用收集器收敛为同一种“目标、来源、关系、定位、删除策略”
边，并由一个按 revision 发布的 `ProjectReferenceIndex` 提供查询。引用面板、问题诊断、保存校验和删除预检
消费同一语义；所有当前可编辑的作者来源都能跳回稳定位置，真正只读的来源明确说明不可定位。该地基先补齐
scene / map / shop 三个生命周期必需的入边，再由后续场景、商店卡实现复制、命名、安全删除和试运行。

## 范围

- 范围内：
  - 在 editor core 建立非持久化的 `ProjectReferenceTarget / Source / Edge / Locator /
    DeletePolicy / Index` 合同；稳定 key 不使用数组下标或显示名。
  - 复用现有 content typed leaf walkers、current-author 投影和一次 canonical command visits；领域
    collector 继续负责领域语义，统一层只做 adapter/index，不写第二套巨型递归扫描器。
  - 统一纳入现有 asset、actor、item、skill、enemy、poison、battle-field、enemy-team、ambience、
    entity address、world-variable、script/scene-entry/hook、world/battle sprite 引用。
  - 补齐场景目标入边：manifest entry point、`loadScene`、`currentScene`、`selectSceneHooks`、
    `setSceneMapOverride`、全部 `EntityAddress.scene`；同场景随删来源通过 deletion scope 排除。
  - 补齐地图目标入边：`scene.mapId` 与 canonical `setSceneMapOverride.mapId`；退役
    `mapAssetSceneReferences`，地图列表、引用面板和删除守卫改用统一索引。
  - 补齐商店目标入边：只把 `openShop(mode='buy')` 视为 `ShopDef` 引用；
    `openShop(mode='sell', shop=0)` 不读商店表，不能成为 dangling 或删除 blocker。
  - 把统一索引纳入现有 `EditorDerivedStore` Worker；展示消费异步 revision 快照，保存和破坏性动作在
    点击/保存瞬间用同一 cold builder 对 current main + script author state 同步复核，stale/failed 一律
    fail-closed。
  - 异步地图正文域不塞回 Worker：现有 tileset scan、stamp usage/proof 输出统一 edge batch，携带
    coverage/revision；扫描失败或不完整不得生成删除许可。
  - 建单一 locator resolver。结构化字段至少跳到稳定对象/子页；canonical command 跳到精确 owner、
    channel 与 command path；只读 script chunk / runtime world 保留明确 unavailable reason。
  - 音乐、音效、图像、过场引用页改为消费结构化 source/locator，不再从 `where/site` 正则或
    `split(':')` 反推 owner；当前可编辑来源出现“打开”入口。
  - `validateReferences` / 保存门补齐 scene/map/shop/enemy-team/ambience 等本卡确认的缺边；
    PAL current publication 复用同一 typed 规则并证明重迁零内容 diff。
- 范围外：
  - 不在本卡实现场景或商店的复制、显示名、删除按钮、文件清理或独立试玩；分别由后续
    scene lifecycle 与 shop lifecycle 卡消费 ED-3。
  - 不改 `SceneDef`、`ShopDef`、manifest、SAVE8、content19 或任何磁盘格式；不增持久 graph 文件。
  - 不处理 PAL 作者商店在重迁时的 ownership/merge；该问题在商店生命周期卡单独核前提。
  - 不把 runtime save/world 瞬态数据改成作者态，也不为只读来源伪造可编辑 locator。
- 明确不做：
  - 不自动级联删除或批量改写引用；`replace-suggest` 仍先阻断删除，只提供去处理引用的入口。
  - 不把 223 张地图正文、asset bytes 或 tileset bytes 重新放入 derived Worker。
  - 不在输入热路径同步重建全图，不让异步 last-known snapshot 授权保存或删除。
  - 不保留页面私有 `where/site` 解析作为 fallback；迁移完成后删除旧解析分支和临时 map helper。
  - 不改变商店货单顺序/重复项，不把 sell 的历史 `shop` 字段解释成有效商店引用。

## 前提真值门

### 一句话行为 / 工程前提

当前已经有可复用的 current-author 投影、canonical command visitor 和 revision Worker，但它发布的是多种
互不相容的领域 DTO；部分页面/命令仍现场重扫或解析字符串，scene/map/shop 又缺完整入边，因此问题是
“统一边合同与消费收口”而不是“从零再造一张全仓扫描图”。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | N/A：原版没有二阶段作者编辑器、项目引用图或删除工作流；商店运行语义只用于核实 buy/sell 引用真值。 | `packages/reforge/src/main.ts:3442-3452`（buy 查 shop，sell 只查背包） |
| 第一阶段 | N/A：第一阶段提供忠实游戏运行与提取，不包含 Reforge 项目编辑、深链定位或跨对象删除守卫。 | `docs/phase2/READ-FIRST.md:32-37`；`CLAUDE.md` 阶段边界 |
| 当前二阶段 | `collectEditorDiagnosticsSnapshot` 已对同一 revision 做一次 current-author 投影和 canonical visits，Worker 有 current/stale/failed；但 `EditorDerivedData` 仍公开多种引用 DTO。map 只靠临时 scene 扫描，shop 无入边，scene 入边分散；媒体页仍解析 `where/site` 且没有统一打开动作。 | `packages/editor/src/core/project-diagnostics.ts:650-759`；`packages/editor/src/core/editor-derived-contract.ts:56-68`；`packages/editor/src/core/editor-derived-store.ts:114-121,311-349`；`packages/editor/src/core/commands.ts:797-800,922-932`；`packages/content/src/validate-refs.ts:1498-1508`；`packages/editor/src/ui/App.tsx:682-731`；`packages/editor/src/ui/MusicTab.tsx:69-100`；`packages/editor/src/ui/CutsceneTab.tsx:300-335` |
| 本任务目标 | 沿既有 Worker/typed walkers 建一个薄的统一 edge/index 层；补 scene/map/shop 缺边、统一 locator/delete policy，并让展示、保存与删除在同一语义上闭合。 | 用户 2026-09-04 批准第二阶段队列并要求继续；本卡范围与验收矩阵 |

### 当前缺口 census（2026-09-04 只读核验）

- PAL：294 scenes；全作者根 987 个 `loadScene`（930 跨来源所属场景），其中 scene 文件内
  981/924、items 额外 6/6；67 个 `selectSceneHooks`（65 跨场景）、
  1 个 `currentScene`、38,126 个 `EntityAddress`（972 跨场景）、1 个 manifest entry point。
- PAL：20 个 shop（id 1..20）；35 个 `openShop` = 29 buy（目标 id 1..20）+ 6 sell（均保留
  `shop=0`，运行时不读 shops）。
- `EditorDerivedData` 当前至少公开 scene-entry、entity-address、asset、actor、item、poison、world-variable、
  behavior、scene-hook 九种引用/索引形状；battle-field、enemy-team、ambience、skill/enemy、map、tileset、
  stamp 等仍有页面或命令现场 collector。
- 地图删除只看 `scene.mapId`，未纳入 `setSceneMapOverride.mapId`；shop 没有 target collector，
  `validateReferences` 只检查 `shop.items -> item`。
- PAL 已有可复现的真实删除漏洞：`s230` 仅由 `setSceneMapOverride` 引用 `map-164`，没有任何 scene 顶层
  `mapId=map-164`；当前 helper 返回 0，`DeleteMapAssetCommand` 会放行。PAL 另有 `s243 -> map-165`，
  共 2 条 map override。
- current-author 删除真值也不一致：BattleField/EnemyTeam UI 会使用 live `scriptState`，但其 Delete Command
  只扫主 `EditorState` shell；Poison UI 使用 merged-current Worker index，DeletePoisonCommand 仍只扫 shell。
  World/Battle Sprite 的引用页和动作/定义删除同样直接重扫 shell，可能漏掉尚未投影的 canonical
  `playEntityAction/setActorAppearance`；Actor/Item/Entity/WorldVariable/Ambience 则各自用 callback/merged
  state 局部补洞。
- 图片/音乐/音效/过场已能显示引用路径，但 `MusicTab`/`CutsceneTab` 仍按数组下标正则反查 owner；
  App 的 sprite/battle-sprite 跳转按 `site.split(':')` 分派，不能作为稳定 locator 合同。

### 反证与替代解释

- 最强替代解释 1：领域 collector 之所以不同，是因为语义不同；强行统一会丢 owner/self-delete、
  async coverage、expected kind 或精确脚本 locator，最终只是更抽象但更不安全。
- 反证处理：统一的是 edge/query/locator/policy 外壳，不是领域 leaf walker；adapter 必须做逐域 parity，
  领域专用 proof（例如 tileset replacement frame bound）继续保留。
- 最强替代解释 2：现有 derived Worker 已经足够，ED-3 只需给 scene/shop 各写一个 collector。
- 反证处理：地图临时 helper、九种 Worker DTO、多个 App open handler、媒体字符串反解和保存/删除
  规则分裂仍会继续增长；只有共同 edge/index 能让后续生命周期不再各造一套。
- 什么观察会推翻当前前提：
  - 若统一 edge 无法无损表达现有 collector 的 owner、expected kind、access、runtime-readonly、
    canonical locator 或 async proof，则停止迁移该域并重新设计合同，不能用字符串 extras 糊过去。
  - 若 PAL 基准显示统一 snapshot 明显扩大 Worker payload/耗时或输入 commit 回归，则改为按 target lazy
    adapter/batch，而不是把所有边重复物化。
  - 若 primary/runtime 证明 sell 实际依赖 shop 表，本卡 buy-only 规则失效并必须重审。
- audit 红项如适用，已排查的替代根因：
  - runtime 语义 / 命令分类：shop 已直接核实 buy/sell；其他边按 command tag 与 typed walker，不猜字段名。
  - 原版 / 第一阶段理解：不适用编辑器架构；不从原版 UI 推导本任务设计。
  - extractor / 地图 / 数据解码：PAL census 只作为规模/覆盖证据，不据此改 migration 数据。
  - audit / test model：旧 2026-07 审计关于“没有地基”已被 2026-08 derived Worker 部分推翻；本卡以当前码
    为准，只保留“未统一 edge/locator/policy”的仍真部分。

### 用户可见偏离

- 是否主动偏离已核真值：yes（改进二阶段编辑器用户可见行为，不涉及原版游戏行为）。
- `before -> after` 一句话：引用来源有的只能看字符串、有的跳到粗页面、有的删除时漏查 -> 所有当前可编辑
  来源使用同一结构化引用边，可打开稳定位置，删除/保存按同一策略 fail-closed。
- 代表场景：从音乐/音效/图像/过场的“引用”页打开真实来源；删除被脚本地图覆盖引用的地图；后续删除
  被 buy 指令使用的商店或被入口/跨场景命令使用的场景。
- 用户裁决：2026-09-04 用户批准按完整第二阶段队列顺序继续推进；详细合同仍须三方设计签字。

## 上下文锚点

- 已拍板决策 / 铁律：
  - `AGENTS.md`：跨包公共接口、保存/删除行为与 capability 变化必须前提真值门和三方签字。
  - `docs/phase2/READ-FIRST.md:28,50-52`：只保留 current canonical；不得借统一层引入旧版本 fallback。
  - `docs/ops/tasks/ED-1-editor-authoring-closure-audit.md:152,180,184,232`：统一引用图、收编 map helper、
    edge 携带 `block / warn / replace-suggest`。
  - `docs/ops/tasks/ED-REFERENCE-UI-1-inspector-reference-presentation.md:508-517,615`：复用已完成的
    Reference Panel/Group/List/Row 表现层，ED-3 只替换数据源，不重做 UI 组件。
  - `docs/ops/tasks/ED-INPUT-PERF-1-editor-input-and-derived-state-latency.md:1-35,349-390`：
    复用 revision Worker；显示可异步，保存与破坏性动作必须同步 current-state fail-closed。
- 代码锚点（`file:line`）：
  - `packages/editor/src/core/project-diagnostics.ts:650-759`
  - `packages/editor/src/core/editor-derived-{contract,core,store}.ts`
  - `packages/editor/src/core/script-editor.ts:69-128,287-372`
  - `packages/editor/src/core/script-editor-projection.ts:1-139`
  - `packages/editor/src/core/{actor,item,battle-data,battle-field,enemy-team,ambience,entity-address,script,
    world-variable}-references.ts`
  - `packages/content/src/{asset,actor-reference,battle-field-reference,enemy-team-reference,validate-refs}.ts`
  - `packages/editor/src/core/commands.ts:797-800,922-932`
  - `projects/pal/content/scenes/s230.json:2118-2119`（`map-164` 只有脚本地图覆盖引用）
  - `packages/editor/src/core/tileset-references.ts:18-199`
  - `packages/editor/src/ui/App.tsx:682-1120`
  - `packages/editor/src/ui/{MusicTab,CutsceneTab,AudioAssetWorkbench,ImageTab}.tsx`
- 已知坑 / 审计文档：
  - `docs/phase2/editor/editor-authoring-closure-audit-2026-07-13.md:102-133,221-240`
  - `docs/ops/tasks/W7E-map-library-scene-binding.md:217,263,339`
  - shop sell 的 `shop=0` 是未消费历史字段，不是 ShopDef 引用。
  - current author 真值分在 main `EditSession` 与 `ScriptEditSession`；只扫 main shell 会漏最新脚本。
  - PAL entity-address 边很多；不得在 React render 或每个 target 查询时重复全扫。
  - tileset/map 正文懒加载；unknown/partial 不能降级成零引用。
- 不得重新引入：
  - 页面私有 JSON 递归器、`where/site` 字符串协议、数组下标身份、自动 cascade、旧 schema fallback、
    Worker last-known 授权、保存前只信异步快照、地图全量 hydrate。
- 相关测试：
  - `project-diagnostics.test.ts`、`editor-derived-store.test.ts`、`App.reference-navigation.test.tsx`
  - `actor/item/battle-data/battle-field/enemy-team/ambience/entity-address/script/world-variable-references.test.ts`
  - `editor-asset-references.test.ts`、`tileset-references.test.ts`、`tileset-lifecycle.test.ts`
  - `MapMode.test.tsx`、`MusicTab.test.tsx`、`SoundTab.test.ts`、`ImageTab.test.tsx`、`CutsceneTab.test.tsx`

## 验收条件

- 功能：
  - 单一 edge 合同至少包含稳定 target、结构化 source owner、relation、where、locator/unavailable、
    delete policy；禁止数组位置充当 target/source 身份。
  - `ProjectReferenceIndex.referencesTo(target)` 与 `deletionImpact(target, scope)` 是所有 adopter 的共同查询；
    self/companion source 由 scope 排除，runtime-readonly 仍按真实完整性策略处理。
  - `block` = 引用存在即禁止删除；`replace-suggest` = 同样禁止删除并提供处理入口，不自动改写；
    `warn` 只能用于删除后不会制造持久悬空引用的非完整性关系。
  - 当前已覆盖领域对旧 collector 做集合 parity（target/relation/source/where），差异必须逐条解释；
    不能为“统一”丢掉 expected kind、access、owner 或 canonical locator。
  - scene/map/shop 缺边齐全；shop buy missing 是 error，sell `shop=0` 是正向负例；
    `setSceneMapOverride.mapId` 会阻止目标地图删除。
  - 媒体引用的当前作者来源都有结构化 locator 和“打开”；只读 chunk/world 有明确原因且不伪造按钮。
  - `mapAssetSceneReferences` 及其 UI/command callsite 删除；媒体 owner 不再正则解析 `where`，App 不再
    `split(':')` 解析 reference site。
  - derived Worker 同一 revision 只做一次 current-author projection/canonical visits；破坏性命令在 current
    state 同步复核。checking/stale/failed 均不可误报零引用或授权删除。
  - tileset/stamp 异步 edge batch 保持现有 proof 与完整覆盖约束；失败、旧 revision、漏地图均 fail-closed。
- 测试：
  - 合同/稳定 key/确定顺序、adapter parity、owner scope、三种 delete policy、locator/unavailable 负例。
  - canonical 深递归至少覆盖 scene hook、entity trigger/auto、hostile、item private、shared script；
    scene/map/shop 每种 command edge 均有 hit/miss。
  - 29 buy/6 sell 规则用最小 fixture 与 PAL census 双钉；不允许 `sell shop=0` 进入 index/diagnostic。
  - Worker cold/patch differential、旧 revision 丢弃、failed fail-closed、同 revision visitor 调用次数。
  - 地图删除被 scene 与 map override 分别阻断；无引用可删/undo；tileset partial scan 仍拒删。
  - media navigation 覆盖 manifest role、entry point、scene field、canonical command、actor/enemy/item/skill/
    battle-field/tileset/sprite/battle-sprite 与只读 chunk。
  - `validateReferences` 新负例与 PAL current publication 测试；迁移 dry-run 必须
    `writes=0 deletes=0 conflicts=0 asset-deletes=0`，current/baseline 内容零 diff。
  - editor/content typecheck、相关聚焦测试、editor 全量测试（最终一次）、production build、design-system gate。
- 文档：
  - 更新 editor design、2026-07 审计的 current-state 注记、roadmap/capability-map、ED-3 收编债；
    明确 leaf walker、统一 edge、async proof、UI presentation 四层边界。
  - 建后续 scene/shop lifecycle 卡，引用本卡合同，不再各自新增 collector/locator/policy。
- 视觉 / 手工验证：
  - 真实编辑器最小验证：音乐、音效、图像、过场各抽一条作者引用点击后抵达正确对象/脚本；
    map 引用列表与禁删原因使用既有统一 Reference UI，不改变整体样式。scene/shop 本卡只验统一 edge、
    validator、locator 与删除查询；它们尚无删除 UI，真实列表/禁删视觉由两张后续 lifecycle 卡验收。
  - 1280 与 720 宽度检查引用操作无溢出；失败/只读状态文案可见。仅保留完成判断所需截图。
- E2E 用例登记：N/A；本卡是功能性作者工具地基，不含剧情/演出观感。场景/商店真实工作流在后续卡登记。

## 推进签字

### 进入 build 前：设计签字

- Codex：
  - premise: **verified（2026-09-04）**。当前 derived Worker、九种 DTO、领域 collector、map helper、
    media 字符串解析、scene/shop 缺边与 buy/sell runtime 分支均已直接读码；证据见真值矩阵与 census。
  - design: **agree**。采用“现有 typed leaf walker → 统一 edge adapter → revision index → 既有 Reference UI”
    四层，按 A/B/C 三批实现，不改 content19/SAVE8，不造全仓新 walker。
- Kimi：
  - premise: **verified（2026-09-04，架构/合同/revision 视角一手直读 + 本人 census 复算，
    针对固定设计版本 `d8c5bf14`，非复述 Codex）**：
    1. **地基实在、缺统一边**：`collectEditorDiagnosticsSnapshot` 对同一 revision 只做一次
       current-author 投影 + 一次 canonical visits（`project-diagnostics.ts:689-760`）；
       `EditorDerivedData` 公开 10+ 引用 DTO 形状（`editor-derived-contract.ts:56-69`）；
       Worker revision=`{mainHistoryVersion, scriptHistoryVersion}` 且 maps/assetBlobs/
       tilesetBlobs 已剥离（`editor-derived-store.ts:114-129`）。统一的是 edge/index 外壳、
       不是再造 walker，前提成立。
    2. **缺边与真实漏洞（本人复算）**：`mapAssetSceneReferences` 只查 `scene.mapId`
       （`commands.ts:797-800`，注释自标“临时窄反查”），`DeleteMapAssetCommand.apply` 仅依此
       放行（`:929-931`）；s230 `setSceneMapOverride→map-164`（`s230.json:2118-2119`）而
       全 PAL **scene 顶层 `mapId=map-164` 为 0**（本人 python 复算）——删除漏洞为真。
       census 复算：openShop 恰 35=29 buy（目标 id 1..20）+ 6 sell（全 `shop=0`）；运行时
       buy 查 shops、sell 只查背包（`reforge/main.ts:3442-3452`），buy-only 规则成立。
    3. **字符串协议两处实锤**：App 跳转 `site.split(':')` 分派（`App.tsx:682-731`）；
       MusicTab 正则 `^scenes\[(\d+)]` + 数组下标反查 owner（`MusicTab.tsx:69-100`）；
       tileset 异步扫描带 done/failures/lazy loadMap（`tileset-references.ts:33-52`），正文
       不入 Worker 属实。
    4. **可复用合同已在**：`ScriptCommandLocator`（owner 五型 + container + commandPath，
       `script-editor.ts:69-128`）与 `SpriteActionReference.locator` 消费先例（`App.tsx:733`）；
       validate-refs 仅 `currentScene`（:1110）与 `shop.items→item`（:1498-1508），
       loadScene/openShop/selectSceneHooks/setSceneMapOverride 命令边全缺，而 schema 类型
       （`script.ts:70,129,214`）已存在——**补 typed leaf 是纯代码增量，content19/SAVE8/迁移
       数据零变化成立**，PAL publication 复用同一 validator，zero-plan 即可证。
    5. **保存/删除 fail-closed 先例**：ED-INPUT-PERF-1 已定“异步快照只服务展示，保存与破坏性
       动作在 current revision 同步重验”（`ED-INPUT-PERF-1:362-363,373`），ED-3 设计结论 4
       与其一致；五组 shell-scan 反例（BattleField/EnemyTeam/Poison/World/Battle Sprite）
       census 与代码路径吻合。
  - design: **agree（2026-09-04；三签齐后允许 build）**。四层边界（content typed leaf
    walker → editor edge adapter → revision index → 既有 Reference UI）是不造第二套巨型
    递归的最小合法形态；edge/target/source/locator/deletePolicy/deletionScope 合同
    （稳定 key、`where` 仅显示、scope 显式排除随删来源、block/replace-suggest/warn 语义、
    runtime-readonly 明示 unavailable）完整覆盖现有 collector 语义且无可预见的无损性缺口；
    cold builder oracle + Worker 同 builder、async batch 带 coverage/revision proof、
    A/B/C 同 Owner 串行均成立。必改钉（build 落实条件，非阻塞）：
    ① **PAL 零新增 error 硬门**：B 批 validator 补强合入前，`pal-current-publication.pal.test`
      必须通过且 PAL 全量新规则 census 零新增 error；每条新边 severity（error/warn）逐条登记
      理由；任一真实悬空暴露即停线另开 migration 上游卡，不在 ED-3 手改 PAL 或放宽规则。
    ② **A 批性能基线**：PAL（38k+ entity-address 边）Worker payload 尺寸/构建耗时与 A 批前
      基线对比必须写入 Build 记录；超阈值按-target lazy adapter 降级，不物化全图。
    ③ **单一 builder 钉**：sync oracle 与 Worker 必须 import 同一 builder/adapter 函数，测试
      断言同 revision 两次调用结果深等；禁止保存/删除路径与 Worker 各自实例化近似逻辑。
    ④ **五组 shell-scan 反例专测**：BattleField/EnemyTeam/Poison/World Sprite/Battle Sprite
      各钉一条“script session 已改、Worker 未投影时删除仍按 current-author fail-closed”负例。
  - 可证伪观察：
    ① 任一域 adapter parity 无法无损（丢 expected kind/access/owner/canonical locator）→
      该域停止迁移、合同重议，不得用字符串 extras 糊；
    ② PAL publication 因新规则报出真实悬空 → zero-plan 被打破，停线开 migration 卡而非降级
      severity；
    ③ 运行时 sell 开始消费 shop 表 → buy-only 规则失效，回用户裁决；
    ④ A 批基线显著放大且 lazy adapter 仍超 → 统一 index 物化范围收缩重审；
    ⑤ `mapAssetSceneReferences`/媒体 `where` 正则/App `split(':')` 任一在 done 时仍存活 →
      退役承诺失效，不得 done。
- GLM：
  - premise: **verified（2026-09-04，固定设计版本 `d8c5bf14`；PAL 关键 census、DTO/删除命令/
    validator/媒体解析现状全部本人独立复算直读，非复述 Codex）**：
    1. **PAL 关键 census 逐项复核**：shops 恰 **20、id 恰 1..20**；openShop 全场景递归恰
       **29 buy + 6 sell、sell 全部 shop=0**（sell shop≠0 命中 0）——buy-only 规则数据基础
       成立（runtime buy/sell 分支本人在 STORE0 卡终审已直读 main.ts:3442-3452）；**map
       override 恰 2 条：s230→map-164、s243→map-165**；selectSceneHooks 恰 **67（65 跨场景）**
       逐字一致；scenes 295 文件 = 294 scene + index.json ✓。loadScene 本人快捷口径 981/924
       （与卡面 987/930 同量级、差值为本人 scene 键归一化方法差异）；currentScene/38,126
       EntityAddress 为 Codex census、本人未同口径复算，但上述多项精确吻合佐证其方法可靠。
    2. **s230 删除漏洞实锤**：s230 顶层 `mapId=map-162`，**全 PAL 无任何场景顶层
       `mapId=map-164`**（逐一解析命中 0）；而 `mapAssetSceneReferences`
       （commands.ts:797-800，注释自认「临时窄反查；ED-3 落地后删除」）只过滤
       `scene.mapId`、`DeleteMapAssetCommand`（:930）据此放行——**map-164 仅被脚本
       override 引用却可被删除**，真实漏洞成立。
    3. **架构现状实锤**：`EditorDerivedData`（editor-derived-contract.ts:56-68+）公开
       **9+ 种互不相容引用 DTO**；`validate-refs.ts:1498-1508` shops 段只查
       `shop.items → item`，全文件 grep `setSceneMapOverride|loadScene` **零命中**——
       scene target 边与 map override 边在保存校验缺失；删除命令 shell 分裂有结构基础
       （DeleteBattleField/EnemyTeam/Poison :2646/:2912/:4570 作用于主 shell，UI 侧
       battle-field/enemy-team-references 收集器独立消费 merged/scriptState）；媒体字符串
       解析实锤——MusicTab.tsx:73-91 以 `where` 正则反查 owner、App.tsx:668/683/704 三处
       `reference.site.split(':')` 分派。
    4. **adapter parity 可行性**：content typed leaf walker 路线已被本项目验证
       （`collectActorTaggedReferences` 为 kind-tagged + 递归 where 的全结构访问器，
       validate-refs 与 migrate invariant 已双消费同一 walker——本人 INPARTY 卡终审直读），
       「content 持 typed 规则、editor adapter 只补 owner/locator/policy」有直接先例支撑。
    5. **可证伪观察**：任一领域字段（expected kind/access/owner/async proof/canonical
       locator）无法无损映射进统一 edge 需字符串 extras 糊合；PAL 真树 Worker payload/
       耗时超预算且 lazy/tuple 化不能闭合；runtime/primary 证明 sell 实际读 shop 表；新
       validator 规则在 PAL publication 暴露真实悬空致 zero-plan 失败；真树 parity 出现
       不可解释差异——任一成立本签字失效（后者按卡面停线另开上游卡，不在 ED-3 手改 PAL）。
  - design: **agree（2026-09-04，附 GM-E3-1~6 必改测试钉；三签齐后允许 build）**：
    - **GM-E3-1（s230 具名回归钉）**：「地图删除被 scene 与 map override 分别阻断」必须
      显式钉真实 s230→map-164 漏洞（或最小复刻 fixture）为具名回归，防 override 边再漏。
    - **GM-E3-2（sell 历史字段双负例）**：不仅 `sell shop=0`；须有 `sell shop=<非零/指向
      已删商店>` legacy fixture 断言其**既不入 index 也不报 error**（范围外条款需正反两钉）。
    - **GM-E3-3（deletion scope 双向 fixture）**：互引场景对 A↔B——删 A 时 A 自身发出的
      loadScene/entity-address 边被 scope 排除、B 指向 A 的边仍 block；防 scope 过宽
      （漏保护）与过窄（自锁）。
    - **GM-E3-4（Worker payload 数值预算钉）**：A 批把 38k entity-address 放大风险落成
      **数值断言**（PAL 真树 payload/耗时基线 + 预算上限），超限即触发 lazy/tuple 改道，
      不允许只作文字记录。
    - **GM-E3-5（parity oracle 用真树）**：每域 adapter parity 除最小 fixture 外，至少
      asset/actor/item/entity-address 四大域在**真实 PAL current**上做旧 collector vs 新
      index 集合比对（差异逐条解释），防 fixture 绿而真树漂移。
    - **GM-E3-6（stale/failed 删除守卫行为钉）**：index 处于 checking/stale/failed 时
      删除禁用 + 命令层独立同步复核双层，任一层单独放行即红——「不得误报零引用」需行为
      断言而非类型断言。
- 独立反证审查（至少一位非 Coding Owner 必填）：
  - 审查者: GLM（2026-09-04，完成——PAL 关键 census（shops/openShop/override/s230 漏洞/
    hooks/scenes）、九 DTO、map helper 与 DeleteMapAssetCommand、validate-refs 缺边、删除
    命令 shell 分裂、媒体 where/site 字符串解析全部本人独立直读；Kimi 席位保留）。
  - 独立证据锚点: `commands.ts:797-800,930`（map helper 只过滤 scene.mapId + 删除放行）；
    `validate-refs.ts:1498-1508`（shops 只查 items→item，override/loadScene 零命中）；
    `editor-derived-contract.ts:56-68+`（9+ DTO）；`commands.ts:2646,2912,4570`（shell 删除
    命令）与 `battle-field/enemy-team-references.ts`（UI 独立收集器）；`MusicTab.tsx:73-91`
    （where 正则）；`App.tsx:668,683,704`（site.split(':')）；PAL census：20 shops id1..20、
    openShop 29 buy + 6 sell 全 shop=0、override 恰 2（s230→map-164、s243→map-165）、
    hooks 67/65、s230 顶层 mapId=map-162 且全树无 mapId=map-164。
  - 可证伪观察: 见 GLM 签节第 5 条（领域字段无法无损映射 / payload 超预算 / sell 实读
    shop 表 / PAL 暴露真实悬空 / 真树 parity 不可解释差异）。
- counter / 分歧处理：无 counter。GLM 的 `loadScene=981/924` 是 scene 文件口径，Codex 复算确认
  items 另有 6/6，故全作者根为卡面的 987/930；不是事实冲突。若 build 中证明统一 edge 丢失领域语义、
  重复扫描不可接受、buy-only 不成立或保存/删除不能共用同一规则，则立即转 blocked 重审。
- 缺签豁免: N/A
- build 准入结论: **allowed（2026-09-04）**。Codex/Kimi/GLM 三方 premise verified + design agree
  齐、独立反证审查完成、无 counter；Kimi K1-K4 与 GLM GM-E3-1~6 全部纳入 build 硬门。

### 进入 done 前：审查签字

- Codex: **accept（2026-09-05）**。完整检查 `d8c5bf14..01512c84` 与最终 PAL/浏览器证据；A/B/C
  均保持单一 typed edge/index、current-author cold oracle、revision Worker 与 async coverage proof，旧
  collector/DTO/字符串 locator 无 fallback。最终 clean n=20、全量/聚焦测试、三包 typecheck、build、
  DS gate、publication、dry-run 四零与 1280/720 抽验通过；无已知实现返工项。
- Kimi: pending
- GLM: **accept（2026-09-05，只读终审候选 `01512c84` 相对设计基线 `d8c5bf14` + 证据文件
  ED-3A + 确定性 PAL 门与负例矩阵本人复跑，非复述 Codex/Kimi；本人设计期 GM-E3-1~6 六钉
  逐条验证落实）**：
  - **PAL 数据不变与 census 复算 ✓**：本人重算——shops 恰 20、openShop **29 buy + 6 sell**、
    map override 恰 **2**（s230→map-164、s243→map-165）与设计期逐字一致（统一层零内容漂移）；
    本人独立 dry-run `managed=537 writes=0 deletes=0 conflicts=0 asset-deletes=0`、
    reference-warnings=0、运行后工作树干净——validator/typed 新规则未偷改 PAL 内容。
  - **确定性规模门 ✓**：`project-reference.pal.test.ts` 以真实 PAL 钉 **25,188 rows**
    （:539）与统一索引 JSON **≤2,500,000B** 硬门（:544-545）；各域真树 parity 逐域断言——
    entity blocker 相等（:118）、battle-data/actor keys 与旧 collector 相等（:179/:193）、
    actor blocker **804**、item blocker **1,169** + relation 计数 46/39/9/899/34/155、
    world sprite **573/4,209** 聚合、**asset 多重集 parity 恰 6,002**
    （`[asset, expectedKind, origin, site]` 身份与旧 collector 排序相等 :336-344）——
    GM-E3-5 真树 oracle 落实。
  - **6,002 split ✓**：证据 2,121 structural + 3,881 canonical = 6,002，结构 walker 不再对
    60,295 canonical visits 二次递归（`01512c84` 复用 visits 的 perf 提交）；canonical where
    改稳定作者路径为**有意差异**且已声明，不宣称字节等价——诚实口径。
  - **scene/map/shop 缺边与真漏洞闭合 ✓（GM-E3-1）**：`referencesTo({kind:'map', id:
    'map-164'})` 真树断言命中 s230 override 边（pal :502-509）+ 最小 fixture（adapters :125
    's230-style script map override is visible without a scene.mapId edge'）——s230 具名回归
    双钉；sell **zero 与 nonzero 双负例**（adapters :116-120 'buy creates a shop edge while
    sell zero/nonzero never does'——GM-E3-2 落实）；`scene-map-override` relation 进图。
  - **退役与字符串协议清零 ✓**：`mapAssetSceneReferences` 全库零命中；MusicTab `where`
    正则零命中；App `reference.site.split(':')` 分派已删（现存 :662 `srcKey.split(':')[0]`
    为场景 drawer 源键协议、非 reference site——非本卡验收对象，如实记录不构成 counter）。
  - **async/partial/TOCTOU/fail-closed ✓（GM-E3-6）**：tileset 测试族——'fails closed on
    read errors and never creates a proof from partial coverage'（:143）、'discards a late
    old-path result'（:166）、'does not start a stale read…identity changes'（:212）、
    'prefers an in-session map edit over a late disk scan'（:257）；223/223 maps 完成下界
    + 浏览器 6010 实测（证据 C 批异步节）；stamp 以 `?ui_samples` authored 探针验证、
    不冒充 PAL 内容。
  - **删除策略/scope/undo-redo ✓（GM-E3-3）**：'deletion impact blocks block/replace-suggest,
    preserves warn and excludes explicit sources' + 'A↔B scope excludes A sources while
    preserving B→A'；asset-reference-commands/enemy-team/entity-address/tileset-lifecycle
    测试含 apply/redo 再复核（本人复跑 31 tests 绿）。
  - **opaque-ID 反例 ✓**：tuple key 无分隔符碰撞/无显示名身份（'uses tuple keys without
    delimiter collisions or display/path identity'）；装备战斗精灵豁免改结构化
    `origin:'equip'`，脚本 ID 含 `:equip:` 不再误跳过（证据 C 批）；诊断投影按
    `[issue code, where]` 关联而非 where 唯一身份，直接反例与
    `validateAuthorScenes → visits → diagnostics` 端到端反例已钉。
  - **性能预算纪律 ✓（GM-E3-4）**：A 批冻结预算 + 2.5MB 索引硬门全程未机械抬高——B 批
    触线时压缩 wire format（source key 消费端重建/重复 targetKeys 删除/detail 入表），
    加 1,194 rows 后完整 reply 反减 109,914B；最终 C 候选 clean n=20 全预算 pass、
    `worktreeDirty=false` 自报；耗时只作同机手工回归不进 CI（易抖样本如实保留记录）。
  - **本人复跑**：project-reference.pal + project-reference + adapters + asset-diagnostics
    **4 files / 37 tests 全绿**；asset-reference-commands + tileset-lifecycle +
    editor-derived-store **3 files / 31 tests 全绿**；migrate dry-run 零计划（含
    reference-warnings=0——新 validator 规则未暴露 PAL 真实悬空，stop-line 未触发）。
  - **可证伪观察**：重跑 pal 门任一计数/parity 断言失败；dry-run 非零计划或
    reference-warnings>0；s230/map-164 或 sell 负例回归；2.5MB 门被机械抬高或旧 DTO
    回流；TOCTOU 四测任一删失——任一出现本 accept 失效。
  无返工项；未修改实现/生成数据，未代签 Kimi，未填用户验收。
- counter / 返工处理: 无 Codex counter；等待 Kimi/GLM。
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论

1. **统一 edge，不统一成一个巨型 walker**：content 继续持有各 schema command/field 的 typed leaf rule；
   editor adapter 只补 owner、label、locator、delete policy。任何 adapter parity 差异都要有明确业务理由。
2. **稳定 target/source**：所有数字 id 先做无损字符串 key；source owner 使用稳定对象身份，`where` 只供显示与
   诊断，不用于导航或去重。owner 会随目标一起删除时由 explicit deletion scope 排除，不靠字符串前缀猜 self。
3. **Locator 是操作意图**：至少区分 editor location、scene selection、canonical command、shared script 与
   unavailable；App 只有一个 resolver。locator 必须可验证目标仍存在，变化时显示明确错误。
4. **单一 revision 快照**：同步 cold builder 是 oracle；existing derived Worker 复用同一个 builder/adapter 产出
   serializable index。UI 可显示 last-known 但标 stale；删除按钮在非 current 时禁用，命令仍二次同步复核。
5. **异步域用 edge batch + proof**：地图正文/tileset/stamp 不进入 Worker。完整扫描生成带 mapIndex/revision
   coverage 的 batch；统一 UI 可展示 partial，但删除/替换只有原 proof 验证通过才执行。
6. **删除策略不自动修改数据**：所有持久引用是 `block` 或 `replace-suggest`；后者仍硬阻断，只告诉用户去哪个
   作者位置处理。`warn` 只用于不会留下悬空数据的使用/运行态提示。
7. **保存与 publication 共用 typed 语义**：content `validateReferences` 补缺的 tagged rules；editor index adapter
   复用同一 leaf collector。PAL publication 已调用 validator，因此本卡必须用 zero-plan/zero-diff 证明没有偷改内容。
8. **三批串行、同一 Coding Owner**：
   - A：edge/locator/policy/index 合同、scene/map/shop missing typed rules、derived snapshot 与 parity oracle。
   - B：保存/删除 consumer 迁移，map helper 退役，scene/map/shop 纵切与同步 current-state guard。
   - C：媒体定位、App 单一 resolver、tileset/stamp async batch 适配、UI/浏览器/全量收口。

### 已知风险

- 风险：统一 DTO 为所有边重复分配对象，PAL 38k+ entity-address 令 Worker payload 和内存放大。
  - 缓解：先记录 A 批基线；允许 index 使用 compact tuple/共享 table 或按 target lazy materialization；
    不同时保留旧 DTO 与新 DTO 到 done。
- 风险：adapter 迁移时旧/新 collector 并存，发生计数或删除判断漂移。
  - 缓解：每域先 parity，再切 consumer，最后删除旧公开 DTO/callsite；静态门禁阻止新增页面私扫。
- 风险：UI 展示或 Delete Command 只扫 main shell，作者最新脚本引用仍可能被漏删。
  - 缓解：统一删除 proof 必须从同一 main/script revision 的 cold builder 生成；命令不再自行选择 shell 或
    callback 口径，专测 BattleField/EnemyTeam/Poison/World Sprite/Battle Sprite 五组现存反例。
- 风险：媒体 `where/site` 历史字符串无法无损映射到 exact command。
  - 缓解：从 canonical command visits 现场生成 locator；只读 chunks 明示不可编辑，不反向 parse。
- 风险：异步地图扫描与 main/script revision 不同轴，旧 proof 误授权。
  - 缓解：batch/proof 同时钉 mapIndex identity、map path/revision 与 target；任一变化要求重扫。
- 风险：补 validator 后 PAL 暴露真实悬空引用，使 zero-plan 失败。
  - 缓解：先只读 census；若出现真实数据缺陷，停线另开 migration 上游修复卡，不在 ED-3 手改 PAL。
- 风险：任务扩成 scene/shop 生命周期或 content20。
  - 缓解：本卡只提供引用地基；CRUD、显示名、文件删除和试运行按后续卡独立验收。

### 主审立场

- Reviewer: Kimi（架构、公共合同、revision/save/delete/async proof）+ GLM（覆盖 census、parity、测试矩阵、
  PAL publication）。
- 结论: **agree（2026-09-04）**。两席独立确认 ED-3 是现有 derived Worker 上的薄统一层，真实修复
  map-164 删除漏洞、current-author/shell 分裂、scene/map/shop 缺边与媒体 locator 字符串协议；不改持久 schema。
- 必改项:
  - PAL 新 validator 零新增 error、publication 通过、迁移 zero-plan；真实悬空另开上游迁移卡。
  - A 批记录 Worker payload/构建耗时数值基线和预算，超限改 lazy/compact，不重复物化全图。
  - sync cold oracle 与 Worker import 同一 builder，并做同 revision differential。
  - BattleField/EnemyTeam/Poison/World Sprite/Battle Sprite 五组 live-canonical shell-scan 反例。
  - s230→map-164 具名删除回归；sell shop=0 与 sell nonzero 双负例。
  - A↔B 场景互引 deletion scope 双向反例；真实 PAL asset/actor/item/entity-address parity。
  - checking/stale/failed UI 禁删 + 命令同步重验双层行为门。
- 是否建议进入 build: **是；三签齐，按 A/B/C 串行 build。**

### 三方争议记录（按需）

- Codex: 支持薄统一层与 A/B/C 分批；反对另写全仓递归器、持久 graph 或把 scene/shop schema 偷带入本卡。
- Kimi: premise verified + design agree；要求 PAL 零新增 error、数值性能门、单一 builder 与五组
  live-canonical 反例，均已纳入 build 硬门。
- GLM: premise verified + design agree；要求 s230 具名回归、sell 双负例、deletion scope、Worker payload、
  PAL parity 与四态 fail-closed，均已纳入 build 硬门。
- 用户拍板: 2026-09-04 批准继续推进该队列；若 reviewer 对合同/范围有 counter，再提交用户裁决。

## Build: 实现与自测

- Coding Owner: Codex（唯一实现方）
- A 批状态: **完成（`ee173e13` + `be083df2` + `55a7fe84`）**。
- B 批状态: **完成**；地图纵切（`03767dda`）、战场 / 敌队 / 氛围（`4a0aba45`）、
  skill / enemy / poison（`f0f88b19`）、actor（`1806a90f`）、item（`376934e0`）和
  world sprite / action / battle sprite（`aeb35214` + 性能收口 `d521d965`）均已落地。
- C 批状态: **完成**；剩余同步引用域与媒体/单一 resolver（`3fe000eb`）、异步 map/tileset/stamp
  facts + proof（`cf552331`）、canonical asset visits 复用与最终性能收口（`01512c84`）均已落地。
- A 批修改文件:
  - `packages/content/src/command-target-reference.ts` + tests：有界 tagged target leaf；scene/entry/hook/
    entity/map/shop/team/field/ambience，sell 任意 shop 值均不发 shop edge。
  - `packages/content/src/{validate-refs,author-script-core}.ts` + tests：补保存/publication 缺边与 openShop
    strict shape；不改 schema/contentVersion。
  - `packages/editor/src/core/project-reference*.ts` + tests：稳定 target/source、判别 relation、非空 locator、
    delete policy、复合 target 父 bucket、compact snapshot/index 与 current-author adapter。
  - `packages/editor/src/core/{project-diagnostics,editor-derived-*}.ts`、`App.tsx`：同一次 projection/visits
    生成统一 Worker snapshot；entity/scene-entry 旧 DTO 退出 reply，两个现有面板消费 index。
  - `packages/editor/scripts/benchmark-derived-reference-index.mts`：可复现 PAL 性能/payload 原始样本。
- A 批实现摘要:
  - 一条 entity edge 同时支持 entity 查询及必要的父 scene 查询；同 owner self/companion 地址不进入删除图，
    但完整 content 校验仍扫描全部 38,126 条。
  - canonical command 复用 `collectCanonicalScriptCommandVisits` 的 exact locator；readonly chunk 显式
    unavailable。loadScene+entry 与 selectSceneHooks+hook 只物化 composite edge，父场景复用同 edge id。
  - openShop guard 严格校验非负安全整数及 buy/sell；只有 buy 形成 ShopDef 引用。
  - 单一 builder 同时供 sync diagnostics 与 Worker；PAL test 断言 deep equality、4,362 blocker parity、
    795 entry、29 buy、2 map override 和 s230→map-164。
- A 批性能:
  - 证据：[`ED-3A-reference-index-performance-2026-09-04.md`](../evidence/ED-3A-reference-index-performance-2026-09-04.md)。
  - final n=20：index build p50/p95=28.067/39.715ms；snapshot=623.729/749.724ms；
    derived=608.590/663.234ms；所有签字预算通过。
  - Worker reply V8 9,154,977B→4,685,416B；新 index V8 1,769,283B；request 零增长。
- A 批运行命令:
  - content focused：3 files / 77 tests；editor focused：9 files / 107 tests；PAL index：1 test，pass。
  - `@type-pal/content`、`@type-pal/editor` typecheck：pass。
  - migrate PAL publication/store：2 files / 3 tests，pass。
  - `migrate:content` dry-run：managed=537，writes/deletes/conflicts/asset-deletes=0，
    reference-warnings=0。
  - targeted Biome、`git diff --check`：pass（App 三条既有 noUselessFragments info 不阻塞）。
- 浏览器 / 手工检查: A 批只迁移既有实体/命名落点引用呈现合同，DOM 回归测试通过；真实媒体导航和
  async map/tileset/stamp 在 C 批统一浏览器验证。
- 跳过的检查及原因: editor/content 全量测试留到 C 批最终一次；A 批只跑风险相关聚焦矩阵，避免每批
  重复全量。
- B 批已完成纵切:
  - 地图：`scene.mapId` 与 current canonical `setSceneMapOverride` 共用统一索引；删除命令在 apply/redo
    同步重建 current-author 索引，s230→map-164 与 s243→map-165 具名回归通过。
  - 战场 / 敌队 / 氛围：结构边补齐 project-default、scene-default、hostile 与 runtime world；
    `startBattle`、`setAmbience`、`toggleDayNight` 使用领域 relation，canonical 可精确定位，legacy/runtime
    明确只读。
  - 三页和地图页统一 current/checking/stale/failed；`current + index 缺失` 也按 error/unknown
    fail-closed。命令级覆盖 live canonical、provider failure、missing target、undo/redo 与 TOCTOU。
  - `battle-field-references.ts`、`enemy-team-references.ts`、`ambience-references.ts` 及两套旧测试已退役；
    App 的旧专用跳转 handler 删除，统一 scene/entity locator 会退出放置模式、展开 Inspector，并对过期
    目标明确报错。
- B 批当前验证:
  - editor typecheck：pass；11 个聚焦文件 **271 tests passed**；production build：pass。
  - design-system gate：92 files / 2 evidence-bound exceptions，pass；changed-file Biome 与
    `git diff --check`：pass（全仓 lint 仍有本卡外既存债）。
  - PAL publication/store：2 files / 3 tests，pass；`migrate:content` dry-run：managed=537，
    writes/deletes/conflicts/asset-deletes=0，reference-warnings=0。
  - PAL index：6,928 rows；battle-field-use=141、enemy-team-use=1,002、ambience-use=42；sync/Worker
    deep equality 通过。隔离性能复跑在预算内；索引 JSON 2,462,318B，后续纳域必须同步退役旧 DTO，
    不得机械抬高 2.5MB 门。
  - 战斗数据纵切：旧 collector 的 1,179 条边与统一索引真树 parity；另补旧系统漏掉的 PAL
    `learnSkill` 15 条，以及 fixture 覆盖的 world learnedSkills / skillUseCounts / party+reserve active poison。
    skill=338、enemy=791、poison=65；Enemy/Poison self edge 由 deletion scope 排除，外部边仍阻断。
  - Skill / Enemy / Poison 三页与三个删除命令已统一 current-author oracle、四态、TOCTOU、provider
    failure、missing target、undo/redo；`onOpenBattleDataReference` 与 Worker `poisonReferenceIndex` 退役。
  - 新增 content typed leaf 供 validator 与 editor 共用：技能 base/player/enemy 三层毒引用、毒关系、
    world 战斗数据与 `learnSkill`；PAL publication/store 与迁移 dry-run 继续零新增 error / 四零。
  - 索引叠加 1,194 rows 后一度超 2.5MB；通过 source key 派生重建、移除重复 targetKeys、detail intern
    与省略空尾槽压回 2,365,516B。最终 8,122 rows / 9,898 buckets，完整 reply 5,502,785B；隔离
    snapshot p50/p95=629.435/672.606ms、derived=616.444/717.467ms，均过冻结预算。
  - Actor 纵切：统一 808 条 PAL 人物引用 / 804 条 blocker；补齐 canonical `startBattle.choreography`
    与 state-machine transition 两个真实漏口。当前作者 command 516 条精确定位；唯一 transition
    `s023/e433 → zhao-linger` 定位到稳定 script owner；legacy/runtime 明确只读。
  - DeleteActor 与 ActorMode 已改用 live current index provider、deletion scope 与统一四态；self
    `coveredBy`、`levelUp` companion 不自锁，外部 `coveredBy`、runtime template 仍阻断，redo 重新验真。
  - 引用定位点击时从 main/script session 读取最新快照，避免 selector-owned 页面根组件未重渲染时使用
    stale closure；script-owner 可真正选中非默认 behavior / 非首 hook，item-private owner 选中具体脚本，
    actor object 保留 `battle` / `relationships` 分区。
  - Connected Actor/Data 页面直接订阅 derived store 和双 session revision；store-only 回包会刷新索引，
    session 先变化时立即 stale，Worker 同 revision 回包后恢复 current。新增可证伪组件回归。
  - Actor 检查点最终为 8,930 rows / 10,706 buckets，统一索引 2,432,621B、完整 reply
    5,380,070B；隔离 snapshot p50/p95=576.269/641.747ms、derived=554.072/626.202ms，均过冻结预算。
  - Actor 批验证：content 35 files / 472 tests、editor 188 files / 1,654 tests（`--maxWorkers=2`）
    全绿；双 typecheck、production build、design-system gate（92 files / 2 evidence-bound exceptions）
    通过；PAL migrate 8 files / 17 tests 通过；`migrate:content` dry-run 为 managed=537、
    writes/deletes/conflicts/asset-deletes=0、reference-warnings=0；changed-file Biome 无 error，
    `git diff --check` 通过。
  - Item 纵切：统一 1,182 条 PAL 物品引用 / 1,169 条 blocker / 13 条随物品删除的 self 边；
    canonical command 801 条精确 locator、state-machine transition 6 条稳定 owner、敌人对象 161 条。
    ItemTab 与炼蛊皿 / 紫金葫芦页面统一四态、current-without-index、筛选 unknown、确认失效和
    current-author 删除复核；旧 `itemReferenceIndex` Worker DTO、专用 App handler 与删除参数已退役。
  - Item 批同时压缩 target/source/script-owner/container/locator wire，定义侧默认标签按稳定 owner
    派生；检查点为 10,112 rows / 11,888 buckets，统一索引 1,916,386B、完整 reply 4,246,713B。
    隔离 n=20：snapshot p50/p95=587.990/657.075ms、derived=598.062/686.503ms、
    project-reference build=75.200/98.293ms，均过冻结预算。
  - Sprite 纵切：统一 3,824 条 world definition、385 条 world action 与 180 条 battle sprite 边；
    action 以单边同时进入稳定 action 与父 definition bucket，573 个 world sprite 的父级引用总数
    精确为 4,209。场景页 locator 使用稳定 PageId；shared / item-private / enemy / legacy / runtime
    owner 与只读策略完整，旧 `SpriteActionReferenceLocator.pageIndex` 和编辑器 `site.split` 跳转已退役。
  - WorldSpriteLibrary、动作弹窗、BattleSpriteLibrary 与 EnemyAnimPreview 已统一四态和 required live
    provider；定义 / 动作删除覆盖 provider failure、显示零但 live 新引用、undo/redo 再验真；profile ABI
    在引用未知时显式确认。content 装备边改用结构化 `origin`，不再由 `site` 子串判断。
  - Sprite 检查点为 14,501 rows / 16,662 buckets，统一索引 2,331,262B（低于 2.5MB 硬门
    168,738B）、完整 reply 4,661,589B；`d521d965` 的最终隔离 n=20 为 snapshot
    p50/p95=569.135/689.797ms、derived=568.473/628.512ms、project-reference
    build=72.372/99.720ms，全部通过冻结预算。
  - B 批最终验证：content 35 files / 473 tests、editor 189 files / 1,697 tests 全绿；双 typecheck、
    production build、design-system gate（92 files / 2 evidence-bound exceptions）、PAL migrate
    8 files / 17 tests 均通过；`migrate:content` dry-run 为 managed=537、
    writes/deletes/conflicts/asset-deletes=0、reference-warnings=0；`git diff --check` 通过。
- C 批实现与最终验证:
  - C 批同步收口：asset、world-variable、behavior、scene-hook、shared-script 全部进入统一 snapshot；
    媒体页只消费结构化 source/locator，App 单一 resolver 覆盖 object、canonical script、scene page/hook、
    project 和 unavailable，不再解析 `where/site`。旧领域 Worker DTO、旧页面 collector 和专用 handler
    均已退役。
  - C 批异步收口：session 级 map facts 绑定 `mapId + path + mapRevision + generation`，scan/hydrate
    共享读盘但事实不 hydrate/LRU/history/dirty；失败、partial、迟到结果、在途 hydrate 与旧 revision
    均 fail-closed。地图改动只失效当前事实，stamp facts 按稳定 id 增量维护，Tileset/Stamp 页面自动续扫。
  - Tileset remove/replace proof 钉 coverage、asset/path/SHA、共享 definition 与真实 bytes；Stamp delete
    proof 钉当前 placement count，三类 command 在 apply/redo 均重新验真。旧 `scanTilesetReferences`、
    `TilesetReferenceScan`、stamp usage cache/API、`collectStampTemplateUsage` 与页面私有 scan state 零残留。
  - canonical asset 复用：结构 walker 2,121 + existing visits 3,881 = PAL 6,002；与默认全量 walker
    按 asset/kind/origin/site 多重集完全一致。canonical `where` 改为稳定作者路径是有意差异；合法 opaque
    ID 同路径时诊断用 `[code, where]` 顺序队列关联，避免把错误归到另一 owner。locator 继续使用
    collision-safe JSON tuple，NUL 边界有 round-trip 回归。
  - 最终 clean `01512c84` n=20：25,188 rows / 10,579 target buckets / 28,089 target bucket entries，index JSON/V8=
    2,372,327/2,328,260B；snapshot p50/p95=595.130/677.743ms，derived=598.759/725.320ms，
    project-reference build=108.841/155.442ms，全部通过 A 批冻结门。异步 Node 下界 223/223、零失败、
    1,128.795ms；cached/forced/query p50=0/0.624/0.169ms，完整 batch 92,632B；authored stamp 探针
    225 rows / 93,330B。完整证据见
    [`ED-3 A-C 性能证据`](../evidence/ED-3A-reference-index-performance-2026-09-04.md)。
  - 最终验证：content 35 files / 473 tests；editor **190 files / 1,729 tests**（`--maxWorkers=2`）全绿；
    默认高并发下两个全仓源码扫描测试只发生 timeout，单独 31/31 及受控全量均通过，未放宽时限或断言。
    content/editor/migrate typecheck、editor production build、design-system gate（92 files / 2 exceptions）、
    changed-file Biome 与 `git diff --check` 均通过。PAL migrate 8 files / 17 tests 通过；dry-run=
    managed 537、writes/deletes/conflicts/asset-deletes/reference-warnings 全 0，scenes 294、maps 223、
    assets 1,934、既有 unused asset warnings 182。全仓 `pnpm lint` 仍被本卡外既有 269 errors / 52 warnings /
    15 infos 阻断；本卡 13 个实现文件定向 Biome 为 0 diagnostics，未顺手格式化无关文件。
  - 后续正式卡已建立：
    [`ED-SCENE-LIFECYCLE-1`](ED-SCENE-LIFECYCLE-1-scene-crud-and-safe-delete.md) 与
    [`ED-SHOP-LIFECYCLE-1`](ED-SHOP-LIFECYCLE-1-shop-crud-and-safe-delete.md)。两卡只复用本卡 index，
    不各造 collector；均保持 draft/blocked，未提前签设计或实施。

## 视觉验证记录

- Visual Verification Owner: Codex
- Visual Verification Timing: dev-functional
- 验证方式: 6010 真实 PAL 编辑器，DOM/URL/可见性/overflow/console + 1280/720 截图；另以
  `?ui_samples` 验证 PAL 缺失的 authored stamp 表面。
- 集中 E2E 用例 / 批次: N/A
- 截图 / 像素检查路径:
  [`1280`](../evidence/ED-3/cutscene-reference-1280.jpg)、
  [`720`](../evidence/ED-3/cutscene-reference-720.jpg)。
- 结论: **pass（2026-09-05）**。音乐 `music.pal.004` → project/startup；音效 `sound.pal.001` →
  li-xiaoyao/battle；图像 `portrait.pal.001` → li-xiaoyao/appearance；视频 `video.pal.003` →
  new-game entry；`video.pal.004` → s281/e4800/default 第 82 条指令。Tileset 引用可打开 map-001；
  1280/720 document/body 无横向溢出，引用动作位于视口，console error=0。
- 未完成项: 无本卡阻塞。PAL 本身没有 authored stamp、legacy script chunk 或 runtime-world 媒体引用，
  不能伪造真树行；
  authored stamp 用只在内存的 `?ui_samples` 验证，unavailable 行由组件/locator fixture 自动测试覆盖。
  scene/shop 引用列表与删除 UI 按本卡范围明确属于两张后续生命周期卡；本卡以 PAL index/validator/命令
  自动证据完成其 edge 地基，不把尚未实现的下游 UI 冒充本卡视觉通过。

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: Codex self-review accept；Kimi/GLM final review pending。
- 必须返工项: Codex 自验无；等待两席独立终审。
- Accept / rework: pending（未满足 done 三签）

## 用户验收

- 用户结论: pending
- 后续任务:
  [`ED-SCENE-LIFECYCLE-1`](ED-SCENE-LIFECYCLE-1-scene-crud-and-safe-delete.md)（双 session
  新建/复制/显示名/安全删除/文件清理/保存重开/试玩）；
  [`ED-SHOP-LIFECYCLE-1`](ED-SHOP-LIFECYCLE-1-shop-crud-and-safe-delete.md)（buy-only 引用、
  复制/安全删除/保存重开/真实试买、PAL 重迁 ownership 决策）。

## 交接日志

- 2026-09-05 GLM: 只读终审候选 `01512c84`（相对设计基线 `d8c5bf14`），签 **accept**。独立
  证据：PAL census 复算不变（20 shops / 29 buy + 6 sell / 2 override）；25,188 rows 与
  2.5MB JSON 为真树确定性门；6,002 asset 多重集 parity 与旧 collector 真树相等、2,121+3,881
  split 有意差异如实声明；s230→map-164 真树 + fixture 双钉（GM-E3-1）、sell zero/nonzero
  双负例（GM-E3-2）、A↔B scope（GM-E3-3）、2.5MB 纪律不机械抬阈值（GM-E3-4）、六域真树
  parity oracle（GM-E3-5）、TOCTOU 四测 + fail-closed（GM-E3-6）；mapAssetSceneReferences/
  MusicTab where 正则/reference.site.split 全退役；undo-redo 再复核与 opaque-ID（tuple key
  碰撞/`:equip:` 结构化豁免/issue-code+where 关联）反例齐；本人复跑 4+3 files / 68 tests
  全绿 + migrate dry-run 四零（reference-warnings=0）。无返工项；未修改实现/生成数据，未
  代签 Kimi，未填用户验收。Next: Kimi 终审与用户验收。
- 2026-09-04 Kimi: 完成 ED-3 架构/公共合同/revision/保存删除 fail-closed/异步 proof 设计
  主审（固定版本 `d8c5bf14`），签 premise verified + design agree。独立证据：diagnostics
  单投影单 visits（`project-diagnostics.ts:689-760`）、10+ DTO（`editor-derived-contract.ts
  :56-69`）、Worker revision 协议（`editor-derived-store.ts:114-129`）；本人 python 复算
  openShop 恰 35=29 buy（id 1..20）+6 sell（全 shop=0）、全树 scene 顶层 `mapId=map-164`
  为 0（s230 删除漏洞为真）；buy/sell 运行时分支（`reforge/main.ts:3442-3452`）、App
  `split(':')`（`App.tsx:682-731`）、MusicTab 正则下标（`MusicTab.tsx:69-100`）、
  `ScriptCommandLocator` 现存合同（`script-editor.ts:69-128`）、validate-refs 命令边全缺
  （仅 :1110/:1498-1508，schema 已在 `script.ts:70,129,214`——补 typed leaf 数据零变化
  成立）。附四条必改钉（PAL 零新增 error 硬门 / A 批性能基线 / 单一 builder / 五组
  shell-scan 负例专测）与五条可证伪观察。只改 Kimi 签字块与本条日志，未改 GLM 签字、
  共享准入结论或 Status。Next: Codex 确认三签齐后推进 build 准入。
- 2026-09-04 GLM: 完成 ED-3 设计审查（固定版本 `d8c5bf14`），签 premise verified + design
  agree。独立证据：PAL 关键 census 逐项复核（20 shops id 1..20、openShop 29 buy + 6 sell
  全 shop=0、map override 恰 2 条、hooks 67/65、294 scenes）；**s230→map-164 真实删除漏洞
  实锤**（s230 顶层 mapId=map-162、全树无场景引用 map-164，而 mapAssetSceneReferences 只
  过滤 scene.mapId → DeleteMapAssetCommand 放行）；validate-refs 零 scene/override 边、
  9+ DTO、删除命令 shell 分裂、媒体 where/site 字符串解析全部直读。附 GM-E3-1~6 必改测试
  钉（s230 具名回归 / sell 非零双负例 / deletion scope 双向 / Worker payload 数值预算 /
  真树 parity oracle / stale-failed 行为守卫）。adapter parity 可行性以 typed walker 双消费
  先例（validate-refs + migrate invariant）佐证。未修改实现/生成数据，未读取他席结论；
  Kimi premise/design 仍 pending，共享准入结论维持 blocked。Next: Kimi 并行架构主审。
- 2026-09-04 Codex: MIG-PAL-INPARTY-ID-1 用户验收后启动 ED-3；并行完成统一引用、场景生命周期、
  商店生命周期三路只读核验。确认 derived Worker 是地基而非统一图，scene/map/shop 有硬缺边，媒体 locator
  仍靠字符串，shop sell 不读 shops；据此开本卡并签 premise verified/design agree。现状基线聚焦
  12 files / 137 tests 通过。Next: Kimi/GLM 钉同一 revision 并行设计审查；签字未齐不得修改实现文件。
- 2026-09-04 Codex: 纠正并行交接协议：用户只要求同时给两份提示词，并未要求只读回传。恢复 Kimi/GLM
  各自直接写自己的签字块与交接日志并提交；审查可并行，落盘冲突由 reviewer 自行同步处理，用户无需复制正文。
  Next: 两席把已完成的设计审查直接落卡；Codex 收齐后只推进准入状态。
- 2026-09-04 Codex: 同步 GLM `242f82dc` 与 Kimi `bfab17d3`；两席均签 premise verified +
  design agree，无 counter。独立复算解释 `loadScene` 唯一数字差：scenes=981/924，items=6/6，
  全作者根=987/930。合并 K1-K4 与 GM-E3-1~6 为 build 硬门，状态转 build。Next: Codex 唯一
  Coding Owner 实施 A 批合同/索引/性能与 parity 地基。
- 2026-09-04 Codex: 完成 A 批 `ee173e13`/`be083df2`/`55a7fe84`。统一 compact index 接入
  derived Worker，entity/scene-entry 旧 reply DTO 退役；content target leaf、保存校验与 openShop shape
  落地。PAL blocker parity、s230 map override、buy-only、sync/Worker deep equality与 publication 全绿；
  final 20 轮性能/体积全部过预算，dry-run 四零。Next: B 批迁移保存/删除 consumer，优先修复
  map-164 删除漏洞与五组 live-canonical shell 分裂。
- 2026-09-04 Codex: 完成 B 批前两条纵切 `03767dda` + `4a0aba45`。地图、战场、敌队、氛围的展示与
  删除守卫已统一到 ProjectReferenceIndex；修复 runtime-world source 定义冲突，四态/current-without-index
  全部 fail-closed，live canonical/redo/provider failure 有命令与 UI 双层回归，旧三套 collector 退役。
  11 files / 271 tests、typecheck、build、DS gate、PAL publication/store 与 dry-run 四零通过。
  Next: B 批 skill / enemy / poison 战斗数据纵切，并同步移除 poisonReferenceIndex 旧 Worker payload。
- 2026-09-04 Codex: 完成 B 批战斗数据纵切 `f0f88b19`。统一 skill/enemy/poison 1,194 条 PAL 边，
  补 `learnSkill` 与运行态技能/毒引用，validator 共用 typed leaves；三个页面与删除命令改用统一 index，
  self scope/live canonical/redo/四态/过期 locator 全闭环，旧 poison DTO 与专用 App handler 退役。
  compact wire 在不抬 2.5MB 门下把 index 压至 2,365,516B。Content 49 + Editor 268 + DS 66 tests、
  双 typecheck、build、publication/store、dry-run 四零均通过；只读终审 accept、无返工。
  Next: B 批 actor 纵切并同步退役 actorReferenceIndex。
- 2026-09-04 Codex: 完成 B 批 actor / item / sprite 后三条纵切。actor=`1806a90f`、
  item=`376934e0`、sprite=`aeb35214` + perf=`d521d965`；统一索引覆盖全部同步领域消费者，删除与
  动作 ABI 均改用 current-author cold oracle，旧 Worker DTO / 专用跳转 / pageIndex locator 退出。
  B 批最终完整回归、
  PAL publication 与迁移四零通过，索引保持在 2.5MB 门内。Next: C 批迁移媒体引用及异步
  map / tileset / stamp proof，完成单一 locator resolver、最小浏览器验证和 ED-3 总收口。
- 2026-09-05 Codex: 完成 C 批 `3fe000eb` / `cf552331` / `01512c84`。同步媒体与所有剩余领域
  已统一，异步 map/tileset/stamp 使用 session facts + coverage proof，旧 scanner/DTO/字符串协议退役；
  opaque-ID 资源诊断错归因在最终性能审计中发现并修复。clean n=20 全过冻结预算，editor 190/1,729、
  content 35/473、PAL 8/17、三包 typecheck、build、DS gate、dry-run 四零及 1280/720 浏览器抽验通过。
  两张下游生命周期卡已建立，ED-3 转 review。Next: Kimi/GLM 只对完整候选做一次并行终审并直接写卡，
  不按 A/B/C 重复签字，不让用户复制审查正文。

## 下一位 Agent 提示词

Kimi 与 GLM 并行终审完整候选；两席均直接修改本卡自己的 done 签字与交接日志并提交，用户无需复制意见。
固定实现候选为 `01512c84`，设计基线为 `d8c5bf14`；不得修改实现文件或标记 done。

```text
Kimi：终审 docs/ops/tasks/ED-3-project-reference-index.md。先读 AGENTS.md、docs/phase2/READ-FIRST.md、
任务卡、docs/ops/evidence/ED-3A-reference-index-performance-2026-09-04.md；对固定实现候选 01512c84
相对设计基线 d8c5bf14 做完整架构/公共合同/revision/save-delete/async proof 终审。独立复核 typed leaf →
edge/index → Worker/cold oracle → Reference UI 四层边界、旧 DTO/scanner/string parser 零残留、current-author
与 apply/redo fail-closed、2.5MB/时间门及浏览器证据。只修改任务卡 Kimi done 签字和自己的交接日志并提交；
不得改实现、不得改 GLM/Codex 签字、不得标 done。输出 accept/counter、直接证据、可证伪观察和返工项。
```

```text
GLM：终审 docs/ops/tasks/ED-3-project-reference-index.md。先读 AGENTS.md、docs/phase2/READ-FIRST.md、
任务卡、docs/ops/evidence/ED-3A-reference-index-performance-2026-09-04.md；对固定实现候选 01512c84
相对设计基线 d8c5bf14 做完整覆盖/数据/parity/测试矩阵终审。独立复算 PAL scene/map/shop/media/
asset/actor/item/sprite 等集合、29 buy/6 sell、map override、6,002 asset split parity、25,188 rows、
223/223 async coverage、publication/dry-run 零计划；核验 partial/failure/TOCTOU/undo-redo 与 opaque-ID
反例。只修改任务卡 GLM done 签字和自己的交接日志并提交；不得改实现、不得改 Kimi/Codex 签字、
不得标 done。输出 accept/counter、直接证据、可证伪观察和返工项。
```
