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

## Codex 二轮接收（2026-09-25，候选 `af43311a`）

- **Codex counter；仍为 draft，不开放正式转正/build/done。** [逐组独立复核](../../testing/architecture-regression-lab-codex-r2-review.md)区分窄正控与未达完整合同。9 文件 33/33 绿、启动单针 detected、六图存在且 16 位 hash 前缀匹配、清理本席临时产物后目录 Biome 通过；这些不消除业务反证。
- 最终机账实为 40 条（38 candidate-green / 1 existing-proof / 1 blocked），README/receipt 仍是旧 39 条 36/1/1/1，交付口头 39 条 37/1/2 与两者均不符；`G06-05`/`G07`/`G08` 等仍未进入标题宣称的跨模块/异常链。V04-01 已撤回产品缺陷归因，但标题、归属和人类回执未同步。
- 候选中途合主线，原 `a3ceaf05..HEAD` 白名单与 `86e928b5..HEAD` 产品冻结命令均不成立；`99f1fd08..HEAD` 才是 GLM 自身增量，仅实验目录且生产零改。候选未合 main、不计官方覆盖率；不得改写他席或标 done。

### 下一位 GLM 收窄返工提示词

```text
在 /Users/zhangxu/illegal/type-pal-glm-regression-lab 的 codex/glm-architecture-regression-lab-r1 返工 ARCH-REGRESSION-LAB-GLM-1，候选 af43311a，状态 draft。先同步分支、确认干净工作树，读任务卡本轮 Codex 接收块及 origin/main:docs/testing/architecture-regression-lab-codex-r2-review.md。只改 docs/testing/glm-architecture-regression-lab/**，不改产品/正式测试/基线或他席结论，不标 done。
先修 40 条机账与 README/receipt/交付数字不一致、原冻结命令因合入 main 失效、V04-01 旧标题/归属残留；results 保存截图完整 SHA，并让 verify 只读且实际核 Vitest JSON fullName/status/执行数。再逐组按 Codex 表处理：进不了真实跨调用/异步/视觉链的案例明确降为窄候选或待证，不用全绿标题冒充完整合同；G05/G06/G07/G08 的直接反证优先。V01-V04 不重拍已有可见事实，但未做的键盘/分隔条/失败恢复/合法媒体矩阵必须明确未证或用自有合法宿主补齐。给候选 TS/TSX 提供真实类型检查，红控临时文件放 /tmp 避免污染仓内 Biome。复跑 33 项候选、负控、全目录 Biome、文档门与新对账，提交推送精确 tip。候选只供 Codex 独立接收，不合 main、不计官方覆盖率。Kimi 本队列豁免，无下一位 Kimi 提示词。
```

## Codex 独立接收（2026-09-25，候选 `30397b1d`；历史）

结论：**counter，十二组均未按完整申报合同转正；任务仍为 `draft`。** 逐组反证、可保留的窄正控和 V04-01 独立浏览器复核见[本人报告](../../testing/architecture-regression-lab-codex-review.md)。本席没有改 GLM 的 README/receipt/results 语义，没有合候选、改产品或计官方覆盖率。

- G01–G08：候选 32/32 确实执行，但 G01-06 `expect(true)`、G02-03 未真正换会话、G04 对话框可缺席仍绿、G05 不推进旧播放、G06/G07/G08 标称跨模块/回调/异常却直接测单函数或恒真条件等，使完整组合同不能 accept。G01/G02/G03 的局部业务正控和 V02-02 既有 PanelResizeHandle 测试引用可保留；具体每组见报告表。
- V01–V03：截图中的角色名变化/撤销及 720px 排版可见，但未覆盖各卡所列多表单键盘、分隔条矩阵和真实异步失败恢复；V03 的无效 objectId 回退不等于读取失败三态。
- V04-01：干净 asset/sprite URL 在同候选工作树的隔离 6013 实测正常；脏会话整页 goto 因 `beforeunload` 保护被浏览器 `ERR_ABORTED`，站内“资源→精灵库”在同一脏会话可进入，故“App 覆写深链回 actor”归因撤回。V04-02 真阻断是测试树缺 `sprite.pal.002` 二进制，catalog 登记 4031 字节而服务端回退读得 917；不是页面不可达。
- 机械范围 `PASS`、39 行账 36/1/1/1、启动单针 detected 可采信为材料事实；全目录 Biome **23 errors**，`configs/project-configs.mjs:1` 仍为 SyntaxError 占位，候选无独立类型检查；`verify.mjs` 未核 JSON fullName/status/命令且仅比截图哈希前缀。未满足本卡交付门。当前用户模式为 Codex 分派、GLM 贡献、Codex 独立验收；不等待固定三贤人签字，但错误的业务证据仍须返工。

### 下一位 GLM 返工提示词

```text
在 /Users/zhangxu/illegal/type-pal-glm-regression-lab、codex/glm-architecture-regression-lab-r1 返工 ARCH-REGRESSION-LAB-GLM-1，候选30397b1d，状态draft。先同步分支并核工作树；读取 origin/main:AGENTS.md 当前委派模式、本卡，以及 Codex 报告 docs/testing/architecture-regression-lab-codex-review.md（在 origin/main，先 git show 只读，不要为取报告合main）。
按报告逐组处理 G01–G08/V01–V04 的具体反证；保留已成立的窄正控，不为保持39条而留 tautology、未进入目标链的用例或非法强转。V04-01 撤回“深链产品覆写”归因：干净深链正常，脏会话 ERR_ABORTED 是 beforeunload，站内导航可进；V04-02 正确登记缺合法精灵字节的环境阻断，提供自包含资源正控后再做媒体矩阵。修全目录 Biome、删除/完成无效 project-configs.mjs、为候选TS/TSX提供真实类型检查；verify.mjs 应从 Vitest JSON 核 test fullName/status/执行数、命令及完整截图SHA，而非只核文件存在/16位前缀。每组关键新合同交可鉴别单点反控或注明重叠/待证。
只改自己的 docs/testing/glm-architecture-regression-lab/** 和自己的回执/账本；不改产品、旧测、官方配置或基线，不跑迁移写盘/全仓覆盖率。返工后复跑候选、相邻、类型/目录Biome、负控/verify及必要隔离视觉，提交推送 SHA 与逐组去向；Codex 独立复核，不自行合main/标done。不需 Kimi 固定签字。
```
