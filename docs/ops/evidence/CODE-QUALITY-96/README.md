# CODE-QUALITY-96 evidence — 精确测试退役保护账

开卡时的历史检查点：`test-retirement-proof.json` 为旧/新 count、执行身份摘要和当前文件 SHA；确认删重的合同对照与96项相邻测试见 CODE93。`retirement-tools.txt`/`.exit` 为全部 coverage 工具正反控原件。只新增单一精确批准项，原 predicate/阈值/扫描/拒绝规则未改；全仓门、官方 ratchet 和 protected fast 尚待重跑。

失败日志的 `.txt` 仅移除行尾空白与末尾空行；同名 `.raw.json` 保留逐字原始输出、字节数和 SHA256，不改写失败结果。

最终联合门均exit0：见CODE96的gate-check/ratchet/protected-fast（每门txt/exit/raw.json），最终file SHA snapshot与final-docs/lint/ledger回执。全量check、两个真正coverage门和静态零诊断通过才收口；仅关闭CODE93四条+CODE96两条，其他review/pending不变。用户指定停止后交GLM，候选CODE94/95全部独立门尚未完成，未合main。可读日志只去行尾/末尾空白，同名raw.json保留逐字输出/SHA。

最终lint4056/0/0/0，docs1280/6792links/417tasks与570content-review，quality37项及ledger3271/373/15/2883通过；remaining-review.json列出全部15条未闭合review，pending2883保持。CODE93四文件与CODE96两文件之外不增加信用。
