# CODE48 draw-equip 当前复审切片

基点：`499f2762`；分支：`codex/code-quality-3y`。本片重新复审历史 48 的装备列表/选人页绘制，不把历史 `done`、旧测试数量或旧全仓门当作当前整卡验收。48 当前复审提升为 `partial`，未标 accept/done。

完整读取 `packages/game/src/present/menu/draw-equip.ts`（279 行）、`draw-equip.glm-phase1-leaves.test.ts`（124 行）、`equip-role-pixels.grok-r1.test.ts`（367 行）和相邻真实 caller/oracle `packages/game/src/present/__tests__/grok-present/p03-equip.test.ts`（208 行）。核对 `draw-menu.ts` 装备出口、`present.ts` runtime projection 注入、`core/menu/equip-menu.ts` 状态生命周期、`menu-driver.ts` 装备 dispatch 与 `inventory-menu.ts` 正常库存不变量；primary 为 SDLPal `reference/sdlpal/uigame.c:1793-2055`、`itemmenu.c:28-224`、`play.c:328-359`、`global.c:1175-1225`。

核对轴包括：list/pick-role/done ownership、复用 `drawInventoryMenu` 的 filter 合同、equipBg/icon 缺失降级、party 顺序与 roleId 的 equipable 位、6 槽装备名、5 项 effective stats、数量/数字 sprite、角色框行数、四种颜色、选中 cursor、空槽/未知 catalog/缺 role/越界 cursor、输入快照隔离和 framebuffer 写入。

当前实现与生产 caller/primary 一致，未发现可直接证明的实现缺陷。SDLPal 选人页对 `PAL_GetItemAmount` 无条件绘制数字；TS 对数量 `<=0` 隐藏数字，但正常库存 owner 在归零时删除条目，`confirmEquipItem` 还要求 `count - inUse > 0` 才能进入 pick-role，因此零数量是直接夹具可构造的防御输入，不是生产可达的装备确认路径。该差异作为边界保留记录，不擅自改变用户可见行为或公共接口。

测试判别力：P03 覆盖真实 list→pick-role、六槽名称、攻击预览、背景/图标和不可装备颜色；GLM leaves 覆盖非顺序 party、roleId 位映射、未知已装备/空槽/缺 role；像素测试覆盖单人框、done/未选 item/未知 id、越界 cursor、零数量、灵力/防御/身法/吉运、现行库存数量与快照隔离。没有把测试数量或 fixture 自检当作整卡验收。

验证：

- 直接：3 files / 16 tests passed。
- 相邻：9 files / 167 tests passed（equip-menu/menu-driver、inventory/menu/present caller 与 P01）。
- `pnpm --filter @type-pal/game typecheck` passed。
- 本片未运行 coverage ratchet、official coverage、protected fast、全仓 `pnpm check`；按用户成本边界留到完整 game/present 模块收口，不能据此宣称统一质量门通过。
- 未触碰 schema/save/migration、生成物、资产格式、公共接口或产品 UI 取舍。

本片只更新复审证据、任务索引和逐文件账本；48 整卡仍为 `partial`，后续需要统一门窗口再决定是否收口。
