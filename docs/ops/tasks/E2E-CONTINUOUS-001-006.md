# E2E-CONTINUOUS-001-006 — 双轨连续主线演示与演出差异治理

Status: build
Phase: phase2
Capability: C1 / E2E
Coding Owner: Codex
Reviewer: Codex（独立验收）

## 目标

先建立“现象优先”的双轨状态对比门禁，再修复当前双轨实跑暴露的三类用户可见差异，并建立不依赖逐碎片修改的连续主线演示：第一阶段与 Reforge 左右分屏、同一语义检查点同步，只跑 001–006 story 主线，不混入 guards/items/saves 专项。三处已知差异暂作为回归样本，不得先用内容修补把样本抹掉。

连续模式的边界已明确：每个碎片的独立验收继续保留真实前驱读档、正文、正式存档和读回；连续演示复用同一片段执行体，只关闭碎片边界的 load/save，在同一引擎页面内把上一段的内存世界直接交给下一段。它不是拼接报告，也不是复制每个碎片脚本。

## 前提真值矩阵

| 维度 | 结论 | 一手证据 |
|---|---|---|
| 原版/第一阶段规避 | NPC 触碰主角后存在实际推离提交，且不是玩家输入步 | `packages/game/src/core/scene-system.ts:276` `pushPartyAwayFromBlockingNpcs`；当前 `game-002` trace 的 actor/party 提交 |
| 当前 Reforge 规避 | authored `moveEntity` 使用 `scriptedBypass`，动态 sidestep 不覆盖该来源，且没有 post-contact 分离 | `packages/reforge/src/motion-runtime-wiring.ts:14`；`packages/reforge/src/main.ts` motion batch |
| 004 随从移动 | 第一阶段 e26 位移提交约每 100ms；Reforge e26 的 6 次 nudge 同一调度批集中执行 | 当前 `game-004-story/004-story.trace.json` vs `reforge-004-story/004-story.trace.json` |
| 005 张四转身 | 第一阶段张四对白前出现 `left → right` 实际朝向提交；Reforge e123 对应正文缺少显式转身 | 当前 `game-005-story/005-latest.trace.json`；`projects/pal/content/scenes/s005.json` e123 |
| 本任务目标 | 状态变更日志先于脚本指令成为比较入口；连续演示复用通用片段注册/检查点，不改每个碎片验收脚本来“拼接”；主线画面可左右分屏且同步推进 | 用户 2026-10-04 指定 |

## 替代解释与反证

- 若 Reforge 实际 trace 已存在 post-contact party 位移，则规避项改为观测器/录制缺口；当前代码与 trace 尚未观察到，先修运行时合同。
- 若 e26 连续位移是浏览器采样压缩而非真实脚本同批执行，则加入独立 motion commit 时序断言；当前 trace 的提交时间已显示同一毫秒级批次，且正文没有 wait。
- 若张四朝向来自渲染层而非脚本正文，则在 render/commit 双层 trace 交叉核验，不盲加内容命令。

## 白名单与验收

- 运行时：状态日志只读取实际提交/呈现边界；后续才允许处理 Reforge motion contact resolver、continuous demo orchestration；不得改变通用 authored movement 的 bypass 语义。
- 内容：`projects/pal/content/scenes/s001.json` e15 随从移动等待、`s005.json` e123 张四转身；不得恢复旧迁移核或增加自动行为承载剧情跳转。
- E2E：连续主线 runner 复用各 fragment 的语义动作/观察器；每段记录 scene 中实际出现的全部实体、位置、朝向、显隐、状态、精灵/帧、对白和控制权；缺少帧/控制权证据直接报 evidence-gap，专项 case 仍独立运行。对比器从状态变化推断接触/节奏，脚本 source 只作解释字段。
- 视觉：两窗口等宽完整画布、同一检查点后再共同前进；检查 002 碰撞推离、004 随从连续移动、005 张四转身。
- 质量：lint/typecheck/docs/content/相关测试零诊断；旧 `pnpm check` migrate 存量必须单列，不以新告警豁免。

## 当前证据锚点

- 002：`build/e2e/game-002-2026-10-04T03-40-12-965Z/inn-trace.json`、`build/e2e/reforge-002-2026-10-04T03-40-12-955Z/inn-trace.json`
- 004：`build/e2e/game-004-story-2026-10-04T03-42-13-225Z/004-story.trace.json`、`build/e2e/reforge-004-story-2026-10-04T03-42-13-209Z/004-story.trace.json`
- 005：`build/e2e/game-005-story-2026-10-04T03-45-14-683Z/005-latest.trace.json`、`build/e2e/reforge-005-story-2026-10-04T03-45-14-643Z/005-latest.trace.json`

## 推进记录

- 2026-10-04 Codex：build allowed；用户已明确主线演示只跑 story，不展示专项分支。
- 2026-10-04 Codex：按用户要求暂停三处内容修复，先落状态优先比较器。`scripts/e2e/npc-transition-contract.mjs` 从 trace 中自动枚举两边实际出现的全部 actor，统一像素/瓦片坐标、位置位移/节奏、显隐、状态、朝向、帧/精灵、对白增量和控制权；接触由“稳定后的小位移 + 邻近可见 NPC”推断，不读取脚本函数名；缺帧/缺控制权记为 `evidence-gap`。`npc-transition-contract.test.mjs` 5 项合同测试通过；001–005 旧 trace 作为故意红样本时，002 的 e56 朝向/接触、004 的 e26 位移/状态/帧差异、005 的 e123 朝向及其它观察差异均被识别（所有 `findings` 都是未收口项）。三处内容仍未修改。
- 2026-10-04 Codex：当前 canonical 独立重跑证据：001、002、003、004 story、005 story 均可独立走通；002 状态门禁已抓到 e56 朝向差异，004 在加入 e26 nudge 间隔后移动节奏收敛，005 张四朝向门禁收敛。新增 `continuous-story.mjs`：六段 story registry、`load:false/save:false` 连续边界上下文、双轨 barrier、story-only action 提取；纯合同测试通过。连续 runner 尚未完成真实浏览器串行演示，任务保持 build。
