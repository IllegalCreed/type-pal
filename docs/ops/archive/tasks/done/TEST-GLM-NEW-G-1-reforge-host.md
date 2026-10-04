# TEST-GLM-NEW-G-1 — Reforge 战斗与场景宿主边界

Status: done
Owner: GLM Wave G（仅本 wave 单一测试 Coding Owner）
Reviewer: Codex（独立验收、选择性集成、统一质量/覆盖门）
Phase: phase2
Capability: coverage / current-public-contract

## 授权与冻结

2026-09-29 用户明确先前 GLM A–E 已在执行，要求**另外多个新 wave 并行**，
并争取当日全仓分支覆盖率 85%。本卡只授权自己的六组/12 源；完整窄合同见
[F–J 工作包](../../../../testing/archive/legacy/batches/glm-new-waves/README.md)，精确源与 source digest
见[冻结表](../../../../testing/archive/legacy/batches/glm-new-waves/targets.json)：`993ee48d7cea947139128a9a8fe80f4fd5a0825345292ac1cc4fc7672da6005f`。
先运行 `node docs/testing/archive/legacy/batches/glm-new-waves/verify-targets.mjs`；目标已与 A–E 和此前四队列去重。
先读真实 caller、同名/跨文件旧测试的完整 title/断言，有未证公开合同才建测试；
分支未命中只是选题线索，不承诺收益或以凑数为验收。85% 由 Codex 在 main 并集实测。

## 四向前提与停止线

| 方向 | 当前证据/边界 |
|---|---|
| 原版/primary source | 不改原版机制；涉及战斗数值预期须逐项查 `data/raw` 或 `reference/sdlpal` 一手证据。 |
| 第一阶段 | 战斗公式与 UX 参考 `docs/phase1/game-mechanics.md` 和相应 `phase1-knowledge-harvest`；不照搬旧模块结构。 |
| 当前二阶段 | `packages/reforge/src/battle/battle-session.ts`、`battle/battle-core.ts` 是战斗会话/核心；`packages/reforge/src/battle-trial-host.ts` 提供隔离 trial 宿主。生产冻结 `ced193f4f590c57d25ad2d48e2aa256e4b70a902`。 |
| 本任务目标 | before → after：产品行为不变，只新增当前公开合同测试/隔离证据；不改 schema/save/资源或用户 UX。 |

最强替代解释：旧测试已证、臂为防御死路或没有当前调用者。若只能靠非法 fixture、
双强转、mock 被测核心、读私有态、过期版本或改产品才命中，则此组判 existing-proof/unreachable，
不改预期凑绿。用户/一手证据与当前假设冲突时先停对应组交 Codex。
本 wave 特定红线：不碰主场景 E2E、完整战斗路线、实体碰撞政策；运动语义争议停该组。

## 写入白名单、验收和交接

工作树 `/Users/zhangxu/.codex/worktrees/glm-new-g/type-pal`，分支 `codex/glm-new-g-r1`；不得占用正在运行的 A–E 工作树或同伴分支。
每个冻结源最多新增一个必要的同目录 `<stem>.glm-next-wave.test.ts(x)`；
typed fixture 仅 `packages/reforge/src/__tests__/glm-next-wave/G/**`；
回执/反控/隔离宿主仅 `docs/testing/archive/legacy/batches/glm-new-waves/wave-G/**`，
截图仅 `/tmp/type-pal-glm-new-wave/G/`。
共享清单/README/判据、任务卡/看板、产品、旧测试、共享配置/依赖/锁、正式工程和官方基线只读。
正控走现行构造器/guard 与实际公开 API；负控从合法输入单点变异或公开 unknown 边界进入。
合法路径无 any/as never/双强转/@ts-ignore/@ts-expect-error；输入深快照与完整非空结果互证。
异步须 entered/deferred/finally 释放，不用固定 sleep/timeout 冒充取消证明。
本 wave 约 2–4 枚代表反控：对照 exit0、恰 exit1 业务红、绝对 file/fullName、唯一注入、
实际执行数；混错、skip、timeout、零执行、exit2 均 invalid。反控判据只写自己 wave 证据目录。
视觉：一条隔离 battle trial 菜单/错误恢复视觉，6092 空闲端口。无实际浏览器/看图时如实标未证。
只跑新测+相邻定向（maxWorkers 1）、相关包 typecheck、精确新增文件 Biome
error/warning/info 全零、docs/diff；不得降规则/加 ignore。GLM 不跑全仓 check、
官方 ratchet/受保护 fast 或 E2E，不合 main/标 done。
回执交固定完整候选 SHA、逐组旧证→新差异、新鲜 Vitest JSON file/fullName/status、
反控、截图 hash/console（若视觉）和未证/真缺陷；真产品 bug 留隔离红诊断交 Codex 另卡。
Codex 独立审核 F–J 与 A–E 并集，选择性集成，串行 check → ratchet → 受保护 fast。

准入记录：2026-09-29 Codex 核生产 hash、60 新源互斥、旧队列和 A–E 零交集；
本卡仅测试/fixture/隔离证据 build allowed。review → done 待 Codex 独立验收。

## 2026-09-29 Codex 独立审核与返工

候选 `07140f7596798c7687322eba83b110fcec0d033a` 独立审核结论
**rework，未合 main**。完整[审核回执](../../../../testing/archive/legacy/batches/glm-new-waves/codex-review-G-07140f75.md)
记录 47/47、Reforge typecheck 和视觉截图 hash 通过；完整 lint 7 error、三处
双强转、反控越界改生产源、陈旧缓存合同与未归因的 404 console 仍待闭合。
GLM 只修原白名单并推新完整 SHA；共享导航由 Codex 负责，官方覆盖门暂缓。

## 历史首轮派发提示词（已执行）

```text
你是 GLM Wave G 的唯一测试 Coding Owner。只在 /Users/zhangxu/.codex/worktrees/glm-new-g/type-pal
的 codex/glm-new-g-r1 分支工作；A–E 已有人执行，绝不碰其工作树/分支。
先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、
docs/ops/tasks/TEST-GLM-NEW-G-1-reforge-host.md、docs/testing/archive/legacy/batches/glm-new-waves/README.md、targets.json，
运行 verify-targets.mjs。逐组读现行 caller 和旧断言，有新公开合同才增测试；
只改自己 wave 的同目录新测、专属 typed fixture 和专属证据。不改产品、旧测、
正式工程、官方基线或同伴分支。定向+相邻、相关 typecheck、Biome 零诊断、docs/diff、
2–4 枚反控；视觉要求：一条隔离 battle trial 菜单/错误恢复视觉，6092 空闲端口。
提交推送完整候选 SHA，回执列逐组旧证→新差异、file/fullName/status、反控、
截图 hash/console（如要求）、未证/真实红项。你不合 main、不标 done；Codex 独立验收。
```

## 历史 GLM Wave G 返工提示词（已执行）

```text
你仍是 TEST-GLM-NEW-G-1 测试 Coding Owner。只在
/Users/zhangxu/.codex/worktrees/glm-new-g/type-pal 的 codex/glm-new-g-r1 分支返工
07140f7596798c7687322eba83b110fcec0d033a。先读本卡与 main 上
docs/testing/archive/legacy/batches/glm-new-waves/codex-review-G-07140f75.md。清零完整 lint 7 error；
移除三处 as unknown as，改用类型化 Canvas 端口；反控只在隔离副本/loader
注入，不改正式生产源，拒绝 skipped/混错并精确核绝对 file/fullName、执行数、
产品 hash，附同一判据反例自测。screen-fx 两例陈旧缓存断言若无当前合法
调用证据就移除并登记未证。补 404 请求 URL/status 与预期 NotFound 归因，
无法归因就标 console 未证；恢复只读共享 README（Codex 负责导航）。
只改 Wave G 新测与 wave-G 证据/宿主，更新完整 SHA、JSON 回执、反控/视觉；
复跑定向+相邻、reforge typecheck、完整 lint 零诊断、docs/diff，推送新 SHA。
你不合 main、不标 done；Codex 独立再审。
```

## 2026-09-29 Codex r2 候选验收

候选 `fd1189a314e96863f052439cd1d33b01f1e2951d` **代码候选 accept**，
见[独立验收回执](../../../../testing/archive/legacy/batches/glm-new-waves/codex-accept-G-r2-fd1189a3.md)。
状态为 `review`，尚未合 main；父级共享导航、视觉 console 未证项与统一
`pnpm check`、官方 ratchet、受保护 fast、正式覆盖收益待 Codex 并集成门。
无下一位 GLM 提示词。

## 2026-09-29 Codex 代码集成后保留 review

本卡测试/证据已进入 main `056cb6cb26dbe46e374e9121c1a2bdb94b12d990`，
见[统一集成回执](../../../../testing/archive/legacy/ops/testing-records/glm-wave-union-20260929.md)。完整 `pnpm check`、
官方 ratchet、受保护 fast 与静态零诊断均通过；正式并集分支覆盖率
78.12%，不单独相加本 wave 收益。**仍非 done**：隔离试打截图已看图，
但 9 条 console error 只有 8 条请求可按 URL 归因到预期无存档探测，
余 1 条未证。Codex 负责后续 console 补验；无下一位 GLM 提示词。

## 2026-09-29 Codex 集成与视觉终态

本卡测试/证据已进入 main `056cb6cb26dbe46e374e9121c1a2bdb94b12d990`，
见[统一集成回执](../../../../testing/archive/legacy/ops/testing-records/glm-wave-union-20260929.md)：完整 check、
官方 ratchet、受保护 fast、静态零诊断均通过，生产源码与覆盖分母不变。
原 r2 视觉回执中唯一未归因的 console error 经 Codex
[URL 级补验](../../../../testing/archive/legacy/batches/glm-new-waves/codex-G-console-closure-20260929.md)
确认为隔离宿主 favicon 404；宿主补内联 favicon 后完整流程的 8 条 console
error 均逐条对应预期无存档探测，requestfailed/pageerror 均 0。
功能视觉与 console 验收闭合，本纯测试卡由 Codex 标记 `done`。
全仓 85% 目标仍未达（并集 78.12%），不冒充本卡单独覆盖收益。

无下一位 Agent 提示词；历史派发/返工提示词仅作记录。
