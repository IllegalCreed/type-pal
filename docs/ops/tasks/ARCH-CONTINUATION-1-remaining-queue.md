# ARCH-CONTINUATION-1 — 剩余架构治理连续收口

Status: build
Phase: cross-phase architecture
Coding / Integration Owner: Codex
Base: `0cb32631`
Visual Verification Timing: dev-functional；剧情E2E另排

## 目标与授权

2026-09-26用户要求“剩余架构治理一口气做完”，随后要求给Cursor大量并行工作。
Codex持续处理[治理台账](../audits/architecture-debt.md)剩余边界，Cursor按[24组F2卡](../archive/tasks/done/ARCH-F2-CURSOR-BATCH-1-domain-modules.md)
实施互斥的中低风险切片。既有GLM实验分支只补候选/视觉证据，未经接收不改主线产品。
不再因每个小批结束请求“继续”；真实用户产品裁决仍须提出，任何未完成项不虚报done。

## 完成准绳与顺序

| 队列 | 完成条件 | 当前 |
|---|---|---|
| E2 | 作者/敌人校验运行期环消除；共享形状/校验选项明确；七类递归路径与错误位置保真；已证嵌套cue漏检另提交修复 | 2026-09-26 accept/完成 |
| D1 | 第一阶段七节点SCC按真实状态/查询/脚本桥消环；旧入口/数值/坐标/推进序保持 | 2026-09-26 accept/完成 |
| A3 | 活动场景、移动与绘制状态各有所有者；main保留装配/协调；取消、切场同步提交和采样时点保真 | 7be10bf4候选四段齐；待原接收对话统一门/集成后正式完成 |
| B1 | App工程生命周期、导航与场景工作区分离；历史/保存/离开/试玩既有门禁仍通过 | 4101926d..52112d86候选四段齐；待原接收对话统一门/集成后正式完成 |
| B2 | MapMode手势、选择/剪贴板、组合操作和视图分别有明确边界；取消、权限和原子提交保真 | 3c3fccda..3a633ed7候选四边界齐；待原接收对话统一门/集成后正式完成 |
| B3 | 命令族表单拆出独立实现；作者桥接类型清晰；现行能力/引用保护不丢失 | f4beb777候选四族+桥齐；待原接收对话统一门/集成后正式完成 |
| C1 | BattleSession输入、动作/演出、资源屏障、结算呈现的状态归属拆清；公开tick业务序列保真 | afef3cd3候选四owner齐；待原接收对话统一门/集成后正式完成 |
| D2 | 一阶段opcode族、战斗主控、启动资源生命周期分开，真实机制/数据回归通过 | 待实施 |
| E1 | 迁移场景映射与脚本转换阶段独立、纯内存入口可测；输出/幂等/写保护保真 | 待实施 |
| F1 | design-system audit 的AST事实、CSS推导、规则、报告分层；现有违规/反例与性能门不弱化 | 待实施 |
| F2 | Cursor24组与剩余actor/entity/map/资源命令边界全部接收，commands/controls成为稳定出口 | 2026-09-26 accept/完成，check8740/strict8248/701 |

每个状态所有权边界先读一手源码和既有回归，记录依赖、输入采样、同步提交、取消/释放；纯机械搬迁
用正文/出口/实际行为对照，不新建传全上下文的伪模块。实际bug与结构变更分提交。
开发期定向/相邻/类型检查，大批末串行check→ratchet→受保护单次strict；不改include/exclude/阈值换通过。
保持content20/SAVE8、玩法、公式、资产约定与UI形态；不直接手改生成物。

## E2 当前前提

- `author-script-core.ts:3/:712`调用敌人演出守卫，`enemy-script.ts:1/:598`反调作者守卫，构成runtime环。
  演出动作、AI条件、基础形状校验可成为独立下层；敌人hook/onDefeated保留其上下文政策。
- 已有直接反证：`checkAuthorCommands`直接拒绝缺identity对话，却接受startBattle.choreography内同一cue；
  原因是`:712`漏传options。当前`author-dialogue.ts:124`与`author-script.ts:106`要求身份完整，修复保持此已有合同。
  合法narration/actor/unbound和runtime对话各按现行方言通过，不新增身份政策。
- 原版/一阶段不适用这条作者结构guard；本项目当前类型/loader为一手真值。若现行真实输入不能通过
  既有author身份合同，先定位输入或调用域，禁止兼容fallback。最强替代解释是此边故意消费runtime cue；
  authorCommandValidationOptions的递归调用合同与同树作者类型反驳该解释，须用正式入口回归固定。

## 当前推进

- 2026-09-26 D2-c 战斗结算主控开工（基点 `a67e5542`）：`battle-system.ts:3160` 之后仍把非胜利
  写回、公共 cleanup、胜利多屏、战后脚本、半血恢复、主/隐藏经验升级与学法术连成约 500 行终态子系统，
  而 `battle-settlement.ts` 只持数据形状。原版/primary source 为 `battle.c:991-1373,1822-1855` 与
  `global.c:2084,2331-2454`；一阶段现行真值是严格的写回→奖励/升级→逐屏→战后脚本→半血恢复→释放/
  接回事件顺序，当前二阶段不消费此主控。目标将整条终态子系统迁入 `battle-settlement.ts`，直接接收
  `GameState/BattleState/BattleResources/CommandBus` 四个真实 owner 与输入快照，不复制结算状态、不创建传遍全局的
  runtime context；`battle-system` 只在 phase 路由的原采样点调用并 re-export 既有 public 测试 API。
  最强替代解释是模块边界会改变 RNG 抽取、首帧拒键、敌人 post-script 次序或 cleanup 后事件接回；可证伪观察为
  结算屏序、角色数值、runner 调用、隐藏字段释放和最终 mode/cursor 任一差异。验收复用 battle-system/levelup/
  settlement/dialog/writeback 正式回归，新增源码边界与反控；不改公式、文本、超时、SAVE8/content20、UI 或资产。
  Codex 已核当前调用链与机制锚点，premise verified / build allowed；本段完成仍不等于 D2 整体完成。

- 2026-09-26 D2-b 战斗运行资源生命周期开工（基点 `f0d9b09c`）：`battle-system.ts`
  同时定义资源表形状、在 `GameState.__battleResources/__battleRunScript` 写入与读取、present 侧 live roles
  查询及 finalize 清理，主控因而直接知道两项隐藏运行资源的存储细节。现行一手真值是 `startBattle`
  在构造 `BattleState` 后同步安装资源与可选脚本 runner，所有 phase 在同一 `GameState` 上读取，
  `finalizeBattle` 先恢复玩法状态再清资源/runner 并接回事件脚本；原版只要求这些表和脚本入口覆盖整场战斗，
  不规定 TypeScript 容器。目标迁为 `battle-runtime-context.ts` 单一 owner，仍使用完全相同的隐藏键、对象引用、
  fallback runner 和清理时点；`battle-system` 只装配/消费窄函数并继续 re-export 既有 public 类型/查询，
  不引入全局 Map、完整 runtime context 或第二份角色状态。最强替代解释是封装会改变 fixture 直接观察隐藏字段、
  注入 runner 优先级或战后释放顺序；可证伪观察为引用身份、fallback、hidden key 可见性或 finalize 后状态任一不同。
  验收以 owner 直接例、现有 battle/dev-panel/present 相邻回归、源码边界与反控固定；玩法、公式、RNG、SAVE8、
  content20、UI 与资产零改。Codex 已核当前 start/tick/finalize 调用链，premise verified / build allowed；
  本段只是战斗主控拆分的资源子边界，完成不等于 D2 完成。

- 2026-09-26 D2-a 玩家/装备/毒/状态 opcode 族开工（基点 `d70d73b8`）：当前 `applyRawOpcode`
  仍在 `event-system.ts:3499` 混持角色成长、装备交换、HP/MP、复活、毒/状态、法术表等 22 个 case 及其
  私有 helper。原版/primary source 为 `script.c:752-1404,1816-1846,2591-2595` 与 `global.c` 对应
  PlayerRoles/poison/level helper；一阶段真值为 `game-mechanics.md` 的主升级、装备 base+Σeffect、毒与状态规则，
  当前二阶段不消费此运行时；本段目标只把现有同步实现迁入 `event-opcode-player.ts`，旧 `event-system` 继续
  re-export 原 opcode 常量并在统一 raw 入口同步委派。新 owner 只接收 `GameState`、三操作数、role context 和
  毒脚本同步回调，不接收 event runtime/战斗主控/bootstrap；`BattleState` 专属 enemy opcode 仍保持现有 no-op
  fallback，不借重构改双解释器政策。最强替代解释是模块化会改变 Math.random 采样或 battle raw fallback 的
  同拍回灌；可证伪观察为同一真实 opcode 序列出现 state/cursor/RNG 调用次序差异。验收以现有 event/equipment/
  poison/battle-script 回归、owner 直接例、源码边界与单点反控固定；玩法、公式、SAVE8/content20、UI、资产零改。
  Codex 已直接核 `engineering-notes.md` §2.1–3.5、`game-mechanics.md` 对应条目和当前正式调用链，premise verified /
  build allowed；D2-a 完成不等于 D2 整体完成，战斗主控与启动资源生命周期仍后续。

- 2026-09-26 C1 BattleSession四owner候选 `aab78c82`、`450df20d`、`f68d4e89`、`afef3cd3`
  已交付：[回执与未证项](../../testing/battle-session-owners-refactor.md)。readiness gate、settlement presentation、
  command selection、action presentation scheduler 分别独占资源屏障、终态呈现、命令临时态与动作演出节拍；
  会话继续拥有 core/timeline/hook/视觉/render 和终态外层门，不传整个上下文、不复制正式状态 owner。
  `BattleSession` 3022→2593；四 owner 35 新增，定向 11 文件/124 项、Reforge 182 文件/1682 项、TC/Biome/
  build、十一针与 6057 PAL 独立试打通过。content20/SAVE8、公式、玩法、奖励写回、UI、终态协议与资产约定
  零改。按交接未跑共享全仓 check/ratchet/strict、未合 main；C1 只在候选树边界齐，待原接收对话统一门后
  正式标完成。本实现对话继续 D2 等不重叠项。

- 2026-09-26 C1-d 动作/演出调度段开工（基点 `f68d4e89`）：`actTimer/anim/scriptAnimation`
  仍被会话、脚本 pump 与终态分支交叉清理；三条路径的语义不同，不能合并成一条“动画播完”。迁为
  `BattleActionPresentationScheduler`：owner 独占行动节拍、`AnimPlayer` 与 scripted 标志，接收已构建 timeline
  和现有 side-effect 回调；不接收 `BattleState`/会话/资产。分别暴露 script consume 与普通/终态 playback consume，
  保持脚本完成清 player+scripted，普通与终态只清 player 的现行差异；行动 240ms 门仍在准备 core step 前同拍归零，
  timeline `tick(0)` 仍同步派发首帧。会话继续拥有 core `stepBattle`、时间线构建、hook/choreography 政策和视觉落地，
  不复制 actionQueue，不把 render 大函数搬入伪模块。验收复用 action/script/round/terminal 正式回归，新增 scheduler
  节拍/三种消费语义/首帧/结构反控；不改帧序、公式、音画/UI。此段完成后四类 C1 owner 边界齐，但仍须统一
  C1 回归、反控、Reforge/TC/Biome/build 与证据收口才可报候选完成。Codex premise verified / build allowed。

- 2026-09-26 C1-c 选择输入段开工（基点 `450df20d`）：总会话仍混持 command phase、五类游标、三类
  pending target、F/R/A、`lastActs` 与 `submitOrder`，并在 `tick` 内直接解释完整菜单状态机。迁为
  `BattleCommandSelection`：owner 独占上述临时态、菜单/目标转换、重复动作修正与回退顺序；每拍只接收当前队员
  只读选择视图、存活敌槽、可用/投掷清单、技能/物品表和当前金钱，并通过 submit/retract/consumeCoop 三个窄端口
  同步提交，不接收 `BattleState`/`BattleSession`。脚本自动战斗仍由会话/core 路径持有；render 只读 selection view，
  core pendingActions 仍是正式动作 owner。保持方向/确认/Esc、D/Q/E/W、F/R/A、MP/金钱与预占过滤、单体敌友目标、
  合击占位及跨轮 reset 采样时点。验收复用 selection/action/round/script 正式回归，新增 owner 转移矩阵、结构边界和
  反控；不改未实现围攻/状态灰显、玩法、公式、UI 或物品能力。选择段完成仍不得标 C1 done；Codex 核现行菜单链
  和一阶段快捷键锚点后 premise verified / build allowed。

- 2026-09-26 C1-b 终态/结算呈现段开工（基点 `aab78c82`）：`terminalResult/settlement/settleIdx/overTimer`
  仍由总会话混持，核心终态映射、多屏 300ms 防连按、无屏胜败 1.2s 停留与逃跑/终止同拍完成没有独立
  owner。迁为 `BattleSettlementPresentation`，只接收已核定 `BattleResult` 或 core terminal phase、enemyFled、
  dt/pressed 与既有 buildSettlement 回调，独占结果、屏幕序列、游标和计时；不接收 `BattleState`/`BattleSession`。
  总会话继续先处理最后一击动画、失败 narration、死亡淡出 hold，门清后才同步调用 owner 并提交 done；render
  只读 owner 当前屏。保持 victory 恰构建一次、非胜利零构建、每屏至少 300ms、三类即时结果不套 1.2s、胜败无屏
  仍等 `OVER_MS`。验收复用 terminal/writeback/script 正式回归，新增 owner 状态机、接线边界与反控；不改奖励、
  写回、公式、UI 文案或终态协议。结算段完成仍不得标 C1 done；Codex 核现行终态生产链后 premise verified /
  build allowed。

- 2026-09-26 C1-a 回合资源屏障段开工（基点 `099a615b`）：`BattleSession.ts` 当前 3022 行，
  `preparationSerial/readinessError`、全员交招快照、同步/异步 prepare、资源失败降级、fatal 停留和 cancel 迟到
  失效仍混在总会话。先迁为 `BattleTurnReadinessGate`：owner 独占 token/phase/error 与错误分类，快照函数只接收
  `BattleState` 并冻结 actions Map、深拷毒进度，宿主只提供“当前会话仍可提交”和“同步进入行动”两个窄回调；不接收完整
  `BattleSession` 或宿主上下文。保持无 prepare 时同拍进入、同步 throw 同拍分类、Promise settle 后单次提交、pending
  输入锁、资源错误 allSettled 后静音降级、fatal Enter/Escape 以原错误退出、cancel 后迟到结果零推进。验收复用
  readiness/selection/script/round 正式回归，新增 owner 状态机与接线断言、单点反控，再跑战斗相邻/Reforge/TC/
  Biome/build；不改公式、战斗动作、UI 文案、content20/SAVE8。动作/演出、选择输入、结算呈现仍属后续段，
  C1-a 完成不得标 C1 done。Codex 核当前生产链与一阶段同步屏障教训后 premise verified / build allowed；
  Cursor 当前 editor 命令测试返工不写该文件，范围不重叠。

- 2026-09-26 B3 命令表单族候选 `ec813052`、`83a8f7be`、`951131d8`、`a5744ee1`、`e538d924`
  已交付：[回执与未证项](../../testing/command-form-families-refactor.md)。`CommandForm` 2098→203，只保留 kind
  分派/公共出口；dialogue、world/entity、actor/party、control/resource 四族分别持有窄资源与表单状态，共享控件
  只有一份实现。作者桥显式列作者专用 kind，并拒绝 kind 漂移与 dialogue identity 降级；`ScriptEditor` 删除
  `as Command`/`as AuthorCommand` 方言强转。设计证据迁到真实 owner，既有 15 秒 CSS 失效门未放宽且恢复余量。
  定向 51、Editor 334 文件/2879 项、TC/Biome/build、设计门 100 文件/2 例外、十二针与 6056 只读隔离功能通过；
  content20/SAVE8/schema/locale/reorder/UI/玩法/资产约定零改。按交接未跑共享全仓 check/ratchet/strict、未合
  main；B3 只在候选树边界齐，待原接收对话统一门后正式标完成。本实现对话可继续 C1 等不重叠项。

- 2026-09-26 B3-a 对话命令族开工（基点 `b3eada17`）：`CommandForm.tsx` 当前 2098 行，`dialog`
  分支约 400 行并直接持有作者/运行时 cue 身份、locale 字面量、行 reorder、速度、推进、光标和立绘表单。
  本段把通用小控件与对话族实现拆为独立模块；对话组件只接收 cue 所需的 locale/assets/actors/回调和 draft
  身份，不接收全 `CommandForm` props 或 `CanonicalScriptEditorContext`。总路由继续负责命令分派，其它命令族
  零改；Cursor 当前卡只新增 `src/core` 命令行为测试且明确不碰 `ScriptEditor` 架构，文件范围不重叠。
  保持作者 identity、旧 runtime cue、locale lookup 后写字面量、单行不可删、reorder key、raw JSON 逃生口和
  aggregate draft 提交时点。验收复用 CommandForm/ScriptEditor 现行回归，新增 owner/窄 props 断言、单点反控，
  跑对话相邻/Editor/TC/Biome/build；不改 content20/schema/UI，不把 B3-a 完成冒称 B3 done。Codex 核源码与
  当前生产调用链后 premise verified / build allowed；无产品取舍变化。

- 2026-09-26 B2 地图工作区候选 `3c3fccda`、`a2ea1dee`、`3a633ed7` 已交付：
  [回执与未证项](../../testing/map-workspace-sessions-refactor.md)。pointer session 独占 stroke/pan/selection preview/
  hover 与取消；既有 reducer 继续独占正式 selection；transform session 独占 clipboard/preview/lock/overwrite；view
  与 stamp-structure session 分别独占工具显示态和结构确认快照/焦点。MapMode 保留坐标命中、权限、plan/command、
  revision guard 与同步历史提交，不传整个上下文。`MapMode.tsx` 3819→3734；21 新增、地图/组合相邻 260、Editor
  332 文件/2868 项、TC/Biome/build、九针+十六针与 6055 隔离功能通过；content20/SAVE8/地图格式/坐标碰撞/UI
  零改。浏览器自动化会截获系统 clipboard，原生 Cmd/Ctrl+C/V 视觉仍未证，内部路径已有回归与“重复”预览功能
  证据。按交接未跑共享全仓 check/ratchet/strict、未合 main；B2 只在候选树四边界齐，待原接收对话统一门后
  正式标完成。本实现对话可继续 B3 等不重叠项。

- 2026-09-26 B2-a 地图指针手势段开工（基点 `1e15f64f`，同一候选分支）：只把 `MapMode.tsx`
  的 stroke、painting、rect anchor、pan、selection drag/preview、hover 与 coordinate hover 临时态迁入单一
  pointer gesture session；MapMode 继续拥有坐标/命中计算、工具政策、权限检查、命令构造与同步历史提交，不把
  整个 MapMode 上下文传给新 owner。生产源码已证 `pointercancel`、lost capture 与 window blur 本来就统一清场，
  本段是所有权重构，不把既有实现误报成 bug；保持 pointerId 隔离、selection 先于 stroke 收口、stroke 一次取走、
  cancel/换 map/换 EditSession 同步零写及 pan/view 采样时点。验收复用 MapMode 72 项与已接入 architecture-lab
  取消/会话失效回归，新增 runtime 状态机/总壳 owner 断言和定点反控；Editor TC/Biome/build。clipboard/transform、
  stamp 组合操作与 view/tool 配置仍属后续段，本段完成不得标 B2 done。Codex 核 P2 更正报告与当前生产链后
  premise verified / build allowed；无新手势、地图格式或 UI 产品取舍。

- 2026-09-26 B1编辑器总壳会话候选 `4101926d`、`93e4a9c4`、`6181d7eb`、`52112d86`
  已交付：[回执与未证项](../../testing/editor-app-sessions-refactor.md)。导航、场景工作区、试玩与工程生命周期
  分别有 owner；既有 `ProjectLeaveGuard` 仍独占 leave admission/lease，历史仍独占 dirty/revision/undo/redo。
  `App.tsx` 5170→4688，不传完整编辑器上下文。18 新增、定向 54、保存冲突 37、同步主线后 Editor
  328 文件/2847 项、TC/Biome/build、二十针与 6054 隔离功能通过；content20/SAVE8/玩法/公式/UI/资产约定
  零改。按交接未跑共享全仓 check/ratchet/strict、未合 main；B1 只在候选树四段齐，待原接收对话统一门后
  正式标完成。本实现对话可继续 B2 等不重叠项。

- 2026-09-26 本接收对话核定F2完成：[Cursor九组最终验收](../../testing/cursor-commands-wave2-integration.md)。候选2022acc3/集成96e9d3c1，R1–R3闭合，90声明/119出口/62绑定、五针、最小UI及check8740/strict8248/701通过。新架构对话无需重做F2；D1/E2/F2共三项完成，本卡其余八项仍按各自边界推进。

- 2026-09-26 对话分工交接：用户要求新开Codex对话继续架构治理。新对话接手`/Users/zhangxu/illegal/type-pal-codex-active-scene`（`codex/architecture-active-scene`）的A3移动/绘制实现；原接收对话继续Cursor九组与GLM六组验收。新对话不写main、不接管贡献者目录；分批候选推送后，由原接收对话统一安排check/ratchet/strict、main集成，避免共享coverage目录与基线并发写入。定向/相邻/TC/隔离功能自验由新对话自主完成；后续不重叠架构项可按下方提示连续推进。

- 2026-09-26 A3移动/绘制候选`7be10bf4`（基点`be5218bb`）已交付：[回执与未证项](../../testing/world-runtime-refactor.md)。`WorldMotionRuntime`组合既有Coordinator并拥有世界拍、partyMove、slot注册、gait/fairness/trace；`WorldScenePresentation`拥有定帧/gesture/shake/wave与世界精灵组装/落笔。main6148→5698，不传完整RuntimeContext、不复制authority/slot状态。20新增、定向167、Reforge177文件/1642项、TC/Biome/build、九针与6053隔离功能通过；SAVE8/content20/玩法/公式/UI/资产约定零改。按交接未跑共享全仓check/ratchet/strict、未合main；A3只在候选树四段齐，待原接收对话统一门后正式标完成。本实现对话可继续B1等不重叠项。

- 2026-09-26 B1-a导航段开工（基点`ae989b9b`，同一实现分支）：只拆`App.tsx`当前location、moduleLocations、
  workspaceId键、URL history、localStorage与三栏scroll恢复为单一navigation session hook；App继续负责业务对象焦点、
  scene选择/引用跳转、命令菜单和页面装配。输入只含workspaceId/bodyRef与page-change通知，不传完整App context，
  不碰Cursor命令白名单或MapMode。保持初次URL优先、非法参数归一化、每模块位置记忆、push/replace/none、popstate、
  localStorage失败降级、离页先捕获scroll及rAF取消时点。验收用现有navigation17、reference-navigation、leave-guard，
  加owner定向回归与单点反控、editor TC/Biome；功能视觉只核深链/前进后退/页面滚动恢复。B1工程IO/试玩/场景工作区
  仍属后续段，本段完成不得标B1 done。Codex核源码与P1取证后premise verified / build allowed，无产品取舍变化。

- 2026-09-26 A3活动场景/镜头实现2dc5d1d5已accept：[回执](../../testing/active-scene-refactor.md)。17新增、80宿主函数对账、64序列2560步与七针通过；check8724/保护51048353的单次strict8232/688、6052隔离功能核验全部完成。main6260→6148，A3整体仍build，接续移动/绘制。Cursor接[九组剩余命令](../archive/tasks/done/ARCH-F2-CURSOR-BATCH-2-remaining-commands.md)，GLM接[六组守卫测试](../archive/tasks/done/TEST-GLM-CONTENT-GUARDS-2-leaf-boundaries.md)，互不写同一生产面。

- A3活动场景/相机段开工（基点8d851fa6，独立`codex/architecture-active-scene`）：`main.ts:389-410`的活动资源、实体基准和页动作归ActiveScene；`:440-458/:2074-2117/:3502-3515`的相机位置/偏移/pan取消归WorldCamera。直接源码核得提交序是新scene/assets/entityDefs→页动作同步cue→room/bounds→队伍落点/轨迹→音频，不能分成await或重排同步cue。reloadMap仍先造renderer/room，再commitCanonical，最后替换地图资源；其既有camera bounds不在本次暗改。准备、令牌校验、world替换与存档提交继续在原协调层。
  当前行为真值是上述生产调用链与scene/save/checkpoint回归；一阶段harvest W3/W4/W7、E3/E5、X1/X3只提供相机偏移/同帧采样风险参考，不引入旧引擎耦合。最强替代解释为“搬字段会捕获旧场景/旧玩家位置或重排同步cue”；用实际ScenePreparer产物、主壳调用链、冻结旧相机序列和取消反控排除。Codex核此前提verified、范围build allowed；无新玩法/格式/UI裁决，A3整体仍未完成。

- 2026-09-26 Cursor24组与GLM实验包已独立accept收口，统一check8707/strict8215/686，详见[Cursor](../../testing/cursor-architecture-batch-integration.md)/[GLM](../../testing/architecture-regression-lab-completion.md)。未证后续明确保留：B1核720/900横向裁切、隐藏outliner后残留separator命中/焦点区及boot首屏失败矩阵；E1核globalScriptAliases及profile/reference端到端其它组合（sceneSemanticSpriteIds已有world-sprite-layout-registry三类动态证据，按existing-proof）；原生浏览器125/150% zoom归后续环境/E2E矩阵。以上不是本批已修/已覆盖，不借准备包done关闭架构项。
- D1六个下层所有者已落：[实现与验证](../../testing/phase1-dependency-refactor.md)。只读工具证实原七节点运行期SCC→无SCC、旧出口不变、161函数体保真（32搬移，仅两处同步状态路由变更）；8新增所有权回归、4既有跨模块、554相邻及类型检查通过。与E2统一check8678/ratchet/保护8bf40b90的单次strict8186/654、三针、生产build及隔离浏览器功能验证全部通过。Codex核该两项accept收口；不混入r11复核分支的GLM拟接入测试，后者仍按交接约束独立保留。
- E2结构`4cdefcf1`已分离校验协议/形状/AI条件/演出；旧入口52/19出口一致、50函数体保真（11搬移），content运行期二节点环消除。[E2回执](../../testing/content-validation-refactor.md)与D1共享本批门禁。前轮包括GLM四项副本的门禁只作为独立候选证据，本次按实际E2+D1树重新统一执行，不挪用其测试总数。

- E2缺陷修复先行：新增正式`author-battle-dialogue-boundary.test.ts`13项，原实现9项AssertionError红/4项合法与runtime对照绿；`:712`显式透传options后13/13、content全包863/863与typecheck通过。覆盖直接及七递归臂的精确错误路径、三种合法作者identity、实际cue/路径透传、runtime方言保留；结构解环随后另提交，整批质量门统一执行。

Codex：**premise verified / build allowed**，用户全队列授权下按上表顺序连续开工，单批一主要边界；
Cursor24组已收口；第二批九组和GLM六组已另卡准入，交接提示词见各自新卡。Codex持续A3及其余高风险实现。
D1/E2/F2已完成，整卡仍build、其余八项未done；不把分段完成计作整个A3完成。归档卡内提示词仅为历史。

## 新Codex架构实施对话提示词（2026-09-26）

```text
接手 /Users/zhangxu/illegal/type-pal 的架构治理实施，主卡
docs/ops/tasks/ARCH-CONTINUATION-1-remaining-queue.md，状态build。
用户已授权Codex独立推进，固定三贤人签字暂停。本对话是实现Owner，原对话继续贡献者验收/统一集成。

先读AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、主卡、docs/ops/audits/architecture-debt.md、
docs/testing/active-scene-refactor.md及机账、scene-preparation-refactor.md和phase1-knowledge-harvest对应领域。
第一阶段任务还须读engineering-notes/game-mechanics相关条目；不得把二阶段改回旧引擎架构。

复用 /Users/zhangxu/illegal/type-pal-codex-active-scene，分支codex/architecture-active-scene。
先fetch/status，确认干净再ff到origin/main；本次交接时它在fe4ccdb2且干净。
主工作树里未跟踪的cursor-commands-wave2-audit.mjs属于原对话，不stash、不删、不提交。

已完成A1/A2/D1/E2；A3已拆时钟/输入、资源预检、ActiveScene/WorldCamera。
最新A3实现2dc5d1d5/收口fe4ccdb2：main6260→6148；17新回归、七针、80函数对账、64序列2560步；
check8724/受保护strict8232项688文件，6052隔离功能通过。A3整体未完成，别重做这些切片。

先继续A3移动与绘制职责：当前main.ts:1202 partyMove、:1485 MotionRuntimeCoordinator与两类slot、
:3393 advanceMoves、:5019 render（开工重定位）。先核真实状态Owner/采样/同步提交/取消释放，再落窄边界；
不要仅搬大函数后继续传整个RuntimeContext，不复制已有MotionRuntimeCoordinator的状态。
保留SAVE8/content20、玩法/公式/UI/资产约定和已有错误协议；真bug与纯重构分提交。
既有save/scene/motion/AST调用链测试保留业务断言，因接线变化只作真实Owner适配，不mock核心掩盖失败。

按完整子域成批补测：定向/相邻/TC/严格业务反控+必要隔离功能验证；整批一次，不逐小例跑覆盖率。
不占6010，不读写正常存档，不改生成资产。当前有Cursor commands-wave2及GLM content-guards-wave2在独立分支，
不要改其白名单或接管审查。不要在共享main/coverage上跑全仓check/ratchet/strict，也不要自行合main；
批次提交推送自己的分支，给原接收对话明确候选SHA/基点/范围/验证/未证项，由其统一质量门与集成。

完成A3后可继续B1/B2/B3/C1/D2/E1/F1的不重叠实施，先在主卡自己的交接块登记边界与验收方式；
F2已由原接收对话完成，不重做。不要把局部完成冒称整个治理done，不等其它AI签字，不每小步问是否继续。
遇到新产品取舍或关键前提未知才停下找用户裁决；否则持续推进并保存可恢复的提交与交接记录。
```
