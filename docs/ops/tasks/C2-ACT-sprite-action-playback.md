# C2-ACT - 精灵预制动作消费闭环

Status: done
Phase: phase2
Capability: C2 / E5 / P0 / P1 / P2 / MG2
Coding Owner: Codex（三方设计签齐后）
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex + Kimi
Unavailable Agents: none
Branch: 当前工作分支

## 目标

把“大世界精灵动画”从散落在场景实例 auto 脚本里的 `setEntityFrame / wait / animEntity`
提升为精灵库中的可复用预制动作：作者在精灵库为源帧编排动作、逐帧时长、循环段和受限关键帧事件，
场景脚本只引用目标实体与稳定 ActionId，并选择单次/循环及起始相位。每个动作提供精确引用列表，可跳到
具体场景、实体、页和命令；场景命令也能反跳动作编辑器。完成迁移后，纯动画不再占据“场景实例自动行为”
面板，只有移动、随机、状态、跨实体写等真正属于实例的行为脚本继续留在那里。

## 范围

- 范围内:
  - 演进现有 `SpriteDef.poses` 容器并在 UI 统一称“动作”，形成唯一的精灵动作体系；不再并行维护
    “姿势/动作/布局循环”三套动画语义。
  - 动作使用稳定 ActionId；编辑器可显示“动作 #0 / #1”，显示编号不是引用身份，排序不得使引用串位。
  - 动作时间线支持绝对源帧、逐帧毫秒时长、可选 `loopFrom`，以及首期受限的同步音效 cue。
  - `EntityPage.animation` 保存实例默认动作绑定，与真正的 `auto` 行为脚本并列；新增语义脚本命令用于剧情中
    临时播放/停止指定动作。
  - Reforge 与编辑器预演使用同一实例级动作播放器；补齐中止、替换、隐藏、重入和优先级语义。
  - 精灵库动作编辑、预览、引用/反向引用、删除保护、帧删除修复与 undo/redo/save/reopen 闭环。
  - 上游迁移器严格识别可证明等价的 PAL 固定循环，动作去重后重写场景引用；重新生成 baseline 与 PAL 工程。
  - 未迁移 legacy auto 脚本继续可查看、编辑和忠实派生预览；低级逐帧命令收进“PAL 兼容/高级”。
- 范围外:
  - NPC 路径移动、动态碰撞、随机行为树、跨实体 choreography。
  - 在动作时间线执行任意剧情命令；首期 cue 只允许与帧同步的音效，不把动作做成第二套脚本语言。
  - 战斗精灵动作 ABI；本卡仅处理大世界 `SpriteDef`。
  - AI 生图或替换资源。
- 明确不做:
  - 不按数组下标或裸数字保存场景引用。
  - 不把 `performance.now()` 全局相位的 `layout.loop` 继续当实例动作播放器。
  - 不把无法证明等价的 auto 脚本强行折成动作。
  - 不直接手改 `projects/pal` 或 baseline 生成产物掩盖迁移器缺陷。

## 上下文锚点

- 已拍板决策 / 铁律:
  - 用户 2026-07-21 拍板：动画资产在精灵库定义，场景只引用动作并设置单次/循环；纯动画从实例自动行为面板
    移到“用途定义与动作”，每个动作拥有可精确跳转的引用。
  - `docs/phase2/READ-FIRST.md`：第二阶段 clean architecture；一阶段只作 UX/行为真值，不复制旧结构。
  - `AGENTS.md`：schema、公共命令、runtime、迁移、capability-map 均属三方必审；设计三签前不得实现。
  - 上游迁移缺陷必须修迁移器并重新生成，禁止只改 `projects/pal`。
- 代码锚点(`file:line`):
  - `packages/content/src/sprite.ts:28-48`：当前 `PoseDef` 仅有 frames/mode/统一 ticks，尚无消费方。
  - `packages/content/src/validate.ts:384-410`：当前 pose shape 校验。
  - `packages/content/src/script.ts:113,153,338-343`：legacy 定帧/推进命令与 `EntityPage.auto.stages`。
  - `packages/reforge/src/script-runner.ts:575-630`：runner 只消费低级帧命令。
  - `packages/reforge/src/main.ts:1097,1793-1796,2720-2760,3193-3210`：实例 anim 计数、auto runner 与渲染取帧。
  - `packages/editor/src/ui/SpriteFrames.tsx:699-790`：现有命名姿势 UI，只能框选/统一速度，未形成动作时间线。
  - `packages/editor/src/core/world-sprite-behavior.ts:605-644`：当前场景脚本派生动画预览。
  - `packages/editor/src/core/ref-index.ts`、`script-references.ts`：新增动作引用必须进入统一引用图。
- 已知坑 / 审计文档:
  - `docs/phase2/design-backlog.md` 议题 16；`docs/phase2/foundation/actor-model-design.md` 的布局/姿势分层。
  - `docs/ops/tasks/C2-PAL-world-sprite-layout-cleanup.md`：static 是默认定格布局，不代表物理资源只有一帧。
  - **G2 初版 census 已于 2026-07-21 复核撤销冻结**：顶层 `1374 = 1344 direct-sprite + 30 zone`
    仍成立，但动态 `setEntityAuto/setEntityTrigger/setSceneOn*` 执行根、同脚本不同 self、finite-intro
    分类与 digest provenance 不完整；初版 `391 / 32 / 36 / 32` 与三份 SHA 仅保留为审计历史，
    不得作为 PAL 自动重写准入真值。修正版 golden 绿前禁止重写迁移产物。
  - `sprite-96` 的显式 wait 投影曾写成 `80/160/80/120ms`；真实 ScriptRunner 还包含每命令
    `100ms` pace、call 返回 pace 与 stage `40ms` 让步。可执行 trace 冻结为启动 `#0/100ms`，稳态
    `#0/380 → #1/460 → #2/100 → #2+sound.pal.135/380 → #3/560`（周期 `1880ms`）。
    `s012/e197` 因 trigger 外部写入首批拒绝，`s275/e4732` 准入；相邻同帧步骤不得合并，否则 cue 提前。
  - `sprite-8` 有 53 个实例、3 种原始时间线/相位，是动作去重与实例相位压力样本。
  - `sprite-72/490` 含随机；`sprite-35` 会被外部 `setEntityAuto` 改写；移动、状态、显隐、跨实体写必须保留脚本。
  - ScriptRunner auto 真时序含每命令 pace、显式 wait、call/jump、stage 间让步；编辑器当前展示速度不是迁移真值。
- 不得重新引入:
  - 定义级全局壁钟相位、动作数组下标引用、同一动作按实例复制、动画数据散落回场景脚本。
  - 用帧数/图片外观启发式决定能否迁移；必须基于完整命令图与全工程写入图证明。
  - 预览替代源脚本：未迁移脚本必须始终有精确原文入口。
- 相关测试:
  - `packages/content/src/validate.test.ts`、`validate-refs.test.ts`。
  - `packages/reforge/src/script-runner.test.ts`、世界渲染/scene switch/save 测试。
  - `packages/editor/src/core/world-sprite-behavior.test.ts`、`SpriteFrameWorkbench.test.tsx`、
    `WorldSpriteLibrary.test.tsx`、ScriptDrawer/CommandForm/ref-index 测试。
  - `packages/migrate/src/pal-migration-integration.test.ts` 与 MG2 plan/二跑门禁。

## 验收条件

- 功能:
  - 精灵库可从常驻原始帧池创建动作、拖入/追加/删除/重排步骤、编辑逐帧时长、loopFrom 和音效 cue；
    动态预览与保存重开一致。
  - 场景页可选择默认动作绑定；场景脚本可插入“播放精灵动作/停止精灵动作”作临时覆盖。选择目标后仅列出
    该精灵动作，显示 #编号+名称，支持单次/
    循环、起始相位，命令可一键打开动作编辑器。
  - 动作卡有“引用”页，精确列出 scene/entity/page/command 并跳转；动作删除/改 id 有引用保护或可撤销重写。
  - 已迁移纯动画只出现在动作区和动作引用中，不再重复展示为“场景实例自动行为”；未迁移实例行为仍显示，
    且能查看/编辑真实脚本。
  - Reforge 的单次/循环、非均匀时长、loopFrom、音效 cue、同动作多实例错相均按实例独立播放。
- 测试:
  - content 升级、shape/ref/删除保护、frame-demand/帧删除修复与未知字段 fail-loud；版本号不得与 A7-4 已预留的
    `contentVersion 4` 产生两种语义。
  - ScriptRunner/host/editor playback 对 play/stop 全穷尽；legacy setFrame/anim/move 与动作互斥优先级有测试。
  - 隐藏暂停/恢复、场景重入重置、换精灵/换 auto/切场景中止、同动作重复 play 幂等、once 完成与 loop 停止。
  - 对全部自动迁移候选跑旧 ScriptRunner trace 与新 action player 至少两轮的帧/时间/声音差分 oracle。
  - 冻结全量候选/拒绝分类、incoming-write 负例、动作去重和引用数量；MG2 首跑预期变更、二跑
    `writes=0/deletes=0/conflicts=0`。
  - content/reforge/editor/migrate 全包 typecheck、test、build、Biome 与 `git diff --check` 全绿。
- 文档:
  - content schema、脚本命令、迁移规则、编辑器工作流、capability-map 与本卡证据同步。
- 视觉 / 手工验证:
  - 精灵 77：原始帧常驻；动作时间线/动态预览/引用闭环；场景只见单条语义播放命令。
  - 精灵 96：非均匀时长与打铁音效同步，两个场景引用精确可达。
  - 精灵 8：多实例共享同一动作但相位独立；无全局同步跳帧。
  - legacy 随机/移动样本仍在实例行为区，可打开真实脚本；浏览器 console 零错误/警告。

## 推进签字

### 进入 build 前:设计签字

- Codex: **agree（2026-07-21）**。接受用户的资产/实例分层、Kimi K1-K6 与 GLM G1-G7；唯一派生数字
  分歧不构成 schema counter，但必须作为 build 第一门用仓库内可执行 census 统一冻结，完成前不得开始
  自动引用重写或生成 PAL 产物。版本正式裁定为 C2-ACT contentVersion 4、A7-4 顺延 v5；SAVE_VERSION 不动。
- Kimi: **agree（2026-07-21;附 K1-K6 build 必落钉与版本裁决,见「主审立场」）**。六问逐项核对并抽查
  代码/文档锚点:poses Record 演进为唯一动作模型成立;EntityPage.animation/auto/play/stop 三层不产生
  第二真值(纯动画迁移后只剩 binding 一种表达);steps/durationMs/loopFrom/startAtMs+帧同步 sound cue
  覆盖 sprite-96 实证,不构成第二脚本语言;优先级与生命周期矩阵成立;**版本裁决:C2-ACT 取
  contentVersion 4,A7-4 顺延 v5**(正式重排,见下);引用/反跳/删除保护/legacy 面板边界成立。
  无架构 counter。
- GLM: **agree（2026-07-15）**。独立重建 census 顶层 1374=1344 direct+30 actor-backed 成立；代码锚点逐行核对
  （sprite.ts:28-49 poses/PoseDef、script.ts:338-344 EntityPage 无 animation 字段、main.ts:3185-3210 渲染优先级、
  world-sprite-behavior.ts:597-646 编辑器投影、script-runner.ts:575-630 低级帧命令消费）；设计模型无第二真值；
  版本裁决同意 Kimi 方案（C2-ACT 取 v4，A7-4 顺延 v5）。**但 GLM 独立复算的派生数字与卡内冻结值不一致，
  冻结为修订口径**（见 G2）；contentVersion v4 冲突由 Kimi 版本裁决收敛。
- counter / 分歧处理: 当前无 counter；GLM agree 附修订数字与 G1-G7 必落项。任一方签 counter 时停在 draft。
- 缺签豁免: N/A
- build 准入结论: **allowed（Codex agree + Kimi agree + GLM agree，2026-07-21 三签齐）**。Coding Owner
  固定为 Codex；第一项实现必须是 G2 可执行 census，数字冻结前不得重写迁移产物。

### 进入 done 前:审查签字

- Codex: **accept（2026-07-22）**。实现、自测、MG2 正式写入后二跑零计划与浏览器视觉复验均完成；
  复核范围和证据见 Build / 视觉验证记录。Kimi、GLM 未审前不得标记 done。
- Kimi: **accept（2026-07-22）**。架构/runtime/editor/视觉独立复审,无 P0/P1/P2 阻塞;K1-K6 全部满足。证据:
  1. **K1 版本执行**:`projects/pal/manifest.json` contentVersion=4;v3→v4 升级器与升级测试存在;
    文档口径已随卡重排(A7-4→v5)。
  2. **K2 复合引用**:`resolveSpriteActionBinding`(entity-action-player.ts:91-113)校验
    `(spriteId,actionId)` 复合身份,精灵不匹配/动作缺失/帧越界均 fail-loud;ActionId 形如
    `pal-auto-v1-<hash>` 稳定,显示 #N 由 order 派生。
  3. **K3 播放器单真源**:`EntityActionPlayer` 每实体 {base,override} 双轨、逐边界非均匀推进、
    loopFrom 进入时才应用循环相位、暂停实体不追帧不补 cue、override 完成后剩余 dt 交还 base、
    play 幂等、stop(false/true)、signal 中止且被接管后不越权(:221-399);测试矩阵 12 用例全在
    (:41-231 覆盖相位/单真源/中止/悬挂 Promise)。
  4. **K4 cue 边界**:`SpriteActionCue = {kind:'sound', asset}` 唯一 kind;sprite-96 产物
    `#2@380+sound.pal.135` 与 UI 时间线绑定下拉可见。
  5. **K5 迁移证明**:census 摘要 accepted 387 实例/32 defs;audit 复跑 `acceptedInstances=387,
    acceptedSpriteDefinitions=32,exactActions=36`(32 steady families+4 finite-intro,产物折叠为
    32 defs/32 poses——其中 9 条 loopFrom>0 带启动段,口径已由 census digest `b6ee586…` 与卡片一致);
    96 非均匀时长+音效、8 的三时间线/53 引用、随机/移动/状态等拒绝分类(`rejectedByExternalWrites=97`)。
  6. **K6 UX 闭环**:sprite-8 引用页「动作引用 · 53」逐项 `scenes[20].entities[23].pages[0]
    .animation.action` 精确且「打开引用 ↗」落到 s020 场景页;切引用筛选后引用页签保持
    `aria-selected=true` 不跳回动作;sprite-96 的 s012/e197 未迁移脚本经「编辑脚本」抽屉
    原样可见可编(定帧/转向命令);sprite-77 单引用精确可达。
  7. **独立复跑**:根 `pnpm check` 全绿(822 files;content 265/reforge 516/editor 600/migrate 278+1skip)。
  8. **Console**:全部浏览器页面 error 0、无新增 warning。
- GLM: **accept（2026-07-15）**。独立复跑 census/审计/diff oracle/MG2 二跑和全包测试全部对账成立;
  G1-G7 逐项验证通过(见「GLM done 审查」节)。无 counter/rework。
- counter / 返工处理: N/A
- 缺签豁免: N/A
- done 准入结论: **Codex accept + Kimi accept + GLM accept，三签齐（2026-07-22）；用户同日确认签字齐并授权收口，任务已标记 done。** 无遗留阻塞项。

## Draft: 设计与风险

### 设计结论

1. **唯一动作模型**：保留 `SpriteDef.poses` 作为唯一容器，但 UI 与新代码语义统一称“动作”；Record key 是稳定
   ActionId，label/order 与身份分离。旧 `layout.loop` 只在升级边界解释，新内容的可播放动画统一由 action 表达。
   建议 shape：

   ```ts
   interface SpriteActionStep {
     frame: number
     durationMs: number
     cues?: Array<{ kind: 'sound'; asset: AssetId }>
   }

   interface SpriteActionDef {
     label: string    // 作者可改的人读名；Record key 才是稳定 ActionId
     order?: number   // 只决定 UI 顺序/#编号
     steps: SpriteActionStep[]
     loopFrom?: number
   }

   interface SpriteDef {
     poses?: Record<ActionId, SpriteActionDef>
   }
   ```

   UI 的“动作 #N”只由 order/稳定排序生成，重排、改名不得改引用。
2. **脚本引用**：新增 `playEntityAction { entity, sprite, action, loop, startAtMs?, wait? }` 与
   `stopEntityAction { entity, reset }`。`sprite + action` 形成可诊断、可删除保护的限定引用；运行时发现目标实体
   当前精灵与声明不匹配时 fail-loud，不偷偷换装。循环播放不得 wait；单次缺省 wait 完成，作者可选后台播放。
3. **场景仍是消费者**：`EntityPage.animation` 保存默认 action binding（动作、单次/循环、起始相位），与
   `EntityPage.auto` 行为脚本并列，因此同一实体可以同时有循环外观和移动/随机/状态行为。纯动画迁移到 binding，
   不再伪装成单条 auto 脚本；`playEntityAction/stopEntityAction` 只负责剧情临时覆盖。
4. **播放器所有权**：每实体有基础页动作 + 可选脚本覆盖动作 state（definition/action/step/elapsed/loop/start
   phase/owner）。动作以世界时钟
   `dt` 推进而非全局 wall clock。隐藏时冻结、场景重入重置；切场景、换精灵、替换 auto 必须释放对应状态。
5. **互斥优先级**：兼容定帧 > 移动走帧 > 脚本覆盖动作 > 页默认动作 > legacy layout loop > 默认帧。
   启动脚本动作清目标的 legacy frame override/anim；停止后恢复页动作。隐藏/移动暂停动作时钟与 cue，显示/停步
   后续播；换精灵和切场景销毁旧 action state。渲染只读归一后的 active frame，不叠第二套游标。
6. **引用 UX**：精灵工作台固定为“原始帧池 + 动作列表”；每个动作一行，首格动态预览，随后列步骤。右侧
   `动作 / 引用 / 源资源`；引用精确到 scene/entity/page/command。纯动画迁移后旧“场景实例自动行为”卡不再重复，
   但非动作化脚本保留并明确标“实例行为脚本”。
7. **迁移**：先做全工程命令图 + incoming-write 审计，归一真实时序，按 sprite/action timeline/cues 去重；生成稳定
   ActionId，重写为语义引用。首批只收可差分证明等价者；随机、移动、状态、显隐、跨实体写和动态 setAuto 默认拒绝。
   音效只有能精确落到 action cue 时才允许迁移。
8. **兼容与版本**：legacy PAL 命令仍在 Command union 与读取边界保留，编辑器降为高级区。action 播放状态不进
   存档，读档/重入按页 binding 重新建立，脚本临时动作丢弃，故本卡默认不升 SAVE_VERSION。工程内容版本仍有
   blocker：A7-4 已长期预留 `contentVersion 4`；C2-ACT 必须在 Kimi/GLM 设计审查中选择“先完成 A7-4 后用 v5”
   或“正式重排版本计划”，不得擅自让两个不同 schema 都叫 v4，也不得在同一 v3 下静默改变消费契约。

### 已知风险

- 风险: 动作命令、auto runner 和移动系统同时拥有帧游标，容易形成三套真源。
  - 缓解: 实例 action state 单真源 + 明确清理矩阵 + 渲染优先级测试。
- 风险: 将帧预览的“可忽略副作用”误用为迁移判据，导致声音/状态丢失。
  - 缓解: 预览投影与迁移证明使用独立 allowlist；迁移按完整轨迹（帧/时间/cue/写入）差分。
- 风险: 动作数组排序导致场景引用漂移。
  - 缓解: 仅稳定 ActionId 可被引用；显示编号不入引用。
- 风险: 同一 sprite 多实例共享 action 后被全局相位同步。
  - 缓解: 实例级游标与 `startAtMs`；以 sprite-8 压力验收。
- 风险: C2-ACT 与 A7-4 争用 contentVersion 4，或升级与作者修改 merge 冲突。
  - 缓解: 三方先裁定版本顺序；每个版本只有一种 schema 语义，升级器与 MG2 ownership/read-set、二跑零计划和
    中断恢复测试独立闭环。
- 风险: 动作 cue 演变成任意命令轨，重新制造第二套脚本语言。
  - 缓解: v1 只允许同步音效；其它副作用必须留在实例脚本。

### 主审立场

- Reviewer: Kimi（schema/runtime/公共接口/UX）+ GLM（迁移数据/测试矩阵/MG2）
- 结论: **agree（2026-07-21）**——六问逐项成立,无阻塞;附 K1-K6 build 必落钉与版本裁决。
  1. **唯一动作模型**:成立。`poses` 演进为 `Record<ActionId, SpriteActionDef>`(steps 带逐帧 durationMs
     与受限 cue,loopFrom 可选)是 schema 演进而非平行体系;Record key=稳定 ActionId,label/order 仅显示;
     `layout.loop` 全局壁钟相位只在升级边界解释,新内容统一由 action 表达;UI“动作 #N”永不入引用。
  2. **三层消费无第二真值**:成立。`EntityPage.animation` 是声明式默认 binding(非脚本),`auto` 只留
     真正行为脚本,`playEntityAction/stopEntityAction` 只做剧情临时覆盖;纯动画迁移后只剩 binding 一种
     表达,未迁移脚本由 legacy runner 继续忠实执行,边界=可证明等价门禁,不构成双轨。
  3. **动作时间线与 cue**:成立。steps(frame+durationMs)+loopFrom 覆盖非均匀时长与启动段;startAtMs
     给同动作多实例错相(sprite-8 压力样本);cue v1 仅 `{kind:'sound', asset: AssetId}` 帧同步,
     sprite-96 的 `#2@80+sound` 精确可表达;任意剧情事件轨被 schema 级拒绝。
  4. **优先级与生命周期**:成立。legacy 定帧>移动走帧>脚本覆盖动作>页默认动作>legacy layout loop>
     默认帧;隐藏冻结时钟与 cue、场景重入重置 binding、切场景/换精灵/setEntityAuto 销毁旧 action state、
     读档按 binding 重建且临时动作不进存档;每实体单 action state 是帧游标唯一真源。
  5. **版本裁决(正式重排)**: **C2-ACT 取 `contentVersion:4`**(语义 = v3 + 精灵动作),`v3→v4` 升级器
     只做 poses 演进/EntityPage.animation 登记/命令并集;**A7-4 顺延为 v5**(v4 + legacy 归零闭包)。
     理由:版本号是顺序升级契约不是预留名;A7-4 预留 v4 时没有其他成熟候选,强行让 C2-ACT 等待会把两张
     高风险卡互相绑架,更会诱发“同 v3 静默改契约”的禁项。project-lifecycle-design:227/250、
     a7-resource-closure-audit、asset-pipeline 三处“v4 归 A7-4”文字必须随本卡同步改为 v5。
     SAVE_VERSION 不动(动作播放态不进存档)。
  6. **引用 UX 边界**:成立。动作引用页精确到 scene/entity/page/command 并可跳转,命令反跳动作编辑器,
     删除保护进统一引用图;legacy 低级命令降“PAL 兼容/高级”但原文永远可达,不删命令。
- 必落钉(K,不阻塞签字,build 验收核对):
  - **K1 版本执行**:contentVersion 4 只承载本卡语义;三处文档口径同步改为“A7-4 → v5”;v3→v4 升级器
    与 MG2 ownership/二跑零计划/中断恢复测试独立闭环;任何“v4=A7-4 闭包”的旧断言同步重排。
  - **K2 引用身份**:ActionId 只在 SpriteDef 内唯一;场景/命令引用一律 `(spriteId, actionId)` 复合;
    显示 #N 由 order/稳定排序派生,持久层与引用图禁止下标。
  - **K3 播放器单真源**:每实体单 action state(页 binding + 脚本覆盖槽);清理矩阵(切场景/换精灵/
    setEntityAuto/隐藏恢复/读档)穷尽测试;渲染只读归一 active frame。
  - **K4 cue 边界**:校验器拒绝 sound 以外的 cue kind;sprite-96 声音迁移必须过旧 runner trace vs
    新播放器两轮帧/时间/cue 差分 oracle。
  - **K5 迁移证明**:只有差分 oracle 全等(帧/时间/cue,至少两轮)的候选才重写为引用;随机/移动/状态/
    显隐/跨实体/外部写入/setAuto 默认拒绝并进报告;actor-backed 30 的口径由 GLM 冻结后并入。
  - **K6 UX 闭环**:动作引用页精确跳转+命令反跳;删除保护走统一引用图;键盘可完成全部动作编辑;
    legacy 面板标注“PAL 兼容/高级”,原文入口常显。
- 是否建议进入 build: **是,待 GLM 数据/迁移复核签字后三签齐 build allowed;三签未齐不得实现。**

### 三方争议记录

- Codex: 支持用户提出的资产/实例分层；建议稳定 ActionId + 显示编号、动作时间线只含帧/时长/受限音效 cue，
  场景保留一条 play 命令与精确引用，不引入通用事件轨。
- Kimi: **agree**。唯一动作模型(poses Record 演进/稳定 ActionId/显示编号非身份)成立;三层消费无
  第二真值;steps/durationMs/loopFrom/startAtMs+帧同步 sound cue 覆盖 96/8 样本;优先级与生命周期
  矩阵成立;**版本裁决:C2-ACT 取 contentVersion 4、A7-4 顺延 v5**(正式重排,三处文档同步改口径);
  SAVE_VERSION 不动;引用/反跳/删除保护/legacy 边界成立。K1-K6 build 必落(版本执行/复合引用身份/
  播放器单真源/cue 边界/迁移证明/UX 闭环)。
- GLM: **agree（2026-07-15）**。数据/迁移/MG2/测试矩阵审查通过，附修订 census 与 G1-G7 必落项（见「GLM 数据审查」节）。
  顶层 census 1374=1344+30 成立；sprite-96/sprite-8 实证；代码锚点逐行核对；版本裁决同意 Kimi 方案（C2-ACT v4，A7-4 v5）。
  **唯一分歧**：卡内冻结的 483/454/29 派生口径与 GLM 独立复算（504/432/72）不一致——原因是 GLM 的递归 flatten 只跟踪
  callScript+branch 未跟 jumpScript 目标；两套口径都不可直接作为迁移准入数字，build 必须用可执行 census 脚本冻结（G2）。
- 用户拍板: 动画归精灵库；纯动画从实例自动行为面板迁入“用途定义与动作”；每个动作有引用并可到具体场景。

### Draft blocker（签字前必须收敛）

- ~~工程版本顺序：A7-4 v4 与 C2-ACT 的版本归属。~~ **已收敛**（Kimi 裁决 + GLM 同意）：C2-ACT 取 contentVersion 4，A7-4 顺延 v5。
- 迁移口径：**G2 rework**。30 个无外观 zone 全拒绝的产品结论不变；动态绑定执行闭包、`(script,self)`
  访问键、显式 root 注册、finite-intro 和 versioned canonical digest 修正后，重新冻结 clean 实例/
  SpriteDef/动作/循环族数字。修正前不得自动重写 PAL。
- ~~数据入口：页默认动作使用独立 `EntityPage.animation` binding；临时切换才走命令。~~ **已确认**（GLM 代码核对 script.ts:338-344 EntityPage 当前无 animation 字段；新增 binding 与 auto 并列不产生第二真值）。
- 时序真值：ScriptRunner pace/stage yield、loopFrom/startOffset、cue 与外部写入所有权必须进入差分 oracle。**GLM 已确认** main.ts:2729 `paceMs=100`、main.ts:2745 段间 40ms 让步（G3 差分 oracle 须钉此）。

### GLM 数据审查（2026-07-15）

#### 独立重建 census（顶层成立）

| 口径 | 卡内冻结 | GLM 独立复算 | 结论 |
|---|---|---|---|
| PAL 第 0 页 auto 全量 | 1374 | **1374** | ✅ 一致 |
| direct-sprite | 1344 | **1344** | ✅ 一致 |
| actor-backed | 30 | **30** | ✅ 一致，全部 `zone:true` 无 sprite/actor/kind 字段 |
| sprite-96 实例 | 2 | **2**（s012/e197, s275/e4732） | ✅ 一致 |
| sprite-96 timeline | #0@80→#1@160→#2+sound.pal.135@80→#3@120 | **逐字节一致**（两实例命令体完全相同） | ✅ 一致 |
| sprite-8 实例 | 53 | **53** | ✅ 一致 |
| sprite-8 时间线/相位 | 3 种 | **3 种**：`F1,F2,F3`(20)、`F2,F3`(15)、`F3`(18) | ✅ 一致 |
| contentVersion | 3 | **3**（character.ts:68 确认） | ✅ 一致 |

#### 派生数字差异（GLM 口径 vs 卡内口径）

| 口径 | 卡内冻结 | GLM 独立复算 | 差异原因 |
|---|---|---|---|
| direct-sprite auto 本体纯确定候选 | 483 | **504** | GLM 递归 flatten 只跟踪 callScript+branch；卡内口径可能对 setEntityFacing 每拍冗余发射计数不同 |
| 全工程 external-write 排除 | 29 | **72** | GLM 的 WRITE_KINDS 集合更宽（含 setEntityLayer/setEntityTrigger）；卡内可能只计 frame/state/pos 写 |
| 最保守 clean 首批 | 454 / 38 SpriteDef | **432** | 上一行差异传导 |
| cycle+variants 去重 | 506+83=589 | 未独立重建（定义依赖） | 需 build 用可执行脚本冻结 |

**GLM 结论**：两套派生口径均不可直接作为迁移准入数字。差异源于分类边界定义不同（哪些 kind 算"unsafe"、jumpScript 闭包是否展开、
external-write 只看本场景还是含 shared chunk）。**G2 必落**：build 前用仓库内可执行 census 脚本一次性冻结最终数字，
迁移准入只认脚本输出。

#### 30 actor-backed zone 分类

GLM 逐条确认：30 个 actor-backed auto 实体**全部** `zone:true`，无 sprite/actor/kind 字段，keys 仅为 `id,pos,zone[,hidden],pages`。
其 auto stages 全部为 `callScript` 引用（31 条 callScript = 30 实体，其中 1 实体多段）。

**分类结论**：actor-backed zone 不是精灵动画消费者——它们是没有外观的触发区，auto 脚本做的是触发逻辑不是帧动画。
**迁移口径**：30 actor-backed **全部拒绝迁移**为精灵动作，保留为实例行为脚本。理由：无 sprite → 无帧 → 不构成动作时间线。

#### 代码锚点逐行核对

- `packages/content/src/sprite.ts:28-49`：`PoseDef{frames,mode,ticksPerFrame}` + `SpriteDef.poses?: Record<string,PoseDef>`。
  **确认**：设计提案将 poses 演进为 `Record<ActionId, SpriteActionDef>` 是向后兼容的 schema 演进；现有 `spriteDefinitionFrameDemand`
  (sprite.ts:58-70) 和 `spriteDefinitionFrameIndices` (sprite.ts:73-87) 遍历 poses.frames 的逻辑在新 shape 下仍可用
  （steps[].frame 替代 frames[]），但须更新这两个函数。
- `packages/content/src/script.ts:338-344`：`EntityPage{state?,trigger?,auto?}`。**确认**：当前无 animation 字段；
  新增 `animation?: {action,loop,startAtMs?}` binding 与 auto 并列，不产生第二真值（Kimi 主审立场 2 已论证）。
- `packages/content/src/script.ts:113,153`：`setEntityFrame` / `animEntity` legacy 命令在 Command union 中保留。
  **确认**：新增 `playEntityAction/stopEntityAction` 并入同一 union。
- `packages/reforge/src/script-runner.ts:575-630`：case 分支消费 `setEntityFrame`/`animEntity`/`moveEntity` 等低级命令。
  **确认**：新命令需新增 case 分支；现有分支不动。
- `packages/reforge/src/main.ts:2729`：`r.paceMs = 100`（原版 auto 一帧 100ms 一 op）。**确认**：差分 oracle 须钉此 pace。
- `packages/reforge/src/main.ts:2745`：段间 `await host.wait(40)` 让步。**确认**：差分 oracle 的 stage yield 真值。
- `packages/reforge/src/main.ts:3193-3210`：渲染帧选择优先级 `hasOv ? override : loop ? performance.now : anim ? animFrameIndex : idle`。
  **确认**：设计提案优先级（兼容定帧>移动走帧>脚本覆盖动作>页默认动作>legacy loop>默认帧）需要重构此分支；
  当前 `performance.now()` 全局壁钟用于 layout.loop——这正是设计要消除的"全局壁钟相位当实例动作播放器"。
- `packages/editor/src/core/world-sprite-behavior.ts:597-646`：`describeAutomaticEntityBehavior` 投影 auto 行为为编辑器预览。
  **确认**：纯动画迁移后此函数对已迁移实例不再生成 "自动行为脚本" 卡片，改由 action binding 驱动预览。
- `packages/editor/src/ui/SpriteFrames.tsx:699-790`：命名姿势 UI（框选帧→建姿势）。**确认**：需演进为动作时间线编辑器
  （steps 拖拽/durationMs/loopFrom/cue）。

#### GLM 必落项（G，build 验收核对）

- **G1 版本执行**：contentVersion 4 只承载 C2-ACT 语义；三处文档口径同步改为“A7-4 → v5”（asset-pipeline、a7-resource-closure-audit、
  project-lifecycle-design:227/250）；v3→v4 升级器只做 poses 演进 + EntityPage.animation 登记 + 命令并集。
- **G2 可执行 census（rework）**：初版 CLI/单测/PAL golden 可运行，但复核证明其执行根闭包与摘要载荷
  不完整。必须补动态 binding roots、`(script,self)`、移除 orphan-script 启发式、区分 finite-intro、
  完整 evidence/phase/steady-family 的 versioned canonical digest；修后重新生成所有数字与摘要。
- **G3 差分 oracle**：旧 ScriptRunner trace vs 新 action player 至少两轮，钉住 `paceMs=100` + 段间 `wait(40)` + 显式 wait + call/jump 闭包
  + stage yield；帧/时间/cue 三维全等才准入。验收样本：sprite-96（非均匀+sound）、sprite-8（3 相位/53 实例）、sprite-72/490（随机拒绝）、
  sprite-35（setEntityAuto 外部写拒绝）、30 actor-backed zone（全部拒绝）。
- **G4 MG2 闭环**：首跑预期清单（动作新建/引用重写/EntityPage.animation 登记/v3→v4 升级）；二跑 `writes=0/deletes=0/conflicts=0`；
  中断恢复测试。MG2 ownership：authored SpriteActionDef 整记录 clone + 场景引用重写属本卡 author 式写入。
- **G5 frame-demand 一致性**：`spriteDefinitionFrameDemand` 和 `spriteDefinitionFrameIndices` 更新为新 shape
  （steps[].frame 替代 frames[]）；越界债检测不回归。
- **G6 校验器 fail-loud**：pose/action shape 校验（steps 非空/durationMs 正整数/cue kind 仅 sound/frame 非负）；
  未知字段 fail-loud；删除保护走统一引用图（ref-index/script-references）。
- **G7 测试矩阵**：content（shape/ref/版本升级/删除保护/frame-demand）+ reforge（play/stop 穷尽/优先级/隐藏暂停/场景重入/
  换精灵/切场景/setEntityAuto/读档/同动作重复 play 幂等/once 完成与 loop 停止）+ editor（动作编辑/预览/引用反跳/undo-redo-save-reopen）
  + migrate（census 冻结/差分 oracle/MG2 二跑 0/0/0）+ 全包 typecheck/test/build/Biome + `git diff --check`。

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件（按责任域归纳）:
  - content：`sprite.ts`、`script.ts`、`validate.ts`、`validate-refs.ts`、`project-upgrade.ts` 及对应测试。
  - runtime：`entity-action-player.ts`、`script-runner.ts`、`main.ts`、loader/export 与对应测试。
  - editor：`sprite-actions.ts`、`upgrade-local-v3-actions.ts`、`WorldSpriteLibrary.tsx`、
    `SpriteResourceViewer.tsx`、`SpriteActionEditor.tsx`、`EntityPageAnimationEditor.tsx`、ScriptDrawer/
    CommandForm/ref-index/navigation/open-local/save 及对应测试和样式。
  - migrate/MG2：`pal-sprite-action-census.ts`、`pal-sprite-action-materialize.ts`、
    `audit-pal-sprite-actions.mts`、migration plan/merge/write/manifest 集成与对应测试；由 MG2 生成 baseline、
    `projects/pal` 的 v4 sprites 和 54 个场景动作绑定。
  - 文档：本卡、看板、capability-map、design-backlog、A7 v5 版本口径与资源管线文档。
- 实现摘要:
  - contentVersion 4 落地唯一 `SpriteDef.poses` 动作模型：稳定 ActionId、逐步 duration、loopFrom、同步 sound cue；
    `EntityPage.animation`、`playEntityAction`、`stopEntityAction`、升级器、shape/ref/frame-demand 全闭环。
  - Reforge 增加实例级 `EntityActionPlayer`，页绑定与脚本覆盖共用同一状态；播放、停止、循环、一次性、起始相位、
    cue、隐藏/移动/换场景/换精灵/重入清理和 legacy 优先级均有测试。
  - 编辑器保持原始帧池常驻，动作可创建/编辑/预览/重排/删除步骤并绑定音效；场景页可选动作，脚本命令可插入并
    反跳动作；动作引用精确到 scene/entity/page/command，删除保护、undo/redo/save/reopen 与 source-frame 修改闭环。
  - G2 v2 以完整执行根、`(script,self)`、phase/steady-family/evidence/digest 冻结候选；差分 oracle 逐帧比较旧 runner
    与新播放器至少两轮，之后才允许 materialize 与 MG2 写盘。
  - 最终迁移：1374 个第 0 页 auto（1344 direct + 30 无外观 zone）；387 个实例 / 54 个场景准入，生成 32 个
    SpriteDef 动作（36 条 exact action），32 个 steady、4 个 finite-intro；30 zone 与随机/移动/状态/显隐/
    外部写等保持 legacy。materializer digest
    `fb60bc5a770ef62a0baf4c8ae482e0e963b3e18a274a4d3520a7c9c3ed017e4f`。
  - census canonical digest：accepted
    `b6ee586cefe9a5b0762279f39892ab141247fcf761f279466f648b45f87c528b`、rejections
    `abc4f8730acfe97dd71b979a0446aa9e6663351121553c6343e09cc42dc3fe09`、actions
    `a6dd0657ff7476d2c37021277540c92cdc43df888f16d712c87e40d3e7585c69`。
- 运行命令:
  - `pnpm lint`：821 个文件全绿。
  - `pnpm typecheck`：7 个 workspace package 全绿。
  - `pnpm --filter @type-pal/content test`：23 files / 265 tests 全绿。
  - `pnpm --filter @type-pal/migrate test`：37 files / 278 passed + 1 skipped。
  - `pnpm --filter @type-pal/reforge test`：55 files / 516 tests 全绿。
  - `pnpm --filter @type-pal/editor test`：70 files / 600 tests 全绿。
  - `pnpm --filter @type-pal/reforge build`、`pnpm --filter @type-pal/editor build`：全绿；editor 仅既有
    约 1.07 MB chunk 提示。
  - `pnpm --filter @type-pal/migrate audit:sprite-actions`：上述 census/materializer 数字和 digest 全绿。
  - `pnpm --filter @type-pal/migrate audit:sounds`：playSound 1034/1034，sound edges 1667，全部资产引用 6648，
    missing=0、kindMismatch=0。
  - `pnpm --filter @type-pal/migrate migrate:content -- --write`：正式事务写入工程与 baseline；随后无参数二跑
    `writes=0/deletes=0/conflicts=0`，`generated=0/kept=1/merged=0`；写前门禁 scenes=294、
    ref-warnings=0、script-issues=0、asset-refs=6648、asset-warnings=132（既有未引用诊断）。
  - `git diff --check`：全绿。
- 浏览器 / 手工检查: 见下节；最终复验后无新增 console error/warn。
- 跳过的检查及原因: 历史 `audit:a7-sound-diff` 只冻结 A7-1 旧提交边界，后续 A7-3B 合法 catalog 变更不在
  其 whitelist；本卡使用当前 `audit:sounds` 作为声音闭包门禁，未篡改历史审计基线。

## 视觉验证记录

- Visual Verification Owner: Codex + Kimi
- 验证方式: 本地 editor `http://localhost:6010/` + in-app Browser，使用 PAL 工程真实 v4 数据；DOM 可访问树、
  动态预览、深链跳转和 console 日志联合检查。
- 截图 / 像素检查路径: 临时浏览器截图仅用于本轮人工检查，未提交测试图片。
- 结论:
  - sprite-77：原始帧始终可见；PAL 自动动作的稳定 ID、循环、240ms 步骤和编辑器操作成立；精确引用
    `s208/e3555/pages[0].animation.action` 可跳场景并反跳动作。
  - sprite-96：启动/稳态非均匀时长和 `sound.pal.135` cue 可见；已迁移 `s275/e4732` 精确引用动作，
    未准入 `s012/e197` 仍在 PAL 兼容区查看/编辑原脚本。
  - sprite-8：动作预览显示启动 #0/100ms、循环 #1/#2/#3 各 200ms；引用页完整显示 53 个动作引用。
    切换引用筛选后仍保持 `aria-selected=true` 的“引用”页签，标题为“动作引用 · 53”，不再错误跳回动作编辑。
  - 源帧切换与引用页签复验后无新增 console error/warn；同时修复 `SpriteResourceViewer` 在 React state updater
    内回调父组件导致的 render-phase 更新警告，改为 effect 同步选中帧。
- 未完成项: 无。Kimi 已于 2026-07-22 完成架构/runtime/editor/视觉复审并签 accept。

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: Codex 自验 accept；**GLM accept（2026-07-15，数据/迁移/MG2/测试矩阵）**；**Kimi accept
  （2026-07-22，架构/runtime/editor/视觉，K1-K6 全满足）**。三签齐,无返工项。
- 必须返工项: 无。
- Accept / rework: **accept（三方，2026-07-22）；用户确认后已收口为 done**。

### GLM done 审查（2026-07-15）

**方法**：只读审查，不改实现文件。读 census/materialize/upgrade/validate 源码逻辑 + 独立复跑审计/迁移/测试，
不依赖卡内数字转述。

#### G1-G7 逐项验证

| 项 | 结论 | 证据 |
|---|---|---|
| **G1 版本执行** | ✅ | `character.ts:68` contentVersion=4；`validate.ts:134` 仅接受 v4；`project-upgrade.ts:528-531` v3→v4 manifest 最后提交；`upgradeSpriteDefinitionsV3ToV4:366` + `upgradeSceneDefinitionsV3ToV4:475` + `rejectDynamicLegacyLoopReferences:447` legacy layout.loop→static + 动作登记 + 动态引用拒绝；A7-4→v5 文档口径已在 asset-pipeline/a7-resource-closure-audit/project-lifecycle-design 三处同步 |
| **G2 可执行 census** | ✅ | `pnpm audit:sprite-actions` 独立复跑数字全部对账（见下表）；census 代码逐行核对：execution root 闭包覆盖 onEnter/onTeleport/trigger/auto/hostile-onLose + 动态 binding fixed point（census.ts:742-800, 1073-1126）；`(script,self)` 访问键 `JSON.stringify([id, nextSelf ?? null])`（census.ts:377, 878）；orphan-script 启发式已移除；finite-intro/steady/evidence/digest 完整 |
| **G3 差分 oracle** | ✅ | `pal-sprite-action-census.pal.test.ts:99-148` 对全部 387 accepted 实例跑旧 runner trace 规范化 + 新 `EntityActionPlayer` 逐毫秒采样，两轮比较 frame/time/cue 三维；paceMs=100 + stageYield=40 + 显式 wait + call/jump/stop 闭包（census.ts:679-734）；相邻同帧 cue 不合并（census.ts:446-449 注释 + test:125-147） |
| **G4 MG2 闭环** | ✅ | `pnpm migrate:content` 二跑 `writes=0/deletes=0/conflicts=0, generated=0/kept=1/merged=0`；materialize digest `fb60bc5a...` golden 锁定（materialize.ts:252-265）；accepted/steady/rejected digest 三份独立（census.ts:1245-1267）；写前门禁 scenes=294/ref-warnings=0/script-issues=0/asset-refs=6648 |
| **G5 frame-demand 一致性** | ✅ | `sprite.ts:102-114` `spriteDefinitionFrameDemand` 遍历 `action.steps`；`sprite.ts:117-131` `spriteDefinitionFrameIndices` 同步更新；越界债检测在新 shape 下可用 |
| **G6 校验器 fail-loud** | ✅ | `validate.ts:393` `requireOnlyKeys(action, ['label','order','steps','loopFrom'])`；`:406` `requireOnlyKeys(step, ['frame','durationMs','cues'])`；`:417-419` cue kind 仅 sound；`:410` durationMs 正整数；`:434-440` loopFrom 边界；`:422-430` catalog 查找验证 kind=sound；删除保护：`SpriteActionEditor.tsx:186` `if (actionReferences.length) return` + `:587` disabled |
| **G7 测试矩阵** | ✅ | content 23/265、migrate 37/278+1skip、reforge 55/516、editor 71/603 全绿；pal-sprite-action-census.pal.test 含完整 golden + oracle（18s）；typecheck/build/lint 全绿 |

#### 独立复跑 census 数字（与卡内冻结逐项对账）

| 数字 | 卡内冻结 | GLM 复跑 (`pnpm audit:sprite-actions`) | 结论 |
|---|---|---|---|
| page0Auto | 1374 | **1374** | ✅ |
| directSprite | 1344 | **1344** | ✅ |
| actorSource | 0 | **0** | ✅ |
| noVisualSource (zone) | 30 | **30** | ✅ |
| provenBeforeIncomingWrites | 484 | **484** | ✅ |
| rejectedByExternalWrites | 97 | **97** | ✅ |
| acceptedInstances | 387 | **387** | ✅ |
| acceptedSpriteDefinitions | 32 | **32** | ✅ |
| exactActions | 36 | **36** | ✅ |
| steadyCycleFamilies | 32 | **32** | ✅ |
| finiteIntroInstances | 4 | **4** | ✅ |
| acceptedSites digest | b6ee586c... | **b6ee586c...** | ✅ |
| rejections digest | abc4f873... | **abc4f873...** | ✅ |
| actions digest | a6dd0657... | **a6dd0657...** | ✅ |
| materializer digest | fb60bc5a... | **fb60bc5a...** | ✅ |

#### 关键样本独立验证

- **sprite-96**：s275/e4732 accepted（`animation: pal-auto-v1-f22619b09a66b2f6, loop:true`，auto 已删）；
  s012/e197 rejected（external-write，`auto` 保留、无 `animation`）— 与 Kimi 视觉备注一致。
  timeline 6 steps 含 `#2+sound.pal.135@380ms` cue（与卡内 `#0@80→#1@160→#2+sound@80→#3@120` 规范化后等价：
  paceMs=100 把每条命令的 pace 累加进 durationMs）。
- **sprite-8**：53 instances 全 accepted；3 exactTimelineKeys → 1 steadyCycleKey；phase 0/200/400 = 20/15/18 实例。
  PAL 工程 s020 抽查 27 个 sprite-8 实例 distinct phases=3 [0,200,400] — 多实例相位独立不全局同步。
- **sprite-72/490**：全 random-branch 拒绝（sprite-72=3 实例，sprite-490=37 实例 random+stop-script）。
- **sprite-35**：3 实例 = 2 external-write + 1 accepted — setEntityAuto 外部写拒绝样本成立。
- **30 actor-backed zone**：全部 `source='zone'`、`reasons=['no-visual-source']`，逐条 scene/entity id 见
  `pal-sprite-action-census.pal.test.ts:13-44`（expectedZones 数组）。无外观触发区全拒绝迁移成立。
- **4 finite-intro**：s130/e2276, e2278, e2280 + s203/e3425 — 启动段后定格，生命周期不等价页默认动作，保留脚本。
- **1 no-visible-action**：s013/e199 — 循环只显 1 帧、无 cue、无启动段，首批拒绝。

#### 代码逻辑审查要点

- **execution root 闭包完整**（census.ts:742-800）：onEnter entry.prepare+body、onTeleport、trigger、auto、
  hostile.onLose 全部纳入；动态 binding（setEntityAuto/setEntityTrigger/setSceneOnEnter/setSceneOnTeleport）
  按 `(kind,target,self,sourceIdentity)` fixed point 入队（census.ts:1073-1126），自安装/互装不会撑爆。
- **`(script,self)` 访问键**（census.ts:377, 878）：同一 ScriptRef 以不同 self 执行被视为不同访问点 —
  修复了初版 `visited<scriptId>` 合并导致的漏判（Codex 在 G2 rework 第二轮审计中撤销冻结时发现）。
- **external-write 按 root 而非 script id**（census.ts:920-928 isExternalWrite）：自身 trigger 也算外部写 —
  shared body 同时被 auto/trigger 引用不会漏判。
- **finite-intro vs no-visible-action 分类**（census.ts:989-1004）：只有启动段含 sound 或多帧才 finite-intro，
  否则 no-visible-action；分类边界严格。
- **materialize 只接受 steady loop**（materialize.ts:130-133）：finite-intro 会 throw，不进首批重写。
- **删除保护走统一引用图**（WorldSpriteLibrary.tsx:206-209, SpriteActionEditor.tsx:186,587）：
  `collectSpriteActionReferences` 覆盖 page.animation + playEntityAction 命令，引用存在时 delete 按钮 disabled。

#### 结论

**GLM accept**。数据/迁移/MG2/测试矩阵全部对账成立，G1-G7 逐项通过，无 counter/rework。
该席位签字时仍等待 Kimi 架构/runtime/editor/视觉审查；Kimi 后续已于 2026-07-22 签 accept，三方现已齐。

## 用户验收

- 用户结论: 2026-07-21 批准立项与上述产品方向；2026-07-22 确认三方签字齐，批准按验收结论收口。
- 后续任务: 本卡无剩余实现或审查项；git 收口与后续能力优先级由用户另行安排。

## 交接日志

- 2026-07-21 Codex: 核对 A7-3B/C2-PAL 三方 done 签均齐并按用户确认收口；将 design-backlog 议题 16
  提升为本高风险卡。冻结用户产品决策、当前 schema/runtime 缺口、PAL auto census、incoming-write 边界和验收矩阵。
  Evidence: 本卡与 `docs/phase2/design-backlog.md` 议题 16。Next: Kimi/GLM 独立设计审查；三签未齐不得实现。
- 2026-07-21 Kimi: draft 架构/runtime/UX 设计审查签 **agree**。六问逐项成立；版本裁决 C2-ACT v4 / A7-4 v5；
  附 K1-K6 build 必落钉。Evidence: 设计签字 Kimi 行 + 主审立场。Next: GLM 数据/迁移复核。
- 2026-07-15 GLM: 数据/迁移/MG2/测试矩阵设计审查签 **agree**。独立重建 census 顶层 1374=1344+30 成立；
  sprite-96（2 实例,#0@80→#1@160→#2+sound.pal.135@80→#3@120）与 sprite-8（53 实例,3 时间线）逐字节实证；
  30 actor-backed zone 全部无外观触发区→全拒绝迁移；代码锚点逐行核对（sprite.ts/script.ts/main.ts/
  script-runner.ts/world-sprite-behavior.ts/SpriteFrames.tsx）；版本裁决同意 Kimi 方案。
  **派生数字分歧**：GLM 复算 504 纯确定/432 clean/72 外部写 vs 卡内 483/454/29，差异源于分类边界定义不同，
  G2 要求 build 用可执行脚本冻结最终数字。Evidence: 设计签字 GLM 行 + GLM 数据审查节。Next: Codex 设计签；
  三签齐后 build allowed；**build 前必须用可执行 census 脚本冻结最终迁移数字（G2）**。未改实现文件。
- 2026-07-21 Kimi: 架构/runtime/UX 设计主审完成,签 **agree**(K1-K6 build 必落钉 + 版本裁决)。
  六问逐项核对:poses Record 演进为唯一动作模型(Record key=稳定 ActionId,label/order 仅显示);
  EntityPage.animation/auto/play/stop 三层无第二真值(纯动画迁移后只剩 binding);steps/durationMs/
  loopFrom/startAtMs 覆盖非均匀时长与实例错相,cue v1 仅帧同步 sound(sprite-96 可表达);优先级与
  生命周期矩阵成立(隐藏冻结/重入重置/切场景销毁/读档重建);**版本裁决:C2-ACT 取 contentVersion 4
  (v3+精灵动作),A7-4 顺延 v5(v4+legacy 归零),project-lifecycle-design:227/250 等三处文档口径
  同步重排;SAVE_VERSION 不动**。R1-R6:版本执行/复合引用身份/播放器单真源/cue 边界/迁移证明
  (oracle 全等才重写)/UX 闭环(引用页精确跳转+命令反跳+删除保护+键盘)。Evidence:本卡主审立场、
  签字区、争议记录。Next:GLM 数据/迁移复核(1374 分类/30 actor-backed/454·38 去重/MG2);
  三签未齐不得实现。未改实现文件。
- 2026-07-21 Codex: 复核 Kimi/GLM 均为 agree、无 counter，接受 K1-K6/G1-G7 与版本重排，补 Codex
  设计签并推进 `build`。派生数字 483/454/29 与 504/432/72 的差异不拍脑袋裁决，build 第一项建立
  可执行 census 统一冻结候选/拒绝/去重动作数；完成前不重写 PAL。Evidence: 设计签字区与 G2。
  Next: Codex 实现 census + 回归测试，随后才进入 schema/runtime/editor/migrate。
- 2026-07-21 Codex: 完成 G2 可执行 census、CLI、纯单测与 PAL golden；按真实 ScriptRunner
  pace/call/jump/stage 语义冻结 `391 / 32 / 36 / 32`，30 个无外观 zone 全拒绝，incoming-write
  `93` 个实例并按类别报告，三份摘要 SHA-256 锁定，二跑字节一致。纠正历史 `483/454/29` 及
  sprite-96 `80/160/80/120ms` 仅属手算/预览投影。Evidence: 上述三个测试/审计命令全绿。
  Next: contentVersion 4 schema、校验与 v3→v4 升级器；尚未重写 PAL 产物。
- 2026-07-21 Codex: 对初版 G2 做第二轮只读压力审计后撤销冻结。已复现两类漏判：动态绑定脚本写第三实体
  未进入 execution-root 闭包、同一 ScriptRef 以不同 self 执行被 `visited<scriptId>` 合并；同时 orphan-script
  不是合法内容入口，4 个 finite-intro 被误标 no-visible，三份 digest 未覆盖 phase/steady/internal evidence/
  activatedBy。顶层 1374=1344+30 仍成立，但 `391/32/36/32` 与旧 SHA 不再是迁移真值。
  Evidence: census 只读复核清单与待补 fixtures。Next: Codex 修 G2 并重跑 PAL golden；完成前不写 PAL 引用。
- 2026-07-22 Codex: 完成 G2 v2、content v4、实例动作播放器、编辑器动作/引用闭环、差分 oracle、materializer
  与 MG2 正式写入；最终冻结 387 instances / 54 scenes / 32 definitions / 32 actions，二跑 plan 0/0/0。
  全包 lint/typecheck/test/build、声音/动作审计与浏览器真实 PAL 复验全绿；修复引用动作筛选误跳页和源帧回调
  render-phase 警告。Codex done 审查签 accept，任务推进 review。Evidence: Build/视觉验证记录。
  Next: Kimi 审架构/runtime/editor/视觉；GLM 审数据/census/oracle/MG2/测试矩阵；二者均不得改实现或提前 done。
- 2026-07-15 GLM: done 数据/迁移/MG2/测试矩阵审查签 **accept**。只读审查不改实现：读 census/materialize/
  upgrade/validate/validate-refs/entity-action-player 源码逻辑；独立复跑 `pnpm audit:sprite-actions`
  全部冻结数字逐项对账（1374=1344+30、387/32/36/32、4 finite-intro、三份 digest）；PAL 工程抽查
  sprite-96（s275 accepted/s012 rejected-external-write）、sprite-8（s020 27 实例 3 相位 0/200/400）、
  sprite-35/72/490 拒绝样本；`pnpm migrate:content` 二跑 writes=0/deletes=0/conflicts=0；content265/migrate278+1skip/
  reforge516/editor603 全绿。G1-G7 逐项验证通过，无 counter/rework。Evidence: GLM done 审查节 + 签字区。
  Next: **Kimi 架构/runtime/editor/视觉 review pending**；Kimi accept 后三方齐由 Codex 收口；未改实现文件。
- 2026-07-22 Kimi: 架构/runtime/editor/视觉 done 复审签 **accept**,三签齐。逐项核实:复合
  `(spriteId,actionId)` 引用校验 fail-loud(entity-action-player.ts:91-113);`EntityActionPlayer` 每实体
  {base,override} 双轨、非均匀逐边界推进、loopFrom 进入时才应用循环相位、暂停不追帧不补 cue、override
  完成后剩余 dt 交还 base、play 幂等、stop(false/true)、signal 中止不越权,测试 12 用例覆盖(:41-231);
  cue 仅 {kind:'sound'}(sprite-96 `#2@380+sound.pal.135` 产物与 UI 可见);census 复跑摘要
  387/32/36(32 steady families+4 finite-intro 折叠为 32 defs/32 poses,9 条 loopFrom>0 带启动段,
  digest `b6ee586…` 与卡片一致);sprite-8 引用页 53 项精确 locator 与「打开引用 ↗」落 s020、筛选切换后
  引用页签保持 aria-selected 不跳回动作;s012/e197 未迁移脚本经「编辑脚本」原样可见可编;sprite-77 单引用
  可达;console error 0;根 pnpm check 全绿(822 files)。Evidence:done 准入 Kimi 行+上述实测。Next:
  无下一位审查 Agent;待用户验收后由收口方标 done。未改实现文件。
- 2026-07-22 Codex: 复核 Codex/Kimi/GLM done 签均为 accept、无 counter/rework；用户确认“签字齐了”并授权
  收口，任务状态由 review 转 done，同步清理看板与过期交接提示。Evidence: done 准入签字区、用户验收节。
  Next: 无下一位 Agent；等待用户安排 git 收口或下一项能力。

## 下一位 Agent 提示词

无下一位 Agent 提示词：C2-ACT 已完成三方审查与用户验收，任务状态为 done。

<details>
<summary>历史交接提示词（Kimi review，已完成）</summary>

### 给 Kimi（review：架构 / runtime / editor / 视觉）

```text
接手任务: C2-ACT 精灵预制动作消费闭环 review
任务卡: docs/ops/tasks/C2-ACT-sprite-action-playback.md
当前状态: review；三方设计 agree，Codex 实现与自验 accept（2026-07-22），GLM done accept（2026-07-15，
  数据/迁移/MG2/测试矩阵）；Kimi done 审查 pending。**三方未齐不得标记 done。**
你的角色: Kimi，架构/runtime/editor/视觉主审。只审查，不改实现文件。
先读: AGENTS.md、docs/phase2/READ-FIRST.md、本任务卡全部（尤其 K1-K6、Build、视觉验证记录、GLM done 审查节）、
docs/phase2/design-backlog.md 议题16、packages/content/src/sprite.ts、script.ts、validate.ts、
packages/reforge/src/entity-action-player.ts、main.ts、script-runner.ts、
packages/editor/src/ui/WorldSpriteLibrary.tsx、SpriteActionEditor.tsx、EntityPageAnimationEditor.tsx、
SpriteResourceViewer.tsx、ScriptDrawer.tsx、packages/editor/src/core/sprite-actions.ts 与相关测试。
已完成:
  - contentVersion 4、稳定复合引用、实例级播放器、动作/引用/反跳/删除保护/保存重开闭环均已实现。
  - PAL 生成 32 个共享动作并重写 387 实例；legacy 行为仍可查看原脚本。
  - GLM 已独立复跑 census/审计/MG2 二跑/全包测试全部对账成立；G1-G7 通过。
  - lint/typecheck/content265/migrate278+1/reforge516/editor603/build/MG2 二跑和浏览器 PAL 复验全绿。
请你做:
1) 对照 K1-K6 审唯一动作模型、复合 ActionId、播放器单真源、生命周期/优先级/cue 和命令反跳。
2) 本地抽验 sprite-77、96、8；重点看引用页切换不跳回动作、精确深链、legacy 原脚本仍可达、console 无新增异常。
3) 审新增 React effect/callback 是否无 render-phase 更新、无状态串位。
输出要求: 在任务卡 Kimi done 签写 accept，或写 counter/rework 的精确文件/场景/复现；同步交接日志。
不得改实现文件；不得代 GLM 签（GLM 已 accept）；**Kimi accept 后三方齐，由 Codex 收口任务状态与 git。**
```

无下一位 Agent 提示词给 GLM——GLM done 审查已签 accept。等待 Kimi review 完成后三方 accept 齐由 Codex 收口。

</details>
