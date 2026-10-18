---
testingSchema: 2
id: e2e-common-issues
evidence: e2e/evidence/e2e-common-issues.json
---

<!-- testing-meta
{"schemaVersion":2,"id":"e2e-common-issues","sourceRefs":[{"path":"scripts/e2e/errand-contract.mjs","lines":"346-376","anchor":"export function assertErrandBackground(","role":"oracle","sha256":"8816f6e279e0b8d16fe37ba37190303a8c9ba629debfd436e1fd5dd42bf11be0"},{"path":"scripts/e2e/kitchen-contract.mjs","lines":"497-518","anchor":"export function assertKitchenTrace(","role":"oracle","sha256":"7286db31cd810f8c0ae982bb51bba1453eb52f98367fdab834c2d922d1587634"},{"path":"scripts/e2e/render-evidence-observer.test.mjs","lines":"323-398","anchor":"test('per-frame clocks do not consume state-change budgets and remain bounded'","role":"oracle","sha256":"46b89cb0ea998e979d63bfe9d5dbc6fdb4739c3041c0068d67bb282136f032e1"},{"path":"scripts/e2e/npc-transition-contract.mjs","lines":"262-338","anchor":"export function renderedPoseEvidence(","role":"render span consumer","sha256":"f3e27c26baa9cf9712718dbe54647c86cc5981ef7d3613c11f9202f3ed6cdbeb"},{"path":"scripts/e2e/opening-trace-plugin.mjs","lines":"164-178","anchor":"count('worldDrawCompleted')","role":"render collector insertion","sha256":"f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"},{"path":"scripts/e2e/opening-trace.test.mjs","lines":"515-630","anchor":"test('real Game world pass records every selected resource once after all entries; a later failed draw publishes nothing'","role":"real transformed caller oracle","sha256":"1968bcb8b8c1bfd45ea4928242b719a04635f84ab9ec4d4728cb7f8888abeb7a"}],"publicCallers":["pnpm e2e:002:both","pnpm e2e:003:both","pnpm e2e:004:both","pnpm e2e:005:both"],"legalInputs":["each stage's current same-engine predecessor","normal input/navigation","isolated browser storage"],"businessOracle":{"type":"issue-family-closure","assertions":["公共根因按族收敛","路线/演出/存档失败分开归因","源码核读不计作实跑"]},"dedupe":{"result":"reviewed","against":["e2e/stages/001-opening/report.md","e2e/stages/002-inn-guests-and-reward/report.md","e2e/stages/003-kitchen/report.md","e2e/stages/004-meal/report.md","e2e/stages/005-shrimp/report.md"],"notes":"只汇总问题族，不复制各阶段通过数字。"},"revision":{"currentSha":"d02278dc0154dd73b5db24388a35c30bb096cc81","contentVersion":22,"minimumSaveVersion":11,"history":[{"revision":"d02278dc0154dd73b5db24388a35c30bb096cc81","date":"2026-10-04","action":"source-and-publication-audit","notRun":["runtime","E2E","coverage"]}]},"evidence":"e2e/evidence/e2e-common-issues.json"}
-->

# 001–005 共性问题族

Status: current
Owner: Codex（横向问题归因与文档维护；原执行身份按各批回执）
Last reviewed: 2026-10-18
Template: test-domain-report-v1 / 1.1.0

## Domain scope

本页是 `e2e-common-issues` 的跨阶段问题归因与证据入口。覆盖 001–005 的作者编排、路线、演出、控制权、存档和工具边界；`current` 是 [catalog](../../catalog.json) 的发布状态，登记依赖恰为 `e2e-001` 至 `e2e-005`。原材料包含 006 与后期剧情线索，它们保留为历史交叉参照，不增加本页依赖，也不为仍 `rework` 的 006 授信。

[横向索引](README.md)负责导航，[E2E 总览](../README.md)路由阶段；各正式报告持有指定候选的结果、输入和检查点。 [配对 evidence](../evidence/e2e-common-issues.json) 是 `document-audit`，`runtimeExecution.performed=false`、`artifacts=[]`，其 `source-backed` 不代表本轮执行。catalog 管发布状态、日期和依赖，原任务卡管 Owner、准入及 counter，本页管跨阶段归因与缺口，四者不能互相代授信用。

当前工作从 [R4 原卡](../../../ops/tasks/E2E-R4-1-route-and-checkpoint-foundation.md)、[005 原卡](../../../ops/tasks/E2E-005-1-shrimp-errand-and-xianglan-news.md)与 [006 原卡](../../../ops/tasks/E2E-006-1-inn-doctor-and-boat-to-island.md)核准入；[连续任务归档](../../../ops/archive/tasks/done/E2E-CONTINUOUS-001-006.md)保存旧批次，不能作今天的 build 授权。演出按[意图优先合同](../contract.md#演出验收标准意图优先差异不等于缺陷用户2026-10-07)判断；第一阶段也是待归因的对照，双轨差异数量不能单独证明二阶段缺陷。

## Claim matrix

### 七类共性问题

以下代表实例与当时修复声明取自固定原文的七家族及后续线索。本次核正文与必要源码范围，未重新跑七家族或证明所有调用域已闭合。每行的业务判据用于决定后续核什么；“历史已修”只保留原时点，不是当前全量通过。

| 问题族 | 代表实例与归因 | 业务判据与下一步 | 停止线 |
|---|---|---|---|
| 连贯动作拆成机械状态 | 大娘下楼曾有46状态，又误按六路段拆六步骤；逐拍调度暴露成作者结构 | 以方案→步骤→指令表达完整激活；核路线、速度、姿态、分支和收尾后，再合并机械指令。转弯不等于下一次激活 | 旧288/642状态只是后期候选，未核完整入口不能断言可无损折叠；165个stateMachine不是165个bug |
| 首次、复读、完成与后继混淆 | 002大娘错选次日行为；005张四缺后续段、香兰返程变空 | 核真实NPC下一次激活的入口、target、channel、cursor和副作用；奖励只一次，后续对话与返程不丢 | 后继地址“存在”或错误绑定可保存不等于剧情正确。旧443空终止/27套分次不是本轮重新统计 |
| 正文归属与调用不清 | 厨房大娘、赠桂花酒和香兰报信的入口曾藏在auto或场景入场中 | 主链落回明确NPC入口并显式调用/等待；后台巡走、返程单独保留 | 选择方案不等于立即执行；不全禁auto，也不把所有select都改成run |
| 隐式调度依赖 | 三苗人边谈边走、大娘转向被auto抢写、选道士方案后期待隐式触发 | 核实际参与者的take/run/release、owner、sceneVisit、动作完成和正确恢复；无关环境继续 | 用户已选择暂停时站立；漏接管与多余冻结均要拒绝，不能恢复全局对白冻结 |
| 时间与移动尺度不准 | 楼梯40ms、目标末拍补齐、香兰480ms估时；不同指令被当成同一时基 | 区分作者等待、真实动作完成、输入和渲染时钟，按原指令及当前意图归因；精确验端点、姿态和必要节拍 | 不统一乘2.5；goto.frameDelay是循环上限的旧线索，未核源不能当毫秒。已批局部匀速不外推 |
| 瞬态呈现误作持久状态 | 门页、端菜外观跨存档丢失；live pose和动作续演不能只由canonical静态值重建 | 正式保存→新实例恢复、场景重入和当前页面连续现场分别核；检查动作/等待/已提交未ack的续接 | 源hash、终态或截图不证明完整恢复；不把所有短暂表情都持久化，也不为旧开发档恢复兼容 |
| 名称与作者界面不可理解 | 自动行为6、intro/cycle、e59和单步骤摘要不能直接表达人物用途 | 保稳定ID，按可靠人物/用途映射核真实方案与步骤；复杂语义先读正文，编辑器预览另留现场证据 | 通用显示旧修复不等于语义命名全量完成；未核后期剧情不批量猜名 |

旧文中的294场景、4662方案、165结构、573池和111次首次install各有不同统计对象；注册缓存还曾遗漏调用类别。它们不能成为今天完整安装边或已闭合缺陷的分母。`s021/e406`、`s273/e4723`、洪大夫L2018、老王L3383、灵儿L5076及相关等待只保留为待核线索；本次未取得这些后期原始入口，不据此改作者内容或报新E2E反例。

### D/R/T 历史索引与责任

下列24个ID来自本页原覆盖表，是定位索引，不能相加为24个已修bug。D为具体作者编排，R为本表的公共保存/重入项，T为输入、采集、比较及执行器；归档合理性表另有R01–R16等编号，引用时必须连同来源说明，不能合并两套ID。

| ID / 入口 | 要核的具体问题 | 证据路由与边界 |
|---|---|---|
| D01 / 001叫醒、密道 | 探索拍等待、无对白clear呈现与动作完成 | 回[001报告](../stages/001-opening/report.md)核当次raw及因果；旧35等待/21对白/30步不作本轮重计 |
| D02 / 002走廊接待 | 入口面向主角、开门同步属性及呈现拍 | 回[002报告](../stages/002-inn-guests-and-reward/report.md)核真实caller；三苗人接管与大娘继续去厨房分开 |
| D03 / 001–003大娘末半格 | 原目标补齐与获批匀速分拍 | 核具体路线段、精确端点和完整隐藏闭区间；不能豁免其它leg或全部render |
| D04 / 003厨房大娘 | 不同接近方向下的转身及对白后工作姿态 | 回[003报告](../stages/003-kitchen/report.md)核实际入口；不加入全局隐式转向副作用 |
| D05 / 004端菜随从 | nudge/animate的世界节拍、完整返程与中断 | 回[004报告](../stages/004-meal/report.md)核完整动作窗口；只见六/七步前缀不等于八步终点 |
| D06 / 004赠酒 | 选择方案与立即执行NPC正文不同 | 正常菜单剧情与items取消/错目标专项分开，核真实target及run等待，不改普通输入 |
| D07 / 005船家转身 | 张四、水生叔、鱼嫂的不同实体和入口 | 回[005报告](../stages/005-shrimp/report.md)核确切trigger/target；某处有face指令不足 |
| D08 / 005香兰报信 | 估时、entry/auto抢写与姐妹各自路线 | 核真实动作完成及各人的首次差异；香兰、秀兰不合称随从，也不因公共修复绿而一起关闭 |
| D09 / 006苗人头领 | 正文停点与auto终点混淆、显式接管 | 回[006报告](../stages/006-doctor-boat/report.md)与历史primary；旧坐标声明不成为本次新核原值 |
| D10 / 006求医、码头 | 小虎子错误激活、洪大夫后继与张四显隐 | 核后继实际可触发及精确状态条件，不只核方案存在；006仍rework |
| D11 / 006乘船 | 船体terminal、乘员偏移、slow与ride节拍 | 需实际completion、同run/visit own pose及原指令。本次缺1513/1516/1517原数据，不新认证原版朝向/offset |
| D12 / 006岛口 | 首句即停与真实对白结束、控制返回不同 | 四行1886/1888/1889/1890仅保留旧核验要求；实际收尾、存档与旧95项须回原回执，不算新执行 |
| R01 / 保存、重入 | live pose、gait、动作等待及已commit未ack的续演 | 核本引擎正式保存/新实例恢复和返场；不以capture→resume自洽替代真实caller，也不修当前连续现场来冒充恢复 |
| T01 / 输入、scope | 普通菜单键被过滤、长按半组或缺route输入 | 核完整ledger与真实down/up成功回执；不能按Escape等键值删正常输入 |
| T02 / 004尾探针 | 无必要control-move污染005起点 | 核独立结束与下段开始一致；不能裁scope来保留实际副作用 |
| T03 / 移动观察 | 轮询漏commit、转向误当位移、末sample误当终点 | 核commit/finished各自职责和完整路线；不取整、加坐标容差或逐格点按 |
| T04 / 006对白输入 | Game未消费就多次Enter、重放多余键超时 | 核真实消费与下一页边界；不加工旧raw删键冒充重录 |
| T05 / 生命周期 | 初始化/恢复中间态混入正文、同visit被拆两次 | 核materialized/ready、storyScope完整初值；不能借另一visit证明，也不把恢复前变化判为正文缺陷 |
| T06 / 实际帧证据 | selected缓存误作drawn、组内frame与显示frame混比 | 核成功world pass、资源身份及完整clock；source读取或测试stub不证明像素 |
| T07 / 局部对齐 | leg不齐漏全姿态、获批末步被错误按数组对齐 | 核完整共享窗口与具体差异证书；不压帧集合、跳过全部render或按NPC名单豁免 |
| T08 / 基础设施 | Chrome newContext/RPC超时、父中断IPC关闭 | 保失败阶段、exit/signal与监督清理证据；R4待办不计剧情bug或正常流程通过 |
| T09 / 持帧时钟 | Game frameNum与RF worldTick不是同一时钟 | 分开作者等待、打字、确认与实际draw时长；未知标evidence-gap，不加毫秒容差或用总时长抵消漏等待 |
| T10 / 静止帧、首显 | 等待/转向/门状态漏帧，接管顺序与对白动作边界漏核 | 核实际wait/dialog/move、take顺序、成功draw及动作前clear；根脚本结束不能替代段内消失 |
| T11 / 源帧、剔除 | actor最新值或观测bbox自证正确，掩盖错帧/错误消失 | 核原始位置、资源、geometry及独立视口；假bbox、漏末draw不能自洽放行 |

### 六个 sourceRefs 的实际范围

本次核六个全文件SHA及范围内anchor均匹配原metadata；语义信用限于实际读取范围，不能据hash授整文件深审或七家族全部通过。

| 来源 / 实际范围 | 可支持的具体结论 | 不能支持的结论 |
|---|---|---|
| [errand-contract](../../../../scripts/e2e/errand-contract.mjs) 346–376 | `assertErrandBackground`核一次真实restore后的e83/s004位置commit、前台控制及continuation起终点存在实际移动记录 | 不覆盖所有NPC、完整区间连续性、原版路线或全部存档语义 |
| [kitchen-contract](../../../../scripts/e2e/kitchen-contract.mjs) 497–518 | `assertKitchenTrace`入口拒overflow/errors，要求worldRenders/causes并开始各列表seq检查 | 该22行未显示完整函数，不能单凭它声明全global-order/全部厨房合同已验 |
| [observer测试源码](../../../../scripts/e2e/render-evidence-observer.test.mjs) 323–398 | 五collector的17,000世界绘制样本与状态变化预算分开；Opening另测60,000及overflow | 本轮未执行测试；count、字节限、快照池、actor列表上限不是同一容量轴 |
| [renderedPoseEvidence](../../../../scripts/e2e/npc-transition-contract.mjs) 262–338（另读投影208–260） | 有throughRenderId的span须完整连续、同scene/visit且端点时钟一致，展开后才按renderScope裁剪 | 无span分支只返回pose及order/atMs/tick/renderId，可保null来源，**不调用screenProjection**；只有span逐clock调用屏幕几何投影，且可回null screenVisible/screenRect。该函数不独立认证全采集链或像素 |
| [opening-trace-plugin](../../../../scripts/e2e/opening-trace-plugin.mjs) 164–178（必要上下文140–190） | Game world完成hook在entries循环闭合后发布，不能在循环中提前声称完成 | 一个插入点不能证明全部采集链正确，也不给旧raw补发信用 |
| [opening-trace测试源码](../../../../scripts/e2e/opening-trace.test.mjs) 515–633 | 真实函数transform后的测试以drawSprite stub记资源；第二draw抛错不发布新pass | 本轮未跑该测试、未画Canvas像素，不授浏览器、全帧、视觉等价 |

## Inputs and fixtures

本页由人/Agent阅读，不是runtime wrapper的剧情输入。公开 [package脚本](../../../../package.json)进入以下真实caller；源码显示它们启动各自子流程后读报告并调用`assertRecordedStoryParity`，本轮未运行它们。

| 公开入口 / caller | 正常输入与专项边界 |
|---|---|
| `pnpm e2e:002:both` / [inn-both](../../../../scripts/e2e/inn-both.mjs) | 分别启动game/reforge；[inn-contract](../../../../scripts/e2e/inn-contract.mjs)37–118要求真实passed001报告及001.end.save.json，同轨身份、字节SHA和规定状态；capture不能作verify前驱 |
| `pnpm e2e:003:both` / [kitchen-both](../../../../scripts/e2e/kitchen-both.mjs) | 两轨各用真实002报告/002.end.save.json；[kitchen-contract](../../../../scripts/e2e/kitchen-contract.mjs)90–218还核core/route/choreography、实际end/restore和Canvas。非任意JSON或40hex即可准入 |
| `pnpm e2e:004:both` / [meal-both](../../../../scripts/e2e/meal-both.mjs) | 按story/items/saves分别跑两轨六case；[meal-contract](../../../../scripts/e2e/meal-contract.mjs)39–93/413–490区分正常剧情、取消/不可用物品与保存专项，核真实003前驱/源码冻结/end与restore |
| `pnpm e2e:005:both` / [errand-both](../../../../scripts/e2e/errand-both.mjs) | 按story/guards/saves分别跑两轨；[errand-contract](../../../../scripts/e2e/errand-contract.mjs)405–449只收同引擎004 saves，拒story/items及capture，并核checkpoint字节与实际保存world |

正常导航/菜单输入、同引擎合格前驱和隔离浏览器存储沿原合同；story、items/guards/saves与capture各有职责，不能混作一个passed。上表为已读reader/validator及wrapper职责，不代替其中调用的所有传递helper、当前真实checkpoint或完整runner验收。源码hash相等不证明合法输入确已执行。

顶部metadata、catalog与配对JSON仍精确记录 `d02278dc0154dd73b5db24388a35c30bb096cc81`、content22/minimumSave11及2026-10-04文档审计。当前[版本常量](../../../../packages/content/src/character.ts)168–170为content22/minimumSave12，只是本轮源码核读；Game的保存format与RF envelope另属各自合同。本次不修改机器历史、lastVerified、reviewBy或依赖，也不把旧SAVE11报告续成SAVE12实跑。

[编辑器预览准则](../contract.md#每段核对编辑器预览初始状态用户2026-10-12)另需真实入口前态、相关NPC、正确方案/场景默认、步骤关联及保存重开回执。旧runner passed不能追认为预览通过。本次未开编辑器、未造游戏/E2E fixture或正式存档；文档consumer反例只在临时文档副本上验证。

## Results and gaps

### 各日期声明的有效范围

| 时点 / 来源 | 保留什么 | 今天不能据此宣布什么 |
|---|---|---|
| 2026-10-04 / d022、content22/SAVE11 | 文档发布/source审计，配对performed=false | 不构成新游戏执行或当前版本续期 |
| 2026-10-06至07 / 原正文诊断 | 实际draw、时钟、story窗口、恢复边界和有界阶段修复的当时声明；曾有未决数变化 | 减少初始化/帧索引误报不等于修掉同数量产品bug，独立流程passed不等帧差异全闭合 |
| 2026-10-08至09 / 连续任务各批 | 工具补强、partial/冻结与逐批重录各自时点；纯oracle变更可依影响证据离线重比 | 较早“冻结”或局部工具绿不能压过后续新counter，也不能用旧日志缺字段证明新义务 |
| 2026-10-10 / [合理性复核](../../../ops/archive/tasks/done/E2E-CONTINUOUS-001-006.md#全量改动范围与合理性审计2026-10-10当前) | 撤回只为复制旧引擎而加的party+4、无entry补600ms、e203对白冻结等候选；保留暂停站立取舍 | 后文旧“当前party assembly +4”只是更早诊断，不能复活为今日修复；合理差异仍须有具体证据 |
| 2026-10-11 / [固定批次accept](../../../ops/archive/tasks/done/E2E-CONTINUOUS-001-006.md#2026-10-11-最终重录与headed验收accept) | 当时六份acceptance、headed、对白动作前clear及其失败/重跑记录；原回执保留RF浏览器404/Canvas消息 | 归档中的“当前”只属该候选，不覆盖今天catalog的006 rework或R4未完；浏览器消息不改写为零 |

当前明确保留：用户选择接管期间站立；已批准001/003大娘局部匀速末步，不改精确端点和必需姿态。party screenOffsetY4、无entry额外补旧600ms、s014/e203全局式冻结、e84/e127初始朝向及e87初始手势候选按归档裁定撤回。本次没有重验其产品实现，也不把第一阶段相同值当作二阶段唯一合理答案。

### 缺证、重开与退出条件

本轮仅检查八条历史build路径是否存在：三条实际draw/story-scope/scene-lifecycle收据，以及最终tape、headed父回执、两侧continuous-report和文件验证索引，在本隔离checkout均缺失；没有打开、hash、补造或从主树搬回raw。原`data/extracted/events/all.json`也不可用。缺失仅描述本checkout，不能推断历史从未执行或全仓不存在证据。

原producer、raw保留Owner、完整帧/时钟、后期原指令和各问题今天是否仍复现均未在本次确认。后续收口须回原任务补指定候选、输入、完整raw身份和可证伪检查；本篇的source-backed不能填补这些unknown。历史路径、数值、失败和撤回项在下方原文完整保留，不恢复R60的旧深审/直接inverse声明。

重开时先记录人物中文称呼+稳定ID/场景/通道/入口、现象、候选与版本、真实输入和raw、最强替代解释、根因层及反控：作者编排回对应stage，保存/调度/呈现回公共runtime，导航/采集/比较/监督各回自身工具。先证明同根再收敛；同一公共修复的文件数不计成多个bug。维护权须按当前作者真源判断，不以“迁移问题”重跑已退役转换器覆盖人工001–005。

本页排重于各stage报告：不复制通过数字，不从其它文档的迁移接受外推本篇。可用性判据是读者能把e83恢复后位移回background oracle、把span/容量缺证回采集比较层、把后期L2018/3383/5076留待核；若只能凭标题/current/hash或旧0 findings判断“都好了”，本篇仍须返工。证据冲突、前驱/版本不合、旧counter未闭合、Owner不明或缺必要raw时停止受影响项，保持needs-review/rework/blocked，不用静态绿补证。

### 历史导航 counter 与当前状态

固定作者候选`1c23ddde3529e81c9d95240fb6de4e0ae42531d4`逐条检查时，原quote中两条标题fragment因目标标题历史化而失效，当时两项导航counter为rework。原断链发现、两次作者失败回执与下方旧slug→实际历史heading映射均保留；不能用后来的修复回写成当时已通过。

| 原fragment（历史字节保留） | 已核实际标题与当前替代入口 |
|---|---|
| `2026-10-08-当前推进语义适配与统一关系仍非完整双轨证明` | [2026-10-08 前批冻结：语义适配与统一关系（仍非完整双轨证明）](../../../ops/archive/tasks/done/E2E-CONTINUOUS-001-006.md#2026-10-08-前批冻结语义适配与统一关系仍非完整双轨证明) |
| `2026-10-07-当前验收独立流程与双轨比较通过` | [2026-10-07 历史验收：独立流程与双轨比较通过](../stages/001-opening/report.md#2026-10-07-历史验收独立流程与双轨比较通过) |

后续root固定候选`752708a42db05a9901d0f7bcb3478283db5a521c`在两个目标的现行说明层加入稳定兼容锚。非作者`/root/central_successor_independent`的导航回执SHA为`39344a9f7826e316aef9fb0abc12e572f67e103d7892634a59cdebf74127c91b`：实际组合固定`1c23ddde`正文（SHA `61bb76dfd5de68fad02337ab95e6451c8f0e0e1d520140d328a48873abfc5747`）与固定`752708a4`目标，核44条链接/11个fragment为0问题；删除单锚各产生1项、删除双锚产生原2项失败，只限定闭合这两项导航counter。

本作者隔离分支没有导入`752708a4`的目标文件；本节同步的是上述已核固定组合，不声称本分支旧目标已修。原quote、旧标题/历史结论及原回执未改。导航闭合不授本篇语义或模板接受、目标新的内容review、runtime/E2E、中央入账、全量门、main或done；此后继正文与最终组合仍须由root另行复核。

## Quality gate

本次将原来的概括封套改为具体问题族、责任、来源范围和重验入口，仍采用既有1.1模板。单篇自验、非作者内容验收与root中央入账分别记录；此页不自行授reviewed、completed或阶段verified。

| 检查 | 接受判据 | 信用边界 |
|---|---|---|
| 正文与配对 | 五章有实际内容；单篇完整模板consumer、真实`validateCanonicalEvidence`核唯一catalog身份/发布字段/sourceRefs；错publication应被拒 | 形状/配对不证明问题全部闭合或runtime |
| 原文保全 | frontmatter/testing-meta与完整quote原字节不变；精确source逆回及损坏反例能区分 | 字节保真不等于语义接受，也不倒改旧回执 |
| 导航 | 新旧每条链接、fragment与catalog实际canonical核验，不能只猜目录或仅核文件存在 | 不代替链接目标全文审查 |
| 独立验收 | 不同Owner核新/原全文、实际来源、历史/unknown、caller/oracle及真实自验原件后作明确结论 | 作者nonAuthor=false；全量任务仍[rework](../../../ops/tasks/DOCS-FULL-TEMPLATE-1.md)，不借本篇合main或done |

本次没有产品、旧产品测试、E2E、视觉或coverage执行。文档/lint/全量门须按实际候选、命令、原始诊断分别记录，任何error/warning/info不算通过；没有执行的门不沿用旧数字。下一步先完成本篇独立验收，再由root核source/after和回执接入中央唯一binding、R60迁出及矩阵；其它待审文档与全量硬验收仍独立排队。

## 历史与原文保全

下方保留固定revision `dc478db11c6b52c4e50a1d1135f8a4740796418c`（与33cc源字节相同）的386行原文，source SHA `6012299438bdebdfb0537ef01689b2445dba14047235e1b84788e2874bbee082`。完整quote为52,736B，SHA `1ac28e2b583447b70baf8cd5455394f0f6a4be04765d3151a327f12220ec8e93`。剥离每行引用前缀后的直接inverse为52,042B，不等于52,041B源；只去结束marker前既有分隔空行产生的恰一个LF后才与固定源相等，不作无条件trim或其它变换。原时点的“当前”、通过/失败、未决、用户裁定和链接保留；上方说明控制今天的适用范围，不追溯改写原结论。
<!-- original-source-quote:start -->
> ---
> testingSchema: 2
> id: e2e-common-issues
> evidence: e2e/evidence/e2e-common-issues.json
> ---
>
> <!-- testing-meta
> {"schemaVersion":2,"id":"e2e-common-issues","sourceRefs":[{"path":"scripts/e2e/errand-contract.mjs","lines":"346-376","anchor":"export function assertErrandBackground(","role":"oracle","sha256":"8816f6e279e0b8d16fe37ba37190303a8c9ba629debfd436e1fd5dd42bf11be0"},{"path":"scripts/e2e/kitchen-contract.mjs","lines":"497-518","anchor":"export function assertKitchenTrace(","role":"oracle","sha256":"7286db31cd810f8c0ae982bb51bba1453eb52f98367fdab834c2d922d1587634"},{"path":"scripts/e2e/render-evidence-observer.test.mjs","lines":"323-398","anchor":"test('per-frame clocks do not consume state-change budgets and remain bounded'","role":"oracle","sha256":"46b89cb0ea998e979d63bfe9d5dbc6fdb4739c3041c0068d67bb282136f032e1"},{"path":"scripts/e2e/npc-transition-contract.mjs","lines":"262-338","anchor":"export function renderedPoseEvidence(","role":"render span consumer","sha256":"f3e27c26baa9cf9712718dbe54647c86cc5981ef7d3613c11f9202f3ed6cdbeb"},{"path":"scripts/e2e/opening-trace-plugin.mjs","lines":"164-178","anchor":"count('worldDrawCompleted')","role":"render collector insertion","sha256":"f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"},{"path":"scripts/e2e/opening-trace.test.mjs","lines":"515-630","anchor":"test('real Game world pass records every selected resource once after all entries; a later failed draw publishes nothing'","role":"real transformed caller oracle","sha256":"1968bcb8b8c1bfd45ea4928242b719a04635f84ab9ec4d4728cb7f8888abeb7a"}],"publicCallers":["pnpm e2e:002:both","pnpm e2e:003:both","pnpm e2e:004:both","pnpm e2e:005:both"],"legalInputs":["each stage's current same-engine predecessor","normal input/navigation","isolated browser storage"],"businessOracle":{"type":"issue-family-closure","assertions":["公共根因按族收敛","路线/演出/存档失败分开归因","源码核读不计作实跑"]},"dedupe":{"result":"reviewed","against":["e2e/stages/001-opening/report.md","e2e/stages/002-inn-guests-and-reward/report.md","e2e/stages/003-kitchen/report.md","e2e/stages/004-meal/report.md","e2e/stages/005-shrimp/report.md"],"notes":"只汇总问题族，不复制各阶段通过数字。"},"revision":{"currentSha":"d02278dc0154dd73b5db24388a35c30bb096cc81","contentVersion":22,"minimumSaveVersion":11,"history":[{"revision":"d02278dc0154dd73b5db24388a35c30bb096cc81","date":"2026-10-04","action":"source-and-publication-audit","notRun":["runtime","E2E","coverage"]}]},"evidence":"e2e/evidence/e2e-common-issues.json"}
> -->
>
> 2026-10-10 当前源码核读：render span 消费仍展开真实 world draw 后按 story scope 裁剪；新增 e59 中断路线证书绑定 L1166/L1168、实际 source call/slot/stride、同 visit own pose 和 leader hold，并撤回只核首尾/方向的 sampled route 证书。五项真实 raw 反控已拒绝。续修逐 transition/leg/stride 反控已拒绝；e83 相对摆位与已批准的十二步报信前缀现绑定实际 primary selector、source calls、canonical foreground slot、自身 party/actor 和完整对白。e117 同拍 nudge/animate 有限语言及 mounted draw 因果合同仍在完整反控中；这些诊断不升级历史 E2E 报告，最终重录仍待工具冻结。
>
> 2026-10-09 工具补强源码核读：刷新当前caller/采集/判定锚点与hash；统一容量锚点移至evidence-recorder。只更新文档源码绑定，不改历史revision、版本、执行结论或raw。本轮尚未冻结补录，进度见E2E-CONTINUOUS-001-006任务卡。
>
> 2026-10-08 源码核读更新：核对本页现有 caller、输入、采集和断言锚点后刷新 sourceRefs 哈希；只更新文档源码绑定，不修改历史 revision、版本、实跑结果或原始日志。本轮工具补强尚未冻结，未补录剧情或执行连续演示；当前进度及剩余项以 E2E-CONTINUOUS-001-006 任务卡顶部为准。
>
> # 001 至 006 共性问题与差异台账
>
> 2026-10-11 当前用户反例已推进到段内消失验收：002最后大娘对白确认后仍被实际绘制152次，
> 期间苗人头领已移动。完整槽记录已捕获它，旧门只核现有clear/lifecycle，未核作者漏掉的动作边界。
> 当前补显式动作/剧情auto启动/释放前clear，并核后续实绘消失；上下对白同段共存保留。
> 真实普通移动触发的native正控通过，删除此clear的反控在首移动draw失败；旧002区间亦被新门拒绝。
> 新固定输入链六份acceptance均passed/findings0/sourceChanges0；新headed双侧code0、preflight
> released、六barrier及24检查点文件已核通过。旧passed不作本次最终验收；实际当前回执见
> [任务卡最终验收](../../../ops/archive/tasks/done/E2E-CONTINUOUS-001-006.md#2026-10-11-最终重录与headed验收accept)。
>
> 2026-10-10 当前为全量合理性复核，冻结已撤回，最终重录/连续演示暂停。范围、逐族判断和未确认
> 候选见[主任务卡全量审计](../../../ops/archive/tasks/done/E2E-CONTINUOUS-001-006.md#全量改动范围与合理性审计2026-10-10当前)。
> 双轨不一致不能单独证明产品bug：NPC暂停时站立为用户明确选择；party+4候选、e203对白冻结、
> 无entry补足旧600ms的额外等待均已撤回。其余保存/控制权/重复commit等按独立失败证据判断，
> e84/e127屏外初始朝向及e87初始手势对齐也已撤回，e88米粒落地待机保留。002比较器已修复
> 有界站立与独立出屏证书的组合；005/006及精确节拍仍待当前验证。下面旧冻结和通过数字保留历史，不作当前准入。
>
> 2026-10-10 续修仍未冻结，历史 raw 只作诊断；当前门禁见主任务卡顶部。
>
> - **确认结束不等于画面清除（2026-10-10用户反例）**：脚本上下对白每条命令结束等待后仍可
>   留显，异槽共存、同槽替换；`clearDialog`、根脚本结束/取消及离场清理才清空。
>   段内转入动作尤其释放实体前也须作者clear，不能只依赖根收尾；2026-10-11新增验收对此单列义务。
>   RF原来的单cue host在确认时close全部，下一次open又重置，绕过了组件已有的slot共存能力。
>   当前修复把槽内cue/头像来源与活动等待分开；narration横卷轴及独立Dialogue保留原有生命周期。
>   记录器在真实成功draw后采集完整槽集，包括Game的dialogBoxKept，并绑定world renderId及各槽
>   原始caller。`dialogue-presentation-contract.mjs`独立核留显、输入归属、同槽替换和完整draw；
>   清除请求另记实际host入口。旧active-only raw没有该域证据，历史passed不授信显隐义务。
> - **caller 转向先于正文**：自动接触或手动交谈入口可在第一条 source command 前改变 actor facing/frame。
>   e35 的 L1026/0x40 是 trigger mode，L1066 的 operand37 指向 e36；不能把相邻 opcode 当成医生的
>   固定 left。作者入口用 live-party facing/frame0，逐次交互须再次核验，不能只检查第一次对白。
> - **默认对白位置也是状态机**：Game 初始与已完成 trigger 的 EndDialog 都复位 top。只有实际
>   end dispatch 后的无 cursor / 无 dialogue 回执可证段落完成；auto end、仍待输入的 end 不能复位。
>   原生 top→bottom→top 页面测试、删 end 与错 page slot 反控均已验证，未改运行时对白呈现。
> - **最后 draw 与实际 terminal 分开**：Game 可在最终 ride commit 同 tick 开始 fade，最后 world
>   draw 留在动作前一步。船的 [126,34.25] sample 不等于实际终点 [126,34]。终点从实际 source
>   retry/下一条 primary command 或 authored slot/leaf/fade continuation 证明，own pose 必须绑定
>   同 run/sceneVisit 的最新 actor，source/authored 目标精确相等。保留完整 draw artifact；自洽改终点
>   且 draws 原样也须拒，不能用容差或只取最后坐标放行。
>
> 2026-10-09 控制流程与演出分开验证：鱼嫂“风浪大、鲜虾无货”的最后对白没有后续指令，
> 旧合同却强制要求next command；修为完整canonical指令链证明后核正常settled/end和首绘时序。
> 不能把“未见next”直接当EOF；缺应执行指令、错run、未成功resolve、早/晚终结都须拒绝。
> 村庄环境自动动画的0x87与概率停顿0x06按原opcode独立解释；概率无样本只能证明合法转移集合，
> 不宣称随机样本真值。结构循环用canonical控制字前缀合同，独立检查词法break/continue、重复次数、
> 分支候选、多层恢复；正常终结、实际取消、窗口仍活着分别出结论，不用指令白名单替代证明。
> 恢复须双向核installed cursor（包括应该恢复却丢了resume）、内容digest、完整有限frame schema；
> 每个结构回执也须核engine和run身份，不能让另一引擎同数字runId的指令补足控制字。
>
> 同批比较器性能：lineage不再每条事件深复制不可变历史occurrence；默认深复制模型仍保留，
> 仅显式共享不变项，失败前状态隔离与原算法全结果对照均证明。hold把同run查询建立保序索引，
> 跨run依赖仍全流；005全2710绘制/55实体停留检查14.681秒，54draw原算法对照全等。
> 性能优化不减少帧、NPC、字段、窗口或失败证据；纯oracle变更复用原件离线重比，不重录输入。
>
> 2026-10-09 容量与路线分开归因：005 saves首次明确记录actor列表16,000条触顶，
> 预算组字节与快照池均未触顶；只提高长段adapter默认计数至200,000，保留字节限及overflow拒绝。
> 真实16,001条commit回归在旧限下失败、新限下完整保留。
> 随后005 guards是另一个真实路线失败：按Down 15秒，逍遥最后提交[95,27]，首次停步时
> 鸡群实体e91为[94.75,28]（超时末态才是[94.75,27.5]）。实际碰撞规划器+原地图复算，
> 保留实体blocked、去实体moved。固定路线改走col100并保持两轨相同长按；原生反控先红后绿。
> 这不是自动寻路，也不证明所有动态相位都不受阻：e84路线横穿新走廊，须以实跑核结果。
> 改变共享输入源必须按真实生产者闭包失效重录，不按“实际未调用那段”豁免。
>
> 2026-10-09 005/006 长日志存储：扩大单流容量不能解决全日志JSON字符串上限。005 RF实际
> secondary错误为`Invalid string length`；首个overflow流因旧诊断不完整仍unknown，不称OOM。
> 在adapter append前按JSON子树无损共享world/poses/lifecycle，保留全部事件，progress保持原delta；
> 紧凑原件先校字节/hash，Node解码后继续原完整合同。真实Game005日志209MB→23MB且逐记录全字段
> 一致；不是裁剪NPC/帧或降低比较粒度。成功和失败存盘都禁止重新展开大对象；轻容量DTO在full导出
> 之前独立落盘。读写两端均验池/物理大小边界。001–004生产者不改，历史失败证据不回写。
>
> 2026-10-09 随从送餐后返程：比较完整有限动作前，必须保证观察窗口确实覆盖完成。
> 19-52批两轨步长和节奏相同，但 Game 立即换房只记到六步，RF 淡出旧房期间继续到八步。
> 不把前缀末点误叫动作终点，也不按 NPC 放行缺失。004 改为真实交接后无输入观察完整八步、
> 步帧、原生终结和最终实际绘制，再执行原离房路线。事件通知不是坐标轮询；仍按精确坐标验收。
> 此用例覆盖完整返程；旧 raw 单独保留“返程中离房”事实，不把新通过扩成中断恢复语义全覆盖。
>
> 2026-10-09 004 多场景长段工具根因与修法（没有改剧情或添加容差）：
>
> - 同场景多次进出：最新状态表可以覆盖，但证明历史不能只留最后一次。每次完成的投影独立保留，
>   绘制姿态按 snapshot/scene/visit/起止 order/实体回执绑定，不能借另一轮进场证明。
> - 第一次访问某个已读档场景时，消费的是 load 安装的缓存 clone，而非原 payload 对象；
>   以实际 clone 身份、loadId 和原输入逐项关联，不接受任意相等对象或后来的捕获。
> - timer settled 后读取 remainingMs=0 是合法查询，不是再次推进；只放行同 owner 的明确 settled/0，
>   重复结束、重启、换 owner、非零余量继续拒绝。
> - Game 自动指令 0x6f：只有所寻址实体的前态等于 signed operand 时，才同步自己的状态。
>   用原生三分支和篡改前态/后态反控建模，不把未知自动指令按“无动作”放行。
> - 帧间隔必须从真实时钟输入正向重建，不能把两个累计 gameplayNow 相减当原 dt。
>   浮点累加不可逆；固定 native 8175.7→冻结8225.8→恢复8242.5 反例中，真实 dt 与累计差不同。
>   仍严格核每帧输入和 now，不加 epsilon，更不引入任何坐标误差。
> - 长段采集容量按完整证据实际大小配置，计数/字节溢出仍失败。执行中的状态、对白、阶段检查
>   只读取各自必要投影，完整 raw 只在确实需要的持久化边界导出。最终完整校验和落盘不能省略。
> - 诊断异常不得覆盖业务/导出 primary error；已关闭页面、刚失败的 export 不重复请求。
>   浏览器关闭没有 crash/exit 原因证据就标 unknown，不凭大日志猜成 OOM 或剧情失败。
>
> 2026-10-09 读档入口补强：002从卧房存档进入走廊，正文正确仍不代表恢复来源完整。
>
> - 文件输入与已验证的恢复输入之间，只允许当前schema明确规定的缺省：省略的技能使用次数、
>   实体生命周期表补空对象；其它字段逐项保留。不能直接要求文件字节形状完全一致，也不能投影掉
>   非空状态。真实current-codec正控，改次数/生命周期/金钱/删字段反控均已验证。
> - 世界缓存载入、动作恢复预备发生在切场景提交之前，不能用“当前可见场景”过滤它们。
>   必须记录目标场景、实际输入/快照身份，再与正式提交关联；普通场景内动作记录域不变。
>   两个原生测试均以未跟踪的bootstrap场景执行真实入口，修前失败、修后通过。
> - 新party移动观察须在既有位置commit之后采快照；插在赋值与commit记录之间会抢先看到位置，
>   造成“未观察移动”假失败。组合插桩测试覆盖真实主角移动分支，不仅分别测试每个插件。
>
> 本轮补充（2026-10-09）：旧“本批冻结”回执仅为当时验证范围，不能代替新增公共逐帧合同。
> 最新进度以任务卡顶部为准。三个应复用的证据原则：
>
> - 自动脚本调用必须从事件帧和探索帧两个真实入口建立 census。只有内层指令日志，无法检出
>   整次调用消失；新增 dispatch/gate→batch→NPC visit→source command→settlement 链。
> - 动画初态不是首张截图。必须由 canonical 定义、真实加载输入、capture/store/projection、
>   自动等待余量、gait/固定帧/显式动画/页动作重建，再逐 draw 核实。帧优先级也属于合同。
> - 主角队列、实体队列、父子调用、资源 IO 是不同真实等待来源。统一停留归因，但分别验证
>   各自身份和寿命；未完成移动不能只检查到最后已见的一步，IO 缺少 end 不能被当成无限 pending。
>
> 修法均在执行/录制/比较工具，不以坐标容差、NPC 白名单或按键过滤放行。原生队列、实际
> 主角移动分支、实际 IO/自动调度调用壳有正控和删证据反控；当前 358 项工具测试通过，
> 不等同于新日志的六段双轨验收通过。
>
> 2026-10-09：执行/录制/比较本批补强已冻结；001新两轨完整验收与6项原始日志反控通过，
> 后续剧情按序核验，最终收据跟随[当前任务卡](../../../ops/archive/tasks/done/E2E-CONTINUOUS-001-006.md)。
>
> - **并发脚本不能固定一种完成次序**：002李大娘接客与离开柜台并发，两轨新日志都允许
>   “先结束接客并保存续点，后离开完成再换交互”。比较器按实际改写提交与安全点的因果顺序
>   唯一决定continue/stop，同时核作者续点和清除旧cursor；禁止把两个结果都无条件放行。
>   若提交窗口交错而日志缺精确证据，则unknown。奖励旁白自动关也须按实际update/render
>   与完整页面验收，不能硬要一个不存在的结束按键。当前只证明成功显示帧跨1400ms期限，
>   未录DialogBox.render的nowMs；world draw到dialog render之间恰逢deadline的边界为unknown，
>   不加毫秒容差、不误报为产品早关。
> - **奖励窗缺自动关闭**：002李大娘接客/苗人赏银后的“得到５００文钱”，Game14拍无输入自关，
>   RF作者cue没有autoAdvance而等Enter，造成10/11次正文确认。修当前作者cue为1400ms；
>   canonical cue→真实DialogBox先红后绿，1399ms仍显示、1400ms关闭。通用尾停顿提前按键
>   语义未改，不宣称所有按键行为完全等价。维护层依据migrate README：作者正文不再由退役转换器重生成。
> - **演出依赖与存档依赖不同**：001没演到s003，不代表其RF存档不依赖s003。主运行时
>   main.ts的runtimeDigest覆盖所有canonical场景，script-continuation严格绑定该摘要。
>   改002一条作者cue后，旧RF001存档被正确拒绝；需重新运行RF001生产存档，不能改摘要、
>   清掉resume或补兼容来过门。Game不受该摘要影响，复用其已有通过录制，避免两边无谓重跑。
> - **大日志不能用于即时驱动查询**：002正文循环曾每次复制完整causes/resources。失败报告证实
>   已显示完到实际确认的等待由4秒增至40秒，而按键执行仅2–15ms，最终240秒超时。
>   补003/004/005已有的同型轻量进度查询，完整raw仅在验收导出；不截日志、不扩大超时。
>   非空真实recorder正反控证明进度读取不读大档案，完整导出仍有像素与因果。正文和奖励截图
>   就绪分开：自动关闭的提示不等于漏显示，截图不应只挂在需要Enter的分支。
>
> 2026-10-08最新：有限作者链漏检已按通用转换模型修复，001删除接管/转向/定帧三针与001–003删除整个必需run
> 均拒绝，已有六份raw仍满足原有合同、未重录。继续适配后，NPC自动命令准入5/66/52条proved，四处批准末半格
> 由同一精确关系验证；Game帧映射读原始布局，全部draw的跟随镜头另由主角提交独立证明。完整状态效果与跨轨
> 定时观察锚点仍未统一，原型保持partial。详情与不可变收据见
> [当前任务卡](../../../ops/archive/tasks/done/E2E-CONTINUOUS-001-006.md#2026-10-08-当前推进语义适配与统一关系仍非完整双轨证明)。
> 经验：缺指令不等于三个产品bug；未建模操作不能默认无副作用；接管是覆盖权威而非计数，core.run-ended不等于
> 外层已释放；owner/scene必须先验证再过滤背景，cleanup须有结束与实际draw证据；几何自洽不能证明镜头正确。
> 折叠重复draw必须保留变更时刻与总时长。不能把局部模型通过升级成整个工具无漏洞。
>
> 2026-10-07最新：001已完成内容/运行时修复与比较器反控，新双轨比较为0未决、1项用户批准的匀速末步差异。
> 当前收据与质量门见[001验收报告](../stages/001-opening/report.md#2026-10-07-当前验收独立流程与双轨比较通过)。
> 其余碎片未随本轮重验；以下带旧批次时间的统计只代表当时，不把旧001红项继续列作当前阻塞。
>
> 2026-10-07 场景恢复补证据：五个collector保留真实materialized/ready边界及全部原始状态，不改变比较器。003两轨新实跑独立passed，厨房从新实例首状态至ready均未发生world draw；e19/e20的恢复后位置/朝向/显隐/state精确一致，二阶段隐藏→显示只是首次绘制前的恢复中间态。比较仍8项failed，四条状态项定位不代表另外三条呈现序列及一条移动段缺口已收口。收据见`build/e2e/scene-lifecycle-003-receipts-20261007.json`；本轮不宣称重新完成001–006全链或连续演示。
>
> 2026-10-07 Reforge实际draw取证：隔离插件通过SpriteDraw对象身份关联NPC，真实排序后的draw成功且完整世界调用返回后发布；不再以renderedEntityFrames选帧缓存证明已绘制。五个collector明确区分drawn/not-drawn/unknown，比较器拒绝selected或缺失来源。真实Vite加载的生产caller回归验证同资源不同NPC、排序身份、第二次中途draw失败不复用旧pass。001–006及004/005专项新20例独立全部通过，006完成岛上四行并返回控制；路径与哈希见`build/e2e/actual-draw-independent-receipts-20261007.json`。这不覆盖历史验收，也不代表全帧等价。
>
> 2026-10-07 原始帧索引混比纠正：005/006第一阶段actor.frame为方向组内scriptedFrame，二阶段为显示帧；直接比较是否变化会把相同真实6→0→6姿态误报成动画不同。先红后绿后删除这一重复旧判据，真实draw序列/停留/移动帧/来源检查保留，实际错帧反控仍红。对上述未改动原始报告只读重算，001–006未决为3/7/8/7/17/34；仅减少8条混比误报，其余finding逐条原样。工具286/286，未进行新的连续演示。用户已确认保留003末步匀速分解，仍严格核端点和步态，不以裁决创建e56豁免。
>
> 2026-10-07 正文观测边界实证：001–006由真实journey在正文开始/结束记录全局order，比较保留恢复后的精确NPC初值及正文全部变化，原始初始化、存读档验证和完整绘制时钟仍原样存档。003同批raw全量26项、正确正文窗口9项，减少的17项为恢复前e56/e59/e60/e61初始化混入，不是运行时修复；其余项仍失败。六段12个正文入口重录通过，NPC比较仍为3/7/9/7/23/37项未决，不能以独立流程PASS代替帧等价。路径与SHA256见本地`build/e2e/npc-story-scope-receipts-20261007.json`，不覆盖下方历史验收。
>
> 2026-10-06 Game绘制插桩执行域源核验：已直接生成并核读真实presentFrame的转换结果，render:world位于完整entries循环闭合之后，每次完成世界绘制只记录一次；循环内只绘制并递增drawOrder。既有真实多entry回归同时断言两个NPC的实际资源/绘制顺序及后一个draw抛错时不发布新世界绘制证据。本项仅核当前源码与断言，不给修正前的采集结果补发渲染信用，也不宣布正在重录的SAVE12链通过。
>
> 2026-10-06 采集/消费合同源核验：五个collector独立保留至多60,000条worldRenders，原状态变化列表上限不变；errand世界绘制时钟另有24MiB字节限额，超限仍使证据失败。kitchen/errand消费者将worldRenders纳入各列表seq与全局order检查；相同姿态span通过完整绘制时钟还原，缺钟即拒绝。Game记录drawn/not-drawn，Reforge记录selected/world-pass-only，不把选帧冒称像素证据。本次只核源码与既有测试断言，未执行或升级任何历史E2E。
>
> 2026-10-06：重新核读本页 sourceRefs 的实际 caller、合法输入及断言，并更新当前工作树的哈希/行号。此项只是源码证据刷新，不把历史执行升级为当前全量通过；本轮独立录制、帧差异与连续验收状态统一见 E2E-CONTINUOUS-001-006 任务卡。
>
> ## 2026-10-07 可复用差异台账（当前证据）
>
> 当前顺序由用户明确限定为先收口001，再推进002；不在001仍有未决差异时重跑后续片段。
>
> | 现象（人物/剧情） | 已核根因 | 修复层与经验 | 当前状态 |
> |---|---|---|---|
> | 001 李大娘离房被手工拆为几段阻塞走位 | 早期缺接管指令，用中途move终点模拟停步，主角起步还要等大娘完全离场 | 使用已有moveEntity/take/release，前台负责精确停点和对白，后台保留最终离房目标；不加新的作者并行能力 | 已通过：两次对白精确站定，回头首draw正确，主角第一步同批大娘在[60,-12.5]；不再等待大娘隐藏才起步 |
> | 001 李大娘离房最后半格 | `both-001-2026-10-07T06-39-26-646Z`原始证据：Game由[60,-12.5]一步补到[60,-12]；RF分为[60,-12.125]、[60,-12]两步 | 用户批准保留匀速；局部1:2步与真实姿态严格核对，额外移动拍导致相机出屏须用几何证明 | 已登记唯一accepted；到首隐藏帧完整闭区间校验。缺最后可见draw、缺首隐藏draw、隐藏跨visit均拒绝，不豁免终点或隐藏 |
> | 隐藏实体显示后自动脚本晚一拍 | 已有隐藏activation被保留，但状态投影后没有通知waiter，只在下一rAF才醒，错过同步移动阶段 | 在effective gate开放、restart处理完成后通知现有ScriptWakeGate；不加等待补偿、不重启cursor | direct-boot真实壳层少一步反控先红后绿；真实001经跨场景首次创建activation，不能将二者混为同一路径 |
> | 001 李大娘第二次停步回头前多显示朝下姿态 | 作者400ms等待与100ms移动拍相位不同；另有Promise续行晚于本次同步绘制。真实相位0/25/75ms反例分别多留5/30/80ms | 用现有moveEntity等待精确动作完成；内部就绪工作回执让即时脚本续行先于draw，真正移动/等待/IO则放行世界，不暗改毫秒等待、不多推进一次世界 | 已通过：100ms和17ms真实bootGame首draw反控、新001实际帧与完整回归；无新增作者能力 |
> | 001 中间停点丢步态 | 单纯take/release会保留auto，但前台moveEntity到中间点仍清gait且漏计到点一步；前三个4拍整周期停点会掩盖缺陷 | 中间点若仍有有效、可推进且未到终点的auto槽，计入真实步并交还该确切owner；接管期间仍站姿。无auto、取消、终点或生命周期暂停沿原清理 | 已通过：累计11步→释放第12步及suspend目标/owner反控；新canonical001和完整实际draw已验 |
> | 001 比较器漏归因/漏采也可能通过 | 各引擎帧号不属于同一时钟；旧对白只验证最终关闭，移动只验坐标/帧却不核节拍，出屏尾段未包含首隐藏帧 | 每个固定等待绑定实际姿态；每页完整渲染与输入消费相连；每个移动应执行拍都有实际commit和同帧draw；隐藏闭区间完整 | 已通过反控：遗漏等待/翻页/整段对白、错误页ID、慢一倍、漏移动、错frame及隐藏边界缺帧均不能通过。按已核意图验收，不以总时长相近或全局白名单放行 |
> | 004 送菜后苗人随从（s001/e26）末帧回 idle | 原始完整返程8步；Game旧录制第7步就离场，RF却是在接管期间先安装auto丢了首步，错误地在[107.25,24]完成 | release前移到选auto之前，删除为匹配7步而加的人工尾frame2；不要对错误终点补姿态 | 真实正文壳层先红后绿；完整8步到[107,24]，实际draw为4/3/5/3/4/3/5/3。新全链004仍待录制 |
> | 公共一次性 auto 移动可能重复提交 | 真实 bootGame 回归在 commit 后、deferred ack 前再推进 world frame，复现 step/chase 再次移动；这是独立于上行的反例 | `world-motion-runtime.ts` 暴露只读 committed；`main.ts` 不重复规划已提交槽；保留存档/取消的原生命周期 | 修前2个业务断言红；修后定向89例绿。不能冒称原004录制的直接根因 |
> | 004 门口醉道士（s003/e62）循环帧数量不同 | RF将仅首次200ms等待放进loop，周期1700而非Game1500ms；另有可见窗口/菜单暂停域差异。“Game只停0.7s”的旧解释混入materialize前visit，撤销 | 首次wait移出loop，连续两轮的真实编译runner时间反控先红后绿；全段接管不能修复赠酒前的窗口差异 | 周期已修；实际可见循环数量仍needs-review，禁止压成帧集合放行 |
> | 003/005 李大娘、水生叔、鱼嫂交互转向缺失 | 第一阶段 Confirm 有 search visual；二阶段对应作者入口漏显式转向。此前新增指令误放张四方案，已移回实际水生叔/鱼嫂默认入口 | 显式 `faceEntityToParty`，厨房对白后恢复工作姿态；不全局给所有交互增加隐式转向 | 正确入口的005诊断已不报水生叔；鱼嫂初始down修正尚待新链，不能只靠静态朝向断言确认可见表现 |
> | 005 香兰（e83）/秀兰（e84）位置与朝向差异 | 不得合称“随从”；进入场景前抢跑与运行姿态保存是已修公共合同，但不能据此宣布姐妹两人的剩余路径差异同根 | loadScene完成onEnter后再启auto；SAVE12保存live pose/续演状态。005最新诊断仍有香兰路径/朝向与秀兰终点/路径红项，须分别追第一次差异 | needs-review，不以公共回归绿代替005原始日志 |
> | 005 市集商贩初始朝向（e128–e132） | 第一阶段在场景物化时先记录一个未入画初始朝向，随后才提交真实朝向；Reforge从真实朝向开始。差异只可在完整前缀均有独立offscreen证据、位置/状态/帧/精灵和后续setter一致时接受 | 比较器新增通用 `invisible-initial-facing-projection` 证书；不按实体ID白名单，不解除后续绘制/帧/状态比较。旧005诊断五项均命中证书，但最终收据仍须新工具冻结后重录 | accepted-by-evidence，待最终重录复核 |
> | 002/003/006 位置出现小数或段末对不上 | 移动提交、最终 endpoint、脚本 nudge/乘船派生是不同事件；`route.steps` 最后一条不是剧情终点 | 使用真实 commit/finished 事件，终点单独登记；禁止轮询猜终点、取整或 1.5 格容差 | 已加入连续工具合同，后续碎片沿用 |
>
> 规则：每条新差异必须写清“人物+具体剧情入口、raw evidence、最强替代解释、修复层、修前红/修后绿”；未完成项保留 `needs-review`，不以 route 通过或截图替代帧/状态证据。
>
> ### 覆盖索引：正文、公共运行时、比较器和连续执行器分开记
>
> 下表是001–006本任务已识别问题的索引，不是“全部已经修完”的声明。历史修复的逐批原始路径、反控和裁决见
> [连续任务卡](../../../ops/archive/tasks/done/E2E-CONTINUOUS-001-006.md)；当前内容改变后旧收据只证明原批次，不自动续期。
>
> | 编号/范围 | 差异、原因与修法 | 验证边界/后续防线 |
> |---|---|---|
> | D01 / 001 李大娘叫醒与密道 | 原始固定等待以100ms探索拍执行，作者wait误换算且漏无对白clear重绘节拍；显式固定等待、已有接管/动作等待及内部帧内续行收尾 | 新001独立流程与帧/时序比较均通过，0未决、1项批准匀速差异；35固定等待、房内21对白及30移动步均有因果证据，不将结果外推到002–006 |
> | D02 / 002 走廊接待 | 原迁移漏入口面向主角、无对白重绘拍与探索帧等待换算；随从开门同步属性被误拆停顿 | canonical作者修复；2026-10-07两轨新独立/完整帧与因果比较均通过，0未决；仅三苗人接管，大娘按原目标匀速继续去厨房 |
> | D03 / 001–003 大娘路线末步 | Game目标移动有末步直接补齐，RF匀速分两拍；用户已明确批准003及001离房末半格保留匀速，不自动外推其它路段 | 精确端点不放宽；必须按实际路线段对齐并继续验帧，不能把movement-leg不齐变成跳过所有render检查 |
> | D04 / 003 厨房李大娘 | 对话入口漏转向，旧固定朝向无法覆盖不同接近方向 | 已加通用显式faceEntityToParty及对白后工作姿态；以真实入口与四侧位置验证，不在引擎偷偷加交互副作用 |
> | D05 / 004 端菜随从 | 6次nudge集中一批执行造成突跳；动作间缺明确世界节拍 | 已在作者动作编排保留nudge/anim/wait顺序；后续末帧与一次性槽问题分别见上表，不能把所有卡顿归于同一原因 |
> | D06 / 004 醉道士赠酒 | 选择触发方案不等于立即执行；酒物品入口需显式runEntityTrigger等待NPC正文 | 正常菜单使用酒必须保留；错目标/取消/未持酒是独立专项，不插入连续正文 |
> | D07 / 005 船家转身 | 张四、水生叔、鱼嫂是不同实体/入口；曾把转向补到错误船家的后继方案 | 测试必须核实际被调用入口和target，不只搜索“某处含有指令”；最新入口修正后的链待完成 |
> | D08 / 005 香兰报信 | 估时等待不能证明香兰走近完成；场景entry与auto可能争抢初始姿态 | 显式入口、等待真实动作完成、入场初始化后启auto；香兰/秀兰当前剩余路径各自未决，不能用“NPC遮挡”解释未核差异 |
> | D09 / 006 苗人头领 | 缺take/release会边说边走；曾误把对白中途停点[137,73]当自动路线终点 | 保留显式接管及朝向，自动终点已按脚本恢复[137,72]；正文停点与auto endpoint分开断言 |
> | D10 / 006 求医及船家 | 小虎子正文重新激活旧苗人剧情；洪大夫只切张四方案却未恢复其state，码头无可见船家 | 修作者入口与显隐状态；验证后继剧情实际可触发，不只断言绑定存在 |
> | D11 / 006 乘船 | 船体终点、挂载偏移、slow休拍与骑乘连续节拍混淆 | 精确船体终点[126,34]，队伍/张四相对偏移分别[-2,-4]/[-2,2.25]；分挂载前、航行、落地验证，不能无证据删挂载前记录 |
> | D12 / 006 上岛收尾 | 旧终点停在张四首句就PASS，漏后续对白，仍不能存档 | 已要求1886/1888/1889/1890全部完成、dialog关闭、控制归还；旧缺尾输入记录失效 |
> | R01 / 存档与重入场景 | 只保存canonical位置或重启auto，不能续接中途动作/等待/已提交尚未ack的指令 | SAVE12保存live pose/gait/动作与续演游标；存读档、离场重入与当前页面连续各验，不用存档修正连续现场 |
> | T01 / 按键与scope | 按键黑名单误删Escape/菜单输入；005路线输入另放report.route.inputs导致正文录制缺失 | 统一action/input记录，按显式bootstrap/checkpoint scope裁剪；菜单与物品输入不按键值过滤 |
> | T02 / 004尾部探针 | control-move测试让Game段末多走一步，污染005开场 | 删除无必要移动尾验证；不能靠scope排除保留副作用，独立结束与下一段开始精确一致 |
> | T03 / 移动观测 | 坐标轮询漏提交、把朝向/步帧变化当位置事件、把route末样本当剧情终点 | 真正位置commit/finished事件分工；长直线按住方向，不逐格点按；零位置容差 |
> | T04 / 006对白输入 | 独立确认未等Game消费，同一页注入多个Enter；连续逐页确认因多余记录超时 | 独立录制等待真实对白状态改变后才下一次确认，重新录制，不加工旧记录删键 |
> | T05 / 观测生命周期 | 初始化/恢复中间态混入正文；把一次场景载入的pre-materialization与ready当两次正式访问 | 保留raw并用显式storyScope及完整初值，核materialized/ready；001 reader已补lifecycle合并，真实report读取反控锁住ready前后移动分类 |
> | T06 / 实际帧证据 | 选帧缓存不证明已draw；Game组内frame与RF显示frame直接混比产生假红 | 记录真实完整world draw及身份，帧组解析后比较；selected/missing-clock不能放行；已反控实际错帧 |
> | T07 / 比较器局部对齐 | 原先movement-leg不齐就漏掉全部姿态；逐提交数组无法直接对齐获批匀速末步 | 已比较精确共享窗口全部姿态，001末半格单独严格对齐；其余路段与窗口归因未完成，不用集合压缩或实体白名单 |
> | T08 / 运行基础设施 | Chrome newContext超时与父进程中断后的IPC关闭发生在剧情外 | 保留失败阶段，不计产品缺陷或业务通过；重跑实际缺项，不改故事脚本规避 |
> | T09 / 持帧时钟混比 | Game frameNum与RF worldTick不同时钟域：300ms可分别记3/4拍，同为3拍也可相差17ms | 保留本地拍号与实际draw时长；未分离作者等待/打字/确认时标evidence-gap，不直接判多停100ms，不加时间容差或因时长相等放行 |
> | T10 / 静止帧与接管首显 | 只核移动首帧会漏等待/转身/门状态/隐藏后的坏帧；同帧先移动再接管又会被误要求先画抬脚 | 002逐draw延续明确姿态，逐真实wait/dialog/move归因；首draw按绘制前的实际接管顺序，错误步帧仍红；完整canonical结束及story封口不能删 |
> | T11 / 源帧与剔除的循环自证 | 盲信最新actor帧可漏无源重置；用观测bbox直接证明屏外可掩盖错误消失 | 002大娘原路径窗口逐源提交和前态连续性；两轨bbox先锚实际位置，Game再按源码+4px剔除；假bbox、漏末draw均有真实反控 |
>
> 每个后续片段至少复用上述防线：完整开始/终点、后继入口、正文输入、实体控制权、live位置、朝向、可见性、
> 实际绘制帧及其节奏、退出/返回/存读档。未取证维度明确标缺口；不能只报“独立流程通过”。
>
> ## 2026-10-04 文档深审
>
> 共性问题族只汇总已报告问题，不为后期站点或 006 追加实跑信用。
>
> 当前核读基线为 `d02278dc0154dd73b5db24388a35c30bb096cc81`，content22/SAVE11。本轮没有执行游戏；配对 evidence 记录精确 source/caller/oracle、源 hash 与缺失原始产物。下文数值/告警/通过结论保留为各轮历史记录。
>
>
> ## 剧情脚本的七类共性问题
>
> | 问题族 | 001–005中的表现 | 根因及当前闭合程度 | 后续批量处理方向 |
> | --- | --- | --- | --- |
> | 连贯动作被拆成机械状态 | 大娘下楼46状态，后来又误按六个路段拆六步骤，最终才成为一步中的顺序指令 | 把逐拍调度、循环展开和原保存限制暴露成作者模型；大娘代表场景已修，复杂运动流程尚未全清 | 找线性/固定重复的nudge、步进、动画、worldTick链，核路线/速度/姿态后合为一个步骤内的目标移动/动作序列；转弯不等于下一次激活 |
> | 首次、复读、完成和后续方案混淆 | 每个方案末尾空步骤；002结束错选大娘次日行为；005张四缺后续两段、香兰返程变空 | 既有模型表达问题，也有动态安装入口被截断；443个纯空终止步骤和27套纯分次机器已批量整理，动态入口遗漏仅修已核点 | 按源安装点、目标、执行通道和后继游标核完整激活链；检查奖励只一次、后续对话不丢，不能只证明后继地址在某处存在 |
> | 剧情正文归属与调用关系不清 | 大娘去厨房和方案切换藏在auto；桂花酒剧情难在NPC身上查；香兰报信散在场景入场 | 转换保留了旧入口分派，却没有形成清楚的作者职责；004、005已把主链放回NPC并显式调用 | 筛出自动行为中的关键对白/奖励/跨NPC阶段切换；主链有明确入口和等待关系，auto保留独立后台巡走/返程，不一律禁止auto |
> | 隐式调度依赖 | 三苗人边交谈边离场；大娘转身被auto改回；选中道士方案后静止使用酒不立即执行 | 旧脚本依赖对话冻结auto、下一帧触发扫描等隐含行为，新引擎没有这些脏耦合；代表场景已显式编排，runEntityTrigger是通用能力 | 检查同实体多通道争夺走位/朝向、选择方案却隐含期待立即运行、估时等待代替真实动作完成；不能把所有select都改立即执行 |
> | 时间和移动尺度不准确 | 楼梯40ms太快、脚步归idle、目标移动末拍大跳；香兰用480ms猜走近 | 公共移动/步频问题已修；错误等待常量来自历史转换，尚未完成全仓时基核对 | 按原指令及上下文分型，不统一乘2.5；循环次数上限不是时间。保留必要中间路线、姿势与动作节拍，不只比终点 |
> | 临时呈现误作持久剧情状态 | 门打开后读档变关；端菜外观保存后丢失 | 用瞬态frame/sprite保存跨交互意图；门页与持久appearance的本段用法已修，其他调用域仍需筛查 | 查跨交互/跨存档仍应存在的门、物件、角色形象；用现有持久状态表达，普通短暂表情不机械持久化 |
> | 名称与作者界面不可理解 | 自动行为6、intro/cycle、实体只有e59；普通首次/复读显示高级状态；单步骤卡和参数摘要不一致 | 机器结构和技术身份直接当作者界面；通用显示已修，语义命名仅逐段推进 | 先批量列出已知人物、用途和模板名；可靠映射可成批命名，复杂语义必须核正文，稳定ID不乱改、不猜后期故事 |
>
> 大娘案例的准确结论是：**一个步骤可以顺序执行多段路、转身、说话和等待；“步骤”应代表激活/复读/剧情阶段，
> 而不是每一个转弯、每一帧或每条位移指令。** 保存机制应适应合理作者结构，而不是逼作者切碎正文。
>
> 作者模型应统一为**方案→步骤→指令**，不再并列要求理解“连续流程/高级状态”。
> 复杂性通过步骤内部明确的条件、分支、循环或调用表达；内部执行游标/控制图不是第二套作者概念。
> 后续治理必须真的转换表达并验证语义，不只换标题或隐藏仍然难以维护的状态列表。
> 当前仍有以下stateMachine残留，不能把这个方向说成已经完成的产品事实。
>
> ## 005收尾时的过度拆分证据
>
> 开工前只读枚举294个场景的实体行为与场景hook，共4662个方案，其中165个使用stateMachine。
> 165是结构数量，不是已证实bug数；真正有条件/结果分支的状态机不能机械抹平。
>
> - `s021/e406/auto/default`有288状态，全部body不超过两条指令，主体为140条nudgeEntity，另有少量朝向、
>   帧、行为选择与隐藏。其cycle状态通过worldTick逐拍衔接，明显属于需要整体审查的机械展开候选。
> - `s273/e4723/auto/c8-3278127a7af6`有642状态，全部body不超过两条指令，主体为320条nudgeEntity及一个状态设置。
>   这不是“有642种剧情情况”的证明。必须核激活入口、可达链、速度与收尾，才能确定等价折叠范围。
>
> 以上来自当前作者JSON的直接计数，未运行对应后期剧情。不能等E2E走到这些场景才第一次检查这类结构，
> 也不能仅凭状态数便宣布可无损改成一个终点移动。
>
> ## 应独立记账的公共运行时问题
>
> - 保存等待后台NPC整步结束、完成auto仍被当作活动任务：已修改通用完成/快照机制，不应再逐NPC加规避步骤。
>   005进一步验证后台正在返程也能保存、读回继续，快速保存和手动保存仍共用前台准入。
> - 两种时钟被混用：004对话起点和消失效果进度使用了不同时间域，两处已修并有时间错位反控。
>   世界时钟与界面时钟分开有合理用途，混用不合理；完整的时间域防混用治理不等于已经做完。
> - 遮挡透视误作用到普通NPC、开场视频与首帧交接露出旧菜单：属于共享渲染/呈现边界，不是每个NPC的剧情脚本问题。
> - 001的一阶段漏掉翻页后第五行、淡入收尾没补足色板：也是公共运行时缺陷，不能归咎于二阶段迁移内容。
>
> 相关公共修复的作用应覆盖所有调用方；后续同根反例出现时，应重开对应公共问题，而不是再加场景特判。
>
> ## 测试与验收本身的问题
>
> 以前有“转换结果符合快照”却未证明“玩家再次交谈会进入正确后续”的测试。002还曾证明错误绑定被一致保存和读回，
> 却没有证明003能正确接续。因此必须同时核本段结果与下一段入口，原有快照通过不能代替剧情语义。
>
> 执行器也发生过脚本外的错误：逐次按方向键造成走路断续、恢复后取样太晚把正常后台变化误判成读档差异、
> 以静态page替代动态触发范围、拿此前巡逻充当本次走近，以及把每tick续跑内部状态重复记录成巨型日志。
> 这些应作为工具问题单独修复和回归，不能计入“游戏每段都有大量脚本错误”的统计，也不能削弱业务断言。
>
> 005最后复验还发现两类公共工具边界：导航把半格NPC当成零体积点，已统一修到002–005共享路由及211项工具回归；
> 独立Chrome在newContext启动RPC中崩溃后不会及时返回，原有轮询health不能覆盖挂住的RPC，需要补独立超时和自动清理。
> 前者已有源码/实际失败反控与正常流程证据；后者本轮仅保全失败并完成同版缺项补跑，仍归R4待办，不称已修。
>
> 批次组织同样需要改进：本轮最后检查才发现厨房入口e53漏命名，补三处名称后又触发当前内容指纹下的检查点重建。
> 以后应先列齐本批经过的实体、方案、步骤与入口，完成整批内容审查后再冻结并统一重建，不能边补零碎改动边重跑前驱链。
> 这不构成为省时间改档、放宽恢复校验或假造检查点的理由。
>
> ## 下一批的收敛顺序
>
> ### 2026-10-10 乘船队长朝向漏检
>
> 用户在连续演示看到两轨李逍遥反向，旧006却0 findings。根因是只比party运行态direction：
> Game ride把direction转up，真正画面仍由L1513的0x15(direction0/gesture0/member0)保留frame0；
> RF作者正文误写up，实际画frame6。旧采集器排除了party actor-render，资源门也只核NPC，
> 两边逻辑up不能证明画面一致。当前候选改作者down，队长实际draw接入资源字节和完整draw覆盖，
> 按真实setter/run/sceneVisit核图像帧；保留steering作为独立诊断。旧raw被拒，当前正控/反控及
> 最终重录进度见E2E-CONTINUOUS-001-006卡顶部；旧0 findings不升级为当前信用。
>
> ### 2026-10-10 队伍绘制矩形诊断（+4候选已撤回）
>
> 当前合理性结论：原版队伍+4/NPC+7及RF统一+7的差异已证，但未证明RF贴地错误。
> 实际party screenOffsetY4候选已撤回，RF继续统一+7；每draw精确核自身声明锚点、位置、
> 资源尺寸和矩形（Game4/RF7），不要求两轨矩形逐像素相等，不加容差。真实native Canvas
> 与资源合法错矩形反控已通过。以下是当时+4候选的历史诊断，不授予当前产品缺陷结论或冻结。
>
> 新headed检查点暴露队长固定下沉3px：primary `reference/sdlpal/scene.c:224/358`的
> 队伍layer相消后blit偏移为+4，NPC为+7；Game实际draw保留+4，RF统一spriteBlitRect
> 沿用+7。同资源frame0、同逻辑站位的真实worldRect分别[1733,1322,22,50]与
> [1733,1325,22,50]，与camera无关。先前仅核帧/资源/数量，合法draw的y加3仍通过旧006。
> 当前party assembly显式screenOffsetY4，投影仍统一经过spriteBlitRect，NPC默认7，
> 逻辑站位与sort/cover不动。新资源门逐party draw绑定最近同visit actor位置、primary偏移、
> 资源宽高和精确worldRect；原生caller先红后绿，+3反控拒绝，旧RF raw拒绝。
> 冻结后第四轮全链重新录制；诊断、旧0 findings和旧headed执行PASS不授予最终验收。
>
> ### 2026-10-08 执行与采集缺口闭环
>
> 本包没有新增游戏演出修补；修的是可复用基础设施，001/002各补录一轮后两轨独立及对比均通过。
>
> | 问题族 | 已核原因 | 修复与判别依据 |
> |---|---|---|
> | 可见性相同却无法核状态 | 001只采visible，漏数值state；002RF漏behavior覆盖 | 采原生数值/覆盖，真实投影调用后立刻观察；state1→2→1、方案A→B→inherit/page在同位置同帧也逐次留证；删字段反控为unknown并阻止通过 |
> | 独立路线仍依赖轮询松键 | 002仍调用自适应导航，再事后生成commit报告 | 冻结已证两条直线，注册事件后长按，逐实际位移核scene/source/from/to；不把转向当移动，不插值、不改道，ready/dialogue另证完成 |
> | 输入意图冒充成功执行 | press先记action再down/up，异常无finally | 统一真实输入执行器，保留每次调用结果；partial down、up失败及日志满额均尝试释放，任何失败仍拒绝；子收据key须绑定父key |
> | 裁剪半组长按或丢显式press | 只过滤scope和kind，没有先验证完整ledger | 先核合法scope/kind及down/up同组，再只裁boundary；正常菜单键不筛掉，未知记录不静默丢弃 |
> | 连续播放绕过双轨验收 | 原入口仅看独立passed，自报清单或可改plan未绑定 | 发布与直放都以raw真实重算receipt，再绑定全部plan/actions/前驱；录制器和执行器不按“E2E工具”一概归入纯比较器 |
>
> 新raw与当前哈希回执见[任务卡本包完成回执](../../../ops/archive/tasks/done/E2E-CONTINUOUS-001-006.md#本包完成回执2026-10-08)。
> 001/002持久效果4/18命令均有实际观测；2真实准入正控及10证据反控通过，旧raw未改。
> 比较器内存对象含undefined、落盘JSON不含该键，曾导致回执误拒；比较wire形式并核反控后只离线重算，
> 不为这类序列化问题重录剧情。当前完整串行仍缺004–006的新离线合同，不能拿本包宣称六段全部通过。
>
> ### 后续剧情治理
>
> 1. **激活后继与副作用优先。** 从动态安装的advance/reset入口核起，先找漏段、重复奖励、错误复读与缺失返程。
>    源码已见段外洪大夫`s010/e191/trigger/legacy-001`仍是单步给灵山仙芝，而原L2018给药后advance到后续服务；
>    s002正文会显式显示并选中该方案。这是应先做反控的重复发物品风险，不冒称后期已经E2E实测。
> 2. **机械运动结构与时基联合治理。** 按可证明的直线/折线路径与固定循环分组，保留动作节拍和必要的支路。
>    对话/奖励/切场等混合流程另分桶，不用大规模replace改所有wait或状态机。
> 3. **入口归属、局部动作接管和名称。** 对已核映射批量整理，并用编辑器可预览、入口可追踪作为验收条件。
>
> 每个问题族记录“已核修复、已核无问题、待核”的全量清单，保留反例并添加能抓住整类错误的测试。
> 批处理后选代表场景做E2E，而不是为每个机械同类都从头通关；之后各段E2E应主要发现新类型或真正的剧情特例。
> 已人工改写的001–005必须保护，不重新运行旧转换核覆盖作者工程。
>
> ## 首批批量治理的直接线索
>
> 独立只读核查已找到005之外的相同入口截断结构：
>
> - 洪大夫`s010/e191/trigger/legacy-001`：原L2018给药后advance，当前只留给药首段；s002会显示并安装它。
> - 老王`s008/e180/trigger/legacy-001`：原L3383是首段→第二段→reset回首段，当前只有第一段复读。
> - 灵儿演出实例`s020/e343/auto/legacy-001`：原L5076逐tick继续frame3/4/5/6等动作，当前只留frame3并完成。
>   同一演出附近960ms等待可定位到原entry4696的0x09[24]，探索时基应为2400ms；需连同动作尾段一起核，
>   不能只延长等待掩盖动画缺失。以上为源码判断，未执行后期剧情，不报告为新的E2E通过或实跑反例。
>
> 历史573池不是全量安装边：旧注册缓存按label、owner、对白入口态去重，不含调用类别，命中缓存就返回，
> 因此其中111条install仅是首次注册时归类的子集。下批应重新只读枚举原0x24/0x25安装边及调用上下文，
> 建立源入口→当前行为→后继游标的绑定，不能拿旧数字充当完整覆盖分母。
>
> 旧审计检查“后继地址在某处可达、已有对应内容”，但这不等于“这个NPC下次激活能进入后继”。
> 这是共性验收漏洞：测试要证明运行语义，而不只是内容存在或与旧生成结果相同。
>
> 另需把goto.frameDelay与普通等待分开：它是循环次数上限，不是毫秒等待；源0x85的80ms单位及其它
> 淡入/色变/溶解指令也有自己的公式。源映射不明确、作者已改写、入口有多义的站点保持待核，不能自动覆盖。
>
<!-- original-source-quote:end -->
