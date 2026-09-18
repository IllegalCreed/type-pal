# GLM运行时基础功能五组补测工作包

2026-09-19返工接收更新：a9e1d4f1的59项/1189与原四针detected已独立确认；[当前counter](reforge-runtime-contracts-review.md)仅剩D1实际输入保真与候选看板回退。
最新GLM回执/30族/机器账仍保留候选树，未合入；下文派发与首轮接收为历史，已闭环的R1/R3不再要求返工。

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

## GLM设计与实施回执

r1 收窄返工完成（2026-09-19 第二轮，GLM；对应[counter 收窄节](reforge-runtime-contracts-review.md)：
仅剩 D1 实际输入保真与看板回退，R1/R3 及 R2/R4 已闭环项不重开；原候选 75c9cfe8/a9e1d4f1 回执保留在各自树）。
分支 `codex/glm-reforge-runtime-contracts-r1`（worktree `/Users/zhangxu/illegal/type-pal-glm-reforge-runtime`），
在最新 main 4678650a（含 guard 归档与预览缓存修复）之上 rebase 后追加收窄返工提交；
产品对冻结 3bc20273 零漂移不变。
最终树 10 个新测试文件共 **60 项**（Vitest 现场去重）：17+9+12+13+9。
定向 10 文件 60/60 绿；全 reforge 包 116 文件/1190 项 exit0；`tsc --noEmit` rc=0；
**14 个**新增 TS/MJS/MTS/JSON 文件 Biome rc=0；`pnpm check:docs` PASS（443 Markdown/2255 链接）。

**返工要点**：R1——C2 拆为「懒初始化接管」+「已初始化 player 真读取乱序」（旧读 entered 挂起→
新请求先完成提交→旧读迟到被 post-read 门丢弃，两资源字节身份不同、逐字节核最终载入）；C4 新增
「旧 load 的 finally 不清仍在途的新请求」交错例（A 挂起→B entered→A 迟到被拒→重复 B 仍只读一次）。
R2——D1 直读完整 author identity 与 runtime 解析后 cue（speaker/portrait{asset,side}/rows）+ 实际
project/author 输入保真；D4/D5 改同一 resolver/source 实例的故障→修复恢复，并补真实 urlFor IO
失败经 readError 包装（projectId/asset/kind/path/底层原因）与非目标 IO 零调用。
R3——B2/B3/B6 快照并比较**真正传入**的同一 world（在最后一次消费调用之后）；B5 请求全部由真实
useConfirm/useApply 产生（fixture 增 sc-1 scene 类：pick-item→execute；u-2 oneAlly：pick-target，
itemId↔selectedItemId 一致）。R4——A5 弱例改为完整终态等价+独立 state 对象+节点按合同共享；
本回执按最终树重写 30 族账/标题/计数/失败记录。

**收窄返工（第二轮）**：D1 输入保真改钉**实际**输入——project 纯数据快照**含 actorsById**
（投影直接消费的输入；仍排除持有活动状态的 source/resolver），读取边界捕获 loadAllScenes
实际消费的 lazy scene 正文对象（交付时即快照、消费完成后比较**同一对象**，不再用两次独立
readJson 的 clone 互比），并核 runtime 改 cue 不影响实际捕获对象、runtime speaker 即实际
actorsById 条目；独立确定性例保留但改名为「读取确定性」不再冒称输入保真。新见证
`reforge-runtime-input-review-witness.mjs` 的 loader-project-input-pollution 针已 detected
（业务断言红、无 TypeError），原四见证保持 detected、四对照绿。看板在 rebase 中保留主线
最新行（guard 归档/预览缓存），撤回对另一张卡看板的回退。

### 30 族逐项账（新增=本包用例标题；已有=锚点；待证/防御附归属）

**A · 键盘与主菜单（input.ts / menu-state.ts）**
- A1 新增（input.keyboard-boundaries）：`按下→边沿消费一次→held 保持→释放才消失；返回 Set 与内部状态不别名`、`非 repeat 多键各只消费一次；repeat 不再产生边沿`。
- A2 新增：`交错方向键取最后首次按下；repeat 不把旧键顶回；释放后回退剩余键`、`非方向键不参与命中；多键释放顺序不影响最后剩余者`。
- A3 新增：8 轴 test.each `可取消真实事件 %s → defaultPrevented`、`普通键不阻止默认；不可取消事件 preventDefault 为 no-op（真实事件语义）`（先证事件到达再断言 preventDefault）。
- A4 新增（menu-state.navigation-boundaries）：`非零记忆重开定位该项；合法末项保持；越界（正/负）归 0`。已有：menu-state.test.ts 默认开单/环绕。
- A5 新增：`物品→使用子菜单→退回父层：完整 stack、父 cursor 保持、原始状态不可变`、`同起点两次走相同路径得到等价终态（各自独立 state 对象；节点按合同共享）`（完整终态 toEqual + not.toBe；共享的是菜单树常量而非导航层对象）。已有：menu-state.test.ts 子菜单级联/装备 panel/back 三轴。
- A6 新增：`单层 back 关菜单 = CLOSED 常量；重开不污染 CLOSED；关闭态导航不变`。A1/A5 边沿驱动的隔离不另立条目（同合同并入）。

**B · 装备/使用菜单（equip-menu-state.ts / use-menu-state.ts）**
- B1 新增（equip-menu-state.navigation-boundaries）：`4 项/3 列：末行不满；↑↓±3、←→±1，越界吸附首/尾不环绕`（首尾/跨行 itemId 精确）。已有：equip-menu-state.test.ts:57 单项向上/空表。
- B2 新增：`确认只记选中进 pick-role 不换装；返回重读背包重置阶段/光标；传入 world 全程不变`（快照并比较的就是真正传入 openEquipMenu/equipBackToList 的同一 world，在最后一次消费调用之后比较）。
- B3 新增：`hero-b 只见自己的可装件（稳定身份对照）；party 外角色 → 空列表；传入 world 不变`（equippableItems 过滤 + 同 world 快照）。
- B4 新增（use-menu-state.navigation-boundaries）：`6 项/3 列两行：四方向 clamp 到首/尾；selected 与 cursor 对应`、`initialCursor 记忆恢复并 clamp 到末项；空列表 cursor 0`（6 项含 sc-1 scene 类）。
- B5 新增：`pick-item：sc-1 经 useConfirm 产 execute 请求；keep 按 outcome 世界重建并钳 cursor`、`pick-target：u-2 经 useConfirm→useApply 产请求（itemId↔selectedItemId 一致）；用光重建`——请求一律真实入口产生，不再手拼。已有：use-menu-state.test.ts:67 连续使用/:107 失败关闭。
- B6 新增：`失败结果原样返回原状态；真正传入的 world 在全链后逐值不变；close 轴关闭`、`pick-target Esc 回 pick-item 光标留在该物`（request ≠ 物品副作用已执行，同 world 深快照核验）。

**C · 音频异步调度（audio/bgm.ts / audio/midi-preview.ts）**
- C1 新增（bgm.runtime-boundaries）：`挂起期间并发 resume 只触发一次 ctx.resume；被拒后清旗标，后续手势可再次调用`（deferred 驱动）。
- C2 新增：`懒初始化期间后发接管：init 完成只读 last`（init 未完成期间 last 被后发 play 接管是当前实现语义）、`已初始化 player 真读取乱序：旧读 entered 挂起→新请求先完成→旧读迟到被 post-read 门丢弃`（两资源字节身份不同，harness 调用时即捕获逐字节核最终 loadNewSongList/play 次数与内容；witness bgm-post-read-ownership 已 detected）。
- C3 新增：`readBytes 失败 → 不 loadNewSongList/不 play；修复读取后同曲 play 真正提交`。待证：bgm 初始化失败后同 player 的 initP 拒绝缓存政策（现行不重试）——不固化为正确，交 Codex 裁定。已有：bgm.test.ts stop 清账/fade 接管/开关。
- C4 新增（midi-preview.lifecycle-boundaries）：`旧选择迟到被拒（AbortError），transport 仍是新选择；不清新请求的成果`、`同 asset+cacheKey 在途去重：读取轨迹只有一次，两次调用同结果`、`旧 load 的 finally 不清仍在途的新请求：A 挂起→B entered→A 迟到被拒→重复 B 仍只读一次`（witness midi-stale-finally 已 detected；cachedActivity 只测 transport）。
- C5 新增：`读取失败可观察；修复 reader 后同 asset 重载成功`（失败不半提交：duration 0）、`后端 initialize 失败 → play 拒绝且不缓存失败；下次 play 重试初始化成功`（initializePromise 失败复位是现行合同）。
- C6 新增：`并发 play 去重：resume 只发生一次，两调用同一结局`、`pause 使挂起 play 失效：AbortError、后端零 play、snapshot 记录显式位置`、`stop/seek/dispose 均使挂起 play 失效；dispose 关闭后端`（snapshot+实际后端动作双断言）。已有：midi-preview.test.ts seek/自然完成/stop-dispose。

**D · 当前工程与资源读取（project-loader.ts / asset-resolver.ts）**
- D1 新增（project-loader.current-boundaries）：`三个 indexed 场景：loadAllAuthorScenes 保 author 形态；loadAllScenes 解析完整对话投影`（author identity 逐值钉住；runtime cue 断言 speaker/portrait{asset,side}/rows 完整解析形态；不相关字段不漂移；witness loader-projection-bypassed 已 detected）、`实际输入保真：project 纯数据（含 actorsById）与读取边界捕获的实际 author 对象消费后不变`（source.readJson 边界捕获实际交付对象+交付时快照，消费后比同一对象；runtime 改 cue 不影响实际对象；input 见证 loader-project-input-pollution 已 detected）、`读取确定性：同一工程二次独立读取得到逐值相等的 author 树`。已有：project-loader.test.ts:272 indexed path/:287 lazy fail；editor 保存/打开测试实链。
- D2 新增：`返回顺序 = sceneIds 顺序（与文件表写入顺序无关）`、`中间场景读取失败：整批拒绝（不返回部分数组）；IO 轨迹证明确实读过前序场景`（含同输入全成功对照）。
- D3 新增：`合法非空内容 → loadStampTemplates 过守卫返回模板；缺席 → []（对照）`、`坏内容只坏一轴：origin 非法即拒；读失败传播底层错误`。
- D4 新增（asset-resolver.io-boundaries）：`失败消息含 projectId/asset/kind/path/底层原因；同一 resolver/source 修复后同 asset 成功`（reader 收到 catalog 登记路径；不再换新对象充当恢复）。
- D5 新增：`urlForRole(video.startupSplash) 产 URL 且不读字节；缺角色报错含角色名`、`直接 urlFor 成功/未知 asset 拒绝`、`真实 urlFor IO 失败经 readError 包装：含全上下文与底层原因；同实例修复后恢复`（IO 层失败而非 record/role 层提前拒绝；全轨迹仅 url: 无 bytes:/text:）。
- D6 新增：`显式 asset 入口 kind 门：错 kind 报实际 kind 与 path`、`角色入口 kind 门经 ASSET_ROLE_KINDS；catalog/roles/source 全程不变`（深快照不污染）。已有：工程保存/打开回归间接覆盖 readBytes/dispose。

**E · 效果派发与演出控制（cutscene-controller.ts / script-host-adapter.ts）**
- E1 新增（cutscene-controller.dispatch-boundaries）：`clearDialog/cameraSnap/video/frameAnimation 各进对应分支；async 分支收到同一 signal`（全参数精确）。
- E2 新增：`单个 await intent 挂起时不进下一条；resolve 后按序；同输入正控完整执行`、`executor 拒绝 → run 拒绝、busy 收尾清零、后续 intent 不执行`。已有：cutscene-controller.test.ts 按序/busy/waitPassive/取消/并发/重放六项。
- E3 新增：`frameAnimation startFrame:0 显式保留；fade ms 缺省 300 / 显式 0 保留`（cameraSnap to 缺省 undefined）。
- E4 新增（script-host-adapter.current-dispatch）：`dialog/clear/wait + give/lose/playSound/music/ambience 全参数与 count 默认 1`（载荷经 compileRuntimeCommands 当前守卫；host 记录替身未实现成员触碰即失败=非目标零调用实证）。
- E5 新增：`openShop 挂起时后续 leaf 不执行；resolve 后继续并收到同 signal`、`playVideo 拒绝 → 派发拒绝且错误原样传播；正常路径明确返回`、`playFrameAnimation/cameraPan 全参数派发（帧区间与帧率原样）`。
- E6 新增：`命令对象派发前后保真深快照不变；可选项缺席以显式键形态传递`。已有：runtime-script-project.test.ts 的 current-only selection/拒 vanishEntity。

### 负控与覆盖（最终树复跑）

- 负控 `node docs/testing/glm-reforge-runtime-contracts-mutants.mjs` rc=0：判据 AST 自测（good 通过/混合坏日志拒绝）+ 5 对照 exit0 + 10 变异针 exit1（每组 2 针）；每针 MUTATION_HIT + AssertionError + 钉名新增测试实际 failed（Vitest JSON 执行见证）；被触产品文件批前后 sha256 不变。
- 覆盖对照（可复制；config 物理绝对路径）：
  ```bash
  RR1_MODE=before RR1_OUT=/tmp/rr1-coverage-before pnpm --filter @type-pal/reforge exec vitest run --coverage --maxWorkers 1 --passWithNoTests --config /Users/zhangxu/illegal/type-pal-glm-reforge-runtime/docs/testing/glm-reforge-runtime-contracts.config.mts
  RR1_MODE=after  RR1_OUT=/tmp/rr1-coverage-after  pnpm --filter @type-pal/reforge exec vitest run --coverage --maxWorkers 1 --passWithNoTests --config /Users/zhangxu/illegal/type-pal-glm-reforge-runtime/docs/testing/glm-reforge-runtime-contracts.config.mts
  ```
  返工后局部十模块净增：行 +74、语句 +84、分支 +73；全 reforge 包：行 7853/14118(55.62%)→7927/14118(56.14%)、
  语句 8679/16188(53.61%)→8763/16188(54.13%)、分支 5256/11041(47.60%)→5329/11041(48.26%)。
  分模块（行 before→after / 分支 before→after）：input 1/18→18/18·0/12→12/12；menu-state 23/25→23/25·21/25→24/25；
  equip 22/22→22/22·17/30→25/30；use 26/27→27/27·26/39→33/39；bgm 77/114→83/114·54/81→58/81；
  midi-preview 128/172→131/172·87/123→95/123；loader 112/141→121/141·45/84→47/84；
  resolver 31/33→33/33·10/14→11/14；cutscene 17/23→23/23·7/18→16/18；adapter 32/165→62/165·29/172→48/172。
- 接收见证复跑：`node docs/testing/reforge-runtime-contracts-review-witnesses.mjs /Users/zhangxu/illegal/type-pal-glm-reforge-runtime`
  rc=0——4 对照绿；bgm-post-read-ownership / midi-stale-finally / loader-projection-bypassed /
  equip-input-pollution 四针全部 **detected**（函数体内 marker 执行见证 + AssertionError 业务红），产品 hash 不变。
- 输入保真见证（收窄轮新增）：`node docs/testing/reforge-runtime-input-review-witness.mjs /Users/zhangxu/illegal/type-pal-glm-reforge-runtime`
  rc=0——正常对照 7/7 绿；loader-project-input-pollution 针 **detected**（exit1、marker 打印 polluted.name、
  AssertionError 业务红、无 TypeError/超时），产品 hash 不变。
- 其余命令（exit 全 0）：`pnpm --filter @type-pal/reforge exec vitest run`（全包 116 文件/1190 项）、
  `pnpm --filter @type-pal/reforge exec tsc --noEmit`、`pnpm exec biome check <14 个新文件>`。
  机器账（逐针红因/日志 hash/覆盖数字/命令 exit）见 `docs/testing/glm-reforge-runtime-contracts-evidence.json`。
- 实施期失败记录（真实保留）：midi C4/C5/D6 首版用 `rejects.toThrow`，负控针显示其
  failureMessages 不含 AssertionError 字面量 → 改值断言后 15/15；B 组 use-open 针初版钉错标题（钉到
  B4 导航测试而非 initialCursor 钳位测试）→ 更正后过；C 组首版 fake sequencer 未翻转 paused 且
  并发用例未放行 init → 修 harness 后过。
- 返工期失败记录（真实保留）：vi.fn 记录参数被克隆导致 ArrayBuffer 断言拿空视图 → harness 改
  调用时即捕获字节；midi finally 交错首版失败面是 AbortError 拒绝而非 AssertionError → 改 outcomes
  值断言；D1 曾快照整个 project（含活 AssetResolver/增长 reads）→ 收窄为 manifest/sceneIndex/
  authorContent 纯数据面；A5 独立终态例首版 topLevel 拿到的是子菜单层 → 修正共享节点锚定。
- 未发现新产品缺陷；C3 的 bgm initP 拒绝缓存政策记待证交 Codex。全仓 check/官方 ratchet/
  strict-fast 未由 GLM 执行，留 Codex 接收后统一串行。GLM 为测试贡献者，未接收不转 Kimi 终审、不标 done。
