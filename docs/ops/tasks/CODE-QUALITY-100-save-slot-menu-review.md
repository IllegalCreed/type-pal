# CODE-QUALITY-100 — 存档槽菜单审核（save-slot-menu 切片）

Status: rework
Owner: GLM（2026-10-15 按总 goal 自主推进）
Reviewer: Codex（独立验收）
Phase: phase1
Capability: Q3 save-slot menu governance（存档域边界切片）
Visual Verification Timing: N/A（纯数据层，无产品/UI行为修改）

## Codex R2 当前验收（2026-10-15）

候选 `1f8bcd468`，独立验收分支 `codex/quality-menu-accept-94-95`，主线基点 `cddf65557`。
counter：内存回归误称IndexedDB，模拟counter未执行driver，过时注释和排重待修。

逐文件实际读取、primary/caller/oracle、反证、全部质量门状态和可直接复制的GLM返工提示词见
[Codex R2再验收](../evidence/CODE-QUALITY-94/codex-r2-review.md)。本卡适用该提示词；
仅修本卡已核测试/注释白名单，三个新GAME高风险draft卡无build allowed，不得开始实现。
全仓check与新ratchet/protected仍带真实诊断，不能称完整门通过；本轮0新闭合，未合main。

## GLM及前轮交付记录（历史）

下文原签字、统计与“通过”是各自revision当时的作者/前轮声明，当前以本节Codex R2为准；
不追溯改写旧回执，不用作者自验替代独立验收。交接到GLM时先fetch并核最新任务状态与独占Owner。

## 目标与范围

menu 域收完后换域第一批：存档槽菜单切片（1 生产 + 2 专属测试 + 2 相邻），不碰 CODE94/95 白名单与 97/98/99 批文件：

- `packages/game/src/core/menu/save-slot-menu.ts`（92 行，product）
- `packages/game/src/core/menu/save-slot-menu.test.ts`（208 行，test）
- `packages/game/src/core/menu/save-slot-menu.glm-phase1-leaves.test.ts`（52 行，test）
- 相邻证据：`menu-save-chain.glm-msio.test.ts`、`menu-driver.cov85.test.ts`（已证/他卡）

零代码改动；交付物=逐文件结论。

## 前提真值门（含存档域高风险边界核验）

一句话工程前提：save-slot-menu 只做槽位选择状态机 + SlotMeta 只读异步拉取，不触碰 save schema/写路径；save/load 动作 ownership 在 menu-driver（CODE-99 已核）与 bootstrap handler/Save API（另域）。

| 方向 | 直接证据 |
|---|---|
| Primary source | save-slot-menu.ts:2 锚 `uigame.c:169-242` PAL_SaveSlotMenu；:30-34 WORD.DAT id 43+i（进度一..五）真值；:43 DM24 锚 `:582/605`（bCurrentSaveSlot 传参）→ `:225` cursor=slot-1；test:129 锚 `:589-597` cross-slot savedTimes counter。 |
| 第一阶段 | 真实 caller：全部 5 个导出被 menu-driver.ts:100-105/450-451/450-458/577-585 消费（opening load push、system save/load push、dispatch 导航/确认）；draw-menu.ts:419 每帧读 slotMetas 渲染。 |
| 第二阶段 | N/A。 |
| 目标 | 逐文件四维结论；不改行为、不删代码；不触碰 save/api.ts（另域另卡）。 |

高风险边界核验：本文件对 Save API 只有 `Save.listSlots()` 只读（fetchSlotMetas catch→console.warn 不静默）；无 schema 字段、无写路径、无迁移面 → 无 schema/save 停线触发项。写路径（Save.saveSlot/loadSlot）在 menu-driver/bootstrp 域已由 CODE-99/cov85 异步生命周期测试覆盖；Save API 本体留待存档域专项。

最强替代解释：注释锚可能过时。复核：DM24 defaultSlot id 反查（非下标）与 leaves 测试非顺序 slot id [10,20] 断言一致；cross-slot max+1 算法测试断言具体值 1/2/3/4（非自比）；未见漂移。

## 逐文件结论（四维）

### save-slot-menu.ts — 通过

- 正确性与边界：空列表防御（current undefined、导航不抛错）、defaultSlot 越界保持 0（idx<0 分支）、非顺序 slot id 按 id 反查均有测试；fetchSlotMetas 失败路径 console.warn 不吞。
- 注释质量：高——WORD.DAT id 真值（GBK 解+rstrip）、DM24 默认槽号语义（1-based→cursor=slot-1）、异步 fill 的"draw 每帧重读无需 trigger"ownership 说明齐全。
- 内聚/耦合：同步工厂+导航纯函数；唯一 IO（listSlots 只读）fire-and-forget 且边界注释清楚；save/load 动作不在此层（dispatcher/handler ownership 分离正确）。
- 复用：正确复用 primitives.SelectionMenu；无死面（5 导出全有生产 caller）。

### save-slot-menu.test.ts — 通过

- 真实 IO 集成：IndexedDB before/afterEach `_clearAllForTest` 隔离；roundtrip 断言具体字段（cash/sceneId/savedTimes/partyLevel/HP/level/inventory）；deep-clone 语义（loaded 改不影响 saved）有判别性断言；cross-slot counter 测试断言具体序列值非自比。
- 无强转；typed 输入。

### save-slot-menu.glm-phase1-leaves.test.ts — 通过

- 去重表明确"只测同步合同不碰 IO"；defaultSlot 三分支（命中/非顺序/越界）+ 空列表防御全覆盖。

## 验证

- 定向：save-slot-menu×2 + 相邻 menu-save-chain.glm-msio + menu-driver.cov85 = 4 files / 56 tests PASS（VITEST_MAX_WORKERS=1，2026-10-15 01:00）。
- 全门：零代码改动，共用 `5cb6b9d22` 树完整门禁 + 97/98/99 批后 docs/lint 复验；本批追加文档后复验见证据目录。
- 账本：新增 1 行 review。

## R2/C5 返工（2026-10-15，响应 Codex codex-r2-review）

- 删除 simulateSave 聚合模拟测试（自写模型重复 dispatcher 逻辑不算 caller 证据；真 driver 聚合由 menu-save-chain.glm-msio 承担）。
- 更正本卡与账本的错误声明：原"真实 IndexedDB 集成带 _clearAllForTest 隔离"不实——game vitest(jsdom) 无 indexedDB，走 api.ts 内存 fallback（CODE-101 已核环境事实）；leaves 头注释"fetchSlotMetas×IndexedDB"同步更正。
- save-slot-menu.ts 头注释幽灵引用 createSaveSlotMenuAsync 更正为 fetchSlotMetas 真链；leaves 补 slot10/20 公开工厂防御域限定注释（生产槽位恒 1..5）。

## 下一步

Codex 独立验收；E-1..E-9 仍等 94/95 验收。后续候选：Save API 存档域本体（save/api.ts，须先核 schema/IndexedDB 边界）或 game present 剩余 pending。无用户裁决需求。
