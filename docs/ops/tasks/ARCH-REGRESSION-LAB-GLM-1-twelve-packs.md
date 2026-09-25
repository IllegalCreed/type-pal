# ARCH-REGRESSION-LAB-GLM-1 — 十二组可执行回归与功能视觉准备

Status: draft
Phase: ops
Capability: 架构治理B1/B2/B3/D1/E1/E2回归准备；不改变能力格
Coding Owner: Codex（正式接入及产品实现）
Contribution Owner: GLM（隔离候选测试、诊断与功能视觉取证）
Reviewer: Codex
Generation Owner: N/A（不生成生产美术）
Visual Verification Owner: GLM初验 / Codex独立接收
Visual Verification Timing: dev-functional
Unavailable Agents: Kimi（本架构队列用户豁免）
Branch: codex/glm-architecture-regression-lab-r1

Revision: r1
Production freeze: 86e928b5

## 目标和授权边界

用户2026-09-25在上一包接收后要求“再给glm大量任务”。本卡授权GLM连续执行
**8组可执行候选回归+4组功能视觉准备**，产物在独立实验目录，不进入正式测试集。
这是draft阶段可立即开展的回归准备，不是产品build或正式覆盖率准入；不借用户请求豁免新产品决策。
生产重构及正式测试接入仍由Codex负责，GLM不是其贡献的独立第三方证明。

完整范围、去重入口、文件白名单、执行和交付合同见[十二组工作包](../../testing/glm-architecture-regression-lab/README.md)。
上一包ARCH-SUPPORT-GLM-1已经接收accept，材料以b84c16be文档合并进入main供引用；原卡仍draft、未标done。
Codex保留A3的main/场景/移动/绘制主线，GLM不修改或替其审签。

## 前提与上下文

- AGENTS/CLAUDE/READ-FIRST及[十三批架构队列](../audits/architecture-debt.md)。
- [上一包的最终接收席位](ARCH-SUPPORT-GLM-1-eight-audit-packages.md)与工作包里的精确源码/旧测试目录。
- 准备前提：现有模块已有真实调用者和可执行测试入口；本包列的是需核对的验证轴，**不预断每轴均缺测或有bug**。
  例如MapMode取消实现已存在；derivedStore.start返回stop；同名测试/截图存在不等于完整合同已证。
- 当前官方fast8034项/641生产文件仅作冻结背景，不由GLM重算或写基线；实验候选不计入该数字。
- 原版/第一阶段机制变化、schema/save/迁移发布/新UI一律不在本卡授权内。G07只验证既有公开跨模块合同，
  一阶段机制冲突回一手来源核定；G08只调用内存转换，不运行迁移写盘。
- 最强替代解释：已有用例已足以证明某轴，或所谓失败来自非法fixture/宿主模型/资源未就绪。
  若成立则记existing-proof或invalid-fixture，不为满足任务数量重复补例、编新规则或改产品。

## 推进签字与状态门

- Codex：2026-09-25准许本工作包定义的**draft候选实验/取证**；已核目标与A3互斥，静态事实和已有证据分栏。
- GLM：接手后在自己results中记录实际读过的合同、复用的既有证据、构造正控及执行结果，不代写Codex判断。
- Kimi：本架构队列用户豁免，无转交。
- build准入：**not opened**。白名单外的产品/正式测试/配置/基线不能改；候选转正由Codex独立接收后按对应实施卡核准。
- done准入：未开放，本次不预签成果、不提前done。准备材料accept不等于产品修复或覆盖目标达成。

## 交接日志

- 2026-09-25 Codex：在main86e928b5产品树上规划；已接收旧八包文档合入不改产品。
  新工作按G01→G08、V01→V04连续执行，单组阻塞隔离后可继续其它组；不逐组等待我签收。
  只在整包末交付统一机账，数字由运行结果生成；不设测试/bug数量指标。

## 下一位Agent提示词

```text
接手ARCH-REGRESSION-LAB-GLM-1，先读AGENTS/CLAUDE/READ-FIRST、本卡和
docs/testing/glm-architecture-regression-lab/README.md。
从Codex本次交付的主线文档提交创建独立worktree /Users/zhangxu/illegal/type-pal-glm-regression-lab、
分支codex/glm-architecture-regression-lab-r1；生产冻结86e928b5，不在main目录切分支。
立即执行draft实验目录内的8组候选回归与4组功能视觉准备，按工作包顺序连续做完，单组阻塞不拖住其它组。
唯一写入白名单docs/testing/glm-architecture-regression-lab/**；不改packages/scripts、正式测试、
配置/锁文件/基线/任务卡/共享看板。使用真实生产入口与合法fixture，先去重，再补有业务断言的候选测试。
每组完成一提交；原用例和历史探针不改。实际产品缺陷保留显式失败复现，不偷偷改预期变绿、不顺手修产品。
不跑全仓check/官方coverage或迁移写盘；正式测试接入、统一门禁与统计归Codex。
视觉只用独立6013/6053、自有合法沙盒/临时数据，不动6010/6051及用户项目/存档。
测试名/计数/hash从最终树与运行JSON生成；证据kind和结论分开，不把静态/收集/实际执行混成covered。
完成十二组后统一push，交短摘要+results.json+可重建命令，不标done、不代签、不转Kimi。
```
