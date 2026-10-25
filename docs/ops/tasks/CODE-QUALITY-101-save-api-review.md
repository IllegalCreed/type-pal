# CODE-QUALITY-101 — Save API 存档域本体审核（api / indexed-db）

Status: review
Owner: Codex（2026-10-15用户授权接手本批返工；GLM原交付保留为历史）
Reviewer: Codex（独立验收）
Phase: phase1
Capability: Q3 save domain governance（schema/IndexedDB 高风险域）
Visual Verification Timing: N/A（纯 IO/数据层，无产品/UI行为修改）

本轮统一证据入口：[94–102当前逐文件复审与原件](../evidence/CODE-QUALITY-94/current-review/README.md)。

## 2026-10-25 连接所有权返工准入（当前）

当前用户继续94–102复审及必要返工，单一Owner Codex，隔离 `codex/code-quality-94-102`／main8ebcb70f0。完整读取api/indexed-db及两专测，复用事务旧红绿；对原连接未知项补真实Save→独立IDBFactory反例。现已证首次open abort后失败Promise常驻、reset不关闭句柄、另一个真实客户端升级被旧连接阻塞。W3C IndexedDB 3.0 §2.1.1/§4.4/§5.2规定close与versionchange生命周期；原生产DB_VERSION=2、store/schema和commitWrite保持。

build allowed仅修连接promise缓存/失败释放、close/versionchange失效和现有测试reset的资源收支；不重试已开始的写事务，不新增清档/迁移/兼容路径或自动刷新页面。原槽号输入卡仍等用户裁决，不借本准入改输入域。新增故障测试使用真实驱动/请求/连接，旧事务三例不变；首跑close信号造法被模拟器拒绝，属测试驱动失败，不获业务counter信用，保留原件后改用库自带真实强关注入。fake-indexeddb6.2.5参数声明误为构造器，实际官方API接收连接实例；Reflect.apply仅作这一个已核故障工具调用，不改声明/规则，不替换产品实现。

另直接复现内存listSlots泄漏可写meta引用：修改返回的cash/savedTimes会污染后续读取，与IDB原生值复制不同。正式9绿／1业务红后，仅复制当前全为数值字段的SlotMeta返回值；不改GS、槽号输入、存档内容或schema。同步纠正partyLevel注释：实现取角色0，不冒称非顺序队伍的队长。

全仓与coverage仍留94–102集中收尾，不因本连接切片提前运行。当前不关闭文件，不宣称全部门完成。

## 2026-10-17 Codex 当前逐文件复核

完整读取并核对：

- `packages/game/src/core/save/api.ts`
- `packages/game/src/core/save/indexed-db.ts`
- `packages/game/src/core/save/__tests__/api.test.ts`
- 相邻 caller/oracle：`menu-driver.ts`、`save-slot-menu.ts`、`shell/bootstrap.ts`、`tools/quick-save.ts`、`core/save/__tests__/indexed-db.test.ts`、菜单保存链与快存测试。

当前定向回归为 5 files / 36 tests PASS（api、indexed-db、save-slot-menu、menu-save-chain、quick-save；单 worker，0 stderr），game typecheck 沿用同一源码树已通过。逐文件核验没有把包级绿灯当作关闭依据：`api.ts` 的公开槽位输入只比较上下界，`NaN`/小数会通过内存路径，IndexedDB 路径可能因 key 编码抛错；这是公共 Save/schema 边界，按停止线开立 [GAME-SAVE-INPUT-DOMAIN-1](GAME-SAVE-INPUT-DOMAIN-1.md)，本卡不实现、不关闭 3 个 ledger 路径。

`indexed-db.ts` 的事务提交语义由 [GAME-SAVE-IDB-COMMIT-1](GAME-SAVE-IDB-COMMIT-1.md) 独立记录；openDb 失败缓存、连接 close/重置和 game 包 IDB 直接测试仍是未闭合风险。`api.test.ts` 的内存合同有真实状态/排序/克隆 oracle，但尚未覆盖两条路径一致的非法数值输入。

完整门不因本次文档批次重跑；最近同一源码树的 `pnpm check`、lint-zero、docs、protected fast 与官方 coverage 记录在 CODE-QUALITY-100/CODE-QUALITY-101 evidence 中，coverage ratchet/fast 仍因 shared 与 pal-extract baseline 回退失败，不能宣称统一门通过。

## 2026-10-15 最终模块窗口（当前）

稳定源码候选bb94ad8e2，完整check/official ratchet/protected fast均exit0，
但分别仍有3620/3610/3523条未包act、各577条act环境及2条导航诊断，统一门不通过。
定向125、game全包3564与七包typecheck通过；本卡保持review，本轮0文件关闭。
实际读取/修改文件、caller/oracle、完整回执、官方baseline diff和剩余风险见
[完整窗口](../evidence/CODE-QUALITY-94/codex-final-window.md)；不以包绿升级逐文件验收。

## Codex 用户批准后修复（2026-10-15，作者自验）

用户批准事务提交成功/失败传播修复，c81f469e3已落commitWrite与真实IDB三条回归。
提交时机、成功存读删、put/delete success后abort拒绝与旧槽保留均通过；125条相邻回归及typecheck通过。
详见GAME-SAVE-IDB-COMMIT-1与 [接手日志](../evidence/CODE-QUALITY-94/codex-takeover.md)。
本卡回review等完整门；open失败缓存/连接生命周期/输入域等未决项不因此关闭，0新闭合。

## Codex R3 独立验收与接手（2026-10-15，冻结作者旧交付）

候选 `5477af1e4`，最新主线 `f98d0ddd8`，独立验收树 0 behind / 17 ahead。
counter/rework：双路径头注成立；事务 abort 仍 resolve 再次复现，GAME-SAVE-IDB-COMMIT-1 不开始实现。
直接证据、逐文件读取、反例与真实门见 [Codex 三验](../evidence/CODE-QUALITY-94/codex-r3-review.md)。
本轮 0 新闭合；3283 / 229 closed / 44 review / 3010 pending，未合 main。
用户本轮授权质量不足时由 Codex 接手；后续低风险测试/注释修复的 Coding Owner 改为 Codex，
GLM 不再写本批修复文件。三张 GAME 高风险卡保持 draft，无 build allowed；不扩产品/Save/公共接口。
无下一位 Agent 提示词，由 Codex 继续；原 GLM/R2 结论以下按历史保留。

## Codex R2 验收（历史，2026-10-15）

候选 `1f8bcd468`，独立验收分支 `codex/quality-menu-accept-94-95`，主线基点 `cddf65557`。
counter/P1：真实Save→IDB在request success后事务abort仍resolve，已开GAME-SAVE-IDB-COMMIT-1停实现。

逐文件实际读取、primary/caller/oracle、反证、全部质量门状态和可直接复制的GLM返工提示词见
[Codex R2再验收](../evidence/CODE-QUALITY-94/codex-r2-review.md)。本卡适用该提示词；
仅修本卡已核测试/注释白名单，三个新GAME高风险draft卡无build allowed，不得开始实现。
全仓check与新ratchet/protected仍带真实诊断，不能称完整门通过；本轮0新闭合，未合main。

## GLM及前轮交付记录（历史）

下文原签字、统计与“通过”是各自revision当时的作者/前轮声明，当前以本节Codex R2为准；
不追溯改写旧回执，不用作者自验替代独立验收。交接到GLM时先fetch并核最新任务状态与独占Owner。

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

## R2/C5 返工（2026-10-15，响应 Codex codex-r2-review）

- api.ts 头注释更正（E-10 修复）：双路径门面现状（浏览器 IndexedDB 主路径/无 IDB 环境内存 fallback），旧"stub(in-memory) 后切"历史声明废弃。
- 回收本卡过 claim："P2#5 版本纪律范本注释"维持，但原"hot-reload 已处理重开"表述过强——_resetDbConnectionForTest 仅重置句柄，无 db.close()，未闭合句柄行为无主路径测试证实；openDb 失败时 rejected Promise 会被缓存（后续调用复用失败）同样未证。事实登记，不改接口。
- api.saveSlot 只比较上下界不拒 NaN/小数：公开输入合同收紧与否列 review（生产 caller 当前整数 1..5），不据此改 save 接口。
- **C4（IDB 事务成功≠保存成功）已由 Codex 反控复现（codex-r2-idb-counter），归 GAME-SAVE-IDB-COMMIT-1 高风险卡（draft，无 build allowed）——本卡与 C5 返工均不触碰 indexed-db.ts 事务语义。**

## 下一步

Codex 独立验收；E-10/E-12 并入 E-批；U-1（记录级版本）由既有卡跟踪。后续候选：quick-save 工具域、word-lookup 已闭合域复核、或 game present 剩余 pending。无用户裁决需求。

## 2026-10-18 补审返工准入

用户转交9笔代码补审后，Codex核实2daed1bb7排重时没有等价迁移全部合同：旧roundtrip的scene/savedTimes/HP/Level/inventory五类断言缺失，旧读侧克隆也不能由存侧克隆替代。纠正此前“完全重复”结论；本次只补`api.test.ts`，不改Save实现、schema、IDB或公共输入合同。单一Owner Codex，build allowed限恢复这些有效断言、显式内存环境与跨例清理，并保留旧弱spec/新spec的精确反控。CODE100/101继续review，不增加closed。

## 2026-10-18 补审实施与交接

api.test原8例中roundtrip补回六类字段，新增1条读侧克隆：修改load结果的现金、嵌套HP和库存数量，第二次读取仍为原值；原存侧克隆另留，不混称同向。明确stub indexedDB为undefined，每例前后清内存Map并恢复全局；fixture当前HP150/MaxHP200、库存正数，未伪造IDB主路径。当前9例；真实IDB事务三例仍由原独立文件承担。生产api/indexed-db、schema/DB_VERSION、异常输入合同、迁移均未修改。

[完整补审证据](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/supplementary-audit/README.md)记录旧弱spec与新spec的同一精确变异对照、所有失败与当前原件、caller/read边界；初次typecheck指出测试数组下标未收窄，改用正常遍历，未加强转/ignore。输入域裁决与IDB连接生命周期仍pending，CODE100/101及api.test均保持review，不以局部绿恢复整文件闭合。
