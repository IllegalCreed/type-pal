# PNG编码失败的位图释放修复

Status: historical
Owner: Codex（文档治理；不代签原执行——原修复为 Codex 席位，本页只接模板）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 2026-09-20 Codex 对 TB03 保留的 close 缺陷的常规资源生命周期修复回执（用户明确要求；同 Owner 同会话）：`prepareAuthoredImage` 在两次异步 canvasPng 之后才 `bitmap.close`，任一次编码拒绝都会越过 close；修复为取得 bitmap 后统一 try/finally，移除分散 close。不改图片格式、量化算法、公共接口、作者写盘或存档，不重开已 done 的 TB03 补测卡。

## Scope

- 对象：`prepareAuthoredImage` 位图释放路径；日期 2026-09-20；约束=不改图片格式/量化算法/公共接口/作者写盘/存档。

## Execution and assertions

| step | legal input | caller | machine assertion | business oracle |
|---|---|---|---|---|
| 先红后绿 | 新增真实函数回归 | 修复前运行 | 1 绿 2 红：主图/预览编码返回 null 都抛预期错误但 close=0 | 修前缺陷真实存在 |
| 修复 | 取得 bitmap 后统一 try/finally，移除分散 close | 生产路径 | 成功时在摘要计算之前释放；错误原样传播 | — |
| 新增 18 项 | 成功双编码；主图/预览 null、同步抛错、Blob 读取拒绝；创建画布/context/draw/读像素/两次 put 失败；缺 palette/坏 palette/无 context；portrait 及摘要失败；解码未取得 bitmap 时不得释放 | 定向+原有 image-import/stages | 3 文件 25 项通过；editor typecheck 通过；既有 GLM 断言未改 | 覆盖失败路径释放语义 |

## Results

- 完整 check 7,766 项、官方 ratchet 与以 `abfef542` 为保护点的单次严格 fast 7,277 项全通过。
- 旧测试身份/计数与其它六包基线对象不变；生产仍 617 文件，移除重复释放分支后分母减少 6 行/3 语句、分支命中 +2——原文明确「不能冒称纯补测导致覆盖提升」。
- 日志 `/tmp/type-pal-image-cleanup-{check,ratchet,strict}.log`（历史 /tmp 路径，未随归档保全）。

## Evidence

- 证据路径：本回执正文（quote 保全）；Node 边界替身+真实 `prepareAuthoredImage`，不冒称浏览器视觉验收、不改变可见布局。
- 模拟器继续独立分支实施，不与未完成代码混入本修复提交；无下一位 Agent 提示词（Codex 自测收口）。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| 修复 | 2026-09-20 | try/finally 统一释放 | 用户要求的小修完成 | 无 |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

- legacy migration/supply-and-import 的位图释放修复回执；固定来源与 source SHA 见下方保全节。

## 原始结论

- 根因=两次异步编码后才 close；修复=try/finally 统一释放；25 项定向+三门全过；不重开 TB03 历史验收。

## 当时证据

- 修复前后行为、18 项新增清单与门数字在 quote 保全；/tmp 日志按原文时点（未保全=unknown，不补造）。

## 当前有效性

- historical。修复语义按当时代码；当前行为以现行实现与测试为准。

## 继任文档

- 当前资源生命周期结论归 canonical 测试与 catalog。

## 原文保全

固定源 revision `85c462ffd5a6d8514604d346abd96212340c5dfa`，source SHA `3ff5a7efc52fa13955ac1321da2bb88083ff8035498657dcea9cd4a7afa296bd`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # PNG编码失败的位图释放修复
>
> 2026-09-20，Codex；用户明确要求修复TB03保留的close缺陷。本轮为同Owner同会话的常规资源生命周期修复，
> 不改图片格式、量化算法、公共接口、作者写盘或存档，不重开已done的TB03补测卡。
>
> 根因：prepareAuthoredImage在两次异步canvasPng之后才执行bitmap.close；任一次编码拒绝都会越过close。
> 新增真实函数回归在修前得到1绿2红：主图/预览编码返回null都抛预期错误，但close=0。
> 修复为取得bitmap后统一try/finally，移除分散close，保持成功时在摘要计算之前释放，错误原样传播。
>
> 新增18项：成功双编码；主图/预览null、同步抛错、Blob读取拒绝；创建画布/context/draw/读像素/两次put失败；
> 缺palette/坏palette/无context；portrait及摘要失败；解码未取得bitmap时不得释放。定向与原有image-import/stages
> 共3文件25项通过，editor typecheck通过；既有GLM断言未改。
> 完整check **7766项**、官方ratchet与以abfef542为保护点的**单次严格fast7277项**全通过。
> 旧测试身份/计数与其它六包基线对象不变；生产仍617文件，移除重复释放分支后分母减少6行/3语句，
> 分支命中+2，不能冒称纯补测导致覆盖提升。日志 /tmp/type-pal-image-cleanup-{check,ratchet,strict}.log。
> 用户要求的小修已完成；本次不重开TB03三签或改它的历史验收，不修改模拟器工作树。
> 此为Node边界替身+真实prepareAuthoredImage，不冒称浏览器视觉验收；本修复不改变可见布局。
>
> 无下一位Agent提示词，本项由Codex自测收口；模拟器继续独立分支实施，不与其未完成代码混在本修复提交中。
>
<!-- original-source-quote:end -->
