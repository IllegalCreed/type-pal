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
| A3 | 活动场景、移动与绘制状态各有所有者；main保留装配/协调；取消、切场同步提交和采样时点保真 | 活动场景/镜头分段完成；移动/绘制待续 |
| B1 | App工程生命周期、导航与场景工作区分离；历史/保存/离开/试玩既有门禁仍通过 | 待实施 |
| B2 | MapMode手势、选择/剪贴板、组合操作和视图分别有明确边界；取消、权限和原子提交保真 | 待实施 |
| B3 | 命令族表单拆出独立实现；作者桥接类型清晰；现行能力/引用保护不丢失 | 待实施 |
| C1 | BattleSession输入、动作/演出、资源屏障、结算呈现的状态归属拆清；公开tick业务序列保真 | 待实施 |
| D2 | 一阶段opcode族、战斗主控、启动资源生命周期分开，真实机制/数据回归通过 | 待实施 |
| E1 | 迁移场景映射与脚本转换阶段独立、纯内存入口可测；输出/幂等/写保护保真 | 待实施 |
| F1 | design-system audit 的AST事实、CSS推导、规则、报告分层；现有违规/反例与性能门不弱化 | 待实施 |
| F2 | Cursor24组接收后核剩余actor/entity/map/资源命令边界，controls成为稳定组合出口；不以文件数冒称完成 | Cursor24组完成；其余归Codex继续 |

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

- 2026-09-26 A3活动场景/镜头实现2dc5d1d5已accept：[回执](../../testing/active-scene-refactor.md)。17新增、80宿主函数对账、64序列2560步与七针通过；check8724/保护51048353的单次strict8232/688、6052隔离功能核验全部完成。main6260→6148，A3整体仍build，接续移动/绘制。Cursor接[九组剩余命令](ARCH-F2-CURSOR-BATCH-2-remaining-commands.md)，GLM接[六组守卫测试](TEST-GLM-CONTENT-GUARDS-2-leaf-boundaries.md)，互不写同一生产面。

- A3活动场景/相机段开工（基点8d851fa6，独立`codex/architecture-active-scene`）：`main.ts:389-410`的活动资源、实体基准和页动作归ActiveScene；`:440-458/:2074-2117/:3502-3515`的相机位置/偏移/pan取消归WorldCamera。直接源码核得提交序是新scene/assets/entityDefs→页动作同步cue→room/bounds→队伍落点/轨迹→音频，不能分成await或重排同步cue。reloadMap仍先造renderer/room，再commitCanonical，最后替换地图资源；其既有camera bounds不在本次暗改。准备、令牌校验、world替换与存档提交继续在原协调层。
  当前行为真值是上述生产调用链与scene/save/checkpoint回归；一阶段harvest W3/W4/W7、E3/E5、X1/X3只提供相机偏移/同帧采样风险参考，不引入旧引擎耦合。最强替代解释为“搬字段会捕获旧场景/旧玩家位置或重排同步cue”；用实际ScenePreparer产物、主壳调用链、冻结旧相机序列和取消反控排除。Codex核此前提verified、范围build allowed；无新玩法/格式/UI裁决，A3整体仍未完成。

- 2026-09-26 Cursor24组与GLM实验包已独立accept收口，统一check8707/strict8215/686，详见[Cursor](../../testing/cursor-architecture-batch-integration.md)/[GLM](../../testing/architecture-regression-lab-completion.md)。未证后续明确保留：B1核720/900横向裁切、隐藏outliner后残留separator命中/焦点区及boot首屏失败矩阵；E1核globalScriptAliases及profile/reference端到端其它组合（sceneSemanticSpriteIds已有world-sprite-layout-registry三类动态证据，按existing-proof）；原生浏览器125/150% zoom归后续环境/E2E矩阵。以上不是本批已修/已覆盖，不借准备包done关闭架构项。
- D1六个下层所有者已落：[实现与验证](../../testing/phase1-dependency-refactor.md)。只读工具证实原七节点运行期SCC→无SCC、旧出口不变、161函数体保真（32搬移，仅两处同步状态路由变更）；8新增所有权回归、4既有跨模块、554相邻及类型检查通过。与E2统一check8678/ratchet/保护8bf40b90的单次strict8186/654、三针、生产build及隔离浏览器功能验证全部通过。Codex核该两项accept收口；不混入r11复核分支的GLM拟接入测试，后者仍按交接约束独立保留。
- E2结构`4cdefcf1`已分离校验协议/形状/AI条件/演出；旧入口52/19出口一致、50函数体保真（11搬移），content运行期二节点环消除。[E2回执](../../testing/content-validation-refactor.md)与D1共享本批门禁。前轮包括GLM四项副本的门禁只作为独立候选证据，本次按实际E2+D1树重新统一执行，不挪用其测试总数。

- E2缺陷修复先行：新增正式`author-battle-dialogue-boundary.test.ts`13项，原实现9项AssertionError红/4项合法与runtime对照绿；`:712`显式透传options后13/13、content全包863/863与typecheck通过。覆盖直接及七递归臂的精确错误路径、三种合法作者identity、实际cue/路径透传、runtime方言保留；结构解环随后另提交，整批质量门统一执行。

Codex：**premise verified / build allowed**，用户全队列授权下按上表顺序连续开工，单批一主要边界；
Cursor24组已收口；第二批九组和GLM六组已另卡准入，交接提示词见各自新卡。Codex持续A3及其余高风险实现。
D1/E2已完成，整卡仍build、其余九项未done；不把分段完成计作整个A3完成。归档卡内提示词仅为历史。
