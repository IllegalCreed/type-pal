# TEST-CONTENT-RESIDUAL-1 - 内容合同已登记残项补测（队列 TB-01）

Status: draft
Phase: phase2
Capability: 已有内容合同覆盖（不改变能力地图）
Coding Owner: GLM（只新增测试）
Integration Owner: Codex
Reviewer: Codex / Kimi
Visual Verification Owner: N/A
Visual Verification Timing: N/A
Unavailable Agents: none
Branch: codex/glm-content-residual-r1（获准后使用）

Revision: r2，2026-09-19；生产核对点`e58834f6389a40ffe9f187e6a8051f552e964d79`不变。r1前提/方案已收窄，旧签留历史，不授权r2。
来源：[补测长队列](../../testing/glm-coverage-work-queue.md) TB-01，规划产物非实施授权。
唯一工作包/族账/白名单：[glm-content-residual.md](../../testing/glm-content-residual.md)。

## 目标与边界

只补[已接收内容合同包](../../testing/glm-content-contracts.md)回执登记的残项（asset unbound 肖像直连臂、
author-dialogue 字段守卫轴、map-index 剩余拒绝边界、validate-refs 数据引用轴、frame-sequence 可达错误路径）。
已接收 118 项逐项对账不重做；TextEncoder 降级不存在不补；D-06/D-07 留修复卡；无 caller 接口不保活。

## 前提真值门

| 维度 | 一手证据与结论 |
|---|---|
| 原版/primary source | N/A——本包不涉及原版机制真值；当前公开 TS 合同为真源 |
| 第一阶段 | N/A——content 无一阶段对应 |
| 当前二阶段 | asset.ts:387为commandAssetTaggedReferencesAtNode，actor-reference的portrait引用器不扫unbound；frame-sequence:255解析外部字节；editor/project-diagnostics.ts:688调用validateReferences。表情rename已有editor:76消费与强回归；content的ES2022/rootDir:src禁止为测试反向引运行时loader |
| 本任务目标 | before→after 只增合法正反测试与覆盖账；行为/schema/版本零变 |

最强替代解释：跨包已测（rename 全域证据见工作包去重表）、不可达（多字节 encode 臂）、
已有强断言（118 项）、合同未定。反证成立即登记已有/防御/待证，不凑数。

## 推进签字

### build前（r2，当前）

- Codex：**premise verified / design agree（2026-09-19，r2，冻结e58834f6）**。本人直读asset.ts:387–423、frame-sequence.ts:117–152/255–278、author-dialogue.ts:125–168、content/tsconfig.json及editor的rename既有强断言；相关10文件148项复跑绿，前提探针证明合法unbound边和外部Unicode TPFS及独立错误路径。r2不反向依赖运行时loader、不保活无当前非空消费证据的scriptChunks、不强制已覆盖A3新增。可证伪：合法基线被守卫拒绝、旧断言已经完全同合同、caller只能来自已退役链，则撤回该候选；不得改产品迁就。
- Kimi：pending（独立审r2，不读GLM结论）。
- GLM：pending（对r2事实与实施钉补充确认；原r1签字保留在下方，不直接沿用）。
- build准入：未开放；同r2三席齐且无counter后由Codex核定。其它批次无依赖者独立裁决，TB-00返工仍优先。

### build前r1签字（历史，已被r2替代）

- Codex：pending（独立核队列 TB-01 范围/去重表/白名单）。
- Kimi：pending（独立前提/设计审查，不读 GLM 结论）。
- GLM：**premise verified / design agree（2026-09-19，核对点 e58834f6；锚点本人直读，未读他席）**。
  模块/计数与机器台账逐格一致（census --check 通过）；跨包去重表本人逐条核验——editor
  actor-dialogue-commands.boundaries.test.ts:149+ 确经 :76 调用 content rename 并钉全域/invert/深快照，
  rename 族登记已有跨包间接；A1-A12 族锚点在工作包直读列明。可证伪：某族无合法输入或已被同合同
  断言覆盖→登记已有；产品/旧测试/基线 diff→停。
- build准入：未开放；三席同 r1 齐且无 counter 后由 Codex 核定。

### done前

- GLM/Codex/Kimi：pending；done准入未开放，不代签、不标done。

## 交接日志

- 2026-09-19 Codex：按用户要求与TB-00返工并行推进本卡；修正A1/A2函数锚点、内容包依赖方向和当前fixture证明方式；A3与旧分片先分类，不承诺六文件全都新增。已把修订合入工作包正文，r2本人前提/设计签字完成，待GLM补充确认与Kimi独立审查。仅文档/只读探针，未写正式测试或改产品。统一证据见[前三批设计收口](../../testing/glm-coverage-queue-design-review.md)。

- 2026-09-19 GLM：按队列 TB-01 细化。核台账计数、跨包 rename 去重（编辑器测试确调用 content 函数）、
  上包回执残项锚点、白名单路径未占用；产出本卡+工作包（A1-A12 族账/负控/覆盖方案）。仅规划，未写测试。

## 下一位Agent提示词

两席完整合并提示词见[前三批r2设计交接](../../testing/glm-coverage-queue-design-review.md#两席并行提示词)。本卡最小可复制交接如下：

```text
在 /Users/zhangxu/illegal/type-pal 审 docs/ops/tasks/TEST-CONTENT-RESIDUAL-1-registered-gaps.md（r2/draft，冻结e58834f6）。先同步检查工作树，读AGENTS/CLAUDE/READ-FIRST、本卡和对应工作包、docs/testing/glm-coverage-queue-design-review.md，直接读一手代码而非复述他席。
Codex已签r2。GLM负责对本卡r2差异补充确认，Kimi负责独立设计压力测试，两席可并行且不读另一席结论。分别只在本人r2席位/日志写带直接锚点和可证伪观察的premise verified/design agree或counter，并提交推送。
同时审其余TB-01～03同r2卡可用合并提示词，但各卡独立裁决。不得改产品/正式测试/另一席/状态，不标build/done；三席齐后Codex核准入。TB-00返工不因本轮设计等待而停止。
```
