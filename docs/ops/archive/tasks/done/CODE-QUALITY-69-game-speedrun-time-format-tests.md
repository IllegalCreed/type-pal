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
