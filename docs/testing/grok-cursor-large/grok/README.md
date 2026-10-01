# Grok render / host large：交付入口

[任务卡](../../../ops/tasks/TEST-GROK-RENDER-HOST-LARGE-1.md) ·
[共同协议](../README.md) · [冻结分配](../targets.json)。

Coding Owner: Grok。作者交付进行中，**不是 review / accept / done**。
派发 BASE `0704d3de6d3d2a2099475a42f601b654bba08579`。
完整候选 SHA 留到末批 `receipt.json`，本文不回填当前 HEAD。

## 累计

| 项 | 已计入 | 目标 | 剩余 |
|---|---:|---:|---:|
| 合法新合同 | 40 | 400 | 360 |
| 组 | 4 | 40 | 36 |
| 有效反控 | 4 | 40 | 36 |

G01 四组都是 `packages/game/src/assets/loader.ts`：G01-A 合法装配、G01-B 边界、G01-C 失败恢复、G01-D 缓存归属与迟到。
existing-proof / unreachable / blocked 另账，本批为 0。未把 400/40/40 改小。

## 本批证据

- [contracts.json](contracts.json)：40 条，含条件行、caller、输入、旧断言、断言行与 matcher、oracle、执行 fullName
- [directed-vitest.json](directed-vitest.json)：40 条 file × fullName × passed；相邻 `loader.test.ts` 7 条 passed 记在 `adjacent`
- [counters.json](counters.json) 与 [反控说明](counters/README.md)：拒收探针加 G01-A/B/C/D 三态原日志
- [defects.md](defects.md)：本批没有停组的产品缺陷
- 专属宿主 `packages/game/src/__tests__/grok-render-r1/legal-host.ts`

## G01 已跑命令

定向与相邻：

`pnpm --filter @type-pal/game exec vitest run src/assets/load-all-assemble.grok-r1.test.ts src/assets/load-all-bounds.grok-r1.test.ts src/assets/load-all-recover.grok-r1.test.ts src/assets/scene-cache.grok-r1.test.ts src/assets/loader.test.ts --reporter=json`

结果：新合同 40 passed，相邻 7 passed，pending 0。

`pnpm --filter @type-pal/game run typecheck` 退出码 0。

反控：`node docs/testing/grok-cursor-large/grok/run-counters.mjs`。探针因 stderr 中的 Unhandled Errors 被拒收。四枚 mutant 退出码 1，各只有一条指定 AssertionError。

私有 coverage、全包 test、根 lint、docs check、diff check、verifier 留到末批。不合 main，不跑正式 ratchet。
