# CODE-QUALITY-54 — game draw tilemap narrow batch

Status: done
Owner: Codex
Reviewer: Codex（独立验收）
Phase: phase1 game
Capability: Q3 present/world
Visual Verification Timing: e2e-deferred（地图观感留集中 E2E；本批核像素、坐标与调用顺序）

## 目标

逐文件核验大世界瓦片绘制实现及两份专属测试，确认 layer 0/1、h 子行坐标、缺帧回落、透明/opaque coverage、cover-tile 候选与 SDLPal `map.c`/`scene.c` 真值一致；只读审计，不改变地图、碰撞、资源格式或用户可见形态。

## 范围

- `packages/game/src/present/draw-tilemap.ts`
- `packages/game/src/present/draw-tilemap.test.ts`
- `packages/game/src/present/draw-tilemap-pixels.grok-r1.test.ts`

只读相邻 caller/oracle：`packages/game/src/present/present.ts:290-311,379-390,465-477,507-518,600-611`、`packages/game/src/shell/bootstrap.ts:687-705`、`packages/pal-extract/src/resources/map.ts:35-69`、`packages/shared/src/resources.ts:1-27`、`packages/game/src/present/present.test.ts`。

## 前提真值门

- 一句话行为 / 工程前提：生产 tilemap 固定为 extractor 产出的 64×128 MAP，底层与顶层均先完整绘制，精灵之后按 `PAL_CalcCoverTiles` 重画可遮挡精灵的上层瓦片。
- 原版/primary source：`reference/sdlpal/map.c:197-259,301-352,355-418`（tile id、height、越界、h 子行坐标与 layer 0 fallback）；`reference/sdlpal/scene.c:77-178,180-362,452-491`（cover 候选、Y-sort、两层全画与 wave 前后顺序）。
- 第一阶段当前实现：`draw-tilemap.ts:87-158,246-382`；`present.ts:290-311` 两层与 seam coverage，`:379-611` party/follower/NPC cover caller；`map.ts:35-69` exact 65536B→64×128。
- 当前二阶段目标：只做证据收口；保持既有坐标、图层、输入契约和渲染顺序，不扩张至 bootstrap 缩略图或地图资源管线。
- 当前 `before -> after`：文件仍待逐文件核验 -> 以 primary/caller/oracle 与定向/相邻测试登记已验证；发现语义冲突立即留 review/rework。
- 最强替代解释 / 可证伪观察：若真实 MAP 输入存在非 64×128、空 cells 或 TileImage 形状不一致，当前直接索引可能抛错；extractor 的 exact size 与 223 个 tileset 资源约束未证明 hostile JSON loader 输入。若 bootstrap 缩略图需要与主渲染完全相同的 seam repair，应另开卡验证，不能由本批推断。

## 上下文锚点与风险

- `Tilemap` 公共类型明确固定地图尺寸，但不在类型层保证 cells 形状；生产 extractor `parseMap` 精确拒绝非 65536B，故本批不新增运行时 guard。
- `repairTilemapSeams` 是 type-pal 在每帧 clear 后用 coverage 邻居 dilation 模拟 SDLPal 持久 `gpScreen` 的工程补偿；已有 tests 证明 coverage 与 palette-0 ownership，但不能称为 SDLPal 逐像素真值。
- `bootstrap.ts:687-705` 的缩略图只绘制两层 map，未调用 `repairTilemapSeams`；这是后续独立 bootstrap/缩略图审计项，本批不改。
- 地图/碰撞/坐标属于第一阶段高风险边界；本批只读核验，任何 schema/save、资源管线或用户可见行为变化立即停线。

## 验证

- 直接定向：`draw-tilemap.test.ts`、`draw-tilemap-pixels.grok-r1.test.ts`，2 files / 20 tests 全绿。
- 相邻：`present.test.ts`，58 tests 全绿；覆盖真实 `addCoverTileEntries` 装配与排序 caller。
- 波次统一门：`pnpm check` 第二次 exit 0；官方 `pnpm coverage:ratchet` exit 0；`TYPE_PAL_COVERAGE_BASE_REF=origin/main pnpm coverage:fast` exit 0；`pnpm lint` exit 0（3994 files，0/0/0）；`node scripts/docs/check-content-review.mjs --strict`、`node scripts/quality/code-quality-ledger.mjs` 均 PASS。

## 当前模式推进记录

- Codex 范围/前提核验: verified（实现、两份专属测试、primary、公共类型、extractor、present/bootstrap caller 已全文读取）
- 受委派 Coding Owner / 隔离分支: Codex / `/Users/zhangxu/illegal/type-pal-quality-3x` / `codex/code-quality-3y`
- build 准入: Codex build allowed（只读审计；不得改实现）
- 贡献者交付/自验: N/A
- Codex 独立验收: accept（3 文件全文、primary/caller/oracle、定向 20 + 相邻 58、波次全仓质量门均通过；未发现直接缺陷）
- 用户产品裁决/体验验收: N/A（保持现有形态）
- done 准入: Codex done allowed；本批无实现改动。

## 交接

- 2026-10-13 Codex：独立只读复核确认坐标、layer、height、cover 候选与 SDLPal 公式一致；定向 20/20、`present.test.ts` 58/58 通过。波次 `pnpm check`、官方 ratchet、protected fast、lint-zero、docs/content review、ledger 全部通过。保留 seam repair 与 bootstrap 缩略图边界，不把它们误计为本批实现缺陷或已审文件；账本收口为 `3266 / 281 closed / 5 review / 2980 pending`。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-54 game draw tilemap narrow batch
任务卡：docs/ops/archive/tasks/done/CODE-QUALITY-54-game-draw-tilemap.md
当前状态：done，已归档
角色：历史交接记录；不得修改实现或扩大到 bootstrap 缩略图
先读：本卡、AGENTS.md、CLAUDE.md、reference/sdlpal/map.c:197-259/301-352/355-418、reference/sdlpal/scene.c:77-178/180-362/452-491、draw-tilemap.ts 及两份专属测试
请做：若重开审计，重新确认 primary/caller/oracle 与 20+58 定向/相邻证据；不得直接重用本卡作为新 build 授权
不要做：不得把 package 全绿替代逐文件审核；不得修 seam repair、地图 schema、资源管线或 bootstrap 缩略图
输出：证据、测试结果、剩余风险；当前结论为 accept/done
```

## 2026-10-21 renderer八维与统一门收口

本轮按原范围逐项A–H接受；实际caller/primary、结构取舍、测试判别力/合同迁移及当前身份见[逐文件记录](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/renderer-local.json)。有效旧证据按版本复用，不继承历史done或包绿信用。

只按tilemap原三文件：纠正base层顺序、h/l、缺图防御与补缝等价性错注；仅测试包装blitTileAt退役，其普通写像素合同由公开drawTilemap承接。223本地地图通过生产decoder核零缺帧/错误；SDL缺图回退差异限当前输入域，不承诺原盘/浏览器等价，不改地图或补缝算法。

[完整集中门与原件](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/renderer-gates.json)同时披露check之后唯一baseline授权数据条目及其86consumer复验，不冒称原check已执行新数据。无产品行为/schema/save/管线/调用接口变化；视觉/E2E仍按原卡延后，不附带广域文件接受。提交/推送/合main依实际最终门与Git交接。
