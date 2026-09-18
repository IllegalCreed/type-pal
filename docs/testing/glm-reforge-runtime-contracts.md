# GLM运行时基础功能五组补测工作包

任务：[TEST-REFORGE-RUNTIME-CONTRACTS-1](../ops/tasks/TEST-REFORGE-RUNTIME-CONTRACTS-1-runtime-boundaries.md)，r1/rework。
2026-09-19 Codex接收75c9cfe8为[counter R1～R4](reforge-runtime-contracts-review.md)：56项/原负控/覆盖增量可复算，但四条实际执行坏实现被新增测试放行。
未合入测试或改官方基线；GLM原最终回执/机器账/实施者自验见75c9cfe8树。下方只保留派发范围，不把未接收交付冒称完成。
冻结`3bc20273fe88e83da2dcb32f04ea132a0ada60d9`；GLM只写新测试，Codex独立接收，Kimi终审。
Codex同时做[场景引用保护](../ops/archive/tasks/done/EDITOR-SCENE-REF-GUARD-1-scene-deletion-reference-closure.md)，不触本包生产面。
本包规模是五组十模块、30族待核范围，不是承诺30条/100条新增测试；签齐一次连续做完，不逐组重新走签字。

## 当前覆盖快照与真实入口（Codex已复算）

官方fast6932项/617生产文件；reforge1130项/124生产文件，行7853/14118、分支5256/11041。
下表只读当前`coverage/fast/reforge/coverage-summary.json`，不是本包新增成果。目标源码均在packages/reforge/src/。

| 组 | 模块 | 行命中/分母 | 分支命中/分母 | 当前生产caller（省略packages/） |
|---|---|---:|---:|---|
| A | input.ts | 1/18 | 0/12 | reforge/main.ts:6342/6405/6443构造、后按方向、消费边沿 |
| A | menu-state.ts | 23/25 | 21/25 | reforge/main.ts:6753-6793导航/确认/返回 |
| B | equip-menu-state.ts | 22/22 | 17/30 | reforge/main.ts:6615-6619四方向和确认 |
| B | use-menu-state.ts | 26/27 | 26/39 | reforge/main.ts:6638-6643与:5557执行后归并 |
| C | audio/bgm.ts | 77/114 | 54/81 | reforge/main.ts:387；editor/ui/MusicPicker.tsx:53 |
| C | audio/midi-preview.ts | 128/172 | 87/123 | editor/ui/MusicTab.tsx:67、ProjectAudioPreviewButton.tsx:32 |
| D | project-loader.ts | 112/141 | 45/84 | reforge/main.ts:470；editor/core/open-local.ts:73-74 |
| D | asset-resolver.ts | 31/33 | 10/14 | reforge/assets.ts:58标准色彩角色；main.ts:601视频URL |
| E | cutscene-controller.ts | 17/23 | 7/18 | reforge/main.ts:2817/2825/3425/3517/3521 |
| E | script-host-adapter.ts | 32/165 | 29/172 | reforge/main.ts:3908；runtime-script-project.ts:103-107当前leaf转交 |

低覆盖不等于从未测：editor保存/打开回归已间接执行loader；不把上述124文件全部作为本包范围。
第一阶段输入参考game/shell/input.ts:70-86、库存菜单core/menu/inventory-menu.ts:157-194仅钉已有交互，不扩充原版机制测试。
派发前主Agent复跑9个对应旧测试文件68/68、reforge typecheck均exit0；这不是本包新增数量。
证据/tmp/type-pal-next-parallel.0bsDcW/runtime-{adjacent,typecheck}.log；十个拟新增文件不存在，30族ID已机械核唯一。

## 唯一新增文件白名单

均以packages/reforge/src/为前缀；当前不存在，实施前再次检查，存在则停下核归属，不覆盖。

| 组 | 新文件 |
|---|---|
| A | input.keyboard-boundaries.test.ts；menu-state.navigation-boundaries.test.ts |
| B | equip-menu-state.navigation-boundaries.test.ts；use-menu-state.navigation-boundaries.test.ts |
| C | audio/bgm.runtime-boundaries.test.ts；audio/midi-preview.lifecycle-boundaries.test.ts |
| D | project-loader.current-boundaries.test.ts；asset-resolver.io-boundaries.test.ts |
| E | cutscene-controller.dispatch-boundaries.test.ts；script-host-adapter.current-dispatch.test.ts |

另允许：

- `packages/reforge/src/__tests__/glm-runtime-contract-fixtures.ts`薄fixture：小数据、typed host边界、deferred、保真快照；不抄产品算法/遍历器/整套旧测试。
- 本文件GLM回执区；本人任务卡签字/日志、必要索引机械联动。
- `docs/testing/glm-reforge-runtime-contracts-mutants.mjs`、`glm-reforge-runtime-contracts.config.mts`、`glm-reforge-runtime-contracts-evidence.json`。
- 若确有新缺陷，可新增`docs/testing/probe-glm-reforge-runtime-contracts.mjs`作隔离只读诊断，不进默认红门。

不得改其它卡、生产/旧测试/官方配置与基线/依赖锁/原探针、PAL工程或资产。诊断仅/tmp输出，不恢复stash，不追踪gitignored资产。
不要创建巨型fixture、整文件ts-nocheck或as any掩盖合同；确需宿主类型桥限制在已说明的测试边界。

## A · 键盘与主菜单（A1～A6）

先读input.ts全文与menu-state.test.ts；后者已有默认开关、单步环绕、子菜单确认/返回、panel锁，不重复这些短happy path。

- A1 实际键盘事件：keydown→consumePressed→仍held→keyup；返回Set与内部后续状态不别名，非repeat多键各只消费一次。
- A2 交错方向键后的lastDownOf按最后首次按下选择；OS repeat不把旧键重排，释放后回退剩余键；不测试移动/碰撞结果。
- A3 移动/空格/Enter/F5/F9事件preventDefault与普通键对照；事件须cancelable，先证真实事件到达，不伪造defaultPrevented结果。
- A4 非零记忆cursor重开、合法边界与超界回零；不构造当前caller不会产生的NaN/巨型delta作为核心目标。
- A5 多步真实MAIN_MENU导航→进入物品子菜单→选使用/装备→退回父层；断言完整stack/父cursor/稳定id及原状态不变。
- A6 关闭/重开与连续边沿驱动的隔离；若与A1/A5或既有测试同合同则登记已有，不重复加条数。未知blur/重映射策略不在本卡发明。

## B · 装备/使用菜单纯状态（B1～B6）

equip-menu-state.test.ts:57仅单项向上/空表/pick-role；use-menu-state.test.ts:67已有单体连续使用耗尽，:107已有失败/关闭。
本组用合法多物品背包经真实open函数构造列表，不重算装备/恢复公式，不测投掷、全队复活或战斗效果。

- B1 装备列表至少两行且末行不满，四方向真实clamp，首尾及跨行选择的实际itemId正确。
- B2 装备list确认→pick-role不提前换装；pick-role导航不变→返回重新读取背包，核完整阶段/selectedItemId，不与旧单项测试重复。
- B3 多角色合法装备过滤的稳定身份对照、无可装备项；同合同若已有content/item或菜单测试则复用，不新设角色位置身份。
- B4 使用列表至少两行四方向与末行clamp；selected item与cursor对应，不借装备导航结果背书。
- B5 finishUseExecution的origin=pick-item、status=success、menu=keep后重建列表并钳cursor；旧列表确发生变化，同fixture不变对照。
- B6 失败结果保持原菜单与原world输入；pick-target用完/未用完、close轴按既有证据去重。不能把菜单层request当实际物品副作用已执行。

## C · 音频异步调度（C1～C6）

只注入bgm.ts既有RuntimeAdapter、midi-preview.ts既有PreviewRuntimeAdapter；不调用真实AudioContext/Worklet，不作听感或视觉验收。
bgm.test.ts已覆盖stop、fade接管/开关/同曲续播；midi-preview.test.ts已有seek/自然完成/stop-dispose取消，不复制充数。

- C1 BGM resume并发去重→拒绝→后续手势可以再次调用；用entered/deferred控制，不依赖等待若干毫秒。
- C2 BGM不同曲目读取逆序完成，仅当前请求真正load/play；记录载入的完整字节身份、loop与调用顺序。
- C3 MIDI读失败后同曲后续play的合同，错误可观察且不错误提交；初始化失败是否可重试先核职责，未知政策记待证，勿把永久失败缓存固化为正确。
- C4 Preview A/B load逆序：旧结果拒绝、不清新请求；同key在途去重必须靠读取/完成轨迹证明，不只是Promise对象相等。
- C5 Preview读取失败后同key重试与backend初始化失败后的后续重试；每个故障同输入成功正控，不能拿另一个asset绕过验证。
- C6 Preview并发play、pause/stop/seek/dispose对挂起play的失效，只补旧测试未覆盖组合；snapshot及实际backend动作双断言。

MIDI数据用合法极小文件或现有验证过的fixture；若使用cachedActivity，明确只测transport不是解析器。
未授权修改BGM初始化/循环政策；首次发现行为与已核合同冲突时隔离报Codex，不调期望让坏实现绿。

## D · 当前工程与资源读取（D1～D6）

project-loader.test.ts:272/287已有indexed path/缺文件/id mismatch，:305/339/366有多入口；
editor保存/历史测试已有loadAllAuthorScenes实链。不复制这些作为“首次覆盖”，不扫整个assembleCurrentProject验证面。
AssetResolver在asset-resolver.ts，不是assets.ts；后者的PAL/RLE/caches不纳入本包。

- D1 多个合法indexed lazy scene经loadAllAuthorScenes与loadAllScenes，分别保留author身份/生成runtime dialogue，完整树与原输入不变。
- D2 批读按sceneIds确定返回顺序；中间读取失败传播并保持已读取输入，不把部分数组当成功。实际IO路径轨迹与同输入全成功对照。
- D3 当前manifest.content.stamps路径的合法非空内容→loadStampTemplates，坏内容/读失败只坏一轴；缺席合法空数组可做对照但不冒称新政策。
- D4 AssetResolver.readText失败上下文包含projectId/asset/kind/path/底层原因，修复reader后同asset成功；reader确收到catalog路径。
- D5 urlFor及实际角色链的失败/成功，合法video/color-table配置；无资源读取/URL创建不应被误报已成功。
- D6 角色/显式asset两入口的kind门与不污染catalog/roles/source；已有readBytes和dispose用例复用。整个加载与字节摘要闭包不是同一层合同，不向resolver凭空增加hash校验。

fixture必须由loadCurrentProjectFrom/当前assemble与对应guard接受；有author/runtime投影差异的cue先过真正当前形状。
只读内存FileSource，不触OS工程/存档。不扩充save恢复/manifest版本策略/迁移、默认落点或删除守卫。

## E · 当前效果派发与演出控制协议（E1～E6）

当前main.ts:3908调用executeScriptHostEffect；runtime-script-project.ts:79明确拒退役vanishEntity。
**BaseRuntimeLeaf类型里仍有某字段，不等于当前工程可执行。** 正常载荷经current checkRuntimeCommands/compileRuntimeCommands或等价公开当前守卫，
不直接用compileBaseCommands绕过当前门。PresentationIntent本身与RuntimeCommand分开，不硬塞成同一种schema。

- E1 CutsceneController的clearDialog/cameraSnap/video/frameAnimation真实caller分支，完整参数与同一signal；仅测协议调用，不测画面。
- E2 单个await intent挂起时不进下一条，resolve后按序；executor拒绝后busy收尾且未执行后续，同输入正控。已有基本dialog/fade/wait/并发复用。
- E3 合法显式零值与可选缺席传递（例如frame起点0）不能丢失；不把本不合法的0物品数量当正控。
- E4 current adapter限dialog/clear/wait、giveItem/loseItem/giveMoney、playSound/playMusic/stopMusic/setAmbience；核完整参数/默认值/非目标host零调用。
- E5 current adapter限openShop、playVideo/playFrameAnimation、cameraPan/cameraSnap；await时序、同signal、错误传播与明确返回，不用只统计spy次数替代业务结果。
- E6 跨分支输入保真与缺可选字段；既有persistent-only selection/map commit/current-scene隔离不重复。未知同signal并发run政策只能取证，不凭Set实现反推合同。

cancelAll按现行注释只重置呈现，调用方先abort信号；不造“cancelAll自动abort所有Promise”合同。
host替身只承担接口副作用/可控等待，取消测试必须真实尊重signal；不借此宣称U-02主壳旧finally所有权已修。
明确排除：vanishEntity/旧chunk resolver、loadLastSave、战斗/复活/毒/投掷、地图同步commit、移动/碰撞/数值公式、浏览器渲染。

## 执行、负控、覆盖与回执

遵守任务卡9项接收合同。每组至少2条有意义单点负控（共至少10条），另配正常控制；
使用Vitest JSON钉新增测试精确标题failed且为AssertionError业务红，实际执行见证/同fixture对偶，
拒混合TypeError/ReferenceError/timeout/unhandled/零测试；判据本身必须有毒日志自测，原产品hash不变。

30族每行填：ID、真实caller锚点、旧测试全名、计划/实际新增断言、主fixture合法性证据、正控/反控、状态、剩余归属。
状态允许新增/已有/重叠/防御或无caller/待证/缺陷；方法约束不硬算用例。只按最终Vitest实际执行计数求和。
不宣称“全部未覆盖臂已分类”除非确有branchId/arm完整账；代表族分类与逐臂穷举分清。

覆盖对照：import官方config/testSelection，同生产树before只排十新文件、after加入；十模块局部与reforge全包并集分栏，
额外命中逐文件归因；输出专属/tmp，命令中的--config用物理绝对路径避免pnpm filter cwd歧义。
最终全部新TS/MJS/MTS/JSON过Biome，reforge定向/相邻/全包与tc通过；全仓check/ratchet/strict-fast留Codex，不能并行争用主仓coverage。

无caller排除已核：ScriptChunkStore/MemoryScriptResolver、loadAllProjectMaps/loadProjectMapById；不授权删除，也不给旧入口补测保活。
已done的content六组补测与editor逻辑补测不重做，本包发现重复就登记已有；不复用其签字/贡献数字。

## GLM设计与实施回执（待填写）

目前无实现、无新增测试结果、无覆盖提升承诺。签字见任务卡；GLM先写本席premise/design，三席齐后才登记build并执行。
交付时本区写五组清单/30族账/最终SHA/冻结diff/逐次命令exit与失败记录/负控执行JSON/覆盖双口径。
GLM为贡献者，交Codex独立接收，未接收不转Kimi终审、不标done。
