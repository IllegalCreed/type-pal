# TEST-COVERAGE85-KIMI-EXTRACT-MIGRATE-1 — extract/migrate pipeline branch-contract closure

Status: build
Owner: Kimi
Reviewer: Codex
Base: `b95a6947369bf5d32db5746df0c82acae27b3663`
Branch: `codex/coverage85-kimi-extract-migrate-r1`
Capability: test-quality / coverage branch closure

## Codex build allowed

当前 fast 基线 pal-extract 为 statements `957/1492`、branches `371/539`（68.83%），migrate
为 statements `2146/2592`、branches `1503/1787`（84.11%）。优先闭合真实 CLI/解析/写计划
合同；达到各自 85% 约需 pal-extract 88、migrate 16 个既有 branch edges。不得把数字当测试
例数或反控配额，也不得为覆盖率重写迁移产物、真实数据或产品 schema。

## 独占范围与明确合同点

只允许写 `packages/pal-extract`、`packages/migrate` 的新专属测试、`mkdtemp` 合成输入、
必要证据；不得改产品、旧测试、共享配置、baseline、`projects/pal` 真实数据或其它卡目录。

- `packages/pal-extract/src/cli.ts:167-702`：命令分类、参数缺失/非法、输入文件不存在或
  格式错误、输出目录/覆盖策略、成功退出与错误退出；必须通过公开 CLI 子进程或公开 runner，
  每个失败断言精确到诊断/exit code，不能只断言 throw。
- `src/events/slice.ts:30-193`、`events/disasm.ts`、`events/annotate.ts`、`events/recompile.ts`：
  空事件、边界 offset/length、未知 opcode、截断/损坏 payload、round-trip 合法事件；用合成
  二进制并保留原始 bytes/hash，不能触碰真实游戏数据。
- `packages/migrate/src/pal-assets.ts:339-955`：资产清单缺失/重复、路径归一化、hash/bytes
  校验、资源类别分派、可选/必需资产和失败回滚；断言真实 resolver/plan 输出，不 mock 核心
  asset pipeline。
- `src/migration-merge.ts:124-380`、`src/migration-transaction.ts:108-306`、
  `scripts/bake-assets.mts:40-191`、`scripts/migrate-content.mts:46-149`、
  `src/pal-item-scheme-labels.ts`/`pal-world-sprite-registry.ts`：事务 apply/rollback、冲突
  合并、dry-run 与写入隔离、标签/registry 合法与拒绝路径；所有写入只能进本次 mkdtemp，
  `finally` 清理本次目录，不得全局 prune 或修改真实项目。

如某脚本 branch 只能由未公开宿主条件到达，必须给出源码条件、公开入口调查和 blocked/unreachable
证明；不能用 process.env 私有开关、静态跳转或业务核心 mock 制造覆盖。

## 验收交付

合同逐项记录源锚、caller、合法合成输入、输出/错误 oracle、旧 fullName 排重和 file hash。
反控按真实变异点逐项提供原始/变异/恢复三态、唯一指定业务红、执行身份、exit code 和最终 hash；
拒收零执行、只查 exit、额外 collection/runtime 错、pending/skip、未处理 signal/spawn 失败。
禁止 `as unknown as`、`@ts-expect-error`、ignore/skip、扩大 timeout、真实数据写入或降低规则。

回执必须包含 fresh Vitest/CLI JSON、branch delta、mkdtemp 清理证明、unreachable ledger，以及
定向/相邻测试、typecheck、lint、docs/diff。只有两个 package 的真实分支合同达到 85% 或剩余
边有一手不可达证明，才交 Codex 独立验收；不得合 main/标 done。

## 下一位 Agent 提示词

你是 Kimi，负责本卡 extract/migrate pipeline。先读 `AGENTS.md`、`CLAUDE.md`、
`docs/phase2/READ-FIRST.md`、本卡和 fast baseline，独立检查 CLI/事务/资源分派的公开 caller。
只写本卡白名单的新测试/合成 fixture/证据；交付时写每条合同的源锚、输入、oracle、fullName、
三态反控、hash、branch delta 和质量门，输出 `accept` 或 `counter`；不得改产品、旧测、配置、
真实数据、baseline 或标 done。
