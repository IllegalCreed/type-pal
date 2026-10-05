# TEST-GLM-NEW-F-1 — 编辑器主工作台与预览

Status: done
Owner: GLM Wave F（仅本 wave 单一测试 Coding Owner）
Reviewer: Codex（独立验收、选择性集成、统一质量/覆盖门）
Phase: phase2
Capability: coverage / current-public-contract

## 授权与冻结

2026-09-29 用户明确先前 GLM A–E 已在执行，要求**另外多个新 wave 并行**，
并争取当日全仓分支覆盖率 85%。本卡只授权自己的六组/12 源；完整窄合同见
[F–J 工作包](../../../../testing/archive/legacy/batches/glm-new-waves/README.md)，精确源与 source digest
见[冻结表](../../../../testing/archive/legacy/batches/glm-new-waves/targets.json)：`27ee3a811311a586cc013b83f0b2117ecc66fd69149c51c9d45ab95493504276`。
先运行 `node docs/testing/archive/legacy/batches/glm-new-waves/verify-targets.mjs`；目标已与 A–E 和此前四队列去重。
先读真实 caller、同名/跨文件旧测试的完整 title/断言，有未证公开合同才建测试；
分支未命中只是选题线索，不承诺收益或以凑数为验收。85% 由 Codex 在 main 并集实测。

## 四向前提与停止线

| 方向 | 当前证据/边界 |
|---|---|
| 原版/primary source | 原版机制 N/A；本 wave 不改游戏行为。 |
| 第一阶段 | 有对应 UI/观感时依一阶段现行实现核形态，不自创新 UX；否则 N/A。 |
| 当前二阶段 | `packages/editor/src/main.tsx:24–28` 接作者会话，`packages/editor/src/ui/App.tsx`/`ScriptEditor.tsx` 是现行主工作台；一阶段只作 UI 形态参考。生产冻结 `ced193f4f590c57d25ad2d48e2aa256e4b70a902`。 |
| 本任务目标 | before → after：产品行为不变，只新增当前公开合同测试/隔离证据；不改 schema/save/资源或用户 UX。 |

最强替代解释：旧测试已证、臂为防御死路或没有当前调用者。若只能靠非法 fixture、
双强转、mock 被测核心、读私有态、过期版本或改产品才命中，则此组判 existing-proof/unreachable，
不改预期凑绿。用户/一手证据与当前假设冲突时先停对应组交 Codex。
本 wave 特定红线：不覆盖 A/B 已领表单/会话目标，不碰 `EDITOR-SCENE-FACING-1` 已知缺陷；主壳不可假冒全 E2E。

## 写入白名单、验收和交接

工作树 `/Users/zhangxu/.codex/worktrees/glm-new-f/type-pal`，分支 `codex/glm-new-f-r1`；不得占用正在运行的 A–E 工作树或同伴分支。
每个冻结源最多新增一个必要的同目录 `<stem>.glm-next-wave.test.ts(x)`；
typed fixture 仅 `packages/editor/src/__tests__/glm-next-wave/F/**`；
回执/反控/隔离宿主仅 `docs/testing/archive/legacy/batches/glm-new-waves/wave-F/**`，
截图仅 `/tmp/type-pal-glm-new-wave/F/`。
共享清单/README/判据、任务卡/看板、产品、旧测试、共享配置/依赖/锁、正式工程和官方基线只读。
正控走现行构造器/guard 与实际公开 API；负控从合法输入单点变异或公开 unknown 边界进入。
合法路径无 any/as never/双强转/@ts-ignore/@ts-expect-error；输入深快照与完整非空结果互证。
异步须 entered/deferred/finally 释放，不用固定 sleep/timeout 冒充取消证明。
本 wave 约 2–4 枚代表反控：对照 exit0、恰 exit1 业务红、绝对 file/fullName、唯一注入、
实际执行数；混错、skip、timeout、零执行、exit2 均 invalid。反控判据只写自己 wave 证据目录。
视觉：两条最小编辑器功能视觉，6091 空闲端口，1440×900/1000×720。无实际浏览器/看图时如实标未证。
只跑新测+相邻定向（maxWorkers 1）、相关包 typecheck、精确新增文件 Biome
error/warning/info 全零、docs/diff；不得降规则/加 ignore。GLM 不跑全仓 check、
官方 ratchet/受保护 fast 或 E2E，不合 main/标 done。
回执交固定完整候选 SHA、逐组旧证→新差异、新鲜 Vitest JSON file/fullName/status、
反控、截图 hash/console（若视觉）和未证/真缺陷；真产品 bug 留隔离红诊断交 Codex 另卡。
Codex 独立审核 F–J 与 A–E 并集，选择性集成，串行 check → ratchet → 受保护 fast。

准入记录：2026-09-29 Codex 核生产 hash、60 新源互斥、旧队列和 A–E 零交集；
本卡仅测试/fixture/隔离证据 build allowed。review → done 待 Codex 独立验收。

## 2026-09-29 Codex 独立审核与返工

最终 HEAD `9b0150643ee65749678780011ae0fc8380dd2034`（测试/证据提交
`38d849a170e97b59c743660f1b3c3bc7816b9bb8`）独立审核结论
**rework，未合 main**。完整[审核回执](../../../../testing/archive/legacy/batches/glm-new-waves/codex-review-F-9b015064.md)
记录 Editor typecheck 与两条功能截图成立；但 App 新测当前 HEAD 收集失败、
完整 lint 1 error、测试扩展名/反控/证据目录索引尚未闭合。GLM 只修原白名单
并推新完整 SHA；父导航由 Codex 负责，官方覆盖门暂缓。

## 历史首轮派发提示词（已执行）

```text
你是 GLM Wave F 的唯一测试 Coding Owner。只在 /Users/zhangxu/.codex/worktrees/glm-new-f/type-pal
的 codex/glm-new-f-r1 分支工作；A–E 已有人执行，绝不碰其工作树/分支。
先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、
docs/ops/tasks/TEST-GLM-NEW-F-1-editor-shell.md、docs/testing/archive/legacy/batches/glm-new-waves/README.md、targets.json，
运行 verify-targets.mjs。逐组读现行 caller 和旧断言，有新公开合同才增测试；
只改自己 wave 的同目录新测、专属 typed fixture 和专属证据。不改产品、旧测、
正式工程、官方基线或同伴分支。定向+相邻、相关 typecheck、Biome 零诊断、docs/diff、
2–4 枚反控；视觉要求：两条最小编辑器功能视觉，6091 空闲端口，1440×900/1000×720。
提交推送完整候选 SHA，回执列逐组旧证→新差异、file/fullName/status、反控、
截图 hash/console（如要求）、未证/真实红项。你不合 main、不标 done；Codex 独立验收。
```

## 历史 GLM Wave F 返工提示词（已执行）

```text
你仍是 TEST-GLM-NEW-F-1 测试 Coding Owner。只在
/Users/zhangxu/.codex/worktrees/glm-new-f/type-pal 的 codex/glm-new-f-r1 分支返工
9b0150643ee65749678780011ae0fc8380dd2034。先读本卡与 main 上
docs/testing/archive/legacy/batches/glm-new-waves/codex-review-F-9b015064.md。修 App 测试 hoisted
vi.mock 静态导入导致的收集失败，重跑完整 10 文件新测；清零完整 lint 的 JSON
格式 error；battle-trial-launch 源为 .ts，新测改 .test.ts 并更新证据；
needle-judge 所有 INVALID 也须删临时针，精确核绝对 file/fullName、failed=1、
实际执行数与产品 hash，附同一判据反例自测。wave-F 内须有 README 索引
（可把回执整理为 README）；父级共享导航由 Codex 负责，勿越界改它。
只改 Wave F 新测、专属 fixture/宿主/证据，复跑定向+相邻、editor typecheck、
完整 pnpm lint 零诊断、docs/diff 与四针；提交推送新完整 SHA。
你不合 main、不标 done；Codex 独立再审。
```

## 2026-09-29 Codex r2 候选验收

分支 HEAD `c5ecf694ed4942a42ecd7e32f5f033e785d47b69`（返工测试/证据
提交 `08371dc26d05990ca412ef80390eac703eb871de`）**代码候选 accept**，
见[独立验收回执](../../../../testing/archive/legacy/batches/glm-new-waves/codex-accept-F-r2-c5ecf694.md)。
状态为 `review`，尚未合 main；父级共享导航与统一 `pnpm check`、官方 ratchet、
受保护 fast、正式覆盖收益待 Codex 并集成门。无下一位 GLM 提示词。

## 2026-09-29 Codex 集成终态

本卡测试/证据已作为 A–J 并集进入 main `056cb6cb26dbe46e374e9121c1a2bdb94b12d990`，
见[统一集成回执](../../../../testing/archive/legacy/ops/testing-records/glm-wave-union-20260929.md)。完整 `pnpm check`、
官方 ratchet、受 `origin/main` 旧基线保护的单次 fast 均通过；完整 lint
0 error / 0 warning / 0 info，生产源码与覆盖分母不变。本卡按测试-only
验收条件由 Codex 标记 `done`。全仓 85% 目标未达（实测 78.12%），
不把该目标冒充本卡已完成的产品行为验收。

无下一位 Agent 提示词；历史派发/返工提示词仅作记录。

