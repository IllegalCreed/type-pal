# ARCH-SUPPORT-GLM-1 — 八组并行准备取证

Status: draft
Phase: ops
Capability: 架构治理只读准备，不开产品实现门
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex
Visual Verification Owner: GLM（明确委派初审，Codex接收复核）
Visual Verification Timing: dev-functional
Unavailable Agents: Kimi（本队列用户豁免）
Branch: codex/glm-architecture-support-r1

## 授权与目标

用户2026-09-25告知GLM已有视觉能力，要求多分配并行任务。
本卡只在draft阶段采集架构/回归/功能视觉证据，**不授权改产品或正式测试**；
Codex继续A3生产实现，GLM作为准备材料贡献者，不作为自证的独立第三方。
完整工作包：[八组范围/白名单/纪律/交付](../../testing/glm-architecture-support/README.md)。

## 前提与上下文

- 根协议/CLAUDE/READ-FIRST、[架构队列](../audits/architecture-debt.md)。
- 生产冻结b11d4bc9，当前fast7972/637；本卡不要求重算覆盖率。
- App5170/MapMode3819/ScriptEditor4361/CommandForm2098/BattleSession3022/event-system5784/migrate-content3314，
  为本轮只读wc实测；规模仅作定位，不作为缺陷证明。
- 2026-09-12旧视觉限制已由用户本次新裁决更新；新能力先交实际小样，不追溯改写历史签字。
- 任务只取证，无玩法/格式/原版机制变化；第一阶段分析须读其工程经验/机制资料，不能复述二阶段规则。

## 责任与阶段门

- Codex：已核任务互斥范围，授权GLM执行工作包定义的draft准备；接收/后续修复准入/统一统计归Codex。
- GLM：只编辑自己目录；报告自身实测、风险与建议，不写他席结论、不改共享看板/卡状态、不标done。
- Kimi：用户全架构队列豁免，不安排交接。
- build准入：not opened。本包不进入生产build，后续实施另按对应架构/修复卡准入。
- done准入：blocked，待实际交付与Codex复核；用户豁免两席不等于证据自动通过。

## 交接日志

- 2026-09-25 Codex：按用户新增并行请求落8包，冻结b11d4bc9，白名单只在专属文档/诊断目录；
  A3当前生产工作不交叉，视觉初审允许GLM，最终由Codex核验。Next: GLM draft取证。

## 下一位Agent提示词

```text
在 /Users/zhangxu/illegal/type-pal 接手 ARCH-SUPPORT-GLM-1 的八包只读准备取证。
先同步并读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、
docs/ops/tasks/ARCH-SUPPORT-GLM-1-eight-audit-packages.md 与
docs/testing/glm-architecture-support/README.md，严格按工作包八组连续执行。
用户已确认你具备视觉能力，允许本包实际浏览器/截图/交互初审；先完成一个完整视觉小样证明工具通路，
再做P1～P6、V1～V2。无法实际看图时如实blocked，先完成非视觉组。
生产冻结b11d4bc9；从包含工作包的提交开独立分支codex/glm-architecture-support-r1和独立worktree，
不得在main目录切分支，不改Codex的A3实现或现有测试。只写专属文档/机账/只读probe目录，
不得改产品/配置/基线/共享看板/任务状态，不跑全仓check/ratchet/strict，不跑迁移写盘或完整剧情E2E。
每组报告精确源码/真实caller/已有测试去重/可复现证据；视觉给截图与操作链，遵循现行设计规范和已披露边界。
每组一提交，八组做完统一push交Codex。最终给总报告、机账小计、起点与最终SHA、复算命令及未证风险。
GLM为贡献者，不自充独立第三方，不代签、不标done、不转Kimi；产品实现门未开放。
```
