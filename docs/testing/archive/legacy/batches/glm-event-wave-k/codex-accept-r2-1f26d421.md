# TEST-GLM-EVENT-WAVE-K-1 · Codex r2 独立接收与正式结算

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 TEST-GLM-EVENT-WAVE-K-1 r2 的 Codex 独立接收与正式结算：候选 1f26d421（基于 main 4d34a007）快进集成 main，后续 f3f780ea 仅清理 K03 重复注释并纠正 K05 反控回执措辞；结论 accept/done；首轮 4ebea2b5 四项 counter 均闭合。

## Scope

四项返工闭合：K04 测试在第二次执行前 setMapReloader(null) 断言回调记录仍仅 [99]；三枚反控 --self-test 8/8、复跑 3/3 valid（变异合法 idleFrames/fade speed/sell-buy opcode，K05 首败为 speed=1 断言非回执 r1 所写 totalMs）；K03 撤 sell 的 storeNum 语义断言以两合法 operand 对照 mode/sell/waiting/ip（合 sdlpal script.c:1168-1173 PAL_SellMenu 不读 operand）；K06 改用现行 createBattleState 玩家 0 真实存在。冻结核对六新测试文件+event-system.ts 1/1 SHA 不变。

## Execution and assertions

| step | legal input | caller | machine assertion | business oracle |
|---|---|---|---|---|
| - main 串行门 | pnpm check exit0（Game 2773/Reforge 1999/Migrate 1008/Editor 3653；lint 2760 文件 0/0/0） | coverage:ratchet exit0+独立 coverage:fast exit0 | 快测 10679 项/730 生产文件；event-system.ts V8 分支 1281→1336 净 +55 入基线；全仓 49529→49584/63398（78.12%→78.21%），二次采样多 1 不记增量 | 85% 未达：同分母需 53889，按新基线仍差 4305 |

## Results

历史结果（原卡时点，本页未复跑）：

accept/done：候选集成 main；ratchet +55 分支入基线；0x12 setObjectPosRelParty TS signed 与 C WORD 表示差异登记未测试未裁决，不冒充已确认缺陷。

## Evidence

- 证据路径：本结算正文（quote 保全）；白名单核对、交付 JSON 638/638 与 Game 全包数字在 quote。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| r2 接收+结算 | 2026-09-29 | 四 counter 闭合+集成 main | accept→done | r1 counter |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy batches/glm-event-wave-k 的 r2 接收结算回执；固定来源与 source SHA 见下方保全节。

## 原始结论

accept/done：候选集成 main；ratchet +55 分支入基线；0x12 setObjectPosRelParty TS signed 与 C WORD 表示差异登记未测试未裁决，不冒充已确认缺陷。

## 当时证据

四返工核对表、冻结核对、串行门与覆盖率数字在 quote 保全。

## 当前有效性

historical。覆盖率与测试计数为 2026-09-29 时点。

## 继任文档

当前结论归 TEST-GLM-EVENT-WAVE-K-1 完成卡。

## 2026-10-31 历史链接去向

K04 原文件已按职责拆分；本轮只把 quote 内唯一 K04 链接改为固定 Git 地址，其他原字节不改；直接逆回已不相等，不能沿用旧无条件保全声明。历史代码可从[原候选冻结文件](https://github.com/IllegalCreed/type-pal/blob/1f26d421ab81090c83b704968973e369473d563a/packages/game/src/core/event-system.glm-event-k04.test.ts)核读，当前去向见[事件转换重组记录](../../../../../tasks/evidence/QUALITY-PENDING-100-3/organization-event-transitions.json)。精确逆回须先将上面 Git 地址替换为 `../../../../../../packages/game/src/core/event-system.glm-event-k04.test.ts`（恰一次）再剥 quote；不 trim、不换行归一化。原接受版本仍可从固定 S79 Git blob 回读；本次变更待独立验收。后续模板迁移以固定 Git 原文围栏保全。


## 原文保全

固定源 revision `b9af6517a6298e0fb247b97a3b653294d6b45fa2`，source SHA `7d3e86779215e03dace2408715e9ca824bed5c17d124545e3edef1b6fec52055`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # TEST-GLM-EVENT-WAVE-K-1 · Codex r2 独立接收与正式结算
>
> 2026-09-29 结论：**accept / done**。GLM 候选
> `1f26d421ab81090c83b704968973e369473d563a`（基于 main `4d34a007`）
> 已快进集成到 main；Codex 随后在 `f3f780ea` 只清理 K03 重复注释，并把 K05
> 反控回执改成实际先失败的 `speed` 断言措辞，无产品行为改动。
> 首轮 [4ebea2b5 的四项 counter](codex-review-4ebea2b5.md)均已逐项闭合。
>
> | 返工项 | Codex 独立核验 |
> |---|---|
> | K04 无 handler | [K04 测试](https://github.com/IllegalCreed/type-pal/blob/1f26d421ab81090c83b704968973e369473d563a/packages/game/src/core/event-system.glm-event-k04.test.ts)在第二次执行前 `setMapReloader(null)`，并断言回调记录仍仅 `[99]`；`finally` 清理保留。 |
> | 三枚反控/判据 | `--self-test` **8/8**；实际复跑 **3/3 valid**，分别变异合法 idleFrames、fade speed、sell/buy opcode，原断言不动；每针正控 exit0，反控指定绝对文件/fullName 一个 `AssertionError`、exit1、非零执行、无 skip/timeout/收集错，注入副本已删。K05 首先失败的是 `speed=1` 断言，非回执 r1 所写的 totalMs；本次已纠正文案。 |
> | K03 卖出参数 | [K03 测试](../../../../../../packages/game/src/core/event-system.glm-event-k03.test.ts)撤掉 sell 的 `storeNum` 语义断言，以两个合法 operand 对照 `mode='sell'`、waiting/ip；符合 `reference/sdlpal/script.c:1168-1173` 的 `PAL_SellMenu()` 不读 operand。 |
> | K06 合法战斗 ctx | [K06 测试](../../../../../../packages/game/src/core/event-system.glm-event-k06.test.ts)改用现行 `createBattleState`，玩家 0 真实存在且 caster 指向它；三态返回、giveItem 与物品入口断言保留。 |
>
> 白名单与[冻结核对](verify-targets.mjs)通过：六个新测试文件、专属证据目录，
> `packages/game/src/core/event-system.ts` 1/1 SHA256 仍为
> `c3332dd087e5b7b3ef5b9056c32a27d342a93d6f087c516b904ec40949868fcb`；
> 产品、旧测、共享配置及覆盖规则未改。交付 JSON 638/638，20 个新增 fullName×status 全通过；
> Codex 独立 Game 全包 **2773/2773**、Game typecheck、全仓 lint **0 error / 0 warning / 0 info**、
> docs/diff 通过。无本批视觉要求。
>
> ## main 串行质量门与收益
>
> 1. `env -u NODE_COMPILE_CACHE pnpm check` **exit 0**：七包 typecheck/test、
>    docs/coverage/quality/E2E 工具测试及最终 lint 全通过；Game 2773、Reforge 1999、
>    Migrate 1008、Editor 3653 等完整测试均绿；lint 2760 文件、0/0/0。
> 2. `env -u NODE_COMPILE_CACHE pnpm coverage:ratchet` **exit 0**：快测
>    **10679** 项/730 个生产文件，新基线 `scripts/coverage/baseline.fast.json`
>    SHA256 `d775d23bffa016010036bfb88b70eb3b84a2defbe178569764c50e932097dac3`。
>    生产范围/分母不变；旧基线 Game 8205→新基线 8260，目标文件
>    `event-system.ts` V8 分支 1281→1336，**净增 55**；全仓
>    **49529→49584/63398（78.12%→78.21%）**。
> 3. 随后独立 `env -u NODE_COMPILE_CACHE pnpm coverage:fast` **exit 0**：
>    10679 项全绿，Game 8261、全仓 **49585/63398（78.21%）**，
>    比新基线再多 1，零回退。只把 ratchet 的 +55 计作正式入基线收益，
>    不把第二次采样多出的 1 记为本包稳定增量。
>
> 85% **尚未达到**：同一分母 63398 下需至少 53889 条，按新基线仍差
> **4305**。贡献者另报 `0x12 setObjectPosRelParty` 的 TS signed 与 C `WORD`
> 表示差异，涉及原版行为；本包未测试或修产品，需另行核一手证据后裁决，
> 不把疑点冒充已确认缺陷。
>
> 本卡为纯测试/证据，可由 Codex 按卡面验收收口；无下一位 Agent 提示词。
>
<!-- original-source-quote:end -->
