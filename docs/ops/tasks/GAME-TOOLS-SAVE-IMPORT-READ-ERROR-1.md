# GAME-TOOLS-SAVE-IMPORT-READ-ERROR-1 — 工具面板导入读取失败提示

Status: build
Owner: Codex
Reviewer: Codex
Phase: phase1 game
Capability: Q3 tools / file IO error boundary
Visual Verification Timing: functional-ui

## 前提与来源

CODE58真实工具面板的导入只处理FileReader.load，不处理error。独立非持久Chrome以原生磁盘入口选中合法V1文件，暂停change分发后仅删除自有临时文件，再执行真实handler：原生NotFoundError、error→loadend、没有load；界面没有成功或错误提示，写入次数0、槽位前后null。一个业务AssertionError证明缺失反馈；不是解析器或Save校验失败。primary为W3C File API §4／§6.2.3／§7，浏览器失败观察另保留完整原件。第一阶段工具便利功能，无SDLPal对应；二阶段N/A。

最强替代解释：自动化上传副本会继续读取成功。首个错误入口探针及此副本轮均不给缺陷信用；最终改用CDP原生磁盘路径，真正NotFoundError已观察。副本轮仅在全新一次性context里写了一个测试槽，关闭后退出，不触碰用户或主树存档。

## 目标、准入与边界

用户2026-10-25答复“批准补齐导入读取失败提示（推荐）”。Codex核定build allowed；同一codex/code-quality-3y，唯一Coding Owner Codex。白名单tools-panel.ts的FileReader error处理与tools-panel.save-io.test.ts。先正式失败反例，再沿用既有错误toast显示“导入失败＋原因”；失败不写槽位，合法导入、格式、数据库、导出保持。未获授权的abort/同步异常策略不顺带改，结构重构另提交。

## 验收与交接

实际setupToolsPanel／codec／toast执行，平台Reader失败为IO边界；原生浏览器重放确认。核失败不写／不成功及同文件重选、合法V1写入、解析拒绝和写入拒绝。复用既有导出及夹具合同，集中必要相邻与typecheck。原件、八维和只读复验入口写回父卡CODE58证据；全仓check／official coverage／protected及PR继续等全部pre94解决，不扩94–102。

当前仅准入，未宣布实现或整卡接受；主工具源仍review。父卡[QUALITY-PRE94-RETROSPECTIVE-1](QUALITY-PRE94-RETROSPECTIVE-1.md)。
