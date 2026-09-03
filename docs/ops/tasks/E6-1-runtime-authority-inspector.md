# E6-1 - 实体位置控制权运行态检视与调试面板重开

Status: review
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
  - premise: **verified（2026-09-03，架构/输入所有权视角一手直读，非复述 Codex/GLM）**：
    1. **控制源完备（本人 grep 写点普查）**：`player.pos` 写点恰六处——spawn(`main.ts:1131`)/
       teleport(`:2852`)/nudgeParty(`:3390`)/mount 派生(`:4007`)/partyMove(`:4252`)/
       planner commit(`:4697`，输入与 passive-yield 路径，受 `!authority.has('party')` 门控
       `:4691-4693`)；实体写点恰五处——spawn(`:1591`)/stepEntity(`:3341`)/nudgeEntity(`:3353`)/
       mount(`:4011`)/commit(`:4670`)；队员 `followerPos` 纯派生(`:4057-4083`)；编外 trail
       派生(`:5951-5984`)。持续控制源恰五族（输入=world 缺省/partyMove/script/mount/follow），
       spawn/teleport 是瞬时写非控制源——快照四类对象 + partyMove + mount parent/offset 无遗漏。
    2. **展示缺口**：现有 `dumpMotionState`(`:6781-6804`)只有 entities 区，缺队长 authority/
       partyMove、两类跟随者与 mount parent/offset；状态页只渲染世界 JSON(`debug-tools.ts:442-476`)。
    3. **Esc 泄漏真 bug（本人独立实锤）**：`debug-tools.ts:303` `{ capture: true }` 注册 vs
       `:274` 裸 `removeEventListener`——capture 不匹配，listener 永久残留；root 已 remove 后
       `root.contains(target)` 恒 false → 后续每次 Esc 都 preventDefault + stopPropagation，
       游戏菜单 Esc 被吞至刷新。历史 O2(`D13-1:416-420,504-516`)「只能刷新重开，不修」属实。
    4. **键位**：reforge src 全域 grep `Backquote|backquote` 零命中；游戏键位仅
       Escape/Space/Enter/F5/F9/`[`/`]`/arrows(`main.ts:4163-4169,6421-6745`)；F9=quickLoad
       (`:6723`)，不用 F9 正确。
    5. **DEV-only 与布局真值**：安装门 `import.meta.env.DEV && params.has('debug')` 动态
       import(`main.ts:6935-6937`)，`__tpE2e` 同门(`:6777`)；dev-tools.md:16「固定 720px」
       与实际 `width:min(420px, calc(100vw-24px))`(`debug-tools.ts:119`) + 480px 媒体查询
       (`:241-246`) 漂移属实，文档修正属范围内；`.tpd-panel` 是唯一 scroll owner(`:176`)。
  - design: **agree（2026-09-03；背书 GLM GM-E1~E4 与两条必改项，架构/输入所有权面无阻塞
    必改项）**。单一 captureMotionState 生产者双消费（DebugToolsContext 是 DEV-only 上下文
    接口，不构成跨包公共接口扩张）、DTO 纯值禁函数、epoch 三字段分类、hide/show 与 dispose
    两层 controller、Backquote 只在 hidden 态重开（open 态整键忽略，无 toggle 歧义）、
    DEV tree-shake 硬门，均与一手代码吻合且无更小合法方案。
- GLM:
  - premise: **verified（2026-09-03，四类对象与全部控制源逐处直读复算 + 现有 dump/状态页缺口
    逐项比对 + capture listener 残留 bug 实锤 + 三个锚点测试文件地基评估，非复述 Codex）**：
    1. **四类对象运行态全部实在（本人直读）**：队长——`player.pos/facing/walking` +
       authority Map `'party'` 键（`deriveMounts` :4009 `id === 'party'` 分支）+ 独立
       `partyMove`（:1417，不进实体 slots）；队伍跟随成员——`followerAuth`
       `Map<number, {kind:'follow'}|{kind:'mount',parent,dx,dy,facing}|{kind:'script',pos,facing}>`
       缺省 follow + `followerPos`（:531-533）；编外跟随精灵——`runtimeScript.followers`
       渲染循环 :5951-5984（runtime slot `k` + spriteId + `computeFollowerPos` 派生）；
       live 实体——`scene.entities` + `entityLifecycleGates`（:1531）。
    2. **epoch 字段实证**：`motion-runtime.ts` DTO 真含 `commandEpoch` / `activationOwnerId` /
       `activationEpoch` / `authorityEpochAtEnqueue`，coordinator 持 `authorityEpoch` Map
       （:34）——「明确区分 authorityEpoch、slot commandEpoch、activationOwnerId/
       activationEpoch」有真实字段基础，非臆造分类。
    3. **现有 dump 缺口逐项比对（:6781-6804 本人直读）**：现 dump 覆盖 player pos/facing/
       walking + 实体 id/pos/facing/gates/authority(**仅 kind**)/scriptMotion/autoMotion/
       gait（按 id 排序）+ pendingTouch/pendingChase/hostileBusy/runnerActive——**缺**
       队长 authority/partyMove、队伍与编外跟随者、mount parent/dx/dy、全部 epoch、slot
       注册详情（activation lineage）——与卡面「现有 dump 缺…」逐字一致；状态页
       （debug-tools.ts:442-476）只渲染 world JSON，无运动区 ✓。
    4. **capture listener 残留 bug 实锤**：debug-tools.ts:303
       `addEventListener('keydown', closeOnEscCapture, { capture: true })` vs :274
       `removeEventListener('keydown', closeOnEscCapture)` **未带 capture**——按 DOM 匹配
       规则该 capture 监听器 close 后真实残留（后续 Escape 被吞），卡面 bug 定性成立；
       `close()` 同时删 root+style 且无重开路径 ✓ 只能刷新。
    5. **DEV 门与历史**：`import.meta.env.DEV && params.has('debug')` 动态 import（:6935）
       可 tree-shake ✓；F9 快速读档在 :6721-6725 区域占用 ✓；D13-1 历史 O2（无重开热键）
       延后未解决属实。
    6. **控制源闭合枚举（遗漏审计）**：本人沿 main.ts 排查定位写入点——`player.pos` 写入
       仅 partyMove/deriveMounts('party')；实体 pos 写入仅 authority 驱动（mount 派生/slot
       commit）；跟随者位置仅 computeFollowerPos/followerAuth script 分支；**未发现**绕过
       partyMove/authority/followerAuth/编外派生/scriptSlots/autoSlots 的第五控制源
       （`motionSideSticks`/`entityGaitOwner` 为移动指令瞬态与外观 owner，非定位权威）。
    7. **可证伪观察**：发现任一不经上述六通道的定位写入点；反引号在守卫后仍被游戏/输入法
       路径消费；production bundle 出现 `tp-debug|installDebugTools|实体位置控制权` 任一
       字符串；close 后 Escape 仍被吞——任一成立本签字失效。
  - design: **agree（2026-09-03，附 GM-E1~E4 必落钉 + 两条必改项，与卡面设计收敛）**：
    - **GM-E1（快照合同钉）**：单一 `captureMotionState()` 同时供 `__tpE2e` 与
      `DebugToolsContext.motionState`；DTO 纯值（structuredClone），断言不含
      cancel/resolve/commit 函数；四类对象判别联合 + 四种控制权 + mount parent/dx/dy +
      三类 epoch 分字段；「authority 缺项即 world / followerAuth 缺项即 follow」为合同
      语义不报异常；**编外 follower 的 def/帧查找失败时 slot 仍必须列入快照**
      （渲染循环 :5965-5970 会 `continue` 跳过缺 def 精灵，快照不得同样跳过——
      **必改项 ①**：诊断身份与渲染可达性是两个 concerns，缺 def 恰是最需要诊断的状态）。
    - **GM-E2（排序与刷新钉）**：固定序 队长→队伍顺序→编外 runtime slot→entity id；
      测试必须包含「空队伍跟随 + 多编外」「全空」两档排序；「刷新状态」一次刷新世界与
      运动两区且两区数据来自同一次快照调用（断言同拍一致性）。
    - **GM-E3（生命周期与输入守卫钉）**：hide/show 与 dispose 两层分离；三轮 hide/show 后
      恰 1 root/1 style/1 listener；重复 install 先完整 dispose 旧 controller；dispose
      幂等（连调两次无害）；**stale disposer 不得删新实例**；修复后的 capture 移除必须带
      `{ capture: true }` 且以「close 后再派发 Escape 能到达游戏」的行为断言钉死（不能只
      断言 removeEventListener 被调用）；Backquote 仅 hidden + `event.code` + 非
      repeat/composing/无修饰键/无 editable 祖先时处理——**必改项 ②**：守卫测试必须
      显式包含 contenteditable 祖先（卡面文案有、测试清单未点名）与 `event.code` 布局
      无关性断言。
    - **GM-E4（测试与剥离矩阵钉）**：debug-tools.test 在现有 3 测（style/tabs、battle
      fail-closed、close/reset）之上扩展卡面 12 项矩阵；coordinator/wiring 现有 16 测
      （take/release epoch、mount/teardown、activation lineage）作回归地基零改动预期；
      `pnpm --filter @type-pal/reforge test` + typecheck + build；**Reforge 与 Editor 两个
      生产构建**分别 grep `tp-debug|installDebugTools|实体位置控制权` 零命中为 done 硬门。
- 独立反证审查（至少一位非 Coding Owner 必填）:
  - 审查者: GLM（2026-09-03，完成——四类对象/控制源/epoch 字段/缺口比对/capture 残留
    bug/DEV 门/控制源闭合枚举全部本人直读；Kimi 席位保留）
  - 独立证据锚点: `main.ts:531-533,1417,1684-1726,3988-4010,5951-5984,6776-6804,6933-6965`；
    `motion-runtime.ts:6-19,34`（commandEpoch/activationOwnerId/activationEpoch/
    authorityEpochAtEnqueue/authorityEpoch）；`debug-tools.ts:258-303`（:274 裸移除 vs
    :303 capture 注册）、`:442-476`；三个锚点测试文件矩阵清单。
  - 可证伪观察: 第五定位控制源出现；反引号守卫后仍冲突；production 泄漏任一字符串；
    close 后 Escape 仍被吞——任一成立签字失效。
- counter / 分歧处理: 无；若 reviewer 发现遗漏控制源、快捷键冲突或 DEV-only 泄漏，留在 draft 修订。
- 缺签豁免: N/A
- build 准入结论: **allowed（2026-09-03 Codex + GLM + Kimi 三签齐；GLM 两条必改项——
  ① 编外 follower 缺 def/帧时 slot 仍须入快照、② Backquote 守卫测试显式含 contenteditable
  祖先与 event.code 布局无关性——纳入 build 落实条件；用户 2026-09-03 裁决在案）**

### 进入 done 前:审查签字

- Codex: **accept（2026-09-03，候选 `de19b7f8`）**。单一纯值快照、四类对象、partyMove/
  entity slots 分界、epoch 分类、hide/show + dispose、Backquote 守卫、在途操作 ownership 与
  production 剥离均已实现；自动与浏览器证据见 Build/视觉记录。
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
- 结论: **agree（2026-09-03 Kimi）**。设计骨架（单一快照生产者/判别联合四类对象/两层
  controller/Backquote 只重开/DEV-only 硬门）与一手代码吻合；Esc capture 残留真 bug
  随本卡删除且不留第二条 Escape 路径，hide 后游戏输入零影响；紧凑列表复用 `.tpd-panel`
  唯一 scroll owner，不新增嵌套滚动、不重做几何，仅修正 dev-tools.md 的 720px 文档漂移。
- 必改项: 沿用 GLM 两条（① 编外 follower 缺 def/帧时 slot 仍须入快照——captureMotionState
  必须直读 `runtimeScript.followers` 而非渲染 sprites 数组；② Backquote 守卫测试显式含
  contenteditable 祖先与 `event.code` 布局无关性，capture 移除以「close 后 Escape 到达
  游戏」行为断言钉死）；架构/输入所有权面无新增阻塞项。
- 是否建议进入 build: **是（三签齐，两条必改项作为 build 落实条件随卡走）**

### 三方争议记录(按需)

- Codex: 同意单一值 DTO、partyMove/两类 follower/entity 完整投影、hide/show + dispose 两层
  controller、Backquote 只重开和 DEV-only 边界。
- Kimi: 同意设计骨架；背书 GLM 两条必改项，架构/输入所有权面无新增阻塞项。
  补充三点实现注意（非必改）：① Backquote 在 open 态整键忽略（含面板内 console 输入框）；
  ② controller 常驻且 capture listener 唯一，hide/show 不增删 listener；③ build 期重跑
  写点普查 grep 确认仍只有五族控制源，新写点必须过 canWrite/authority。
- GLM: 同意，附 GM-E1~E4 钉与两条必改项（缺 def 编外 follower 入快照；contenteditable
  祖先 + event.code 布局无关性守卫测试）。
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
- 修改文件:
  - `packages/reforge/src/main.ts`
  - `packages/reforge/src/debug-tools.ts`
  - `packages/reforge/src/debug-tools.test.ts`
  - `docs/phase2/dev-tools.md`
- 实现摘要:
  - 新增唯一 `captureMotionState()`，同时供 `__tpE2e.dumpMotionState` 与调试面板消费；DTO 只含值，
    覆盖队长、队伍成员、缺资源也保留的编外 follower、live scene entities。
  - 队长单列 partyMove；entity slots 只标“已注册/待执行”，保留 command/activation/authority
    epoch 与 paused 状态，不反推有效控制权。
  - 状态页新增紧凑分割线列表，无逐行卡片边框；控制权以世界/脚本/跟随/载具徽标显示。
  - 调试面板改为 hide/show + dispose 两层生命周期；修复 capture listener 注册/移除不匹配的真实泄漏，
    Esc 隐藏并 reset，Backquote 仅在安全关闭态重显，dispose 集中 abort panel-owned 操作。
  - 浏览器实测发现根节点 `display:flex` 覆盖原生 hidden，已补 `#tp-debug[hidden] { display:none; }`
    并加永久测试。
- 运行命令:
  - `pnpm exec vitest run src/debug-tools.test.ts`（7/7）
  - `pnpm --filter @type-pal/reforge check`（93 files / 857 tests）
  - `pnpm --filter @type-pal/reforge build`
  - `pnpm --filter @type-pal/editor build`
  - 两份生产构建 `rg 'tp-debug|installDebugTools|实体位置控制权' ...`（零命中）
  - `pnpm exec biome check` 定向代码文件（零 error；仅 `main.ts` 三处既有未使用 import/参数 warning，
    均不在本任务 diff）
- 浏览器 / 手工检查: 完成；详见视觉验证记录。
- 跳过的检查及原因: 未跑全仓所有其他包测试；改动只在 Reforge DEV-only 模块与 main 的死分支快照，
  Reforge 全包、两个消费者生产构建和实际 PAL 页面已覆盖风险面。

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
- 验证方式: 本地 `dev:pal` + 应用内浏览器真实 DOM/交互/截图；默认 1280×720、360×640、320×640。
- 集中 E2E 用例 / 批次: N/A
- 截图 / 像素检查路径:
  - `output/playwright/e6-1/e6-1-authority-mount-default.jpg`
  - `output/playwright/e6-1/e6-1-authority-mount-320x640.jpg`
- 结论:
  - `s213 + li-xiaoyao,anu` 真实触发 `e3613`：队长与阿奴同显 `载具 e3613 (0,0)`，实体
    `e3613` 同时显脚本控制与已注册 motion；结束后刷新回 `世界 authority@2`。
  - Esc 后面板真实不可见，Backquote 无刷新重显；console 输入框中输入反引号保留字符且不切换。
  - 360px：root/list/panel `scrollWidth === clientWidth`；320px：root/panel 均 304px 且零横溢出。
  - 列表使用分割线、长内容折行、panel 单一纵向滚动；浏览器 console 0 warning/error。
- 未完成项: 无。

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: Codex build 候选已提交，等待 Kimi/GLM 独立实现复验。
- 必须返工项: pending（当前 Coding Owner 自审无已知 blocker）
- Accept / rework: pending

## 用户验收

- 用户结论: pending
- 后续任务: 四条 PAL 数字角色条件引用上游修复。

## 交接日志

- 2026-09-03 Kimi: 完成架构/输入所有权/功能界面主审，签 premise verified + design
  agree。独立证据：`player.pos` 六写点/实体五写点 grep 普查（控制源恰五族，spawn/teleport
  为瞬时写）；Esc capture 残留 bug 独立实锤（:303 capture 注册 vs :274 裸移除 → 游戏菜单
  Esc 被吞至刷新）；`Backquote|backquote` 全域零命中、F9=quickLoad :6723；DEV 动态 import
  门 :6935 + `__tpE2e` :6777；dev-tools.md「720px」与实际 `min(420px,100vw-24px)` :119 +
  480px 媒体查询漂移核实；`.tpd-panel` 唯一 scroll owner :176。背书 GLM 两条必改项，
  补三点实现注意（open 态 Backquote 整键忽略；controller 常驻 listener 唯一；build 期
  重跑写点普查）。未修改实现，未代签 GLM。三签齐，build 准入 allowed。Next: Codex
  按卡 build，落实 GLM 两条必改项与三点实现注意。
- 2026-09-03 GLM: 独立完成数据覆盖/遗漏审计与测试矩阵审查，签 premise verified + design
  agree。证据：四类对象运行态逐处直读（party authority 键+partyMove、followerAuth 三型+
  followerPos、编外 followers :5951-5984、live entities+gates）；epoch 字段在
  motion-runtime.ts 实证（commandEpoch/activationOwnerId/activationEpoch/
  authorityEpochAtEnqueue/authorityEpoch Map）；现有 dump :6781-6804 缺口与卡面逐字一致；
  **capture listener 残留 bug 实锤**（:303 capture 注册 vs :274 裸移除）；控制源闭合枚举
  未发现第五定位写入点；三个锚点测试文件地基评估（debug 3 测 + coordinator/wiring 16 测）。
  附 GM-E1~E4 钉与两条必改项（① 编外 follower 缺 def 时 slot 仍须入快照——渲染 continue
  不等于诊断跳过；② Backquote 守卫测试显式含 contenteditable 祖先 + event.code 布局
  无关性，capture 移除以「close 后 Escape 到达游戏」行为断言钉死）。未修改实现，未代签
  Kimi。Next: Kimi 架构/输入所有权主审；三签齐后 Codex 方可 build。
- 2026-09-03 Codex: 按用户确认的第二阶段唯一队列开 E6-1；完成当前实现/调试入口与历史 O2 的
  一手核验，冻结单一快照、完整四类对象、两层 controller、Backquote 输入守卫和 production 剥离门禁。
  Evidence: 本卡前提矩阵与代码锚点。Next: Kimi、GLM 独立设计审查；签字不齐不得开始实现。
- 2026-09-03 Codex: 检查 `d69f7160`（GLM）与 `1b91aeb7`（Kimi），确认三方 premise/design、
  独立反证与 GM-E1~E4 齐全；状态转 build。Evidence: 本卡推进签字。Next: Codex 作为唯一
  Coding Owner 实现并自测；无需再补设计签。
- 2026-09-03 Codex: 完成候选 `de19b7f8`。自动验证 Reforge 93 files / 857 tests、Reforge/Editor
  build 与 production debug grep；真实 `s213/e3613` 验证 mount、script→world 归还、Esc→Backquote、
  输入框守卫及 360/320px 零横溢出，console 0。Status 转 review，Codex 签 accept。Next: Kimi
  实现/视觉复验与 GLM 覆盖复验；两席均 accept 前不得标 done。

## 下一位 Agent 提示词

### Kimi（实现/视觉复验）

```text
接手任务: E6-1 实体位置控制权运行态检视与调试面板重开
任务卡: docs/ops/tasks/E6-1-runtime-authority-inspector.md
当前状态: review；实现候选 de19b7f8，Codex 已签 accept，Kimi/GLM final accept 尚缺。
你的角色: 架构、输入所有权、代码与功能界面视觉复验。
先读: AGENTS.md；docs/phase2/READ-FIRST.md；任务卡全部设计签字、Build 与视觉记录；候选 de19b7f8；packages/reforge/src/main.ts 的 captureMotionState；packages/reforge/src/debug-tools.ts 全文及测试；docs/phase2/dev-tools.md。
已完成: 单一纯值快照覆盖四类对象；状态页紧凑列表；Esc hide/Backquote show；listener 泄漏修复；7 条组件测试；Reforge 93 files/857 tests；双 build 与 production grep；真实 s213/e3613 mount、归还、320px 视觉证据。
请你做: 独立审查 de19b7f8，重点核单一真值、partyMove/slots/epoch、hide/show/dispose 与在途操作、Backquote 输入所有权、stale disposer、DEV tree-shake；复核默认与 320px 截图/必要时实机抽验。把 final accept 或 counter、证据、返工项写回任务卡。
不要做: 不改实现；不代签 GLM；不把 E6 标 done；不扩 schema/save/migration/overlay/时间旅行。
输出要求: 提交并推送任务卡 review 签字，回复 commit hash 与 accept 或 counter；若 accept，附 GLM 下一位提示词。
```

### GLM（覆盖/测试复验）

```text
接手任务: E6-1 实体位置控制权运行态检视与调试面板重开
任务卡: docs/ops/tasks/E6-1-runtime-authority-inspector.md
当前状态: review；实现候选 de19b7f8，Codex 已签 accept，等待 Kimi/GLM final accept。
你的角色: 四类对象覆盖、测试矩阵、文档与遗漏复验。
先读: AGENTS.md；docs/phase2/READ-FIRST.md；最新任务卡；候选 de19b7f8；packages/reforge/src/main.ts 的 captureMotionState；packages/reforge/src/debug-tools.ts；packages/reforge/src/debug-tools.test.ts；docs/phase2/dev-tools.md。
已完成: Codex 已落实 GM-E1~E4 和两条必改项；自动与浏览器证据写在任务卡 Build/视觉记录。
请你做: 独立确认缺 def 编外 follower 仍入快照、四类排序、默认控制权、epoch/slot 纯值、同次刷新、contenteditable+event.code 守卫、close 后 Escape 到达游戏、三轮 hide/show、重复安装/幂等 dispose、在途 abort、双生产构建剥离；把 final accept 或 counter、证据、返工项写回任务卡。
不要做: 不改实现；不代签 Kimi；不标 done；不扩任务范围。
输出要求: 提交并推送任务卡 review 签字，回复 commit hash 与 accept 或 counter。
```
