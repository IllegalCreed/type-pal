# CODE3n／3q／3r 代码验收

Status: code accepted; final pre94 integration pending
Owner: Codex（单Agent，自身复核，不冒充第三方）
Base: 82efe44df6d501af61d16018f763e03f5292b481

本轮三卡代码接受，固定83卡72accept／11partial／0pending；17文件新关闭，实际机器账438closed／97review／2889pending。全仓check、official coverage、ratchet、protected和PR继续待全部剩余pre94冻结，未授集成收口信用。

[逐文件八维、完整/增量读域、当前指纹、原件与版本桥](review.json)复用[3n既有完整八维](../battle-core-fade-quality/README.md)、[3q职责/107合同](../scene-quality/README.md)和[3r对象作用域/324身份](../event-quality/README.md)。只核当前差异和具体欠账，不重复作者全部复审；旧原件/时点计数不倒写。

用户明确批准3q内部接口清理：SceneContext只保留tilemap，LoopContext不再转传两份未用脚本数据；tickSceneInput/tickSceneSystem删除未用bus。13文件同步81实参、180数据属性、4类型字段，62个未用纯bus构造及4个死fixture移除；业务判断、GS/SceneAssets真正脚本数据和原断言保持。bootstrap/main-loop大文件只接受这个增量，不授整文件新信用。完整剩余JS AST守恒按明确批准编辑重放；原0副作用bus构造及plain数据表达式已核。

额外核实并修复一个真实测试质量问题：e2e.test.ts仅1例原把NPC设成装饰mode0、脚本不注册，只走路也绿。加帧3事件/ip2与帧4“你好”的字面断言即业务红；用合法mode1/全局目录及清理后绿。同一搜索绕过变异旧1绿／新1AssertionError，source/test恢复指纹与原件保留。它是headless有限回放，不是浏览器路线验收；用例身份/数量保持。

既有111→75精确退役快照只同步当前测试SHA；例数/身份/拒绝谓词和baseline不变，配套Node策略测试通过，没有采集覆盖率。

三卡共同一次必要相邻：14游戏文件509例、4Node工具69例、game typecheck及lint-zero0；不重复原3n/3q/3r全组或旧反控，也不相加重叠例数。初版8条unused与中间纯接口提交保留1条unused的事实完整披露，未预报该时点通过，最终累积候选零诊断后才发布。

低成本只读复验：治理树根运行 `node docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/core-scene-event-closeout/verify.mjs`。核当前源码/依赖、原件字节、批准编辑与余下JS、测试身份和有效反控；不写文件、不联网、不跑测试。MATCH只证明机械事实，具体八维/设计判断见report。

3n色表量化/快照/输入域、map身份/WORD借用与目录独立Owner已有完整证据；3r继续由解释器管理有序等待，服务回调由单应用bootstrap装配，作用域/纯帧规则已有叶模块。保留同Owner的opcode分支不是漏审结构，不为函数长度制造框架。3m极端dex数值、其它11卡及最终集成仍开放，94–102未扩展。

最终文档/静态与机器账见static.json；Git提交推送/0behind及PR事实按当前refs核。未创建中间PR或合main。
