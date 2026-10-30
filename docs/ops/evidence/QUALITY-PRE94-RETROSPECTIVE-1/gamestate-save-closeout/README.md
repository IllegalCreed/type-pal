# CODE53 GameState 与 CODE58 导出错误增量

2026-10-24，同一 `codex/code-quality-3y`，基点 `3bf94a63955156046c6615df663e405917f5813b`，Codex 单 Owner。逐文件读域、八维、caller/primary、全部61个旧测试身份去向、源指纹、过程勘误和未修项见 [review.json](review.json)。这是有限代码接受，53／58仍 partial；未跑全仓、官方 coverage、protected，未开 PR 或合 main，不扩94–102。

## 代码与合同

GameState 的两项纯转换移到 `battle-role-projection.ts`，原出口、签名、所有其它执行代码／类型保持；修正状态所有权、IP、V1、fade 等误导注释。GS主测试61→56，精确退役两类型常量、非法完整输入及两JSON自比；游标／对白必要字段迁到真实codec。初态默认字段与稀疏事件两例曾误删，身份审计发现后恢复，不计退役；原始54例中间回执不冒充最终56例。两槽覆盖与独立状态行反控均旧全绿、新恰一个业务AssertionError；最终版本也重放了两针。`save-io`29→31，丢cursor反控旧全绿、新单红；原三项拒绝断言全保留。

用户批准58导出失败提示后，先正式红例（缺toast，另有一个未处理拒绝），再修错误反馈与本次URL清理；不改存档内容、槽位、数据库或导入。四例分别核读取拒绝、空槽、实际V1 Blob／文件名、下载动作拒绝清理。组合11文件340例全绿，随后只重跑类型修正涉及的4例；game typecheck最终0。退役保护工具通过，matcher未改、仅增加精确61→56快照；baseline未动。

## 原件与复验

[完整原件包](receipts.json.gz)为无损JSON/base64 gzip，成员逐字节索引在review；含实际command/cwd/时间/exit、显式default reporter stdout/stderr、原生JSON、失败、恢复、producer及所有中间失败。初次类型错误／FileReader受控时间超时保留；没有放宽timeout、静音或核心mock。[静态回执](static.json)另记本候选实际门，历史门不继承。

只读快检：`node docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/gamestate-save-closeout/verify.mjs`。核当前源/依赖/原件/测试身份与[纯转换还原](prove-module.cjs)，不写文件、不联网、不跑测试或coverage。它不能自动证明八维语义；这些依赖review的具体核读与取舍。源/caller/合同漂移按claim复核，不给旧证据无条件换SHA。

复跑导出：`pnpm --filter @type-pal/game exec vitest run src/tools/tools-panel.save-io.test.ts --reporter=default`。其它定向命令与原件保留在包内execution字段。官方采集仅等全部pre94收尾。

## 功能画面与边界

全新非持久Chrome context，真实bootstrap／资源／按钮／Save.loadSlot／IndexedDbSave；仅临时令平台readonly事务抛SecurityError，无存档写入。空槽→失败toast→恢复读成功，0下载／0成功toast；浏览器55 debug+4 log完整保留，error/warning/pageerror/requestfail为0。首次全屏图只拍到先前空槽与淡入时点，不授失败视觉信用；重拍等待帧、关闭CSS过渡的[错误toast静态图](export-failure.png)已实际看图。不是普通剧情/E2E或真实浏览器权限弹框验收；两次自有Chrome及6005服务均已关闭。

## 下一片

GS四文件和导出专测本轮可关闭，codec专测是旧关闭刷新，工具面板整源继续review。53／58仍保留Dev大装配器／整体组织与FileReader失败未知；`iCurEquipPart`保留现有公共V1字段，删除是候选而非本批行为。固定77 accept／6 partial未动；下一片复用既有Dev读域与控制，再处理1／57。3m两数值选择、42姓名速度等待实际答复，不能由本次导出批准代替。
