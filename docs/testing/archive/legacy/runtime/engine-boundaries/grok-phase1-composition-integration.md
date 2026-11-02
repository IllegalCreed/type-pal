# 一阶段画面合成与战斗呈现补测 — 正式接入

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 Grok 一阶段画面合成与战斗呈现补测的正式接入回执（2026-09-25：隔离候选 7a49d651…211e 经独立复核闭合 P15/P16 三项 counter 后，Codex 选择性移入 packages/game/src/present/__tests__/grok-composition/，不合旧候选分支树；候选基点 bf4c51c4 落后 main）。

## Scope

- 19 项均走真实 presentFrame、BattlePresent.draw、drawBattleUI 或 drawDialogBox：P11 两项/P12 四项/P13 两项/P14 三项/P15 五项（roleId99 一项明确防御输入——预填 disabled 只证绘制着色，MP 不足真实建表由既有 battle-system.test 覆盖不在本包冒称）/P16 三项（无 UI 帧数字字形有正像素断言和只漏该 fallback 的业务红）。

## Execution and assertions

- **移植与验证**：只改相对导入与 Biome 排版；候选 vitest.setup 的 Date.now=0 移到 P15 文件 beforeEach/afterEach 局部桩防墙钟闪烁；像素预期/业务断言/产品实现均不改；正式定向 19/19+game typecheck+9 文件 Biome 通过；五针候选反控 Codex 复跑目标标题业务 AssertionError 源 hash 不变
- **统一门**：env -u NODE_COMPILE_CACHE 完整 check exit0（game 2,445/editor 2,754/reforge 1,610/migrate 534）；官方受保护 ratchet exit0：相对 origin/main 只新增六文件 19 个 fast 身份旧测试无改删、641 生产文件与七包分母不变；单次受保护严格 fast exit0 8,109/8,109 与新基线未下降
- **覆盖增量**：相对上一基线 8,090/641：语句 +65/分支 +67/函数 +1/行 +49；game 分支 7,731→7,798；全仓行 78.00%/语句 75.83%/函数 75.57%/分支 68.28%；正式 fast 同分母增量非候选局部数字

## Results

- 没有改产品/旧测试/官方排除阈值超时/资源格式；PAL full/浏览器剧情视觉/Q1/Q2/完整 E2E 未随本卡运行；原候选保远端标签 archive/grok-present-composition-r1；干净 worktree 与分支已清理。

## Evidence

- 证据路径：本报告正文（quote 保全）；统一检查表在 quote。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| 正式接入 | 2026-09-25 | 19 项+五针+三门 | 完成（正式测试贡献与验证入口） | P15/P16 counter 闭合 |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy runtime/engine-boundaries 的 Grok 合成接入回执；固定来源与 source SHA 见下方保全节。

## 原始结论

done：19 项四真实调用链+五针+三门 exit0（fast 8,109）；时钟桩局部化；四维增量分列。

## 当时证据

19 项分组、统一检查表与覆盖增量在 quote 保全。

## 当前有效性

historical。接入按当时 main。

## 继任文档

当前结论归官方覆盖账。

## 原文保全

固定源 revision `aebc1cb249a606a5202a7f00247c099dace0b2eb`，source SHA `be820f7a58d3053a6eb26d8b826a05aeab2ad770c712d3498d32b9409bf696ac`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # 一阶段画面合成与战斗呈现补测 — 正式接入
>
> 2026-09-25。Grok 隔离候选 `7a49d651d06292a1926174d277ca864f805a211e`（首轮 `e0d7511e`）经 Codex [独立复核](grok-phase1-composition-review.md)闭合 P15/P16 三项 counter。Grok 是测试贡献者，不算自己的独立审查者。候选基点 `bf4c51c4` 落后当前 main；本次只把通过的六个测试文件和三个 typed fixture 选择性移入 `packages/game/src/present/__tests__/grok-composition/`，不直接合旧候选分支树。
>
> 19 项均走真实 `presentFrame`、`BattlePresent.draw`、`drawBattleUI` 或 `drawDialogBox`：P11 两项、P12 四项、P13 两项、P14 三项、P15 五项（其中 roleId99 一项明确为**防御输入**）、P16 三项。P15 的预填 `disabled` 只证明绘制着色；MP 不足的真实建表由既有 `battle-system.test.ts` 覆盖，不在本包冒称。P16 无 UI 帧的数字字形有正像素断言和只漏该 fallback 的业务红。四条主调用链上的五针候选反控均经 Codex 复跑，目标标题业务 AssertionError、源文件 hash 不变；没有新产品缺陷复现。
>
> 移植只改相对导入与 Biome 排版，并把候选 `vitest.setup.ts` 的 `Date.now()=0` 移到 P15 文件的 `beforeEach/afterEach` 局部桩，防止正式套件受墙钟闪烁影响；像素预期、业务断言和产品实现均不改。正式定向 **19/19**、game typecheck、9 文件 Biome 通过。
>
> | 统一检查 | 本席结果 |
> |---|---|
> | 完整 `env -u NODE_COMPILE_CACHE pnpm check` | exit0；game 2445/2445、editor 2754/2754、reforge 1610/1610、migrate 534/534，其余包、文档与工具门通过；lint 仅既有 warning/info |
> | 官方受保护 `coverage:ratchet` | exit0；相对 `origin/main` 只新增六文件 **19 个 fast 身份**，旧测试无改删，641 个生产文件与七包分母不变 |
> | 单次受保护严格 `coverage:fast` | exit0；**8109/8109 项、641 生产文件**，相对新基线未下降 |
>
> 相对上一 fast 基线 8090/641：语句命中 **61069→61134/80617（+65）**、分支 **43067→43134/63176（+67）**、函数 **11360→11361/15034（+1）**、行 **54995→55044/70570（+49）**；game 分支 **7731→7798/11281**。当前全仓行 **78.00%**、语句 **75.83%**、函数 **75.57%**、分支 **68.28%**。这些是正式 fast 同分母增量，不是候选局部覆盖数字。
>
> 没有改产品、旧测试、官方排除/阈值/超时或资源格式。PAL 真数据 full、浏览器剧情视觉、Q1/Q2、完整 E2E 未随本卡运行或关闭。原候选完整测试、ledger 和反控保存在远端标签 `archive/grok-present-composition-r1`（指向 `7a49d651`）；干净 worktree 与本地/远端工作分支已清理。本报告是正式测试贡献与验证入口。
>
<!-- original-source-quote:end -->
