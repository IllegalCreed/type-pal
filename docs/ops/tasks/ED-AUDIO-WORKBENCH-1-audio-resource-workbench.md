# ED-AUDIO-WORKBENCH-1 - 音乐 / 音效统一资源工作台与音频时间轴

Status: draft
Phase: phase2
Capability: X2
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: codex/ed-pal-workspace-modes-1

## 目标

把音乐与音效从“左侧空目录 + 中央全量旧表格 + 右侧重复元数据”重构为同一套音频资源工作台：左侧为可搜索、
可键盘操作且大列表虚拟化的资源目录；中间以统一对象标题承载当前资源身份与对象级操作，并提供基本信息编辑和
带时间轴可视化的完整播放器；右侧只保留引用与诊断。WAV 显示真实 PCM 波形，MIDI 显示真实音符活动密度，
二者共用播放器壳但不伪造相同的数据来源。

## 范围

- 范围内:
  - 音乐 / 音效页共用统一页面骨架、目录行、对象 Hero、基本信息区、引用 / 诊断 Inspector。
  - 左栏真正渲染资源列表；86 首音乐和 363 项音效按统一虚拟列表合同渲染。
  - 中央基本信息仅编辑现有可编辑字段 `label`；AssetId、格式、路径、来源、大小保持只读。
  - 中央统一播放器：播放、暂停、停止、可访问时间轴 seek、当前时间 / 总时长、loading / error / empty 状态。
  - WAV 对当前选中资源做单项解码并生成真实 PCM 峰值；MIDI 解析时长与 note events，生成明确标注的“音符活动”概览。
  - MIDI 在 `@type-pal/reforge` 增加窄预览 transport，封装 SpessaSynth 的 duration/currentTime/pause/seek；现有游戏
    `BgmPlayer` 行为不改。WAV 使用 editor 预览 transport，不复用 runtime SFX 的 readiness / lastSFX 语义。
  - 修复 current author state 中 `sharedScripts` 未进入音频引用扫描的问题；引用展示、删除门禁和保存诊断消费同一完整输入。
  - 导入、替换、改名、引用阻断删除、undo/redo、未保存 blob 优先读取、deep link 与全局保存语义保持闭环。
  - 删除确认改用共享 `DsDialog`；错误使用可访问 live feedback，不再使用 `window.confirm` / 静态 `.cf-err`。
- 范围外:
  - 不改 content schema、manifest、AssetId、catalog、存储格式、迁移器、PAL 生成数据或 capability 状态。
  - 不改运行时 BGM / SFX 的游戏语义、战斗 readiness、lastSFX 或全局音乐开关。
  - 不新增模块内保存；仍只使用右上角全局保存。
  - 不支持 RIX、MP3、OGG 或浏览器录音。
- 明确不做:
  - 不把 MIDI 音符密度冒充 PCM 波形；真实 MIDI 合成波形需要 soundfont 离线渲染，另卡处理。
  - 不在 449 条列表行中解码音频、画缩略波形或放置播放 / 替换 / 删除按钮。
  - 不把 duration、波形或分析缓存写回 AssetRecord；这些均为按 SHA 派生的临时 UI 状态。
  - 不因本次重构统一 Music/Sound 的 authored AssetId 去重策略；保持现有导入语义。

## 前提真值门

### 一句话行为 / 工程前提

音乐和音效已经共享稳定 AssetId / catalog / pending blob / typed reference 数据地基，但当前作者 UI 和预览状态各自复制；
应统一作者工作台与播放器外壳，同时保留 MIDI synth 和 WAV PCM 两种真实后端。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | N/A：原版没有本项目内容编辑器；本任务不改变游戏音频内容或播放机制，不能从原版推导作者 UI。 | `docs/phase2/READ-FIRST.md:1-35` 明确第二阶段编辑器是全新重写；用户 2026-08-21 明确提出当前作者界面重构。 |
| 第一阶段 | 第一阶段只提供 MIDI + soundfont 与 WAV 播放经验，不存在音乐 / 音效资源工作台可照抄的作者界面。 | `packages/reforge/src/audio/bgm.ts:1-12` 已记录移植的一阶段 MIDI / soundfont 工程约束；`docs/phase2/READ-FIRST.md:68-90` 要求重写前 harvest 机制知识，但无既有作者 UI 形态。 |
| 当前二阶段 | Music/Sound 已使用同一 AssetId/catalog/command 地基，却分别复制目录、表格、资源 Inspector 和预览入口；左栏无资源行，中央全量渲染旧表格。BGM 公共接口未暴露 transport，SFX decoded buffer 也不提供时间轴。 | `packages/content/src/asset.ts:12-30,74-95`; `packages/editor/src/ui/MusicTab.tsx:202-412`; `packages/editor/src/ui/SoundTab.tsx:206-427`; `packages/editor/src/core/commands.ts:2905-3039`; `packages/reforge/src/audio/bgm.ts:21-48`; `packages/reforge/src/audio/sfx.ts:40-57,102-221`。 |
| 本任务目标 | 左栏目录、中间 Hero + 基本信息 + 音频时间轴播放器、右栏引用 / 诊断；两页只在格式策略与文案上分叉。WAV 画 PCM 波形，MIDI 画音符活动，播放器交互一致。 | 用户 2026-08-21 明确要求“列表应该在左边方列表的 panel 里面，中间应该是标题、基本信息的修改，还有一个带波形图的播放器，布局你来设计”；`docs/phase2/editor/editor-design-system-v1.md:458-479` 提供对象 / 媒体工作台共享合同。 |

### 反证与替代解释

- 最强替代解释: 只把中央表格移到左边，并在中间放一个静态 canvas，继续复用行内 PreviewButton，可用更小改动满足截图观感。
  - 否决原因: 这会保留 Music/Sound 两套 playing 状态、错误不可观察、列表全量输入、对象操作位置漂移和共享脚本引用漏扫；
    静态 canvas 也不构成“播放器”。
- 什么观察会推翻当前前提:
  - 若 catalog 中存在非 MIDI 的 `music` 或非 WAV 的 `sound` 当前 canonical 输入，本卡的双策略不足，必须暂停并重开格式矩阵。
  - 若 SpessaSynth 当前锁定版本不提供 duration/currentTime setter/pause，则 MIDI seek 设计失效，须退回只读时间轴或另建后端；
    当前一手类型声明已提供这些能力：`spessasynth_lib/dist/index.d.ts:1075-1144`。
  - 若产品裁定 MIDI 必须显示合成后 PCM 振幅而非音符活动，则本卡应转 blocked，另算离线合成、soundfont SHA 与缓存预算。
- audit 红项如适用，已排查的替代根因:
  - runtime 语义 / 命令分类: 不改游戏播放语义；新 transport 只服务作者预览。
  - 原版 / 第一阶段理解: 无作者 UI 可照抄，且本卡不触碰原版机制判断。
  - extractor / 地图 / 数据解码: 当前 canonical 资源明确为 86 MIDI + 363 RIFF/WAVE；不涉及 extractor 修复。
  - audit / test model: 通过 catalog census、文件 magic 与 SpessaSynth 类型声明交叉确认，不从截图猜格式。

### 用户可见偏离

- 是否主动偏离已核真值: yes（用户明确要求重构当前页面形态）
- `before -> after` 一句话: 左栏只有筛选、中央全量表格、右栏重复元数据 -> 左栏对象目录、中央当前对象编辑与统一播放器、右栏引用 / 诊断。
- 代表场景: 在“资源 → 音乐”选择 `music.pal.001`，中央显示名称与 AssetId，可编辑名称并在音符活动时间轴上播放、暂停、seek；
  切到“音效”选择 WAV 后，同一位置显示真实波形与同款控制。
- 用户裁决: 2026-08-21 用户已批准目标布局并授权 Coding Owner 设计。

## 上下文锚点

- 已拍板决策 / 铁律:
  - `docs/phase2/READ-FIRST.md`: 第二阶段架构优先、稳定 ID、全新作者 UI；无一阶段作者 UI 时由本任务设计并接受用户审查。
  - `docs/phase2/editor/editor-design-system-v1.md:315-349,458-479`: 对象级动作进 Hero、对象行全宽选中、对象 / 媒体工作台布局。
  - `docs/ops/tasks/A7-0-resource-closure-registry.md:303-317`: music 只接 MIDI，替换保 AssetId，删除先问 typed references，二进制按 authored ownership 保存。
  - `docs/ops/tasks/A7-1-sfx-asset-closure.md:180-209,678-695`: sound 只接 RIFF/WAVE，SoundTab CRUD / 引用 / preview / pending blob / 保存闭环；试听单项 await。
- 代码锚点(`file:line`):
  - `packages/editor/src/ui/MusicTab.tsx:202-412`、`SoundTab.tsx:206-427`: 当前重复页面与旧表格。
  - `packages/editor/src/ui/design-system/recipes.tsx:46-107,724-855`: `DsObjectHero` / `DsCatalogRow` / Workbench / Inspector recipes。
  - `packages/editor/src/ui/design-system/virtual-list.tsx:3-58`: 现有虚拟列表只具基本窗口与 Home/End，需补选择 / 方向键合同。
  - `packages/editor/src/core/editor-asset-reader.ts:11-55`: 未保存 blob 优先、FSA/HTTP 同一资源读取真值。
  - `packages/editor/src/core/editor-asset-references.ts:8-27`: 当前遗漏 canonical `sharedScripts` 的适配器边界。
  - `packages/reforge/src/audio/bgm.ts:21-48,61-131,154-287`: MIDI synth 与现有 BgmPlayer 状态机。
  - `packages/reforge/src/audio/sfx.ts:40-57,102-221`: WAV decode/LRU 与 runtime SFX 语义边界。
- 已知坑 / 审计文档:
  - `docs/phase2/editor/editor-ui-audit-2026-08-15.md:85`: 对象级删除必须进 Hero，Inspector 只保留引用与阻断原因。
  - `ED-REFERENCE-UI-1` / `ED-DIAGNOSTIC-UI-1`: 引用与诊断必须消费共享 Panel/List/Row，二者不可混成一类。
  - AudioContext autoplay 需要直接用户手势；MIDI AudioWorklet 只在 localhost/HTTPS secure context 可用。
- 不得重新引入:
  - `music-table` / `music-action-button` / raw input / clickable `<tr>` / `window.confirm` / 每页私有播放器状态。
  - 列表项内播放、改名、替换、删除；右 Inspector 重复“资源信息”；局部保存按钮。
  - AssetId 推文件路径、MIDI PCM 假波形、预解码全部 449 项、错误只写 `console.warn`。
- 相关测试:
  - `MusicTab.test.tsx`、`SoundTab.test.ts`、`AssetInspectorTabs.test.tsx`。
  - `packages/reforge/src/audio/bgm.test.ts`、`sfx.test.ts`。
  - `packages/editor/src/ui/design-system/controls.test.tsx`、`recipes.test.tsx`、`boundary.test.ts`。

## 验收条件

- 功能:
  1. Music/Sound 两页 DOM 骨架、布局间距、空态、loading/error、对象动作和 Inspector 完全同源；页面组件只提供格式策略 / 文案。
  2. 左栏在标题 / 搜索下渲染 `DsCatalogRow`；每行仅名称、AssetId、引用数，不含输入与对象级操作。筛选不偷换选择；无效 deep link 显式失效。
  3. 列表支持 ArrowUp/ArrowDown/Home/End/Enter 或等价 roving focus；选中项滚入视图；363 项只挂载有界窗口。
  4. 中央 `DsObjectHero` 显示名称、AssetId、格式、来源、大小、引用数，替换 / 删除位于 Hero；删除有引用时阻断并展示原因，无引用时使用 DsDialog 确认。
  5. “基本信息”只允许改显示名称；改名经现有 command、undo/redo 和全局保存闭环，焦点切换不触发无变化提交。
  6. “试听”播放器支持 play/pause/stop/seek、当前 / 总时长、键盘操作与错误反馈；换资源、替换 SHA、卸载或切工程立即停止旧音频并丢弃旧异步结果。
  7. WAV 可视化来自实际 PCM；MIDI 可视化来自 note events 并明确标“音符活动”，两者不写回工程文件。
  8. 引用 / 诊断右栏使用共享组件和 occurrence 总数；sharedScripts 的 playMusic/playSound 引用同时进入展示、删除门禁与保存诊断。
  9. 导入 / 替换保持原 MIDI/WAV 校验、AssetId 和 authored blob 语义；右上角全局保存仍是唯一保存入口。
- 测试:
  - 引用 collector：shared script 顶层及嵌套 playMusic/playSound 命中；删除时重读 live current author state；非目标 ID 不误命中。
  - transport：MIDI load/duration/play/pause/stop/seek clamp/快速换曲/error/dispose；WAV decode/seek/pause/restart/error/dispose。
  - visualization：PCM mono/stereo/静音/短输入/尾 bucket；MIDI note 密度、空轨、tempo 变化、确定性。
  - lifecycle/cache：按 `projectId + AssetId + sha256` 单项懒加载、inflight 去重、SHA 变化失效、旧结果不回写、缓存有界。
  - UI：两页目录选择、筛选、deep link、改名、替换、删除阻断 / 确认、引用 / 诊断、播放器完整键盘交互与可见状态。
  - 共享边界：生产页不得出现 raw `table/input/label`、旧 audio table/action class、`window.confirm` 或第二套播放器按钮。
  - 定向 Vitest + editor/reforge typecheck + `git diff --check`；不重复跑两次同一长套件。
- 文档:
  - 更新 `editor-design-system-v1.md`，补“音频型工作台”或媒体型工作台的时间轴 / 格式真实性合同。
  - 本卡 Build/Review/视觉记录完整；不改 capability-map 状态。
- 视觉 / 手工验证:
  - localhost 6010 的 PAL 开发模式，至少验证 1280×720 和窄中央列：列表、Hero、基本信息、播放器、右侧引用 / 诊断无横向溢出。
  - 真 PAL MIDI：首次点击完成 worklet + soundfont 初始化，播放 / 暂停 / seek / stop 与时钟一致；错误不再假显示播放。
  - 真 PAL WAV：真实波形、播放 / 暂停 / seek / stop；替换后波形和声音同步刷新。
  - 选中切换、关闭页面和切工程时旧音频立即停止；列表滚动不触发解码风暴。
- E2E 用例登记（剧情 / 演出 / 内容观感必填：入口、准备数据、步骤、预期画面/时序、证据路径）:
  - N/A：功能性编辑器界面，开发期做一次最小浏览器 smoke，不进入剧情集中 E2E。

## 推进签字

### 进入 build 前:设计签字

- Codex:
  - premise: verified（`MusicTab.tsx:202-412` / `SoundTab.tsx:206-427` 证明两套旧页；`asset.ts:12-30,74-95` 证明统一 catalog；
    `spessasynth_lib/dist/index.d.ts:1075-1144` 证明 MIDI transport；`editor-asset-references.ts:8-27` 证明 sharedScripts 输入缺口）
  - design: agree（共享工作台 + 共享播放器壳 + MIDI/WAV 两后端；真实 PCM / note-activity 分流；先修引用真值）
- Kimi:
  - premise: pending
  - design: pending
- GLM:
  - premise: **verified（2026-08-23，本人 catalog 全量 census + 一手读码，非代理）——附
    一处措辞修正（GA1，与 MEDIA 卡 GM1 同源）**：
    1. **格式 census（可证伪观察①的裁决）**：本人 node 全量扫 projects/pal/assets/
       index.json——**music 86 项全部 MIDI mediaType、sound 363 项全部 WAV，other = 0**；
       双后端策略（MIDI note-activity / WAV PCM）充足，无需重开格式矩阵，不 counter。
    2. **两套旧页属实**：MusicTab:202-412 / SoundTab:206-427 分别复制目录+全量表格
       （与卡文锚点一致）；BgmPlayer 未暴露 transport、SFX buffer 无时间轴属实。
    3. **sharedScripts 措辞修正（→GA1）**：卡文引"editor-asset-references.ts:8-27 证明
       sharedScripts 输入缺口"——当前 HEAD 该文件**已含** `sharedScripts: state.sharedScripts`
       （0ee277ab 加入）；真缺口是编辑期间 stale 副本（同 MEDIA 卡 GM1），本卡修复
       方向正确但该行需同步修正。
  - design: **agree（2026-08-23，附必落钉 GA1-GA4，不阻塞准入）**。
  - **必落钉 GA1-GA4：**
    - **GA1（措辞同步 GM1）**：真值矩阵行改"stale 副本"口径；本卡与 MEDIA 卡的
      live sharedScripts 修复必须**同源实现**（同一 collector 输入修正），两卡不得
      各自拼第二份合并逻辑——实现顺序上 MEDIA 先行、本卡消费，或反之，二选一写明。
    - **GA2（transport 确定性）**：MIDI transport 的 duration/currentTime/seek/pause
      契约测试用合成 MIDI fixture（固定音长）；WAV PCM 峰值对同一 blob 二次计算
      byte-stable；峰值/音符活动为 SHA 派生临时态（断言不写回 AssetRecord）。
    - **GA3（生命周期竞态）**：快速换选中/换工程/SHA 替换时旧 Promise 丢弃（最后一次
      生效）测试；AudioContext dispose；有界缓存的上限与淘汰测试；**363 项列表禁止
      全量解码**（断言仅可见窗口±buffer 触发解码）。
    - **GA4（虚拟列表合同补齐）**：现有 DsVirtualList 只有基本窗口+Home/End——本卡
      需补方向键选择/roving/aria 后接入，合同测试先行；列表行无播放器/替换/删除按钮
      的 boundary 断言。
  - 独立证据锚点: pending
  - 可证伪观察: pending
- counter / 分歧处理: N/A
- 缺签豁免: N/A
- build 准入结论: blocked

### 进入 done 前:审查签字

- Codex: pending
- Kimi: pending
- GLM: pending
- counter / 返工处理: N/A
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论

#### 1. 页面信息架构

- 页面仍输出 App 现行三列根节点，不再额外嵌套第二个三栏 Workbench。
- 左栏：`DsCatalogControls` + `DsVirtualList` + `DsCatalogRow`。导入是集合动作；替换 / 删除属于当前对象，固定在 Hero。
- 中栏：非滚动 `DsObjectHero` + 可滚动内容区：
  1. `基本信息`：单一显示名称编辑器 + 统一只读属性表。
  2. `试听`：播放器控制区 + 可视时间轴 + 状态 / 错误说明。
- 右栏：`引用 n` 与 `问题 n` 两个 Inspector tab；删除重复的“资源”页。零问题仍保留同一 tab 结构，避免 Music/Sound 漂移。

#### 2. 共享组件与策略边界

- `AudioAssetWorkbench`（或等价单一组件）拥有选择、筛选、目录、Hero、改名、对象级操作、Inspector 与播放器挂载。
- MusicTab/SoundTab 仅注入 `kind`、单位、导入 validator/record builder、引用文案和 preview transport factory；不得复制 JSX 骨架。
- `AudioAssetPlayer` 只依赖 editor 内部的统一 snapshot / transport 接口；MIDI 与 WAV transport 分开实现。
- `AudioTimeline` 接受 `{kind:'pcm-peaks'}` 或 `{kind:'note-activity'}` 的显式判别联合，渲染同一几何但显示真实类型标签。

#### 3. 播放与分析数据流

- 选中 key = `projectId + assetId + record.sha256`；只加载当前选中项。
- controller 状态为 `idle | loading | ready | playing | paused | error`，包含 duration/currentTime/visualization。
- WAV：`readBytes(sound)` → AudioContext decode → compact min/max peaks → buffer transport。pause/seek 通过停止 source 并按 offset 重建。
- MIDI：`readBytes(music)` → BasicMIDI note/time analysis → compact activity buckets；SpessaSynth preview transport 暴露 sequencer 时长、当前时间、pause、seek。
- 播放时仅在可见状态用 rAF 读取后端时钟；暂停 / 隐藏 / 卸载停止 rAF。可视化缓存有界，只缓存 compact buckets，不缓存全工程 PCM。
- read/init/decode 的 generation 必须绑定选中 key；过期 promise 不得更新 UI 或播放。

#### 4. 引用与删除单真值

- 扩展 editor reference adapter，使 main EditSession 与 live ScriptEditSession 的 canonical sharedScripts 共同组成当前作者引用输入。
- 页面展示、删除前重检和保存诊断使用同一 collector；不能只在 UI 临时补一份。
- 删除命令继续保持通用、调用方 fail-closed；确认对话框展示对象和引用数，不自动级联。

#### 5. 性能与可访问性

- 虚拟列表补齐选中 / 方向键 / 滚入视图合同后由两页共享；不能各写一套 keydown。
- 列表不生成波形、不持有名称 draft；中央唯一名称输入，提交前做等值短路。
- 时间轴使用可访问 slider / 等价键盘控件，提供文本时间与 visible focus；canvas/SVG 只作视觉层，不独占语义。
- 导入 / 解码 / 播放错误使用 `role=alert` 或 `aria-live`；播放按钮真实反映 ready/playing，不乐观假亮。

### 已知风险

- 风险: 为 editor 暴露 MIDI transport 时误改游戏 BgmPlayer 接管、fade、loop 或 autoplay 行为。
  - 缓解: 新增窄 preview transport；现有 BgmPlayer 接口和测试保持不变，共享只下沉 Spessa runtime factory / adapter。
- 风险: MIDI 可视概览被误解为录音波形。
  - 缓解: 类型和 UI 都显式命名 `note-activity / 音符活动`；不使用 PCM / 声波文案。
- 风险: 解码 / 分析引发切换卡顿或跨工程旧声残留。
  - 缓解: 单项懒加载、generation、SHA key、inflight 去重、有界 buckets、dispose；浏览器 smoke 专测快速切换。
- 风险: sharedScripts 引用修复扩大现有诊断数量，暴露真实阻断。
  - 缓解: 这是 current author state 正确性修复；用精确 collector fixture 与删除零 mutation 测试钉住，不静默兼容漏扫。
- 风险: `DsVirtualList` 是共享公共接口，补键盘选择可能影响 Design Lab / 其他消费者。
  - 缓解: 先 census consumer；用向后兼容可选 selection props 与共享 contract 测试，禁止页面私补。

### 主审立场

- Reviewer: Kimi 主审跨包 transport / 生命周期 / UI 架构；GLM 主审引用输入、性能与测试矩阵。
- 结论: pending
- 必改项: pending
- 是否建议进入 build: pending

### 三方争议记录(按需)

- Codex: 真实 WAV 波形 + MIDI 音符活动时间轴；新增窄 reforge preview transport，不持久化 duration / waveform，不改 runtime BgmPlayer。
- Kimi: pending
- GLM: premise verified + design agree（2026-08-23，附 GA1-GA4；格式 census 86 MIDI/363 WAV other=0）
- 用户拍板: 2026-08-21 已拍板页面需整体重构并授权布局设计；MIDI 可视化真实性与 transport 风险待三方审查。

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
- 生成目的 / 替换对象: N/A
- 提示词要点 / 风格约束: N/A
- 输出路径: N/A
- 尺寸 / 格式 / 透明背景 / 调色约束: N/A
- 资源登记位置: N/A
- 验证方式: N/A

## 视觉验证记录(如适用)

- Visual Verification Owner: Codex
- Visual Verification Timing: dev-functional
- 验证方式: pending
- 集中 E2E 用例 / 批次: N/A
- 截图 / 像素检查路径: pending
- 结论: pending
- 未完成项: pending

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: pending
- 必须返工项: pending
- Accept / rework: pending

## 用户验收

- 用户结论: pending
- 后续任务: 真实 MIDI 合成 PCM 波形若仍需要，另开离线渲染 / 缓存任务。

## 交接日志

- 2026-08-23 GLM（覆盖/格式 census/性能/测试矩阵）: 审查完成，签 **premise verified +
  design agree（附 GA1-GA4）**。格式 census 全量实测：86 MIDI + 363 WAV、other=0——可证伪
  观察①裁决为不触发；GA1 同步 MEDIA 卡 GM1 的 stale 副本口径修正与同源实现要求；GA2 钉
  transport 确定性；GA3 钉竞态/有界缓存/禁全量解码；GA4 钉虚拟列表合同补齐先行。未改实现，
  未代签 Kimi，未改准入结论。
- 2026-08-21 Codex: 完成现有 Music/Sound UI、catalog/CRUD、引用输入、MIDI/WAV 播放与 Spessa transport 可行性只读审计；
  创建 draft 并签 premise/design。Evidence: 本卡真值矩阵与上下文锚点。Next: Kimi / GLM 独立设计审查；三签齐前不得修改实现文件。

## 下一位 Agent 提示词

```text
接手任务: ED-AUDIO-WORKBENCH-1 音乐 / 音效统一资源工作台与音频时间轴
任务卡: docs/ops/tasks/ED-AUDIO-WORKBENCH-1-audio-resource-workbench.md
当前状态: draft，Codex 已签 premise verified + design agree；build 准入仍 blocked
你的角色: Kimi 负责跨包 transport / 生命周期 / UI 架构审查；GLM 负责引用输入、性能与测试矩阵审查
先读: AGENTS.md、docs/phase2/READ-FIRST.md、本任务卡、editor-design-system-v1.md、A7-0/A7-1 音频边界，以及卡内代码锚点
已完成: 当前两页 / CRUD / 引用 / 播放链审计；冻结左目录、中 Hero+基本信息+播放器、右引用/诊断；WAV=PCM 波形，MIDI=音符活动
请你做: 直接读取一手代码独立核 premise；给出可证伪观察；审查 sharedScripts 引用修复、MIDI preview transport、WAV controller、缓存/生命周期、虚拟列表与验收矩阵；在任务卡签 premise verified + design agree，或 counter 并写明返工项
不要做: 不得修改实现文件；不得把 MIDI 音符活动冒充 PCM；不得改 schema/migration/runtime 游戏语义；不得标记 build/done
输出要求: 更新任务卡对应签字、独立反证审查和主审立场；明确 agree/counter 与 build 是否可准入
```
