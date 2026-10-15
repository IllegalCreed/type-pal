# ARCH-CURRENT-ONLY-1 current-only retention ledger

Status: superseded
Validity: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-16
Template: design-spec-v1 / 1.0.0

原状态与时点：2026-08-20 G0 frozen; dispositions below are the build contract。

## 问题与目标

本账原目标是08-20 G0把旧产品epoch委托链折叠为直接canonical，逐表规定fold/delete/keep与退出证据，因此从旧evidence-receipt纠为design-spec。治理Status superseded仅指G0版本实例与当前准入权已转后继，不是产品重新返工或全部原则作废；原G0 frozen不是done执行证据。

## 真值与约束

content16/SAVE8是当时产品目标；Map4、AssetCatalog1、ScriptChunk/IndexV1是独立文件轴，不为数字统一改号。legacy-migrated、legacy-script诊断、skippedLegacyTailSlots属来源/解码证据，IndexedDB onupgradeneeded属平台生命周期，均不授权旧工程加载分支。原表中“current”只指08-20，不从此生成今天content/save常量。

## 方案

原disposition要求内容/loader/runtime/editor旧世代模块折叠或删除，七个dead upgrader的出口/测试一并处置，asset legacy两族转catalog后删adapter。PERF-B的15-transition census与927-file PB4 proof是既有证据，不构成保留rewind的理由；失败的是current-v4 rebuild候选，其历史字节顺序与current serializer不同，不能为此保留旧sidecar或新增表示转换器。generic事务/baseline/write-plan只消费直接current publication。表中的delete/keep是当时实施合同，本表自身不能证明操作已执行。

## 边界与风险

G0当时没有isolated-source-converter获批，只能断言该时点；不能外推以后永远无例外或凭该表擅自删输入。新例外仍须真实不可重建输入、唯一caller/删除条件与用户批准。媒体profile/平台兼容与旧产品epoch分开，不把名称扫描命中直接当坏代码；149文件、553hits/86文件和较窄170hits/69文件是不同预备census，不是完成数。

## 验收

原静态门要求逐命中分类完整、无未批准产品epoch依赖；characterization保留lifecycle递归臂、对话identity、scene/shared、PAL/变量、save往返和editor行为，不能靠改名/全绿替代。最终ARCH卡:318–355/553–572记录RA1先counter、de234143删5 sidecar后复签与08-23用户done；本轮只直接读其这些窄段和开头，不给整卡全文或今天实现/测试信用。

## 历史范围

08-20 G0设计/准入，ARCH卡后继RA1返工/接受与08-23用户done分层。原serialized16/8、版本化文件名和计划动词完整保留；不刷新旧表为当前版本或当前执行状态。

## 当时证据

原112行版本轴/allowlist/disposition、PERF-B停线、静态census和characterization完整保留。原PB3/PB4路径只记录任务证据producer与保留理由；本轮未恢复raw、运行旧audit脚本或验证旧candidate可重放。

以下保留原公开标题入口；导航只转本页历史说明，不恢复旧命令或准入：

### Version axes

历史原文见[原始结论](#原始结论)；按原日期与上方实质纠正读取。

### Explicit current-axis allowlist

历史原文见[原始结论](#原始结论)；按原日期与上方实质纠正读取。

### Product code disposition

历史原文见[原始结论](#原始结论)；按原日期与上方实质纠正读取。

### Dead content upgrade modules (GLM2)

历史原文见[原始结论](#原始结论)；按原日期与上方实质纠正读取。

### OPS-TST-PERF-B handoff disposition

历史原文见[原始结论](#原始结论)；按原日期与上方实质纠正读取。

### Static census contract (GLM3)

历史原文见[原始结论](#原始结论)；按原日期与上方实质纠正读取。

### Characterization gate (KA2)

历史原文见[原始结论](#原始结论)；按原日期与上方实质纠正读取。

## 当前有效性

historical；“只消费canonical”的政策继续由现行READ-FIRST承接，原content16/SAVE8及G0操作状态不再作为当前准入。本页不从后继done复制全部实施结果，不把G0无例外当永远没有新的用户批准，也不恢复旧upgrader。

## 继任文档

[ARCH后继卡](../tasks/done/ARCH-CURRENT-ONLY-1-development-current-only-consolidation.md)负责其固定收口/RA1证据；现行政策取[READ-FIRST铁律11](../../../phase2/READ-FIRST.md)。新的版本值、输入和保留判断必须回实际consumer/新卡，不从本历史允许表推导。

## 原始结论

G0表是current-only实施设计/准入而非执行回执；产品epoch/local schema/来源/平台分轴，旧content16SAVE8不作为当前消费者版本。

完整原文源Git blob `bf5b8d8afb7eb378ecb25daef19687ff20cb93c5`，revision `bb90428668808368e816bd8e2ddeb5da57e4b166`。以下逐行仅增加quote前缀（非空行`> `、空行`>`），UTF-8可严格逆回读；其中“当前”、命令、旧版本和已撤回主张均指原日期，不是本次执行授权。

<!-- original-source-quote:start -->

> # ARCH-CURRENT-ONLY-1 current-only retention ledger
>
> Date: 2026-08-20
>
> Source branch: `codex/arch-current-only-1`
>
> Status: G0 frozen; implementation dispositions below are the build contract.
>
> ## Version axes
>
> | axis | examples | decision |
> |---|---|---|
> | Product content epoch | content12/13/14/15/16, loader-v13/v14/v16, save content epoch | Only serialized `contentVersion: 16` remains. Product code uses direct current types and behavior; old epochs are deleted. |
> | Current script semantics | former `AuthorCommandV5` base + v13 lifecycle + v14 dialogue identity | This is current behavior, not historical compatibility. Fold all three layers into one unversioned author-script domain; preserve behavior, not V5/V13/V14 product names or delegation. |
> | Current save envelope | SAVE8/content16 | Keep the serialized `version: 8` and `contentVersion: 16`; delete old payload unions and migration branches. |
> | Local file schema | `ProjectMap.version=4`, `AssetCatalog.version=1`, authoring/stamp/script chunk V1 | Keep. These are current file contracts, not product epochs, and are not renumbered for cosmetic consistency. |
> | Raw-source migration implementation | generic migration transaction/baseline/write-plan and PAL raw extract transforms | Keep only the direct raw-source -> current producer and current publication proof. Delete intermediate development epochs, rewind chains and published-old-version fixtures. |
> | Platform/third-party compatibility | browser, filesystem, media decoders | Out of this task; not “old project compatibility”. |
>
> ## Explicit current-axis allowlist
>
> The final static gate classifies these names as current contracts or provenance rather than product epochs. They remain only in the
> listed role; none authorizes an old project/save reader or product fallback.
>
> | name / family | current meaning | allowed scope |
> |---|---|---|
> | `ProjectMap.version = 4` | current map-file schema | content/editor/reforge map IO |
> | `AssetCatalogV1.version = 1` | current asset-catalog file schema | content/editor/reforge/migrate catalog IO |
> | `ScriptChunkV1`, `ScriptIndexV1`, `ScriptRef { chunk, id }` | current chunked raw/local script file schema | current local projection and PAL raw-source tooling |
> | `legacy-migrated` | immutable asset origin/provenance label; files themselves are in the canonical catalog | asset record metadata and decoder strictness selection only |
> | migration diagnostic `source.kind = legacy-script` | provenance for unresolved PAL raw-script facts | current diagnostic records only; never a product loader branch |
> | `skippedLegacyTailSlots` | media-decoder evidence about malformed source tails | strict source decoding/audit only; no old project schema path |
> | IndexedDB `onupgradeneeded` | browser database lifecycle callback | editor/save platform storage only |
> | PAL raw `legacy-dialog` helper | direct original-event decoding before current publication | `packages/migrate` only, with current publication as sole downstream boundary |
>
> ## Product code disposition
>
> | surface | current role | disposition | exit evidence |
> |---|---|---|---|
> | `content/script-v5.ts` + `script-v13.ts` + `script-v14.ts` | Current author command, lifecycle and dialogue semantics | **fold into current** unversioned author-script module; characterization before deletion | current command/flow/dialogue tests pass without v13/v14 -> v5 sanitizer delegation |
> | `content/scene-v5/v13/v14`, `item-v5/v14`, `enemy-v14`, `dialogue-v14`, `entity-lifecycle-v13` | Current content author shapes layered over old epochs | **fold into current** unversioned domains | current PAL parse/validate and editor typecheck pass |
> | `enemy-script`, current skill/equipment/item execution versioned modules | Current feature-generation names, not supported product epochs | **fold/rename when on product public surface**; retain serialized/local discriminants | no public “supported V10/V11” implication; focused behavior tests unchanged |
> | `reforge/loader-v5/v13/v14/v16` + `legacy-runtime-shell-v5` | Current loader delegates through old project shells | **replace with one direct project loader**, then delete old loaders/shell/tests | current content16 project loads directly; old project inputs fail at the one boundary |
> | `reforge/script-{compiler,runner,project,world,host-adapter}-v5/v13` | Current runtime semantics split by historical generation | **fold into current** unversioned runtime modules; no compatibility alias | runtime/editor playback tests pass; public exports unversioned |
> | `editor/*-v5`, `*-v13`, V14 component/test names | Current editor implementation coupled to version names | **fold/rename into current**; keep behavior and UI unchanged | editor typecheck/focused tests pass; no old epoch imports |
> | `reforge/save/types.ts`, `migration.ts`, `migration-v13/v14/v16`, epoch tests | SAVE5..8/content4..16 product migration history | **replace with direct SAVE8/content16 codec**, delete old types/branches/tests | current save round-trip and fail-loud rejection characterization pass |
> | `reforge/file-source.ts` legacy asset adapter + `content/asset.ts assets.legacy` | Current PAL still reads two extracted families outside catalog | **migrate effect-sprite/image to catalog**, then delete adapter/config/fallback | asset audit, PAL load and catalog validation pass without `assets.legacy` |
>
> ## Dead content upgrade modules (GLM2)
>
> All seven had no real call site in the pre-build census and are **delete**, including their dedicated tests and index exports:
>
> - `dialogue-identity-v14-upgrade`
> - `enemy-team-slots-v12-upgrade`
> - `entity-lifecycle-v13-upgrade`
> - `equip-battle-sprite-v9-upgrade`
> - `item-throw-v8-upgrade`
> - `project-script-v5-upgrade`
> - `script-transition-v5`
>
> Other upgrader modules (`dialogue-upgrade`, `project-upgrade`, enemy/skill upgrade helpers) are not automatically retained: remove
> product consumers first, then either delete them or keep only a direct raw-source migration caller. No product re-export is allowed.
>
> ## OPS-TST-PERF-B handoff disposition
>
> The 15-transition census and 927-file PB4 proof are evidence, not a reason to keep the rewind graph. The current-v4 rebuild candidate
> failed because historical byte-order publication surfaces differ from the current serializer; ARCH will not create a representation
> converter for that obsolete contract.
>
> | artifact family | decision |
> |---|---|
> | `baselines/pal/_state.json` | **fold into current** publication state with no development transition chain |
> | `baselines/pal/_transitions/*` | **delete** after direct current publication proof replaces rewind/seal consumers |
> | `content/migrations/script-v4-v5-save.json` in baseline/project and manifest declaration | **delete**. It is a generated old-save sidecar, not an irreplaceable raw input; product explicitly rejects old saves and PAL is reproducible from `data/raw`. No converter exception approved. |
> | `pal-current-c1-rewind.ts`, published old snapshots/fixtures, historical enemy/map authorities | **delete**; replace only required positive assertions with direct current-source checks |
> | B one-shot build/resume/install/rebind scripts | **delete**; do not install the failed 9-seal candidate |
> | PB3/PB4 audit script/report | Keep as task evidence during ARCH; no product or release route dependency. Delete executable after B final proof if no longer useful. |
> | Generic migration transaction/baseline/write-plan modules | **keep**, but make them consume one current publication rather than a content-epoch ladder |
>
> No `isolated source converter` exception is approved at G0. Any new candidate must stop the gate and add the real input, sole caller,
> deletion condition and explicit user approval to this ledger before implementation.
>
> ## Static census contract (GLM3)
>
> Reproduce the product scan over `packages/content/src`, `packages/reforge/src`, and `packages/editor/src`:
>
> 1. Include production `.ts/.tsx` files; exclude tests, generated build output and documentation.
> 2. Match import/export paths and symbols containing product epochs (`v5`, `v12`, `v13`, `v14`, `v15`),
>    `legacy`, `compat`, `upgrade`, old save payloads, and content-version branches.
> 3. Classify every hit against this ledger. Local file schemas and platform/media compatibility are explicit non-product-epoch axes;
>    they must be named in the allow list rather than silently excluded.
> 4. The final boundary gate fails on any unclassified hit. Temporary fold exceptions must name an ARCH gate and disappear before review.
> 5. Migration package is scanned separately: generic raw-source/current-publication code is allowed; published intermediate epochs,
>    rewind chains, old sidecars and product upgrade entry points are not.
>
> Pre-build broad census: 149 version/legacy/migration-named files across the four package surfaces; the stricter production-pattern scan
> found 553 hits in 86 product files. These counts are an intentionally broad starting point, not the acceptance target. Kimi/GLM's
> independent narrower import census (170 hits / 69 files) remains the review baseline. Final acceptance is classification-complete and
> zero unapproved product-epoch dependencies, not preservation of any one count.
>
> ## Characterization gate (KA2)
>
> Before deleting each layer, tests must pin at least:
>
> - nested lifecycle commands reject `vanishEntity`, accept suspend/hide/restore/remove, and preserve recursive command arms;
> - dialogue identity validation and runtime resolution for actor/unbound cues;
> - scene hooks, entity behaviors/pages and shared scripts through the current validator;
> - current PAL content16 loader output, author/runtime projections and world-variable registry;
> - SAVE8/content16 round-trip plus fail-loud rejection of non-current envelopes;
> - editor command/edit/playback behavior on current author scripts.
>
> The replacement direct implementation must pass the same tests without calling old-version sanitizers or loaders.
