# SCRIPT-GOV-3 剩余问题族治理与开场回归

Status: draft
Phase: phase2
Capability: W7 / P3 / Q1
Coding Owner: 待核前提后按文件域分配
Reviewer: Codex Root
Visual Verification Owner: Codex
Visual Verification Timing: mixed
Branch: codex/script-governance-closeout

## 持续目标与完成标准

用户2026-10-03要求持续完成脚本共性治理，然后回归001–005，具备开始006的条件后交付；遇到需要用户决定的取舍即停止。
本卡承接[SCRIPT-GOV-1](SCRIPT-GOV-1-script-family-governance.md)，统一步骤模型已由[SCRIPT-GOV-2](../archive/tasks/done/SCRIPT-GOV-2-unified-author-steps.md)完成，基线8efe04861。
不开始006，不把所有未来剧情的逐段验收伪装为本轮已完成。收口范围是已登记的七类共性问题及本轮同族全量核查，
每个待核项必须有已修、已核无问题或明确后期视觉入口的证据；无法核定且影响当前修复的关键前提不能留给猜测。

6012继续运行，不关闭用户页面，不录视频、不修改旧档；主树.zcodeignore是用户文件。
候选在隔离工作树验证，整个批次冻结后统一重建必要前驱。用户已授权验证后更新主工程，若主树新出现作者修改先检查归属。

## 当前直接线索

Root在当前canonical内容重跑只读安装边普查：639原指令，580安装、53清绑定、6无操作；554唯一非零绑定。
指纹映射155、作者保护120、多上下文11、unknown294是扫描能力与归属口径，不能直接换算为缺陷数。
当前9条风险边对应8个绑定：

- s020/e343/auto/legacy-001（5076），s016/e217/auto/legacy-001（5214）。
- s021/e403/trigger/legacy-001（5818），s131/e2293/trigger/legacy-001（17546），
  s134/e2319/trigger/legacy-001（17573），s100/e1824/trigger/legacy-001（17632）。
- s126/e2219/auto/legacy-001（19629，两条caller）和legacy-002（19641）。

它们仍是候选而非已确认缺陷。原初扫29边/28绑定、前18后继及已核交接反例均保留历史，不能覆盖旧台账。
还须复核已登记淡出收尾、普通等待/帧序列时间单位、auto中剧情主链、瞬态外观跨交互用途、可靠命名，以及独立浏览器RPC挂起收尾。

## 前提真值门

| 维度 | 当前证据与待核事项 |
| --- | --- |
| 原始内容 | all.json的完整入口、advance/reset/call和安装指令只读；每个候选分别核上下文/说话人/后继/动作拍，不能只核首段指纹。 |
| 第一阶段 | event-system.ts的trigger游标和tickAutoScripts，以及knowledge-harvest E/N/X领域；原版数据不能回答的可见行为参考实际第一阶段，不复活旧结构耦合。 |
| 当前二阶段 | content22/SAVE11唯一步骤模型；run.mjs最新候选及实际caller路径/hash。保护已作者改写的001–005，机械结构已消除不代表旧漏正文自动补齐。 |
| 目标 | 完整且合理的作者步骤/正文/显式方案切换；副作用和后继正确，公共运行器/工具问题在公共层修复，以真实执行和全族回执闭环。 |

最强替代解释：指纹变了但已作者改写；已有后继通过别的方案切换；auto逐拍advance被误读为跨次交互；
源有未证明caller并非可触发，或当前模型/测试把正确演出误报。任何一项被证实时不得自动补内容。
Root在逐问题族前提核定前不授权产品实现；unknown时继续读源和调用域，确需产品判断则提交用户裁决。

## 只读分工

- Dynamic reviewer：四个trigger候选的源caller/owner/后继和说话人，及全639边分类覆盖中的未证/多上下文风险；只读，给可证伪结论。
- Motion reviewer：四个auto绑定及当前帧/等待族，直接核第一阶段调度和源序列，给完整动作/明确时间的步骤编排建议；只读。
- Family reviewer：已登记的分支副作用/淡出/持久外观/auto职责/时钟调用域与可靠命名，按全量当前内容统计风险，不以数量判定缺陷；只读。
- Root：独立读取关键原始证据，核准精确写入Owner/路径、维护有限闭合清单、E2E工具RPC及独立质量/浏览器验收。

本阶段没有产品写入授权，不恢复完整原版转换器，不新增状态模型/parallel/join或兼容旧格式。
所有补丁使用隔离树绝对路径。同一文件只有一位Owner；Git提交由Root串行安排。

## 验收顺序

核清清单→按族开build→真实compiler/runner/ProjectRuntime失败反控与修复→作者工程/资源重导闭包和幂等→
必要最小编辑器检查→整批冻结→001从正常新游戏开始，002–005消费真实前驱，story/物品取消站位专项/guards/保存专项分开。
所有静态error/warning/info清零，原失败与原档保留。後期代表视觉按已登记入口集中验证，不逐站重复从开头通关。
完整回归后关闭母任务，提交推送并清理临时工作树；仅在达到以上条件时完成持续目标。

## 上下文

- [二阶段铁律](../../phase2/READ-FIRST.md)、[协作工作流](../agent-workflow.md)、[一阶段知识](../../phase2/reference/phase1-knowledge-harvest.md)。
- [七类共性回顾](../../testing/e2e-001-005-common-issues.md)、[治理证据目录](../../testing/script-governance/README.md)。
- [安装边口径](../../testing/script-governance/install-census.md)、[当前检查点](../../testing/script-governance/current-checkpoints.md)。

## 下一位Agent提示词

已在本任务内进行只读取证委派，无需用户转发；不得开始产品实现或标记done。
