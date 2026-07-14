# X3-1 - 场景入场呈现事务

Status: draft
Phase: phase2
Capability: X3 / N3
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Opus + GLM
Visual Verification Owner: Codex + Opus
Unavailable Agents: none
Branch: main

## 目标

把跨场景“旧帧保持、目标场景准备、过渡呈现”建模为显式场景入场事务。`s000` 只负责加载 `s001`；
`s001` 明确声明 `Prepare → Reveal → Body`，不再由 Reforge 扫描目标脚本前几条指令来猜是否需要冻结旧帧。
编辑器应直接展示入场准备、呈现方式和呈现后演出，让作者能从数据本身理解开场行为。

## 范围

- 范围内:
  - 为 scene onEnter 的活动 stage 增加显式入场呈现元数据；仅场景入场可使用，其他脚本上下文拒绝。
  - 引入 `SceneEntrySession`：独立保存 current presented frame、逻辑目标场景、prepare 状态、reveal 状态和
    生命周期收尾。
  - 特殊入场先切换逻辑世界并执行 prepare，再渲染目标帧并 reveal，最后执行 body。
  - 将 s001 开场表达为 `prepare=[playMusic 31, teleportParty]`、`reveal=dither 2160ms`、
    `body=[李大娘对白…]`。
  - 普通 `loadScene` 不带特殊 entry 时继续走现有默认淡出/切换/淡入，不改变门、楼梯和传送观感。
  - 独立脚本站点的 `ditherScreen` 仍是通用命令，并在当前 presented frame 上工作；不强塞进 entry schema。
  - 迁移器识别 onEnter 活动 stage 的早期 0x73 语义并产显式 entry；运行时不做命令前缀扫描。
  - 编辑器把 onEnter stage 分成“入场准备 / 呈现 / 呈现后脚本”三个区域。
- 范围外:
  - 修改 dither 的 target-only 假色 profile、72 步算法或 2160ms 时长。
  - 修改普通场景内容、角色落点或对话顺序。
  - 重新设计所有 fade、RNG、视频和菜单叠层。
- 明确不做:
  - 不把 `ditherScreen` 从 s001 硬搬到 s000 的来源脚本。
  - 不保留 `bindingHasEarlyDither` 与新 entry 元数据两套决策源。
  - 不用“前 N 条命令”“prepareCount”这类下标魔法描述边界。

## 上下文锚点

- 已拍板决策 / 铁律:
  - 用户于 2026-07-14 认可：场景入场事务比来源场景预知或运行时偷看命令更合理。
  - `docs/phase2/READ-FIRST.md`: 第二阶段优先建立可组合、可编辑的现代架构，不照抄旧承载格式。
  - X3 用户视觉真值不变：source 是 s000 最后一张已呈现帧；target 是 s001 已完成落位后的世界帧；
    李大娘对白在 dither 完成后出现。
- 代码锚点(`file:line`):
  - `packages/game/src/core/event-system.ts:2886-2913`: 一阶段 loadScene 只切逻辑状态并设 `sceneLoading`，
    呈现层继续保留旧帧。
  - `packages/game/src/core/event-system.ts:2580-2612`: s001 的 0x73 清 `sceneLoading`，以旧 presented frame
    为 source、当前逻辑世界为 target。
  - `packages/reforge/src/main.ts:593-615`: 当前 `bindingHasEarlyDither` 穿透分片并读取目标命令。
  - `packages/reforge/src/main.ts:931-976`: loadScene 根据前瞻结果决定 snapshot/handoff 或普通 fade。
  - `packages/reforge/src/dither-transition.ts:193-260`: `DETERMINISTIC_PREFIX_KINDS` 与
    `hasEarlyDitherScreen` 是当前隐藏耦合。
  - `projects/pal/content/scripts/chunks/scene/s001.json`: 当前 stage 为 playMusic、teleportParty、
    ditherScreen、dialog 的扁平顺序。
- 已知坑 / 审计文档:
  - `docs/ops/tasks/X3-opening-dither-speaker-inheritance.md`: 旧任务为修复 async switchScene 取错 source，
    采用窄前瞻；行为已经过视觉验收，但数据表达和运行时职责仍不直观。
  - 当前前瞻只接受固定同步 allowlist；在 dither 前加入分支、await 或新命令会静默退回普通 fade。
  - scene stage 有推进状态；entry 元数据必须随当前活动 stage 解析，不能固定在 SceneDef 顶层覆盖所有重进。
- 不得重新引入:
  - 全局 loadScene 无条件冻屏、150 帧超时、普通出口黑屏、跨场景 orphan Promise、source/target 取反。
  - paletteId/index/nibble 回到 schema 或 runtime。
- 相关测试:
  - `packages/reforge/src/dither-transition.test.ts`
  - `packages/reforge/src/script-runner.test.ts`
  - `packages/reforge/src/scene-transition.test.ts`
  - `packages/migrate/src/translate-events.test.ts`
  - `packages/editor/src/core/playback.test.ts`

## 验收条件

- 功能:
  - Codex 提案的 stage 形态:

    ```ts
    type SceneReveal =
      | { kind: 'dither'; ms: number; source: 'previousPresentedFrame' }
      | { kind: 'fade'; outMs: number; inMs: number }
      | { kind: 'cut' }

    interface SceneEntryPresentation {
      prepare: Command[]
      reveal: SceneReveal
    }

    interface ScriptStage {
      entry?: SceneEntryPresentation
      body: Command[]
      // 既有阶段推进字段保持
    }
    ```

  - `entry` 只允许出现在 scene onEnter stage；prepare 只能使用可在未呈现目标世界时安全执行的命令，
    validator 按能力集合 fail-loud，不能靠运行时遇到未知命令再猜。
  - 进入带 entry 的目标 stage 时，loadScene 只读取显式 metadata，不扫描 body；捕获 source 后切逻辑场景、
    执行 prepare、构造 target、执行 reveal、再启动 body。
  - 无 entry 的普通目标保持现有默认 fade；boot、读档、同场景重载和没有 previous frame 的入口有明确
    策略并纳入测试，不能悬挂 session。
  - 独立 `ditherScreen` 行为不变。
  - 编辑器三段区域可折叠、可编辑，并明确显示默认普通 fade 与显式 reveal 的区别。
- 测试:
  - 删除 `DETERMINISTIC_PREFIX_KINDS`、`hasEarlyDitherScreen`、`bindingHasEarlyDither` 后全仓零引用。
  - content validator 覆盖 entry 合法上下文、prepare 禁止命令、reveal 参数与旧工程升级。
  - runtime 覆盖 dither entry、普通 fade、cut、无 previous frame、prepare/reveal/body 顺序、切场/读档/abort/
    异常/二次 loadScene 全收口。
  - migrate 覆盖 s001 精确 lifting；独立 0x73 不误升为 entry；MG2 二跑零计划。
  - `pnpm check` 与相关 build 全绿。
- 文档:
  - 更新 content-schema、script model、编辑器说明和 X3 任务历史备注，明确旧窄前瞻已退役。
- 视觉 / 手工验证:
  - 6051 开场 0% 帧逐像素等于 s000 最终 presented frame；target 是 s001 位移后位置；2160ms 后才出现对白。
  - 普通 s001→s003 仍完整走 fade-out→switch→fade-in，无冻屏、黑屏或残帧。
  - 编辑器中无需阅读跨场景源码即可看懂开场为“准备两步 → 逐像素呈现 → 对白”。

## 推进签字

### 进入 build 前:设计签字

- Codex: **agree（2026-07-14）**。用户指出的是正确的抽象泄漏；建议显式 stage entry metadata +
  SceneEntrySession，保留已验视觉算法，仅替换 source handoff 的决策架构。
- Opus: **agree（2026-07-14,附 X-R1~X-R4 必改 + S1,见主审立场）**。独立复核裁定 Prepare→Reveal→Body 应当
  取代运行时命令前瞻:当前实现是三重暗耦合——47 项 `DETERMINISTIC_PREFIX_KINDS` 运行时白名单
  (dither-transition.ts:199-247)、callScript 穿透 chunk store 预读(main.ts:602-610)、
  `preserveClosedDialogFrame` 隐藏态(main.ts:932-936);白名单外任何新命令出现在 dither 前即**静默降级**普通
  fade,行为改变无报错——与 R2 刚退役的第二解释器同类抽象泄漏(运行时预执行/预解释数据)。一阶段真值本就是
  "目标侧声明":0x73 位于 s001 自己的脚本内,loadScene 只设 sceneLoading 冻结、0x73 清冻结并以旧呈现帧为
  source(event-system.ts:2580-2605)——entry 元数据是这一已验语义的显式数据化,72 步/2160ms/target-only 假色
  算法零改动(范围外已钉死)。s001 产物实测(playMusic→teleportParty→ditherScreen 2160→dialog…)提升为
  prepare=[playMusic,teleportParty]/reveal=dither 2160/body=[dialog…] 是纯结构移动,语义等价。entry 挂
  ScriptStage 级(非 SceneDef 级)+ 复用 stageIndexFor 单一解析,正确处理首访/重访分叉。**发现卡未覆盖点:
  s001 除 root/on-enter 外还有 L-2876/L-2920 两个 0x6D 安装的 override on-enter 绑定(实测),lifting 扫描
  必须覆盖 override 家族(X-R2)**。
- GLM: **agree（2026-07-15;附 X-N1 站点面勘误 + X-N2 反例集 + X-N3 非阻塞,见下）**。两项复核逐条：

  **(1) X-R2 lifting 站点面——全 PAL onEnter 早期 0x73 计数（独立实测）** ✅ + **勘误**：

  实测全 PAL 脚本产物，ditherScreen 分布分三类（互斥，共 41 场景）：
  - **早期 dither in onEnter（lift 集）= 11 场景**：s001/s018/s057/s090/s151/s180/s182/s196/s197/s198/s200。其中 **10 个在 root/on-enter/stage-0**，**1 个在 override**（s182/L-27448）。s001 root dither idx=2，prefix=`[playMusic,teleportParty]`。
  - **⚠️ X-N1（卡内勘误，build 必落）**：**Opus 称"s001 有 L-2876/L-2920 两个 override on-enter 含 ditherScreen"——实测两 override 均不含 ditherScreen**。L-2876 prefix=`[teleportParty,setPartyFacing,clearDialog,dialog]`；L-2920 prefix=`[setActorSprite,teleportParty,setPartyFacing,setAmbience,wait]`。**s001 只有 root/on-enter/stage-0 一个绑定含早期 dither**。Opus 的 X-R2"override 家族必须覆盖"方向正确（s182 确实是 override），但 s001 具体站点描述有误——build 时以实测 11 站点清单为准。
  - **独立 0x73 非 onEnter（反例集）= 17 场景**：s011/s020/s058/s059/s064/s138/s144/s146/s147/s148/s154/s163/s201/s250/s252/s278/s281——全部在 entity trigger 或 shared 编舞脚本中，**不得误升 entry**。✅
  - **onEnter 但非早期（第三类）= 13 场景**：s140/s142/s164/s169/s170/s171/s173/s183/s188/s203/s227/s233/s251——dither 前有非确定性命令（多为 `setActorSprite`，s188 dither 在 idx=91）。这些当前 allowlist 正确拒绝，entry 迁移也不应提升。**卡内未提及第三类，build 时审计报告需纳入。**

  **(2) 测试矩阵** ✅（方向完整，build 必落逐行测试）：
  - **X-R3 生命周期路径表**：prepare 中 abort / prepare 内命令抛错 / reveal 中二次 loadScene / 读档 quitToTitle 打断 / 目标资产加载失败——每行可落独立测试。沿 R2 RngPresentationState 先例（路径→收尾人→终态表）。✅
  - **X-R1 prepare 安全集穷尽性断言**：每个 Command kind 必须声明 presentation-safety（随命令目录同址维护），新增 kind 未分类=类型错误或穷尽性测试失败。测试形态 = 遍历 `Command` 联合所有 kind，断言每个 kind 在安全集或禁止集中有声明（`expect(kind).oneOf([safe, blocked])`）。✅ 防止"47 项白名单搬到另一个暗角"。
  - **X-R4 fade reveal 时序**：capture source → out → switch 逻辑 → prepare → in。当前 PAL 无站点用 entry.fade，语义定义给新内容。✅
  - **migrate lifting 测试**：s001 精确 lifting（root 确实有，两 override 确实无——**修正 Opus 的 override 描述**）；11 站点全集 lifting；17 反例不误升；13 非早期不误升。✅

  **总结**：entry 元数据取代命令前瞻方向正确；**lift 集 = 11 场景（非"s001 为主"），其中 1 个 override（s182 非 s001）**；反例集 17 + 第三类 13 均有清单；X-R1/R3/R4 测试矩阵可落。**agree**。

  **X-N1-X-N3 非阻塞（build 必落）**：
  - **X-N1**：修正 Opus X-R2 中 s001 override 描述——L-2876/L-2920 不含 ditherScreen，s001 只有 root。以实测 11 站点为准。
  - **X-N2**：17 反例 + 13 非早期清单纳入迁移审计报告 + 测试（当前卡未覆盖第三类）。
  - **X-N3**：`bindingHasEarlyDither` 当前只查 effective binding（override 若存在则不查 root，main.ts:584-591）——entry 迁移是 build-time 一次性扫描，不受运行时 effective 选择影响，但测试需明确"root 和 override 独立扫描"。

- counter / 分歧处理: Opus 无架构 counter;X-R1~X-R4 为设计必补,GLM 无 counter(标 X-N1 站点勘误 + X-N2 反例/第三类清单 + X-N3 扫描独立性)。
- 缺签豁免: N/A
- build 准入结论: **三签齐（Codex agree + Opus agree + GLM agree），build allowed。** X-R1~X-R4 必改 + X-N1(s001 override 勘误)/X-N2(17反例+13非早期清单)/X-N3(root/override 独立扫描)纳入 build 范围。**实现顺序：固定排在 N1-1 收口之后。**

### 进入 done 前:审查签字

- Codex: pending
- Opus: pending
- GLM: pending
- counter / 返工处理:
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论

1. **来源场景不知情**：s000 的 loadScene 不承载 s001 的 reveal；目标活动 stage 用 entry metadata 声明自己的
   入场契约。
2. **状态与呈现分离**：`SceneEntrySession` 持有 previous presented frame；`switchScene` 可先提交逻辑世界，
   compositor 在 reveal 前仍显示 source。
3. **prepare 是明确数据结构**：只有 entry.prepare 中的命令在隐藏目标画面时执行，不再通过同步 allowlist
   猜扁平 body 的前缀。
4. **reveal 是唯一提交边界**：dither/fade/cut 负责把 target 交给 presented frame；完成后 body 才可出现对白。
5. **迁移期 lifting**：旧数据中位于 onEnter 首个可见/阻塞边界前的 0x73，由迁移器一次性提升为 entry；
   新工程直接通过编辑器创作 entry。

### 已知风险

- 风险: prepare 中部分命令可能依赖可见画面、计时或用户输入。
  - 缓解: content 层维护允许集合并 fail-loud；集合基于语义能力而非 runtime 扫描，新命令必须显式归类。
- 风险: 活动 stage 受存档推进状态影响，预读错误 stage 会重播开场或冻结普通重进。
  - 缓解: 继续复用 `stageIndexFor` 单一解析结果；entry metadata 与 stage 同存，不做 SceneDef 全局覆盖。
- 风险: scene asset 异步加载期间 rAF 可能提前画 target。
  - 缓解: compositor 只读取 session 的 presented source；target 使用独立 offscreen snapshot，reveal 原子接管。
- 风险: schema 与 N1-1 同时改动会放大冲突。
  - 缓解: 设计可并行审，build 严格排在 N1-1 收口之后。

### 主审立场

- Reviewer: Opus（架构/生命周期）+ GLM（迁移站点/测试矩阵）
- 结论(Opus,2026-07-14): **agree — 显式 entry 元数据取代 bindingHasEarlyDither 命令前瞻,裁定成立**。
  三点依据:(1) 前瞻是运行时对数据的预解释,47 项白名单 + callScript 穿透预读 + 静默降级构成与 R2 已退役
  第二解释器同类的抽象泄漏;(2) 一阶段真值本就是目标侧揭示(0x73 在 s001 脚本内、以冻结旧帧为 source),
  entry 是同一语义的显式化,视觉算法与用户已验收观感零改动;(3) 数据自明,编辑器三区可直接呈现,符合铁律。
  普通 loadScene 默认 fade、独立 ditherScreen 通用命令两条边界划分完整,`不得重新引入` 清单(全局冻屏/150 帧
  超时/orphan Promise/source-target 取反)与一阶段既往坑一一对应。
- 必改项(X-R,设计层面补明,build 必落):
  - **X-R1 prepare 安全集必须是命令目录上的穷尽判别,不许第二张散表**:content 层为每个 Command kind 声明
    presentation-safety(随命令目录同址维护),validator 消费该唯一来源;新增 kind 未分类 = 类型错误或穷尽性
    测试失败。否则只是把 47 项白名单从 runtime 搬进另一个暗角——一阶段"双白名单漏登记"(mode.ts autoScript +
    event-system autoFadeIn)之坑有案可查,必须单源。
  - **X-R2 迁移 lifting 覆盖 override on-enter 家族**:实测 s001 有 root/on-enter 与 L-2876、L-2920 两个
    0x6D 安装的 override on-enter 绑定;lifting 扫描范围 = 所有 onEnter 绑定(root + override)× 每 stage 独立,
    各自无早期 0x73 则无 entry(默认 fade)。卡现文只写"onEnter 活动 stage",未点名 override 家族;GLM 复核时
    给出全 PAL 站点计数。
  - **X-R3 SceneEntrySession 生命周期收尾人逐路径点名**(沿 R2 RngPresentationState 先例):设计须列
    "路径 → 收尾人 → 终态"表,至少覆盖:prepare 中 abort、prepare 内命令抛错、reveal 中二次 loadScene、
    读档/quitToTitle 打断、目标资产加载失败。每行 build 期一一对应测试;不得靠"全收口"一句话带过。
  - **X-R4 fade reveal 的时序定义写死**:entry.reveal='fade' 与默认 fade 的关系一句话钉死——建议语义:
    capture source → out(作用于 source 帧)→ switch 逻辑世界 → prepare(黑屏/隐藏期执行)→ in(作用于 target)。
    与现行默认路径(hostFade out 260 → switch → in 260)等价,仅显式化 + 可自定时长;当前 PAL 无站点使用
    entry.fade,该形态是给新内容的表达力,语义含糊会在 build 期打架。
- 建议项(S,不阻塞):
  - S1 `source: 'previousPresentedFrame'` 单值字面量判别保留(自文档化 + 为将来 source 变体留位),
    不视为过度设计。
- 是否建议进入 build: **待 GLM 复核(lifting 站点面 + 测试矩阵);X-R1~X-R4 纳入 build 范围后 build,
  且固定排在 N1-1 收口之后**。

### 三方争议记录(按需)

- Codex: 推荐显式 stage entry；不推荐把 reveal 塞进来源 loadScene，也不推荐保留命令前瞻。
- Opus: **agree**。目标侧 stage 级 entry 正确——入场呈现是目的地首访演出的属性,不是每扇门的属性;
  来源侧方案需预知目标 stage 推进态,天然错位,否决正确。命令前瞻退役与 R2 第二解释器退役同一法理。
  附 X-R1~X-R4(prepare 安全集单源穷尽/override lifting/生命周期收尾人表/fade 时序定义)。
- GLM: **agree**。独立实测 lift 集 = **11 场景**(s001/s018/s057/s090/s151/s180/s182/s196/s197/s198/s200),非"s001 为主";**勘误 Opus X-R2: s001 L-2876/L-2920 两 override 均不含 ditherScreen**(s001 只有 root/on-enter/stage-0 含早期 dither);唯一 override lift 站点是 s182/L-27448。反例集 17 场景(trigger/shared 编舞)+第三类 13 场景(onEnter 非早期,setActorSprite 等非确定性前缀)。X-R1 安全集穷尽/X-R3 生命周期逐行/X-R4 fade 时序测试矩阵可落。X-N1(override 勘误)/X-N2(反例+第三类清单)/X-N3(root/override 独立扫描)非阻塞。
- 用户拍板: 认可场景入场事务方向。

## 额度 / 代班记录(如适用)

- 缺席 Agent: none

## Build: 实现与自测

- Coding Owner: Codex（N1-1 收口且本卡三签齐后）
- 修改文件: pending
- 实现摘要: pending
- 运行命令: pending
- 浏览器 / 手工检查: pending
- 跳过的检查及原因: pending

## 视觉验证记录(如适用)

- Visual Verification Owner: Codex + Opus
- 验证方式: pending
- 截图 / 像素检查路径: pending
- 结论: pending
- 未完成项: pending

## Review: 审查与返工

- Reviewer: Opus + GLM
- 审查结论: pending
- 必须返工项: pending
- Accept / rework: pending

## 用户验收

- 用户结论: 设计方向认可；实现待三贤人签字与 build。
- 后续任务: pending

## 交接日志

- 2026-07-14 Codex: 对照一阶段 `sceneLoading` 与 Reforge `bindingHasEarlyDither`，确认当前效果由运行时
  窄前瞻实现，来源场景并不知情；用户认可改为显式入场事务。建立 Prepare→Reveal→Body 提案并签 agree。
  Evidence: 本卡代码锚点。Next: 与 N1-1 一并交 Opus 设计主审；不得实现。
- 2026-07-14 Opus: 设计主审签 **agree + X-R1~X-R4 必改 + S1**。裁定:显式 entry 取代命令前瞻成立——
  当前三重暗耦合(47 项白名单/callScript 穿透预读/preserveClosedDialogFrame)与 R2 已退役第二解释器同类;
  一阶段真值本就是目标侧揭示,entry 是其显式数据化,视觉算法零改动;s001 产物提升为 prepare/reveal/body
  纯结构移动。新发现:s001 有 L-2876/L-2920 两个 override on-enter 绑定,lifting 必须覆盖 override 家族
  (X-R2)。X-R1=prepare 安全集随命令目录单源穷尽判别;X-R3=SceneEntrySession 收尾人逐路径表;
  X-R4=fade reveal 时序钉死。Evidence: 主审立场 + 代码/产物核验。Next: GLM 复核(与 N1-1 一并,提示词见
  N1-1 卡末);三签齐后 build,固定排在 N1-1 收口后。未改实现文件。
- 2026-07-15 GLM: 设计复核签 **agree**。两项独立实测：(1)X-R2 lifting 站点面——实测 lift 集=**11 场景**(10 root + 1 override s182/L-27448),非"s001 为主";**勘误 Opus: s001 L-2876/L-2920 两 override 均不含 ditherScreen**(prefix 无 dither),s001 只有 root;反例集 17 场景(trigger/shared)+第三类 13 场景(onEnter 非早期,多 setActorSprite 前缀,s188 dither idx=91)。三集互斥共 41=总 ditherScreen 场景。(2)测试矩阵——X-R3 生命周期 5 路径逐行可测(沿 R2 RngPresentation 先例)/X-R1 安全集穷尽性(遍历 Command kind 断言 oneOf safe/blocked)/X-R4 fade 时序。X-N1(override 勘误)/X-N2(17反例+13非早期入审计)/X-N3(root/override 独立扫描)非阻塞。Evidence: 设计签字 GLM 行。Next: 三签齐已 build allowed,固定排在 N1-1 收口后;交 Codex build。未改实现文件。

## 下一位 Agent 提示词

本卡与 N1-1 一并交 GLM 覆盖/测试矩阵复核（Opus 已双卡签 agree），直接使用
`docs/ops/tasks/N1-1-dialogue-control-code-retirement.md` 末尾的“下一位 Agent 提示词”。实现顺序固定为
N1-1 优先，本卡后置。
