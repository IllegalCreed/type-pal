# CODE-QUALITY-90 evidence

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 CODE-QUALITY-90（phase1 game 大世界 OP_REVIVE_PLAYER 状态边界）证据目录的索引页,对应任务卡 docs/ops/tasks/CODE-QUALITY-90-magic-revive-status-boundary.md（done）。证据原件即下方逐字节保全的固定main源(7679B,SHA 2a8a30d94f14)。

## 来源与输入

来源为固定Git载体,非本次运行;本页正文无 markdown 链接(原0个链接,处置见作者review的linkDisposition)。真值与 caller: SDLPal script.c:1052-1102(单体/全体 revive 设 HP、清 level<=3 毒、移除玩家状态)、global.c:2279-2344(状态移除清 <=999、保留 >999 装备效果)、docs/phase1/game-mechanics.md:1453,1483,1517-1539(临时/装备边界与临时 DualAttack 9 移除;装备 32760 实例见 game-state.ts:1082-1085)、magic-script.ts:91-116(大世界 runner 与修复的 revive 路径)、magic-script.test.ts(真实 GameState 状态/HP/毒 oracle,含非顺序队伍与队外隔离)、event-opcode-player.ts:170-204(相邻事件脚本 revive 同用 <=999 边界)、menu-driver.ts:902-937(大世界 caller 与成功/MP 所有权)。phase2 显式效果模型不在本批,不新增 schema 字段、不改公共接口。

证据文件与关键结果: mutation-results.json(31用例原始版)与 mutation-legal-script-id-result.json(37用例合法指针版,raw 副本分别在 mutation-raw/ 与 mutation-raw-legal-script-id/,字节与本体相同)——四精确突变各恰一业务失败(999≠+0 ×3;装备哨兵 MUT-03 为 +0≠1000),恢复字节一致且无 runtime 错误;修复前重放恰2业务失败(:255/:338)。

## 断言与业务 oracle

文档事实核对(currentExecution=false):各记录按其自身字段成立。本行为切片不关闭任一完整文件: magic-script.ts 的 spell 链/不支持op/输入/步限合同、magic-script.test.ts 的毒表清理与剩余合成 fixture 仍待审,两文件在账本保持 review。phase2 区分证据只读: BattlePlayerState.status 临时回合与 grantedStatuses 装备持久层(battle-core.ts:107-111)、phase2 revive 只清 status(:604-624)、grantStatus 派生自当前装备(content/src/item.ts:36,449-462)、battle-player-input.ts:23/55 与 49-51 的接线全读——不改不关 phase2 文件。

超时与门诊断(均 officialGate=false 或按记载): gate-ratchet-timeouts 保留五处 pal-extract 5000ms CLI 超时的失败重试;未减弱任何超时/排除/基线/静态规则;不变的官方 ratchet 重试全过(731 sources/19860 tests;89.93/83.66/89.50/91.82),官方工具因三个新 game 测试+实现抬6指标改2范围。历史误标 protected fast(已撤回身份)两次在继承/默认并发下失败同样4处超时,失败与exit1回执均保留。完整 VITEST_MAX_WORKERS=2 运行过 pal-extract 71/431,但 editor 在 BattleSpriteLibrary.glm-m.test.tsx:170 失败一断言(全局env也覆盖其单worker原设);两测隔离重放 exit0 但发3条 React act 诊断(editor-probe-result: cleanQualityAcceptance=false),不是干净验收;当前完整运行用 workers=1 恢复 editor 设置并约束其它包;默认并发超时根因未知。

最新main集成: 检查点 d7e9831f4 在集成 origin/main 5116cd5bb 前推送;旧基线全检/ratchet 结果与失败保持历史证据。workers1 fast 在源同步时取消(exit130,只终止确认属主的进程树)。新 RNG 源保留未动、其新测试 pending;event-system 当前机制差异重开 review。最新 ledger 3271/370 closed/12 review/2889 pending。日志仅规范化行尾空白,失败计数与诊断保留。

合法脚本指针修正: SDLPal global.h:175-195 以 WORD 存 spell script 指针,生产解析在 spells.ts:141-142 读 u16;新 applyAll 状态示例由 77779 改 504,命令/角色/状态/断言合同不变。合法 fixture 过31用例;去清理恰2业务失败;四精确突变各一红一绿还原。新原生报告在 mutation-raw-legal-script-id/ 与 mutation-legal-script-id-result.json;原始报告保持历史。生产代码未改。既有 77777/77778/99999 fixture 与其它整文件 review 问题未解决。

最新测试合同: 旧 all-live 示例以 void 丢弃治疗 fixture 结果,现改合法 WORD 入口 504 并断言 false 与不变临时/装备状态;Spell fixture 全 typed;定向 magic 41/41、typecheck 与 Biome 过;合法输入变异重放保持四精确业务红突变与字节还原。最新官方 VITEST_MAX_WORKERS=1 coverage:ratchet 完成 731 生产文件/19,864 fast tests 但未改基线下失败: game statements 13805/15602、lines 12333/13685,total statements 70847/78780、lines 63303/68945,对比旧 d7 底 13806/15599、12332/13682、70848/78777、63302/68942。只读覆盖反事实(rng-test-scope/rng-coverage/d7-exact/d7-default-replay/game-workers2/game-default-workers 六个 result JSON): 当前源去 RNG 测试为 13804/15602;精确 d7 源快照在 worker1 与 vitest 默认设置下都复现 13801/15599;历史 d7 基线的 13806 在本环境不可复现。未改任何基线/排除/阈值/弱测试。runner 审计新增四合同(0x1C/0x1D applyAll 与无变化失败路径)+畸形 label 表与 revive 0xFFFF 哨兵负控;定向 runner 源报告覆盖 magic-script.ts 全部110语句/94行,是行为/oracle测试非凑覆盖。

边界 ratchet 回执: 四 opcode 合同与畸形输入负控后,VITEST_MAX_WORKERS=1 coverage:ratchet 通过 exit0: 731 生产文件/19,870 fast tests(game 3537),抬6指标2范围,原子写基线 SHA-256 aabca727e834…;game 13812/15602 statements、9064/11373 branches、12336/13685 lines;total 70854/78780、51557/61618、63306/68945。无阈值或排除被降。

## 结果

原文保全完整、模板符合、链接处置如实即本页治理结果;本轮语义整改把真值锚、四突变身份、超时/门时序、合法指针修正与最终基线回执写回可见正文,不重开任务、不重跑执行。不产生新执行结果。

## 限制与复核

未重跑原命令/浏览器/测试;历史结论保持原时点。gate-*.txt 日志不在本轮1916候选集合内,其数字与本目录 JSON 及任务卡交叉见证。默认并发超时根因未知、77777/77778/99999 fixture 与 magic-script 两文件的整文件 review 均未因最终 ratchet 通过而消失。候选待Owner非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 7679B / SHA-256 21328b3c69f560817eca31f652c2bd0c8aa8ef72516ccd17725eedc622648ae4；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE-QUALITY-90 evidence

Scope: phase1 `packages/game` overworld `OP_REVIVE_PLAYER` status boundary.

Primary sources and callers:

- `reference/sdlpal/script.c:1052-1102`: single/all revive sets HP, cures poison through level 3, and removes player statuses.
- `reference/sdlpal/global.c:2279-2344`: status removal clears values `<=999` and preserves `>999` equipment effects.
- `docs/phase1/game-mechanics.md:1453,1483,1517-1539`: temporary/equipment boundary and temporary DualAttack `9` removal. The equipment `32760` instance is documented in `game-state.ts:1082-1085` and preserved by SDLPal global.c guard.
- `packages/game/src/core/menu/magic-script.ts:91-116`: overworld magic runner and the repaired revive path.
- `packages/game/src/core/menu/magic-script.test.ts`: real `GameState` status/HP/poison oracle, including non-sequential party order and party-outside isolation.
- `packages/game/src/core/event-opcode-player.ts:170-204`: adjacent event-script revive implementation uses the same `<=999` boundary.
- `packages/game/src/core/menu/menu-driver.ts:902-937`: overworld magic caller and success/MP ownership.

The phase2 explicit effect/status model is out of scope. This batch preserves the phase1 SDLPal sentinel contract and does not add schema fields or alter public interfaces.

Mutation evidence is in `mutation-results.json` and `mutation-raw/`. Four exact source mutants each produced one business assertion failure, restored to a byte-identical source, and did not produce runtime errors.

## Scope limits and remaining review

This behavioral slice does not close either complete file. `magic-script.ts` still needs current production spell-chain, unsupported-op, input and step-limit contract audit. `magic-script.test.ts` now uses an assertionful all-live applyAll status oracle and a complete public `Spell` fixture; poison-table cleanup, remaining synthetic fixtures and the full runner contract still require review. Both files remain `review` in the file ledger.

Phase2 uses `BattlePlayerState.status` for temporary turns and a separate `grantedStatuses` collection for equipment-derived persistent status (`battle-core.ts:107-111`). Phase2 revive clears only `status` (`:604-624`); equipment `grantStatus` is derived from current equipment (`content/src/item.ts:36,449-462`). None of those phase2 files are modified or closed by this batch.

`gate-ratchet-timeouts.txt` preserves the failed retry with five pal-extract 5000ms CLI timeouts. No timeout, exclusion, baseline or static rule was weakened; the unchanged official ratchet retry passed completely (731 sources / 19860 tests; 89.93/83.66/89.50/91.82). The official tool raised 6 metric entries and changed 2 scope entries from the three new game tests and the implementation, with other packages unchanged. The historical check:fast logs, incorrectly labelled protected fast and now withdrawn, failed the same four pal-extract CLI 5000ms timeouts twice at the inherited/default concurrency. Both failures and exit1 receipts are retained. The complete `VITEST_MAX_WORKERS=2 pnpm check:fast` run passed pal-extract71/431, but editor failed one assertion at BattleSpriteLibrary.glm-m.test.tsx:170; the global env also overrides its original one-worker setting. A two-test isolated replay exited0 but emitted3 React act diagnostics, so is not clean acceptance. Failures and probe receipts remain separate. The current complete run uses `VITEST_MAX_WORKERS=1` to restore the editor setting and constrain other packages. Tests, 5000ms timeouts, exclusions, assertions and static rules are unchanged; the default-concurrency timeout root cause remains unknown.

Phase2 live wiring was also read in full at `packages/reforge/src/battle/battle-player-input.ts`: `effectiveGrantedStatuses` at lines 23/55 supplies the separate equipment layer, while carried temporary states enter through `carriedStatuses` at lines 49-51. This is phase-distinction evidence only, without phase2 modifications or file closure.

## Latest-main integration

Review checkpoint d7e9831f4 was pushed before integrating origin/main 5116cd5bb. Old-base full-check/ratchet results and failures remain historical evidence. The workers1 fast run was cancelled at source synchronization (exit130), using only its confirmed owned process tree. New RNG source is retained unchanged and its new test is pending; event-system current mechanism delta is reopened review. Latest ledger: 3271 / 370 closed / 12 review / 2889 pending. Latest-base quality gates remain required. Logs have only trailing whitespace normalized; failure counts and diagnostics are preserved.

## Legal script-pointer correction

SDLPal global.h:175-195 stores spell script pointers as WORD; the production parser reads u16 at spells.ts:141-142. The new applyAll status example used77779 and now uses504, with the same command/role/status/assertion contract. The legal fixture passes31 cases; removing cleanup produces exactly2 business failures and each of4 exact mutants produces one business failure then a green restore. New native reports are in `mutation-raw-legal-script-id/`, with `mutation-legal-script-id-result.json`; original reports remain historical. Production code is unchanged. Existing77777/77778/99999 fixtures and the other whole-file review issues remain unresolved.


## Latest test-contract and coverage evidence

The former all-live applyAll example called the healing fixture and discarded its result with `void`; it now uses legal WORD script entry `504` and asserts `false` plus unchanged temporary/equipment status. The `Spell` fixture is fully typed. Targeted magic tests are 41/41, game typecheck and Biome pass, and the legal-input mutation replay keeps four exact business red mutants with byte-identical restoration.

The latest official `VITEST_MAX_WORKERS=1 pnpm coverage:ratchet` completed all 731 production files and 19,864 fast tests but failed without changing the baseline: game statements `13805/15602` and lines `12333/13685`, total statements `70847/78780` and lines `63303/68945`, versus the old d7 floor `13806/15599`, `12332/13682`, `70848/78777`, `63302/68942`. Receipt: `gate-ratchet-current.txt` and `gate-ratchet-current.exit`.

Read-only coverage counterfactuals found the current source without the RNG test at `13804/15602` statements, while exact d7 source snapshots reproduce `13801/15599` under both worker-one and Vitest-default settings; the historical d7 baseline's `13806` is not reproducible in this environment. No baseline, exclusion, threshold, or weak test was changed. Native result JSON: `rng-test-scope-diagnostic-result.json`, `rng-coverage-diagnostic-result.json`, `d7-exact-replay-result.json`, `d7-default-replay-result.json`, `game-default-workers-diagnostic-result.json`, `game-workers2-diagnostic-result.json`.


The full runner audit added four contracts for 0x1C/0x1D applyAll and no-change failure paths, plus malformed label-table and revive `0xFFFF` sentinel negatives. The targeted runner source report now covers all 110 statements and 94 lines in `magic-script.ts`; these are behavior/oracle tests, not coverage-only filler.


## Boundary ratchet receipt

After the four opcode contracts and malformed-input negatives, `VITEST_MAX_WORKERS=1 pnpm coverage:ratchet` passed at exit 0. It ran 731 production files / 19,870 fast tests (game 3537), raised six metric entries and two scope entries, and atomically wrote baseline SHA-256 `aabca727e834ab4f3c5700ca940208a78a7cc81ee60c8fb4eaa866efd4dc15ce`. Game is `13812/15602` statements, `9064/11373` branches, `12336/13685` lines; total is `70854/78780`, `51557/61618`, `63306/68945`. No threshold or exclusion was lowered.
```
<!-- incremental-original-source:end -->
