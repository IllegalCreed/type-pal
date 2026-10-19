# content-core5(enemy-ai + index + enemy-script + script-library + frame-sequence)八维复审批

- 批次:pre-94 foundation 模块 12 批 34(content 包批 5)
- 基线:origin/codex/code-quality-3y @ 53db76bbbb(候选线 68+ 提交)
- Coding Owner:GLM;五文件全文读毕(enemy-ai 160/index 203/enemy-script 407/script-library 414/frame-sequence 605)
- 整改类型:纯注释 1 处(孤儿 docblock 删除),零代码改动 — body-invariance `allEqual: true`

## 整改清单

| # | 位置 | 问题 | 处置 |
|---|---|---|---|
| 1 | index.ts EntityBase L79 | "/** 交互触发的对话 id */" 孤儿 docblock — 悬在 collide 与 hidden 各自注释之间,其描述的字段已不存在(交互对话由 pages 脚本承载,该字段早已删除) | 删除该行 |

## 零整改面(4 文件 + index 其余)

- **enemy-ai.ts**:难度=预设 id 非固定枚举(2026-07-04 定调)、沉默 cast 跳过继续匹配(原版"被沉默仍普攻")、pickAiTarget 并列取槽序稳定。
- **enemy-script.ts**:EnemyHookFlow continue 图无调度边界循环检测 + 64 步同步闭包上限 + 同激活路径 terminal 唯一 — 校验完备性与声明一致。
- **script-library.ts**:FNV-1a 稳定散列"迁移器与运行时必须共用"、deriveScriptChunk 重分桶不失效存档论证、1MiB chunk 上限、孤儿 ref 校验。
- **frame-sequence.ts**:TPFS 容器完整合同(魔数/保留位/索引 JSON UTF-8 严格解码/块连续性/尾随字节拒绝/XOR delta 流式编解码)。
- index.ts 其余:EntityRef 三选一、hostile B9"数据区分野怪"拍板、battleFieldId 解析优先级四层链 + 0x4A 退役铁律 4。

## 验证

- body-invariance:index.ts printedSha256 一致 → [body-invariance.json](body-invariance.json)
- 定向 5 文件:**11 套件 47/47,0 failed suites** → [directed.json](directed.json)
- `tsc --noEmit -p packages/content`:exit 0;scoped biome 0;`git diff --check` 干净

## 登记项

无新增。
