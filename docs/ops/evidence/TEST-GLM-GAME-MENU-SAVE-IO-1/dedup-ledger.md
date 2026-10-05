# TEST-GLM-GAME-MENU-SAVE-IO-1 排重账（GLM r1）

范围口径：`packages/game` 的 shell/input·input-replay·main-loop、core/menu 全部菜单、
core/save/api·indexed-db、tools/save-io·quick-save。旧测 fullName 清单用
`npx vitest list` 全量导出（348 条，覆盖 43 个相关测试文件，见本目录
`inventory-vitest-list.txt`），逐条核对 caller/合法输入/oracle 后分四类：新增（NEW）、
已证登记（REG）、开放发现（U）、受阻/不可达（BLOCKED/UNREACHABLE）。

## NEW — 8 条新增合同（3 个新测试文件）

| # | fullName（缩写） | source:line | 公开 caller | 合法 typed 输入 | 业务 oracle | 与最近旧测差异 |
|---|---|---|---|---|---|---|
| MSIO-A1 | 菜单 modal 输入锁:按住右 3 tick,party 冻结 + hub 光标 0→1 | `menu-stack.ts:24-27`(openMenu 置 mode)、`mode.ts:68`(menu 路由) | `tickN`(main-loop headless 入口,与 startRafLoop 共用 singleTick) | 真实 `createInitialGameState` + `openMenu(hub)` + `ReplayInputSource` 3 帧按住右 | `party.x/y` 恒 16×16/16×8（East 步进被锁）且 `hub.selection.cursor=1`（输入达菜单） | main-loop.test.ts:39 只证 explore 行走；menu-mode.test.ts 只经 tickMenu 证栈语义,无人证「菜单期间世界冻结 + 输入仍达菜单」整链 |
| MSIO-A2 | 菜单按 Menu 关闭后下一 tick 起方向恢复驱动 party(2 步 East) | `menu-stack.ts:12-21`(resumeAfterMenusClosed) | `tickMenu`(真实帧 caller)关栈 + `tickN` 走路 | 同上,Menu 帧 + 2 帧 Right | 关栈后 `mode='explore'` 且 2 步 East `+2*16/+2*8` | menu-mode.test.ts:25-41 只断言 mode 字符串,未证锁释放后真实行走恢复;若 resume 误切他 mode,本合同少走/不走可判别 |
| MSIO-A3 | hub 同帧 Menu+Confirm → 取消优先关整栈,不开子菜单 | `menu-driver.ts:459-469`(dispatchInGameMenu Menu 先查+return) | `tickMenu` | 同帧 `pressed={Menu,Confirm}`(真实浏览器同帧窗口可达) | 终态 `menuStack` 空 + `mode='explore'`;若 Confirm 先行则状态屏入栈再被 pop → 栈长 1 可判别 | 全部菜单 dispatcher 单键逐帧测(cov85/menu-driver.test),同帧双键只有 explore 侧 scene-system.test.ts:287(Menu 优先于快捷键),菜单侧同帧优先级未证 |
| MSIO-C1 | slot3 已存 savedTimes=7 → system 存 slot1:gs.wSavedTimes=8、slot1 meta=8、slot3 不被改写 | `menu-driver.ts:1008-1021`(dispatcher save 真链)、`api.ts:40-48`(extractMeta) | `dispatchMenuInput`(system→save-slot Confirm) | 预置 `Save.saveSlot(3, gs.wSavedTimes=7)`(公开 API)后真开菜单确认 | 微任务后 `gs.wSavedTimes=8`(跨槽 max+1)、`listSlots` slot1 savedTimes=8/cash=555、slot3 恒 7 | cov85:972 只证空表 max 0+1=1;save-slot-menu.test.ts:142「dispatcher 模拟」是测试内自算算法,非真 dispatcher 聚合;真链跨槽聚合从未证明 |
| MSIO-D1 | parseImportedSave:partyMembers 合法但 wNumScene 缺失/非数 → 拒 | `save-io.ts:21`(必填守卫 wNumScene 臂) | `parseImportedSave` | 合法导出头 + `gs={partyMembers:[0]}` 与 `wNumScene:'5'` 两形 | 两形均抛 `存档缺必要字段` | save-io.test.ts:20 只打 partyMembers 臂;wNumScene 臂(缺失+类型错)未证 |
| MSIO-E1 | F5/F9 keydown 被 preventDefault,非目标键(F6)放行 | `quick-save.ts:25-33` | `setupQuickSave` 绑的真实 window keydown | 真实 `KeyboardEvent`(cancelable) | `defaultPrevented` F5/F9=true、F6=false | quick-save.test.ts 只证 deps 被调;拦截浏览器刷新(不拦=按快存丢游戏)未证 |
| MSIO-E2 | F5 存档失败(saveSlot 拒绝)→ 错误 toast 带原因,不外抛 | `quick-save.ts:47-49`(catch 分支) | 同上 + DI deps(`QuickSaveDeps` 公开注入缝) | `saveSlot` 抛 `磁盘已满`(IO 失败注入点为模块自带的 DI seam,非 mock 业务核心) | 真实 DOM toast 容器出现 `✗ 存档失败:磁盘已满`(tp-toast-error),无未捕获异常 | 旧测无失败路径;可恢复 IO 失败的用户可见反馈未证 |
| MSIO-E3 | F9 空槽 → `存档位 1 为空` 错误 toast;成功 → `已从存档位 1 读取` 成功 toast | `quick-save.ts:52-57`(ok 三元两臂) | 同上 | `loadSlotIntoGame` resolve false/true 两臂 | 两臂各自 toast 文案 + error/success 类 | 旧测只证 loadSlotIntoGame(1) 被调,结果反馈(用户唯一可见结果)未证 |

反控：8/8 VALID（每针源码单点变异 find 恰 1 次 → 定向文件全量跑，红相位 exit≠0、
failed 恰 1 且为目标合同、首条失败为业务 AssertionError；恢复后源 sha256 与原始一致、
复跑全绿）。见 [mutation-results.json](mutation-results.json)。

## REG — 已证登记（同 caller 同 oracle，不新增包装）

输入（shell/input.ts / input-replay）
- 键位映射全表/WASD 原义/Numpad/未知键→null：input.test.ts:53-59。
- held/pressed 生命周期、snapshot 防别名、clearPressed、detach：input.test.ts:60-61、input.boundaries.test.ts:24-26。
- 后按优先（delete-then-add）、e.repeat 不刷序不污 pressed：input.test.ts:62-65、input-replay.grok-r1.test.ts:13-14。
- DM30 fade 抑制（仅方向键、物理松开解除、clearPressed 不解除）：input.test.ts:69、input-replay.grok-r1.test.ts:18、input.boundaries.test.ts:25。
- 回放耗尽空快照帧号/游标越界、录制源 identity：input-replay.grok-r1.test.ts:19-23。

主循环（main-loop.ts）
- interval 40/100、clamp、present 门控（palette/dither/battleFade/battleAnim）、frozen 冻结、DM31 结转：main-loop.test.ts:3-8、main-loop-gates.grok-r1.test.ts:40-52。
- scene-fade 吞键边界四态：main-loop.test.ts:9-12。
- tickN Replay 行走语义（East +16/+8）：main-loop.test.ts:39-56（本卡 A1/A2 的行走 oracle 复用此真值）。

菜单栈/骨架（menu-stack.ts / menu-mode.ts）
- 栈空→explore、pop 一层、openMenu/closeTopMenu 语义：menu-mode.test.ts:84-90。
- DH9 goto-out 关整栈（inventory Menu 等）：menu-mode.test.ts:88。
- shop 关闭 → 清 shop 等待续跑脚本（resumeAfterMenusClosed event 分支）：menu-driver.cov85.test.ts:889。
- **battle 分支**（栈空且 battleState → mode='battle'）：battle-system.test.ts:1696 已证（Status 键开状态屏 → 关闭回 battle），本卡不重复。

菜单 dispatcher（menu-driver.ts，单键导航/确认/取消全表）
- hub/system/inventory-action/inventory/equip/in-game-magic/player-status/save-slot/shop-buy/shop-sell 的位移、确认、取消、禁用项、错误返回、异步生命周期：menu-driver.test.ts:150-186、menu-driver.cov85.test.ts:117-149（含 confirm 期钱变少交易被拒=资源回滚、MP 不足禁用、catalog 缺项错误返回、fire-and-forget 不阻塞关栈、switch/quit 全臂）。
- save-slot 上下文取消（in-game 关整栈/opening pop 回）：cov85:141。
- save 模式 Confirm 写 currentSaveSlot+关整栈：cov85:834-843。load 有/无 handler：cov85:845。
- 大世界快捷键四臂（UseItem/ThrowItem/Force/Status → inventory/equip/magic/player-status）与同帧 Menu 优先：scene-system.test.ts:275-291（真实 caller tickSceneSystem）；requireCatalogs 守卫臂：cov85:229。
- 空列表/非法选择各菜单防御（空库存不进 confirm、非可卖/非可用/非可装备 no-op、空选防御）：glm-phase1-leaves 各文件 + boundaries G02/G06/G07/G08。

存档 API（api.ts,in-memory fallback 路径）
- roundtrip/双向深拷贝/不存在→null/listSlots meta/deleteSlot/槽位越界抛错/overwrite/MAX=5：api.test.ts:191-198。

存档槽菜单（save-slot-menu.ts）
- 建表默认/label/defaultSlot 反查/空表防御/fetchSlotMetas 填充/savedTimes 提取/保存计数模拟：save-slot-menu.test.ts:91-104、save-slot-menu.glm-phase1-leaves.test.ts:187-190。

快存（quick-save.ts）
- canQuickSave 四态（explore/battle/dialog/menu）：quick-save.test.ts:34；F5 可存调 saveSlot(1)、不可存不调、F9 调 loadSlotIntoGame(1)：quick-save.test.ts:35-37。

save-io（tools/save-io.ts）
- serialize 带版本头、format 拒、坏 JSON 拒、partyMembers 臂拒：save-io.test.ts:27-29。

## U — 开放发现（登记不动产品，交 Codex/用户裁决）

- **U-1 导入不校验 version**：`serializeSave` 写 `version:1`（save-io.ts:8），但
  `parseImportedSave`（save-io.ts:12-25）只验 format + gs 必填字段，**从不读 version**。
  `version:999` 的导入只要 format/字段合法即被接受。卡面"版本拒绝"重点在当前产品中
  **未实现**——本卡不写钉住该宽松行为的测试（避免把疑似缺陷固化为合同），留产品裁决：
  补 version 门或确认开发期 intentionally 宽松。
- **U-2 JSON 导入导出丢 Map 字段**：serializeSave 走 JSON.stringify，GameState 内 Map
  字段塌成 `{}`；消费点有 `reviveNumberKeyedMap` 兜底（battle-system.ts，工程笔记
  engineering-notes.md「JSON 存档导入/导出」条）。全量 gs roundtrip 相等性测试会踩此
  已知损失，本卡不以测试钉住，维持登记。

## BLOCKED / UNREACHABLE — 不可合法构造或卡面禁止

- **B-1 indexed-db.ts / api.ts IDB 路径零测试**：`IndexedDbSave` 全文件与 `Save` 的
  `idbAvailable()` 分支（api.ts:60-63 等）无任何测试。原因：jsdom 无原生 IndexedDB；
  走 IDB 路径必须向 `globalThis.indexedDB` 注入实现，而本卡上下文锚点明令
  "不得重新引入……全局 fake IndexedDB"，且不允许新增 dev 依赖（fake-indexeddb）。
  → 登记为 blocked，解除条件：卡面授权受控 IDB 环境（真实浏览器 E2E 或专用依赖）。
- **B-2 dispatchSaveSlotMenu 空选择（`slot===undefined` no-op 臂）**：dispatcher 建表
  恒为默认 5 槽，空 slot 列表只能经 `createSaveSlotMenu([],…)` 人造直造状态从公开
  dispatcher 不可达。空表防御已在 save-slot-menu.glm-phase1-leaves.test.ts:190 同 caller
  证（createSaveSlotMenu 层）。
- **B-3 fetchSlotMetas catch 臂**（Save.listSlots 拒绝 → console.warn、slotMetas 不动）：
  触发需 mock Save 模块（持久层核心），且 oracle 仅 console.warn，无独立业务判别力；
  按"少而精"不写 mock 依赖弱断言测试。
- **B-4 canQuickSave event 模式**：与 battle 同一 `gs.mode==='explore'` 守卫臂
  （quick-save.ts:19），同输入形状同 oracle，换值不算新轴。
- **B-5 deleteSlot 越界（如 99）幂等**：menu 公开流只会传 1..5；越界删除无公开非法
  caller，防御行为不写空转测试（api.ts:85-91 无 bounds 检查是登记事实，非合同）。

## 判例（needle 设计与返工）

1. **MUT-01 初版空转**：把 menu case 改为同时跑 `tickSceneSystem` → 红相位双绿。根因：
   `tickSceneSystem` 自带 `if (gs.mode !== 'explore') return`（scene-system.ts:584），
   插入调用被守卫吃掉——冻结是"路由 + 守卫"双保险。改打锁的定义点：删除
   `openMenu` 的 `gs.mode = 'menu'`（menu-stack.ts:26），mode 留在 explore → 行走放行，
   A1 的 mode 断言先红。教训：结构性行为（由路由保证）的针要打"定义点"而非"多加一路径"。
2. **A2 结构返工保针精确**：A2 初版把 Menu 关栈也放进 tickN 帧序列，MUT-01 类"menu
   模式多跑 scene"的变异会顺带在该帧经 scene 侧重开 hub，failed-total=2。改为
   `tickMenu` 关栈（真实帧 caller）+ `tickN` 证行走，针间正交，每针 failed 恰 1。
3. **MUT-03 首跑 INVALID（非业务断言）**：删 return 后 fall-through 到
   `requireCatalogs()`（menu-driver.ts:472，Confirm 分支 eager 取表），A3 未注入
   catalogs 时红相位是 Error 非 AssertionError。修法：A3 补 bootstrap 同构前置
   `setMenuCatalogs({…, playerRoles:{roles:[]}})`（`{roles:[]}` 是合法 PlayerRoles，
   shared/src/tables.ts:585-592，无需强转）。教训：被 fall-through 激活的下游前置
   必须在测试里按真实运行序补齐，针才算"业务红"。
