# WORLD-ASYNC-COMMIT-1 - 世界异步操作提交一致性

Status: review
Phase: phase2
Capability: W3 / X1（既有能力缺陷修复，不变更能力地图状态）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi
Visual Verification Owner: Codex
Visual Verification Timing: e2e-deferred
Unavailable Agents: GLM
Branch: main

Revision: r1，2026-09-14。设计/产品取证基线：`af3c340021ff573e65360c2c73971d905636e1e4`；其中产品与`70e3f627`一致。
当前：2026-09-15实现与自验证完成，进入review；用户GLM豁免和5bc62a21的Kimi r1设计签字保持有效，不重签设计、不标done。

## 目标与范围

异步操作要么在仍有效时完整提交，要么失败/取消且不留下尚未生效的持久状态；切场景只消费与当前配置一致的准备结果。
三个相关缺陷合在本卡，分三段实现/验证、统一终审，不分别反复开设计卡：

1. B-05：当前地图覆写在加载失败/取消后仍被保存；统一现场与canonical的提交点。
2. B-08：场景预检遗漏canonical入口/页选择；准备快照、依赖比较与实际消费输入一致。
3. B-09：四种选择叶跨await后取消仍写入；在真实提交前检查失效。

范围外：B-06/07保存子活动互等、U-02旧finally权威、战斗组、默认落点/s135、地图布局/碰撞算法、
迁移与生成内容、旧接口总清理、存档codec/格式/版本切换、完整E2E。**不重开已done的D-01。**
SAVE8/content20不变，不做旧档修复/兼容fallback；不新增“所有同地图请求最新启动胜出”等未裁决并发策略。

## 前提真值门

### 一句话行为 / 工程前提

当前运行时已有“预载→有效性检查→同步提交”的合同，但canonical host抢先写地图、预检仍取旧投影字段、
选择叶缺await后的取消检查，导致三个入口破坏同一提交原则；根因在运行时调用边界，不在PAL迁移数据。

### 四向真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | 原版具体异步取消协议N/A：这是新引擎的Promise/AbortSignal与canonical模型，不声称原版有相同协议。采用现有二阶段一手合同：预检不改活动世界；换图同步写现场与持久态；已提交后取消不得撕裂 | `main.ts:1001/3558`；`scene-switch-transaction.ts:87`；`script-runner.test.ts:823` |
| 第一阶段 | 只借鉴加载前后状态与黑幕分层，不能把旧sceneLoading/调色板白名单搬入新架构。旧loadScene先await资源再写场景状态；没有等价canonical selector | `packages/game/src/core/scene-system.ts:619-646`；[engineering-notes §3.3/3.4](../../phase1/engineering-notes.md)；[harvest W4/W7](../../phase2/reference/phase1-knowledge-harvest.md) |
| 当前二阶段 B-05 | core先写mapOverride，adapter才reload；main虽保护现场，已经来不及阻止上层值进入快照 | `script-project-core.ts:199-204`；`script-host-adapter.ts:154-156`；`main.ts:3559-3585`；批二A01～04 |
| 当前二阶段 B-08 | getSceneDef消费canonical页/hook/cursor；签名却读取scratch中没有的sceneScriptOverrides和空entityStage，等待期间目标配置变化后旧计划可被接受 | `main.ts:476/1002-1114`；`runtime-project-view.ts:80-105/157-169/213-229`；`scene-switch-transaction.ts:31-61`；批二A05～08 |
| 当前二阶段 B-09 | wrapper只在委派前检查signal，基础host的四个await scene后直接写选择；外层最终AbortError不撤销已经错误写下的值 | `runtime-script-project.ts:133-140`；`script-project-core.ts:206-249`；`script-world.ts:409-445`；批二A09～12 |
| 本任务目标 | 成功完整提交；失败/提交前取消零残留；提交后取消保留结果并停止后续命令；预检依赖变化拒绝陈旧计划，不用全世界任意变化来误取消 | 上述既有合同；本卡AC-01～12；`script-project-core.ts:151-178`已有move提交后语义作边界控制，不改其合同 |

除显式带包路径者，上表代码均位于`packages/reforge/src/`。行号固定在设计基线，后续以符号与Git版本核对。

### 已复核证据与替代解释

- 批二材料：[接手回执](../../testing/glm-pre-e2e-boundary-batch-2-report.md)、[机器账](../../testing/glm-pre-e2e-boundary-batch-2-evidence.json)。
  GLM原材料+Codex修正自验，不充当本卡Kimi独立签字。相同产品、源码哈希已核；不重复72项全量盘点。
- 本轮最小复跑：A01 contract exit0；A02/A03/A05/A09分别在正确业务断言exit1，无环境失败。
  日志：`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/type-pal-world-async-draft-KIe6PD/`。
  命令：`node --import tsx docs/ops/audits/pre-e2e/probe-glm-next-async.mjs --mode=contract --case <ID>`。
- 最强替代解释：这些改变可能已合法提交，或审计替身跳过了主壳/使用不存在的旧字段，误把正常取消报成缺陷。
  排除依据：A02/A03跑实际main.reloadMap；失败时现场旧而canonical新；A09取消前快照无选择，成功resolver返回后才出现残留。
  A05通过真实selector和main.prepare/assert/reveal，不手工把缺失字段塞回scratch。已提交后的microtask取消另设正控，不能混同。
- 可证伪观察：若真实入口能证明失败前已同步提交现场与canonical，或目标有效绑定变化能使assertCurrent拒绝旧plan，
  或四选择叶在该时序完成后canonical/epoch/cursor均不变，则对应前提失效，应先修测试/范围而非强改产品。
- 四类替代根因：①runtime调用序已有直接证据；②原版/一阶段只作内容与展示参考，不定义新取消协议；
  ③合法内存场景和可控资源等待同样复现，不需要改提取/地图解码；④已修正旧审计误断言并以真实主壳和正常结果反控复核。

### 用户可见偏离

主动偏离已核合同：no（恢复一致性，不引入新体验）。
`before -> after`：换图失败/取消后存档可能记下没切过去的地图、预检可能使用旧入口、取消选择可能残留 → 失败不残留，过期计划不提交，成功结果完整保留。
代表场景：当前房间执行换底图，资源失败时仍留原房间且保存后重开也保持原图；正常成功时现场/保存一起变更。
产品行为无需另选新方案；用户已批准本卡GLM缺签，详见额度记录。

## 上下文锚点与调用边界

- 铁律：[READ-FIRST](../../phase2/READ-FIRST.md)、[CLAUDE](../../../CLAUDE.md)、[协作流程](../agent-workflow.md)。
- [世界审计 B-05/B-08/B-09](../audits/pre-e2e/world-lifecycle.md)、[总收口队列](../audits/pre-e2e/summary.md)。
- 成功/提交后取消已有测试：`script-runner.test.ts:785-849`；它测的是投影Runner，不代证当前canonical链。
- `scene-switch-transaction.test.ts:60-135`旧字段用例须转为真实canonical输入；保留后续呈现owner、失败清理和已提交后取消测试。
- `main.ts:708-725`替换世界时保留world/canonical对象身份，**不能仅凭引用相等判断仍是同一会话**。
  同时核`AsyncIntentController`、`main.ts:5270`取消失效链与`currentSceneSessionId`；不顺带实现尚待证的U-02。
- `runtime-project-view.ts:157-169`预检不仅读hook，还投影目标实体页/行为和动作；只补一个onEnter字符串不足以覆盖真实输入。
- `packages/editor/src/core/playback.ts:331-358`也消费ProjectScriptRuntimeHost/adapter；内部提交控制改动必须核它的现有宿主合同，不凭空开放预览不支持的换图能力。
- 不得引入：旧sceneScriptOverrides投影作为新持久真值、整world版本戳误取消、不分阶段的catch回滚、手工PAL补丁、通用巨型事务/锁系统。

## Draft: 设计与风险（r1）

### D1 · 地图覆写只在完整提交点生效

- `scene`缺席表示即时当前地图操作；显式scene（包括恰为当前ID）继续保持既有“设置指定场景覆写”语义，不擅自改成即时重载。
- 当前地图操作不再在core入口写mapOverride。沿用现有`ScriptEffectCommitControl`的窄握手机制，增加与地图命令匹配的提交控制，
  把它透传到实际换图宿主。canonical写入归runtime host，宿主负责先完成资源/renderer/room准备与scene/session/intent校验。
- 所有可失败准备在提交前结束；宿主在一个无await、无订阅通知的同步块中调用canonical提交控制并安装现场map/tiles/renderer/waveRenderer/room。
  调用控制后只允许普通字段赋值，不允许分配资源、用户回调或再次等待；需要时先构造完整next结构。消除main与core的双重抢写。
- runtime记录是否已提交：worldChanged只在完整提交后执行一次；提交后abort仍必须完成投影通知，并阻止后续命令，不能撤回旧值污染更新操作。
  未提交而effect拒绝/abort时不建立空mapOverride表、不通知。已提交控制幂等且不能重复写回。
- 无实时换图能力的合法纯状态宿主以显式无现场提交完成canonical写入；有reload能力的宿主必须接入同步控制，不能依靠await返回后猜测是否已换图。
  保持现有投影Runner的合法调用合同；任何接口适配只服务现有消费者，不能新增旧版本兼容分支。主壳与editor适配边界需Kimi重点审。
- 不采用“等reload返回再写canonical”的简单后移：await返回前的microtask取消或后续新提交会造成撕裂/旧写覆盖。

### D2 · 预检快照与依赖来自同一canonical输入

- prepare入口在任何await前冻结一份world/script与actor覆盖输入；显式传入的candidate script优先，并用于依赖、getSceneDef投影、map/followers与entry准备。
  禁止一边对preparedWorld克隆、一边在await后继续读活动currentScript。读档候选不能偷读当前活动canonical。
- 替换`SceneSwitchDependencies`的旧sceneScriptOverride/entryStage来源，改为目标场景真正被投影消费的canonical行为输入：
  onEnter/onTeleport选择与有效cursor（stage/state入口）、目标实体页/行为选择/triggerActivation等。保持队伍/装备/库存/跟随者/map/actor换装等已保护依赖。
  typed提取只保留实际消费字段、顺序稳定；不把整个world或全部behaviors表直接序列化。采用现有解析器，不复制一套hook/page算法。
- 同值重发、money/无关flags、别的场景选择不能误伤；目标入口cursor/页动作的真实变化必须被发现。
  消费字段边界需以`runtimeSceneView`/`projectRuntimeHookBinding`/`projectRuntimePage`对账，不凭旧测试的手填投影字段决定。
- prepare/present后现有两次同步assert都保留；陈旧计划按现有AbortError收口，不自动循环重试，不先提交再靠reveal失败报警。
  继续保证旧请求不清新owner呈现；不改fade/dither视觉算法或正常成功形态。
- 删除本调用域的失效依赖字段/断言，不把投影字段恢复成新的持久层；不借机删除全仓仍被其他域消费的Projected类型。

### D3 · 四选择叶提交前取消检查

- selectEntityBehavior/selectEntityPage/setEntityTriggerActivation/selectSceneHooks均先解析场景，await结束后立即检查signal与来源会话是否仍有效，
  再进入既有同步验证/选择函数；不在函数参数表达式里await后直接落写。
- 明确来源会话与目标地址分开：合法跨场景目标仍允许，不用“当前scene必须等于target.scene”错误拒绝它。
  同sceneId的新会话不能冒用旧请求；主壳world替换的引用复用按现有取消/epoch协议核，不新造全局序号来代替正确域。
- 提交前拒绝时选择/cursor/owner epoch/worldChanged均不变；成功后保留原inherit/disabled/use、cursorHandoff与owner bump语义。
  不给moveEntity/lifecycle等已提交后仍需投影的分支添加会跳过收尾的通用post-await throw。

### 主要风险与缓解

- 提交握手自身形成新双写或提前通知：真实主壳集成用例+通知瞬间快照+post-commit abort负控，不只测fake reload。
- 预检签名漏页/cursor或过宽：目标正交矩阵与无关变化正控并列；prepared candidate与活动world故意取不同状态核来源。
- 会话身份只比引用：加入同ID重入、world对象原地替换的失效对照；取消前/后两时点分开断言。
- 故障恢复使用回滚覆盖新状态：方案无catch整体回滚；每个可失败步骤均在提交前。

## 验收条件 / 回归矩阵

| ID | 必须满足 |
|---|---|
| AC-01 | A01～04转正式当前链回归：成功三态一致；同输入预载失败/取消三态仍旧；既有override和原本缺席两种初态均覆盖，失败后可重试 |
| AC-02 | 真实main提交点前故障（资源、renderer准备）零canonical/现场/通知；成功通知只一次，通知时现场与canonical均已完整安装 |
| AC-03 | 提交后microtask abort不撤销已完成地图，投影收尾仍到达，后续命令不执行；取消旧请求不得改掉已成功的新状态 |
| AC-04 | 显式其它scene/显式当前scene保持原静态覆写合同；即时操作来源会话失效（含同ID重入）拒绝，无误伤合法跨场景目标 |
| AC-05 | A05真实selector→main.prepare→assert/reveal合同回归；use/disabled/inherit、stage/state cursor、页动作变化分维验证，拒绝旧plan且现场零提交 |
| AC-06 | 无关money/flag、其它scene选择、相同值重发不使plan失效；原party/inventory/equipment/followers/map/actor依赖仍有效 |
| AC-07 | prepared world/script只读同一冻结快照；加载期活动值变化不混入计划；显式读档candidate不偷读活动canonical；呈现前/后guard和owner清理保持 |
| AC-08 | A09～12四叶：真实resolver entered→成功返回→提交前abort，合法正控相配；canonical/cursor/epoch/通知逐字段断言，不只检查AbortError |
| AC-09 | 已提交后的选择结果、inherit缺席语义、disabled、cursorHandoff与owner失效不变；moveEntity/lifecycle原后提交回归保持绿 |
| AC-10 | 每个修复点有旧树先红/新树绿，单点去掉防护再次业务红；禁止test.fails/skip、降低阈值、放宽超时或只测方法调用次数来凑绿 |
| AC-11 | 正式测试不得import docs诊断算法；提取所需test-only fixture或复用既有测试；披露GLM素材贡献，冻结审计探针/机器账不改成迁就新结果 |
| AC-12 | 定向+相邻测试、reforge/editor typecheck、完整check、官方ratchet后单次严格coverage:fast；零分母缩减，波动如实调查不取多数；文档与当前任务状态同步 |

候选测试面：script-project-core.test.ts、runtime-script-project.test.ts、script-host-adapter.test.ts、
scene-switch-transaction.test.ts、runtime-project-view.test.ts、script-runner.test.ts，以及必要的main AST真实接线测试。
仅到build才确定新增测试文件/实际数量，不预填通过项数。

### 集中E2E登记（不在开发期重复巡剧情）

- WA-E1：隔离测试工程一个当前场景、两张可辨地图；运行setSceneMapOverride。成功后保存/重开同图；注入资源失败/提交前取消后现场与重开仍原图，错误可恢复。
- WA-E2：两场景，目标有fade/cut两合法入口和页动作；资源entered时用合法脚本切目标选择。旧计划不呈现新旧混合入口；清理后再次正常切换按新配置成功。
- WA-E3：四种选择叶的异步读取取消；取消完成后无幽灵选择，重新运行正常选择可生效并保存重开；提交后取消保留已提交结果。
- 入口：R4隔离工程/正式引擎试玩入口；build期生成test-only最小fixture与可执行driver，不手改PAL工程。
  PAL s230/s243只作为Q1内容回归候选，不拿未经核验的剧情路线替代确定性fixture。
- 预期观感：失败保留原场景、无新旧地图/入口混搭；不改变正常fade/cut风格。证据在集中R4/Q1批次登记截图/回执，当前未做视觉验证、未宣称E2E通过。

## 推进签字

### 进入build前

- Codex：premise verified；design agree（r1）。依据本卡四向矩阵和本轮5个定向复跑；反证范围见上，不声称原版异步语义或完整视觉已证。
- Kimi：**premise verified / design agree（2026-09-14，r1，设计产品基线 af3c3400；全部证据本人直读/复跑；GLM 缺席，本席不代填，缺签豁免待用户裁决）**。
  - **B-05 直读**：`script-project-core.ts:199-204` setSceneMapOverride 在 core 同步写
    `world.mapOverride[sceneId]`，随后才 `executeEffect`（`script-host-adapter.ts:154-156` 的
    可失败 `host.reloadMap`）——canonical 先于加载写；主壳 `main.ts:3559-3585` reloadMap 尾部
    无 await 块同时写 canonical+现场，但挡不住 core 的抢先写入进快照。本人复跑 A02：
    actual `new-map` vs expected undefined（失败后 canonical 残留），业务红成立。
  - **B-08 直读**：`runtime-project-view.ts:213-229` projectedWorldScriptScratch 无
    sceneScriptOverrides、entityStage 恒 `{}`；而 `scene-switch-transaction.ts:53-54` 签名仍读这两个
    死字段；真实消费链 `main.ts:476` getSceneDef→`baseSceneView`（runtime-project-view.ts:157-169）
    走 resolveSceneHook 选择/cursor 与 projectRuntimeEntity 页/行为——签名与消费脱节。
    `main.ts:1002` 默认参数 `scriptState ?? worldView.script ?? empty` 且 getSceneDef 在 await 后
    默认读活动 canonicalScript——等待期活动值可混入旧计划。本人复跑 A05：actual false/expected
    true（旧计划未被拒），业务红成立。
  - **B-09 直读**：`script-project-core.ts:206-249` 四叶 `await this.options.scene(...)` 后直接
    写 world（selectSceneHooks 更在参数表达式内 await）；wrapper（runtime-script-project.ts:133-140）
    只在委派前 throwIfAborted。本人复跑 A09：abort 后 `residued='before'` vs expected undefined
    （取消后选择残留），正控不取消正常提交——业务红成立。A01 contract exit 0（正控）。
  - **既有边界直读**：`script-project-core.ts:151-178` move 端点握手（提交时检查 signal+scene/
    session、committed 幂等、提交后 abort 停后续不回滚）——D1 沿用该窄握手是正确模板；
    `runtime-script-project.ts:140-145` lifecycle 提交后投影必须执行——D3 不加通用 post-await
    throw 的边界属实；`main.ts:708-725` replaceWorld 原地保留 world/canonical 对象身份——
    仅凭引用相等不能判断同会话，设计用现有 intent/epoch 而非新全局序号正确。
  - **设计同意**：D1 core 不抢写、commit control 透传到实际宿主、同步块内 canonical+现场
    一次安装（块内禁 await/通知/回调）+ 无 reload 能力宿主显式无现场提交，消除双重抢写且
    拒绝「await 后再写」的撕裂窗口；D2 任何 await 前冻结输入、候选 script 优先、签名换成
    目标场景真正消费的 canonical 选择/cursor/页/行为且 typed 只留消费字段（同值/无关不误伤）、
    双 assert 保留、死字段只在本调用域删除；D3 await 后立即查 signal+来源会话再进既有同步
    选择、来源会话与目标地址分离（不误拒合法跨场景）、拒绝时 selection/cursor/epoch/
    worldChanged 均不变。AC-01～12 覆盖三缺陷的正/反/正控、先红后绿单点负控、探针冻结与
    GLM 素材披露，无 test.fails/降阈/缩范围；无旧版本兼容残留（D2 死字段删除不复活为持久层，
    符合铁律 11）。
  - **可证伪观察**（任一反例即 counter 或收窄）：① 真实入口已同步提交现场与 canonical 或
    目标绑定变化已使 assertCurrent 拒绝旧计划或四叶时序后 canonical/epoch/cursor 不变 →
    前提失效（本人复跑否定）；② D1 实现后失败/取消的 reload 仍触达 canonical 写或提交块内
    出现 await/通知 → 握手破坏；③ 提交后 microtask abort 撤回已接受地图或跳过投影收尾 →
    违反既有 move 合同（AC-03）；④ D2 签名漏目标页/cursor 真实变化或对 money/无关 flag/
    同值重发误失效 → 过窄或过宽（AC-05/06）；⑤ D3 误拒合法跨场景目标或同 sceneId 新会话
    冒用旧请求 → 会话身份错（AC-04）；⑥ editor playback 宿主（无 reloadMap，
    playback.ts:331-358）丢 canonical 写或新增意外现场写 → 宿主适配漏；⑦ 旧字段用例被删而
    未转真实 canonical 输入 → 以删除换绿（AC-11 禁止）。
  - 返工项：无。非阻断备注：build 期应有 adapter 层「无 reload 能力宿主」的显式回归
    （preview 走显式无现场提交而非静默丢失/行为漂移）；scene-switch-transaction.test.ts:60-135
    旧字段用例须转真实 canonical 输入而非删除（卡面锚点已列，终审时逐条核）。**本签字不替代
    用户的 GLM 缺签豁免裁决；本席同时承担代班的覆盖/文档矩阵审查职责（额度代班记录已列）**。
- GLM：unavailable（用户说明额度耗尽）；无签字，不代填agree/accept。
- 独立反证审查：Kimi已完成，直接证据/复跑和七条可证伪观察见其原文签字（5bc62a21）。
- 缺签豁免：**用户已批准（2026-09-14：“glm可以豁免，kimi签了”）**；本卡由Codex+Kimi代班GLM，恢复后补审，不代填GLM签字。
- build准入结论：build allowed（Codex/Kimi有效r1签字+用户本卡缺签豁免齐备，未变更前提/方案）。

### 进入done前

- Codex：accept（2026-09-15，实现者自验证）；三缺陷正式回归、8项单点反控及Reforge/Editor正常对照、七包check 7036项、官方ratchet与受保护基线下单次严格fast 6548项均通过；详见验证记录，视觉按WA-E1～3集中延期，未冒称已执行。
- Kimi：pending，需独立实现审查及覆盖矩阵复核。
- GLM：unavailable；是否在恢复后补审按下面额度记录，不虚造第三席签名。
- 缺签豁免：用户已批准本卡GLM席位豁免（承接本卡整体代班提议，适用build/done）；Codex/Kimi终审与用户验收仍未完成，不据此提前标done。
- done准入结论：blocked。

## 额度 / 代班记录

- 缺席：GLM，用户明确额度耗尽。代班建议：Codex负责实现/测试和对账，Kimi独立负责前提、设计、实现及测试矩阵审查。
- 范围：仅本卡，不形成后续任务一揽子缺签授权；无视觉转派。
- 风险：少一个独立覆盖席位；既有GLM诊断贡献不能替代本卡终审。缓解：Kimi逐AC复算关键反控、核主壳真实入口，Codex提供可重建证据。
- 补审：默认GLM额度恢复后补审本卡；若用户另行免补审，再登记。不要求已耗尽账号现在补签。
- 用户裁决：2026-09-14明确批准GLM豁免；仅本卡，Codex实现/自测、Kimi独立审查并覆盖矩阵，恢复后补审的原安排保留。

## Build / Review / 用户验收

Codex实现与自验证已完成，Kimi实现终审和用户验收未完成，未标done。
实现与证据入口：[验证记录](../../testing/world-async-commit.md)。实现候选：`e13216e7a4439008df38666cbcfec557c8e5a26c`，对比`5bc62a2135ce7145087d73d39a8bba54d7c0c406`；后续SHA回填仅改文档，产品/测试/基线与候选一致。

- 产品7文件：reforge的script-project-core/script-host-adapter/script-runner/main/runtime-project-view/scene-switch-transaction，以及editor playback；未改content/codec/迁移/生成资产/第一阶段/锁文件。
- 正式回归新增55项：世界提交35、主壳预检10、依赖矩阵9、编辑器真实预览1；现有adapter/移动控制/读档chain仅按实际接口及定义读取调整，未删除既有测试身份。
- 地图握手的canonical写入仅在runtime host，主壳准备完成后调用控制并同步安装现场；无现行调用方的直接写回旁路已删除，缺控制在IO前拒绝。
- 验证：最终定向6文件101项、Playback 12项；完整check七包7036项、文档工具20与coverage-tools17；ratchet+单次严格fast 6548项，617生产文件、零scope removals、零覆盖率回退。
- 旧版本兼容审查：pass；只替换本调用域死投影依赖，未新增升级器/旧字段fallback；独立投影Runner的现有宿主合同保留，但不作为main无控制旁路的理由。
- GLM材料贡献继续披露；所有最终测试/反控与集成为Codex工作，不是GLM独立验收。功能观感与保存重开集中R4/Q1待验，未做浏览器视觉验收。
用户无需为设计核代码；后续技术验收由Agent执行，剧情观感按上面集中E2E安排。

## 交接日志

- 2026-09-15 Codex：实现候选提交`e13216e7a4439008df38666cbcfec557c8e5a26c`，随后仅回填SHA与终审交接；工作树产品/测试/基线不再变动，交Kimi独立终审，GLM豁免、不重签r1、不标done。
- 2026-09-15 Codex：完成r1三段实现、55项新回归及8项单点反控。首轮ratchet发现editor新增分支未覆盖（19082/27547低于19081/27545），补真实playCanonical接线回归与反控后通过；不是抖动，不降基线。
  自查删除main多余直接写回旁路后重跑最终check/ratchet/受保护基线strict-fast，全部exit0；精确命令/计数/失败记录见验证附件。推进review，待Kimi实现终审，不代签/不done。
- 2026-09-14 Codex：核对5bc62a21 Kimi签字与干净main，登记用户GLM缺签豁免，统一判定build allowed；仅本卡代班，不代签。开始先红后绿的正式回归与三段修复。
- 2026-09-14 Kimi：完成 r1 独立前提/设计审查，签 premise verified + design agree，无返工项。
  直读 B-05 写序（script-project-core.ts:199-204 抢先写 vs main.ts:3559-3585 尾块同步提交）、
  B-08 死字段签名（runtime-project-view.ts:213-229 vs scene-switch-transaction.ts:53-54，
  真实消费 baseSceneView 的 hook 选择/实体页）、B-09 四叶 await 后直写（script-project-core.ts:206-249）、
  move 端点既有握手（:151-178）与 lifecycle 提交后投影边界、replaceWorld 对象身份保留（main.ts:708-725）、
  editor playback.ts:331-358 宿主合同。本人复跑最小定向：A01 contract exit 0；A02（new-map 残留）/
  A05（旧计划未拒）/A09（abort 后残留 'before'）/A03 业务红 exit 1，无环境失败。
  七条可证伪观察与两条非阻断备注（adapter 层无 reload 宿主回归、旧字段用例转真实输入）写入本席；
  覆盖/文档矩阵代班审查已并入本席签字。未改产品/他席/共享准入/Status，不代填 GLM 席位。
  Next：用户裁决本卡 GLM 缺签豁免；获准且 Codex 核门禁后才可 build。
- 2026-09-14 Codex：承接af3c3400诊断包，核干净main与远端同步；复读现行规则/原审计/真实调用，确认三个入口共用提交一致性问题。
  新建本卡r1与前提矩阵/AC-01～12；最小定向5次复跑符合基线（1绿4业务红），产品零改动。下一步Kimi设计审查与用户本卡缺签安排裁决。
- 2026-09-14 Codex：文档门exit0（420 Markdown / 2042 local links / 143 tasks），文档工具20/20，diff检查通过；任务索引内容与官方生成器相符。
  自加的字节严格比较曾因历史索引末尾少一个空行失败，复算确认仅EOF空白差异，按官方门相同的trimEnd合同核过；未改旧卡或关闭文档检查。
  本轮只提交本卡/看板/索引/审计入口，不运行或宣称新产品check/coverage结果。

## 下一位Agent提示词

```text
在 /Users/zhangxu/illegal/type-pal 终审 WORLD-ASYNC-COMMIT-1，卡 docs/ops/tasks/WORLD-ASYNC-COMMIT-1-world-async-commit.md，状态review，实现候选e13216e7a4439008df38666cbcfec557c8e5a26c，对比5bc62a21。r1设计不重签；用户已豁免本卡GLM，恢复后补审安排保留。
先同步main、检查工作树，读AGENTS/CLAUDE/phase2 READ-FIRST、本卡AC-01～12、docs/testing/world-async-commit.md。独立核core→真实main路由→adapter→reloadMap提交控制、失败/取消零抢写、提交后通知、editor无reload宿主；main无第二writer，投影Runner现有合同不误删。
核首次await前的冻结输入/candidate script、目标hook/cursor/page依赖与无关变化正控；核四叶signal/来源会话检查，不误拒跨scene，不破坏move/lifecycle后提交语义。
独立复跑定向及node docs/testing/world-async-commit-mutants.mjs（8反控红、2正常对照绿）；核check 7036、ratchet及单次受保护strict-fast 6548/617、55新增测试身份和零scope移除的原始证据。旧批二probe冻结历史API，不代替新正式回归。GLM只贡献原材料，不代填其席位；WA-E1～3视觉/磁盘重开延期集中E2E，不重复跑浏览器。
在你的实现审查席位写accept或带file:line的counter，明确旧版本兼容审查及剩余风险；只更新自己的审查块/交接日志，提交推送。不改产品/他席/状态，不标done，交Codex统一收口。
```
