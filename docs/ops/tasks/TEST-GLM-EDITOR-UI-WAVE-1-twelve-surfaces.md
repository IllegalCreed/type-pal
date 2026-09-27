# TEST-GLM-EDITOR-UI-WAVE-1 — 编辑器十二模块交互回归

Status: rework
Owner: GLM（隔离工作树内唯一测试 Coding Owner）
Reviewer / Integration Owner: Codex
Phase: phase2
Visual Verification Timing: dev-functional（仅在断言涉及可见画布/布局时取最小证据）
Product Freeze: `31945f4e59e898acbaebaa3f4e5cb76dd58f045a`
Official Fast at Assignment: 46,615/63,323 branches; 9,505 tests / 730 source files

## 目标与前提

Codex 核准 **build allowed**：只补当前编辑器公开 UI/回调入口的可证伪回归，产品、schema、
旧测试、资产和覆盖率配置不改。纯测试任务的用户可见 before→after 为 N/A；若发现真实
产品缺陷，保留独立红诊断并交 Codex 定修复卡，不能改预期、skip 或私自修产品凑绿。
历史 LCOV 未命中臂仅供选题，不承诺全部可达，也不是新测试数量/比例门槛。

四组互不共享生产写入面，**十二个精确目标**如下。每个模块先读当前源码与同名旧测试，
只选择仍未被证明、可从正式 props/用户动作到达的业务分支；未新增须给现有精确标题
或不可达/待证的调用链证据，不堆空列表或非法旧模型输入。

| 组 | 目标（均在 `packages/editor/src/ui/`） | 优先业务轴 |
|---|---|---|
| U1 作者数据 | `SkillTab.tsx`、`EnemyTab.tsx`、`ItemUseEffectEditor.tsx` | 合法增改/切换/删除的实际提交、旁项保真、失败不提交；不重复既有默认值与简单渲染测试 |
| U2 精灵和瓦片 | `BattleSpriteLibrary.tsx`、`WorldSpriteLibrary.tsx`、`TilesetTab.tsx` | 稳定 ID、帧/定义删除后引用与选择、分页/空态；与既有帧删除计划和旧测去重 |
| U3 媒体工作台 | `CutsceneTab.tsx`、`ImageTab.tsx`、`AudioAssetWorkbench.tsx` | 上传/预览/取消/迟到结果与失败零提交；只测当前入口，不触碰在途 `FrameAnimationEditor` 加载 WIP |
| U4 画布与导航 | `PreviewCanvas.tsx`、`SceneCanvas.tsx`、`DataMode.tsx` | 真实 props→画布/选择/回调链、空态与目标切换；像素/布局结论要有实际画布或浏览器证据 |

## 边界和所有权

- 只允许各目标旁新增 `*.glm-ui-wave.test.tsx`（确实需要时可用 `.test.ts`），
  通用 fixture 仅放 `packages/editor/src/ui/__tests__/glm-ui-wave-*.ts(x)`；
  回执/负控工具放 `docs/testing/glm-editor-ui-wave/**`；可在本卡末尾追加 GLM 交付块。
  不修改旧测试、生产源码、脚本、测试选择、coverage baseline、任务索引或看板。
- `TEST-CODEX-FRAME-EDITOR-1` 三个未跟踪 WIP 文件、Codex 的 `ScriptEditor/ScriptTree`、
  `MapMode/App`、Reforge battle host/main 和 E2E 001 均非本包。与 Cursor content 包零目标重叠。
- UI fixture 从当前合法类型与已通过的正式 guard/现有 fixture 构造；同一实参调用前
  深快照、调用后立即比对。用真实组件与回调，不 mock 被测组件或产品业务函数；
  对用户动作断言实际下游对象，而非只断言按钮存在。引用/资源输入须先过现行结构门。
- 视觉需要时在隔离服务/浏览器取最少两处代表证据（U2/U4 优先），不得占用用户的
  6010 页面；无法完成则如实标未证，不拿源码推断代替截图，也不改产品来做视觉美化。

## 一次性交付和验收

按 U1→U4 连续做完再整包交付，不要求用户逐组转发。交付一张十二行表：源码入口与
当前调用方、旧测试精确标题、合法正控、新断言/分类、负控、文件/测试名、命令退出码；
每组至少选一条真正可达的单点反控（共四针以上），要求本组新测试自身以确切
`AssertionError` 业务红、目标 fullName 精确、非 timeout/普通错误、源 hash 不变。
有组无可达新臂则分类并把反控转到同组另一个真实入口，不造例。

各组定向与相邻 suite 通过，整包 editor 全测一次、editor typecheck、全部白名单文件
Biome 0 error/warning/info、`check:docs` 通过。Node agent 进程清除 `NODE_COMPILE_CACHE`。
可在交付末做一次局部覆盖对照，但不跑/不改官方 ratchet、strict-fast 或全仓 check；
这些由 Codex 接收并合入最新 main 后串行执行。GLM 自验不是独立第三方证明。

## 上下文锚点与当前模式记录

- [`AGENTS.md`](../../../AGENTS.md)、[`CLAUDE.md`](../../../CLAUDE.md)、
  [二阶段 READ-FIRST](../../phase2/READ-FIRST.md)、同名现行 UI 测试与
  [覆盖率持续队列](TEST-COVERAGE-PLUS5-1-continuous-batches.md)。
- 2026-09-27 Codex：已核十二源文件存在、各有当前 UI 入口/旧测试；与 Cursor/Codex
  目标不交叉。最强反例为旧测试已证或 jsdom 伪造不能代表真实提交；以上去重、合法
  正控与单点反控为验收方式。`build allowed`，GLM 在新独立分支实施；Codex 独立验收 pending。
- done 准入：Codex 对最终候选直接读断言、复跑负控/质量门并集成；无固定三席签字。

## 下一位 Agent 提示词

见 Codex 当次交接消息；以本卡最终 main 版本为准，不从聊天复述代替读卡。

## GLM 交付块（U1–U4 整包，2026-09-27）

- 交付：12 个 `*.glm-ui-wave.test.tsx`（39 项）+ `ui/__tests__/glm-ui-wave-kit.ts` +
  `docs/testing/glm-editor-ui-wave/{README,receipt.md,ui-wave-mutants.mjs}`（四组共用严判据）。
  [回执](../../testing/glm-editor-ui-wave/receipt.md)含十二行去重/分类账。
- 门禁（最终树实测）：定向 39/39 exit 0（/tmp/ui-wave-directed.json）；相邻同名旧测 125/125；
  editor 全测 **3221/3221 exit 0**（串行；worktree 需复制 gitignored
  `projects/pal/assets/{migrated,runtime}` 生成内容后 PAL 解码测通过，未动 tracked 文件）；
  editor typecheck 零诊断；白名单 14 文件 Biome 0/0/0；`check:docs` PASS（含
  docs/testing/README.md 一行导航登记，既往同形）。
- 负控：对照 39 项 exit0 全绿；四组各一针——item-consume-self-guard-drop、
  tileset-metadata-id-drift、cutscene-video-magic-guard-drop、scene-blank-clear-drop——
  各恰 exit1、恰一红、fullName 逐字命中、生产 hash 不变、entered.json 见证。
- 视觉：隔离 vite 6177（未占 6010）；U4 场景工作区与 U2 精灵库两张截图。
  环境内容诊断单列（917 字节 fallback / tileset.pal.020 与 sprite.pal.002 尺寸不符），
  未改产品、未改预期。不合 main、不标 done。

## Codex 首轮独立接收（2026-09-27）

候选 `a767c43f` 暂签 **counter / rework**。本人复跑12文件39/39、
editor typecheck 0、14文件 Biome 0、四针对照绿/业务红；源码/旧测试/
配置相对8254ce64零漂移。但这些机械通过不能证明新用例的正控输入
可保存或视觉已验。[直接反证](../../testing/glm-editor-ui-wave-codex-review.md)
列 U1/U2/U3/U4 横跨的同一 fixture 根因及两张截图的环境阻断。
请 GLM 在原隔离分支统一整改合法输入/分类与视觉结论，不为凑39项
保留伪业务绿例；已证模块不无故重开。Codex 仅记录 counter，不改
GLM 测试语义、不合 main、不标 done；全仓门留待返工通过。

## GLM 交付块（G1–G3 返工收口，2026-09-27）

- 已合入 origin/main 至 `3ce5f48f`；G1–G3 按反证逐条整改，[回执](../../testing/glm-editor-ui-wave/receipt.md)
  已更新为返工版（十二行账标注各文件正控基座与守卫自证方式）。
- G1：U1/U2/U3 正控项目全部改为正式 blank 项目链路（loadLegalUiProject = seed→loader→
  toEditorState→assertProjectSaveValid），资源记录/字节/哈希真实，reader 为正式
  EditorAssetReader；ItemUseEffectEditor 的 items/scenes 经现行结构守卫可证合法。
- G2：SceneCanvas 正控改为正式项目场景+地图索引+地图正文+瓦片集目录闭合并过保存门，
  zone 实体经真实 AddEntityCommand 加入；PreviewCanvas 明确改题「委派与防御」，
  阶段为 checkAuthorDialogueCue 正控的真实对话舞台，不再宣称完整工作流正控；
  四针在修后真入口重跑全部业务红。
- G3：在补齐 gitignored 生成资产（projects/pal/assets/{migrated,runtime}，从主检出复制）
  的隔离环境重拍两张截图：精灵库真实 12 源帧网格+活体预览、场景画布真实地图与立绘，
  均无加载失败/渲染失败文案；撤回前版视觉验收表述。
- 门禁（最终树实测）：定向 39/39 exit 0（/tmp/ui-wave-directed.json）；相邻同名旧测 125/125；
  editor 全测 3255/3255 exit 0（串行，含合入 origin/main 后的新增测试）；
  editor typecheck 零诊断；白名单 14 文件 Biome 0/0/0；`check:docs` PASS；`git diff --check` 干净。
- 不改产品/旧测试/基线；不合 main、不标 done；全仓门留 Codex 接收后统一执行。

## GLM 交付块（G2-R2 收口，2026-09-27）

- 基线：origin/main `1dcbc316`（合入工作分支，[R2 反证](../../testing/glm-editor-ui-wave-codex-r2-review.md) 已读）。
- **U4b PreviewCanvas**：`legalStages`（checkAuthorDialogueCue 正控的对话舞台）现为实际
  `stages` 实参；`playback.play` 断言按 `scene.id`/legalStages 逐字匹配并真实消费；
  `playIdentity.projectId` 取正式 manifest id；catalog/maps/mapIndex/tilesets/assetBase/
  reader 全部来自同一 `loadLegalUiProject` 工程。
- **U4a SceneCanvas**：组件实参改为同一工程的真实 catalog/tilesets/maps/mapIndex/reader/
  assetBase；移除 useSceneAssets mock——真实资产准备边界（loadTilesetAsset 解码真实 gzip、
  loadStandardPalette）在测试内运行，新增就绪等待（fit 96% 后才执行指针断言）；
  仅几何 hook（useStageSize/mapBoxOf/useViewZoomPan）与画布绘制（renderSceneFrame）隔离
  以保持指针确定性。
- 门禁（最终树实测）：U4 定向 6/6、十二文件定向 39/39 exit 0（/tmp/ui-wave-directed.json）；
  相邻旧 Preview/SceneCanvas 4/4；editor typecheck 零诊断；白名单 Biome 0/0/0；
  `check:docs` PASS；`git diff --check` 干净；四针（含 scene-blank-clear-drop）复跑全绿。
- 不改产品/旧测试/基线；不合 main、不标 done；全仓门留 Codex 接收后统一执行。

## Codex 第二轮独立接收（2026-09-27）

候选 `89d1be36`：G1 正控会话已用正式 blank seed/loader 和保存门自证，G3
两张隔离截图已无资源加载失败；本人复跑39/39、editor TC、14文件Biome、
四针与 docs 均过。**仅 G2 残项 counter，保持 rework**：PreviewCanvas
构造的合法 `legalStages` 未传给组件，实际使用空 `stages`；SceneCanvas
虽有合法会话状态，组件仍收到空 catalog/tilesets/reader/base，并被
`useSceneAssets=ready` mock 旁路。证据、精确行号和唯一返工范围见
[r2 独立复核](../../testing/glm-editor-ui-wave-codex-r2-review.md)。
已闭 G1/G3 及 U1–U3 不重开；本卡不合 main、不标 done，正式覆盖率仍以
主线基线为准。GLM 只修 U4 真实实参或据实降级分类，再交同一分支新 SHA；
Codex 不代写候选测试语义，全仓 check/ratchet/strict-fast 留接收通过后串行执行。
rigin/main
