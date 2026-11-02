# CODE-QUALITY-52 — game draw shop wave member

Status: done
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: task-card-v1 / 1.0.0

## 目标

原卡目标:逐文件核验商店买/卖绘制三文件（`draw-shop.ts` 与 glm-phase1-leaves、shop-preview-pixels.grok-r1 两测试）:买入列表/价格、预览框/图标、ownedCount（live 库存+装备 `rgwEquipment`）、金钱、确认框、卖价 overlay（仅 sellable item 显示,空 cursor 仍画框）、缺目录/缺帧边界与 framebuffer ownership,对齐 SDLPal `uigame.c:1503-1777`;绘制层不拥有购买/出售副作用。与 CODE-QUALITY-51 组成 present/menu wave。

## 范围

三文件;只读相邻 P04 caller/oracle、draw-menu 公共出口、shop-menu 状态、menu-driver 买/卖 state 与 inventory mutation。商店观感留集中 E2E。

## 前提与证据

pixels 测试覆盖 rightText 价格、阴影/缺帧/透明孔/半价/装备 owned/0 金钱;GLM leaves 覆盖 owned/空店/非卖品。2026-10-18 Codex 复审:实现、ownedCount、价格/半价、确认/overlay 和资源边界与 primary/caller 一致;直接范围 3 files 中 18 tests passed,`shop-preview-pixels.grok-r1.test.ts` 另有 1 条 `document is not defined` 环境诊断,该文件保持 review,52 当前复审 partial 不标 accept。证据见 [README.md](../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/52-draw-shop/README.md)。

## 验收

历史批（wave 完整后统一门）:定向 3 files/19 tests、全仓 `pnpm check`、coverage ratchet、protected fast、lint-zero 3994 files 0/0/0、docs/content review、diff-check、ledger 通过;账本 3266/275 closed。2026-10-21 renderer 八维与统一门收口:正常夹具显式 hydrate 并补装备资格;owned/半价/非卖品/缺资源的真实像素及已有反控沿未变合同复用;三份同体 opaque 与相同色循环共享,短 mask 策略不同的 shadow 不强合;买紧凑、卖全屏分工不改。逐文件记录见 [renderer-local.json](../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/renderer-local.json),完整集中门与原件见 [renderer-gates.json](../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/renderer-gates.json)。

## 状态与交接

done 保持原历史语义;2026-10-18 复审 partial（pixels 环境诊断文件保持 review）;2026-10-21 renderer 收口按原三文件接受且不附带广域接受。无产品代码/schema/save/资源格式变化。

## 历史范围

原卡属 2026-10-12 wave 时点;原始记录与历史提示词在保全块内逐字保留。

## 原始结论

原卡结论按 Status(done) 原样:未发现 counter;测试合法 typed state、真实 draw caller、直接 framebuffer/palette oracle 并与 P04 排重。治理不撤销/不恢复旧信用。

## 当时证据

当时回执（19 定向、wave 统一门、lint 3994 零诊断）属原时点证据;本页不重跑、不复授。

## 当前有效性

仅历史任务归属有效;pixels 环境诊断按 2026-10-18 复审保持 review,renderer 收口结论以其原件为准。

## 继任文档

CODE-QUALITY-85/93（shop/sell 状态机侧）与 renderer 收口证据为相邻/继任;当前任务导航以看板为准。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 6699B / SHA-256 5b40c7ffcd866a0614f1ad917cf9bc7fc64dfd7a834323f0778e512082b2af80；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
````markdown
# CODE-QUALITY-52 — game draw shop wave member

Status: done
Owner: Codex
Reviewer: Codex（独立验收）
Phase: phase1 game
Capability: Q3 present/menu wave
Visual Verification Timing: e2e-deferred（商店观感留集中 E2E；本批核 framebuffer、价格/库存与 overlay 合同）

## 目标

逐文件核验商店买/卖绘制实现及两份专属测试，确认买入列表/价格、预览框/图标、ownedCount（库存+装备）、金钱、确认框、卖价 overlay、缺目录/缺帧边界与 framebuffer ownership 对齐 SDLPal；本卡与 CODE-QUALITY-51 组成 present/menu wave，先完成定向证据，wave 完整后统一跑全仓门。

## 范围

- `packages/game/src/present/menu/draw-shop.ts`
- `packages/game/src/present/menu/draw-shop.glm-phase1-leaves.test.ts`
- `packages/game/src/present/menu/shop-preview-pixels.grok-r1.test.ts`

只读相邻 oracle：`packages/game/src/present/__tests__/grok-present/p04-shop.test.ts`、`draw-menu.ts`、`present.ts`、`core/menu/shop-menu.ts`、`menu-driver.ts`、`reference/sdlpal/uigame.c:1503-1777`。

## 前提真值门

- 一句话行为 / 工程前提：买/卖菜单绘制只把现有 `ShopMenuState`、运行时库存/装备与资源投影到 framebuffer，保持 SDLPal 买入预览布局和卖出 overlay 的既有产品形态。
- 真值来源：`reference/sdlpal/uigame.c:1503-1590,1615-1703,1709-1777`（买入/卖出布局、owned、价格/半价、框体/图标）；`packages/game/src/core/menu/shop-menu.ts:1-220`（state/price/confirm 生命周期）。
- 当前 `before` -> 目标 `after`：维持现行商店形态和价格/库存显示 -> 逐文件证据、定向测试与 wave 质量门齐全后登记已验证；发现 primary/caller 冲突立即停线。
- 最强替代解释 / 什么观察会推翻前提：现有像素 fixture 可能掩盖 live inventory/equipment ownership、空列表和缺目录；真实 caller 或 primary source 反例击穿时留 review/rework。
- 是否主动偏离已核真值：N/A（只读审计，暂不改变用户形态）。

## 上下文锚点

- `draw-menu.ts:211-242` 是 shop-buy/shop-sell 公共绘制出口；`menu-driver.ts:317-370` 负责 buy/sell state 与 inventory mutation，绘制层不拥有购买/出售副作用。
- `ownedCount` 必须读取 live inventory 与 `PlayerRolesRuntime.rgwEquipment`；`drawSellOverlay` 售价只在 sellable item 上显示，空 cursor 仍画框。
- 3 个范围文件已全文读取；P04 caller/oracle覆盖正常买入/卖出/确认；GLM leaves覆盖 owned/空店/非卖品；pixels覆盖 rightText 价格、阴影/缺帧/透明孔/半价/装备 owned/0 金钱。

## 验证

- 定向：`draw-shop.glm-phase1-leaves.test.ts`、`shop-preview-pixels.grok-r1.test.ts`、P04 caller。
- 测试质量：合法 typed state、真实 draw caller、直接 framebuffer/palette oracle、反例判别力、旧 P04 排重、输入快照隔离和时间冻结。
- 全仓门：延至 present/menu wave（CODE-QUALITY-51 + CODE-QUALITY-52）完整后统一运行 `pnpm check`、ratchet、protected fast、lint-zero、docs/content review、ledger。

## 当前模式推进记录

- Codex 范围/前提核验: verified（已读取实现、测试、caller/state 与 primary source）
- 受委派 Coding Owner / 隔离分支: Codex / `/Users/zhangxu/illegal/type-pal-quality-3x` / `codex/code-quality-3y`
- build 准入: Codex build allowed（本卡只读审计；发现行为冲突立即升级）
- 贡献者交付/自验: N/A
- Codex 独立验收: accept（3 文件逐段证据、独立 shop review、定向 19 tests、wave 全量质量门完成；未发现 counter）
- 用户产品裁决/体验验收: N/A（保持现有形态）
- done 准入: Codex done allowed；wave 统一质量门已通过，本批无产品代码修改。

## 交接

- 2026-10-12 Codex：present/menu wave 第二成员完成。独立只读复核支持 accept（primary/caller/oracle、framebuffer ownership、ownedCount/价格/半价/缺资源边界）；定向 3 files/19 tests 通过；与 CODE-QUALITY-51 一起通过全仓 `pnpm check`、coverage ratchet、protected fast、lint-zero（3994 files 0/0/0）、docs/content review、diff-check、ledger。无产品代码/schema/save/资源格式变化；账本收口为 `3266 / 275 closed / 5 review / 2986 pending`。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-52 game draw shop wave member
任务卡：docs/ops/tasks/CODE-QUALITY-52-game-draw-shop-wave-member.md
当前状态：build，属于 present/menu wave
角色：Codex 独立核验；允许读/测本卡白名单，不得标记 done
先读：本卡、AGENTS.md、CLAUDE.md、reference/sdlpal/uigame.c:1503-1777、draw-shop.ts、3 个定向/相邻测试
请做：跑定向测试并记录 primary/caller/oracle；等 wave 完整后统一跑全仓质量门
不要做：不得改变产品形态、schema/save、资源格式或公共接口；不得用单包全绿关闭文件
输出：证据、测试结果、counter/返工项，或 wave 收口待办
```


## Codex 当前复审（2026-10-18）

历史 `done` 不等于本轮验收。本轮完整读取实现、两份直接测试、P04 caller/oracle、shop/menu 生命周期与 SDLPal `uigame.c:1503-1777`；实现、ownedCount、价格/半价、确认/overlay 和资源边界与 primary/caller 一致。直接范围 3 files 中 18 tests passed，`shop-preview-pixels.grok-r1.test.ts` 另有 1 条 `document is not defined` 环境诊断；相邻 6 files / 117 tests 和 game typecheck 通过。该测试文件保持 `review`，52 当前复审为 `partial`，不标 `accept`。证据见 [`52-draw-shop`](../../../../ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/52-draw-shop/README.md)。

## 2026-10-21 renderer八维与统一门收口

本轮按原范围逐项A–H接受；实际caller/primary、结构取舍、测试判别力/合同迁移及当前身份见[逐文件记录](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/renderer-local.json)。有效旧证据按版本复用，不继承历史done或包绿信用。

只按shop原三文件：正常夹具显式hydrate并补装备资格；owned/半价/非卖品/缺资源的真实像素及已有反控沿未变合同复用。三份同体opaque与相同色循环共享，短mask策略不同的shadow不强合；买紧凑、卖全屏分工不改。

[完整集中门与原件](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/renderer-gates.json)同时披露check之后唯一baseline授权数据条目及其86consumer复验，不冒称原check已执行新数据。无产品行为/schema/save/管线/调用接口变化；视觉/E2E仍按原卡延后，不附带广域文件接受。提交/推送/合main依实际最终门与Git交接。
````
<!-- incremental-original-source:end -->
