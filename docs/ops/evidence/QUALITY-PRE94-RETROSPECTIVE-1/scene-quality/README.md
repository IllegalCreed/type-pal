# CODE3q 场景职责与测试质量返工

Status: local technical review; unified pre94 gates deferred
Owner: Codex（单Agent）
Base: c6b0c2c19250e8fca3b577b53d59828a7ea4799e
Code: 85399a332（职责拆分）／610f747f4（测试整改、精确迁移记录）

本片复用[3q机制读域](../3q-scene-system/README.md)，补八维及测试质量，不重推已经固定的SDLPal机制。原scene-system与2121行专测完整读取；拆出的正文、公共类型和五个未改函数有token守恒证明。实际caller仍为mode探索tick、bootstrap碰撞/上下文与dev-panel显式跳转，后者不同于正常剧情异步装配。完整逐文件A–H、版本指纹、111身份到107合同映射和原件清单见review.json。

- **结构**：碰撞纯计算、场景装载、上下文Owner分离；旧scene-system出口/签名保留。私有trigger链去掉死上下文，返回实际起脚本结果，消除mode强转；方向选择改为typed switch。未增加策略布尔、取消协议或泛化helper。
- **测试**：分为探索装配75／装载23／纯碰撞9；32例迁移，4例的合同转入更强用例，111项均逐项映射。保留Up在row7附近的边界例，未当作四方向重复删掉。typed角色经正常hydrate；完整地图及256色palette替代any/never，原全局依赖改为显式初始化与失败后也执行的清理。
- **有效反控**：距离16误放行、忽略tile阻挡、跳过onEnter三项，各有旧单例绿／新单业务AssertionError红。恢复后10实际相邻文件478例通过（含107；不能叠加计数），stderr和运行时console诊断均0。game typecheck、局部Biome0/0/0；静态/文档的最终回执见review.json原件，不用退出码冒称零诊断。
- **边界**：无机制/存档/schema/资源生成/产品行为修改。未跑浏览器视觉/E2E、全包或全仓check、official coverage/ratchet/protected；这些由用户要求留到全部剩余pre94冻结后。新增6路径仅review，主专测旧关闭撤review，0新closed；CODE3q仍partial。

低成本复验：在治理树根运行`node docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/scene-quality/verify.mjs`。默认只读，无网络、不重跑测试，核当前SHA、原件字节、移动token、全身份映射、精确反控和局部门结果。发现漂移只重核受影响结论，不重新全文复审全部文件。

原件归档为receipts.json.gz内逐条base64/字节数/SHA256；包含stdout、stderr、原生JSON、单点patch、原正文与复现producer。首次证据脚本静态检查发现1处条件内赋值，已在最终lint前改为明确循环；该次仅有工具回显、无原生附件，不冒称留存。中途测试整理producer因标题定位失败而退出1，发生在主测试写回前；修正定位后执行并经身份/编译/原生运行验证。首次107例运行与formatter发生并行，故最终验收引用其后冻结代码的478例和再次typecheck，不把前者冒称冻结字节复验。捕获器的head是运行时已提交HEAD，工作中源码按最终文件指纹和token/patch复核，不冒称当时提交已包含改动。

仍登记的结构取舍：公共SceneContext两旧脚本字段、tick的bus参数在当前路径未读；本片保留已有接口，未扩大前次仅针对script label查询的接口清理授权。复杂度初筛>10的三个函数见review.json；它们是明确有序遍历/菱形判定，未为指标拆成无意义helper。显式loadScene未增加取消/竞态策略；真实dev UI可达竞态尚无直接缺陷证据，不能仅因async签名加防御协议。

下一片为3r事件系统的过宽上下文与直接主测余项，复用已读域、保存的机制反例与本片拆分证据；不扩94–102，不开中间PR。
