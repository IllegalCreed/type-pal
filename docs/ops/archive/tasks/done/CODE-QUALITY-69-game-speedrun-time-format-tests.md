# CODE-QUALITY-69 — game speedrun time format test contracts

Status: done
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: task-card-v1 / 1.0.0

## 目标

保留原卡「CODE-QUALITY-69 — game speedrun time format test contracts」的任务归属与历史边界。原目标见原文(摘录:Reviewer: Codex（独立验收） Capability: Q3 game/tools/speedrun Visual Verification Timing: N/A（纯格式函数）);本页治理不重开已终态任务。

## 范围

原卡含章节[CODE-QUALITY-69 — game speedrun time format test contracts、范围、验证、交接、2026-10-18 当前复审、下一位 Agent 提示词],共1个原文链接。治理范围仅限文档角色、保全与链接处置,不改产品/测试/coverage。

## 前提与证据

固定main源2133B(SHA cfa5360c9cda);原卡前提按原时点保留。当前存活入口:[README.md](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/69-time-format-tests/README.md)。

## 验收

本页治理验收=模板符合+原文逐字节保全+链接处置如实;原卡验收结论保持原时点(原Status:done),治理不改写。

## 状态与交接

done保持原语义;本治理候选为作者稿(partial/needs),交Owner非作者接收;无新执行授权。

## 历史范围

原卡属固定main时点;CODE-QUALITY-69 — game speedrun time format test contracts的原始范围与日期在保全块内逐字保留。

## 原始结论

原卡结论按其Status(done)原样;治理不撤销/不恢复旧信用。

## 当时证据

原文1个链接与当时回执属原时点证据;本页不重跑、不复授。

## 当前有效性

仅历史任务归属有效;不凭旧基点认定当前实现或授权新产品取舍。

## 继任文档

接替/关联入口见原文链接;当前任务导航以看板为准。 关联:[README.md](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/69-time-format-tests/README.md)。


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2133B / SHA-256 cfa5360c9cdabd54b6139eca75d7d70194fcb330443ae210eebd11703803222b；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
````markdown
# CODE-QUALITY-69 — game speedrun time format test contracts

Status: done
Owner: Codex
Reviewer: Codex（独立验收）
Phase: phase1 game
Capability: Q3 game/tools/speedrun
Visual Verification Timing: N/A（纯格式函数）

## 范围

- `packages/game/src/tools/speedrun/time-format.test.ts`
- `packages/game/src/tools/speedrun/time-format.boundaries.test.ts`
- `packages/game/src/tools/speedrun/time-format.glm-phase1-leaves.test.ts`

## 验证

完整读取 `time-format.ts` 与三份测试；定向 9 tests 全绿，覆盖厘秒/小时进位、负数归零、diff 符号/截断、合法 H:MM:SS/M:SS 与非法输入拒绝。speedrun wave 的全仓 check、ratchet、protected fast、lint-zero、docs/content review、ledger 已通过；无实现改动。

## 交接

2026-10-13 Codex：格式测试合同原子、边界反例和 parse oracle 真实；accept/done。账本收口为 `3266 / 316 closed / 8 review / 2942 pending`。

## 2026-10-18 当前复审

Codex 单一 Owner，承接 QUALITY-PRE94-RETROSPECTIVE-1；build allowed 仅三份 time-format 测试及治理记录。全文实现/三测试/overlay/store、tools-panel解析入口和 design Task1 已核。纠正59.995s“进位”错误标题，归并 GLM 重复小时/负数 oracle，拆开不同格式函数与正负边界；GLM 改核科学计数法拒绝及分钟越界/秒合法的独立反例。生产实现、公共 API/规则未改。

两枚隔离变异各为旧10绿→新13绿1个指定 AssertionError，恢复14绿；原件、身份/hash/清理见 [69证据](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/69-time-format-tests/README.md)。相邻speedrun/tools-panel 20文件108例、game typecheck通过。新全仓check/ratchet/protected未运行；当前partial，旧波次不认证新候选，time-format.ts 的非finite输入仍review。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-69 game speedrun time format test contracts
任务卡：docs/ops/archive/tasks/done/CODE-QUALITY-69-game-speedrun-time-format-tests.md
当前状态：done，已归档；当前结论 accept/done，不得直接重用本卡授权实现
```
````
<!-- incremental-original-source:end -->
