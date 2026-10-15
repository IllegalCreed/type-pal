# CODE-QUALITY-99 — menu 输入路由中枢审核（menu-driver 及其测试）

Status: rework
Owner: GLM（2026-10-15 按总 goal 自主推进）
Reviewer: Codex（独立验收）
Phase: phase1
Capability: Q3 menu dispatch governance
Visual Verification Timing: N/A（纯数据/路由层，无产品/UI行为修改）

## Codex R2 当前验收（2026-10-15）

候选 `1f8bcd468`，独立验收分支 `codex/quality-menu-accept-94-95`，主线基点 `cddf65557`。
counter：旧非法fixture未修，cov85重复库存不合法；标题取消oracle与异步ownership缺口待补。

逐文件实际读取、primary/caller/oracle、反证、全部质量门状态和可直接复制的GLM返工提示词见
[Codex R2再验收](../evidence/CODE-QUALITY-94/codex-r2-review.md)。本卡适用该提示词；
仅修本卡已核测试/注释白名单，三个新GAME高风险draft卡无build allowed，不得开始实现。
全仓check与新ratchet/protected仍带真实诊断，不能称完整门通过；本轮0新闭合，未合main。

## GLM及前轮交付记录（历史）

下文原签字、统计与“通过”是各自revision当时的作者/前轮声明，当前以本节Codex R2为准；
不追溯改写旧回执，不用作者自验替代独立验收。交接到GLM时先fetch并核最新任务状态与独占Owner。

## 目标与范围

menu 域逐文件治理第四批（1 生产文件 + 2 测试文件，不碰 CODE94/95 白名单 30 文件与 97/98 批文件）：

- `packages/game/src/core/menu/menu-driver.ts`（1047 行，product）
- `packages/game/src/core/menu/menu-driver.test.ts`（657 行，test）
- `packages/game/src/core/menu/menu-driver.cov85.test.ts`（1007 行，test，相邻已证）

零代码改动；交付物=逐文件结论 + 死面/fixture 登记（E-7..E-9）。

## 前提真值门

一句话工程前提：menu-driver 是 menuStack 栈顶输入路由中枢，行为合同由 sdlpal 各菜单函数控制流（goto-out 语义、INNER loop、switch/confirm 阶段机）与 bootstrap 注入边界共同钉住，本批只核不改。

| 方向 | 直接证据 |
|---|---|
| Primary source | 逐 dispatcher 锚：shop `uigame.c:1615`（while 买 loop/买不起不弹 confirm）、sell `:1755`、opening `:122-152`（Cancel=新游戏）、system DH9 `:650/1031`（return TRUE→goto out 关整栈）、inventory C4 INNER loop `play.c:288-303`、use-target live refresh `uigame.c:1401-1418/1468`、equip DM23 `:1820/1857-1859` wLastUnequippedItem 入口值 + `:2016-2019` 回 list、magic `:740-861/828-835`（MP 不足退 picker）、player-status `:1265-1284`、save/load `:578-611`。 |
| 第一阶段 | 真实 caller：`menu-mode.ts:28`（tickMenu→dispatchMenuInput 每帧）、`shell/bootstrap.ts`（setMenuCatalogs/setStartGameHandler/setSystemQuitHandler/setLoadGameHandler 注入）。被路由的 11 种 ActiveMenuEntry kind 与 menu-stack/menu-mode 栈语义一致。 |
| 第二阶段 | N/A。 |
| 目标 | 逐文件四维结论 + E-7..E-9 登记；不改行为、不删代码。 |

最强替代解释：注释中的 sdlpal 控制流描述可能过时。复核：DH9（inventory-action/equip/inventory/magic/player-status/save-slot 六处 `gs.menuStack=[]`）与 menu-stack.resumeAfterMenusClosed 及各测试的"关整栈回 explore"断言一致；C4 revert-use-target 与 menu-driver.test C4 组断言一致；DM23 入口值写入与 cov85 equip DM23 断言一致——未见注释与实现/测试漂移。

## 逐文件结论（四维）

### menu-driver.ts — 通过（3 项登记）

- 正确性与边界：catalog 未注入时 requireCatalogs 显式 throw（cov85 有守卫测试）；空栈早退；save/load 异步 fire-and-forget 的失败路径 console.error 不静默（cov85 r3 组有异步生命周期测试）；applyShopTransaction confirm 期间钱变少再判（cov85:321 有测试）。
- 注释质量：极高——每个 dispatcher 头部带 sdlpal 控制流真值（含 DH9 goto-out、C2-quit 二次确认、DM23 wLastUnequippedItem 入口值防复制链、C4 INNER loop、"不 refresh 是 user 反馈道具不减少根因"等用户 bug 史锚），是"注释说明为什么"的范本。
- 内聚/耦合：dispatcher-per-kind 结构清晰；catalog/handler 单例注入由 bootstrap 显式接线（注释说明避免 import 循环的 why）；save IO 走 fire-and-forget 且 ownership 注释清楚（handler 自己关栈）。
- 发现 E-8（P3）：`dispatchInventoryMenu/dispatchEquipMenu/dispatchInGameMagicMenu/dispatchSaveSlotMenu` 的 `_bus: CommandBus` 为死参（实现不读，仅透传签名）；与 E-1 同类，公共签名清理须另卡。
- 发现 E-9（P3）：`makeEquipMenuEntry`（:1045）全仓 0 caller（注释称"W0.e/f task 内引用"已过时）——死导出，删除须另卡。
- 观察（不计缺陷）：`top.state as X` 系 kind 判别联合的窄化惯例，sdlpal 对应结构无运行时风险；shop/sell 分支的 `if/else if` 键位处理与 confirm/list 相位门一致。

### menu-driver.test.ts — review 持保留（1 项 counter）

- 合同主干真实：hub/system/quit 二次确认/switch 子选单/inventory-action/equip 换装重建（user 2026-06-01 bug 回归锚）/magic/player-status/opening/save-slot/C4 INNER loop/闪一帧修复全覆盖，断言判别力强（mode/栈深/状态字段）。
- **发现 E-7（fixture 合法性 counter，与 CODE95 同类）**：约 6 处 `as unknown as Item[]`/`as any` 部分对象 fixture——含 :295-298 部分 Item（无 flags/price）、:354 `equipableBy: { 0: true }` 对象形（合法类型是 6 元数组）+`equipPart` 蛛网膜外键、:429-439 部分 PlayerRoles、:588/:623 `as any`。driver 虽只读子集，但按 CODE95 裁定口径"不可借只读字段把非法对象算业务覆盖"，此文件不随本批复核升为通过；修复（typed 工厂化）并入 E-批统一做——现在改会触发 coverage 范围门（执行 digest 变化）且破坏与 5cb6b9d22 树共用门禁的声明。

### menu-driver.cov85.test.ts — 通过

- 零强转（grep 0 处 `as unknown as|as any|as never`）：mkItem/mkSpell/mkMagic 全 typed Partial 工厂。
- 覆盖完整：11 种 kind 全路由、8 键精确落点、买/卖交易含钱变再判、异步生命周期（load fire-and-forget/save 微任务后 wSavedTimes）、错误路径（catalog 缺项）、菜单栈恢复（shop 关闭续跑脚本）。

## 验证

- 定向：menu-driver.test + menu-driver.cov85.test + menu-mode 相邻 = 3 files / 79 tests PASS（VITEST_MAX_WORKERS=1，2026-10-15 00:57）。
- 全门：本批零代码改动，与 CODE94/95 批共用同一棵已过全门的树（`5cb6b9d22`）+ 97/98 批后 docs/lint 复验；本批追加文档后 check:docs / lint / ledger 复验见证据目录。
- 账本：menu-driver.ts 新增 1 行 review；menu-driver.test.ts/cov85 按工具口径为 test 记录（本卡结论为准）。

## R2/C5 返工（2026-10-15，响应 Codex codex-r2-review）

- menu-driver.test.ts 全面 typed 化（E-7 修复）：新增 mkItem/mkSpell/mkMagic 构造器+复用 makeRole；清 as unknown as×6/as any×3（含对象形 equipableBy、equipPart 蛛网膜外键、部分 Spell/Magic/PlayerRoles）；三处循环"试出"目标的弱遍历改为确定性 cursor 安排（inGameCursorFor 按 choice 映射定位）+单次 dispatch+精确 kind 断言。
- cov85.test.ts：两处 11 条库存改 11 个**不同**合法 itemId（真 addItemToInventory 按 id 合并，同 id 重复 push 非生产库存形态，目录同步扩展）；补 save/load handler 异步 reject（catch 域吞掉不外泄）与同步 throw（穿透 dispatch，Promise.resolve 不裹同步域）两条 ownership oracle。
- C3 取消光标真值归高风险卡；E-8（_bus 死参）维持登记。

## 下一步

Codex 独立验收；E-7/E-8/E-9 并入 E-1..E-6 待 94/95 验收后的实现批（E-7 触发 coverage 范围门，须同批 ratchet）。menu 域 core+driver 全覆盖完毕；后续换域选批。无用户裁决需求。
