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
- Opus: **agree（2026-07-16,附 R1-R3 必改 + S1-S2 建议,见主审立场）**。七问压力测试全过,独立地面重验:
  **20 条 playRng 站点、引用段 [0,1,2,3,4,5,7,8,9]=9 段、未引用 [6,10,11]=3 段、产物零 playVideo、
  12 个 RLE 总字节 3,970,927、6 个 MP4 约 20MB——逐项精确吻合**;script.ts:66-72 现状(playVideo.videoId
  数字 + playRng.chunkIdx/speed/startFrame/endFrame)坐实,新命令的 startFrame/endFrame/frameRate 与现状
  分段语义一一对应(段寻址是资产内坐标非身份,合规);**rng-player.ts:24 `RNG_PALETTE={3:2,6:3,7:6}`
  与设计"3/6/7 段各用考证颜色表、其余标准表"精确对应**——迁移烘焙的颜色真值有代码实锚,不是凭空断言。
  裁定:作者模型二分(video/frame-animation)+ `rng` 只留 legacy 术语,干净;TPFS 32 帧关键帧折中
  (+1.78MB 换随机 seek ≤31 补丁)工程上成立且有 in-flight Promise 缓存的一阶段 O(N²) 教训锚;
  完整帧作者语义 × codec 分层是用户 2026-07-16 拍板的正确抽象;BGM/SFX 留脚本层有硬数据支撑
  (20 条调用音乐/音效/对白交错编排,同段分段插不同音效——绑资产即事实性错误;MP4 自带 AAC);
  颜色边界(标准色仅作者导入量化/迁移按段烘焙/零 paletteId)与 no-palette 既定方针一致;三栏/时间轴
  /引用删除闭环沿用 A7-0/0A 已验证的 catalog+typed references 机制;视频只替换不做浏览器 NLE 范围
  正确。分期裁定:A7-3A→D 四段一卡**不再切**——拆卡必留半迁移双轨态(命令改了运行时没接/迁了资产
  编辑器缺失),四段各有退出门禁 + 单一 done 闸即可,但 build 须按段落证据块记录(见 R 后注)。
- GLM: **agree（2026-07-16;附 G1-G2 build 必落范围澄清,见下）**。七项独立实测逐条：

  **(1) 普查对账（独立重扫）** ✅：
  - playRng **20** / 引用段 **[0,1,2,3,4,5,7,8,9]=9** / 未引用 **[6,10,11]=3** / playVideo **0** / playFrameAnimation **0**——逐项精确匹配。per-chunk 用量 `{0:1,1:6,2:1,3:1,4:2,5:1,7:1,8:1,9:6}`。✅
  - 12 RLE 总 **3,970,927 B**（最大 rng-09 1,154,187B / 最小 rng-10 25,309B）。✅
  - rng-frames.json **1,464 帧**（per-chunk: 0:64/1:410/2:93/3:140/4:40/5:82/6:54/7:70/8:33/9:256/10:42/11:180；chunk 1 的 410 帧 = 虚拟化目标）。✅
  - 6 MP4 全 H.264+AAC 288×180（总 ~20.4MB，mono/stereo 混合但运行时透传不影响）。✅

  **(2) 体积实测复核** ✅：
  - 每帧 RGBA = 320×200×4 = **256,000B（250KB）**；全量未压缩 = ~357MB（与 Opus R3 "~375MB 不可接受"自洽，数量级正确）。✅
  - 三方案实测一致：Full RGBA PNG 100,075,957B / 连续补丁 29,746,679B / 32 帧 keyframe 31,525,705B（+1,778,026B ≈ +1.78MB）。✅
  - keyframe 数 = (1464+31)//32 = 46；32 帧间隔 +1.78MB 换随机 seek ≤31 补丁——工程折中成立。✅

  **(3) R1-R3 测试形态** ✅（每条可落）：
  - **R1 TPFS 坏容器七类 fail-loud**：魔数/版本/越界/重叠/坏尺寸/首帧非关键帧/端序错——表驱动，每类构造 fixture + expect throw。设计 §4.2 已列约束面。✅
  - **R2 编码确定性分径**：迁移侧（Node）TPFS 编码字节确定性 = 同输入双跑同字节（MG2 双跑零计划前提）；编辑器侧（浏览器 convertToBlob）PNG 非确定 → **保存事务只重编码被修改的动画，未修改资产零重写**。两条路径分别声明 + 各自测试行。✅
  - **R3 内存上界**：全量解码 ~357MB 不可接受 → 惰性 TPFS 帧句柄（按需合成）+ 可见区缩略图 + 合成帧 LRU ≤64 帧（~16MB）+ undo 结构共享（已编辑帧持位图/未编辑帧持容器引用）。410 帧段打开/滚动/编辑的内存上界断言 = 性能测试或手测记录（设计 §6.3 虚拟化）。✅

  **(4) 迁移矩阵** ✅：
  - **12 段颜色表映射**：`RNG_PALETTE={3:2,6:3,7:6}`（rng-player.ts:24 实锚）→ 迁移按段烘焙考证颜色表（3/6/7 各用对应表，其余标准表 0）；S2 要求入迁移报告。✅
  - **20 条命令改写**：translate-events:950-960 `0x36` 设 lastRngChunk + `0x37` emit playRng(chunkIdx/speed/startFrame/endFrame) → playFrameAnimation(asset=frame-animation.pal.NNN/frameRate/start·endFrame 保留)。✅
  - **6 视频物化不转码**：6 MP4 原样进 assets/migrated/video/。✅
  - **legacy families 退出顺序**：rng/video/color-table 依赖 A7-3A 颜色表角色先行（palette 0 消费点全迁移后才退 legacy）。✅

  **(5) MG2 面** ✅：
  - 视频/动画作者替换转 authored（origin 所有权 + AssetId key merge，与 A7-0 catalog 同构）+ 双跑零计划专测。✅
  - 未引用 3 段 + 6 个零引用视频按 **unused warning 不按 error**（与 A7-0 13 unused 同口径）。✅

  **(6) 静态扫描面 + 分期门禁** ✅：
  - 归零清单：`/extracted/videos`、`/extracted/data/animation`、`playRng`、`chunkIdx`、`videoId`、`rngPaletteId` 在 content/reforge/editor 目标包归零。**当前基线 126 处**（含 4 个 rng-frames.json consumer + 2 个 rng-player.ts + CutsceneTab）。✅
  - **A7-3A/B/C/D 各段退出条件可独立验证**：A（契约+颜色表依赖+TPFS codec）/B（PAL 迁移+运行时+MG2）/C（编辑器工作台+时间轴）/D（断外链验收）——每段有独立门禁，build 分段证据块（Opus 七问第 7 条）。✅

  **(7) RNG_PALETTE + translate-events 实锚确认** ✅（见 (1)(4)）。

  **总结**：普查全精确匹配（20/9/3/0/3970927B/1464帧/6MP4 AAC）；体积自洽（256KB/帧 × 1464 ≈ 357MB / 三方案 / +1.78MB 折中）；R1-R3 测试形态全可落；迁移矩阵（颜色表/命令改写/视频物化/legacy 退出顺序）全确认；MG2 + 静态扫描 + 分期门禁全可落。**agree**。

  **G1-G2 build 必落范围澄清（非阻塞，纳入 build 范围）**：
  - **G1（build 必落，关键）**：**chunk 6 是 trademark-fallback 路径**——`packages/game/src/shell/rng-player.ts` bootstrap `PAL_RNGPlay(6,0,-1,25)`。内容脚本普查显示"未引用"但 DOS 启动路径会到达。A7-3D 断外链后此 bootstrap consumer 必须已迁移（或 trademark fallback 已退役），否则商标屏可能断。**build 时确认 chunk 6 的 bootstrap 路径归属 A7-3B 或显式退役。**
  - **G2（非阻塞）**：静态扫描归零基线 126 处——确认 4 个 rng-frames.json consumer + 2 个 rng-player.ts + CutsceneTab 显式分配到 A7-3B/C/D 子任务，防遗漏。

- counter / 分歧处理: Opus 无架构 counter;R1-R3 为设计必补,GLM 无 counter(标 G1-G2 build 必落)。chunk 6 trademark-fallback（G1）是 build 必落关键确认项——普查"未引用"不等于"无运行时消费"（与 A7-0A 标题菜单音乐同方法论教训：站点普查≠需求普查）。
- 缺签豁免: N/A
- build 准入结论: **三签齐（Codex agree + Opus agree + GLM agree），build allowed。** R1-R3 必改 + S1-S2 + G1(chunk 6 trademark-fallback 确认/迁移)+ G2(静态扫描 126 处分配确认)纳入 build 范围。交 Codex 按 A7-3A→D 分段 build。

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
- 结论(Opus,2026-07-16): **agree — 七问逐项裁定**:
  1. **作者模型/命令**:成立。video/frame-animation 二分、`rng` 只留迁移术语;`playFrameAnimation.asset`
     +startFrame/endFrame/frameRate 与现状 playRng 分段语义一一映射(段号是资产内坐标非身份);
     videoId/chunkIdx/路径推导全退役,零双轨。
  2. **TPFS 可落地**:成立。32 帧关键帧 vs 连续补丁只差 +1.78MB(实测表)换 seek ≤31 补丁;魔数/版本/
     越界/重叠/首帧非关键帧 fail-loud 校验面完整;in-flight Promise 缓存有一阶段 O(N²) 历史教训锚。
     细节须钉死(R1)。
  3. **完整帧语义 × codec 分层**:成立(用户拍板)。结构共享 undo 与 Worker 重编码方向对,但内存预算
     必须硬化(R3),编码确定性必须分径声明(R2)。
  4. **颜色边界**:成立。`RNG_PALETTE={3:2,6:3,7:6}`(rng-player.ts:24)实锚"3/6/7 各用考证表";
     标准色仅作者导入量化、UI 零颜色表编号、量化输出真彩、运行时零 paletteId——与 no-palette 方针
     及 A7-0 color-table 唯一角色路线一致;A7-3A 先迁 palette 0 消费点再退 legacy 顺序正确。
  5. **BGM/SFX 分层**:成立且有硬数据(20 条调用交错编排/分段异音效/MP4 自带 AAC);引用面板的邻近
     编排只作提示且明确标注,不入资产,误导风险可控。
  6. **UX 闭环/范围**:成立。三栏/双列表/内嵌播放器(修正现有 fixed 全屏覆盖 bug)/虚拟化时间轴/
     导入向导/引用删除面板均沿用已验证机制;视频只替换不做浏览器 NLE 正确划界。
  7. **分期**:四段一卡不再切(拆卡必留半迁移双轨),但 **build 须按 A7-3A/B/C/D 分段记录证据块**
     (各段命令/测试/门禁独立可查),实现审查按段核对。
- 必改项(R,设计层面补明,build 必落):
  - **R1 TPFS 规格细节钉死**(随验收"记录 TPFS v1 格式"一并落):(a) 索引长度前缀的整数宽度与端序
    (建议 u32 LE);(b) **补丁合成语义 = 不透明矩形替换**(putImageData 式,非 alpha 混合)——补丁 PNG
    含 alpha 时的行为必须定义为"忽略 alpha 全量替换"或迁移/保存期强制 alpha=255,二选一钉死;
    (c) 帧时长优先链:命令 `frameRate` 存在 ⇒ 覆盖全段;否则 `frame.durationMs ?? defaultFrameMs`;
    (d) PNG 色型固定 RGBA8。缺一即 codec 测试无法钉逐像素契约。
  - **R2 编码确定性分径**:迁移侧(Node)TPFS 编码必须**字节确定性**(固定编码器与参数)——这是 MG2
    双跑零计划的前提;编辑器侧(浏览器 convertToBlob)PNG 字节天然不确定,故**保存事务只重编码被修改
    的动画,未修改资产零重写**(防哈希漂移与假 diff)。两条路径在设计/测试中分别声明与验证。
  - **R3 内存预算硬化**:1,464 帧 × 320×200 RGBA ≈ 每帧 256KB,全量解码 ≈ **375MB,不可接受**。
    钉死:打开动画**不做全量解码**——草稿帧引用 = 惰性 TPFS 帧句柄(按需合成);时间轴缩略图仅可见区
    生成;合成帧 LRU 上限显式(建议 ≤64 帧 ≈ 16MB 级);undo 结构共享 = 已编辑帧持位图、未编辑帧持
    容器引用。"延迟解码只是内存优化"的说法降级了它——它是**硬约束**,验收须含 410 帧段打开/滚动/
    编辑的内存上界断言(性能测试或手测记录)。
- 建议项(S,不阻塞):
  - S1 `playFrameAnimation` 区间越界(startFrame/endFrame 超帧数、start>end)的 validator+runtime
    行为(fail-loud vs clamp)钉一条并入测试矩阵(现验收"异常加载/跳过/末帧保持"未点名区间越界)。
  - S2 迁移报告记录每段所用颜色表({3:2,6:3,7:6} 与其余=标准表),供 GLM/后人对账,防考证结论口传失真。
- 是否建议进入 build: **待 GLM 复核(迁移覆盖/体积复测/测试矩阵);R1-R3 纳入 build 范围后 build**。

### 三方争议记录(按需)

- Codex: agree，见设计签字。
- Opus: **agree**。七问全立(作者模型零双轨/TPFS 折中有实测表/完整帧×codec 分层守用户拍板/颜色边界
  有 RNG_PALETTE 代码实锚/BGM 分层有 20 站点编排硬数据/UX 沿已验证机制/四段一卡不再切);
  普查独立坐实(20 站点/9 用 3 空/零 playVideo/RLE 3,970,927B)。附 R1(TPFS 端序·补丁替换语义·
  时长优先链·色型)/R2(迁移侧字节确定性 vs 编辑器只重编码已修改资产)/R3(内存预算硬化:惰性帧句柄+
  LRU 上限+按可见区缩略图,全量解码 375MB 不可接受)+S1-S2。
- GLM: **agree**。普查全精确匹配(20 playRng/9引用[0-5,7-9]/3未引用[6,10,11]/0 playVideo/12RLE 3970927B/1464帧/6MP4全AAC)；体积自洽(256KB/帧×1464≈357MB/三方案/+1.78MB折中)；R1-R3测试形态全可落(TPFS七类fail-loud/确定性分径/内存上界)；迁移矩阵全确认({3:2,6:3,7:6}实锚/20条改写/6视频物化/legacy退出顺序)；MG2+静态扫描+分期门禁全可落。**G1关键: chunk 6 trademark-fallback(game/shell/rng-player.ts bootstrap)内容脚本普查"未引用"但DOS启动路径到达——build必落确认迁移或退役,与A7-0A同方法论教训(站点普查≠需求普查)**。G2静态扫描126处分配确认。非阻塞。
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
- 2026-07-16 Opus: 设计主审签 **agree + R1-R3 必改 + S1-S2 建议**。独立地面重验:20 条 playRng/
  引用段 [0,1,2,3,4,5,7,8,9]/未引用 [6,10,11]/零 playVideo/12 RLE 共 3,970,927B/6 MP4 约 20MB
  逐项精确吻合;`RNG_PALETTE={3:2,6:3,7:6}`(rng-player.ts:24)为"3/6/7 段各用考证表"提供代码实锚;
  script.ts 现状(videoId 数字/chunkIdx+speed+start/endFrame)与新命令一一映射。七问全立:作者模型
  零双轨/TPFS 折中有实测表且校验面完整/完整帧×codec 分层守用户拍板/颜色边界合 no-palette 方针/
  BGM 分层有编排硬数据/UX 沿已验证机制/四段一卡不再切但 build 分段证据块。R1=TPFS 规格细节钉死
  (索引前缀端序·补丁=不透明替换语义·时长优先链·RGBA8);R2=编码确定性分径(迁移 Node 字节确定 vs
  编辑器只重编码已修改资产,防哈希漂移);R3=内存预算硬化(全量解码≈375MB 不可接受——惰性帧句柄/
  可见区缩略图/LRU 上限/undo 仅已编辑帧持位图,并入验收内存上界断言)。Evidence: 主审立场+普查
  脚本输出。Next: GLM 迁移覆盖/体积复测/测试矩阵复核;三签齐后 Codex 按 A7-3A→D 分段 build;
  不得抢跑实现。未改实现文件。
- 2026-07-16 GLM: 设计复核签 **agree**。七项独立实测：(1)普查 20 playRng/引用[0-5,7-9]=9/未引用[6,10,11]=3/0 playVideo/12RLE 3970927B/1464帧(rng-frames.json per-chunk 0:64..11:180,chunk1=410虚拟化目标)/6MP4全H264+AAC 288×180 ~20.4MB——逐项精确。(2)体积 256KB/帧×1464≈357MB未压缩(与Opus R3 ~375MB自洽),三方案100075957/29746679/31525705B实测一致,+1.78MB换≤31补丁seek成立。(3)R1 TPFS七类fail-loud表驱动/R2迁移Node字节确定性vs编辑器只重编码已修改/R3惰性帧句柄+LRU≤64+可见区缩略图内存上界。(4)迁移 RNG_PALETTE{3:2,6:3,7:6}实锚(rng-player.ts:24),translate-events:950-960 0x36/0x37 chunkIdx→asset/speed→frameRate,6视频物化不转码,legacy退出依赖A7-3A颜色表先行。(5)MG2 authored替换+双跑零计划/unused warning不error。(6)静态扫描归零基线126处/分期A-D各段独立门禁。**G1关键:chunk 6 trademark-fallback(game/shell bootstrap PAL_RNGPlay(6,0,-1,25))内容脚本"未引用"但DOS启动到达——与A7-0A标题菜单同方法论(站点普查≠需求普查),build必落确认迁移或退役**。G2静态126处分配确认。Evidence: 设计签字GLM行。Next: 三签齐已build allowed,交Codex按A7-3A→D分段build。未改实现文件。

## 下一位 Agent 提示词

```text
接手任务:A7-3 视频与帧动画资源闭包及过场工作台,迁移覆盖/测试矩阵复核(GLM)
任务卡:docs/ops/tasks/A7-3-cutscene-asset-workbench.md
设计文档:docs/phase2/editor/cutscene-asset-workbench-design.md
当前状态:draft;Codex agree + Opus agree(附 R1-R3 必改 + S1-S2),GLM pending(设计最后一签);build 准入 blocked
你的角色:GLM,迁移覆盖面/体积/测试矩阵复核;只改任务卡,不得改实现文件
先读:AGENTS.md、docs/phase2/READ-FIRST.md、本卡全部(重点 Opus 主审立场 R1-R3)、设计文档 §2/§4/§5/§9、packages/pal-extract/src/cli.ts:412-447、packages/migrate/src/translate-events.ts:950-960
请重点复核(数据/测试面,与 Opus 的架构/性能/UX 面互补):
1. 普查对账:用独立脚本重扫——20 条 playRng/引用段 [0,1,2,3,4,5,7,8,9]/未引用 [6,10,11]/产物零 playVideo/12 RLE 总 3,970,927B/1,464 帧数(rng-frames.json 清单核对)/6 MP4 音轨确认;
2. 体积实测复核:三方案数字(100,075,957/29,746,679/31,525,705)可复算或抽样验证(至少复算 1-2 段),32 帧间隔 +1.78MB 结论成立;
3. R1-R3 测试形态:TPFS 坏容器七类 fail-loud(魔数/版本/越界/重叠/坏尺寸/首帧非关键帧/端序错)表驱动;迁移侧字节确定性(同输入双跑同字节)与编辑器"未修改零重写"各自的测试行;内存上界断言(410 帧段打开/滚动/编辑)落在哪一层(自动 or 手测记录);
4. 迁移矩阵:12 段颜色表映射({3:2,6:3,7:6}+其余标准表,S2 要求入迁移报告)、20 条命令改写(chunkIdx→AssetId/speed→frameRate/start·endFrame 保留)、6 视频物化不转码、legacy families 退出(rng/video/color-table 顺序依赖 A7-3A 颜色角色先行);
5. MG2 面:视频/动画作者替换转 authored+双跑零计划专测;未引用 3 段与 6 个零引用视频按 unused warning 不按 error;
6. 静态扫描面:/extracted/videos、/extracted/data/animation、playRng、chunkIdx、videoId、rngPaletteId 目标包归零清单;
7. 分期门禁:A7-3A/B/C/D 各段退出条件是否可独立验证,build 分段证据块要求(Opus 七问第 7 条)可执行。
不要做:不得修改实现文件;不得把任务标 build/done;不要恢复原版 RLE 运行时、palette 选择器或外部路径 fallback
输出要求:在本卡 GLM 设计签字行写 agree 或 counter+理由,补交接日志并提交;三签齐后 build 准入结论改 allowed(R1-R3+S1-S2 纳入 build 范围),交 Codex 按 A7-3A→D 分段 build
```
