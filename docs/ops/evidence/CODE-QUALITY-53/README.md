# CODE-QUALITY-53 candidate evidence

The task remains build; these records do not close whole files or authorize integration.

- `reconstructed-negative-control.json`: three focused typed tests against reconstructed HEAD production sources (0x29 slot write, 0x61 slot read, status runtime zero). Each run has one business AssertionError, source/test hashes and the same test passing after byte-for-byte restoration. These are post-implementation replays, not evidence of red-first chronology.
- `slot-regression-red.txt`: actual failures recorded before correcting duplicate-role consumers: battle HP 180 rather than190, duplicate status-page poison, duplicate inspect poison.
- `slot-regression-green.txt`: the adjacent 5-file / 378-test rerun after those corrections.
- `slot-negative-controls.json`: three individually reconstructed consumer regressions, each with one business AssertionError and the same test passing after byte-for-byte restoration. The combined first-red log is regression evidence, not three independently qualified mutation needles.

The earlier uncommitted two-file replay used weaker fixtures and has been superseded by the typed records; it is not delivered as acceptance evidence. CODE53/CODE79 record remaining lifecycle, full-file, and 0x61 mechanism work.

`first-poison-entry.json` records read-only extracted-data hashes and all 12 literal-0x29-referenced player-poison first invocations. No generated assets were edited; this bounded scan does not prove arbitrary injected catalogs or later resumed scripts safe.

`candidate-source-sha256.json` records the 25 changed game source/test files used by this checkpoint's gates. `gate-check.txt` preserves the complete root check output: exit 0 with all package tests passing and static lint at zero diagnostics, but two jsdom navigation messages still prevent unified zero-diagnostic acceptance. `gate-ratchet.txt` preserves the official exit-1 ratchet result; no baseline was lowered. These are checkpoint evidence, not a closed batch or merge approval.

`gate-results.json` records command, environment, start/end and exit for the serial check/ratchet/protected-fast/lint/ledger run. Its original local log paths correspond to the bundled `gate-*.txt` files. Protected fast also exited 1 for the same coverage regression. Static lint exited 0 with all error/warning/info counts zero; ledger remained 338 closed / 10 review / 2919 pending. Final documentation/static checks are recorded separately after these receipts were saved. No E2E, browser visual verification or hosted CI acceptance is claimed.

The bundled green regression log omits its final empty line, and the two coverage logs omit trailing table-padding spaces only; diagnostic messages, values and result lines are retained. `final-docs.txt` and `final-lint.txt` are the successful final documentation and static-check outputs (lint: 4000 files, zero errors/warnings/infos).
