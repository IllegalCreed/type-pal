# CODE3s 战斗对话职责与专测

Status: local technical review; whole pre94 incomplete
Owner: Codex（单Agent）
Base: f1ba65aaa17427f1c538868b899e1d97f2f3be4e
Code: ac79a3240（纯重构）／451ee5290（测试与精确退休数据）

复用[3s全文与primary](../3s-battle-system/README.md)、[GLM29](../glm-foundation/codex-final29.json)与[3l成功bounded原件](../battle-lifecycle-quality/README.md)。本片完整核对变化域、对话新模块与13旧/12新专测，其他4251行主测不冒称重新全文复审。逐文件A–H和未修项在review.json；两个退休工具仅核数据/计数差异，不授整文件新信用。

- 对话队列从phase宿主拆出，只需要3个GS和5个BattleState字段。旧入口、签名、函数提升及21公共出口保留；薄委派为保持旧接口，不是指标性中间层。三个原函数体和其余宿主JS保持；私有恒值helper展开已证明仍为用户选择的全员+5/+4，不改逃跑方向。
- 真实GS＋loadDefaultGame＋createBattleState替代三个核心强转helper，两个对象属于同一战斗；使用合法Down键。提示时长改为精确35次40ms，续行检查字面A/B内容、保留框ownership和音效45。仅一条同输入同驱动弱子集并入续行例，断言迁移齐，13→12，无新增例。
- 两个反控各旧1绿／新1业务AssertionError：提示36帧及续行错写X。测试/源恢复有快照；后续仅改两段注释，token仍同。7相邻文件253例与game TC通过；5文件Biome0/0/0，精确退休工具83例。例数不重叠相加，不授浏览器/视觉或整战斗机制信用。
- 正文注释说明当前战斗采用累计100ms调用不带now的tickDialog，不冒称与大世界墙钟逐字时刻完全一致；返回true包括队列/effect占用，不等于已有可见框。没有在重构中切换打字时钟或新增产品取舍。

低成本只读复验：仓库根运行`node docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-dialog-quality/verify.mjs`。核指纹、原件/原生结果、精确退休映射、注释后token和完整源码守恒；不联网、不写文件、不跑测试。MATCH仅表示机械事实匹配，语义判断按明确读域。

原件在receipts.json.gz，逐条保留字节数/SHA/base64。诚实性限制：基线首轮误比原任务base而非最终代码，被断言拦下且未写卡/产品；正确复用的是最终SHA与成功bounded日志，失败full-check不计通过。首个append选择器未转义括号而选中0例，不能给反控信用；修正后才各单红。退休身份最初误用JSON reporter空格fullName，守卫在写入前拒绝；核安装4.1.7的`>`连接规则后与旧official摘要一致，未运行vitest list、未更新baseline。

0新closed。广域主测核心cast、选择/伤亡逻辑等3s余项继续，3t及其它pre94也未完成。统一check／official coverage／ratchet／protected／PR等全部pre94冻结后一次收口，94–102不扩展。

Final static: six actual document consumers pass; unchanged125docs-tool cases are reused from event-quality. New verifier first emitted9infos and was corrected; first producer stdin/identity/count-guard failures have tool transcript only. Missing metadata module and first content hash failures have raw receipts. No aggregate exit0 or counter credit is inferred from these failures.
