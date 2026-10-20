# C1 逐文件 A–H 索引 — 40-60 存档+analytics(9 条 fullReads)

读域标注同 [73-78 索引](../73-78-shell-lifecycle/per-file-index.md)。指纹勘误见 [`read-boundaries.json`](read-boundaries.json)。共享论据引用本目录 README。

## 生产文件(4)

**tools/save-io.ts**【原审全文】A:envelope format 严格等+version===1 严格等(version=2 拒绝有测试,不交给 Save API)、必要字段门(partyMembers 数组+wNumScene 数值双臂有测试)、savedAt:0 由 caller 覆盖约定。caller=tools-panel.ts:625-663 导入导出。B:注释中文错误原因与实现一致。C:纯序列化/校验,DOM 在 caller。F/G:26 行无冗余。H:纯函数直测。
**tools/quick-save.ts**【原审全文】A:快存门 `mode==='explore' && !dialogBox && menuStack空`(防脏档)、F5/F9 preventDefault、fire-and-forget 内部 catch 三态 toast、解绑出口。caller=bootstrap.ts:1110-1118 装配、saveSlot→core/save/api。C:QuickSaveDeps 全注入(getGs/saveSlot/loadSlotIntoGame)无隐式全局。D:toast 复用 showToast。F/G:无死分支。H:jsdom+fake timers 可直测(C5 重写后)。
**analytics/install-analytics.ts**【原审全文】A:consent UI 先挂、GA start 抛错时 `ui.destroy()` 回滚再抛(GAME-ANALYTICS-FAILED-INSTALL-OWNERSHIP-1 用户批准修复形态)、destroy 先 stopAnalytics 再拆 UI、readConsent 每次现读+subscribeConsent 窗口订阅。caller=main.ts 安装点。B:回滚分工注释(GA 创建者回滚订阅/安装器回滚 UI)准确。C:装配层不持业务状态。F/G:无死分支。H:四端口(document/window/navigator/enabled)注入可测。
**analytics/analytics-consent-ui.ts**【原审全文】A:unset 才弹面板(116)、已决只留 preferences 角标、writeAnalyticsConsent 失败(存储 blocked)保持面板不伪装已保存、重挂先移除既有 root(幂等)、隐私信号双文案。caller=install-analytics 装配+main 重开设置。C:DOM/存储边界经注入;不触网络。D:applySharedButtonStyle 按钮样式复用。F/G:无死分支。H:jsdom 直测(含坏存储替身)。

## 测试文件(5,E 为主)

**save-io.test.ts**【原审全文】E:serialize 头/version、非法 JSON/格式错双例、缺 partyMembers 拒、version=2 拒(未来 envelope 不交 Save API)。Codex更正：原`as never`残缺成功夹具的合法性判断撤回；三处已改为真实初始GameState，损坏JSON只在IO拒绝用例使用，四条测试身份/合同不增删。
**save-import-quicksave.glm-msio.test.ts**【返工补读】原审查仅标题级读取,2026-10-20 返工全文补读。E:MSIO-D1 wNumScene 缺失/非数双臂、E1 F5/F9 preventDefault+F6 放行、E2 存档失败 toast 带原因不外抛、E3 空槽/成功双臂 toast+类名。补读结论:与 quick-save.test 分工互补,无缺口。
**quick-save.test.ts**【返工补读】原审查仅前 100/160 行,2026-10-20 返工补读尾部。E:C5 重写——真实 createInitialGameState、canQuickSave 四态(battle/对话框含完整 dialogBox 形/菜单栈)、F5 成功+F9、不可存态、saveSlot reject 带原因、F9 成功/空槽/reject、解绑 oracle。补读结论:无缺口。
**install-analytics.test.ts**【原审全文】E:Measurement ID 形状、disabled 只显 UI 无 GA script、DNT/GPC 默认关但 UI 可见;beforeEach/afterEach 清 head/body/localStorage/dataLayer。
**analytics-consent-ui.test.ts**【原审全文】E:面板定位/zIndex 19 不遮进入按钮、不 autofocus、拒绝→允许→preferences 全环、destroy 移除 root、坏存储保持面板且不写入。

## Codex接收边界（2026-10-20）

本索引的读取身份、补读勘误和逐文件具体结论按各自范围接收；测试条目多为E维，不能读成69文件全部八维已验收。各文件A–H已陈述/尚缺依据的状态分别列于[Codex验收记录](../codex-pending27-acceptance.json)。未单列论据的维度保持review-unknown，文件不关闭；后续只补这些具体缺口，不重复已成立的E/primary。

Codex已撤回“save-io主测as never残缺成功输入合法”的原判：三处改用createInitialGameState生成完整typed状态；损坏JSON仍只用于明确IO拒绝反例。测试身份和四条合同保留。
