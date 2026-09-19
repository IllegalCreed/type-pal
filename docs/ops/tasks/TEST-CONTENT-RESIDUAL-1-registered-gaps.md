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

Revision: r1，2026-09-19；生产核对点`e58834f6389a40ffe9f187e6a8051f552e964d79`。
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
| 当前二阶段 | 6 模块 caller：asset/actor-reference/frame-sequence/author-dialogue/map-index/validate-refs 均在已接收合同包与 loader/editor 消费链直读核实；表情重命名由 editor actor-dialogue-commands.ts:76 直接调用 content 函数 |
| 本任务目标 | before→after 只增合法正反测试与覆盖账；行为/schema/版本零变 |

最强替代解释：跨包已测（rename 全域证据见工作包去重表）、不可达（多字节 encode 臂）、
已有强断言（118 项）、合同未定。反证成立即登记已有/防御/待证，不凑数。

## 推进签字

### build前（r1）

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

- 2026-09-19 GLM：按队列 TB-01 细化。核台账计数、跨包 rename 去重（编辑器测试确调用 content 函数）、
  上包回执残项锚点、白名单路径未占用；产出本卡+工作包（A1-A12 族账/负控/覆盖方案）。仅规划，未写测试。

## 下一位Agent提示词

Codex/Kimi 并行审查提示词统一见队列文件"可直接交给GLM的总提示词"节与看板；本卡签齐前不实施。
