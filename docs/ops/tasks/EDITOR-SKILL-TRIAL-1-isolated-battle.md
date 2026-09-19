# EDITOR-SKILL-TRIAL-1 - 共享战斗模拟器首批与独立试打

Status: rework
Phase: phase2
Capability: D-04/D-05修复及共享战斗模拟器首批；不启动第三阶段X5
Coding Owner: Codex
Reviewer: Kimi / GLM
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: codex/editor-battle-simulator-r2（准入后建立）

Revision: r2 / 2026-09-19保存裁决后冻结；用户认可草图大方向及两项保存约定，现交两席设计审查。生产冻结`e58834f6389a40ffe9f187e6a8051f552e964d79`；r1三席签字保留为历史，不授权新范围。
用户此前裁决仍保留：**独立临时试玩，不读写正常存档，关闭试放即丢弃测试状态**。
本卡与[GLM六组补测](TEST-RUNTIME-STATE-BOUNDARIES-1-state-and-metadata.md)独立；后者只改新的非视觉测试，Codex只改本卡产品面。
当前仅调整方案，未改产品、正式测试或基线。用户已指出选择开局没有必要，并提出我方/敌方/战场/道具与可保存我方配置的共享战斗模拟器；原小弹窗选项不再等待作答，停止r1实施。

## r2本轮推进（GLM返工期间独立准备）

已将方向收敛为[首批冻结设计](../../testing/battle-simulator-r2-design.md)，包括真实源码四向证据、
四目录字段/继承/覆写、推荐工程内文件、现有保存事务/撤销/重开接入、一次性内存启动协议、10组验收边界。
同任务交互草图已制作；用户在确认“只是示意图、内容不完整”后明确“大方向我觉得没问题”。
据此记录四目录布局/操作流程的大方向通过，不再重复询问；不是逐字段清单或正式产品视觉验收通过。
草图不是实际 BattleSession，也未修改编辑器导航。“本场临时调整”不限技能，技能仅作例子；完整范围以冻结设计为准。

本卡r2首批范围：四类基础配置完整保存/重开→独立真实战斗/结算→技能/敌队共享入口，并接回已有单敌试打入口。
敌方残血/初始毒/状态需新增正式初始化能力，留第二批，不在首版挂无效控件；其他业务页新按钮随后复用。
不把所有拓展升为Q1/Q2的额外门槛。实现后仍须Codex功能视觉验证，草图不抵扣。

用户对再次明确的两项保存方式答复“好的”：①命名预设/方案随工程保存，战斗结果不保存；
②首版先保存工程再试打，本场临时调整不必另存预设。保存方式和草图方向均不再重问。
这不是r2三签豁免；本轮冻结设计并交并行审查，**没有改产品或正式测试**。

### build前（r2冻结设计，独立于下方r1历史签字）

- Codex：**premise verified / design agree（2026-09-19，r2保存裁决后冻结，生产e58834f6）**。
  本人核验SkillTab/main入口与保存路径、character实例/装备派生、battle-core:322和battle-session:418初始化时序；
  读author-disk-baseline:60/85/120/185实际字节基线及新路径缺席校验、project-io:153准备写集验证/:372身份域保护、
  open-local:37稳定读取与export-zip:66/93完整树备份。入口缺陷归编辑器/宿主，不归迁移；新配置加入原作者事务/历史，
  不写受保护身份域，不建普通或特殊前缀SaveStore。共用正式BattleSession/派生/结算且只写临时world；
  首批不靠事后改私有敌状态假装支持残血/毒。用户保存/隔离/界面方向已明确，技术边界见附件V1～V10。
  可证伪观察：附属配置绕过磁盘基线/准备写集校验；握手失败回落普通boot；试打正常槽IO非零；
  正常战斗提取后行为改变；本场调整反写原预设；缺真实敌队仍返回胜利。任一出现即counter，不用mock/覆盖率代替业务验证。
  本轮复跑原前提探针exit0：scene=start、sessions=0却victory；savedAfterMaxMP=999、savedTrialSkill=true、
  authorInputUnchanged=true。证明修复前提仍成立，不宣称新模拟器已实现。文档工具20项通过；任务更名触发索引不同步，
  按生成器输出同步唯一对应行后重跑文档检查；不忽略该失败、不改变门禁。
- Kimi：pending。
- GLM：pending。
- build准入：关闭，等待Kimi/GLM各自r2前提与设计签字；不改Status为build，不借他卡签字或把草图当产品实现。

## 方向讨论记录（历史，现由上方r2冻结设计收敛）

用户提出：灵活配置我方成员、技能、装备、等级、数值，以及敌方成员；保存多套我方配置，避免每次重配。
技能、敌队、战场以及可以在战斗中使用或投掷的道具等编辑入口，应复用同一个战斗模拟器，而不是各建一套试打。
本次是产品方向讨论与旧方案修订；并未授权一次实现所有高级调试功能，也未决定预设文件格式/存储位置或新页面形态。

用户随后要求整体评估所有战斗相关模块。已完成[8模块27子页复用评估](../../testing/battle-simulator-assessment.md)：
7个直接入口、8个上下文入口/配置来源、12个保留专用验证；逐项列出可验证边界、我方预设/试打方案、三批接入与N6b/Q2依赖。
这些是建议范围，不是已获实施授权或已完成视觉验收；不把世界专用物品、剧情结局、场景遇敌全流程冒称战斗模拟器覆盖。

2026-09-19继续细化：用户认可共享方向，并要求明确双方可预设字段和专用编辑模块；评估附件已补
逐字段来源与高级项、继承/覆写/派生规则、保存与依赖告警。用户随后指出“试打”应是方案页按钮，并询问独立一级模块与道具配置归属。
修订建议为独立一级“战斗模拟器”，四个目录“我方预设/敌方预设/背包预设/试打方案”；取消独立试打管理页。
背包只存物品与数量、测试金钱归方案，不再在我方预设重复保存；从业务页进入临时方案，不强迫先建立四份记录。用户已认可对应草图的大方向，保存政策仍待确认。
用户随后认可各业务页“选完整试打方案→明确显示本场对象调整→开始试打/进入详细配置”的快速启动方向；
详见评估附件新增接入节。仅临时加技能/物品/替换战场等，不改原预设、不绕规则；未保存内容策略和完整r2准入仍未完成。
其中敌方无我方装备/真气池、初始敌血/状态需新适配、初始状态不等于事件触发等均已查当前类型/构造器；
这些仍是r2产品设计建议，不视为用户逐字段/UI或持久化方案批准，不在本轮实施。

建议的责任划分：

- 编辑器提供统一配置界面：我方队伍（成员/技能/装备/等级/基础数值）、敌方队伍、战场、测试背包（道具与数量）。
  业务页只预填本页对象：技能→待试技能；敌队→当前敌队；战场→当前战场；道具→当前道具及使用/投掷目的。
  角色/装备等入口按同一协议扩展，不复制运行逻辑。此为接入方向，首批入口清单待r2划定。
- 实际试打仍使用第二阶段现有BattleSession、装备派生、技能/道具使用与投掷路径，不另造简化伤害模型。
  不依赖开局入口、地图落点或场景onEnter来制造队伍；缺角色/敌队/战场等真实条件应明确校验，不假报胜利。
- 试打状态始终临时；只在用户显式“保存预设”时保存测试配置，不保存这场战斗的消耗/奖励/进度。
  我方预设与本次敌队/战场选择分开，使一套我方配置能测试多个对象。建议按工程隔离预设；是否随工程携带尚待方案明确。
- 测试覆写不得写回角色、装备、技能或道具的正式定义，也不得读写正常游戏存档。
  自动带入所选技能/道具要在配置里可见；不沿用r1默默拉MP至999的策略作为通用模拟器默认。
- UI应有足够配置空间；独立一级“战斗模拟器”及四个目录页、方案内执行试打的草图大方向已获认可，不把小弹窗逐层堆大；本轮不直接修改导航。

当前一手核验（Codex）：

| 事实面 | 核验与含义 |
|---|---|
| 原版/primary source | 原版无创作战斗模拟器，N/A；用户当前配置/复用诉求为产品来源，不变更原版战斗公式 |
| 第一阶段 | 战斗运行与UI知识仍按既有harvest/正式战斗系统复用；本轮没有为模拟器另定一套战斗规则 |
| 当前二阶段入口 | SkillTab.tsx:1118写死s001/0；EnemyTeamTab.tsx:414与EnemyTab.tsx:910各自拼battle链接；BattleFieldTab.tsx:323附近只有删除动作和静态预览，不能冒称已有模拟器入口 |
| 当前二阶段角色 | content/character.ts:138的StartWorld仅角色ID/资源及有限seed覆写，不是完整测试配装；:187的CharacterInstance与actor.ts:80起的BattlerSpec有等级/基础数值/装备/初始技能；instantiate(:252)复制baseStats，不按修改后的level自动推导属性 |
| 当前战斗消费 | reforge/main.ts:2280起从实例派生装备属性/有效技能；battle-session.ts:670–686分别筛选战斗可用/可投掷道具，之后走真实选择/执行。适合共享入口，不代表这些路径已经完成全量Q2验收 |
| r2目标 | 独立配置→真实战斗→丢弃本次状态；不同编辑页带入测试对象；显式保存可复用我方预设。无开局入口选择，具体持久化和UI待定 |

需要在r2解决而不能猜的点：预设存储/跨工程身份与资源引用失效、等级与数值/装备加成的关系（尤其N6b成长配置尚未完成）、
敌方临时成员编辑的界限、测试背包与使用/投掷合法性、首批接入范围与未保存工程读取合同。
是否需要工程模型/版本调整取决于预设落盘设计，不能继续沿用r1“无需版本升级”的结论。
最强替代方案是先只修旧技能入口，但它不满足本次多入口复用与预设诉求；在范围/成本比较完成前，不先实施一个随后弃用的小弹窗。
反证条件：若某配置不能经正式战斗输入表达，或必须写回作者定义/正常存档才可运行，停下重新设计，不用旁路模拟器假装覆盖。

本卡转rework，旧r1三签原文保留，但不能授权r2；先形成新方案与UI草图，再按范围变化核新准入。GLM独立补测卡继续build，不受影响。

## r1历史方案（下列原设计/签字保留，不再作为实施授权）

## 目标 / before→after

`固定PAL场景/敌队，可能桩胜；临时授技进入普通保存链 → 选择本工程真实入口/敌队，进入独立临时真实战斗；不建正常存档存储，退出后无持久改动。`
代表场景：自有工程只有start和自建敌队wolves，从当前技能试放；不得寻找s001/敌队0、不得用缺数据胜利提示代替战斗。
用户保存隔离方向已批准；拟采用的小弹窗是独立试买现有形态的复用，不新增完整前置状态编辑器。

## 前提真值门

| 维度 | 一手事实 / 目标 |
|---|---|
| 原版 / primary source | 原版没有创作编辑器的技能试放，N/A；本卡不改战斗公式/原版演出规则。当前源码和用户“不读写正常存档”裁决为直接真源 |
| 第一阶段 | 战斗展示沿用现行BattleSession对已有战斗菜单/资产约定的实现；不新设计战斗菜单、帧坐标、速度或音效公式。harvest X7/X8的异步收口教训适用 |
| 当前二阶段入口 | SkillTab.tsx:1117-1118写死scene=s001&battle=0&skill；已有SkillTab.test.tsx:257-275也把该链接当期望；seed未声明enemyTeams，场景只有start |
| 当前二阶段执行 | main.ts:2220-2253 startBattleBody缺敌队返回victory，未创建session；真实构造在:2473，tick/render在:6473-6474；临时授技:7021-7032写world |
| 当前保存 | main.ts:590构造正常SaveStore；:6843附近预读metas；:5612 doSave、:5817 quickSave共用当前world；正常脚本loadLastSave、F5/F9/菜单/auto均有正式保存入口 |
| 当前可复用边界 | shop-trial.ts:17/38及main.ts:355-359在普通世界/SaveStore之前分流；BattleSession.done/cancel/tick/render提供独立会话生命周期（battle-session.ts:341/:636/:644/:1191/:2543） |
| 目标 | 独立试放在普通boot之前早分流；不进入标题读档/SaveStore初始化/元数据预读/探索循环/自动存档，真实BattleSession承担施法，不另写战斗核 |

可重建前提：[skill-trial-premise.mjs](../../testing/skill-trial-premise.mjs)，
`node --import tsx docs/testing/skill-trial-premise.mjs`。
Codex本树实测：空白seed补入所选合法技能后通过正式loadCurrentProjectFrom，敌队表为空；真实SkillTab SSR链接仍s001/0，
实际场景回退start、startBattleBody返回victory且session构造次数0。
同一world真实quickSave→临时授技→真实quickSave，隔离MemorySaveStore的maxMP从0变999且含所选技能；原作者角色数据不变。
探针只更新了当前调用API，不改原审计probe；只用内存存储、idle barrier/缩略图边界替身，无真实数据库/网络/工程写入，不冒称完整浏览器流程。
初版probe漏必需animation被guard拒绝；第二版误认seed有空敌队数组，改为核实其可选表缺席；第三版上述结果通过。
日志`/tmp/type-pal-next-dual.RszK0r/skill-trial-premise*.log`。相邻SkillTab/play-url/play-workspace/load-play-project四文件45项绿。

### 替代解释与可证伪观察

- “仅场景名错误”不足：现行selector已回退start，真正缺的是敌队0，构造计数0证实没有战斗。
- “只改作者项目而非存档”不成立：作者输入确实不变，但真实quickSave链能把临时world写入同scope内存槽。
- “已被工作区隔离解决”不成立：同一个工作区的正常进度与当前试放仍共用SaveScope；另一个workspace不互串不能代替本项隔离。
- “迁移/解码问题”排除：空白seed与合法技能同样复现，不需要PAL提取资源；不能靠改projects/pal或新生成一个默认敌队修此入口。
- 推翻前提的观察：当前正式入口已从本工程选非空敌队且实际构造session；或试放无法抵达普通保存链。发生则停线重核，不机械套本方案。

## Draft设计（待三席准入）

### 1. 编辑器只配置本次入口

拟沿用独立试买的DsDialog/标准表单：当前技能只读；开局入口DsSelect默认manifest.defaultEntryId；敌队DsSelect仅列本工程非空合法队伍，
唯一候选可默认选中、多候选要求明确选择。保持“战斗中试放”术语和原位置，不在侧栏常驻新增大编辑器。
缺入口/队伍/技能/队长或所需战斗数据时明确提示去相应目录补齐；不造PAL默认/猜地图中心、不返回桩胜。
沿用“先保存再试玩”：打开与提交时分别复核主/脚本dirty、技能身份、入口/敌队是否仍存在；未保存的内存改动不冒充试放磁盘版本。
入口形式候选小样：`技能（只读） / 开局入口（选择） / 敌队（选择） / 提示：本次状态不保存 / 取消、开始试放`。
具体UI选择待用户答复；如果改为试放页选择，先更新本段再核设计，不偷偷替换形态。

### 2. 严格独立模式，不伪装成普通试玩

同源play页继续使用现有project/workspace/save-workspace身份读取已保存工程，不改句柄授权/跨项目隔离。
建议URL只含现有身份参数及`skill-trial=<SkillId>&entry=<EntryId>&battle=<EnemyTeamId>`。
参数重复、缺值、未知ID、混合menu/scene/pos/party/give/debug/field/shop-trial/battle-scene等模式在副作用前拒绝；ID按原值查表，不能parseInt或trim成另一个身份。
普通`?battle`试打合同不扩大；旧`?skill`临时授技捷径退役并给出重新从编辑器打开的提示，不留静默授技兼容通路。
main在创建正常SaveStore、读metas、开标题/普通世界之前分流到私有`runSkillTrial`并return。
**不新建普通或“特殊前缀”的持久存档槽，也不靠写入后恢复原档。** 试放宿主不构造IndexedDbSaveStore/MemorySaveStore，不注册正常save/load/DEV checkpoint出口。
本地工程读取句柄所需的editor IndexedDB访问仍允许；禁止的是正常游戏存档库/槽IO，不能把这两种数据库混为一谈。

### 3. 复用真实战斗，独立拥有临时状态

基于所选入口startWorld经现有buildWorld生成全新world；仅在临时副本授当前技能、提高队长MP供试放（至少沿用999并足够所选MP成本）。
不自动给全技能/金钱/物品、不改其他成本或技能可用条件；其他条件不足由真实战斗反馈，不伪造成功。
选择入口场景仅用于其当前静态战场/音乐配置，不启动场景onEnter、auto、敌对接触或探索逻辑；不依赖落点坐标、也不执行战后剧情和持久奖励回写。
使用既有BattleSession与正式战斗输入/render/资源readiness，选中技能必须能通过真实施法路径作用于实际目标。
允许**最小内部提取**main现有world→CreatePlayerInput构造到`battle/battle-player-input.ts`，正常战斗与试放共用，保持装备/状态/身份/技能组合的既有计算。
资源准备复用既有prepareBattleSpriteReadiness、collectBattleBaseSounds/collectTurnActionSounds、collectBattleSkillFireChunks及公开加载器；
如需共享编排只提取当前必要准备段，不复制伤害/AI/结算算法、不整体拆main、不顺带修Q2。
试放不调用正常world奖励/存档收尾；胜败/逃跑只结束此试放并显示结束状态，不转入普通探索或标题读档。

### 4. 生命周期与资源边界

独立AbortController、rAF/输入/可见性与音频所有权；准备中/战斗中/pagehide/错误/正常结束走同一幂等收尾。
同一页在一个试放仍活动时重复启动应拒绝，不叠加两个session或让后一个复用前一个的cleanup；不同标签页仍各自独立。
取消后await迟到不得构造session/播放新音乐/提交画面；真实session.cancel处理尚在途readiness。音效可dispose，BGM至少stop取消迟到播放，关闭页由浏览器结束宿主。
复用GameplayClock等已有时序约定，不改帧速；BattleSession的Escape语义保持，试放结束操作与正常战斗菜单取消区分。
F5/F9不能读写进度，明确提示临时模式；不把浏览器刷新或正常保存toast冒充试放存储成功。
加载失败给可关闭/重新发起的错误，不保留半活动session，不改正常存档/项目数据。

## 范围与不做

主要面：editor SkillTab/App最小props接线、试放URL/选择helper/弹窗；reforge main早分流、私有skill-trial宿主、必要的battle-player输入提取与测试。
可能的新文件：editor/core/skill-trial-url.ts、editor/ui/SkillTrialDialog.tsx、reforge/skill-trial.ts及同名测试；无需schema/save/content版本升级。
不改GLM包11个目标生产模块或其新增测试；若实现确需触碰，先停该重叠点并回卡调整，不让两席同改。
不改battle-core/formulas/技能效果语义/战斗菜单布局、迁移器/PAL生成内容/保存格式；不实现X5前置世界变量配置、Q1速胜或Q2整组修复。
普通Debug面板授技仍属显式调试编辑；不借本卡改其存储政策，只更正把它误称“不落档”的相关注释，避免混同独立试放。

## 上下文与验收

- [READ-FIRST](../../phase2/READ-FIRST.md)、[D-04/D-05审计及用户裁决](../audits/pre-e2e/editor-workflows.md)、[已收口存档隔离](../archive/tasks/done/SAVE-ISOLATION-1-project-workspace-save-scope.md)、[世界异步提交](../../testing/world-async-commit.md)。
- [harvest](../../phase2/reference/phase1-knowledge-harvest.md) X7/X8/B仅核现有资源/所有权教训，旧“现状”不当当前事实；本卡不重裁公式/原版怪癖。
- 主/脚本dirty与身份复验参考ShopTab.tsx:178-189；shop-trial.test.ts已有早分流禁止SaveStore的验证模式，需加强为真实新项目/真实BattleSession。

验收必须同时具备：

1. 非PAL项目、非数字ID入口/敌队、单/多选、空缺/悬空/未保存/并发切换；当前SkillTab不再产s001/0固定链接。
2. 合法新项目经正式loader进入真实BattleSession并实际施放选中技能；断言BattleState技能/目标/消耗/效果，不能只看URL、toast或mock构造器次数。
3. 正常项目原始输入/存档预置值深快照不变；试放启动、F5/F9、结束、失败、关闭期间正常SaveStore构造与所有槽IO为0。
   混合URL不得落回正常boot；缺敌队不能走victory桩。normal boot保存/读取与独立试买仍通过。
4. 准备/音效/图像各await的取消、失败、重复收尾、旧回调迟到；会话/监听/rAF不残留，不使用固定sleep代替进入证明。
5. 最小共享玩家输入提取前后真实正常战斗参数完全相同，普通战斗启动/取消/结算回归不下降。
6. Codex最小功能视觉：编辑器保存后打开小弹窗/对应入口→新工程真实战斗选技能→结束；缺条件可见可操作；正常存档未改变。
   剧情全流程与Q2专项不在本卡重复走，新增试放工作流作为R4/编辑器E2E入口登记。
7. 定向/相邻、tc/Biome、必要单点负控，再串行check→ratchet→受保护单次fast。没有视觉证据不得以非视觉测试代验。

## 推进签字

### build前（r1）

- Codex：**premise verified / design agree（2026-09-19，e58834f6，以上提出方案）**。本人直读当前SkillTab/main保存/战斗启动、BattleSession生命周期、shop-trial早分流，复跑当前前提探针与45相邻测试。
  独立存储隔离采用“正常boot前独立宿主return”，不选普通scope换名/保存后回滚；复用真实战斗，不复制公式。可证伪边界见上。
  **UI承载形式仍待用户确认**，三席即使签齐也不据此越过UI产品门；本签不是提前实现授权。
- Kimi：**premise verified / design agree（2026-09-19，r1，冻结 e58834f6；全部证据本人直读/复跑，未读 GLM 结论）**。
  - **入口缺陷直读**：`SkillTab.tsx:1117-1118` 写死 `&scene=s001&battle=0&skill=` 且 title 自称
    「不改存档/项目数据」；`main.ts:2220-2253` 启动链（launchWorld/launchSignal 校验）与
    `:2473` 真实 `new BattleSession` 构造在位；`:353-360` bootGame 在 assertSaveScopeProject 后、
    普通世界/SaveStore 前经 shop-trial 早分流 return（先例核实）。
  - **本人复跑前提探针**（exit 0）：SSR 链接仍 s001/0、实际场景回退 start、battleResult=victory、
    **sessions=0**（无真实战斗=D-04 桩胜）；同一 world 真实 quickSave→临时授技→quickSave，
    savedAfterMaxMP=999、savedTrialSkill=true（临时状态写入同 scope 内存槽=D-05 污染）、
    authorInputUnchanged=true——两前提动态复现，修复层为入口/隔离而非存档格式或迁移。
  - **设计同意**：编辑器仅配置本次入口（dirty/身份双复核、敌队仅列本工程非空合法、缺条件
    明确提示不桩胜）；URL 仅身份+skill-trial/entry/battle 三参、重复/缺值/未知 ID/混合模式
    副作用前拒绝、ID 原值查表；**普通 boot 前早分流到私有 runSkillTrial 并 return**——不构造
    正常 SaveStore、不预读 metas、不进标题，不是写后回滚（优于换名槽）；试放宿主零存档 IO、
    editor IndexedDB 句柄读取与游戏存档库明确分开；真实 BattleSession+最小 battle-player-input
    提取（前后参数等价须证明）不复制公式、不拆 main、不顺带 Q2；独立 AbortController/rAF/
    音频所有权与幂等收尾、取消迟到不构造 session/播曲/交帧、F5/F9 禁读写并明示临时模式。
    旧 `?skill` 临时授技捷径退役给重新打开提示，不留静默兼容通路（铁律 11 合规）。
  - **可证伪观察**（任一反例即 counter 或收窄）：① 当前正式入口已能从本工程选非空敌队并
    实际构造 session → 前提倒（探针否定）；② 隔离宿主仍构造正常 SaveStore 或任何槽 IO>0 →
    设计 2 违反；③ 试放链不经过真实施法路径（toast/URL/mock 构造计数）→ 验收 2 不满足；
    ④ 混合 URL 落回正常 boot 或缺敌队仍走 victory 桩 → 边界破坏；⑤ `?skill` 捷径仍可静默
    到达 → 兼容残留；⑥ battle-player-input 提取前后正常战斗参数不等价 → 提取越界；
    ⑦ **入口 UI 形态未获用户确认即开工** → 门禁破坏。
  - 返工项：无。**入口 UI 形式（沿用独立试买小弹窗）尚待用户确认；本 design agree 不越过
    UI 产品门，不据此开放 build**（与 Codex/GLM 两席保留条件一致）。
- GLM：**premise verified / design agree（2026-09-19，r1，冻结 e58834f6；本席只审数据/存档入口/失败矩阵，未读 Kimi 结论；不做视觉）**。
  - **入口/执行/保存锚点直读**：SkillTab.tsx:1117-1118 确写死 `scene=s001&battle=0&skill=`；
    main.ts:2220-2253 敌队缺席走 victory 桩、:2473 真实 `new BattleSession`、:590 正常 SaveStore 构造、
    :5612/:5817 doSave/quickSave、:355-359 shop-trial 早分流先例、shop-trial.ts:17/38、
    battle/battle-session.ts:341/:636/:644 构造/done-cancel/tick——卡片前提全部一手核实。
  - **前提探针本人复跑**：`node --import tsx docs/testing/skill-trial-premise.mjs` exit0——
    SSR 链接仍 s001/0、实际场景回退 start、battleResult=victory、sessions=0（无真实战斗）；
    同一 world 真实 quickSave 链把临时授技/MP999 写入同 scope 内存槽（savedAfterMaxMP=999、
    trialSkill=true）而作者输入不变——D-04 桩胜与 D-05 存档污染两个前提都动态复现。
  - **design agree（数据/失败矩阵侧）**：普通 boot 之前独立宿主早分流 return（不构造正常 SaveStore/
    不预读 metas/不进标题）优于"保存后回滚"；真实 BattleSession + 最小 battle-player-input 提取
    不复制公式；混合 URL 副作用前拒绝、ID 原值查表不 parseInt；敌队缺失不落 victory 桩。
    失败矩阵（缺入口/队伍/技能/队长、未保存 dirty、悬空 ID、重复启动、取消迟到）与验收 1-5 覆盖
    数据/时序面。**UI 承载形式仍待用户确认——本 design agree 不越过 UI 产品门**。
  - **可证伪观察**：①若当前正式入口已能从本工程选非空敌队并实际构造 session→前提失效；
    ②若隔离宿主仍构造正常 SaveStore/任何槽 IO>0→设计 2 违反；③若试放链不经过真实施法路径
    （只 toast/URL/mock 构造计数）→验收 2 不满足。
  - 返工项：无。
- build准入：**关闭，r2待设计**。三席r1已齐的历史事实保留（Codex原签、GLM 7753f137、Kimi 607b2aa3）；用户当前提出通用战斗模拟器与预设，目标/配置来源/持久化边界改变，原签字不授权新范围。与补测卡独立，不互借签字。

### done前

- Codex：pending。
- Kimi：pending。
- GLM：pending。
- done准入：未开放，不代签。

## 交接日志
- 2026-09-19 Codex：用户答复“好的”，明确两项保存约定；冻结r2首批S1～S4和附件V1～V10，
  本人签premise verified/design agree。核对生产相对e58834f6仍零diff，旧r1不重写。同步发两席独立设计提示词，
  直接落本人签字和日志，视觉仍由Codex承担；当前未开build、不标done、不暂停GLM既有返工。
- 2026-09-19 Codex：用户确认草图是内容不完整的示意图，并认可大方向。记录四目录布局/流程方向通过，
  明确本场调整不限技能；不将此扩大解释为逐字段验收、两项保存政策批准或r2三签豁免。仅更新文档，产品零改。
- 2026-09-19 Codex：用户要求GLM返工同时推进战斗模拟器；同步main至216cf3bb、工作树干净，
  独立核实作者保存/身份保留路径/HTTP缺席合同/角色与敌槽输入。新增r2实施草案与可点击四目录草图，
  未触生产核、GLM候选、测试或基线。持久化推荐`editor/battle-simulator.json`，不写受保护`.type-pal`。
  尚待UI与两项保存选择，r2三席未签，保持rework；无新的Reviewer交接要求，不让GLM停止既有返工。
- 2026-09-19 Codex：用户连续补充共享战斗模拟器方向（我方配置、敌方成员、战场、预存我方配置，以及战斗道具使用/投掷），并指出开局选择意义不大。已停止r1方案并转rework，上方记录新方向、当前入口/模型一手证据及待决边界；不再重复询问旧小弹窗选项。仅改文档，不改产品/版本/覆盖率，未借旧签字扩范围实施。
- 2026-09-19 Codex：用户告知“签了”后同步并核三席r1均premise verified/design agree、无counter，生产核对零漂移。
  入口UI仍无明确答复，已单独询问是否沿用独立试买小弹窗（技能只读、入口/敌队选择、开始试放），不把预选或设计签字当UI裁决；尚未改产品。GLM补测准入独立，不因本项等待而暂停。
- 2026-09-19 Kimi：完成 r1 独立设计/架构审查，签 premise verified + design agree，无返工项。
  直读 SkillTab 写死链接与自称、main 启动链/真实 BattleSession 构造、bootGame shop-trial
  早分流先例；复跑前提探针（sessions=0 桩胜、临时授技写入同 scope 槽污染、作者输入不变）
  ——D-04/D-05 动态复现。七条可证伪观察写入本席；**入口 UI 形式尚待用户确认，本签字不
  越过 UI 产品门、不据此开放 build**。未改产品/他席/状态，未读 GLM 结论。
  Next：UI 形态确认后 Codex 核定 build 并实施；dev-functional 视觉归 Codex。
- 2026-09-19 GLM：完成设计/矩阵审查，签 premise verified + design agree，无返工项。直读
  SkillTab/main 保存与战斗启动锚点；独立复跑前提探针（两缺陷动态复现）。UI 产品门保留待用户。
  未读 Kimi 结论；未改任何实现。Next：三席齐且 UI 形式确认后 Codex 核定 build 并实施。

- 2026-09-19 Codex：用户授权独立临时方案后，同步准备试放修复与GLM大批补测。前提探针已在当前API上复现两问题，初版fixture修正如实登记。
  当前只建draft/落方案，生产/正式测试/基线零改；使用Vitest/pnpm复跑45相邻项，并以Vite SSR只读核当前链接。UI形式问题已异步提出，不把未答当同意。

## 下一位Agent提示词

以下两份可并行转发，均钉 **r2 / 2026-09-19保存裁决后冻结** 与生产 **e58834f6389a40ffe9f187e6a8051f552e964d79**。
只审新范围；已批准的保存方式/界面方向不重问，r1签字保留历史；当前不得开始实现或标记done。

### 给Kimi

在 /Users/zhangxu/illegal/type-pal 审查 EDITOR-SKILL-TRIAL-1 的r2冻结设计，状态rework。
先同步分支、核工作树，再读AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、
docs/ops/tasks/EDITOR-SKILL-TRIAL-1-isolated-battle.md 的r2区及
docs/testing/battle-simulator-r2-design.md；全域评估仅作背景。
同一候选：r2 / 2026-09-19保存裁决后冻结，生产e58834f6389a40ffe9f187e6a8051f552e964d79。
用户已确认四目录草图大方向、预设随工程保存、首版先保存工程再试打；临时调整不必另存，战斗结果不落盘。
独立直读入口/保存/战斗一手链，必要时复跑 node --import tsx docs/testing/skill-trial-premise.mjs。
重点压力测试：编辑器附属文件的版本/基线/准备写集/恢复/另存闭环、共享派生与隔离结算、
一次性内存握手的身份与取消所有权、普通boot前分流且SaveStore零IO、首批与高级敌方初始化分界。
核1～5人支持不能只拿站位表作证、资源惰性读取与工程换代边界、缺条件不得桩胜；不另改战斗公式。
在本卡r2 Kimi席位分别签带直接证据的premise verified和design agree，或写file:line/可证伪反例counter。
不读取/复述GLM结论；只改本人签字/交接日志并提交推送，提交前同步并保留他席修改；不改状态/他席，
不得改产品/正式测试/基线，不得开始实现或标记done；功能视觉归Codex，不要求重复看草图或替代用户验收。

### 给GLM

在 /Users/zhangxu/illegal/type-pal 审查 EDITOR-SKILL-TRIAL-1 的r2冻结设计，状态rework。
先同步分支、核工作树，再读AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、
docs/ops/tasks/EDITOR-SKILL-TRIAL-1-isolated-battle.md 的r2区及
docs/testing/battle-simulator-r2-design.md；全域评估仅作背景。
同一候选：r2 / 2026-09-19保存裁决后冻结，生产e58834f6389a40ffe9f187e6a8051f552e964d79。
用户已确认四目录草图大方向、预设随工程保存、首版先保存工程再试打；临时调整不必另存，战斗结果不落盘。
独立直读真实类型/守卫/保存/运行入口，可复跑 node --import tsx docs/testing/skill-trial-premise.mjs。
重点核四类配置的引用/继承/覆写/零值/空槽/静音、合法装备和物品用途、等级与属性不能混同；
附属文件真正缺席与坏文件区分、基线/事务/恢复/另存/ZIP与悬空引用策略；V1～V10是否能用合法fixture及
真实调用链形成有鉴别力的业务断言，取消用entered/deferred，不靠固定超时或只测URL。
在本卡r2 GLM席位分别签带直接证据的premise verified和design agree，或写file:line/可证伪反例counter。
不读取/复述Kimi结论；只改本人签字/交接日志并提交推送，提交前同步并保留他席修改；不改状态/他席，
不得改产品/正式测试/基线，不得开始实现或标记done；不做浏览器/截图/视觉验证，不使用Mimosa作为本卡门禁。
本次是设计审查，不替换或暂停九批测试返工任务。

### r1历史交接（不再使用）

与[并行补测卡交接区](TEST-RUNTIME-STATE-BOUNDARIES-1-state-and-metadata.md#下一位agent提示词)同发两份完整提示词。
Kimi/GLM独立审本卡r1与冻结e58834f6，各自直接写本人签字/证据/日志并提交推送，不代签、不改状态、不标build/done。
GLM本卡只审设计/矩阵，不修改试放实现；三签齐前Codex不得开始产品实现，UI产品门独立保留。
