# GAME-TOOLS-SAVE-IO-ERROR-FEEDBACK-1 — 工具面板导出失败提示

Status: draft
Owner: Codex
Reviewer: Codex
Phase: phase1 game
Capability: Q3 tools / IO error boundary
Visual Verification Timing: functional-ui

## 前提与停止线

CODE58当前读取发现：工具面板“导出”按钮直接启动异步函数，未捕获loadSlot或序列化/下载异常。真实bootstrap委托Save.loadSlot；该API等待IndexedDbSave.loadSlot，数据库open/request失败会拒绝，并不兜底为null。只读导出不写入槽位，但新增可见失败提示仍按用户行为变更停止线先裁决。

隔离定向探针通过既有ToolsPanelDeps的IO边界注入SecurityError，实际setupToolsPanel、系统页/首槽导出按钮和toast均不mock。结果一个业务AssertionError（缺少错误toast），另有未处理拒绝；完整原件归父卡本批status-tools-closeout证据。临时探针恢复移除，不加入未批准的常态测试。原件里的unhandledErrors派生字段是suite差值，不能当诊断计数；实际拒绝以raw全文为准。

## 待裁决范围

建议：仅在导出失败时沿用已有错误toast显示原因；空槽/成功路径与合法V1内容、槽位、数据库版本不变。不重试、不新增兼容路径。另发现FileReader没有onerror，但未证明真实失败可达和应有文案，本卡不顺带修改或声称已修。

## 准入与验收

当前仅draft/只读取证，产品实现未改。用户批准后才build allowed；先保留正式失败反例再修，覆盖失败不下载/不报成功、空槽与成功回归，下载资源在本次所有权内清理；纯重构分提交。八维、生产caller、合法输入、原始红绿与影响范围静态门写回父卡唯一证据。全仓/coverage/protected继续等待全部pre94收尾，不扩大94–102。

## 交接

唯一分支codex/code-quality-3y，唯一Coding Owner Codex。属于CODE58发现的必要返工候选，不是另开后续治理波次；未批准时CODE58保持partial。
