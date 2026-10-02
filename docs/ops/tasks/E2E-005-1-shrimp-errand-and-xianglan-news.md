# E2E-005-1 买虾出门与香兰报信

Status: review
Phase: ops
Capability: Q1 / author choreography
Coding Owner: e2e005_runner（执行工具；内容包另核准入）
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: Codex
Visual Verification Timing: e2e-consolidated
Branch: codex/e2e-005

## 目标与范围

用户2026-10-02批准005：真实004结束→回厨房受托买虾→码头鱼嫂、水生叔、张四→回村香兰报信，
止于恢复正常操作。两阶段各自产生真实结束档、正式fresh恢复回验；不继续探病、诊断、求药或出海。
正常story不插取消、复读领奖、存读等专项；独立saves/guards按需要运行。无视频生成，不动6012服务与用户存储。
脚本合理化和实际经过实体/方案/步骤命名属于本段；后期方案不猜名，不恢复转换器。

## 前提真值门

一句话：水生首段切换张四的仙灵岛回应，该回应布防回村报信；买虾委托和鱼嫂补足叙事，非程序硬前置。

| 维度 | 真值与直接证据 |
| --- | --- |
| 原版 | 本机`data/extracted/events/all.json` L741给50，L1528切张四L1436，L1436末尾0x6D[5,903,0]，903香兰报信；L1606鱼嫂无布防 |
| 第一阶段 | `packages/game/src/core/event-system.ts:4493`处理场景override；scene5→村scene4对应脚本操作数6→5，不以内部编号要求二阶段对齐 |
| 当前二阶段 | s001/e19/c8-74bc98f07f8e给50；s005/e124/default选择e123/legacy-001；其selectSceneHooks选择s004 onEnter/legacy-003；s004/e83为香兰，e84为秀兰 |
| 目标 | 用户已确认上述范围；[滚动攻略](../../lore/timeline.md#005-买虾出门与香兰报信)；只允许正常按键/held导航和正式保存恢复，不直写世界或跳剧情 |

最强反例：张四初始闲聊也算成功、仅到达s004便算报信、错误使用004/story作有档前驱、恢复失败落新游戏。
必须完整核实际绘制对白及说话人、布防偏序、钱只增50、报信后的真实可控移动与本引擎存读相等。
导航失败先排工具模型、接近足迹和场景编号；演出失败分别排运行时/原版理解/解码/审计模型，不能据数量直接改迁移。
不主动改变已核剧情或UX。新引擎演出用清楚的显式作者编排，不复活全局对白冻结NPC。

## 上下文锚点

- [CLAUDE](../../../CLAUDE.md)、[二阶段纪律](../../phase2/READ-FIRST.md)、[E2E合同](../../testing/e2e.md)。
- [004实跑回执](../../testing/e2e-004.md)、[碎片和当前004前驱](../../../projects/pal/e2e-checkpoints/README.md)。
- `scripts/e2e/meal-contract.mjs:112`独立case合同；`meal-journey.mjs:41`连续held输入和异常先松键。
- `scripts/e2e/browser-journey.mjs:18`独占临时浏览器/服务，不连接用户profile。
- [一阶段经验](../../phase1/engineering-notes.md)§3.5香兰报信fade孤儿历史；[知识摘录](../../phase2/reference/phase1-knowledge-harvest.md)X7。
- 当前content21/SAVE10；只消费当前canonical，改内容后按正式拒绝/重建语义处理，禁止改档hash/兼容分支绕过。

## 当前模式准入与分工

Codex已核范围/一手数据/当前脚本，**执行器工具 build allowed**。工具Owner独占`scripts/e2e/errand-*`及
根`package.json`命令；只有证据证明必要时可窄改共享工具，先报root避免并写。禁止改生产runtime/schema/save/内容。
隔离工作树`/Users/zhangxu/.codex/worktrees/e2e-005/type-pal`，资产/依赖共享只读软链，不复制大文件。
独立前提审查e2e005_premise只读原版及作者正文；发现的内容问题先交Codex核定后再分派专属文件Owner。
根Codex独占卡/看板/回执，负责代码与原字节证据复核、全仓零诊断门、合并推送和工作树退役。
用户本轮确认6012无未保存改动，可在隔离验证后更新主工程；服务/页面继续保留。

内容首包独立Owner e2e005_content：仅`s001/s004/s005.json`和新增`pal-errand-author.test.ts`。
Codex已直接复核原L1436在布防后advance至524–527、再529–531，而当前e123/legacy-001缺这两个步骤，
批准补齐首次→提醒回店→天气复读及本段已核语义命名。原ID保持，奖励/布防只在首次；首包build allowed。
e2e005_premise独立确认同证据，并指出s004首句前480ms不保证已经走到终点；报信走位暂不改，
先取第一阶段真实对白/位置偏序。原L888返程是后台游标advance，不是空脚本；不为返程延迟玩家控制权。
七条后续对白在现行locale不存在，内容Owner窄加`locale.json`的dlg.524–527/529–531，逐句来自原始提取；
不触碰其它文案。原版遗漏不能以悬空locale引用代替修复。

第二包内容build allowed（第一阶段实跑取证后）：e83报信正文移至NPC两步“首报→催回复读”，
onEnter只选择并显式await，complete防重入；先停旧巡逻、摆位、normal走到139.5,34并站定说完9行。
该停步点是实际所有dlg282–293绘制期间1688,1388像素的转换，不是原最终目标140,32，也不再估480ms。
末尾保留原音乐/病倒后世界变更，后台单步骤返程至140,44→157,44→157,49→158,49→158,61，
按原slow/normal和停顿，前台不等它结束。无引用旧走近auto及独立催回变体随正文合并退役，其他变体不动。
内容白名单窄增s003/e44大门出口三层名称；不改其他s003正文。不得改runtime/schema/save。

005村中存在持续自动行为，存读断言以正式保存捕获及restore成功提交的**实际完整持久域**相等为准，
并核背景继续行走、位置/人物/非黑帧和截图；不能把异步取样时的合法动画变化误判存档损坏。
不冻结世界，不等待全体NPC停止，不声称动态场景整Canvas跨时刻hash相等；专项不插入story演示。

## 验收与证据

- 当前真实004 saves报告及原档hash校验，拒绝story/items/capture/错引擎/坏档/伪passed。
- 两阶段正常回厨房、出客栈、到码头、鱼嫂→水生→张四→回村；正常对白完整、奖励和后续绑定正确。
- 报信参与者实际移动、站定对白、离开/控制恢复观感参考第一阶段；抽验截图，不录屏。
- 工具反控覆盖丢页/缺台词/错人/提前布防/重复钱/假移动/未恢复；专项不得掺进story演示。
- saves生成005真实结束档，在fresh空IDB上下文通过正式入口恢复，完整持久域及稳定画面匹配。
- 已理解正文命名，必要编排修复另列before→after和根因；不修改原版提取数据。
- 对应单测、全仓typecheck/lint/格式及docs零诊断；实跑回执冻结实际源码、档字节与输入链，保留失败记录。
- 攻略更新已跑与只读结论，005不冒称006已验证。最终观感由用户复验，技术验收由Codex独立完成。

## 进展

2026-10-02：范围已批准，首包执行工具准入；当前无005实跑通过结论。独立前提/内容审查进行中。

Codex独立以现行`assertMealCaseReport`和`mealSaveView`核归档004报告、档原字节及完整endWorld：
game SHA `ebc52c79947551a94259ebc889dd927cf25222fef36e03ade3e04dea57d12e85`；
Reforge SHA `955d19d8aeb691359f90272baaaab56eda5813ff804f06972380a03075571b21`，
二者均为9a488c02的passed saves（不是story/capture）。6012 HTTP200，未重启。
独立只读审查e2e005_premise签premise verified：原版L741/L1528/L1436/903/L1606，
张四复读遗漏、L888后台返程及runEntityTrigger同scene交互父子约束均有直接证据；尚未作实际观感判断。

内容首包c75c632c5由Codex独立accept：去label后比三scene，除张四新增两步/首次next外原字段全等；
locale恰七条且逐句等于原提取，其余9655项不变。独立5项实际runner单测通过。
第一阶段首个story a02f8379c已passed，40行/说话人、+50和恢复普通移动；
`build/e2e/game-005-story-2026-10-02T10-59-06-895Z/005.trace.json`所有报信页香兰在139.5,34、up。
Codex亲读trace及末帧；末尾56.25s切L888、56.65s后台返程，玩家无需等返程结束。仍非005全验收。
前两次工具失败分别为热路径搬运全体实体、误选同场景另一房间入口，已保留并修工具，不归因作者脚本。
RF原004档在首包改内容后正式preflight拒绝auto resume digest不符；Root先前“未触达场景可能不受影响”
静态判断已被实际观察推翻。不得改档或绕过校验，第二包冻结后从正常001重建RF001→004合法链。

## 历史转换根因核查

用户追问为何二阶段脚本频繁出错。Codex只读Git退役前版本
`63aafb81c709d20ff14f4608f97a53defc367880`，没有恢复或执行旧转换器：

- `packages/migrate/src/translate-events.ts:1941–1956`把0x24/0x25动态安装入口交给
  `ScriptRegistry.registerTarget`；`:400–417`遇advance/reset只记segmentTransferDetails，保存首段body。
  张四L1436由水生动态安装，后两段对白在退役前s005和locale已经缺失；香兰L888由报信尾动态安装，
  其首条advance END落成空auto。两者不是本轮合理化新引入的问题。
- 同版本`translate-events.registry.test.ts:126–144`明确期待install目标只留下首次body，并记录后继诊断。
  这种测试通过证明的是转换器当前实现，不足以证明再次激活的剧情正确。历史另有机器审计，不能据其
  统计通过反推本段已完整；也不据两个实锤就把573条历史候选全部定为缺陷。
- 同版本`translate-events.ts:566/1399`统一FRAME_MS=40转换0x09；现行一阶段
  `main-loop.ts:42–50`与`event-system.ts:1342–1348`证明探索auto是100ms计数。
  新补返程30/4/20帧因此使用3000/400/2000ms；Codex先前沿用40ms口径的转述已纠正，
  不把1200/160/800当作已核原版时长。已存在的其它巡逻等待不在本卡批量重写范围。

结论仅覆盖上述可证明路径。迁移退休是作者维护权切换，不是全游戏剧情验收；当前005在canonical作者正文
修复，后续分段继续核首次/复读/返程和实际时序。运行时缺陷（如004时钟混用）须单独归因，
不能统称迁移bug，也不为这些作者内容修复重新启用全量转换。

## 独立复核返工

Root亲读最终作者内容并独立8项回归通过；原对白/音乐/后续世界变更与旧正文逐JSON相等，
只有批准的接近/返程/归属和命名改变。RF001→004 saves已按最终作者内容从正常新局重新生成，
真实004档SHA `e601ad9f04027055a673f340b11f8d1038bd94d5ba44a4d6c0806d1302419c0d`。

Root对005工具提出实际counter：从game guards原trace删除布防后十二条走近提交、保留出门时巡逻并重排序号，
旧断言仍通过，不能证明本次走近。6ce26b2fa收紧到布防后实际walk，并固定已核停点/朝向；
存读回执另从恢复后的真实trace证明后台续跑，不只信report的from/to字段。最终实跑仍待新冻结验证。
RF第一次走到张四超时属于工具读静态page range而非已变化的activation；已改读生产resolver当前值，
保留失败收据，不误改正文或放宽距离。正常story与guards/saves继续分开。

Root追加独占`packages/editor/src/core/project-reference.pal.test.ts`对应作者内容的引用golden：
独立数s004地址383→401、外部地址44→39，张四两个新portrait引用；总地址+18、blocker-5、
behavior引用-1、asset+2、compact rows-4、target aliases-6。保留所有原collector/index/worker/payload门，
补onEnter到e83恰两实体引用及一条新报信方案引用见证，不降规则。定向测试和Biome零诊断；
前四次旧golden失败日志保留，非产品缺陷，也不把更新计数当作完整统一质量门通过。

## 后续共性治理口径

用户明确：E2E初期可暴露较多问题，但公共根因修好后后续应顺畅；不能每段重复修同一种转换漏洞。
本轮已将口径写进E2E合同。下一批先对“动态安装入口丢后续段”和“等待时间基准”作问题族核查，
保留001–005人工编排，不恢复全量转换器，也不把573条历史候选直接批量判错。
e2e005_premise受委派只读核可追溯映射与本段外代表反例，属于下一批draft前提，不授权全仓作者改写。

## 通用E2E动态占位反例与准入

最终e53命名后的实跑暴露工具反例：s004玩家95,27朝95,28行走，被巡逻NPC94.75,27.5挡住；
原工具只判NPC坐标与落点完全相同，认为可走并持键等5秒。该轮失败保留，不能重跑碰巡逻相位。
Root直接读一阶段`scene-system.ts:422`，其像素菱形距离门换为格坐标是L∞<0.5；
二阶段`entity-motion.ts:196/274–318`是L∞<1−epsilon及连续sweep，既有重叠允许不加深且确实退出。
同一反例向96,27移动可退出；不修游戏碰撞，也不对e91或005加坐标特判。

工具Owner e2e005_runner获共享导航build allowed：`inn-route.mjs`、`inn-navigation.mjs`、
`meal-journey.mjs`的共享路由部分与相关测试，inn/kitchen/meal/errand调用点显式传引擎/占位策略。
保持同方向held输入与5秒无进展上限，动态路径失效须重新规划；真实静态无路/未知脚本仍失败，
不能通过放宽预算、无条件重试或瞬移绕过。优先复用生产纯占位/sweep，若作窄数学投影则须与生产函数交叉反控。
验证半格NPC、原有重叠退出、途中占位变化、无进展超时、异常松键和旧导航回归；全E2E工具及严格lint通过后
再按新冻结跑最终六case。作者内容未变，正式已重建004前驱继续有效，不改存档digest。

## 技术交付与剩余边界

Root独立accept最终98a42d4e0的六份同版case，原字节416输入/413 Git项、8trace、两终档及全部业务门逐项重算。
精确目录、hash、Chrome启动失败后仅补缺case、共享导航反控及组合质量收据见[005回执](../../testing/e2e-005.md)。
作者最终46823e38补齐e53三个名称；其后仅E2E共享工具变更，不再修改作者正文。
完整包门11002项/类型检查、最终211工具与全仓lint2774文件零error/warning/info通过，文档门另核。
原始失败及两份无损压缩诊断均保留；主树保全377文件原字节，不录屏，不修改用户存档。

当前review为用户观感复验，不再有本段技术返工。6012保留服务和页面；最小复验：
选s004丁香兰e83，交互方案“回村报信：李大娘突然病倒”应为首报/催回复读两步，
自动返程应是一段明确路线；正常story演示应走完报信即还控制，不夹带测试、不等返程全走完。
001–004不要求用户重复验。公共浏览器启动RPC监督缺口留R4，不宣称完整异常自动化已达标。
共性结构治理另按用户新口径推进，当前165机器不是已全部清理；作者目标统一方案→步骤→指令。

无下一位Agent提示词，等待用户观感验收；Root负责集成和保全，后续问题族批次单独核定build准入。

### 主树与编辑器交付

已安全ff并推送main至b79c685a2；用户`.zcodeignore`原样保留。同步前6012保存disabled且页脚已保存，
按用户无草稿授权刷新原页后，实际显示“客栈大门出口/e44”和“厨房入口/e53”。
已定位s004/e83交互方案“回村报信：李大娘突然病倒”，真实界面为首报28指令→催回复读1指令两张步骤卡，
保存仍disabled，未写任何UI测试改动。截图在主树`build/evidence-archive/e2e005-20261002/6012-xianglan-steps.jpg`。
6012 HTTP200，原服务与用户页面没有关闭或重启。

## 下一位 Agent 提示词

已直接委派，无需用户转发。贡献者只在白名单内交候选和自测；不得合main、标done、改变6012或用户存档。
