# ARCH-CONTINUATION-1 — 剩余架构治理连续收口

Status: build
Phase: cross-phase architecture
Coding / Integration Owner: Codex
Base: `0cb32631`
Visual Verification Timing: dev-functional；剧情E2E另排

## 目标与授权

2026-09-26用户要求“剩余架构治理一口气做完”，随后要求给Cursor大量并行工作。
Codex持续处理[治理台账](../audits/architecture-debt.md)剩余边界，Cursor按[24组F2卡](ARCH-F2-CURSOR-BATCH-1-domain-modules.md)
实施互斥的中低风险切片。既有GLM实验分支只补候选/视觉证据，未经接收不改主线产品。
不再因每个小批结束请求“继续”；真实用户产品裁决仍须提出，任何未完成项不虚报done。

## 完成准绳与顺序

| 队列 | 完成条件 | 当前 |
|---|---|---|
| E2 | 作者/敌人校验运行期环消除；共享形状/校验选项明确；七类递归路径与错误位置保真；已证嵌套cue漏检另提交修复 | 实现完成，与D1统一门禁 |
| D1 | 第一阶段七节点SCC按真实状态/查询/脚本桥消环；旧入口/数值/坐标/推进序保持 | 实现/定向通过，统一门禁中 |
| A3 | 活动场景、移动与绘制状态各有所有者；main保留装配/协调；取消、切场同步提交和采样时点保真 | 待续段 |
| B1 | App工程生命周期、导航与场景工作区分离；历史/保存/离开/试玩既有门禁仍通过 | 待实施 |
| B2 | MapMode手势、选择/剪贴板、组合操作和视图分别有明确边界；取消、权限和原子提交保真 | 待实施 |
| B3 | 命令族表单拆出独立实现；作者桥接类型清晰；现行能力/引用保护不丢失 | 待实施 |
| C1 | BattleSession输入、动作/演出、资源屏障、结算呈现的状态归属拆清；公开tick业务序列保真 | 待实施 |
| D2 | 一阶段opcode族、战斗主控、启动资源生命周期分开，真实机制/数据回归通过 | 待实施 |
| E1 | 迁移场景映射与脚本转换阶段独立、纯内存入口可测；输出/幂等/写保护保真 | 待实施 |
| F1 | design-system audit 的AST事实、CSS推导、规则、报告分层；现有违规/反例与性能门不弱化 | 待实施 |
| F2 | Cursor24组接收后核剩余actor/entity/map/资源命令边界，controls成为稳定组合出口；不以文件数冒称完成 | Cursor并行 / Codex接收 |

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

- D1六个下层所有者已落：[实现与验证](../../testing/phase1-dependency-refactor.md)。只读工具证实原七节点运行期SCC→无SCC、旧出口不变、161函数体保真（32搬移，仅两处同步状态路由变更）；8新增所有权回归、4既有跨模块、554相邻及类型检查通过。与E2一起执行完整门禁；不混入r11复核分支的GLM拟接入测试，后者仍按交接约束独立保留。
- E2结构候选`4cdefcf1`已分离校验协议/形状/AI条件/演出；旧入口52/19出口一致，content运行期二节点环消除。前轮包括GLM四项副本的门禁只能作为独立候选证据，本次按实际E2+D1树重新统一执行，不挪用其测试总数。

- E2缺陷修复先行：新增正式`author-battle-dialogue-boundary.test.ts`13项，原实现9项AssertionError红/4项合法与runtime对照绿；`:712`显式透传options后13/13、content全包863/863与typecheck通过。覆盖直接及七递归臂的精确错误路径、三种合法作者identity、实际cue/路径透传、runtime方言保留；结构解环随后另提交，整批质量门统一执行。

Codex：**premise verified / build allowed**，用户全队列授权下按上表顺序连续开工，单批一主要边界；
Cursor独占其白名单，Codex不同时编辑commands.ts/controls.tsx的委派区。尚无done准入。
无下一位Agent提示词（Codex持续实施；Cursor提示词在其卡）。
