# CODE-QUALITY-92 — protected-fast command correction

The historical CODE83–89/CODE91 logs execute `pnpm check:fast`; that command is not the required baseline-protected coverage gate. The actual gate is `TYPE_PAL_COVERAGE_BASE_REF=origin/main pnpm coverage:fast`.

`affected-files.txt` lists 30 current ledger records temporarily reopened review. Their prior semantic reads and actual historical logs remain unchanged. Current source snapshots must match the individual closure source before a passing protected-coverage run can restore closure. A package-green run alone cannot close these files.

Primary source: `scripts/coverage/run.mjs:403-462,526-558` and the earlier CODE48 task's explicit command. No production code, tests, thresholds, exclusions or assertions are changed by this correction.
