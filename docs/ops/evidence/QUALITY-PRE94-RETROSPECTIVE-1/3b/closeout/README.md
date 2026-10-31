# CODE3b SSS／M.MSG 模块收口

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 CODE3b SSS/M.MSG 模块收口（基点 0f6423ef1…，Owner Codex，同一 codex/code-quality-3y）的摘要页；归 [QUALITY-PRE94-RETROSPECTIVE-1.md](../../../../tasks/QUALITY-PRE94-RETROSPECTIVE-1.md)；[README.md](../README.md)（原边界）与 [README.md](../raw-tests/README.md)（原盘补证）原件保持历史。完整六文件八维、精确改动与失效条件在 [evidence.json](evidence.json)；[raw.json.gz](raw.json.gz)（完整原件）与只读快检 [verify.mjs](verify.mjs)（node …/3b/closeout/verify.mjs）可复验。本片真实成果：六文件（sss/msg 两 parser、两 boundary、两 raw 测试）审查及返工完成并按原 3b 合同 accept，统一门延至多卡窗口；不关闭相邻广域模块、不合 main 的时点边界由后节替代。

## 来源与输入

收口要点：SSS 内部去掉每条 EO/scene 临时字节副本与二次 DataView、整除后冗余 floor，地址等价推导、旧 13 例基线保留；补 bytecode 借用 ownership 与末 offset 终点注释，撤掉未经证实的 runtime ptr 定性；未改字段/格式/接口/错误/GBK 政策。新增 1 例「结构数组独立/bytecode 精确借用」：复制 bytecode 反控（needle 'bytecode: chunk4,'→'chunk4.slice(),'）14 例中 13 绿恰 1 业务 AssertionError。原 SSS 六弱例→完整结构 1 例、MSG 三弱例→精确文本 1 例的合同映射与旧反控按冻结版本复用；当前独立 Python struct/严格 GBK 复算一致；规范相对路径入口 [evidence.json](../../3b/closeout/evidence.json)。

## 断言与业务 oracle

多卡窗口轨迹如实分时点：用户追加成本要求（单卡只跑必要定向/静态，多卡后统一重跑）已固化到 [code-quality.md#5-按影响范围验证并集中收口](../../../../code-quality.md#5-按影响范围验证并集中收口)（长期规范）；完整 check 实际 20387 例早于其它三卡、official ratchet 跑完 19989 例后因 SSS 四条已覆盖临时复制声明删除而 exit1（失败原件保留，只以绑定旧 baseline 与当前源 SHA 的有限精确重计条目复验、不冒充官方重跑）。2026-10-21 最终：四卡冻结后全 check 20390、ratchet/protected 各 19992、typecheck/lint 零诊断，本卡原范围逐项接受；只读 verify 应 MATCH，不重复执行测试。53accept/30partial 等为 3b 接受后的候选计数，账本 3334/345closed 为当时机器口径。

## 结果

state='accepted original3b contract;four-card gate window passed;not all83complete'；windowState='3b/3d/3f accepted by original boundary;3g only test-host slice accepted'。ledgerErratum 记录 sprite 两路径的撤回纠漂移；testReadinessOverlay 的 cli-host 等待/取消补强只保留 23 matcher/445 身份并单独复验，不声称对最终测试文本新跑完整 check（gateReuseBoundary 明示该边界）。过程披露（收集钩子误伤 3 collection failures、初始 1000ms 轮询致 ratchet 中止等）均不计产品缺陷。

## 限制与复核

未重跑任何命令；完整正文/fixup 真值不归本卡认证、借用 bytecode 需 caller 只读；下一片 3d PNG、不扩展 94–102。治理页不重开任务、不恢复旧完成声明之外的新信用；候选待 Owner 非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 3270B / SHA-256 3221e791e33f0fc0741a22e541221df436f1fbd2ad229a2220d9d4759ad9caa3；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE3b SSS／M.MSG 模块收口

Owner Codex，同一codex/code-quality-3y，基点0f6423ef1ccefb28aaf4dc046f8d22fa849f3625。归[父任务](../../../../tasks/QUALITY-PRE94-RETROSPECTIVE-1.md)；[原边界](../README.md)和[原盘补证](../raw-tests/README.md)原件保持历史。

[六文件八维、精确改动与适用域](evidence.json)记录当前caller/依赖、独立oracle及失效条件；六文件审查及返工完成，统一门延至多卡窗口；本片仍partial，不关闭文件、不合main。

SSS内部去掉每条EO/scene临时字节副本与二次DataView、整除后的冗余floor；地址等价推导与旧13例基线保留。补bytecode借用ownership、末offset终点注释，撤掉未经证实的runtime ptr定性。未改字段、格式、接口、错误或GBK政策。新增一例结构数组可独立编辑／bytecode精确借用：复制bytecode反控恰1业务AssertionError、其余13绿，正式代码/测试未变，临时文件已清除。

原SSS六弱例→完整结构一例，MSG三弱例→精确文本一例的合同映射和旧反控按冻结版本复用；当前Python独立struct/严格GBK复算一致，不重跑所有历史mutation。当前定向相邻8文件33例与typecheck、scoped Biome零诊断。完整正文/fixup不归本卡认证；借用bytecode需只读。没有新产品取舍、产物写入、视觉或E2E。

正式关闭数量待最终门与机器ledger写回；原四已关闭不重复计数，两raw测试原live表未登记，机器当时pending，旧README的review文字不代表消费者已读取。下一片CODE3d PNG，不扩展94–102。

## 多卡窗口接续

用户追加成本要求已固化到[长期规范](../../../../code-quality.md#5-按影响范围验证并集中收口)。完整check实际20387例/typecheck/lint0/0/0；260正常stdout块/18种正文已核。official ratchet跑完19989例后因SSS四条已覆盖临时复制声明删除而exit1，失败原件完整保留。其余六包指标相同、source范围未减、新增1个fast测试。只新增绑定完整旧baseline和当前源SHA的精确结构重计条目，原比较谓词及baseline不变；直接复验四项回退→0，额外本包/他包回退和源漂移仍拒绝。该比较不冒充官方重跑通过。

protected fast未启动。按用户新要求先累计3d/3f/3g，再统一重跑必要门。当前全83卡仍53accept/30partial，文件账本3334/345closed/122review/2867pending，0新关闭；347/54等数字仅是3b接受后的候选计数。相邻共享fixture只修空chunk/末offset两条注释，正文AST保持，不授其它helper信用。

[完整原件](raw.json.gz)、[只读快检](verify.mjs)：`node docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/3b/closeout/verify.mjs`；当前应为MATCH_GATES_PENDING。源码/caller/依赖/输入域/oracle变化只使相应claim待复核；hash和原生集合不证明设计质量。

## 2026-10-21 当前最终结果

四卡冻结后全check20390、official ratchet/protected各19992及typecheck/lint零诊断。本卡原范围逐项接受，不附带关闭相邻广域模块。 [当前总裁定](../../3b/closeout/evidence.json)；上文待跑/候选计数属于先前时点，已被本节替代。只读verify应MATCH，不重复执行测试。
```
<!-- incremental-original-source:end -->
