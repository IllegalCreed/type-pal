# SCRIPT-GOV-1 剧本共性问题族治理

Status: build
Phase: phase2
Capability: W7 / P3
Coding Owner: 分包独占，见下文
Reviewer: Codex Root
Generation Owner: N/A
Visual Verification Owner: Codex
Visual Verification Timing: e2e-deferred
Branch: codex/script-governance

## 用户目标与本批范围

用户要求共性问题批量治理，而不是随E2E逐NPC救火；作者模型统一方案→步骤→指令，
不保留并列的“连续流程/高级状态”作为长期作者界面。当前开始首批治理，不推进006。
母依据：[001–005共性回顾](../../testing/e2e-001-005-common-issues.md)。

首批先建立全量问题族清单，并修复源映射可靠的动态入口后继缺失、重复奖励；
同时给165个复杂flow分类，核可以用现有步骤/指令折叠的机械链，不把状态数量直接当bug数量。
保护已验001–005场景s000–s005、既有存档原字节和用户6012；不恢复全量转换核，不全局替换wait，
不把循环次数上限当时间，不为过门改规则或手工改checkpoint digest。

## 前提真值门

| 维度 | 当前已核证据 |
| --- | --- |
| 原版输入 | 本机all.json L2018给药后advance，L3383两段交谈后reset，L5076多帧auto续跑；0x24/25为动态安装边。原始提取只读。 |
| 第一阶段 | event-system.ts:1276–1288保留advance/reset游标，:1342–1348 auto按tick等待；场景探索100ms，goto.frameDelay为计数不是时间。 |
| 二阶段当前 | s010/e191/legacy-001仅给物品107且复读；s008/e180/legacy-001仅前段；s020/e343/auto/legacy-001仅frame3后完成。SCRIPT-GOV首批需逐绑定再核。 |
| 历史转换根因 | Git63aafb81c translate-events.ts:354–430动态注册只存首段body，:1956安装入口走该路径；缓存key不含refKind，旧573/111不是全量安装边分母。 |
| 用户目标 | 原有剧情和副作用正确，表达用普通步骤及指令；同类一次治理有可追溯的已修/无问题/待核清单，不引入原版怪癖调度。 |

最强反例：后继正文在另一个NPC里存在，实际被安装方案仍重复首段；只凭相似台词/legacy编号无法证明映射。
必须核caller→真实owner/channel→target→当前selection→下一次cursor；有多义或作者已改写时保留unknown。
先排除runtime语义/原版理解/提取地址/审计模型四类替代根因，不能因大批命中直接写盘。

## 分包与推进门

- Census Owner：独占新增`scripts/script-governance/**`及`docs/testing/script-governance/`专属机器台账。
  draft允许只读普查工具和其反控；没有工程写盘、转换或发布入口。不能靠恢复执行旧转换核补映射。
- Motion reviewer：只读分类现有machine与外部handoff，直接核compiler/runner节拍；先交可批量转换类别和反例，
  不改schema、runtime、JSON或编辑器。候选分类不是删除165机器的build授权。
- Content Owner：待Root核定首批精确白名单、旧子树hash、每个后继及名称后再build，不先修改作者工程。
- Root：任务卡/看板/回执，独立核mapping与修复、静态零诊断和必要整批验证、一次冻结后统一处理checkpoint。

## 上下文与验收

- [CLAUDE](../../../CLAUDE.md)、[二阶段纪律](../../phase2/READ-FIRST.md)、[工作流](../agent-workflow.md)。
- [作者步骤治理](SCRIPT-AUTHOR-2-readable-inn-choreography.md)、[005收据](../../testing/e2e-005.md)。
- `pal-errand-author.test.ts`使用真实compiler/runner验证连续激活，不能用手写解释器模拟新语义。
- census反控：缓存去重漏调用边、self/0清绑定、多owner、相似对白错误匹配、作者修改、未知指令等须拒绝假确定。
- 内容修复：连续激活/一次性奖励/循环复读/完成/取消与合法存读，原正文和非白名单字段保全。
- 机械链：核有效可达图、外部state引用、transition cadence、动作/姿态/速度、终止/循环等，再决定普通步骤表达。
- 修复按整批冻结，集中登记代表E2E入口与预期，不逐站启动浏览器；本轮不录视频、不停6012。

## 当前状态

2026-10-02：用户批准开始治理。首批处于draft取证，产品build未开放；审计脚本只读输出候选，不冒充全量已修。

### 首批精确准入

Root与successor贡献者分别核原L2018/2024→2025、L3383/3386→3387→reset3383，
原0x74为非满HP跳转（game event-system.ts:4309）。**Content build allowed**：
Owner script_successor_repair独占s008/e180/trigger/legacy-001、s010/e191/trigger/legacy-001，
locale仅新增缺少的dlg.719与dlg.1245，以及新增pal-script-successor-governance.test.ts。
洪大夫初次给药后，后续须分伤者治疗/康健购药，治疗不得继续落入商店；老王两个步骤往复，不能只补一次尾句。
旧behavior哈希分别8a6166eae128b309f985f5d2600ffab4fd6666eeb2a35872ec7d24ba7344fe6d、
0ac7b72a839bc82ec54e9af3e434af3220d6ab4e23cb6318ea209e7211f6ef7c。
同文件default/legacy-003有已读出的治疗分支fallthrough风险，另补源绑定/反控后核准，不先越界。

Motion独立全量分类165=88 perCommand+77 transition；机械flatten不能改变auto每命令100ms与transition同拍语义。
Root已读真实runStateMachine确认interactive continue不提交中间存档游标，尾restart是下次激活回初始。
6个无外部handoff端点、全部节点构成continue链且尾restart的interactive方案获**结构批次build allowed**：
s231/onEnter/default、s249/e4394、s250/e4411、s257/e4550、s277/e4736、s285/e4807（后五均trigger/default）。
Owner script_motion_audit独占这6个scene JSON与新增pal-linear-script-governance.test.ts；
沿真实边顺序拼正文、保留唯一初始entry、保留初始ID、一步省略next以重复。其他字段和命令逐项不变。
须补真实compiler/runner及ProjectRuntime的分支/连续激活/切场取消/中断/自切绑定反控；不能仅凭叶trace相同收口。
其他159机器、schema/runtime/editor、本轮保护场景暂不开放写入。两内容Owner按文件不交叉，locale只归successor Owner。

## 下一位 Agent 提示词

已在当前任务内部委派，无需用户转发。贡献者只在白名单内交证据；Root核前提后分批开放build，不能自行标done。
