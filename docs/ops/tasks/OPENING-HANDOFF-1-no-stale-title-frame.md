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

## 贡献者一手复核与窄修

- 独立 premise verified：一阶段 `packages/game/src/shell/bootstrap.ts:1607-1618` 已记录同型残帧缺陷，
  AVI 返回时清 framebuffer 并立即 flush 黑屏。二阶段 `opening-menu.ts:107-110` 只结束帧/输入 owner，
  `main.ts:530-536` 随后先等入口视频，再建立世界与首帧；标题像素没有被其它 owner 覆盖。
- 最强替代解释“菜单重新打开”已被实际撤层证据推翻：视频 native `ended` 后、runtime 尚未 ready 时，
  真实 canvas 仍为原菜单像素；不是第二次菜单状态，也不是 E2E 后续读档新页面。
- 2026-10-01红控：`build/e2e/reforge-001-2026-10-01T14-42-21-770Z/report.json` status failed，
  标题和自然结束撤层窗口都是 1280×800、406480 非黑像素；`001-video-handoff.png` 实际显示旧标题菜单。
  `/tmp/opening-handoff-red.log` 保留原始失败，未调整动画时延、驱动阈值或视频资源。
- 相邻真实菜单回归先红：`/tmp/opening-handoff-unit-red.log` 3 failed / 1 passed；新故事与实际非空读档退出都缺清屏。
- 修法：清理标题 owner 时同步填满其 canvas 为不透明黑（保存/恢复 context，重置变换）；
  在 Promise 返回给 boot、视频 URL 解析与视频撤层之前完成。新故事、无 intro 的入口和读档都不再携带已退出的标题像素。
  不改 `main.ts`、通用 `video-player.ts`、500ms 跳过规则、存档、正文或任何 6012 生命周期。
- RF001 新增只读 DOM 撤层 observer：在 native 入口视频 removal 的 MutationObserver 回调读真实 RGBA，
  同时要求自然结束、runtime 尚未 ready、标题非黑、撤层全黑且不透明，保存 title/handoff PNG；
  继续原有 s000→s001 演出、菜单控制、SAVE10 跨页读档与最终真实首帧检查，不能靠永远黑屏过门。
- 自验候选冻结：`b7784da3aa0c23885440ba087644ab5d65f21a13`，实现/测试6文件194行插入。
  其中实际产品实现仅标题 cleanup 的9行，没有其它API、配置、版本或内容修改。
- 红绿日志保留于 `build/e2e/opening-handoff-{red,unit-red,unit-green,green}.log`；
  相邻4文件16 tests 全绿；完整 reforge check 257 files / 2178 tests全绿、tsc零诊断。
- 硬性静态：全仓 lint 2727 files、0 errors / 0 warnings / 0 infos；全仓7包typecheck全部Done且无诊断。
  日志 `build/e2e/opening-handoff-{reforge-check,lint,typecheck,all-typecheck}.log`。
- E2E工具94 tests全绿；冻结RF001
  `build/e2e/reforge-001-2026-10-01T14-45-18-085Z/report.json` status passed，revision准确指向上述SHA。
  native video ended 撤层时1280×800、nonBlack=0、opaque=1024000、runtimeReady=false；
  `001-video-handoff.png` 为实际黑过渡，之后s000→s001矩阵/时序、菜单控制、跨页SAVE10读档与最终房间像素全部通过。
  Owner实际查看红控菜单PNG、绿控黑过渡PNG和绿控`001-end.png`，不是只凭状态判定。
  浏览器收据保留原有404无基线档与Canvas readback性能提示，不把它们伪报为零warning。
- `pnpm check:docs` 的37工具tests全绿，但正文门保留2个真实诊断：新开本卡尚未登记board/index。
  它们在此隔离分支base已有；Owner白名单不包括共享board/index，因此交Root集成时登记、复跑，
  不宣布统一质量门已全过。日志 `build/e2e/opening-handoff-docs.log`。
- 6012与用户浏览器完全未操作；实际验证只用runner自持服务/干净Chrome上下文，正常finally清理。

## 下一位 Agent 提示词

opening_handoff在隔离工作树实现及自验，提交候选SHA、红绿日志与实际画面交接证据；Root独立验收，不得自行合main。
