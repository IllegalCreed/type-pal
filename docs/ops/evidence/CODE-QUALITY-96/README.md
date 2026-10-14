# CODE-QUALITY-96 evidence — 精确测试退役保护账

`test-retirement-proof.json` 为旧/新 count、执行身份摘要和当前文件 SHA；确认删重的合同对照与96项相邻测试见 CODE93。`retirement-tools.txt`/`.exit` 为全部 coverage 工具正反控原件。只新增单一精确批准项，原 predicate/阈值/扫描/拒绝规则未改；全仓门、官方 ratchet 和 protected fast 尚待重跑。

失败日志的 `.txt` 仅移除行尾空白与末尾空行；同名 `.raw.json` 保留逐字原始输出、字节数和 SHA256，不改写失败结果。
