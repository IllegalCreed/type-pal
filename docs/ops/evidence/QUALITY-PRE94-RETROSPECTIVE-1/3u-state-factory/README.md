# CODE3u BattleState工厂专测复审

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: audit-report-v1 / 1.0.0

## 审计问题

本页审计对象是 CODE3u BattleState 工厂专测复审切片（Codex 单 Agent 核读/执行，2026-10-18，Base 9c2c5eabe143bc81ad8df1c9234aa741b130aabc，Branch codex/code-quality-3y，status:recorded）。核心问题：原工厂专测存在只数自写字面量数组、从不调用被测实现的无业务用例，手写状态再 JSON 的弱 oracle，手拼 ActionQueueItem 键名的早期候选，以及与主测重复的三玩家快照例——按少而精测试规则需以真实工厂/真实队列重建并以反控证明判别力。

## 范围与证据

按父卡 [QUALITY-PRE94-RETROSPECTIVE-1.md](../../../tasks/QUALITY-PRE94-RETROSPECTIVE-1.md) 低风险准入：实现916行、原主383行/GLM81行全文，现主340行/GLM82行全文；H222 和 positions93 全文。实际读范围、当前SHA与原字节分别见 [read-boundaries.json](read-boundaries.json) 与 [before.json](before.json)。原清理/runtime片 [README.md](../3u-3w-finalization/README.md) 信用继续有限保留；本片不替它关闭Extra可达性。第一阶段真值：CLASSIC 状态按 global.h:40-60 逐 role 九槽，C 玩家状态直接用持久表而 TS 显式 seed 独立视图；battle.c:1598-1720 零槽保留与敌资源拷贝、:903-945 人数布局与 yOffset；玩家快照实际供 battle-system casualty 脚本使用，0x64 读敌 maxHealth、不读玩家 scriptPrevHp。

## 发现

生产 battle-state.ts 未改（完整字节同基点）；两测复用 H 的三个纯资源工厂（makeHRole/makeHEnemy/makeHField）+真实 core RNG 与 buildActionQueue，去重复结构定义；撤掉只数自写枚举的运行时用例；手写状态再 JSON 的 case 改为真正构造/持久数组/下一场视图隔离；GLM 三玩家快照断言合并主测并经 [snapshot-conservation.json](snapshot-conservation.json) 快照保全针证明源突变后不变，另纠正 MP45>maxMP40 夹具；九状态按 party[2,0] 逐 role 映射；空槽旧『坐标非空』改为真正活敌使用的含 null 两槽布局。早期17绿候选曾手拼错 index/dexterity 键名，代码检查后纠正，旧 raw 保留、不授最终身份信用，见 [early-candidate-limit.json](early-candidate-limit.json)。

## 结论

逐项迁移 [assertion-transfers.json](assertion-transfers.json)：18→17，退两整例（一无业务枚举、一重复快照）、增一个真实局部队列 ownership 例、替换一弱 JSON 例；授权仅限本两例，不借 10-03 旧 OPQ 头自批其它退役。六反控 [controls.json](controls.json)（role→party 误接、silence 读 sleep、同持久数组缓存状态视图、共享 pendingActions、压掉 null 布局人数、空槽 cash 非零）各旧 14 或 4 全绿→当前恰一指定业务 AssertionError；恢复源后 7 文件 283 绿（17 直接/266 相邻）与 game typecheck 零诊断，实际门汇总见 [gates.json](gates.json)。两旧关闭专测重开 review、0 新增 closed；机器 3316 tracked/253 closed/98 review/2965 pending；83 卡 55partial/28pending/0accept 不变，仅 3u 当前证据指针更新。

## 整改与复核

完整 check/official coverage/protected fast 按用户要求留大任务收尾；本片不跑全 game、原版/浏览器/E2E，不合 main。庞大动画/UI 类型的全部 caller、脚本元数据/极端数值/容量域及所有注释锚尚未全核，继续 review；非队员 Extra 未知仍归既有 draft。接下来继续 3u 剩余 factory 输入/caller 与 3w settlement，或 40/41 未核切片，94–102/editor 后置。本页为治理候选正文，任务裁决以父卡与实际 ledger 为准；候选待 Owner 非作者接收。


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 4417B / SHA-256 405bb1ce86f8bcaee70db563101a901030ee1e9e2d69ef1d0d546d0fe93becb1；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE3u BattleState工厂专测复审

Status: recorded
Owner: Codex（单Agent核读/执行，不冒充第三方）
Date: 2026-10-18
Base: `9c2c5eabe143bc81ad8df1c9234aa741b130aabc`
Branch: `codex/code-quality-3y`

## 范围与证据

按[父卡](../../../tasks/QUALITY-PRE94-RETROSPECTIVE-1.md)低风险准入：实现916行、原主383行/GLM81行全文，现主340行/GLM82行全文；H222和positions93全文。实际读范围、当前SHA与原字节分别见[read-boundaries](read-boundaries.json)、[before](before.json)。原[清理/runtime片](../3u-3w-finalization/README.md)信用继续有限保留；本片不替它关闭Extra可达性。

第一阶段：真实startBattle展开队槽、重跑装备再构造；CLASSIC状态global.h:40–60逐role九槽，C玩家状态直接用持久表，TS显式seed独立视图。battle.c:1598–1720支持零槽保留和敌资源拷贝，:903–945支持人数布局与yOffset；玩家快照实际供battle-system casualty脚本使用，0x64读敌maxHealth，不读玩家scriptPrevHp。机制文档1480–1595的旧全域等价断言不作为本轮全部语义验收；非队员Extra未知仍归既有draft。只证明源码/C参考范围，未运行原版。

## 实际修改、排重和输入

生产battle-state.ts未改，完整字节同基点；没有新产品取舍、公开接口、schema/save、资源或二阶段变化。实现全文读过，但庞大动画/UI类型的全部caller、脚本元数据/极端数值/容量域及所有注释锚尚未全核，继续review。

两测复用已读H的三个纯资源工厂，去重复结构定义；不用H的仿RNG，直接用core RNG。行动队列也取真实buildActionQueue，按真实ActionQueueItem字段；早期17绿候选曾手拼错index/dexterity，代码检查后纠正，旧raw保留、不授typecheck或最终身份信用，见[早期限制](early-candidate-limit.json)。

撤掉只数自写枚举的运行时用例；手写状态再JSON的case改为真正构造/持久数组/下一场视图隔离；GLM三玩家快照断言合并主测并保留源突变后不变，另纠正MP45>maxMP40夹具。九状态按party[2,0]逐role映射，不凭位置猜角色，普通计数和>999好状态都保留；活人傀儡设0，不能拿正式开战会清除的组合冒充可达。空槽旧“坐标非空”改为真正活敌使用包含null的两槽布局；零值统计仅C primitive合同，不扩张为每个空字段都有生产消费。原边界抛错、人数、玩家/敌坐标、yOffset和其它业务断言保留。

[逐项迁移](assertion-transfers.json)：18→17，退两整例（一无业务枚举、一重复快照），增一个真实局部队列ownership例，另替换一弱JSON例。主14保持/GLM4→3；不是按数量或覆盖率取舍。现行测试少而精指令是这两例的适用授权，不借10-03旧OPQ头自批其它退役；baseline/退役registry未动，protected身份/计数协调留大窗口，不能宣称已通过。

## 判别力和实际验证

[六反控](controls.json)均完整未过滤文件：role→party误接、silence读sleep、同持久数组缓存状态视图、共享pendingActions、压掉null布局人数、空槽cash非零。各旧14或4全绿→当前恰一指定业务AssertionError，其余13或2绿；0skip/pending/runtime failure，源/测试/mutant和native/raw字节、身份、finally恢复及自有临时目录清理完整保存。

[快照保全针](snapshot-conservation.json)另计：暂去scriptPrevHp，冻结旧GLM与当前主测均恰一指定快照AssertionError，证明合并没有丢该oracle；不把双红保全冒充旧绿新红反控。正常源逐字节恢复后7文件283绿（17直接/266相邻），game typecheck零诊断。更早17绿raw仅历史；最终看module native。相邻执行不签收其整文件。

## 当前结论与后续

两旧关闭专测重开review；实现原review保持，0新增closed。机器以[实际gates](gates.json)为准：3316 tracked /253 closed /98 review /2965 pending；83卡55partial/28pending/0accept不变，仅3u当前证据指针更新，其余82对象/原历史SHA不改。

完整check/official coverage/protected fast按用户要求留大任务收尾；本片不跑全game、原版/浏览器/E2E，不合main。接下来继续3u剩余factory输入/caller与3w settlement，或40/41未核切片，94–102/editor后置。无下一位Agent提示词，Codex单Agent继续。
```
<!-- incremental-original-source:end -->
