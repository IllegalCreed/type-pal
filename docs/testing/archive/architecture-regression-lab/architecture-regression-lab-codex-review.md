# ARCH-REGRESSION-LAB-GLM-1 — Codex 独立接收复核

2026-09-25；GLM 候选 `30397b1d847dcba13c08bef6d9662a5c9b5f14ab`，起点 `a3ceaf05`，生产冻结 `86e928b5`。这是隔离实验材料复核，不是正式产品/测试接入，也不计算官方覆盖率。GLM 为贡献者，其自验不代替本席判断。

## 结论

**十二组均不按所申报的完整合同 accept，当前为 counter；V02-02 的既有测试引用单项有效，G01/G02/G03 等有可保留的局部正控。** `results.json` 的 39 条机械小计与截图 hash 前缀可复算，但 `36 green` 不代表 36 条目标业务合同都被证实。V04-01 的现象可复现，归因“产品把资源深链覆写回角色页”则被独立反证推翻。任务保持 `draft`，候选不进正式 runner；不改 GLM 报告原文、不标 done。

| 组 | 本席结论 | 直接反证与可保留部分 |
|---|---|---|
| G01 手势终结 | counter | `candidates/editor/g01-map-gesture.test.tsx:248-265` 的平移例最后只断言 `expect(true).toBe(true)`；既无平移值也无后续可观察业务结果，不能叫“取消后存活”。:166-219 的笔划取消与正常 up 对照可保留，G01-05 仅通知次数还不足以证明完整选区状态。 |
| G02 会话失效 | counter | `g02-map-scope.test.tsx:93-111` 构造 `nextSession` 后未调用 `rerenderWithSession`，最后 `void nextSession`；声称“换会话后迟到 up”其实没有换会话。G02-01/02 的实际 rerender 与双 map 快照可单列保留。 |
| G03 App 生命周期 | counter | `g03-app-lifecycle.test.tsx:199-212` 卸载后按 Cmd+S 只比 `document.body.textContent`；保存流程即使错误启动，已卸载页面也可能不变，缺实际 IO/命令入口观察。G03-01/02 的挂载派发与旧会话 fail-loud 可保留，不冒充 derivedStore 旧 worker 终止证明。 |
| G04 脚本草稿 | counter | `g04-script-draft.test.tsx:38-62` 只替换 body、未打开草稿，不证明外部 undo/redo 时旧草稿失效；`:64-88` 确认按钮在 `if (dialog)` 内且只断言调用次数 `≤1`，0 次也绿；`:90-110` Esc 同样可在根本没弹窗时绿。必须先证明弹层/请求 entered，再断言恰一笔或零笔及实际内容。 |
| G05 播放生命周期 | counter | `g05-playback-scope.test.tsx:49-64` 直接 `play('a')→play('b')→stop()`，没有迟到推进；`activePath === null || typeof ... === 'string'` 对该类型近乎恒真。`:67-87` 只重复 stop 并手工设 `onUi=undefined`，未走 SceneScriptWorkspace 卸载；`scene()` 用 `as unknown as SceneDef`、stages 用 `as never` 遮盖真实输入类型。 |
| G06 跨校验器递归 | counter | `g06-validation-crosscalls.test.ts:91-108` 标题称“author onDefeated 内非法条件”，实调 `checkAuthorCondition` 单函数；G06-01 的流无 onDefeated，G06-02 直接调 base author validator 而非跨校验器路径。多处 `as unknown as`/`as never`；合法非空嵌套正控可用作线索，不可计所称七臂递归证据。 |
| G07 一阶段边界 | counter | `g07-core-boundaries.test.ts:18-23` 两函数都从 scene-system 导入，根本未调 event-system；`:34-41` 只手写装备效果后调同模块 getter，没有调用 battle opcode，`applyEquipmentEffect` 导入未用。G07-02 是单独库存隔离，不是所称跨 caller 顺序。 |
| G08 迁移隔离 | counter | `g08-conversion-isolation.test.ts:48-61` 标题称 sound 回调“真实调用且结果进产物”，实测只比较有/无回调的 `scriptChunks` 相同，完全没见证回调。`:69-80` 标题称异常路径，实际没有抛错，`gapCount===undefined || >=0` 不区分错误，后续仅 `scenes.length`。G08-01 的重复调用/输入保真可作为窄候选，不能证明输出独立正确。 |
| V01 表单键盘 | counter | 三张截图实见角色名“李逍遥→李逍遥2→李逍遥”，但没有命令计数/焦点轨迹证明 Enter 不双提交，也未覆盖卡面列出的物品、技能、敌队、战场、模拟器及 Tab/方向键/Esc。截图中的角色图像为空位，不能作资源正控。 |
| V02 工作区/分隔条 | counter（V02-02 existing-proof 单项 accept） | `v02-01-scene-720.png` 可证 720 CSS px 角色页未横向失控，但不是要求的非空场景/地图/脚本 1280/900/720 矩阵，也未操作分隔条、浏览器 zoom。`PanelResizeHandle-interaction.test.tsx:138-250` 的键盘、捕获结束与卸载合同确有旧测试，可保留 `existing-proof`，本轮未执行且不能冒充工作区集成验证。 |
| V03 异步/错误恢复 | counter | `results.json:706-721` 只记“无效 objectId 深链归一化回退”的截图，没有一次性读取失败、A→B 迟到、错误提示与解除故障后的同输入恢复；V03 目标链未进入。 |
| V04 媒体/引用 | counter | V04-01 并非已证产品缺陷；见下方独立浏览器复核。V04-02 真实阻断是本工作树缺合法精灵二进制，而非精灵库不可达；媒体矩阵未测。应撤回 `reproduced-defect` 产品归因，重列环境/资源前提。 |

## V04-01 独立功能复核与源码归因

本席在 GLM 候选工作树启动独立 `127.0.0.1:6013` editor，未动用户的 6010/6051；使用 Codex 私有隐藏浏览器标签。

1. **干净深链正控**：直接打开 `/?module=asset&page=sprite`，编辑器成功进入“精灵库工作区”，URL 规范化为 `?module=asset&page=sprite&domain=world&view=definition`，未跳角色页。`App.tsx:333-339,430-431` 明确在查询含 module/page 时调用 `decodeEditorLocation`；`editor-navigation.ts:450-480` 允许 asset/sprite，`:494-510` 规范写回 URL。
2. **脏会话复现 GLM 症状**：在隔离 `?ui_samples=1&module=actor&page=workspace` 的评审沙盒，把姓名“李逍遥”改为“李逍遥2”并按 Enter；界面显示“未保存改动”。此时整页 `goto(?ui_samples=1&module=asset&page=sprite)` 返回浏览器 `net::ERR_ABORTED`，原角色页与原 URL 保持；没有观察到 App 把已经导航成功的资源 URL 改回角色 URL。`use-project-leave-guard.ts:10-16` 安装 `beforeunload`，`project-leave-guard.ts:70-72` 在 dirty 时要求警告，能解释中止整页导航；这正是保存保护，不是资源深链专属失败。
3. **脏会话站内正控**：同一未保存沙盒中，通过主菜单“资源→精灵库”站内导航成功，URL 变为 asset/sprite，工作区可达。`App.tsx:2600-2608` 的内部导航使用 `applyEditorLocation`，不触发整页 beforeunload。因此 V04-02 不应写成“受 V04-01 深链覆写阻断”。
4. **真正环境阻断**：精灵库报 `sprite.pal.002` bytes 登记 4031、实际读取 917；候选 worktree 的 `projects/pal/assets/index.json` 指向 `assets/migrated/sprites/002.rle`，该文件不存在。917 字节与 Vite 回退页面相符，资源守卫正确拒绝。媒体 fit/1:1/替换测试需先有自包含合法资源的 HTTP/decoder 正控；本卡禁止靠重迁真实 PAL 工程补环境。

原 `v04-01-sprite-library.png` 的完整 SHA-256 为 `decc01782e22cf6987f31c190810378c06bd0d6389b382a503f72c9802b3c411`，与账本 `sha256_16` 前缀相符；但图中无浏览器地址栏/导航事件，单靠该图不能证明 URL 覆写。六张截图均已亲眼查看：V01 名称变化、V02 720px 排版、V03/V04 角色页这些**可见事实**成立，超出截图的时序/归因不成立。复核结束已关闭自有标签、停止 6013，并把本席 `red-control.mjs` 产生的仓内临时目录移到 `/tmp/codex-glm-arch-red-Sb9atb` 留证；候选工作树干净，未删用户文件。

## 全包质量与机账门

- `git diff 86e928b5..a3ceaf05 -- packages/ scripts/` 为空；候选 `a3ceaf05..30397b1d` 仅在实验目录白名单。`verify.mjs a3ceaf05` 输出 39 条、36/1/1/1、12 组、`PASS`；候选 Vitest JSON **32/32**（九文件）；启动小样单针 `red-control.mjs` 输出 `detected`、exit1/1执行/AssertionError/产品 hash 不变。上述机械事实接收，不推出每组业务断言有效。
- **目录 Biome 阻断**：`pnpm exec biome check docs/testing/glm-architecture-regression-lab` exit1，23 errors/7 warnings/1 info，涉及候选测试、config、fixture、tools。`configs/project-configs.mjs:1` 是字面 `placeholder — real config next`，`node --check` SyntaxError；`candidates.vitest.mjs` 仍 import 它。仅对 `results.json` 运行 Biome 的回执不能替代工作包要求的整个候选目录格式/语法门。
- `tools/verify.mjs:51-68` 只核 ID 小计、test **文件存在**和截图 **16 位 hash 前缀**；没有读取候选 Vitest JSON 来核 fullName/status，也未验证 commands/cwd 或诊断判据，和工具头注释及工作包 §4 的“从运行 JSON 机械核对”不符。账本即使写错某条测试标题也可 `PASS`。截图账本要求完整 SHA-256，现仅存 `sha256_16`。启动小样只有 1 针；其它 G01–G08 关键组未交有效单点反控，也未逐组解释为何重叠或不适用。候选 TS/TSX 没有独立 typecheck 配置/结果，不能用生产包 tsc 间接冒充。
- `configs/candidates.vitest.mts` 同时设置 Oxc/Esbuild JSX 时发兼容提示；不是单独业务 counter，但返工时顺手简化。产品、旧测试、官方覆盖率/阈值/超时未改，官方统计保持原值。

## 收窄返工与接入决定

先修证据真值，不让错误 `reproduced-defect` 推动产品修复：V04-01 改为“未保存改动 beforeunload 的预期中止”或给出在已完成导航后被 App 真正覆写的独立反例；V04-02 重分类为缺合法资源/未验证媒体矩阵，使用本包自包含素材做正控后再测。G01–G08/V01–V03 按表补真实 entered、业务结果/状态、合法 typed fixture 与差异轴；保留已成立的窄正控和 V02-02 旧证据，不为凑 39 项留下 tautology。修复目录 Biome、移除无效 placeholder、补候选类型检查和 verifier 的 JSON/fullName/status/完整截图 hash 校验；单点反控按合同补或如实降级。GLM 只改自有实验包与回执/机账，Codex 再独立接收；正式实现卡和产品代码不借此授权。
