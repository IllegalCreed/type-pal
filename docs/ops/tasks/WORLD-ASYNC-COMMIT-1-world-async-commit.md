# WORLD-ASYNC-COMMIT-1 - 世界异步操作提交一致性

Status: draft
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
本轮只开卡、核前提和准备设计审查，**未进入build、未改产品/测试/基线**。

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
产品行为无需另选新方案；正式卡GLM缺签安排仍待用户明确确认，见下。

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
- Kimi：premise pending；design pending。须独立读一手文件、核反证，再评价方案，并承担代班的覆盖/文档矩阵审查。
- GLM：unavailable（用户说明额度耗尽）；无签字，不代填agree/accept。
- 独立反证审查：pending Kimi，必须附自己的源锚点与可证伪回答。
- 缺签豁免：**pending用户明确批准本卡由Codex+Kimi代班GLM**。上一轮“你来做吧”已授权取证接手，不当作此新高风险卡自动豁免。
- build准入结论：blocked（任务仍draft；待Kimi有效设计签字+本卡缺签安排批准）。

### 进入done前

- Codex：pending。
- Kimi：pending，需独立实现审查及覆盖矩阵复核。
- GLM：unavailable；是否在恢复后补审按下面额度记录，不虚造第三席签名。
- 缺签豁免：待用户裁决是否同时适用本卡build/done，未批准不得以两席直接标done。
- done准入结论：blocked。

## 额度 / 代班记录

- 缺席：GLM，用户明确额度耗尽。代班建议：Codex负责实现/测试和对账，Kimi独立负责前提、设计、实现及测试矩阵审查。
- 范围：仅本卡，不形成后续任务一揽子缺签授权；无视觉转派。
- 风险：少一个独立覆盖席位；既有GLM诊断贡献不能替代本卡终审。缓解：Kimi逐AC复算关键反控、核主壳真实入口，Codex提供可重建证据。
- 补审：默认GLM额度恢复后补审本卡；若用户另行免补审，再登记。不要求已耗尽账号现在补签。
- 用户裁决：pending（本轮“继续吧”授权准备此修复卡，未明确豁免新卡签名）。

## Build / Review / 用户验收

尚未开始实现，没有新增产品测试、质量门或视觉通过记录。主审Kimi待设计审查；未标done。
用户无需为设计核代码；后续技术验收由Agent执行，剧情观感按上面集中E2E安排。

## 交接日志

- 2026-09-14 Codex：承接af3c3400诊断包，核干净main与远端同步；复读现行规则/原审计/真实调用，确认三个入口共用提交一致性问题。
  新建本卡r1与前提矩阵/AC-01～12；最小定向5次复跑符合基线（1绿4业务红），产品零改动。下一步Kimi设计审查与用户本卡缺签安排裁决。
- 2026-09-14 Codex：文档门exit0（420 Markdown / 2042 local links / 143 tasks），文档工具20/20，diff检查通过；任务索引内容与官方生成器相符。
  自加的字节严格比较曾因历史索引末尾少一个空行失败，复算确认仅EOF空白差异，按官方门相同的trimEnd合同核过；未改旧卡或关闭文档检查。
  本轮只提交本卡/看板/索引/审计入口，不运行或宣称新产品check/coverage结果。

## 下一位Agent提示词

```text
在 /Users/zhangxu/illegal/type-pal 审查 WORLD-ASYNC-COMMIT-1 的r1设计，任务卡 docs/ops/tasks/WORLD-ASYNC-COMMIT-1-world-async-commit.md，状态draft，设计产品基线af3c3400（packages同70e3f627）。
先同步main，读AGENTS/CLAUDE/phase2 READ-FIRST、本卡真值矩阵、world-lifecycle的B-05/08/09、批二最终回执与A组真实入口；不要重跑72项或重开D-01。
你是Kimi独立审查方。GLM额度耗尽，本卡缺签豁免待用户确认；请独立核一手前提并压力测试D1提交握手/通知顺序、D2冻结canonical输入与目标页/cursor签名、D3四叶await后取消。重点防提交后取消回滚、仅比world引用、误拒合法跨scene目标、编辑器宿主漏适配、整world签名误伤，以及遗漏实际主壳接线的伪回归。
给出带file:line和可证伪观察的premise verified/counter、design agree/counter；按AC-01～12核覆盖与旧版本残留，不代填GLM席位。只修改本卡你的签字/审查块和交接日志，提交推送；不改产品、不改任务状态、不开始build、不标done。设计签字不替代用户的缺签裁决。下一步交Codex统一判断准入。
```
