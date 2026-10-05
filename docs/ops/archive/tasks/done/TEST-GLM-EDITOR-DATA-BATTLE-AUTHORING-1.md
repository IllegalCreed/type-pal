# TEST-GLM-EDITOR-DATA-BATTLE-AUTHORING-1 — data and battle authoring contracts

Status: done
Owner: GLM
Reviewer: Codex（独立验收）
Phase: phase2
Capability: editor / data and battle authoring
Branch: `codex/glm-editor-data-battle-authoring-r1`
Visual Verification Timing: dev-functional

## 目标

对 Editor 数据与战斗作者面板做一轮大范围但严格排重的合同补测，覆盖数据编辑、战场/敌人/队伍引用、合法性守卫、撤销和 stale focus；避开已完成的 authoring panels、asset lifecycle、battle registry、audio ownership 卡。

## 独占范围

只允许写 `packages/editor/src/ui/` 本卡测试、合法 typed fixture 和证据。重点包括：

- `DataMode.tsx`：数据页切换、引用缺失、保存/取消和 session patch；
- `BattleFieldTab.tsx`：战场字段、引用选择、非法资源与 undo；
- `EnemyTab.tsx` / `EnemyTeamTab.tsx`：敌人属性、状态/技能、队伍成员增删、deep-link focus 和缺失回落；
- `ItemAlchemyTab.tsx` / `PoisonTab.tsx`：数据关联、重复/非法输入、空值删除与保存门；
- 只补真实作者 workflow 的功能性 UI 证据，不重复剧情 E2E。

先对照上述全部旧测、GLM/Kimi/Cursor 波次测试、已归档 Editor 卡和全量 fullName/caller/oracle 排重；已有同状态轴只登记。

## 质量与安全约束

- 合同必须走真实组件 caller，使用合法 typed project/session/data 输入，断言 session patch、序列化值、错误守卫、DOM 业务结果或 undo 结果。
- React 更新必须在 act 内；afterEach 清理 object URL/listener/session/临时文件并 unmount。
- 不改产品、旧测、配置、baseline、真实项目数据；禁止强转、skip、ignore、扩大 timeout、私有 debug state 和业务核心 mock。
- 反控必须原始绿→指定业务红→恢复绿，保存 raw/JSON/exit/执行集/三态 hash/清理证明；必要截图只做最小功能性证据。

## 验证与交付

交付逐合同排重账、identity、source hash、反控证据、必要截图 hash、定向/相邻测试、typecheck、lint 0/0/0、docs、git diff --check。覆盖率只进入整体 main 统计，不是本卡完成条件。

## 下一位 Agent 提示词

```text
你是 TEST-GLM-EDITOR-DATA-BATTLE-AUTHORING-1 的 Coding Owner（GLM）。先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡和已归档 Editor authoring/asset/battle 卡；只在 codex/glm-editor-data-battle-authoring-r1 工作。
先对 DataMode、BattleFieldTab、EnemyTab、EnemyTeamTab、ItemAlchemyTab、PoisonTab 的旧 fullName/caller/input/oracle 排重，再补数据编辑、引用、队伍、非法输入、空值删除、stale focus 与 undo 合同。
所有 React 更新在 act 内并严格清理资源/session；不得改产品、旧测、配置、baseline、真实数据、强转、skip、ignore、扩大 timeout、私有 debug state 或业务核心 mock。反控须三态绿红绿、唯一业务 AssertionError 和完整证据。
交付定向/相邻测试、typecheck、lint 0/0/0、docs、git diff --check 和完整 SHA。不得把覆盖率或测试数量当完成条件，不得标 done，等待 Codex 独立验收。
```

---

## 交付记录（GLM，2026-10-05，branch `codex/glm-editor-data-battle-authoring-r1`，base `5dcb4569b` = origin/main）

### 新增测试（5 文件 9 例全绿；合集零 act 警告、零 console.error/stderr；共享夹具 `src/ui/__tests__/glm-data-battle-kit.ts`，只被本卡导入）

| 文件 | 例 | 合同 |
| --- | --- | --- |
| `src/ui/BattleFieldTab.glm-data-authoring.test.tsx` | 2 | B1 零引用战场确认删除全链（单命令、hero 回退 #006 并回报 focus '6'、undo 完整深值还原且父级深链 #007 重选中）；B2 创建卡打开时收到深链 focus：退出创建、聚焦目标、零命令 |
| `src/ui/PoisonTab.glm-data-authoring.test.tsx` | 2 | P1 删到零=playerTicks/enemyTicks 整键删除（undefined 非空数组、双序列互不污染）+「添加回合」缺省 {hpDelta:-10} 补格，逐格单命令可撤销；P2 关系总览派生：不对称致死对 ⚠、visited 去重单条闭环相克链 ⟲、rel-poison onPick 联动选毒并回报 focus |
| `src/ui/ItemAlchemyTab.glm-data-authoring.test.tsx` | 2 | A1「单次最高消耗」字段直改经 resizeResourcePoolEffect：扩张克隆末档、截断保序、单命令、undo 精确还原；A2 机制页身份：无深链挂载自动回报 canonical owner 一次、深链到位后抑制、「打开承载物品」传出 owner id |
| `src/ui/EnemyTab.glm-data-authoring.test.tsx` | 1 | E1 focus 守卫臂：无效/陈旧深链被忽略不偷换选中（目录行/hero 双证），后续有效深链仍应用，全程零命令 |
| `src/ui/DataMode.glm-data-authoring.test.tsx` | 2 | D1 battlefield 页深链挂载 + 复制经路由回报新副本 focus '7' + undo（父级深链 '6' 权威重选中）；D2 poison 页深链选中 + 目录行点击经路由回报 focus '1'、切换 enemy-team 页 DOM 不残留 + 试打整形 {kind:"enemy-team", id} |

fixture：真实 blank 项目（`loadLegalUiProject`：seed→loader→toEditorState→assertProjectSaveValid 自证）+
生产命令播种（AddBattleFieldCommand/AddPoisonCommand/UpdatePoisonCommand/AddEnemyCommand/
AddEnemyTeamCommand/UpdateLocaleCommand/withSharedEnemyBattleSprite）；EnemyTab 敌人引用真实
战斗精灵（保存门要求 battleSprite 在注册表内）。无组件替身；硬件端口仅 Node Blob/crypto 桥。

### 逐合同排重账（source / caller / input / oracle × 最近旧用例差异）

| # | source | caller | input | oracle | 最近旧证据与差异 |
| --- | --- | --- | --- | --- | --- |
| B1 | BattleFieldTab.tsx:238-263（remove）+188-194（stale-selection effect） | Hero「删除战场」 | 零引用战场 #7（blank seed 场景不引用任何战场）+ confirm true | 单命令、fields [6]、hero/focusLog 回退 '6'、undo 深值还原 | BattleFieldTab.test.tsx:287-336 只证「被引用阻断」「live oracle 失败」；glm-m 只证复制/取消/非法编号；confirm=true 成功删除链从未证明 |
| B2 | BattleFieldTab.tsx:180-186（focus effect setCreating(false) 臂） | 父级受控 focus prop 变更 | 创建卡打开 + focus '7' | `.bf-create-card` 消失、hero #007、零命令 | 旧测 focusObjectId 仅挂载期一次有效（test.tsx:154-240）；创建中途被深链打断未证 |
| P1 | PoisonTab.tsx:223-226（onRemove 清空删键）+232-238（添加回合缺省） | 「删除回合 1」「添加回合」按钮 | AddPoisonCommand 缺省双序列 [{hpDelta:-10}] | playerTicks/enemyTicks undefined 整键、互不污染、逐格单命令 | [action-group] test.tsx:310-371 只删 2→1；glm-m 只编辑字段；清空=删键与添加按钮全旧测零命中 |
| P2 | PoisonTab.tsx:257-351（RelationOverview）+414-417（selectPoison） | 检查器「关系」tab | 毒1 lethalWith 2（单向）+ counters 1→2→3→1 闭环 | ⚠ 不对称、单链 ⟲（visited 去重）、onPick 回报 focus '3' 零命令 | glm-m:148-175 只写关系键+引用计数；「不对称/相克链/rel-chain/rel-warn」全仓测试零命中 |
| A1 | ItemAlchemyTab.tsx:304-324（maxRoll onCommit→resizeResourcePoolEffect） | 「单次最高灵葫值消耗」字段 | maxRoll 2（奖励 A,B）→ 直改 4 → 1 | 扩张补末档深拷贝、截断保序、单命令、undo 精确 | ItemAlchemyTab.test.tsx:434-499 只证「增加消耗值」按钮（maxRoll+1 克隆末档）；字段直改经 resize 从未证 |
| A2 | ItemAlchemyTab.tsx:125-127（auto-report effect）+186-195（打开承载物品） | 机制页挂载/Hero 按钮 | 无深链挂载 crafting owner | onObjectFocus('vessel-c') 恰一次、深链后抑制、onOpenItem('vessel-c') | 全旧测 onObjectFocus/onOpenItem 在 ItemAlchemyTab 零命中（DataMode.item-alchemy 只证挂载） |
| E1 | EnemyTab.tsx:607-616（focus 守卫 + appliedFocusObjectId 防重入） | 父级受控 focus prop | 'enemy-gone' → 'enemy-b' → 'enemy-also-gone' | hero/选中行保持→切换→保持，零命令 | EnemyTab.test.tsx:296 深链一次性有效；kimi 波全为有效深链；守卫臂未证 |
| D1 | DataMode.tsx:572-589（battlefield 委派） | DataMode tab='battlefield' | 深链 '6' + 复制当前战场 | main[战场工作区]、hero #006、onObjectFocus '7'、undo | ConnectedEditorPages:206 只探针 DataMode 本体；battlefield 页真实挂载零覆盖 |
| D2 | DataMode.tsx:397-412（poison 委派）+274-300（enemy-team 委派/试打整形） | DataMode tab 切换 | 深链 '2'、目录点击、切 enemy-team | 毒工作区/敌队工作区挂载、bf-catalog 不残留、focus '1' 回报、{kind:'enemy-team'} | glm-ui-wave 只证 enemy 试打 {kind:'enemy'}（且为探针替身）；poison/enemy-team 页与 team 试打整形零覆盖 |

### 排重登记：EnemyTab / EnemyTeamTab 不新增合同（饱和举证）

- EnemyTab：EnemyTab.test.tsx（13 例，目录/搜索/深链/数值音效/AI 重排/物品交互/查看器/fail-closed/
  live oracle）、EnemyTab.kimi-workflows.test.tsx（新建守卫+生产模板+CompositeCommand undo、删除引用
  证明全链、AI 规则行九步编辑、变身/召唤引用产生与解除、战斗音效、击败后奖励保留旁事件）、
  glm-ui-wave（删除取消、规则增删、偷取切换、二动、敌队回调）、glm-m（召唤/分裂数量）。卡面轴
  （数据编辑/引用/非法输入/空值删除/undo）均有既有证明；本卡只补 E1 focus 守卫臂。
- EnemyTeamTab：EnemyTeamTab.test.tsx（canonical owner、目录聚合、五槽/重复成员/试打/阻断、
  偷取摘要、复制、reorder swap、fail-closed、live oracle）+ kimi-workflows（槽位选择空洞保留/
  尾部裁剪、上移下移、新建空 ID/重名守卫、删除全链 undo、汇总跟踪、搜索）。卡面轴「队伍成员增删」
  「非法输入」「undo」全有证明，不重复。
- 已证不可达（沿用 kimi 波头注裁定，不为触达伪造非法状态）：EnemyTeamTab 槽位 DsSelect invalid
  悬空标记（保存门对悬空敌引用报 error，合法 fixture 不可达）；remove 类 `!changed` 分支
  （useSyncExternalStore 同步重渲染下窗口不存在）。

### 三态反控（12 注入点全过，证据 `../../../tasks/evidence/TEST-GLM-EDITOR-DATA-BATTLE-AUTHORING-1/`）

`run-mutations.mjs` 自动执行并落盘 `mutation-evidence.json`（biome format 后入库）：Phase A 五套件
原始绿（9 例）→ 每注入点产品文件唯一锚点变异 → 定向 `-t` 单测红（exit≠0、恰一指定业务
AssertionError、执行集排除 skipped）→ 原样恢复 → Phase C 五套件复跑全绿；三态 sha256
original==restored≠mutant，产品文件 git-clean 零残留：

| 注入点 | 变异（产品文件唯一锚点） | 定向红的唯一业务断言 |
| --- | --- | --- |
| INJ-1 | BattleFieldTab stale-selection 回报 `String(next)` → `undefined` | expected undefined to be '6' |
| INJ-2 | BattleFieldTab 深链 `setCreating(false)` 臂删除 | 创建卡 section 未消失 to be null |
| INJ-3 | PoisonTab 清空删键 `undefined` → `[]` | expected [] to be undefined |
| INJ-4 | PoisonTab 添加回合缺省 `-10` → `-1` | [{-10},{-1}] ≠ [{-10},{-10}] |
| INJ-5 | PoisonTab 致死对 `symmetric` 恒 true | ⚠ 不对称 警告缺失 |
| INJ-6 | PoisonTab selectPoison 回报 `String(id)` → `undefined` | expected undefined to be '3' |
| INJ-7 | PoisonTab 相克链 `loop = true` → `false` | ⟲ 首尾闭环标记 to be null 失败 |
| INJ-8 | ItemAlchemy resize 调用 → 只改 maxRoll 不动 rewards | 扩张后 rewards 深等失败 |
| INJ-9 | ItemAlchemy auto-report 条件 → `if (false)` | called 1 times, but got 0 |
| INJ-10 | ItemAlchemy 打开承载物品 → 伪造 id | called with ['vessel-c'] 失败 |
| INJ-11 | EnemyTab focus 守卫 `enemies.some(...)` → `true` | expected '赤鬼' to be '青鬼'（陈旧深链偷换选中） |
| INJ-12 | DataMode 敌队试打整形 → `{kind:'enemy'}` | called with {kind:'enemy-team'} 失败 |

### fresh identity 与质量门（本卡范围）

- base `5dcb4569b`（= origin/main）fresh worktree；产品文件、旧测、共享配置、baseline、真实项目数据
  零改动（git status 仅本卡新增 8 文件；反控证据另证 5 个触点产品文件三态后 git-clean）。
- 定向 5 文件 9/9 绿；相邻 18 旧测文件（六组件全部既有文件 + DataMode 三份）115/115 绿。
- `pnpm --filter @type-pal/editor typecheck`：0 error（含 author-check）。
- 本卡新文件 + 证据 JSON/mjs：Biome 0 error/0 warning/0 info；全仓 `pnpm lint` PASS（3368 files
  0/0/0）。`git diff --check` 干净。`pnpm check:docs`：本卡项全过（卡/看板/索引一致；board.md
  的 content-review pin 已按 64 位 SHA 外科刷新）；`docs/ops/evidence/README.md` 与
  `docs/ops/tasks/index.md` 两处 after-SHA drift 经 origin/main blob 逐字节比对确认为 main
  既有存量（本 worktree 两文件与 main 一致、零改动），按共享文件纪律留 Codex 集中清理。
- 无 `as unknown as`/`as never`/`@ts-expect-error`/skip/ignore/timeout 扩大/私有 debug state/
  业务核心 mock；无截图需求（纯功能性 DOM 合同）。

### 当前模式推进记录（追加）

- Coding Owner 交付：GLM r1 候选（测试 + 证据 + 卡面本记录）已推送，等待 Codex 独立验收。
  复跑入口：`node docs/ops/tasks/evidence/TEST-GLM-EDITOR-DATA-BATTLE-AUTHORING-1/run-mutations.mjs`。

## 下一位 Agent 提示词（覆盖卡内旧提示词）

无下一位 Agent 提示词，等待 Codex 独立验收（验收入口：本卡交付记录 + 五个测试文件 +
`../../../tasks/evidence/TEST-GLM-EDITOR-DATA-BATTLE-AUTHORING-1/mutation-evidence.json`）。

## Codex 独立验收与收口（2026-10-05）

- 独立复跑：5 文件 9/9 定向通过；12 针反控三态全部通过，产品文件恢复哈希一致且 clean。
- 独立质量门：Editor typecheck 通过；全仓 lint 3379 files、0/0/0；docs check 0 issues；git diff --check 通过。
- 结论：合同原子性、真实组件 caller/oracle、排重饱和登记与反控判别力满足测试质量门；合入 main，任务归档为 done。
