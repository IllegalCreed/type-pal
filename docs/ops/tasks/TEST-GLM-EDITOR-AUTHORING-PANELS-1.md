# TEST-GLM-EDITOR-AUTHORING-PANELS-1 — authoring panel state contracts

Status: review
Owner: GLM
Reviewer: Codex（独立验收）
Phase: phase2
Capability: editor / authoring panels
Branch: `codex/glm-editor-authoring-panels-r1`
Visual Verification Timing: dev-functional

## 目标

为编辑器作者面板补充少而精的真实交互合同，覆盖 ProjectWorkbenchTab、ActorMode、CutsceneTab 中尚未被旧测、Kimi 工作流或已归档 GLM Editor 卡证明的状态转换；不以用例数量或覆盖率作为本卡指标。

## 独占范围

只允许新增 `packages/editor/src/ui/` 本卡专属测试、必要合法 fixture 和本卡证据。候选合同：

- `ProjectWorkbenchTab.tsx:269-296,630-672,703-1158`：issue 分组/资源定位、条件种子规范化、空值删除和 party/inventory/stats/resources 的序列化结果；
- `ProjectWorkbenchTab.tsx:1717-1928`：entrypoint focus/default-entry 选择、无效 focus 回退、默认入口切换的 session command oracle；
- `ActorMode.tsx:286-390,1088-1178,1394-1660`：新建/编辑合法性守卫、当前 actor 删除保护、battle sprite/sound 空值删除、NaN/非 battler no-op、initial magic 去重；
- `CutsceneTab.tsx:109-171,360-408,468-565,900-980`：字节/时长格式、视频扩展识别、stale selection、import/delete/discard confirmation 和 object URL 清理；
- 仅做功能性界面最小视觉证据；不重复跑已有剧情 E2E。

先对照 `ProjectWorkbenchTab.test.tsx`、`ProjectWorkbenchTab.glm-m.test.tsx`、`ProjectWorkbenchTab.kimi-workflows.test.tsx`、`ActorMode.test.tsx`、`ActorMode.glm-next-wave.test.tsx`、`CutsceneTab.test.tsx`、`CutsceneTab.glm-ui-wave.test.tsx`、`CutsceneTab.kimi-workflows.test.tsx` 和已归档 `TEST-COVERAGE85-GLM-EDITOR-1` 的 fullName 排重。

## 硬约束

- 走真实组件 caller、合法 typed project/session/asset 输入，断言 session patch、序列化值、确认态或可观察 DOM 业务结果；不只断言渲染存在或调用次数。
- React 更新全部在 act 内，afterEach 必须 unmount/清理 listener、object URL、session；不依赖固定临时路径或真实用户数据。
- 禁止 `as unknown as`、`as never`、`@ts-expect-error`、skip、ignore、扩大 timeout、业务核心 mock 和私有 debug state。
- 反控只接受精确业务 AssertionError；保存原始/变异/恢复三态、执行集、stdout/stderr、三态 hash 和清理证明。

## 验证与交付

交付逐合同 source/caller/input/oracle/fullName 排重账、fresh identity、反控证据、必要截图哈希、typecheck、定向/相邻测试、lint 0/0/0、docs/diff 结果。质量合同闭合后才可交 Codex；覆盖率只记录到整体 main。

## 当前模式推进记录

- Codex 范围/前提核验: verified（已点名旧测试与已归档 Editor 卡排重）
- Coding Owner / 隔离分支: GLM / `codex/glm-editor-authoring-panels-r1`
- build 准入: Codex build allowed（仅上述作者面板合同）
- Codex 独立验收: pending
- done 准入: blocked，须先完成独立验收

## 下一位 Agent 提示词

```text
你是 TEST-GLM-EDITOR-AUTHORING-PANELS-1 的 Coding Owner（GLM）。
先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡，以及已归档
docs/ops/archive/tasks/done/TEST-COVERAGE85-GLM-EDITOR-1.md。
只在分支 codex/glm-editor-authoring-panels-r1 的隔离工作树中工作。
先逐项读取并对照 ProjectWorkbenchTab.test.tsx/ProjectWorkbenchTab.glm-m.test.tsx/ProjectWorkbenchTab.kimi-workflows.test.tsx、ActorMode.test.tsx/ActorMode.glm-next-wave.test.tsx、CutsceneTab.test.tsx/CutsceneTab.glm-ui-wave.test.tsx/CutsceneTab.kimi-workflows.test.tsx 的旧 fullName 与业务断言，再实现本卡仍未证明的合同。
只写新测试、合法 fixture 和本卡证据；不得改产品、旧测、共享配置、baseline、真实项目数据或其它卡目录。
所有 React 更新在 act 内，严格清理 listener/object URL/session；禁止强转、ignore、skip、扩大 timeout、私有 debug state 或业务核心 mock。
反控必须原始绿→指定业务红→恢复绿，保存 raw/JSON/exit/执行集/三态 hash/清理证明；视觉只做功能性界面最小证据。
交付时跑定向/相邻测试、typecheck、lint 0/0/0、docs、git diff --check，提交完整 SHA。
输出 accept 或 counter；不得把覆盖率百分比或测试数量当完成条件，不得标 done，等待 Codex 独立验收。
```

## 交付记录（GLM，2026-10-04，branch `codex/glm-editor-authoring-panels-r1`，base `12247f7e3` = origin/main）

### 新增测试（3 文件 15 例全绿；合集零 act 警告、零 console.error/stderr；共享夹具 `src/ui/__tests__/glm-authoring-kit.ts`）

| 文件 | 例 | 合同 |
| --- | --- | --- |
| `src/ui/ProjectWorkbenchTab.glm-authoring.test.tsx` | 4 | P1 条件弹窗全取消保存→`startWorld.seedConditions` 整键删除（单命令、undo 精确还原）；P2 零改动保存零命令；P3 entrypoint focus 跟随/清空回落直接启动入口/陈旧 focus 保持当前选择；P4 advanced 问题页 focus 入向同步 + 非法 focus 保持当前分组 |
| `src/ui/ActorMode.glm-authoring.test.tsx` | 5 | A1 新建守卫（空字段零派发、重复 id 命令层错误、合法创建可 undo）；A2 删除当前 actor 焦点回落剩余第一名并回报 onActorFocus；A3 战斗音效逐键/整键删除（最后 `battler.sounds` undefined）+ undo；A4 负数拒绝零派发 + 同值 no-op 零派发 + 改值单命令正控；A5 initial magic 每行选项去重 + 全用尽后添加禁用 |
| `src/ui/CutsceneTab.glm-authoring.test.tsx` | 6 | C1 大小行 B/KB/MB 三分支 + 时长分钟支 `1:02.0`；C2 webm（EBML 魔数）识别落账 `.webm` + `.mp4` 名实不符拒绝零提交；C3 选中资源被外部真删除后选择回落且不伪造 focus；C4a discard 确认切换且脏复位（再切不弹窗）；C4b focus 深链确认取消→onCancel 还原 focus、脏保持；C5 卸载回收 objectURL |

fixture：合法 loader 项目（blank seed→真实 loadCurrentProjectFrom→assertProjectSaveValid 自证）+
真命令播种（SetStartupEntriesCommand/UpdateActorCommand/AddSkillCommand/AddActorCommand/
UpsertAssetCommand/CompositeCommand）；条件种子用例用带 `content/poisons.json` +
`manifest.content.poisons` 指针的 loader 变体（保存门毒表校验读 `state.poisons`，prop 毒表不进保存门）。

### 逐合同排重账（source / caller / input / oracle / fullName × 最近旧用例差异）

| # | source | caller | input | oracle | 新 fullName | 最近旧 fullName 与差异 |
| --- | --- | --- | --- | --- | --- | --- |
| P1 | ProjectWorkbenchTab.tsx:1119-1129（patchConditionSeed）+630-660（normalizedConditionSeed） | EntryPointEditor→StartWorldFields 条件弹窗「保存当前状态」 | 合法种子 {poisonIds:[1],statuses:[confused 5],poisonResistance:2}→全部取消勾选 | `manifest.entryPoints[0].startWorld.seedConditions === undefined`（整键）+ 单命令 + undo 深等还原 + assertProjectSaveValid | `P1 条件弹窗全部取消勾选保存：seedConditions 整键删除、单命令、undo 精确还原` | glm-m `已配置毒抗重开取消勾选后保存 → 输出不含 poisonResistance 键` 只证键级 undefined（{} 与缺键不可区分）；本合同钉整键删除 |
| P2 | ProjectWorkbenchTab.tsx:1423-1430（onSave needsRepair/等值判别） | 同上，零改动直接保存 | 合法种子原样打开 | dispatch spy 0 次 + history 不变 + 弹窗关闭 | `P2 零改动打开条件弹窗直接保存：零命令…` | `开局状态在聚合弹窗内编辑，取消零命令、保存单命令…` 的保存臂只证改值后单命令，未证零改动保存零命令 |
| P3 | ProjectWorkbenchTab.tsx:1743-1760（selectedId init+focus effect） | ProjectWorkbenchTab(page=entrypoint) 父级 focus prop 变化 | focus undefined→entry-2→undefined→missing | `.ds-object-hero__title` 随动/回落/保持 + data-selected + 零命令 | `P3 entrypoint focus 活跃同步…` | `:360` 深链只证挂载期；kimi `:587` 只证删除后回选；未证挂载后 focus 三分支 |
| P4 | ProjectWorkbenchTab.tsx:336-364（ProjectAdvancedPage localSelectedId effect） | ProjectWorkbenchTab(page=advanced) focus prop | 真命令制造 sound+video 未引用资源 → 两个 warn 分组；focus 入向 | `.project-center h1` 明细标题随 focus 选中/非法保持 + 零命令 | `P4 advanced 问题页 focus 入向同步…` | `:1765` 只证点击分组回报 focus（出向），未证 focus 入向同步与非法 focus 保持 |
| A1 | ActorMode.tsx:297-326（submitActorDraft 守卫） | 列表头「新建人物」面板「创建」 | 空字段 / 重复 id hero / 合法 npc-a | role=alert 精确文案 + dispatch spy + actors/locale 序列化值 + undo | `A1 新建守卫…` | `:712` 只证空库成功创建；glm-next-wave 只证取消零派发；守卫/重复 id 从未证 |
| A2 | ActorMode.tsx:572-577（onDeleted 回落）+262-267 | ActorDeleteButton「删除人物」 | 真命令播种第二名 NPC→选中→删除 | onActorFocus('hero') + hero 标题回落 + actors + undo | `A2 删除当前 actor…` | `:744` 删 hero-copy 只证 actors/levelUp 清理，未证焦点回落与回报合同 |
| A3 | ActorMode.tsx:359-377（setBattlerSound） | 战斗与成长→SoundPicker「(无音效)」 | 真 WAV 资产 + sounds{attack,dying}→逐键置空 | `battler.sounds` 深等→undefined + 命令数 2 + 双 undo 还原 | `A3 战斗音效空值删除…` | 全部旧测零音效轴（关键词「普攻出招/(无音效)」零命中） |
| A4 | ActorMode.tsx:329-344（setStat）+1358-1392（ActorStatField）+draft 双边界 | 战斗与成长→当前体力输入 -5/100/80 | 负数/同值/改值 | title 校验错误 + dispatch spy 计数 + baseStats.hp 落账 | `A4 非法数值拒绝与 no-op 抑制…` | `:302` 只证合法提交；非法拒绝与 no-op 零派发未证 |
| A5 | ActorMode.tsx:1596-1618（rowOptions 过滤）+1487-1518（addable） | 初始仙术行内 DsSelect 选项集 | AddSkillCommand 播种两技能→添加两行 | 每行 [role=option] 唯一且不含他行技能 + 添加按钮 disabled/title | `A5 initial magic 选项去重…` | `:251` 只证添加/删除/undo 与「已配置」提示，未证选项集排除合同 |
| C1 | CutsceneTab.tsx:109-120（formatBytes/formatDuration）@762-764/776-778 | 检查器属性 tab「大小/时长」行 | 512/2048/3145728 字节真资产；loadedmetadata 62s | `512 B`/`2.0 KB`/`3.0 MB` + `1:02.0` | `C1 检查器大小行按字节三分支格式化…` | kimi `:656/:897` 只证秒支（12.50 秒/0.12 秒）；大小行与分钟支零命中 |
| C2 | CutsceneTab.tsx:152-169（videoExtension） | 隐藏文件输入导入视频 | .webm+EBML 魔数 / .mp4 名+EBML 字节 | record mediaType/path 后缀 + authored 计数 + history + 错误文案 | `C2 视频扩展识别…` | glm-ui-wave 只证 MP4 正控与坏内容拒绝；webm 正控与名实不符拒绝未证 |
| C3 | CutsceneTab.tsx:402-404（stale selection 回落 effect） | 外部真 DeleteAssetCommand | 选中 video.c3-b 被外部删除 | hero 标题回落第一项 + focusLog 空（不伪造回报） | `C3 stale selection…` | kimi `:779` 删除走 UI 显式回选；外部变更回落 effect 未证 |
| C4a | CutsceneTab.tsx:358-374（requestTransition）+935-976（确认弹窗） | 脏帧动画下点击另一资源行 | FrameAnimationEditor 标脏桩触发 onDirtyChange(true) | 确认弹窗→「放弃并继续」→真实切换 + 再切不弹窗（脏复位）+ 零命令 | `C4a discard 确认…` | `:230` 只证「确认替换后取消文件选择器仍脏」，未证确认后切换与脏复位 |
| C4b | CutsceneTab.tsx:383-401（focus effect onCancel 分支） | 父级 focus 深链变更（parentSetFocus） | 脏状态 + focus→video.c4 | 取消后 focusLog 末项=当前选择 + 标题/脏保持 + 再次切走仍弹窗 | `C4b focus 深链确认后取消…` | onCancel 还原臂全旧测零命中 |
| C5 | CutsceneTab.tsx:241-244（EmbeddedVideo effect cleanup） | mount→unmount | 真实视频资产 objectURL 建立后卸载 | objectUrls.revoked 深等 [该 URL] | `C5 卸载回收 objectURL…` | kimi `:656` 只证切换回收；unmount 支未证 |

### 已证不可达（existing-proof，不为触达分支伪造非法状态）

- normalizedConditionSeed 去重/丢废值分支（毒重复、状态重复、毒抗≤0、回合越界）：SetStartupEntriesCommand→validateStartWorld→checkActorConditionSeedShape 与真实 loader 双重拒绝；弹窗复选框/回合 1..999 钳制也无法制造。规范化对合法输入恒等——P2 以零命令钉住该臂。
- 入口 id 修复分支（blank/noncanonical/duplicate）：沿用 K08 卡裁定（kimi-workflows 头注：合法 fixture 不可达，守卫由命令构造器既有测试证明）。
- battle sprite 空值删除：ActorMode 的 BattleSpritePicker 未传 allowUnset（无「无战斗形象」选项），SetActorBattleSpriteCommand 恒要求 player-fighter id；经本组件不可达。
- setStat/setBattlerSound 的「非 battler no-op」守卫：战斗分区对 NPC 不渲染（ActorNonBattler 占位），合法 UI 不可达。
- setStat 的 `!Number.isFinite` NaN 守卫：draft 边界（draft-input-state/number-inputs）对非有限值恒拒绝；A4 覆盖可达面（负数拒绝 + 同值 no-op）。

### 三态反控（13 注入点全过，证据 `evidence/TEST-GLM-EDITOR-AUTHORING-PANELS-1/`）

`run-mutations.mjs` 自动执行并落盘 `mutation-evidence.json`（biome format 后入库）：每注入点含
argv/cwd、JSON reporter 摘录、exit、失败 file×fullName、唯一业务 AssertionError、执行集（排除
skipped）、三态 sha256、产品文件 git-clean 证明；13/13 原始绿→变异红→恢复绿、hash
original==restored≠mutant、产品文件零残留：

| 注入点 | 变异（产品文件唯一锚点） | 定向红的唯一业务断言 |
| --- | --- | --- |
| INJ-1 | patchConditionSeed 整键 `: undefined`→`: {}` | expected {} to be undefined |
| INJ-2 | entrypoint focus 清空重置臂→`if (false)` | expected '序章线' to be '新的故事' |
| INJ-3 | 问题页 focus 同步 `setLocalSelectedId(focusObjectId)`→no-op | expected '未引用资源 · 音效' to be '未引用资源 · 视频' |
| INJ-13 | `needsRepair = !same…`→`true` | dispatch to not be called at all |
| INJ-4 | 新建空字段守卫→`if (false)` | 守卫文案被命令层错误顶替 |
| INJ-5 | sounds 整键 `: undefined`→`: {}` | expected {} to be undefined |
| INJ-6 | 仙术行选项去重 `existingIndex !== index`→`false` | 选项集长度 2≠1 |
| INJ-7 | no-op 抑制 draft+number **双层**同时变异为恒派发（单层变异存活，实证双层持有） | dispatch to not be called at all |
| INJ-8 | `minutes = Math.floor(seconds/60)`→`0` | expected '62.00 秒' to be '1:02.0' |
| INJ-9 | webm 魔数 `bytes[3]===0xa3`→`0xa4` | 导入记录数 0≠1 |
| INJ-10 | stale selection 回落→`if (false)` | expected null to be '回落甲' |
| INJ-11 | 脏确认 `if (!frameEditorDirty)`→取反 | 弹窗 放弃未保存修改 处于打开: false |
| INJ-12 | 卸载 revoke→`if (false)` | revoked [] ≠ [blob:…] |

### fresh identity

8 个排重旧测文件 + 全部触点产品文件（ProjectWorkbenchTab.tsx/ActorMode.tsx/CutsceneTab.tsx/
number-inputs.tsx/draft-input-state.ts/两 kit）与本分支 base `12247f7e3` 逐字节一致（本卡零改动）；
`git status --porcelain -- <产品/旧测路径>` 干净。

### 质量门（本卡范围）

- 定向三文件 15/15 绿；相邻 8 旧测文件 99/99 绿；合集零 act 警告、零 console.error/stderr。
- `pnpm --filter @type-pal/editor typecheck`：0 error（含 author-check）。
- 本卡全部新文件 + 证据 JSON + 卡面：Biome 0 error/0 warning/0 info；`git diff --check` 干净。
- `pnpm check:docs`：本卡项全过（卡/看板/索引一致；若共享树其它卡仍有未上看板项，属其 Owner 范围）。
- 未改产品、旧测、共享配置、baseline、真实项目数据或其它卡目录。无 `as unknown as`/`as never`/
  `@ts-expect-error`/skip/ignore/timeout 扩大/私有 debug state；子组件桩仅沿用两份旧测先例
  （BattleSpriteInlinePreview 展示桩、FrameAnimationEditor 标脏桩，被测对象是三面板本体）。

### 当前模式推进记录（追加）

- Coding Owner 交付：GLM r1 候选已推送（SHA 见分支 tip），等待 Codex 独立验收。

## 下一位 Agent 提示词（覆盖卡内旧提示词）

无下一位 Agent 提示词，等待 Codex 独立验收（验收入口：本卡交付记录 + 三个测试文件 +
`evidence/TEST-GLM-EDITOR-AUTHORING-PANELS-1/mutation-evidence.json`；可复跑
`node docs/ops/tasks/evidence/TEST-GLM-EDITOR-AUTHORING-PANELS-1/run-mutations.mjs`）。
