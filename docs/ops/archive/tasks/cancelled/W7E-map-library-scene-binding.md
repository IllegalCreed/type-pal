# W7E - 独立地图库与场景地图绑定（已取消）

Status: cancelled
Phase: phase2
Capability: W1 / W3 / W7 / E1 / MG2
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Opus + GLM
Visual Verification Owner: Codex（用户委托技术验收）
Unavailable Agents: none
Branch: main

> **取消说明（用户裁决，2026-07-14）**：本卡把迁移后的 PAL 场景继续保留为
> `reuseOriginalMap`，并让 content / reforge / editor 同时消费旧 `Tilemap` 与新
> `OwnMap`。用户明确否决该前提：旧地图格式只能存在于提取器与迁移器输入端，进入工程、
> 引擎和编辑器的地图必须全部是唯一新版格式；高度必须属于地图格子实例，不能放在
> tileset 元数据。故本卡原设计、三方 `agree`、实现自测与 Codex `accept` 全部失效，
> **不得作为任何推进签字复用**。后续由
> [`W7F-canonical-map-pipeline.md`](../done/W7F-canonical-map-pipeline.md) 承接。当前未提交实现只可在
> W7F 重新三签后逐项甄别复用，禁止按本卡直接提交。

## 目标

把自有地图从“当前场景顺带加载的一份 JSON”升级为工程内一等资产：拥有稳定 map id、独立注册表和完整列表；作者可在地图模块新建/复制/重命名/编辑地图，也可在场景模块选择、复用或打开地图。未绑定地图保存重开后仍存在，被场景引用的地图不能静默删除。

同时显式迁移旧 `{ ownMap: path }`，保持 PAL 原版复用地图兼容，并让 loader、编辑器、项目 IO、引用校验、迁移器与 MG2 合并策略对新 schema 使用同一真值。

## 范围

- 范围内:
  - 新增 `MapAssetDefV1` / `MapIndexV1`，由 `manifest.content.maps` 指向 `content/maps/index.json`。
  - 新自有地图引用改为 `{ ownMapId: string }`；稳定 id 与 JSON path 分离。
  - `contentVersion: 2` 写入新 map-registry 工程；旧 v1 `{ ownMap: path }` 走显式兼容/升级路径，不静默重解释字段。
  - loader 读取 map index 并按 id 解析自有地图；编辑器加载注册表内全部地图，包括零场景引用地图。
  - `EditorState`、serializer、Command/undo、FSA diff 支持地图库 CRUD 和场景换绑。
  - 地图模块加入地图列表、搜索、新建、复制、改显示名、删除；场景检查器加入地图选择、创建并绑定、复制并绑定、打开地图。
  - 多场景共享同一自有地图；修改地图后所有引用场景使用同一结果。
  - W7E 内先做窄范围 `scene.map` 反查用于删除守卫，ED-3 接管后移除该专用实现。
  - MG2 的 merge/bootstrap 两套 array mode 同时登记 `content/maps/index.json` 的 `/maps` 为 `id` 合并。
- 范围外:
  - 不实现通用 `ProjectReferenceIndex`；由 ED-3 完成。
  - 不补 actor/zone/场景删除等 ED-4 生命周期能力。
  - 不把原版 tilemap 转成 OwnMap，不改 W7D N 层/碰撞模型或 W7B tileset 量化管线。
  - 不在本卡新增随机笔刷、stamp、autotile、per-tile 高度。
- 明确不做:
  - 不用 path、数组下标或原版地图号充当新自有地图身份。
  - 不把旧 `ownMap` 字段改成“有 index 时表示 id、没 index 时表示 path”的双义字段。
  - 不以扫描场景引用代替长期 map index；未引用地图必须是正式可发现资产。
  - 不让 W7E 临时删除反查扩张到 tileset/sprite/script 等域，避免形成第二套永久引用系统。

## 上下文锚点

- 已拍板决策 / 铁律:
  - `docs/phase2/READ-FIRST.md`：路径/数组位置不得充当稳定身份；编辑器 Command 走不可变 apply/invert。
  - `docs/ops/archive/tasks/done/ED-1-editor-authoring-closure-audit.md`：三签确认 map index、稳定 id、场景绑定和显式旧格式迁移方向。
  - ED-1 Opus R1：SceneMap 消费方、seed/serializer/loader/validate/migrate/MG2 必须同卡覆盖；`MapIndexV1.maps` 在 merge/bootstrap 两处登记 id 合并。
  - ED-1 Opus R2：W7E 可用临时 scene-map 反查，但必须被 ED-3 收编且不得长成第二套引用系统。
  - ED-1 Opus R3：P0 新场景止血拆为 `W7E-0-blank-scene-map-reference.md`，应先完成，W7E 不重复造临时逻辑。
  - 用户 2026-07-13：地图工具必须有地图列表、新建/编辑；场景对应地图必须可选择；需要整体创作闭环。
- 代码锚点(`file:line`):
  - `packages/content/src/index.ts:121-155`：当前 `SceneMap = ReuseMap | { ownMap:path }` 与 path 缓存键。
  - `packages/content/src/character.ts:54`：manifest `contentVersion` / `content`。
  - `packages/reforge/src/loader.ts:46-85`：`LoadedProjectCore` 当前无 map catalog。
  - `packages/reforge/src/loader.ts:335-351`：编辑器只沿场景引用加载自有地图。
  - `packages/reforge/src/scene-map.ts:18`、`packages/reforge/src/main.ts:268`：运行时加载/缓存以 `SceneMap` 分流。
  - `packages/editor/src/core/edit-session.ts:19-31`：`state.maps` 当前按 path 键控。
  - `packages/editor/src/core/project-io.ts:99-105`：serializer 直接写 path-key maps，无 index。
  - `packages/editor/src/ui/MapMode.tsx:84-97`：地图编辑对象从当前场景推导。
  - `packages/editor/src/ui/App.tsx:1426-1447`：场景自有地图只读，不能选择。
  - `packages/migrate/src/migration-merge.ts:42-54`、`packages/migrate/src/migration-bootstrap.ts:46-58`：MG2 array mode 当前没有 maps index。
- 已知坑 / 审计文档:
  - `docs/phase2/archive/audits/editor-authoring-closure-audit-2026-07-13.md` P0-2：无索引导致未引用地图重开丢发现能力。
  - `docs/ops/archive/tasks/done/W7D-nlayer-map-schema.md`：OwnMap v1 图层/碰撞结构已定，不得重新考证或改写。
  - `docs/ops/archive/tasks/done/W7B-tileset-library.md`：tileset 注册与上传管线已定，地图只引用稳定 tileset id。
  - `docs/ops/archive/tasks/done/MG2-incremental-migration-merge.md`：迁移产物必须三方结构化合并，不能因新 index 退回 atomic 整文件冲突。
- 不得重新引入:
  - `paletteId`/调色板 UI、双层 word 模型、原版 opcode、直接 mutate EditorState。
  - 运行时为编辑器反向扫描工程目录、仅 FSA 可用的 loader 分支、HTTP 与 FSA 不同 schema。
  - 打开旧工程即静默覆盖磁盘；升级只在明确保存时写入，并有诊断/测试。
- 相关测试:
  - `packages/content/src/*test.ts`、`packages/content/src/validate-refs.test.ts`
  - `packages/reforge/src/loader.test.ts`、`packages/reforge/src/scene-map.test.ts`、`packages/reforge/src/assets.test.ts`
  - `packages/editor/src/core/seed.test.ts`、`commands.test.ts`、`project-io.test.ts`、`open-local.test.ts`
  - `packages/migrate/src/migration-merge.test.ts`、`migration-bootstrap.test.ts`、`migrate-content.test.ts`

## 验收条件

- 功能:
  - 空白工程带 map index；地图模块能在无场景绑定时新建一张地图，保存重开后仍列出。
  - 地图列表支持按 id/名称过滤、新建、复制、改显示名、打开和删除；id 创建后不可被“改名”顺带改变。
  - 场景可从已登记地图中选择并绑定；可从场景一键打开目标地图；两个场景可共享一图。
  - “复制地图后绑定”生成新稳定 id 与新 path，图层/碰撞/tileset 内容深复制，后续编辑互不影响。
  - 修改共享地图后两个场景均生效；删除被引用地图时展示使用场景并阻止；解除/替换引用后可删除。
  - 删除地图为单个可撤销 Command：index、内存地图和待删除文件状态一致；undo 恢复全部。
  - v1 `{ ownMap:path }` 工程可打开；内存明确升级为 map catalog + `ownMapId`，首次保存写 v2/index/new refs，地图文件内容和 path 不变。
  - 相同规范化旧 path 只生成一个 map asset；不同 path 产生稳定且唯一 id；冲突/非法 path fail-loud 并给文件/场景诊断。
  - PAL `reuseOriginalMap` 场景无需 map index 仍可运行、切场景和保存；不得被强转为自有地图。
- 测试:
  - content guard：MapIndex version、id/path 唯一、相对安全 path、未知 ownMapId、legacy/new/reuse 判别均覆盖。
  - loader：v2 entry/lazy scene 按 id 加载；v1 legacy runtime 兼容；编辑器全量加载包含未引用地图。
  - project IO：blank/create/bind/save/reopen/delete/undo round-trip；未引用地图不丢；删除文件进入 diff remove。
  - Command：create/duplicate/rename/bind/delete 全部 apply/invert，输入对象不被 mutate。
  - MG2：merge 与 bootstrap 两套测试均覆盖 `/maps` id 合并；双方新增不同 map 无冲突，同 id 不同内容按既有规则报告冲突，不退回 atomic。
  - 迁移：`projects/pal` 重跑与二次零计划继续成立；新 map index 不导致迁移产物体积异常或删除作者地图。
  - 门禁：content/reforge/editor/migrate 相关测试与 typecheck，根 `pnpm check` 全绿。
- 文档:
  - 更新 content schema、loader/editor 设计、能力地图恢复条件和 ED-3 收编说明。
  - 更新旧 `ownMap:path` 升级说明，写明 contentVersion 1/2 边界及失败诊断。
- 视觉 / 手工验证:
  - 1280、900、720 三档验证独立地图列表、空态、长列表、场景地图选择器和删除引用弹窗；无重叠、截断或不可达操作。
  - 浏览器完整走：空白工程 -> 新地图 -> 不绑定保存重开 -> 绑定两个场景 -> 编辑 -> 复制并换绑 -> 删除守卫 -> 解除引用删除 -> undo。
  - PAL 工程打开地图/场景、切换原版地图兼容支路，视觉与 W7D/W7B 当前基线一致。

## 推进签字

签字是阶段门禁。W7E 涉及 schema、contentVersion、跨包公共接口、迁移器和 MG2；设计三签已齐，Codex 已进入 build。

### 进入 build 前:设计签字

- Codex: **agree（2026-07-14）**。采用显式 `ownMapId` + MapIndexV1，旧 `ownMap:path` 只作为 v1 兼容输入并在编辑器保存时升级；注册表是发现真值，场景引用不是索引。实现按内容契约/loader -> editor state/IO -> Commands/UI -> 迁移/MG2 -> E2E 分期提交。
- Opus: **agree（2026-07-14,附 M1/M2 必改）**。schema 与升级边界总体正确:LegacyOwnMapRefV1 单独命名封死双义字段;打开不写盘、保存一次性升 v2;id=stem 优先+冲突加 path hash 确定性;`o:<mapId>` 与 `legacy:<path>` 缓存键不混;懒加载哲学与 M3 一致(index 只元数据,OwnMap 场景级 LRU);MG2 双表登记+交叉测试正合 R1(现在登记=前瞻防御,迁移器当前不产 maps,零成本);临时删除反查四重钉正合 R2;五 Command apply/invert+删除单命令含文件 diff。**M1**:升级触发条件须显式写死——"仅当工程含自有地图引用才升 contentVersion 2/写 index;纯 reuseOriginalMap 工程(如 pal)保存时保持 v1,不注入空 index"——否则实现可能无条件升版,pal 的 manifest 被无意义改写。**M2**:消费方清单 editor core 行漏 `clone.ts/zip 导出(A5)`——克隆与 zip round-trip 必须含 content/maps/index.json,补入表并在测试节点名。游戏存档已核无涉(SavePayload 不含 map 信息,缓存键不入档)
- GLM: **agree**（2026-07-14）。

  **消费方矩阵逐层对码（含 M1/M2 落卡后终版）**：

  | 层 | 消费方表条目 | 代码面实测 | 差集 |
  |---|---|---|---|
  | content | MapIndex/MapAsset/SceneMap/guards/legacy parser/sceneMapKey/validate-refs | index.ts:135 SceneMap / :138 isReuseMap / :143 reuseMapNum / :153 sceneMapKey / validate-refs.ts:72 | 无漏 |
  | reforge | LoadedProjectCore/loadProjectFrom/loadSceneDef/全量地图/scene-map.ts/main cache/assets | loader.ts:46 LoadedProjectCore / :85 LoadedProject / scene-map.ts:18 loadSceneMap / assets.ts:73 loadOwnMap / :87 loadTilesetByPath | 无漏 |
  | editor core | EditorState/blank seed/Commands/project IO/open-local/tests + **clone.ts/zip(M2)** | edit-session.ts:25 maps Record / seed.ts:132 / project-io.ts:99 / open-local.ts 存在 / **clone.ts 存在 / export-zip.ts 存在(App.tsx:49)** | M2 已落，无漏 |
  | editor UI | App/MapMode/scene inspector/SceneCanvas/PreviewCanvas/scene-stage/ED-2 deep link | MapMode.tsx:84-97 / App.tsx:1426 / scene-stage.ts | 无漏 |
  | migrate | 生成 schema/fixtures/migrate-content tests/旧项目兼容 | migrate-content.ts migrateAll | 无漏 |
  | MG2 | migration-merge.ts/migration-bootstrap.ts /maps id mode + 双方测试 | merge:42 arrayMode / bootstrap:46 arrayMode（当前无 maps 登记=预期，W7E build 时新增） | 无漏（前瞻登记） |
  | docs | content/editor 设计/能力地图/ED-3 收编债/升级说明 | capability-map.md / editor-design.md | 无漏 |

  **消费方差集：零漏项。** M1（纯 reuse 工程不升 v2）和 M2（clone.ts/zip 入表+测试点名）均已落卡。七层全部对码。

  **测试节 D1-D5 分期映射**：
  - D1 契约 → content guard/legacy/MapIndex merge rules 纯测试 ✅
  - D2 loader → map catalog/v2 lazy/v1 runtime/编辑器升级/缓存测试 ✅
  - D3 editor core → state/serializer/Commands/undo/diff round-trip ✅
  - D4 UI → 独立列表/场景 picker/deep link/删除守卫/响应式 ✅
  - D5 集成 → PAL 回归/空白 E2E/MG2 双跑/文档 ✅
  **D1-D5 每期有独立验收，分期映射完整。** ✅

  **M1 复核**：升级触发条件"仅含自有地图引用才升 contentVersion 2/写 index；纯 reuseOriginalMap 工程保持 v1 不注入空 index"——pal 工程全 reuseOriginalMap，保存不被改写 manifest。✅
  **M2 复核**：消费方表 editor core 行已含 clone.ts/zip 导出(A5)。clone.ts 和 export-zip.ts 代码面存在。测试节点已点名。✅

- counter / 分歧处理: 无。
- 缺签豁免: N/A
- build 准入结论: **三签齐（Codex+Opus+GLM agree），build allowed。** M1/M2 已落卡，消费方矩阵零漏项。

### 进入 done 前:审查签字

- Codex: **accept（2026-07-14）**。D1-D5 已按设计落地；全仓类型/单测/Biome、编辑器生产构建、PAL 迁移零计划与 1280/900/720 浏览器流程均通过。自审确认 schema v1/v2 边界、运行时懒加载、Command invert、未引用地图 round-trip、删除守卫、clone/zip 与 MG2 双表规则均有测试证据。
- Opus: pending
- GLM: pending
- counter / 返工处理: 当前无；等待 Opus / GLM 独立复验。
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论

#### 1. 存储 schema 与内存真值

```ts
interface MapAssetDefV1 {
  id: string
  name: string
  path: string
}

interface MapIndexV1 {
  version: 1
  maps: MapAssetDefV1[]
}

type SceneMap =
  | { ownMapId: string }
  | { reuseOriginalMap: number; room?: RoomRect }
```

- 新工程或第一次创建自有地图时，`manifest.content.maps = "content/maps/index.json"`，工程写 `contentVersion: 2`。
- `MapIndexV1.maps` 是有序作者资产表；`id`、规范化 `path` 各自全局唯一。显示名可改，id/path 不跟随显示名变化。
- map JSON 保持 W7D `OwnMap v1`，本卡只改变“如何发现/引用”，不改变图层与碰撞内容。
- `EditorState` 使用 `mapIndex: MapIndexV1` 与 `mapsById: Record<string, OwnMap>`；serializer 通过 index 的 path 产出文件，禁止继续把 path 当 Record key 身份。
- 原版 `reuseOriginalMap` 保持独立兼容分支；它不进入 map index，也不出现在空白工程默认创作流。

#### 2. v1 显式兼容升级

旧存储输入类型单独命名为 `LegacyOwnMapRefV1 = { ownMap: string }`，不能塞回新 `SceneMap` 的长期作者 API：

1. 运行时 v1 loader 仍可直接按 legacy path 加载，保证旧工程无需先保存就能启动。
2. 编辑器加载全部 v1 场景后，按规范化 path 去重建立临时 catalog，并把工作副本转换为 `{ ownMapId }`。
3. id 优先取合法文件 stem；不同 path 若 stem 相同，追加规范化 path 的稳定短 hash；转换报告列出 `path -> id`。
4. 非工程相对路径、`..`、重复 id/重复 path 元数据冲突或缺失地图文件一律 fail-loud，指出 scene id/path，不猜测修复。
5. 打开本身不写磁盘；用户第一次保存时一次性写 v2 manifest、map index 和新 scene refs。地图 JSON 保持原 path/内容，不做无意义搬家。
6. 新 schema 的 guard 不把 `ownMap` 当 id；兼容解析器只在 `contentVersion: 1` 输入边界接受它。

#### 3. loader / runtime

- `LoadedProjectCore` 增加只读 map catalog；`loadProjectFrom` 在 manifest 声明 maps 时读取并 guard index。
- `loadSceneDef` 对 v2 `ownMapId` 验证引用存在；`loadSceneMap` 通过 catalog 解析 path 后调用现有 `loadOwnMap`。
- `sceneMapKey` 对自有地图使用稳定 id：`o:<mapId>`；旧 v1 兼容运行时使用明确 `legacy:<path>`，不与 v2 键混淆。
- `loadAllOwnMaps` 改为按 map index 全量载入编辑器地图；运行时仍按场景需要懒加载，不因注册表把全工程地图常驻内存。
- map cache 和场景切换继续只缓存实际访问地图；独立地图库不会让游戏加载所有地图。

#### 4. editor / Command / UI

- Command 最小集合：`CreateMapAssetCommand`、`DuplicateMapAssetCommand`、`RenameMapAssetCommand`、`BindSceneMapCommand`、`DeleteMapAssetCommand`；所有命令原子维护 index/maps/scenes 并实现 invert。
- `MapMode` 接收 `selectedMapId`，不再从当前 scene 推导唯一地图；当前场景只用于“使用场景”区和快捷换绑。
- 地图模块左栏为资产列表，包含搜索、新建、复制、删除；画布与图层/瓦片区继续复用现有 W7D/W7B 组件。
- 场景检查器地图字段改为对象选择器，提供“打开地图”“创建并绑定”“复制当前并绑定”；选原版兼容地图时保留现有数字/room 编辑能力，但与自有地图选择明确分组。
- 地图显示名和 id 分开展示；常规改名只改 name。改变 id/path 属显式高级迁移，不在本卡提供按钮。
- 删除守卫暂时只扫描 `state.scenes` 的 `ownMapId`，返回引用 scene id 列表并 block。该 helper 标注 `temporary until ED-3`，ED-3 必须改接统一 `ProjectReferenceIndex` 后删除；禁止在此 helper 增加其他领域。

#### 5. serializer / migrate / MG2

- `serializeProject` 始终从 map index 写 `content/maps/index.json` 和各 `def.path`，因此零引用地图也可重开。
- 删除命令从 index/mapsById 移除后，现有 snapshot diff 把 map JSON 列入 remove；有引用时命令拒绝执行，不产生半删状态。
- blank seed 升级为 v2 + start map index；W7E-0 先保证旧 schema 下 AddScene 不再退回原版 0，W7E 再把其引用升级为 id。
- PAL 迁移器目前只生成 `reuseOriginalMap`，无需制造空 map index；若未来生成自有地图，必须同步输出 index 与 v2 manifest。
- MG2 两处必须同时增加精确规则：
  - `packages/migrate/src/migration-merge.ts`：`file === "content/maps/index.json" && path === "/maps" -> "id"`。
  - `packages/migrate/src/migration-bootstrap.ts`：同一 file/path -> `"id"`。
- 两处各有测试，防止一边结构化合并、一边 bootstrap 仍按 atomic 比较。

#### 6. 消费方清单（R1 门禁）

实现提交前逐项勾清，漏一类不得转 review：

| 层 | 必须同步的消费方 |
|---|---|
| content | MapIndex/MapAsset/SceneMap 类型、guards、legacy input parser、`sceneMapKey`、`validate-refs` |
| reforge | `LoadedProjectCore`/ContentJsons、`loadProjectFrom`、`loadSceneDef`、编辑器全量地图加载、`scene-map.ts`、main map cache、assets/loader tests |
| editor core | `EditorState`、blank seed、Commands、project IO/serializer/diff、open-local/main 装配、相关 tests |
| editor UI | `App.tsx`、`MapMode.tsx`、scene inspector、`SceneCanvas`、`PreviewCanvas`、`scene-stage`、ED-2 deep link |
| migrate | 生成 schema/fixtures、migrate-content tests、旧项目兼容验证 |
| MG2 | `migration-merge.ts`、`migration-bootstrap.ts` 的 `/maps` id mode 与双方测试 |
| docs | content/editor 设计、能力地图、ED-3 收编债、升级说明 |

### 实施分期

1. **D1 契约**：content types/guards/v1 compat、blank seed、MapIndex merge rules 与纯测试。
2. **D2 loader**：map catalog、v2 lazy load、v1 runtime/编辑器升级路径、缓存测试。
3. **D3 editor core**：state/serializer/Commands/undo/diff 与 round-trip。
4. **D4 UI**：独立列表、场景 picker、deep link、删除守卫和响应式布局。
5. **D5 集成**：PAL 回归、空白工程浏览器 E2E、MG2 双跑、文档与能力状态复核。

每期都可单独提交，但 D1-D5 由同一 Coding Owner 连续推进；任何期失败不得把半套 schema 标为完成。

### 已知风险

- 风险: SceneMap 判别联合破坏面跨 content/reforge/editor/migrate。
  - 缓解: R1 消费方表 + 编译门禁 + v1/v2/reuse 三类 fixture；禁止只靠搜索替换字段。
- 风险: 旧工程打开后被隐式改写或地图文件重复。
  - 缓解: 读时只建内存升级报告，保存时才写；同 path 去重，非法/冲突 fail-loud；地图内容/path 不搬家。
- 风险: map index 让运行时一次加载全游戏地图。
  - 缓解: index 只载元数据，OwnMap 仍按场景懒加载并走现有 LRU；编辑器才全量载入作者工作副本。
- 风险: 临时地图删除反查成为第二套引用系统。
  - 缓解: helper 只接受 scenes/maps，名字和注释标记 ED-3 收编；ED-3 验收列“删除该 helper”。
- 风险: MG2 对 index 默认 atomic，作者与迁移双方改图时整文件冲突。
  - 缓解: merge/bootstrap 两处 `/maps -> id` 规则和交叉测试与 W7E 同提交，不留后补。
- 风险: map id/path 重命名产生跨文件大改和悬空引用。
  - 缓解: 本卡只允许改显示名；id/path 作为稳定身份/存储位置不提供普通改名 UI。
- 风险: W7E UI 在 ED-2 前后重复搬迁。
  - 缓解: W7E-0 先止血，ED-2 先落模块/深链壳，W7E 再把最终地图库挂到 `map` 模块。

### 主审立场

- Reviewer: Opus（schema/loader/命令边界/MG2）+ GLM（迁移覆盖/测试矩阵/消费方清单）
- 结论: Codex、Opus、GLM 三方均为 `agree`；消费方矩阵零漏项。
- 必改项: M1（纯 reuse 工程不升 v2）与 M2（clone/zip 纳入消费方）均已落卡。
- 是否建议进入 build: 是，已进入 build。

### 三方争议记录(按需)

- Codex: 选择新字段 `ownMapId` + 独立 index；拒绝让旧 `ownMap` 字段双义化。v1 兼容只在输入边界保留，编辑器保存时显式升级为 v2。
- Opus: 无方向分歧;M1(纯 reuse 工程不升版)/M2(clone/zip 入消费方表)是边界补明。另注 N1:v1 own 运行时兼容建议标注过渡性质(测试钉住,待存量工程升级后评估收敛),防双分支永存。
- GLM: 消费方矩阵与 D1-D5 测试映射已复核，无分歧。
- 用户拍板: 已确认地图必须独立列出并可由场景选择；schema 细节待本卡三签。

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
  - `packages/content/src/{map-index,index,validate,validate-refs}.ts` 及测试。
  - `packages/reforge/src/{loader,scene-map,main}.ts` 及测试。
  - `packages/editor/src/core/*`、`packages/editor/src/ui/*` 中的地图目录、工程 IO、Command、深链与界面消费方及测试。
  - `packages/migrate/src/migration-{merge,bootstrap}.ts` 及测试；content/editor/capability/ED-3 债务文档。
- 实现摘要:
  - 新增 `MapIndexV1`、稳定 `ownMapId` 和严格 path/id guard；v1 `ownMap:path` 仅在 loader 边界兼容，编辑器内存确定性升级，纯 reuse 工程保持 v1。
  - 运行时只载 map index 元数据并按场景懒加载；编辑器按 index 全量载入，零引用地图仍可发现、克隆、导出和保存。
  - 完成 create/duplicate/rename/bind/delete 五个不可变 Command 及 undo/redo；serializer 检查所有输出路径冲突，删除通过 diff 进入 remove。
  - 地图模块完成独立列表、搜索、CRUD、使用场景和稳定深链；场景检查器完成选择、创建并绑定、复制并绑定和打开地图。引用中地图禁删，未引用地图采用两次点击确认，不调用原生 prompt/confirm。
  - MG2 merge/bootstrap 同步登记 `content/maps/index.json#/maps` 的 id 合并规则；blank seed、clone、zip 与文档同步更新。
- 运行命令:
  - `pnpm exec biome check --write packages/content/src packages/editor/src packages/migrate/src packages/reforge/src`：272 文件通过，无修改残留。
  - `pnpm check`：shared 111、content 174、reforge 334、migrate 149 通过 + 1 skip、pal-extract 251、game 2294、editor 160；Biome 659 文件通过。
  - `pnpm --filter @type-pal/editor run build`：生产构建通过；仅既有的 `main` chunk 大于 500 kB 提示。
  - `pnpm --filter @type-pal/migrate run migrate:content`：托管 602、场景 295、chunk 294；`writes=0 deletes=0 conflicts=0`，`ref-warnings=0 script-issues=0`，未写盘。
- 浏览器 / 手工检查:
  - `http://localhost:6013` 的 v1 自有地图 fixture 正确显示一次升级报告，保存按钮在未额外编辑时也为 dirty；新鲜页面控制台错误为 0。
  - 实际走通新建、改名、复制、删除两击确认、undo/redo、场景绑定、复制并绑定、地图↔场景深链；引用计数随绑定变化，引用中的删除按钮禁用。
  - 13 张地图长列表 `clientHeight=190 / scrollHeight=475`，深链选中 `map-11` 后自动滚动且选中行完整可见；页面无横向溢出。
  - `http://localhost:6010` PAL 工程显示“还没有工程地图”和“当前复用原版地图(只读)”，原版地图正常渲染，控制台错误为 0。
- 跳过的检查及原因: 未自动点击操作系统原生目录授权器做真实 FSA 保存/重开；该权限面无法由当前内置浏览器稳定自动确认。serializer/diff/write、未引用地图 round-trip、clone 与 zip 已由单测覆盖；需 Opus 复验时可用本地目录手工补一遍权限壳。

## 视觉验证记录(如适用)

- Visual Verification Owner: Codex（用户明确委托继续技术验收）
- 验证方式: 内置浏览器真实 DOM/截图；1280×800、900×800、720×800 三档；自有地图 fixture + PAL 工程。
- 截图 / 像素检查路径: 浏览器会话实时截图（未落仓）；1280 画布采样非黑占比 `0.0912`、128 种采样色，720 画布/网格裁片非黑占比 `0.2622`、128 种采样色。
- 结论: 三档均无页面横向溢出或面板/工具栏重叠；900/720 工具栏按预期换行；画布非空、网格和瓦片可见；长列表选中项可达；PAL 空态和只读兼容态清楚。通过。
- 未完成项: 仅原生 FSA 授权器的人工权限壳，已在 Build 跳过项说明；不影响核心状态/序列化结论。

## Review: 审查与返工

- Reviewer: Opus + GLM
- 审查结论: Codex 自审 `accept`；下一位 Opus 做 schema/loader/Command/视觉复验，随后 GLM 做迁移覆盖与测试矩阵复验。
- 必须返工项: 当前无，等待独立审查。
- Accept / rework: `review`；三方 done 签字尚未齐，禁止标记 done。

## 用户验收

- 用户结论: pending
- 后续任务: ED-3 统一工程引用图收编地图删除反查；ED-4 场景/实体生命周期。

## 交接日志

- 2026-07-14 Codex: 按 ED-1 三签结论与 Opus R1-R3 起草 W7E：稳定 map id/index、v1 显式升级、运行时懒加载、编辑器 CRUD/绑定、临时删除守卫收编、MG2 双表 `/maps` id 合并和全消费方矩阵。Evidence: 本卡 Draft/验收。Next: Opus 架构/schema 主审；不得实现。
- 2026-07-14 Opus: 设计签 **agree + M1/M2 必改**。M1=升级触发边界显式化(仅含自有地图才升 v2,纯 reuse 工程保持 v1 不注入空 index);M2=消费方表补 clone.ts/zip(A5) 并测试点名。已核:双义字段封死/读不写盘/确定性 id/缓存键分离/懒加载/MG2 双表前瞻/R2 四重钉/存档无涉。N1 注记:v1 runtime 兼容标过渡。Next: Codex 落 M1/M2 进 Draft;GLM 复核消费方矩阵+测试映射;三签齐 build。
- 2026-07-14 GLM: 设计签 **agree**。七层消费方矩阵零漏项，M1/M2 与 D1-D5 测试映射复核通过。Next: Codex build。
- 2026-07-14 Codex: ED-2 已按三方验收收口；复核 W7E 三方设计签字、M1/M2 和上下文锚点后进入 build。Next: D1 content 契约。
- 2026-07-14 Codex: 完成 W7E D1-D5：MapIndex/ownMapId/v1 显式升级、运行时懒加载、编辑器 CRUD/绑定/undo、clone/zip、MG2 双表和响应式 UI 全部落地。全仓门禁、生产构建、PAL 零计划及三档浏览器验证通过，Codex 审查签 `accept`，状态转 `review`。Next: Opus 独立复验；不得标记 done。

## 下一位 Agent 提示词

无。本卡已取消；后续只按 `docs/ops/archive/tasks/done/W7F-canonical-map-pipeline.md` 推进。

## 后续收编回执（2026-09-05）

W7F 当时保留的 `mapAssetSceneReferences` 临时窄反查已由 ED-3 提交 `03767dda` 退役；地图引用与删除
现消费 current-author `ProjectReferenceIndex`，同时覆盖 `scene.mapId` 和 canonical
`setSceneMapOverride.mapId`。本节只记录历史债清偿，不重开已取消的 W7E。
