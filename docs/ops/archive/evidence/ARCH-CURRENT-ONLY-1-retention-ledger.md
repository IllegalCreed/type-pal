# ARCH-CURRENT-ONLY-1 current-only retention ledger

Date: 2026-08-20

Source branch: `codex/arch-current-only-1`

Status: G0 frozen; implementation dispositions below are the build contract.

## Version axes

| axis | examples | decision |
|---|---|---|
| Product content epoch | content12/13/14/15/16, loader-v13/v14/v16, save content epoch | Only serialized `contentVersion: 16` remains. Product code uses direct current types and behavior; old epochs are deleted. |
| Current script semantics | former `AuthorCommandV5` base + v13 lifecycle + v14 dialogue identity | This is current behavior, not historical compatibility. Fold all three layers into one unversioned author-script domain; preserve behavior, not V5/V13/V14 product names or delegation. |
| Current save envelope | SAVE8/content16 | Keep the serialized `version: 8` and `contentVersion: 16`; delete old payload unions and migration branches. |
| Local file schema | `ProjectMap.version=4`, `AssetCatalog.version=1`, authoring/stamp/script chunk V1 | Keep. These are current file contracts, not product epochs, and are not renumbered for cosmetic consistency. |
| Raw-source migration implementation | generic migration transaction/baseline/write-plan and PAL raw extract transforms | Keep only the direct raw-source -> current producer and current publication proof. Delete intermediate development epochs, rewind chains and published-old-version fixtures. |
| Platform/third-party compatibility | browser, filesystem, media decoders | Out of this task; not “old project compatibility”. |

## Explicit current-axis allowlist

The final static gate classifies these names as current contracts or provenance rather than product epochs. They remain only in the
listed role; none authorizes an old project/save reader or product fallback.

| name / family | current meaning | allowed scope |
|---|---|---|
| `ProjectMap.version = 4` | current map-file schema | content/editor/reforge map IO |
| `AssetCatalogV1.version = 1` | current asset-catalog file schema | content/editor/reforge/migrate catalog IO |
| `ScriptChunkV1`, `ScriptIndexV1`, `ScriptRef { chunk, id }` | current chunked raw/local script file schema | current local projection and PAL raw-source tooling |
| `legacy-migrated` | immutable asset origin/provenance label; files themselves are in the canonical catalog | asset record metadata and decoder strictness selection only |
| migration diagnostic `source.kind = legacy-script` | provenance for unresolved PAL raw-script facts | current diagnostic records only; never a product loader branch |
| `skippedLegacyTailSlots` | media-decoder evidence about malformed source tails | strict source decoding/audit only; no old project schema path |
| IndexedDB `onupgradeneeded` | browser database lifecycle callback | editor/save platform storage only |
| PAL raw `legacy-dialog` helper | direct original-event decoding before current publication | `packages/migrate` only, with current publication as sole downstream boundary |

## Product code disposition

| surface | current role | disposition | exit evidence |
|---|---|---|---|
| `content/script-v5.ts` + `script-v13.ts` + `script-v14.ts` | Current author command, lifecycle and dialogue semantics | **fold into current** unversioned author-script module; characterization before deletion | current command/flow/dialogue tests pass without v13/v14 -> v5 sanitizer delegation |
| `content/scene-v5/v13/v14`, `item-v5/v14`, `enemy-v14`, `dialogue-v14`, `entity-lifecycle-v13` | Current content author shapes layered over old epochs | **fold into current** unversioned domains | current PAL parse/validate and editor typecheck pass |
| `enemy-script`, current skill/equipment/item execution versioned modules | Current feature-generation names, not supported product epochs | **fold/rename when on product public surface**; retain serialized/local discriminants | no public “supported V10/V11” implication; focused behavior tests unchanged |
| `reforge/loader-v5/v13/v14/v16` + `legacy-runtime-shell-v5` | Current loader delegates through old project shells | **replace with one direct project loader**, then delete old loaders/shell/tests | current content16 project loads directly; old project inputs fail at the one boundary |
| `reforge/script-{compiler,runner,project,world,host-adapter}-v5/v13` | Current runtime semantics split by historical generation | **fold into current** unversioned runtime modules; no compatibility alias | runtime/editor playback tests pass; public exports unversioned |
| `editor/*-v5`, `*-v13`, V14 component/test names | Current editor implementation coupled to version names | **fold/rename into current**; keep behavior and UI unchanged | editor typecheck/focused tests pass; no old epoch imports |
| `reforge/save/types.ts`, `migration.ts`, `migration-v13/v14/v16`, epoch tests | SAVE5..8/content4..16 product migration history | **replace with direct SAVE8/content16 codec**, delete old types/branches/tests | current save round-trip and fail-loud rejection characterization pass |
| `reforge/file-source.ts` legacy asset adapter + `content/asset.ts assets.legacy` | Current PAL still reads two extracted families outside catalog | **migrate effect-sprite/image to catalog**, then delete adapter/config/fallback | asset audit, PAL load and catalog validation pass without `assets.legacy` |

## Dead content upgrade modules (GLM2)

All seven had no real call site in the pre-build census and are **delete**, including their dedicated tests and index exports:

- `dialogue-identity-v14-upgrade`
- `enemy-team-slots-v12-upgrade`
- `entity-lifecycle-v13-upgrade`
- `equip-battle-sprite-v9-upgrade`
- `item-throw-v8-upgrade`
- `project-script-v5-upgrade`
- `script-transition-v5`

Other upgrader modules (`dialogue-upgrade`, `project-upgrade`, enemy/skill upgrade helpers) are not automatically retained: remove
product consumers first, then either delete them or keep only a direct raw-source migration caller. No product re-export is allowed.

## OPS-TST-PERF-B handoff disposition

The 15-transition census and 927-file PB4 proof are evidence, not a reason to keep the rewind graph. The current-v4 rebuild candidate
failed because historical byte-order publication surfaces differ from the current serializer; ARCH will not create a representation
converter for that obsolete contract.

| artifact family | decision |
|---|---|
| `baselines/pal/_state.json` | **fold into current** publication state with no development transition chain |
| `baselines/pal/_transitions/*` | **delete** after direct current publication proof replaces rewind/seal consumers |
| `content/migrations/script-v4-v5-save.json` in baseline/project and manifest declaration | **delete**. It is a generated old-save sidecar, not an irreplaceable raw input; product explicitly rejects old saves and PAL is reproducible from `data/raw`. No converter exception approved. |
| `pal-current-c1-rewind.ts`, published old snapshots/fixtures, historical enemy/map authorities | **delete**; replace only required positive assertions with direct current-source checks |
| B one-shot build/resume/install/rebind scripts | **delete**; do not install the failed 9-seal candidate |
| PB3/PB4 audit script/report | Keep as task evidence during ARCH; no product or release route dependency. Delete executable after B final proof if no longer useful. |
| Generic migration transaction/baseline/write-plan modules | **keep**, but make them consume one current publication rather than a content-epoch ladder |

No `isolated source converter` exception is approved at G0. Any new candidate must stop the gate and add the real input, sole caller,
deletion condition and explicit user approval to this ledger before implementation.

## Static census contract (GLM3)

Reproduce the product scan over `packages/content/src`, `packages/reforge/src`, and `packages/editor/src`:

1. Include production `.ts/.tsx` files; exclude tests, generated build output and documentation.
2. Match import/export paths and symbols containing product epochs (`v5`, `v12`, `v13`, `v14`, `v15`),
   `legacy`, `compat`, `upgrade`, old save payloads, and content-version branches.
3. Classify every hit against this ledger. Local file schemas and platform/media compatibility are explicit non-product-epoch axes;
   they must be named in the allow list rather than silently excluded.
4. The final boundary gate fails on any unclassified hit. Temporary fold exceptions must name an ARCH gate and disappear before review.
5. Migration package is scanned separately: generic raw-source/current-publication code is allowed; published intermediate epochs,
   rewind chains, old sidecars and product upgrade entry points are not.

Pre-build broad census: 149 version/legacy/migration-named files across the four package surfaces; the stricter production-pattern scan
found 553 hits in 86 product files. These counts are an intentionally broad starting point, not the acceptance target. Kimi/GLM's
independent narrower import census (170 hits / 69 files) remains the review baseline. Final acceptance is classification-complete and
zero unapproved product-epoch dependencies, not preservation of any one count.

## Characterization gate (KA2)

Before deleting each layer, tests must pin at least:

- nested lifecycle commands reject `vanishEntity`, accept suspend/hide/restore/remove, and preserve recursive command arms;
- dialogue identity validation and runtime resolution for actor/unbound cues;
- scene hooks, entity behaviors/pages and shared scripts through the current validator;
- current PAL content16 loader output, author/runtime projections and world-variable registry;
- SAVE8/content16 round-trip plus fail-loud rejection of non-current envelopes;
- editor command/edit/playback behavior on current author scripts.

The replacement direct implementation must pass the same tests without calling old-version sanitizers or loaders.
