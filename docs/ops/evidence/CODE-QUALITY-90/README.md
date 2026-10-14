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

This behavioral slice does not close either complete file. `magic-script.ts` still needs current production spell-chain, unsupported-op, input and step-limit contract audit. `magic-script.test.ts` contains an existing assertion-free pseudo applyAll case, an incomplete `as unknown as Spell` fixture, and poison-table cleanup requiring review. Both files remain `review` in the file ledger.

Phase2 uses `BattlePlayerState.status` for temporary turns and a separate `grantedStatuses` collection for equipment-derived persistent status (`battle-core.ts:107-111`). Phase2 revive clears only `status` (`:604-624`); equipment `grantStatus` is derived from current equipment (`content/src/item.ts:36,449-462`). None of those phase2 files are modified or closed by this batch.

`gate-ratchet-timeouts.txt` preserves the failed retry with five pal-extract 5000ms CLI timeouts. No timeout, exclusion, baseline or static rule was weakened; the unchanged official ratchet retry passed completely (731 sources / 19860 tests; 89.93/83.66/89.50/91.82). The official tool raised 6 metric entries and changed 2 scope entries from the three new game tests and the implementation, with other packages unchanged. Protected fast failed the same four pal-extract CLI 5000ms timeouts twice at the inherited/default concurrency. Both failures and exit1 receipts are retained. The complete `VITEST_MAX_WORKERS=2 pnpm check:fast` run passed pal-extract71/431, but editor failed one assertion at BattleSpriteLibrary.glm-m.test.tsx:170; the global env also overrides its original one-worker setting. A two-test isolated replay exited0 but emitted3 React act diagnostics, so is not clean acceptance. Failures and probe receipts remain separate. The current complete run uses `VITEST_MAX_WORKERS=1` to restore the editor setting and constrain other packages. Tests, 5000ms timeouts, exclusions, assertions and static rules are unchanged; the default-concurrency timeout root cause remains unknown.

Phase2 live wiring was also read in full at `packages/reforge/src/battle/battle-player-input.ts`: `effectiveGrantedStatuses` at lines 23/55 supplies the separate equipment layer, while carried temporary states enter through `carriedStatuses` at lines 49-51. This is phase-distinction evidence only, without phase2 modifications or file closure.

## Latest-main integration

Review checkpoint d7e9831f4 was pushed before integrating origin/main 5116cd5bb. Old-base full-check/ratchet results and failures remain historical evidence. The workers1 fast run was cancelled at source synchronization (exit130), using only its confirmed owned process tree. New RNG source is retained unchanged and its new test is pending; event-system current mechanism delta is reopened review. Latest ledger: 3271 / 370 closed / 12 review / 2889 pending. Latest-base quality gates remain required. Logs have only trailing whitespace normalized; failure counts and diagnostics are preserved.
