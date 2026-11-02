# CODE-QUALITY-96 evidence — 精确测试退役保护账

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 CODE-QUALITY-96（精确测试退役保护账）证据目录索引的治理候选页；证据原件即下方逐字节保全的固定 main 源（1334B）。本目录承载该卡从开卡检查点到源分支收口的三门证据与剩余 review 清单。

## 来源与输入

开卡时的历史检查点：test-retirement-proof.json 为旧/新 count、执行身份摘要和当前文件 SHA；确认删重的合同对照与 96 项相邻测试见 CODE93。retirement-tools.txt/.exit 为全部 coverage 工具正反控原件。只新增单一精确批准项，原 predicate/阈值/扫描/拒绝规则未改；全仓门、官方 ratchet 和 protected fast 开卡时待重跑。失败日志的 .txt 仅移除行尾空白与末尾空行；同名 .raw.json 保留逐字原始输出、字节数和 SHA256，不改写失败结果（如 gate-check-ledger-table-failure.raw.json 保留 quality-tools 阶段"declared 367/21/2883/2904, actual 367/19/2885/2904"的账本失配失败）。

## 断言与业务 oracle

最终联合门均 exit0：gate-check（七包全量 check+五工具套）、gate-ratchet（基线只升不降，提升 4 项/范围变化 2 项）、gate-protected-fast（731 源/19874 测试无回退，sell-menu 叶 3→2 精确退役保护核准），每门 txt/exit/raw.json 三个文件；最终 file SHA snapshot（dc38e42fa 分支头，sell-menu 三测试+实现+retirements 工具共 6 文件，productChange=false）与 final-docs/lint/ledger 回执。全量 check、两个真正 coverage 门和静态零诊断通过才收口；仅关闭 CODE93 四条+CODE96 两条，其他 review/pending 不变。最终 lint4056/0/0/0、docs1280/6792links/417tasks 与 570 content-review、quality37 项及 ledger 3271/373closed/15review/2883pending 通过（final-source-snapshot.json 为该终态口径；gate-check.raw.json 内联 lint4051/docs6794 属同链另一时点输出，差异如实保留）。

## 结果

remaining-review.json 列出全部 15 条未闭合 review（migrate 2/pal-extract 2/game 11，含 event-system 5110 行、battle-opcodes 1528 行、CODE95 counter 的 inventory 三测试、CODE90 的 magic-script 两文件），pending2883 保持；CODE93 四文件与 CODE96 两文件之外不增加信用。用户指定停止后交 GLM，候选 CODE94/95 全部独立门尚未完成，未合 main。

## 限制与复核

治理轮未重跑任何门/工具；本页只承载目录分层与关键数字，三门与清单细节以各 raw.json/JSON 原件为准；历史结论按各自时点保留。候选待 Owner 非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 1334B / SHA-256 0e3f9aaeb1c645c148b54ecf169411c434d64537748bace07146c53f4220f509；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE-QUALITY-96 evidence — 精确测试退役保护账

开卡时的历史检查点：`test-retirement-proof.json` 为旧/新 count、执行身份摘要和当前文件 SHA；确认删重的合同对照与96项相邻测试见 CODE93。`retirement-tools.txt`/`.exit` 为全部 coverage 工具正反控原件。只新增单一精确批准项，原 predicate/阈值/扫描/拒绝规则未改；全仓门、官方 ratchet 和 protected fast 尚待重跑。

失败日志的 `.txt` 仅移除行尾空白与末尾空行；同名 `.raw.json` 保留逐字原始输出、字节数和 SHA256，不改写失败结果。

最终联合门均exit0：见CODE96的gate-check/ratchet/protected-fast（每门txt/exit/raw.json），最终file SHA snapshot与final-docs/lint/ledger回执。全量check、两个真正coverage门和静态零诊断通过才收口；仅关闭CODE93四条+CODE96两条，其他review/pending不变。用户指定停止后交GLM，候选CODE94/95全部独立门尚未完成，未合main。可读日志只去行尾/末尾空白，同名raw.json保留逐字输出/SHA。

最终lint4056/0/0/0，docs1280/6792links/417tasks与570content-review，quality37项及ledger3271/373/15/2883通过；remaining-review.json列出全部15条未闭合review，pending2883保持。CODE93四文件与CODE96两文件之外不增加信用。
```
<!-- incremental-original-source:end -->
