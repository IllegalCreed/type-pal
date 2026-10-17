# CODE3u/3w finalization与runtime-context复审

Status: recorded
Owner: Codex（单Agent，自身核读/测试，不冒充第三方）
Date: 2026-10-18
Base: `6fde6d86cf9754e441de948c82ac99ebc1f480c8`
Branch: `codex/code-quality-3y`

## 准入与读取

id: QUALITY-PRE94-RETROSPECTIVE-1 / 3u-3w-finalization；schemaVersion:1；status:recorded。按[父卡](../../../tasks/QUALITY-PRE94-RETROSPECTIVE-1.md)低风险白名单：原67/80/98/75行四文件全文，当前两源与两测也已核读；不恢复旧done/固定三签。真实startBattle/tickBattle/settlement、resume/writeback、BattleState与对话factory、SDL和机制文档的实际范围列于[读取边界](read-boundaries.json)，完整gzip只是字节快照，不把局部读取的邻接大文件记为全文。

## 真值、caller与实现

这是第一阶段。SDL battle.c:1822–1857与global.c:2311–2339支持全角色九状态<=999清、>999装备常驻保留、波场恢复；script.c:3315–3333支持战斗结果接回脚本的分支。TS startBattle保存世界波、安装资源/可选runner，tickBattle lost/fleed或自有watchdog调用finalize，胜利settlement半血后调cleanup；resume消费postBattleResume并写eventCursor。watchdog无SDL对应，不把它的forced won策略当原版真值。

finalize先回写HP/MP再cleanup；cleanup清持久状态、在队毒/Extra、自动战斗/对话/震屏，恢复波→explore→丢state→释放runtime→接回脚本。runtime资源由GameState独立stash，引用精确、undefined不覆盖runner，clear通过公开getter释放两种资源视图、恢复fallback；私有存储实现未改。它的playerRoles实际可写，旧“只读资源表”注释已改；cleanup注释不再承诺C全role与TS party完全等价。两源只有事实注释变化，[parsedTS/去注释JS](emit-identity.json)相同，生产执行/公共接口/状态ownership结构未改。

### 未决高风险边界

[非队员Extra](../../../tasks/GAME-BATTLE-NONPARTY-EXTRA-CLEANUP-1.md) draft：C全role/TS party循环差异真实，但startBattle/updateAllEquipments全量重建，setParty也重建并清毒；C解毒对离队role自行return。未找到绕过这些重建的合法生产写入链，不能凭手塞Extra直调cleanup制造剧情bug。本片冻结行为，只记录unknown；毒键/复活/用户装备常驻裁决都不改变。

## 测试质量、复用和排重

原finalization只有2例，核心BattleState/对话/runner用强转，七状态数组不完整，第二例只看终态却宣称接回之前已释放。现用真实GameState→hydrate→战斗投影→createBattleState及startDialogLine；复用已全文核读的stats-test-fixtures纯构造器，不复制角色/敌人字段，不mock核心。两个原case的有效比较逐条保留，永久计数移到合法好状态，扩至九槽和未在队角色；公开eventCursor的保值getter/setter只观察真实resume写入，不替换resume/cleanup。

新增四个合同是finalize到cleanup/resume的实际组合层：lost按角色写零HP/精确MP且不复活，玩家逃、敌逃terminated、TS watchdog分别选正确分支；没有再直接测一遍resume helper。runtime3例保持，去runner和stash强转、补第二GameState安装隔离与释放live roles。[迁移表](assertion-transfers.json)保留原公开业务oracle；私有属性布局断言按下文等价反控撤除；无整例退役、baseline或catalog状态变更。原state主测的枚举长度/JSON与settlement大例质量未纳本片签收，仍是后续3u/3w范围。

[七反控](controls.json)完整文件未过滤：末两状态漏清、接回早于runtime释放、lost/forced/termination接错分支、仅写role0，各旧final2绿→新5绿1指定AssertionError；跨owner安装串写旧runtime3绿→新2绿1指定AssertionError。原件/native身份、时间、源/测/mutant SHA与finally恢复完整保留。首driver在第四枚的fullName匹配漏引号失败，三枚完整记录保留，第四native/raw原件另存但不授完整元数据信用；只重跑其后四枚，见[恢复说明](control-driver-recovery.json)，没有改产品/测试来使反控通过。

正式6文件275绿（9直接/266相邻），typecheck零诊断，以module-current/typecheck-current为最终候选。V1直接9例及旧275例原件保留为历史；夹具按实际caller调整后七反控以v2重跑，runtime私有布局断言撤除后仅该文件owner针重跑v3，六枚不变main v2按相同源/测SHA复用，逐字节恢复与正式身份核对。相邻包绿只证明执行结果，不签收其整文件语义。完整未裁剪raw/nativeJSON及[实际门](gates.json)保留。

## 当前状态与限制

四原已关闭条目重新review，0新增关闭，机器应为3316 tracked /255 closed /96 review /2965 pending；以实际ledger回执为准。只有3u/3w各pending→partial，83卡55partial/28pending/0accept，scopeConfirmed/currentAcceptance仍false；其它81对象/原卡历史SHA不改。两卡剩余state/settlement完整合同、毒/Extra可达性、视觉和统一门均未收口。

全仓check、official coverage ratchet、protected fast按用户成本规则留大任务收尾；本片不跑全game包、pal.exe/浏览器/E2E或二阶段，不合main、不改schema/save/资源/产品行为。下一步3u state工厂与主/GLM测试或40/41未核切片，94–102/editor后置。无下一位Agent提示词，Codex继续。

恢复说明：索引生成实际ENOBUFS打断了本片元数据producer，gates尚未落盘，未执行本片文档门；原source/read/raw已完成，不回写成原工具成功。先按SHA保存10个自有WIP文件及证据/草稿，独立工具37e2cd7c9先红后修并推送后，7个非冲突文件先逐字节恢复，随后父概览计数连同3个共享文档按已读差异重基，保留工具补证。代码冻结基点仍6fde6d86c，元数据新基点37e2cd7c9；工具两旧关闭重开/一pending转review叠加本片四旧关闭重开后，当前机器255closed/96review/2965pending。不是原回执数字被改写：未完成的预期数已纠正，实际旧raw不动。

最终caller精度：普通lost会先走dialog hold，因此待播queue的丢弃断言移到hold之前触发的watchdog，不把不可达组合充作lost覆盖。原五直接case的公开业务oracle及四个新出口保留，无整例退役；V1全部原件保留，当前canonical为六main v2与一runtime v3，正式6文件275绿和typecheck-current为最终代码候选。文档工具125在前置工具提交37e2cd7c9已实跑且源码未改，本片只重放真实五消费者，不冒充新的完整check:docs。

私有布局排重：原runtime测试直接检查stash自有键/删除形状，真实生产端口依赖公开getter与runner。已读typed caller，另附字面键检索原件（仅字面源码普查，不声称穷尽任意动态访问）。把清理resource暂换成delete、公开结果保持预期时，冻结旧3例为2绿1特定AssertionError，当前3例全绿；[等价形状反控](private-shape-metamorphism.json)与七枚回归反控分开计数。最终源逐字节恢复，三例保留全部公开身份/override/释放oracle，不再认证私有对象布局。
