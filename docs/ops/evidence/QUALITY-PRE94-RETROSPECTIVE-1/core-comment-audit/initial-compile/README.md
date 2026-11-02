# 初次C片段编译失败原件

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是「初次C片段编译失败原件」的治理候选页;证据原件即下方逐字节保全的固定main源(569B,SHA 06c268c8a366)。本目录保存 core-comment-audit 队列/毒列表对照的第一次C片段编译失败原件,属失败方法留档,不计反例信用。

## 来源与输入

来源为固定Git载体,非本次运行。失败原件见[primary-counters.json](primary-counters.json):首次提取 reference/sdlpal/fight.c 1574–1584 行与 global.c 1414–1455 行,clang -std=c99 -Wall -Wextra -Werror 编译 exit 1,stderr 报 queue.c:27:175 error: expected '}'(对应 main 的 '{')——提取缺最外层右括号(实际在 1585),C 根本未编译成程序,更未执行,队列/毒的 C/TS 对照在本目录不成立。

## 断言与业务 oracle

文档事实核对(currentExecution=false):该 exit 1 是真实的首次编译失败见证,不外推为测试或产品失败;有效对照是修正提取边界后根目录重产的两程序回执,本目录原始字节不覆盖。首次 lint 曾对本目录回执 JSON 报 1 条格式诊断;已仅格式化可读 JSON,解析内容逐字段不变,完整原始 JSON 字节另存 primary-counters.json.original.gz(SHA256 76876c1891376427e4aad2f4bdd5010722e8e9b3caf45e0721ffcf8df4a237e3),compiler raw 未改;没有新增 exclude/ignore 或改规则。

## 结果

失败边界如实登记、原始字节保全完整即本页治理结果;不产生新执行结果,也不据本片恢复或新授任何对照信用。

## 限制与复核

未重跑编译与 lint;original.gz 未在治理轮解压复算;1585 行括号事实以原文与父卡叙述为准,未回 fight.c 源核对;历史结论保持原时点;候选待 Owner 非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 569B / SHA-256 06c268c8a366262ea76d016c7b4e2864dd4d7aaf26344220444ba348e0f9da0e；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# 初次C片段编译失败原件

首次取1574–1584缺最外层右括号（实际在1585），compiler exit1，尚未执行C/TS对照，不计反例信用。修正提取边界后重新产生根目录回执；本目录原始字节不覆盖。

首次lint还报告本目录回执JSON的格式诊断1条；已仅格式化可读JSON，解析内容逐字段不变。完整原始JSON字节另存primary-counters.json.original.gz（SHA256 76876c1891376427e4aad2f4bdd5010722e8e9b3caf45e0721ffcf8df4a237e3），compiler raw未改；没有新增exclude/ignore或改规则。
```
<!-- incremental-original-source:end -->
