# CODE-QUALITY-101 — Save API 存档域本体审核（api / indexed-db）

Status: draft（review-only 交付，无实现改动）
Owner: GLM（2026-10-15 按总 goal 自主推进）
Reviewer: Codex（独立验收）
Phase: phase1
Capability: Q3 save domain governance（schema/IndexedDB 高风险域）
Visual Verification Timing: N/A（纯 IO/数据层，无产品/UI行为修改）

## 目标与范围

存档域本体切片（2 生产 + 1 专属测试 + 2 相邻），不碰 CODE94/95 白名单与 97-100 批文件：

- `packages/game/src/core/save/api.ts`（97 行，product）
- `packages/game/src/core/save/indexed-db.ts`（93 行，product）
- `packages/game/src/core/save/__tests__/api.test.ts`（82 行，test）
- 相邻证据：`menu-save-chain.glm-msio.test.ts`、`tools/quick-save.test.ts`、`save-slot-menu.test.ts`（CODE-100 已核）

零代码改动；交付物=逐文件结论 + E-10/E-12 登记。

## 前提真值门（schema/save 高风险边界核验）

一句话工程前提：save 域当前合同 = 双路径 API（浏览器 IndexedDB 主路径 / 无 IDB 环境内存 fallback）+ DB 级版本纪律（DB_VERSION bump 即清档），记录级无版本字段——此为已登记未决项（U-1），本批只核不改。

| 方向 | 直接证据 |
|---|---|
| Primary source | api.ts:14/26-29 锚 sdlpal `MAX_SAVE_SLOTS=5`、`SAVEDGAME_WIN.wSavedTimes` cross-slot counter（uigame.c:589-597）；indexed-db.ts:17-20 P2#5 锚（local-ip→global-ip 不兼容 → bump DB_VERSION=2 清档，**user 已授权开发期存档可作废**）；store schema 注释（db 'type-pal'/store 'save-slots'/keyPath id）。 |
| 第一阶段 | 真实 caller：`menu-driver.ts`（save/load dispatcher）、`save-slot-menu.ts`（listSlots 只读）、`shell/bootstrap.ts`（loadGameHandler）、`tools/quick-save.ts`（F5 快存）。 |
| 第二阶段 | N/A（reforge 有独立 save/store，不共用本文件）。 |
| 目标 | 逐文件四维结论 + 登记；不改 schema/写路径/任何行为。 |

高风险边界核验（无停线触发）：本批零改动，不触 schema；发现的两项（E-10 注释过时/E-12 IDB 驱动无 game 内直接测试）均非行为风险；记录级版本缺失 = 既有 U-1（TEST-GLM-GAME-MENU-SAVE-IO-1 已登记待 Codex），DB 级 bump-wipe 是当前 user 授权的版本纪律，本卡引用不重裁。

环境事实核验：game vitest（jsdom + vitest.setup.ts）**不提供 indexedDB**、无 fake-indexeddb import（仅 reforge 用）→ game 测试全程走内存 fallback 路径，`_clearAllForTest`（注释明示"in-memory 路径才有用"）隔离有效；IndexedDB 主路径仅浏览器运行时可达。

最强替代解释：测试绿可能是内存路径掩盖 IDB 路径缺陷。复核：IDB 驱动 4 原语为薄包装（openDb/txStore/asPromise 标准用法），逻辑量小；但**无 game 内直接测试**确为事实 → E-12 登记（补测需 fake-indexeddb 接线，测试基建另卡）。

## 逐文件结论（四维）

### api.ts — 通过（1 项登记）

- 正确性与边界：saveSlot 槽位域校验（1..5 抛错）；save/load 双向 deepClone（structuredClone fallback JSON 圈）隔离断言在测；loadSlot 缺槽 null；listSlots 按 id 排序。
- 注释质量：SlotMeta 各字段含 sdlpal 真值锚；**发现 E-10（B 类）**：头注释"M5.S-w0.1 Save API stub(in-memory)…S-w1.a 后切 IndexedDB"已过时——IndexedDB 主路径 M5.S-w1.a 已接（dual-path 现状），头注释仍称 in-memory stub 误导维护者。注释级修正并入 E-批（不动行为）。
- 内聚/耦合：API 门面 + 驱动分离（indexed-db.ts）；`_clearAllForTest` 的内存-only 语义有准确注释。
- 复用：deepClone 本地小工具（结构化克隆+fallback），无过度抽象。

### indexed-db.ts — 通过

- 正确性与边界：openDb 单例缓存 + hot-reload 重置出口；onupgradeneeded 删旧 store 重建（P2#5 版本纪律）；请求错误经 asPromise reject 传播（caller console.error 不吞）。
- 注释质量：**范本级**——P2#5 注释写全"为什么 bump version"（旧档 local-ip 与全局解释器不兼容会静默跳错命令）、schema 结构、user 授权记录。
- 内聚/耦合：纯驱动层，无业务逻辑；observation：`_dbPromise` 无显式 db.close()（页面生命周期可接受，hot-reload 已处理重开）。

### api.test.ts — 通过

- 8 用例真 oracle：roundtrip 字段值、**save 后 mutate 不影响存档**（deepClone 判别断言）、缺槽 null、listSlots 排序+meta、deleteSlot、槽位域抛错、overwrite 覆盖、MAX 常量。
- typed fixture（createInitialGameState），零强转；beforeEach 隔离。
- **发现 E-12（P3）**：IndexedDbSave 驱动在 game 包无直接测试（jsdom 无 IDB；reforge 的 fake-indexeddb 测试属另一包另一实现）——IDB 主路径仅浏览器可达。补测须接线 fake-indexeddb（测试基建），另卡处理。

## 验证

- 定向：save api + 相邻 save-slot-menu/menu-save-chain/quick-save = 4 files / 29 tests PASS（VITEST_MAX_WORKERS=1，2026-10-15 01:03）。
- 全门：零代码改动，共用 `5cb6b9d22` 树完整门禁 + 97-100 批后复验；本批追加文档后复验见证据目录。
- 账本：新增 2 行 review（api.ts / indexed-db.ts）。

## 下一步

Codex 独立验收；E-10/E-12 并入 E-批；U-1（记录级版本）由既有卡跟踪。后续候选：quick-save 工具域、word-lookup 已闭合域复核、或 game present 剩余 pending。无用户裁决需求。
