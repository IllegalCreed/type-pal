# GLM 大批工作包（二）：剩余边界取证与回归准备

Revision：r1，2026-09-14。分配/接收复核：Codex；执行：GLM。
范围：六组72个检查点，**不是72个bug、不是72条必须新增的测试**。状态：已分配，尚未提交结果。
产品冻结：`70e3f62770bbe0a23c4b9d90c31258a3d2883772`；分配前main为`e1ed64f964f48cfc84bcecd1602c2259732bf21f`，packages/scripts零diff。
从**本工作包落盘提交**建立独立分支`codex/glm-pre-e2e-boundary-batch-2`；转交提示词给出该提交完整SHA，不猜起点、不合入后续主线实现。
产出：[整批回执](glm-pre-e2e-boundary-batch-2-report.md)。用户要求给GLM一大批可连续完成的工作；Codex保留主线实现、视觉、正式回归集成及统一质量门。

## 为什么是这一批

- 前一批44项中的历史/引用/上传/预览缓存已经取证接收；D-01已done，本包**不重复那批全量审计、不重开历史签字**。
- 此次向前准备B-05～09/U-02、C-01～05、A-08/09、E-05及检查点导出钩子；补合法输入、相邻分支、业务断言和反例鉴别力。
- 用户已允许审计/对账直接推进。本包仅为**卡前只读取证、可运行诊断和回归设计**；不是实现卡，不能据此改产品、正式测试或基线。
  拟转正式测试须由Codex复核，纳入对应修复卡取得准入后再移入packages；本批自身不增加官方覆盖率、不宣称缺陷已修。
- 尤其不让GLM修改存档/迁移/关键公式的高风险实现；也不把“同一作者自测”当独立终审。采用本包材料必须披露GLM贡献。

## 工作节奏与交付边界

1. 接手先读AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本包、[审计总收口](../ops/audits/pre-e2e/summary.md)及各组指定一手文件。
2. 核固定起点和干净工作树，独立worktree执行。不要恢复stash、reset旧分支、覆写同名目录，亦不把gitignored资产加入Git。
3. 顺序A→B→C→D→E→F；每组独立提交、可先推送供Codex读取，随后自行继续，不逐小组请求“继续”。最后统一交一份完整回执。
4. 一项有具体阻断时写出缺什么/已经尝试什么/如何证伪，继续其它独立项。无法复现必须risk/blocked，不能用静态怀疑凑reproduced。
5. 只做非视觉验证。不启动浏览器、不截图/录屏、不判断布局/图像/音色，不跑完整剧情或完整通关E2E。
   允许Node/Vitest/Vite middleware中的真实模块与无显示宿主；Canvas可作边界桩但其输出不作为视觉事实。
6. 不运行全仓check/full/fast/ratchet，不部署、不联网取用户数据、不访问真实浏览器存储。定向既有测试串行运行；临时配置/覆盖输出只进本人tmp目录，不写仓库coverage。
7. 不能改本工作包、其他任务卡、历史回执、旧探针、正式配置或统一看板。只改下方白名单，所有报告数字从最终树/日志生成。

## 六组清单

原审计行号仅作检索起点。所有关键结论必须重锚到冻结树file:line；不从旧报告直接宣布“当前仍坏”。

### A · 世界异步提交与取消（12项）

归属B-05/B-08/B-09；先读[世界/脚本审计](../ops/audits/pre-e2e/world-lifecycle.md)。
锚点：`reforge/src/script-project-core.ts:199-249`、`script-host-adapter.ts:154-156`、`scene-switch-transaction.ts:20-68`、
`runtime-project-view.ts`、`main.ts`的prepareSceneSwitch/assertSceneSwitchPlanCurrent/reloadMap，及runtime-script-project/scene-switch-transaction既有测试。

| ID | 必须核的边界 |
|---|---|
| A01 | 当前场景换图成功：现场可观测状态、canonical覆写、保存快照一致 |
| A02 | 同输入只将资源预载改失败：失败之后三者状态、通知次数和可重试性 |
| A03 | 当前场景换图预载entered后取消：取消前后覆写/现场/快照，不把已提交撤销当未提交取消 |
| A04 | 显式其它scene覆写正控：与当前场景预载路径区分，不误要求所有覆写都加载现场 |
| A05 | entry准备等待期间通过真实selector改变目标onEnter选择，追到真实preflight/reveal契约 |
| A06 | 同一时序但选择/entry不变正控，不能把全部并发变化一律拒绝 |
| A07 | 目标hook选择的use/disabled/inherit实际消费域，签名/entry变化分别分类 |
| A08 | 无关money/flag变化与真正依赖变化对照：不能通过扩大任意变更失效来掩盖遗漏 |
| A09 | selectSceneHooks真实await resolver后、提交前abort，比较canonical和通知而非只看AbortError |
| A10 | selectEntityBehavior同类异步边界，合法entity/behavior输入及不取消正控 |
| A11 | selectEntityPage同类边界，页面选择与既有cursor/lease的影响分栏 |
| A12 | setEntityTriggerActivation同类边界；取消已生效/提交后取消两种时点不可混称 |

### B · 保存等待关系、旧活动收尾与检查点导出（12项）

归属B-06/B-07/U-02及已登记Q1 dumpSave误接；先读世界审计和总收口“审计后实现期追加”。
锚点：`runtime-script-project.ts:338-374/447`、`script-activity-lineage.ts`、`script-project-core.ts:269`、
`main.ts`的runDetachedScriptChain/startScript/teleportOut/captureCurrentSavePayload/debug dumpSave注册、`save/ops.ts`。

| ID | 必须核的边界 |
|---|---|
| B01 | confirm未回答→真实允许的保存请求→yes后开战，核父子lineage、snapshot调用及谁等待谁 |
| B02 | 同流程不请求保存的合法正控；同runtime/exact-signal已保护的子链对照 |
| B03 | confirm→保存→内联onTeleport，核新hook lease与父活动关系，不拿B01代证此分支 |
| B04 | confirm回答no/流程结束时的保存完成正控；不把所有确认框列为死锁 |
| B05 | 有界超时的错误、gate释放及后续重试；明确生产10000ms与诊断虚拟时间的区别 |
| B06 | 取消父/子活动时barrier收尾：快照次数、活动数、错误归属和后续合法保存 |
| B07 | U-02所有真实detached入口census，哪些能在取消旧链后启动新活动，静态和动态分栏 |
| B08 | 合法旧链取消→旧Promise未finally→新交互取得权威的可达反例；不允许忽略signal的fake invoke |
| B09 | 旧finally执行后的新权威、挂载、游标和auto-save/drain；未拿到B08前只可risk |
| B10 | ownsRunnerSlot=false、autoHost限制与startScript完整身份guard等反向控制，不能只看可疑finally |
| B11 | 真debug注册对象零参dumpSave调用，正式codec校验导出内容；不能直接测builder来证明接线 |
| B12 | 正常capture/F5保存对照与导出→codec→隔离恢复草案；不把错误导出用作合法checkpoint fixture |

### C · 战果写回与回合末终态（12项）

归属C-01/C-04，Q2准备而非Q2实跑。先读[战斗审计](../ops/audits/pre-e2e/battle.md)对应节。
锚点：`reforge/src/battle/battle-core.ts`偷取/养蛊/回合末、`battle-session.ts:2449` writeBackInventory、`battle-result.ts`、main战后调用域。
涉及机制解释先读game-mechanics/phase1-knowledge-harvest对应段；不调整伤害公式、RNG算法或现存PAL内容。

| ID | 必须核的边界 |
|---|---|
| C01 | 初始没有该物品，真实偷取成功→胜利→真实写回，检查战内/世界两份库存 |
| C02 | 同输入偷取→逃跑写回，保留当前“逃跑留偷物”合同 |
| C03 | 初始已有该物品，胜/逃的数量正控，与C01/C02共用同一判定入口 |
| C04 | 消耗已有物品到零，真实写回去零项且无重复ID |
| C05 | 战内新增后又消耗的最终库存，区分净结果与简单追加 |
| C06 | 连续两次偷取同ID/不同ID，明确合并数量和来源，不能仅断言数组非空 |
| C07 | 真实养蛊到期产生新物品，检查原样写回；未完成真实回合链不得冒称九回合E2E |
| C08 | 战败/terminated和main旧战斗取消后的写回域；合法可达性与业务合同不明时risk |
| C09 | 毒杀最后敌人：无需新玩家输入就应结算的正确性草案；原树观察与普通攻击正控 |
| C10 | 回合末玩家死亡的终态边界及后续空步，不能只测敌HP=0 |
| C11 | 同轮双方死亡/毒后恢复的执行顺序和当前明确合同；有歧义只登记待裁决，不发明优先规则 |
| C12 | 重复step/结果读取不会重复累计奖励，敌逃无奖励对照；库存保存重开所需的R4/Q2断言 |

### D · 目标、附带效果与菜单的业务可达性（12项）

归属C-02/C-03/C-05；锚点：`content/src/enemy.ts`、`skill.ts`及validateSkills，
`reforge/src/battle/battle-core.ts`敌物攻附带/目标集合/复活，`battle-session.ts`usableItems/throwableItems及实际按键路由。
只核状态/MP/库存/菜单状态机，渲染和声音不在GLM域。

| ID | 必须核的边界 |
|---|---|
| D01 | 两道概率门确实通过的敌附带applyPoison正控，见证分支进入 |
| D02 | 同入口合法附带sleep/封技效果，各看实际状态而非日志或方法被调用 |
| D03 | 同物品复合效果（例如healHp负值）逐效果观测；允许效果域不明时给证据与待裁决问题 |
| D04 | 概率失败、毒抗/格挡等当前门禁对照，不能为“覆盖”移除原来正确的保护 |
| D05 | 正式validateSkills接受的普通全队复活，混合生死队伍，核死者HP/MP及实际目标集合 |
| D06 | 同技能单体复活成功对照；不能把PAL现有单体还魂咒写成失效 |
| D07 | 普通全队治疗/无人死亡的对照，不能通过让所有效果忽略死亡状态来掩盖复活遗漏 |
| D08 | MP不足、复合效果目标需求及合体技边界分类；不把普通技能证据外推合体技 |
| D09 | 仅可投掷物品，实际道具菜单父→子按键路由与W快捷键正控 |
| D10 | 仅可使用物品的同键序正控，不比较不同输入序列后猜根因 |
| D11 | 使用/投掷都有及两者都无，父能力并集与子能力各自门控 |
| D12 | 前一队员预占最后一件后的真实菜单状态/取消预占恢复，不只读静态库存 |

### E · 迁移防护与旧接口退役范围（12项）

归属A-08/A-09/E-05，N6b前准备，不运行真实迁移CLI。先读[数据安全台账](../ops/audits/pre-e2e/README.md#A-08--计划检查到事务采样之间仍有并发写窗口)与[工程审计](../ops/audits/pre-e2e/engineering.md)。
锚点：`migrate/src/migration-plan.ts`、`migration-project-io.ts`、`migration-write-plan.ts`、`migration-transaction.ts`、`pal-assets.ts`；
`translate-events.ts`当前producer调用；`reforge/src/battle/battle-core.ts`的dense enemies、`battle-anim.ts`旧targetIdx/damage入口。

| ID | 必须核的边界 |
|---|---|
| E01 | 无并发修改的真实planner→snapshot→changes→commit正控，输入/输出/hash对应 |
| E02 | 快照复核之后、journal采样之前作者修改：同输入单点时序，保留外部新字节见证 |
| E03 | journal已建立后的修改已有守卫正控，区分保护阶段，不能笼统宣布“无并发保护” |
| E04 | 新建/修改/删除计划各自precondition来源，以及失败后的恢复数据/零额外写入边界 |
| E05 | 无symlink的物化正控、authored资源跳过和hash校验边界 |
| E06 | 目标父目录symlink：在内存或本人临时根内部构造“项目外”目标，核所有实际写入路径 |
| E07 | 多层父链、目标文件自身链接/链接变化的可达域；不把字符串resolve当真实路径验证 |
| E08 | symlink失败是否发生在第一笔二进制写入前，以及后续JSON事务是否可能兜底；无主仓写入 |
| E09 | dense enemies旧入口全caller census：生产/测试/脚本分别列，保留enemySlots当前语义的迁移草案 |
| E10 | battle-anim旧targetIdx/damage入口全caller与hits正控，保留所有原业务断言的替换计划 |
| E11 | translate-events历史输出选项与当前PAL producer输入/输出分栏，是否存在获准真实调用方 |
| E12 | 明确不得删的当前局部格式/ScriptRef/来源标签/平台升级合同；给删除候选最小白名单与验证计划，不实际删除 |

### F · 七包覆盖率缺口与优先回归清单（12项）

读取[覆盖率合同](coverage.md)、`scripts/coverage/config.mjs`/baseline.fast.json和同冻结产品的报告。
此组七包只是代码/测试输入与覆盖缺口盘点，**不混用两阶段机制**，不更改第一阶段产品、公式或资源。

| ID | 必须核的边界 |
|---|---|
| F01 | shared：解码器/解析器测试的缺失输入、边界值和零断言风险，选最值得补的候选 |
| F02 | content：验证器/纯规则未覆盖分支与真实合法/非法输入，避免把类型外不可能值全算优先用例 |
| F03 | pal-extract：fast与PAL真实资产组的覆盖差异，低fast不等于无测试；缺输入合同单列 |
| F04 | migrate：unit与PAL组差异、计划/发布/物化的高风险未命中候选，不重跑官方全套或写盘CLI |
| F05 | reforge：脚本/恢复/战斗边界最值得补的测试，与A～D去重，不重复计算同一缺口 |
| F06 | editor：D-01之后未覆盖的命令/身份/加载边界，排除已done任务重复矩阵；D-06/D-07列后续归属不修 |
| F07 | game：普通unit、headless集成、PAL资源组的差异，列非视觉高价值测试；不把一阶段缺口阻断全部R4 |
| F08 | 对F01～F07各选最多5个高价值文件、至少说明最高优先的真实调用点；不只按百分比排序 |
| F09 | 对每包最有价值的最多3个候选给可实施用例：fixture、操作、业务断言、故障/反控、运行命令与预期归属 |
| F10 | 定向抽查早return/空样本/条件断言/整文件ts-nocheck等风险；必须动态举证或标静态候选，不按grep命中计bug |
| F11 | 分支classified表区分可达待测、重叠守卫、结构约束和待证；“很难构造”不等于不可达，全部仍在分母 |
| F12 | 统一去重和顺序：本包结果按近期修复、Q2、N6b、第一阶段独立批分流，不发明“先补到90%才准跑任何E2E”门槛 |

## 一手证据与测试质量要求

- 旧探针只读：`probe-canonical-async.mjs`、`probe-scene-preflight.mjs`、`probe-battle-core.mjs`、`probe-battle-session.mjs`、`probe-migration-boundaries.mjs`等。
  已复现项无需从零重写算法；重点补本清单缺失的相邻组合。新诊断必须调用真实实现，AST提取保留原函数体并以唯一锚点检验；禁止手抄“等价”业务算法。
- 真实loader/validator确认fixture合法；正负用例应来自同一fresh fixture构造器。注入必须有entered/调用次数等见证；同输入关闭故障应成功。
- 真实异步边界用entered/deferred或受控时钟，不以固定sleep/多跑几次赌竞态；检查状态、所有权、IO/写回，而非只检查reject/toast/log/计数大于零。
- 允许mock文件源、资源I/O、时钟等宿主，不mock被审的选择、事务、目标过滤、写回、引用身份策略本身。
  主壳AST如依赖替身必须列明；不能据局部函数宣称完整bootstrap/E2E通过。
- 已证缺陷：同时给“原树错误特征”观察与**期望正确行为的回归草案**；后一模式应真实exit1并定位业务assert，不用test.fails/skip/only、catch吞断言或条件if跳过。
  正常已覆盖的用例应exit0，空用例/0断言不能报covered。退出码1若是导入、收集、缺资产、类型或配置问题，只算环境失败。
- A～E新诊断提供`--mode=observe|contract`及按检查点选择的`--case ID`，两模式共用fixture/真实调用，只改变观察判定。
  observe必须先断言合法输入、故障确已注入、等待点真实进入和完成信号；前提失败直接报错，不得改判covered。
  contract对已确认合同作正确行为assert，原树缺陷应业务红；尚无明确合同的case明报不可执行/待裁决，不能臆造期望或零断言exit0。
- A～E每组至少选一个最高优先的已证动态项验证判定有鉴别力：可用隔离内存单点反控/最小修复见证，明确改了哪唯一锚点、正控/原树/对照的结果。
  这是临时证据，不是产品修复；不得修改磁盘产品或把临时变换作为隐藏依赖。没有有效靶点时说明原因，不能伪造。
- Vitest/provider按仓库锁定4.1.7，不照旧技能示例新增coverage.all、ignore注解、宽松阈值或重试。新MJS代码用可理解的JSDoc/结构，不加整文件ts-nocheck规避真实错误。
- 已有coverage/fast结果是可变本机产物：只有先核summary与提交基线一致、相关源码内容与冻结候选一致，才可复制到本人tmp读取。
  缺报告时可做明确标注的单模块定向测量（输出到tmp），不得冒充官方fast/full或把局部并集差额算成新增覆盖；不能写主仓coverage或基线。

## 数据/文件安全

- 不读取或改用户存档、真实IndexedDB/CacheStorage；不运行migrate:content/extract/bake/部署，不改projects/pal、baseline PAL树、data/extracted或原探针。
- E组可用完整合同的内存fs；若验证原生symlink，只能由mktemp创建**本人临时父根**，项目和“项目外”对照目录都在该父根下。
  首次写入前必须校验所有fixture路径属于该根，记录真实路径，绝不把链接目标指向仓库/家目录/其它任务目录。没有安全隔离就blocked。
- 缺gitignored资产时先登记，可只读现有资产或使用合法最小seed；不要通过追踪/复制一大包资产来“修好环境”。文件副作用必须有前后快照和完整写入轨迹，禁止同字节重写被当零IO。
- 所有临时变换、配置和日志标注产品SHA/命令/exit与唯一作用域，结束恢复替身；不要删除失败日志或修改前一轮证据。

## 写入白名单与最终交付

仅允许以下文件（无必要的可选文件不要创建）：

- `docs/testing/glm-pre-e2e-boundary-batch-2-report.md`：本席报告/证据目录/六组回执，Codex接收区不得代填。
- `docs/testing/glm-pre-e2e-boundary-batch-2-evidence.json`：72行机器账，每行唯一ID、分类、源锚点、命令/观察、正控、反控/待证、后续归属。
- `docs/ops/audits/pre-e2e/probe-glm-next-async.mjs`（A）
- `docs/ops/audits/pre-e2e/probe-glm-next-barrier.mjs`（B）
- `docs/ops/audits/pre-e2e/probe-glm-next-battle-result.mjs`（C）
- `docs/ops/audits/pre-e2e/probe-glm-next-battle-actions.mjs`（D）
- `docs/ops/audits/pre-e2e/probe-glm-next-migration.mjs`（E）
- `docs/ops/audits/pre-e2e/probe-glm-next-coverage.mjs`（F，可选）
- `docs/ops/audits/pre-e2e/probe-glm-next-support.mjs`（必要时共用的宿主隔离，不放业务算法）
- `docs/ops/audits/pre-e2e/probe-glm-next.config.mts`（必要时定向Vitest/Vite诊断；不是正式配置）

packages/、scripts/、projects/、data/、reference/、锁文件与全部旧探针相对冻结产品必须零diff。本包/README/任务卡/看板不得由GLM改动。
报告文件已在主线创建并索引，无需另改README；新增证据文件由报告正文链接，不为制造“整洁目录”迁移现有文档。

每个ID最终分类只能是`reproduced | covered | risk | blocked | N/A`之一；未完成时可pending，但最终交接不得藏pending或空行。
72行按唯一ID重算，分类和、组小计、复用测试数、实测新增用例数分栏；F组静态清单不能虚标动态covered。
不要把“不可达”当N/A：需要产品构造/调用域一手证据；否则risk，保留覆盖分母。

最终一次交付：分支/完整SHA/起点、实际diff白名单、72行机器账、六组独立提交、定向命令/退出码/日志、
可转正式回归的最小集合、根因归并和依赖顺序、未测/阻断及明确下一步。正反控需可由仓内入口+冻结树重建，不依赖私人tmp中的唯一源码。
Codex统一复核后决定接收与正式修复卡；GLM不改任务状态、不代签、不标done、不自行转Kimi。

分配时校验：72个唯一ID已机械复算为A～F各12项、无重复/缺号；文档工具20/20与文档链接/索引检查通过。
这些是工作包校验，不是GLM交付结果；当前没有新增产品测试或覆盖率提升声明。

## 给GLM的提示词

```text
在 /Users/zhangxu/illegal/type-pal 执行 docs/testing/glm-pre-e2e-boundary-batch-2.md 的 r1 大批工作包。
固定产品70e3f627；以转交消息指定的本包落盘提交建立独立worktree/分支 codex/glm-pre-e2e-boundary-batch-2，不从后续活跃main取证。
先读AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本包及各组一手锚点，核packages/scripts对冻结产品零diff。
连续完成A～F六组72检查点：异步提交/取消、保存屏障/旧链收尾/导出、战果/终态、目标/附带/菜单、迁移/旧接口、七包覆盖缺口。
这不是重跑上一批44项，也不是72个bug或72条测试。只做卡前取证/可运行诊断与回归草案，不改产品/正式测试/基线，不运行真实迁移、全仓质量门或浏览器/视觉。
每组独立提交后继续；阻断具体登记、继续其他独立项，不逐小组问继续。使用合法fixture、真实调用、entered/deferred和正反控；错误特征exit0与正确合同草案exit1必须分清，环境错不算业务红。
只修改白名单报告/机器账/新诊断，旧探针与历史结论不动，数字从最终树现场生成。最终72行无重复/无空白，提交推送整批并给Codex接收提示词。贡献身份须披露，不代签、不标done、不自行转Kimi。
```
