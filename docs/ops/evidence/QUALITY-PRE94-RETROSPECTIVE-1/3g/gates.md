# CODE3g 当前检查点质量门

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是CODE3g切片质量门MD回执，原件为下方逐字节保全的固定main源（1298B，SHA e6af7dd18559）；机器字段以[静态回执](static-gates.json)与初轮[initial-static-gates.json](initial-static-gates.json)为准。

## 来源与输入

五CLI+三BDF文件41例及extract typecheck实际通过，0失败/跳过、Vitest外层0stderr/act/环境诊断；被测试捕获的CLI子进程输出仍有未核范围，不由外层零诊断升级整文件接受。四次真实临时CLI观察证实root/父链接风险，未实施产品修复；仅一条字形码点注释校正（19970=丂/U+4E02），产品/测试body/规则/退役/基线和资源不变。完整包72/432沿用上一3d原件，不冒充当前新跑。

## 断言与业务 oracle

初轮静态回执中docs/ledger通过，diff-check因生成索引末尾多一空行exit2，未运行lint；索引按既有单换行规范化后才重跑全部静态门，原诊断不改写为通过。最终静态结果：docs 48工具/1373 Markdown/7484链接/444卡通过；lint 4526文件0/0/0；ledger 3289/203closed/241review/2845pending与diff-check通过。

## 结果

统一三门未新跑、0新增关闭、未合main；输出策略等高风险卡裁决，其余目标继续；全83卡12partial/71pending/0整卡accept。

## 限制与复核

未重跑任何命令；初轮exit2与lint缺项按原样保留；本页不授权统一门、合main或输出guard修复。候选待Owner非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 1298B / SHA-256 e6af7dd18559e1679b1db986608e7cac3f22320f79dfc689e31820f17394ac7e；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE3g 当前检查点质量门

五CLI+三BDF文件41例及extract typecheck实际通过，0失败/跳过、Vitest外层0stderr/act/环境诊断。被测试捕获的CLI子进程输出仍有未核范围，不由外层零诊断升级整文件接受。四次真实临时CLI观察证实root/父链接风险，未实施产品修复。只有一条字形码点注释校正；其余产品/测试body/规则/精确退役/基线和资源不变。

docs、lint-zero、ledger、diff-check以[静态回执](static-gates.json)为准。完整包72/432沿用上一3d原件，不冒充当前新跑；完整全仓check/官方ratchet/protected本片未运行。editor诊断仍待、0新增关闭、不合main；输出策略等高风险卡裁决，其余目标继续。

初轮[静态回执](initial-static-gates.json)中docs/ledger通过，diff-check因生成索引末尾多一空行exit2，未运行lint；对应raw保留initial前缀。索引按既有单换行规范化后才重跑全部静态门，原诊断不改写为通过。

最终实际静态结果：docs48工具/1373 Markdown/7484链接/444卡通过；lint4526文件error/warning/info全部0，ledger3289/203closed/241review/2845pending与diff-check通过。统一三门未新跑、0新关闭、未合main；全83卡12partial/71pending/0整卡accept。
```
<!-- incremental-original-source:end -->
