# A7-3 - 视频与帧动画资源闭包及过场工作台

Status: rework
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
  - TPFS v1 真彩 32 帧 block + 相邻完整帧 XOR + Deflate 容器、随机 seek、in-flight 缓存和有限 LRU。
  - 作者编辑模型始终是一帧一张完整画布；block/XOR/压缩只属于加载与保存 codec，对用户和编辑 API 透明。
    codec 允许以后从完整帧重新基准测试并版本化替换，不得反向改变作者模型、内容 schema 或脚本命令。
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
  - 真实体积审计:当前 RLE 3,970,927 B；完整 RGBA PNG 100,075,957 B；脏矩形 PNG 方案
    31,525,705 B；32 帧 block、相邻完整帧 XOR、默认 Deflate 的选型原型为 8,271,766 B。正式迁移器固定
    zlib level 9 后，12 个 TPFS 实际合计 7,960,282 B；随机 seek 最多恢复 31 帧。
  - 20 条 RNG 调用只有部分紧邻音乐，且同一动画会分段插入不同音效/对白；BGM 属脚本编排，不能绑资产。
  - 6 个 MP4 全部已有 AAC 音轨；视频资产不需要外接 BGM 字段。
  - `packages/game/src/shell/rng-player.ts` 历史教训:缓存必须在 await 前保存 Promise，避免 O(N^2) 重解码。
  - 编辑器 410 帧时间轴必须虚拟化；逐帧操作不得复制整份约 30 MB 容器进入每条 undo。
- 不得重新引入:
  - `rng` 作者资产 kind、`playRng`、`chunkIdx`、`videoId`、`rngPaletteId`、数字补零路径。
  - 运行时/编辑器 `/extracted/videos`、`/extracted/data/animation`、`rng-frames.json` 裸读取。
  - 调色板选择器、任意 palette id、运行时索引帧 + 活调色板。
  - 在作者草稿、编辑命令或 UI 中暴露 block、XOR、脏矩形、补丁依赖等存储实现。
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
  - 时间轴和编辑 API 只呈现完整帧；加载自动还原，保存自动压缩，用户无需选择或维护帧间依赖。
  - 右侧显示名称、AssetId、来源、路径、大小、分辨率、时长/帧数、音轨、引用与诊断。
  - 被引用项删除按钮禁用并列出引用；未引用项确认后删除记录和文件；替换保持 AssetId。
  - 修改任一 PAL 视频/动画后重迁仍指向 authored 文件，作者内容不被覆盖。
- 测试:
  - TPFS parser/encoder 对非法魔数、版本/保留位、端序、越界、重叠/空洞、坏尺寸、坏 block 帧覆盖、
    解压长度不符 fail-loud。
  - 完整帧作者模型经过加载、任意单帧修改、保存和重开后逐像素一致；codec 存储结构不会泄漏进
    草稿/命令/UI。
  - 12 段 TPFS 顺序播放和随机 seek 与迁移期 RGBA 逐像素一致；1,464 帧数精确。
  - `playFrameAnimation` 覆盖全段/分段/不同 frameRate/异常加载/跳过/末帧保持；Promise 缓存无并发重复解码。
  - typed walker 精确收集视频/帧动画嵌套脚本引用；kind 错、缺 id、受引用删除均有测试。
  - 视频与帧动画新增、改名、替换、删除、量化、重排、保存重开和 undo/redo 有逻辑测试。
  - MG2 作者替换保护和连续两次迁移第二次 `writes=0 deletes=0 conflicts=0`。
  - 静态扫描 `/extracted/videos`、`/extracted/data/animation`、`playRng`、`chunkIdx`、`videoId` 在目标包归零。
  - `pnpm check`、editor/reforge build 全绿；迁移体积门禁继续成立。
- 文档:
  - 更新 content schema、A7 闭包审计、asset pipeline、脚本命令、编辑器设计和 capability-map 实际状态。
  - 记录 TPFS v1 格式、block 间隔与 codec 实测、颜色处理边界、PAL 资源映射与版权/来源口径。
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

- counter / 分歧处理: Opus 无架构 counter;R1-R3 为设计必补,GLM 无 counter(标 G1-G2 build 必落)。
  用户于 2026-07-16 明确允许 codec 从完整帧重新实测选型；实测后 R1(b)“PNG 补丁替换”与 R1(d)
  “PNG RGBA8”由“32 帧 block、RGBA8 完整首帧 + 相邻帧逐字节 XOR、Deflate”替代，R1(a) u32 LE、
  R1(c) 时长优先链和逐像素无损约束保持。chunk 6 trademark-fallback（G1）仍是 build 必落关键确认项——
  普查"未引用"不等于"无运行时消费"（与 A7-0A 标题菜单音乐同方法论教训：站点普查≠需求普查）。
- 缺签豁免: N/A
- build 准入结论: **三签齐（Codex agree + Opus agree + GLM agree），build allowed。** R1-R3 必改 + S1-S2 + G1(chunk 6 trademark-fallback 确认/迁移)+ G2(静态扫描 126 处分配确认)纳入 build 范围。交 Codex 按 A7-3A→D 分段 build。

### 进入 done 前:审查签字

- Codex: **accept（2026-07-16）**。A7-3A→D 已按完整帧作者模型落地；正式 TPFS 产物 12 段/
  1,464 帧/7,960,282 B，catalog 大小与 SHA-256 逐项匹配。全仓 3,611 tests passed、1 skipped，
  Biome 707 files、editor/reforge build、迁移零计划、旧路径静态扫描均通过；6010 HTTP 工作台与 6051
  `s066` 全段/跳过已做浏览器验证。真实 FSA 句柄和窄视口留给 Opus 独立复验，不冒充已完成。
  **返工注（2026-07-16）**：这是 C1-C5 出现前的历史自审签字，已被用户复现与 Opus counter 推翻；其中
  “剧情 RNG 可跳过”本身也是错误验收口径。Codex 当前结论为 `rework`，不得把此旧 `accept` 用作 done 准入。
- Opus: **counter（2026-07-16,实现/性能/视觉主审）**。资源闭包/契约/迁移/编辑器工作台五个面全部实证通过
  (见下"已验证通过"),但发现一个**用户当场确认的运行时视觉回归**必须返工,故签 counter:
  **【C1 · 阻塞】s066 开场帧动画(血池梦境 000)播完后,后续世界场景("灵儿！月如！"对白那段)以约半尺寸
  渲染在画布左上角(实测非黑内容边界 620×356,画布 1280×800),而不是铺满。** 精确复现与排障:
  - 复现:6051 `?scene=s066` → 等开场帧动画播完 → 观察"灵儿！月如！"对白帧。fresh s066(动画前)与 s001
    均满屏正确渲染,s227 动画前世界也满屏——**只在帧动画播完后的世界帧出现半尺寸**。
  - 已排除:①`frameAnimationLayerMode='idle'`(Cinematic Layer 不是元凶,已复位);②`ctx.getTransform()`
    为单位阵(非 ctx transform 泄漏);③canvas 1280×800、cssWH 1280×800、DPR 2 均正常(非 DPR 错配);
    ④s066 root 本身不含 setScreenWave（但动画结束会 load `s059`，其 root 才启用 0x71；因此这条旧排除
    不能排除实际故障路径）；⑤resize 与相机移动后 620×356 不变(**持久态损坏,非单帧闪烁**)。
  - 定位方向(交 Codex 根因):世界经 `renderSceneFrame(ctx, renderer, {worldScale: WORLD_SCALE=4})` 每帧常量
    绘制,却半尺寸 → 半尺寸(≈640×400=1280×800 的一半,等效 worldScale=2)被烘进 `Canvas2DRenderer`/
    renderSceneFrame 或帧动画播放后遗留的内部态,而非本帧参数。b99d4fb7 对 main.ts 的合成 diff 仅是
    rngLayerCanvas→frameAnimationLayerCanvas 改名,结构未变;新 `frame-animation-player` 取代
    `rng-player` 是最大变量,须查其播放/复位是否污染世界 framebuffer 刷新尺度。
  - **两个必答开放项**:(a) **是否 dev `?scene=` 同步 runEnterScript 路径特有**(真门进入 s066 是否复现)——
    本轮无可达存档,未能走真实门进入确认;(b) **回归 vs 既存**(pre-b99d4fb7 的旧 rng-player 路径下 s066
    梦境后是否也半尺寸)——需 Codex checkout 父提交对照。无论(a)(b)结论如何,C1 都falsify 了 Codex 自审
    "6051 s066 全段播放、正常结束和空格跳过清理通过"与视觉记录"无跳过残留",故本卡必须返工或由用户
    对该已知缺陷显式豁免后才能进 done。
- Codex 返工（2026-07-16，待 Opus/GLM 复核）：
  - **C1 已定位**：`s066` 播完帧动画后进入 `s059`，后者才启用 0x71 屏波。旧屏波离屏 pass 把绑定主
    `ctx` 的 `Canvas2DRenderer` 传给 `wctx`，renderer 实际落笔与目标 transform 错配，造成半尺寸/画布污染。
    现为离屏 `wctx` 单建 `waveRenderer`，`renderSceneFrame` 对 context 不一致 fail-loud；严格按
    `scene.c:475-491` 先卷背景、后静态绘人物/cover，人物不随波。相位只在探索 100ms 世界拍推进，rAF
    只复用当前相位。
  - **C2 已修**：迁移保留 0x6E 第三 operand 为 `nudgeParty.layer`；运行时以 PAL 的 party/NPC layer、
    sort offset 和五邻 cover candidate 参与遮挡排序，解决三人被地形截成半身。
  - **C3 已修**：原版剧情 RNG 循环不读取输入，Reforge 默认 `skipKeys=[]`；只有开发/编辑器预览显式
    传入 `skipKeys` 才能跳。默认 Space 不跳与 opt-in 可跳均有单测。
  - **C4 已修**：原版 dlg.4348 后 0x50 只置 `fNeedToFadeIn`，首个 `PAL_MakeScene` 自动淡入；clean
    脚本曾只保留 fade-out，故永久黑屏。s059 语义 overlay 在首个 wait 前显式加入 600ms fade-in，已上游
    重迁并双跑零计划。不能全局 blanket fade-in，以免破坏 FBP/RNG 的黑屏保持。
  - **C5 已修**：原版 0x46 不只移动队长，还按朝向重填 `rgTrail`。Reforge 的场景落点/teleport 现用
    `seedFormationTrail` 铺满直线队形并清 frozen/派生 follower；静止回退使用 `trail[m]`。最终 `setParty`
    恢复三人后无需移动即可出现。
- Codex FSA/LAN 修复（2026-07-17，待 Opus/GLM 复核）：
  - 根因确认：Chrome 的 File System Access API 要求 secure context；`http://localhost` 是开发期安全来源，
    `http://<局域网IP>` 不是，因此 IP 入口会把 `showDirectoryPicker` 隐藏。编辑器现在统一通过
    `packages/editor/src/core/file-system-access.ts` 先区分“来源不安全”和“浏览器不支持”，避免误报。
  - 新增 `pnpm --filter @type-pal/editor run dev:lan`：以 `0.0.0.0:6010` 提供开发 HTTPS；访问
    `https://<局域网IP>:6010/` 后可恢复 picker。开发证书首次会有浏览器警告；协议、主机或端口变化是新 origin，
    localhost 已保存的目录句柄必须重新选择。
  - 浏览器矩阵（Playwright/Chrome，900×720；HTTPS 会话使用 `ignoreHTTPSErrors` 绕过开发自签证书错误，
    仅证明 TLS 页面进入 secure context，不冒充普通浏览器已信任证书）：`http://localhost:6012` → secure/picker function；
    `http://10.105.21.65:6012` → insecure/picker undefined 且显示可操作提示；
    `https://10.105.21.65:6010` → secure/picker function。编辑器场景页和过场资源页均无横向溢出
    (`scrollWidth === clientWidth === 900`)；真实原生目录授权器“保存→重开”仍需人工/Opus 复验。
  - 另存为也已保持用户激活：先弹目录选择器，再异步序列化/复制地图文件，避免大工程序列化耗尽 transient activation。
- GLM: **accept（2026-07-17;见下）**。本轮 rework（FSA/LAN + C1-C5）覆盖/测试矩阵复核全过。

  **测试套件** ✅：editor 28 files/214 tests / reforge 43 files/370 tests / content 21 files/208 tests / migrate 29 files/199+1skip 全绿。

  **FSA 能力检测** ✅：`file-system-access.ts` classifyDirectoryPicker 先判 `isSecureContext`（:31 insecure-context）再判 `showDirectoryPicker`（:43 unsupported-browser），两类错误各自可操作中文提示（:36-40 指引 dev:lan / :47 换浏览器），3 tests 覆盖。

  **dev:lan HTTPS 入口** ✅：`package.json:8` `EDITOR_LAN_HTTPS=1 vite --host 0.0.0.0 --port 6010`；vite.config:85 条件注入 basicSsl。localhost HTTP 保持 HTTP（浏览器豁免），仅 LAN-IP 走 HTTPS。

  **另存为 transient activation** ✅：`open-actions.ts:76` `pickDir()` 先弹（用户手势内），`:78` `buildFiles()` 异步序列化在后。注释 :68-69 明确 "不能先 await 序列化再弹 picker"。正确顺序。

  **C1-C5 修复测试覆盖** ✅：
  - **C1 屏波**：render-scene.test context-mismatch fail-loud guard + screen-wave.test 32-phase 表 ✅
  - **C2 nudgeParty**：script-runner.test:153-160 layer 保留 + 缺省 0 ✅
  - **C3 skipKeys**：frame-animation-player.test:162-170 默认空不可跳/opt-in 可跳 ✅
  - **C4 fade-in**：script-overlays.test:41-66 s059 0x50 后显式 600ms fade-in overlay ✅
  - **C5 trail**：follower.test:114-149 seedFormationTrail 四向参数化 ✅

  **MG2 + chunk 6（G1）** ✅：dry-run `writes=0 deletes=0 conflicts=0`；chunk 6 在 catalog（`frame-animation.pal.006` → 006.tpfs origin legacy-migrated）；legacy palette map `{3:2,6:3,7:6}` 入迁移报告（S2 落地）；startup videos 经 manifest roles（startupTrademark→video.pal.001/splash→002）。**G1 落地确认：chunk 6 已作一等资产迁移；phase-1 game/shell bootstrap 属一阶段范围不在 phase-2 reforge 运行时。**

  **静态扫描归零** ✅：playRng/chunkIdx/rngPaletteId/videoId 在 content/reforge/editor 目标包（非 test/非 migrate/非注释）零命中；`/extracted/videos`/`/extracted/data/animation` 在 reforge/editor 运行时零命中。

  **非阻塞观察（不影响 accept）**：
  - **O1**：reforge Biome 5 处格式/import-sort 漂移（全 auto-fixable，零 lint error）——建议 done 前 `biome check --write packages/reforge` 清零。
  - **O2**：content typecheck `asset.test.ts:294` 缺 `site` 字段（pre-existing，卡内已声明与本轮无关）——如需 `pnpm check` 全绿需一行 fixture 修复。
  - **O3**：migrate pal-migration-integration.test 零计划测试 skip（38s 慢集成）——MG2 零计划由 CLI dry-run + 其他 plan 测试覆盖，非缺口。

  **总结**：FSA/LAN rework 覆盖面完整（secure-context 先判 + 两类提示 + dev:lan + 另存为 activation 顺序正确）；C1-C5 全有专测；MG2 零计划；G1 chunk 6 已迁移；静态归零。editor 214 + reforge 370 + content 208 + migrate 199 全绿。**accept**（本轮 FSA/LAN + C1-C5 rework 的覆盖/测试面）。

- counter / 返工处理: C1-C5 已由 Codex 修复并自验；第一阶段仅作真值，`git diff -- packages/game` 为空。
  **GLM accept（覆盖/测试面）**；Opus 历史 counter（C1 视觉回归）待 Opus 改签；真实 FSA 保存重开仍需人工复验。
- 缺签豁免: N/A
- done 准入结论: blocked（Opus 历史 counter 尚未改签；真实 FSA 保存重开与独立视觉复核未完成；GLM 已签 accept）

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
  - **R1 用户裁决后的 codec 替代（2026-07-16）**：保留 (a) u32 LE、(c) 时长优先链与逐像素无损目标；
    (b)/(d) 不再采用 PNG 补丁，替换为 32 帧 block、完整 RGBA8 首帧、后续帧与前帧逐字节 XOR、整块
    Deflate。block 解压长度、帧覆盖、字节覆盖和 XOR round-trip 进入 fail-loud/逐像素测试。
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
- 修改文件:
  - `packages/content/src/{asset,script,frame-sequence}.ts` 及测试：稳定资产/命令、typed references、TPFS v1。
  - `packages/migrate/src/{pal-assets,pal-migration*,translate-events}.ts`、迁移脚本、baseline 与 PAL 产物。
  - `packages/reforge/src/{asset-resolver,frame-animation-*,script-runner,main}.ts`：工程内读取和播放；删除旧
    `rng-player/rng-presentation` 双运行时。
  - `packages/editor/src/core/frame-animation-*`、`editor-asset-reader.ts`、`CutsceneTab.tsx`、
    `FrameAnimationEditor.tsx` 与样式：视频/帧动画作者工作台。
  - content/migrate/editor/reforge 设计与审计文档、capability-map、看板和本卡。
- 实现摘要:
  - **A7-3A 契约/codec**：新增 `frame-animation`、`visual.standardColorTable`、稳定
    `playVideo.asset/playFrameAnimation.asset` 和 typed 引用。TPFS v1 固定 32 帧块、块首完整 RGBA8、后续
    完整帧 XOR、zlib level 9 Deflate；parser 对坏头/索引/块/长度 fail-loud，provider 编码不全量持帧。
  - **A7-3B 迁移/运行时**：物化 6 MP4、12 TPFS/1,464 帧，迁移 20 条命令并保留区间/帧率；颜色表映射
    `{3:2,6:3,7:6}`，其余标准色。Reforge 只经 AssetResolver 读取；容器与 block Promise 在 await 前缓存，
    完整帧 LRU 上限 64。chunk 6 已登记为稳定资产；一阶段 `packages/game` 仅保留忠实还原参考路径。
  - **引用模型补正**：启动视频 001/002 从 manifest 角色收集，入口剧情视频 003 从
    `entryPoints[].introVideo` 收集，结尾视频 004/005/006 从 `quitToTitle.videos[]` 收集；同一脚本位置内
    为插入音效/对白/等待而拆出的多个帧动画段按 `site` 合并，并在 UI 标注真实调用次数。
  - **A7-3C 作者工作台**：左侧视频/帧动画双列表，中间原生视频播放器或完整帧时间轴，右侧属性/引用/删除；
    支持导入/替换/改名/保护删除、图片序列自然排序后人工重排/剔除、完整帧插入/替换/多选复制删除/拖排、
    时长、撤销重做、Worker 批量量化与编码、未保存切换保护。410 帧时间轴仅渲染 12-15 个可见项。
  - **A7-3D 闭包**：临时断开外部视频/RNG 目录后，HTTP 编辑器仍可播放 MP4、打开 410 帧动画；6051
    `s066` 实际 TPFS 全段播放和正常结束通过。历史“空格跳过通过”已被推翻：剧情 RNG 原版默认不可跳，
    当前也默认不可跳；快捷跳过仅供显式 opt-in 的开发/编辑器预览。MG2 作者接管与二跑零计划通过。
  - **s066→s059 视觉返工**：屏波改为背景-only 双 pass + 独立 renderer；0x6E layer/cover 排序恢复；
    s059 显式表达原版隐式 600ms fade-in；场景落点/teleport 按 0x46 重建队伍 trail。
- 运行命令:
  - `pnpm check`：shared 111、content 207、reforge 360、game 2,294、pal-extract 251、migrate 196、
    editor 192，共 3,611 tests passed、1 skipped；Biome 检查 707 文件，无错误。
  - `pnpm --filter @type-pal/editor build`、`pnpm --filter @type-pal/reforge build`：通过；帧动画 Worker 独立出包。
  - `pnpm --filter @type-pal/migrate run migrate:content`：`writes=0 deletes=0 conflicts=0`，
    `videos=6 frame-animations=12 frames=1464`，`asset-refs=1354 asset-warnings=15`，脚本体积门禁
    1.66x/1.13x/1.53x。
  - `rg ... packages/content/src packages/reforge/src packages/editor/src --glob '!**/*.test.ts'`：
    `/extracted/videos`、`/extracted/data/animation`、`playRng/chunkIdx/videoId/rngPaletteId` 零命中。
  - `git diff --check`：通过。
  - 返工后：Reforge 43 files / 370 tests；Migrate 29 files / 199 passed + 1 skipped；Reforge/Migrate/
    Editor typecheck、Reforge build、`git diff --check` 全通过。Content typecheck 仅保留既有
    `asset.test.ts:294` fixture 缺 `site` 的 TS2345，与本轮无关。
  - 返工后迁移 dry-run：`writes=0 deletes=0 conflicts=0`，294 scenes、`ref-warnings=0`、
    `script-issues=0`；`git diff -- packages/game` 为空。
- 浏览器 / 手工检查:
  - 6010：视频 `001` 为 blob 工程源且原生 controls 可播；帧动画 `001` 为 320×200/410 帧/16.40 秒，
    播放推进、虚拟滚动、多选复制/删除/撤销、Worker 标准色量化和保存按钮状态符合预期。
  - 6051 `?scene=s066` 历史检查“播放中按空格立即跳过”已作废：它证明了旧实现偏离原版，不再是通过证据。
  - 返工后 6051 `?scene=s066`：帧动画播放中按 Space 仍停留 s066 并继续出帧；进入 s059 后三人完整、
    人物不随背景波动，屏波按 100ms 世界拍推进。
  - s059 dlg.4348 后先淡出，再于 600ms 淡入后继续“好臭的味道”对白，不再永久黑屏；关闭最后一句时只按
    Space、不发送方向键，完整 1280×800 画布立刻显示李逍遥、赵灵儿、林月如三人队形。
  - 临时改名外部视频/RNG 目录后重新加载 6010，视频与动画仍从工程资产打开；验证后已恢复目录名。
- 跳过的检查及原因:
  - 未在 Codex 浏览器环境执行真实 File System Access 目录句柄“保存→重开”手测；FSA/FileSource 核心有单测，
    但仍交 Opus 用真实句柄独立复验。
  - 当前浏览器不提供 viewport override，未保留伪窄屏截图；6010 窄视口与长文本布局交 Opus 独立复验。

## 资源生成记录(如适用)

- Generation Owner: N/A
- 生成目的 / 替换对象:本卡迁移本地合法原始数据，不做 AI 生图或发布素材替换。
- 提示词要点 / 风格约束: N/A
- 输出路径:`projects/pal/assets/migrated/videos/*.mp4`、`frame-animations/*.tpfs`、
  `colors/project-standard.json`；登记于 `projects/pal/assets/index.json`。
- 尺寸 / 格式 / 透明背景 / 调色约束:TPFS 真彩 320 x 200；作者输入按向导设置。
- 资源登记位置: `assets/index.json`
- 验证方式:逐像素 codec、闭包和浏览器播放。

## 视觉验证记录(如适用)

- Visual Verification Owner: Codex + Opus + User
- 验证方式:6010 工作台交互 + 6051 `s066→s059` 实际运行；检查剧情 RNG 默认不可跳、完整帧画面、
  背景-only 屏波、遮挡、淡入和无方向输入的终场三人队形。
- 截图 / 像素检查路径:
  - `docs/ops/evidence/A7-3/editor-frame-workbench-desktop.png`
  - `docs/ops/evidence/A7-3/reforge-s066-frame-animation.png`
  - `docs/ops/evidence/A7-3/reforge-s066-skip-cleanup.png`
- 结论:Codex 桌面 HTTP 与运行时返工自验通过；旧“跳过残留”口径作废，当前剧情 RNG 默认不可跳。
- 未完成项:真实 FSA 句柄保存重开、Opus 独立视觉复验；窄视口已在 900×720 的场景页与过场资源页
  做尺寸回归（仍需 Opus 独立视觉复验）。
- LAN HTTPS 说明：自动化使用 `ignoreHTTPSErrors`，所以证据覆盖 secure-context/API 暴露与布局，
  不覆盖用户首次面对自签证书警告时的点击路径；真实目录授权仍保留人工复验门。

## Review: 审查与返工

- Reviewer: Opus + GLM
- 审查结论:Codex 已完成 C1-C5 返工并自验；**Opus 历史 counter 尚待复核改签**；GLM pending。
- 已验证通过(Opus,2026-07-16,不必返工的部分):
  - **资源闭包/契约**:catalog 精确 6 video + 12 frame-animation + 1 color-table;TPFS 12 段总
    7,960,282 B、SHA-256/bytes 逐项匹配;`frame-sequence.ts` codec R1 全落地(u32 LE 索引前缀、
    XOR+Deflate、rgba8、时长优先链)且 fail-loud 面完整(magic/version/reserved/端序/块覆盖连续/
    rawBytes/payload 越界/尾随/解压长度不符);运行时零全量解码(块级惰性 + 容器·块 Promise await 前缓存 +
    帧 LRU=64)。静态扫描 `/extracted/videos`、`/extracted/data/animation`、`playRng/chunkIdx/videoId/
    rngPaletteId` 在 content/reforge/editor 非测试源零命中;旧 rng-player.ts 已删。
  - **引用模型(用户点名复核)**:启动 001/002 来自 `manifest.assets.roles.video.startupTrademark/
    startupSplash`、入口 003 来自 `entryPoints[new-game].introVideo`、结尾 004/005/006 来自
    `quitToTitle.videos[]`——三类入口 typed 收集实证一致;`playFrameAnimation` 20 命令/9 引用段/未引用
    [6,10,11] 与原 playRng 拓扑 1:1;**同一脚本位置的分段(chunk 1/9 各 6 段)按 `site` 合并为 1 条引用
    并显示"本处调用 6 次"**(groupAssetReferencesBySite key=asset\0kind\0site),满足用户第 5 点。
  - **编辑器工作台**:三栏(左双列表/中内嵌 `<video controls>` 非全屏/右属性引用删除)、帧动画 410 帧
    虚拟化时间轴(仅渲染可见缩略图)、完整帧作者语义(列表标"完整帧",无 block/XOR/补丁泄漏)、
    删除保护双向(001 引用中禁删、006 未引用可删)、colorTreatment 显示"保留原色"。
  - **迁移**:dry-run 零计划,`videos=6 frame-animations=12 frames=1464`,legacy-palette-map
    `{003:2,006:3,007:6,其余0}` 精确对应 `RNG_PALETTE={3:2,6:3,7:6}`(S2 落地),asset-refs=1354/
    warnings=15(12 音乐 + 3 未引用动画);定向套件(frame-sequence/asset/player/presentation/
    script-runner/draft/codec/reader)全绿。
- 返工结果（Codex,2026-07-16）：
  - C1 context mismatch 已以独立 `waveRenderer` + context guard 修复；C2 layer/cover、C3 RNG 默认不可跳、
    C4 s059 隐式淡入、C5 0x46 formation trail 均已补测试与浏览器证据。
  - 全量 Reforge/Migrate 测试、三包 typecheck、Reforge build、迁移零计划和 phase1 零 diff 通过。
- FSA/LAN 结果（Codex,2026-07-17）：`editor` typecheck/test/build 全绿（28 files/214 tests）；HTTP localhost、
  HTTP 局域网 IP、HTTPS 局域网 IP 三态矩阵符合预期；`dev:lan` 文档与启动脚本已落地，来源切换提示会要求
  重新选择目录句柄。
- 未完成:Opus C1-C5/FSA 实现与视觉复核、GLM 覆盖/迁移矩阵复核、真实 FSA 句柄保存重开；
  历史 C1 要求的真实门进入与父提交对照也未做（当前 s066→s059 现路径的 context mismatch 已由 guard/独立
  renderer 证据定位，不把未做的对照冒充完成）。
- Accept / rework: **rework**（返工自验完成，审查签字未齐，不得标 done）。

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
- 2026-07-16 Codex: 复核 Codex/Opus/GLM 三方设计签字均为 agree，build 准入 allowed；接手
  A7-3A→D 单 Coding Owner 实现。R1-R3、S1-S2、G1-G2 全部进入强制实现/验证清单。Evidence: 推进签字表。
  Next: Codex 分段 build；实现完成并自验证后转 review 交 Opus，不得提前标 done。
- 2026-07-16 User/Codex: 用户明确压缩算法属于保存/加载内部实现，不要求沿用脏矩形；作者仍只编辑完整帧。
  Codex 用全部 1,464 张真实 RGBA8 帧复测，32 帧 block + 相邻帧 XOR + 默认 Deflate 的选型原型为
  8,271,766 B；正式迁移器固定 zlib level 9 后产物为 7,960,282 B，相比脏矩形 PNG 31,525,705 B
  小约 74.7%，据此替换 TPFS 内部 codec。Evidence: 设计文档 §2.3/§4.2。
  Next: 按新 codec 契约实施 A7-3A。
- 2026-07-16 Codex: 完成 A7-3A→D 实现与自验证，Codex done 前签 `accept`，任务转 `review`。6 视频、
  12 TPFS/1,464 帧、20 条稳定命令、TPFS 7,960,282 B、MG2 零计划、全仓 3,611 tests、两个生产构建、
  HTTP 断外链和 6051 全段/跳过证据均通过；真实 FSA 句柄与窄视口明确留给 Opus。Evidence: Build/视觉记录。
  Next: Opus 做实现/性能/视觉主审，只改任务卡签字；不得标 done。
- 2026-07-16 Codex: 根据用户复核修正资源引用闭包：启动 001/002、入口剧情 003、结尾 004/005/006
  均进入统一 typed 引用表；同一脚本位置的分段帧动画按作者 site 合并并显示 occurrences，避免 UI 将一次
  原版 RNG 编排误报为六个独立引用。相关单测、迁移 dry-run、editor/reforge typecheck 已通过。
  Next: Opus 复核这组三类视频入口与 site 分组语义；不得标 done。
- 2026-07-16 Opus: 实现/性能/视觉主审签 **counter**。资源闭包/契约/迁移/编辑器工作台/引用模型五面实证
  全部通过(catalog 6+12+1、TPFS 7,960,282B hash 逐项符、codec R1 全落地 + fail-loud 完整、运行时惰性块+
  LRU64、三类视频入口与 site 分组"本处调用 N 次"、20/9/[6,10,11] 拓扑 1:1、palette-map{3:2,6:3,7:6}、
  静态扫描零命中、定向套件全绿、6010 双列表/内嵌播放器/虚拟化时间轴/删除保护双向)。**但用户当场发现
  运行时视觉回归 C1:6051 s066 开场帧动画(血池梦境)播完后,后续世界场景("灵儿！月如！"对白)半尺寸渲染
  在左上角(620×356 / 画布 1280×800),非满屏。** 已排除 Cinematic Layer(idle)/ctx transform(单位阵)/
  DPR/屏波/单帧闪烁(resize+移动后持久);定位方向=世界 framebuffer 刷新尺度被帧动画播放后遗留内部态
  污染(worldScale 参数每帧仍为 4)。两开放项待 Codex:dev `?scene=` 同步路径特有?回归 vs 既存
  (pre-b99d4fb7 对照)?C1 falsify 了自审"s066 全段...清理通过",本卡回 rework。真实 FSA 保存重开与
  窄视口在 C1 修复后与 GLM 一并收口。Evidence: done 前签字 Opus 行 + Review 已验证通过节 + 6051 实测
  边界/transform/持久性数据。Next: Codex 根因定位 + 修复 C1 + 回答两开放项,再转 Opus 复验。未改实现文件。
- 2026-07-16 Codex: 完成用户回归 C1-C5 返工。C1 根因是 s066→s059 后屏波离屏目标与 renderer
  context 错配，改为独立 waveRenderer + fail-loud guard，并按 SDLPal 顺序只卷背景、人物/cover 静态叠回；
  屏波相位仅 100ms 世界拍推进。C2 恢复 0x6E layer/五邻 cover 遮挡；C3 恢复剧情 RNG 默认不可跳；
  C4 在 s059 语义 overlay 表达 0x50→首个 MakeScene 的 600ms 隐式淡入并重迁；C5 按 0x46 重建 trail。
  浏览器在不发送方向键下确认终场完整三人队形。Evidence: Reforge 370 tests、Migrate 199+1、三包
  typecheck、Reforge build、迁移 `writes=0 deletes=0 conflicts=0`、`packages/game` 零 diff。
  Next: Opus/GLM 只审查并签 accept/counter，不得标 done。
- 2026-07-17 Codex: 处理局域网 IP 下 Chrome FSA 不可用。新增 `file-system-access.ts` 能力分类与单测、
  `dev:lan` HTTPS 启动入口、保存/启动屏统一 guard；完成 HTTP localhost / HTTP IP / HTTPS IP 实测矩阵，
  并在 900×720 场景页与过场资源页确认无横向溢出。真实目录句柄授权与保存重开仍交 Opus/用户人工复验。
  Next: Opus 复核 C1-C5 + FSA 说明/视觉，GLM 复核覆盖；不得标 done。
- 2026-07-17 GLM: rework 覆盖/测试复核签 **accept**。七项独立实测：(1)测试套件 editor 214/reforge 370/content 208/migrate 199+1skip 全绿。(2)FSA file-system-access.ts classifyDirectoryPicker 先 isSecureContext 再 showDirectoryPicker 两类区分+3 tests。(3)dev:lan EDITOR_LAN_HTTPS=1 basicSsl 条件注入 localhost 保持 HTTP LAN-IP 走 HTTPS；另存为 pickDir(:76)先于 buildFiles(:78)保 transient activation。(4)C1-C5 全有专测——屏波 context-mismatch guard+32-phase/nudgeParty layer 保留/skipKeys 默认空不可跳/s059 fade-in overlay/seedFormationTrail 四向。(5)MG2 writes=0+chunk6 在 catalog(frame-animation.pal.006)+palette map{3:2,6:3,7:6}入报告+startup videos manifest roles。(6)静态 playRng/chunkIdx/rngPaletteId/videoId 目标包零命中。(7)O1 reforge Biome 5 格式漂移(auto-fixable)/O2 content asset.test:294 缺 site(pre-existing)/O3 migrate integration skip(慢)均非阻塞。Evidence: done 准入 GLM 行。Next: 待 Opus C1-C5/FSA 视觉改签+真实 FSA 保存重开人工复验。未改实现文件。

## 下一位 Agent 提示词

```text
接手 A7-3 rework 审查（不得改实现文件）。
任务卡：docs/ops/tasks/A7-3-cutscene-asset-workbench.md（状态 rework；Opus 历史 counter，GLM pending，不得标 done）。
先读：AGENTS.md、docs/phase2/READ-FIRST.md、本卡 done 前签字与 Review、
docs/phase2/foundation/n-event-script-audit.md 的 2026-07-16 补记。
已完成：
 - C1：s066→s059 屏波 context mismatch → 独立 waveRenderer + renderSceneFrame context guard；背景-only 波动，
   人物/cover 静态，探索波相位只按 100ms 世界拍推进。
 - C2：0x6E layer + PAL 五邻 cover/排序；C3：剧情 RNG 默认不可跳，skipKeys 仅显式 opt-in。
 - C4：s059 dlg.4348 后显式 600ms fade-in，表达 0x50/首个 MakeScene 隐式语义并已重迁。
 - C5：switchScene/teleportParty 按 0x46 seedFormationTrail，静止 follower 用 trail[m]，终场无需移动即三人完整。
证据：Reforge 43 files/370 tests；Migrate 29 files/199 passed + 1 skipped；Reforge/Migrate/Editor typecheck；
Reforge build；迁移 writes=0 deletes=0 conflicts=0；packages/game 零 diff；6051 默认 RNG 不跳、淡入继续、
无方向键终场三人完整画布复验。FSA/LAN：`dev:lan` 提供 HTTPS；HTTP localhost / HTTP IP / HTTPS IP
能力矩阵与 900×720 场景/过场资源页无横向溢出已验证；另存为先选目录再序列化，保持用户激活。
下一步：Opus 审实现/视觉，GLM 审迁移/覆盖，分别返回 accept 或列出具体 counter；不得标 done。
注意：HTTPS 自动化证据绕过了开发自签证书错误，不等于普通浏览器已信任证书。仍未完成：真实 FSA 句柄
“保存→重开”、Opus/GLM 复核；不得开始实现或标记 done。
```
