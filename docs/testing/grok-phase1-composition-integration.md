# 一阶段画面合成与战斗呈现补测 — 正式接入

2026-09-25。Grok 隔离候选 `7a49d651d06292a1926174d277ca864f805a211e`（首轮 `e0d7511e`）经 Codex [独立复核](grok-phase1-composition-review.md)闭合 P15/P16 三项 counter。Grok 是测试贡献者，不算自己的独立审查者。候选基点 `bf4c51c4` 落后当前 main；本次只把通过的六个测试文件和三个 typed fixture 选择性移入 `packages/game/src/present/__tests__/grok-composition/`，不直接合旧候选分支树。

19 项均走真实 `presentFrame`、`BattlePresent.draw`、`drawBattleUI` 或 `drawDialogBox`：P11 两项、P12 四项、P13 两项、P14 三项、P15 五项（其中 roleId99 一项明确为**防御输入**）、P16 三项。P15 的预填 `disabled` 只证明绘制着色；MP 不足的真实建表由既有 `battle-system.test.ts` 覆盖，不在本包冒称。P16 无 UI 帧的数字字形有正像素断言和只漏该 fallback 的业务红。四条主调用链上的五针候选反控均经 Codex 复跑，目标标题业务 AssertionError、源文件 hash 不变；没有新产品缺陷复现。

移植只改相对导入与 Biome 排版，并把候选 `vitest.setup.ts` 的 `Date.now()=0` 移到 P15 文件的 `beforeEach/afterEach` 局部桩，防止正式套件受墙钟闪烁影响；像素预期、业务断言和产品实现均不改。正式定向 **19/19**、game typecheck、9 文件 Biome 通过。

| 统一检查 | 本席结果 |
|---|---|
| 完整 `env -u NODE_COMPILE_CACHE pnpm check` | exit0；game 2445/2445、editor 2754/2754、reforge 1610/1610、migrate 534/534，其余包、文档与工具门通过；lint 仅既有 warning/info |
| 官方受保护 `coverage:ratchet` | exit0；相对 `origin/main` 只新增六文件 **19 个 fast 身份**，旧测试无改删，641 个生产文件与七包分母不变 |
| 单次受保护严格 `coverage:fast` | exit0；**8109/8109 项、641 生产文件**，相对新基线未下降 |

相对上一 fast 基线 8090/641：语句命中 **61069→61134/80617（+65）**、分支 **43067→43134/63176（+67）**、函数 **11360→11361/15034（+1）**、行 **54995→55044/70570（+49）**；game 分支 **7731→7798/11281**。当前全仓行 **78.00%**、语句 **75.83%**、函数 **75.57%**、分支 **68.28%**。这些是正式 fast 同分母增量，不是候选局部覆盖数字。

没有改产品、旧测试、官方排除/阈值/超时或资源格式。PAL 真数据 full、浏览器剧情视觉、Q1/Q2、完整 E2E 未随本卡运行或关闭。原候选完整测试、ledger 和反控保存在远端标签 `archive/grok-present-composition-r1`（指向 `7a49d651`）；干净 worktree 与本地/远端工作分支已清理。本报告是正式测试贡献与验证入口。
