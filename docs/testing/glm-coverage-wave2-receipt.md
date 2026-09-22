# GLM 覆盖率第二波准备回执（W2-A～F 六组 25 模块）

任务卡：[TEST-NONVISUAL-COVERAGE-2](../ops/tasks/TEST-NONVISUAL-COVERAGE-2-six-domain-boundaries.md)（draft/r1，准备 Owner：GLM）。
生产冻结 `57dda7ed`；规划基点 `456feb12`；官方 fast 7538 项/633 生产文件。准备分支
`codex/glm-coverage-wave2`（worktree `/Users/zhangxu/illegal/type-pal-glm-wave2`，基于 `f828b9fc`，
`git diff 456feb12..HEAD -- packages/ scripts/` 为空——本阶段零产品/测试/配置改动）。
机账：[glm-coverage-wave2-results.json](glm-coverage-wave2-results.json)（每模块分桶数与本文对账）。

## 方法与分类口径

- 缺口定位来自 Codex 冻结机账的每文件 LCOV `missedLines/missedBranches`；本人逐组压缩为行段，
  **逐段直读源码**并与既有测试**精确标题**对齐后给出主分类。主导区域（各组 >70% 缺口所在）
  全部本人读过；零散单行按其所在函数归族。实施阶段每写一条用例前以冻结 LCOV 定位逐臂对账，
  数偏差即修正分类不迁就数字。
- 分类桶：**NEW**（新增业务候选）/ **PKG**（本包既有测试已证明，去重）/ **XPKG**（跨包或
  full-only 已证明；F 组三文件的 16 项既有测试被官方资产排除清单整体排除出 fast——属
  「已有业务脱离真实资源」，新写自包含小输入版本，不移动/不改排除）/ **UNREACH**（现行构造
  不可达、外层守卫重叠或纯防御，不改生产不硬打）/ **PEND**（待裁决/无现行消费者，单列不固化）。
- 960 行/1274 臂是整文件候选；本回执按桶折算后 NEW 约 671 行/888 臂，其中仍有可达性风险，
  **不承诺全可达、不预设用例数**。

## W2-A 运行时脚本状态与宿主调用（189L/246B）

| 模块 | 桶 | 行/臂 | 族与锚点 |
|---|---|---|---|
| script-host-adapter | NEW | 88/105 | **A01** 未测派发臂：fade/chasePlayer/vanishEntity/loadLastSave/gameOver/wait/teleportParty/setPartyFacing/setActorSprite/setActorAppearance(可选`?.`)/fleeBattle/setEntityState/setMultiEntityState/setEntityPos(?)/setEntityPosRelParty(?)/shakeScreen(?)（:41-127,:139-155）+ :166-294 其余 leaf 与默认值（`??300/720/8/4/2`）、activeEntity 缺席臂、signal 原样传递 |
| script-host-adapter | UNREACH | 15/19 | :319,:329-330 及派发后置防御（非 current ref/未知 kind 等外层已拦形态） |
| script-world | NEW | 24/54 | **A04** assertEntityTarget 不匹配 throw（:126）、pageById 回退（:163）、initialFlowCursor 两态（:186-188）、assertFlowCursor 四拒绝（:254-295）、条件求值 flag/var 六算子/currentScene 缺查询 throw/entityState/entityInScene（:722-772）、:358/363/386 选择/游标边界 |
| script-world | PKG | 8/14 | page selection/handoff/单槽选择已由 `script-world.test.ts`「page selection clears overrides atomically…」「inherit does not pin…」「single-slot selection…」「state-map handoff…」覆盖，不重测 |
| script-world | UNREACH | 2/4 | 防御默认 |
| script-project-core | NEW | 30/26 | **A03** core 命令落地：setVar/addVar 缺省 0/setScreenWave/setEntityState/setMultiEntityState/setEntityPos 初始化 `??=`（:137-156）+ 写后投影通知次数/状态 |
| script-project-core | NEW | 16/14 | **A05** moveEntity committed/abort 分支（:170-209）、后台动作 await/不等待与错误传播（:227,:330-340,:373,:393-400,:441-448,:507,:527,:539-543） |
| script-project-core | UNREACH | 6/10 | 防御 throw/不可达兜底（:88,:170,:188） |

**真实 caller**：`main.ts:243`（adapter 实例化）；`runtime-script-project.ts:35-37,85-130`（Base host/coordinator 复用）。
**合法 fixture/guard**：A01/A02 用记录型 host 替身（同 `script-host-adapter.current-dispatch.test.ts` 既有模式——观察实参/signal，不 mock 派发本体）；A03/A05 用真实 ScriptProjectRuntime/世界种子经正式 guard。
**旧测试精确标题去重**：「dialog/clear/wait + give/lose/playSound/music/ambience 全参数与 count 默认 1」「openShop 挂起时后续 leaf 不执行…」「playVideo 拒绝 → 派发拒绝且错误原样传播…」「playFrameAnimation/cameraPan 全参数派发…」「命令对象派发前后保真深快照不变；可选项缺席以显式键形态传递」——已覆盖命令/挂起/错误传播/保真骨架；新用例只补未测 leaf 与可选宿主方法两态。
**最强坏实现**：A01 派发某 leaf 时吞掉/交换两个位置参数或把 `command.ms ?? 300` 写成恒 300；A02（并入 A01 断言）派发前原地改命令对象；A03 setMultiEntityState 只写第一个 target；A05 后台错误被吞或 pending 未收口。
**单点负控（组代表）**：去掉「setMultiEntityState 逐 target 写入」循环（单点替换 `for` 为只写首项）→ 钉 `script-project-core.wave2` 精确标题 AssertionError。

## W2-B 模拟器配置/临时方案/资源快照（102L/100B）

| 模块 | 桶 | 行/臂 | 族与锚点 |
|---|---|---|---|
| battle-trial-config | NEW | 3/7 | **B01** 剩余拒绝组合（percent 上界/重复装备槽等零散臂） |
| battle-trial-prepare | NEW | 10/18 | **B02** preview/issues 剩余臂（缺 actor battler 的 hp/mp 上限无效、maxPool warning、缺敌队 team 悬空定位） |
| battle-trial-assets | NEW | 55/31 | **B04** `createTrialFileSnapshot`（:53-102）整段：并发同路径复用同一 pending、缓存返回 `.slice(0)` 副本、catalog bytes/sha 双校验失败、sealed 后未缓存拒绝、closed/aborted 后读拒绝、urlFor 固定拒绝 |
| battle-trial-assets | NEW | 10/8 | **B05** prepare 快照/取消/迟到返回不恢复读权限（:105-130） |
| battle-trial-assets | PKG | 18/10 | `scripts/battle-trial-assets.test.ts` 既有 5 项已覆盖的资源快照/取消窗基础路径 |
| battle-simulator-state | NEW | 5/12 | **B02** 临时主题覆写剩余臂（`battle-simulator-state.ts:68-105` 覆写不改原预设/不提 MP） |
| battle-simulator-state | PKG | 1/3 | library 测试已及的空态 |
| battle-simulator-library | PKG | 0/3 | 「parser/resolver detach nested data…」「missing preset references remain repairable…」「inline plans…」已覆盖； |
| battle-simulator-library | NEW | 0/2 | **B02** 两臂边缘（覆写悬空解析域） |
| battle-simulator-commands | PKG | 0/3 | UI 工作流已钉命令主干 |
| battle-simulator-commands | NEW | 0/3 | **B03** 依赖方案确认集合过期拒绝臂（`battle-simulator-commands.ts:18-38,79-104`） |

**真实 caller**：`battle-trial-launch.ts`/play.ts 消费 snapshot+prepare（已 done 模拟器卡链）。
**合法 fixture/guard**：config 经 `parseBattleTrialConfig` 正式解析；快照用真实 FileSource 替身（记忆 Map 字节）+ 真实 `AssetCatalogV1`；不实例化浏览器/Canvas。
**旧测试标题去重**：library 三标题、persistence 三标题（first use/deleting every preset/malformed sidecar）、`scripts/battle-simulator-ui.test.tsx` 十标题、两个 mutants 工具——36 项启动链证据不换文件名重报。
**最强坏实现**：B04 缓存返回内部缓冲不切片（别名污染）；sealed 后仍放行未缓存读；dispose 后迟到 resolve 恢复读权限；B03 过期确认集合仍接受删除。
**单点负控**：把 `readBytes` 缓存命中改为直接返回 `pending` 结果不 `.slice(0)` → 钉 `battle-trial-assets.wave2` 精确标题（两次读别名污染即红）。

## W2-C 精灵行为投影/帧动画草稿（112L/210B）

| 模块 | 桶 | 行/臂 | 族与锚点 |
|---|---|---|---|
| world-sprite-behavior | NEW | 48/78 | **C01** `projectCanonicalScriptFlowPreview`/`projectCanonicalSharedScriptPreviewChunk`/`projectCanonicalSpritePreviewState`（:436-527）未测投影臂：手工/auto 调用分域、自引用/递归栈后顺序重复、缺引用保守回退定位、目标筛选与精确 ID/域/路径输出 |
| world-sprite-behavior | NEW | 14/22 | **C02** `collectAutomaticScriptSpriteInstanceSites`/`...DefinitionIds`（:527-556+）：同资源多实例不串预览、闭包排序/去重、源状态深保真 |
| world-sprite-behavior | PKG | 33/50 | 「只为单阶段、线性且闭合的脚本显示可证明帧序」「无法解释的分支和缺失引用保守回退…」「逐命令预算阻止超长命令体…」「递归栈退出后允许顺序重复调用同一子脚本」已覆盖的骨架 |
| world-sprite-behavior | UNREACH | 6/9 | 防御回退 |
| frame-animation-draft | NEW | 4/14 | **C03** pixels/asset 双源、reader 延迟/拒绝、维度/字节长度、duration 缺省/覆写/合法非整数（按现行合同） |
| frame-animation-draft | NEW | 3/24 | **C04** 插入/替换/复制/多删/移动/选择续接/redo 清理历史分支；失败保留整输入 |
| frame-animation-draft | PKG | 1/6 | 既有 draft 测试基础路径（实施前核其标题精确清单） |
| sprite-actions | NEW | 1/3 | **C05** 下一 ID/default target 剩余臂 |
| sprite-actions | PKG | 2/4 | 「按 order/label/id 稳定排序…」「prop 实体只从自身精灵选择动作…」「actor 实体经角色表解析…」已覆盖 |

**真实 caller**：`WorldSpriteLibrary.tsx:18-25`、`FrameAnimationEditor.tsx:40`、`SpriteActionEditor.tsx:21`。
**合法 fixture/guard**：canonical 脚本经 `validateAuthorScenes`/正式 author guard 构造；像素算法只断言数值/字节。
**最强坏实现**：C01 投影把缺引用静默换成首候选或输出非空即过；C02 多实例共享同一预览数组；C04 删除后选择丢到 body 或失败半提交。
**单点负控**：`collectAutomaticScriptSpriteInstanceSites` 同资源两实例返回同一 site 对象（去重错误合并）→ 钉 `world-sprite-behavior.wave2`。

## W2-D 引用图与删除凭据（89L/159B）

| 模块 | 桶 | 行/臂 | 族 |
|---|---|---|---|
| project-reference | NEW | 18/36 | **D01** locator/稳定键/去重排序剩余臂（:410-552 一带），同显示名不同 ID 不合并 |
| project-reference | PKG | 11/21 | `project-reference.test.ts`/boundaries 已覆盖主键族 |
| project-reference-adapters | NEW | 19/24 | **D02** 六域 adapter 遗漏臂（:88,:295,:353-364,:551-574,:611-694）；disabled/inherit/transition 按已修 D-02 合同 |
| project-reference-adapters | PKG | 8/9 | 「canonical loadScene entry…」「buy creates a shop edge…」「s230-style script map override…」等已覆盖 |
| tileset-references | NEW | 9/22 | **D03** 真实 proof 工厂剩余拒绝臂（:39,:77,:112,:182-290） |
| tileset-references | PKG | 4/9 | 「scans exact id/path…」「fails closed on read errors…」「discards a late old-path result…」已覆盖 |
| script-references | NEW | 7/14 | **D02** 脚本域遗漏臂（:104-170,:276） |
| script-references | NEW | 2/3 | **D04** 缺定义/未知目标完整诊断（:360-363） |
| script-references | PKG | 2/4 | 「覆盖场景入口、共享体互调…」等已覆盖 |
| battle-data-references | NEW | 3/7 | **D02** 战场/敌队域遗漏臂 |
| battle-data-references | PKG | 2/4 | 既有覆盖 |
| world-variable-references | NEW | 2/3 | **D04** 变量域诊断臂 |
| world-variable-references | PKG | 2/3 | 既有覆盖 |

**真实 caller**：`project-reference-adapters.ts:1899-1960` provider/deletion impact；诊断 UI 消费。
**合法 fixture/guard**：经 `toEditorState`/正式 loader 的最小工程切片；proof 用真实 tileset-references 工厂不伪造 token。
**最强坏实现**：D01 同名异 ID 合并；D03 换项目后旧 proof 仍通过；D02 域 adapter 漏报一类边。
**单点负控**：tileset proof 的项目身份比较改为恒等 → 钉 `tileset-references.wave2`。

## W2-E 当前脚本/运行态守卫（218L/305B）

| 模块 | 桶 | 行/臂 | 族 |
|---|---|---|---|
| enemy-script | NEW | 67/86 | **E01** checkEnemyAiCondition/checkEnemyFallback/checkBattleChoreography*/checkEnemyHookFlow 剩余拒绝/接受臂（:152-458）：概率域、嵌套结构、可选缺席 vs 未知字段、负值/非整数 |
| enemy-script | PKG | 30/40 | 「接受具名 hook state…」「法术抗性接受完全免疫值 10…」「拒绝悬空 state…」「拒绝空 random…」已覆盖 |
| author-script-core | NEW | 70/100 | **E02** author/current runtime 命令选项与边界（branch/confirm/onLose/onFlee 嵌套、显式 false/0 不退默认） |
| author-script-core | XPKG | 30/40 | 经 reforge runtime（script-host-adapter/world）既有跨包证明的 Base 形态 |
| author-script-core | PEND | 11/19 | Base-only、无现行 author/runtime 消费面的形态——单列待 E-05/调用方裁决，不写测试 |
| runtime-scene | NEW | 6/12 | **E03** `runtime-scene.ts:68-121` hostile 三胜利/两逃跑策略、ticks/追逐参数边界 |
| runtime-scene | PKG | 2/3 | 既有覆盖 |
| validate-runtime | NEW | 2/5 | **E04** 同树空间+脚本校验剩余臂（:13-45） |

**真实 caller**：content 守卫经 validate-author/编辑器保存；runtime-scene/validate-runtime 经 reforge 装载。
**合法 fixture/guard**：先过 `checkBaseScriptLibrary`/`validateAuthorEnemies` 等完整父 guard 再单轴改坏（E04 合同）。
**最强坏实现**：E01 概率门把 0 拒成合法/越界 11 收下；E02 嵌套 onFlee 路径错路由到 onLose；E03 chase 参数边界 off-by-one。
**单点负控**：checkEnemyFallback 概率上界校验删除 → 钉 `enemy-script.wave2`。

## W2-F 迁移映射/审计自包含输入（250L/254B）

三文件既有 16 项测试（migrate-enemies 8/pal-casualty 5/audit 3）被 `scripts/coverage/config.mjs:82-94`
资产排除整体排除出 fast——**接近 0 覆盖不代表没有测试**。新写自包含小输入 fast 版本，不动排除、不移动旧测试、不二次报功。

| 模块 | 桶 | 行/臂 | 族 |
|---|---|---|---|
| migrate-enemies | NEW | 25/36 | **F01** 自包含输入的稳定 ID/五槽映射、悬空源、负音效语义、精确统计（`migrate-content.ts:1753` 现行调用） |
| migrate-enemies | XPKG | 18/28 | 8 项真实资产 full 证明（153 对象全迁等标题）——不重复 |
| pal-casualty-scripts | NEW | 45/44 | **F02** 概率门顺序/台词风格/locale/支持指令/未知漂移 fail-closed 自包含版（`pal-migration.ts:428` 现行调用）；overlay 四入口+36 locale 键最小 fixture 须完整满足 |
| pal-casualty-scripts | XPKG | 25/24 | 5 项真实资产证明 |
| pal-casualty-scripts | PEND | 5/6 | 历史 translator 注入/legacy 输出分支——无现行 caller，E-05 相邻，禁测不续命 |
| script-library-audit | NEW | 85/75 | **F03** migrated/authored 分栏、UTF8 字节、依赖闭包、world/enemy 不同根域、重复/缺引用/超界 issue、完整排序（`pal-migration.ts:564-574` 现行调用） |
| script-library-audit | XPKG | 30/25 | 3 项真实资产证明（294 场景三重 10x 等） |
| script-library-audit | PEND | 17/16 | `reportHookSources=false` 等历史轴 |

**真实 caller 锚**：`migrate-content.ts:1753`→mapEnemies；`pal-migration.ts:428`→applyPalCasualtyOverlays；`:564-574`→auditScriptLibrary/assert。**原版语义**只沿 `pal-casualty-scripts.ts:10-23` 注释与已 done B11-1，不发明新结论。
**最强坏实现**：F01 五槽映射错位一槽；F02 概率门顺序颠倒（先判次级再判主级）；F03 分栏把 authored 计入 migrated。
**单点负控**：audit 分栏谓词反转 → 钉 `script-library-audit.wave2`。

## 分桶汇总（规划估算，实施逐臂对账）

| 组 | 模块数 | NEW | PKG | XPKG | UNREACH | PEND | 合计 L/B |
|---|---:|---|---|---|---|---|---|
| A | 3 | 158/199 | 8/14 | — | 23/33 | — | 189/246 |
| B | 6 | 83/81 | 19/19 | — | — | — | 102/100 |
| C | 3 | 70/141 | 36/60 | — | 6/9 | — | 112/210 |
| D | 6 | 60/109 | 29/50 | — | — | — | 89/159 |
| E | 4 | 145/203 | 32/43 | 30/40 | — | 11/19 | 218/305 |
| F | 3 | 155/155 | — | 73/77 | — | 22/22 | 250/254 |
| 合计 | 25 | 671/888 | 124/186 | 103/117 | 29/42 | 33/41 | 960/1274 |

（D 组行/臂分桶各自对齐模块总数；NEW 合计 671 行/888 臂是**上限候选**，可达性以实施为准。）

## 单列：未定政策/疑似缺陷（不固化、不本包裁决）

1. `author-script-core` PEND 11L/19B：Base-only 形态无现行 author/runtime 消费面——交 Codex/E-05 裁决。
2. `pal-casualty-scripts` 历史注入轴、`script-library-audit` reportHookSources=false：无现行 caller，属 E-05 退役候选域，禁测。
3. frame 通用缓存 invalidate 政策、BGM initP 失败缓存：原卡明确待证，B 组不碰。
4. 实施中发现的真实产品缺陷：冻结隔离反例+合法对照，交 Codex，该族暂停其余组继续。

## 冻结实施白名单（仅新增，零改生产/旧测试/公共 fixture/官方配置）

- 25 个新测试文件（每模块一个）：`<module-stem>.wave2.test.ts` 于对应包 src（reforge×6、editor×9、content×4、migrate×3——见机账 `whitelist.testFiles`）。
- 薄 fixture（按组隔离）：`packages/reforge/src/__tests__/coverage-wave2/{a-adapter-host,a-project-host,b-trial-catalog}.ts`；`packages/editor/src/__tests__/coverage-wave2/{c-sprite-canonical,d-reference-project}.ts`；`packages/content/src/__tests__/coverage-wave2/e-enemy-author.ts`；`packages/migrate/src/__tests__/coverage-wave2/{f-enemies-source,f-casualty-overlays,f-script-library}.ts`。
- 工具：`docs/testing/glm-coverage-wave2-mutants.mjs`、`docs/testing/glm-coverage-wave2-coverage.config.mts`（输出仅 /tmp）。
- 文档：本回执、机账 JSON、任务卡 GLM 席位/日志。
- 负控总量规划 12～18 针（上表每组代表针已列，实施按保护族冻结不凑数）；每针唯一注入点、钉新增测试精确标题、自身 AssertionError 首行、混合错误/超时/未执行自测拒绝、产品 hash 不变。

## GLM 准备结论

- **premise verified**：六组 25 模块的缺口定位、现行 caller（卡列锚点+本人直读复核）、旧测试标题、
  F 组资产排除事实全部一手核过；「未命中≠缺业务测试」的四类替代解释已逐组分桶（PKG/XPKG/UNREACH/PEND
  合计约 289 行/386 臂不新增）。
- **design agree**：工作包 A01～F03 族界与本人逐段读码结果一致；白名单 25+11+2+文档冻结；
  分桶对账可复算（机账）；负控代表针有鉴别力；未定政策已剔出单列。
- **可证伪观察**：① 任一「NEW」族在实施中被证明已有本包测试覆盖→去重表错，须改分类；
  ② 任一 PKG/XPKG 标题实际不存在或不再覆盖所述臂→去重失效；③ F 组自包含 fixture 过不了
  `checkBaseScriptLibrary` 等正式 guard→fixture 非法，不得放宽。
- 本阶段未改 packages/正式测试/原探针/官方 baseline/config/排除/超时/真实 data/projects；
  未操作浏览器/视觉；未切主工作树、未恢复 stash。
