# GAME-OUTSIDE-MAGIC-DISABLED-1 — 大世界已学法术的显示与禁用

Status: draft
Phase: phase1
Capability: magic menu fidelity
Coding Owner: Unassigned
Reviewer: Codex
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional（实施后最小菜单验证；本轮未实施/未视觉验收）

## 目标与范围

SDLPal 保留已学的战斗专用法术并禁用；当前 TS 在大世界预过滤，测试要求隐藏。
候选 `1f8bcd468`。拟核 in-game-magic-menu/magic-select 与真实菜单 caller 回归；
是否需要公共配置变化先设计，不自动扩大签名。不动生成数据、脚本机制、UI形态、二阶段。

## 前提真值门

| 维度 | 事实与直接证据 |
|---|---|
| Primary | reference/sdlpal/magicmenu.c:338-372：所有非零已学法术入表，flags 仅改 fEnabled，再 g_iNumMagic++；仅 SDLPal 验证。 |
| 第一阶段 | in-game-magic-menu.ts:135-139 outsideSpells 预过滤；主测试:486-498 要求隐藏；driver 经 runtime 投影创建菜单。 |
| 第二阶段 | N/A；reforge 使用独立能力/状态模型，不能套此一阶段机制。 |
| 目标 | 两类已学法术保留，outside=false 灰且确认无效；先核方案、Owner和白名单。 |

反证见 [Codex R2](../evidence/CODE-QUALITY-94/codex-r2-review.md) C2 与同目录
`codex-r2-menu-counter.mts/.txt`：完整 typed 角色已学[300,305]，两法术及 magic 定义均存在，305被删。
真实公开工厂执行，不是复制实现。最强替代解释为已批准产品偏离或缺资源；完整引用排除缺定义。
若找到明确批准隐藏的用户裁决，应改目标，不声称当前与 SDLPal 一致。
runtime/原版理解/提取数据/测试模型分开核；没有归因迁移缺陷，未改生成物。

用户可见 before→after 目标：战斗专用已学法术隐藏→保留并灰掉、无法确认。
本卡尚无实现；若原版实机或用户既有产品裁决相反，停线重核，不用本卡代替产品裁决。

## 上下文与验收

先读 AGENTS/CLAUDE/agent-workflow、engineering-notes 真值分层、game-mechanics 相关机制、CODE94/R2。
以同成本 true/false 已学法术验证入列/禁用/确认零效果；保留排序/MP恰等/单多人/目标/取消回归。
先失败反例再修复，纯重构分提交；完整模块窗口跑全部门与零诊断；Codex 最小菜单功能验证。

## 当前推进与交接

2026-10-15 Codex：反证已核，设计、Owner、白名单 pending；**build 准入 blocked**。
没有实现，未来须独立验收；done blocked，账本保持 review，未合 main。

下一位 Agent 提示词：先核本卡/R2 C2/SDLPal及真实 caller，提交最窄方案、合法失败 oracle 和独占白名单。
当前 draft，**不得开始实现、不得标 done，不擅改公共接口或机制真值**。
