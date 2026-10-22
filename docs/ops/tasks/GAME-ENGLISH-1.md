# GAME-ENGLISH-1 - 第一阶段英文语言包与界面

Status: build
Phase: phase1
Capability: 第一阶段多语言展示
Coding Owner: Codex（集成与画布界面）；english_patch_audit（提取）；english_runtime_audit（对话）；english_shell_audit（DOM壳层）
Generation Owner: N/A
Reviewer: Codex（独立验收贡献者交付）
Visual Verification Owner: Codex
Visual Verification Timing: mixed
Contributor: Codex 与隔离贡献者
Branch: codex/game-english

## 目标

第一阶段可选择简体中文或 English，记住选择；英文覆盖剧情、名称、菜单与玩家工具。两种语言使用相同的已修正玩法脚本与存档，英文文本较长时仍可读、可翻页。用户于2026-10-22授权继续英文版工作。

## 范围

- 范围内：SLF文本解析与可再生语言包、残留中文补译、语言偏好、探索/战斗对话、物品说明、画布菜单与DOM壳层、必要字体及布局、定向测试和浏览器核验。
- 范围外：第二阶段及编辑器界面翻译、英文配音、视频/图片内文字重制、重新校订全篇译文。
- 明确不做：使用英文SSS.MKF覆盖玩法；提交EXE、原盘二进制或整包data/en；修改save版本；恢复已删除的错误描述/乱码；把旧任务E2E免测外推成本任务通过。

## 前提真值门

### 一句话行为 / 工程前提

英文是展示层；SLF按原消息起止索引匹配一组可变行数台词，不能按英文行数改写指令数量或IP。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | 本地补丁含独立WORDS、MESSAGE、LAYOUT；其SSS还含玩法变化，不作为语言输入 | `data/en/readme.txt`；`data/en/win_files/m_eng.slf:159`；[前置核查卡](GAME-SCRIPT-CORRECTIONS-1.md) |
| 第一阶段 | showDialog保留messageIndex，探索、同步战斗和说明分别消费；当前字体按字形宽绘制 | `packages/shared/src/events.ts:36`；`packages/game/src/core/event-system.ts:2030`；`packages/game/src/core/menu/script-desc.ts:17`；`packages/game/src/present/font.ts:121` |
| SDLPal参考 | 按实际连续消息范围匹配翻译组，翻译行数不决定原脚本IP | `reference/sdlpal/script.c:3088`、`:3444`；`reference/sdlpal/text.c:1010` |
| 当前二阶段 | N/A（本卡不改Reforge canonical或编辑器） | 本卡范围 |
| 本任务目标 | 中文默认；独立文本包；修复后的共同脚本、数值及存档语义保持 | 用户本轮授权；[前置卡](GAME-SCRIPT-CORRECTIONS-1.md) |

### 反证与替代解释

- 只替换M.MSG不足：英译按组重新分行，WORD还残留敌人/敌方法术中文，界面有硬编码和烤在背景内的中文。
- 若实际组范围无法精确映射，必须核原控制流并补映射，禁止按行号比例猜译；没有对应的中段入口不得截取错误英译。
- 反证：切语言后指令数组、标签、对象脚本进度或数值发生变化；英文组结束跳过非展示指令；中文路径回归；任一成立都阻断交付。
- 已确认补丁message0用署名替代原呼喊；本卡恢复其剧情含义，署名单列保留。D01/D16沿用前置卡真值，保留中文有效属性。

### 用户可见偏离

- 是否主动偏离已核真值：yes（用户授权增加英文展示，玩法不变）。
- before -> after：仅中文 -> 可选英文，翻译所需换行和布局适配。
- 代表场景：开场呼喊、客栈对话、背包说明、状态/装备、战斗、移动端工具。
- 用户裁决：2026-10-22“你可以继续推进英文版的工作了吧？”；原始需求为第一阶段英语支持。

## 上下文锚点

- 规则：[CLAUDE](../../../CLAUDE.md)、[质量](../code-quality.md)、[工作流](../agent-workflow.md)、[机制真值](../../phase1/game-mechanics.md)、[E2E合同](../../testing/e2e/contract.md)。
- 前置：[两阶段共同脚本修复](GAME-SCRIPT-CORRECTIONS-1.md)，main基点`6a29b455fc51664df85334bc177d0994348a7987`。
- 数据：本地`data/en/win_files/m_eng.slf`与其readme；前置证据`docs/ops/evidence/GAME-SCRIPT-CORRECTIONS-1/`。
- 不得重新引入：英文玩法分叉、message1504乱码、把雪蛤蟆灵力写成MP、直接改extracted、无保护的输出清理、移动端已移除功能。

## 验收条件

- 功能：选择语言后名称/台词/菜单一致；保存偏好；不重置游戏，不影响存档；切回中文恢复。翻译组可多页且仅执行一次之后的玩法指令。
- 资源：可再生、来源/hash可追踪、字形覆盖核查、三处范围差异有确定处理；不读英文SSS；全量再提取幂等。
- 测试：真实group resolver、探索/战斗/说明caller、clear/page/controls、中文回归、偏好和DOM工作流、英文布局边界；Vitest合法输入、独立oracle与必要反控。
- 文档：本卡、看板、索引与证据一致；check:docs/lint/diff零诊断。新源码加入inventory后核账本，不把专项验收算全文件关闭。
- 视觉：dev-functional核语言设置/菜单/移动端；剧情观感mixed，登记原入口、准备数据、操作、预期和截图；未跑全剧情不得声称全剧情通过。
- 代码质量：贡献者给逐文件八维、实际caller/合法输入/oracle/排重、候选与原生日志；Codex核实际差异及风险点。静态门零诊断，集中全包/覆盖率窗口在稳定实现后运行。
- 快速复验：各贡献者定向Vitest、game/extract/shared typecheck；具体命令、SHA、原件和失效条件在交付时追加。

## 当前模式推进记录

### 进入 build 前：Codex 核定

- Owner / 白名单：提取Owner仅`pal-extract`语言模块及CLI、语言文本源/署名；对话Owner仅game对话解析/游标/说明/战斗队列及测试；DOM Owner仅玩家DOM展示与字典/偏好；Codex独占shared语言合同、bootstrap集成、画布名称与菜单、文档。贡献者在隔离worktree交付，详细路径随分派记录。
- 前提核验：verified（上述本地原件、reference和实际caller已读，SLF组与IP必须解耦）。
- 范围、设计和验收条件：agree；先定共享语言包合同再分派写入，不改玩法数据或存档schema。
- 高风险产品裁决：本卡不新增玩法取舍；英文语言功能已获用户授权。
- build准入结论：Codex build allowed；单文件单Owner，未知映射先核证。

### 进入 done 前：独立验收

- 贡献者交付与自验：pending。
- Codex独立复核：pending。
- 用户体验/产品验收：pending。
- done准入结论：blocked（尚在实施）。

## Draft: 设计与风险

语言包保存WORDS和按原始message起止范围索引的台词组，保留转义、颜色、速度、等待/clear语义。运行时不扩展commands或重排labels，展示游标逐行消费后才回到原始resume IP；战斗与说明消费同一解析边界。静态数据的名称通过word身份查询，不把语言文本写进玩法状态。中文默认，偏好独立于存档。英文长名采用必要的小字体及英文专属布局，不压缩/改动中文布局。DOM字典在展示边界翻译，原检查器的逻辑键保持稳定。

风险：补丁译文不完整、旧分组差异、额外控制符、长名称及图片内中文；分别以补译清单、范围核对、真实caller回归、浏览器实看处理。原补丁本身声明并非全面校订译文，本卡不冒充重新审校全篇。

## Build: 实现与自测

- 当前：只读核查完成首轮；尚未交付实现。
- 未运行：实现测试、浏览器、统一门、覆盖率。

## 视觉验证记录

- Owner：Codex；Timing：mixed。
- 待登记：开场/客栈台词、状态/装备长名、背包说明、战斗菜单、桌面/移动端系统设置、切回中文及刷新记忆。
- 全剧情逐段E2E：本卡不预填通过。

## Review: 审查与返工

- Reviewer：Codex；Accept / rework：pending。

## 用户验收

- 用户结论：pending。
- 后续：完整全剧情英译质量仍按实际玩测逐段记录。

## 交接日志

- 2026-10-22 Codex：用户授权继续第一阶段英文；建立本卡，3个只读分工核SLF、对话及DOM，记录共同脚本边界；下一步隔离实现与独立验收。

## 下一位 Agent 提示词

无用户转交；当前由Codex持续集成。接手先读本卡、AGENTS现行协议和前置卡；只按Owner白名单写入，不把尚未实跑项写成通过。
