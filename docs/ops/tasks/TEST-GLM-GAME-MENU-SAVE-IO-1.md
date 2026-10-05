# TEST-GLM-GAME-MENU-SAVE-IO-1 — menu, input and save boundary contracts

Status: build
Phase: phase1
Capability: game / menu, input and save IO
Coding Owner: GLM
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: N/A
Visual Verification Timing: e2e-deferred
Contributor: GLM
Branch: `codex/glm-game-menu-save-io-r1`

> 当前采用 [`AGENTS.md`](../../../AGENTS.md) 的“Codex 分派—贡献者执行—Codex 独立验收”模式。覆盖率、测试数量和通过率都不是本卡的单独完成条件。

## 目标

补齐第一阶段运行时从输入路由进入菜单、菜单状态机执行取消/确认/返回、存档槽读写和导入导出边界的真实业务合同。目标是让每个菜单动作都能在公开 caller 上观察到正确的状态迁移、资源消耗、返回层级或存档结果，并把不可合法构造、已证饱和和真正缺陷分开记录；不修改产品行为。

## 范围

- 范围内:
  - `packages/game/src/shell/input.ts`、`input-replay` 相关公开输入快照和 `main-loop.ts` 的输入消费/锁定/释放边界；
  - `packages/game/src/core/menu/menu-driver.ts`、`menu-mode.ts`、`menu-stack.ts`、`in-game-menu.ts`、`opening-menu.ts` 的 push/pop、取消、同帧按键优先级、modal 锁和返回 explore/battle 的公开状态；
  - `inventory-menu.ts`、`inventory-action-menu.ts`、`item-select.ts`、`magic-select.ts`、`in-game-magic-menu.ts`、`equip-menu.ts`、`shop-menu.ts`、`sell-menu.ts` 的合法/非法选择、空列表、数量边界、资源扣除和回滚；
  - `save-slot-menu.ts`、`packages/game/src/core/save/api.ts`、`indexed-db.ts`、`packages/game/src/tools/save-io.ts`、`tools/quick-save.ts` 的 slot 边界、深拷贝、覆盖、删除、序列化版本、坏输入拒绝和可恢复失败；
  - 真实 public caller 与相邻 shell/menu 流的排重、反控证据和隔离的 IndexedDB/内存 fallback；
- 范围外:
  - `packages/game/src/core/battle/` 回合/终局合同（由 `TEST-GLM-GAME-TURN-BOUNDARIES-1` 负责）；
  - 已有开场菜单像素/UI 视觉基线、剧情 E2E、真实 PAL 资源重生成、产品菜单形态调整；
  - 仅调用次数、内部数组长度或私有 mode 字段且没有业务结果的探针。
- 明确不做:
  - 不修改产品、旧测试、配置、baseline、`data/raw`、`data/extracted` 或正式 save 格式；
  - 不以 coverage/test count 为任务目标，不复制同一选择轴换数字/换角色，不保留恒真/弱 matcher 测试；
  - 不用私有状态、核心 mock、`as unknown as`/`as never`、skip/ignore、扩 timeout 或测试专用分支绕过门。

## 前提真值门

### 一句话行为 / 工程前提

本卡只证明现有第一阶段公开输入、菜单和存档调用域的业务边界，before -> after 为“同一产品行为不变，仅增加可反证测试”，不授权任何产品语义变化。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | 菜单输入优先级、存档 slot 语义以原版数据/SDLPal 参考为事实依据，冲突不得凭测试猜 | `CLAUDE.md` 的 input/save 说明；`reference/sdlpal/play.c`、`save.c`、`uibattle.c` 相关实现；`data/raw/2.RPG` |
| 第一阶段 | 当前 Game 公开菜单、输入快照、Save API 和 save-io 是实际调用入口 | `packages/game/src/shell/input.ts`、`packages/game/src/core/menu/menu-driver.ts`、`packages/game/src/core/save/api.ts`、`packages/game/src/tools/save-io.ts` |
| 当前二阶段 | N/A：本卡只触及 `packages/game` 第一阶段，不能把 Reforge 规则带入 | `docs/phase2/READ-FIRST.md` 作为不串台边界 |
| 本任务目标 | 增加原子合同测试和可复核反控证据，不改变实现与用户可见行为 | 本卡白名单与下方验收条件 |

### 反证与替代解释

- 最强替代解释: 某个“缺口”可能只是私有状态无独立业务 oracle、浏览器 IndexedDB 不可用或历史测试已覆盖相同 caller；必须先复核再新增。
- 什么观察会推翻当前前提: 公开 caller 的实际状态迁移与一阶段资料冲突，或测试只能依赖私有字段/不可合法输入；立即停线并记 `counter/blocked`。
- audit 红项如适用，已排查的替代根因:
  - runtime 语义 / 命令分类: 先读 menu-driver/input/save 的实际 dispatch，再决定缺口层；
  - 原版 / 第一阶段理解: 以 `reference/sdlpal` 与既有 Game 行为测试交叉核验；
  - extractor / 地图 / 数据解码: 本卡不触资源提取，数据异常不得转成菜单测试；
  - audit / test model: fullName/caller/oracle 逐合同核对，静态计数不算覆盖。

### 用户可见偏离

- 是否主动偏离已核真值: no
- `before -> after` 一句话: 现有菜单和存档行为 -> 行为不变、边界有独立回归合同
- 代表场景: 输入 Confirm 打开背包后取消返回原层；合法 slot 覆盖后重载仍是保存快照；坏导入被拒且原状态不变
- 用户裁决: N/A（纯测试与证据）

## 上下文锚点

- 已拍板决策 / 铁律: `AGENTS.md` 当前委派协议、测试少而精与零诊断门；`CLAUDE.md` 第一阶段忠实与真实输入规则。
- 代码锚点(`file:line`): `packages/game/src/shell/input.ts`；`packages/game/src/core/menu/menu-driver.ts`、`menu-mode.ts`、`menu-stack.ts`；`packages/game/src/core/menu/save-slot-menu.ts`；`packages/game/src/core/save/api.ts`；`packages/game/src/core/save/indexed-db.ts`；`packages/game/src/tools/save-io.ts`；`packages/game/src/tools/quick-save.ts`。
- 已知坑 / 审计文档: [`docs/phase1/engineering-notes.md`](../../phase1/engineering-notes.md) 的输入/菜单/存档条目；[`docs/phase1/game-mechanics.md`](../../phase1/game-mechanics.md) 的资源与状态边界；已归档 `TEST-GLM-GAME-PLAYER-OPCODE-RESIDUAL-1`、`TEST-GLM-GAME-DIALOGUE-PAGINATION-1`、菜单 leaf/pixel 卡。
- 不得重新引入: 第一阶段与 Reforge 串台、菜单形态自创、数组位置当身份、写真实用户存档、全局 fake IndexedDB、私有 debug state、弱断言和重复包装。
- 相关测试: `packages/game/src/shell/input.test.ts`、`input.boundaries.test.ts`、`packages/game/src/core/menu/**/*.test.ts`、`packages/game/src/core/save/__tests__/api.test.ts`、`packages/game/src/tools/save-io.test.ts`、`quick-save.test.ts`。

## 验收条件

测试任务另核[统一质量标准](../agent-workflow.md)：原子业务合同、合法 typed 输入、真实 caller/oracle、逐轴排重、高判别力反控和隔离；不得仅以通过率/数量/覆盖率 accept。

- 功能:
  - 逐合同 ledger 写清 source/caller/input/oracle/fullName/最近旧测差异；同 caller 同 oracle 只登记 existing-proof；不可合法构造写 blocked/unreachable 理由；
  - 定向菜单/存档测试必须经过公开输入或公开 API，断言业务状态、层级、资源、保存字节/元数据或拒绝原因；
  - 反控每一针原始绿→指定业务红→恢复绿，恰一业务 AssertionError，保留 JSON/raw/exit/signal/spawn、file×fullName 执行集、原始/变异/恢复 hash 和临时树清理证明；
  - 用隔离的 in-memory/临时 IndexedDB 环境，不触真实用户存档，不全局 prune；
- 测试:
  - 定向、相邻菜单/输入/save 测试、`env -u NODE_COMPILE_CACHE` 对应 package test/typecheck；
  - `pnpm lint` error/warning/info 全零，`node scripts/docs/check.mjs`、`git diff --check` 通过；
  - 不把例数、覆盖率、单纯 full green 或反控针数作为单独完成条件；
- 文档:
  - 证据只放 `docs/ops/evidence/TEST-GLM-GAME-MENU-SAVE-IO-1/`，卡内写真实 SHA、排重表、反控入口和未闭合账；
- 视觉 / 手工验证: N/A（菜单形态不变；若发现用户可见偏离，停止并交 Codex/用户裁决）；
- E2E 用例登记: 本卡不跑剧情 E2E；若发现只能用剧情才能证明的行为，只登记入口/停止点，不借剧情冒充单测 oracle。

## 当前模式推进记录

### 进入 build 前：Codex 核定

- Coding Owner / 隔离工作树 / 修改白名单: GLM / `codex/glm-game-menu-save-io-r1` / 仅 `packages/game` 本卡测试、合法 fixture、`docs/ops/evidence/TEST-GLM-GAME-MENU-SAVE-IO-1/` 和本卡交付记录。
- 前提核验: verified（测试-only，公开 caller 与第一阶段行为锚点如上；反证为不可合法输入或私有 oracle 时必须停止）。
- 范围、设计和验收条件: agree（先排重，再补真实缺口；不计数量）。
- 高风险用户产品裁决: N/A（不改产品）
- build 准入结论: Codex build allowed

### 进入 done 前：独立验收

- 贡献者交付与自验: pending（作者 SHA/命令不算独立验收）
- Codex 独立复核: pending
- 用户体验/产品验收: N/A（测试-only）
- done 准入结论: blocked；由 Codex 独立复核后决定

## Draft: 设计与风险

### 设计结论

先生成跨菜单/存档的 fullName inventory，再按真实 caller 分批添加原子合同；fixture 只构造合法状态，坏输入仅限 save-io/边界解析层。每个反控注入点必须只破坏一条业务合同，恢复后重新跑受影响套件并证明产品文件 clean。

### 已知风险

- 风险: 菜单测试容易只断言 mode/调用次数，或者把不同层级堆成“万能流程”。
  - 缓解: 必须断言用户可观察的返回层级、选中对象、资源/存档内容和拒绝原因，逐合同拆分并做排重。
- 风险: IndexedDB 环境差异造成假红或污染本机数据。
  - 缓解: mkdtemp/隔离数据库连接，每个合同 afterEach 清理，失败也 finally 清理。

## 下一位 Agent 提示词

```text
你是 TEST-GLM-GAME-MENU-SAVE-IO-1 的 Coding Owner（GLM）。先读 AGENTS.md、CLAUDE.md、docs/phase1/engineering-notes.md、docs/phase1/game-mechanics.md、本卡和已归档 Game 菜单/存档/输入测试卡。
只在 codex/glm-game-menu-save-io-r1 工作；先对 shell/input、main-loop、core/menu 全部菜单、save/api、indexed-db、save-io、quick-save 的旧 fullName/caller/合法输入/oracle 做 ledger 排重，再补真实未证明合同。
重点核输入优先级与锁、菜单 push/pop/取消/空列表/非法选择/资源回滚、slot 覆盖/删除/深拷贝/坏导入/版本拒绝/可恢复 IO；不得触碰 TEST-GLM-GAME-TURN-BOUNDARIES-1 的 battle 回合/结算范围。
只写本卡测试、合法 typed fixture、证据与本卡回执；禁止改产品、旧测、配置、baseline、真实存档/提取数据、私有 state、核心 mock、强转、skip、ignore、扩 timeout。每条合同必须有真实业务 oracle；反控必须绿→指定业务红→恢复绿、恰一 AssertionError、完整执行集/hash/清理证据。
交付定向/相邻测试、typecheck、lint 0/0/0、docs、git diff --check、完整 40 位 SHA；覆盖率和测试数量不是完成条件，不得标 done，等待 Codex 独立验收。
```

---

## GLM r1 交付回执（2026-10-05，分支 codex/glm-game-menu-save-io-r1，base 53bf97e01）

**结论：348 条旧 fullName 全量排重后补 8 条真实未证明合同（3 个新测试文件），反控 8/8
VALID（每针红相位 failed-total 恰 1 且首条失败为业务 AssertionError），全门通过；不请求
done，等待 Codex 独立验收。** 逐合同排重账（NEW/REG/U/BLOCKED 四类 + 3 判例）见
[evidence/TEST-GLM-GAME-MENU-SAVE-IO-1/dedup-ledger.md](../evidence/TEST-GLM-GAME-MENU-SAVE-IO-1/dedup-ledger.md)。

### 交付物（全部本卡白名单新增，零产品/旧测/配置/baseline/真实存档与提取数据改动）

| 文件 | it | 合同轴（源锚 / oracle） |
|---|---|---|
| `src/shell/menu-input-lock.glm-msio.test.ts` | 2 | A1 菜单 modal 输入锁：`tickN` 整链按住右 3 tick，party 冻结 + hub 光标吃输入（menu-stack.ts:24-27/mode.ts:68）；A2 锁释放：`tickMenu` 关栈后 `tickN` 恢复 2 步 East 行走（menu-stack.ts:12-21） |
| `src/core/menu/menu-save-chain.glm-msio.test.ts` | 2 | A3 hub 同帧 Menu+Confirm 取消优先（menu-driver.ts:459-469，终态栈空可判别）；C1 save-slot dispatcher 跨槽 max+1 真链：slot3 存 7 → 存 slot1 得 8、slot3 不被改写（menu-driver.ts:1008-1021 + api.ts extractMeta） |
| `src/tools/save-import-quicksave.glm-msio.test.ts` | 4 | D1 坏导入 wNumScene 守卫臂两形拒（save-io.ts:21）；E1 F5/F9 preventDefault 拦浏览器刷新、F6 放行；E2 存档 IO 失败 → 错误 toast 带原因不外抛（真实 DOM oracle）；E3 F9 空槽/成功两臂反馈 |

### 排重结论要点（REG 不新增；开放发现与受阻账不掩盖）

- 输入/主循环/各菜单单键导航/取消/空列表/非法选择/资源回滚（confirm 期钱变少、MP 禁用、
  inUse 耗尽、catalog 缺项）、slot 覆盖/删除/双向深拷贝、快捷键四臂+explore 侧同帧 Menu
  优先、battle 态开关菜单回 battle（battle-system.test.ts:1696）—— 全部 REG 登记锚点，零包装。
- **U-1**：`parseImportedSave` 从不读 `version` 字段（save-io.ts:12-25）——卡面"版本拒绝"在
  产品中未实现；不写钉住宽松行为的测试，留产品裁决。**U-2**：JSON 导入导出丢 Map 字段
  （消费点有 revive 兜底）维持登记不钉。
- **B-1**：`indexed-db.ts` 与 api.ts IDB 分支零测试 — jsdom 无 IDB 且卡面明令禁全局 fake
  IndexedDB/新增依赖 → blocked 登记（解除条件：受控 IDB 环境授权）。另有 B-2..B-5
  （不可达空选择/弱 oracle catch 臂/同守卫臂换值/越界删除无公开 caller）。

### 反控三态（mutation-results.json 8/8 VALID；17 份规整日志 = 共享原始绿 + 每针红/恢复）

每针源码单点变异（find 恰 1 次）→ 定向文件全量跑：红 exit≠0 + 目标合同业务 AssertionError
+ failed-total 恰 1；恢复 sha256 与原始一致（sourceRestoredByteIdentical），复绿 8/8。
raw JSON+log、identity 逐相位 sha 落
[evidence/TEST-GLM-GAME-MENU-SAVE-IO-1/](../evidence/TEST-GLM-GAME-MENU-SAVE-IO-1/)
（mutation-logs 的 `*.log` 受 .gitignore 约束已 `git add -f`）。

判例：① MUT-01 初版"menu case 加跑 tickSceneSystem"双绿空转 — scene-system.ts:584 有
`mode!=='explore'` 守卫，结构性行为的针要打定义点（改删 openMenu 的 `gs.mode='menu'`）；
② A2 改 tickMenu 关栈 + tickN 走路，保每针 failed 恰 1；③ MUT-03 fall-through 激活
`requireCatalogs`（menu-driver.ts:472 eager），测试补 bootstrap 同构 catalogs 前置后才是业务红。

### 质量门（env -u NODE_COMPILE_CACHE）

- 定向 3 文件 **8/8**；相邻 core/menu+shell+core/save+tools 四目录 110 文件 **772/772**；
  game 全量 306 文件 **3484/3484**（worktree 补 data/extracted 软链与 data/raw MKF 逐文件
  软链后一次全绿，环境处置非仓库改动）。
- typecheck 0 error；`pnpm lint` 全仓 **0/0/0**（3401 files）；`node scripts/docs/check.mjs`
  PASS；`git diff --check` 0。diff 仅新增：3 测试文件 + evidence 目录 + evidence README 索引 1 行。

## 下一位 Agent 提示词（Codex 独立验收）

```text
你是 Codex，负责独立验收 TEST-GLM-GAME-MENU-SAVE-IO-1 的 r1 交付（分支
codex/glm-game-menu-save-io-r1，回执在本卡上方）。
先读本卡、AGENTS.md、CLAUDE.md 测试质量验收节、
docs/ops/evidence/TEST-GLM-GAME-MENU-SAVE-IO-1/（README/dedup-ledger/mutation-results/
identity/mutation-logs/inventory-vitest-list），再核：
1) 8 合同的原子性、合法 typed 输入、真实公开 caller（tickN/tickMenu/dispatchMenuInput/
   parseImportedSave/setupQuickSave）与 oracle 判别力；对照 dedup-ledger 的 REG 锚点是否属实
   （尤其 battle 分支归 battle-system.test.ts:1696、快捷键四臂归 scene-system.test.ts:275-291、
   C1 与 cov85 空表/旧"dispatcher 模拟"的实质差异、A3 与 explore 侧同帧 Menu 优先的差异）；
2) 反控 8 针三态证据（每针 failed 恰 1、业务 AssertionError、identitySha/字节还原）与
   3 条判例（MUT-01 空转返工、A2 正交重构、MUT-03 catalogs 前置）；
3) U-1（parseImportedSave 不校验 version）与 B-1（indexed-db 零测试受卡面约束 blocked）
   的登记处置是否符合"不掩盖、不钉住疑似缺陷"口径，是否需要单开产品卡；
4) 门禁复算（定向/相邻/game 全量/typecheck/lint 0-0-0/docs/diff --check；worktree 需
   data/extracted 软链与 data/raw MKF 软链）。
输出 accept（r1 范围收口）或 counter（逐项返工）；不得由本回执直接推 done。
```
