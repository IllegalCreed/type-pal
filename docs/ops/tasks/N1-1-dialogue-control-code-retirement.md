# N1-1 - 对话控制码退出内容与运行时

Status: draft
Phase: phase2
Capability: N1 / MG1 / MG2
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Opus + GLM
Visual Verification Owner: Codex + Opus
Unavailable Agents: none
Branch: main

## 目标

把原版 `$NN`、`~NN`、`"`、`-`、`'`、`@`、`(`/`)`、`\` 等对话控制码只留在迁移器的
旧数据输入端。生成工程、locale、content schema、Reforge 运行时和编辑器统一使用结构化对话数据；
编辑器直接显示正文、速度、自动推进、光标、说话人、位置和立绘，不再让作者阅读或输入魔法字符。

## 范围

- 范围内:
  - 在 `@type-pal/migrate` 建完整、有状态的原版对话解码器，忠实承接一阶段控制码语义。
  - 将一个原版连续对话批次迁为单一 `DialogueCue`，批次内保留独立 `rows`，不再把多行粗暴拼成
    一个只有单一速度的字符串。
  - `$NN` 迁为每行真实 `speed`（ms/字）；`~NN` 迁为 cue 级 `autoAdvance`（ms）；`(`/`)` 迁为
    `cursorFrame`；姓名、slot、portrait 保持结构化。
  - 颜色控制码迁为 locale 中成对闭合的语义标签；每个 locale 值自身合法，跨源行颜色状态由迁移器
    展开，运行时不保存旧控制状态。
  - 迁移状态跨连续行、goto/callScript 分片入口和共享脚本上下文传播；同一原文在不同进入状态下需要时
    生成确定性的上下文变体 text id。
  - 删除 `packages/content/src/dialog-text.ts` 和 Reforge 的 `parseDialogControlCodes` 兜底路径。
  - 编辑器为结构化 cue/rows 提供完整控件和清晰摘要；旧工程在加载边界一次性升级，内存和保存产物只保留
    新格式。
  - 重生成 PAL 与 baseline，并保持 MG2 二跑零计划。
- 范围外:
  - 对话框美术、字体、分辨率和布局重做。
  - 对话分支 DSL、Ink/Yarn 或配音时间轴。
  - 修改原版台词、翻译文案或说话人归属。
- 明确不做:
  - 不在 editor/reforge 保留两套可执行格式。
  - 不把 `$10` 换成另一种无语义字符串标记。
  - 不只清理截图中的三句开场对白；必须修迁移器并全量重生成。

## 上下文锚点

- 已拍板决策 / 铁律:
  - `docs/phase2/dialogue/model-design.md:8-12,69-108`: 功能/结构控制码必须在数据生产期消失，运行时只消费
    结构化字段和 locale 富文本。
  - `docs/phase2/decisions.md:63-67`: 对话采用稳定 text id、真实毫秒属性和语义颜色标签。
  - `AGENTS.md`: 根因属于迁移器，必须先修上游再重生成，不得手改 `projects/pal`。
  - 用户于 2026-07-14 再次确认：对话中的魔法字符必须去掉，用现代、明确的属性替代。
- 代码锚点(`file:line`):
  - `packages/content/src/index.ts:43-58`: 现有 `DialogueLine` 已有 speed/autoAdvance/cursorFrame，但不足以表达
    一个迁移批次内多行不同速度。
  - `packages/content/src/dialog-text.ts:1-57`: 当前把旧控制码错误地放在 content/运行时解析。
  - `packages/reforge/src/dialog/dialog-box.ts:100-132`: 排版和时序仍调用旧控制码解析器。
  - `packages/migrate/src/translate-events.ts:556-601`: 当前 flush 直接把原文 `join('\n')` 写进 locale，未结构化。
  - `packages/editor/src/ui/CommandForm.tsx:190-226`: 编辑器只显示原始文本，其余字段退回 JSON。
  - `packages/editor/src/ui/ScriptTree.tsx:80-89`: 树摘要直接 lookup locale，因此把 `$10/~30` 展示给作者。
- 已知坑 / 审计文档:
  - `packages/game/src/present/dialog-box.ts:56-170`: 一阶段完整真值；颜色和速度状态可跨源行持续，`~NN`
    立即结束当前行并忽略其后字符。
  - `docs/phase2/foundation/n-dialog-text-audit.md:290-334`: 二阶段结构化目标与已知跨段速度缺口。
  - 当前 PAL 实测：`6,722` 条 dialog command 中 `speed/autoAdvance/cursorFrame` 均为 0 条；`1,234`
    条命令引用的 locale 仍含旧控制字符。
  - 当前生成 locale 有 `4,521` 个 `dlg.*`：`$NN` 113 处、`~NN` 107 处、ASCII quote 240 处、
    `(`/`)` 27 处。原始 `all.json` 13,513 条 showDialog 还含 18 个 `-` 颜色控制位。
  - 12 个原始连续批次在批内改变速度；现有“多行 join 后只取一个 speed”的模型无法忠实表达。
  - `dlg.9831/9832` 的黄色状态跨 text id 开/关，证明解析必须携带进入/离开状态并输出平衡标签。
- 不得重新引入:
  - runtime legacy parser、未闭合颜色标签、行内魔法字符、两个 canonical schema、按字符串替换猜语义。
- 相关测试:
  - `packages/game/src/present/dialog-box.test.ts`
  - `packages/content/src/dialog-text.test.ts`（迁移后由 migrate 真值测试替代）
  - `packages/migrate/src/translate-events.test.ts`
  - `packages/migrate/src/migrate-content.test.ts`
  - `packages/editor/src/ui/CommandForm.test.tsx`（若现有测试落点不同，由 build 按本地模式选择）

## 验收条件

- 功能:
  - canonical 形态采用单一结构，Codex 提案为:

    ```ts
    interface DialogueRow {
      text: TextId
      speed?: number
    }

    interface DialogueCue {
      speaker?: TextId
      rows: DialogueRow[]
      autoAdvance?: number
      slot?: 'top' | 'bottom' | 'narration' | 'center'
      portrait?: { icon: number; side: 'left' | 'right' }
      cursorFrame?: 0 | 1 | 2
    }

    type DialogCommand = { kind: 'dialog'; cue: DialogueCue }
    ```

  - 开场三段数据必须成为可读属性：第一段 `speed=112`、`autoAdvance=342`；第二段
    `speed=16`、`autoAdvance=457`；第三段继承 `speed=16`、`autoAdvance=685`，正文无 `$`/`~`。
  - 颜色 toggle、跨行颜色、转义、光标和尾部 `$` 状态传播与一阶段逐字符真值一致。
  - 编辑器脚本树只显示清洁正文；表单可编辑行、速度、自动推进、光标、slot、speaker、portrait。
  - 旧工程只允许在 loader/upgrader 边界转换一次；保存后只产生新格式。
- 测试:
  - 对原始控制码全集做表驱动测试，包含跨行颜色、跨行速度、`~` 后缀忽略、speaker/style/goto 分界。
  - 迁移器断言所有可达 showDialog 均被消费；遇到一个可见行中无法由 row speed 表达的真实中途变速时
    fail-loud，不得静默近似。
  - 结构化解析后的 PAL locale 不含旧功能控制码，所有富文本标签平衡且可由 `parseRichText` 完整消费。
  - content/reforge/editor 全仓无 `parseDialogControlCodes` 和旧运行时解析入口。
  - MG2 写盘后二跑 `writes=0 deletes=0 conflicts=0`；M3 脚本体积门禁不放宽。
  - `pnpm check` 与相关 build 全绿。
- 文档:
  - 回填 model-design、content-schema、capability-map；N1 在本任务完成前不得继续写“结构化 done”。
- 视觉 / 手工验证:
  - 6051 从新游戏跑开场三段，速度/自动推进/姓名/位置与一阶段一致，画面不显示控制码。
  - 编辑器打开 s000 与至少一组跨行黄色对话，属性可读、文本清洁、保存重开不回生控制码。

## 推进签字

### 进入 build 前:设计签字

- Codex: **agree（2026-07-14）**。现状与原设计直接冲突；建议 cue + rows 单一模型，旧码解析只归 migrate，
  loader 仅做一次性边界升级。
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

1. **单一 cue 模型**：一个 `dialog` command 表示一次连续显示单元；cue 持有共享的 speaker/slot/portrait
   与结尾行为，rows 持有各行 textId 和 speed。这样既不要求每个原始 showDialog 单独等待按键，也不把
   多行速度压成一个值。
2. **legacy decoder 只在 migrate**：输入为原始文本和进入状态，输出清洁 rows、结构化属性、平衡富文本和
   离开状态。状态加入脚本 registry 的上下文 key，防止共享脚本从不同状态进入时误复用。
3. **runtime 无兼容层**：Reforge 只消费 cue；旧项目由版本化 upgrader 转成 cue 后再进入 content validator。
4. **编辑器所见即所得**：正文编辑 locale 内容；时间与光标走数值/选项控件。JSON 兜底不能作为这些常用字段
   的唯一入口。
5. **全量重生成**：上游修复后生成 PAL/baseline，静态门禁与 MG2 保证问题不会被下一次迁移带回。

### 已知风险

- 风险: schema 改动横跨 content/migrate/reforge/editor，并触及现有工程文件。
  - 缓解: loader 单向升级 + 内存单一格式；分提交保持每步可验证，不保留运行时 union。
- 风险: 控制状态跨 goto/shared 入口，单纯按 message id 写 locale 会发生上下文冲突。
  - 缓解: 把 color/speed 纳入翻译上下文与 deterministic variant id；审计同源多状态数量。
- 风险: 原始 `$NN` 可能真正在可见文字中途变速，row speed 无法表达。
  - 缓解: 当前 12 个异常批次逐项分类；只允许“首个可见字前设速”或“末字后影响下一行”，其他情况
    fail-loud 并由三方决定是否扩 `DialogueRun`，不得猜。
- 风险: ASCII quote 在原版均是控制符，但新作者可能真想输入引号。
  - 缓解: 只有 migrate legacy decoder 解释 ASCII 控制；新 locale 使用普通中文引号或转义后的字面文本，
    editor/runtime 不再解析它。

### 主审立场

- Reviewer: Opus（schema/运行时边界）+ GLM（迁移覆盖/测试矩阵）
- 结论: pending
- 必改项: pending
- 是否建议进入 build: pending

### 三方争议记录(按需)

- Codex: 推荐 cue + rows；反对保留 `line.text` 与 `cue.rows` 双格式。
- Opus: pending
- GLM: pending
- 用户拍板: 控制码必须移除并改成现代明确属性；迁移缺陷优先处理。

## 额度 / 代班记录(如适用)

- 缺席 Agent: none

## Build: 实现与自测

- Coding Owner: Codex（三签齐后）
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

- 用户结论: pending
- 后续任务: X3-1 场景入场呈现事务。

## 交接日志

- 2026-07-14 Codex: 复核设计文档、迁移器、runtime、editor 和 PAL 产物；确认运行时解析器是对已拍板
  架构的倒退，且当前结构无法表达批内多速度。建立 cue + rows 提案并签 agree。Evidence: 本卡基线统计。
  Next: Opus 做 schema/运行时设计主审；不得实现。

## 下一位 Agent 提示词

```text
接手任务: N1-1 对话控制码退出内容与运行时,并顺带审阅已记录的 X3-1 场景入场呈现事务
主任务卡: docs/ops/tasks/N1-1-dialogue-control-code-retirement.md
关联设计卡: docs/ops/tasks/X3-1-scene-entry-presentation.md
当前状态: 两卡均为 draft;Codex agree,Opus/GLM pending;build blocked
你的角色: Opus,主审 schema、运行时边界、旧工程单向升级和呈现架构;只改任务卡,不得实现
先读: AGENTS.md、docs/phase2/READ-FIRST.md、两张任务卡及其上下文锚点;N1-1 重点对照 dialogue/model-design.md 与一阶段 dialog-box.ts;X3-1 重点对照一阶段 sceneLoading/0x73 与 Reforge 当前 bindingHasEarlyDither
请你做: 1)判断 DialogueCue + rows 是否是唯一 canonical 形态,能否忠实覆盖批内多速度、跨行颜色和 autoAdvance;2)审 loader 单向升级、variant text id、runtime 删除 legacy parser 的风险;3)判断 X3-1 的 Prepare→Reveal→Body 是否应取代运行时命令前瞻,普通 fade 与独立 dither 边界是否完整;4)分别在两卡 Opus 设计签字行写 agree 或 counter+替代方案,补主审结论/必改项/交接日志并提交
不要做: 不改实现文件;不重生成 PAL;不改 capability-map 状态;三签未齐不得转 build
输出要求: 给出提交 hash和可直接转交 GLM 的下一位 Agent 提示词;即使两卡 agree,实现顺序仍是 N1-1 优先、X3-1 后置
```
