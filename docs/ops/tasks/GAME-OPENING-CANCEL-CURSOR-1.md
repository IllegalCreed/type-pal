# GAME-OPENING-CANCEL-CURSOR-1 — 标题读档取消默认光标

Status: build
Phase: phase1
Capability: opening menu fidelity
Coding Owner: Codex
Reviewer: Codex
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional（实施后最小验证；本轮未实施/未视觉验收）

## 目标与范围

标题选读档、槽位取消后，SDLPal 默认项复位为新游戏；当前 TS 保留读档项。
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
