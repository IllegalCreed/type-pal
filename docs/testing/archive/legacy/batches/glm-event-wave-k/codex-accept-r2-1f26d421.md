# TEST-GLM-EVENT-WAVE-K-1 · Codex r2 独立接收与正式结算

2026-09-29 结论：**accept / done**。GLM 候选
`1f26d421ab81090c83b704968973e369473d563a`（基于 main `4d34a007`）
已快进集成到 main；Codex 随后在 `f3f780ea` 只清理 K03 重复注释，并把 K05
反控回执改成实际先失败的 `speed` 断言措辞，无产品行为改动。
首轮 [4ebea2b5 的四项 counter](codex-review-4ebea2b5.md)均已逐项闭合。

| 返工项 | Codex 独立核验 |
|---|---|
| K04 无 handler | [K04 测试](../../../../../../packages/game/src/core/event-system.glm-event-k04.test.ts)在第二次执行前 `setMapReloader(null)`，并断言回调记录仍仅 `[99]`；`finally` 清理保留。 |
| 三枚反控/判据 | `--self-test` **8/8**；实际复跑 **3/3 valid**，分别变异合法 idleFrames、fade speed、sell/buy opcode，原断言不动；每针正控 exit0，反控指定绝对文件/fullName 一个 `AssertionError`、exit1、非零执行、无 skip/timeout/收集错，注入副本已删。K05 首先失败的是 `speed=1` 断言，非回执 r1 所写的 totalMs；本次已纠正文案。 |
| K03 卖出参数 | [K03 测试](../../../../../../packages/game/src/core/event-system.glm-event-k03.test.ts)撤掉 sell 的 `storeNum` 语义断言，以两个合法 operand 对照 `mode='sell'`、waiting/ip；符合 `reference/sdlpal/script.c:1168-1173` 的 `PAL_SellMenu()` 不读 operand。 |
| K06 合法战斗 ctx | [K06 测试](../../../../../../packages/game/src/core/event-system.glm-event-k06.test.ts)改用现行 `createBattleState`，玩家 0 真实存在且 caster 指向它；三态返回、giveItem 与物品入口断言保留。 |

白名单与[冻结核对](verify-targets.mjs)通过：六个新测试文件、专属证据目录，
`packages/game/src/core/event-system.ts` 1/1 SHA256 仍为
`c3332dd087e5b7b3ef5b9056c32a27d342a93d6f087c516b904ec40949868fcb`；
产品、旧测、共享配置及覆盖规则未改。交付 JSON 638/638，20 个新增 fullName×status 全通过；
Codex 独立 Game 全包 **2773/2773**、Game typecheck、全仓 lint **0 error / 0 warning / 0 info**、
docs/diff 通过。无本批视觉要求。

## main 串行质量门与收益

1. `env -u NODE_COMPILE_CACHE pnpm check` **exit 0**：七包 typecheck/test、
   docs/coverage/quality/E2E 工具测试及最终 lint 全通过；Game 2773、Reforge 1999、
   Migrate 1008、Editor 3653 等完整测试均绿；lint 2760 文件、0/0/0。
2. `env -u NODE_COMPILE_CACHE pnpm coverage:ratchet` **exit 0**：快测
   **10679** 项/730 个生产文件，新基线 `scripts/coverage/baseline.fast.json`
   SHA256 `d775d23bffa016010036bfb88b70eb3b84a2defbe178569764c50e932097dac3`。
   生产范围/分母不变；旧基线 Game 8205→新基线 8260，目标文件
   `event-system.ts` V8 分支 1281→1336，**净增 55**；全仓
   **49529→49584/63398（78.12%→78.21%）**。
3. 随后独立 `env -u NODE_COMPILE_CACHE pnpm coverage:fast` **exit 0**：
   10679 项全绿，Game 8261、全仓 **49585/63398（78.21%）**，
   比新基线再多 1，零回退。只把 ratchet 的 +55 计作正式入基线收益，
   不把第二次采样多出的 1 记为本包稳定增量。

85% **尚未达到**：同一分母 63398 下需至少 53889 条，按新基线仍差
**4305**。贡献者另报 `0x12 setObjectPosRelParty` 的 TS signed 与 C `WORD`
表示差异，涉及原版行为；本包未测试或修产品，需另行核一手证据后裁决，
不把疑点冒充已确认缺陷。

本卡为纯测试/证据，可由 Codex 按卡面验收收口；无下一位 Agent 提示词。
