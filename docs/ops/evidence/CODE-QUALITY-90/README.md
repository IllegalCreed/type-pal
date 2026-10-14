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
