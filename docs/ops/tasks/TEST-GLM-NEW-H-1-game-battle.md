# TEST-GLM-NEW-H-1 — 一阶段战斗当前合同

Status: build
Owner: GLM Wave H（仅本 wave 单一测试 Coding Owner）
Reviewer: Codex（独立验收、选择性集成、统一质量/覆盖门）
Phase: phase1
Capability: coverage / current-public-contract

## 授权与冻结

2026-09-29 用户明确先前 GLM A–E 已在执行，要求**另外多个新 wave 并行**，
并争取当日全仓分支覆盖率 85%。本卡只授权自己的六组/12 源；完整窄合同见
[F–J 工作包](../../testing/glm-new-waves/README.md)，精确源与 source digest
见[冻结表](../../testing/glm-new-waves/targets.json)：`ebe7d9d5794d3a51fb1234e6bc58a164467260846849c5c1c98d02955aa2a5da`。
先运行 `node docs/testing/glm-new-waves/verify-targets.mjs`；目标已与 A–E 和此前四队列去重。
先读真实 caller、同名/跨文件旧测试的完整 title/断言，有未证公开合同才建测试；
分支未命中只是选题线索，不承诺收益或以凑数为验收。85% 由 Codex 在 main 并集实测。

## 四向前提与停止线

| 方向 | 当前证据/边界 |
|---|---|
| 原版/primary source | 机制和数据预期须逐轴查 `data/raw` / `reference/sdlpal`，不从被测实现自造 oracle。 |
| 第一阶段 | `packages/game/src/core/battle/battle-opcodes.ts`、`battle-system.ts` 及 `actions/magic.ts` 是当前实现；遵循 `CLAUDE.md`、工程经验和 game-mechanics。本 wave 只添证明，不修机制；生产冻结 `ced193f4f590c57d25ad2d48e2aa256e4b70a902`。 |
| 当前二阶段 | N/A：本卡不接 Reforge/editor/content，不以二阶段架构改写一阶段测试预期。 |
| 本任务目标 | before → after：产品行为不变，只新增当前公开合同测试/隔离证据；不改 schema/save/资源或用户 UX。 |

最强替代解释：旧测试已证、臂为防御死路或没有当前调用者。若只能靠非法 fixture、
双强转、mock 被测核心、读私有态、过期版本或改产品才命中，则此组判 existing-proof/unreachable，
不改预期凑绿。用户/一手证据与当前假设冲突时先停对应组交 Codex。
本 wave 特定红线：数值或原版语义未核先停组，不能把当前错误写成期望；不改产品。

## 写入白名单、验收和交接

工作树 `/Users/zhangxu/.codex/worktrees/glm-new-h/type-pal`，分支 `codex/glm-new-h-r1`；不得占用正在运行的 A–E 工作树或同伴分支。
每个冻结源最多新增一个必要的同目录 `<stem>.glm-next-wave.test.ts(x)`；
typed fixture 仅 `packages/game/src/__tests__/glm-next-wave/H/**`；
回执/反控/隔离宿主仅 `docs/testing/glm-new-waves/wave-H/**`，
截图仅 `/tmp/type-pal-glm-new-wave/H/`。
共享清单/README/判据、任务卡/看板、产品、旧测试、共享配置/依赖/锁、正式工程和官方基线只读。
正控走现行构造器/guard 与实际公开 API；负控从合法输入单点变异或公开 unknown 边界进入。
合法路径无 any/as never/双强转/@ts-ignore/@ts-expect-error；输入深快照与完整非空结果互证。
异步须 entered/deferred/finally 释放，不用固定 sleep/timeout 冒充取消证明。
本 wave 约 2–4 枚代表反控：对照 exit0、恰 exit1 业务红、绝对 file/fullName、唯一注入、
实际执行数；混错、skip、timeout、零执行、exit2 均 invalid。反控判据只写自己 wave 证据目录。
视觉：纯/有界状态测试，不要求浏览器视觉。无实际浏览器/看图时如实标未证。
只跑新测+相邻定向（maxWorkers 1）、相关包 typecheck、精确新增文件 Biome
error/warning/info 全零、docs/diff；不得降规则/加 ignore。GLM 不跑全仓 check、
官方 ratchet/受保护 fast 或 E2E，不合 main/标 done。
回执交固定完整候选 SHA、逐组旧证→新差异、新鲜 Vitest JSON file/fullName/status、
反控、截图 hash/console（若视觉）和未证/真缺陷；真产品 bug 留隔离红诊断交 Codex 另卡。
Codex 独立审核 F–J 与 A–E 并集，选择性集成，串行 check → ratchet → 受保护 fast。

准入记录：2026-09-29 Codex 核生产 hash、60 新源互斥、旧队列和 A–E 零交集；
本卡仅测试/fixture/隔离证据 build allowed。review → done 待 Codex 独立验收。

## 下一位 Agent 提示词

```text
你是 GLM Wave H 的唯一测试 Coding Owner。只在 /Users/zhangxu/.codex/worktrees/glm-new-h/type-pal
的 codex/glm-new-h-r1 分支工作；A–E 已有人执行，绝不碰其工作树/分支。
先读 AGENTS.md、CLAUDE.md、docs/phase1/engineering-notes.md、docs/phase1/game-mechanics.md、
docs/ops/tasks/TEST-GLM-NEW-H-1-game-battle.md、docs/testing/glm-new-waves/README.md、targets.json，
运行 verify-targets.mjs。逐组读现行 caller 和旧断言，有新公开合同才增测试；
只改自己 wave 的同目录新测、专属 typed fixture 和专属证据。不改产品、旧测、
正式工程、官方基线或同伴分支。定向+相邻、相关 typecheck、Biome 零诊断、docs/diff、
2–4 枚反控；视觉要求：纯/有界状态测试，不要求浏览器视觉。
提交推送完整候选 SHA，回执列逐组旧证→新差异、file/fullName/status、反控、
截图 hash/console（如要求）、未证/真实红项。你不合 main、不标 done；Codex 独立验收。
```
