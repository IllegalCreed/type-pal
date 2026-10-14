# CODE-QUALITY-92 — protected-fast command correction

The historical CODE83–89/CODE91 logs execute `pnpm check:fast`; that command is not the required baseline-protected coverage gate. The actual gate is `TYPE_PAL_COVERAGE_BASE_REF=origin/main pnpm coverage:fast`.

`affected-files.txt` lists 30 current ledger records temporarily reopened review. Their prior semantic reads and actual historical logs remain unchanged. Current source snapshots must match the individual closure source before a passing protected-coverage run can restore closure. A package-green run alone cannot close these files.

Primary source: `scripts/coverage/run.mjs:403-462,526-558` and the earlier CODE48 task's explicit command. No production code, tests, thresholds, exclusions or assertions are changed by this correction.


## Latest protected fast receipt

`TYPE_PAL_COVERAGE_BASE_REF=origin/main VITEST_MAX_WORKERS=1 pnpm coverage:fast` completed all seven packages (731 production files / 19,864 tests), with native package tests green, then failed closed on the protected scope check: `test-file: packages/game/src/core/event-rng-scene-restore.test.ts` is present on origin/main but absent from the candidate baseline. The same run reports game `13805/15602` statements and total `70847/78780` statements, so after the RNG scope is reconciled the exact coverage-floor regressions remain. Receipt: `protected-fast-current.txt`, `protected-fast-current.exit`. Thirty prior closures remain review.
