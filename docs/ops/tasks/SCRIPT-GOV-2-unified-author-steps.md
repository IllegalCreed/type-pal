# SCRIPT-GOV-2 统一作者步骤模型

Status: draft
Phase: phase2
Capability: W7 / P3
Coding Owner: 待核定分包；draft仅只读取证
Reviewer: Codex Root
Visual Verification Owner: Codex
Visual Verification Timing: functional-minimal-and-story-e2e
Branch: codex/unified-script-steps

## 用户目标和范围

用户要求继续治理。承接[SCRIPT-GOV-1](SCRIPT-GOV-1-script-family-governance.md)首批，
作者模型统一为方案、步骤、指令，剩余147套机器不是长期保留项。本卡优先处理所需公共表达，
同时逐类证明当前内容可以清楚表达；不能只把state改名为step，不能继续暴露逐拍调度状态。

主树基线1b3bffb79。6012持续运行，.zcodeignore是用户文件，禁止修改；原始存档与既有回执保留。
候选在隔离树验证，不先更新主工程，不录视频。原版完整脚本转换器不恢复。

## 前提真值门

| 维度 | 当前证据与需核问题 |
| --- | --- |
| 原版输入 | all.json为只读剧情参考；各内容族须核控制流、动作与显式帧停顿，不为清理状态数假定全等。上一批全部绑定/hash见治理台账。 |
| 第一阶段 | knowledge-harvest E6、E7、N2、X3、X7：真实auto调用域、同帧交接、时间状态收尾必须实证；不复刻对话冻结NPC等隐含耦合。 |
| 当前二阶段 | script-compiler-core.ts:166–171给auto每个命令追加100ms；:308起区分机器transition节拍。script-runner-core.ts:256–406有两套游标/执行形态，:589起条件loop的maxIterations是保护，不是正常次数。 |
| 目标 | 普通步骤包含连续动作、条件、选择与等待；下次步骤变化显式且可读；消除作者机器结构，内部续跑游标不变成作者概念。 |

目前详细切换方案尚未准入。必须先核所有147机器、32个handoff端点，以及其它普通auto/共享调用受时序变化的影响。
最强反例：把已含等待的普通auto按新无隐含拍运行会变速；只从initial看图会遗漏handoff入口；
将stopScript抽到共享调用会改变退出作用域；改变条件求值次数会改变chance剧情和随机巡逻。
若方案只能通过新建私有全局变量模拟旧指针、将旧状态一对一变成步骤、或引入常驻旧兼容层成立，则拒绝。

## draft分工和准入

- Core reviewer：核最小步骤内结束/条件后继、对称确认、固定次数循环、执行与取消/保存作用域，给公共接口建议和反例。只读。
- Content reviewer：按147机器与外部交接族核可结构化程度、必要动作能力及现有普通auto节拍影响；交真实例子与阻塞项。只读。
- Editor reviewer：核编辑、预览、引用、验证、保存格式及版本切换影响面；不得通过隐藏UI保留旧作者模型。只读。
- Root：独立读一手锚点、核产品取舍、确定单一文件Owner及实现顺序，维护卡/看板，执行质量门与整体验收。

任何产品写入须先另记精确build allowed与边界。schema/runtime/editor/当前内容必须在同一canonical候选中完成切换，
删除旧作者类型/旧入口/旧版本分支/专属兼容夹具；不能把未完成的双模型作为交付。不可逆或新的产品取舍交用户。

## 上下文与验收要求

- [二阶段铁律](../../phase2/READ-FIRST.md)、[协作协议](../../../AGENTS.md)、[工作流](../agent-workflow.md)。
- [统一步骤后续方案](../../testing/script-governance/unified-steps-plan.md)、[机器全量分类](../../testing/script-governance/machine-census.json)。
- [当前检查点](../../testing/script-governance/current-checkpoints.md)与[SAVE10作者组织修复](SCRIPT-AUTHOR-2-readable-inn-choreography.md)。
- 编排保持目标点与速度优先，不将每次转弯拆成跨激活步骤，不为此次任务引入parallel/join。
- 实际compiler/runner/ProjectRuntime覆盖条件与确认分支、循环、取消、自切绑定、共享返回和后台保存恢复。
- 内容与时序反例须核完整动作/等待/条件求值偏序，不只核末位置；保护001至005已验观感。
- 全仓lint、格式、typecheck零error/warning/info，不放宽规则。界面沿用既有步骤列表与指令树，最小真实浏览器核验。
- 候选整批冻结后再决定需要重建哪些真实前驱，不改档、不手改digest、不逐小改反复重播。

## 下一位Agent提示词

本轮内部委派只读取证，无需用户转发。draft尚不允许产品实现或标记done。
