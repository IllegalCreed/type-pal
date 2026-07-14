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
- Opus: pending
- GLM: pending
- counter / 分歧处理:
- 缺签豁免: N/A
- build 准入结论: blocked

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
- 结论: pending
- 必改项: pending
- 是否建议进入 build: pending

### 三方争议记录(按需)

- Codex: 推荐显式 stage entry；不推荐把 reveal 塞进来源 loadScene，也不推荐保留命令前瞻。
- Opus: pending
- GLM: pending
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

## 下一位 Agent 提示词

本卡与 N1-1 一并交 Opus 设计主审，直接使用
`docs/ops/tasks/N1-1-dialogue-control-code-retirement.md` 末尾的“下一位 Agent 提示词”。实现顺序固定为
N1-1 优先，本卡后置。
