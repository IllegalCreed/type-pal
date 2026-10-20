# SAVE10治理检查点历史记录

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 2026-10-02 批次 SAVE10 检查点历史记录（不适用于当前 content22/SAVE11，新入口见 current-checkpoints.md）：脚本内容冻结 e3586965…aeba2，二阶段 002/003/004 saves/005 saves 沿真实前驱链重建，四报告 passed，Root 独立重算登记输入/原档/9 份 trace 保存与正式读回完整世界 hash 相同——是当时检查点刷新，不是重新完成同 revision 双引擎全套验收。

## Scope

- 可继续使用入口：证据根 build/evidence-archive/script-governance-20261002/e2e/；四段落目录与终档 SHA 表（002 5a35393e…/003 1dc676ff…/004-saves 6c479afb…/005-saves 8e8b3de4…）在 quote；复用旧 001 报告（SHA 158d4f59…，无 auto.resume 已过当前生产 preflight）本轮未重播视频未改写。

## Execution and assertions

- **为何旧档不能当当前档**：当前运行器为整个内容模块计算自动续跑指纹：s000-s005 正文原字节未改但段外作者内容变化仍改变指纹；此前 002-005 分别含 1/2/1/19 个旧指纹续跑点，须自然执行并正式保存新档不能手改指纹骗过恢复校验；本轮新续跑指纹统一 c949c06a…1a19；旧回执与原档原样保存
- **验证与保全**：002 核 20 行+赏银 500+三苗人；003 核 14 行+12 次楼梯位移+厨房交代；004 核 40 行+端菜中途终点两次正式恢复；005 核 40 行+唯一 50 文+报信因果+后台返程恢复；Root 目视 003 厨房/004 端菜/005 村口读回；引擎 errors 均 0，原 warning 1/1/2/2（清工程 404+Canvas 读回建议）不混作静态零诊断；52 个 E2E 文件共 17,990,370 字节逐字节保全映射 archive-map.json
- **边界**：是当时二阶段检查点刷新不是重新完成同 revision 双引擎 story/guards/items 全套验收；各测试浏览器/服务已退出用户 6012 保持运行；第一阶段既有检查点没有因此失效不为二阶段内容变化重复生成

## Results

- SAVE10 批 002-005 重建四报告 passed；52 文件逐字节保全；续跑指纹机制如实（段外内容变化改变指纹，不能手改）。

## Evidence

- 证据路径：本记录正文（quote 保全）。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| SAVE10 检查点 | 2026-10-02 | 002-005 前驱链重建+Root 重算 | 四报告 passed（已被 SAVE11 批替代） | 无 |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy batches/script-governance 的 SAVE10 历史检查点；固定来源与 source SHA 见下方保全节。

## 原始结论

SAVE10 批 002-005 重建四报告 passed；指纹机制说明（段外内容变化改变续跑指纹不能手改）；52 文件逐字节保全。

## 当时证据

四段落 SHA 表、指纹说明与验证清单在 quote 保全。

## 当前有效性

historical。SAVE10 已被 content22/SAVE11 批替代；本页保留为历史证据。

## 继任文档

当前检查点归 current-checkpoints.md。

## 原文保全

固定源 revision `226f8cb90880b74c82f3c39b6e09d949f2a16e7b`，source SHA `d8d76264b27f0a8ff01064b4c31ac958f59041b0e3920c101b2b41cf4728f467`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # SAVE10治理检查点历史记录
>
> 以下保留2026-10-02批次的原始记录。它们不适用于当前content22 / SAVE11；新入口见[当前检查点](current-checkpoints.md)。
>
> 脚本内容冻结在e3586965e39ece390e77bd9357b14b21ecaaeba2，二阶段002、003、004 saves和005 saves已沿真实前驱链重建。
> 四份报告均passed，Root独立重算登记输入、原档和9份trace，保存与正式读回的完整世界hash相同。
> 这是当前二阶段检查点刷新，不是重新完成同revision的双引擎story、guards、items全套验收。
>
> ## 可继续使用的入口
>
> 证据根目录为主工程的`build/evidence-archive/script-governance-20261002/e2e/`。
> 下表各目录均含`report.json`与相应`NNN.end.save.json`；使用报告入口，不手工改档或替换digest。
>
> | 段落 | 目录 | 终档SHA256 |
> | --- | --- | --- |
> | 002 | reforge-002-2026-10-02T14-11-25-321Z | 5a35393ef333adb6dbe21b24a74ab6974ab9824d4ed34ad991d7c8f2ecdb5040 |
> | 003 | reforge-003-2026-10-02T14-12-34-823Z | 1dc676fffcda62784a7947372880bfad612937975c540e87e506abc009037614 |
> | 004 saves | reforge-004-saves-2026-10-02T14-13-28-622Z | 6c479afbcf1df0ed876ea8c09544862fcfbd9595434193b8c47fff31a9f0f9dc |
> | 005 saves | reforge-005-saves-2026-10-02T14-14-39-629Z | 8e8b3de4c39cafaf460f6328dec072a2c32a3c0f793508417e91b04a6382a5da |
>
> 例如从当前004检查点正常演示005，仍使用既有脚本：
>
> ```sh
> pnpm e2e:005:reforge --from build/evidence-archive/script-governance-20261002/e2e/reforge-004-saves-2026-10-02T14-13-28-622Z/report.json --headed
> ```
>
> 复用的旧001报告位于`build/evidence-archive/e2e005-20261002/e2e/reforge-001-2026-10-02T12-13-17-769Z/report.json`，
> 原档SHA为158d4f59f6b6e04d9855801000059c76913c85432e3a515de98313c3855ab695。
> 它没有auto.resume，已通过当前生产preflight和002前驱合同；本轮没有重播001视频，也没有改写该报告和存档。
> 第一阶段既有检查点没有因此失效，不为二阶段内容变化重复生成。
>
> ## 为什么旧002至005不能当当前档
>
> 当前运行器为整个内容模块计算自动续跑指纹。虽然s000至s005正文原字节未改，段外作者内容变化仍会改变该指纹。
> 此前二阶段002至005分别含1、2、1、19个旧指纹续跑点，因此需要自然执行并正式保存新档，不能手改指纹骗过恢复校验。
> 本轮新续跑指纹统一为c949c06a7ac42c001207ace7b1912c507698e75b79cb7b9ea57d05afcbf61a19。
> 旧回执与原档仍是历史证据，原样保存；旧005页面中原“当前可用”入口由本页替代。
>
> ## 验证与保全
>
> 002核20行、赏银500及三苗人进房；003核14行、12次楼梯位移及厨房交代；
> 004核40行、端菜中途和终点两次正式恢复；005核40行、唯一50文、报信因果、正常移动及后台返程恢复。
> Root另目视003厨房读回、004端菜读回与005村口读回：人物、场景、端菜外观和画面亮度正常。
>
> 浏览器引擎errors均为0，原warning计数依次1、1、2、2：清工程404与Chrome Canvas读回建议。
> 这些原始信息不删除，也不混作静态质量门的零诊断声明。本轮无视频，无失败case，无cleanup错误。
>
> 52个E2E文件共17,990,370字节已逐字节保全，映射为证据根上级的`archive-map.json`。
> 报告里的原绝对目录按映射查找，不重写原report。各测试自建的浏览器和服务已退出，用户6012保持运行。
>
<!-- original-source-quote:end -->
