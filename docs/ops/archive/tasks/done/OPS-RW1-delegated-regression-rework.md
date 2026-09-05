# OPS-RW1 - R13-3 后代班提交回归返工

Status: done
Phase: phase2
Capability: multi（N3 / JS1 / B11 / ED-5J / D13 / E18 / D12 / D6 / D14）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex（Kimi 复审 Debug / D6 功能观感；D14 剧情奖励进入集中 E2E）
Visual Verification Timing: mixed（Debug / Editor / 功能输入可开发期验证；剧情/奖励观感集中 E2E）
Unavailable Agents: Kimi / GLM（本次 done 增量复审未执行；用户于 2026-08-09 明确签字豁免，历史设计签字保留）
Branch: `chore/docs-migrate-cleanup`

## 目标

收口用户于 2026-08-08 指定的 R13-3 后代班提交回归审查结果：修复 6 个 P1、14 个 P2，并完成
1 项用户追加的 Debug 面板视觉返工；恢复
append-only / canonical validator / SAVE8 / 资源闭包 / 编辑器保存与撤销 / 战斗语义 / 音频竞态 /
Debug 与呈现 UX 的可验证契约，并让当前 HEAD 重新通过迁移 oracle、release/canary、全仓类型、测试与
lint 门禁。

审查范围：`d263efd32f346f250fe671025324511eb2a236d8..10833be3bf8b`，共 189 个提交；
R13-3 首实现提交为 `3a03bfdd`。

## 范围

### 范围内：20 项已确认缺陷

| ID | 级别 | 缺陷 | 原任务 / 主要锚点 |
|---|---|---|---|
| A1 | P1 | 已发布 R13-6C seal 可被后续 `--write` 静默覆写 | N3；`packages/migrate/scripts/migrate-content.mts:480`、`pal-r13-six-c.ts:109` |
| A2 | P2 | D13 `enemyOverride/partyPreset` 进入 canonical 内容与生产 runtime | D13；`script-v5.ts:195,614`、`main.ts:1437,2703` |
| A3 | P2 | canonical v5 漏校验 `holdScreen/revealScreen/loadScene.transition` | N3；`script-v5.ts:566`、`script.ts:492,533` |
| A4 | P2 | `SkillData.lifetimeLimit` 未做正安全整数校验 | JS1；`validate.ts:374`、`SkillTab.tsx:799` |
| A5 | P2 | 当前 SAVE8 normalizer 不补、不验 `world.skillUseCounts` | JS1；`save/migration.ts:807`、`save/ops.ts:123` |
| A6 | P1 | `execution` 分支资源未进入引用闭包与进战 readiness | R13-6B；`asset.ts:686`、`validate-refs.ts:277`、`battle-sprite-readiness.ts:57` |
| A7 | P2 | `execution.enemy` 作者契约大于 runtime 实际支持能力 | R13-6B；`validate.ts:416`、`SkillTab.tsx:1044`、`battle-core.ts:2286` |
| A8 | P1 | PAL test oracle 的 content / reforge 两棵 producer-code 指纹均已过期 | N3 / E18；`pal-oracle/v1/manifest.json:153` |
| B1 | P1 | ED-5J 新建私有脚本跨两个 undo 栈，能造出不可保存半状态 | ED-5J；`ItemTab.tsx:956`、`App.tsx:1048`、`project-io-v5.ts:178` |
| B2 | P1 | CasualtyEditor 可保存空 TextId / 小数，再次打开才失败 | E18；`CasualtyEditor.tsx:231`、`project-io-v5.ts:298`、`validate.ts:327` |
| C1 | P1 | BGM 同曲接管淡出时可静音或被旧 stop timer 暂停 | D12；`audio/bgm.ts:219` |
| C2 | P2 | 敌人 fallback cast 未进入 FIRE 动画预载 | R13-5；`main.ts:1637`、`sfx-readiness.ts:313` |
| C3 | P2 | 酒神第 9 次后未从当前 BattleState 移除，下一回合仍可选 | JS1；`battle-core.ts:1197`、`battle-session.ts:1383,2441` |
| C4 | P2 | B11 casualty sweep 扩大到玩家 action / 回合末毒 tick | B11；`battle-core.ts:1057,1088`、一阶段 `battle-system.ts:1069` |
| C5 | P2 | R13-3 全体投掷按目标优先，改变多效果链 RNG 绑定 | R13-3；`battle-core.ts:2098`、`reference/sdlpal/fight.c:5301` |
| D1 | P2 | Debug battle 用 `Object.assign` 回滚，新增 world key 残留 | D13；`dev-preset.ts:15-27` |
| D2 | P2 | Debug 战场 option 无 value，选择得到 `NaN` | D13；`debug-tools.ts:374,526` |
| D3 | P2 | 关闭 Debug 面板不解除 frame-step，世界永久冻结 | D13；`debug-tools.ts:115,590`、`main.ts:4728` |
| D4 | P2 | D6 latch 不保留上一帧 candidate，角色真正离开时迟滞失效 | D6；`render.ts:128,158`、`render.test.ts:183` |
| D5 | P2 | D14-3 reward-gain 多条固定锁输入，未实现 K3 按键跳过；已由 D14-3 自卡 rework 修复，待双审与本卡 E 批复验 | D14-3；`main.ts:3743,4812`、`reward-gain-queue.ts` |

### 用户追加视觉要求

| ID | 性质 | 要求 | UX 真值 / 当前锚点 |
|---|---|---|---|
| D6 | 用户验收要求 | Reforge 引擎 Debug 面板按第一阶段工具面板的视觉语言重做，不能保留当前蓝灰色浏览器长表单观感 | `packages/game/src/tools/tools-panel.ts:74-195,909-1001`；`packages/reforge/src/debug-tools.ts:90-590` |

### 同批门禁债

- 根 `pnpm lint` 当前 119 errors；必须恢复零 error，不用格式化或覆盖用户未提交的
  `docs/ops/archive/tasks/done/D14-3-reward-event-bus.md`。
- `CasualtyEditor.tsx:158,184` 的鼠标专用交互必须改为键盘可达语义控件或补齐 role / tab / key
  行为；不能只 suppress lint。
- `git diff --check` 的 N3 文档尾空格一并收口，但不得改写任务卡历史结论。

### 范围外

- 不新增能力格，不改变 capability-map 完成状态；本卡只修已宣称能力的回归。
- 不实现 D14-3 v1.1 的 `giveItem present` 公共字段。
- 不扩展新的敌方技能效果语义；默认选择缩窄 / fail-closed 当前作者契约，除非 Kimi / 用户明确
  裁决为补齐 runtime。
- 不重做整个编辑器历史架构；只建立能原子覆盖跨 session 用户动作的最小协调层。
- B1 明确取代 ED-5J 原卡“两个 session 各自 undo”的历史设计结论；旧签字保留为历史事实，但当前
  正确合同以本卡的单次跨栈 transaction 为准。
- 不改变 D6 的 0.35 alpha、120ms 时长或 D12 的 300ms 战斗音乐听感常量。
- 不直接修 `projects/pal` 生成产物；任何迁移 / 内容问题先修上游，再由正式命令重生成。
- 不追溯修改原任务卡历史签字；旧卡按历史事实保留，本卡承接新发现的 rework。
- 不从 `@type-pal/game` 跨包导入第一阶段面板实现，不新增 Debug 能力、launcher 或生产入口；只在
  Reforge DEV-only 边界内重组现有五组能力的呈现与交互。

## 上下文锚点

### 已拍板决策 / 铁律

- `AGENTS.md`：开卡任务三方 design agree 后才能进 build；本卡触及 schema/save/migration/
  asset pipeline，必须三方参与。
- `docs/phase2/READ-FIRST.md`：架构优先；一阶段提供 UX 与机制知识，不照搬旧模块；迁移问题先修
  上游，正式写盘后连续迁移第二次必须零 diff。
- `CLAUDE.md`：生成产物不得作为上游缺陷的唯一修复；保留现有工程命令与阶段纪律。
- 用户 2026-08-08 指令：Codex 恢复额度后先审查 R13-3 起代班提交；审查完成后由 Codex 负责返工。
- 用户 2026-08-08 追加指令：后来加入的引擎 Debug 面板观感不合格，必须以第一阶段工具面板样式
  调整；这是本卡的用户验收硬要求，不以“功能未变”为由跳过。
- 用户 2026-08-08 视觉验证分层：剧情/演出/迁移内容观感开发期只登记用例，代码冻结后集中 E2E；
  Debug 面板、编辑器、工具页和功能性输入允许开发期最小视觉验证，禁止多 Agent 重复走剧情截帧。
- 当前工作树已有用户改动：`M docs/ops/archive/tasks/done/D14-3-reward-event-bus.md`；Coding Owner 必须逐字节
  保留，不纳入格式化、回退或任务卡收口。

### 必读设计 / 历史卡

- `docs/ops/archive/tasks/done/N3-1-script-control-flow-modernization.md`
- `docs/ops/archive/tasks/done/JS1-jiu-shen-nine-use-limit.md`
- `docs/ops/archive/tasks/done/B11-1-player-casualty-scripts.md`
- `docs/ops/archive/tasks/done/ED-5J-item-private-script-create.md`
- `docs/ops/archive/tasks/done/D13-1-debug-tools-first-batch.md`
- `docs/ops/archive/tasks/done/E18-1-editor-actor-battle-fields.md`
- `docs/ops/archive/tasks/done/D12-1-audio-transition-layering.md`
- `docs/ops/archive/tasks/done/D6-1-occlusion-semi-transparent.md`
- `docs/ops/archive/tasks/done/D14-3-reward-event-bus.md`
- `docs/phase2/reference/phase1-knowledge-harvest.md`
- `docs/phase1/game-mechanics.md`：队友阵亡 / 濒死节、巫抗 / 投掷 / 毒脚本节。
- `docs/phase1/engineering-notes.md`：BGM 诊断与 cover-tile 视觉排查经验。
- `packages/game/src/tools/tools-panel.ts:1,74-195,909-1001`：第一阶段工具面板 UX 真值；左上悬浮、
  88px 左竖 Tab、金 / 朱 / 暗底、宋体标题与正文层级、紧凑 unit / input / button / scrollbar。
- `packages/reforge/src/debug-tools.ts:90-590`：当前 720px 右上蓝灰等宽长表单与五组 Debug 能力；视觉
  返工必须保留 console / inspect / triggers / battle builder / layers & frame-step 的功能闭包。
- Playwright 设计基线：`output/playwright/ops-rw1/phase1-tools-baseline-1280x720.png`；改前对照：
  `output/playwright/ops-rw1/reforge-debug-before-1280x720.png`（均为 ignored 验收产物，不入 git）。

### 已知坑

- oracle 指纹必须在 `packages/content/src`、`packages/reforge/src`、`packages/migrate/src` 等 producer
  代码最终稳定后重录；当前 verify 明确同时报告 content 与 reforge 两棵树漂移，中途或最终更新均须
  同时核对两棵树，不能只修 content 后宣称 oracle 恢复。中途“更新到绿”不能作为最终证据。
- 当前大多数单测是绿的，缺陷集中在跨边界闭环：save→load、两个 history 栈、author schema→
  readiness→runtime、同曲 fade timer、上一帧 candidate 与真实输入路径。
- 第二阶段不把 SDLPal 模块结构当真值；C4/C5 只用一阶段与源代码确定迁入 PAL 内容的可观察语义，
  新实现仍须保持干净的 phase2 架构。
- Debug-only 数据不得继续出现在 `@type-pal/content` canonical author shape；生产内容与调试宿主必须
  是不同类型边界。
- 半状态不可由“投影时隐藏”解决；编辑器一次用户动作必须具备原子 apply / rollback / undo / redo。
- validator 不能只相信 TypeScript 类型；JSON、存档、编辑器保存边界都必须验证 unknown。

### 不得重新引入

- 自洽重签已发布 seal、静默修复 corrupted save、未知字段/类型 fail-open。
- 只补当前 PAL 内容、却继续允许编辑器生成 runtime 不支持的合法内容。
- 为修敌方 execution 合同而把不明确的新战斗语义猜进 runtime。
- module-level / scene-leaking latch、debug flag 或全局状态。
- 固定 sleep 但没有可取消 / 可跳过完成通道的模态呈现。

## Draft：设计与风险

### 批次 A：上游 trust boundary / append-only / save / resource closure（必须最先）

1. **A1 6C append-only**：为 R13-6C 建立与其它已发布 transition 同级的状态判别：
   `absent -> install expected`；`complete -> published body / metadata / managed / hash 与重建 authority
   完全相等，否则 fail-loud`；`half-state -> fail-loud`。complete replay 必须按 R13-Z 先例对 published
   seal 全 body 与重建 authority 做 `isDeepStrictEqual`，并从 body 重算 digest 校验 metadata / hash；
   不能只信 seal 内自报 digest 字符串。已发布且相等时保持原字节，不重新 set。
2. **A2 dev-only 隔离**：从 `AuthorCommandV5`、Reforge compiler、`ScriptHost.startBattle` opts 与 v5
   canonical host request 类型同步移除
   `enemyOverride/partyPreset`；保留 Reforge 内部 `DebugBattleRequest`，只从 `import.meta.env.DEV`
   动态入口调用受校验的内部战斗 gateway。`startBattleDev` 必须复用 v5 host 的 intent 断言与
   frame-step 状态处理，不得另开裸调 `host.startBattle` 的旁路。普通 canonical JSON 即使手写这两个
   字段也必须被拒绝。
3. **A3 canonical command 校验**：让 v5 unknown boundary 对 `holdScreen`、`revealScreen`、
   `loadScene` 及 transition exact keys / 类型 / 非负有限时序执行与 legacy 同等严格的专属校验，
   不把 v5 新控制流降回 legacy validator。
4. **A4 lifetime/save**：`lifetimeLimit` 缺省合法；存在时必须正安全整数。编辑器输入 `min=1,
   step=1`，最终 validator 仍是权威。SAVE8 content10/11 缺 `skillUseCounts` 补 `{}`；存在时必须是
   `actorId -> skillId -> 非负安全整数`，畸形存档拒绝，不 clamp / 猜值。
5. **A6/A7 execution 合同**：统一“有效执行分支”的遍历口径，资产引用、battleSprite 引用、SFX、
   FIRE、进战 readiness 都覆盖 top-level + player/enemy overrides；battleSprite 视觉闭包还必须覆盖
   敌 AI 可达的全部 cast 技能（rules、静态 fallback、hook `setFallback`），包含其 top-level 与有效
   override，不得只补 execution 分支。三类后果分层测试：battleSprite 缺闭包可 fail-loud，FIRE / SFX
   缺闭包会静默缺演出/音效。默认不新增敌方效果能力：编辑器
   `enemy` 面板只开放 runtime 已支持集合，reference validator 对 enemy-reachable cast 的有效效果 /
   prepare fail-closed；本卡裁决采用缩窄作者契约，不补猜测性 runtime 语义。
6. **A8 oracle**：A 批代码稳定后先重录一次 producer oracle，并逐项审查、重 pin 当前同时漂移的
   `packages/content/src` 与 `packages/reforge/src` 两棵 producer 树，证明迁移门禁恢复再进入下游；
   后续 producer 改动允许产生可解释漂移，但最终 E 批必须再次对两棵树终录与全验。

### 批次 B：编辑器数据完整性

1. **B1 跨 session 原子历史**：引入最小 `EditorHistoryCoordinator`（具体命名可调整），只协调现有
   两套同构栈与唯一跨栈调用点，把“新增 canonical 私有正文 + shell ref”作为一个 transaction。
   第二笔失败时必须走新增的沉默回滚接口，或在回滚后明确清空对应 future；禁止调用普通 `undo()`
   留下可被 redo 复活的半状态。全局 undo / redo 一次完成两边且顺序固定，并在 App 分发中显式优先于
   `historyOwnerRef` 猜测。`tolerateMissingPrivateScript` 投影保留为防御性容错，但不得把它当一致性
   机制或让保存边界静默吞正文。验收覆盖三种故障：保存 fail-loud、保存成功却静默丢正文、创建第二笔
   失败却未回滚第一笔。
2. **B2 actor 保存闭环**：`serializeProjectV5` 必须调用 actor / casualty 权威 validator；UI 数字
   输入约束整数。空 TextId 可作为未完成编辑态存在，但保存必须显示明确错误、不得写出下次打不开的
   工程；若采用本地 draft，不得制造绕过 undo 的第二真源。

### 批次 C：runtime / 战斗 / 音频

1. **C1 BGM 接管**：同曲请求也必须成为 serial owner；若存在切曲或 stop fade，取消旧 ramp / timer
   并把 gain 恢复到 1，但不 reload / restart 同一 MIDI。覆盖“切 B 中回 A”和“stop 中回 A”。
2. **C2 FIRE readiness**：敌方可达技能集合覆盖 `rules`、静态 fallback 与 hook `setFallback`；
   FIRE 与 SFX readiness 使用同一 reachability 口径，至少钉住 `enemy-408 -> skill 305 -> chunk 41`。
3. **C3 lifetime 当场删除**：第 `lifetimeLimit` 次真实成功施放后，同步从当前 `BattlePlayerState`
   技能集合移除，同时保留既有 world mutation；下一回合菜单不可再提交。
4. **C4 casualty gate**：把 sweep 恢复为明确的受击来源门，只在迁入 PAL 内容所需的敌方攻击 /
   敌方法术结算触发；玩家 action、友伤和回合末毒 tick 不触发。用 phase1 实现作知识参考，不能
   复制其模块耦合。
5. **C5 throw effect ordering**：改为 effects 外层、targets 内层，保持目标顺序稳定；用真实多效果
   全体投掷 + 可控 RNG 钉住魔伤、下毒、即时致死的调用序。

### 批次 D：Debug / render / reward UX / lint

1. **D1-D3 Debug**：快照恢复先删除 saved 中不存在的 own keys，再恢复 clone；field option 显式
   `value=String(id)` 且提交前 finite 校验；close 无条件解除 frame-step 并清 step request。
2. **D4 occlusion**：latch 保存到期前所需的 candidate payload，而不只 key；本帧候选为空时仍能
   输出旧瓦片 alpha 0.35，过 120ms 自动清理；Renderer 换场景继续天然 reset。
3. **D5 reward skip**：把当前条目的 timeout 与用户 advance 合并到单一可取消完成通道；Enter /
   Space 跳过当前条，Esc 不绑定 reward skip，保留关闭 / 菜单语义。跳过只推进当前条，不丢后续队列，
   不留 timer。
   - 2026-08-08：用户询问 D14-3 收口时，Codex done 前复核签 counter 并已在 D14-3 自卡完成该
     rework：`RewardGainQueue` + fake-timer 4 测 + Reforge 825 + Playwright 双条 `leaks=0`。当前等待
     Kimi / GLM 对 D14-3 增量 re-accept；OPS-RW1 最终 E 批仍须复验，不重复实现。
4. **D6 Debug 视觉返工**：在 Reforge 私有模块内复刻第一阶段稳定视觉 token，不做跨包运行时依赖：
   左上 `16px`、暗色半透明 + blur、金边与朱红 glow、宋体层级、金朱按钮、暗红输入、紧凑 unit 卡与
   定制滚动条；面板目标宽度 `min(520px, calc(100vw - 32px))`、`max-height:84vh`，复杂表单允许换行。
   现有内容重组为 `状态 / 指令 / 触发 / 战斗 / 图层` 五个 88px 左竖 Tab，标题改为“仙剑 · 调试”，
   runner / dialog 状态收进紧凑 header。不得用 inline style 继续堆页面，统一由幂等 scoped style
   注入与语义 class 驱动；使用 Reforge 独立 `STYLE_ID`（不得复用 `tp-tools-style`），重复安装不重复
   注入，卸载时移除。不得改变命令、脚本、战斗构建和帧步进业务路径。
5. **D6 键盘 / 状态纪律**：tab 使用 `tablist/tab/tabpanel`、roving `tabIndex`、`aria-selected` 与
   Arrow/Home/End；所有按钮 / 输入保留可见 `:focus-visible`，不照抄第一阶段隐藏 focus ring 的缺点。
   各 panel 保持挂载，以 `display:none` 或等价的状态外置隐藏，切 tab 不丢表单 / console `<pre>`
   输出，打开战斗 tab 时刷新所需数据；面板内输入隔离、Esc close 与 D3 frame-step 清理保持同一
   生命周期。
6. 修完代码后运行 Biome；对 a11y 做真实语义修复，不使用 ignore。机械格式化仅限本卡实现文件，
   明确排除用户 dirty 的 D14-3 任务卡。

### 批次 E：最终迁移 / oracle / release 收口

1. producer 代码最终稳定后运行 `test:oracle:update`，同时审查 content / reforge 两棵 producer 指纹与
   明确 fixture 变化，不接受只重 pin 其中一棵的半绿结果。
2. 运行 R13-Z/6C/6D published replay 与 mismatch 负例；旧 6C seal `82e9f8f3…` 必须保持不变。
3. 正式 `migrate:content -- --write` 后立即二跑和独立 dry-run，必须
   `writes=0 deletes=0 conflicts=0`；任何生成变化必须能追到上游且过白名单。
4. 全仓 release、lint、build 与功能性浏览器闭环通过后才进 review；剧情/内容观感只需完成可执行
   E2E 登记，实际视觉集中到代码冻结后的 E2E / 用户验收批次。

### 已知风险与缓解

- 风险：B1 若在 App 临时拼接普通 undo，future 会保留半状态，未来其它跨 session 操作也继续漏。
  - 缓解：做只覆盖现有两栈与唯一调用点的最小 transaction coordinator；增加沉默回滚 / future 清理
    接口，并以三故障变体、undo / redo、save-reopen 定义合同；不扩成泛化状态框架。
- 风险：A7 缩窄 enemy 能力可能拒绝未来内容。
  - 缓解：只拒绝 runtime 本来就静默忽略的形状；当前 PAL 全量引用验证必须过，错误带 skill / enemy
    路径；未来扩能力时显式扩 schema + runtime + readiness。
- 风险：C4/C5 误把“参考旧行为”变成重建旧架构。
  - 缓解：只冻结输入来源、效果顺序和 RNG 序列等可观察合同；实现留在现有 battle-core 数据模型。
- 风险：oracle 更新掩盖非预期漂移。
  - 缓解：先跑 verify 记录旧→新差异，producer 变更清单与 manifest 字节/文件数逐项写回 Build；更新后
    再跑 anti-tamper 与 self-edited projection 负例。
- 风险：任务跨度大，单次 diff 难审。
  - 缓解：Coding Owner 仍只有 Codex，但按 A→B→C→D→E 小批提交 / 证据分段；每批先 targeted
    再 package gate，最终统一 review。

## 验收条件

### 功能 / 负例

- A1：已发布 6C 全 body deep-equal 且 body 重算 digest 一致时零写入；任一四态缺失、body / metadata /
  hash 或重建 authority 漂移时 fail-loud，历史 digest 不变。
- A2/A3：普通 canonical 内容及 host 类型拒绝 debug 字段与三类畸形转场命令；DEV builder 仍经同一
  intent / frame-step gateway 正常开自定义战斗。
- A4/A5：skill / save 边界拒绝 0、负数、小数、字符串、对象；content10/11 缺计数安全补空。
- A6/A7：execution-only summon/trance/animation/sound/poison 进入全部闭包；敌 AI 可达 cast 的
  top-level/override battleSprite 也全闭包；缺失的 fail-loud / 静默资源分层负例均钉。敌方不支持效果
  保存或引用时明确拒绝，不再“合法但无效果 / 施法中崩溃”。
- B1：新建私有脚本是一次历史动作；第二笔失败沉默回滚且不能 redo 复活半状态；保存 fail-loud、保存
  静默丢正文、创建失败未回滚三变体全部被测试拦截；编辑后连续全局 undo / redo 仍可保存并重开，正文
  和 shell 一致。
- B2：空 TextId / 小数无法成功序列化；合法 casualty 保存→重开等价；gate/fallback 可键盘操作。
- C1：两个已复现竞态均保持 A 正常响、无 reload/restart、无旧 pause。
- C2：静态 fallback 与 hook fallback 技能的 FIRE 均预载，现有 85 个 fallback-cast 内容闭包无缺口。
- C3：第 9 次后当前战斗菜单不再出现酒神；第 10 次不可能作为正常 action 提交。
- C4：敌方有效攻击仍触发 casualty；玩家 action / 友伤 / 毒 tick 不触发且不消费 casualty RNG。
- C5：两目标、多效果投掷调用序为 effect→targets，RNG 归属有 deterministic oracle。
- D1-D3：Debug 结束 world 深等于战前；战场 id 为有限数；关闭面板后 gameplay clock 恢复。
- D4：角色离开且本帧无任何同 tile candidate 时，50ms 仍 0.35、超过 120ms 恢复。
- D5：三条 reward 可由 Enter / Space 逐条跳过；Esc 保留关闭 / 菜单语义；无输入时仍自动 1400ms
  推进，取消 / 场景切换不留 modal/timer。
- D6：1280×720 下观感与第一阶段工具面板同源：左上金边暗底、朱红 glow、宋体标题、左竖标签与明确
  section / unit 层级；不再出现右上半屏蓝灰长表单。五组能力均可达，520px 面板不裁切控件；
  1024×768 下无横向溢出。键盘可遍历五个 tab 与全部控件，切换后已填表单值与 console 输出不丢，
  `:focus-visible` 清晰，关闭后不残留 style 以外的面板生命周期状态。

### 自动测试 / 命令

- Targeted Vitest：每个 A1-A8、B1-B2、C1-C5、D1-D5 至少一条先红后绿回归；异步 timer 使用
  `vi.useFakeTimers()` / 可控 clock，避免真实 sleep。
- Debug DOM 测试：五 tab 语义 / roving keyboard、panel 切换与状态保留、input key 隔离、Esc close +
  frame-step reset、重复安装 / 卸载生命周期；不得只做 CSS 字符串快照。
- `pnpm --filter @type-pal/content check`
- `pnpm --filter @type-pal/editor check`
- `pnpm --filter @type-pal/reforge check`
- `pnpm --filter @type-pal/game check`
- `pnpm --filter @type-pal/migrate run test:oracle:verify`
- `pnpm --filter @type-pal/migrate run check:fast`
- `pnpm --filter @type-pal/migrate run test:canary`
- `pnpm --filter @type-pal/migrate run check:release`
- `pnpm --filter @type-pal/migrate run migrate:content -- --r13-z --r13-6c --r13-6d`
- `pnpm --filter @type-pal/migrate run migrate:content -- --write`，随后独立 dry-run 0/0/0。
- `pnpm --filter @type-pal/editor build`
- `pnpm --filter @type-pal/reforge build`
- `pnpm lint`
- `pnpm check`（若 workspace 并发导致已知 pal-extract 30s 资源争用，须独立复跑原测试并记录；不得用
  独立通过掩盖其它真实失败）。
- `git diff --check`

### 浏览器 / 手工验证

- Editor：新增私有脚本→编辑→全局 undo/redo→保存→重开；Casualty 空值错误、合法值保存重开、
  键盘选择 gate/fallback。属于功能性工作流，开发期验证。
- Reforge `?debug`：逐个走通 `状态 / 指令 / 触发 / 战斗 / 图层`；选择非首战场进入战斗；设置
  frame-step 后 Esc 关面板恢复移动；使用酒神的 Debug 战斗退出后 world / save 不留新增字段。属于
  Debug 功能性界面，开发期验证。
- Reforge 功能性：多产物 reward 自动推进与按键逐条跳过、D6 贴墙离开 120ms 可开发期最小验证；
  D12 快速切曲 / stop→resume 以音频序列与集中验收处理。
- 集中剧情 E2E 登记：奖励/事件相关宝箱、偷窃、合成、结算入口；迁移剧情与演出只在代码冻结后
  集中走一次，预期与证据路径按各原卡汇总，不在 A→D build 期间逐卡截图。
- Debug 面板属于功能性 UI，Playwright 开发期固定 1280×720 对照
  `output/playwright/ops-rw1/phase1-tools-baseline-1280x720.png` 与最终
  `output/playwright/ops-rw1/reforge-debug-final-1280x720.png`；另留 1024×768 响应式图并走五 tab
  键盘路径。Kimi 可复验 Debug / D6 功能观感；D14 剧情奖励不在开发期重跑，D12 以 adapter gain
  序列 + 集中用户可听验收为主。

### 文档

- 本卡记录每批修改文件、测试数字、迁移 diff、oracle 前后指纹、浏览器证据与剩余风险。
- 原任务卡只在必要处追加“缺陷由 OPS-RW1 收口”的链接，不改历史签字；若用户 dirty 文件仍未提交，
  本卡不得触碰它。
- 不改变 capability-map 状态；若审查发现某能力声明必须降级，先请用户裁决。

## 推进签字

签字是阶段门禁。Codex / Kimi / GLM 三方 design agree 已满（2026-08-08），build 准入 allowed；
Coding Owner 可按 A→E 批次开始实现，done 前仍需三方审查签字。

### 进入 build 前：设计签字

- Codex: **agree（2026-08-08）**——20 项复现与代码锚点已核；A→E 上游优先顺序、失败边界、
  原子历史与测试矩阵可实现。默认 A7 采用 fail-closed / 缩窄作者契约，不猜新敌方语义；D6 采用
  第一阶段视觉 token + Reforge 私有五 tab 结构，并保留可见键盘焦点。
- Kimi: **agree（2026-08-08，复核转签）**——5 条 counter 与 GLM 双 producer 补充均已逐项核实
  落卡，方向无变化，无新增缺口。原 counter 5 条（复核确认全部落实）：
  1. **B1 回滚通道接口写死**：✅ 批次 B 已写明沉默回滚 / 清 future、禁普通 `undo()` 复活半状态、
     成对 undo/redo 显式优先于 historyOwnerRef；范围外显式取代 ED-5J 双栈决策；
     `tolerateMissingPrivateScript` 保留为防御且不得当一致性机制；三故障变体进入验收。
  2. **A6 补闭包范围声明**：✅ 批次 A 已写明敌 AI 可达全部 cast 技能（rules / 静态 fallback /
     hook setFallback）含 top-level 与有效 override 全量进入 battleSprite 视觉闭包；三层后果分层测试。
  3. **A2 移除面写全**：✅ AuthorCommandV5 / Reforge compiler / ScriptHost.startBattle opts / v5
     canonical host request 四面同步移除；startBattleDev 复用 v5 host intent 断言与 frame-step 处理；
     锚点笔误已修正。
  4. **A1 相等判别看齐 R13-Z 先例**：✅ 批次 A 与验收均写明全 body `isDeepStrictEqual` + 从 body
     重算 digest 校验 metadata / hash，不信 seal 自报 digest 字符串。
  5. **D5 按键口径（Kimi 裁决确认项）**：✅ Enter / Space 跳过当前条，Esc 不绑跳过、保留关闭 /
     菜单语义，已入批次 D 与验收。
- Kimi 对交办问题的结论：A7 采**缩窄作者契约**（已核 pal 全量数据：enemy 分支仅用
  gate/applyStatus/resourceDelta/instantKill/applyPoison 五种，均在 runtime 支持集内，fail-closed 不伤
  现有内容）；B1 coordinator 边界=仅协调现有两套同构栈、单一跨栈调用点（已核实全编辑器仅此一处），
  不泛化框架；D6 视觉映射方向认可，细节见「Draft：主审立场」。
- Codex counter resolution（2026-08-08）：Kimi 5 条已逐项写入范围 / A-B-D 批 / 风险 / 验收——
  B1 沉默回滚与三故障变体并显式取代 ED-5J 双栈决策；A6 敌 AI 可达 cast 全闭包与三层后果；A2
  ScriptHost/v5 request 全移除面及同一 intent/frame-step gateway；A1 body deep-equal + 重算 digest；
  D5 Enter/Space 跳过、Esc 保留菜单。D6 的保活 DOM、独立 STYLE_ID、卸载清理也已并入；GLM 的
  content/reforge 双 producer 与 4 处锚点微调同步落地。方向未改，等待 Kimi 复核转 agree。
- GLM: **agree（2026-08-08，条件 = Kimi 5 条卡文修正落地）**——20 项缺陷 + D6 用户视觉要求
  全部逐条抽样核实属实，无漏项；SAVE/schema/save/migration/oracle 矩阵与 C4/C5 来源/RNG 覆盖可
  实现且 fail-closed。A7 缩窄作者契约方向与 Kimi 一致（GLM 复核：pal 全量 enemy 分支当前仅用
  gate/applyStatus/resourceDelta/instantKill/applyPoison，均在 runtime 支持集，fail-closed 不伤现有内容）。
  GLM 以 Kimi counter 的 5 条卡文修正确认为 build 准入前置——数据侧补充与加签如下。
  - **A8 第二棵 producer 漂移树**：实跑 `test:oracle:verify` 2/2 失败属实；除锚点 `manifest.json:153`
    （packages/content/src，files=40 bytes+6145）外，**packages/reforge/src 也漂移**（files+6，
    bytes+60596）。A 批“中途重录”与 E 批“终录”必须两棵树一起重 pin，否则 oracle 只能半绿；卡文
    A8 / E 批应显式声明双树。
  - **SAVE/schema 数据矩阵确认**：A4 `lifetimeLimit` 在 validate.ts 全文零引用、`<N` 输入无 min/step
    守卫；A5 `normalizePayloadV8`（migration.ts:807）对 `world.skillUseCounts` 不补不验，仅 SAVE4 信封
    路径（ops.ts:123）backfill——负例矩阵（0/负/小数/字符串/对象 + content10/11 缺计数）必须双边界
    （skill 校验 + save normalizer）都钉。
  - **迁移/release 工具链确认**：test:oracle:verify / :update、test:canary、check:fast、check:release、
    migrate:content 六脚本均在 packages/migrate/package.json 且 wired 正确；oracle 项目在 vitest.config
    隔离、test:fast 正确排除。双跑幂等（writes=0 deletes=0 conflicts=0）作为收口门禁维持。
  - **C4/C5 内容覆盖确认**：C4 reforge 在每个 action + 回合末毒 tick 无门扫 casualty，phase1
    shouldCheckPlayerCasualties 只门敌方受击来源；C5 reforge targets 外层 / effects 内层，与 sdlpal
    fight.c（effect 驱动、all-target 内层循环）相反，多效果全体投掷 RNG 归属改变。两例均须 deterministic
    oracle 钉序，不只断言“绿”。
  - **锚点微调（非阻塞，供 build 期定位）**：A5 ops.ts:109→123（实际 backfill 行）；C4 battle-core.ts
    1054/1083→1057/1088（实际 sweep 调用）；C5 2095→2098（循环起点）；D2 521→526（实际 NaN 位）。
- counter / 分歧处理: Kimi 5 条卡文修正 + GLM A8 双树声明已落地并经 Kimi 复核确认；方向无三方
  分歧，无未决 counter。
- 缺签豁免: N/A（三方均正式 agree，满签）
- build 准入结论: **allowed（2026-08-08，Codex / Kimi / GLM 三签齐）**

### 进入 done 前：审查签字

- Codex: **accept（2026-08-09）**——20 项已确认缺陷、Debug 视觉返工、D14-3 集成复验及追加发现的
  历史 R13-5 / R13-6A source-ledger 双 profile、R13-Z rewind、battle sprite ledger 均已收口；迁移
  fast / canary / release、全包测试、build、Biome 与功能性浏览器验证通过。
- Kimi: **waived by user（2026-08-09）**——不得解释为 Kimi 本人 accept；用户明确“签了”，批准本卡在
  没有本次增量 Kimi 复审签字的情况下收口。2026-08-08 的 design agree 仍按历史事实保留。
- GLM: **waived by user（2026-08-09）**——不得解释为 GLM 本人 accept；用户明确“签了”，批准本卡在
  没有本次增量 GLM 复审签字的情况下收口。2026-08-08 的 design agree 仍按历史事实保留。
- counter / 返工处理: Codex 审计发现的 6 P1 + 14 P2 全部闭环；完整 release 初轮仅有 3 个重型用例
  的误超时，隔离证明断言正确后只调整对应 release-only 预算，并以两轮完整 release 复验。
- 缺签豁免: **用户明确批准（2026-08-09）**；仅豁免 Kimi / GLM 本次 done 增量复审，不豁免测试、
  迁移发布纪律或用户最终验收。
- done 准入结论: **allowed（2026-08-09，Codex accept + 用户缺签豁免 + 自动门禁全绿）**

## Draft：主审立场

- Reviewer: Kimi（架构 / 公共边界 / undo / UX）+ GLM（数据 / 迁移 / 测试矩阵）
- Codex 结论: agree；建议两席可并行设计复审。
- Kimi 结论: **agree（2026-08-08，复核转签）**——5 条 counter 卡文与 GLM A8 双 producer 补充
  逐项核实全部落实，无遗漏、无新增缺口，counter 解除（见上签字表）。
  - D6 UX 主审补充（落 build 期要求，不阻塞签字转换）：
    - 视觉 token 与一阶段真值（tools-panel.ts:74-195）一致，五 tab 与功能闭包映射确认：
      状态←世界检视、指令←cheat console、触发←脚本/触发器、战斗←battle builder、
      图层←layers + frame-step。
    - 切 tab“不丢 console / 表单状态”须以 `display:none` 保活 DOM（或等价状态外置）实现，不得卸载
      重建；console `<pre>` 输出与 battle builder 已填字段是验收点。
    - 正确不照抄 tools-panel.ts:113-114 的 `outline:none` 缺点；`:focus-visible` 必须可见。
    - scoped style 用独立 STYLE_ID（不复用 `tp-tools-style`），幂等注入、卸载时可移除。
    - 520px 宽 + `max-height:84vh` + 1024×768 无横向溢出的响应式口径认可；复杂表单允许换行正确。
  - 批次边界：A→E 五批 + 每批小步提交证据分段，跨度可接受；A8 oracle“中途重录 + E 批终录”的
    双更新纪律必要，维持。
- GLM 结论: agree（条件，2026-08-08）——20 项缺陷 + D6 全部逐条抽样核实属实、无漏项；
  SAVE/schema/save/migration/oracle 数据矩阵 fail-closed 可实现；migration/release 六脚本 wired 正确；
  C4/C5 来源/RNG 覆盖正确。数据侧以 Kimi counter 5 条卡文修正确认为前置，另追加 A8 双 producer
  树重 pin 声明 + 4 处锚点微调（见签字表）。方向无分歧；Kimi 5 条落卡即满三签可进 build。
- 必改项: 无未决项；Kimi 5 条 + GLM A8 双树声明已落实并复核确认。任何签字不得以
  “现有测试大多为绿”跳过跨边界负例。
- 是否建议进入 build: **是（2026-08-08 三签满，build 准入 allowed）**。

## 额度 / 代班记录

- 缺席 Agent: Kimi / GLM（仅本次 done 增量复审）
- 缺席原因: 本次会话未执行两席增量复审；不追溯改写其历史 design agree。
- 代班 Agent: Codex（实现、自验、迁移发布验证、功能视觉验证与 git 收口）
- 代班范围: OPS-RW1 build / review 增量；不冒签 Kimi / GLM。
- 风险: 缺少两席对 105 文件最终 diff 的独立人审；以 fail-closed 负例、两轮完整 release、全包测试与
  用户明确签字豁免缓解。
- 是否需要补审: 用户已批准本次直接收口；后续异步抽审可作为审计，不重开 done 门禁，除非发现新缺陷。
- 用户裁决: 2026-08-09 明确“签了”，批准缺失 Kimi / GLM done 增量签字的豁免并要求签字收口。

## Build：实现与自测

- Coding Owner: Codex
- 修改文件（按边界分组）:
  - `packages/content/src/**`：canonical v5 exact validation、`lifetimeLimit`、execution / enemy
    capability、资产与引用闭包。
  - `packages/editor/src/**`：跨 session 原子 history coordinator、保存边界、casualty / skill 编辑器约束与
    键盘可达性。
  - `packages/reforge/src/**`：SAVE8、战斗 / casualty / RNG / readiness、BGM 竞态、reward queue、Debug
    生命周期与第一阶段风格五 tab 面板、D6 occlusion latch。
  - `packages/migrate/**`：6C append-only、R13-Z rewind、历史 R13-5 / R13-6A source-ledger profile、真实
    PAL integration / release fixtures、oracle / test manifest。
  - `AGENTS.md`、`docs/ops/**`：视觉验证分层与治理记录。
- 实现摘要:
  - A 批：6C 已发布 replay 改为 append-only 全状态校验；dev battle override 退出 canonical / production
    host；v5 控制流与 SAVE8 / skill unknown 边界 fail-closed；统一 execution / enemy reachable
    readiness 与 battleSprite / FIRE / SFX 闭包；oracle producer 指纹恢复。
  - B 批：新增 `EditorHistoryCoordinator`，跨栈创建 / rollback / undo / redo 原子化；project serialize
    调权威 actor / casualty validator，空 TextId / 小数无法保存，UI 可键盘操作。
  - C 批：同曲 BGM 接管旧 fade timer；酒神最后一次后从当前战斗技能表移除；casualty sweep 恢复敌方
    受击来源门；投掷按 effect→targets 保持 RNG 绑定；敌 fallback cast readiness 补齐。
  - D 批：Debug 快照删除多余 key、field value 防 NaN、关闭清 frame-step；D6 保存上一帧 candidate；
    D14 `RewardGainQueue` 支持 Enter / Space 跳当前条、Esc 外传、abort / timer 单 settle；Debug 面板按
    一阶段金朱暗底视觉重做为“状态 / 指令 / 触发 / 战斗 / 图层”五 tab，保活状态并补齐 tab a11y。
  - E 批追加发现：冻结 pre/post-6B battleSprite ledger；修正 R13-5 replay 误用当前 migration；恢复已发布
    R13-5 `c2d7…` source-control face，同时保持 R13-6A `86bbb…` pin；新增严格 R13-Z zero-content
    rewind。oracle projection 未变化，只更新 producer / test manifest 指纹。
- 运行命令 / 证据:
  - `pnpm --filter @type-pal/migrate run check:fast`：79 files / 580 passed / 5 skipped。
  - `pnpm --filter @type-pal/migrate run check:release`：canary 2/2；release 102 files / 710 passed /
    1 skipped（独立完整运行 2288.46s）；根递归中再次 102/710 通过（2110.79s）。
  - R13 目标隔离：2 passed / 9 skipped（753.48s）；P4 目标隔离：1 passed / 6 skipped（451.47s）。
    原失败均为同步真实 PAL fixture 超过旧预算，未出现断言差异、未改 golden。
  - 正式迁移 dry / write：6C seal 保持 `82e9f8f343b946b6c313b9995b2588d4ee44484d5a3bfef8e36ba7c367db06a2`；
    R13-Z replay `writes=0 deletes=0`，项目 / baseline 无生成 diff。
  - 根递归包检查：shared 121、content 412、game 2303、pal-extract 246、editor 816、reforge 842 全通过；
    editor / reforge production build 成功。
  - `pnpm lint`：Biome 1104 files 通过；`git diff --check` 通过。根 `pnpm check` 的所有递归测试通过，
    首次最终 lint 只报 2 处 import 排序，安全修正后单独复跑 lint 通过，未为纯排序第三次重复 40 分钟
    release。
- 浏览器 / 手工检查:
  - Reforge Debug 在 1280×720 走通状态、战斗、指令 tab；tab / panel 语义、键盘焦点、console、战斗
    builder 与关闭清 frame-step 均核；console 无 error，只有 1 条既有 warning。
  - 截图：`output/playwright/reforge-debug-status.png`、`reforge-debug-battle-2.png`、
    `reforge-debug-commands.png`（ignored 功能验收产物，不入 git）。
  - 剧情 / 奖励观感按用户新规不在开发期重复截图；只保留集中 E2E 登记。Debug / Editor 等功能性 UI
    允许开发期视觉验证，已写入 AGENTS / workflow / task templates。
- 跳过的检查及原因: 未执行剧情演出视觉 E2E，按用户 2026-08-08 明确成本分层留到代码冻结后的集中
  E2E；没有跳过 schema / save / migration / release / build / lint 门禁。

## Review：审查与返工

- Reviewer: Kimi + GLM
- 审查结论: Codex 最终自审 accept；Kimi / GLM 本次增量独立复审由用户明确签字豁免，不能记为两席
  本人 accept。
- 必须返工项: 无已知未闭环项。release 初轮 3 项误超时已以隔离断言通过 + 两轮完整 release 解决；
  两处 Biome import order 已修复。
- Accept / rework: **done（2026-08-09，用户缺签豁免）**。

## 用户验收

- 用户结论: 2026-08-08 指定 Codex 接手返工、要求 Debug 面板对齐第一阶段样式并冻结视觉测试分层；
  2026-08-09 明确“签了”，批准本卡与 D14-3 收口签字及缺席 review 席位豁免。
- 后续任务: 剧情 / 奖励观感进入代码冻结后的集中 E2E；若异步 Kimi / GLM 抽审发现新缺陷，另开
  rework 卡，不追溯冒签当前记录。

## 交接日志

- 2026-08-08 User：指定 Codex 接手 R13-3 后代班提交返工。Evidence: 当前会话。Next: Codex 开卡 /
  draft 设计。
- 2026-08-08 Codex：完成 189 提交只读分区审查，确认 6 P1 + 14 P2；建立 A→E 返工设计、
  上下文锚点、验收矩阵并签 design agree。Evidence: 本卡范围 / Draft / 验收条件；基线测试
  game 2303、editor 809、reforge 821、content 400 通过，migrate 575 通过 / oracle 2 失败，lint
  119 errors。Next: Kimi + GLM 并行 design review；签字齐前不得实现。
- 2026-08-08 User：追加引擎 Debug 面板视觉返工，要求参考第一阶段工具面板。Evidence: 当前会话。
  Next: Codex 冻结一阶段视觉真值与浏览器验收基线，Kimi / GLM 审签后随 D 批实现。
- 2026-08-08 Codex：用 Playwright 在 1280×720 实机采集第一阶段与 Reforge 改前对照，冻结五 tab、
  金朱暗底、左上响应式面板与 a11y 验收。Evidence: `output/playwright/ops-rw1/phase1-tools-baseline-1280x720.png`、
  `output/playwright/ops-rw1/reforge-debug-before-1280x720.png`。Next: Kimi 主审视觉映射，GLM 核对五组
  Debug 功能无漏项；签字齐前不得实现。
- 2026-08-08 Codex：D5 已在具备完整 design agree 的 D14-3 自卡提前 rework，未借 OPS-RW1 缺签
  越权推进其它实现。Evidence: `reward-gain-queue.ts` / 4 tests / Reforge 825 / build / Playwright
  `leaks=0`。Next: D14-3 双审增量 re-accept；OPS-RW1 D5 仅保留最终集成复验。
- 2026-08-08 User：拍板视觉验证分层——剧情类统一延后到代码冻结后的集中 E2E；Debug / Editor /
  工具与功能性 UI 允许开发期最小视觉验证。Next: OPS-RW1 只在 build 期跑功能性浏览器闭环，剧情
  观感登记用例不逐卡实跑。
- 2026-08-08 Kimi：完成架构 / UX 设计主审，20 项缺陷全部抽样核实属实（A1/A2/A6/A7/B1 重点压测
  有 file:line 证据），签 design counter（最小 5 条：B1 回滚不得污染 future + 显式推翻 ED-5J 双栈
  决策；A6 敌 AI cast 技能纳入 battle-sprite 闭包；A2 移除面补 ScriptHost opts 与 gateway 守卫 +
  锚点笔误；A1 相等判别看齐 R13-Z 全 body 深比；D5 裁决 Enter/Space 跳过、Esc 不绑）。D6 视觉
  映射方向认可，UX 细节要求已写入主审立场。A7 确认缩窄作者契约安全（pal 数据 enemy 分支 5 种
  效果全在 runtime 支持集内）。Evidence: 本卡签字表 / 主审立场；只读核查，未改实现文件。Next:
  Codex 把 5 条落入 Draft 卡文后回 Kimi 快速转 agree；GLM 覆盖主审可并行。
- 2026-08-08 GLM：完成数据 / 覆盖设计主审，签 design agree（条件 = Kimi 5 条卡文修正落地）。
  20 项缺陷 + D6 用户视觉要求全部逐条抽样核实属实，无漏项。实跑 `test:oracle:verify` 确认 2/2 失败：
  **packages/content/src（manifest.json:153）与 packages/reforge/src 两棵 producer 树均漂移**，
  A 批中途重录 + E 批终录必须双树一起重 pin。SAVE/schema 矩阵 fail-closed：A4 lifetimeLimit 在
  validate.ts 全文零引用 + `<N` 无 min/step 守卫；A5 normalizePayloadV8 不补不验 skillUseCounts（仅
  SAVE4 ops.ts:123 backfill）。migration/release 六脚本（oracle verify/update、canary、check:fast/
  release、migrate:content）均在 package.json 且 wired 正确。C4 sweep 门来源、C5 targets 外层/effects
  内层 RNG 归属反转均已核对 phase1 与 sdlpal fight.c。A7 缩窄作者契约安全（pal 全量 enemy 5 种效果在
  runtime 支持集）。数据侧追加 A8 双树声明 + 4 处锚点微调（A5 ops.ts:109→123、C4 1054/1083→1057/1088、
  C5 2095→2098、D2 521→526）。Evidence: 本卡签字表 / 主审立场；只读核查 + 实跑 oracle verify，未改
  实现文件。Next: Codex 落 Kimi 5 条 + GLM A8 双树声明，三签即满可进 build。
- 2026-08-08 Codex：已落实 Kimi 5 条最小 counter 与 GLM 数据补充；B1/A6/A2/A1/D5、D6 保活 DOM /
  STYLE_ID、A8 双 producer 和锚点微调均写入 Draft / 验收。Evidence: 本卡对应批次、风险、验收与
  Codex counter resolution。Next: Kimi 只读快速复核并将 counter 转 agree；此前不得改 OPS-RW1
  实现文件。
- 2026-08-08 Kimi：只读复核通过——5 条 counter（B1 沉默回滚 / 三故障 / 取代 ED-5J；A6 敌 AI cast
  全闭包 / 三层后果；A2 四面移除 + 同一 gateway；A1 body deep-equal + 重算 digest；D5 Enter/Space
  跳过、Esc 不绑）与 GLM A8 双 producer 声明、4 处锚点微调全部逐项落实，无新增缺口。Kimi counter
  转 **agree**，三方 design 签字满，Status 改 build、build 准入改 allowed。Evidence: 本卡签字表 /
  主审立场；只读复核，未改实现文件。Next: Codex 作为唯一 Coding Owner 按 A→E 批次实现，A 批最先
  且 A8 oracle 中途重录须双树同 pin；done 前三方审查签字另行集齐。
- 2026-08-09 Codex：A→E 返工、追加历史 R13 双 profile / rewind 修复、Debug 功能视觉返工及 D14-3
  集成复验完成；fast 580、canary 2、release 710（完整两轮）、全包测试 / build / Biome 全绿，正式
  migration replay 零写入。Evidence: Build / Review 节与 ignored Debug 截图。Next: 用户决定是否批准
  缺席的 Kimi / GLM done 增量签字豁免。
- 2026-08-09 User：明确“签了”，批准 OPS-RW1 与 D14-3 的收口签字及缺席 review 席位豁免；不得记作
  Kimi / GLM 本人 accept。Status → done。Next: 剧情 / 奖励观感进入冻结后集中 E2E；异步抽审发现
  新缺陷时另开 rework 卡。

## 下一位 Agent 提示词

无下一位 Agent 提示词；任务已由用户签字豁免并收口，等待集中 E2E / 用户后续验收。
