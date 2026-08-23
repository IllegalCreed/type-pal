# ED-AUDIO-WORKBENCH-1 - 音乐 / 音效统一资源工作台与音频时间轴

Status: review
Phase: phase2
Capability: X2
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: codex/ed-audio-workbench-1

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
  - 复用 `ED-MEDIA-ASSET-ACTIONS-1` 已完成的 live current-author 引用快照；引用展示、删除门禁和保存诊断消费同一完整输入。
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
| 当前二阶段 | Music/Sound 已使用同一 AssetId/catalog/command 地基，却分别复制目录、表格、资源 Inspector 和预览入口；左栏无资源行，中央全量渲染旧表格。BGM 公共接口未暴露 transport，SFX decoded buffer 也不提供时间轴。`ED-MEDIA-ASSET-ACTIONS-1` 已交付 live scene/item/sharedScript 引用投影与 fail-closed 生命周期合同，本卡直接消费，不再另写合并逻辑。 | `packages/content/src/asset.ts:12-30,74-95`; `packages/editor/src/ui/MusicTab.tsx:202-412`; `packages/editor/src/ui/SoundTab.tsx:206-427`; `packages/editor/src/core/commands.ts:2905-3039`; `packages/editor/src/core/editor-asset-references.ts`; `packages/editor/src/core/script-editor-projection.ts`; `packages/reforge/src/audio/bgm.ts:21-48`; `packages/reforge/src/audio/sfx.ts:40-57,102-221`。 |
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
- 用户裁决: 2026-08-21 用户已批准目标布局并授权 Coding Owner 设计；2026-08-23
  `ED-MEDIA-ASSET-ACTIONS-1` 三方 accept + 用户验收收口后，用户明确“继续”，批准本卡进入 build。

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
  - `packages/editor/src/core/editor-asset-references.ts`、`script-editor-projection.ts`: MEDIA 前置卡已完成 live current-author 引用投影；本卡必须复用。
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
  4. 中央 `DsObjectHero` 与基本信息区共同显示名称、AssetId、格式、来源、大小、引用数；替换 / 删除位于 Hero；删除有引用时阻断并展示原因，无引用时使用 DsDialog 确认。
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
  - premise: verified（2026-08-23 独立直读一手代码与类型声明，非复述）。已核：`MusicTab.tsx:202-250`
    左栏只有 DsCatalogControls 无资源行、中央全量 `.music-table` 旧表格；`bgm.ts:21-48` BgmPlayer 只有
    play/stop/resume/setEnabled，BgmSequencerAdapter 有 pause/play/fade 但无 currentTime/seek——preview
    transport 确需新窄接口；`sfx.ts:40-57` SFX 适配器 decode/play/stop 无时间轴，WAV 预览须 editor 自建；
    spessasynth_lib@4.3.6 `dist/index.d.ts` Sequencer：`get duration`(:1077)、`get/set currentTime`
    (:1131-1135)、`pause()`(:1164)、`paused`、`getMIDI(): Promise<BasicMIDI>`——duration/seek/pause/音符
    分析能力齐全；`virtual-list.tsx:3-59` 只有窗口 + Home/End 滚动，无选择/方向键/roving 合同；
    本人独立 python census：`projects/pal/assets/index.json` music 86 项全 audio/midi、sound 363 项全
    audio/wav，无非目标格式；sharedScripts 缺口同 MEDIA 卡（0ee277ab 后措辞应为 shell stale 副本，
    编辑期无 live 回写，见该卡 Kimi 签字）。
  - design: agree（共享工作台 + 格式策略注入边界正确；MIDI/WAV 双后端判别联合防止假 PCM；新增窄
    preview transport 而非改 BgmPlayer 是对游戏语义的正确隔离；GA1-GA4 落钉可执行。依赖顺序确认：
    ED-MEDIA-ASSET-ACTIONS-1 先行交付生命周期合同，本卡消费，禁止第四套资源操作）
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
- 独立反证审查（至少一位非 Coding Owner 必填）:
  - 审查者: Kimi
  - 独立证据锚点: `node_modules/.pnpm/spessasynth_lib@4.3.6/.../dist/index.d.ts:1077,1131-1135,1164`
    （Sequencer duration/currentTime get+set/pause）；`packages/reforge/src/audio/bgm.ts:6-12,21-48`
    （一阶段守卫注释 + BgmPlayer/BgmSequencerAdapter 现状）；`packages/reforge/src/audio/sfx.ts:40-57`；
    `packages/editor/src/ui/design-system/virtual-list.tsx:3-59`；`packages/editor/src/ui/MusicTab.tsx:202-250`；
    2026-08-23 本人 python catalog census（86 MIDI / 363 WAV / other=0）。
  - 可证伪观察: 若 catalog 存在非 MIDI music 或非 WAV sound，双策略不足须重开格式矩阵——本人 census
    为 0；若锁定版 SpessaSynth 无 currentTime setter 或 pause，MIDI seek 失效须退回只读时间轴——d.ts
    直读证伪；若 preview transport 必须改 BgmPlayer 才能工作，则“游戏语义不变”前提动摇——adapter 层
    已分离（bgm.ts:39-48 独立于 player 接口），证伪未出现；若 ScriptEditSession 的 sharedScripts 在编辑期
    已 live 合并进主会话，引用缺口不成立——coordinator/投影层直读未见（同 MEDIA 卡）。
- counter / 分歧处理: N/A
- 缺签豁免: N/A
- build 准入结论: **allowed（2026-08-23）**——三方 premise/design 齐；MEDIA 前置合同已 done；用户明确批准继续。

### 进入 done 前:审查签字

- Codex: **re-accept（2026-08-23 播放终点返工）**——WAV/MIDI 自然结束统一归一到精确终点；滑块改用 0–1 归一化进度，短于 1 秒的资源显示百分之一秒；MIDI 结束后的停止/拖动与播放中拖动均按显式位置语义收口。真实 `sound.pal.004` 播完后 DOM 为 `value=max=1`、进度线 `x1=160`、`0:00.53 / 0:00.53`；17 条聚焦回归与 editor/reforge typecheck 通过。
- Kimi: pending
- GLM: pending
- counter / 返工处理: 2026-08-23 用户先指出音效正文无法滚动；已将 Hero / 正文结构收敛到共享 `DsObjectWorkspace` 并通过滚动复验。随后用户指出播放提示文字被截半；已将 `DsTooltip`、`DsHelpTip`、select/popover 统一迁入 `DsFloatingLayer` Portal。用户再指出短 WAV 播完后滑块未到头；浏览器一手数据确认资源时长 `0.534s` 被 range 的固定 `step=0.01` 量化为 `0.53`，而波形进度线其实已到 `160/160`。现已改用归一化 range，并将 Spessa `isFinished` 接入 MIDI transport；内部复审继续补齐 Spessa 写 `currentTime` 不会清除 `isFinished`、以及播放中 seek 不得冻结进度的两组边界，返工均已解决。
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
- 右栏：`引用 n` 与 `诊断 n` 两个 Inspector tab；删除重复的“资源”页。零诊断仍保留同一 tab 结构，避免 Music/Sound 漂移。

#### 2. 共享组件与策略边界

- `AudioAssetWorkbench`（或等价单一组件）拥有选择、筛选、目录、Hero、改名、对象级操作、Inspector 与播放器挂载。
- MusicTab/SoundTab 仅注入 `kind`、单位、导入 validator/record builder、引用文案和 preview transport factory；不得复制 JSX 骨架。
- `AudioAssetPlayer` 只依赖 editor 内部的统一 snapshot / transport 接口；MIDI 与 WAV transport 分开实现。
- `AudioTimeline` 接受 `{kind:'pcm-peaks'}` 或 `{kind:'note-activity'}` 的显式判别联合，渲染同一几何但显示真实类型标签。

#### 3. 播放与分析数据流

- 选中 key = `projectId + assetId + record.sha256`；只加载当前选中项。
- 对外可观察状态等价于 `idle | loading | ready | playing | paused | error`，实现可内部组合资源加载状态、播放状态与 transport 暂停态；snapshot 包含 duration/currentTime/visualization。
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
- 结论: Kimi agree（2026-08-23）+ GLM agree（2026-08-23，GA1-GA4）；Codex 已 agree
- 必改项: 无新增；GA1-GA4 为 build 必落钉。
- Kimi build 期关注项（非门禁）: ①preview transport 初始化必须携带 `bgm.ts:6-12` 的一阶段守卫
  （secure context、soundfont RIFF 魔数、CC91=0 锁定、skipToFirstNoteOn=false、懒初始化），只能下沉共享
  factory，不得另起一套丢掉守卫；②MIDI preview transport 不得复用 `BgmSequencerAdapter`（它按游戏语义
  故意无 seek），新接口单列；③WAV pause/seek 用“停止 source 按 offset 重建”属预览可接受语义，但须测
  快速连按不叠音；④DsVirtualList 补选择合同是共享公共接口变更，consumer census 与可选 props 后兼容
  按卡内风险条执行。
- 是否建议进入 build: 是（三签已齐；按本轮用户指令保持 draft 与准入 blocked，开放决定留给用户；
  构建顺序上须在 ED-MEDIA-ASSET-ACTIONS-1 之后消费其生命周期合同）

### 三方争议记录(按需)

- Codex: 真实 WAV 波形 + MIDI 音符活动时间轴；新增窄 reforge preview transport，不持久化 duration / waveform，不改 runtime BgmPlayer。
- Kimi: 同意。补充：transport 可行性已由锁定版类型声明直读证实（duration/currentTime set/pause 均在）；
  架构上最关键的是“共享只到 Spessa runtime factory 层”——BgmPlayer 的游戏语义（接管/fade/autoplay 记账）
  与预览 transport 的 seek/pause 语义天然冲突，合并才是风险，分离不是。
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
- 修改文件:
  - 共享 UI / 页面接线：`packages/editor/src/ui/AudioAssetWorkbench.tsx`、`MusicTab.tsx`、`SoundTab.tsx`、`DataMode.tsx`。
  - WAV preview / 派生缓存：`packages/editor/src/core/audio-preview.ts`。
  - MIDI preview：`packages/reforge/src/audio/midi-preview.ts`、`spessa-browser-runtime.ts`、`bgm.ts`、包入口与依赖清单。
  - 共享目录 / 设计系统：`packages/editor/src/ui/design-system/{virtual-list.tsx,controls.tsx,recipes.tsx,primitives.css}` 与 `editor.css`。
  - 聚焦回归：上述模块的同名测试，以及 `AudioAssetWorkbench.test.tsx`、`AssetInspectorTabs.test.tsx`。
- 实现摘要:
  - Music/Sound 已收敛为单一 `AudioAssetWorkbench`，只由薄策略层注入格式、目录文案、导入/替换和 preview transport。
  - 86 MIDI / 363 WAV 目录使用有界虚拟列表；仅当前选中资源加载。WAV 生成真实 PCM peaks，MIDI 生成明确标注的音符活动。
  - WAV 与 MIDI transport 均支持 play/pause/stop/seek、自然结束重播和 dispose；AudioContext 延迟到用户动作创建，避免 StrictMode render 泄漏。
  - 派生分析缓存真正包住 transport load，支持 inflight 去重、有界淘汰和 SHA 身份；A→B→A 竞态会在旧 A 被中止后重试当前 A，迟到 B 不得覆盖。
  - 页面隐藏时停止 rAF 时钟轮询，恢复可见且仍播放时再继续；切换资源、替换 SHA、卸载会停止旧 transport 并丢弃旧 generation。
  - Hero 持有替换/删除，中央基本信息持有改名/只读元数据；右侧只保留同源引用与诊断，全局保存仍是唯一保存入口。
  - 滚动返工将中央 Hero + 长正文统一接入 `DsObjectWorkspace`；共享正文是唯一滚动 owner，页面只保留音频领域的宽度/背景覆写，不再复制高度、grid track 与 overflow 合同。
  - Tooltip 返工把普通动作提示与问号帮助统一接入 `DsFloatingLayer` Portal；共享层负责 dialog/body host、viewport 避碰、内容宽度和 light-dismiss，业务 CSS 不再用局部定位或 `z-index` 对抗祖先裁切。
- 运行命令:
  - `pnpm exec vitest run packages/editor/src/core/audio-preview.test.ts packages/editor/src/ui/AudioAssetWorkbench.test.tsx packages/editor/src/ui/MusicTab.test.tsx packages/editor/src/ui/SoundTab.test.ts packages/editor/src/ui/AssetInspectorTabs.test.tsx packages/editor/src/ui/design-system/virtual-list.test.tsx packages/reforge/src/audio/midi-preview.test.ts` → 7 files / 26 tests passed，2.13s。
  - `pnpm --filter @type-pal/editor typecheck` → passed。
  - `pnpm --filter @type-pal/reforge typecheck` → passed。
  - `git diff --check` → passed。
  - 滚动返工：`pnpm exec vitest run packages/editor/src/ui/design-system/recipes.test.tsx packages/editor/src/ui/design-system/boundary.test.ts packages/editor/src/ui/AudioAssetWorkbench.test.tsx packages/editor/src/ui/MusicTab.test.tsx packages/editor/src/ui/SoundTab.test.ts` → 5 files / 70 tests passed，2.29s。
  - Tooltip / overlay 返工：`pnpm exec vitest run packages/editor/src/ui/design-system/floating-layer.test.tsx packages/editor/src/ui/design-system/controls.test.tsx packages/editor/src/ui/design-system/boundary.test.ts packages/editor/src/ui/AudioAssetWorkbench.test.tsx packages/editor/src/ui/MusicTab.test.tsx packages/editor/src/ui/SoundTab.test.ts` → 6 files / 72 tests passed，2.74s。
  - Tooltip / overlay 返工后 `pnpm --filter @type-pal/editor typecheck` → passed；`git diff --check` → passed。
  - 播放终点返工：`pnpm exec vitest run packages/editor/src/ui/AudioAssetWorkbench.test.tsx packages/editor/src/core/audio-preview.test.ts packages/reforge/src/audio/midi-preview.test.ts` → 3 files / 17 tests passed，1.82s；覆盖短 WAV 精确终点、MIDI 自然结束、结束后停止/拖动续播、播放中拖动继续推进。
  - 播放终点返工后 `pnpm --filter @type-pal/editor typecheck`、`pnpm --filter @type-pal/reforge typecheck`、`git diff --check` → passed。
- 浏览器 / 手工检查: localhost:6010 的 `ui_samples=1` 音乐/音效真实页面 smoke 已完成，详见视觉验证记录。
- 跳过的检查及原因: 未重复运行完整 editor 长套件；本卡遵循用户要求只执行覆盖改动面的聚焦 Vitest、editor/reforge typecheck 与 `git diff --check`。

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
- 验证方式:
  - 浏览器打开 `http://localhost:6010/?ui_samples=1&module=asset&page=music` 与 `...&page=sound&object=sound.pal.002`。
  - 1280×720 检查左目录、Hero、中央基本信息/时间轴、右引用/诊断与页面横向溢出；同一实现此前已做 1024×720 窄宽度检查，本轮逻辑修复未改 CSS。
  - 真 PAL MIDI 等待到“就绪 / 音符活动”，执行播放、暂停、停止并快速切换 `music.pal.001 → .002 → .001`。
  - 真 PAL WAV 等待到“就绪 / PCM 波形”，执行播放与停止；seek slider 已渲染且 enabled，transport seek 由聚焦自动化覆盖。
  - 最终带时间戳净重载后读取浏览器日志，新增 error/warn 为 0。
  - 滚动返工在 1280×720 音效页直接读取 canonical content metrics：`clientHeight=504`、`scrollHeight=872`、`grid-auto-rows=max-content`、`overflow-y=auto`；实际执行滚动后 `scrollTop=260`（最大 368）。
  - 播放按钮 hover 后直接读取提示层几何：文本“播放”，`rect=396,655–438,683`，1280×720 视口内完整可见；`position=fixed`、父节点为 `BODY`、不在圆角卡片内；浏览器新增 error/warn 为 0。
  - 真 PAL `sound.pal.004`（时长 `0.534s`）自然播放完成后读取 DOM：range `value=1`、`max=1`、ratio `1`；波形进度线 `x1=160`；状态“就绪”；时间 `0:00.53 / 0:00.53`。
- 集中 E2E 用例 / 批次: N/A
- 截图 / 像素检查路径: N/A（浏览器交互 smoke，未保存仓库截图）
- 结论: 音乐 / 音效同源布局、真实时间轴标签、精确播放终点、快速切换、无横向溢出、中央长内容滚动及动作提示跨裁切容器显示均通过；StrictMode 初次卡 loading 与 stale cache 竞态均已修复并复验。
- 未完成项: Kimi / GLM 独立 review 与用户最终验收。

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: Codex 内部只读压力审查发现并已修复 AudioContext render 泄漏、缓存未包住 load、隐藏页 rAF、MIDI 自然结束重播、PCM sentinel、虚拟列表显式焦点与 A→B→A 中止重试问题；用户滚动、Tooltip 裁切与播放终点 counter 均已按共享容器 / 浮层 / transport 合同返工并浏览器复验；Kimi / GLM 待独立验收。
- 必须返工项: 当前无已知 Codex 阻断项；Kimi / GLM 需审查最新共享滚动容器、`DsFloatingLayer` 的 tooltip/help/select 合同与 boundary ratchet，若 counter，任务转 `rework`。菜单类浮层尚未全部迁入该几何 primitive，属于后续全局 overlay consolidation，不阻断本次 tooltip 裁切修复。
- Accept / rework: Codex re-accept（含滚动、Tooltip / overlay 与播放终点返工）；Kimi / GLM pending，`done` 仍 blocked。

## 用户验收

- 用户结论: pending
- 后续任务: 真实 MIDI 合成 PCM 波形若仍需要，另开离线渲染 / 缓存任务。

## 交接日志

- 2026-08-23 User + Codex（播放终点 counter / 返工）: 用户指出短 WAV 播完后滑块未到终点。浏览器测得 `sound.pal.004 duration=0.534`，波形进度线已是 `160/160`，但原生 range 因 `step=0.01` 将值量化为 `0.53`；时间格式又向下取整成 `0:00 / 0:00`。Codex 将 seek UI 改为 0–1 归一化进度、短音效显示百分之一秒，并把 Spessa `isFinished` 接入 MIDI 自然结束与重播合同；内部复审再补 finished→stop、finished→seek→play 及 playing→seek→继续推进三条边界。3 files / 17 tests、editor/reforge typecheck、diff-check 通过；真资源播放后 DOM `value=max=1`、时间 `0:00.53 / 0:00.53`。任务返回 review。
- 2026-08-23 User + Codex（Tooltip 裁切 counter / 返工）: 用户指出播放按钮提示文字被卡片截半，并要求统一处理图层。一手证据确认局部 `position:absolute` tooltip 无法逃逸 `DsWorkbenchSection overflow:hidden`；Codex 将 `DsTooltip`、`DsHelpTip` 与 select/popover 收敛到共享 `DsFloatingLayer` Portal，删除业务页定位补丁，并补内容宽度居中、viewport 避碰、dialog host、ARIA 与 light-dismiss 回归。6 files / 72 tests、editor typecheck、diff-check 通过；浏览器实测“播放”提示父节点为 `BODY`、fixed 且完整在视口内。任务返回 review。
- 2026-08-23 User + Codex（滚动 counter / 返工）: 用户指出音效中央页面再次无法滚动。DOM 一手证据显示私有 `.audio-workspace__scroll` 的两张卡分别从实际 383/431px 被压到约 224px，并由卡片 `overflow:hidden` 裁切；外层 `scrollHeight` 因而错误等于 `clientHeight=504`。Codex 新增共享 `DsObjectWorkspace`，音频页采用 canonical Hero + 单一正文滚动 owner；修复后正文 `504/872`，实际滚至 `scrollTop=260`，5 files / 70 tests 通过。任务返回 review。
- 2026-08-23 Codex 内部 transport/cache 独立压力复核: **accept（不代签 Kimi/GLM）**。直接复核 A→B→A generation 隔离与单次重试、StrictMode 微任务清理、WAV/MIDI serial/dispose 和 MIDI 自然结束重播；独立聚焦测试与 typecheck 通过。仅登记非阻塞 P3：通用 `AudioPreviewCache.clear()` 若未来脱离当前 generation/dispose owner 复用，应增加 epoch/条件删除硬化；当前生产路径不受影响。
- 2026-08-23 Codex（实现 / 集成 / 浏览器验证）: 完成共享音频工作台、WAV/MIDI 双 transport、真实 PCM/音符活动、有界虚拟目录与引用/诊断接线。内部压力审查先后定位并修复 StrictMode AudioContext 泄漏、分析缓存未包住实际 load、隐藏页 rAF、自然结束重播、PCM sentinel、显式焦点和 A→B→A cache 中止竞态；为最后一项新增共享工作台级回归。浏览器验证真 PAL MIDI/WAV 加载、播放状态、快速切换和无横向溢出通过。
- 2026-08-23 GLM（覆盖/格式 census/性能/测试矩阵）: 审查完成，签 **premise verified +
  design agree（附 GA1-GA4）**。格式 census 全量实测：86 MIDI + 363 WAV、other=0——可证伪
  观察①裁决为不触发；GA1 同步 MEDIA 卡 GM1 的 stale 副本口径修正与同源实现要求；GA2 钉
  transport 确定性；GA3 钉竞态/有界缓存/禁全量解码；GA4 钉虚拟列表合同补齐先行。未改实现，
  未代签 Kimi，未改准入结论。
- 2026-08-23 User: `ED-MEDIA-ASSET-ACTIONS-1` 验收收口后明确“继续”；Codex 复核三方签字与
  GA1 依赖已满足，将本卡转 build 并建立 `codex/ed-audio-workbench-1` 分支。
- 2026-08-23 Kimi（跨包 transport/生命周期/UI 架构）: 审查完成，签 **premise verified + design agree**。
  独立直读 SpessaSynth 锁定版类型声明（duration/currentTime get+set/pause 均在）、BgmPlayer 与
  BgmSequencerAdapter 现状、SFX 适配器、DsVirtualList 键盘合同、MusicTab 旧表格；自跑 python
  catalog census（86 MIDI/363 WAV/other=0）。补四条 build 期关注项（一阶段 audio 守卫随 factory
  下沉、preview transport 不复用 BgmSequencerAdapter、WAV 重建式 seek 防叠音、虚拟列表后兼容扩展）。
  确认构建顺序：本卡在 ED-MEDIA-ASSET-ACTIONS-1 之后消费其生命周期合同。三签已齐；按本轮用户
  指令保持 draft 与准入 blocked，开放决定留给用户。未修改实现文件。
- 2026-08-21 Codex: 完成现有 Music/Sound UI、catalog/CRUD、引用输入、MIDI/WAV 播放与 Spessa transport 可行性只读审计；
  创建 draft 并签 premise/design。Evidence: 本卡真值矩阵与上下文锚点。Next: Kimi / GLM 独立设计审查；三签齐前不得修改实现文件。

## 下一位 Agent 提示词

```text
接手任务: ED-AUDIO-WORKBENCH-1 音乐 / 音效统一资源工作台与音频时间轴
任务卡: docs/ops/tasks/ED-AUDIO-WORKBENCH-1-audio-resource-workbench.md
当前状态: review；Codex 实现、自验、滚动与 Tooltip / overlay 返工及浏览器 smoke 已完成，Codex accept；Kimi / GLM review accept 待补
你的角色: Kimi 负责跨包 transport / 生命周期 / 竞态审查；GLM 负责 GA1-GA4、缓存集成、测试矩阵与任务证据审查
先读: AGENTS.md、docs/phase2/READ-FIRST.md、本任务卡、editor-design-system-v1.md、A7-0/A7-1 音频边界，以及卡内代码锚点
已完成: 单一 AudioAssetWorkbench、86/363 有界目录、WAV PCM/MIDI 音符活动、双 transport、分析缓存、A→B→A 竞态回归、共享 DsObjectWorkspace 唯一滚动 owner、DsTooltip/DsHelpTip/select 共用 DsFloatingLayer Portal、聚焦测试/typecheck 与浏览器 smoke
请你做: 直接读取一手实现与最终验证证据，审查 transport 生命周期、StrictMode、缓存/竞态、虚拟列表、GA1-GA4、共享滚动容器、Portal 浮层与 boundary ratchet；在任务卡签 review accept，或 counter 并写明可复现返工项
不要做: review 阶段不得直接修改实现文件；若 counter，请把任务退回 rework；三方 accept 与用户验收前不得标记 done
输出要求: 更新任务卡对应 review 签字与审查日志；明确 accept/counter、证据锚点和剩余风险
```
