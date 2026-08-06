# D14-1 - 对话系统外观继承（版式/头像/光标/字体/自动播放）

Status: draft
Phase: phase2
Capability: D14 子项（对话外观继承）/ P0 演出 & 文本呈现
Coding Owner: Codex
Generation Owner: Codex（涉及 RGM 头像 / 光标 sprite 资产接入时）
Reviewer: Kimi（视觉/UX 主审）+ GLM（数据/覆盖矩阵）
Visual Verification Owner: Kimi（用户 2026-08-06 拍板视觉验证由 Kimi 承担）
Unavailable Agents: none
Branch: TBD

## 目标

对话外观继承原版（作者明确要求，2026-06-26）：头像、人名、正文分行版式、翻页结尾光标、
上/下显示位置、字体渲染（FONT_COLOR_DEFAULT 0x4F + shadow）、自动播放 vs 交互。行为/状态
已由 `dialogue.ts` 纯状态机重构（议题 14 主体已落地），本卡只做外观/资产继承，两者解耦。

首批（2026-08-06 用户报障）：

- **孤儿换行修复（版式对齐）**：原版对话文本区全宽语义（~17-18 字/行），reforge 带头像时
  收窄到 ~13 字/行（`dialog-box.ts` maxRight = 头像左缘 − 4 + 光标预留），导致 ≤39 行
  原版一行放得下的文本折出 1-2 字孤儿行再接显式换行。修复 = 文本区宽度对齐原版语义。

## 范围

- 范围内:
  - 版式对齐（首批）：核实 sdlpal 原版长行与头像/框边的关系（全宽渲染 vs 框宽裁边），
    冻结文本区宽度语义（startX/maxRight/光标预留），消除孤儿换行；9111 行对话回归
    0 意外折行。
  - 头像（RGM.MKF 92 chunks）：左右位置随 setDialogStyleX、随 0x09/0x7F 清除；大小/
    阴影按原版。
  - 人名/正文分行：setDialogStyleX arg0/arg1（portrait/fontColor）版式对齐。
  - 翻页结尾光标：原版 key icon（DATA chunk 12 sprite）替换自绘"继续"文字；typing
    animation + 不同 wait 光标形态。
  - 上/下显示：setDialogStyleTop（求雨 RNG / 结局用）等原版位置语义。
  - 字体渲染：FONT_COLOR_DEFAULT 0x4F + shadow 对齐原版（若 sdlpal/原版字模度量与
    Unifont 不同则以原版为准；当前双方均为 Unifont 16px，仅渲染/阴影需对齐）。
  - 自动播放（0x09 wait 自动延时）vs 交互（wait-key）。
- 范围外:
  - 对话行为/状态重构（dialogue.ts 已 done）。
  - 脚本模型/N3-1 相关；i18n 多语言（文本 id 已定）。
  - 物品提示 UI（独立 UI，随奖励/事件总线设计）。
- 明确不做:
  - 不逐帧复刻原版绘制实现；外观是数据 + sprite 资产，行为是纯状态机。
  - 不在迁移期重排对话文本（源行边界是作者数据，必须保留）。

## 上下文锚点

- 已拍板决策 / 铁律:
  - 用户 2026-06-26：对话外观应当继承原版，代码可重构、外观要继承。
  - 用户 2026-07-30：游戏机制参考一阶段 game-mechanics.md 真值，不猜测。
  - AGENTS.md：视觉验证由 Kimi 承担（2026-08-06 拍板）；schema/资产管线属高风险。
- 代码锚点:
  - `packages/reforge/src/dialog/dialog-box.ts`（POS/MAX_RIGHT/头像收窄/排版调用）、
    `layout.ts`（layoutLines 自动折行）、`slot.ts`、`narration-scroll.ts`。
  - `reference/sdlpal/text.c:1270-1360`（对话框位置/文本起点）、`font.c`（Unifont 16px）、
    `text.c:1173`（320 裁边）。
  - `packages/pal-extract/src/resources/parsers/rgm.ts`（RGM 头像解码）。
- 已知坑 / 审计文档:
  - `docs/phase2/design-backlog.md`「对话系统外观继承（议题 14 子项 · 作者明确要求）」表。
  - 当前对话框是"自己编的样式（粗框 + 右上角提示）"，作者不满意。
- 不得重新引入:
  - 行为与外观耦合（对话状态机里塞绘制）。
  - 迁移期改对话文本（源行边界不可动）。
  - 用系统宋体冒充原版字模（若原版度量不同则必须移植）。

## 验收条件

- 功能:
  - 9111 行 PAL 对话在带头像/无头像两态下均按原版文本区语义显示，无 1-2 字孤儿折行。
  - 头像/人名/翻页光标/上显/自动播放按原版外观呈现（Kimi 截图逐项验收）。
- 测试:
  - layout 单测：带头像/无头像/长行/rich-text/光标预留/上显，9111 行回归 0 意外折行。
  - 渲染/资产：RGM 头像、DATA chunk 12 光标、FONT 渲染（0x4F+shadow）。
- 文档:
  - 更新 backlog 议题 14 子项状态；capability-map 文本呈现口径。
- 视觉 / 手工验证:
  - Kimi 浏览器实测：带头像 NPC 对话、求雨 RNG 上显、翻页光标、自动播放 vs 交互、
    原版 vs 新版并排对比截图。

## 推进签字

### 进入 build 前:设计签字

- Codex: pending（首批版式对齐设计：先核实 sdlpal 长行与头像关系再冻结）
- Kimi: pending
- GLM: pending
- counter / 分歧处理: N/A
- 缺签豁免: N/A
- build 准入结论: blocked

### 进入 done 前:审查签字

- Codex: pending
- Kimi: pending
- GLM: pending
- counter / 返工处理: N/A
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论

首批版式对齐（待核实 sdlpal 长行与头像关系后冻结）：

1. 冻结文本区语义：无头像 startX=44；带头像 bottom startX=20；右界 = 原版框宽语义
   （若原版全宽渲染则到 320/框边，不在头像处收窄；若原版按框裁边则按框宽）。
2. 光标预留：只影响末行尾部，不改变折行宽度（当前 CURSOR_RESERVE 让可用宽度再 -12，
   是孤儿换行的放大因素之一；核实后并入）。
3. 长行与头像重叠：按原版行为（若原版长行会延伸至头像区，则忠实保留或按原版框宽
   裁边），不得自作主张收窄。

### 已知风险

- 风险: 原版长行是否与头像重叠未定（决定全宽 vs 框宽语义）。
- 缓解: 先读 sdlpal text.c 对话框渲染与 phase-1 呈现，冻结语义再实现。
- 风险: 头像/光标/字体资产接入涉及 asset pipeline。
- 缓解: 复用 A7 资产闭包先例；资产接入走 Generation Owner（Codex）+ 三方审。

### 主审立场

- Reviewer: Kimi（视觉/UX 主审）+ GLM（数据/覆盖）
- 结论: pending
- 必改项: pending
- 是否建议进入 build: pending

### 三方争议记录(按需)

- Codex: 孤儿换行根因 = 带头像文本区收窄至 ~13 字/行（原版 ~17-18 字）；≤39 行受影响；
  修复 = 文本区宽度对齐原版语义，不迁移期改文本。
- Kimi: pending
- GLM: pending
- 用户拍板: 2026-08-06 推进本卡；视觉验证 Kimi 承担。

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件: pending；设计三签前不得开始实现。
- 实现摘要: pending
- 运行命令: pending
- 浏览器 / 手工检查: pending（Kimi 视觉验收）
- 跳过的检查及原因: N/A

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

- 2026-08-06 Codex: 用户报障「原版一行放得下、新版带头像折出 1-2 字孤儿行再接显式换行」。
  根因定位：reforge `dialog-box.ts` 带头像时 maxRight = 头像左缘 − 4 − 光标预留 → ~13 字/行；
  原版 text.c 全宽语义 ~17-18 字/行；9111 行中 ≤39 行受影响（>222px）。开本卡（版式对齐
  为首批），待设计冻结（先核实 sdlpal 长行/头像关系）后三方签字。

## 下一位 Agent 提示词

```text
接手任务: D14-1 对话系统外观继承（版式对齐首批）
任务卡: docs/ops/tasks/D14-1-dialogue-appearance-inheritance.md
当前状态: draft（build 准入 blocked）
你的角色: Kimi 视觉/UX 主审；GLM 数据/覆盖矩阵主审
先读: AGENTS.md、docs/phase2/READ-FIRST.md、本卡、design-backlog「对话外观继承」表、
  packages/reforge/src/dialog/{dialog-box,layout,slot,narration-scroll}.ts、
  reference/sdlpal/text.c:1270-1360（对话框位置/文本区）、font.c（字模度量）
已完成: Codex 根因定位（带头像收窄 ~13 字/行、原版 ~17-18 字、≤39 行受影响）
请你做: 压测文本区宽度语义（原版长行是否与头像重叠/框宽裁边）、版式/光标/字体/自动播放
  的继承口径；冻结方案后写 agree，或 counter + 必改理由
不要做: 不得修改实现文件；不得在迁移期改对话文本；不得把行为与外观耦合
输出要求: 更新设计签字、主审立场、争议处理和下一位提示词
```
