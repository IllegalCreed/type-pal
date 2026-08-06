# D13-1 - 调试工具首刀（议题 13）

Status: build
Phase: phase2
Capability: 议题 13 开发/调试工具（P1 工具层）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi（工具架构）+ GLM（覆盖/矩阵）
Visual Verification Owner: Kimi
Unavailable Agents: none
Branch: TBD

## 目标

把「创作验证」升级为「调试器」：cheat console、世界变量检视、任意脚本/触发器按 id 触发、
战斗态构建器（任选敌队/成员装备/等级/HP/MP/异常状态/道具）、触发区可视化、帧步进。

## 范围

- 范围内:
  - cheat console（命令行：跳场景/给物品/金钱/状态/运行脚本）。
  - 世界变量/脚本状态检视器。
  - 按脚本/触发器 id 任意触发（补齐「触发任意脚本」能力）。
  - 战斗态构建器：敌队自由组合 + 成员装备/等级/HP/MP/异常状态/道具预设（内存态，不落档）。
  - 触发区可视化（现有 ?collision 的扩展）。
  - 帧步进（依赖注入时钟，gameplay-clock 已具备基础）。
- 范围外:
  - 时间旅行 / effect 溯源回放：**依赖 D14-2 的 effect 协议**，协议落地后再开子卡。
  - 网络/多人调试。
- 明确不做:
  - 不做编辑器内嵌调试器 UI（工具先以 URL 参数 + 浏览器 console + 页面 overlay 形式）；
    编辑器集成入口另议。

## 上下文锚点

- 已拍板决策 / 铁律:
  - D2「意图→纯函数判定→结果」红线；注入时钟基础已有。
  - 议题 13 backlog 方向（时间旅行/帧步进/可视化/console/检视器）。
- 代码锚点:
  - `packages/reforge/src/main.ts:319/4304`（?collision 可视化）、`:1099-1125`（?scene/?pos/
    ?facing）、`:5090-5157`（?battle/?skill/?give/?field/?party）、`:4566/4580`
    （debugLog/debugPlayers）、`gameplay-clock.ts`。
  - 编辑器 `play.ts`（同源试玩页，URL 参数原样生效）。
- 已知坑 / 审计文档:
  - 一阶段 `__tpgs` 调试口先例（main.ts 注释）；DEV-only 入口纪律。
- 不得重新引入:
  - 调试状态落档/污染存档（全部内存态）。
  - 生产路径依赖调试分支（DEV-only guard）。
- 相关测试:
  - gameplay-clock / script-runner 现有单测。

## 验收条件

- 功能:
  - cheat console 常用命令可用；世界变量检视实时可见。
  - 任意脚本/触发器 id 可一键触发（同脚本语义执行，AbortSignal 可取消）。
  - 战斗态构建器可组任意敌队 + 任意成员预设开局（内存态），可回归默认。
  - 触发区可视化叠加层；帧步进可单步观察。
- 测试:
  - 每条能力的 e2e/手动路径；DEV guard 单测（生产构建不含调试分支）。
- 文档:
  - 调试命令速查入 docs（dev-tools.md）；backlog 议题 13 状态更新。
- 视觉 / 手工验证:
  - Kimi 浏览器实测战斗构建器与触发区可视化。

## 推进签字

### 进入 build 前:设计签字

- Codex: agree（2026-08-06 设计冻结，见「设计结论」）
- Kimi: **agree**（2026-08-06，工具架构/并发语义主审；附 K1-K5 build 准入钉，G2 裁定见三方争议记录）
- GLM: **agree（2026-08-06，附 G1-G4 build 准入钉，见「GLM 设计准入复审」）**
- counter / 分歧处理: 无 counter；G2（并发语义口径）经 Kimi 独立裁定闭环（见三方争议记录）
- 缺签豁免: N/A
- build 准入结论: **allowed**（三方 agree 齐；K1-K5 + G1-G4 为 build 验收钉，不阻塞准入）

### 进入 done 前:审查签字

- Codex: pending
- Kimi: pending
- GLM: pending
- counter / 返工处理: N/A
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论

**2026-08-06 冻结（Codex agree）**：

1. **入口形态**：`?debug` 打开 DEV overlay 面板；现有 URL 参数（?scene/?pos/?battle/?skill/
   ?give/?party/?collision）全部保持兼容。面板含五个区：命令输入（cheat console）、
   世界变量树（只读检视）、脚本/触发器列表（一键触发）、战斗构建器表单、图层开关
   （碰撞/触发区）。全部 `import.meta.env.DEV` guard，生产构建不含。
2. **cheat console**：命令注册表模式（命令名 → 执行器），复用现有 host 能力
   （giveItem/giveMoney/setAmbience/startBattle/脚本触发），不新建执行路径。
   命令集：help / scene / pos / give / money / party / skill / battle / field /
   run-script / run-trigger / state / var。
3. **世界变量检视**：只读快照树（world 状态：money/inventory/party/entity 态），
   overlay 树形展示；只读、不落档。
4. **任意脚本/触发器触发**：枚举 canonical project 的 script refs（shared + scene）与
   触发器，列表点击 → 走 `runSharedScript` / `runEntityBehavior` / `startScript`
   同一执行器（main.ts:3715 先例）；主 runner 独占规则不变（有活跃演出时提示排队/拒绝）；
   AbortSignal 可取消。
5. **战斗态构建器**：表单 = 战场 field + 敌队（选现成 team 或从 enemiesById 自由多选组合）+
   我方成员（从 actors 多选，逐成员设等级/HP/MP/装备/道具/异常状态）→ 生成 dev-only
   battle opts（enemyOverride / partyPreset），走同一 `startBattle` 入口
   （main.ts:2152 扩展可选参数），内存态不落档，结束回触发前世界。URL 兼容
   （?battle 语义不变）。
6. **触发区可视化**：在 ?collision 叠加层上扩展触发器范围框 + 标签；仅 DEV。
7. **帧步进**：gameplay-clock 加 dev 暂停/单步（worldMoveAcc 暂停累积，按键强制一拍）；
   放本卡尾段，若复杂度超标拆独立子项。

范围边界重申：时间旅行/effect 回放不做（依赖 D14-2）；调试状态一律内存态；
生产路径零调试分支。

### 已知风险

- 风险: 战斗态构建器与 startBattle 正常路径分叉，行为漂移。
- 缓解: 构建器只覆写参数（enemyOverride/partyPreset），走同一 battle session 入口
  （复用 ?battle 现有路径）。
- 风险: 调试分支进生产。
- 缓解: DEV-only guard + 构建门禁。
- 风险: 任意脚本触发与主脚本并发冲突。
- 缓解: 复用独立 runner 先例（runDetachedV5ScriptChain）或活跃演出时拒绝并提示。

### 主审立场

- Reviewer: Kimi（工具架构）+ GLM（覆盖）
- 结论: **三方 agree 齐（Codex / GLM / Kimi）**；K1-K5（Kimi）+ G1-G4（GLM）为 build 验收钉
- 必改项: 见 G1-G4（GLM build 准入钉）与 K1-K5（Kimi build 准入钉，下方 Kimi 主审条目）
- 是否建议进入 build: **是（三方 agree 齐，allowed）**

#### Kimi 工具架构/并发语义主审（2026-08-06）：**agree（附 K1-K5 build 准入钉）**

**方法**：只读审查；全部代码锚点一手核实（main.ts:319/1099-1125/2152-2158/3331-3369/
3420-3454/4486/4556-4586/5089-5158、gameplay-clock.ts、editor/play.ts），不采信转述。
GLM 的七处核心引用（DEV 先例、?debug 未占用、命令注册表复用、startBattle 独立 signal、
runDetached 并发先例、?collision 叠加层、范围纪律）逐一复验成立。未修改实现。

**并发裁定（GLM G2 核心问题，本席独立结论）**：dev 任意脚本触发**必须走 detached**
（runDetachedV5ScriptChain 先例 :3331-3343 的并发分支），**不得走 startScript**（:3421
`if (runner) return` 静默丢）——调试工具对用户说「已触发」却静默丢弃是谎言式 UX。
detached 在 ownsRunnerSlot=false 时不占主 slot、不排 onEnter、不做 slot 收尾（dismount/
authority.clear/autosave 归主 runner）——这正是既有物品菜单脚本的并发语义，可直接复用。
UX 定式：overlay 显示「主 runner 占用中」徽标；触发返回 promise 的状态（running/done/
error/cancel）上屏；**场景切换类脚本在主 runner 占用时触发须先弹确认**（detached 不排
onEnter，有「切了场景但入场脚本没跑」的半态风险，与 :3327-3329 注释语义一致）。

**逐项压测**：

1. **入口形态** ✅：URL 参数全部独立 `params.get`（:1101-1125/:5090-5114），无解析顺序或
   覆盖冲突；`?debug` 未被读、无冲突；编辑器 play.ts 同源 bootGame、参数原样生效，overlay
   两路（6051 dev / 编辑器试玩）自动可用。
2. **战斗构建器与 startBattle** ✅ 方向成立：:2152 的 `battleOpts` 加可选参数不破 `?battle`
   语义；dev 直开用独立 AbortController signal（:2158/:5142），不借用主脚本 signal、不干扰
   主 runner 取消域——与既有 dev 试打纪律一致。**但 partyPreset 的回滚语义必须在实现层钉死**
   （见 K2），否则「结束回触发前世界」落空。
3. **runner 独占规则**：见上方并发裁定（K3）。
4. **DEV guard** ✅ 方向成立 + K4 硬化钉：`import.meta.env.DEV` 9 处先例在案；但 tree-shake
   只对 DEV 块内代码可靠，对「debug 模块被静态 import」无防护——见 K4。
5. **帧步进**：gameplay-clock 现只有 frozen 暂停（advance 的 gameplayDt=0），无单步——
   G3 成立；语义定义见 K5。

**K 钉（build 准入必落，非 agree 阻塞）**：

- **K1（overlay 输入隔离）**：游戏键盘监听在 window keydown（本席今日实测合成键可达）。
  cheat console 输入框必须 stopPropagation（keydown/keyup），并获得焦点时屏蔽游戏快捷键
  （Space/Enter/Esc/方向键），Esc 只关 overlay 不触游戏菜单；overlay 在战斗/演出中打开时
  不得吞掉游戏对话推进键。720px 宽度下面板五区不得横向溢出。
- **K2（partyPreset 快照回滚）**：成员预设（等级/HP/MP/装备/道具/异常状态）若直接改
  world.party/inventory 会在战后泄漏（?party 先例就是直接 mutate）。构建器必须在开战前
  snapshot world.party + inventory，战斗结束（胜/败/取消/重开面板）后恢复——「结束回触发
  前世界」用测试证 world 深等于战前。enemyOverride 只进 battle session（战斗局部，不回滚）。
- **K3（触发走 detached + 占用 UX 定式）**：实现禁用 startScript 的静默丢路径；detached
  触发返回 promise 状态上屏；「主 runner 占用中」徽标；场景切换类脚本在占用时先确认；
  AbortSignal 可取消（取消后状态= cancel，不得残留 running）。
- **K4（DEV guard 硬化）**：overlay/命令注册表/战斗构建器必须经 `if (import.meta.env.DEV
  && params.get('debug')) await import('./debug-tools…')` 动态引入，主包静态 import 链不得
  触及 debug 模块；验收 = vite build 后 grep **主 bundle** 无 debug 符号 + 记录残余 chunk
  策略（永不加载 or 配置排除），不能只凭 DEV 语义（GLM G1 的精确化）。
- **K5（帧步进语义定义）**：步进单位 = **一个 gameplay tick**（固定步长推进 gameplayNow，
  非墙钟 dt）；作用域 v1 = **仅大世界 gameplay 相位**（移动/实体/auto 脚本推进），战斗会话
  tick、演出、对话推进排除在外并在面板明示；API 形态 = GameplayClock 现有 frozen + 新增
  step()（强制一拍），须有单测（冻结期 real 时间不积压、step 精确推进一拍）。

**结论**：设计收敛、复用既有机制、全部 DEV-only，无 schema/save/migration 风险。**agree**。
K1-K5 与 GLM G1-G4 为 build 验收钉，不阻塞准入；其中 K2/K3 是语义正确性钉，K1/K4/K5 为
边界硬化钉。

### 三方争议记录(按需)

- Codex: 2026-08-06 用户咨询议题 13 后开卡；首刀范围如上，时间旅行留 D14-2 之后。
  同日冻结设计并签 agree（入口=DEV overlay + URL 兼容；战斗构建器=startBattle 参数扩展）。
- Kimi: **agree（2026-08-06，K1-K5 build 准入钉）**。并发裁定（G2 闭环）：dev 任意脚本触发
  走 **detached**（runDetachedV5ScriptChain 并发分支先例），不走 startScript 静默丢；
  占用徽标 + 状态上屏 + 场景切换类占用时确认 + AbortSignal 可取消。其余压测与 K1-K5 见
  「Kimi 工具架构/并发语义主审」。
- GLM: **agree（2026-08-06，覆盖矩阵主审 + 并发语义独立核实）**。详见「GLM 设计准入复审」。
  核心结论：设计干净、收敛、全部 DEV-only，风险点均有现有机制兜底；但**两处语义偏差必须
  在 build 准入前对齐**（G2 并发语义口径、G3 单步能力新增），另两处为验收必测钉（G1 DEV guard
  构建产物验证、G4 命令集覆盖矩阵）。不阻塞 build，但实现须落钉。

#### GLM 设计准入复审（2026-08-06）：**agree（附 G1-G4 build 准入钉）**

**方法**：只读审查；独立核实卡内引用的全部代码锚点（main.ts:319/1099/2152/3331/3420/4304/
5090、gameplay-clock.ts、editor/play.ts），不依赖设计描述转述。未修改实现。

**正面核实（设计成立）**

1. **DEV guard 有可靠先例且生产可剥离** ✅：`import.meta.env.DEV` 在 main.ts 已有 9 处先例
   （:837/:861/:2538/:2765/:4470/:5031 等），`vite build` 默认将其替换为 `false` 并 tree-shake
   掉 `if(false)` 块 —— 标准 Vite 行为，生产构建天然不含调试分支。`?debug` 参数当前未被读、
   无冲突。编辑器 play.ts 同源（`bootGame` + URL 参数原样生效），DEV overlay 两边自动可用。
2. **cheat console 命令注册表复用 host，不新建执行路径** ✅：现有 `?give/?skill/?party/?scene/
   ?pos/?facing/?field/?battle` 全是 dev 参数 → 直接 mutate world（内存态，`?party` 拉满 HP/MP、
   `?give` 加道具、`?skill` 授技 + MP 拉满）或走 `host.startBattle`。命令注册表把这些包成命令名
   → 执行器映射，复用既有能力，方向正确。
3. **战斗构建器走同一 startBattle 入口** ✅：`host.startBattle(team, battleOpts, runnerSignal)`
   （:2152）已支持 `battleOpts`（fieldId/choreography）+ `runnerSignal`；扩展 `enemyOverride/
   partyPreset` 是加可选参数，不破坏现有 `?battle` 语义。dev 直开用独立永不取消 signal
   （:2158 `launchSignal = runnerSignal ?? new AbortController().signal`），不借用主脚本 signal
   —— 与既有 dev 试打纪律一致。
4. **任意脚本触发有真实承载机制** ✅：`runDetachedV5ScriptChain`（:3331）已是独立 runner 先例，
   `ownsRunnerSlot = runner === null` 时占主 slot、否则并发跑（:3337-3343）；AbortSignal 可取消。
   设计卡引用此先例成立。
5. **触发区可视化是 ?collision 的增量扩展** ✅：`drawCollisionOverlay`（:4304 块）已是 dev-only
   叠加层，扩展触发器范围框 + 标签属同构增量。
6. **范围纪律** ✅：时间旅行/effect 回放明确留 D14-2；调试状态一律内存态、不落档（与 `?give/
   ?skill` 既有内存态纪律一致）；无 schema/save/migration/公共接口变更 → 常规迭代定性成立。

**G 钉（build 准入必落，非 agree 阻塞）**

- **G1（DEV guard 验收钉）**：验收条件「生产构建不含调试分支」不能只靠 `import.meta.env.DEV`
  语义，**实现时必须加一条构建产物验证**——`vite build` 后 grep dist 产物，确认 DEV overlay /
  命令注册表 / `?debug` 分支不出现在产物里（或加一条 build 后断言脚本）。理由：Vite tree-shake
  对 `if(import.meta.env.DEV)` 可靠，但对「DEV overlay 组件被生产路径间接 import」无防护；须证。
- **G2（并发语义口径对齐，必须澄清）**：设计卡第 4 条写「主 runner 独占规则不变（有活跃演出时
  **提示排队/拒绝**）」，但**现状是 `startScript` 第一行 `if (runner) return`（:3420）= 静默丢**，
  而 `runDetachedV5ScriptChain`（:3337）允许主演出进行中**并发跑** detached 脚本（`ownsRunnerSlot
  =false` 仍执行 invoke）。即「任意脚本触发」实际可走 detached 并发、不必排队/拒绝。**实现前必须
  明确**：任意脚本触发走 `startScript`（静默丢）还是 `runDetachedV5ScriptChain`（并发可跑）？
  二者语义完全不同。建议：dev 触发器默认走 detached（可并发、可取消、UI 提示），并在 overlay
  显示「主 runner 占用中」状态；不得用「拒绝」描述 detached 的实际行为。**这是设计描述与代码现状
  的口径差，必须在 build 前对齐，否则实现会按错误语义写。**
- **G3（帧步进是新增，非既有基础）**：设计卡说「gameplay-clock 已具备基础」——核实 `gameplay-clock.ts`
  只有 `advance(realNow, frozen)` 的 `frozen` 暂停（`gameplayDt=0`），**没有单步能力**。「按键强制
  一拍」需新增逻辑（worldMoveAcc 暂停累积 + 强制推进一拍 + 演出/对话是否同步步进）。设计卡已标
  「复杂度超标拆独立子项」，边界清楚，但实现时要明确帧步进的**步进单位**（一拍=一 gameplay tick？
  还是动画帧？）与**作用域**（仅大世界移动 vs 含战斗/演出/脚本 tick）。建议 build 前在卡内补一行
  步进语义定义。
- **G4（命令集覆盖矩阵）**：命令集（help/scene/pos/give/money/party/skill/battle/field/
  run-script/run-trigger/state/var）须在实现时落**覆盖矩阵**：每条命令 → 复用的 host 能力 /
  dev 参数 → DEV-only 证明 → e2e 或手动路径。特别要覆盖：
  - `run-script` / `run-trigger` 与 G2 的 detached vs startScript 选择一致；
  - `money` 命令（`?give` 现只塞道具，金钱未有 dev 入口）属新增 mutate world.money，确认内存态；
  - `state` / `var` 检视器只读，不得写（避免调试器变成 cheat-write 路径）。

**结论**：设计方向干净、DEV-only 收敛、复用既有机制，无 schema/save/migration 风险。**agree**。
G1（构建产物验证）、G2（并发口径对齐）、G3（帧步进语义定义）、G4（命令覆盖矩阵）为 build 准入
必落钉——其中 **G2 必须在动手实现前对齐口径**（否则按错误并发语义实现），其余为实现期验收钉。
建议进入 build。

**边界**：本 agree 只准入 D13-1 build。不代表 done；时间旅行/effect 回放仍属 D14-2 之后。

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件:
  - `packages/reforge/src/debug-tools.ts`（新增:DEV overlay 五区 + 命令注册表 + 脚本/触发器
    枚举触发 + 战斗构建器 + 图层/帧步进面板;K1 输入隔离、K3 占用徽标/状态上屏/确认、K4 动态引入）
  - `packages/reforge/src/main.ts`（debugLayers 替换 DEBUG_COLLISION + 触发区叠加层;
    tick 帧步进集成;startBattle 拆 startBattleBody + partyPreset/enemyOverride 包裹;
    v5 host 转发;boot 尾 `?debug` 动态安装）
  - `packages/reforge/src/dev-preset.ts` + `dev-preset.test.ts`（K2 快照回滚 helper + 深等单测）
  - `packages/reforge/src/gameplay-clock.ts` + test（K5 step(tickMs) 单步 + 单测）
  - `packages/content/src/script-v5.ts`（startBattle 可选 dev-only enemyOverride/partyPreset）
  - `packages/reforge/src/script-runner.ts`（ScriptHost.startBattle opts 补两字段）
  - `docs/phase2/dev-tools.md`（新增:命令速查 + G4 覆盖矩阵 + 构建产物验证说明）
- 实现摘要: 三方签后完成。K1 表单字段吞键/Esc 只关面板;K2 withWorldPreset 战前深克隆战后恢复;
  K3 触发全走 detached(占用徽标+状态上屏+场景切换占用确认+Abort 可取消);K4 动态 import;
  K5 GameplayClock.step(一拍=100ms,作用域大世界 gameplay);G1 构建产物零 debug 符号;
  G2 口径按 Kimi 裁定(detached);G3 语义按 K5;G4 覆盖矩阵入 dev-tools.md。
- 运行命令:
  - `pnpm --filter @type-pal/content check`（391 通过）
  - `pnpm --filter @type-pal/reforge check`（800 通过:含 dev-preset 3 + gameplay-clock step 1）
  - `pnpm --filter @type-pal/editor typecheck` 通过
  - `pnpm --filter @type-pal/reforge build` + `rg 'tp-debug|installDebugTools' dist/assets/*.js`
    零命中（G1/K4 构建产物验证通过,不产出 debug chunk）
- 浏览器 / 手工检查: pending（Kimi 视觉验收:战斗构建器 + 触发区可视化;Codex 本地 dev 冒烟未跑,
  如实标注——见「跳过的检查」）
- 跳过的检查及原因:
  - 时间旅行回放（依赖 D14-2,明确跳过）。
  - 浏览器手工冒烟（?debug 面板逐区操作）未在提交前执行——本卡手工/视觉验收按协议由
    Kimi 承担,Codex 自证到「类型 + 单测 + 构建产物」层。

## 视觉验证记录(如适用)

- Visual Verification Owner: Kimi
- 验证方式: pending
- 截图 / 像素检查路径: pending
- 结论: pending

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: pending
- 必须返工项: pending
- Accept / rework: pending

## 用户验收

- 用户结论: pending
- 后续任务: pending

## 交接日志

- 2026-08-06 Codex: 开卡。现状：?scene/?battle/?skill/?give/?party/?collision 已有；
  缺 console/检视/任意触发/战斗态构建/触发区可视化/帧步进；时间旅行依赖 D14-2。
- 2026-08-06 Codex: 设计冻结并签 agree。DEV overlay 五区 + 命令注册表 + 脚本/触发器
  枚举触发 + startBattle 参数扩展（enemyOverride/partyPreset）+ 触发区可视化 + 帧步进；
  时间旅行留 D14-2 之后；Kimi/GLM 待压测签字。
- 2026-08-06 Codex: 三方 agree 齐(build allowed),实现完成并自证——content 391 /
  reforge 800 / editor typecheck 全绿;生产构建零 debug 符号(G1);K1-K5/G1-G4 逐项落地
  (见 Build 节)。待 Kimi 浏览器视觉验收(战斗构建器 + 触发区可视化)后进 review。

## 下一位 Agent 提示词

```text
接手任务: D13-1 调试工具首刀实现（三方设计 agree 齐，build allowed）
任务卡: docs/ops/tasks/D13-1-debug-tools-first-batch.md
当前状态: draft → build 准入 allowed（Codex/GLM/Kimi 三方 agree，2026-08-06）。
你的角色: Coding Owner——build 阶段唯一实现文件修改者。
先读: AGENTS.md、docs/phase2/READ-FIRST.md、本卡全文（设计结论、GLM G1-G4、Kimi K1-K5、
  三方争议记录的 G2 裁定）；main.ts:319/1099-1125/2152-2158/3331-3369/3420/4486/
  4556-4586/5089-5158、gameplay-clock.ts、editor/play.ts。
必落钉（验收逐项核）:
  - GLM G1+Kimi K4:DEV guard 硬化——debug 模块一律 `import.meta.env.DEV && params.get('debug')
    ?debug` 动态 import;vite build 后 grep 主 bundle 无 debug 符号并记录残余 chunk 策略。
  - GLM G2+Kimi K3:任意脚本/触发器触发走 detached(runDetachedV5ScriptChain 先例),禁用
    startScript 静默丢;overlay 显示主 runner 占用徽标、触发状态(running/done/error/cancel)
    上屏、场景切换类占用时先确认、AbortSignal 可取消。
  - GLM G3+Kimi K5:帧步进 = 一个 gameplay tick 固定步长,作用域仅大世界 gameplay 相位;
    GameplayClock frozen + 新增 step(),单测(冻结不积压 + 精确一拍)。复杂度超标按卡拆独立子项。
  - GLM G4:命令集覆盖矩阵(每条命令→复用 host 能力/dev 参数→DEV-only 证明→e2e/手动路径),
    money 为新增内存态 mutate;state/var 检视器只读。
  - Kimi K1:console 输入框 stopPropagation,焦点期屏蔽游戏快捷键,Esc 只关 overlay;
    720px 不横向溢出。
  - Kimi K2:partyPreset 开战前 snapshot world.party+inventory,战后/取消/重开恢复,
    测试证 world 深等于战前;enemyOverride 仅 battle session 局部。
纪律:全部内存态不落档;生产路径零调试分支;时间旅行/effect 回放不做(留 D14-2);
  dev-tools.md 速查 + backlog 议题 13 状态更新随实现落。
验收输出: 实现摘要 + 钉逐项对照 + 测试/构建产物验证证据;Kimi 浏览器视觉验收(战斗构建器
  与触发区可视化)在实现后另排。
```

```text
接手任务: D13-1 调试工具首刀（Kimi 工具架构/并发语义主审）——已执行完毕,勿再执行
任务卡: docs/ops/tasks/D13-1-debug-tools-first-batch.md
说明: 本提示词为历史记录,Kimi 已于 2026-08-06 签 agree(K1-K5),三方 agree 齐,
  build 准入 allowed。请改用上方实现提示词。
```
