# CODE56 小地图代码质量收口

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 CODE56 小地图代码质量收口的治理候选页;原件为 Codex 单Agent 自审回执(2026-10-24,base 1006f197→candidate 8c96291,原文 Status: named code scope accepted; final pre94 integration deferred)。真实身份:原 499 行小地图拆为规则模型(minimap-model.ts 140 行)、Canvas 写入(minimap-draw.ts 97 行)、page 控制器(minimap.ts 298 行),原根出口/签名保持;只读规则不再经整份解释器取得三个 ID(script-opcode-ids.ts 6 行叶恰 0x1e/0x1f/0x55)。逐文件八维与 caller/失效边界在 [review.json](review.json),完整未裁剪原件在 [receipts.json.gz](receipts.json.gz),默认只读快检 [verify.mjs](verify.mjs)。

## 来源与输入
[首段声明与根API守恒](prove-split.mjs)、[后段两核心全文还原/真实绑定约束](prove-bindings.mjs)各冻结自己范围,不把哈希当设计认证。门数据:基线 22 直接例;本轮一次 7 文件 54 例(22 直接+32 相邻),核心 ID 引用调整再跑 2 文件 330 例;game typecheck 均零诊断。反控 30 次执行=14 共享+8 旧+8 新:旧 22 绿、新 21 绿+唯一一红为指定业务 AssertionError(删成功缓存写入后可见重试提示未按合同消失),恢复字节及副本清理可回读,不计 30 新合同;既有九枚几何/优先级/像素/快捷键反控按未变函数和附件复用未重复跑。相邻保留 5 条原有 Dev Panel 正常装配 console.log(同字面量),完整 stdout 单列,不能写成空输出;没有错误、告警、act 或环境诊断。[发布静态门](static.json)另记。

## 断言与业务 oracle

22 原身份全部保留。成功缓存写入被删时旧 22 仍绿;补强既有 pending-load 例,使用构造型 Image IO 工厂返回真实 CanvasImageSource, onload 后仍只取一次并看到蓝色底图。非法持久 zoom 字符串沿真实 Minus 路径回到正确档,未新增用例或 baseline 条目。旧未知逐项判断:全局标签表由 all.json 生成 null-prototype 整数索引;四个正缩放档和标准方形 DPR 画布是实际 caller 域;任意伪造 Record/Canvas 不被冒称支持;分类是最多 400 行、不会执行库存/法术的潜在奖励启发式,原 425 条 raw1F 的只读计数不是地图宝箱分母或可达剧情证明。

## 结果

六文件新关闭,CODE56 原范围代码 accept;固定83 为 77 accept/6 partial/0 pending;时点计数 3438 tracked/476 closed/76 review/2886 pending。原 58 源 tools-panel.ts 1332 行和两专测已完整核读、本窗未改,其 IO 失败与职责/类型问题留在 review.next58Review,后续只续该差异、不再重新全文读一轮。3m 与 42 等待各自实际产品答复,不挡独立范围。初始拆分漏 computeView/多余 import、构造器返回值 lint 拒绝、无效 selector 预检、组织出口/证明器引号顺序假失败和新证据工具 info 全部如实留原件,不写作产品红或干净门;后继只纠正真实问题,未静音、未放宽规则。

## 限制与复核

最终 pre94 集成延后:全仓 check/官方 coverage/ratchet/protected 未跑,统一门 NOT RUN until all pre94;CODE57 seam/palette 闭包与 CODE58 面板 IO 不因相邻授信;没有偷偷修改分类、UI、存档或资产行为;未宣称浏览器剧情/完整缩略图/全仓验收或 main 合并。本治理不重跑、不改写原判定;原件逐字节保全在下方;候选待Owner非作者接收。

原文存活链接原样保留:[prove-bindings.mjs](prove-bindings.mjs) [prove-split.mjs](prove-split.mjs) [static.json](static.json)。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 3081B / SHA-256 196b684cda37d76e0eaebf90796b303fafaa1970ebaec81c4da026cd6670696f；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE56 小地图代码质量收口

Status: named code scope accepted; final pre94 integration deferred
Owner: Codex（单Agent，自审身份明确）

[六文件逐项A–H／caller与失效边界](review.json)、[完整未裁剪原件与产生者](receipts.json.gz)、[默认只读快检](verify.mjs)。原小地图499行拆为规则、Canvas写入、page控制器，原根出口／签名保持。只读规则不再经整份解释器取得三个ID；新常量叶与目录／地图号getter直连有实际多方消费者。[首段声明与根API守恒](prove-split.mjs)、[后段两核心全文还原／真实绑定约束](prove-bindings.mjs)各冻结自己范围，不把哈希当设计认证。

22原身份全部保留。成功缓存写入被删时旧22仍绿；补强既有pending-load例，使用构造型Image IO工厂返回真实CanvasImageSource，onload后仍只取一次并看到蓝色底图。最终反控30包含14共享例、旧8与新8，不计30新合同；唯一红是指定业务AssertionError，恢复字节及副本清理可回读。既有九枚几何／优先级／像素／快捷键反控按未变函数和附件复用，未重复跑。非法持久zoom字符串沿真实Minus路径回到正确档，未新增用例或baseline条目。

本轮一次小地图／调用方7文件54例（22直接、32相邻），随后核心ID引用调整再跑2文件330例；game typecheck均零诊断。中间绑定顺序调整由同一函数/别名和无副作用字面叶证明桥接，不重复54。相邻保留5条原有Dev Panel正常装配console.log，完整stdout单列，不能写成空输出；没有错误、告警、act或环境诊断。[发布静态门](static.json)另记，全仓check／官方coverage／ratchet／protected仍等全部pre94。

旧未知逐项判断：全局标签表由all.json生成null-prototype整数索引；四个正缩放档和标准方形DPR画布是实际caller域。任意伪造Record／Canvas不被冒称支持。分类是最多400行、不会执行库存／法术的潜在奖励启发式，原425条raw1F的只读计数不是地图宝箱分母或可达剧情证明；保持现有raw数量／同数组缓存政策并明确限制。没有偷偷修改分类、UI、存档或资产行为；CODE57 seam/palette闭包与CODE58面板IO不因此关闭。

六文件新关闭，CODE56原范围代码accept；固定83为77accept／6partial。原58源1332行和两专测已完整核读，本窗未改；其IO失败与职责／类型问题已留在review.next58Review，后续只续该差异，不再重新全文读一轮。3m与42等待各自实际产品答复，不挡独立范围。

初始拆分漏computeView／多余import、构造器返回值lint拒绝、无效selector预检、组织出口／证明器引号顺序假失败和新证据工具info全部如实留原件，不能计产品红或干净门。后继只纠正真实问题，未静音、未放宽规则。搬移后的常量注释逐项重绑，旧全局CSS说明纠正；最后注释段全文TS不变。未宣称浏览器剧情／完整缩略图／全仓验收或main合并。
```
<!-- incremental-original-source:end -->
