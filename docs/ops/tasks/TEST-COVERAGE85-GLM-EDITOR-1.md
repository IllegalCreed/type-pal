# TEST-COVERAGE85-GLM-EDITOR-1 — editor workflow branch-contract closure

Status: build
Owner: GLM
Reviewer: Codex
Base: `76475c01cfbbbd9a8cd52b1cb866d3b21ba6908d`（codex/coverage-85-dispatch-r1 实际派生基点；卡首版误写 b95a6947，r1 返工更正）
Branch: `codex/coverage85-glm-editor-r1`
Capability: test-quality / coverage branch closure

## Codex build allowed

当前 fast 基线 editor 为 statements `29920/33513`、branches `23865/29058`、functions
`7570/8543`、lines `26795/29284`；达到 package branch 85% 至少需闭合约 835 个既有
未覆盖 edges。数字不是测试例数配额；必须以独立 UI/状态合同和可观察业务 oracle 证明。

## 独占范围与明确合同点

只允许写 `packages/editor` 的新专属测试、必要 typed fixture/隔离浏览器证据和本卡证据；
不得改产品、旧测试、共享配置、baseline、真实 PAL 数据或其它卡目录。优先逐分支核验：

- `src/ui/App.tsx:239-1147`：项目载入/空态/错误态、tab/route 选择、dirty/save/reload、
  command palette 与权限/禁用分支；必须走真实组件事件与公开 store/session。
- `src/ui/MapMode.tsx:171-1048`、`src/ui/ScriptEditor.tsx:135-1057`：选中/取消、拖拽/键盘、
  map/scene/script 编辑状态、撤销/重做/dirty、非法输入拒绝和保存恢复；断言序列化业务结果，
  不只断言 DOM 存在或 handler 被调用。
- `src/ui/ProjectWorkbenchTab.tsx`、`ItemTab.tsx`、`SkillTab.tsx`、`ActorMode.tsx`、
  `CutsceneTab.tsx`、`command-form-control.tsx`：表单合法/空/边界值、确认/取消、只读/禁用、
  collection validation 和错误回显；每个新增轴必须对照旧 fullName 排重。
- `src/core/world-sprite-behavior.ts`、`src/core/script-editor.ts`、`src/ui/PreviewCanvas.tsx`、
  `WorldSpriteLibrary.tsx`/`BattleSpriteLibrary.tsx`：真实 typed asset/session 输入、选择/预览/
  删除/恢复和资源缺失错误；视觉证据只用于功能性界面必要路径，不走剧情，不用 `__rfWorld` 或
  私有 DOM/state 后门。

每个 branch family 先写合同表：源行、触发事件、合法输入、状态转移、可观察 oracle、与已有
测试的 fullName 差异。宿主不可达或浏览器能力缺失必须做一手 existing-proof/blocked 记录，
不得用假 DOM、业务核心 mock、强转桥或扩大 timeout。

## 验收交付

用真实组件/公开 store 运行定向与相邻测试；每个 admitted 分支至少有能区分前后状态的断言，
拒收 snapshot-only、handler-only、零执行、重复身份和混入 collection/runtime 错误的用例。
反控不设数量：对每个实际注入点提供原始/变异/恢复三态、指定业务 AssertionError、执行集合、
最终源 hash；不得使用 `as unknown as`、`@ts-expect-error`、ignore/skip 或降质量规则。

回执必须带 fresh Vitest `file×fullName×status`、branch delta、截图/console 证据（仅必要时）、
未覆盖臂 proof，以及 test/typecheck/lint/docs/diff 结果。editor branch 达到 85% 或剩余分支
有一手不可达证明后才能交 Codex；不得合 main/标 done。

## r1 交付记录（GLM，2026-10-04，branch `codex/coverage85-glm-editor-r1`，base 76475c01c）

**门禁状态如实申报（r3 终测含 T2 补充，基点 ea1fddb8c=origin/main 最新）：editor
branch 23865→24177（82.13%→83.20%，+312 edges），未达 85%，不以 85% 冒交。**
剩余缺口不构成不可达证明：其中 508 个是 v8 branchMap `locations` 为空的合成计数
（无源码位置、无法定向触发；cov-base 与 cov-final 两次实测口径一致，见
`branch-census.json` 的 locless 字段）——该数字只说明缺口构成，**不作为 unreachable
proof**；其余为 App/MapMode/ScriptEditor/PreviewCanvas 等文件中**仍可达**的交互臂。
85% 数学上可达（locatable 缺口约 4500），r1 未闭合属本人单会话预算限制，交 Codex
裁定 r2 续跑或改判。

### 新增测试（7 文件 87 例，全绿；r2 终测全套 4687/4687，定向与全量计数一致，见 vitest-fresh.json）

| 文件 | 例 | 主要合同 |
| --- | --- | --- |
| `src/core/world-sprite-behavior.cov85-lowering.test.ts` | 9 | startBattle onLose/onFlee、teleportOut onFail、setEntityTriggerActivation inherit/use(range±)、select* 丢弃、超预算/空 repeat、可选参透传、entitiesNear/all 条件、entry prepare/reveal 投影 |
| `src/core/world-sprite-behavior.cov85-sampler.test.ts` | 14 | canonical 采样器 chance 0/100、not/all/any、finishStep complete、break/continue(标号)、loop while 进入/跳过、until、animEntity 覆盖帧、facing 跳过、wait 累计(4920ms=41×120)、共享脚本 return、自/互递归、异己 self、缺脚本、错靶、confirm/startBattle/teleportOut 容器路由 |
| `src/core/script-editor.cov85-residual.test.ts` | 11 | BehaviorId/HookId/ScriptId 空/路径字符精确错误、registry 缺失族、Hook 撞 id/缺 hook、物品守卫族、战败脚本 delete 臂、共享脚本缺体/未 apply invert、onLose/onFlee/onFail/else 嵌套遍历+改名重写、describe 标签、discardRedo/空 redo/未绑定发布/历史失效 |
| `src/ui/SkillTab.cov85.test.tsx` | 19 | 13 类效果缺省矩阵+undo、变身/召唤成功体、五行/量/资源/增减/毒 id/成功率参数、敌方施法分支白名单长度判别、玩家分支 remainingResourceDamage、stale 删除禁用 |
| `src/ui/ItemTab.cov85.test.tsx` | 9 | 装备效果 7 类缺省矩阵+undo、使用摘要八类效果行精确文本（runSceneHook/craftRecipe/permanentStatBoost/modifyHostileAwareness/scaleCurrentHp/levelUp/placeEntityInFront）、stale 删除按钮级门禁 |
| `src/ui/App.cov85.test.tsx` | 4 | 敌对开关成对默认体/清除/undo、hide ticks=9 与 suspend ticks=12 合法提交+remain→suspend 走缺省 15、默认入场点 col/height 部分补丁、命名落点 label 清空删键+坐标单轴 |
| `src/ui/ScriptEditor.cov85.test.tsx` | 20 | 五类条件缺省体提交、循环名称自动 loop-N id、selectSceneHooks 三态+omit 零派发、6 类命令行呈现标签 |

### 三态反控（真实证据见 `evidence/coverage85-glm-editor-r1/mutation-evidence.json`）

由 `evidence/coverage85-glm-editor-r1/run-mutations.mjs` 自动执行并落盘：每个注入点含
command/cwd、JSON reporter 原始输出摘录、exit code/signal、失败用例 file×fullName、
唯一业务 AssertionError、original/mutant/restored 三态 sha256、以及仅针对被变异产品文件的
`git status --porcelain` 清理证明。五注入点全部「原始绿→变异红→恢复绿」通过、
hash 满足 original==restored≠mutant、产品文件零残留：

| 注入点 | 变异 | 定向红的唯一业务断言 |
| --- | --- | --- |
| `world-sprite-behavior.ts` chooseVisualChance | `percent >= 100` → `> 100` | chance-100 走 else → preview 变 variants 而非 cycle |
| `script-editor.ts` checkScriptId | 去掉 `startsWith('/')` 臂 | `/lead` 前导斜杠 ScriptId 未被拒绝 |
| `ItemTab.tsx` defaultEquipEffect | maxPool delta 50→25 | 缺省体 `{maxPool, hp, delta}` 不再是 50 |
| `SkillTab.tsx` 敌方白名单 | 去掉 ENEMY 过滤 | 选项数 18≠7（白名单长度判别） |
| `App.tsx` suspend 缺省 ticks | `: 15` → `: 16` | remain→suspend 落 16 而非 15 |

另：`App.tsx` hide ticks 守卫 `ticks > 0` 变异（→`>=0`）**存活**——DsDraftNumberInput
`min=1` 在 onCommit 前已拒绝 0/-3，该守卫臂经 UI 不可达（防御层），测试只断言合法提交，
此处登记为 existing-proof 而非反控信用。

### 质量门

- `pnpm --filter @type-pal/editor typecheck`：0 error（含 scripts author-check）。
- Biome `check` 7 个新文件：0 error/0 warning（--write --unsafe 仅自动整理格式/未用导入）。
- 产品/旧测试/共享配置/baseline/真实 PAL 数据零改动（git diff 干净，仅新增 7 测试文件+证据）。
- 无 `as unknown as`、`@ts-expect-error`、skip/ignore、timeout 扩大；旧 kit 复用仅 import 不修改。
- 证据：`docs/ops/tasks/evidence/coverage85-glm-editor-r1/`（vitest-fresh.json 81 例
  file×fullName×status + 全套 sha256、branch-census.json 逐文件 miss/locless/missLines、
  coverage-summary.json 30139/33513 stmt、24156/29058 branch、7628/8543 fn、26978/29284 line）。

### 已登记的现有不可达（existing-proof，非本卡新增）

- `command-form-control.tsx` branch/setEntity*/jumpScript/scriptIndex 臂：作者方言被
  `AUTHOR_CUSTOM_COMMAND_KINDS`（command-form-contract.ts:59-73）排除出
  `CommandFormCommand`，ScriptEditor.tsx:2004 自带 ConditionEditor 拦截 branch；
  ControlCommandForm 唯一调用方（CommandForm default 分支）不会喂这些 kind。
- SkillTab removeSkill / ItemTab deleteItem 的 referenceReady 错误通知臂：删除按钮
  `disabled={!referenceReady || blockers}`（SkillTab.tsx:1121、ItemTab.tsx:1412）先行拦截。
- `script-editor.ts` getAffectedRecordsSince 无记录臂（1173）：所有 history 提交路径都写入
  affectedRecordsByVersion，合法 caller 无法制造版本空洞。
- App/MapMode/ScriptEditor/PreviewCanvas 共 508 个 v8 无源位分支（locations 空）。

### r1 返工记录（GLM，2026-10-04，Codex 六项返工）

1. **违禁模式清零**：SkillTab 改用 `stubNodeTestHost`（去 @ts-expect-error node 桥）+
   `loadLegalUiProject` 真实 `assetBase`/`createEditorAssetReader(source, getState)`；
   ItemTab `dualAttack` 直用合法 `StatusId`；script-editor residual 的
   `DeleteSharedScriptCommand` 改传真实 provider（守卫先于引用检查触发）。全卡 7 文件
   无 `@ts-expect-error`/`as never`/`as unknown as`。
2. **act 警告清零**：根因是裸调 `session.undo()`（EditorHistoryCoordinator.commit →
   notifyEditorObservers → forceStoreRerender 在 act 外）与 App root 未 unmount；
   全部 undo/redo 包 act、afterEach 补 unmount、App 补 `IS_REACT_ACT_ENVIRONMENT`。
   定向 7 文件：`not wrapped in act`/`not configured` 计数 0、console.error 0、87/87 绿。
3. **反控证据重建**：见上表与 `mutation-evidence.json`（含 run-mutations.mjs 取证脚本）。
4. **finishStep 重复合同已删除合并**：旧测 `world-sprite-behavior.test.ts`「a canonical
   completion edge previews once, never as a loop or extra empty stage」已证 finishStep
   complete 完成即止主干；本卡原 `finish-complete` 用例与之重复，r1 返工已**删除**
   （sampler 现 14 例），dedup 头同步声明该主干由旧测持有，不主张任何覆盖信用。
5. **Base 更正**：`76475c01c`（见卡头）。
6. **证据 JSON** 已 `biome format`。
7. **覆盖推进**：ScriptEditor +6 presentation 合同（selectSceneHooks 槽位明细、
   releaseEntity 无 target、startBattle 裸命令/callScript 无自身/trigger 继承/mountParty
   无偏移变体）、App +1 敌队缺数据回显/真实敌队切换/chase 成对默认体与 range/speed
   精确提交合同；删除 finishStep 重复例后 r2 终测 24167/29058（83.16%，+302）；未以
   85% 冒交，剩余 locatable 缺口按 r2 清单继续推进或逐臂一手证明。

### r2 返工记录（GLM，2026-10-04，Codex 六项）

1. mutation-evidence.json 由取证脚本以「JSON + 尾换行」落盘，四个证据 JSON 全部通过
   `biome check` 格式门（脚本可重复产出同形文件）。
2. 计数漂移修复：r1 终测 JSON 在删除 finishStep 重复例**之前**生成导致 87 虚报；r2 以
   删除后的代码全量复跑重建，新增计数 86（删后）+1（App 敌队/chase 新例）=87，与定向
   逐文件计数一致；卡面同步 24167/29058=83.16%（+302）。
3. 反控执行集合修正：run-mutations.mjs 现按 status 排除 skipped/pending，
   executedSet/executedCount/skippedExcluded 逐相落盘（如 INJ-1 original：executed 1、
   skipped excluded 13）；spawn argv/cwd/rawStdout/rawStderr/exit/signal/唯一业务
   AssertionError/三态 sha256/逐文件 git-clean 齐备，五注入点复验全 OK。
4. locless 只作缺口构成说明，不作 unreachable proof（census note 字段 + 卡面声明）。
5. 未改产品/旧测试/baseline/共享配置；改动仅限本卡 7 个测试文件与证据目录。

### r3 交付记录（GLM，2026-10-04，基点重置为 origin/main 最新 ea1fddb8c）

r2 内容（87 测试/类型安全/act 修复/反控证据）已在 main，未重复。本轮新增：

- **T1 MapMode**（`MapMode.cov85.test.tsx` 5 例，全真值装配：loadLegalUiProject 真实
  maps/scene/assetBase/assetReader，scene-stage 仅隔离绘制层；pointer-capture/rect 均按
  旧测同款端口补齐）：
  - C1 单选格→Delete 恰好清空一格瓦片（floorSnapshot 差集=1）并 undo 恢复（session
    序列化 oracle，MapMode.tsx:2765→1618-1626）。
  - C2 Escape 清选区后 Delete 零提交零历史。
  - C3 无选区时右键菜单 移动/重复 禁用（按钮级门禁；notice 守卫 1686-1688/1860-1862
    为防御层登记 existing-proof）。
  - C4 有选区右键菜单 ArrowDown/Home 键盘导航（2594-2622，焦点经 复制→剪切→回复制）。
  - C5 工具状态行：平移↔选择切换（2777-2801 toolbarHint）。
- **T3 PreviewCanvas**（`PreviewCanvas.cov85.test.tsx` 2 例，真实 node-canvas 像素）：
  - P1 瓦片集字节被真实 reader 拒绝 → err 文本回显 + 失败态不排帧（画布 opaque=0）。
  - P2 失败→健康 source 重挂 → 就绪 + rAF 后真实不透明像素>100（缺失/恢复完整翻转）。
  去重 c06-g01（像素/空白）与 glm-next-wave F02a（mock status）；本文件差异轴=真实
  reader 拒绝驱动 + 恢复路径。
- **T2 ScriptEditor 插入菜单**（`ScriptEditor.cov85.test.tsx` +6 例，文件累计 20）：
  打开「添加指令」弹窗（先关 fixture 预开的编辑弹窗）→ 搜索 → 选择：
  - 无实体时「暂停实体」禁用并回显 title「请先选择一个场景实体」（3080 不可用臂）。
  - 暂停/恢复/移除/实体页四类缺省体插入在既有指令之后（onChange 全量数组断言
    `[原命令, {kind, target, ticks/selection…}]`，3673 insertCommandsAfter 业务结果）。
  - 搜索无匹配回显「没有匹配的指令。」空态（3712）。
  - 反控说明：曾为 suspendEntity 缺省体（3079）设计 INJ-8 变异，手动验证变异后测试
    仍绿——该插入路径未走 3079 fallback（examples/模板路径命中），按不冒充原则
    **撤销 INJ-8**，反控维持 7 点；此判别缺口已登记，缺省体判别由测试的精确对象
    断言承担。
- **T4 中型页补合同**：本轮预算内未完成，未写半成品；列为 r4 首选
  （ProjectWorkbenchTab/ActorMode/CutsceneTab 表单残臂）。
- **反控**：run-mutations.mjs 扩至 7 注入点（新增 INJ-6 MapMode Delete 选区门、INJ-7
  scene-stage err 回显），raw stdout/stderr 全量落盘（不再截断），执行集合仍显式排除
  skipped/pending；七点全部 原始绿→变异红→恢复绿 + 三态 hash + 清理证明。
- **终测（含 T2）**：全套 4695/4695；新增 9 文件 95 例（MapMode 5+Preview 2+插入
  菜单 6 加入 r2 保留 82 基数）；branch 24177/29058=83.20%（+312）。

### 下一棒建议（r2）

按 locatable 缺口排序：MapMode.tsx（键盘/候选菜单/变换条/只读解释族，参照
MapMode.test.tsx harness）→ App.tsx 剩余检查器/放置面板臂 → ScriptEditor.tsx 插入菜单
fallbackInsertionChoice 族 → PreviewCanvas camTarget/隐藏实体/淡幕族 →
ProjectWorkbenchTab/ActorMode/CutsceneTab/两 SpriteLibrary。

## 下一位 Agent 提示词

你是 GLM，负责本卡 editor workflow。先读 `AGENTS.md`、`CLAUDE.md`、`docs/phase2/READ-FIRST.md`、
本卡和 fast baseline，再对 App/MapMode/ScriptEditor 的真实 caller 与旧 fullName 做排重。只写
本卡白名单的新测试/fixture/证据；交付时记录每个合同的事件、状态、oracle、fullName、三态反控
和 branch 变化，并输出 `accept` 或 `counter`；不得改产品、旧测、配置或标 done。
