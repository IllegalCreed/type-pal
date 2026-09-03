# E6-1 - 实体位置控制权运行态检视与调试面板重开

Status: draft
Phase: phase2
Capability: E6 实体定位权威
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: main

## 目标

在既有 DEV-only `?debug` 面板的「状态」页中，直接显示队长、队伍跟随成员、编外跟随精灵和当前场景
实体的实时位置控制权、位置与运动状态，让开发者能判断对象当前由世界、脚本、跟随还是载具控制；
Esc 关闭面板后可按反引号重新打开，无需刷新页面。该任务只暴露既有运行态，不改变定位、移动、挂载、
跟随或存档语义。

## 范围

- 范围内:
  - 为 `DebugToolsContext` 增加只读运动快照 getter；快照由 `main.ts` 既有 E6/E7/E8 运行态一次投影。
  - 同一快照覆盖队长、`world.party[1..]` 队伍跟随成员、`runtimeScript.followers` 编外跟随精灵和
    live `scene.entities` 当前场景全部实体。
  - 明确显示对象身份、当前位置/朝向、有效控制权与载具 parent/offset。队长显示独立 `partyMove`；
    实体显示 authority epoch、纯数据化的 script/auto motion 注册信息与必要的实体生命周期 gate；
    编外跟随精灵使用显式 runtime slot + spriteId，只作诊断身份，不冒充稳定业务 ID。
  - 「状态」页新增“实体位置控制权（运行态，只读）”紧凑列表；既有“刷新状态”一次刷新世界与位置两区。
  - 把 `window.__tpE2e.dumpMotionState()` 与调试面板接到同一快照生产者，禁止复制两套判定。
  - `?debug` DEV 控制器常驻；Esc 隐藏同一面板并退出/重置帧步进，反引号刷新并重新显示，保留仍在
    运行的脚本/战斗调试状态；`installDebugTools` 返回的 dispose API 只供重复安装与测试时彻底清理。
  - 更新调试工具文档、E6 能力地图状态与针对性测试。
- 范围外:
  - 不修改 authority、跟随、挂载、移动提交、碰撞或实体生命周期业务逻辑。
  - 不新增画布标签、连线或空间 overlay；不新增编辑器页面或正式玩家设置。
  - 不做 D13 时间旅行、状态修改器、自动轮询历史或录像功能。
  - 不改 schema、contentVersion、SAVE_VERSION、migration 或工程内容。
  - 不重做调试面板整体视觉；沿用现有五 tab、色彩、间距与滚动结构。
- 明确不做:
  - 不把“authority Map 缺项”显示成异常：队长/实体缺项就是 `world`，跟随者缺项就是 `follow`。
  - 不使用 F9；F9 已是快速读档。
  - 不在 input、select、textarea、contenteditable 及其后代、IME composition、repeat 或带
    Shift/Ctrl/Alt/Meta 修饰键输入时拦截反引号。
  - 不让面板 close 后残留帧步进、隐藏焦点、重复 DOM、重复 style、重复全局监听器或过期快照。
  - 不为 dispose 扩张 `bootGame` 的公共返回 API；浏览器页面退出继续由页面生命周期回收。

## 前提真值门

### 一句话行为 / 工程前提

E6 的定位权威、挂载和跟随运行态已经存在且工作，本任务只是把唯一运行态投影到现有 DEV 调试面板，
并用一个 DEV-only 页面控制器安全地隐藏和重显面板。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | N/A：运行态 authority 与 DEV Web 调试面板是 Reforge 新架构和开发工具，不是原版玩法机制。 | `docs/phase2/READ-FIRST.md:1-8`；`docs/phase2/foundation/e6-position-authority-design.md:20-42` |
| 第一阶段 | N/A：本任务不复刻第一阶段 UI，也不改变玩家可见游戏行为；现有 D13 面板是本任务唯一界面基线。 | `docs/phase2/dev-tools.md:1-18`；`docs/ops/tasks/D13-1-debug-tools-first-batch.md:388-420` |
| 当前二阶段 | E6 引擎列已完成，编辑器/调试侧因缺 authority 运行态展示仍为 ⚠️。`main.ts` 已有 authority/epoch、entity script/auto slots、独立 partyMove、followerAuth/followerPos、编外 followers 和一份只含当前场景实体的 `dumpMotionState`；Debug 状态页只显示 WorldState。Esc 删除根节点/style；其 capture listener 注册与移除参数不一致，实际还会残留，历史卡明确记录只能刷新重开。 | `docs/phase2/capability-map.md:77`；`packages/reforge/src/main.ts:520-533,1417,1684-1723,3988-4080,4248-4267,5951-5984,6776-6804`；`packages/reforge/src/debug-tools.ts:49-82,258-303,442-476`；`docs/ops/tasks/D13-1-debug-tools-first-batch.md:416-420,504-516` |
| 本任务目标 | 在同一状态页显示完整运行态；Esc 后以反引号重开。用户已把两项合并为 E6 下一项，且明确 E6 先于其余第二阶段队列。 | 用户 2026-09-03 当前会话裁决；`docs/phase2/capability-map.md:193-204`；`docs/phase2/roadmap.md:204-209` |

### 反证与替代解释

- 最强替代解释:
  - `window.__tpE2e.dumpMotionState()` 已能从控制台查看实体，因此 E6 已闭合。
  - 刷新页面可重新安装面板，不需要常驻快捷键控制器。
  - `authority` 表就是完整真值，直接 JSON stringify 即可，不必纳入 partyMove、followerAuth、
    编外 follower、slot 与 gate。
- 反证:
  - 现有 dump 缺队长 authority/partyMove、队伍和编外跟随者及 mount parent/offset；状态页也没有消费它。
  - 能力地图明确把调试侧展示列为 E6 唯一缺口；用户明确要求反引号重开。
  - 跟随者的有效控制权独立保存在 `followerAuth`，缺省是 `follow`，只读 authority Map 会得出错误结论。
- 什么观察会推翻当前前提:
  - 若实际运行中存在不经过 partyMove/authority/followerAuth/编外 follower 派生/scriptSlots/autoSlots 的
    另一套定位控制源，当前快照合同必须停线补全。
  - 若反引号已被游戏、浏览器或输入法路径消费且无法在可编辑目标守卫后安全区分，重开键位必须回到用户裁决。
  - 若 production bundle 仍包含 `tp-debug`、控制器或新快照 UI 字符串，DEV-only 前提被推翻。
- audit 红项如适用，已排查的替代根因:
  - runtime 语义 / 命令分类: 既有 E6/E7/E8 语义不在本任务修改范围；缺的是投影和可达性。
  - 原版 / 第一阶段理解: N/A，新 DEV 工具无对应原版行为。
  - extractor / 地图 / 数据解码: N/A，不消费迁移输入或静态地图解码。
  - audit / test model: 现有 dump 只能证明部分数据可取，不能证明 UI 已闭合；任务按三类对象逐项验收。

### 用户可见偏离

- 是否主动偏离已核真值: N/A（新增 DEV-only 可观察入口，不改变游戏行为）
- `before -> after` 一句话: `关闭后只能刷新、状态页看不到谁在控制位置 -> 状态页直接显示完整控制权，Esc 关闭后按反引号即可重开`
- 代表场景: `?debug&scene=s213` 下观察队长/阿奴跟随与芦苇 mount；另用 take/release 触发一个实体的 `world → script → world`。
- 用户裁决: 2026-09-03 用户已批准两项合并为 E6，并要求按队列优先实施。

## 上下文锚点

- 已拍板决策 / 铁律:
  - `docs/phase2/READ-FIRST.md`：第二阶段干净架构、功能界面可做最小开发期视觉验证。
  - `docs/phase2/foundation/e6-position-authority-design.md`：缺省 world、显式/隐式 script take、mount 和 follow 边界。
  - `docs/phase2/dev-tools.md`：现有五 tab、DEV-only、输入隔离与帧步进合同。
  - 用户 2026-09-03：E6 同批加入反引号重开，并在完整队列中优先实施。
- 代码锚点(`file:line`):
  - `packages/reforge/src/main.ts:520-533`：followerAuth/followerPos 唯一运行态。
  - `packages/reforge/src/main.ts:1417,4248-4267`：队伍脚本移动使用独立 partyMove，不进入实体 motion slots。
  - `packages/reforge/src/main.ts:1684-1723`：authority、epoch 与双 motion slot。
  - `packages/reforge/src/main.ts:3988-4080`：mount/follow 派生。
  - `packages/reforge/src/main.ts:5951-5984`：编外跟随精灵的 follow-only 派生。
  - `packages/reforge/src/main.ts:6776-6804`：现有不完整 dumpMotionState。
  - `packages/reforge/src/main.ts:6933-6965`：DEV-only 动态安装入口。
  - `packages/reforge/src/debug-tools.ts:49-82`：DebugToolsContext。
  - `packages/reforge/src/debug-tools.ts:258-303`：当前 close 销毁路径；capture listener 注册/移除参数不一致。
  - `packages/reforge/src/debug-tools.ts:442-476`：当前状态页只显示世界数据。
  - `packages/reforge/src/main.ts:6721-6725`：F9 已用于快速读档。
- 已知坑 / 审计文档:
  - `docs/ops/tasks/D13-1-debug-tools-first-batch.md:416-420,504-516`：历史 O2 明记无重开热键，当时延后而非已解决。
  - `packages/reforge/src/debug-tools.test.ts:72-148`：现有 tab、样式幂等与 close/reset harness。
  - `packages/reforge/src/motion-runtime-coordinator.test.ts`、`motion-runtime-wiring.test.ts`：authority epoch 与接线回归地基。
  - `docs/phase2/dev-tools.md:16` 写“固定 720px”已与当前 CSS `width:min(420px, ...)` 漂移；本任务只把文档改成当前真实响应式宽度，不借机重做几何。
- 不得重新引入:
  - 第二份 authority、轮询驱动的状态副本、持久化调试态、跨包公共接口、F9 冲突、production debug bundle。
- 相关测试:
  - `packages/reforge/src/debug-tools.test.ts`
  - `packages/reforge/src/motion-runtime-coordinator.test.ts`
  - `packages/reforge/src/motion-runtime-wiring.test.ts`

## 验收条件

- 功能:
  - 状态页初次打开即显示队长、队伍跟随成员、编外跟随精灵和当前场景实体；排序固定为队长 →
    队伍顺序 → 编外 runtime slot → entity id。
  - 控制权正确区分 `world/script/follow/mount`；mount 显示 parent 与 dx/dy；缺省值不报错。
  - 队长显示 partyMove；实体显示 authority epoch 和纯数据化的 script/auto 注册信息；跟随者不伪造
    不存在的 epoch/slot。slot 只标“已注册/待执行”，不得反推有效控制权或本拍正在移动。
  - 明确区分 authorityEpoch、slot commandEpoch、activationOwnerId/activationEpoch；实体归还 world 后
    authority epoch 保持最新值，不错误归零。快照不包含 cancel/resolve/commit 等函数。
  - 位置、朝向、gate 与控制权来自同一次快照；点击“刷新状态”同时刷新世界与运动两区。
  - `__tpE2e.dumpMotionState` 与面板使用同一生产函数，结构化克隆不允许 UI 反向修改运行态。
  - Esc 关闭后帧步进必为 inactive/reset、焦点离开隐藏面板；随后无页面刷新按物理键 `Backquote`
    刷新快照并只重显一个面板，仍在运行的调试操作不变成孤儿。
  - 反引号在任意可编辑祖先、IME composing、repeat 或 Shift/Ctrl/Alt/Meta 组合下不触发；F9 快速读档保持原样。
  - Esc capture listener 不再残留吞键；关闭后的下一次 Escape 能到达游戏。重复 install/hide/show/dispose
    无重复 root/style/listener；dispose 幂等并彻底移除自身 controller。旧 disposer 不得删除后来实例的
    root/style/listener。
- 测试:
  - `debug-tools.test.ts`：四类对象快照渲染、partyMove、刷新、缺省控制权、mount 详情、slot 与 authority
    并存、epoch 分类、稳定排序、Esc→Backquote、输入祖先守卫、三轮 hide/show、重装与幂等 dispose。
  - motion coordinator/wiring 定向回归：take/release epoch、mount、场景 teardown 与 auto slot 不回退。
  - `pnpm --filter @type-pal/reforge test`、typecheck/build 通过。
  - Reforge 与 Editor 生产构建中 `tp-debug|installDebugTools|实体位置控制权` 零命中。
- 文档:
  - 更新 `docs/phase2/dev-tools.md` 的状态页内容、实际响应式宽度、Esc/反引号行为。
  - 实现与审查通过后，E6 编辑器列从 ⚠️ 更新为 ✅；本卡进入 done 前同步队列下一项。
- 视觉 / 手工验证:
  - 本地 `?debug` 在常规宽度和窄视口各检查一次：列表无横向溢出、长 id 可读、状态页内部滚动且 footer/按钮可达。
  - 实际观察 entity `world → script → world`、队员 `follow`、芦苇 `mount(parent+offset)`。
  - 在 console 输入框中输入反引号不关/重开；Esc 隐藏后反引号重显且世界/位置区刷新为新快照。
- E2E 用例登记: N/A（DEV 功能界面开发期最小验证；不属于剧情/演出观感集中 E2E）。

## 推进签字

### 进入 build 前:设计签字

- Codex:
  - premise: **verified**。证据：`capability-map.md:77`；`main.ts:520-533,1684-1723,6776-6804`；`debug-tools.ts:258-303,442-476`；`D13-1:416-420`。
  - design: **agree**。只做单一只读投影与 DEV controller，不动业务状态、schema 或 production 路径。
- Kimi:
  - premise: pending
  - design: pending
- GLM:
  - premise: pending
  - design: pending
- 独立反证审查（至少一位非 Coding Owner 必填）:
  - 审查者: pending
  - 独立证据锚点: pending
  - 可证伪观察: pending
- counter / 分歧处理: 无；若 reviewer 发现遗漏控制源、快捷键冲突或 DEV-only 泄漏，留在 draft 修订。
- 缺签豁免: N/A
- build 准入结论: **blocked（等待 Kimi、GLM 独立前提与设计签字）**

### 进入 done 前:审查签字

- Codex: pending
- Kimi: pending
- GLM: pending
- counter / 返工处理: pending
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论

1. **一个快照生产者**：在 `bootGame` 闭包中建立只读 `captureMotionState()`，同时供 `__tpE2e` 和
   `DebugToolsContext.motionState()` 使用。UI 不读取零散 Map，也不保存自己的权威副本。
   DTO 只复制值，绝不暴露带 cancel/resolve/commit 的 slot 对象。
2. **完整但紧凑的对象投影**：队长、队伍成员、编外 follower、live 场景实体形成判别联合；对象身份、
   位置、控制权和运行细节在同一次调用中复制。partyMove 与 entity slots 分栏；slot 是注册信息而非权威。
   UI 用带列标题的紧凑列表/表格和分割线，不给每行再套卡片边框。
3. **两层生命周期**：`installDebugTools(ctx)` 返回 controller dispose（供重复安装和单测，不扩
   `bootGame` 公共 API）；controller 持有唯一
   capture-phase Backquote/Escape listener。Esc/关闭按钮只 hide 面板、blur 隐藏焦点并 reset frameStep，
   DOM 与面板内在途操作继续存在；Backquote 在隐藏态刷新并 show。再次 install 先完整 dispose 旧 controller。
   当前 capture listener 移除参数不一致的真 bug在此一并删除，不保留第二条 Escape 监听路径。
4. **只实现“关闭后重开”**：面板打开时仍以 Esc/关闭按钮关闭；反引号只在面板隐藏时负责打开，
   不新增第二种关闭手势，避免输入与 toggle 状态歧义。
5. **严格 DEV 边界**：动态 import 门保持 `import.meta.env.DEV && params.has('debug')`；新 controller、
   文案和样式必须继续被 production tree-shake。

### 已知风险

- 风险: 只展示 authority Map 会漏 partyMove、队伍/编外跟随者或把 follow 错报成 world。
  - 缓解: 快照逐类构建，测试队长/两类 follower/entity 四族和四种控制权。
- 风险: 把保留的 auto slot 误标成当前权威，或把不同 epoch 混为一个数字。
  - 缓解: slot 显式命名为注册信息，DTO 分字段；测试 script authority 与 paused auto slot 同时存在。
- 风险: close 与 controller cleanup 混用导致无法重开、重复监听或 teardown 泄漏。
  - 缓解: 明确 panel hide/show 与 controller dispose 两层函数，测试多轮 hide/show/install/dispose，
    钉住 capture listener 可真实移除、dispose 幂等且 stale disposer 不碰新实例；dispose 集中 abort
    panel-owned 在途操作，hide/show 则保留运行状态。
- 风险: Backquote 抢走调试 console、输入法或浏览器组合键。
  - 缓解: 只在 hidden、无 Shift/Ctrl/Alt/Meta、非 repeat/composing、无 editable ancestor 时于 capture
    阶段处理 `event.code`；open 时忽略。
- 风险: 表格在 420px/窄视口溢出或长 id 不可读。
  - 缓解: 复用当前面板 scroll owner；列可折行、数值不丢，真实浏览器检查常规/窄两档。
- 风险: DEV 字符串进入生产 bundle。
  - 缓解: 保持死分支动态 import，构建后 grep 作为 done 硬门。

### 主审立场

- Reviewer: Kimi（架构/输入所有权/视觉主审）；GLM（对象族覆盖与测试矩阵）
- 结论: pending
- 必改项: pending
- 是否建议进入 build: pending

### 三方争议记录(按需)

- Codex: 同意单一值 DTO、partyMove/两类 follower/entity 完整投影、hide/show + dispose 两层
  controller、Backquote 只重开和 DEV-only 边界。
- Kimi: pending
- GLM: pending
- 用户拍板: 2026-09-03，运行态展示与反引号重开合并为 E6，按第二阶段队列优先实施。

## 额度 / 代班记录(如适用)

- 缺席 Agent: none
- 缺席原因: N/A
- 代班 Agent: N/A
- 代班范围: N/A
- 风险: N/A
- 是否需要补审: N/A
- 用户裁决: N/A

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件: pending
- 实现摘要: pending
- 运行命令: pending
- 浏览器 / 手工检查: pending
- 跳过的检查及原因: pending

## 资源生成记录(如适用)

- Generation Owner: N/A
- 生成目的 / 替换对象: N/A
- 提示词要点 / 风格约束: N/A
- 输出路径: N/A
- 尺寸 / 格式 / 透明背景 / 调色约束: N/A
- 资源登记位置: N/A
- 验证方式: N/A

## 视觉验证记录(如适用)

- Visual Verification Owner: Codex
- Visual Verification Timing: dev-functional
- 验证方式: pending
- 集中 E2E 用例 / 批次: N/A
- 截图 / 像素检查路径: pending
- 结论: pending
- 未完成项: pending

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: pending
- 必须返工项: pending
- Accept / rework: pending

## 用户验收

- 用户结论: pending
- 后续任务: 四条 PAL 数字角色条件引用上游修复。

## 交接日志

- 2026-09-03 Codex: 按用户确认的第二阶段唯一队列开 E6-1；完成当前实现/调试入口与历史 O2 的
  一手核验，冻结单一快照、完整四类对象、两层 controller、Backquote 输入守卫和 production 剥离门禁。
  Evidence: 本卡前提矩阵与代码锚点。Next: Kimi、GLM 独立设计审查；签字不齐不得开始实现。

## 下一位 Agent 提示词

### Kimi

```text
接手任务: E6-1 实体位置控制权运行态检视与调试面板重开
任务卡: docs/ops/tasks/E6-1-runtime-authority-inspector.md
当前状态: draft
你的角色: 架构、输入所有权与功能界面设计主审；独立完成 premise/design 签字
先读: AGENTS.md；docs/phase2/READ-FIRST.md；任务卡；docs/phase2/foundation/e6-position-authority-design.md；docs/phase2/dev-tools.md；packages/reforge/src/main.ts:520-533,1684-1723,3988-4080,6776-6804,6933-6965；packages/reforge/src/debug-tools.ts:49-82,258-303,442-476
已完成: Codex 已核实 E6 运行态存在、面板展示缺失、Esc 后只能刷新，并起草单一快照 + 两层 controller + Backquote 只重开方案；尚未改实现。
请你做: 直接读取一手代码，独立验证完整控制源、快照边界、close/reopen 生命周期、快捷键冲突、DEV-only tree-shake 与紧凑列表布局；把证据、可证伪观察、必改项和 premise verified/design agree 或 counter 写回任务卡。
不要做: 不修改实现；不代签 GLM；不扩成位置修改器、画布 overlay、时间旅行或整体调试面板重设计；签字未齐不得开始 build。
输出要求: 提交并推送任务卡签字；回复 commit hash，以及 agree 或 counter + 理由，并给下一位 Agent 提示词。
```

### GLM

```text
接手任务: E6-1 实体位置控制权运行态检视与调试面板重开
任务卡: docs/ops/tasks/E6-1-runtime-authority-inspector.md
当前状态: draft
你的角色: 数据覆盖、遗漏审计与测试矩阵审查；独立完成 premise/design 签字
先读: AGENTS.md；docs/phase2/READ-FIRST.md；任务卡；docs/phase2/foundation/e6-position-authority-design.md；docs/phase2/dev-tools.md；packages/reforge/src/main.ts:520-533,1684-1723,3988-4080,6776-6804；packages/reforge/src/debug-tools.ts:49-82,258-303,442-476；packages/reforge/src/debug-tools.test.ts；packages/reforge/src/motion-runtime-coordinator.test.ts
已完成: Codex 已核实当前 dump 只含实体、状态页无运动快照、close 销毁可见面板且无重开；尚未改实现。
请你做: 独立枚举队长/队伍跟随成员/编外跟随精灵/live entity 与 world/script/follow/mount、partyMove、各类 epoch、entity script/auto 注册信息和 gate 的覆盖；压力测试默认值、排序、刷新、输入守卫、多轮 cleanup 和生产剥离矩阵；把独立证据、可证伪观察、必改项和 premise verified/design agree 或 counter 写回任务卡。
不要做: 不修改实现；不代签 Kimi；不扩 schema/save/migration/Q1 E2E；签字未齐不得开始 build。
输出要求: 提交并推送任务卡签字；回复 commit hash，以及 agree 或 counter + 理由。
```
