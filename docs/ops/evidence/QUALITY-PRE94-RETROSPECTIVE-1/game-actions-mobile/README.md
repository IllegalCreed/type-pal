# pre94 基础战斗动作与移动端影响复核

Status: build / source frozen, grouped gates pending
Owner: Codex（单Agent）
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

同一3y，origin/main基点868323003。只验原CODE3v六文件与移动端直接改动的七个既有closed实现；另两份既有AVI测试及installer原两例按具体变更核证。16行逐文件A–H、当前SHA、复用来源和三份大文件的实际上下文范围在[机器回执](review.json)，完整原件在[native.json.gz](native.json.gz)。[只读快检](verify.mjs)不重跑测试、不联网、不写仓库；指纹或反控身份不符即失败，不以包绿顶替文件验收。

## 来源与输入

3v复用既有完整四实现/两专测、有限SDLPal原文与投影错注修复；本轮补C/D/F/G/H及测试合法域/判别力。unused Flee参数、同绑定状态owner和peer type依赖纯重构2077d7ecf，typed fixture及既有用例补强7eea19e05分提交。大actions测试与battle-system/H宿主仅核实际段，未关闭全文。

移动端引用既有独立审查、已核候选与83注册附件逐字节复算，只补七文件真实caller/接口/lifecycle增量。没有把14新增代码路径或main/bootstrap/minimap/tools广域文件顺带accept。display-scale/FPS只纠错注，生成JS完全相同。

## 断言与业务oracle

- AttackMate：原7例不增删，用合法typed工厂替代伪BattleState；首例party[2,0,1]、HP155/200/200及数字slot1。丢弃宿主目标的单点变异旧7绿、新恰1条HP红、恢复7绿。
- Analytics：原2例不增删，拒绝后经真实公开方法重开，存储仍denied。noop转发旧2绿、新恰1条hidden状态红、恢复2绿；相邻7文件30例零stderr。
- AVI：用户批准重复重试。正式未修源先红，最终5例suite对冻结旧源3绿2指定红；可见提示未摘除为主业务反例，旧节点继续调用媒体端口为清理反例。稳定once回调每次失败后重接、成功/结束解除，pending不并发。修后8文件61例零stderr；旧异步M1/M2/M4/M5/M8复用，不新增重复迟到用例。未改500ms/跳过键/音量/媒体资源或Save。

## 结果

当前是候选证据，不升CODE3v/78，不新增closed。game typecheck与scoped Biome零诊断；3v六文件154私有实跑通过，最终canonical适用性和格式token逐项相同，不伪称又跑一轮154。集中全仓check/official ratchet/protected尚待本窗口一次收尾。

## 限制与复核

历史868主线Docs39703338326、Coverage39703338497均实际success，完整GitHub原件在归档ci868成员；Coverage20032/758，lint5795为0/0/0。两job各有平台Node20 action迁移warning及Ubuntu notice，单列保留，不能写成平台annotation0；不影响对仓库act/type/lint诊断的零计数，但也不能拿历史绿覆盖新AVI行为。

初6例草案含一条与既有lifecycle同轴的迟到例，最终删去该新草案而不退役历史测试。初green命令含两个不存在的过滤路径，实际4文件41绿；正式纠正后实际8文件61。3v证明器首版范围越界与格式换行误判失败不授门信用，首版完整stderr未保存，明确披露；原初raw、最终native及producer保留。覆盖率未提前运行。

## 首官方指标拒绝与有限调整

首采集20034/758实际通过，全部测试stderr为0；game/total分支因旧伪fixture的两项偶然覆盖消失而门exit1。上一成功CI的完整game V8/LCOV与旧baseline逐项相同，未改的AttackMate源码逐字节一致；下降精确定位到protect未定义回退及缺锚即时数字，非HP/protect/defend/clamp业务合同丢失。[有限授权与原件归因](recount.json)只下调固定旧game branch covered两项，其它下限不变；13实际源SHA不符即拒绝，所有旧授权条目/程序AST原样。已实测有效授权、错误源拒绝、未授权baseline不匹配不调整；正式门待新一轮实际运行，旧失败绝不改写为通过。
