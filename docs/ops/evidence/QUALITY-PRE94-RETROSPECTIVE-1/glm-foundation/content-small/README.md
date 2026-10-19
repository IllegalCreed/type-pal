# content-small(content 微型件 14 文件)八维复审批

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
