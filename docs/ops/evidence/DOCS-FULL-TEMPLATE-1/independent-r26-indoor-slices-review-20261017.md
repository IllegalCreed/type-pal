# R26 indoor slices readonly review

**verdict:** `accept-readonly-proposal` · **scope:** 4/4 indoor Markdown · **issues:** 0

这份报告独立全文读取 4 个 indoor Markdown 目标文件的 UTF-8 物理字节并保留 SHA-256、Git blob SHA-1、固定治理 source revision。未执行 HTML、未运行 runtime/E2E/视觉/coverage，未迁移正文，未写 registry/routing/catalog/central review。

## Scope and identity

- Root: `/Users/zhangxu/.codex/worktrees/docs-full-template-proposal/type-pal`
- Governance source revision: `45d890e4ce3862aeac9c54eef2d7d18a32032cee`; Git HEAD at review: `49dc6358245517e258a23ed95796dd82166bce59`
- Full read: **4/4**, **91412 bytes**, **1830 physical line slots**, strict UTF-8 decode.
- Source/after SHA: 4/4 equal; source quote inverse: 4/4 exact line anchors; old review SHA: 4/4 match.
- Catalog: 4/4 present and SHA-matched.
- Routing: 0/4 in `migratedDocuments`; all remain archive-only.

## Counters and accounting

Blocking counters are all zero: source/after drift 0, quote inverse failure 0, registry mismatch 0, duplicate old review 0, catalog SHA mismatch 0, routing contradiction 0, template proposal failure 0, semantic read failure 0.

Non-blocking boundaries retained: historical archive 4, archive routing gap 4, historical warning/unresolved signals 4, superseded/refocused indoor docs 3. The three HTML mockups are explicitly deferred and not counted. These are explicit boundaries, not current-product claims.

Credit remains zero: `runtime=0`, `E2E=0`, `visual=0`, `coverage=0`, `productCredit=0`; `migrationAuthorized=false`; `ledgerWriteAuthorized=false`.

## Template proposal

- Markdown `guijie-minju.md` and `spec.md`: `archive-record-v1` with the five archive chapters.
- Markdown `npc-collision-plan.md` and `plan.md`: `plan-status-v1` plus a non-empty `archive-record-v1` overlay carrying historical status, stop line, and successor.
- HTML mockups are outside this review and remain untouched; no HTML template decision is made here.

## Per-document results

### `docs/phase2/archive/slices/indoor/guijie-minju.md`

- Format/title: `markdown` / '切片 1（重定 · 小版）· 鬼界民居 demo'; status: `historical`; date: `unknown`
- Bytes/physical lines: 4647 / 70; source SHA-256: `ad46f077b823c66c364c61e4fad31d905cc4f65616d640f097d26b69fe941932`; after SHA-256: `ad46f077b823c66c364c61e4fad31d905cc4f65616d640f097d26b69fe941932`; Git blob SHA-1: `edac3461b58687653a58b338180359181808634d`
- Template proposal: `archive-record-v1`; quote inverse: `PASS`; registry: `archive-record-v1` / `governed-legacy`; old review: `docs/phase-governance/reviews/20261004-structured-content-phase2-01.json` exactly one entry
- Catalog: `archived` / `reviewed`, source/after SHA match; routing: archive-only (no `migratedDocuments` entry).
- Semantic outline: Small real-content slice proposal for a one-room ghost-home demo in reforge Canvas 2D: Li Xiaoyao walks/collides and talks to one or two ghosts; scope excludes editor/migration/combat/menu/save/scene switching/complex animation; reuse original tiles/sprites and hand-write scene data; minimal Scene/Map/Entity/Dialogue model; three-layer state, instantiable engine, pure movement/collision, Renderer interface, action-handler registry; build order content→renderer/input→assets→movement→dialogue; browser walk/collision/dialogue acceptance and a few focused tests.
- Conflicts/unresolved: The document says it replaces the old WebGL/MMO/general-room spec and calls itself current, while the live registry/review classify it as historical archive-record. Its claims require current decisions/code review before citation. Source asset/room selection is deferred to build time; the original many-room fixed image is to be cropped to one room, so exact asset identity is not fixed here. The “browser can really play” acceptance is a proposal, not evidence from this readonly read.
- Stop line: Do not cite this archive as current canonical truth or runtime proof; re-enable only through a current slice spec/code review with fixed source asset and scope decisions.
- Successor: Current phase2 decisions and any newly reviewed canonical slice-1 content/reforge spec; the old spec.md is explicitly replaced in the text but remains archive-only.

Exact source quote anchors:
  - line 1: `# 切片 1（重定 · 小版）· 鬼界民居 demo`
  - line 3: `> 取代旧版 [spec.md](spec.md)（WebGL/MMO/通用房间，已暂缓存档）。这是第二阶段第一刀的**当前** spec。`
  - line 20: `- ⚠ 原版把**很多间民居塞进一张固定尺寸大图**省资源。我们只**裁出完整一间**：把那一间的瓦片矩形（w×h）+ 碰撞复制进 reforge 的一张**小图**。`

### `docs/phase2/archive/slices/indoor/npc-collision-plan.md`

- Format/title: `markdown` / '切片 1 补漏:静态 NPC 碰撞(static-npc-collision plan)'; status: `historical`; date: `2026-09-06`
- Bytes/physical lines: 6612 / 130; source SHA-256: `d2b8ab55b5673290644cbbde7176169d4976af2b8da539e24d77f473b8d39295`; after SHA-256: `d2b8ab55b5673290644cbbde7176169d4976af2b8da539e24d77f473b8d39295`; Git blob SHA-1: `a987186f8b3a690b9f86c6f37b0b221c3221e89b`
- Template proposal: `plan-status-v1+archive-record-v1-overlay`; quote inverse: `PASS`; registry: `plan-status-v1` / `governed-legacy`; old review: `docs/phase-governance/reviews/20261004-structured-content-phase2-02.json` exactly one entry
- Catalog: `archived` / `reviewed`, source/after SHA match; routing: archive-only (no `migratedDocuments` entry).
- Semantic outline: Historical static-NPC collision TDD plan: identifies collide as a dead field; constrains scope to fixed-position entities; adds pure sameTile(pixelToTile) plus an isBlocked wrapper while preserving resolveMove semantics; specifies focused collision tests, reforge check/lint, and a browser check for blocked passage plus dialogue and detour.
- Conflicts/unresolved: The plan records implementation commands and checkboxes, but its own header says they are an old snapshot; no current implementation acceptance is granted by this review. Dynamic NPC movement, dynamic collision, and avoidance are explicitly outside scope. The plan’s “browser verify passed” self-review is historical prose and cannot be counted as present E2E/visual evidence.
- Stop line: Do not execute or cite this plan as current work; consult capability-map, task card, current collision code/tests, and a new reviewed successor.
- Successor: Current reforge collision implementation/tests and capability-map/task-card evidence; any new dynamic-collision design must be separately scoped.

Exact source quote anchors:
  - line 1: `> **历史文档（2026-09-06 标注）**：本文是已完成的 TDD 计划/设计存档，正文中的执行`
  - line 9: `**Goal:** 切片 1 当前 `collide` 是**死字段**——`EntityDef` 定义了 `collide?: boolean`、鬼填了 `collide: true`,但 reforge 的 `isBlocked`([main.ts:188](../../../../../packages/reforge/src/main.ts#L188))只判地图 tile、从没读 entity → 玩家能穿过站着的鬼。本计划把静态 NPC 碰撞接上:玩家**不能穿过** `collide:true` 的实体,撞上停下、仍能对话。`
  - line 11: `**范围(硬边界):** 只做**静态**碰撞(实体位置固定)。NPC 自主移动 + 动态碰撞 + 错位避让 = [design-backlog 议题 15](../../../design-backlog.md),本计划**绝不碰**(防范围蔓延)。`

### `docs/phase2/archive/slices/indoor/plan.md`

- Format/title: `markdown` / '切片 1「室内场景跑通」实现计划（slice 1 plan）'; status: `superseded-historical`; date: `2026-06-25 / 2026-09-06`
- Bytes/physical lines: 61042 / 1352; source SHA-256: `bb8f7428fb66f91a2a8393ff1828c0446cef907a33c4967151a8370f41169fec`; after SHA-256: `bb8f7428fb66f91a2a8393ff1828c0446cef907a33c4967151a8370f41169fec`; Git blob SHA-1: `d537b7a96c81cb67c0461c1628fb1bd96ddf9fb4`
- Template proposal: `plan-status-v1+archive-record-v1-overlay`; quote inverse: `PASS`; registry: `plan-status-v1` / `governed-legacy`; old review: `docs/phase-governance/reviews/20261004-structured-content-phase2-02.json` exactly one entry
- Catalog: `archived` / `reviewed`, source/after SHA match; routing: archive-only (no `migratedDocuments` entry).
- Semantic outline: Historical implementation plan for two packages and an indoor vertical slice: workspace wiring; content schema, indexed-PNG decode, scene parsing/validation, hand-written scene/assets; reforge entities/grid/collision/resolveMove/state/cutscene/interaction/input/fixed tick; then camera, WebGL2 textured-quad rendering, identity postprocess, Canvas2D text, and browser/rAF dev entry; concludes with self-review and handoff.
- Conflicts/unresolved: The plan’s WebGL2, MMO leave, and generic-room scope is explicitly superseded by Canvas 2D first, real DLC content, and no MMO leave. Many task checkboxes and commands are historical instructions, not evidence the full plan was implemented. Its later README/decisions links point to the current direction; this plan must not be used as an execution checklist.
- Stop line: Do not execute this plan or treat its checkboxes/self-review as completion; use the current refocused slice design and decisions, and reopen only with a new plan.
- Successor: docs/phase2/archive/slices/indoor/guijie-minju.md as the historical refocused slice proposal, current phase2 decisions, and a newly reviewed implementation plan if the slice restarts.

Exact source quote anchors:
  - line 1: `> **已被取代的历史计划（2026-09-06 标注）**：下方暂缓裁决仍有效；旧 WebGL/MMO 范围没有按此计划完成。`
  - line 6: `> ⚠ **暂缓 / 勿照此执行（2026-06-25）**：本计划是「重新聚焦」**之前**的版本（WebGL2 渲染、MMO 留口、内容无关的通用房间）。第二阶段已改走 **Canvas 2D 起步 + 真实 DLC 内容 + 不留 MMO 口**（见 [decisions.md](../../../decisions.md)）。保留作参考；切片重启时会基于新范围重写——**别把它当成当前的实现任务**。`
  - line 12: `**Goal：** 起 `@type-pal/content` + `@type-pal/reforge` 两个新包，让新引擎在浏览器跑通一个手写室内房：走路 + 撞墙 + NPC 对话翻页。`

### `docs/phase2/archive/slices/indoor/spec.md`

- Format/title: `markdown` / 'P1 · 切片 1：室内场景跑通（slice 1 spec）'; status: `draft-superseded-historical`; date: `2026-06-24 / 2026-06-25`
- Bytes/physical lines: 19111 / 278; source SHA-256: `01e7c9679f997df0b373d4d865ec863a08056e35c6f2d196e4f1ed70518a8b80`; after SHA-256: `01e7c9679f997df0b373d4d865ec863a08056e35c6f2d196e4f1ed70518a8b80`; Git blob SHA-1: `ef477d8dc879854fa0f8b227f5bcd129de432d2f`
- Template proposal: `archive-record-v1`; quote inverse: `PASS`; registry: `archive-record-v1` / `governed-legacy`; old review: `docs/phase-governance/reviews/20261004-structured-content-phase2-02.json` exactly one entry
- Catalog: `archived` / `reviewed`, source/after SHA match; routing: archive-only (no `migratedDocuments` entry).
- Semantic outline: Historical P1 indoor-slice spec: goal and scope table; D1–D9 mapping; content/reforge package layout; scene/map/entity/cutscene schema; indexed-PNG assets; three-layer state and lightweight component entities; pure movement and separate world/entity collision; declarative event/dialogue; WebGL2 plus Canvas2D text; loop/input/error/module boundaries; tests, build order, and future items.
- Conflicts/unresolved: The spec is explicitly pre-refocus WebGL2/MMO/general-room and says “do not execute”; current direction is Canvas 2D first, real DLC slice, and no MMO leave. It contains an unresolved assumption about 32×16 offset tiling versus square tiles for original visual fidelity; it is not a settled current decision. The document points to guijie-minju.md as the rewritten current slice-1 spec, but the live registry keeps both as historical archive; neither is runtime proof here.
- Stop line: Do not execute or cite this draft as current canonical spec; rewrite/review from current decisions and the successor slice before any implementation.
- Successor: docs/phase2/archive/slices/indoor/guijie-minju.md is the named textual successor; current phase2 decisions and reforge/content implementation must be revalidated before use.

Exact source quote anchors:
  - line 1: `# P1 · 切片 1：室内场景跑通（slice 1 spec）`
  - line 3: `> ⚠ **暂缓 / 待重写（2026-06-25）**：本 spec 是「重新聚焦」**之前**的版本——含 WebGL2、MMO 碰撞留口、内容无关的通用房间。重新聚焦后第二阶段改为 **Canvas 2D 起步 + 切片承载真实 DLC 内容 + 不留 MMO 口**（见 [decisions.md](../../../decisions.md) 2026-06-25 修订）。**本文留作参考，勿照此执行**；切片重启时按新范围重写。`
  - line 4: `> **→ 已重写为 [guijie-minju.md](guijie-minju.md)（当前 slice-1 spec：鬼界民居 demo）。本文仅存档。**`
  - line 6: `> 状态：草案（2026-06-24）。第二阶段铁律见 [READ-FIRST](../../../READ-FIRST.md)；总纲 [00-roadmap](../../../roadmap.md)；已拍决策 [decisions](../../../decisions.md)（D1–D9）；内容模型 [p0-content-schema](../../designs/content-schema.md)；架构债反面输入 [engine-debt-audit](../../audits/engine-debt-audit.md)。`

## Commands and limits

- PASS: `read_bytes + strict UTF-8 decode + SHA-256 + git hash-object + registry/review/catalog/routing extraction` for all 4 paths.
- NOT RUN by readonly scope: HTML/browser execution, runtime, E2E, visual, coverage. No such credit is granted.
- HTML three-file scope is explicitly deferred to a separate review. No repository正文 or ledger file was modified by this review. The report itself is only in `/tmp`.
