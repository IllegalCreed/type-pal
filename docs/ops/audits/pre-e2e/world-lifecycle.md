# B批 · 世界、脚本与异步收尾

后续更新（2026-09-06）：[B-04 当前存档预检已修复](save-preflight-remediation.md)，三席通过并按用户授权收口。
以下保留原审计基线与缺陷取证；不将 B-04 修复外推为本批其余问题均已解决。

基线：`84434b8a`（产品代码仍与A批`09ee6e3c`相同，content20/SAVE8）。
Owner：Codex；内部并行取证不代表Kimi/GLM签字。**本批只读，未修复产品代码或用户数据。**

## 结论与边界

本轮确认9条观察，分属8个问题家族；B-06/B-07是同一“嵌套活动与保存屏障互等”家族的两个不同分支，
修其中一个未必覆盖另一个，不等于必须开两张修复卡。A批U-01已由B-04追证，不能再笼统写“所有坏字段都会污染世界”。

| ID | 阶段 | 严重度 | 确认观察 | 触发/范围 |
|---|---|---|---|---|
| B-01 | 一阶段 | P1，条件性 | 旧切场景请求迟到失败，清掉读档后的新事件游标 | 加载在途时F9，恢复后有新对话，旧请求随后失败 |
| B-02 | 一阶段 | P1 | 正常早期存档继承当前局的精灵别名，可能变隐身 | 好槽缺可选alias，当前局已执行0x65改主角精灵 |
| B-03 | 一阶段 | P1，条件性 | 读档资源失败后黑屏/加载锁未收口 | 正常槽的目标场景资源请求失败，可通过再次成功读档恢复 |
| B-04 | 二阶段 | P1，坏输入条件 | 坏金额/朝向越过预检并污染活动状态；party空值错误未收口 | 同项目同版本损坏SAVE8；正常当前保存器不会自然写这些坏值 |
| B-05 | 二阶段 | P1，条件性 | 换图预载失败，canonical覆写已经改变并可保存 | 无scene参数的当前地图切换，资源加载失败 |
| B-06 | 二阶段 | P2 | 确认框请求保存→继续开战，因lineage key不一致等待自己 | 合法作者流程；超时释放后继续，不是永久死锁 |
| B-07 | 二阶段 | P2 | 确认框请求保存→内联场景出口，持久lease申请等待自己 | 同场景/session正常嵌套；同样有超时恢复 |
| B-08 | 二阶段 | P2，条件性 | 切场景预检签名漏canonical hook选择，放过过期entry契约 | 资源等待期间另一auto/脚本切换目标hook；reveal随后拒绝不匹配 |
| B-09 | 二阶段 | P1，取消交错条件 | 取消的selector叶命令在await之后仍写canonical | 取消发生在异步scene解析之后、实际selection提交之前 |

这是可复现条件下的问题，不是现有用户存档已经损坏的证明。一阶段问题单独排期，不直接宣布第二阶段R4全部阻断。
二阶段优先补恢复失败隔离、异步提交边界，再处理保存屏障/预检契约；修复方案及准入另行按任务卡协议决定。

## B-01 · 过期失败回调仍拥有当前GameState

- 直接证据：`packages/game/src/core/event-system.ts:3488-3504`的`triggerPendingSceneLoad`捕获同一gs引用；
  catch没有请求/场景身份判断，直接清eventCursor并改explore。F9生产入口为`tools/quick-save.ts:29`，
  `shell/bootstrap.ts:1126-1129`接入同引用读档。
- 调真实事件状态机启动延迟scene15，恢复另一正常内存槽，再由真实状态机开始新对话。
  旧加载reject后：场景仍6，但mode由event变explore、cursor被清、dialogBox仍在；真实tickByMode输入Confirm不推进该对话。
- 反证：没有新读档/新事件时，catch是有效的失败解冻。不能因此删除一般失败保护，应先识别它是否仍拥有状态。
  探针恢复边界使用与生产相同Object.assign，本例没有执行完整bootstrap或慢网浏览器，后续键盘/网络专项仍要覆盖。
- E2E：一阶段加载在途→F9→继续对话→旧请求失败；不能只断言读档Promise曾成功。不是A-04快存时机的重复项。

## B-02 · 同版本好槽被当前精灵别名污染

- `game/src/core/event-system.ts:4396-4399`的真实0x65同时写PlayerRolesRuntime和可选partyLeaderSpriteId。
  `shell/bootstrap.ts:1657`用Object.assign恢复，不删除目标槽缺席字段；`:1671-1672`再把残留alias灌回已恢复角色数据。
  `core/game-state.ts:1794`的getOverworldSpriteNum优先消费alias，实际渲染由`present/present.ts:347`读取。
- 控制输入是当前`createInitialGameState→loadDefaultGame→Save.saveSlot`生成的正常好槽，不是坏JSON或历史版本。
  当前局执行真实0x65设置232后，AST原样提取的完整loadGameFromSlot读取该槽：savedSprite=2、saveHasAlias=false，
  但restoredRuntimeSprite/restoredAlias/renderedSprite全部=232。
- 主Agent又用真实parseSpriteChunk解码本地`data/extracted/data/sprite/232.rle`（gzip解压），确认64帧均1×1且opaque全0，
  因而“隐身”不是仅凭编号猜测。数据取证不等于已跑完整渲染截图。
- 反证：槽中也有正确alias，或当前alias恰好一致时正常。别因实现旁有“旧存档兼容”注释就误认为只有旧档才受影响。
- E2E：一阶段早期好槽→后期换装/隐身→读回，要求恢复目标槽本身的外观。不能把二阶段canonical政策或对象替换方式直接照搬。

## B-03 · 读档失败只报错，没有回收加载态

- `game/src/shell/bootstrap.ts:1657,1679-1683`在目标资源ready前已覆盖gs、置sceneLoading、刷黑palette；
  `:1710`等待loadSceneCommon失败后没有恢复catch/finally。F9外层仅toast；`core/scene-system.ts:488`持续拒绝输入。
- 执行AST提取的同一loadGameFromSlot，在资源边界注入一次reject：reportedError非空、scene=15、sceneLoading=true、
  palette全黑；真实tickSceneInput不移动。未模拟真实浏览器断网/磁盘故障。
- 反证：资源成功或缓存命中时正常；再次F9成功可恢复，**不是永久不可恢复**。普通triggerPendingSceneLoad的catch
  不覆盖这条直接读档链。B-01/B-03修复不能互相用对方已有catch作兜底证明。
- E2E：一阶段读档资源失败→状态/画面/输入可恢复→重试；错误toast不是完整收尾。

## B-04 · U-01追证：坏核心字段突破恢复边界

直接执行从`reforge/src/main.ts`提取的doLoad/normalizeStoredPayload/restorePayload/prepareSceneSwitch/
assertSceneSwitchPlanCurrent/commitSceneSwitch/replaceWorld/abortScript等原函数体；使用真实codec、依赖签名、
落点解析、队形和renderer构造。场景/资产I/O、canvas、auto启停外围是内存桩，**不是完整bootstrap**。

| 输入 | 实际结果 | 对旧活动状态的影响 |
|---|---|---|
| 合法控制组 | restore=true | 正常完成 |
| party=null | reject；原F9形态`void quickLoad()`触发unhandledRejection，无toast | 没有abort旧脚本、没有替换世界 |
| position=null | catch、toast、false | 旧世界/场景保留，排除“位置空值必污染世界” |
| money="not-money" | restore=true | 坏金额提交；随后真实shopBuy入包1件且金额变NaN，再由真实快照函数/MemorySaveStore持久化NaN |
| facing="sideways" | commit期间dcol异常 | 已abort旧controller、替换world/scene/facing，尚未完成恢复，无回滚 |

- 源码：`save/current-codec.ts:100-110`未验证金额、party和position核心形状；`main.ts:5692`的party访问在try外，
  `:5703-5720`只在场景准备范围捕获错误，`:5726-5729`依次abort/替换/commit。
  `scene-transition.ts`的resolveSceneSpawn直接接受facing；`follower.ts:51-60`在同步提交时才用非法方向并抛错。
  F9 `main.ts:6730`的`void quickLoad()`没有catch，故party错误不提供稳定反馈。
- 严重度：坏金额/朝向为P1条件性恢复隔离缺陷；party错误反馈为同家族P2子项，不再另计一条根因。
- 条件：必须是同项目同SAVE8/content20的损坏payload。没有证明正常保存器会自然产生这些值，也没有改用户存档。
  保存后的NaN由内存Store验证，其采用与IndexedDB相同的结构化克隆数值语义；没有写真实数据库。
- 正向反证同样通过：旧load预检暂停→新load完成222→放行旧load，old=false/new=true且保留222；
  caller在预检中abort后抛AbortError，旧世界/场景/旧controller完整。不能把本条扩大成“所有异步读档保护失效”。
- E2E：坏检查点和恢复失败隔离前应修；合法检查点流程不因此一概停线。修复前应钉住结构验证发生在任何旧树abort/提交之前。

## B-05 · canonical地图覆写提交早于可失败的预载

- `reforge/src/script-project-core.ts:199-204`先写mapOverride；`script-host-adapter.ts:154-156`随后才执行reloadMap。
  真实主壳`main.ts:3551-3566`虽然在资源ready且signal/epoch/scene正确后才换现场地图，却不能回滚上层已写canonical值。
- 合法无scene参数的setSceneMapOverride(new-map)，经真实canonical runtime+adapter调用会失败的reloadMap。
  命令reject，worldChanged未执行；canonical仍new-map，随后真实保存barrier可以快照此值。
  现场不换图的依据是主壳提交顺序；探针没有跑renderer，不把其边界桩说成画面实测。
- PAL现存调用：`projects/pal/content/scenes/s243.json:1790`、`s230.json:2118`。
- 反证：成功加载时两个值相同不暴露；显式指定其他scene的静态覆写不走当前地图预载，不能混同。
  旧`ScriptRunner`后置提交/测试不覆盖canonical host的新路径。
- E2E：资源失败后现场、canonical、可保存快照的一致性；不能只检查Promise抛错。

## B-06 / B-07 · 保存屏障与它等待的子活动互等

两条真实canonical流程都从确认框开始：confirm未答时请求withSaveBarrier，再答yes继续。
主壳`main.ts:6442`明确允许确认框F5，所以不是只在不可达时序里强行调用保存。

- **B-06，开战**：父活动以ProjectScriptRuntimeHost为lineage key；其startBattle委派给retainedHost
  （`runtime-script-project.ts:174`），后者以自身this申请activity（`script-project-core.ts:273`）。
  `script-activity-lineage.ts:47`无法把两个key当同一父子活动，gate关闭后子活动等待，保存又等待父活动退出。
- **B-07，场景出口**：主壳`main.ts:3488-3500`在teleportOut内联runSceneHook(onTeleport)，后者仍申请新持久lease
  （`runtime-script-project.ts:349-374`）。关闭gate后等待其打开，父flow尚未完成。仅统一B-06的key不足以修复此分支。
- 两个探针的snapshot回调均未调用，保存因barrier超时拒绝；gate释放后开战/出口才继续。探针把timeout缩到30ms，
  **生产默认10000ms**（`runtime-script-project.ts:450`），不是永久死锁，不声称已在PAL找到该命令邻接。
- 已排除：activeBattle期间普通F5会被吞，所以本报告不写“战斗中随时F5”；同runtime/exact-signal共享子链已有保护，
  但不能覆盖上述wrapper身份差异或新hook lease；本例同scene/session且未abort，相关guard不会拦下它。
- E2E：确认框保存→确认继续→开战／出口；要求快照不等待自己阻塞的子链。两个触发证据按同家族归并修复。

## B-08 · 预检仍检查旧投影字段，遗漏当前hook选择

- `reforge/src/scene-switch-transaction.ts:20-68`签名看projection.sceneScriptOverrides/entryStage；
  但`runtime-project-view.ts:211-227`的当前projectedWorldScriptScratch没有sceneScriptOverrides，entityStage固定空对象。
  真正选择保存在canonical behaviors.scenes；resolveSceneHook/runtimeSceneView会消费它。
- AST原样执行main.prepareSceneSwitch：先取得before hook（fade），在真实函数的getMapAssets等待点，
  用真实selectBaseSceneHooks选择after（cut）。随后main.assertSceneSwitchPlanCurrent**未拒绝**旧plan。
  再按主壳捕获plan建立SceneEntrySession，真实hostSceneEntryReveal收到当前cut契约时抛“reveal与preflight契约不一致”。
- 调用域：`main.ts:1334-1357`的auto gate不因普通presentation busy暂停全部逻辑，合法并行selector可在资源等待时运行；
  selector并不使sceneSwitchIntent/worldMutationIntent失效，变更的hook owner也不是来源触发器owner。
  `main.ts:2941-2946`保留旧plan的entry，但新onEnter运行会按当前canonical选择解析。
- 反证：无并发选择变化，或两个hook的entry契约相同，不触发此错误。已证明签名遗漏和真实reveal拒绝；
  **没有跑完整compositor，不宣称已证实持久黑屏**。现有依赖测试用手工旧projection字段，不能证明canonical选择被覆盖。
- E2E：场景资源预检期间切换目标onEnter/page选择，要求拒绝过期plan或重新准备，不能先提交不一致entry。

## B-09 · 取消后的selector仍然写入canonical

- `runtime-script-project.ts:138-140`只在委派前检查signal；`script-project-core.ts:240-249`在await scene后直接selectBaseSceneHooks，
  没有再次检查取消。`script-world.ts:437`实际写入，之后bump epoch只保护旧cursor，不会撤回selection。
- 真实runCommands(selectSceneHooks)，scene resolver甚至只是async返回已缓存定义；进入该await后、提交前abort。
  取消前behaviors.scenes不存在；运行最终返回AbortError，但selection已变为after。并不依赖无限挂起或忽略signal的假host。
- adapter对selector直接return（`script-host-adapter.ts:134-135`），runner最终检查signal（`script-runner-core.ts:307-308`）太晚。
  未发现“异步解析后取消仍允许提交”的特许；已有lifecycle/move例外针对的是**已经提交**的副作用，不适用于此时序。
- 结论限定为“取消的leaf在尚未提交时跨过异步读取，随后仍写canonical”；
  **没有证明完整读档后新world被它污染**，主壳更复杂交错仍须另验。
- E2E：异步解析期间取消自动/交互脚本，比较cancel瞬间和完成后的canonical状态；仅看到AbortError不够。

## 未确证与已排除

- **U-02（待证）**：main.runDetachedScriptChain的finally只对runner=null做身份判断，却继续dismount/releaseAllAuthority/
  auto-save/drain；startScript的finally有完整`runner !== active`守卫。旧Promise树可能晚于新auto启动结清，但
  新auto的lease/authority限制尚未被完整可达反例穿透。不能用“忽略signal的fake invoke”判定误释放了新owner，暂不计确认数。
- B-04的position=null世界污染被排除；最新load胜出与caller取消前置检查均有效。
- 一阶段普通场景失败解冻、回标题/新游戏瞬态清理、正常palette预载、RNG失败Promise按身份清缓存与AVI settled/当前实例保护
  已读到有效边界，不把类似“异步回调”一律列为缺陷。
- 二阶段fade owner取消、SceneEntrySession按token收口、场景事务prepare/present失败与旧请求不得清新呈现、
  帧动画播放器awaitActive取消检查均有现有测试证据；没有用单个可疑Set/缓存形状推定生产可达错误。

## 复现与验证记录

四个新增脚本仍是**本审计基线的反例证据**，不是修复后应保持失败结果的正式测试；修复任务应迁入正确性回归并退役旧假设。
Node独立进程，无真实IndexedDB、网络和用户目录写入；仅读取源码及phase1角色/精灵数据：

```sh
node --import tsx docs/ops/audits/pre-e2e/probe-phase1-world-lifecycle.mjs
node --import tsx docs/ops/audits/pre-e2e/probe-reforge-restore.mjs
node --import tsx docs/ops/audits/pre-e2e/probe-canonical-async.mjs
node --import tsx docs/ops/audits/pre-e2e/probe-scene-preflight.mjs
```

主Agent已运行最终落盘版本：B-01..09均按上述范围复现，正向控制也通过。
AST摘取保留原函数体，资产/Canvas/宿主交互边界可注入；没有修改实现、复制“等价算法”或启动完整浏览器剧情。
phase1旧请求reject会输出预期console error日志，脚本据状态断言正常退出，不能把该日志当真实用户运行故障。

现有测试均通过，但未覆盖这些反例。分组有重叠，不相加为唯一覆盖数：

| 执行者 | 实际文件 | 结果 |
|---|---|---|
| 内部一阶段取证 | game `src/core/{game-state,event-system}.test.ts`、`src/shell/{rng-player,avi-player}.test.ts`、`src/assets/loader.test.ts` | 5 files / 420 tests |
| 内部canonical取证 | reforge `src/{runtime-script-project,script-world,script-runner-core,script-host-adapter}.test.ts`，`--no-file-parallelism` | 4 / 45 |
| 内部恢复取证 | reforge `src/save/{current-save.current-characterization,ops}.test.ts`、`src/{scene-switch-transaction,async-intent,actor-condition-lifecycle,follower}.test.ts`，`--no-file-parallelism` | 6 / 46 |
| 主Agent | reforge `src/{scene-switch-transaction,cutscene-controller,fade-driver,scene-entry-session,frame-animation-presentation,frame-animation-player}.test.ts` | 6 / 45 |

除恢复组在包目录用`node ../../node_modules/vitest/vitest.mjs run ...`外，其余用`pnpm --filter @type-pal/<包> exec vitest run ...`。

下一批C审战斗规则/操作/AI/结算与音画调用，承接B-06活动边界但不重复计数。未运行完整战斗/剧情E2E、真实资源断网或磁盘故障；
也没有穷举所有world字段、全部主壳演出组合或U-02。全仓审计仍未完成，当前不开放修复实现。
