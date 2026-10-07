# TEST-REFORGE-BATTLE-PREVIEW-BINDING-1 — 试打场景演出与 canonical 脚本接线 · 逐轴账

排重口径：轴 × 公开 caller × 合法输入 × 业务 oracle × 旧 file-fullName。产品冻结
`2f0fe6d2f0a4eb308febfbe6b787b4276b762b8d`，派发基 `a2447b5c9ec19ff52f48cf4d3200c1af3a1245b8`
（含本卡提交）。四冻结源 SHA256 与卡面一致（回执 [d1-repro.json](d1-repro.json) `frozenSources`）。

**结论先行**：B1–B7 七轴全部裁决，**零新增正常合同**。B1/B7 existing-proof；B2/B3 同根因
产品缺陷 D-1（现行读取域 = 投影视图，stage 正文恒空），交最小隔离正向红反例
（[run-d1-repro.mjs](run-d1-repro.mjs)，CONTROL 绿 + REPRO 恰一红）；B4 为**源码域证据**
（r2 按 Codex 一审 B-R1-03 降级：boot 期全场景预载使按 caller 的读取归因在运行期结构上不可能，
见 B4 节）；B5 三前提均无既有产品承诺可入绿测，只登记诊断与产品点；B6 多匹配/搜索域策略未定，
blocked 交产品裁决。不为过门把「演出永远丢失」写成正常绿合同，也不造反控数量（无新正常合同）。

**r2（2026-10-07）**：按 origin/main 同名卡 Codex 一审闭合 B-R1-01～03，仅重铸诊断工具与证据，
七轴裁决、冻结、白名单与产品零改动结论不变——①唯一严格判据 + 同判例拒收自测（JSON
parse 失败/spawn/signal/身份/状态/计数/needle/额外错误/skip/冻结漂移一律拒收，正确形状必须
accept）；②repro 移至仓库外 mkdtemp 完整产品复制树（红测试不再出现在活动 packages），建树起
即 finally 清理并有成功/提前失败两路清理演练；③B4 读取归因降级为源码域证据（下节）。

**r3（2026-10-07）**：按二审闭合唯一剩余项 B-R2-01——JSON reporter 对异步 uncaught 静默
（二审实证：afterAll setTimeout 抛错后 native JSON 仍 total2/pass1/fail1、suite.message 空），
判据 `judgeReproRun` 增耗**同一子进程**的完整 raw（同次双 reporter：default→stdout/stderr 全局
诊断、json→文件 native 身份），命中 `Unhandled Errors` 段/`Unhandled Rejection`/
`Uncaught Exception`/`Errors  N error(s)` 汇总行即 `global-error:*` 拒收；同判据自测扩至 21 例
（含 4 例 raw 标志畸形与「正确形状必须 accept」）。另加**真实 Vitest 污染样本**（复制树内判据
最小输入：同 CONTROL/REPRO fullName、REPRO `expect(['actual']).toContain(needle)`、afterAll
setTimeout 异步抛 `CODEX_EXTRA_RUNTIME_ERROR`）——实测 native JSON 干净两例一绿一目标红、
exit1/signal null，判据拒收且唯一拒收原因即 global-error（`soleReasonGlobalError=true`）；
D-1 主诊断（纯 CONTROL 绿 + REPRO 恰一 needle AssertionError 红）在加严判据下仍 accept、raw
零全局错误标志。仓库外隔离/清理、B4 降级与精确身份二审已核，不重开；产品零改动不变。

## 一、读取域双轨事实（D-1 根因，一手源锚点）

同一场景存在两条互不相同的读取域，这是全部试打绑定轴的根因：

| 读取域 | 链路锚点 | 正文来源 |
|---|---|---|
| 正常脚本 caller（hook/行为） | `main.ts:4471-4500`：`sceneResources.peek(activeScene.scene.id)` 取 **canonical** `RuntimeSceneDef` → `runtime.runSceneHook(canonical,…)` / `runEntityBehavior(canonical,…)` | canonical stage 正文（命令可执行） |
| `?battle-scene=` 试打 walk | `main.ts:5857-5875`：`getSceneDef(choreoScene)`（`main.ts:364-366`）= `runtimeSceneView(await getCanonicalScene(id))` | **投影** `SceneDef`：`baseSceneView`（`runtime-project-view.ts:163-173`）删 hooks/entities 重建，`projectRuntimeHookBinding`（`:97-111`）无条件 `body: []`，实体页 `emptyProjectedStages()`（`:129,134`），实体 `behaviors` 整体剥除（`:140-161`） |

投影不携带正文是**既有产品合同**（`runtime-project-view.test.ts:120-141`「projects canonical
page/behavior/hook selection without copying script bodies」；投影是渲染消费视图，非存储权威），
因此缺陷定位在试打 walk 消费投影（`main.ts:5862`），不在投影本身。递归 walk（`main.ts:5864-5872`）
在投影 def 上对任何 team 都找不到 `startBattle`，`choreography` 恒 `undefined`。

演出消费链（正常路径全通，作为反例的正向对照）：`script-runner.ts:744`（`cmd.choreography`
透传）→ `main.ts:3302-3313`（options.startBattle）→ `main.ts:2676-2677`（battleHost.start）→
`battle-launch-preparation.ts:94-95`（`options?.choreography ??` 敌种兜底）→ `battle-session.ts:677-686`
（collectChoreo，`battleStart` 在第 1 轮入队）→ `battle-session.ts:813-836`（`playSound` 无条件
`state.log.push('♪ 音效 …')`，即 `__reforge.battleLog` 公开观测）。

canonical 读取路径（B4 源码域）：`main.ts:358-360` `getCanonicalScene` → `scene-resources.ts:34-40`
`canonical(id)`（命中/装载，**失败不缓存**）→ `project-loader.ts:464-492` `loadAuthorScene`/`loadScene`
（sceneIndex 索引 → FileSource.readJson → `validateAuthorScene` 逐命令校验 → id 一致性 → 对话树解析）。
注意 boot 期 `main.ts:3215` `getLifecycleReferences()` → `scene-resources.ts:65-71` `references()` →
`loadAllScenes` **预载全部场景并填满 `#scenes` 缓存**——试打 walk 的 `canonical(id)` 因此是缓存命中，
不产生独立 IO；这是 B4 读取归因降级的结构性原因。

## 二、逐轴裁决

| 轴 | 裁决 | 处置 |
|---|---|---|
| B1 | existing-proof | 不新增 |
| B2 | product-counter（D-1） | 隔离正向红反例（d1-repro），不修产品 |
| B3 | product-counter（D-1 同根因变体） | 合入诊断账，不造净新 test/针 |
| B4 | 源码域证据（r2 降级；运行期读取归因结构上不可能） | 不新增绿测（见下） |
| B5 | 诊断登记（无既有承诺可入绿测） | 产品点交裁决 |
| B6 | blocked（搜索域/多匹配策略未定） | 交产品裁决，不自创机制 |
| B7 | existing-proof（域已分离） | 不新增 |

### B1 — 无 `battle-scene` 的试打：跳过 onEnter、正常战果回执

existing-proof，`main.host-boundaries-1.test.ts`（MHB 卡，基线实测 26/26 含此文件）：

- `MHB-TRIAL-DONE-1 ?battle= 试打开场：跳过入口 onEnter 演出…`（`main.host-boundaries-1.test.ts:168-185`）：
  战前 money=50 非 55（入口 onEnter 未重放）、真实战斗打完、`试打结束:victory`、结算恰一次（57）。
- `MHB-TRIAL-ERROR-1 ?battle= 非法敌队…`（`:187-199`）：`试打失败:…敌队没有有效敌人`、零战斗会话、宿主可操作。

### B2 — canonical stage 正文确有目标 team 的 `startBattle.choreography`，试打是否消费到

**product-counter（D-1 复核成立，非修复卡）**。一手证据 [d1-repro.json](d1-repro.json) /
[d1-repro.raw](d1-repro.raw)（再生：`env -u NODE_COMPILE_CACHE node docs/ops/evidence/TEST-REFORGE-BATTLE-PREVIEW-BINDING-1/run-d1-repro.mjs`）：

- **合法工程**：runtime-shell fixture 经公开 `loadCurrentProjectFrom` + `validateAssetFileClosure`；
  场景 b onEnter stage 正文含 `{kind:'startBattle', enemyTeamId:'encounter', choreography:[{at:'battleStart',
  body:[{kind:'playSound',asset:'sfx-encounter'}]}]}`，schema/校验锚点 `author-script-core.ts:797-834`、
  `battle-choreography.ts:143-158`。
- **CONTROL（绿）**：同一工程作者 `startBattle` 命令自带同一 choreography，经正常脚本 caller +
  公开 `bootGame` 真实开战，`battleLog` 含 `♪ 音效 sfx-encounter` —— 证明形状合法、链路可呈现，
  排除「fixture 形状错/根本不可呈现」的替代解释。
- **REPRO（恰一红）**：`?battle=encounter&battle-scene=b` 试打；先以公开 `loadScene(fixture.project,'b')`
  作 **test 侧独立验证**（装载器校验通过、canonical stage 正文确有匹配命令；非试打 IO 归因，
  见 B4），再断言试打绑定的遭遇演出被真实战斗消费 —— 失败：
  `AssertionError: battleLog 观测=["hero 攻击 foe…","胜利"]: … to include '♪ 音效 sfx-encounter'`。
  战斗本身正常开打并胜利，遭遇演出零呈现 —— 与 MHB 卡 D-1 披露同症，根因锚第一节。

替代解释逐项排除：非法作者输入（装载器校验通过，canonical 断言绿）；演出命令不属于真实搜索
caller（CONTROL 证明同形状命令经正常 caller 可执行可呈现）；旧测试未触实际战斗（REPRO 打完整场
真实战斗）；最新实现已改 canonical 读取（`main.ts:5862` 现行仍消费 `getSceneDef` 投影，冻结 hash 在案）。

### B3 — 唯一匹配位于合法 entity behavior stage 正文 / 合法嵌套控制结构

**product-counter（D-1 同根因变体，合入诊断账，不造净新 test/针）**：

- schema 允许：`checkBaseAuthorCommands` 递归校验任意命令位（含 trigger/auto 行为 flow 正文与
  branch/loop/confirm 嵌套体），`startBattle` 合法位置与 onEnter 完全同域
  （`author-script-core.ts:797-834`；嵌套体走同一递归）。
- 正常 caller 可执行：实体 trigger/auto 从 **canonical** 执行（`main.ts:4498` `runEntityBehavior(canonical,…)`）；
  实体触发链既有证明 `MHB-SCRIPT-ERR-1`（`main.host-boundaries-1.test.ts:106-166`，实体触发
  loadScene 走真链、修复后同入口重试成功）；onEnter 变体的 startBattle 执行证明 `H9-2`
  （`main.battle-host-flows.test.ts:72-88`）。
- 试打读取域仍遗漏：投影把实体页 trigger/auto stages 置 `[{body: []}]`、`behaviors` 整体剥除
  （`runtime-project-view.ts:129,134,140-161`）——实体侧匹配与嵌套结构在 walk 域内同样恒空。
- 嵌套控制结构同理：嵌套体只存在于 stage 正文内部，正文既空，嵌套位置不构成独立轴。

### B4 — 引用另一已登记场景：路径/场景 ID 是否按 canonical 索引读取

**源码域证据（r2 按 B-R1-03 降级）：解析域是 canonical 的，丢失发生在读取之后的投影（D-1）；
按 caller 的运行期读取归因结构上不可能。**

- 试打场景解析链（源码锚点）＝ `getSceneDef` → `getCanonicalScene` → `sceneResources.canonical(id)`
  → `loadScene(project,id)` → `sceneAssetById(project.sceneIndex, sceneId)`（不在索引即抛
  `loadAuthorScene: SceneId … 不在 scene index`，`project-loader.ts:468-469`）→ FileSource 真实读取 +
  校验。未绕过 current 校验、未塞旧 SceneDef；不存在旁路 scriptStore/投影存储。
- **r1 冒称撤回**：r1 曾以 `fixture.reads` 含 `content/scenes/b.json` 写成「试打实际读取闭环」。
  该归因不成立——test 侧主动 `loadScene` 会自己产生读取（污染），且 boot 期 `main.ts:3215`
  `getLifecycleReferences()` → `references()`（`scene-resources.ts:65-71`）经 `loadAllScenes`
  **无条件预载全部场景并填满 `#scenes` 缓存**，试打 walk 的 `canonical(id)` 是缓存命中、不产生
  独立 IO。运行期观察到的任何 b.json 读取只能归因 boot 预载，「同输入差分」也无法把读归因给
  试打（无 `battle-scene` 的 boot 同样预载 b）。故本轴降为源码域证据，不再冒称运行闭环。
- 不新增绿测的理由：本轴唯一用户可见结局与 B1 试打完全同形（choreography 静默丢失 = 缺陷面），
  「文件被读」单独成测是 IO 形状弱断言，「演出丢失」不得写成正常绿合同（卡面明令）。

### B5 — 场景无目标 team / 合法 startBattle 未带 choreography / 场景读取 IO 拒绝

三前提独立排重后同汇于 `main.ts:5858-5890` 的两处收口，**均无既有产品/文档承诺可入绿测**：

| 前提 | 代码臂 | 行为 | 资源所有权 |
|---|---|---|---|
| (a) 场景无目标 team | walk 无匹配（`main.ts:5864-5874`）→ `choreography=undefined` | 战斗照常开打，无遭遇演出，无任何回执差异 | 无新占用 |
| (b) 合法 startBattle 未带 choreography | 匹配条件要求 `c.choreography` 真值（`main.ts:5868`）→ 不匹配 | 同 (a) | 无新占用 |
| (c) 场景读取 IO 拒绝/场景不在索引 | `getSceneDef(...).catch(() => undefined)`（`main.ts:5862`）吞掉 | 同 (a)；无 `试打失败` 回执、无重试信号 | `SceneResources.canonical` 失败不缓存（`scene-resources.ts:34-40`），被拒 promise 已结算并被捕获；无缓存中毒，场景 def 所有权不进战斗会话 |

唯一面承诺是 `main.ts:5855-5856` 注释「加此参数验证 boss 遭遇台词」——该承诺当前被 D-1 打破，
即缺陷面本身。(a)/(b) 与 B1 结局不可区分（业务面同形）；(c) 的静默 fallback 无任何产品/文档
承诺。按卡面「不得代用户决定静默 fallback 是合理 UX」：三条全部只登记诊断，**绿测为零**；
(c) 的回执取舍与 D-1 修复合并成一个产品决策点（绑定目标缺失/不可读时给什么反馈）。

### B6 — sharedScripts / 多 stage / 多 team / 多匹配是否扩大搜索域、形成歧义

**blocked：搜索域与多匹配策略未定，不实现自创机制（卡面明令）。** 结构性事实供产品裁决：

- 现行实现（消费投影）根本找不到任何匹配，「歧义」当下不可达；`found = c.choreography` 覆写
  无 break（`main.ts:5864-5872`），若把 walk 指到 canonical，现行代码语义是**末个匹配胜**——
  该语义从未被产品确认。
- 若改读 canonical，域问题立即变真实：hook 多 variants 时 walk 会遍历**全部** variants 的 stages，
  而 canonical 世界态每次只激活一个（`script-world.ts:339` 起 `resolveSceneHook` 按 world cursor
  解析唯一激活 variant）；实体多 behaviors/多实体同理（`resolveEntityBehavior` 按选择态解析）。
  「搜全部命令 vs 当前激活命令」未定。
- sharedScripts：共享脚本正文在 `project.sharedScripts` 库（`runtime-script.ts:92-99`），经
  `callScript` 命令引用（`author-script-core.ts:258`），**结构上永不位于场景 def 树内**——即使
  walk 改 canonical 也搜不到库内 startBattle；试打绑定是否应跟进 shared 脚本是域策略决策。
- 多 team/多匹配命令：同场景多处匹配的取舍（首/末/拒绝歧义）未定。

### B7 — `?battle-preview` 静态摆位与 `?battle` 实际试打是否被混为一类

**existing-proof，域已分离，不重复普通摆位测试**：

- 两入口是 bootGame 不同分支：`?battle-preview` 在主循环启动前渲染一帧即 return
  （`main.ts:378-381` → `renderBattlePreview` `main.ts:5982-6055`，不进主循环/回合/战斗会话）；
  `?battle=` 走完整 boot + 主循环 + 真实战斗宿主（`main.ts:5842-5890`）。
- 旧证据：`N01 ?battle-preview 静态摆位渲染一帧即返回，不进战斗与主循环` / `…引用缺失战斗精灵
  定义时精确拒绝且零帧`（`main.glm-n.test.ts:32-56`）；`Q01 缺 enemies 参数：默认取工程敌表前 3 项` /
  `Q01 空 enemies 参数：零敌人仍渲染摆位一帧即返回`（`main.battle-preview.glm-q.test.ts:37-48`）；
  `main.c85-boot.test.ts:4` 已注记 gallery/battle-preview/party 合同归 glm-n 不重复。
- 另注：编辑器「战斗模拟器」试打是第三条链（冻结快照 + 敌种 choreography，
  `battle-trial-assets.ts:104-149`；bootGame 对 `battle-trial`/`skill` 参数显式拒绝
  `main.ts:268-269`），与本卡 `?battle=`/`?battle-scene=` 试打不同入口，不在本卡轴内。

## 三、新正常合同

无。七轴排重后不存在既未被旧测证明、又真实满足且不编码缺陷的未证合同；按卡面以准确诊断闭环
而非测试数验收。专属白名单测试文件/目录未使用（白名单是许可非义务）。

## 四、blocked / 产品决策点（不修产品，交 Codex/用户）

| 项 | 状态 | 证据 |
|---|---|---|
| D-1 试打 `?battle-scene=` 消费投影致遭遇演出接线死路 | product-counter，修法应在产品侧（如 walk 改读 `getCanonicalScene` 并同步定义搜索域），本卡白名单不含 main.ts | 第一节 + d1-repro |
| D-1 修复时须一并裁决：搜索域（全部 variants/behaviors vs 当前激活；sharedScripts 是否跟进）与多匹配取舍（现行覆盖式=末个胜，未确认） | blocked（产品策略） | B6 |
| 绑定目标缺失（场景无 team/无 choreography/IO 拒绝/不在索引）时的用户反馈 | blocked（产品 UX） | B5(c) |
