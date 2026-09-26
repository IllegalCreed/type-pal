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
| B1 | App工程生命周期、导航与场景工作区分离；历史/保存/离开/试玩既有门禁仍通过 | 待实施 |
| B2 | MapMode手势、选择/剪贴板、组合操作和视图分别有明确边界；取消、权限和原子提交保真 | 待实施 |
| B3 | 命令族表单拆出独立实现；作者桥接类型清晰；现行能力/引用保护不丢失 | 待实施 |
| C1 | BattleSession输入、动作/演出、资源屏障、结算呈现的状态归属拆清；公开tick业务序列保真 | 待实施 |
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

- 2026-09-26 A3活动场景/镜头实现2dc5d1d5已accept：[回执](../../testing/active-scene-refactor.md)。17新增、80宿主函数对账、64序列2560步与七针通过；check8724/保护51048353的单次strict8232/688、6052隔离功能核验全部完成。main6260→6148，A3整体仍build，接续移动/绘制。Cursor接[九组剩余命令](../archive/tasks/done/ARCH-F2-CURSOR-BATCH-2-remaining-commands.md)，GLM接[六组守卫测试](TEST-GLM-CONTENT-GUARDS-2-leaf-boundaries.md)，互不写同一生产面。

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
