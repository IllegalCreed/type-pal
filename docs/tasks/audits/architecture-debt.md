# 全仓架构债与分批治理

Status: open
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-11-02
Template: audit-report-v1 / 1.0.0

## 审计问题

本页回答2026-09-24至09-26那轮架构拆分做了什么、哪些观察没有随之关闭，以及今天从哪里继续。原13批已按当时任务收口；`open`指本页保留的审计边界与后继核查，并非重开13批或批准再拆代码。新的逐文件代码治理回[代码质量路线](code-quality-governance.md)与[逐文件账本](code-quality-file-ledger.md)，具体授权回当前任务卡。

## 范围与证据

固定原稿为 `516872a827ed0f6321aa18162aa8a522edbab3c4`，原盘点基点为 `09429b6c`（2026-09-24），并行所有权更新至2026-09-26。下表只归纳原稿及[连续收口卡](../archive/done/ARCH-CONTINUATION-1-remaining-queue.md)已记载的历史范围；行数、源码位置和检查数字都属于当时，未在本次重跑。

原静态盘点对630个src TS/TSX文件解析运行时import/export，排除type-only及测试/fixture/declaration/generated；“未发现静态跨包环或editor/core→ui反向边”不涵盖动态import、回调互引或所有exports变体。第一阶段原7文件SCC是依赖现象，不能说成7个已证bug。

## 发现

| ID | 原队列与历史结果 | 所有权/验证边界 | 后继入口 |
|---|---|---|---|
| ARCH-A1 | 菜单/物品宿主原15状态迁出，main7153→6798 | MenuSession与ItemUseSession拥有控制态；不是给完整RuntimeContext换路径 | [菜单宿主卡](../archive/done/ARCH-REFORGE-MENU-1-session-controller.md)、[域报告](../../testing/domains/runtime/menu/menu-session/report.md) |
| ARCH-A2 | 战斗宿主46287966，main6798→6486 | 准备、会话、结算与战后脚本分工；两处await时序补正按原回执，不由测试数推原子性 | [战斗宿主卡](../archive/done/ARCH-REFORGE-BATTLE-1-host-lifecycle.md)、[域报告](../../testing/domains/runtime/battle/battle-host/report.md) |
| ARCH-A3 | 世界/帧循环分段，main6486→6427→6260→6148→5698 | 时钟输入、资源预检、镜头与移动/绘制各有Owner，业务协调仍在宿主 | [时钟输入](../archive/done/ARCH-REFORGE-FRAME-1-clock-and-input.md)、[预检](../../testing/archive/legacy/content/authoring-and-runtime/scene-preparation-refactor.md)、[场景](../../testing/domains/runtime/scene/active-scene/report.md)、[世界](../../testing/domains/runtime/world/world-runtime/report.md) |
| ARCH-B1 | 编辑器App会话四hook，5170→4688 | 导航、场景、试玩、工程生命周期分开，不复制guard/history | [会话报告](../../testing/archive/legacy/editor/editor-workflows/editor-app-sessions-refactor.md) |
| ARCH-B2 | 地图四类session，3819→3734 | 保留selection reducer；宿主处理坐标、权限、plan/command与同步提交 | [工作区报告](../../testing/domains/editor/map/map-workspace-sessions/report.md) |
| ARCH-B3 | 脚本/内容表单分四命令族 | 共享控件和作者桥合同独立，不能把完整宿主context传遍叶子 | [连续收口卡](../archive/done/ARCH-CONTINUATION-1-remaining-queue.md) |
| ARCH-C1 | BattleSession拆readiness/命令/演出/结算四Owner | tick保留业务协调顺序，不能据行数减少证明行为等价 | [连续收口卡](../archive/done/ARCH-CONTINUATION-1-remaining-queue.md) |
| ARCH-D1 | d488f72e下沉脚本目录/背包/毒/装备/地图/菜单栈，原7文件静态SCC清零 | 原161函数体与旧出口的保全是当时范围；机制真值仍按第一阶段来源 | [依赖所有权报告](../../testing/domains/phase1-runtime/dependencies/dependency-ownership/report.md) |
| ARCH-D2 | 第一阶段event/battle/bootstrap分域 | 角色opcode、战斗资源/终态/成长/结算、启动资源各自承担状态；原公共入口保留 | [连续收口卡](../archive/done/ARCH-CONTINUATION-1-remaining-queue.md) |
| ARCH-E1 | 移动族翻译与场景源规划迁出 | 纯内存规划与最终IO编排分工；不授权手改迁移生成物 | [连续收口卡](../archive/done/ARCH-CONTINUATION-1-remaining-queue.md) |
| ARCH-E2 | 4cdefcf1拆协议/形状/AI/演出 | ebef3d5a嵌套cue漏options是另行bug修复，不把“有环”直接判bug | [校验报告](../../testing/archive/legacy/content/authoring-and-runtime/content-validation-refactor.md) |
| ARCH-F1 | 93b7211b拆AST事实/静态流、CSS推导、规则与IO | facade仍保留route/adoption编排；不是所有工具语义已审完 | [审计工具报告](../../testing/archive/legacy/editor/editor-workflows/design-system-audit-layering-refactor.md) |
| ARCH-F2 | 组织整理commands179/controls35的barrel | 九组90声明、119出口/62绑定及2022acc3属于历史验收，纯搬移不产生coverage增长 | [首包卡](../archive/done/ARCH-F2-CURSOR-BATCH-1-domain-modules.md)、[九组卡](../archive/done/ARCH-F2-CURSOR-BATCH-2-remaining-commands.md)、[原验收](../../testing/archive/legacy/editor/editor-workflows/cursor-commands-wave2-integration.md) |
| ARCH-OPEN-1 | 原稿观察demo map-056仍为version2、当时guard仅支持4 | 尚未归因为迁移器缺陷；本次没核今天数据/生成链，不能继续写成当前必现故障或认定已修 | [任务索引](../cards/index.md)、[当前供应规则](../../phase2/READ-FIRST.md) |
| ARCH-OPEN-2 | 原稿记录 `?scene=s135` 黑区落点 | 当时未对正常门/脚本入口；不得扩大成所有默认落点故障，也不能用菜单验证关闭 | [E2E合同](../../testing/e2e/contract.md)、[当前任务索引](../cards/index.md) |

## 结论

原稿记录13/13队列与F2委派范围收口，[统一回执](../../testing/archive/legacy/ops/testing-records/architecture-continuation-integration.md)的check9573、strict9081/728及三端build属于2026-09-26的有限执行；同一原件保留62 warnings/6 infos和build大chunk提示，历史exit0不符合今天零诊断门。分项109针是沿用，未在那轮集成再次执行。它们不能证明今日全仓无债、所有合法输入/取消/副作用等价、E2E/视觉/coverage通过。2026-10-24文档治理未重读13批全部源码或重跑这些门；当时全文核本页、固定原稿与统一集成回执，连续收口卡按目标/验收/历史边界及相关段落核读。上述是原复核范围，本次仅精简阅读路径，不续验旧产品或执行。

两个独立观察按原时点保留为“后继解决情况未在本轮核实”；不凭旧名自动新建卡、恢复build或替用户裁决版本。今日进度只取原任务及代码账本的真实consumer，不复制旧13/13当全仓完成率。

## 整改与复核

新批先回[现行工作流](../../engineering/guides/agent-workflow.md)核唯一Owner、合法输入、真实caller/oracle、同步提交和取消/释放入口。拆模块与修行为缺陷分开；原全队列授权、旧Owner表、三贤人豁免及strict执行安排只属于历史，不能覆盖今天任务准入。

涉及第一阶段机制先核原数据/参考与实际调用，Reforge按[当前阶段规则](../../phase2/READ-FIRST.md)核架构和内容维护权。新的await须检查可变world采样与释放/写回是否跨微任务；仅“准备产物”不等于已提交快照。需重新执行的产品或覆盖门由对应任务授权，本轮只治理正文。

### 原文保全

原日期、完整13批表、数字、旧Owner/命令与两项独立待办均可从[固定Git原件](https://github.com/IllegalCreed/type-pal/blob/159cd0e2f8753536800ba4635e896020a897fddc/docs/ops/audits/architecture-debt.md)恢复；其中原稿revision `516872a827ed0f6321aa18162aa8a522edbab3c4`、SHA `f6f1367262370db06b22ba1dbf0202754e29ff264a14564ba73fe1c3b692f478`与quote解码说明保持原样。本页保留上方具体发现和未核边界，移出默认阅读的仅是原全文副本，不把旧日期或“当前”续期。

### 并行所有权（2026-09-26 更新）

此标题只承接历史入链。原Codex/GLM/Grok/Cursor分工与释放记录见固定原件同名节，不能作为今天build授权；当前单一Owner和范围按[现行工作流](../../engineering/guides/agent-workflow.md)及任务卡重新核定。
