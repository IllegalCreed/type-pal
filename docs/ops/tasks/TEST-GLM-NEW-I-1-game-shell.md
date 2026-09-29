# TEST-GLM-NEW-I-1 — 一阶段壳层、菜单与呈现

Status: review
Owner: GLM Wave I（仅本 wave 单一测试 Coding Owner）
Reviewer: Codex（独立验收、选择性集成、统一质量/覆盖门）
Phase: phase1
Capability: coverage / current-public-contract

## 授权与冻结

2026-09-29 用户明确先前 GLM A–E 已在执行，要求**另外多个新 wave 并行**，
并争取当日全仓分支覆盖率 85%。本卡只授权自己的六组/12 源；完整窄合同见
[F–J 工作包](../../testing/glm-new-waves/README.md)，精确源与 source digest
见[冻结表](../../testing/glm-new-waves/targets.json)：`d07621c54c3504a1104353d87376d9273c2e1580741d4e735d710face41ec404`。
先运行 `node docs/testing/glm-new-waves/verify-targets.mjs`；目标已与 A–E 和此前四队列去重。
先读真实 caller、同名/跨文件旧测试的完整 title/断言，有未证公开合同才建测试；
分支未命中只是选题线索，不承诺收益或以凑数为验收。85% 由 Codex 在 main 并集实测。

## 四向前提与停止线

| 方向 | 当前证据/边界 |
|---|---|
| 原版/primary source | 资源/显示真值优先 `data/raw`，无法由数据判定时核 `reference/sdlpal` 和实测，不把合成样本称原版。 |
| 第一阶段 | `packages/game/src/shell/bootstrap.ts`、`core/menu/menu-driver.ts`、`present/present.ts` 为当前壳层/菜单/显示入口；`CLAUDE.md` 与工程经验为行为/已知坑依据。本 wave 不改 UX 形态；生产冻结 `ced193f4f590c57d25ad2d48e2aa256e4b70a902`。 |
| 当前二阶段 | N/A：本卡不接 Reforge/editor/content，不以二阶段架构改写一阶段测试预期。 |
| 本任务目标 | before → after：产品行为不变，只新增当前公开合同测试/隔离证据；不改 schema/save/资源或用户 UX。 |

最强替代解释：旧测试已证、臂为防御死路或没有当前调用者。若只能靠非法 fixture、
双强转、mock 被测核心、读私有态、过期版本或改产品才命中，则此组判 existing-proof/unreachable，
不改预期凑绿。用户/一手证据与当前假设冲突时先停对应组交 Codex。
本 wave 特定红线：不修改 `event-system.ts` 或 E2E 路线，不启动正式通关；浏览器/FS 替身只证声明的端口。

## 写入白名单、验收和交接

工作树 `/Users/zhangxu/.codex/worktrees/glm-new-i/type-pal`，分支 `codex/glm-new-i-r1`；不得占用正在运行的 A–E 工作树或同伴分支。
每个冻结源最多新增一个必要的同目录 `<stem>.glm-next-wave.test.ts(x)`；
typed fixture 仅 `packages/game/src/__tests__/glm-next-wave/I/**`；
回执/反控/隔离宿主仅 `docs/testing/glm-new-waves/wave-I/**`，
截图仅 `/tmp/type-pal-glm-new-wave/I/`。
共享清单/README/判据、任务卡/看板、产品、旧测试、共享配置/依赖/锁、正式工程和官方基线只读。
正控走现行构造器/guard 与实际公开 API；负控从合法输入单点变异或公开 unknown 边界进入。
合法路径无 any/as never/双强转/@ts-ignore/@ts-expect-error；输入深快照与完整非空结果互证。
异步须 entered/deferred/finally 释放，不用固定 sleep/timeout 冒充取消证明。
本 wave 约 2–4 枚代表反控：对照 exit0、恰 exit1 业务红、绝对 file/fullName、唯一注入、
实际执行数；混错、skip、timeout、零执行、exit2 均 invalid。反控判据只写自己 wave 证据目录。
视觉：一条 dev-panel/菜单隔离功能视觉，6093 空闲端口。无实际浏览器/看图时如实标未证。
只跑新测+相邻定向（maxWorkers 1）、相关包 typecheck、精确新增文件 Biome
error/warning/info 全零、docs/diff；不得降规则/加 ignore。GLM 不跑全仓 check、
官方 ratchet/受保护 fast 或 E2E，不合 main/标 done。
回执交固定完整候选 SHA、逐组旧证→新差异、新鲜 Vitest JSON file/fullName/status、
反控、截图 hash/console（若视觉）和未证/真缺陷；真产品 bug 留隔离红诊断交 Codex 另卡。
Codex 独立审核 F–J 与 A–E 并集，选择性集成，串行 check → ratchet → 受保护 fast。

准入记录：2026-09-29 Codex 核生产 hash、60 新源互斥、旧队列和 A–E 零交集；
本卡仅测试/fixture/隔离证据 build allowed。review → done 待 Codex 独立验收。

## 2026-09-29 Codex 独立审核与返工

候选 `2534b72c49366370e56841c5f2422515f83a7c5c` 已独立复核，结论
**rework，未合 main**。完整[审核回执](../../testing/glm-new-waves/codex-review-I-2534b72c.md)
记录 9 新测试文件/40/40、新截图真值、game typecheck 通过，但完整 lint 有四个
JSON 格式 error；反控只有一枚独立业务针、回执 8/4 计数错误，另有
`showError` 背景色断言与 AVI 固定延时证明待纠正。共享导航由 Codex 负责。
GLM 只修原白名单，推新完整 SHA；官方覆盖率门待返工通过并集成后运行。

## 历史首轮派发提示词（已执行）

```text
你是 GLM Wave I 的唯一测试 Coding Owner。只在 /Users/zhangxu/.codex/worktrees/glm-new-i/type-pal
的 codex/glm-new-i-r1 分支工作；A–E 已有人执行，绝不碰其工作树/分支。
先读 AGENTS.md、CLAUDE.md、docs/phase1/engineering-notes.md、docs/phase1/game-mechanics.md、
docs/ops/tasks/TEST-GLM-NEW-I-1-game-shell.md、docs/testing/glm-new-waves/README.md、targets.json，
运行 verify-targets.mjs。逐组读现行 caller 和旧断言，有新公开合同才增测试；
只改自己 wave 的同目录新测、专属 typed fixture 和专属证据。不改产品、旧测、
正式工程、官方基线或同伴分支。定向+相邻、相关 typecheck、Biome 零诊断、docs/diff、
2–4 枚反控；视觉要求：一条 dev-panel/菜单隔离功能视觉，6093 空闲端口。
提交推送完整候选 SHA，回执列逐组旧证→新差异、file/fullName/status、反控、
截图 hash/console（如要求）、未证/真实红项。你不合 main、不标 done；Codex 独立验收。
```

## 历史 GLM Wave I 返工提示词（已执行）

```text
你仍是 TEST-GLM-NEW-I-1 的测试 Coding Owner。只在
/Users/zhangxu/.codex/worktrees/glm-new-i/type-pal 的 codex/glm-new-i-r1 分支返工
2534b72c49366370e56841c5f2422515f83a7c5c。先读本卡及 main 上
docs/testing/glm-new-waves/codex-review-I-2534b72c.md。将完整 lint 的四个
证据 JSON 格式 error 清零；回执改成 9 新测试/3 existing-proof 并写完整 SHA；
补至少一枚不同业务合同的严格反控，C2 的 skipped 不得记 valid；补证或收窄
showError 的 #400 铺底断言；AVI 异步改为确定性进入/释放，不用 setTimeout(0)。
仅改 Wave I 同目录新测与 wave-I 证据，恢复共享 README 原状；Codex 负责其导航。
复跑定向+相邻、game typecheck、完整 pnpm lint 零诊断、docs/diff，更新 JSON
file/fullName/status、反控与视觉 console 未证说明，推送新完整 SHA。
你不合 main、不标 done；Codex 独立再审。
```

## 2026-09-29 Codex r2 候选验收

分支 HEAD `044d3fa4c525521658c28b4a7a5365098c706d86`（测试/证据提交
`8f71e0f3fd0d366558e7b2dda07a9c2eeb546f57`）**代码候选 accept**，
见[独立验收回执](../../testing/glm-new-waves/codex-accept-I-r2-044d3fa4.md)。
状态为 `review`，尚未合 main；共享导航、菜单浏览器 console 补验与统一
`pnpm check`、官方 ratchet、受保护 fast 待 Codex 集成时完成。
无下一位 GLM 提示词；不把隔离分支测试数当正式覆盖收益。

## 2026-09-29 Codex 代码集成后保留 review

本卡测试/证据已进入 main `056cb6cb26dbe46e374e9121c1a2bdb94b12d990`，
见[统一集成回执](../../testing/glm-wave-union-20260929.md)。完整 `pnpm check`、
官方 ratchet、受保护 fast 与静态零诊断均通过；正式并集分支覆盖率
78.12%。**仍非 done**：菜单高亮截图已看图，但浏览器 console 历史
未采集。Codex 负责后续最小 console 补验；无下一位 GLM 提示词。
