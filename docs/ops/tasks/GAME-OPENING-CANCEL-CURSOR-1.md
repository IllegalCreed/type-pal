# GAME-OPENING-CANCEL-CURSOR-1 — 标题读档取消默认光标

Status: review
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: task-card-v1 / 1.0.0

## 目标

保留原卡「GAME-OPENING-CANCEL-CURSOR-1 — 标题读档取消默认光标」的任务归属与历史边界。原目标见原文(摘录:修复前候选：标题选读档、槽位取消后，SDLPal 默认项复位为新游戏，TS 保留读档项。);本页治理不重开已终态任务。

## 范围

原卡含章节[GAME-OPENING-CANCEL-CURSOR-1 — 标题读档取消默认光标、2026-10-15 最终模块窗口（当前）、目标与范围、前提真值门、上下文与验收、2026-10-15 用户批准与最小方案],共2个原文链接。治理范围仅限文档角色、保全与链接处置,不改产品/测试/coverage。

## 前提与证据

固定main源5350B(SHA 4a6f2875a066);原卡前提按原时点保留。当前存活入口:[codex-final-window.md](../evidence/CODE-QUALITY-94/codex-final-window.md) [codex-r2-review.md](../evidence/CODE-QUALITY-94/codex-r2-review.md)。

## 验收

本页治理验收=模板符合+原文逐字节保全+链接处置如实;原卡验收结论保持原时点(原Status:review),治理不改写。

## 状态与交接

review保持原语义;本治理候选为作者稿(partial/needs),交Owner非作者接收;无新执行授权。


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 5350B / SHA-256 4a6f2875a066ba5123856ea766b3d055c642cc5c440e6c08725e1d802aeec8ac；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# GAME-OPENING-CANCEL-CURSOR-1 — 标题读档取消默认光标

Status: review
Phase: phase1
Capability: opening menu fidelity
Coding Owner: Codex
Reviewer: Codex
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional（已完成真实标题浏览器链与截图核验）

## 2026-10-15 最终模块窗口（当前）

两项获批修复已分别提交并推送，定向125、完整game3564与七包typecheck通过。
完整check/ratchet/protected数值通过但真实诊断未清零，本卡仍review，不标done、不关闭文件。
本轮为Codex作者实施/自验；冻结的独立三验与后续修复分开。
最终原件/诊断计数/官方基线及剩余边界见[完整窗口](../evidence/CODE-QUALITY-94/codex-final-window.md)。
以下前提表固定修复前候选，用于追溯失败反例，当前实施以本节与用户批准段为准。

## 目标与范围

修复前候选：标题选读档、槽位取消后，SDLPal 默认项复位为新游戏，TS 保留读档项。
候选 `1f8bcd468`。仅拟核 menu-driver 标题取消窄分支及对应真实 caller 回归，
不预授权修改 factory、公共接口、UI 形态、Save 或二阶段。

## 前提真值门

| 维度 | 事实与直接证据 |
|---|---|
| Primary | reference/sdlpal/uigame.c:143-150 取消槽位后 wDefaultItem=0；仅 SDLPal 验证，pal.exe 实机观感未核。 |
| 第一阶段 | menu-driver.ts:984-990 仅 pop；opening-menu.ts:47-50 注释声称取消复位；cov85.test.ts:819-832 只检查栈形。 |
| 第二阶段 | N/A；reforge 菜单独立。 |
| 目标 | 真标题链取消精确回 cursor0，系统菜单取消合同保持；先核方案及 Owner/白名单。 |

执行证据见 [Codex R2](../evidence/CODE-QUALITY-94/codex-r2-review.md) C3 与同目录
`codex-r2-menu-counter.mts/.txt`：真实 dispatch Down→Confirm→Menu，原 opening 对象仍 cursor1。
未改生产代码。最强替代解释为曾批准的光标记忆偏离；当前未找到。
若找到明确用户批准或真实 caller 取消后另行归零，应重核目标。
已分开 runtime、SDLPal/pal.exe 与测试模型，不涉及提取/生成数据；不是用手写菜单模拟推断。

用户可见 before→after 目标：取消后仍选读档→取消后选新游戏。本卡只登记事实；
若发现既有产品裁决冲突，停线交用户，不用本卡代替裁决。

## 上下文与验收

先读 AGENTS/CLAUDE/agent-workflow、engineering-notes 真值分层与真实函数纪律、CODE98/99/R2。
完整 typed 状态由真实 opening 链进入 load 再取消，精确断言 cursor0；系统取消仍关整栈。
先失败反例再修复，纯重构分提交；完整模块窗口跑全部门与零诊断；实施后 Codex 最小功能界面取证。

## 2026-10-15 用户批准与最小方案

实现与定向自验：标题读档取消pop后仅对opening父菜单selection.cursor归0；游戏内取消仍清整栈。
沿真实Down→Confirm→Menu链的原用例先恰一业务断言失败（cursor1≠0），修后相邻11files/125tests、game typecheck通过。
最小真实浏览器验证完成：独立Vite6025、系统Chrome155、真实启动到标题，经ArrowDown/Enter/Escape返回标题cursor0，pageErrors=[]。
截图CODE94/codex-opening-selected-load.png与codex-opening-cancel-new-game.png已直接查看；读取dev探针只用于断言，无写gs造状态。
默认Playwright捆绑headless缺失，改用已安装Chrome的独立无用户profile会话；未安装浏览器、未写用户浏览器资料。
回执codex-opening-browser.json。当前作者自验，完整模块质量门仍待最终窗口，不标done、不关闭账本。

用户本轮明确批准前两项，其中本项为②；Codex已核uigame.c:143-150、真实标题dispatch反例和
游戏内取消清栈caller，premise verified / design agree，**build allowed**。
单一写入Owner=Codex，白名单menu-driver.ts及其cov85真实链测试；只复位标题取消光标，
不改工厂/界面形态/Save/公共接口。先失败反例再修复；旧draft/no-build交接只保留为历史。

真实反证已在候选5477af1e4复跑，见CODE94/codex-r3-review.md。用户已授权Codex接手低风险返工；
此项改变当前第一阶段行为，按用户原治理约束，已在会话集中请求三项最小修复裁决，现已明确批准本项。
最小方案：只在标题读档槽取消分支pop后，对仍在栈顶的opening复位selection.cursor=0；游戏内清整栈分支不动，不重建工厂、不改WORD文案或界面形态。真实opening→读档槽→取消链先断言cursor0失败，再修复；同时核系统取消仍清整栈。拟白名单menu-driver.ts、其cov85真实链测试（最多两文件）；实施后最小功能界面验证，不冒称pal.exe实机证据。
Coding Owner=Codex；按上述build白名单实施，完整验收前不标done。

## 先前交接记录（历史）

2026-10-15 Codex：反证已核，最终设计/Owner/白名单 pending；**build 准入 blocked**。
未实现，未来须独立验收；done blocked，账本保持 review，未合 main。

下一位 Agent 提示词：先重核本卡/R2 C3/SDLPal，提交最窄方案、真实 caller 失败 oracle 与独占白名单。
当前 draft，**不得开始实现、不得标 done，不扩展 UI/接口/Save 范围**。
```
<!-- incremental-original-source:end -->
