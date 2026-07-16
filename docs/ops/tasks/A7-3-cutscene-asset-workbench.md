# A7-3 - 视频与帧动画资源闭包及过场工作台

Status: draft
Phase: phase2
Capability: A7 / R3 / R7 / X3
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Opus + GLM
Visual Verification Owner: Codex + Opus + User
Unavailable Agents: none
Branch: main

## 目标

把当前只读且依赖仓库 `/extracted` 的过场页改造成完整创作工作台：视频和原版 RNG 迁移出的帧动画成为工程内
第一类资产，脚本只按稳定 AssetId 引用；作者可以导入、修改、预览、检查引用和安全删除，并能在中间时间轴逐帧
编辑帧动画。完成后断开外部视频/RNG 目录，HTTP/FSA 工程仍可编辑、保存和运行。

## 范围

- 范围内:
  - `video` 和新版 `frame-animation` 的 catalog、resolver、typed references、文件闭包与 MG2 所有权。
  - PAL 6 个 MP4 与 12 段/1,464 帧 RNG 的确定性物化；20 条 `playRng` 改为稳定 AssetId 命令。
  - TPFS v1 真彩关键帧 + 脏矩形补丁容器、随机 seek、in-flight 缓存和有限 LRU。
  - 作者编辑模型始终是一帧一张完整画布；关键帧/脏矩形/补丁只属于加载与保存 codec，对用户和编辑 API 透明。
  - 量化所需的唯一项目标准颜色表角色；现有 palette 0 消费点统一走该角色，RNG 烘焙后清除非 0 运行依赖。
  - 编辑器左侧视频/帧动画双列表，中间内嵌视频播放器或时间轴编辑器，右侧属性/引用/删除面板。
  - 视频导入、改名、替换、删除；帧动画图片序列导入、量化、逐帧增删替换/复制/重排、时长编辑、保存重开。
  - 被引用资源禁删、未引用资源确认删除；迁移资源首次修改后保持 AssetId 并转 authored。
- 范围外:
  - 完整剧情 NLE、脚本命令时间轴、对白轨、音乐轨和音效轨；这些仍由脚本编辑器编排。
  - 浏览器内视频裁切、拼接、重新编码或从视频自动抽帧。
  - SFX、静态 UI/头像/图标、瓦片/精灵等其他 A7 资源族的完整迁移。
  - 启动商标、splash、opening 和结局的产品流程重排；本卡先登记资产并保证现有/未来调用只走 AssetId。
- 明确不做:
  - 不把 BGM 或音效绑定在视频/帧动画 AssetRecord 中。
  - 不把 `paletteId`、数字视频号、RNG chunk 下标或路径推导带入新 schema。
  - 不保留新旧 RNG 双播放器，不为 `/extracted` 留 fallback。
  - 不把“列表能预览”当完成；创建、修改、引用、删除、保存和运行缺一不可。

## 上下文锚点

- 已拍板决策 / 铁律:
  - `AGENTS.md`:schema、migration、asset pipeline、跨包公共接口必须三签；迁移问题先修上游。
  - `docs/phase2/READ-FIRST.md`:架构优先、稳定 id、第二阶段不保留原版下标身份；一阶段只提供内容/UX 经验。
  - 用户 2026-07-16 明确要求三栏工作台、左侧双列表、中间内嵌播放器、右侧属性/引用/删除、RNG 时间轴、
    自定义导入编辑和 palette 0 量化，并追加视频/RNG 工程自包含。
  - `docs/phase2/foundation/x-shell-audit.md:293`:D22 已定 RNG 迁移为真彩序列帧第一类资产，脚本使用稳定动画 id；
    全帧还是补丁必须以真实体积实测决定。
  - `docs/phase2/foundation/a7-resource-closure-audit.md:35-52,398-404`:工程资源必须自包含；RNG/视频归 A7-3，
    唯一颜色表只能作为运行角色，内容/UI 不出现 paletteId。
- 代码锚点(`file:line`):
  - `packages/editor/src/ui/CutsceneTab.tsx:20-118`:硬编码 6 视频、裸 fetch RNG、全屏预览、无 inspector/CRUD。
  - `packages/content/src/script.ts:66-72`:`playVideo.videoId` 与 `playRng.chunkIdx` 仍使用数字身份。
  - `packages/reforge/src/main.ts:1772-1793`:视频/RNG 仍拼 `/extracted`，RNG 播放时读取非 0 调色板。
  - `packages/reforge/src/rng-player.ts:18-66`:硬编码 `RNG_PALETTE`、外部 `.rle` 与全量解码。
  - `packages/content/src/asset.ts:7-58,242-410`:已有 video/rng kind，但 catalog 是单文件记录；引用 walker 只覆盖音乐。
  - `packages/editor/src/core/commands.ts:1751-1873`:资源命令只适配单二进制音乐，标签仍写“改音乐名”。
  - `packages/editor/src/core/edit-session.ts:43-46,213-219`:assetBlobs/删除路径未覆盖帧动画草稿和重编码事务。
  - `packages/migrate/src/translate-events.ts:950-960`:0x36/0x37 当前产出数字 `playRng`。
  - `packages/pal-extract/src/cli.ts:412-447`:12 段 RNG 提取输入与 1,464 帧清单。
  - `packages/pal-extract/scripts/extract-videos.ts`:6 个 AVI 确定性转 H.264/AAC MP4。
- 已知坑 / 审计文档:
  - [`cutscene-asset-workbench-design.md`](../../phase2/editor/cutscene-asset-workbench-design.md):完整数据模型、UI 和分期。
  - 真实体积审计:当前 RLE 3,970,927 B；完整 RGBA PNG 100,075,957 B；连续补丁 29,746,679 B；
    每 32 帧关键帧方案 31,525,705 B。选择后者，随机 seek 最多回放 31 个补丁。
  - 20 条 RNG 调用只有部分紧邻音乐，且同一动画会分段插入不同音效/对白；BGM 属脚本编排，不能绑资产。
  - 6 个 MP4 全部已有 AAC 音轨；视频资产不需要外接 BGM 字段。
  - `packages/game/src/shell/rng-player.ts` 历史教训:缓存必须在 await 前保存 Promise，避免 O(N^2) 重解码。
  - 编辑器 410 帧时间轴必须虚拟化；逐帧操作不得复制整份约 30 MB 容器进入每条 undo。
- 不得重新引入:
  - `rng` 作者资产 kind、`playRng`、`chunkIdx`、`videoId`、`rngPaletteId`、数字补零路径。
  - 运行时/编辑器 `/extracted/videos`、`/extracted/data/animation`、`rng-frames.json` 裸读取。
  - 调色板选择器、任意 palette id、运行时索引帧 + 活调色板。
  - 在作者草稿、编辑命令或 UI 中暴露关键帧、脏矩形、补丁依赖等存储实现。
  - 迁移资源“只读”特判；作者修改必须转 authored 并受 MG2 保护。
- 相关测试:
  - `packages/content/src/asset.test.ts`:kind/role/reference/file closure 基线。
  - `packages/reforge/src/rng-player.test.ts`、`script-runner.test.ts`:播放器、分段与 host 调用基线。
  - `packages/editor/src/core/commands.test.ts`、`project-io.test.ts`:undo/redo、二进制保存与删除基线。
  - `packages/migrate/src/pal-migration-integration.test.ts`:真实 PAL、MG2、闭包和双跑零计划。

## 验收条件

- 功能:
  - PAL catalog 精确新增 6 个 `video.pal.*`、12 个 `frame-animation.pal.*` 与唯一标准颜色表角色。
  - 20 条 PAL RNG 命令全部改为 `playFrameAnimation.asset`，9 个动画被引用、3 个未引用；无缺失/kind mismatch。
  - 运行时与编辑器不再读取外部视频/RNG 路径；AssetId 只经 AssetResolver 到工程文件。
  - 视频在中间黑底面板使用原生 controls 播放，不覆盖编辑器全屏；游戏运行时仍可使用全屏 Cinematic Layer。
  - 帧动画可以新建图片序列、预览量化结果、逐帧编辑、撤销/重做、保存重开并被脚本播放。
  - 时间轴和编辑 API 只呈现完整帧；加载自动合成，保存自动压缩，用户无需选择或维护脏矩形/补丁。
  - 右侧显示名称、AssetId、来源、路径、大小、分辨率、时长/帧数、音轨、引用与诊断。
  - 被引用项删除按钮禁用并列出引用；未引用项确认后删除记录和文件；替换保持 AssetId。
  - 修改任一 PAL 视频/动画后重迁仍指向 authored 文件，作者内容不被覆盖。
- 测试:
  - TPFS parser/encoder 对非法魔数、版本、越界、重叠、坏尺寸、首帧非关键帧 fail-loud。
  - 完整帧作者模型经过加载、任意单帧修改、保存和重开后逐像素一致；codec 存储结构不会泄漏进草稿/命令/UI。
  - 12 段 TPFS 顺序播放和随机 seek 与迁移期 RGBA 逐像素一致；1,464 帧数精确。
  - `playFrameAnimation` 覆盖全段/分段/不同 frameRate/异常加载/跳过/末帧保持；Promise 缓存无并发重复解码。
  - typed walker 精确收集视频/帧动画嵌套脚本引用；kind 错、缺 id、受引用删除均有测试。
  - 视频与帧动画新增、改名、替换、删除、量化、重排、保存重开和 undo/redo 有逻辑测试。
  - MG2 作者替换保护和连续两次迁移第二次 `writes=0 deletes=0 conflicts=0`。
  - 静态扫描 `/extracted/videos`、`/extracted/data/animation`、`playRng`、`chunkIdx`、`videoId` 在目标包归零。
  - `pnpm check`、editor/reforge build 全绿；迁移体积门禁继续成立。
- 文档:
  - 更新 content schema、A7 闭包审计、asset pipeline、脚本命令、编辑器设计和 capability-map 实际状态。
  - 记录 TPFS v1 格式、关键帧间隔实测、颜色处理边界、PAL 资源映射与版权/来源口径。
- 视觉 / 手工验证:
  - 6010 桌面与窄视口检查左侧双列表、中间播放器/时间轴、右栏长文本、面板拖动/折叠、空态和错误态。
  - 6010 导入一段自有图片序列，对比原色/标准色量化，编辑帧后保存重开结果不变。
  - 6010 选中有引用/无引用视频与动画，引用提示、禁删/确认删除和打开脚本行为正确。
  - 6051 播放代表性全段、分段、不同 frameRate、对白叠层和 MP4 音轨；结束后无残留画面/音频/DOM。
  - 临时断开外部视频/RNG 目录后，HTTP 与 FSA 工程仍能完成上述流程。

## 推进签字

签字是阶段门禁。开卡任务必须集齐三方签字才能推进；缺签只能由用户明确豁免。`Status` 字段不能替代签字。

### 进入 build 前:设计签字

- Codex: **agree（2026-07-16）**。现页是外部迁移产物浏览器，不具备资源闭包和作者生命周期。建议以稳定
  `video/frame-animation` AssetId、TPFS 真彩关键帧补丁容器、脚本编排分离和三栏工作台一次闭环。真实数据实测
  每 32 帧关键帧方案约 30.07 MB，远低于完整 PNG 的 100.08 MB；BGM/SFX 应留在脚本层。palette 0 只作为
  作者导入的“工程标准色彩”，不进入内容或运行时参数。
- Opus: pending
- GLM: pending
- counter / 分歧处理: pending
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

完整方案见 [`docs/phase2/editor/cutscene-asset-workbench-design.md`](../../phase2/editor/cutscene-asset-workbench-design.md)。

实现按 A7-3A 契约/颜色表依赖、A7-3B PAL 迁移/运行时、A7-3C 编辑器工作台、A7-3D 断外链验收四段推进；
四段共用本卡，任何一段完成都不能单独标 done。

### 已知风险

- 风险:任务跨 content/reforge/editor/migrate 四包且包含新二进制容器。
  - 缓解:先锁纯契约和逐像素 codec 测试，再接迁移和 UI；每段都有独立退出门禁。
- 风险:410 帧时间轴造成 DOM、ImageBitmap 和 undo 内存膨胀。
  - 缓解:虚拟化时间轴、关键帧随机 seek、有限 LRU、结构共享草稿、Worker 重编码；禁止每命令复制整容器。
- 风险:把原版所有 RNG 强制量化到 palette 0 会改色。
  - 缓解:迁移用每段已考证静态颜色表烘焙；palette 0 量化只用于作者导入的“工程标准色彩”选项。
- 风险:标准颜色表仍在 legacy，断开外部目录后导入失败。
  - 缓解:A7-3A 先完成唯一颜色表角色和全部 palette 0 消费点迁移，再删除 legacy color-table family。
- 风险:作者替换被 MG2 重新迁移覆盖。
  - 缓解:沿用 A7-0 AssetId + origin 所有权，增加视频/动画逐资源保护和双跑测试。

### 主审立场

- Reviewer: Opus
- 结论: pending
- 必改项: pending
- 是否建议进入 build: pending

### 三方争议记录(按需)

- Codex: agree，见设计签字。
- Opus: pending
- GLM: pending
- 用户拍板:用户已明确要求本卡的工作台布局、创作闭环、RNG 时间轴/量化，以及视频/RNG 工程自包含；
  具体容器、BGM 分层和实现分期由三方审查。

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
- 实现摘要: pending
- 运行命令: pending
- 浏览器 / 手工检查: pending
- 跳过的检查及原因: pending

## 资源生成记录(如适用)

- Generation Owner: N/A
- 生成目的 / 替换对象:本卡迁移本地合法原始数据，不做 AI 生图或发布素材替换。
- 提示词要点 / 风格约束: N/A
- 输出路径: pending
- 尺寸 / 格式 / 透明背景 / 调色约束:TPFS 真彩 320 x 200；作者输入按向导设置。
- 资源登记位置: `assets/index.json`
- 验证方式:逐像素 codec、闭包和浏览器播放。

## 视觉验证记录(如适用)

- Visual Verification Owner: Codex + Opus + User
- 验证方式: pending
- 截图 / 像素检查路径: pending
- 结论: pending
- 未完成项: pending

## Review: 审查与返工

- Reviewer: Opus + GLM
- 审查结论: pending
- 必须返工项: pending
- Accept / rework: pending

## 用户验收

- 用户结论: pending
- 后续任务: pending

## 交接日志

- 2026-07-16 Codex: 完成现状、脚本关系、视频音轨和 1,464 帧编码体积审计；起草 TPFS、资源闭包、
  三栏工作台、时间轴和测试矩阵并签 agree。Evidence: 本卡与设计文档。Next: Opus 做架构/性能/UX 设计主审；
  build 三签未齐，不得开始实现。
- 2026-07-16 User/Codex: 明确帧动画的作者语义必须是一帧一张完整画布；关键帧、脏矩形和补丁仅用于
  加载/保存压缩，对用户完全透明。已补入设计、验收和主审清单。Next: Opus 复核分层边界。

## 下一位 Agent 提示词

```text
接手任务:A7-3 视频与帧动画资源闭包及过场工作台,设计主审(Opus)
任务卡:docs/ops/tasks/A7-3-cutscene-asset-workbench.md
设计文档:docs/phase2/editor/cutscene-asset-workbench-design.md
当前状态:draft;Codex 已签 agree,Opus/GLM pending;build 准入 blocked,不得开始实现
你的角色:Opus,架构/schema/跨包/性能/复杂 UX 主审
先读:AGENTS.md、docs/phase2/READ-FIRST.md、本卡全部、设计文档、docs/phase2/foundation/a7-resource-closure-audit.md:35-52/398-404、docs/phase2/foundation/x-shell-audit.md:268-295、packages/editor/src/ui/CutsceneTab.tsx、packages/content/src/asset.ts:7-58/242-410、packages/content/src/script.ts:59-73、packages/reforge/src/rng-player.ts、packages/editor/src/core/edit-session.ts:43-46/213-219
已完成:确认当前页无 CRUD/inspector/工程闭包;PAL 有 6 个 H.264+AAC MP4、12 段1,464帧RNG、20条RNG调用且音乐/音效/对白为脚本编排;实测完整RGBA PNG=100,075,957B、连续补丁=29,746,679B、32帧关键帧方案=31,525,705B;Codex 提案 TPFS 单文件+稳定AssetId+脚本分层+三栏工作台
请重点审:
1. `video` / `frame-animation` 作者模型与 `playVideo.asset` / `playFrameAnimation.asset` 是否足够干净,是否仍有数字/路径双轨;
2. TPFS v1 的关键帧+PNG补丁、32帧间隔、随机seek、LRU/in-flight缓存与坏容器校验是否可落地;
3. 编辑器是否始终只暴露完整帧语义,TPFS关键帧/脏矩形/补丁仅由加载/保存codec处理;结构共享undo、
   Worker重编码和保存事务能否在不泄漏压缩概念的前提下避免每步复制30MB容器;
4. palette 0 仅作为作者导入的“工程标准色彩”,原版迁移按每段正确静态颜色烘焙,内容/运行时零paletteId的边界;
5. BGM/SFX留在脚本层而非绑定资产是否成立,引用面板显示邻近编排是否会误导;
6. 左双列表/中播放器或时间轴/右属性引用删除的UX闭环,以及视频只替换不做浏览器NLE的范围是否合理;
7. A7-3A/B/C/D 分期是否仍过大,若 counter 请给能保持最终闭环的替代切法和明确退出条件。
不要做:不得修改实现文件;不得把任务标 build/done;不要恢复原版RLE运行时、palette选择器或外部路径fallback
输出要求:在任务卡 Opus 设计签字行写 agree 或 counter+替代方案,补主审立场与交接日志并提交;agree 后把下一位 Agent 提示词改为 GLM 做迁移覆盖/测试矩阵复核
```
