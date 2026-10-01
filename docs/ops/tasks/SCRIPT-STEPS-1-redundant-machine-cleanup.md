# SCRIPT-STEPS-1 — 首次对话与复读回归普通步骤

Status: review
Phase: phase2
Capability: W7 / P3
Coding Owner: Codex Root
Generation Owner: N/A
Reviewer: Codex / party_occlusion_rework（只读独立前提与反证）
Visual Verification Owner: Codex / User
Visual Verification Timing: dev-functional
Contributor: Codex
Branch: codex/e2e-003

## 用户目标与范围

用户2026-10-01明确：方案是NPC不同剧情时期的行为，步骤承担首次对话、再次对话与复读；
不应该再要求作者理解另一套“连续流程 / 状态”。用户批准把截图中的冗余状态机真正整理回步骤，
并要求解释002李大娘脚本错乱的原因。

- 本批真正改canonical内容，不做仅换标签的伪统一。全工程195个machine中，29个默认节拍、
  仅advance/stay的流程转为现行stages；19 trigger、10 onEnter，全部位于PAL。
- 编辑器对同类纯分次流程提供显式“整理为步骤”，使用现有session校验、撤销/重做与保存。
  不在loader或render中隐式转换，不为复杂机器提供误导性转换。
- 剩余166个含同次继续、跨世界拍、结果/条件分派或transition节拍的历史流程保持原逻辑，
  随E2E作者编排逐项重写；本批不宣称全195个已收敛或stateMachine schema已经退休。
- 不改schema/save版本、资源供应、原版脚本转换核、一阶段解释器，不新增parallel/join或兼容旧游标。
- 6012服务/页面保持打开；更新主树须确认当前无未保存草稿；技术验证用独立服务。

## 前提真值门

一句话：截图“首次执行advance到后续stay”的实际行为与普通步骤完全相同，不应作为高级作者流程。

| 维度 | 直接事实与证据 |
| --- | --- |
| 原版 / primary source | 作者层级由本次用户说明及批准确定；原版不定义现代编辑器schema，不借原版END推导作者结构 |
| 第一阶段 | N/A：没有canonical方案/步骤编辑器；本任务不改一阶段解释器 |
| 修前二阶段（75e35a45） | `ScriptEditor.tsx:4198`按kind直接露出“连续流程（高级）”；s003/e56/trigger/legacy-001只有advance/stay；`script-runner-core.ts:172–300`二者均正文结束后提交下次游标 |
| 目标 | 方案→步骤→指令；保持stateId作为stageId，initial/body/entry不变；advance→next，stay→省略next，正文、副作用与每次激活次数保持 |

独立前提核验：party_occlusion_rework直接读取compiler/runner/validator并遍历全部projects：
4665 flow，195 machine（117默认节拍、78transition节拍），可直接整理29套。
这29套正文没有confirm/stopScript/branch/loop/callScript/startBattle；全部cursorHandoff引用auto，
29套为trigger/onEnter且无命中；s057/s180的entry必须保留。

最强替代解释：machine具有stages没有的时序或保存点。反证条件是cadence、continue/to、分支/结果转移，
或外部state cursor引用；这些流程不纳入机械整理。现存开发档若已保存这些machine的state游标，
不能被stages直接消费（runner明确拒绝），本批不承诺恢复它们，需用正常流程重建，绝不加fallback。
通用编辑整理若遇外部cursorHandoff，必须由session拒绝且不产生半编辑；不静默丢引用。

## 上下文与设计

- [二阶段铁律](../../phase2/READ-FIRST.md)、[现行作者合同](../../phase2/specs/script-system.md)、
  [完成语义](SCRIPT-COMPLETE-1-explicit-flow-completion.md)、[003卡](E2E-003-1-inn-stairs-and-kitchen.md)。
- `script-compiler-core.ts:300–367`：默认逐指令节拍相同；transition节拍不能盲转。
- `script-runner-core.ts:172–300/366`：正文执行、safe-point、stop/confirm语义。
- `script-editor.ts:679/1148/1682/1871`：游标引用校验与快照命令；失败不得污染undo栈。
- 不新增第二种作者状态概念、加载归一化、持久化升级器、magic id或JSON日常编辑入口。

## 当前模式准入

- Root premise verified / design agree / build allowed：用户已批准形态收敛，独立直接证据和反证已核。
- Root唯一产品/作者Coding Owner，独立tree `e2e-003`；贡献者只读审查，不写共享文件。
- 白名单：content纯作者AST整理函数及导出（无loader/runtime自动调用）、editor通用flow控件与测试；
  经核29套PAL正文结构；Reforge实际compiler/runner等价回归；
  migrate内仅现行作者工程入场保真测试的stages形状断言（不改任何转换/迁移产品代码）；
  本卡、看板、索引与当前规范。002交接门由e2e_002_runner隔离工具候选负责，Root独立接收。

## 验收

- 红绿：截图两状态变成两个步骤；首次完整正文后下次进复读，复读无首次副作用重放。
- 保留entry/稳定指令ID/初始非首节点/显式完成与复位；拒绝跨帧/同次/分支/结果等未知语义。
- 实际compiler+runner比较整理前后命令、节拍、safe-point；取消/stop不得推进。
- 全29个原始正文与其余作者字段直接diff核不变；无cursorHandoff悬空；存读当前canonical/撤销重做。
- 编辑器最小浏览器验证：选s003/e56相应方案，看到普通步骤、无空尾；正文/去向与撤销保留。
- 全仓硬质量error/warning/info为零；未通过不得宣称统一门完成。

## 002李大娘归因（独立已核）

main3a99eacb的e56 auto/legacy-006/outro-05（s003:3314–3326）切到legacy-001；
该trigger方案实际是次日824–858，作者工程缺首次56–58。原始L373末尾（all.json:2733–2743）
应切L355（:2540–2571），原game002实际结束triggerLabel=L355。
旧RF002 payload/endWorld/restoredWorld三处同选legacy-001，错误在保存前就有，读档未改坏；
候选78a5补greet-after-guests/go-to-kitchen/beggar-first-talk并修收尾，新真实RF002三处选择正确。
002原门只核本段对白/500/三人进房/全World恢复一致，未核下一段剧情绑定；一致保存也可能保存错误。
修复与回归归003卡，新增002交接语义门另由独立工具包验收；不修改历史passed报告掩盖缺项。

## 验证记录

已整理29套：27套严格结构保真，s188/s277两套纯空尾按已批准完成规范改为complete，专项验证单列。
初轮测试误把场景索引作为scene输入，随后测试越过包rootDir直接导入runner；原失败日志保留。
修正为正式scene文件及content纯AST工具公共边界，runner验证归Reforge自身测试，不扩大tsconfig或降低诊断。
Reforge实际compiler/runner及canonical场景17项、editor DOM与session57项绿，两个typecheck零诊断；
PAL作者工程294场景/223地图/1934资源通过。测试scene读取最终使用Vite原生glob，不扩大Node类型配置。
独立只读review accept：572个tracked项目JSON中仅28文件29处flow变更，flow外零变化；
27套严格等价、两套完成折叠、166复杂flow逐对象不变，18处handoff/247映射全部有效。
Reviewer直接内存执行非首initial/复杂边拒绝/输入不变等反控，并核session原子提交及UI失败不伪成功。
用户已确认6012没有未保存草稿，允许验证通过后更新；待实际浏览器与零诊断质量门，保持build。

Root实际6014编辑器检视s003/e56的legacy-001：普通步骤1有24指令、下次进步骤2，步骤2有3指令并复读，
无高级状态导航；新初次方案独立出现。实际改下次去向后撤销恢复，未保存任何测试更改；重载后已保存/无历史。
全仓首轮在content发现浏览器structuredClone不可用，红日志保留；改为仅普通JSON AST的纯递归克隆，
不扩DOM lib、不加强转或ignore。新增嵌套confirm.onNo与entry.prepare输出变更不污染输入，17项再绿。
Reviewer直接内存执行嵌套JSON/数组/null/条件反控后维持accept；严格lint2721文件零诊断已通过，
完整check第二轮仍执行中。使用pnpm/Vitest技能按实际包边界执行回归与质量门，没有安装额外依赖。

第二轮全仓在migrate作者产品测试有1红/449绿：s057/s180被正确整理为stages，但旧R13断言强制machine。
正文/entry/去向保真已由独立字段比较确认；测试更新为明确stages及两个稳定ID/initial/next、
后续节点无entry的严格断言，不接受两种形状、不放宽正文检查。4项专项绿，第三轮完整check重跑。
原第二轮日志保留：content1224/shared128/game2773/extract357/Reforge2078/editor3696全部绿。
Reviewer独立读取R13 diff及旧JSON后维持accept：强制当前stages和精确ID/初始/去向，原正文/prepare/reveal
未削弱，不是双形状兼容；migrate产品代码零变化。

用户另问方案切换入口：Root实际打开添加指令搜索及既有002 auto/legacy-006/outro-05编辑表单，
确认“切换实体脚本”选择场景s003/实体e56/交互脚本/greet-after-guests；只查看未提交更改。
方案卡是编辑/预览选择，步骤下次运行是方案内部去向；跨方案使用正文指令。
现行规范补明该入口，当前脚本/行为/方案名称不一致的可发现性问题登记，不未经用户批准扩张UI命名改造。

## 统一质量接收（2026-10-01）

第三轮 `pnpm check` 全7包10,706项测试通过：content1224/shared128/game2773/extract357/
Reforge2078/editor3696/migrate450；工具docs37/coverage30/quality27/E2E92全部通过。
命令末端lint仍有R13新断言的一处格式诊断，退出1的原日志
`build/e2e/steps-final-check-3.log`原样保留，不称该命令整轮exit0。
随后仅对该测试文件运行机械格式化，TypeScript打印AST前后相同；专项4项再绿
（`steps-entry-green-final.log`），全仓typecheck、严格lint、docs重跑exit0。
严格lint2721文件0error/0warning/0info；docs809 Markdown/4263链接/249任务、0问题。
纯格式后没有再重复整轮测试；第三轮测试日志仍有jsdom未实现Document导航提示，
不将运行时宿主提示写成静态诊断，也不宣称所有输出静默。

Root技术accept，独立专项review accept；本卡转review等待用户实际编辑体验验收。
6012已获无草稿更新授权，更新与现场确认由Root完成后另记，不关闭服务或演示页。

## 主工作树与6012现场交付（2026-10-01）

用户无草稿授权后，Root再次实读6012保存/撤销/重做均disabled，main clean；
候选4c476f2f以ff-only接入main，不推送远端、不清理待用户体验的工作树。
保持原6012 PID88523，仅授权重载既有页面。现场确认s003/e56/触发行为1：
步骤1为24指令、下次步骤2，步骤2为3指令并复读；新greet-after-guests方案可见。
另实际打开auto/legacy-006/outro-05的切换表单，场景s003/实体e56/交互脚本/
greet-after-guests均正确；未修改值或提交，保存仍disabled。
截图 `build/e2e/steps-main-6012.jpg`、`steps-main-switch-6012.jpg`；6012与旧6051页保持打开。
最后文档状态接收后strict lint2721文件0/0/0、docs809 Markdown/4265链接/249任务0问题。
当前剩余166复杂流程仍存在，实际auto/legacy-006的46状态未伪装为步骤，后续编排重写另排。

## 单步骤卡片反馈续修（2026-10-01）

用户发现单步骤被隐藏成摘要行，明确授权修正。前提：`ScriptEditor.tsx:3927–3971`
仅在步数大于1时显示既有卡片；stages数据和执行语义不缺步骤，一阶段没有对应作者编辑器（N/A）。
目标before→after：单步骤摘要行→与多步骤完全相同的一张步骤卡，显示编号/指令数/首次/下次去向/详情。
Root连续Owner、原隔离tree；build allowed只改此显示分支、删除不用CSS、相应DOM回归及本卡记录。
不改schema/runtime/作者正文，不复跑已证剧情；编辑器功能界面做最小视觉核验。
保留最后一步不可删除、完成/重复去向、entry正文标签、创建/删除/撤销合同。
使用pnpm/Vitest按包红绿回归、全仓typecheck/严格lint/docs；不新增依赖或降低门槛。

用户另问e56自动行为用途：仅只读审计7套实际方案与调用域，独立贡献者并行核事实；
不因数量多推断错误，不在本次UI修复中重写剧情/自动调度。

续修验证：原实现3项红/25绿（单步骤、空正文单步骤、多步骤删除回单步骤）；
卡片分支统一后初绿有1项新断言误把已有删除引用重定向产生的显式self next视为省略next，
确认产品删除规则未改，严格改为既有自指标签；原失败日志保留。最终UI28+session30共58项绿。
全7包typecheck、strict lint2721文件0error/0warning/0info、docs809/4265链接/249任务0问题通过。
只读独立review accept：卡片与详情点击不写onChange、最后步骤三层删除保护未变、
无schema/正文/调度变化。此次未重复此前10,706项全量测试，不将专项写成全量。

63b2a951已ff-only更新main，6012原PID88523持续运行；没有手动重载，Vite更新后重新选择e56。
Root实际打开交互“触发行为2”：一张步骤1卡、18指令、首次/下次复读/详情均可见；
实际详情最后删除disabled，关闭后保存仍disabled，未改作者数据。
截图 `build/e2e/single-step-card-6012.jpg`。本续修技术accept，仍review等待用户形态体验。
最小用户复验：6012→s003→e56→交互脚本→触发行为2，看单张完整卡；点步骤详情应可打开且
删除步骤禁用，关闭后仍一张卡。无需重复002/003剧情，也无需用户替Agent跑技术测试。

## e56自动行为只读结论（2026-10-01）

当前s003/e56有7套auto定义，但默认Page并不选择auto（`s003.json:835–855`实体定义），
剧情正文显式select后才启用。同实体当前只选择一套auto，`main.ts:3807–3849`单activation运行；
auto在运行时是独立后台通道，不是只允许巡逻的类型约束。7套数量不证明7条并行巡逻或即时剧情错误。
6套stages都是moveEntity有限路线并显式complete（legacy-004另隐藏），另一套legacy-006是
一次性剧情走位的逐拍状态机；不存在应让作者维护的7套日常巡逻。

可直接证实的内容债：legacy-006共46状态，其中24 nudge/24 anim、12空衔接节点；
末尾名为completed，但body=[]、next stay（`s003.json:2592–2598`）。
`script-runner-core.ts:256–290`因此提交普通state游标，`script-project-core.ts:401`的正式完成门不命中，
`main.ts:3841–3849`仍空轮询，不重放整段走位。Root及独立审查者均直接核此调用域。
这不是本轮UI修复已解决的内容问题；不借正常002/003passed宣称作者编排合理化完成。

用户希望自动行为承担巡逻等日常行为。后续作者重写应把一次性走位归入可读剧情编排，
明确与对白同时进行的后台启动、等待及接管/归还，保留真实演出与跨场景取消边界；
不能仅把状态改名步骤、直接删除仍有入点的方案，或机械塞入前台导致对白等待NPC走完。
本轮只修单步骤显示、诊断e56，不新增parallel/join、第三套作者状态模型或恢复迁移核。

独立全调用域审计与Root复核：auto6负责002下楼；go-to-kitchen负责003进厨房/换s001/e19；
legacy-005/001由苗人后期战斗交互启动，分别赶来/走近倒下苗人；legacy-002/003/004由e68夜间
灵儿剧情启动，分别进房/靠近/退场。当前不是7套巡逻，没有无引用就可随手删除的方案。
18处cursorHandoff均不涉及e56；e56无take/release/暂停/页切换引用。后期路线未新跑视觉，
不凭静态路线直接宣称画面错误；004厨房e19持续朝向counter也不是这7套并发导致。

用户追问初次方案到门口道士的可读性：实际链为
default接客正文第21条（s003:1032）选auto/legacy-006，前台继续苗人对白；
auto6的outro-05（:3505）才选e56/trigger/greet-after-guests；
greet正文第4条（:1448）起后台去厨房、第5条（:1460）才选e62/trigger/beggar-first-talk。
default的next只是本方案复读，不负责上述跨方案切换；auto6也不直接选择道士本人。
关键故事选择混入NPC后台走位确实使作者无法只看交互正文追踪故事，不是作者没找到步骤设置。

原因与边界：当前moveEntity会等待目标到点，auto独立运行允许对白/玩家行动时NPC继续走位。
后台动作需求存在，但不证明7套无语义命名的auto容器或46状态形态必须保留。
建议交互正文明确承担故事推进及下一方案选择，背景动作承担受控走位并显式说明启动/等待/取消与
实体接管；日常auto用于巡逻/待机。改动须核真实完成时点、前台控制恢复、save/cancel，
不能仅机械搬到阻塞前台或新增全局NPC冻结；本轮只分析，不已实现该作者编排改造。

## 步骤列表标题续修（2026-10-01）

用户追加同一续修：标题应为“步骤列表”，数量和问号按现有“脚本方案”紧随左侧标题，
新建按钮独立在右。Root核到全局`.script-section-heading`后置space-between，加上本flow的
`flex:1 1 480px`使3个子项均匀拉开；方案标题因本组未伸长未暴露问题。
build allowed最小局部修flow标题组不伸长/左对齐、用既有gap，改标题/帮助/保留一步提示中文。
不改全局reference标题布局、不增加新控件、作者数据/调度不变；入口含实体及scene-hook一并回归。

标题入口4项真红/36绿，最终UI/实体/scene-hook/session四文件70项绿；全7包typecheck及
strict lint2721文件0/0/0、docs0问题通过。独立review发现共享actions的margin会影响非header整理提示，
收窄到`.canonical-flow-explanation > .canonical-flow-actions`后accept，原counter闭合。
d01d60d4已ff-only到main，原6012 PID未停；Root实际选择单步骤方案，标题“步骤列表”、数量与问号
均靠左，新建右侧。真实DOM矩形测量：方案标题与步骤标题的title→count、count→help均8px，
并目视 `build/e2e/step-list-heading-6012.jpg`；窄屏仅核源码wrap条件，未冒充窄屏实测。
本轮没有新增资源/schema/调度/作者JSON修改；单卡和标题技术accept，review等待用户体验。
最小复验仍沿s003/e56交互/触发行为2，只需看单卡及“步骤列表”标题组是否与上方方案标题一致。

## 下一位 Agent 提示词

无用户转交提示词；Root实现与整体验收，内部专项只读审查；完成后等待用户体验验收。
