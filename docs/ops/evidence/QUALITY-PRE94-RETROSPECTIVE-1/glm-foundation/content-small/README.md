# content-small(content 微型件 14 文件)八维复审批

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 pre-94 foundation 模块 12 批 30(content 包批 1)的八维复审批回执:对象为 packages/content 微型件 14 文件(author-enemy 5/author-scene 5/author-item 6/cursor-pure-fixtures 6/locale 9/item-script-runtime-ref 13/command-validation-options 16/rich-text 24/enemy-validation-shapes 37/enemy-team-reference 42/scene-core 43/validate-author 47/validate-runtime 47/ambience 49 行),Coding Owner GLM 全文读毕,裁定为零整改批(B–H 全维通过,零代码/注释改动,工作树零 diff)。证据原件即下方逐字节保全的固定main源(1774B,SHA 见保全块)。

## 来源与输入

基线 origin/codex/code-quality-3y @ 53db76bbbb(候选线 64+ 提交)。零整改依据:ambience.ts W6 昼夜乘色模型(原版夜盘 R×0.458/G×0.899/B×1.000 实测,p10-p90 极窄论证)锚准确,isIdentityTint ≥254 阈值/lerpTint clamp 全对;item-script-runtime-ref.ts『Classify by explicit provenance, never by a user-defined ID prefix』判例注释与实现一致;enemy-team-reference.ts 只认明确 startBattle tag 不误判同名业务字段;rich-text.ts 成对闭合颜色标记解析、空串保单 span 合同、biome-ignore 正当(标准 regex 迭代);类型转发件(author-enemy/scene/item)与校验入口(validate-author/runtime)注释全部与被引实现一致。Codex 当前裁定(2026-10-19)与可复用范围见 [codex-stage2-rework.json](../codex-stage2-rework.json)。

## 断言与业务 oracle

定向 11 文件(ambience×2/rich-text×2/enemy-team-reference/enemy-validation-shapes/locale/validate-author×2/validate-runtime×2)30 套件 85/85、0 failed suites,机器回执 [directed.json](directed.json);`tsc --noEmit -p packages/content` exit 0、工作树零 diff。85 例真实身份:enemy-validation-shapes.leaf 33 例构成 G1 守卫原语矩阵(record 六种非法类型路径精确、exactKeys 未知键按实际键序报第一个、nonEmptyString 只禁首尾空白、finite 拒 NaN/±Infinity、percent 闭区间、positiveInteger);ambience/rich-text 各带 O09 残差轴(lerpTint 分量四舍五入、标记识别残余九轴);validate-author/runtime 覆盖 entity label 元数据语义与嵌套 vanish/facing 拒绝。绿结果为该时点定向事实,不外推整包收口。

## 结果

零整改批:B–H 八维全过,零代码/注释改动,工作树零 diff;登记项无新增。本页治理层面原文保全完整、链接处置如实,不产生新执行结果。

## 限制与复核

未重跑任何命令/测试;行数与 W6 实测值为原时点记录未复核;Codex 2026-10-19 裁定本页保留作者阶段证据、未获整包/全维收口验收;历史结论保持原时点。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 1774B / SHA-256 0aab7854dfd9b31bc32f83ada7cedc312948d82db253a45df8cc002d3fcf5747；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# content-small(content 微型件 14 文件)八维复审批

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

- 批次:pre-94 foundation 模块 12 批 30(content 包批 1)
- 基线:origin/codex/code-quality-3y @ 53db76bbbb(候选线 64+ 提交)
- Coding Owner:GLM;14 文件全文读毕(author-enemy 5/author-scene 5/author-item 6/cursor-pure-fixtures 6/locale 9/item-script-runtime-ref 13/command-validation-options 16/rich-text 24/enemy-validation-shapes 37/enemy-team-reference 42/scene-core 43/validate-author 47/validate-runtime 47/ambience 49)
- **零整改批**(B–H 全维通过;零代码/注释改动,工作树零 diff)

## 零整改依据

- **ambience.ts**:W6 昼夜乘色模型(原版夜盘 R×0.458/G×0.899/B×1.000 实测,p10-p90 极窄论证)锚准确;isIdentityTint ≥254 阈值/lerpTint clamp 全对。
- **item-script-runtime-ref.ts**:"Classify by explicit provenance, never by a user-defined ID prefix" 判例注释与实现一致。
- **enemy-team-reference.ts**:只认明确 startBattle tag 不误判同名业务字段 — 与声明一致。
- **rich-text.ts**:成对闭合颜色标记解析、空串保单 span 合同、biome-ignore 正当(标准 regex 迭代)。
- 类型转发件(author-enemy/scene/item)与校验入口(validate-author/runtime)注释全部与被引实现一致。

## 验证

- 定向 11 文件(ambience×2/rich-text×2/enemy-team-reference/enemy-validation-shapes/locale/validate-author×2/validate-runtime×2):**30 套件 85/85,0 failed suites** → [directed.json](directed.json)
- `tsc --noEmit -p packages/content`:exit 0;工作树零 diff

## 登记项

无新增。
```
<!-- incremental-original-source:end -->
