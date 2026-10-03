# TEST-COVERAGE85-GLM-REFORGE-1 — Reforge runtime branch-contract closure

Status: build
Owner: GLM
Reviewer: Codex
Base: `b95a6947369bf5d32db5746df0c82acae27b3663`
Branch: `codex/coverage85-glm-reforge-r1`
Capability: test-quality / coverage branch closure

## Codex build allowed

当前 fast 基线 reforge 为 statements `15761/17939`、branches `9657/12166`、functions
`2561/2916`、lines `14162/15662`；达到 package branch 85% 至少需闭合约 685 个既有
未覆盖 edges。不得把 685 当作测试数量，也不得为覆盖率改变产品或删除旧合同。

## 独占范围与明确合同点

只允许写 `packages/reforge` 的新专属测试、必要 typed fixture 和本卡证据；不得改产品实现、
旧测试、配置、baseline、真实 PAL 数据或其它卡目录。以公开 runtime/caller 为边界，优先核验：

- `src/main.ts:284-937`：启动参数/入口解析、project/source 装配、ready/error/abort 生命周期、
  host 注入和清理；每条测试必须走公开启动入口，不能调用私有函数或伪造 world state。
- `src/battle/battle-session.ts:385-803`、`src/battle/battle-core.ts:328-1139`：
  session phase、输入锁、目标选择、行动提交/拒绝、状态效果、胜负/逃跑/清理；分别覆盖
  空/单/多目标、合法/非法阶段和恢复路径，断言业务状态/事件而非内部调用次数。
- `src/script-runner.ts:234-820`、`src/script-runner-core.ts:175-638`、
  `src/script-host-adapter.ts:30-332`：脚本生命周期、yield/resume、unknown opcode、
  host capability、signal/exception/cleanup；用合成脚本和公开 host，不能接 PAL 世界后门。
- `src/entity-motion.ts:135-1031`、`src/script-project-core.ts`、`src/script-world.ts`、
  `src/runtime-script-project.ts`：移动/碰撞/边界、project scope、脚本世界隔离和恢复；只写
  与当前 content22/SAVE11 合同相符的 typed 输入。

不可由公开 caller 合法到达的宿主/错误臂必须留在 ledger 中，提供源码条件、调用图和反例，不能
用业务核心 mock、私有 state 或扩大 timeout 强行命中。

## 验收交付

每个 admitted branch family 都要有独立业务 oracle 和精确 fullName；重复同一状态轴、只断言
`toHaveBeenCalled`、只测 collection/runtime 错或空执行的用例不计入。反控按真实注入点逐项提供
原始/变异/恢复三态、唯一指定 AssertionError、执行身份和源 hash，拒收 pending/skip/额外错误。
禁止 `as unknown as`、`@ts-expect-error`、ignore/skip、产品实现改动和 baseline 手改。

回执包含 fresh `file×fullName×status` JSON、源 hash、branch delta、existing-proof/unreachable
账，以及定向/相邻/typecheck/lint/docs/diff 结果。以 reforge branch 达到 85% 或剩余臂有一手
不可达证明为收口条件；不得合 main/标 done，交 Codex 独立验收。

## 下一位 Agent 提示词

你是 GLM，负责本卡 Reforge runtime。先读 `AGENTS.md`、`CLAUDE.md`、`docs/phase2/READ-FIRST.md`、
本卡和 fast baseline，逐行核对 main/battle/script/motion 的真实 caller。只写本卡白名单；
交付时在本卡登记每个合同的源锚、合法输入、oracle、fullName、三态反控和覆盖变化，并给出
`accept` 或 `counter`；不得改产品、旧测、配置或标 done。
