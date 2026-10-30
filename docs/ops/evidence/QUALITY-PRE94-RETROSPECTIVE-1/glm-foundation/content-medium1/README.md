# content-medium1(author-dialogue + runtime-script + battle-sprite + skill)八维复审批

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是「content-medium1(author-dialogue + runtime-script + battle-sprite + skill)八维复审批」的治理候选页;证据原件即下方逐字节保全的固定main源(1967B,SHA ba9984a1683a)。

## 来源与输入

来源为固定Git载体,非本次运行;原3个链接处置见作者review的linkDisposition。当前存活入口:[codex-stage2-rework.json](../codex-stage2-rework.json)、[directed-skills.json](directed-skills.json)、[directed.json](directed.json)

## 断言与业务 oracle

文档事实核对(currentExecution=false):原记录按其自身字段成立;空数组/exit0/成功字样不外推为零诊断或产品通过。

## 结果

原文保全完整、模板符合、链接处置如实即本页治理结果;不产生新执行结果。

## 限制与复核

未重跑原命令/浏览器/测试;历史结论保持原时点;候选待Owner非作者接收。


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
