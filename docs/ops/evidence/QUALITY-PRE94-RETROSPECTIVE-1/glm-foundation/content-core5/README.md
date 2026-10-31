# content-core5(enemy-ai + index + enemy-script + script-library + frame-sequence)八维复审批

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 content-core5 批34(五文件全文读毕:enemy-ai 160行/index 203行/enemy-script 407行/script-library 414行/frame-sequence 605行)八维复审回执的治理候选页。真实语义:整改仅纯注释1处——删除 index.ts EntityBase L79 悬空孤儿 docblock(其描述字段早已删除,交互对话由 pages 脚本承载),零代码改动,body-invariance 记录 allEqual: true;基点53db76bbbb(候选线68+提交)。Codex 两段裁定(2026-10-19 保留作者证据/2026-10-20 剩余29文件返工)均保持在原文。

## 来源与输入

来源为固定Git载体,非本次运行;原4个链接处置见作者review的linkDisposition。当前存活入口:[codex-final29.json](../codex-final29.json) [codex-stage2-rework.json](../codex-stage2-rework.json) [body-invariance.json](body-invariance.json) [directed.json](directed.json)。

## 断言与业务 oracle

文档事实核对(currentExecution=false):(1)四文件零整改面的真实依据——enemy-ai(难度=预设 id 非固定枚举、沉默 cast 跳过继续匹配、pickAiTarget 槽序稳定)、enemy-script(continue 图无调度边界循环检测+64步同步闭包上限+terminal 唯一)、script-library(FNV-1a 迁移器/运行时共用、1MiB chunk 上限、孤儿 ref 校验)、frame-sequence(TPFS 容器完整合同:魔数/索引 JSON UTF-8 严格解码/块连续性/尾随字节拒绝/XOR delta 流式编解码);(2)验证轴=body-invariance index.ts printedSha256 一致+定向5文件11套件47/47 0 failed suites+tsc exit 0+scoped biome 0,按原时点;(3)Codex 2026-10-20 附注:47例是相邻模块测试不是 EntityBase 运行时专项,类型/导出/运行字节均未变。

## 结果

治理结果=原文保全+本页真实整改语义+链接处置如实;不产生新执行结果。

## 限制与复核

未重跑原命令/浏览器/测试;候选待Owner非作者接收,本节不接收原文整包/模块收口宣称。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2588B / SHA-256 61a9ccabd74f45ae3c2916d8bb7792c5b12d7f12e84c87ec1c974bc0b3e7dcee；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# content-core5(enemy-ai + index + enemy-script + script-library + frame-sequence)八维复审批

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

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


## Codex 剩余29文件返工（2026-10-20）

index.ts孤儿注释删除保留；另纠正模块头demo/编辑器将来时/只含纯类型的过时描述，公共出口当前含校验与资源函数。类型/导出/运行字节均未变；47例是相邻模块测试，不是EntityBase运行时专项测试。

逐文件八维、原件与限制见[本轮回执](../codex-final29.json)。本节不接收原文整包/模块收口宣称。
```
<!-- incremental-original-source:end -->
