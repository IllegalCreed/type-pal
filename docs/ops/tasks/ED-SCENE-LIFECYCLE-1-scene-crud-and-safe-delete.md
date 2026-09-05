# ED-SCENE-LIFECYCLE-1 - 场景生命周期闭环

Status: draft
Phase: phase2
Capability: E1 / Editor scene lifecycle
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: main

## 目标

把当前“场景 id 字符串列表 + 由 id 推导文件路径 + 主会话单边新建”升级为正式场景目录与完整生命周期。
作者可以用可读名称发现场景，同时稳定 SceneId 与文件路径分离；新建、复制、安全删除、撤销/重做、
保存重开和正式引擎试玩全部闭合。删除与引用定位只消费 ED-3 的统一 `ProjectReferenceIndex`。

## 范围

- 范围内:
  - content20 新增 `SceneIndexV1 { version: 1, scenes: { id, name, path }[] }`；
    `manifest.content.scenes` 仍指场景目录，目录内 `index.json` 保存唯一发现/名称/路径真值。
  - SceneId 使用文件安全的稳定 id 校验；显示名可编辑且不改变 SceneId、URL、脚本引用或存档身份。
  - 新建场景同时写 main / script 两个 session；复制场景共享地图和资产，保留局部实体/page/behavior/hook
    id，并把复制体内部所有显式“源场景自引用”重写到新 SceneId，外部目标不变。
  - 删除场景使用 ED-3 deletion scope 排除随删来源、保留入口/跨场景/共享脚本/物品/敌人等外部 blocker；
    apply/redo 同步 current-author 复核。
  - SceneIndex、场景正文、main/script history 与物理场景文件删除形成可撤销、可恢复的保存闭环。
  - 场景目录/选择器显示 `name + SceneId`；右侧场景 Inspector 提供名称与统一引用分区；目录头使用
    统一新增/复制/危险删除动作。
  - 从当前场景默认落点或选中命名落点打开正式 Reforge 试玩；明确提示只读取磁盘项目。
- 范围外:
  - 不改游戏内场景切换、地图格式、实体 Inspector、脚本编辑器或 ED-3 引用合同。
  - 不在本卡增加 ShopDef 名称；原用户清单没有要求商店可编辑显示名，商店生命周期保持 schema-neutral。
  - 不建设 E2E runner；只登记编辑器综合 E2E 将复用的场景子链。
- 明确不做:
  - 不修改稳定 SceneId 充当“重命名”，不自动改写场景外部入边，不级联删除。
  - 不把显示名放进 SceneDef 正文或 localStorage，不建立第二份场景目录/路径真值。
  - 不保留 content19 upgrader、旧 index parser、双读写或缺字段 fallback；版本切换后最终树只接受 current。

## 前提真值门

### 一句话行为 / 工程前提

问题不是“缺一个输入框”，而是当前场景发现真值只有 `string[]`，显示、身份和文件路径绑在同一个 id 上；
同时 `AddSceneCommand` 只改 main session，使新场景不在 canonical script session 中，后续新增实体/脚本会失败。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | N/A：原版没有二阶段作者场景目录、复制或安全删除。 | `docs/phase2/READ-FIRST.md:5-18` |
| 第一阶段 | N/A：第一阶段没有 Reforge 编辑器；只保留游戏内场景观感参考，不决定作者工具架构。 | `CLAUDE.md:3-14`; `docs/phase2/READ-FIRST.md:31-38` |
| 当前二阶段 | `SceneDef` 只有 id/mapId/空间与脚本字段；`scenes/index.json` 是 string[]，loader 与 serializer 都以 `<dir>/<id>.json` 推导路径。编辑器目录显示裸 id；`AddSceneCommand` 只写 main session，而实体新增要求 script session 已有该 scene。物理删除只跟踪 map/asset path。 | `packages/content/src/index.ts:120-146`; `packages/reforge/src/project-loader.ts:140-165,358-365,461-493`; `packages/editor/src/core/project-io.ts:151-169`; `packages/editor/src/core/commands.ts:3382-3408`; `packages/editor/src/core/script-editor.ts:1176-1196`; `packages/editor/src/core/edit-session.ts:139-180,570-580`; `packages/editor/src/ui/App.tsx:527-578,2429-2470` |
| 本任务目标 | 用一个显式 SceneIndex 同时持有稳定 id、作者名称和文件路径；SceneDef 继续只持运行/内容真值。生命周期动作通过现有 `EditorHistoryCoordinator` 成对提交，引用/删除复用 ED-3。 | 本卡范围；`packages/editor/src/core/editor-history-coordinator.ts:13-88`; `docs/ops/tasks/ED-3-project-reference-index.md` |

### 直接 census（2026-09-05，current content19）

- 三个入库 current 工程：PAL 294 scenes / 20 shops，demo 1 scene，e2e-own 1 scene；全部 SceneId
  符合 `^[A-Za-z0-9][A-Za-z0-9._-]*$`，全部正文恰位于 `content/scenes/<id>.json`，零 orphan JSON。
- PAL 223 张地图中 59 张被多个场景共享，单图最多 4 scenes；因此“场景名称 = 地图名称”不能充当身份，
  但可作为迁移时的可读名称种子。
- PAL 场景正文含 37,154 条同场景 EntityAddress、57 条同场景 loadScene、2 条同场景
  selectSceneHooks；245/294 scenes 至少有一条自引用，单场景最多 6,897 条。复制时只换 scene.id 而
  不重写 typed 自引用会得到行为错误的复制体。
- 跨场景仍有 836 条 EntityAddress、924 条 loadScene、65 条 selectSceneHooks；这些是复制体必须保留的
  外部目标，也是删除时必须阻断的真实入边/出边语义。
- R4 尚无可执行 checkpoint/save，只有 001/002 文字边界；当前显式计划“content19 薄基线 → N6b content20”
  可以在不作废既有 E2E 的前提下调整为“SceneIndex content20 → R4 薄基线 → N6b content21”。

### 反证与替代解释

- 最强替代解释 1: 直接修改 SceneId 即可满足“重命名”，无需 schema。
  - 否决：SceneId 同时是脚本/入口/URL/存档身份和文件名；全工程有数万地址边。把显示操作变成全图身份改写，
    比新增展示元数据风险更高，并违反稳定身份纪律。
- 最强替代解释 2: 给 SceneDef 增加 `name` 即可。
  - 否决：列表发现必须先读取每个正文，文件路径仍由 id 隐式推导，物理删除问题没有解决；名称是目录元数据，
    SceneIndex 与 MapIndex 同形更符合边界。
- 最强替代解释 3: 增加 optional 字段但继续 content19。
  - 否决：同一版本会出现两种合法形状，UI 必须长期 fallback；这与 current-only 纪律冲突。
- 什么观察会推翻当前前提:
  - 若显式 path 的 SceneIndex 不能保持入口场景启动、懒加载、save-as/copy-through 或 PAL 重迁
    author ownership，则停线重审，不用双 index/旧 parser 兜底。
  - 若 typed copy transformer 无法覆盖 collector 已识别的全部 scene-bearing target，禁止上线复制；
    不得用字符串 replace 或“PAL 暂未出现”放行。
- audit 红项替代根因:
  - runtime 语义 / 命令分类: 游戏内 loadScene 已可按指定 scene/entry 试玩；缺口在作者目录和生命周期。
  - 原版 / 第一阶段理解: 不适用编辑器目录架构。
  - extractor / 地图 / 数据解码: 59 张共享地图只证明名称不能当身份，不证明需要复制地图。
  - audit / test model: census 使用 ED-3 同一 typed target walker；不以字段名 grep 代替。

### 用户可见偏离

- 是否主动偏离已核真值: yes（新增可读场景目录与完整生命周期；不改变游戏内场景行为）
- `before -> after` 一句话: 裸 SceneId + 隐式文件名 + 单边新建 -> 可读名称 + 稳定身份/显式路径 +
  双 session 原子 CRUD/删除/保存/试玩。
- 代表场景: 复制一个含同场景实体控制与自跳转的 PAL 场景；复制体内部地址只改 scene 部分，局部实体/hook
  id 保留；跨场景目标不变；解除外部入边后删除并保存重开。
- 用户裁决:
  - 2026-09-04 已批准场景生命周期属于第二阶段。
  - **2026-09-05 已批准版本顺序**：SceneIndex 占用 content20；R4 薄基线直接建立在 content20；
    N6b 保持在薄基线之后并把原子切换顺延为 content21。

## 上下文锚点

- 已拍板决策 / 铁律:
  - `AGENTS.md`：schema/save/migration/公共接口/能力状态必须前提门与三方签字；开发期 current-only。
  - `docs/phase2/READ-FIRST.md`：稳定 id、干净架构、不保留旧 parser/fallback。
  - `docs/phase2/roadmap.md:197-216,300-306`：生命周期在 R4 前；原 N6b content20 顺序裁决。
- 代码锚点:
  - `packages/content/src/index.ts:109-146`
  - `packages/content/src/command-target-reference.ts:1-291`
  - `packages/reforge/src/project-loader.ts:140-165,358-365,461-499`
  - `packages/editor/src/core/project-io.ts:151-169,281-410`
  - `packages/editor/src/core/script-editor-projection.ts:1-176`
  - `packages/editor/src/core/editor-history-coordinator.ts:13-88`
  - `packages/editor/src/core/edit-session.ts:139-180,570-580`
  - `packages/editor/src/ui/App.tsx:527-578,1665-1770,2429-2470,4223-4380`
  - `packages/migrate/src/pal-current-publication.ts:93-176,261-304`
- 已知坑 / 审计文档:
  - `docs/phase2/editor/editor-authoring-closure-audit-2026-07-13.md:102-133,221-247`
  - `docs/ops/tasks/ED-3-project-reference-index.md`
  - 新场景只进 main 后，`AddSceneEntityDefinitionCommand` 会因 canonical scene 不存在而失败。
  - 首次保存/已绑定目录没有完整 prevSnapshot 时，只有显式 removePaths 能保证删掉旧场景正文。
- 不得重新引入:
  - 数组位置/显示名身份、从 SceneId 推导唯一文件路径、页面私有引用扫描、字符串全局替换、自动 cascade、
    content19 parser、旧 index fallback、双写 scene list。
- 相关测试:
  - `project-loader.test.ts`, `project-io.test.ts`, `commands.test.ts`,
    `editor-history-coordinator.test.ts`, `workspace-persistence.test.ts`,
    `App.reference-navigation.test.tsx`, `seed.test.ts`,
    `pal-current-publication.pal.test.ts`, `current-only-product-boundary.test.ts`。

## 验收条件

- 功能:
  - SceneIndex 是唯一目录真值；id/name/path 分离，index/body 双向一致，重复 id/path、非法 id/path、
    缺正文、正文 id 不符均 fail-loud。
  - loader 只按 index path 读入口和懒加载场景；`sceneIds` 如保留只能是 SceneIndex 的派生只读视图。
  - 新建/复制/删除同时成对修改 main + script session；任一侧失败回滚另一侧，undo/redo 一步对称。
  - 新建后立刻可添加实体/hook/behavior；不再出现 canonical scene 缺失。
  - 复制保留地图/资产/局部 ids；typed transformer 只重写复制体内部指向源 scene 的
    EntityAddress/currentScene/loadScene/selectSceneHooks/setSceneMapOverride 等 scene-bearing target，
    外部 scene target 与源场景外的任何入边不变。
  - 删除在 current/checking/stale/failed/缺 index 时均 fail-closed；外部 blocker 可逐条打开；
    self/companion source 由 deletion scope 排除。Command apply/redo 再验真。
  - 物理文件删除覆盖普通保存、第一次绑定 PAL 目录、save-as 整树复制后清理、保存后 undo 再写回，
    中断只允许留下安全 orphan，不得让 index 指向缺正文。
  - 目录/所有场景选择器显示 name，稳定 SceneId 始终可见；名称编辑不改变引用或路径。
  - “引擎试玩”走现有 `play.html?...&scene=<id>` 正式加载链；未保存改动明确提示不进入试玩。
- 迁移 / 版本:
  - content20 一次切换后更新 PAL baseline/current、demo、e2e-own、blank seed 与全部 current fixtures；
    最终树无 content19 upgrader/parser/fixture/fallback。
  - PAL SceneIndex name 由地图可读名按稳定场景顺序确定性消歧；294 ids/bodies/path 一一对应。
  - 重迁保留作者改过的 SceneIndex.name/path，生成分区只更新其拥有字段；连续第二次 dry-run
    writes/deletes/conflicts/asset-deletes=0。
  - 版本顺序文档统一改为 SceneIndex content20 → R4 → N6b content21。
- 测试:
  - SceneIndex validator/formatter/loader/serializer/seed；入口多场景、显式非 id 路径、missing/mismatch/path
    collision 与 current-only 拒绝 content19。
  - copy transformer 覆盖 branch/confirm/loop/startBattle 子体、condition all/any/not、EntityAddress 数组、
    loadScene+entry、hook selection、map override；self 改、external 不改、输入不 mutate。
  - 双 session create/copy/delete transaction、第二笔失败补偿、undo/redo、redo live blocker、history owner。
  - 文件生命周期覆盖 delete→save、save→undo→save、copy→save→undo→save、首次保存和 save-as。
  - UI 覆盖 create/copy dialog、名称字段、引用四态、删除确认/焦点恢复、试玩 URL/未保存提示、URL 回退。
  - PAL census/镜像/zero-plan；content/editor/reforge/migrate typecheck 与聚焦测试；最终 editor 全量、
    production build、design-system gate、changed-file Biome。
- 文档:
  - 更新 content schema、editor design、project lifecycle、roadmap/capability-map、E2E README 的版本顺序。
- 视觉 / 手工验证:
  - PAL 普通/共享地图/高引用/零引用场景，空白工程新建后立即编辑；1280/720 下目录、dialog、引用和
    Inspector 无溢出，危险动作尺寸/颜色符合设计系统。
- E2E 用例登记:
  - blank → create scene → add entity/hook → copy scene → save → reopen → trial → remove external refs →
    delete copy → save/reopen；作为后续编辑器综合 E2E 的前置子链。

## 推进签字

### 进入 build 前:设计签字

- Codex:
  - premise: **verified（2026-09-05）**。直接读码确认 string[] index、id 派生 path、main-only
    AddScene、双 session 与 removePaths 缺口；三个 current 工程和 PAL typed self/cross census 见本卡。
  - design: **agree（推荐方案）**。采用 SceneIndexV1/content20、typed self-reference rewrite、现有
    cross-session coordinator 与 ED-3 deletion scope；不改 SceneId 充当名称，不把 name 放 SceneDef。
    版本顺序已由用户于 2026-09-05 批准；本签字仍须与 Kimi/GLM 独立签字共同构成 build 准入。
- Kimi: premise **verified**（2026-09-05，架构/schema/transaction 视角一手直读 + 边界复算，
  针对固定设计候选 `8a283b39`，非复述 Codex）:
  1. **SceneDef 与 string[] index**:SceneDef 仅 id/mapId/音乐/战场/entries/entry/entities/
    onEnter/onTeleport，无展示名（`content/src/index.ts:120-149`);`scenes/index.json` 是
    string[]、仅查重（`reforge/project-loader.ts:140-150`)；入口急加载与 `loadAuthorScene`
    懒加载均按 `${dir}${sceneId}.json` 由 id 推导路径（`:358-369,461-476`);startup 以
    string[] 校验入口（`:361`)。
  2. **serializer 与 removePaths 缺口**:serializer 写 `index.json=state.scenes.map(id)` +
    `<id>.json` 正文（`project-io.ts:161-168`);`diffFiles` 的 remove 依赖 prev 快照完整
    （`:299-313`);EditSession 已有 `persistedMapPaths/persistedAssetPaths` + 精确删除
    （`edit-session.ts:139-142,569-581`),**但无 scene 等价物**——场景物理删除缺口为真，
    设计结论 6 沿用同型 persisted-paths 补齐属最小合法扩展。
  3. **main-only AddScene 与 script 前置**:`AddSceneCommand` 只改 main `state.scenes`
    （`commands.ts:3385-3409`);`AddSceneEntityDefinitionCommand.transform` 在 canonical
    scene 缺失时 throw 场景不存在（`script-editor.ts:1189-1194`)——跨 session 缺口为真。
  4. **跨会话事务机制已备**:`EditorHistoryCoordinator.dispatch(script, main)` 第二笔失败
    receipt 回滚第一笔（`editor-history-coordinator.ts:23-35`);undo 严格反序 + 主侧补偿
    redo(:38-58);redo 失败 script 补偿 undo(:60-76);孤儿 redo 丢弃(:78-88)——设计
    结论 4/5 的 create/copy/delete 配对与回滚有现成承力点，不需新机制。
  5. **ED-3 删除闭包结构无误**:`collectCurrentProjectDeletionImpact`→`deletionScopeFor`
    （`project-reference-adapters.ts:1935-1943`);`scriptOwnerDeletedWith` 对 entity 系
    owner 含 behavior+entity+scene 全祖先链（`:73-91`),scope 以 deletedWith 交集排除
    （`project-reference.ts:1313-1322`)——场景子树 self/companion 排除在结构上成立；
    `entry-point-scene` relation 已在合同（`project-reference.ts:189`)，入口场景删除
    可被外部 blocker 阻断。
  6. **typed rewrite 同源可行**:`command-target-reference.ts` 已覆盖 EntityAddress 精确
    形状、currentScene、loadScene+entry、selectSceneHooks+hook、setSceneMapOverride 的
    scene 与 map 双 target、legacy binding(:82-229)，结构性深递归覆盖 branch/loop/
    all/any/not 子体；隐式自引用（`setSceneMapOverride` 缺省 scene=运行时当前场景，
    `script.ts:129`）复制语义天然正确、无需改写——设计"只改显式 sourceScene→copyScene"
    边界完整。
  7. **版本与 ownership**:roadmap 已记 2026-09-05 裁决（SceneIndex content20 → R4
    content20 薄基线 → N6b content21,`roadmap.md:197-216` 追加段）;MapIndex 同形先例
    （`content-schema.md:133` 稳定身份不由路径反推）支撑 SceneIndex 目录真值形态。
- Kimi: design **agree**（2026-09-05；三签齐后允许 build）。SceneIndex 作为唯一目录真值、
  name 不进 SceneDef、显式 path + current-only content20、双 session 事务 + ED-3 删除
  scope、同源 typed rewrite 均成立；第四替代解释"编辑器私有名称 sidecar"亦被卡面
  localStorage 禁令正确否决（第二份目录真值、Reforge/迁移不可见）。必改钉（build 落实
  条件，非阻塞）:
  ① **磁盘写序钉**：保存写序必须是 场景正文（新/改） → SceneIndex → manifest →
    removePaths 物理删除；任一中断点不得留下 index 指向缺正文（只允许安全 orphan);
    专测覆盖 delete→save、save→undo→save、copy→save→undo→save、首次绑定 PAL 目录与
    save-as 整树复制后清理。
  ② **真树 copy differential 硬门**:transformer 与 collector 的 differential 除 fixture
    递归反例外，必须在 PAL 全量真树逐 scene 跑——复制体 source-scene 引用为 0、外部
    引用多重集不变、输入未 mutate；任一 collector 识别而 transformer 未覆盖的
    scene-bearing target 即停线，不得以 fixture 绿放行。
  ③ **高自引用删除专测**:s108 级（单场景最多 6,897 条自引用）场景在 current exact
    index 下 blockers 恰为外部入边（入口/跨场景/共享脚本/物品/敌人）,self/companion
    全部由 scope 排除；apply/redo 再验真 + redo live blocker 具名回归。
- 可证伪观察:
  ① 切换后 loader/serializer 任一位置仍从 id 推导场景路径（`${dir}${id}.json` 形态复活）
    → SceneIndex 唯一真值失败；
  ② PAL 真树 differential 发现漏改 scene-bearing target → 复制功能停线重议合同；
  ③ current/checking/stale/failed/缺 index 任一态删除被放行，或入口/外部入边场景被放行
    → fail-closed 失效；
  ④ 重迁保留作者 SceneIndex.name/path 失败或第二次 dry-run 非零 → ownership 边界失效；
  ⑤ 写序中断测试产生 index→缺正文 → 写序设计不成立。
- GLM:
  - premise: **verified（2026-09-05，固定候选 `8a283b39`；三工程闭包/共享地图/typed self-cross
    census/publication 归属/R4 存档链全部本人独立脚本复算，不采信 Codex census）**：
    1. **三工程 scene 闭包（本人 node 复算）**：PAL **294** scenes / 294 文件，orphan 0 /
       missing 0 / 非法 id 0 / 正文 id 不符 0；demo **1**、e2e-own **1** 同样全零——三库
       index 均为 `string[]`，全部正文恰位于 `content/scenes/<id>.json`，显式 path 迁移
       无孤儿/缺正文负担。
    2. **共享地图（本人复算）**：294 场景引用 **221** 个不同 mapId，其中 **59 张被 >1
       场景共享、单图最多 4 场景**，全库 223 张地图——与卡面逐字一致；「场景名 ≠ 地图名
       身份」成立，地图名只可作 name 种子。
    3. **typed self/cross census（本人以 content `collectCommandTargetReferences`
       walker 复算，非字段名 grep）**：同场景 EntityAddress **37,154**、跨场景 **836**；
       同场景 loadScene **57**、跨 **924**；同场景 selectSceneHooks **2**、跨 64（卡面 65，
       ±1 为方法口径差、不影响结论）；**245/294 场景含自引用；极值恰为 s108 = 6,897**
       （top5：s108/s019/s176/s052/s186）——「复制只换 scene.id 不重写 typed 自引用会得到
       行为错误的复制体」由真树数据实锤，且 s108 可作复制 transformer 的极值回归 fixture。
    4. **publication baseline-first/作者归属（本人直读）**：`files = new Map(baseline.files)`
       （pal-current-publication.ts:96）——作者 scenes 自 baseline 保留、generated 只回灌
       特定分区；scene 段校验 index string[] + id/body/map 闭包（:261-275）——与
       item-scheme-label/inparty 先例同构，作者改过的 SceneIndex name/path 在重迁中可保留、
       生成字段归属可以显式声明（前提是 build 补 field-ownership 不变量，见 GM-SL1）。
    5. **R4 无可执行存档链（本人实测）**：`projects/pal/e2e-checkpoints/` **仅 README.md、
       `*.save.json` 计数为 0**；roadmap R4 仅为 001-010 文字边界 + Q1 runner 未建；e2e
       README 明文「checkpoint 只消费当前 canonical，版本切换后从上游重新生成」——**前移
       content20 不作废任何既有 E2E**；版本顺序 SceneIndex content20 → R4 → N6b content21
       在 roadmap :300-306 与 e2e README :49-52 均已一致更新。
    6. **两个闭环缺口直读**：`AddSceneCommand`（commands.ts:3386-3408）只写
       `state.scenes` 主会话 shell、无 script 侧配对——而实体新增要求 canonical scene 已在
       script session（script-editor.ts:1175「与主会话 AddEntityCommand 成对提交」前置）；
       loader（project-loader.ts:145-153）以 string[] index + `<dir>/<id>.json` 推导路径、
       :186/:330 已拒非 current 版本——「单边新建 + 隐式路径」缺口属实且 current-only
       版本拒斥已有先例可扩。
    7. **可证伪观察**：重迁后作者改过的 SceneIndex.name/path 被生成分区覆盖（ownership
       声明失败）；typed transformer 漏任一 scene-bearing target（collector differential
       红）；content20 双跑 zero-plan 失败或最终树残留 content19 parser/upgrader/fallback；
       R4 出现已绑定 content19 的可执行 checkpoint（现为 0）——任一成立本签字失效。
  - design: **agree（2026-09-05，附 GM-SL1~GM-SL5 必落钉）**：
    - **GM-SL1（SceneIndex 迁移归属钉）**：publication 必须显式声明 SceneIndex 字段归属——
      id/path 生成种子为 raw-owned、作者 name/path 编辑经 baseline-first 保留——并加
      PAL 不变量（同 item-scheme-label 先例）；294 条 name 由地图可读名按稳定场景顺序
      确定性消歧（重名后缀规则冻结）并以确定性测试钉死，不允许快照漂移。
    - **GM-SL2（typed transformer 同源钉）**：copy transformer 与
      `command-target-reference.ts` 的 target recognition **同模块/同源**；collector
      differential 测试——对源场景 collect 出的 self scene-bearing 集合（EntityAddress/
      currentScene/loadScene(+entry)/selectSceneHooks/setSceneMapOverride/scene-entry）
      逐一断言改写为新 SceneId、cross 集合逐字节不变、输入不被 mutate；递归覆盖
      branch/confirm/loop/startBattle 子体与 all/any/not；**以 s108（6,897 自引用极值）
      与 top5 场景作真树回归 fixture**，不得只用玩具 fixture。
    - **GM-SL3（双 session 事务钉）**：create/copy/delete 经
      `EditorHistoryCoordinator` 成对提交，第二笔失败补偿、undo/redo 一步对称；**delete
      的 redo 用 ED-3 current provider 再验真 blocker**（不信任 undo 期间的过期索引）；
      新建后立即 add entity/hook 的端到端测试（canonical 缺失不再复现）。
    - **GM-SL4（content20 全量切换钉）**：一次切换更新 PAL current/baseline + demo +
      e2e-own + blank seed + 全部 fixtures/tests；最终树 content19 parser/upgrader/
      fallback **零残留**（扩 current-only-product-boundary 门）；loader/serializer/
      validator 双向校验（重复 id/path、非法 id/path、缺正文、正文 id 不符 fail-loud）；
      连续第二次 migrate dry-run **writes/deletes/conflicts/asset-deletes=0** 且
      current/baseline 镜像。
    - **GM-SL5（文件生命周期钉）**：delete→save、save→undo→save（正文复活）、copy→save→
      undo→save、**首次保存无 prevSnapshot 时以显式 removePaths 保证删除**、save-as 整树
      复制后清理；写序 SceneIndex 先于 manifest、物理删除最后；中断只留 orphan、index
      永不指向缺正文——五路径逐条测试。
- 独立反证审查: pending
- counter / 分歧处理: pending
- 缺签豁免: N/A
- build 准入结论: **blocked**（用户版本裁决已齐；Kimi/GLM premise/design 均未齐）

### 进入 done 前:审查签字

- Codex: pending
- Kimi: pending
- GLM: pending
- counter / 返工处理: pending
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论

1. **SceneIndexV1 是目录真值**：形状与 MapIndex 同类，保存稳定 id、作者 name、显式项目相对 path；
   SceneDef 不新增展示字段。loader、editor、seed、migration 同批切换。
2. **content20 前移**：生命周期在 R4 前，本任务使用 content20；R4 直接在 content20 建薄基线，
   N6b 保持“基线后原子切换”但版本号改为 content21。无可执行 checkpoint 需要兼容。
3. **局部 id 保留，scene namespace 改写**：复制体的 entity/page/behavior/hook/entry id 原样保留，
   因其身份都含父 scene；content 提供与 target leaf 同源的 typed transformer，只改显式 sourceScene→copyScene。
4. **双 session 一次历史**：script command 先创建/复制/删除 canonical scene，main command 同步
   SceneIndex + shell scene；沿用 `EditorHistoryCoordinator` 的补偿、undo、redo。
5. **删除两层 fail-closed**：UI 只在 current exact index 且 blockers=0 时开放；main DeleteSceneCommand
   apply/redo 用 current provider 再验真。script 先删只移除随删来源，main failure 会回滚 script。
6. **文件生命周期显式跟踪**：EditSession 从初始 SceneIndex 记录 persisted paths，保存 removePaths 加入
   deleted scene paths；SceneIndex 先于 manifest 写，物理删除最后执行，失败最多留 orphan。
7. **UI 复用现有组件**：DsListHeader 主新增 + overflow 复制/危险删除，DsDialog 表单/确认，
   DsInspectorTabs + DsReferencePanel；不重画面板或私造控件。
8. **试玩复用正式入口**：不做模拟器；普通场景使用默认落点，命名落点附 entry 参数。dirty 时明确确认。

### 已知风险

- 风险: content20 原计划属于 N6b。
  - 缓解: R4 尚未开始；只调整版本号，不改变“薄基线先于 N6b”的回归策略。用户已于 2026-09-05
    批准，并同步路线图、能力地图、design backlog 与 E2E README。
- 风险: copy rewrite 漏一个 scene-bearing command/condition。
  - 缓解: transformer 与 ED-3 target recognition 同模块；做 collector differential 和全递归反例，漏边即红。
- 风险: SceneIndex 与正文/磁盘三真值漂移。
  - 缓解: index 是唯一发现/路径真值；serializer/loader 双向校验；remove 写序保证失败只留 orphan。
- 风险: 294 场景和 25k 引用令 UI/derived 回归。
  - 缓解: 名称只在 index；ProjectReference target 身份不变，性能门沿用 ED-3，不把 SceneDef 全量复制进新 DTO。

### 主审立场

- Reviewer: Kimi（SceneIndex/schema/loader/transaction/version）+ GLM（PAL census/migration/测试矩阵）
- 结论: Codex 推荐方案与用户版本裁决均已形成；等待两席并行独立审查。
- 必改项: pending
- 是否建议进入 build: pending

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件: 未开始
- 实现摘要: 未开始
- 运行命令: 当前只读 census；未运行 build 测试
- 浏览器 / 手工检查: 未开始
- 跳过的检查及原因: build 签字未齐，不得修改实现

## 视觉验证记录

- Visual Verification Owner: Codex
- Visual Verification Timing: dev-functional
- 验证方式: pending
- 集中 E2E 用例 / 批次: 编辑器综合工作流前置子链
- 截图 / 像素检查路径: pending
- 结论: pending
- 未完成项: 全部 build 后项目

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: pending
- 必须返工项: pending
- Accept / rework: pending

## 用户验收

- 用户结论: pending
- 后续任务: 商店生命周期；R4 薄 E2E。

## 交接日志

- 2026-09-05 GLM: 完成 PAL census/migration/测试矩阵并行设计主审（固定候选 `8a283b39`），
  签 premise verified + design agree。独立复算（不采信 Codex census）：三工程闭包全零
  （PAL 294/demo 1/e2e-own 1，均 string[] index）；共享地图 59/223、max 4；typed
  self/cross 37,154-836 EntityAddress、57-924 loadScene、2-64 hooks，245/294 含自引用、
  **s108 极值 6,897** 与卡面逐字吻合；publication baseline-first（:96）与 scene 闭包校验
  （:261-275）支撑 SceneIndex 作者归属；R4 checkpoints 目录 `*.save.json` 计数 0——
  content20 前移不作废任何 E2E；AddSceneCommand main-only（:3386-3408）与 loader 隐式
  路径（:145-153）缺口直读。附 GM-SL1~SL5（SceneIndex 字段归属不变量与 name 确定性消歧 /
  transformer 与 target recognition 同源 + s108 真树 differential / 双 session 事务与
  redo live-blocker / content20 全量切换零残留双跑零计划 / 文件生命周期五路径含首次保存
  removePaths）。未读取 Kimi 结论；未修改实现。Next: 三签齐后 Codex 统一判断 build 准入。
- 2026-09-05 Kimi: 完成 SceneIndex/schema/loader/transaction/version 并行设计主审（固定候选
  `8a283b39`），签 premise verified + design agree。独立证据：SceneDef 无展示名
  （`content/src/index.ts:120-149`）、string[] index 与 id 推导路径
  （`reforge/project-loader.ts:140-150,358-369,461-476`）、serializer 与 scene
  removePaths 缺口（`project-io.ts:161-168`、`edit-session.ts:139-142,569-581` 仅
  map/asset）、main-only `AddSceneCommand`(`commands.ts:3385-3409`）与 canonical
  scene 前置 throw(`script-editor.ts:1189-1194`)、coordinator 补偿/undo/redo
  （`editor-history-coordinator.ts:23-88`)、ED-3 scope 祖先链闭包
  （`project-reference-adapters.ts:73-91`、`project-reference.ts:1313-1322`)、
  scene-bearing target 全覆盖（`command-target-reference.ts:82-229`）与隐式自引用无需
  改写（`script.ts:129`)。附三钉：磁盘写序（正文→index→manifest→删除）、PAL 真树
  copy differential 硬门、s108 级高自引用删除专测；五条可证伪观察。只改 Kimi 签字行与
  本条日志；未改他席签字/准入结论/看板/实现。Next: GLM 并行数据/migration/测试矩阵
  主审；三签齐后 Codex 统一推进 build 准入。
- 2026-09-05 Codex: 用户批准开始后完成前提门读码/census。确认正确地基是显式 SceneIndex，
  不是 SceneDef 展示字段或稳定 id 重写；发现 main-only AddScene 与 scene removePaths 两个真实闭环缺口。
  PAL 245/294 scenes 含自引用，复制必须 typed rewrite。推荐 SceneIndex 占 content20、N6b 顺延 content21。
  Evidence: 本卡真值矩阵/census。Next: 用户版本顺序裁决；未批准前不得发 build 审查或改实现。
- 2026-09-05 User: 批准版本顺序：SceneIndex content20 → R4 content20 薄基线 → N6b content21。
  Codex 同步当前规划文档；Next: Kimi/GLM 钉同一 revision 并行做 premise/design 审查，未齐签前不得实现。
- 2026-09-05 Codex: 版本顺序与当前权威规划已同步并提交为 `8a283b39`；以下两席提示词均钉该设计候选。
  Next: 两席独立核验并直接落自己的签字/证据；Codex 待齐签后统一判断 build 准入。

## 下一位 Agent 提示词

### 给 Kimi（并行，架构 / schema / transaction 主审）

> 你是三贤人系统中的 Kimi。请对任务卡
> `docs/ops/tasks/ED-SCENE-LIFECYCLE-1-scene-crud-and-safe-delete.md` 做进入 build 前的独立
> premise/design 审查。审查候选固定为 `8a283b39`；任务仍为 `draft`，用户已批准
> `SceneIndex content20 → R4 content20 薄基线 → N6b content21`。不得开始实现、不得改任务状态、
> 不得标记 build/done，也不要读取或复述 GLM 的结论。
>
> 先完整阅读 `AGENTS.md`、`docs/phase2/READ-FIRST.md`、本任务卡、
> `docs/ops/tasks/ED-3-project-reference-index.md`、`docs/phase2/roadmap.md`、
> `docs/phase2/foundation/content-schema.md`、`docs/phase2/editor/project-design.md` 与
> `docs/phase2/editor/editor-design.md`。然后必须直接读取并给出自己的 `file:line` 证据，至少核验：
> `SceneDef`/现有 string[] scene index、Reforge 入口与懒加载、editor serializer/removePaths、
> main-only AddScene 与 script scene 前置条件、`EditorHistoryCoordinator` 的补偿/undo/redo、
> ED-3 current exact deletion proof。重点压力测试：SceneIndex 是否应是唯一目录真值；name 是否确实不应
> 进入 SceneDef；显式 path 与 current-only content20 是否完整；create/copy/delete 两会话事务与磁盘写序
> 是否 fail-closed；typed self-reference rewrite 是否与 ED-3 target recognition 同源且不漏
> EntityAddress/currentScene/loadScene/selectSceneHooks/setSceneMapOverride 及递归子体；入口场景、
> save-as/copy-through、dirty trial 和共享地图是否有未定义边界。写出最强替代解释、可证伪观察和必改项。
>
> 结论只能是：带独立证据的 `premise verified` + `design agree`，或明确 `counter`。完成后先同步最新
> `main`，只修改任务卡中 Kimi 自己的 build 前签字行，并在交接日志追加一条 Kimi 记录；不得修改
> Codex/GLM 签字、主审汇总结论、build 准入结论、看板或实现文件。提交并 push `main`；若遇并发 push，
> 自行 rebase/retry 并保留另一席已落内容。最终只报告结论、证据、返工项与提交号；不要让用户搬运正文。

### 给 GLM（并行，数据 / migration / 测试矩阵主审）

> 你是三贤人系统中的 GLM。请对任务卡
> `docs/ops/tasks/ED-SCENE-LIFECYCLE-1-scene-crud-and-safe-delete.md` 做进入 build 前的独立
> premise/design 审查。审查候选固定为 `8a283b39`；任务仍为 `draft`，用户已批准
> `SceneIndex content20 → R4 content20 薄基线 → N6b content21`。不得开始实现、不得改任务状态、
> 不得标记 build/done，也不要读取或复述 Kimi 的结论。
>
> 先完整阅读 `AGENTS.md`、`docs/phase2/READ-FIRST.md`、本任务卡、
> `docs/ops/tasks/ED-3-project-reference-index.md`、`docs/phase2/roadmap.md`、
> `projects/pal/e2e-checkpoints/README.md`、`docs/phase2/foundation/content-schema.md` 与
> `docs/phase2/editor/project-design.md`。然后必须直接读取代码/工程并给出自己的 `file:line`、命令与计数
> 证据，不采信 Codex census：独立复算 current 工程 scene 数、id/path/index/body 闭包、共享地图、PAL
> scene self/cross typed references（尤其 s108 极值与复制所需自引用集合）；检查 migrate publication 的
> baseline-first/author ownership，证明 SceneIndex name/path 能保留作者修改且生成字段归属明确。重点审查
> content20 全量切换覆盖 PAL current/baseline、demo、e2e-own、blank seed、fixture/test 的清单；零旧 parser/
> upgrader/fallback 门；loader/serializer/validator、typed transformer、双 session transaction、文件删除
> 生命周期、redo live blocker、UI/视觉、PAL 镜像与双跑 zero-plan 测试矩阵；确认 R4 尚无可执行存档链，
> 因此前移 content20 不会作废既有 E2E。写出最强替代解释、可证伪观察、遗漏清单和必改项。
>
> 结论只能是：带独立证据的 `premise verified` + `design agree`，或明确 `counter`。完成后先同步最新
> `main`，只修改任务卡中 GLM 自己的 build 前签字行，并在交接日志追加一条 GLM 记录；不得修改
> Codex/Kimi 签字、主审汇总结论、build 准入结论、看板或实现文件。提交并 push `main`；若遇并发 push，
> 自行 rebase/retry 并保留另一席已落内容。最终只报告结论、证据、返工项与提交号；不要让用户搬运正文。
