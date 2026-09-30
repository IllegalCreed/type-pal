# TEST-GLM-WAVE-L-1 交付证据（GLM L，2026-09-30；r2 返工响应 Codex counter）

分支 `codex/glm-wave-l-editor-map-r1`（自派发提交 `784fb098789a64b21c45e6c942d87abfa9efac2f` 建独立工作树），
生产冻结 `f70db72236d9cac794d40a625a89fef8c29459ae`，`verify-targets.mjs` 通过
（L 波 6 组 24 源，与 A–K/M/N 零交集）。

## r2 返工（响应 Codex 对 e2b3f437 的 counter，2026-09-30）

1. `vitest-directed.json` 已 Biome 格式化并随根 `pnpm lint` 复检：**2780 文件
   0 error / 0 warning / 0 info**（lint-zero.mjs 原始输出 PASS 行见下「门禁结果」）。
2. `StampTemplateDialog.glm-l.test.tsx`：删除 `as unknown as [string]` 双强转
   （`onSaved` 改类型化 `vi.fn<(templateId: string, mode: string) => void>`，
   取参 `mock.calls[0]?.[0]`）；beforeEach 设 `IS_REACT_ACT_ENVIRONMENT = true`，
   复跑该文件 stderr 中 act 环境警告 **0 条**（`/tmp` 运行已核，2/2 绿）。
3. CC5 更换：原「删 selectionForStampPlacementGridPoints 空 placement 早退」注入后
   目标用例红但为 `TypeError`（崩溃型，非业务断言），按判据无效。已更换为
   hitTestMapContent 的 imageBounds 生成单轴变异（`frame ?` → `false ?`），
   注入后仅目标 fullName 的 **AssertionError（业务断言）红**、exit1，恢复后源
   SHA256 不变 → 5 枚反控重新全部有效。原 CC5 正控/注入日志按审核要求保留于
   `counters/L-CC5-control.txt` / `L-CC5-injected.txt`，新证据为
   `L-CC5b-control.txt` / `L-CC5b-injected.txt`；counters.json 的 CC5 条目记录
   superseded 说明。
4. 功能视觉补可核 console 证据：IAB evaluate 内包装 console.error/warn +
   window.error/unhandledrejection，两条流程的**操作窗口 console 均为 0 条**且
   无 vite-error-overlay；初始加载期（hook 注入前）无法回溯，如实标未证。
   见 [functional-visual.md](functional-visual.md)「Console 证据」节。
5. 复跑 Editor 全包 3720/3720、typecheck 0、docs 仍仅共享 README 导航 1 项
   （白名单外，留 Codex 集成登记）、`git diff --check` 通过。

## 交付物

- 新测试 15 个文件、67 用例，全部位于冻结源同目录 `*.glm-l.test.ts(x)`：
  - core：map-selection / scene-commands / scene-stage(ui) / map-edit-commands / map-asset-commands /
    map-patch / map-transform / stamp-draft / stamp-group-command / stamp-group-transform /
    stamp-placement / stamp-ownership（12 个）
  - ui：MapSelectionInspector / StampTemplateDialog / SpriteActionEditorDialog（3 个）
- 反控 5 枚（L01/L02/L03/L05/L06 各一枚）：[counters.json](counters.json) + [counters/](counters/) 原始日志。
- 功能视觉 2 条（地图选区/取消 + 精灵源帧回显）：[functional-visual.md](functional-visual.md) + [visual/](visual/) 截图。
- 疑似产品缺陷 1 项（停组上报，不写伪测）：[defect-report.md](defect-report.md)。
- 定向覆盖率对照（隔离、同分母、未接官方基线）：[coverage-delta.md](coverage-delta.md)。

## 门禁结果（r3 最终代码，2026-09-30；仅修 13 份日志 EOF 空行）

- `git diff --check 784fb098...HEAD`（整个已提交候选区间）：**exit 0 零诊断**。
  r2 的 13 处 `new blank line at EOF`（CC1–CC5 十份、CC5b 两份、
  logs/stamp-dialog-act-clean.txt）已逐文件剥离尾部空行——13 文件各删 1 行，
  日志正文与旧反控历史字节不动（提交 05d4eaa7）。
- Editor 全包：`env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor test`
  → **496 文件 / 3720 测试全绿，exit 0**
  （[logs/editor-full-summary.txt](logs/editor-full-summary.txt)）。
  备注：同一提交在系统 load 7–10 时两次复跑出现 4–6 个 design-system 静态扫描门
  **超时**且失败集合随机漂移（负载记录 [logs/editor-full-load-timeouts.txt](logs/editor-full-load-timeouts.txt)）；
  负载回落后同命令空载复跑即如上全绿，代码无回归。
- Editor typecheck：`tsc --noEmit` **0 error**。
- 根 `pnpm lint`：**PASS — 2780 files; 0 errors / 0 warnings / 0 infos**。
- `git diff --check`（工作树）：通过。
- `node scripts/docs/check.mjs`：**1 项失败，如实上报**——
  `docs/testing/glm-next-triple/README.md: 子目录未进入导航：docs/testing/glm-next-triple/wave-L`。
  共享 README 在白名单外，仍由 Codex 集成时登记。

## 门禁结果（r2 最终代码，2026-09-30）

- Editor 全包：`env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor test`
  → **496 文件 / 3720 测试全绿，exit 0**（基线 3653 + 新增 67）。
  摘要 [logs/editor-full-summary.txt](logs/editor-full-summary.txt)，完整输出 [logs/editor-full-vitest.txt](logs/editor-full-vitest.txt)。
- Editor typecheck：`tsc --noEmit` **0 error**。
- 新测定向集：15 文件 **67/67 通过**，新鲜 Vitest JSON（file/fullName/status，已 Biome 格式化）
  [vitest-directed.json](vitest-directed.json)；定向覆盖运行 1870/1870（[logs/coverage-targeted-summary.txt](logs/coverage-targeted-summary.txt)）。
- 根 `pnpm lint`：**PASS — 2780 files; 0 errors / 0 warnings / 0 infos; complete report**
  （含已格式化的 vitest-directed.json、counters.json 与本卡全部新文件）。
- `git diff --check`：通过（无空白错误）。
- `node scripts/docs/check.mjs`：**1 项失败，如实上报**——
  `docs/testing/glm-next-triple/README.md: 子目录未进入导航：docs/testing/glm-next-triple/wave-L`。
  修复方式为在该共享 README 增加一行 wave-L 链接；该文件在本卡白名单外（M/N 并行共用，卡面只读），
  参照 A–J 先例由 Codex 集成时登记，GLM 不越界改共享文件。


## 组别排重账（caller → 旧 fullName/断言 → 新证）

每组先核现行公开调用方与旧测（test/boundaries/background/kimi-workflows/glm-leaf-wave）的
fullName 与实际断言，再只为合法、可达、未重复的当前合同写新测。行号以候选提交为准。

### L01 地图选择/检查器

| 源 | 真实 caller | 旧测合同（抽样） | 判定 → 新证 |
|---|---|---|---|
| map-selection.ts | MapMode.tsx:65、map-pointer-gesture-session.ts:7、map-selection-overlay.ts:2-3、MapSelectionInspector.tsx:9-10、StampContentEditor.tsx:21、map-transform-session.ts:3 等 | `W8 selection reducer`（placement/cells 互斥、toggle 整批、去重、R1/R5 命中）、`M01`（空 reset/隐藏全选/摘要悬空层）、`M2 background`（clip 保留、清 context） | new-contract → `map-selection.glm-l.test.ts`：undefined placement 双入口回退（:201/:216）、空 incoming toggle=subtract（:263-264）、clip 无变化原身份（:360-365）、非空 reset 新空 state、候选 imageBounds/空槽无（:737-756） |
| MapSelectionInspector.tsx | MapMode.tsx:125 | `MapSelectionInspector 剩余合同`（tile/collision patch 形状、非法输入、步进）、旧 test（mixed 呈现、隐藏锁定禁写） | new-contract → `MapSelectionInspector.glm-l.test.tsx`：清空三通道 patch 形状（:150-165）、高度 onBlur 校验与空输入早退（:333-345）、tileId/collision 空输入早退（:128-131/:185-188）、0 高度 clamp（:175）、目标层悬空回退+禁用（:99-103） |
| MapMode.tsx | App.tsx:195/2182；mapLayerVisualToStorageIndex 内部 :2435 | `MapMode.test.tsx` 60 条 + kimi-workflows + catalog-coverage（索引换算、目录搜索、Inspector 键盘、组隔离、命中优先级、删除确认、变换预览、复制/粘贴/删除整组） | existing-proof 为主；锁定/隐藏层守卫与「剪贴板为空」等分支仍空缺，但均需多步 UI 竞态搭建，收益低于 core 缝隙，本轮未写（登记为未写理由，非 unreachable） |

### L02 场景画布/舞台/命令

| 源 | 真实 caller | 旧测合同 | 判定 → 新证 |
|---|---|---|---|
| scene-commands.ts | commands.ts:59-65 barrel → App.tsx 多处（新建/复制/删除场景、落点增删、entry/music/坐标） | `C3` barrel 同一性 + commands.test/scene-lifecycle 间接 happy path | new-contract → `scene-commands.glm-l.test.ts`：UpdateScene 缺场景 apply/invert 零写、重复 apply 单次捕获（:43-45）；UpsertSceneEntry 空 id（:82）与缺场景双零写；DeleteSceneEntry 缺目标先于引用索引早退（:137-139）；AddScene 双抛（:191-197）+ invert 未 apply；DuplicateScene 双抛（:231-237）；UpdateSceneName 三守卫（:277-282）；DeleteScene 两抛 + invert 前置（:313-333） |
| scene-stage.ts | MapMode.tsx:151、SceneCanvas.tsx:30、StampContentEditor.tsx:53、isometric-map-render.ts:3、PreviewCanvas.tsx:39、AmbienceScenePreview.tsx:27、IsometricEditorCanvas.tsx:12 | `scene-stage.test.tsx`（fitStageView 公式、sha 失效重载、磁盘回退、isCollisionOverlayMarked、网格 clip、trigger highlight）、`kimi-workflows`（滚轮缩放、live 编辑、迟到丢弃） | new-contract → `scene-stage.glm-l.test.tsx`：collectInitialSceneSpriteAssets 跳过 hidden/zone+去重（:307-321）、buildInitialSceneSpriteDraws leader 常量与 zBias 映射（:324-380）、未知精灵跳过、fitStageView clamp [0.04,16] 与 mapBoxOf room 分支（:242-255/:426-437）。useStageSize/useStagePanGesture 零直测缺口未写：需 RO/pointer capture 环境，收益低于纯函数（登记未写理由） |
| SceneCanvas.tsx | App.tsx:205/2676 | `SceneCanvas.test/glm-ui-wave/kimi-workflows`（click 清选、cursor 四态、放置 onAddAt、拖动提交、磁盘回退） | existing-proof 为主；error 面板与自动定位 effect 缺口需构造资产加载失败/视野几何，本轮未写（登记未写理由） |

### L03 图块/地图编辑/资源

| 源 | 真实 caller | 旧测合同 | 判定 → 新证 |
|---|---|---|---|
| map-edit-commands.ts | commands.ts:53-63 barrel → MapMode.tsx:1448/2312/2322/2324/2437/3490 | `C5` barrel、commands-map.boundaries（增/删/移/resize/paint 正控）、commands.test（碰撞正交、图层族）、map-patch.test（Command 缺图） | new-contract → `map-edit-commands.glm-l.test.ts`：PaintTiles/PaintCollision 命令层 ownership 抛错零写（:55-63/:115-119）、未 apply invert 早退、缺图零写、删最后一层 no-op（:237）、Move 缺失层 apply/invert 双零写（:266-280）、Add 越界夹回（:209-211）、Update/Resize 缺目标零写 |
| map-asset-commands.ts | commands.ts:43-52 barrel → MapMode.tsx:2246/2256/2285/3382、App.tsx:4328/4333/4347/4353/4414 | `C4` barrel、地图资产命令（create/duplicate/rename/bind/delete happy path）、residual（id 冲突、clone）、boundaries（缺目标 no-op） | new-contract → `map-asset-commands.glm-l.test.ts`：首图登记补写 manifest.maps 且 undo 恢复原引用（:17-23）、maps 记录已存在第二支拒绝（:27-28）、Duplicate 缺源零写（:106）、rename trim 归一化（:138）、bind/delete/create 未 apply invert 零写 |
| map-patch.ts | map-edit-commands.ts:22-33、stamp-placement.ts:13-14、stamp-group-transform.ts:10、stamp-group-command.ts:12、stamp-lifecycle.ts:12、MapMode.tsx:45-46 等 | `W8 atomic map patch`（ownership no-op 前置、组内窄入口、通道正交、双 prev 往返）、`M03`（重复通道、清源） | new-contract → `map-patch.glm-l.test.ts`：stamp-placement-missing（:118-125，全仓无断言）、整组窄入口他组冲突/未归属可写（:142-188）、tilesetId 空串/负高度/非整数坐标/越界单轴（:284-331）、missing-source（:371-377） |
| map-transform.ts | MapMode.tsx:76、map-transform-session.ts:9、stamp-template.ts:11、stamp-placement.ts:17、stamp-group-transform.ts:22、isometric-brush.ts:1、stamp-draft.ts:3-4 | `W8 paste/move/delete planning`（ownership 硬错误、mapping、冲突语义、锁步、重叠）、`M02/M3`（越界、stamp-selection-unsupported、capture undefined） | new-contract → `map-transform.glm-l.test.ts`：paste 撞组 ownership 不可 overwrite（:254-265）、无可搬内容回退 empty-selection（:266-268，旧测无该 code）、capture 丢弃悬空层/空槽/重复格点（:146-180）、identity fallback 落笔（:199-203）、includeCollision move 冲突+overwrite 提交（:513-567） |
| TilesetTab.tsx | DataMode.tsx:50 | `TilesetTab 全项目引用删除`（sha 重载、fail-closed 扫描）、`K04`（真实编码链、分页、替换竞态）、`U2c`（元数据、深链） | existing-proof 为主；id 空/含 '/'/重复提交校验缺口（:410-416）需上传向导夹具，收益/成本比低，本轮未写（登记未写理由） |

### L04 世界精灵/动作

| 源 | 真实 caller | 旧测合同 | 判定 → 新证 |
|---|---|---|---|
| world-sprite-behavior.ts | WorldSpriteLibrary.tsx:21-23、App.tsx:126/DataMode.tsx:31（类型） | `describeSpriteReferenceBehavior`（线性证明、分支回退、预算、递归栈、animEntity、四向、第 0 页）、wave2（canonical projection、状态机、双 site）、`K03`（分组、归属边界、投影边界、sites）、`pal.test`（PAL 回归） | 深度守卫候选经实证为**不可观察/疑似缺陷**（17 层线性链公开 API 显示帧 #0，帧不在脚本内）→ 停组上报 [defect-report.md](defect-report.md)；「分支保守回退」已有旧测等价证明（existing-proof） |
| SpriteActionEditorDialog.tsx | WorldSpriteLibrary.tsx:47/1392 | 17 条（create 快照五重漂移、dirty 丢弃、flush、失败阻塞、受控切换、窄模式） | new-contract → `SpriteActionEditorDialog.glm-l.test.tsx`：edit 模式 opening scope 漂移自动 onClose 且零命令（:137-143）、create 模式 Cmd+S 阻断+聚焦名称（:313-327） |
| SpriteActionEditor.tsx | SpriteActionEditorDialog.tsx:11/384 | field commit boundary 4 条 + K03 7 条 | existing-proof 为主；拖放错误分支（:351-371）需 DnD dataTransfer 夹具，本轮未写（登记未写理由） |
| WorldSpriteLibrary.tsx | DataMode.tsx:52 | 26 条 + U2b + K02（fail-closed 索引、深链路由、noop 回灌、双筛选） | existing-proof 为主；openEditAction 双 notice（:495-507）依赖 proof 竞态，功能视觉已覆盖同面（帧切换回显），未重复写测 |

### L05 印章草稿/模板/选择器

| 源 | 真实 caller | 旧测合同 | 判定 → 新证 |
|---|---|---|---|
| stamp-draft.ts | StampContentEditor.tsx、StampLibraryTab.tsx:16/288 | `canonical stamp draft`（open-save、reanchor、resize、层 CRUD、blank、selection）、`M04`（CRUD 门）、`M1`（setVisual/setCollision/moveSelection/resize/bounds/slotId） | new-contract → `stamp-draft.glm-l.test.ts`：后画字母序更小 tileset 时既有 cells 来源索引整体重映射（:188-211）、heights 键随内容生灭（:237/:258-265）、零高度不引入 heights、碰撞擦除幂等（:281-282） |
| StampTemplateDialog.tsx | MapMode.tsx:144/3641 | 6 条（新建跨层、不继承、migrated 接管、update 换源、校验聚焦、Esc）+ leaf 3 条（取消零碰、create 全量、锚点整数） | new-contract → `StampTemplateDialog.glm-l.test.tsx`：create 重复 ID「ID “x” 已存在。」+聚焦 id（:165-167）、空名「名称不能为空。」+聚焦（:169-171）、不勾碰撞快照丢弃（:438,195-199） |
| StampContentEditor.tsx | StampLibraryTab.tsx:35/587 | leaf 3 条 + StampLibraryTab 16 条 | existing-proof 为主；error 横幅（:184-196）需资产加载失败夹具，本轮未写（登记未写理由） |
| StampPlacementSelectionInspector.tsx | MapMode.tsx:143/3339 | leaf 9 条（汇总、多选、锁定、子集提交、移出保留、整层禁、非法输入、退出） | existing-proof；notice/collisionReadOnly 等缺口需 MapMode 组合夹具，成本高本轮未写（登记未写理由） |
| StampPlacementInspector.tsx | **无生产调用方（孤儿组件）** | 2 条（冲突明细、错误不截断） | unreachable（生产 0 import；组件去留待 Codex 裁决，不写新测） |

### L06 印章组命令/所有权

| 源 | 真实 caller | 旧测合同 | 判定 → 新证 |
|---|---|---|---|
| stamp-group-command.ts | MapMode.tsx:80-82/1490/1524/1597/1742 | `W7G`（fill 连通、原子编辑、identity 缩减、解组、no-op、fail-loud） | new-contract → `stamp-group-command.glm-l.test.ts`：Ungroup 空/缺失 id 构造拒绝（:193-196）、Edit apply 缺图/过期（:159-162）、no-op apply+invert 双早退（:142/:168）、Ungroup invert 缺图抛错 + label 单复数（:213/:225-227）、reject 计划构造的冲突回退文案（:240-244）、构造器非成员输入五连拒绝、整组变换缺图/过期（:267-275） |
| stamp-group-transform.ts | MapMode.tsx:85-89/635/651/1555/1580/1687/1852、map-transform-session.ts:12 | `W7G-E`（快照、move/copy/cut、delete、ownership、隐藏/越界/跨图/stale、no-op）、boundaries/background（capture、双组、delete 抛错） | new-contract → `stamp-group-transform.glm-l.test.ts`：preserve 粘贴撞存活 id（:229-237）、move 快照不一致（:218-227）、粘贴 layer-missing（:294-298）、未知 id 空 clipboard 回退形态（:432-451）、可提交计划的 nextSelection/placementSelection 形状（:405-412） |
| stamp-placement.ts | MapMode.tsx:98/699/1341、StampPlacementInspector.tsx:2、stamp-placement-overlay.ts:5、stamp-placement-command.ts:4 | `canonical stamp placement planning`（多源原子、错排公式、五类 fail-closed、owned 永不覆盖）、`M05`（身份映射门）、`M5 background`（三通道 patch、owner、ActualHeight、id）、leaf（索引、字节不变） | new-contract → `stamp-placement.glm-l.test.ts`：ambiguous-destination 视觉同槽（:264-270，全仓无断言）、模板瓦片缺来源 patch-invalid（:236-239）。collision 版 ambiguous 登记为死分支（单模板 collision 映射单射，不可达） |
| stamp-ownership.ts | map-patch.ts:11/117/420、map-edit-commands.ts:38 等（inherit）、stamp-lifecycle/stamp-placement-mutation/MapMode/overlay | `3000 组索引/delta/压实`、background（owner 查询、inherit、seed 抛错、move 归属） | new-contract → `stamp-ownership.glm-l.test.ts`：fill 对未知组/未知层/出界起点返回空（:200-202）、差分登记幂等返回同索引（:131-133）、移除未知 id 安全跳过（:153-155） |

## 未写项与理由（非 unreachable，除非注明）

- MapMode 锁定层 moveLayer 守卫/空剪贴板守卫、SceneCanvas error 面板/自动定位、TilesetTab 提交校验、
  SpriteActionEditor 拖放错误、StampContentEditor error 横幅、StampPlacementSelectionInspector notice：
  均需多步竞态或上传向导夹具，收益低于已写 core 缝隙，本轮未写。
- StampPlacementInspector：孤儿组件，生产 0 调用方 → unreachable，组件去留待 Codex。
- stamp-placement collision 版 ambiguous-destination：死分支（映射单射）→ unreachable。
- world-sprite-behavior 深度守卫：疑似产品缺陷（见 defect-report.md）→ blocked 停组。
