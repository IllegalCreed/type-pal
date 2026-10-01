# OPENING-HANDOFF-1 — 开场视频结束不露出旧标题菜单

Status: build
Owner: opening_handoff（受委派贡献者）
Reviewer: Codex Root（独立验收）
Phase: phase2
Capability: E1
Visual Verification Timing: mixed

## 目标与范围

用户2026-10-01明确要求修复“选择新的故事、视频结束后再次露出标题菜单，再进入s000”。
只修标题→入口视频→首场景的画面所有权交接；不改存档、正文、移动、视频跳过时延、其它剧情视频语义。
白名单：reforge启动/标题呈现与相邻回归、RF001交接瞬间反控、此卡。禁止修改编辑器文件和6012服务/页面。

## 前提真值门

- 行为前提：菜单逻辑退出后仍残留画布像素，视频撤层时首场景尚未呈现。
- primary：用户实际所见；`opening-menu.ts:107-110`cleanup仅停rAF/键盘，`video-player.ts:70-72`结束撤层，
  `main.ts:530-536`菜单观察已清空、播放入口视频，之后才继续启动；当前RF001事件没有第二次opening menu。
- 第一阶段：只参考其标题/入口衔接UX；本修不复制引擎架构，贡献者须核对应boot/avi入口一手代码。
- before→after：视频后露出旧菜单→过渡期不露旧菜单，随后正常显示s000；用户已直接授权。
- 替代解释：测试有意重新打开菜单。RF001的新页面读档在001剧情结束后，不能解释视频结束到s000之间；
  若真实像素记录表明菜单被再次调用而非残帧，必须停止当前根因并返报。

## 上下文锚点与验收

- AGENTS当前模式、READ-FIRST铁律6/8/9；当前SAVE10/content21，不引入新版本或兼容。
- SAVE-AUTO-CHECKPOINT-1最终收据中的开场漏检只作现状，passed不证明本交接无缺陷。
- 先红后绿：通过真实菜单/视频结束/首场景尚未完成的窗口观察画布，不只读opening=null。
- 自测类型/lint零诊断；不改帧/等待阈值掩盖问题；冻结后正式RF001和交接截图证明无旧菜单。
- 6012原服务保持；新测试服务由执行者独立拥有并清理，不能影响用户浏览器。

## 当前模式推进记录

- Codex直接核根因：premise verified / build allowed。受委派Owner独占上述白名单实现，隔离分支交付。
- 自验pending；Root须直接读diff/真实失败与成功收据、必要最小浏览器视觉证据后独立接收。
- 用户体验pending；不把本卡与编辑器三项工作或存档版本改动合并实现。

## 下一位 Agent 提示词

opening_handoff在隔离工作树实现及自验，提交候选SHA、红绿日志与实际画面交接证据；Root独立验收，不得自行合main。
