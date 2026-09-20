# PNG编码失败的位图释放修复

2026-09-20，Codex；用户明确要求修复TB03保留的close缺陷。本轮为同Owner同会话的常规资源生命周期修复，
不改图片格式、量化算法、公共接口、作者写盘或存档，不重开已done的TB03补测卡。

根因：prepareAuthoredImage在两次异步canvasPng之后才执行bitmap.close；任一次编码拒绝都会越过close。
新增真实函数回归在修前得到1绿2红：主图/预览编码返回null都抛预期错误，但close=0。
修复为取得bitmap后统一try/finally，移除分散close，保持成功时在摘要计算之前释放，错误原样传播。

新增18项：成功双编码；主图/预览null、同步抛错、Blob读取拒绝；创建画布/context/draw/读像素/两次put失败；
缺palette/坏palette/无context；portrait及摘要失败；解码未取得bitmap时不得释放。定向与原有image-import/stages
共3文件25项通过，editor typecheck通过；既有GLM断言未改。
完整check **7766项**、官方ratchet与以abfef542为保护点的**单次严格fast7277项**全通过。
旧测试身份/计数与其它六包基线对象不变；生产仍617文件，移除重复释放分支后分母减少6行/3语句，
分支命中+2，不能冒称纯补测导致覆盖提升。日志 /tmp/type-pal-image-cleanup-{check,ratchet,strict}.log。
用户要求的小修已完成；本次不重开TB03三签或改它的历史验收，不修改模拟器工作树。
此为Node边界替身+真实prepareAuthoredImage，不冒称浏览器视觉验收；本修复不改变可见布局。

无下一位Agent提示词，本项由Codex自测收口；模拟器继续独立分支实施，不与其未完成代码混在本修复提交中。
