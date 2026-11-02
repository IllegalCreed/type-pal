# CODE3d 当前质量门

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是CODE3d切片质量门MD回执，原件为下方逐字节保全的固定main源（930B，SHA 34a87272deb0）；机器字段以同目录[static-gates.json](static-gates.json)为准。

## 来源与输入

定向13例正常通过，两项旧9绿/新各12绿1指定AssertionError（height整数/正数guard）；只读重建六轮模块图通过。相邻六文件47例、完整extract 72文件432例、game PNG三文件8例与extract typecheck通过，0失败/跳过/stderr/act/环境诊断；相邻命令两个不存在过滤路径保持原件，不计为已执行；完整包确认真正BALL/RGM测试已执行。

## 断言与业务 oracle

生产仅注释校正、测试补合同；配置、规则、精确退役表、基线和资源均未改。docs工具48/1370 Markdown/443卡通过；lint 4518文件error/warning/info全0；ledger 3289/204closed/237review/2848pending与diff-check通过。

## 结果

0文件关闭；当前统一check/official ratchet/protected未执行，editor诊断未清，不合main；全部83卡仍11partial/72pending/0整卡accept。

## 限制与复核

未重跑任何命令；两个未匹配路径不记credit为原时点纪律；本页不授权统一门或合main。候选待Owner非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 930B / SHA-256 34a87272deb0200f201645d7f257b84af19474f52fd3210b066f7301db0793c3；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE3d 当前质量门

定向13例正常通过，两项旧9绿/新各12绿1指定AssertionError；只读重建六轮模块图通过。实际相邻六文件47例、完整extract72文件432例、game PNG三文件8例与extract typecheck通过，0失败/跳过/stderr/act/环境诊断。相邻命令两个不存在过滤路径保持原件，不计为已执行；完整包确认真正BALL/RGM测试已执行。

docs、lint-zero、ledger、diff-check以[当前静态回执](static-gates.json)为准。生产仅注释校正，测试补合同；配置、规则、精确退役表、基线和资源均未改。0文件关闭；当前统一check/official ratchet/protected未执行，editor诊断未清，不合main。

实际静态回执：docs工具48/1370 Markdown/443卡通过；lint4518文件error/warning/info全0，ledger3289/204closed/237review/2848pending及diff-check通过。全部83卡仍11partial/72pending/0整卡accept。
```
<!-- incremental-original-source:end -->
