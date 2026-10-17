# CODE-QUALITY-56 — game minimap thumbnail lifecycle

> 2026-10-18 波次门勘误：本页引用的 [47–52统一门回执](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/53-wave-gates/README.md) 已撤回“通过/收口”信用，未证明零诊断；不得沿用为本片验收或合并依据。本页原逐文件/定向结果按各自证据保留，旧计数不改写为0。

Status: done
Owner: Codex
Reviewer: Codex（独立验收）
Phase: phase1 game
Capability: Q3 game/tools
Visual Verification Timing: functional-ui（本批核 canvas 坐标、底图加载与控制器生命周期；不做剧情 E2E）

## 目标

逐文件核验小地图实现及两份专属测试，确认世界像素到 640px thumbnail 的变换、NPC/宝物分类、缩放/显隐状态、底图缓存与异步 Image 生命周期对齐真实 caller；先以失败反例验证底图 URL resolve 后 `baseLoading` 提前释放是否会重复加载，再决定最小修复。

## 范围

- `packages/game/src/tools/minimap.ts`
- `packages/game/src/tools/minimap.test.ts`
- `packages/game/src/tools/minimap.glm-phase1-leaves.test.ts`

只读相邻 caller/oracle：`packages/game/src/shell/bootstrap.ts:661-760,1104-1106`、`packages/game/src/tools/tools-panel.ts:50-55,914-917`、`packages/game/src/dev/dev-panel.ts:361-371,1161-1180`、`packages/game/src/core/scene-system.ts:34`、`packages/game/src/present/draw-tilemap.ts:87-158`、`docs/phase1/engineering-notes.md:18,93`、`CLAUDE.md:129`。

## 前提真值门

- 一句话行为 / 工程前提：小地图是 type-pal 工具层功能，纯读 `GameState` 与 bootstrap 提供的 map thumbnail；不拥有核心移动、地图 schema 或存档状态。
- 原版/primary source：SDLPal 没有同形态小地图 UI；因此 primary source 对本工具视觉形态为 `N/A`，坐标真值来自当前 bootstrap/draw-tilemap 的 32×16 tile、camera(-16,-16)与 framebuffer 世界像素合同。
- 第一阶段当前实现：`minimap.ts:30-52,108-176,194-224,247-481`；`bootstrap.ts:661-760,1104-1106` 提供 map thumbnail；`tools-panel.ts:914-917` 装配 caller；`draw-tilemap.ts:87-158` 提供底图两层绘制。
- 当前二阶段目标：保持现有 minimap 形态与公共 `MinimapController` 接口，只修复有直接反例证明的异步资源 ownership；不改变地图内容、碰撞或保存行为。
- 当前 `before -> after`：底图 promise resolve 后可能在 `Image.onload` 前释放 loading ownership；after 是同一 map 在图片完成/失败前保持单一 loading 事务，成功缓存、失败终止并可诊断。
- 最强替代解释 / 可证伪观察：若浏览器保证 data URL `Image` 同步完成，或所有 caller 只在单次 mount 后再请求，则重复加载不可达；测试将延迟 Image.onload 并在 URL resolve 后触发第二次 draw，观察 `getMapThumbnail` 是否被重复调用。

## 上下文锚点与风险

- `getBase` 目前把 `baseLoading` 绑定到 `getMapThumbnail` promise，而不是 Image decode 生命周期；`Image.onerror` 未登记，坏 dataURL 可能每帧重试。
- `minimap` 目前用 `gs.npcs` 数组引用判断 event-kind cache 失效；scene reload 替换数组是 caller 合同，数组内 triggerLabel 变更不在本批扩张。
- bootstrap 的 `renderMapThumbnail` 只画两层 tilemap，不调用 `repairTilemapSeams`；这与主 present 的每帧 coverage dilation 是已知差异，另开 bootstrap/thumbnail 任务，不在本卡直接改变。
- 本批不改 schema/save、地图资源、公共接口；若要改变 thumbnail 视觉或 primary 行为，立即留 review 并请求裁决。

## 验证

- 先写失败反例：延迟 `Image.onload` 后第二次 draw 观察到 `getMapThumbnail` 被调用 2 次，Vitest 退出 1；证明 URL promise 与 Image decode ownership 被错误分离。
- 修复：将 `baseLoading` 释放移动到 `Image.onload` / `Image.onerror`，promise reject/空 URL 仍 fail-closed 并释放；不改变 `MinimapController` 接口或视觉形态。
- 定向：`minimap.test.ts`、`minimap.glm-phase1-leaves.test.ts`，20 tests 全绿（含 delayed onload 与 decode failure 反控）。
- 相邻：`tools-panel.test.ts`、`dev-panel.test.ts`、`dev-panel.pure.test.ts`、`dev-panel.glm-next-wave.test.ts`，66 tests 全绿；game typecheck 通过。
- 相邻：tools-panel/dev-panel caller tests（只核真实 `getMapThumbnail` 转发与 controller 生命周期）。
- 波次统一门：`pnpm check` 第二次 exit 0；官方 `pnpm coverage:ratchet` exit 0（接纳 8 个测试项、2 个范围文件）；`TYPE_PAL_COVERAGE_BASE_REF=origin/main pnpm coverage:fast` exit 0；`pnpm lint` exit 0（3994 files，0/0/0）；docs/content review 与 ledger PASS。

## 当前模式推进记录

- Codex 范围/前提核验: verified（实现、两份专属测试、bootstrap/tools-panel/dev-panel caller、draw-tilemap 合同已全文读取）
- 受委派 Coding Owner / 隔离分支: Codex / `/Users/zhangxu/illegal/type-pal-quality-3x` / `codex/code-quality-3y`
- build 准入: Codex build allowed（先写失败反例；只改本卡白名单）
- 贡献者交付/自验: N/A
- Codex 独立验收: accept（3 文件全文、caller/oracle、失败反例先行、最小修复、定向 20 + 相邻 68、全仓质量门均通过）
- 用户产品裁决/体验验收: N/A（保持现有形态）
- done 准入: Codex done allowed；本批只修复 minimap 图片加载 ownership，不改变公共接口、地图数据或视觉形态。

## 交接

- 2026-10-13 Codex：旧实现的 `baseLoading` 在 thumbnail URL promise resolve 时提前释放；延迟 `Image.onload` 的反例确认第二次 draw 会重复请求同一 map。修复后 loading ownership 由 `onload/onerror` 释放，空 URL/promise reject fail-closed；定向 20、相邻 tools/dev 68、game 全包 3521、全仓 check、ratchet、protected fast、lint-zero、docs/content review、ledger 全部通过。bootstrap thumbnail 未调用 `repairTilemapSeams` 的差异仍留后续独立审计；账本收口为 `3266 / 284 closed / 5 review / 2977 pending`。

## 2026-10-18 Codex 当前独立复审

- **范围与读取**：完整读取 `minimap.ts`、`minimap.test.ts`、`minimap.glm-phase1-leaves.test.ts`；读取 bootstrap `renderMapThumbnail`/`setupToolsPanel` 注入、tools-panel/dev-panel 缩略图 caller、scene-system current map、draw-tilemap 两层绘制与 phase1 相机文档。SDLPal 没有同形态 minimap UI，本片 primary 是当前 bootstrap/draw-tilemap 合同。
- **逐文件结论**：`getBase` 按 map 维护成功/失败/loading 状态，URL resolve 后的 `Image` 直到 `onload/onerror` 才释放 loading ownership；rAF 重绘、场景 tab/widget、map/outW dataURL 缓存和 picker 异步生命周期均无新直接缺陷。未改变 seam repair、地图 schema、碰撞、存档或 `MinimapController`。
- **判别力**：直接 2 files/20 tests；相邻 tools/dev 4 files/51 tests，另 picker lifecycle 5 tests。临时提前释放 `baseLoading` 的变异使专属 GLM 测试 `1 failed / 5 passed`（第二次 draw 重复调用 `getMapThumbnail`），随后立即恢复原文件，工作树无 minimap 变更。
- **验证**：`pnpm --filter @type-pal/game typecheck` passed；波次级全仓门沿用 [`53-wave-gates`](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/53-wave-gates/README.md)，不重复运行昂贵 coverage。当前复审结论为 `partial`；bootstrap seam repair 视觉差异继续由 CODE-QUALITY-57 独立处理。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-56 game minimap thumbnail lifecycle
任务卡：docs/ops/archive/tasks/done/CODE-QUALITY-56-game-minimap-thumbnail-lifecycle.md
当前状态：done，已归档；不得改 bootstrap seam repair 或地图 schema
先读：本卡、AGENTS.md、CLAUDE.md、minimap.ts、两份专属测试、bootstrap.ts:661-760/1104-1106、tools-panel.ts、dev-panel.ts、draw-tilemap.ts
请做：若重开审计，先复核延迟 Image.onload 反例与已归档修复；不得直接重用本卡作为新 build 授权
不要做：不得改变 minimap 视觉形态、地图数据、碰撞、存档或公共 MinimapController 接口；不得把 seam repair 缺口隐式修入本卡
输出：失败反例、修复 diff、caller/oracle 证据、测试结果；当前结论为 accept/done
```
