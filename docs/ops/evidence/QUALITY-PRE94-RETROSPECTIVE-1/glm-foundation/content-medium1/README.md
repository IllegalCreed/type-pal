# content-medium1(author-dialogue + runtime-script + battle-sprite + skill)八维复审批

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 pre-94 foundation 模块 12 批 31(content 包批 2)的八维复审批回执:对象为 packages/content 的 author-dialogue/runtime-script/battle-sprite/skill 四文件,Coding Owner GLM 逐文件全文读毕(author-dialogue 216/runtime-script 221/battle-sprite 226/skill 241 行),裁定为零整改批(B–H 全维通过,零代码/注释改动,工作树零 diff)。证据原件即下方逐字节保全的固定main源(1967B,SHA ba9984a1683a)。

## 来源与输入

基线 origin/codex/code-quality-3y @ 53db76bbbb(候选线 65+ 提交)。本批零整改依据逐文件:author-dialogue.ts 三态身份联合(narration/actor/unbound)与『unbound 是正式表达非迁移临时态』声明、Actor 只引用自有立绘/命名表情的边界、fail-loud 无 fallback 解析器;runtime-script.ts RUNTIME_COMMAND_KINDS 词表(vanishEntity:false 显式禁+四生命周期命令)与『在保留的递归命令树上换词表』类型工具声明;battle-sprite.ts 敌人三段连续性守卫(idle 必 start=0/magic 紧接/attack 紧接)、actTicksPerFrame 0 合法(PAL 零时长)、summon 帧集合须 actualFrameCount 合同、A7-3E/3B 前瞻注为活跃任务引用非过时;skill.ts SkillEffect 逐 kind 原版 opcode 考证(0x6 概率门/0x64 HP 门/0x88 乾坤一掷 script.c:2547-2554/召唤 wEffectTimes vs 染色混淆修正史/声音漏迁修正史)、ENEMY_RUNTIME_SKILL_EFFECT_KINDS『作者边界不得超前 runtime』边界、authoredSkillExecutionLayers 三层闭包。Codex 当前裁定(2026-10-19)与可复用范围见 [codex-stage2-rework.json](../codex-stage2-rework.json)。

## 断言与业务 oracle

定向 9+3 文件分两次运行:author-dialogue×4/battle-sprite×3/runtime-script×2 共 9 文件 22 套件 51/51、0 failed suites,回执 [directed.json](directed.json);skill 族 3 文件 10 套件 35/35、0 failed suites,回执 [directed-skills.json](directed-skills.json)。另 `tsc --noEmit -p packages/content` exit 0、工作树零 diff。51 例真实主轴:E1/E2 对话 cue 合法联合与 fail-loud 解析、A6–A10 守卫轴(rows 无长度上限不发明 >4 拒绝)、D3/D4 战场形象帧索引与 demand=max+1、battle-sprite 14 条拒绝且输入不被 mutate、runtime 词表不可被 options 替换且 vanishEntity 含嵌套臂拒绝;35 例覆盖 O09 lerpTint/override 分层、G7 技能与毒残差正反控、validatePoisons 字段损坏矩阵与同 id 重复拒绝(禁止 loader 静默覆盖)。绿结果为该时点定向事实,不外推整包收口。

## 结果

零整改批:B–H 八维全过,零代码/注释改动,工作树零 diff;登记项无新增。本页治理层面原文保全完整、链接处置如实,不产生新执行结果。

## 限制与复核

未重跑任何命令/测试;四文件行数与 opcode 考证为原时点记录未逐项复核;Codex 2026-10-19 裁定本页保留作者阶段证据、未获整包/全维收口验收;历史结论保持原时点。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 1967B / SHA-256 ba9984a1683aefe9e187777d41837809827c9fc6eabe90bfb7f65355b0254c8f；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# content-medium1(author-dialogue + runtime-script + battle-sprite + skill)八维复审批

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

- 批次:pre-94 foundation 模块 12 批 31(content 包批 2)
- 基线:origin/codex/code-quality-3y @ 53db76bbbb(候选线 65+ 提交)
- Coding Owner:GLM;四文件全文读毕(author-dialogue 216/runtime-script 221/battle-sprite 226/skill 241)
- **零整改批**(B–H 全维通过;零代码/注释改动,工作树零 diff)

## 零整改依据

- **author-dialogue.ts**:三态身份联合(narration/actor/unbound)与"unbound 是正式表达非迁移临时态"声明、Actor 只引用自有立绘/命名表情的边界、fail-loud 无 fallback 解析器 — 全部与实现一致。
- **runtime-script.ts**:RUNTIME_COMMAND_KINDS 词表(vanishEntity:false 显式禁 + 四生命周期命令)、"在保留的递归命令树上换词表"类型工具声明准确。
- **battle-sprite.ts**:敌人三段连续性守卫(idle 必 start=0/magic 紧接/attack 紧接)、actTicksPerFrame 0 合法(PAL 零时长)、summon 帧集合须 actualFrameCount 的合同 — 全锚准确;A7-3E/3B 前瞻注为活跃任务引用非过时。
- **skill.ts**:SkillEffect 逐 kind 原版 opcode 考证(0x6 概率门/0x64 HP 门/0x88 乾坤一掷 script.c:2547-2554/召唤 wEffectTimes vs 染色混淆修正史/声音漏迁修正史)、ENEMY_RUNTIME_SKILL_EFFECT_KINDS"作者边界不得超前 runtime"边界、authoredSkillExecutionLayers 三层闭包 — 全部准确。

## 验证

- 定向 9+3 文件(author-dialogue×4/battle-sprite×3/runtime-script×2/skill 族×3):**22 套件 51/51 + 10 套件 35/35,0 failed suites** → [directed.json](directed.json) [directed-skills.json](directed-skills.json)
- `tsc --noEmit -p packages/content`:exit 0;工作树零 diff

## 登记项

无新增。
```
<!-- incremental-original-source:end -->
