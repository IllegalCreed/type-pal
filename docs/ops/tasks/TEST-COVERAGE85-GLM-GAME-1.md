# TEST-COVERAGE85-GLM-GAME-1 — game runtime branch-contract closure

Status: build
Owner: GLM
Reviewer: Codex
Base: `b95a6947369bf5d32db5746df0c82acae27b3663`
Branch: `codex/coverage85-glm-game-r1`
Capability: test-quality / coverage branch closure

## Codex build allowed

当前 fast 基线 game 为 statements `13113/15513`、branches `8408/11278`、functions
`1504/1852`、lines `11774/13619`；game 分支要达到 85% 至少需要覆盖当前源码中约
1179 个既有未覆盖 branch edges。这个数字只是停止线计算，不是测试例数配额；不得为了
凑数新增重复合同或修改质量阈值。

## 独占范围与明确合同点

只允许写 `packages/game` 下新的专属测试、必要的本地 typed fixture 和本卡证据；不得改产品、
旧测试、共享配置、coverage baseline、真实 PAL 数据或其它卡目录。优先逐分支核验以下现有
源码轴，并用公开 caller/可观察业务 oracle 闭环：

- `src/core/event-system.ts:627-728,1070-1425`：事件队列空/非空、阻塞与恢复、条件不满足、
  事件完成/取消、并行分支和异常收束；必须证明状态转移和 emitted event，不以调用次数代替 oracle。
- `src/core/battle/battle-opcodes.ts:145-587` 与 `src/core/battle/battle-system.ts:276-1099`：
  opcode 合法/非法参数、目标为空/多目标、伤害/状态/逃跑/胜负结算、阶段切换和拒绝路径；
  输入必须由真实 typed battle state/公开 battle caller 构造。
- `src/core/menu/menu-driver.ts:151-666`、`src/core/event-opcode-player.ts:59-236`：菜单
  生命周期、确认/取消/禁用项、脚本 opcode 的正常/拒绝/恢复路径；不得直接改私有 state 或
  注入世界后门。
- 相邻合法轴可覆盖 `core/battle/actions/*`、`core/equip-effect.ts`、`core/equipment-state.ts`、
  `core/game-state.ts`，但每个新增合同必须指出源行、caller、合法输入和精确断言；
  `shell/bootstrap.ts`/`main.ts` 的宿主不可达臂只有在找到真实入口后才测，否则写 existing-proof。

## 验收交付

每个 admitted branch family 都要有原始正例、反例或恢复例（按该分支语义决定），并记录源
`file:line`、caller、fullName、断言 oracle。反控不得使用固定数量：对每个真实注入点必须有
原始/变异/恢复三态、唯一指定业务 AssertionError、执行身份集合和源 hash；判据拒收零执行、
额外文件错误、pending/skip、collection/runtime 错和未处理异常。测试必须保持原子性、低重叠，
不得用 `as unknown as`、`@ts-expect-error`、ignore/skip、放宽 timeout 或业务核心 mock。

回执必须包含 fresh Vitest `file×fullName×status`、coverage 前后 branch delta、未覆盖臂的
existing-proof/unreachable 证据，以及定向测试、相邻测试、typecheck、lint、docs/diff 结果。
只有真实 branch 合同闭合且 game branch 达到 85%（或对剩余不可达臂给出一手证明）才可请求
Codex 独立验收；不得合 main 或标 done。

## 下一位 Agent 提示词

你是 GLM，负责本卡 `packages/game` runtime branch-contract closure。先读 `AGENTS.md`、
`CLAUDE.md`、`docs/phase2/READ-FIRST.md`、本卡和 `scripts/coverage/baseline.fast.json`，
再逐文件核对上述源行及已有 fullName。只写本卡白名单的新测试/typed fixture/证据；不得开始
产品实现、旧测、配置或 baseline 修改。交付时写入本卡：每个 branch family 的源锚/caller/
合法输入/oracle、fresh JSON、三态反控 hash、branch delta、质量门结果，并报告
`agree/accept` 或 `counter`；未闭合前不得标记 done。
