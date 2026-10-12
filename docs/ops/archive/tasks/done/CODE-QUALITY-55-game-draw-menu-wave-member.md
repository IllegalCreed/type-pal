# CODE-QUALITY-55 — game draw menu wave member

Status: done
Owner: Codex
Reviewer: Codex（独立验收）
Phase: phase1 game
Capability: Q3 present/menu wave
Visual Verification Timing: e2e-deferred（剧情/观感留集中 E2E；本批核功能性菜单像素与状态转发）

## 目标

逐文件核验大世界菜单统一绘制入口及两份专属测试，确认 menu stack 顺序、主菜单/系统菜单/存档槽/库存动作/商店卖出叠层、缺资源占位、颜色闪烁、cash 与数字绘制，以及额外资源转发都保持 SDLPal 与当前状态机合同；只读审计，不改变产品形态或公共接口。

## 范围

- `packages/game/src/present/menu/draw-menu.ts`
- `packages/game/src/present/menu/draw-menu.test.ts`
- `packages/game/src/present/menu/draw-menu.glm-phase1-leaves.test.ts`

只读相邻 caller/oracle：`packages/game/src/present/present.ts:679-690`、`packages/game/src/present/__tests__/grok-present/p05-menu-stack.test.ts`、`packages/game/src/core/menu/menu-mode.ts`、`packages/game/src/core/menu/in-game-menu.ts`、`packages/game/src/core/menu/save-slot-menu.ts`、`packages/game/src/core/menu/inventory-action-menu.ts`、`packages/game/src/core/menu/sell-menu.ts`、`packages/game/src/core/menu/player-status.ts`、`packages/game/src/core/game-state.ts`、`packages/game/src/core/menu/menu-driver.ts`、`reference/sdlpal/uigame.c:42-167,169-242,430-620,878-919,990-1010,1503-1777`、`reference/sdlpal/ui.c:458`。

## 前提真值门

- 一句话行为 / 工程前提：`drawMenuStack` 只按 `GameState.menuStack` 从底到顶投影现有 state 与已注入资源到 framebuffer；输入、菜单生命周期、库存/存档副作用归 core/menu-driver 所有。
- 原版/primary source：`uigame.c` 读取菜单 state 后按固定坐标、颜色和 box 形态绘制；`ui.c:458` 的 `PAL_ReadMenu` 负责选中/未选中与阴影；存档数字、cash、system switch/quit confirm 与 shop sell overlay 均在上述 anchors。
- 第一阶段当前实现：`draw-menu.ts:99-452` 统一 dispatch；`present.ts:679-690` 注入 `playerRoles/items/spells/magics/statusBg/equipBg`；`menu-driver.ts` 执行输入与状态迁移，绘制层不写 state。
- 当前二阶段目标：只做逐文件证据收口，保持现有菜单坐标、文案、资源 fallback 和 stack 叠层行为。
- 当前 `before -> after`：文件仍待逐文件核验 -> 以 primary/caller/oracle 与波次测试登记已验证；发现输入 ownership 或用户可见行为冲突立即留 review/rework。
- 最强替代解释 / 可证伪观察：真实 word table 宽度、非默认 menu state、缺 catalog 资源或异步 slot metadata 可能暴露硬编码坐标/宽度与占位策略偏差；需要 caller/oracle 反例才能关闭，不能以主菜单五个 happy path 推断全部分支。

## 上下文锚点与风险

- `drawMenuStack` 的 stack 顺序必须保持底层 cash/菜单先画、顶层 confirm/overlay 后画；`present.ts` 仅在可绘制 menu mode 调用，事件对话路径由 caller gate 控制。
- `draw-menu.ts` 的 status/equip/magic 缺 `playerRoles` 时画 Missing menu data 占位；这是启动/测试防御合同，不得擅自改为 silent return 或强制资源注入。
- `save-slot` 的 `slotMetas` 是异步只读投影；菜单绘制不得写 IndexedDB 或修改 `GameState`。
- 本批属于功能性 UI 但不改产品形态；视觉观感集中 E2E 延后，像素和状态隔离在本批定向闭环。

## 验证

- 直接定向：`draw-menu.test.ts`、`draw-menu.glm-phase1-leaves.test.ts`。
- 相邻 oracle：`p05-menu-stack.test.ts` 与 `present.test.ts` 中 menu-mode gate。
- 统一波次门：与 CODE-QUALITY-54 一起通过 `pnpm check` 第二次 exit 0、官方 `pnpm coverage:ratchet`、`TYPE_PAL_COVERAGE_BASE_REF=origin/main pnpm coverage:fast`、lint-zero（3994 files，0/0/0）、docs/content review 和 ledger。

## 当前模式推进记录

- Codex 范围/前提核验: verified（实现、两份专属测试、真实 present/core/menu caller 与 primary anchors 已全文读取）
- 受委派 Coding Owner / 隔离分支: Codex / `/Users/zhangxu/illegal/type-pal-quality-3x` / `codex/code-quality-3y`
- build 准入: Codex build allowed（只读审计；发现行为冲突立即升级）
- 贡献者交付/自验: N/A
- Codex 独立验收: accept（3 文件全文、primary/caller/oracle、draw-menu/P05/present 定向 15 + 波次相邻 93、全仓质量门均通过；未发现直接缺陷）
- 用户产品裁决/体验验收: N/A（保持现有形态）
- done 准入: Codex done allowed；本批无实现改动。

## 交接

- 2026-10-13 Codex：与 CODE-QUALITY-54 组成相邻 present 波次；draw-menu/P05 定向 15/15，tilemap + menu + present 定向/相邻共 93 tests；全仓 `pnpm check`、官方 ratchet、protected fast、lint-zero、docs/content review、ledger 全部通过。draw-menu 不拥有 poison key，runtime-zero/poison canonical 仍由 CODE-QUALITY-53 阻塞；账本收口为 `3266 / 281 closed / 5 review / 2980 pending`。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-55 game draw menu wave member
任务卡：docs/ops/tasks/CODE-QUALITY-55-game-draw-menu-wave-member.md
当前状态：done，已归档
角色：历史交接记录；不得修改实现或扩张产品形态
先读：本卡、AGENTS.md、CLAUDE.md、reference/sdlpal/uigame.c 相关 anchors、draw-menu.ts 及两份专属测试、p05-menu-stack.test.ts
请做：若重开审计，重新确认 stack/坐标/颜色/资源转发/输入隔离与 primary/caller/oracle；不得直接重用本卡作为新 build 授权
不要做：不得用包级全绿替代逐文件证据；不得改 menu state、schema/save、资源格式或公共接口
输出：证据、定向测试结果、剩余风险；当前结论为 accept/done
```
