# CODE-QUALITY-83 — game menu mode / stack contract

Status: done
Owner: Codex
Phase: phase1 game core/menu
Capability: menu mode/stack routing
Visual Verification Timing: N/A（本批为模式与栈状态合同；菜单像素由相邻 present 批次负责）

## 范围与前提

白名单仅：

- `packages/game/src/core/menu/menu-mode.ts`
- `packages/game/src/core/menu/menu-stack.ts`
- `packages/game/src/core/menu/menu-mode.test.ts`

单一 Coding Owner 为 Codex。本批只做逐文件语义核验与治理记录，不改实现、公共接口、schema/save、资源或用户可见形态；CODE53/57/79/80/81 不占用白名单。
开批基线为 `origin/main=646c8097034e4bd30a3ebde86cd61d46a2382e8a`，隔离分支为 `codex/code-quality-3y`。

一句话前提：显式 `menuStack` 必须在每个 mode tick 中把输入交给栈顶菜单，并按真实 SDLPal modal 返回域恢复 battle/event/explore；关闭栈本身不应在同一帧制造错误 dispatch。

| 方向 | 直接证据与判断 |
|---|---|
| primary source | `reference/sdlpal/uigame.c:516-650,944-1040` 的 `PAL_SystemMenu`/`PAL_InGameMenu` 返回与 goto-out；`reference/sdlpal/script.c:1158-1175` 的商店调用；`reference/sdlpal/uibattle.c:930-934,1399-1401` 的战斗状态屏返回。 |
| 第一阶段 | `mode.ts:62-76` 每帧分发 `tickMenu`；`scene-system.ts:524-536` 开大世界菜单；`menu-driver.ts:270-286,339-400,478-565,575-666` 负责栈顶输入和子菜单开关；`battle-system.ts:1705-1713` 开战斗状态屏；`bootstrap.ts:1238-1250` 注入商店入口。 |
| 第二阶段 | N/A；本批只覆盖 `packages/game` 第一阶段运行时，不接触 reforge/editor/content。 |
| 目标 | 证明 `tickMenu`、`resumeAfterMenusClosed`、`openMenu`、`closeTopMenu` 的 ownership、模式恢复、栈边界和真实 caller 合同；未知问题保持 review/pending，不以包级全绿替代逐文件证据。 |

## 逐文件核验

### `menu-mode.ts`

- 完整读取 33 行实现。`tickMenu` 先处理空栈恢复，再把输入交给 `dispatchMenuInput`，dispatch 后再次检查空栈，避免关闭最后一层后把同帧输入继续送入已不存在的菜单。
- 生产 caller 为 `mode.ts:71`；`dispatchMenuInput` 在 `menu-driver.ts:270-286` 读取栈顶，具体菜单 handler 通过 `openMenu`/`closeTopMenu` 或清空栈返回。
- 公共出口仅转出 `openMenu`/`closeTopMenu`；没有异步、资源句柄或取消状态。

### `menu-stack.ts`

- 完整读取 32 行实现。`openMenu` 只 push 并切到 `menu`；`closeTopMenu` 只 pop，模式切换留给下一次 `tickMenu`；`resumeAfterMenusClosed` 按 `battleState`、商店 waiting、普通探索三域恢复。
- caller 覆盖 scene shortcut、bootstrap shop、battle status 与 menu-driver 子菜单；`GameState.menuStack` 类型为 `ActiveMenuEntry[]`，栈顶是当前焦点，空栈是无菜单。
- 不拥有输入、渲染、保存 IO 或脚本执行；不发现共享可变模块状态、未处理 Promise 或清理缺口。

### `menu-mode.test.ts`

- 完整读取 88 行。使用真实 `createInitialGameState`、`createCommandBus`、真实 menu state factory 和真实 `dispatchMenuInput`；覆盖空栈恢复、单层/两层 Menu、inventory goto-out、open/pop 语义。
- 反例与判别力：空栈、两层栈、inventory 的整栈退出、非 Menu 输入保持 menu、battle/shop 分支由相邻 `menu-driver.test.ts` 与 `shop-menu.test.ts` 覆盖。
- 未发现恒真、只测 mock、自洽但脱离 caller 或与相邻测试重复的断言；没有新增弱测试。

## 发现与停止线

本批未发现可直接修复的输入、边界、状态 ownership、错误传播、异步取消、资源清理或公共接口缺陷。`menu-mode` 依赖的具体菜单行为仍由 `menu-driver`/各菜单文件承担，不因本批通过而关闭；battle-inspect/战斗毒键、bootstrap thumbnail、Dev Panel 生命周期继续由活动卡负责。

最强替代解释是 `battleState` 与 shop waiting 的恢复优先级可能在某个跨域复用状态中冲突；直接 caller 搜索显示 shop 入口只由事件脚本触发，battle status 只由战斗 UI 触发，未形成同一状态的生产交叉。若后续发现同一 `GameState` 同时保留 battleState 与 shop waiting，必须停线开高风险卡，不在本批修复。

## 验证结果

- 定向/相邻：`pnpm --filter @type-pal/game exec vitest run src/core/menu/menu-mode.test.ts src/core/menu/menu-driver.test.ts src/core/scene-system.test.ts src/core/battle/__tests__/battle-system.test.ts src/shell/menu-input-lock.glm-msio.test.ts --reporter=dot`，5 个测试文件 / 342 tests 通过；既有 scene-system negative-control stderr 已记录，不是新的静态诊断。
- 受影响静态门：`pnpm --filter @type-pal/game typecheck` 通过；三条白名单文件 Biome 通过。
- 全仓 `pnpm check`：docs、testing docs、phase/lore、content-review、coverage-tools、quality-tools、e2e-tools、script-governance 全部通过；content 149/1498、shared 16/131、game 314/3550、pal-extract 71/431、reforge 359/8964、editor 631/4951、migrate 96/739；lint-zero 4010 files，0 errors / 0 warnings / 0 infos。
- `pnpm coverage:ratchet` exit 0：731 source files / 19855 tests；statements 89.93% (70837/78771)、branches 83.65% (51539/61610)、functions 89.50% (13415/14989)、lines 91.81% (63295/68938)；基线、阈值和排除未变。
- `pnpm check:fast` exit 0：全部 workspace typecheck/test 与 lint-zero 通过，editor 631/4951、migrate 96/739；4010 files，0/0/0 diagnostics。
- docs/content-review/ledger closure checks pass；本批没有修改实现、schema/save、资源或公共接口。

## 推进与收口记录

Codex：premise verified / build allowed；逐文件复核与全套质量门完成，`review -> done` 由 Codex 独立 accept。未发现直接缺陷，不新增弱测试，不触碰高风险边界。该批只将三个白名单文件写入 `已验证`，其它 menu-driver、battle-inspect、dev-panel 与活动任务继续保持 review/pending。

## 剩余与交接

全仓治理尚未完成；其余 Q3 core/present/shell/analytics/tools 文件仍需逐文件核验。无下一位 Agent 提示词，继续由 Codex 从最新账本选择下一组不重叠的 2–4 个 pending 文件；不得把本批全绿推成全仓完成。
