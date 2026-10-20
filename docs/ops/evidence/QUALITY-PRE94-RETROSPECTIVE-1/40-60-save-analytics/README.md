# CODE40/41/59/60 存档+analytics 四卡复审切片(GLM,只读零改动)

基点 `dec0626e1c`;本片零改动(文件与基点逐字节相同)。范围:CODE-QUALITY-59(save-io 版本边界)、60(quick-save 生命周期)、40(install-analytics)、41(analytics-consent-ui)四卡 4 生产文件 + 5 份测试全文逐文件八维。analytics-consent.ts / google-analytics.ts 归 3y/3z 卡(既有 partial),不在本片重复。读取 SHA 见 [`read-boundaries.json`](read-boundaries.json) 逐文件 A–H 索引与读域标注见 [`per-file-index.md`](per-file-index.md)(2026-10-20 C1 返工新增)。,定向原件 [`directed-final.json`](directed-final.json)。

**结论:未发现可由 primary source + 真实 caller 证实的新 direct defect;零改动。**四卡建议 `pending → partial`。

## A 正确性与边界(逐文件)

- **save-io.ts(26)**:envelope `format` 严格等 + `version===1` 严格等(未来/旧 envelope 拒绝,不交给 Save API——version=2 拒绝有测试);必要字段门(partyMembers 数组 + wNumScene 数值);`savedAt:0` 由 caller 覆盖的约定在注释与 caller(tools-panel)一致。
- **quick-save.ts(61)**:快存门 `mode==='explore' && !dialogBox && menuStack空`(防战斗/剧情脏档);F5/F9 preventDefault 拦浏览器刷新;失败/空槽/成功三态 toast 反馈;deps 全注入(getGs/saveSlot/loadSlotIntoGame),无隐式全局。
- **install-analytics.ts(64)**:consent UI 先挂、GA 创建失败时 UI 回滚再抛(GAME-ANALYTICS-FAILED-INSTALL-OWNERSHIP-1 用户批准修复的当前形态);destroy 先停 GA 再拆 UI。readConsent 每次现读、subscribeConsent 订阅窗口广播——与 3y/3z 已审合同衔接一致。
- **analytics-consent-ui.ts(124)**:unset 才弹面板、已决只留 preferences 角标;`writeAnalyticsConsent` 失败(存储 blocked)保持面板不伪装已保存(有测试);重挂先移除既有 root(幂等)。

## B–H

B:注释交代快存门动机与读档复用链。C:DOM/存储/GA 边界分层清楚(UI 不触网络、installer 只做装配)。D:按钮样式提取 applySharedButtonStyle 合理。F/G:无死分支。H:deps 注入使 jsdom 可直测(无需核心 mock)。

## E 测试质量(逐例)

5 份测试逐例核读:save-io 版本/字段拒绝矩阵;quick-save C5 重写后真实 GameState + fake timers + 三条异步反馈 oracle + preventDefault + 解绑;msio 补丁覆盖 wNumScene 缺失、F6 放行、存档失败原因、空槽 toast;install 测 DNT/GPC 默认关 + UI 可见 + 无 GA script;consent-ui 测布局不遮进入按钮、拒绝/允许/preferences 循环、坏存储保持面板。无缺口,不新增。

## 执行事实

定向 5 files / **21 passed** / 0 failed,exit 0,无 stderr。零改动无需 typecheck/biome。**未跑**(留阶段收尾):全仓 check、ratchet、protected fast、coverage。

## 失效条件与剩余项

Save API envelope、toast 实现、analytics-consent 存储键/广播合同、main.ts 安装点变化会使对应结论待复核。3y/3z/72 等关联卡的既有 partial 不因本片升格。
