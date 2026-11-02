# C2 静态与集成门

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是C2切片（敌队翻译与诊断合同复核）的静态与集成门回执页；证据原件为同目录JSON回执，原文本逐字节保全于下方保全块。集成回归六项（原报告口径：完整extract 72文件431例、shared 16文件126例、真实战斗caller 1文件186例、双方typecheck、coverage-tools，原件见[regressions.json](regressions.json)）全部exit0、0 stderr块；20轮反控与真实V8前后已由另进程重建，局部V8不冒充官方门。

## 来源与输入

静态门三轮真实补录、失败原件不覆盖：初轮5项中docs、evidence-verification(verify.py)、ledger、diff-check四项exit0而lint-zero exit1（2.199s失败原件保留）；第二轮仅重试check:docs仍exit1（缺子目录导航与首次verification.json格式未过）；修导航与证据输出格式后，当前静态回执[final-static-gates.json](final-static-gates.json)四项（docs、ledger、diff、lint-zero）全过，lint完整报告error/warning/info全0，未降低规则或覆盖失败记录。diff-check两轮rawSha256均为空输出的SHA256（e3b0c442…），ledger两轮rawSha256相同（24d785d2…）。

## 断言与业务 oracle

按原时点成立的文档事实：集成回归与最终静态门通过仅约束C2切片时点；全仓check、official ratchet、protected fast本片未执行，未执行的门不得写通过；editor仍有未清诊断，不合main、不关闭文件；账本3289 inventory/208 closed/226 review/2855 pending；全83卡9partial/74pending/0accept。

## 结果

原文保全完整、三轮回执语义如实载入即本页治理结果；不产生新执行结果，不授旧执行信用。

## 限制与复核

未重跑任何命令；历史结论保持原时点；本页为治理候选正文重写，候选待Owner非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 804B / SHA-256 268cf47e99e260b754e283cb86bb33d2c977191c0968ce0b7ed097f38224e5a9；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# C2 静态与集成门

完整extract431、shared126、game真实caller186、双方typecheck和coverage-tools71通过，原件见[regressions](regressions.json)。20轮反控与真实V8前后已另进程重建，局部V8不冒充官方门。

[当前静态回执](final-static-gates.json)逐项记录docs、ledger、diff与lint-zero；lint必须完整报告error/warning/info全0。初次两项缺子目录导航、首次verification.json格式未过均保留原始失败回执，已修导航和证据输出格式，不降低规则或覆盖失败记录。

全仓check、official ratchet、protected fast本片未执行，等待诊断稳定窗口；editor仍有未清诊断，不合main、不关闭文件。账本3289 inventory /208closed /226review /2855pending；全83卡9partial/74pending/0accept。
```
<!-- incremental-original-source:end -->
