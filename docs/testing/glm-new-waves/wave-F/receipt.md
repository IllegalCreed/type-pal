# TEST-GLM-NEW-F-1 交付回执（GLM Wave F）

- 分支 `codex/glm-new-f-r1`；工作树 `/Users/zhangxu/.codex/worktrees/glm-new-f/type-pal`。
- 候选完整 SHA：见文末「候选与登记」（提交后登记，不含自引用）。
- 生产冻结 `ced193f4f590c57d25ad2d48e2aa256e4b70a902`；目标 digest
  `27ee3a811311a586cc013b83f0b2117ecc66fd69149c51c9d45ab95493504276`（verify-targets.mjs 通过）。
- 范围合规：`git status` 仅新增文件——10 个同目录 `*.glm-next-wave.test.*`、
  `packages/editor/src/__tests__/glm-next-wave/F/app-script-kit.tsx`（唯一 typed fixture）、
  `docs/testing/glm-new-waves/wave-F/**`（回执/判官/宿主/证据）。产品、旧测试、共享配置、
  正式工程、官方基线零改动；未触碰 A–E 工作树/分支；未合 main、未标 done。

## 逐组旧证 → 新差异（12 源全覆盖，10 测文件 22 用例）

| 组 | 冻结源 | 旧证（去重基线） | 新增窄合同（本 wave） |
|---|---|---|---|
| F01 | `App.tsx` + `ScriptEditor.tsx` | leave-guard 保存/离开/历史序、reference-navigation locator 族、app-session-ownership AST、ScriptEditor.test 组件级表单/取消族 | `App.glm-next-wave.test.tsx`（1 例）：真实 App 挂载 → `?module=story&page=scripts` 路由 → 共享脚本「离开测试」→ 命令行双击弹窗回显 ms=17 → 关闭取消后**零历史（撤销按钮不存在）+ 双会话零 dirty + 重开无草稿泄漏**（script.getHistoryVersion()=0） |
| F02 | `PreviewCanvas.tsx` + `FrameAnimationEditor.tsx` | PreviewCanvas.test + glm-ui-wave U4b（工具栏/play 委派/deep link/对话行；useSceneAssets 恒钉 loading 且从未断言提示层）；FrameAnimationEditor 六文件 32 例（加载失败族/选择/纯播放时钟/拖拽） | `PreviewCanvas.glm-next-wave.test.tsx`（2 例）：loading→`加载资产…`、error→`.preview-tip.err` 精确消息、两种失败态 **requestAnimationFrame 零调度**（不进入渲染循环）、就绪 tag；`FrameAnimationEditor.glm-next-wave.test.tsx`（1 例）：播放中点击其它帧格 → 计时器按被点帧自身 40ms **重锚**、播放不中断（aria-pressed 保持）、多选 echo 收敛单选、循环回首帧精确像素、暂停清 timer |
| F03 | `DesignLab.tsx` + `ActorMode.tsx` | DesignLab 零渲染测试（仅 design-system 静态边界）；ActorMode.test 20 例（绑定/关系/CRUD/引用 fail-closed） | `DesignLab.glm-next-wave.test.tsx`（3 例）：缺省 `?fixture`→RF-01 + 导航 23 链接唯一 aria-current、RF-25 舞台切换与 aria-current 迁移、未知值 `lab-error` 错误页 + 返回链接；`ActorMode.glm-next-wave.test.tsx`（2 例）：陈旧 focusActorId 回落第一名角色并回报 onActorFocus 一次、非法 focusSection 回显总览、空人物库复制动作禁用 + 新建面板取消零派发 |
| F04 | `BattleSpriteUploader.tsx` + `SpriteFrameWorkbench.tsx` | Library 两文件 mock 本组件；kimi-workflows 走 Library 复合链路；Workbench.test 五例只盖 SemanticFrameShelf/InstanceBehaviorShelf/picker | `BattleSpriteUploader.glm-next-wave.test.tsx`（2 例）：合法 48×16 图集经 kit 真实解码端口 → 缺省帧宽高猜测（16/16）+ 3 帧缩略图 `#i 16×16` + 应用产出 gzip 帧带（frameCount=3）；帧宽 10 → **精确失败文案**`图 48×16 切不开（宽高须整除）`+ 应用禁用 + 取消零提交；`SpriteFrameWorkbench.glm-next-wave.test.tsx`（4 例）：RawFrameInspector 首末帧切换禁用边界、N/M output、单帧删除禁用原因 title、共享/无用途提示与 alert/status 编辑消息角色、showHero=false 不重复身份头 |
| F05 | `BattleSimulatorWorkbench.tsx` + `battle-trial-launch.ts` | Workbench 十例 start 均 vi.fn；transport 八例证传输本体；hook 三例 mock launch | `battle-trial-launch.glm-next-wave.test.tsx`（3 例）：**真实 hook 驱动真实 transport**——显式 config 经真实 admission（基线校验/项目重载/battleTrialRevision）到达端口逐字段保真（config/identity/revision=64hex 精确）+ URL 只含身份三元组 + ack 前 start 未完成、ack 后 resolve；window.open=null 失败即释放独占槽位（同会话可再次完整握手）；ack 前卸载 → abort 投递到端口 + AbortError「试打已关闭」。弹窗替身=同源 iframe 真实 Window（无强转）；Workbench 侧判定 existing-proof（start 端口语义已被其十例+hook 覆盖，组合面由本文件端到端钉死） |
| F06 | `battle-sprite-commands.ts` + `sprite-commands.ts` | residual + glm-boundaries C03/C02 + commands-wave2（缺席 no-op/证明门/冲突族/共享资产/Replace 守卫/barrel 同证） | `battle-sprite-commands.glm-next-wave.test.ts`（2 例）：真实 EditSession 序列（AddBattleSprite→AddEnemy→SetEnemy）apply **不改写传入 state**（深快照互证）、apply 期克隆使调用方输入事后篡改不污染会话与 redo、undo×2/redo×2 逐值还原（toEqual 快照）；`previous` 只在首次 apply 捕获——外部改引用后 invert 仍回最初值、未 apply invert 恒 no-op；`sprite-commands.glm-next-wave.test.ts`（2 例）：UpdateSprite 同轴（patch 事后篡改 + undo/redo 还原 + 传入 state 非变异）；AddSpriteDefinitionCommand 第二语义入库/撤销对称（真实解码帧数证明）、不触 catalog/blob、事后篡改定义不影响 redo |

## 门禁

1. **新测 + 相邻定向**（maxWorkers 1）：新测 10 文件 22/22 通过（新鲜 JSON：
   `evidence/vitest-final.json`，file/fullName/status 齐备；success=true, failed=0）。
   相邻定向 24 旧文件 233/233 通过（leave-guard/reference-navigation/session-ownership/
   ScriptEditor×2/PreviewCanvas×2/FrameAnimationEditor×3/ActorMode/SpriteFrameWorkbench/
   BattleSpriteLibrary×3/battle-simulator-ui/battle-trial-launch/use-battle-trial-session/
   两 commands 模块 6 文件）。
2. **typecheck**：`packages/editor` tsc --noEmit 零诊断（修复后 exit 0）。
3. **Biome**：精确 11 个新增源文件（10 测 + kit）error/warning/info 全零；
   `docs/testing/glm-new-waves/wave-F/` 6 文件全零。未降规则、未加 ignore。
   全仓 lint 包装器顺带通过（2644 文件 0/0/0，非本卡门禁、仅佐证）。
4. **docs**：`node scripts/docs/check.mjs` PASS（758 md / 4033 links / 234 tasks）。
5. **diff 范围**：见文首范围合规；无任何对既有文件的修改。

## 反控（4 枚，判据隔离于本目录 needle-judge.mjs，全部 VALID）

判据：候选整文件对照 exit0 + executed>0 + skipped=0 → 注入点全文件恰 1 次 → 临时副本注入后
恰 exit1、恰 1 FAIL、FAIL 行=该临时文件、fullName 含目标名、AssertionError、executed 与基线一致 →
生产源 SHA256 注入前后一致。临时副本跑完即删，未进提交。

| # | 文件 | 注入（--find → --replace） | fullName | executed(基线/注入) |
|---|---|---|---|---|
| N1 | `src/ui/App.glm-next-wave.test.tsx` | `expect(...撤销：...)).toBeNull()` → `.toBeTruthy()` | F01…取消零历史零 dirty | 1/1 |
| N2 | `src/core/battle-trial-launch.glm-next-wave.test.tsx` | `expect(packet.config).toEqual(config)` → `toEqual({})` | F05…显式配置经真实 admission | 3/3 |
| N3 | `src/ui/PreviewCanvas.glm-next-wave.test.tsx` | 失败消息 `toBe('地图瓦片集读取失败：…')` → `toBe('被替换的失败消息')` | F02…资产读取失败精确回显 | 2/2 |
| N4 | `src/core/sprite-commands.glm-next-wave.test.ts` | `expect(replayed.layout).toEqual({…framesPerDir: 2 })` → `: 99` | F06…UpdateSprite apply 后篡改调用方 patch | 2/2 |

首轮 N1 曾用 `.toBeDefined()` 注入判 INVALID（null≠undefined 恒真），换 `.toBeTruthy()` 后 VALID——
该轮即判官对判据自身的有效甄别，判官未改。

## 功能视觉（两条，实际看图核验通过）

宿主：`browser-host/`（端口 6091 strictPort；vite 别名指包源码；blank seed 经内存目录真实装载，
Chrome 原生 gzip）。驱动 `drive-f.mjs`（playwright `channel: 'chrome'`，编辑器 chromium 未装）。
证据 JSON：`browser-host/evidence-browser-f.json`（ok=true，consoleErrors=[]）。
截图 SHA256（/tmp/type-pal-glm-new-wave/F/）：

| 文件 | 视口 | SHA256 | 亲眼核验 |
|---|---|---|---|
| F1-script-edit-echo-1440x900.png | 1440×900 | `c6d1397512dd72fbfc75965385236a108ae48ff3a6d4d411224020b1e4c7c2a7` | 编辑弹窗「编辑：等待 40ms」输入=40（回显 17 后修改），底层行仍「等待 17ms」、已提交正文 ms:17 |
| F1-script-edit-cancelled-1000x720.png | 1000×720 | `5bc7e1383e54f6c34d7da5b247f7a72191061890f1c0998eeafc5a5635014a9c` | 取消后重开「编辑：等待 17ms」输入=17——取消不留草稿 |
| F2-uploader-failure-1440x900.png | 1440×900 | `bf3f6d55c8f982187655b69d1362811451d4eb238ee0f68fac5ce35c26afb97d` | 帧宽 10 →「图 48×16 切不开（宽高须整除）」、应用外观禁用 |
| F2-uploader-recovered-1000x720.png | 1000×720 | `3534946b0faa7a6ba4974fe39879d012a88ac1423b002fb5c44831f10224a5af` | 改回 16 →「共 3 帧（横排逐行切）」+ 红/绿/蓝三枚真实缩略图、应用复启用、尚未应用（零提交） |

说明：页面正文上方有大段空黑区（editor.css 假定 App 壳层布局所致），不影响组件证据可读性，如实登记。
上传文件注入走页面内真实 Canvas→toBlob→DataTransfer（与用户选择同一 change 路径；
playwright setInputFiles 注入路径在本宿主不稳定，弃用）。

## 未证 / 边界（如实登记）

- **不冒充**：F01 非完整保存/E2E（Canvas 呈现省略，同 leave-guard 策略）；F05 不证明战斗机制等价；
  F02 不生成/改写产品资源；F04 不接资产发布管线；视觉不冒充全 App E2E。
- **existing-proof**：BattleSimulatorWorkbench 自身（start 契约已被其十例钉死，组合端口由 F05 端到端补）；
  App/ScriptEditor/两 commands 模块的既有大量断言面见上表「旧证」列，本 wave 未重证。
- **潜在产品观感项（非本卡缺陷，未开缺陷）**：PreviewCanvas 失败态文案 `.preview-tip.err` 无重试入口
  （纯提示）；上传器调色板失败时摘要文案会显示「切不开」（palette 未就绪与尺寸不整除共用空数组分支）。
  均无行为错误，是否改进留 Codex/用户裁决。
- 未跑官方 ratchet/受保护 fast/全仓 check/E2E（按卡面禁止）；85% 由 Codex 在 main 并集实测。
- 候选覆盖率收益未在本分支测量（隔离分支百分比不得相加）。

## 候选与登记

- 候选（tests+kit+evidence 单提交）：见推送记录（本次推送的倒数第二个提交即候选）。
- 登记（本回执补候选 SHA）：见推送 head。
