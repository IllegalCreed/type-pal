# A5 - 工程打包导出 zip(分享/备份)

Status: done(FSA 真导出留用户点验:工程菜单 → 🗜 导出 zip → 得 <id>.zip)
Owner: Opus(作者之旅收尾环:游戏做好了得能打包分享)
Reviewer: 用户
Phase: phase2
Capability: A5 工程自包含分发(能力地图 A 域)
Last reviewed: 2026-10-15
Governance Owner: Codex（历史卡包 A 候选；待独立验收）
Template: task-card-v1 / 1.0.0

## 目标

保留工程自包含 ZIP 导出的设计和历史交付：递归打包磁盘工程整树，用一个 `<projectId>.zip` 分享或备份；未保存的编辑内容不自动入包，dirty 时先确认提醒。

## 范围

二阶段编辑器的 `core/zip.ts`、`core/export-zip.ts` 与工程菜单；原卡还记录次日修复另存为丢磁盘素材。dev 种子无 FSA 句柄时导出禁用，另存为仍按原 serialize-only 约定。本次只迁移文档，不重新实施资产管线或修改导出/另存为。

## 前提与证据

原前提是工程文件夹构成分发闭包，因此导出不挑不滤。浏览器 ZIP 用 CompressionStream(deflate-raw)、CRC-32、UTF-8 文件名、DOS 1980 时间保证同内容同字节；无 zip64，超过 4GB/65535 条应报错。原文给出方法与断言轴，没有实现 commit、执行日期或原始日志；这些实现陈述按历史读取。

反例是把未保存编辑态误当磁盘内容，或 dev 菜单禁用测试当真实 FSA 导出成功；两者都不满足原合同。

## 验收

原卡记录 editor 111 测（新增 4 个 ZIP 轴：CRC 已知值、中文/二进制逐字节 roundtrip、STORE 择优、可复现）与 Playwright 无句柄禁用/提示检查。真实用户路径仍明确待点验：打开本地工程→工程菜单导出→解包逐文件对照。原状态 `done(FSA 真导出留用户点验…)` 原样保留，不把待点验勾为通过。

次日另存为修复采用整树拷贝再覆盖当前序列化内容、同目录 isSameEntry 跳过；原两测是双向内存 FSA mock，不能替代真实磁盘或用户点验。

## 状态与交接

原 Owner 为 Opus、Reviewer 为用户；顶部 done 附注的 FSA 用户点验缺口保留。文档治理 Owner 只交付候选，不能代签用户验证。无新的产品实现交接；根线程直接核读并落中央记录，若要关闭真实 FSA 缺口需提供用户点验或另行授权的实际验证。

## 历史范围

A5 二阶段作者之旅收尾环；原卡没有具体日期、实现 SHA 或打包样品。文字“次日”只表示另存为修复晚于初始交付，不推算日历日期。

## 当时证据

完整原文记录 `buildZip`、FSA 递归收集/Blob 下载、菜单 dirty 确认、4+2 测轴和无句柄 Playwright。没有入库 ZIP、解包清单、截图/日志路径或用户验收回执，本轮明确缺失。

## 当前有效性

historical。保留整树导出与另存为补闭包的历史意图，不据此断言当前 CompressionStream 支持、源码行为或 ZIP 产物正确。FSA 用户点验没有因归档而完成；旧产品验收状态不被文档治理改成新的运行证明。

## 继任文档

当前开发规则由[二阶段开工规则](../../../../phase2/READ-FIRST.md)与[现行工作流](../../../agent-workflow.md)控制；本卡不指定已完成的产品继任任务。重新验证时须钉当前导出入口、真实目录与导出后逐文件 oracle。

## 原始结论

以下完整原卡只按原始时点解释。原字节可从 Git blob `3d36ffad1cbc8210deda1fa8afae04ad10bdfc54` 回读；新增正文没有替代原历史判断。

> # A5 - 工程打包导出 zip(分享/备份)
>
> Status: done(FSA 真导出留用户点验:工程菜单 → 🗜 导出 zip → 得 <id>.zip)
> Owner: Opus(作者之旅收尾环:游戏做好了得能打包分享)
> Reviewer: 用户
> Phase: phase2
> Capability: A5 工程自包含分发(能力地图 A 域)
>
> ## 设计
> 工程自包含铁律 → 导出 = 把工程文件夹**原样**递归打包(不挑不滤,文件夹就是全部世界),
> 一个 zip 即可分享/备份。读磁盘:未保存改动不入包(dirty 时 confirm 提醒先保存)。
>
> ## 落地
> - `core/zip.ts`:零依赖浏览器 ZIP 打包器 —— DEFLATE 走原生 CompressionStream('deflate-raw')
>   (方法 8,反涨小文件择优 STORE)、CRC-32 查表、UTF-8 文件名位(中文路径不乱码)、
>   DOS 时间恒 1980(**导出可复现**:同内容同字节)。无 zip64,超 4GB/65535 条报清晰错。
>   4 测:crc 已知值 / 中文+二进制 roundtrip 逐字节 / STORE 择优 / 可复现性。
> - `core/export-zip.ts`:FSA 目录递归收集 → buildZip → Blob 下载 `<projectId>.zip`。
> - 工程菜单「🗜 导出 zip…」:有句柄才可用(dev 种子工程禁用带提示);打包中态;dirty confirm。
>
> ## 验证
> - ✅ pnpm check 全绿(editor 111 测 = +4 zip)。
> - ✅ Playwright:pal dev 菜单项就位、禁用 + 提示正确(无句柄)。
> - ⏳ 用户:本地工程点导出 → 得 zip → 解开与工程夹逐文件一致(macOS 自带解压即可验)。
>
> ## 发现债 → 已修(次日)
> - **「另存为」只写 serializeProject 文件集丢磁盘素材** —— 已修:`fsa-copy.ts`
>   copyDirRecursive(整树递归拷贝,同名覆盖他文件保留,2 测双向内存 FSA mock)→
>   saveProjectAs 先整树拷源目录再覆写内容文件(当前编辑赢);选同一目录 isSameEntry 跳过拷贝;
>   App 穿 dirHandleRef。dev 种子工程(无句柄)保持旧行为(serialize-only,其素材本就在
>   /extracted 绝对路径)。
