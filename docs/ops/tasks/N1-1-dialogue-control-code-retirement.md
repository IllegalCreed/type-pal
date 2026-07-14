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
- Opus: **agree（2026-07-14,附 R1-R4 必改 + S1-S2 建议,见主审立场）**。独立地面重验,卡内基线数字全部吻合:
  `$NN`=113/`~NN`=107/`"`=240/`()`=27(出现次数口径)、dialog 命令 6,722 条(speed/autoAdvance/cursorFrame 全 0)、
  1,234 条引用含控制码 locale、join 值 2,392 个;开场三段 `$10`→112ms/`~30`→342ms、`$02`→16ms/`~40`→457ms、
  第三段继承 16ms/`~60`→685ms,逐条对上一阶段换算公式。**关键新证据——全语料 `$NN` 位置分类:行首(可见字前)103 /
  末字后 10 / 行中(真·中途变速)0**:PAL 全集不存在任何可见文字中途变速,rows 行级 speed + 状态携带 100% 覆盖,
  fail-loud 是纯保险而非预期路径(我按 join 值口径测得多速度批 9 个,与卡"12 个原始批次"口径差留 GLM 对账,
  两口径下全部属行界形态)。dlg.9831/9832 跨值黄色实证(`$12"…~70` 未闭合 → `…"$02~60` 闭合)确证 stateful decoder
  + 每值平衡标签展开必要。cue 级 autoAdvance 忠实:一阶段 `~` = 行止 + 行计数复位 = 页终不等键不画光标
  (game/present/dialog-box.ts:76-81),`~` 天然是 cue 边界,批中 `~` 即迁移期分 cue 点。runtime 删除有据:
  content/dialog-text.ts 文档头自认"二阶段渲染层解析",与 model-design §5(控制码在数据生产期消失)正面冲突;
  reforge dialog-box.ts:113-130 每次排版对同一文本双跑 legacy parser。loader 单向升级 line→cue 为单射结构平移
  (line.speed→row.speed / line.autoAdvance→cue.autoAdvance),与 R2"迁移产物拒绝+重迁"分工不冲突
  (PAL=重生成,作者工程=loader 升级)。
- GLM: pending
- counter / 分歧处理: Opus 无架构 counter;R1-R4 为设计必补(`"` slot 依赖 / `~` 后死码 / 18 处 `-` 负号考证 /
  `\n` 政策),纳入 build 范围。
- 缺签豁免: N/A
- build 准入结论: blocked(待 GLM)

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
- 结论(Opus,2026-07-14): **agree — DialogueCue + rows 应为唯一 canonical 形态**。三个核心问题裁定:
  1. **批内多速度**:全语料实测 `$NN` 行中出现 0 次(行首 103 / 末字后 10),行级 `row.speed` + 迁移器状态携带
     即 100% 覆盖;"真·中途变速 fail-loud 交三方裁"作为保险条款保留,预期永不点火。
  2. **跨行颜色**:dlg.9831/9832 未闭合/续闭合实证跨值状态真实存在;stateful decoder 携带进入/离开状态、
     每个 locale 值独立平衡标签,是唯一不把控制状态泄进运行时的方案。采纳。
  3. **autoAdvance cue 级**:一阶段 `~` 行止 + 行计数复位 = 页终(不等键不画光标),`~` 就是显示单元边界;
     批中出现 `~` 时迁移器在该点分 cue,各 cue 独立 autoAdvance——忠实且无损。采纳。
  runtime 删除 legacy parser、loader 单向升级、变体 text id 方向均无 counter。
- 必改项(R,设计层面补明,build 必落):
  - **R1 `"` 的 slot 依赖语义进 decoder 契约与测试表**:一阶段真值 `"` 仅 `!isDialog`(top/bottom/center 普通对话)
    toggle 黄色,narration(isDialog=TRUE)只消费不变色(game/present/dialog-box.ts:96,130-132)。decoder 输入必须含
    slot 上下文;测试表必须含"narration 内 `"` 消费不变色"与"普通对话 `"` 变黄"两个方向。卡现文"与一阶段逐字符
    真值一致"未点名此分叉,240 处 quote 全押在这上面。
  - **R2 尾部 `$NN` 两形态分家钉进测试**:`…$02~70`(`~` 前)= 速度状态改变,传播到下一行/下一 cue;
    `…~50$02`(`~` 后)= 死码,一阶段整段丢弃(text.c:1554 return),**不得让其污染后续速度状态**。实测两形态
    并存(dlg.8624 vs dlg.8603/9213/10217)。卡有"`~` 后缀忽略"一句,须精确为"其后所有字符含 `$NN`/颜色码一并作废"。
  - **R3 18 处 `-` 全部是属性±N 文案的负号,先考证再定去向**:实测 all.json 18 处 `-` 全落在
    `防御+13　身法-10`/`HP-30` 类属性增减文案,无一处叙事强调。按一阶段解析器语义它们会被当 cyan toggle 消费
    (负号消失、`身法` 后数字变青直到下个 `-` 关断)——视觉上像 bug 但可能是原版真行为。build 前必须:
    跑一阶段渲染取实况(或原版对照),连同 18 站点清单交用户裁决"忠实 toggle"vs"literal 负号(跟原版后期修复风格)";
    不得未考证默认按 toggle 吞负号。此裁决同时决定 decoder 对 `-'@` 三符的缺省策略。
  - **R4 row 内 `\n` 政策一句话钉死**:重生成后 PAL 每 row 一个 TextId(不再 join,消化现存 2,392 个 join 值);
    新内容 validator 禁止 locale 值内 `\n`;loader 升级旧工程 line→单 row 时保留既有 `\n` 作软换行豁免
    (升级器只动结构、不改写 locale)。防止"rows 与 `\n` 两套换行"变相双 canonical。
- 建议项(S,不阻塞):
  - S1 编辑器 rows 表单显示 resolved 继承速度来源(行无显式 speed 时显示"继承 16ms/字"),纯 UX,build 裁量。
  - S2 变体 text id 命名规则写进 content-schema 文档,并注明必须与翻译遍历顺序无关(MG2 二跑同进程重放防不了
    顺序依赖式 id churn,基线稳定性靠命名本身确定)。
- 是否建议进入 build: **待 GLM 覆盖复核;R1-R4 纳入 build 范围后 build**。实现顺序用户已定:N1-1 优先,X3-1 后置。

### 三方争议记录(按需)

- Codex: 推荐 cue + rows；反对保留 `line.text` 与 `cue.rows` 双格式。
- Opus: **agree**,cue + rows 采纳为唯一 canonical(全语料 0 例行中变速,rows 覆盖率 100%;`~` = 页终真值故
  autoAdvance 归 cue 级正确);反对双格式立场一致。附 R1-R4:`"` slot 依赖、`~` 后死码、18 处 `-` 负号考证
  (需用户裁决 toggle vs literal)、`\n` 政策。
- GLM: pending
- 用户拍板: 控制码必须移除并改成现代明确属性；迁移缺陷优先处理。R3 的 18 站点 toggle/literal 裁决待呈报。

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
- 2026-07-14 Opus: 设计主审签 **agree + R1-R4 必改 + S1-S2 建议**。独立重验:卡内全部基线数字吻合
  (113/107/240/27、6,722/1,234、2,392 join 值、开场三段换算逐条对上);新证据 `$NN` 位置分类
  行首103/末字后10/**行中0** —— rows 模型 100% 覆盖 PAL,无一真·中途变速;dlg.9831/9832 跨值黄色实证
  stateful decoder 必要;`~` 页终真值支持 cue 级 autoAdvance。R1=`"` slot 依赖(仅普通对话变黄,narration
  只消费);R2=`~` 后 `$NN` 死码不得污染状态(两形态实测并存);R3=18 处 `-` 全为属性±N 负号,须考证原版
  渲染后交用户裁决 toggle/literal;R4=`\n` 政策(PAL 重生成去 join、新内容禁 `\n`、升级豁免)。同批完成
  X3-1 设计主审(agree + X-R1~X-R4,见该卡)。Evidence: 两卡主审立场 + 本人核验脚本输出。
  Next: GLM 覆盖/测试矩阵复核(两卡一并);三签齐后 Codex build,顺序 N1-1 优先。未改实现文件。

## 下一位 Agent 提示词

```text
接手任务: N1-1 对话控制码退出内容与运行时 + X3-1 场景入场呈现事务,覆盖/测试矩阵复核(GLM)
主任务卡: docs/ops/tasks/N1-1-dialogue-control-code-retirement.md
关联设计卡: docs/ops/tasks/X3-1-scene-entry-presentation.md
当前状态: 两卡设计签字 Codex agree + Opus agree(N1-1 附 R1-R4,X3-1 附 X-R1~X-R4),GLM pending;三签未齐,build blocked
你的角色: GLM,迁移覆盖面/测试矩阵复核;只改任务卡,不得实现
先读: AGENTS.md、docs/phase2/READ-FIRST.md、两卡全部(重点两卡 Opus 主审立场的 R 项)、docs/phase2/dialogue/model-design.md、packages/game/src/present/dialog-box.ts(一阶段真值)
请重点复核(数据/测试面,与 Opus 的 schema/架构面互补):
1. N1-1 基线对账:113 $NN/107 ~NN/240 quote/27 paren(出现次数口径)、6,722 dialog 命令、1,234 控制码引用、2,392 join 值;卡"12 个批内变速批次"与 Opus 按 join 值口径 9 个的差异对账(两口径均应全属行界形态,行中=0);
2. 表驱动测试矩阵完备性:对照一阶段 parseDialogText 全分支(-'@" 四色 toggle、`"` 仅普通对话变黄、$NN 跨行跨命令持续、~NN 行止且其后含 $NN 一并作废、\ 转义、() 光标、末尾冒号 speaker),每分支至少一用例;R1/R2/R3 的专项用例是否全部落进测试列表;
3. R3 考证材料:18 处 `-` 全站点清单(实测全为属性±N 文案)+ 一阶段渲染实况,备齐给用户裁决 toggle vs literal;
4. variant text id:同源多状态站点数量的审计方法;命名确定性(与翻译遍历顺序无关)如何落断言;
5. X3-1 lifting 站点面:全 PAL onEnter 绑定(root + override 家族)中"早期 0x73"站点计数,确认除 s001 root 外还有哪些;独立 0x73(非 onEnter 前缀)不误升 entry 的反例集;
6. X3-1 测试矩阵:X-R3 生命周期路径表(prepare 中 abort/reveal 中二次 loadScene/读档打断/prepare 抛错)逐行可落测试;X-R1 prepare 安全集穷尽性断言(每个 Command kind 必须声明分类)的测试形态。
不要做: 不改实现文件;不重生成 PAL;不改 capability-map;三签未齐不得转 build
输出要求: 在两卡 GLM 设计签字行写 agree 或 counter+理由,补交接日志并提交;三签齐后把两卡 build 准入结论改 allowed(实现顺序固定 N1-1 优先、X3-1 后置),交 Codex build
```
